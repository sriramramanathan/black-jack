import { determineResult, calculatePayout } from '../payouts';
import { Card, Hand } from '../types';

function makeHand(...ranks: string[]): Hand {
  return ranks.map(rank => ({ suit: 'spades', rank, faceDown: false }) as Card);
}

describe('determineResult', () => {
  // --- Player bust (always loses regardless of dealer) ---
  test('player bust = bust, even if dealer also busts', () => {
    expect(determineResult(makeHand('10', 'Q', '5'), makeHand('10', 'Q', '3'))).toBe('bust');
  });

  test('player bust = bust, even if dealer has low hand', () => {
    expect(determineResult(makeHand('10', 'Q', '5'), makeHand('5', '6'))).toBe('bust');
  });

  // --- Blackjack ---
  test('player blackjack vs dealer 20 = blackjack', () => {
    expect(determineResult(makeHand('A', 'K'), makeHand('10', 'Q'))).toBe('blackjack');
  });

  test('player blackjack vs dealer blackjack = push', () => {
    expect(determineResult(makeHand('A', 'K'), makeHand('A', 'Q'))).toBe('push');
  });

  test('player blackjack vs dealer bust = blackjack (player bj takes priority)', () => {
    expect(determineResult(makeHand('A', 'K'), makeHand('10', 'Q', '5'))).toBe('blackjack');
  });

  // --- Dealer bust (player wins if not busted) ---
  test('dealer bust, player has 15 = win', () => {
    expect(determineResult(makeHand('10', '5'), makeHand('10', 'Q', '5'))).toBe('win');
  });

  // --- Normal comparisons ---
  test('player 20 vs dealer 18 = win', () => {
    expect(determineResult(makeHand('10', 'Q'), makeHand('10', '8'))).toBe('win');
  });

  test('player 17 vs dealer 19 = lose', () => {
    expect(determineResult(makeHand('10', '7'), makeHand('10', '9'))).toBe('lose');
  });

  test('player 18 vs dealer 18 = push', () => {
    expect(determineResult(makeHand('10', '8'), makeHand('10', '8'))).toBe('push');
  });

  test('player 21 (3 cards) vs dealer 20 = win (not blackjack, just win)', () => {
    expect(determineResult(makeHand('A', '5', '5'), makeHand('10', 'Q'))).toBe('win');
  });

  test('player 21 (3 cards) vs dealer 21 (3 cards) = push', () => {
    expect(determineResult(makeHand('A', '5', '5'), makeHand('A', '5', '5'))).toBe('push');
  });
});

describe('calculatePayout', () => {
  // --- Blackjack 3:2 ---
  test('blackjack on 100 bet = +150', () => {
    expect(calculatePayout(100, 'blackjack')).toBe(150);
  });

  test('blackjack on 10 bet = +15', () => {
    expect(calculatePayout(10, 'blackjack')).toBe(15);
  });

  test('blackjack on odd bet floors down: 15 bet → floor(22.5) = +22', () => {
    expect(calculatePayout(15, 'blackjack')).toBe(22);
  });

  // --- Regular win 1:1 ---
  test('win on 100 bet = +100', () => {
    expect(calculatePayout(100, 'win')).toBe(100);
  });

  test('win on 0 bet = 0', () => {
    expect(calculatePayout(0, 'win')).toBe(0);
  });

  // --- Push ---
  test('push returns 0 net change', () => {
    expect(calculatePayout(100, 'push')).toBe(0);
  });

  // --- Lose / Bust ---
  test('lose = negative bet', () => {
    expect(calculatePayout(100, 'lose')).toBe(-100);
  });

  test('bust = negative bet', () => {
    expect(calculatePayout(50, 'bust')).toBe(-50);
  });

  // --- Edge cases ---
  test('negative bet throws', () => {
    expect(() => calculatePayout(-10, 'win')).toThrow('Bet cannot be negative');
  });
});
