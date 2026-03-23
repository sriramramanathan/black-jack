import { BlackjackGame } from '@blackjack/game-logic';
import { ClientMessage, ServerMessage } from '@blackjack/shared';
import { Env } from './index';

// One BlackjackRoom instance = one game room.
// Cloudflare keeps this object alive in memory while players are connected.
// It's hibernated (paused) when all connections close, and woken up on the
// next incoming connection — at which point the constructor runs again.
export class BlackjackRoom {
  private state: DurableObjectState;

  // sessionId → WebSocket: the live connections in this room
  private sessions = new Map<string, WebSocket>();

  // sessionId → game player ID: links a connection to a player in the game
  private sessionToPlayerId = new Map<string, string>();

  // The game itself — one instance per room
  private game = new BlackjackGame();

  constructor(state: DurableObjectState, _env: Env) {
    // _env reserved for future bindings
    this.state = state;
    // NOTE: Game state is currently kept in memory only.
    // This means if the DO hibernates (no connections for a while), the game
    // state is lost. For a production app, restore from storage here using:
    //   this.state.blockConcurrencyWhile(async () => {
    //     const saved = await this.state.storage.get<string>('game');
    //     if (saved) this.game = BlackjackGame.fromJSON(saved);
    //   });
    // We'll add this in a later phase once the core flow is working.
  }

  async fetch(request: Request): Promise<Response> {
    // Only accept WebSocket upgrade requests
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('This endpoint only accepts WebSocket connections', { status: 426 });
    }

    // WebSocketPair creates two linked sockets:
    //   client → sent back to the browser
    //   server → kept here in the DO, used to send/receive messages
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // accept() activates the server-side socket so we can send/receive
    server.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, server);

    server.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(sessionId, event.data as string);
    });

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId);
      // NOTE: we intentionally do NOT remove the player from the game on disconnect.
      // A player might refresh their browser or have a brief network drop.
      // The session → playerId mapping stays so they can reconnect with the same ID.
    });

    server.addEventListener('error', () => {
      this.sessions.delete(sessionId);
    });

    // Send the current game state immediately so the new connection is in sync
    this.sendToSession(sessionId, {
      type: 'STATE_UPDATE',
      state: this.game.getState(),
    });

    // 101 Switching Protocols — the standard WebSocket handshake response
    return new Response(null, { status: 101, webSocket: client });
  }

  // ─── Message Handling ────────────────────────────────────────────────────

  private handleMessage(sessionId: string, raw: string): void {
    let message: ClientMessage;

    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      this.sendToSession(sessionId, {
        type: 'ERROR',
        message: 'Invalid JSON — could not parse message',
      });
      return;
    }

    try {
      this.dispatch(sessionId, message);
    } catch (error) {
      // Game logic errors (wrong phase, not your turn, etc.) go back only
      // to the player who caused them — not broadcast to everyone
      this.sendToSession(sessionId, {
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  private dispatch(sessionId: string, message: ClientMessage): void {
    const playerId = this.sessionToPlayerId.get(sessionId);

    let newState;

    switch (message.type) {
      case 'JOIN': {
        // addPlayer returns the updated state — the new player is last in the array
        newState = this.game.addPlayer(message.playerName);
        const addedPlayer = newState.players[newState.players.length - 1];
        this.sessionToPlayerId.set(sessionId, addedPlayer.id);
        break;
      }

      case 'START_GAME':
        newState = this.game.startGame();
        break;

      case 'PLACE_BET':
        this.requireInGame(playerId, sessionId);
        newState = this.game.placeBet(playerId!, message.amount);
        break;

      case 'HIT':
        this.requireInGame(playerId, sessionId);
        newState = this.game.hit(playerId!);
        break;

      case 'STAND':
        this.requireInGame(playerId, sessionId);
        newState = this.game.stand(playerId!);
        break;

      case 'DOUBLE':
        this.requireInGame(playerId, sessionId);
        newState = this.game.double(playerId!);
        break;

      case 'SPLIT':
        this.requireInGame(playerId, sessionId);
        newState = this.game.split(playerId!);
        break;

      case 'NEXT_ROUND':
        newState = this.game.nextRound();
        break;

      default:
        // TypeScript's exhaustive check — if we add a new ClientMessage type
        // and forget to handle it here, this line causes a compile error
        this.sendToSession(sessionId, {
          type: 'ERROR',
          message: `Unknown message type: ${(message as ClientMessage).type}`,
        });
        return;
    }

    // Broadcast the new full state to ALL connected players
    this.broadcast({ type: 'STATE_UPDATE', state: newState });
  }

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  private broadcast(message: ServerMessage): void {
    const json = JSON.stringify(message);
    for (const [, ws] of this.sessions) {
      try {
        ws.send(json);
      } catch {
        // Individual send failures are silent — the close event will clean up
      }
    }
  }

  private sendToSession(sessionId: string, message: ServerMessage): void {
    const ws = this.sessions.get(sessionId);
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  }

  private requireInGame(playerId: string | undefined, _sessionId: string): void {
    if (!playerId) {
      throw new Error('You must JOIN the room before taking game actions');
    }
  }
}
