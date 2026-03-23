import { calculateHandValue, isBlackjack, isBust } from './hand';
// Compares player and dealer hands and returns the outcome
// Call this AFTER the dealer has finished their turn
export function determineResult(playerHand, dealerHand) {
    const playerBust = isBust(playerHand);
    const dealerBust = isBust(dealerHand);
    const playerBlackjack = isBlackjack(playerHand);
    const dealerBlackjack = isBlackjack(dealerHand);
    // Player bust = loss, no matter what dealer has
    if (playerBust)
        return 'bust';
    // Both blackjack = push (tie)
    if (playerBlackjack && dealerBlackjack)
        return 'push';
    // Only player has blackjack = blackjack win (3:2 payout)
    if (playerBlackjack)
        return 'blackjack';
    // Dealer bust (and player didn't bust) = player wins
    if (dealerBust)
        return 'win';
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);
    if (playerValue > dealerValue)
        return 'win';
    if (playerValue < dealerValue)
        return 'lose';
    return 'push';
}
// Returns the NET chip change from a result
// Positive = player gains chips, Negative = player loses chips
// Does NOT include the returned stake — just the profit/loss
// Example: bet 100 on blackjack → calculatePayout(100, 'blackjack') = +150
//          player ends up with original 100 + 150 profit = 250 total
export function calculatePayout(bet, result) {
    if (bet < 0)
        throw new Error('Bet cannot be negative');
    switch (result) {
        case 'blackjack':
            // 3:2 payout — floor because chips are whole numbers
            return Math.floor(bet * 1.5);
        case 'win':
            return bet; // 1:1
        case 'push':
            return 0; // break even — bet is returned but no winnings
        case 'lose':
            return -bet;
        case 'bust':
            return -bet;
    }
}
