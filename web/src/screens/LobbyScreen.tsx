import { GameState, MAX_PLAYERS } from '@blackjack/game-logic';
import { ClientMessage } from '@blackjack/shared';
import { ErrorToast } from '../components/ErrorToast';
import styles from './LobbyScreen.module.css';

interface LobbyScreenProps {
  roomCode: string;
  gameState: GameState | null;
  isHost: boolean;
  isConnected: boolean;
  error: string | null;
  send: (message: ClientMessage) => void;
}

export function LobbyScreen({
  roomCode,
  gameState,
  isHost,
  isConnected,
  error,
  send,
}: LobbyScreenProps) {
  const players = gameState?.players ?? [];
  const canStart = isHost && players.length >= 1;
  const gameInProgress =
    gameState !== null && gameState.phase !== 'waiting_for_players';

  return (
    <div className={styles.container}>
      <ErrorToast message={error} />

      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {gameInProgress ? 'Game in progress' : 'Waiting for players'}
          </h2>
          <div className={styles.connectionStatus}>
            <span className={isConnected ? styles.dotOnline : styles.dotOffline} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* Room code */}
        <div className={styles.roomCodeBox}>
          <p className={styles.roomCodeLabel}>Room code</p>
          <p className={styles.roomCode}>{roomCode}</p>
        </div>

        {/* Game-in-progress: show who's playing and a holding message */}
        {gameInProgress ? (
          <>
            <div className={styles.playerList}>
              <p className={styles.playerCount}>
                {players.length} / {MAX_PLAYERS} players in this round
              </p>
              {players.map((player, i) => (
                <div key={player.id} className={styles.playerRow}>
                  <span className={styles.playerIndex}>{i + 1}</span>
                  <span className={styles.playerName}>{player.name}</span>
                  {i === 0 && <span className={styles.hostBadge}>Host</span>}
                </div>
              ))}
            </div>
            <p className={styles.waitingMsg}>
              Round {gameState!.roundNumber} is underway.
              <br />
              You'll automatically join at the start of the next round.
            </p>
          </>
        ) : (
          <>
            {/* Normal pre-game lobby */}
            <div className={styles.playerList}>
              <p className={styles.playerCount}>
                {players.length} / {MAX_PLAYERS} players
              </p>
              {players.map((player, i) => (
                <div key={player.id} className={styles.playerRow}>
                  <span className={styles.playerIndex}>{i + 1}</span>
                  <span className={styles.playerName}>{player.name}</span>
                  {i === 0 && <span className={styles.hostBadge}>Host</span>}
                </div>
              ))}
              {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
                <div key={`empty-${i}`} className={`${styles.playerRow} ${styles.emptySlot}`}>
                  <span className={styles.playerIndex}>{players.length + i + 1}</span>
                  <span className={styles.playerName}>Waiting...</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                className={styles.startBtn}
                onClick={() => send({ type: 'START_GAME' })}
                disabled={!canStart}
              >
                {canStart ? '▶ Start Game' : 'Need at least 1 player'}
              </button>
            ) : (
              <p className={styles.waitingMsg}>Waiting for the host to start the game...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
