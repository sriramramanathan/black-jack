import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { MIN_BET } from '@blackjack/game-logic';
import styles from './BetControls.module.css';
const CHIP_VALUES = [10, 25, 50, 100, 250, 500];
// Casino standard chip colours
const CHIP_COLORS = {
    10: { bg: 'linear-gradient(145deg, #1e88e5, #1565c0)', border: '#90caf9' },
    25: { bg: 'linear-gradient(145deg, #43a047, #2e7d32)', border: '#a5d6a7' },
    50: { bg: 'linear-gradient(145deg, #fb8c00, #e65100)', border: '#ffcc80' },
    100: { bg: 'linear-gradient(145deg, #424242, #212121)', border: '#e0e0e0' },
    250: { bg: 'linear-gradient(145deg, #8e24aa, #6a1b9a)', border: '#ce93d8' },
    500: { bg: 'linear-gradient(145deg, #e53935, #b71c1c)', border: '#ef9a9a' },
};
export function BetControls({ availableChips, onPlaceBet, disabled }) {
    const [bet, setBet] = useState(MIN_BET);
    const addChip = (value) => {
        setBet(prev => Math.min(prev + value, availableChips));
    };
    const clearBet = () => setBet(MIN_BET);
    const confirmBet = () => {
        onPlaceBet(bet);
    };
    return (_jsxs("div", { className: styles.wrapper, children: [_jsx("p", { className: styles.label, children: "Place your bet" }), _jsx("div", { className: styles.chips, children: CHIP_VALUES.map(value => {
                    const { bg, border } = CHIP_COLORS[value];
                    return (_jsxs("button", { className: styles.chip, style: { background: bg, borderColor: border }, onClick: () => addChip(value), disabled: disabled || bet + value > availableChips, children: ["$", value] }, value));
                }) }), _jsxs("div", { className: styles.betDisplay, children: [_jsx("span", { className: styles.betLabel, children: "Bet:" }), _jsxs("span", { className: styles.betAmount, children: ["$", bet] }), _jsx("button", { className: styles.clearBtn, onClick: clearBet, disabled: disabled || bet === MIN_BET, children: "Clear" })] }), _jsx("button", { className: styles.confirmBtn, onClick: confirmBet, disabled: disabled || bet < MIN_BET || bet > availableChips, children: "Confirm Bet" })] }));
}
