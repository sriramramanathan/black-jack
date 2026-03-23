import { jsx as _jsx } from "react/jsx-runtime";
import { getAvailableActions } from '@blackjack/game-logic';
import styles from './ActionButtons.module.css';
// Maps each action to button display config and the exact ClientMessage to send.
// We use explicit message objects (not a dynamic cast) so TypeScript can verify
// each message satisfies the ClientMessage discriminated union.
const ACTION_CONFIG = {
    hit: { label: 'Hit', className: 'btnHit', message: { type: 'HIT' } },
    stand: { label: 'Stand', className: 'btnStand', message: { type: 'STAND' } },
    double: { label: 'Double Down', className: 'btnDouble', message: { type: 'DOUBLE' } },
    split: { label: 'Split', className: 'btnSplit', message: { type: 'SPLIT' } },
};
export function ActionButtons({ hand, onAction }) {
    // getAvailableActions is the same function from Phase 2 game logic.
    // The UI never has to figure out what's valid — it just asks the game logic.
    const available = getAvailableActions(hand);
    if (available.length === 0)
        return null;
    return (_jsx("div", { className: styles.wrapper, children: available.map(action => {
            const config = ACTION_CONFIG[action];
            return (_jsx("button", { className: `${styles.btn} ${styles[config.className]}`, onClick: () => onAction(config.message), children: config.label }, action));
        }) }));
}
