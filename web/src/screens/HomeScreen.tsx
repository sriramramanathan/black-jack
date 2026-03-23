import { useState } from 'react';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  // Both callbacks receive (playerName, roomCode) so App can set up the connection
  onCreateGame: (playerName: string, roomCode: string) => void;
  onJoinGame: (playerName: string, roomCode: string) => void;
}

export function HomeScreen({ onCreateGame, onJoinGame }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!playerName.trim()) return setError('Enter your name first');

    setCreating(true);
    setError('');

    try {
      // Ask the worker to generate a fresh room code.
      // VITE_WORKER_URL is empty in dev (Vite proxy handles it) and set to the
      // deployed worker URL in production.
      const workerBase = import.meta.env.VITE_WORKER_URL ?? '';
      const res = await fetch(`${workerBase}/room/new`);
      if (!res.ok) throw new Error('Server error');
      const { roomCode } = (await res.json()) as { roomCode: string };
      onCreateGame(playerName.trim(), roomCode);
    } catch {
      setError('Could not reach the server. Is the worker running? (cd worker && npx wrangler dev)');
      setCreating(false);
    }
  };

  const handleJoin = () => {
    if (!playerName.trim()) return setError('Enter your name first');
    if (joinCode.trim().length < 4) return setError('Enter a valid room code');
    setError('');
    onJoinGame(playerName.trim(), joinCode.trim().toUpperCase());
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>♠ Blackjack ♥</h1>
        <p className={styles.subtitle}>Multiplayer · Up to 4 players</p>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Your name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={20}
            autoFocus
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.createBtn} onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating room...' : '🎲 Create New Game'}
        </button>

        <div className={styles.orDivider}>
          <hr />
          <span>or join with a code</span>
          <hr />
        </div>

        <div className={styles.joinRow}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={6}
            className={styles.codeInput}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button className={styles.joinBtn} onClick={handleJoin}>
            Join →
          </button>
        </div>
      </div>
    </div>
  );
}
