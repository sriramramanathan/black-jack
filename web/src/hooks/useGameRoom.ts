import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState } from '@blackjack/game-logic';
import { ClientMessage, ServerMessage } from '@blackjack/shared';

interface UseGameRoomOptions {
  roomCode: string;
  playerName: string;
}

interface UseGameRoomResult {
  gameState: GameState | null;
  myPlayerId: string | null;
  isConnected: boolean;
  error: string | null;
  send: (message: ClientMessage) => void;
}

export function useGameRoom({ roomCode, playerName }: UseGameRoomOptions): UseGameRoomResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef stores values that persist across renders but don't CAUSE re-renders.
  // We use refs here for the WebSocket and player ID because:
  // - wsRef: we need to access the socket in callbacks without stale closures
  // - playerIdRef: we need to check "have we found our ID yet?" without re-renders
  // - retryJoinSentRef: tracks whether we've sent a retry JOIN to avoid duplicates
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const retryJoinSentRef = useRef(false);

  // useCallback memoises this function so it doesn't get recreated on every render.
  // Components that receive `send` as a prop won't re-render unnecessarily.
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    // In development the Vite proxy rewrites /room/... → ws://localhost:8787/room/...
    // In production VITE_WORKER_URL is set to the deployed worker's https:// URL
    // and we swap the scheme to wss://.
    const workerBase = import.meta.env.VITE_WORKER_URL ?? '';
    const fullUrl = workerBase
      ? workerBase.replace(/^https/, 'wss').replace(/^http/, 'ws') + `/room/${roomCode}`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/room/${roomCode}`;

    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Immediately join the room with our name.
      // The server adds us as a player and broadcasts the updated state.
      ws.send(JSON.stringify({ type: 'JOIN', playerName } satisfies ClientMessage));
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data as string) as ServerMessage;

      if (message.type === 'STATE_UPDATE') {
        setGameState(message.state);

        // Find our player ID — set once after a successful JOIN.
        if (!playerIdRef.current) {
          const me = message.state.players.find(p => p.name === playerName);
          if (me) {
            // Successfully joined — record the ID and clear retry flag
            playerIdRef.current = me.id;
            retryJoinSentRef.current = false;
            setMyPlayerId(me.id);
          } else if (
            !retryJoinSentRef.current &&
            message.state.phase === 'round_over'
          ) {
            // Our initial JOIN was rejected (game was mid-round).
            // The round just ended — send JOIN now while the phase allows it.
            retryJoinSentRef.current = true;
            wsRef.current?.send(JSON.stringify({ type: 'JOIN', playerName } satisfies ClientMessage));
          }
        }
      }

      if (message.type === 'ERROR') {
        setError(message.message);
        // Auto-dismiss the error after 4 seconds
        setTimeout(() => setError(null), 4000);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      // Only surface the error if this WebSocket is still the active one.
      // In React 18 StrictMode, the effect runs twice: the first WebSocket is
      // intentionally closed by the cleanup (wsRef.current = null), then onerror
      // fires asynchronously. Without this guard, that stale error would persist
      // on screen even though the second connection succeeded.
      if (wsRef.current !== ws) return;
      setError('Connection failed. Is the worker running? (cd worker && npx wrangler dev)');
      setIsConnected(false);
    };

    // Cleanup: close the WebSocket when the component unmounts or roomCode changes.
    // Without this, old connections would keep running in the background.
    return () => {
      ws.close();
      wsRef.current = null;
      playerIdRef.current = null;
      retryJoinSentRef.current = false;
    };
  }, [roomCode, playerName]);

  return { gameState, myPlayerId, isConnected, error, send };
}
