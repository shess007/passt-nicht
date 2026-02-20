import {
  type AnyCard,
  type Card,
  type CardColor,
  type GameState,
  type Player,
  type PlayerDisplay,
  type JokerWish,
  type ClientGameState,
  type PublicPlayer,
  CARD_COLORS,
  CARD_NUMBERS,
  isJoker,
} from "./types";

// ─── Deck Creation & Shuffling ─────────────────────────────────────

let cardIdCounter = 0;

export function createDeck(): AnyCard[] {
  cardIdCounter = 0;
  const cards: AnyCard[] = [];

  for (const color of CARD_COLORS) {
    for (const number of CARD_NUMBERS) {
      cards.push({ id: `c${cardIdCounter++}`, color, number });
      // Two cards of each color/number combination
      cards.push({ id: `c${cardIdCounter++}`, color, number });
    }
  }

  // Add 4 jokers
  for (let i = 0; i < 4; i++) {
    cards.push({ id: `c${cardIdCounter++}`, color: "joker", number: 0 });
  }

  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Game Initialization ───────────────────────────────────────────

export function createInitialState(hostId: string): GameState {
  return {
    phase: "lobby",
    players: [],
    drawPile: [],
    discardPile: { topCard: null, wish: null },
    currentPlayerIndex: 0,
    roundNumber: 0,
    targetScore: 50,
    hostId,
  };
}

export function startRound(state: GameState): GameState {
  const deck = shuffle(createDeck());
  const players = state.players.map((p) => ({
    ...p,
    hand: [] as AnyCard[],
    display: { stacks: {} } as PlayerDisplay,
  }));

  // Deal 5 cards to each player
  let deckIdx = 0;
  for (let i = 0; i < 5; i++) {
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      players[pIdx].hand.push(deck[deckIdx++]);
    }
  }

  // Place first card on discard pile (skip jokers)
  let firstCard = deck[deckIdx++];
  while (isJoker(firstCard)) {
    // Put joker back somewhere in the deck and take next
    deck.splice(deckIdx + Math.floor(Math.random() * (deck.length - deckIdx)), 0, firstCard);
    firstCard = deck[deckIdx++];
  }

  return {
    ...state,
    phase: "playing",
    players,
    drawPile: deck.slice(deckIdx),
    discardPile: { topCard: firstCard, wish: null },
    currentPlayerIndex: state.roundNumber % players.length,
    roundNumber: state.roundNumber + 1,
  };
}

// ─── Card Matching Logic ───────────────────────────────────────────

export function cardMatchesDiscard(
  card: AnyCard,
  topCard: AnyCard | null,
  wish: JokerWish | null
): boolean {
  if (!topCard) return true; // empty pile, anything goes
  if (isJoker(card)) return true; // joker always matches

  const c = card as Card;

  // If there's an active joker wish, must match the wish
  if (wish) {
    if (wish.type === "color") return c.color === wish.color;
    if (wish.type === "number") return c.number === wish.number;
  }

  // Normal matching: same color OR same number
  if (isJoker(topCard)) return false; // shouldn't happen (wish should be set)
  const top = topCard as Card;
  return c.color === top.color || c.number === top.number;
}

/** Get all cards a player could legally play to the discard pile */
export function getPlayableCards(player: Player, state: GameState): {
  fromHand: AnyCard[];
  fromDisplay: AnyCard[];
} {
  const { topCard, wish } = state.discardPile;

  const fromHand = player.hand.filter((c) => cardMatchesDiscard(c, topCard, wish));

  const fromDisplay: AnyCard[] = [];
  for (const color of CARD_COLORS) {
    const stack = player.display.stacks[color];
    if (stack && stack.length > 0) {
      const topDisplayCard = stack[stack.length - 1];
      if (cardMatchesDiscard(topDisplayCard, topCard, wish)) {
        fromDisplay.push(topDisplayCard);
      }
    }
  }

  return { fromHand, fromDisplay };
}

// ─── Play Actions ──────────────────────────────────────────────────

export function playToDiscard(
  state: GameState,
  playerId: string,
  cardId: string,
  from: "hand" | "display"
): GameState | { error: string } {
  const pIdx = state.players.findIndex((p) => p.id === playerId);
  if (pIdx === -1) return { error: "Player not found" };
  if (pIdx !== state.currentPlayerIndex) return { error: "Not your turn" };
  if (state.phase !== "playing") return { error: "Game not in progress" };

  const player = { ...state.players[pIdx] };
  let card: AnyCard | undefined;

  if (from === "hand") {
    const cardIdx = player.hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return { error: "Card not in hand" };
    card = player.hand[cardIdx];
    player.hand = [...player.hand.slice(0, cardIdx), ...player.hand.slice(cardIdx + 1)];
  } else {
    // from display — find which stack it's on top of
    let found = false;
    const newStacks = { ...player.display.stacks };
    for (const color of CARD_COLORS) {
      const stack = newStacks[color];
      if (stack && stack.length > 0 && stack[stack.length - 1].id === cardId) {
        card = stack[stack.length - 1];
        newStacks[color] = stack.slice(0, -1);
        if (newStacks[color]!.length === 0) delete newStacks[color];
        found = true;
        break;
      }
    }
    if (!found) return { error: "Card not on top of any display stack" };
    player.display = { stacks: newStacks };
  }

  if (!card) return { error: "Card not found" };

  // Check if card matches
  if (!cardMatchesDiscard(card, state.discardPile.topCard, state.discardPile.wish)) {
    return { error: "Card does not match the discard pile" };
  }

  const players = [...state.players];
  players[pIdx] = player;

  // Check for round end: player's hand is now empty
  if (player.hand.length === 0) {
    return endRound({
      ...state,
      players,
      discardPile: { topCard: card, wish: null },
    });
  }

  // If joker was played, we need to wait for the wish
  const needsWish = isJoker(card);

  return {
    ...state,
    players,
    discardPile: { topCard: card, wish: needsWish ? state.discardPile.wish : null },
    // Don't advance turn yet if joker needs a wish
    currentPlayerIndex: needsWish
      ? state.currentPlayerIndex
      : nextPlayerIndex(state),
    phase: needsWish ? "playing" : "playing",
  };
}

export function playToDisplay(
  state: GameState,
  playerId: string,
  cardId: string
): GameState | { error: string } {
  const pIdx = state.players.findIndex((p) => p.id === playerId);
  if (pIdx === -1) return { error: "Player not found" };
  if (pIdx !== state.currentPlayerIndex) return { error: "Not your turn" };
  if (state.phase !== "playing") return { error: "Game not in progress" };

  const player = { ...state.players[pIdx] };
  const cardIdx = player.hand.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return { error: "Card not in hand" };

  const card = player.hand[cardIdx];
  player.hand = [...player.hand.slice(0, cardIdx), ...player.hand.slice(cardIdx + 1)];

  // Place card in display
  const newStacks = { ...player.display.stacks };
  if (isJoker(card)) {
    // Jokers can't go in display — they have no color
    return { error: "Jokers cannot be placed in your display" };
  }
  const c = card as Card;
  const stack = newStacks[c.color] ?? [];
  newStacks[c.color] = [...stack, card];
  player.display = { stacks: newStacks };

  // Draw a card from the draw pile
  let drawPile = [...state.drawPile];
  if (drawPile.length > 0) {
    player.hand = [...player.hand, drawPile[0]];
    drawPile = drawPile.slice(1);
  }

  const players = [...state.players];
  players[pIdx] = player;

  return {
    ...state,
    players,
    drawPile,
    currentPlayerIndex: nextPlayerIndex(state),
  };
}

export function applyJokerWish(
  state: GameState,
  playerId: string,
  wish: JokerWish
): GameState | { error: string } {
  const pIdx = state.players.findIndex((p) => p.id === playerId);
  if (pIdx === -1) return { error: "Player not found" };
  if (pIdx !== state.currentPlayerIndex) return { error: "Not your turn" };
  if (!state.discardPile.topCard || !isJoker(state.discardPile.topCard)) {
    return { error: "No joker on discard pile" };
  }

  return {
    ...state,
    discardPile: { ...state.discardPile, wish },
    currentPlayerIndex: nextPlayerIndex(state),
  };
}

// ─── Round / Game End ──────────────────────────────────────────────

function endRound(state: GameState): GameState {
  const scores = state.players.map((p) => {
    // Display cards = positive points
    let displayPoints = 0;
    for (const color of CARD_COLORS) {
      const stack = p.display.stacks[color];
      if (stack) {
        displayPoints += stack.reduce((sum, c) => sum + (isJoker(c) ? 0 : (c as Card).number), 0);
      }
    }

    // Hand cards = negative points
    let handPenalty = 0;
    for (const card of p.hand) {
      handPenalty += isJoker(card) ? 5 : (card as Card).number;
    }

    return displayPoints - handPenalty;
  });

  const players = state.players.map((p, i) => ({
    ...p,
    score: p.score + scores[i],
  }));

  // Check if anyone hit the target score
  const maxScore = Math.max(...players.map((p) => p.score));
  const isGameOver = maxScore >= state.targetScore;

  return {
    ...state,
    players,
    phase: isGameOver ? "game_over" : "round_end",
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function nextPlayerIndex(state: GameState): number {
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  // Skip disconnected players
  let attempts = 0;
  while (!state.players[next].connected && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
}

// ─── State Projection (for client) ─────────────────────────────────

export function toClientState(state: GameState, playerId: string): ClientGameState {
  const myIdx = state.players.findIndex((p) => p.id === playerId);
  const me = state.players[myIdx];

  const publicPlayers: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    handCount: p.hand.length,
    display: p.display,
    score: p.score,
    connected: p.connected,
  }));

  return {
    phase: state.phase,
    players: publicPlayers,
    myHand: me?.hand ?? [],
    myDisplay: me?.display ?? { stacks: {} },
    discardPile: state.discardPile,
    currentPlayerIndex: state.currentPlayerIndex,
    myPlayerIndex: myIdx,
    roundNumber: state.roundNumber,
    targetScore: state.targetScore,
    drawPileCount: state.drawPile.length,
    hostId: state.hostId,
  };
}
