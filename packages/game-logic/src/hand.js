const FACE_CARDS = new Set(['J', 'Q', 'K']);
// Returns the numeric value of a single card, ignoring Ace ambiguity
// Ace always returns 11 here — calculateHandValue handles reducing it
function getCardValue(rank) {
    if (rank === 'A')
        return 11;
    if (FACE_CARDS.has(rank))
        return 10;
    return parseInt(rank, 10); // '2' through '10'
}
// Calculates the best possible hand value (highest without busting)
// Key insight: start all Aces as 11, then reduce to 1 as needed
// Face-down cards are NOT counted (hidden from calculation)
export function calculateHandValue(hand) {
    let value = 0;
    let aceCount = 0;
    for (const card of hand) {
        if (card.faceDown)
            continue; // skip hidden cards
        if (card.rank === 'A')
            aceCount++;
        value += getCardValue(card.rank);
    }
    // Each Ace reduction: 11 → 1 saves 10 points
    // Keep reducing while we're busting AND we have Aces left to reduce
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }
    return value;
}
// A "soft" hand contains an Ace still being counted as 11
// Example: A+6 = soft 17 (could be 7 or 17)
// Example: A+6+K = hard 17 (Ace forced to 1 to avoid bust)
export function isSoftHand(hand) {
    let value = 0;
    let aceCount = 0;
    for (const card of hand) {
        if (card.faceDown)
            continue;
        if (card.rank === 'A')
            aceCount++;
        value += getCardValue(card.rank);
    }
    let reductions = 0;
    while (value > 21 && reductions < aceCount) {
        value -= 10;
        reductions++;
    }
    // Soft if at least one Ace is still counted as 11 (fewer reductions than Aces)
    return reductions < aceCount;
}
// Blackjack = exactly 2 FACE-UP cards totaling 21
// An Ace + a 10-value card on the initial deal
// A 3-card 21 is NOT blackjack — it just wins at 1:1
export function isBlackjack(hand) {
    const visibleCards = hand.filter(c => !c.faceDown);
    return visibleCards.length === 2 && calculateHandValue(hand) === 21;
}
// Bust = hand value over 21 — immediate loss regardless of dealer
export function isBust(hand) {
    return calculateHandValue(hand) > 21;
}
