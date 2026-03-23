import { Deck, Hand, HandResult } from './types';

// Every round moves through these phases in order
// The state machine enforces that actions only happen in valid phases
export type GamePhase =
  | 'waiting_for_players' // players are joining, no round in progress
  | 'betting' // each player places their bet
  | 'player_turns' // players act in order (hit/stand/double/split)
  | 'dealer_turn' // dealer reveals hole card and plays
  | 'round_over'; // results calculated, chips settled

// A single hand a player is playing
// A player normally has 1 hand, but has 2 after splitting
export interface PlayerHand {
  cards: Hand;
  bet: number;
  result?: HandResult; // set at round_over
  payout?: number; // net chip change (positive = won, negative = lost)
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  hands: PlayerHand[]; // [0] = main hand, [1] = split hand
  activeHandIndex: number; // which hand the player is currently acting on
  // Status tracks where the player is in their turn:
  // waiting_to_bet → bet_placed → playing → (standing | bust | blackjack)
  status: 'waiting_to_bet' | 'bet_placed' | 'playing' | 'standing' | 'bust' | 'blackjack';
}

export interface DealerState {
  hand: Hand;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  dealer: DealerState;
  deck: Deck;
  activePlayerIndex: number; // index into players array, -1 = none yet
  roundNumber: number; // increments each round — useful for UI
}

// Constants exported so tests and UI can reference the same values
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 1;
export const STARTING_CHIPS = 1000;
export const MIN_BET = 10;
