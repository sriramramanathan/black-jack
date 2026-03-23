import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './Card.module.css';
// Maps suit name to its Unicode symbol
const SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};
const RED_SUITS = new Set(['hearts', 'diamonds']);
export function Card({ card, size = 'normal' }) {
    if (card.faceDown) {
        return (_jsx("div", { className: `${styles.card} ${styles.faceDown} ${styles[size]}`, children: _jsx("div", { className: styles.backPattern }) }));
    }
    const suit = SUIT_SYMBOLS[card.suit];
    const isRed = RED_SUITS.has(card.suit);
    return (_jsxs("div", { className: `${styles.card} ${styles[size]} ${isRed ? styles.red : styles.black}`, children: [_jsxs("div", { className: styles.corner, children: [_jsx("span", { className: styles.rank, children: card.rank }), _jsx("span", { className: styles.suit, children: suit })] }), _jsx("div", { className: styles.centerSuit, children: suit }), _jsxs("div", { className: `${styles.corner} ${styles.cornerBottom}`, children: [_jsx("span", { className: styles.rank, children: card.rank }), _jsx("span", { className: styles.suit, children: suit })] })] }));
}
