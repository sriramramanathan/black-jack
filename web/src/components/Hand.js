import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { calculateHandValue, isBlackjack, isBust } from '@blackjack/game-logic';
import { Card } from './Card';
import styles from './Hand.module.css';
export function Hand({ hand, size = 'normal', label }) {
    if (hand.length === 0)
        return null;
    const value = calculateHandValue(hand);
    const bust = isBust(hand);
    const bj = isBlackjack(hand);
    // Build a readable status string shown next to the value
    const status = bust ? 'Bust!' : bj ? 'Blackjack!' : null;
    return (_jsxs("div", { className: styles.wrapper, children: [label && _jsx("span", { className: styles.label, children: label }), _jsx("div", { className: styles.cards, children: hand.map((card, i) => (_jsx(Card, { card: card, size: size }, i))) }), _jsxs("div", { className: styles.value, children: [_jsx("span", { className: bust ? styles.bust : bj ? styles.blackjack : '', children: value }), status && _jsx("span", { className: styles.status, children: status })] })] }));
}
