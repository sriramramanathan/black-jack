import { Card as CardType } from '@blackjack/game-logic';
import styles from './Card.module.css';

interface CardProps {
  card: CardType;
  // small = used in other players' seats (less space)
  size?: 'normal' | 'small';
}

// Maps suit name to its Unicode symbol
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

export function Card({ card, size = 'normal' }: CardProps) {
  if (card.faceDown) {
    return (
      <div className={`${styles.card} ${styles.faceDown} ${styles[size]}`}>
        <div className={styles.backPattern} />
      </div>
    );
  }

  const suit = SUIT_SYMBOLS[card.suit];
  const isRed = RED_SUITS.has(card.suit);

  return (
    <div className={`${styles.card} ${styles[size]} ${isRed ? styles.red : styles.black}`}>
      {/* Top-left corner: rank + suit */}
      <div className={styles.corner}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suit}>{suit}</span>
      </div>

      {/* Centre suit symbol */}
      <div className={styles.centerSuit}>{suit}</div>

      {/* Bottom-right corner: rank + suit (rotated) */}
      <div className={`${styles.corner} ${styles.cornerBottom}`}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suit}>{suit}</span>
      </div>
    </div>
  );
}
