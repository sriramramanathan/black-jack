import { Hand as HandType } from '@blackjack/game-logic';
import { calculateHandValue, isBlackjack, isBust } from '@blackjack/game-logic';
import { Card } from './Card';
import styles from './Hand.module.css';

interface HandProps {
  hand: HandType;
  size?: 'normal' | 'small';
  // label shown above the cards e.g. "Split Hand 2"
  label?: string;
}

export function Hand({ hand, size = 'normal', label }: HandProps) {
  if (hand.length === 0) return null;

  const value = calculateHandValue(hand);
  const bust = isBust(hand);
  const bj = isBlackjack(hand);

  // Build a readable status string shown next to the value
  const status = bust ? 'Bust!' : bj ? 'Blackjack!' : null;

  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}

      {/* The row of cards */}
      <div className={styles.cards}>
        {hand.map((card, i) => (
          <Card key={i} card={card} size={size} />
        ))}
      </div>

      {/* Value + status */}
      <div className={styles.value}>
        <span className={bust ? styles.bust : bj ? styles.blackjack : ''}>{value}</span>
        {status && <span className={styles.status}>{status}</span>}
      </div>
    </div>
  );
}
