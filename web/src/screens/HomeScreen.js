import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import styles from './HomeScreen.module.css';
export function HomeScreen({ onCreateGame, onJoinGame }) {
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const handleCreate = async () => {
        if (!playerName.trim())
            return setError('Enter your name first');
        setCreating(true);
        setError('');
        try {
            // Ask the worker to generate a fresh room code.
            // VITE_WORKER_URL is empty in dev (Vite proxy handles it) and set to the
            // deployed worker URL in production.
            const workerBase = import.meta.env.VITE_WORKER_URL ?? '';
            const res = await fetch(`${workerBase}/room/new`);
            if (!res.ok)
                throw new Error('Server error');
            const { roomCode } = (await res.json());
            onCreateGame(playerName.trim(), roomCode);
        }
        catch {
            setError('Could not reach the server. Is the worker running? (cd worker && npx wrangler dev)');
            setCreating(false);
        }
    };
    const handleJoin = () => {
        if (!playerName.trim())
            return setError('Enter your name first');
        if (joinCode.trim().length < 4)
            return setError('Enter a valid room code');
        setError('');
        onJoinGame(playerName.trim(), joinCode.trim().toUpperCase());
    };
    return (_jsx("div", { className: styles.container, children: _jsxs("div", { className: styles.card, children: [_jsx("h1", { className: styles.title, children: "\u2660 Blackjack \u2665" }), _jsx("p", { className: styles.subtitle, children: "Multiplayer \u00B7 Up to 4 players" }), _jsxs("div", { className: styles.field, children: [_jsx("label", { className: styles.fieldLabel, children: "Your name" }), _jsx("input", { value: playerName, onChange: e => setPlayerName(e.target.value), placeholder: "e.g. Alice", maxLength: 20, autoFocus: true })] }), error && _jsx("p", { className: styles.error, children: error }), _jsx("button", { className: styles.createBtn, onClick: handleCreate, disabled: creating, children: creating ? 'Creating room...' : '🎲 Create New Game' }), _jsxs("div", { className: styles.orDivider, children: [_jsx("hr", {}), _jsx("span", { children: "or join with a code" }), _jsx("hr", {})] }), _jsxs("div", { className: styles.joinRow, children: [_jsx("input", { value: joinCode, onChange: e => setJoinCode(e.target.value.toUpperCase()), placeholder: "Room code", maxLength: 6, className: styles.codeInput, onKeyDown: e => e.key === 'Enter' && handleJoin() }), _jsx("button", { className: styles.joinBtn, onClick: handleJoin, children: "Join \u2192" })] })] }) }));
}
