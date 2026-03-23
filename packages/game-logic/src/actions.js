import { isBust, isBlackjack } from './hand';
// Returns which actions are currently valid for the given hand
// Centralising this means the UI just asks "what's available?" rather than
// duplicating the logic in every button component
export function getAvailableActions(hand) {
    // No actions available if hand is already over
    if (isBust(hand) || isBlackjack(hand))
        return [];
    const actions = ['hit', 'stand'];
    // Double down: only allowed on the first two cards
    // You double your bet and receive exactly one more card, then stand
    if (hand.length === 2) {
        actions.push('double');
    }
    // Split: only when both initial cards share the same rank
    // Each card becomes the first card of a new separate hand
    if (hand.length === 2 && hand[0].rank === hand[1].rank) {
        actions.push('split');
    }
    return actions;
}
export function canHit(hand) {
    return getAvailableActions(hand).includes('hit');
}
export function canStand(hand) {
    return getAvailableActions(hand).includes('stand');
}
export function canDouble(hand) {
    return getAvailableActions(hand).includes('double');
}
export function canSplit(hand) {
    return getAvailableActions(hand).includes('split');
}
