import { getAvailableActions, canHit, canStand, canDouble, canSplit } from '../actions';
import { Card, Hand } from '../types';

function makeHand(...ranks: string[]): Hand {
  return ranks.map(rank => ({ suit: 'clubs', rank, faceDown: false }) as Card);
}

describe('getAvailableActions', () => {
  test('normal two-card hand: hit, stand, double, split (same rank)', () => {
    const actions = getAvailableActions(makeHand('8', '8'));
    expect(actions).toContain('hit');
    expect(actions).toContain('stand');
    expect(actions).toContain('double');
    expect(actions).toContain('split');
  });

  test('two different cards: hit, stand, double (no split)', () => {
    const actions = getAvailableActions(makeHand('8', '7'));
    expect(actions).toContain('hit');
    expect(actions).toContain('stand');
    expect(actions).toContain('double');
    expect(actions).not.toContain('split');
  });

  test('three-card hand: only hit and stand (no double, no split)', () => {
    const actions = getAvailableActions(makeHand('5', '7', '3'));
    expect(actions).toContain('hit');
    expect(actions).toContain('stand');
    expect(actions).not.toContain('double');
    expect(actions).not.toContain('split');
  });

  test('bust hand: no actions available', () => {
    expect(getAvailableActions(makeHand('10', 'Q', '5'))).toHaveLength(0);
  });

  test('blackjack hand: no actions available', () => {
    expect(getAvailableActions(makeHand('A', 'K'))).toHaveLength(0);
  });

  test('21 with 3 cards: can still hit and stand (not blackjack)', () => {
    const actions = getAvailableActions(makeHand('A', '5', '5'));
    expect(actions).toContain('hit');
    expect(actions).toContain('stand');
  });
});

describe('canSplit edge cases', () => {
  test('two Kings: can split (same rank)', () => {
    expect(canSplit(makeHand('K', 'K'))).toBe(true);
  });

  test('King + Queen: cannot split (both worth 10 but different rank)', () => {
    // In standard rules, split is by rank not by value
    expect(canSplit(makeHand('K', 'Q'))).toBe(false);
  });

  test('two Aces: can split', () => {
    expect(canSplit(makeHand('A', 'A'))).toBe(true);
  });
});

describe('canDouble', () => {
  test('two cards: can double', () => {
    expect(canDouble(makeHand('5', '6'))).toBe(true);
  });

  test('three cards: cannot double', () => {
    expect(canDouble(makeHand('5', '6', '2'))).toBe(false);
  });

  test('bust hand: cannot double', () => {
    expect(canDouble(makeHand('10', 'Q', '5'))).toBe(false);
  });
});

describe('canHit and canStand', () => {
  test('normal hand: can hit and stand', () => {
    expect(canHit(makeHand('7', '8'))).toBe(true);
    expect(canStand(makeHand('7', '8'))).toBe(true);
  });

  test('bust: cannot hit or stand', () => {
    const bust = makeHand('10', 'Q', '5');
    expect(canHit(bust)).toBe(false);
    expect(canStand(bust)).toBe(false);
  });

  test('blackjack: cannot hit or stand', () => {
    const bj = makeHand('A', 'J');
    expect(canHit(bj)).toBe(false);
    expect(canStand(bj)).toBe(false);
  });
});
