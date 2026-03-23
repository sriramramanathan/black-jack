import { Hand } from '@blackjack/game-logic';
import { getAvailableActions } from '@blackjack/game-logic';
import { ClientMessage } from '@blackjack/shared';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  hand: Hand;
  onAction: (message: ClientMessage) => void;
}

// Maps each action to button display config and the exact ClientMessage to send.
// We use explicit message objects (not a dynamic cast) so TypeScript can verify
// each message satisfies the ClientMessage discriminated union.
const ACTION_CONFIG: Record<
  'hit' | 'stand' | 'double' | 'split',
  { label: string; className: string; message: ClientMessage }
> = {
  hit: { label: 'Hit', className: 'btnHit', message: { type: 'HIT' } },
  stand: { label: 'Stand', className: 'btnStand', message: { type: 'STAND' } },
  double: { label: 'Double Down', className: 'btnDouble', message: { type: 'DOUBLE' } },
  split: { label: 'Split', className: 'btnSplit', message: { type: 'SPLIT' } },
};

export function ActionButtons({ hand, onAction }: ActionButtonsProps) {
  // getAvailableActions is the same function from Phase 2 game logic.
  // The UI never has to figure out what's valid — it just asks the game logic.
  const available = getAvailableActions(hand);

  if (available.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {available.map(action => {
        const config = ACTION_CONFIG[action];
        return (
          <button
            key={action}
            className={`${styles.btn} ${styles[config.className]}`}
            onClick={() => onAction(config.message)}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
