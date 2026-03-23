import { Deck } from './types';
import { createShoe, shuffleDeck, dealCard, dealFaceDown, revealCard } from './deck';
import { isBlackjack, isBust } from './hand';
import { canHit, canDouble, canSplit } from './actions';
import { dealerShouldHit } from './dealer';
import { determineResult, calculatePayout } from './payouts';
import {
  GameState,
  GamePhase,
  Player,
  PlayerHand,
  MAX_PLAYERS,
  STARTING_CHIPS,
  MIN_BET,
} from './gameTypes';

// Generates a short random ID for each player
// In Phase 4 (Durable Objects) this will be replaced by the WebSocket session ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export class BlackjackGame {
  private state: GameState;
  private numberOfDecks: number;

  // The optional `deck` parameter exists for testing — it lets us pass a
  // controlled deck so tests get predictable cards instead of random ones
  constructor({ numberOfDecks = 1, deck }: { numberOfDecks?: number; deck?: Deck } = {}) {
    this.numberOfDecks = numberOfDecks;
    const initialDeck = deck ?? shuffleDeck(createShoe(numberOfDecks));
    this.state = {
      phase: 'waiting_for_players',
      players: [],
      dealer: { hand: [] },
      deck: initialDeck,
      activePlayerIndex: -1,
      roundNumber: 0,
    };
  }

  // Returns a deep copy of the state
  // WHY deep copy: if we returned the real state object, external code could write
  // state.phase = 'round_over' and bypass all our validation. Deep copy prevents that.
  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // Serialise the full game state to a JSON string for storage
  // (used by the Durable Object to persist across hibernation)
  toJSON(): string {
    return JSON.stringify({ state: this.state, numberOfDecks: this.numberOfDecks });
  }

  // Restore a BlackjackGame instance from a previously serialised string
  static fromJSON(json: string): BlackjackGame {
    const { state, numberOfDecks } = JSON.parse(json) as {
      state: GameState;
      numberOfDecks: number;
    };
    const game = new BlackjackGame({ numberOfDecks });
    game.state = state;
    return game;
  }

  // ─── Player Management ────────────────────────────────────────────────────

  addPlayer(name: string): GameState {
    // Allow joining before the game starts OR between rounds (at round_over)
    if (this.state.phase !== 'waiting_for_players' && this.state.phase !== 'round_over') {
      throw new Error(
        `Cannot join during '${this.state.phase}' — new players can only join before the game starts or between rounds`
      );
    }

    if (!name.trim()) {
      throw new Error('Player name cannot be empty');
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      throw new Error(`Maximum ${MAX_PLAYERS} players allowed`);
    }

    const player: Player = {
      id: generateId(),
      name: name.trim(),
      chips: STARTING_CHIPS,
      hands: [],
      activeHandIndex: 0,
      status: 'waiting_to_bet',
    };

    this.state.players.push(player);
    return this.getState();
  }

  startGame(): GameState {
    this.assertPhase('waiting_for_players', 'start the game');

    if (this.state.players.length < 1) {
      throw new Error('Need at least 1 player to start');
    }

    this.state.roundNumber++;
    this.state.phase = 'betting';
    return this.getState();
  }

  // ─── Betting Phase ────────────────────────────────────────────────────────

  placeBet(playerId: string, amount: number): GameState {
    this.assertPhase('betting', 'place a bet');

    const player = this.findPlayer(playerId);

    if (player.status === 'bet_placed') {
      throw new Error(`${player.name} has already placed a bet this round`);
    }
    if (amount < MIN_BET) {
      throw new Error(`Minimum bet is ${MIN_BET} chips (tried to bet ${amount})`);
    }
    if (amount > player.chips) {
      throw new Error(`${player.name} only has ${player.chips} chips but tried to bet ${amount}`);
    }

    // Deduct bet immediately — chips reflect what the player has "in hand"
    player.chips -= amount;
    player.status = 'bet_placed';
    player.hands = [{ cards: [], bet: amount }];

    // Once everyone has bet, automatically deal and start player turns
    const allBetsPlaced = this.state.players.every(p => p.status === 'bet_placed');
    if (allBetsPlaced) {
      this.dealInitialCards();
    }

    return this.getState();
  }

  // ─── Player Actions ───────────────────────────────────────────────────────

  hit(playerId: string): GameState {
    const { player, hand } = this.validateTurnAction(playerId);

    if (!canHit(hand.cards)) {
      throw new Error('Cannot hit on this hand');
    }

    const [card, rest] = dealCard(this.state.deck);
    hand.cards.push(card);
    this.state.deck = rest;

    if (isBust(hand.cards)) {
      // Bust is resolved immediately — no more actions on this hand
      player.status = 'bust';
      this.advanceAfterAction();
    }
    // If not bust, player can continue acting — no auto-advance

    return this.getState();
  }

  stand(playerId: string): GameState {
    const { player } = this.validateTurnAction(playerId);
    player.status = 'standing';
    this.advanceAfterAction();
    return this.getState();
  }

  double(playerId: string): GameState {
    const { player, hand } = this.validateTurnAction(playerId);

    if (!canDouble(hand.cards)) {
      throw new Error('Can only double on the first two cards');
    }
    if (hand.bet > player.chips) {
      throw new Error(
        `${player.name} needs ${hand.bet} more chips to double but only has ${player.chips}`
      );
    }

    // Double the bet by deducting the same amount again
    player.chips -= hand.bet;
    hand.bet *= 2;

    // Receive exactly one card, then the hand is over
    const [card, rest] = dealCard(this.state.deck);
    hand.cards.push(card);
    this.state.deck = rest;

    player.status = isBust(hand.cards) ? 'bust' : 'standing';
    this.advanceAfterAction();
    return this.getState();
  }

  split(playerId: string): GameState {
    const { player, hand } = this.validateTurnAction(playerId);

    if (!canSplit(hand.cards)) {
      throw new Error('Can only split two cards of the same rank');
    }
    if (hand.bet > player.chips) {
      throw new Error(
        `${player.name} needs ${hand.bet} more chips to split but only has ${player.chips}`
      );
    }

    // Deduct the bet for the second hand
    player.chips -= hand.bet;

    // Each original card starts a new hand
    const [card1, card2] = hand.cards;
    let deck = this.state.deck;

    // Deal one new card to each hand
    const [newCard1, deck2] = dealCard(deck);
    const [newCard2, deck3] = dealCard(deck2);
    deck = deck3;
    this.state.deck = deck;

    player.hands = [
      { cards: [card1, newCard1], bet: hand.bet },
      { cards: [card2, newCard2], bet: hand.bet },
    ];
    // Player stays on hand 0 — activeHandIndex remains 0
    // status stays 'playing'

    return this.getState();
  }

  // ─── Round Control ────────────────────────────────────────────────────────

  // Resets for the next round — call this after 'round_over'
  nextRound(): GameState {
    this.assertPhase('round_over', 'start next round');

    for (const player of this.state.players) {
      player.hands = [];
      player.activeHandIndex = 0;
      player.status = 'waiting_to_bet';
    }

    this.state.dealer.hand = [];
    this.state.activePlayerIndex = -1;
    this.state.roundNumber++;
    this.state.phase = 'betting';

    // Reshuffle when less than 25% of cards remain
    // WHY 25%: mirrors the casino "cut card" — prevents running out mid-round
    const totalCards = this.numberOfDecks * 52;
    if (this.state.deck.length < totalCards * 0.25) {
      this.state.deck = shuffleDeck(createShoe(this.numberOfDecks));
    }

    return this.getState();
  }

  // ─── Private: Phase Transitions ───────────────────────────────────────────

  private dealInitialCards(): void {
    let deck = this.state.deck;

    // Casino deal order: one card each to all players then dealer,
    // then a second card each — so cards interleave, not one player at a time
    for (const player of this.state.players) {
      const [card, rest] = dealCard(deck);
      player.hands[0].cards.push(card);
      deck = rest;
    }

    // Dealer's first card is face UP
    const [dealerCard1, deck2] = dealCard(deck);
    this.state.dealer.hand.push(dealerCard1);
    deck = deck2;

    for (const player of this.state.players) {
      const [card, rest] = dealCard(deck);
      player.hands[0].cards.push(card);
      deck = rest;
    }

    // Dealer's second card is face DOWN — the "hole card"
    const [dealerCard2, deck3] = dealFaceDown(deck);
    this.state.dealer.hand.push(dealerCard2);
    this.state.deck = deck3;

    // Tag any player who got blackjack on the deal
    for (const player of this.state.players) {
      player.status = isBlackjack(player.hands[0].cards) ? 'blackjack' : 'playing';
    }

    this.state.phase = 'player_turns';

    // Start from -1 so advanceToNextActivePlayer correctly checks from index 0
    this.state.activePlayerIndex = -1;
    this.advanceToNextActivePlayer();
  }

  private startDealerTurn(): void {
    this.state.phase = 'dealer_turn';

    // Reveal the hole card — now both dealer cards are face up
    this.state.dealer.hand = this.state.dealer.hand.map(revealCard);

    // Dealer draws until they stand (hits on <17, stands on 17+)
    while (dealerShouldHit(this.state.dealer.hand)) {
      const [card, rest] = dealCard(this.state.deck);
      this.state.dealer.hand.push(card);
      this.state.deck = rest;
    }

    this.settleRound();
  }

  private settleRound(): void {
    this.state.phase = 'round_over';
    const dealerHand = this.state.dealer.hand;

    for (const player of this.state.players) {
      for (const hand of player.hands) {
        hand.result = determineResult(hand.cards, dealerHand);
        hand.payout = calculatePayout(hand.bet, hand.result);
        // Return the original bet + net payout
        // (the bet was already deducted in placeBet/double/split)
        player.chips += hand.bet + hand.payout;
      }
    }
  }

  // ─── Private: Turn Management ─────────────────────────────────────────────

  private advanceAfterAction(): void {
    const player = this.state.players[this.state.activePlayerIndex];

    // If the player split and has a second hand they haven't played yet
    if (player.activeHandIndex < player.hands.length - 1) {
      player.activeHandIndex++;
      player.status = 'playing';
      return;
    }

    // This player is fully done — find the next one
    this.advanceToNextActivePlayer();
  }

  private advanceToNextActivePlayer(): void {
    // Search from the slot after the current player
    const start = this.state.activePlayerIndex + 1;

    for (let i = start; i < this.state.players.length; i++) {
      if (this.state.players[i].status === 'playing') {
        this.state.activePlayerIndex = i;
        return;
      }
    }

    // No more active players — move to dealer
    this.startDealerTurn();
  }

  // ─── Private: Helpers ─────────────────────────────────────────────────────

  // Checks that we're in the right phase before any action
  private assertPhase(expected: GamePhase, action: string): void {
    if (this.state.phase !== expected) {
      throw new Error(`Cannot ${action} during '${this.state.phase}' phase`);
    }
  }

  // Validates that it's this player's turn and returns their active hand
  private validateTurnAction(playerId: string): { player: Player; hand: PlayerHand } {
    if (this.state.phase !== 'player_turns') {
      throw new Error(`Cannot act during '${this.state.phase}' phase`);
    }

    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (activePlayer.id !== playerId) {
      throw new Error(`It is not your turn — waiting for ${activePlayer.name}`);
    }

    const hand = activePlayer.hands[activePlayer.activeHandIndex];
    return { player: activePlayer, hand };
  }

  private findPlayer(playerId: string): Player {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player '${playerId}' not found`);
    return player;
  }
}
