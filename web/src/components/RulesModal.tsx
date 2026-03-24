import { useEffect } from 'react';
import styles from './RulesModal.module.css';

interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>How to Play Blackjack</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🎯 Objective</h3>
            <p>Beat the dealer by getting a hand value closer to <strong>21</strong> — without going over.</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🃏 Card Values</h3>
            <div className={styles.table}>
              <div className={styles.row}><span>2 – 10</span><span>Face value</span></div>
              <div className={styles.row}><span>J, Q, K</span><span>10</span></div>
              <div className={styles.row}><span>Ace</span><span>1 or 11 (whichever helps more)</span></div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>▶ How a Round Works</h3>
            <ol className={styles.list}>
              <li>Everyone places a bet.</li>
              <li>Each player and the dealer receive 2 cards. One dealer card is face-down (the <em>hole card</em>).</li>
              <li>Players act in turn, then the dealer reveals the hole card and plays.</li>
              <li>Payouts are settled and the next round begins.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🕹 Your Actions</h3>
            <div className={styles.table}>
              <div className={styles.row}><span className={styles.action}>Hit</span><span>Take another card.</span></div>
              <div className={styles.row}><span className={styles.action}>Stand</span><span>Keep your hand and end your turn.</span></div>
              <div className={styles.row}><span className={styles.action}>Double Down</span><span>Double your bet, take exactly one more card, then stand.</span></div>
              <div className={styles.row}><span className={styles.action}>Split</span><span>If your first two cards match in rank, split them into two separate hands (each with its own bet).</span></div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🏦 Dealer Rules</h3>
            <p>The dealer <strong>must hit</strong> on 16 or less and <strong>must stand</strong> on 17 or more. The dealer has no choice.</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>💰 Payouts</h3>
            <div className={styles.table}>
              <div className={styles.row}><span>Blackjack</span><span className={styles.win}>3 : 2 (e.g. bet $10, win $15)</span></div>
              <div className={styles.row}><span>Normal win</span><span className={styles.win}>1 : 1 (win what you bet)</span></div>
              <div className={styles.row}><span>Push (tie)</span><span>Bet returned, no gain or loss</span></div>
              <div className={styles.row}><span>Bust / Lose</span><span className={styles.lose}>Lose your bet</span></div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>⭐ Blackjack</h3>
            <p>An Ace + any 10-value card dealt on the first two cards. Beats everything except the dealer's blackjack (which is a push).</p>
          </section>

        </div>
      </div>
    </div>
  );
}
