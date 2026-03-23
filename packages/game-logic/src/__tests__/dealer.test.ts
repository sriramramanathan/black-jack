import { dealerShouldHit, dealerShouldHitH17 } from '../dealer';
import { Card, Hand } from '../types';

function makeHand(...ranks: string[]): Hand {
  return ranks.map(rank => ({ suit: 'diamonds', rank, faceDown: false }) as Card);
}

describe('dealerShouldHit (S17 rule — stand on all 17s)', () => {
  test('hits on 16', () => {
    expect(dealerShouldHit(makeHand('10', '6'))).toBe(true);
  });

  test('hits on soft 16 (A + 5)', () => {
    expect(dealerShouldHit(makeHand('A', '5'))).toBe(true);
  });

  test('stands on hard 17 (10 + 7)', () => {
    expect(dealerShouldHit(makeHand('10', '7'))).toBe(false);
  });

  test('stands on soft 17 (A + 6) — this is the S17 rule', () => {
    expect(dealerShouldHit(makeHand('A', '6'))).toBe(false);
  });

  test('stands on 18', () => {
    expect(dealerShouldHit(makeHand('10', '8'))).toBe(false);
  });

  test('stands on 21', () => {
    expect(dealerShouldHit(makeHand('A', 'K'))).toBe(false);
  });

  test('hits on 2 (early game)', () => {
    expect(dealerShouldHit(makeHand('2'))).toBe(true);
  });

  test('hits on bust? No — bust value is >21, still returns false (dealer already done)', () => {
    // Dealer shouldn't be asked to hit after busting, but defensively it returns false
    expect(dealerShouldHit(makeHand('10', 'Q', '5'))).toBe(false);
  });
});

describe('dealerShouldHitH17 (H17 rule — hit on soft 17)', () => {
  test('hits on hard 16', () => {
    expect(dealerShouldHitH17(makeHand('10', '6'))).toBe(true);
  });

  test('hits on soft 16 (A + 5)', () => {
    expect(dealerShouldHitH17(makeHand('A', '5'))).toBe(true);
  });

  test('hits on soft 17 (A + 6) — this is the H17 difference', () => {
    expect(dealerShouldHitH17(makeHand('A', '6'))).toBe(true);
  });

  test('stands on hard 17 (10 + 7)', () => {
    expect(dealerShouldHitH17(makeHand('10', '7'))).toBe(false);
  });

  test('stands on soft 18 (A + 7)', () => {
    expect(dealerShouldHitH17(makeHand('A', '7'))).toBe(false);
  });

  test('stands on 18', () => {
    expect(dealerShouldHitH17(makeHand('10', '8'))).toBe(false);
  });
});
