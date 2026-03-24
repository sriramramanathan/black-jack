import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from 'react';
import { calculateHandValue } from '@blackjack/game-logic';
import { Card as CardComponent } from '../components/Card';
import { ActionButtons } from '../components/ActionButtons';
import { BetControls } from '../components/BetControls';
import { ErrorToast } from '../components/ErrorToast';
import { RulesModal } from '../components/RulesModal';
import styles from './GameScreen.module.css';
const DEAL_DELAY = 500; // ms between cards in all deal/hit/dealer animations
const DEALER_START_DELAY = 2800; // pause after last player acts before dealer reveals
// ── Status helpers ─────────────────────────────────────────────────────────
function getStatusLabel(status, phase, isActiveTurn) {
    if (phase === 'player_turns' && !isActiveTurn) {
        if (status === 'playing' || status === 'bet_placed')
            return 'Upcoming';
    }
    const labels = {
        waiting_to_bet: 'Waiting to bet', bet_placed: 'Bet placed',
        playing: 'Playing', standing: 'Standing', bust: 'Bust', blackjack: 'Blackjack!',
    };
    return labels[status];
}
function getStatusClass(status, phase, isActiveTurn) {
    if (phase === 'player_turns' && !isActiveTurn) {
        if (status === 'playing' || status === 'bet_placed')
            return 'statusUpcoming';
    }
    const map = {
        waiting_to_bet: 'statusWaiting', bet_placed: 'statusBetPlaced',
        playing: 'statusPlaying', standing: 'statusStanding',
        bust: 'statusBust', blackjack: 'statusBlackjack',
    };
    return map[status];
}
// ── Result helpers ─────────────────────────────────────────────────────────
function getResultClass(s, result) {
    if (result === 'win' || result === 'blackjack' || result === 'dealer_bust')
        return s.resultWin;
    if (result === 'lose' || result === 'bust')
        return s.resultLose;
    return s.resultPush;
}
function formatResult(result, payout) {
    const payoutStr = payout !== undefined ? (payout > 0 ? ` +$${payout}` : ` $${payout}`) : '';
    const labels = {
        win: 'Win', blackjack: 'Blackjack!', lose: 'Lost',
        bust: 'Bust', push: 'Push', dealer_bust: 'Win',
    };
    return (labels[result] ?? result) + payoutStr;
}
function buildResultMessage(player) {
    if (player.hands.length === 0)
        return '';
    if (player.hands.length === 1) {
        const h = player.hands[0];
        const payout = h.payout ?? 0;
        const resultMap = {
            win: 'Won', blackjack: 'Blackjack!', lose: 'Lost',
            bust: 'Bust', push: 'Push', dealer_bust: 'Won (dealer bust)',
        };
        const label = resultMap[h.result ?? ''] ?? h.result ?? '';
        const payStr = payout > 0 ? `+$${payout}` : payout < 0 ? `-$${Math.abs(payout)}` : '$0';
        return `Bet $${h.bet} · ${label} ${payStr}`;
    }
    return player.hands.map((h, i) => {
        const p = h.payout ?? 0;
        return `Hand ${i + 1}: $${h.bet} → ${p > 0 ? `+$${p}` : p < 0 ? `-$${Math.abs(p)}` : 'Push'}`;
    }).join('  ·  ');
}
// ── Deal animation helpers ─────────────────────────────────────────────────
// Keys: "dealer-{cardIdx}" or "p-{playerId}-{handIdx}-{cardIdx}"
function getDealtIndices(dealtCards, prefix) {
    const indices = new Set();
    for (const key of dealtCards) {
        if (key.startsWith(`${prefix}-`)) {
            const idx = Number(key.slice(prefix.length + 1));
            if (!isNaN(idx))
                indices.add(idx);
        }
    }
    return indices;
}
// ── Main component ─────────────────────────────────────────────────────────
export function GameScreen({ gameState, myPlayerId, isHost, isConnected, error, send }) {
    const { phase, players, dealer, activePlayerIndex } = gameState;
    // ── Animation state ──────────────────────────────────────────────────────
    const [dealtCards, setDealtCards] = useState(new Set());
    const [isDealing, setIsDealing] = useState(false);
    // 'idle' → 'preparing' (pause before animation) → 'animating' → back to 'idle'
    const [dealerPhase, setDealerPhase] = useState('idle');
    const prevPhaseRef = useRef(null);
    const dealTimers = useRef([]);
    const prevHandSizesRef = useRef(new Map());
    useEffect(() => {
        const prev = prevPhaseRef.current;
        // ── Reset on new round ──
        if (phase === 'betting' && prev !== 'betting' && prev !== null) {
            dealTimers.current.forEach(clearTimeout);
            dealTimers.current = [];
            setDealtCards(new Set());
            setIsDealing(false);
            setDealerPhase('idle');
            prevHandSizesRef.current.clear();
        }
        // ── Initial deal: betting → player_turns ──
        else if (phase === 'player_turns' && prev === 'betting') {
            dealTimers.current.forEach(clearTimeout);
            dealTimers.current = [];
            setDealtCards(new Set());
            setIsDealing(true);
            // Snapshot hand sizes so hit detection doesn't fire on these cards
            for (const p of players) {
                for (let hi = 0; hi < p.hands.length; hi++) {
                    prevHandSizesRef.current.set(`p-${p.id}-${hi}`, p.hands[hi].cards.length);
                }
            }
            prevHandSizesRef.current.set('dealer', dealer.hand.length);
            // Casino order: all players card[0], dealer card[0], all players card[1], dealer card[1]
            const sequence = [];
            const numCards = players[0]?.hands[0]?.cards.length ?? 2;
            for (let ci = 0; ci < numCards; ci++) {
                for (const p of players)
                    sequence.push(`p-${p.id}-0-${ci}`);
                sequence.push(`dealer-${ci}`);
            }
            const timers = sequence.map((key, idx) => setTimeout(() => {
                setDealtCards(prev => new Set([...prev, key]));
                if (idx === sequence.length - 1)
                    setIsDealing(false);
            }, (idx + 1) * DEAL_DELAY));
            dealTimers.current = timers;
        }
        // ── Hit detection during player turns ──
        else if (phase === 'player_turns' && !isDealing) {
            for (const p of players) {
                for (let hi = 0; hi < p.hands.length; hi++) {
                    const trackKey = `p-${p.id}-${hi}`;
                    const currentCount = p.hands[hi].cards.length;
                    const prevCount = prevHandSizesRef.current.get(trackKey);
                    if (prevCount !== undefined && currentCount > prevCount) {
                        const newKeys = [];
                        for (let ci = prevCount; ci < currentCount; ci++) {
                            newKeys.push(`p-${p.id}-${hi}-${ci}`);
                        }
                        setDealtCards(prev => new Set([...prev, ...newKeys]));
                    }
                    prevHandSizesRef.current.set(trackKey, currentCount);
                }
            }
        }
        // ── Dealer reveal: player_turns → round_over ──
        else if (phase === 'round_over' && prev === 'player_turns') {
            // Reveal any player cards that weren't caught by hit-detection because the
            // phase jumped straight to round_over in the same server tick (e.g. bust card).
            const missedKeys = [];
            for (const p of players) {
                for (let hi = 0; hi < p.hands.length; hi++) {
                    const trackKey = `p-${p.id}-${hi}`;
                    const currentCount = p.hands[hi].cards.length;
                    const prevCount = prevHandSizesRef.current.get(trackKey) ?? currentCount;
                    for (let ci = prevCount; ci < currentCount; ci++) {
                        missedKeys.push(`p-${p.id}-${hi}-${ci}`);
                    }
                    prevHandSizesRef.current.set(trackKey, currentCount);
                }
            }
            if (missedKeys.length > 0) {
                setDealtCards(prev => new Set([...prev, ...missedKeys]));
            }
            // Immediately hide dealer cards from index 1 onward so they show as placeholders
            // during the pause — prevents the full hand being visible before animation starts
            setDealtCards(prev => {
                const next = new Set(prev);
                for (const key of Array.from(next)) {
                    if (key.startsWith('dealer-') && key !== 'dealer-0')
                        next.delete(key);
                }
                return next;
            });
            setDealerPhase('preparing');
            const startTimer = setTimeout(() => {
                setDealerPhase('animating');
                // Animate from index 1: hole card flips face-up, then any extra draws fly in
                const sequence = dealer.hand.slice(1).map((_, i) => `dealer-${i + 1}`);
                const timers = sequence.map((key, idx) => setTimeout(() => {
                    setDealtCards(prev => new Set([...prev, key]));
                    if (idx === sequence.length - 1)
                        setDealerPhase('idle');
                }, (idx + 1) * DEAL_DELAY));
                dealTimers.current = [...dealTimers.current, ...timers];
            }, DEALER_START_DELAY);
            dealTimers.current = [...dealTimers.current, startTimer];
        }
        prevPhaseRef.current = phase;
    }, [phase, players, dealer.hand, isDealing]);
    useEffect(() => () => { dealTimers.current.forEach(clearTimeout); }, []);
    // ── Round history & celebrations ─────────────────────────────────────────
    const [roundHistory, setRoundHistory] = useState([]);
    const [resultToast, setResultToast] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const lastCapturedRound = useRef(-1);
    const celebTimers = useRef([]);
    useEffect(() => {
        if (phase === 'round_over' && gameState.roundNumber !== lastCapturedRound.current) {
            lastCapturedRound.current = gameState.roundNumber;
            setRoundHistory(prev => [{
                    roundNumber: gameState.roundNumber,
                    players: players.map(p => ({
                        name: p.name, isMe: p.id === myPlayerId,
                        hands: p.hands.map(h => ({ bet: h.bet, payout: h.payout ?? 0, result: h.result ?? '' })),
                    })),
                }, ...prev]);
            const me = players.find(p => p.id === myPlayerId);
            if (me && me.hands.length > 0) {
                // Delay toast/confetti until dealer animation finishes
                const dealerDelay = DEALER_START_DELAY + dealer.hand.length * DEAL_DELAY + 400;
                celebTimers.current.forEach(clearTimeout);
                celebTimers.current = [];
                celebTimers.current.push(setTimeout(() => setResultToast(buildResultMessage(me)), dealerDelay));
                const won = me.hands.some(h => ['win', 'blackjack', 'dealer_bust'].includes(h.result ?? ''));
                if (won) {
                    celebTimers.current.push(setTimeout(() => {
                        setShowConfetti(true);
                        celebTimers.current.push(setTimeout(() => setShowConfetti(false), 5000));
                    }, dealerDelay + 300));
                }
            }
        }
    }, [phase, gameState.roundNumber, players, dealer.hand.length, myPlayerId]);
    useEffect(() => {
        if (!resultToast)
            return;
        const t = setTimeout(() => setResultToast(null), 6000);
        return () => clearTimeout(t);
    }, [resultToast]);
    // Reset celebrations when new round starts
    useEffect(() => {
        if (phase === 'betting') {
            celebTimers.current.forEach(clearTimeout);
            setShowConfetti(false);
            setResultToast(null);
        }
    }, [phase]);
    useEffect(() => () => { celebTimers.current.forEach(clearTimeout); }, []);
    // ── Derived values ───────────────────────────────────────────────────────
    const myPlayer = players.find(p => p.id === myPlayerId) ?? null;
    const myIndex = players.findIndex(p => p.id === myPlayerId);
    const otherPlayers = players.filter(p => p.id !== myPlayerId);
    const activePlayer = activePlayerIndex >= 0 ? players[activePlayerIndex] : null;
    const isMyTurn = phase === 'player_turns' && activePlayer?.id === myPlayerId;
    const playersBeforeMe = phase === 'player_turns' && !isMyTurn && myIndex > activePlayerIndex
        ? myIndex - activePlayerIndex - 1 : 0;
    const needToBet = phase === 'betting' && myPlayer?.status === 'waiting_to_bet';
    const [showRules, setShowRules] = useState(false);
    const isRoundOver = phase === 'round_over';
    // Hide results/footer until dealer banner + animation fully completes
    const isDealerBusy = dealerPhase !== 'idle';
    const showResults = isRoundOver && !isDealerBusy;
    // ── Render ───────────────────────────────────────────────────────────────
    return (_jsxs("div", { className: styles.layout, children: [showConfetti && _jsx(Confetti, {}), showRules && _jsx(RulesModal, { onClose: () => setShowRules(false) }), _jsxs("div", { className: styles.table, children: [_jsx(ErrorToast, { message: error }), resultToast && _jsx("div", { className: styles.resultToast, children: resultToast }), _jsxs("div", { className: styles.header, children: [_jsxs("span", { className: styles.roundLabel, children: ["Round ", gameState.roundNumber, isRoundOver ? ' (Completed)' : ''] }), _jsxs("div", { className: styles.phaseBlock, children: [_jsx("span", { className: styles.phaseSubLabel, children: "Round Status" }), _jsx("span", { className: styles.phaseLabel, children: phase.replace(/_/g, ' ') })] }), _jsxs("div", { className: styles.headerRight, children: [_jsx("button", { className: styles.rulesLink, onClick: () => setShowRules(true), children: "Rules" }), _jsx("span", { className: isConnected ? styles.dotOnline : styles.dotOffline })] })] }), _jsxs("div", { className: `${styles.dealerArea} ${isDealerBusy ? styles.dealerActive : ''}`, children: [_jsxs("p", { className: styles.seatLabel, children: ["Dealer", isDealerBusy && _jsx("span", { className: styles.dealerTurnLabel, children: " \u00B7 Dealer's Turn" })] }), dealer.hand.length === 0 ? (_jsx(PlaceholderHand, {})) : (_jsx(DealingHand, { cards: dealer.hand, dealtIndices: getDealtIndices(dealtCards, 'dealer') }))] }), otherPlayers.length > 0 && (_jsx("div", { className: styles.opponentsRow, children: otherPlayers.map(player => {
                            const isActive = player.id === activePlayer?.id;
                            const noCards = player.hands.length === 0 || player.hands[0].cards.length === 0;
                            return (_jsxs("div", { className: `${styles.opponentSeat} ${isActive && !isDealing ? styles.activeSeat : ''}`, children: [_jsxs("div", { className: styles.opponentHeader, children: [_jsx("span", { className: styles.opponentName, children: player.name }), _jsxs("span", { className: styles.myChips, children: ["$", player.chips] })] }), _jsx("span", { className: `${styles.statusBadge} ${styles[getStatusClass(player.status, phase, isActive)]}`, children: getStatusLabel(player.status, phase, isActive) }), noCards ? (_jsxs(_Fragment, { children: [_jsx(PlaceholderHand, {}), (player.hands[0]?.bet ?? 0) > 0 && (_jsxs("p", { className: styles.betChip, children: ["Bet: $", player.hands[0].bet] }))] })) : (player.hands.map((hand, hi) => (_jsxs("div", { className: styles.opponentHandWrapper, children: [player.hands.length > 1 && (_jsxs("span", { className: styles.splitLabel, children: ["Hand ", hi + 1] })), _jsx(DealingHand, { cards: hand.cards, dealtIndices: getDealtIndices(dealtCards, `p-${player.id}-${hi}`) }), hand.bet > 0 && _jsxs("p", { className: styles.betChip, children: ["Bet: $", hand.bet] }), showResults && hand.result && (_jsx("p", { className: getResultClass(styles, hand.result), children: formatResult(hand.result, hand.payout) }))] }, hi))))] }, player.id));
                        }) })), phase === 'player_turns' && !isDealing && (_jsx("div", { className: isMyTurn ? styles.turnBannerMine : styles.turnBannerOther, children: isMyTurn ? '🎯 Your turn!' : activePlayer ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: styles.turnName, children: [activePlayer.name, "'s turn"] }), myIndex >= 0 && (_jsx("span", { className: styles.turnCountdown, children: myIndex <= activePlayerIndex
                                        ? '· You already played'
                                        : playersBeforeMe === 0
                                            ? "· You're next!"
                                            : `· ${playersBeforeMe} player${playersBeforeMe > 1 ? 's' : ''} before you` }))] })) : null })), myPlayer && (_jsxs("div", { className: `${styles.mySeat} ${isMyTurn && !isDealing ? styles.activeSeat : ''}`, children: [_jsxs("div", { className: styles.myInfo, children: [_jsxs("span", { className: styles.myName, children: [myPlayer.name, " (You)"] }), _jsxs("span", { className: styles.myChips, children: ["$", myPlayer.chips] })] }), _jsx("div", { className: styles.myHands, children: myPlayer.hands.length === 0 || myPlayer.hands[0].cards.length === 0 ? (_jsxs("div", { className: styles.myHandWrapper, children: [_jsx(PlaceholderHand, {}), (myPlayer.hands[0]?.bet ?? 0) > 0 && (_jsxs("p", { className: styles.betChip, children: ["Bet: $", myPlayer.hands[0].bet] }))] })) : (myPlayer.hands.map((hand, hi) => (_jsxs("div", { className: styles.myHandWrapper, children: [myPlayer.hands.length > 1 && (_jsxs("span", { className: styles.splitLabel, children: ["Hand ", hi + 1, myPlayer.activeHandIndex === hi && ' ←'] })), _jsx(DealingHand, { cards: hand.cards, dealtIndices: getDealtIndices(dealtCards, `p-${myPlayer.id}-${hi}`) }), hand.bet > 0 && _jsxs("p", { className: styles.betChip, children: ["Bet: $", hand.bet] }), showResults && hand.result && (_jsx("p", { className: getResultClass(styles, hand.result), children: formatResult(hand.result, hand.payout) }))] }, hi)))) }), isMyTurn && !isDealing && myPlayer.hands[myPlayer.activeHandIndex] && (_jsx(ActionButtons, { hand: myPlayer.hands[myPlayer.activeHandIndex].cards, onAction: send })), needToBet && (_jsx(BetControls, { availableChips: myPlayer.chips, onPlaceBet: amount => send({ type: 'PLACE_BET', amount }) })), !isMyTurn && !isDealing && !needToBet && !isRoundOver && (_jsx("span", { className: `${styles.statusBadge} ${styles[getStatusClass(myPlayer.status, phase, isMyTurn)]}`, children: getStatusLabel(myPlayer.status, phase, isMyTurn) }))] })), showResults && isHost && (_jsx("div", { className: styles.footer, children: _jsx("button", { className: styles.nextRoundBtn, onClick: () => send({ type: 'NEXT_ROUND' }), children: "Next Round \u2192" }) })), showResults && !isHost && (_jsx("div", { className: styles.footer, children: _jsx("p", { className: styles.waitingMsg, children: "Waiting for host to start next round..." }) }))] }), roundHistory.length > 0 && (_jsxs("div", { className: styles.sidebar, children: [_jsx("p", { className: styles.sidebarTitle, children: "Round History" }), _jsx("div", { className: styles.sidebarList, children: roundHistory.map(record => (_jsxs("div", { className: styles.sidebarRound, children: [_jsx("div", { className: styles.sidebarRoundHeader, children: _jsxs("span", { className: styles.sidebarRoundLabel, children: ["Round ", record.roundNumber] }) }), record.players.map(p => {
                                    const net = p.hands.reduce((s, h) => s + h.payout, 0);
                                    return (_jsxs("div", { className: styles.sidebarPlayer, children: [_jsx("span", { className: p.isMe ? styles.sidebarNameMe : styles.sidebarName, children: p.isMe ? 'You' : p.name }), _jsx("span", { className: net > 0 ? styles.sidebarWin : net < 0 ? styles.sidebarLose : styles.sidebarPush, children: net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : 'Push' })] }, p.name));
                                })] }, record.roundNumber))) })] }))] }));
}
// ── Confetti ───────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#fbbf24', '#34d399'];
function Confetti() {
    // Generate once per mount via useMemo with no deps
    const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 1.8,
        duration: 2.5 + Math.random() * 2,
        size: 7 + Math.floor(Math.random() * 10),
        rotate: Math.floor(Math.random() * 360),
        shape: i % 3, // 0=circle, 1=square, 2=diamond
    })), []);
    return (_jsx("div", { className: styles.confettiContainer, "aria-hidden": "true", children: pieces.map(p => (_jsx("div", { className: styles.confettiPiece, style: {
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '50% 0 50% 0',
                transform: `rotate(${p.rotate}deg)`,
            } }, p.id))) }));
}
// ── DealingHand ────────────────────────────────────────────────────────────
// Used for ALL hand rendering (initial deal, hits, dealer reveal).
// Cards in dealtIndices get the fly-in animation on mount; others show as placeholders.
// For hands with 4+ cards, cards overlap (fanned) to keep the layout compact.
function DealingHand({ cards, dealtIndices }) {
    const revealedCards = cards.filter((_, i) => dealtIndices.has(i));
    const faceUpRevealed = revealedCards.filter(c => !c.faceDown);
    const value = faceUpRevealed.length > 0 ? calculateHandValue(revealedCards) : null;
    const fan = cards.length >= 4;
    return (_jsxs("div", { className: styles.dealingWrapper, children: [_jsx("div", { className: `${styles.dealingCards} ${fan ? styles.dealingCardsFan : ''}`, children: cards.map((card, i) => dealtIndices.has(i) ? (_jsx("div", { className: styles.cardDealAnim, style: { zIndex: i + 1 }, children: _jsx(CardComponent, { card: card }) }, i)) : (_jsx("div", { className: styles.placeholderCard, style: { zIndex: i + 1 } }, i))) }), _jsx("div", { className: styles.dealingValue, children: value !== null && _jsx("span", { children: value }) })] }));
}
// ── PlaceholderHand ────────────────────────────────────────────────────────
function PlaceholderHand({ count = 2 }) {
    return (_jsxs("div", { className: styles.placeholderWrapper, children: [_jsx("div", { className: styles.placeholderCards, children: Array.from({ length: count }).map((_, i) => (_jsx("div", { className: styles.placeholderCard }, i))) }), _jsx("div", { className: styles.placeholderValue })] }));
}
