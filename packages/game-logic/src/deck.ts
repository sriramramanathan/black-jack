import { Card, Deck, Rank, Suit } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Creates a single standard 52-card deck, all face up
export function createDeck(): Deck {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceDown: false });
    }
  }
  return deck;
}

// Creates multiple decks combined — casinos use 6-8 decks to make card counting harder
export function createShoe(numberOfDecks: number = 1): Deck {
  if (numberOfDecks < 1) throw new Error('Must use at least 1 deck');
  const shoe: Deck = [];
  for (let i = 0; i < numberOfDecks; i++) {
    shoe.push(...createDeck());
  }
  return shoe;
}

// Fisher-Yates shuffle — proven to give every permutation equal probability
// IMPORTANT: returns a NEW array — does not mutate the original
export function shuffleDeck(deck: Deck): Deck {
  const copy = [...deck]; // spread into new array so original is unchanged
  for (let i = copy.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at i and j using destructuring
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Deals the top card (index 0) from the deck
// Returns a tuple: [card that was dealt, remaining deck]
// Tuple = a fixed-length array where each position has a known type
// IMPORTANT: does not mutate — returns a new deck array
export function dealCard(deck: Deck): [Card, Deck] {
  if (deck.length === 0) throw new Error('Deck is empty');
  const [card, ...rest] = deck; // destructure: first element and everything else
  return [card, rest];
}

// Deals a card face down (hidden) — used for dealer's hole card
export function dealFaceDown(deck: Deck): [Card, Deck] {
  const [card, rest] = dealCard(deck);
  return [{ ...card, faceDown: true }, rest];
}

// Flips a face-down card face up — used when dealer reveals hole card
export function revealCard(card: Card): Card {
  return { ...card, faceDown: false };
}
