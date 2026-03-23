import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { useGameRoom } from './hooks/useGameRoom';
import { ClientMessage } from '@blackjack/shared';
import { GameState } from '@blackjack/game-logic';

// ── Types ──────────────────────────────────────────────────────────────────

interface RoomInfo {
  roomCode: string;
  playerName: string;
  isHost: boolean;
}

// ── RoomView ───────────────────────────────────────────────────────────────
// Extracted as its own component so that useGameRoom (a hook) is only called
// when we actually have a room to connect to. React's rules of hooks require
// hooks to be called unconditionally — splitting into a sub-component is the
// clean way to conditionally "enable" a hook.

interface RoomViewProps extends RoomInfo {
  onLeave: () => void;
}

function RoomView({ roomCode, playerName, isHost, onLeave }: RoomViewProps) {
  const { gameState, myPlayerId, isConnected, error, send } = useGameRoom({
    roomCode,
    playerName,
  });

  // Derive which screen to show from the server's game phase.
  // Stay on lobby until we have a player ID — if JOIN was rejected (game mid-round)
  // myPlayerId never gets set, so the player waits here instead of landing on GameScreen.
  const isLobby = !gameState || gameState.phase === 'waiting_for_players' || !myPlayerId;

  // Type-narrow: GameScreen requires a non-null gameState
  const nonNullState = gameState as GameState;

  // A thin helper so we can pass a typed send + handle the PLACE_BET wrapper
  const sendMsg = (msg: ClientMessage) => send(msg);

  if (isLobby) {
    return (
      <LobbyScreen
        roomCode={roomCode}
        gameState={gameState}
        isHost={isHost}
        isConnected={isConnected}
        error={error}
        send={sendMsg}
      />
    );
  }

  return (
    <GameScreen
      gameState={nonNullState}
      myPlayerId={myPlayerId}
      isHost={isHost}
      isConnected={isConnected}
      error={error}
      send={sendMsg}
    />
  );
}

// ── App ────────────────────────────────────────────────────────────────────
// Manages which screen is visible at the top level.
// The only state here is "which room am I in (if any)".

export function App() {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  // Not in a room — show the home screen
  if (!roomInfo) {
    return (
      <HomeScreen
        onCreateGame={(playerName, roomCode) =>
          setRoomInfo({ roomCode, playerName, isHost: true })
        }
        onJoinGame={(playerName, roomCode) =>
          setRoomInfo({ roomCode, playerName, isHost: false })
        }
      />
    );
  }

  // In a room — connect and show lobby or game
  return <RoomView {...roomInfo} onLeave={() => setRoomInfo(null)} />;
}
