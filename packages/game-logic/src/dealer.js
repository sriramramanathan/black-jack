import { calculateHandValue, isSoftHand } from './hand';
// S17 Rule (standard in most casinos):
// Dealer stands on ALL 17s — including soft 17 (e.g. Ace + 6)
// This is slightly better for the player vs the H17 rule below
export function dealerShouldHit(hand) {
    return calculateHandValue(hand) < 17;
}
// H17 Rule (common in Las Vegas Strip casinos):
// Dealer ALSO hits on soft 17 (e.g. A+6 = 7 or 17)
// Slightly better for the house
export function dealerShouldHitH17(hand) {
    const value = calculateHandValue(hand);
    if (value < 17)
        return true;
    if (value === 17 && isSoftHand(hand))
        return true;
    return false;
}
