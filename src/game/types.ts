// ─── Card Types ───────────────────────────────────────────────────
export type CardColor = "red" | "blue" | "green" | "yellow";
export const CARD_COLORS: CardColor[] = ["red", "blue", "green", "yellow"];
export const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type CardNumber = (typeof CARD_NUMBERS)[number];

export interface Card {
  id: string;
  color: CardColor;
  number: CardNumber;
}

export interface JokerCard {
  id: string;
  color: "joker";
  number: 0;
}

export type AnyCard = Card | JokerCard;

export function isJoker(card: AnyCard): card is JokerCard {
  return card.color === "joker";
}

// ─── Player Types ─────────────────────────────────────────────────
export interface PlayerDisplay {
  /** Stacks keyed by color. Last element is the visible (top) card. */
  stacks: Partial<Record<CardColor, AnyCard[]>>;
}

export interface Player {
  id: string;
  name: string;
  hand: AnyCard[];
  display: PlayerDisplay;
  score: number;
  connected: boolean;
}

/** What other players can see about a player */
export interface PublicPlayer {
  id: string;
  name: string;
  handCount: number;
  display: PlayerDisplay;
  score: number;
  connected: boolean;
}

// ─── Wish (after joker play) ──────────────────────────────────────
export type JokerWish =
  | { type: "color"; color: CardColor }
  | { type: "number"; number: CardNumber };

// ─── Discard Pile ─────────────────────────────────────────────────
export interface DiscardPile {
  topCard: AnyCard | null;
  wish: JokerWish | null; // active only when top card is a joker
}

// ─── Game Phases ──────────────────────────────────────────────────
export type GamePhase = "lobby" | "playing" | "round_end" | "game_over";

// ─── Game State (server-side, full) ───────────────────────────────
export interface GameState {
  phase: GamePhase;
  players: Player[];
  drawPile: AnyCard[];
  discardPile: DiscardPile;
  currentPlayerIndex: number;
  roundNumber: number;
  targetScore: number;
  hostId: string;
}

// ─── Client Game State (what one player sees) ─────────────────────
export interface ClientGameState {
  phase: GamePhase;
  players: PublicPlayer[];
  myHand: AnyCard[];
  myDisplay: PlayerDisplay;
  discardPile: DiscardPile;
  currentPlayerIndex: number;
  myPlayerIndex: number;
  roundNumber: number;
  targetScore: number;
  drawPileCount: number;
  hostId: string;
}

// ─── Actions (client → server) ────────────────────────────────────
export type ClientAction =
  | { type: "join"; name: string }
  | { type: "start_game" }
  | { type: "play_to_discard"; cardId: string; from: "hand" | "display" }
  | { type: "play_to_display"; cardId: string }
  | { type: "joker_wish"; wish: JokerWish }
  | { type: "restart_game" };

// ─── Events (server → client) ─────────────────────────────────────
export type ServerEvent =
  | { type: "state_update"; state: ClientGameState }
  | { type: "error"; message: string }
  | { type: "card_played"; playerId: string; card: AnyCard; to: "discard" | "display" }
  | { type: "round_ended"; scores: { playerId: string; roundPoints: number; totalScore: number }[] }
  | { type: "game_over"; winnerId: string; scores: { playerId: string; totalScore: number }[] }
  | { type: "player_joined"; playerId: string; name: string }
  | { type: "player_left"; playerId: string };
