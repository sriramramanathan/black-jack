import { describe, test, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { ServerMessage, ClientMessage } from '@blackjack/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────

// Opens a WebSocket to a room and returns helpers for sending/receiving
async function connectToRoom(roomCode = 'TESTROOM') {
  const response = await SELF.fetch(`http://localhost/room/${roomCode}`, {
    headers: { Upgrade: 'websocket' },
  });

  expect(response.status).toBe(101);
  const ws = response.webSocket!;
  ws.accept();

  const messages: ServerMessage[] = [];
  ws.addEventListener('message', (event: MessageEvent) => {
    messages.push(JSON.parse(event.data as string) as ServerMessage);
  });

  const send = (msg: ClientMessage) => ws.send(JSON.stringify(msg));
  const nextMessage = () =>
    new Promise<ServerMessage>(resolve => {
      const check = () => {
        if (messages.length > 0) return resolve(messages.shift()!);
        setTimeout(check, 5);
      };
      check();
    });

  return { ws, messages, send, nextMessage };
}

// ─── Routing ──────────────────────────────────────────────────────────────

describe('worker routing', () => {
  test('GET /room/new returns a room code', async () => {
    const res = await SELF.fetch('http://localhost/room/new');
    expect(res.status).toBe(200);
    const body = await res.json<{ roomCode: string }>();
    expect(body.roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('non-WebSocket request to room returns 426', async () => {
    const res = await SELF.fetch('http://localhost/room/TESTABC');
    expect(res.status).toBe(426);
  });

  test('unknown route returns 404', async () => {
    const res = await SELF.fetch('http://localhost/unknown');
    expect(res.status).toBe(404);
  });

  test('WebSocket upgrade returns 101', async () => {
    const res = await SELF.fetch('http://localhost/room/TESTWSUP', {
      headers: { Upgrade: 'websocket' },
    });
    expect(res.status).toBe(101);
    expect(res.webSocket).not.toBeNull();
  });
});

// ─── Connection ───────────────────────────────────────────────────────────

describe('on connect', () => {
  test('receives the current game state immediately on connect', async () => {
    const { nextMessage } = await connectToRoom('CONNECT1');
    const msg = await nextMessage();
    expect(msg.type).toBe('STATE_UPDATE');
    if (msg.type === 'STATE_UPDATE') {
      expect(msg.state.phase).toBe('waiting_for_players');
      expect(msg.state.players).toHaveLength(0);
    }
  });
});

// ─── JOIN ─────────────────────────────────────────────────────────────────

describe('JOIN', () => {
  test('joining adds a player to the game state', async () => {
    const { send, nextMessage } = await connectToRoom('JOINTEST');
    await nextMessage(); // consume initial state

    send({ type: 'JOIN', playerName: 'Alice' });
    const msg = await nextMessage();

    expect(msg.type).toBe('STATE_UPDATE');
    if (msg.type === 'STATE_UPDATE') {
      expect(msg.state.players).toHaveLength(1);
      expect(msg.state.players[0].name).toBe('Alice');
    }
  });

  test('empty player name returns ERROR', async () => {
    const { send, nextMessage } = await connectToRoom('JOINBAD');
    await nextMessage(); // initial state

    send({ type: 'JOIN', playerName: '' });
    const msg = await nextMessage();
    expect(msg.type).toBe('ERROR');
  });

  test('two players can join the same room', async () => {
    const p1 = await connectToRoom('TWOPLAYER');
    const p2 = await connectToRoom('TWOPLAYER');
    await p1.nextMessage(); // initial state
    await p2.nextMessage(); // initial state

    p1.send({ type: 'JOIN', playerName: 'Alice' });
    // both players receive the update
    const msg1 = await p1.nextMessage();
    const msg2 = await p2.nextMessage();

    if (msg1.type === 'STATE_UPDATE' && msg2.type === 'STATE_UPDATE') {
      expect(msg1.state.players).toHaveLength(1);
      expect(msg2.state.players).toHaveLength(1); // p2 also sees Alice
    }

    p2.send({ type: 'JOIN', playerName: 'Bob' });
    const afterBob1 = await p1.nextMessage();
    const afterBob2 = await p2.nextMessage();
    if (afterBob1.type === 'STATE_UPDATE' && afterBob2.type === 'STATE_UPDATE') {
      expect(afterBob1.state.players).toHaveLength(2);
      expect(afterBob2.state.players).toHaveLength(2);
    }
  });
});

// ─── Actions without joining ───────────────────────────────────────────────

describe('acting without JOIN', () => {
  test('HIT before JOIN returns ERROR', async () => {
    const { send, nextMessage } = await connectToRoom('NOJOIN1');
    await nextMessage();
    send({ type: 'HIT' });
    const msg = await nextMessage();
    expect(msg.type).toBe('ERROR');
  });

  test('PLACE_BET before JOIN returns ERROR', async () => {
    const { send, nextMessage } = await connectToRoom('NOJOIN2');
    await nextMessage();
    send({ type: 'PLACE_BET', amount: 50 });
    const msg = await nextMessage();
    expect(msg.type).toBe('ERROR');
  });
});

// ─── Invalid JSON ──────────────────────────────────────────────────────────

describe('invalid messages', () => {
  test('invalid JSON returns ERROR', async () => {
    const { ws, nextMessage } = await connectToRoom('BADJSON');
    await nextMessage();
    ws.send('this is not json');
    const msg = await nextMessage();
    expect(msg.type).toBe('ERROR');
  });
});

// ─── Full Round Flow ───────────────────────────────────────────────────────

describe('full round flow via WebSocket', () => {
  test('single player can complete a full round', async () => {
    const { send, nextMessage } = await connectToRoom('FULLROUND');
    await nextMessage(); // initial state

    // JOIN
    send({ type: 'JOIN', playerName: 'Alice' });
    const afterJoin = await nextMessage();
    expect(afterJoin.type).toBe('STATE_UPDATE');

    // START_GAME
    send({ type: 'START_GAME' });
    const afterStart = await nextMessage();
    if (afterStart.type === 'STATE_UPDATE') {
      expect(afterStart.state.phase).toBe('betting');
    }

    // PLACE_BET — triggers deal (single player → all bets placed immediately)
    send({ type: 'PLACE_BET', amount: 50 });
    const afterBet = await nextMessage();
    if (afterBet.type === 'STATE_UPDATE') {
      // After deal, we're in player_turns (or round_over if blackjack)
      expect(['player_turns', 'round_over']).toContain(afterBet.state.phase);
    }

    // If in player_turns, stand to end the round
    const currentState = (afterBet as { type: 'STATE_UPDATE'; state: { phase: string } }).state;
    if (afterBet.type === 'STATE_UPDATE' && currentState.phase === 'player_turns') {
      send({ type: 'STAND' });
      const afterStand = await nextMessage();
      if (afterStand.type === 'STATE_UPDATE') {
        expect(afterStand.state.phase).toBe('round_over');
      }
    }
  });

  test('wrong player acting returns ERROR (not broadcast)', async () => {
    const p1 = await connectToRoom('WRONGTURN');
    const p2 = await connectToRoom('WRONGTURN');
    await p1.nextMessage();
    await p2.nextMessage();

    p1.send({ type: 'JOIN', playerName: 'Alice' });
    await p1.nextMessage();
    await p2.nextMessage();

    p2.send({ type: 'JOIN', playerName: 'Bob' });
    await p1.nextMessage();
    await p2.nextMessage();

    p1.send({ type: 'START_GAME' });
    await p1.nextMessage();
    await p2.nextMessage();

    p1.send({ type: 'PLACE_BET', amount: 50 });
    await p1.nextMessage();
    await p2.nextMessage();

    p2.send({ type: 'PLACE_BET', amount: 50 });
    const afterAllBets1 = await p1.nextMessage();
    await p2.nextMessage(); // consume p2's copy of the state update

    // Both should be in player_turns or round_over (if someone got blackjack)
    if (afterAllBets1.type === 'STATE_UPDATE' && afterAllBets1.state.phase === 'player_turns') {
      // It's Alice's turn (index 0) — Bob tries to act out of turn
      p2.send({ type: 'HIT' });
      const errorMsg = await p2.nextMessage();
      expect(errorMsg.type).toBe('ERROR'); // Bob gets the error
      // P1 should NOT receive a message (error was private to Bob)
      expect(p1.messages).toHaveLength(0);
    }
  });
});
