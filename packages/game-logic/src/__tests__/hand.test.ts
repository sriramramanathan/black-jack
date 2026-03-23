import { calculateHandValue, isSoftHand, isBlackjack, isBust } from '../hand';
import { Card, Hand } from '../types';

// Helper to build a hand quickly without specifying suit (suit doesn't affect value)
function makeHand(...ranks: string[]): Hand {
  return ranks.map(rank => ({ suit: 'spades', rank, faceDown: false }) as Card);
}

function makeCard(rank: string, faceDown = false): Card {
  return { suit: 'hearts', rank, faceDown } as Card;
}

describe('calculateHandValue', () => {
  // --- Basic card values ---
  test('single numeric card', () => {
    expect(calculateHandValue(makeHand('7'))).toBe(7);
  });

  test('face cards (J, Q, K) are worth 10', () => {
    expect(calculateHandValue(makeHand('J'))).toBe(10);
    expect(calculateHandValue(makeHand('Q'))).toBe(10);
    expect(calculateHandValue(makeHand('K'))).toBe(10);
  });

  test('10 is worth 10', () => {
    expect(calculateHandValue(makeHand('10'))).toBe(10);
  });

  test('empty hand is 0', () => {
    expect(calculateHandValue([])).toBe(0);
  });

  // --- Ace handling ---
  test('single Ace = 11', () => {
    expect(calculateHandValue(makeHand('A'))).toBe(11);
  });

  test('Ace + 9 = 20 (soft)', () => {
    expect(calculateHandValue(makeHand('A', '9'))).toBe(20);
  });

  test('Ace + King = 21 (blackjack value)', () => {
    expect(calculateHandValue(makeHand('A', 'K'))).toBe(21);
  });

  test('Ace + 5 + 10 = 16 (Ace forced to 1 to avoid bust)', () => {
    expect(calculateHandValue(makeHand('A', '5', '10'))).toBe(16);
  });

  test('Ace + Ace = 12 (one Ace as 11, one as 1)', () => {
    expect(calculateHandValue(makeHand('A', 'A'))).toBe(12);
  });

  test('Ace + Ace + 9 = 21 (A=11, A=1, 9=9)', () => {
    expect(calculateHandValue(makeHand('A', 'A', '9'))).toBe(21);
  });

  test('Ace + Ace + Ace = 13 (one A=11, two A=1)', () => {
    expect(calculateHandValue(makeHand('A', 'A', 'A'))).toBe(13);
  });

  test('four Aces = 14 (one A=11, three A=1)', () => {
    expect(calculateHandValue(makeHand('A', 'A', 'A', 'A'))).toBe(14);
  });

  test('Ace + 5 + 5 = 21 (three cards — not blackjack but 21)', () => {
    expect(calculateHandValue(makeHand('A', '5', '5'))).toBe(21);
  });

  // --- Bust cases ---
  test('10 + 10 + 5 = 25 (bust)', () => {
    expect(calculateHandValue(makeHand('10', '10', '5'))).toBe(25);
  });

  test('7 + 8 + 9 = 24 (bust)', () => {
    expect(calculateHandValue(makeHand('7', '8', '9'))).toBe(24);
  });

  // --- Face-down cards are excluded ---
  test('face-down card is NOT counted', () => {
    const hand: Hand = [makeCard('K'), makeCard('7', true)]; // K visible, 7 hidden
    expect(calculateHandValue(hand)).toBe(10); // only K counts
  });

  test('face-down Ace is NOT counted', () => {
    const hand: Hand = [makeCard('5'), makeCard('A', true)];
    expect(calculateHandValue(hand)).toBe(5);
  });
});

describe('isSoftHand', () => {
  test('Ace + 6 is soft 17', () => {
    expect(isSoftHand(makeHand('A', '6'))).toBe(true);
  });

  test('Ace + 9 is soft 20', () => {
    expect(isSoftHand(makeHand('A', '9'))).toBe(true);
  });

  test('Ace + King is soft 21 (blackjack)', () => {
    expect(isSoftHand(makeHand('A', 'K'))).toBe(true);
  });

  test('Ace + 5 + 10 is hard 16 (Ace forced to 1)', () => {
    expect(isSoftHand(makeHand('A', '5', '10'))).toBe(false);
  });

  test('7 + 10 is hard 17 (no Aces)', () => {
    expect(isSoftHand(makeHand('7', '10'))).toBe(false);
  });

  test('Ace + Ace = 12, one Ace as 11 = soft', () => {
    expect(isSoftHand(makeHand('A', 'A'))).toBe(true);
  });

  test('empty hand is not soft', () => {
    expect(isSoftHand([])).toBe(false);
  });
});

describe('isBlackjack', () => {
  test('Ace + King = blackjack', () => {
    expect(isBlackjack(makeHand('A', 'K'))).toBe(true);
  });

  test('Ace + Queen = blackjack', () => {
    expect(isBlackjack(makeHand('A', 'Q'))).toBe(true);
  });

  test('Ace + Jack = blackjack', () => {
    expect(isBlackjack(makeHand('A', 'J'))).toBe(true);
  });

  test('Ace + 10 = blackjack', () => {
    expect(isBlackjack(makeHand('A', '10'))).toBe(true);
  });

  test('Ace + 5 + 5 = 21 but NOT blackjack (3 cards)', () => {
    expect(isBlackjack(makeHand('A', '5', '5'))).toBe(false);
  });

  test('10 + 10 + A = 21 but NOT blackjack (3 cards)', () => {
    expect(isBlackjack(makeHand('10', '10', 'A'))).toBe(false);
  });

  test('Ace + 9 = 20, NOT blackjack', () => {
    expect(isBlackjack(makeHand('A', '9'))).toBe(false);
  });

  test('single card is NOT blackjack', () => {
    expect(isBlackjack(makeHand('A'))).toBe(false);
  });

  test('face-down card does not count toward blackjack', () => {
    // A is visible, K is face-down — only 1 visible card, not blackjack
    const hand: Hand = [makeCard('A'), makeCard('K', true)];
    expect(isBlackjack(hand)).toBe(false);
  });
});

describe('isBust', () => {
  test('22 is bust', () => {
    expect(isBust(makeHand('10', 'Q', '2'))).toBe(true);
  });

  test('21 is NOT bust', () => {
    expect(isBust(makeHand('10', 'Q', 'A'))).toBe(false);
  });

  test('20 is NOT bust', () => {
    expect(isBust(makeHand('10', 'Q'))).toBe(false);
  });

  test('Ace saves from bust: A + 10 + 10 = 21', () => {
    expect(isBust(makeHand('A', '10', '10'))).toBe(false);
  });

  test('two Aces + 10 + 10 = 22 (bust — both Aces forced to 1, still 22)', () => {
    // A(11) + A(11) + 10 + 10 = 42 → reduce to A(1)+A(11)+10+10 = 32 → reduce to A(1)+A(1)+10+10 = 22 → bust
    expect(isBust(makeHand('A', 'A', '10', '10'))).toBe(true);
  });

  test('empty hand is not bust', () => {
    expect(isBust([])).toBe(false);
  });
});
