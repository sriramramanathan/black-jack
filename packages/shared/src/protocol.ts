import { GameState } from '@blackjack/game-logic';

// ─── Client → Server ──────────────────────────────────────────────────────
// Every message the client can send to the server.
// Each type is a discriminated union — TypeScript can narrow the type
// based on the `type` field, e.g. inside a switch(message.type) block.

export type ClientMessage =
  | { type: 'JOIN'; playerName: string } // join the room and add yourself to the game
  | { type: 'START_GAME' } // transition from waiting_for_players → betting
  | { type: 'PLACE_BET'; amount: number } // place your bet for this round
  | { type: 'HIT' } // draw a card
  | { type: 'STAND' } // end your turn
  | { type: 'DOUBLE' } // double bet, draw one card, stand
  | { type: 'SPLIT' } // split matching pair into two hands
  | { type: 'NEXT_ROUND' }; // start the next round after round_over

// ─── Server → Client ──────────────────────────────────────────────────────
// Every message the server can broadcast to all clients.

export type ServerMessage =
  // After any game action, the full new state is broadcast to everyone.
  // WHY full state (not just the diff): simpler to reason about, and GameState
  // is small enough that bandwidth isn't a concern.
  | { type: 'STATE_UPDATE'; state: GameState }
  // Sent only to the player who caused the error — not broadcast.
  | { type: 'ERROR'; message: string };
