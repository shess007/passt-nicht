import { create } from "zustand";
import PartySocket from "partysocket";
import type { ClientGameState, ClientAction, ServerEvent, AnyCard, JokerWish } from "../game/types";

interface GameStore {
  // Connection
  socket: PartySocket | null;
  roomId: string;
  playerId: string;
  playerName: string;
  connected: boolean;

  // Game
  gameState: ClientGameState | null;
  error: string | null;
  lastEvent: ServerEvent | null;

  // UI state
  selectedCardId: string | null;
  showJokerWishModal: boolean;
  pendingJokerCardId: string | null;

  // Actions
  setPlayerName: (name: string) => void;
  connect: (roomId: string) => void;
  disconnect: () => void;
  joinGame: () => void;
  startGame: () => void;
  playToDiscard: (cardId: string, from: "hand" | "display") => void;
  playToDisplay: (cardId: string) => void;
  sendJokerWish: (wish: JokerWish) => void;
  restartGame: () => void;
  selectCard: (cardId: string | null) => void;
  clearError: () => void;
}

const PARTY_HOST =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "localhost:1999"
    : "https://passt-nicht.shess007.partykit.dev";

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  roomId: "",
  playerId: "",
  playerName: "",
  connected: false,
  gameState: null,
  error: null,
  lastEvent: null,
  selectedCardId: null,
  showJokerWishModal: false,
  pendingJokerCardId: null,

  setPlayerName: (name) => set({ playerName: name }),

  connect: (roomId) => {
    const existing = get().socket;
    if (existing) existing.close();

    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomId,
    });

    socket.addEventListener("open", () => {
      set({ connected: true, playerId: socket.id, roomId });
    });

    socket.addEventListener("close", () => {
      set({ connected: false });
    });

    socket.addEventListener("message", (evt) => {
      try {
        const event: ServerEvent = JSON.parse(evt.data);
        switch (event.type) {
          case "state_update":
            set({ gameState: event.state, lastEvent: event });
            break;
          case "error":
            set({ error: event.message, lastEvent: event });
            setTimeout(() => set({ error: null }), 3000);
            break;
          default:
            set({ lastEvent: event });
        }
      } catch {}
    });

    set({ socket, roomId });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, connected: false, gameState: null });
  },

  joinGame: () => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim()) return;
    const action: ClientAction = { type: "join", name: playerName.trim() };
    socket.send(JSON.stringify(action));
  },

  startGame: () => {
    const { socket } = get();
    if (!socket) return;
    const action: ClientAction = { type: "start_game" };
    socket.send(JSON.stringify(action));
  },

  playToDiscard: (cardId, from) => {
    const { socket, gameState } = get();
    if (!socket || !gameState) return;

    // Check if the card is a joker — if so, need to show wish modal
    let card: AnyCard | undefined;
    if (from === "hand") {
      card = gameState.myHand.find((c) => c.id === cardId);
    } else {
      for (const stack of Object.values(gameState.myDisplay.stacks)) {
        if (stack && stack.length > 0 && stack[stack.length - 1].id === cardId) {
          card = stack[stack.length - 1];
          break;
        }
      }
    }

    const action: ClientAction = { type: "play_to_discard", cardId, from };
    socket.send(JSON.stringify(action));

    // If it's a joker, show the wish modal after playing
    if (card && card.color === "joker") {
      set({ showJokerWishModal: true, pendingJokerCardId: cardId });
    }

    set({ selectedCardId: null });
  },

  playToDisplay: (cardId) => {
    const { socket } = get();
    if (!socket) return;
    const action: ClientAction = { type: "play_to_display", cardId };
    socket.send(JSON.stringify(action));
    set({ selectedCardId: null });
  },

  sendJokerWish: (wish) => {
    const { socket } = get();
    if (!socket) return;
    const action: ClientAction = { type: "joker_wish", wish };
    socket.send(JSON.stringify(action));
    set({ showJokerWishModal: false, pendingJokerCardId: null });
  },

  restartGame: () => {
    const { socket } = get();
    if (!socket) return;
    const action: ClientAction = { type: "restart_game" };
    socket.send(JSON.stringify(action));
  },

  selectCard: (cardId) => set({ selectedCardId: cardId }),
  clearError: () => set({ error: null }),
}));
