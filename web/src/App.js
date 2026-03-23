import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { useGameRoom } from './hooks/useGameRoom';
function RoomView({ roomCode, playerName, isHost, onLeave }) {
    const { gameState, myPlayerId, isConnected, error, send } = useGameRoom({
        roomCode,
        playerName,
    });
    // Derive which screen to show from the server's game phase.
    // Stay on lobby until we have a player ID — if JOIN was rejected (game mid-round)
    // myPlayerId never gets set, so the player waits here instead of landing on GameScreen.
    const isLobby = !gameState || gameState.phase === 'waiting_for_players' || !myPlayerId;
    // Type-narrow: GameScreen requires a non-null gameState
    const nonNullState = gameState;
    // A thin helper so we can pass a typed send + handle the PLACE_BET wrapper
    const sendMsg = (msg) => send(msg);
    if (isLobby) {
        return (_jsx(LobbyScreen, { roomCode: roomCode, gameState: gameState, isHost: isHost, isConnected: isConnected, error: error, send: sendMsg }));
    }
    return (_jsx(GameScreen, { gameState: nonNullState, myPlayerId: myPlayerId, isHost: isHost, isConnected: isConnected, error: error, send: sendMsg }));
}
// ── App ────────────────────────────────────────────────────────────────────
// Manages which screen is visible at the top level.
// The only state here is "which room am I in (if any)".
export function App() {
    const [roomInfo, setRoomInfo] = useState(null);
    // Not in a room — show the home screen
    if (!roomInfo) {
        return (_jsx(HomeScreen, { onCreateGame: (playerName, roomCode) => setRoomInfo({ roomCode, playerName, isHost: true }), onJoinGame: (playerName, roomCode) => setRoomInfo({ roomCode, playerName, isHost: false }) }));
    }
    // In a room — connect and show lobby or game
    return _jsx(RoomView, { ...roomInfo, onLeave: () => setRoomInfo(null) });
}
