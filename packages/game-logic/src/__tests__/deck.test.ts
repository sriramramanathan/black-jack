import { createDeck, createShoe, shuffleDeck, dealCard, dealFaceDown, revealCard } from '../deck';
import { SUITS, RANKS } from '../deck';

describe('createDeck', () => {
  test('creates exactly 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  test('contains all 4 suits', () => {
    const suits = new Set(createDeck().map(c => c.suit));
    expect(suits).toEqual(new Set(SUITS));
  });

  test('contains all 13 ranks', () => {
    const ranks = new Set(createDeck().map(c => c.rank));
    expect(ranks).toEqual(new Set(RANKS));
  });

  test('contains exactly 4 cards per rank', () => {
    const deck = createDeck();
    for (const rank of RANKS) {
      const count = deck.filter(c => c.rank === rank).length;
      expect(count).toBe(4);
    }
  });

  test('contains exactly 13 cards per suit', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      const count = deck.filter(c => c.suit === suit).length;
      expect(count).toBe(13);
    }
  });

  test('all cards are face up by default', () => {
    createDeck().forEach(card => expect(card.faceDown).toBe(false));
  });

  test('each call creates a fresh independent deck', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();
    deck1[0].faceDown = true; // mutate deck1
    expect(deck2[0].faceDown).toBe(false); // deck2 unaffected
  });
});

describe('createShoe', () => {
  test('defaults to 1 deck (52 cards)', () => {
    expect(createShoe()).toHaveLength(52);
  });

  test('2 decks = 104 cards', () => {
    expect(createShoe(2)).toHaveLength(104);
  });

  test('6 decks = 312 cards', () => {
    expect(createShoe(6)).toHaveLength(312);
  });

  test('throws on 0 decks', () => {
    expect(() => createShoe(0)).toThrow('Must use at least 1 deck');
  });

  test('throws on negative decks', () => {
    expect(() => createShoe(-1)).toThrow('Must use at least 1 deck');
  });
});

describe('shuffleDeck', () => {
  test('returns same number of cards', () => {
    expect(shuffleDeck(createDeck())).toHaveLength(52);
  });

  test('does NOT mutate the original deck', () => {
    const deck = createDeck();
    const first = deck[0];
    shuffleDeck(deck);
    expect(deck[0]).toEqual(first); // original unchanged
  });

  test('returned deck contains the same cards (just reordered)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    // Sort both by suit+rank and compare — order doesn't matter, contents do
    const sort = (d: typeof deck) =>
      [...d].sort((a, b) => `${a.suit}${a.rank}`.localeCompare(`${b.suit}${b.rank}`));
    expect(sort(shuffled)).toEqual(sort(deck));
  });

  test('shuffling produces different order (probabilistic — 1/52! chance of false negative)', () => {
    const deck = createDeck();
    const s1 = shuffleDeck(deck);
    const s2 = shuffleDeck(deck);
    expect(s1).not.toEqual(s2);
  });

  test('handles a single-card deck', () => {
    const single = [createDeck()[0]];
    expect(shuffleDeck(single)).toHaveLength(1);
  });
});

describe('dealCard', () => {
  test('returns the first card in the deck', () => {
    const deck = createDeck();
    const [card] = dealCard(deck);
    expect(card).toEqual(deck[0]);
  });

  test('remaining deck has 51 cards', () => {
    const [, rest] = dealCard(createDeck());
    expect(rest).toHaveLength(51);
  });

  test('does NOT mutate the original deck', () => {
    const deck = createDeck();
    dealCard(deck);
    expect(deck).toHaveLength(52);
  });

  test('throws on empty deck', () => {
    expect(() => dealCard([])).toThrow('Deck is empty');
  });

  test('dealing entire deck empties it', () => {
    let deck = createDeck();
    for (let i = 0; i < 52; i++) {
      const [, rest] = dealCard(deck);
      deck = rest;
    }
    expect(deck).toHaveLength(0);
  });
});

describe('dealFaceDown', () => {
  test('card is face down', () => {
    const [card] = dealFaceDown(createDeck());
    expect(card.faceDown).toBe(true);
  });

  test('suit and rank are preserved', () => {
    const deck = createDeck();
    const [faceDown] = dealFaceDown(deck);
    expect(faceDown.suit).toBe(deck[0].suit);
    expect(faceDown.rank).toBe(deck[0].rank);
  });
});

describe('revealCard', () => {
  test('flips a face-down card to face up', () => {
    const [card] = dealFaceDown(createDeck());
    expect(revealCard(card).faceDown).toBe(false);
  });

  test('does NOT mutate the original card', () => {
    const [card] = dealFaceDown(createDeck());
    revealCard(card);
    expect(card.faceDown).toBe(true); // original still face down
  });

  test('suit and rank are preserved after reveal', () => {
    const [card] = dealFaceDown(createDeck());
    const revealed = revealCard(card);
    expect(revealed.suit).toBe(card.suit);
    expect(revealed.rank).toBe(card.rank);
  });
});
