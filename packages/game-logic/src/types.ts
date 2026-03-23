// The four suits in a standard deck
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// All possible card ranks
// Note: '10' is a string like the others — makes the type uniform
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  // faceDown = true means the card is hidden (e.g. dealer's hole card)
  // We still carry it in the hand array — we just don't count it in score
  faceDown: boolean;
}

// A Deck is an ordered array of cards — index 0 is the "top"
export type Deck = Card[];

// A Hand is the cards a single player is holding
export type Hand = Card[];

// All possible outcomes for a player's hand at end of round
export type HandResult =
  | 'blackjack' // Ace + 10-value on first two cards — pays 3:2
  | 'win' // Beat the dealer — pays 1:1
  | 'push' // Tied with dealer — bet returned
  | 'lose' // Dealer beat the player
  | 'bust'; // Player went over 21 — automatic loss

// Actions a player can take on their turn
export type PlayerAction = 'hit' | 'stand' | 'double' | 'split';
