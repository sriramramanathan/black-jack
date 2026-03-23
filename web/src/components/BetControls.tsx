import { useState } from 'react';
import { MIN_BET } from '@blackjack/game-logic';
import styles from './BetControls.module.css';

interface BetControlsProps {
  availableChips: number;
  onPlaceBet: (amount: number) => void;
  disabled?: boolean;
}

const CHIP_VALUES = [10, 25, 50, 100, 250, 500];

// Casino standard chip colours
const CHIP_COLORS: Record<number, { bg: string; border: string }> = {
  10:  { bg: 'linear-gradient(145deg, #1e88e5, #1565c0)', border: '#90caf9' },
  25:  { bg: 'linear-gradient(145deg, #43a047, #2e7d32)', border: '#a5d6a7' },
  50:  { bg: 'linear-gradient(145deg, #fb8c00, #e65100)', border: '#ffcc80' },
  100: { bg: 'linear-gradient(145deg, #424242, #212121)', border: '#e0e0e0' },
  250: { bg: 'linear-gradient(145deg, #8e24aa, #6a1b9a)', border: '#ce93d8' },
  500: { bg: 'linear-gradient(145deg, #e53935, #b71c1c)', border: '#ef9a9a' },
};

export function BetControls({ availableChips, onPlaceBet, disabled }: BetControlsProps) {
  const [bet, setBet] = useState(MIN_BET);

  const addChip = (value: number) => {
    setBet(prev => Math.min(prev + value, availableChips));
  };

  const clearBet = () => setBet(MIN_BET);

  const confirmBet = () => {
    onPlaceBet(bet);
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Place your bet</p>

      {/* Clickable chip stack */}
      <div className={styles.chips}>
        {CHIP_VALUES.map(value => {
          const { bg, border } = CHIP_COLORS[value];
          return (
            <button
              key={value}
              className={styles.chip}
              style={{ background: bg, borderColor: border }}
              onClick={() => addChip(value)}
              disabled={disabled || bet + value > availableChips}
            >
              ${value}
            </button>
          );
        })}
      </div>

      {/* Current bet display */}
      <div className={styles.betDisplay}>
        <span className={styles.betLabel}>Bet:</span>
        <span className={styles.betAmount}>${bet}</span>
        <button className={styles.clearBtn} onClick={clearBet} disabled={disabled || bet === MIN_BET}>
          Clear
        </button>
      </div>

      {/* Confirm button */}
      <button
        className={styles.confirmBtn}
        onClick={confirmBet}
        disabled={disabled || bet < MIN_BET || bet > availableChips}
      >
        Confirm Bet
      </button>
    </div>
  );
}
