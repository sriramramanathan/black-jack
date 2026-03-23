import { BlackjackGame } from '../BlackjackGame';
import { STARTING_CHIPS, MIN_BET } from '../gameTypes';
import { Card, Deck } from '../types';

// ─── Test Helpers ──────────────────────────────────────────────────────────

// Builds a card (suit doesn't affect any game logic so we always use spades)
function card(rank: string, faceDown = false): Card {
  return { suit: 'spades', rank, faceDown } as Card;
}

// Builds a controlled deck so tests get predictable cards.
//
// For a 2-player game, dealing order is:
//   deck[0] → Player 1 card 1
//   deck[1] → Player 2 card 1
//   deck[2] → Dealer card 1 (face up)
//   deck[3] → Player 1 card 2
//   deck[4] → Player 2 card 2
//   deck[5] → Dealer card 2 (face down / hole card)
//   deck[6+] → available for hits
//
// For a 1-player game:
//   deck[0] → Player 1 card 1
//   deck[1] → Dealer card 1 (face up)
//   deck[2] → Player 1 card 2
//   deck[3] → Dealer card 2 (face down)
//   deck[4+] → available for hits
function makeDeck(...ranks: string[]): Deck {
  return ranks.map(r => card(r));
}

// Shortcut: create a game, add N players, start, and return player IDs
function setupGame(playerNames: string[], deck?: Deck) {
  const game = new BlackjackGame({ deck });
  const ids: string[] = [];

  for (const name of playerNames) {
    const state = game.addPlayer(name);
    ids.push(state.players[state.players.length - 1].id);
  }

  game.startGame();
  return { game, ids };
}

// Shortcut: all players place the minimum bet
function placeAllBets(game: BlackjackGame, ids: string[], amount = MIN_BET) {
  for (const id of ids) {
    game.placeBet(id, amount);
  }
}

// ─── Player Management ─────────────────────────────────────────────────────

describe('addPlayer', () => {
  test('adds a player with correct defaults', () => {
    const game = new BlackjackGame();
    const state = game.addPlayer('Alice');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[0].chips).toBe(STARTING_CHIPS);
    expect(state.players[0].status).toBe('waiting_to_bet');
  });

  test('each player gets a unique id', () => {
    const game = new BlackjackGame();
    const s1 = game.addPlayer('Alice');
    const s2 = game.addPlayer('Bob');
    expect(s1.players[0].id).not.toBe(s2.players[1].id);
  });

  test('trims whitespace from name', () => {
    const game = new BlackjackGame();
    const state = game.addPlayer('  Alice  ');
    expect(state.players[0].name).toBe('Alice');
  });

  test('throws on empty name', () => {
    expect(() => new BlackjackGame().addPlayer('')).toThrow();
    expect(() => new BlackjackGame().addPlayer('   ')).toThrow();
  });

  test('throws when adding more than 4 players', () => {
    const game = new BlackjackGame();
    game.addPlayer('P1');
    game.addPlayer('P2');
    game.addPlayer('P3');
    game.addPlayer('P4');
    expect(() => game.addPlayer('P5')).toThrow('Maximum 4 players');
  });

  test('throws when game is already in progress', () => {
    const { game } = setupGame(['Alice']);
    expect(() => game.addPlayer('Bob')).toThrow();
  });
});

describe('startGame', () => {
  test('transitions to betting phase', () => {
    const game = new BlackjackGame();
    game.addPlayer('Alice');
    const state = game.startGame();
    expect(state.phase).toBe('betting');
  });

  test('throws with no players', () => {
    expect(() => new BlackjackGame().startGame()).toThrow('at least 1 player');
  });

  test('throws if already started', () => {
    const game = new BlackjackGame();
    game.addPlayer('Alice');
    game.startGame();
    expect(() => game.startGame()).toThrow();
  });
});

// ─── Betting ───────────────────────────────────────────────────────────────

describe('placeBet', () => {
  test('deducts chips immediately', () => {
    const { game, ids } = setupGame(['Alice']);
    game.placeBet(ids[0], 100);
    // Must read state after bet — but phase changed to player_turns so read state
    const state = game.getState();
    expect(state.players[0].chips).toBe(STARTING_CHIPS - 100);
  });

  test('throws below minimum bet', () => {
    const { game, ids } = setupGame(['Alice']);
    expect(() => game.placeBet(ids[0], MIN_BET - 1)).toThrow(`Minimum bet is ${MIN_BET}`);
  });

  test('throws when bet exceeds chips', () => {
    const { game, ids } = setupGame(['Alice']);
    expect(() => game.placeBet(ids[0], STARTING_CHIPS + 1)).toThrow('only has');
  });

  test('throws when betting twice', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    game.placeBet(ids[0], MIN_BET);
    // Alice already bet — Bob hasn't, so we're still in betting phase
    expect(() => game.placeBet(ids[0], MIN_BET)).toThrow('already placed a bet');
  });

  test('throws outside betting phase', () => {
    const game = new BlackjackGame();
    expect(() => game.placeBet('any', MIN_BET)).toThrow();
  });

  test('transitions to player_turns after all bets placed', () => {
    // 1-player game: single bet → immediately deals
    const { game, ids } = setupGame(['Alice']);
    game.placeBet(ids[0], MIN_BET);
    expect(game.getState().phase).toBe('player_turns');
  });

  test('stays in betting phase until all players have bet', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    game.placeBet(ids[0], MIN_BET);
    // Only Alice has bet — Bob hasn't yet
    expect(game.getState().phase).toBe('betting');
  });

  test('each player gets 2 cards after all bets placed', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    placeAllBets(game, ids);
    const state = game.getState();
    expect(state.players[0].hands[0].cards).toHaveLength(2);
    expect(state.players[1].hands[0].cards).toHaveLength(2);
  });

  test('dealer has 2 cards (1 face up, 1 face down) after deal', () => {
    const { game, ids } = setupGame(['Alice']);
    game.placeBet(ids[0], MIN_BET);
    const dealer = game.getState().dealer;
    expect(dealer.hand).toHaveLength(2);
    expect(dealer.hand[0].faceDown).toBe(false);
    expect(dealer.hand[1].faceDown).toBe(true); // hole card
  });
});

// ─── Player Turns ──────────────────────────────────────────────────────────

describe('hit', () => {
  test('adds a card to the active hand', () => {
    // P1 gets: 5, ?, 8, ? — controllable cards
    // 1-player deck order: P1c1, Dc1, P1c2, Dc2, hits...
    const deck = makeDeck('5', 'K', '8', '3', '4');
    // P1: 5+8=13, Dealer: K+3, hit gives P1 a 4
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], MIN_BET);

    const before = game.getState().players[0].hands[0].cards.length;
    game.hit(ids[0]);
    const after = game.getState().players[0].hands[0].cards.length;
    expect(after).toBe(before + 1);
  });

  test('bust after hitting → status is bust, phase moves to dealer_turn', () => {
    // 1-player deck order: P1c1, Dc1, P1c2, Dc2, then hits
    // P1: 9+9=18, hits 9 → 27 (bust). Dealer: K+3=13 → hits 5 → 18 → stands
    const deck = makeDeck('9', 'K', '9', '3', '9', '5');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], MIN_BET);
    game.hit(ids[0]); // P1 now has 9+9+9=27 → bust
    const state = game.getState();
    expect(state.players[0].status).toBe('bust');
    // After only player busts, game should auto-advance past dealer to round_over
    expect(['dealer_turn', 'round_over']).toContain(state.phase);
  });

  test('throws when acting out of turn', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    placeAllBets(game, ids);
    // It's Alice's turn (index 0) — Bob cannot act
    expect(() => game.hit(ids[1])).toThrow('not your turn');
  });

  test('throws outside player_turns phase', () => {
    const { game, ids } = setupGame(['Alice']);
    expect(() => game.hit(ids[0])).toThrow();
  });
});

describe('stand', () => {
  test('standing advances to the next player', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    placeAllBets(game, ids);

    const before = game.getState().activePlayerIndex; // should be 0 (Alice)
    game.stand(ids[0]); // Alice stands
    const after = game.getState().activePlayerIndex; // should be 1 (Bob)
    expect(after).toBe(before + 1);
  });

  test('after last player stands, dealer takes their turn', () => {
    const { game, ids } = setupGame(['Alice']);
    placeAllBets(game, ids);
    game.stand(ids[0]);
    const phase = game.getState().phase;
    // Dealer turn may complete instantly if dealer doesn't need to hit
    expect(['dealer_turn', 'round_over']).toContain(phase);
  });

  test('player status becomes standing', () => {
    const { game, ids } = setupGame(['Alice', 'Bob']);
    placeAllBets(game, ids);
    game.stand(ids[0]);
    expect(game.getState().players[0].status).toBe('standing');
  });
});

// ─── Blackjack on Deal ─────────────────────────────────────────────────────

describe('blackjack on deal', () => {
  test('player with blackjack is skipped in player_turns', () => {
    // 2-player game. Deck order: P1c1, P2c1, Dc1, P1c2, P2c2, Dc2
    // Give P1 blackjack (A + K), P2 a normal hand
    const deck = makeDeck('A', '5', '9', 'K', '8', '3');
    // P1: A + K = blackjack
    // P2: 5 + 8 = 13
    // Dealer: 9 + 3 = 12 (face up 9, hole card 3)
    const { game, ids } = setupGame(['Alice', 'Bob'], deck);
    placeAllBets(game, ids);

    const state = game.getState();
    expect(state.players[0].status).toBe('blackjack'); // Alice skipped
    expect(state.activePlayerIndex).toBe(1); // Bob is active
  });

  test('if all players have blackjack, game skips straight to dealer', () => {
    // P1: A + K = blackjack → skipped. Dealer: 2(up) + 3(hole) = 5 → hits 7→12 → hits 6→18 → stands
    const deck = makeDeck('A', '2', 'K', '3', '7', '6');
    // P1: A + K = blackjack. Dealer: 2 + 3 = 5
    const { game, ids } = setupGame(['Alice'], deck);
    placeAllBets(game, ids);
    const state = game.getState();
    expect(['dealer_turn', 'round_over']).toContain(state.phase);
  });
});

// ─── Double Down ───────────────────────────────────────────────────────────

describe('double', () => {
  test('doubles the bet and deals exactly one card', () => {
    // P1: 6+5=11 → doubles, gets 8 → 19. Dealer: 2(up)+K(hole)=12 → hits 9 → 21 → stands
    const deck = makeDeck('6', '2', '5', 'K', '8', '9');
    // Dealer: 2 + K = 12
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);

    const before = game.getState().players[0];
    game.double(ids[0]);
    const after = game.getState().players[0];

    expect(after.hands[0].bet).toBe(200); // bet doubled
    expect(after.hands[0].cards).toHaveLength(3); // 2 initial + 1 hit
    expect(after.chips).toBe(before.chips - 100); // extra 100 deducted
    expect(after.status).toBe('standing'); // automatically stands after double
  });

  test('throws when doubling with insufficient chips', () => {
    const deck = makeDeck('6', '2', '5', 'K', '8');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], STARTING_CHIPS); // bet everything
    // Now chips = 0 — can't double
    expect(() => game.double(ids[0])).toThrow('chips to double');
  });

  test('throws when trying to double on 3+ cards', () => {
    const deck = makeDeck('5', '2', '6', 'K', '4', '3');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], MIN_BET);
    game.hit(ids[0]); // now has 3 cards
    expect(() => game.double(ids[0])).toThrow('first two cards');
  });
});

// ─── Split ─────────────────────────────────────────────────────────────────

describe('split', () => {
  test('splits into two hands, each gets a second card', () => {
    // P1: 8, ?, 8, ? → can split. Next cards (for new hands): 3, 5
    const deck = makeDeck('8', '2', '8', 'K', '3', '5');
    // P1: 8 + 8, Dealer: 2 + K
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);

    game.split(ids[0]);
    const state = game.getState();
    const player = state.players[0];

    expect(player.hands).toHaveLength(2);
    expect(player.hands[0].cards).toHaveLength(2); // 8 + newCard
    expect(player.hands[1].cards).toHaveLength(2); // 8 + newCard
    expect(player.chips).toBe(STARTING_CHIPS - 200); // both bets deducted
  });

  test('after splitting, player plays hand 0 first then hand 1', () => {
    const deck = makeDeck('8', '2', '8', 'K', '3', '5', '7', '6');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], MIN_BET);

    game.split(ids[0]);
    expect(game.getState().players[0].activeHandIndex).toBe(0);

    game.stand(ids[0]); // stand on hand 0
    expect(game.getState().players[0].activeHandIndex).toBe(1); // now on hand 1
  });

  test('throws when cards are different ranks', () => {
    // P1: 8 + 9 — cannot split
    const deck = makeDeck('8', '2', '9', 'K');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], MIN_BET);
    expect(() => game.split(ids[0])).toThrow('same rank');
  });

  test('throws when insufficient chips to split', () => {
    const deck = makeDeck('8', '2', '8', 'K');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], STARTING_CHIPS); // bet everything
    expect(() => game.split(ids[0])).toThrow('chips to split');
  });
});

// ─── Full Round Flows ──────────────────────────────────────────────────────

describe('full round: player wins', () => {
  test('player gets more chips after winning', () => {
    // P1: K + Q = 20. Dealer: 5 + 8 = 13 → must hit. Next card for dealer = 7 → 20? Let's give dealer bust
    // Dealer: 5 up, 8 hole, hit = K → 23 (bust)
    const deck = makeDeck('K', '5', 'Q', '8', 'K');
    // P1: K + Q = 20. Dealer: 5 + 8 = 13 → hits, gets K → bust
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);
    game.stand(ids[0]);

    const state = game.getState();
    expect(state.phase).toBe('round_over');
    expect(state.players[0].hands[0].result).toBe('win');
    // Chips: started 1000, bet 100 (deducted), win gets back 100 + 100 profit = 1100
    expect(state.players[0].chips).toBe(STARTING_CHIPS + 100);
  });
});

describe('full round: player loses', () => {
  test('player loses chips when dealer has higher value', () => {
    // P1: 10 + 6 = 16. Dealer: K up, Q hole = 20. P1 stands → loses.
    const deck = makeDeck('10', 'K', '6', 'Q');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);
    game.stand(ids[0]);

    const state = game.getState();
    expect(state.players[0].hands[0].result).toBe('lose');
    expect(state.players[0].chips).toBe(STARTING_CHIPS - 100);
  });
});

describe('full round: push', () => {
  test('chips are unchanged on a push', () => {
    // P1: K + 9 = 19. Dealer: 10 up, 9 hole = 19. Push.
    const deck = makeDeck('K', '10', '9', '9');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);
    game.stand(ids[0]);

    const state = game.getState();
    expect(state.players[0].hands[0].result).toBe('push');
    expect(state.players[0].chips).toBe(STARTING_CHIPS); // unchanged
  });
});

describe('full round: player blackjack', () => {
  test('player wins 1.5x bet on blackjack', () => {
    // P1: A + K = blackjack. Dealer: 5 + 9 = 14 → hits. Give dealer a 2 → 16 → hits. Give dealer 3 → 19.
    const deck = makeDeck('A', '5', 'K', '9', '2', '3');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);

    // Alice has blackjack — no action needed, auto-advances to dealer
    const state = game.getState();
    expect(state.phase).toBe('round_over');
    expect(state.players[0].hands[0].result).toBe('blackjack');
    // 100 bet → 150 profit + 100 stake back = 1150
    expect(state.players[0].chips).toBe(STARTING_CHIPS + 150);
  });

  test('both player and dealer blackjack = push', () => {
    // P1: A + K. Dealer: A (up) + Q (hole) = blackjack too.
    const deck = makeDeck('A', 'A', 'K', 'Q');
    const { game, ids } = setupGame(['Alice'], deck);
    game.placeBet(ids[0], 100);

    const state = game.getState();
    expect(state.players[0].hands[0].result).toBe('push');
    expect(state.players[0].chips).toBe(STARTING_CHIPS); // push — no net change
  });
});

// ─── Multi-player Round ────────────────────────────────────────────────────

describe('multiplayer round', () => {
  test('players take turns in order', () => {
    // 3 players. Give them all safe hands (no blackjack)
    // Deck order: P1c1, P2c1, P3c1, Dc1, P1c2, P2c2, P3c2, Dc2
    const deck = makeDeck('5', '6', '7', '9', '8', '4', '3', '2');
    const { game, ids } = setupGame(['Alice', 'Bob', 'Carol'], deck);
    placeAllBets(game, ids);

    expect(game.getState().activePlayerIndex).toBe(0); // Alice first
    game.stand(ids[0]);
    expect(game.getState().activePlayerIndex).toBe(1); // Bob second
    game.stand(ids[1]);
    expect(game.getState().activePlayerIndex).toBe(2); // Carol third
  });

  test('each player gets their own result', () => {
    // P1: 10+9=19 (win), P2: 5+6=11 (hit to 20, win), Dealer: K+7=17
    // Deck: P1c1=10, P2c1=5, Dc1=K, P1c2=9, P2c2=6, Dc2=7, P2hit=9
    const deck = makeDeck('10', '5', 'K', '9', '6', '7', '9');
    const { game, ids } = setupGame(['Alice', 'Bob'], deck);
    placeAllBets(game, ids);

    game.stand(ids[0]); // Alice stands with 19
    game.hit(ids[1]); // Bob hits: 5+6+9=20
    game.stand(ids[1]); // Bob stands with 20

    const state = game.getState();
    expect(state.players[0].hands[0].result).toBe('win'); // 19 > 17
    expect(state.players[1].hands[0].result).toBe('win'); // 20 > 17
  });
});

// ─── Next Round ────────────────────────────────────────────────────────────

describe('nextRound', () => {
  test('resets to betting phase', () => {
    const { game, ids } = setupGame(['Alice']);
    placeAllBets(game, ids);
    game.stand(ids[0]);
    expect(game.getState().phase).toBe('round_over');

    game.nextRound();
    expect(game.getState().phase).toBe('betting');
  });

  test('players have cleared hands and reset status', () => {
    const { game, ids } = setupGame(['Alice']);
    placeAllBets(game, ids);
    game.stand(ids[0]);
    game.nextRound();

    const player = game.getState().players[0];
    expect(player.hands).toHaveLength(0);
    expect(player.status).toBe('waiting_to_bet');
  });

  test('round number increments each round', () => {
    // Need enough cards to avoid the 25%-remaining reshuffle between rounds.
    // Reshuffle threshold = 25% of 52 = 13 cards. After round 1 (4 cards used)
    // we need 13+ remaining → need 17+ total → using 20 to be safe.
    // Both rounds: P1=10+8=18, Dealer=K+Q=20. Neither hand is blackjack. No hits needed.
    const deck = makeDeck(
      '10',
      'K',
      '8',
      'Q', // round 1: P1 gets 10,8 — dealer gets K,Q
      '10',
      'K',
      '8',
      'Q', // round 2: same safe hands
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2',
      '2' // padding
    );
    const { game, ids } = setupGame(['Alice'], deck);
    placeAllBets(game, ids);
    game.stand(ids[0]);
    expect(game.getState().roundNumber).toBe(1);

    game.nextRound();
    placeAllBets(game, ids); // round 2 deals — P1 gets 10+8, not blackjack
    game.stand(ids[0]); // P1 stands — dealer plays, round over
    expect(game.getState().roundNumber).toBe(2);
  });

  test('throws when round is not over', () => {
    const { game, ids } = setupGame(['Alice']);
    placeAllBets(game, ids);
    // Still in player_turns — cannot call nextRound
    expect(() => game.nextRound()).toThrow();
  });
});

// ─── State Immutability ────────────────────────────────────────────────────

describe('getState immutability', () => {
  test('mutating returned state does not affect internal state', () => {
    const { game } = setupGame(['Alice']);
    const state1 = game.getState();
    state1.players[0].chips = 0; // mutate the copy
    state1.phase = 'round_over' as never;

    const state2 = game.getState();
    expect(state2.players[0].chips).toBe(STARTING_CHIPS); // internal unchanged
    expect(state2.phase).toBe('betting');
  });
});
