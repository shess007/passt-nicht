import type * as Party from "partykit/server";
import type { ClientAction, GameState, ServerEvent } from "../src/game/types";
import {
  createInitialState,
  startRound,
  playToDiscard,
  playToDisplay,
  applyJokerWish,
  toClientState,
} from "../src/game/engine";

export default class PasstNichtServer implements Party.Server {
  state: GameState | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    // Send current state if game exists
    if (this.state) {
      const player = this.state.players.find((p) => p.id === conn.id);
      if (player) {
        player.connected = true;
        this.broadcastState();
      }
      // New connection during game? Send lobby state so they can see
      this.send(conn, {
        type: "state_update",
        state: toClientState(this.state, conn.id),
      });
    }
  }

  onClose(conn: Party.Connection) {
    if (!this.state) return;
    const player = this.state.players.find((p) => p.id === conn.id);
    if (player) {
      player.connected = false;
      this.broadcastState();
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let action: ClientAction;
    try {
      action = JSON.parse(message);
    } catch {
      this.send(sender, { type: "error", message: "Invalid message" });
      return;
    }

    switch (action.type) {
      case "join":
        this.handleJoin(sender, action.name);
        break;
      case "start_game":
        this.handleStartGame(sender);
        break;
      case "play_to_discard":
        this.handlePlayToDiscard(sender, action.cardId, action.from);
        break;
      case "play_to_display":
        this.handlePlayToDisplay(sender, action.cardId);
        break;
      case "joker_wish":
        this.handleJokerWish(sender, action.wish);
        break;
      case "restart_game":
        this.handleRestart(sender);
        break;
    }
  }

  // ─── Action Handlers ──────────────────────────────────────────────

  handleJoin(conn: Party.Connection, name: string) {
    if (!this.state) {
      this.state = createInitialState(conn.id);
    }

    if (this.state.phase !== "lobby") {
      // Allow reconnection
      const existing = this.state.players.find((p) => p.id === conn.id);
      if (existing) {
        existing.connected = true;
        existing.name = name;
        this.broadcastState();
        return;
      }
      this.send(conn, { type: "error", message: "Game already in progress" });
      return;
    }

    if (this.state.players.find((p) => p.id === conn.id)) {
      // Already joined, just update name
      this.state.players.find((p) => p.id === conn.id)!.name = name;
      this.broadcastState();
      return;
    }

    if (this.state.players.length >= 6) {
      this.send(conn, { type: "error", message: "Room is full (max 6 players)" });
      return;
    }

    this.state.players.push({
      id: conn.id,
      name,
      hand: [],
      display: { stacks: {} },
      score: 0,
      connected: true,
    });

    this.broadcast({ type: "player_joined", playerId: conn.id, name });
    this.broadcastState();
  }

  handleStartGame(conn: Party.Connection) {
    if (!this.state) return;
    if (conn.id !== this.state.hostId) {
      this.send(conn, { type: "error", message: "Only the host can start the game" });
      return;
    }
    if (this.state.players.length < 2) {
      this.send(conn, { type: "error", message: "Need at least 2 players" });
      return;
    }

    this.state = startRound(this.state);
    this.broadcastState();
  }

  handlePlayToDiscard(conn: Party.Connection, cardId: string, from: "hand" | "display") {
    if (!this.state) return;
    const result = playToDiscard(this.state, conn.id, cardId, from);
    if ("error" in result) {
      this.send(conn, { type: "error", message: result.error });
      return;
    }

    // Check if a joker was just played (needs wish)
    const card = result.discardPile.topCard;
    const needsWish = card && card.color === "joker" && !result.discardPile.wish;

    this.state = result;

    // Broadcast the card played event
    if (card) {
      this.broadcast({ type: "card_played", playerId: conn.id, card, to: "discard" });
    }

    // Check for round end / game over
    if (result.phase === "round_end" || result.phase === "game_over") {
      const scores = result.players.map((p) => ({
        playerId: p.id,
        roundPoints: 0, // could track this separately
        totalScore: p.score,
      }));

      if (result.phase === "game_over") {
        const winner = result.players.reduce((a, b) => (a.score > b.score ? a : b));
        this.broadcast({
          type: "game_over",
          winnerId: winner.id,
          scores: scores.map((s) => ({ playerId: s.playerId, totalScore: s.totalScore })),
        });
      } else {
        this.broadcast({ type: "round_ended", scores });
      }
    }

    this.broadcastState();
  }

  handlePlayToDisplay(conn: Party.Connection, cardId: string) {
    if (!this.state) return;
    const result = playToDisplay(this.state, conn.id, cardId);
    if ("error" in result) {
      this.send(conn, { type: "error", message: result.error });
      return;
    }

    this.state = result;

    const card = this.state.players
      .find((p) => p.id === conn.id)
      ?.display.stacks;

    this.broadcastState();
  }

  handleJokerWish(conn: Party.Connection, wish: ClientAction extends { type: "joker_wish" } ? ClientAction["wish"] : never) {
    if (!this.state) return;
    const result = applyJokerWish(this.state, conn.id, wish as any);
    if ("error" in result) {
      this.send(conn, { type: "error", message: result.error });
      return;
    }
    this.state = result;
    this.broadcastState();
  }

  handleRestart(conn: Party.Connection) {
    if (!this.state) return;
    if (conn.id !== this.state.hostId) {
      this.send(conn, { type: "error", message: "Only the host can restart" });
      return;
    }

    if (this.state.phase === "round_end") {
      // Start next round
      this.state = startRound(this.state);
    } else if (this.state.phase === "game_over") {
      // Reset scores and start fresh
      this.state.players = this.state.players.map((p) => ({ ...p, score: 0 }));
      this.state.roundNumber = 0;
      this.state = startRound(this.state);
    }
    this.broadcastState();
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  send(conn: Party.Connection, event: ServerEvent) {
    conn.send(JSON.stringify(event));
  }

  broadcast(event: ServerEvent) {
    for (const conn of this.room.getConnections()) {
      // For state_update, send personalized state
      if (event.type === "state_update") continue;
      conn.send(JSON.stringify(event));
    }
  }

  broadcastState() {
    if (!this.state) return;
    for (const conn of this.room.getConnections()) {
      this.send(conn, {
        type: "state_update",
        state: toClientState(this.state, conn.id),
      });
    }
  }
}

PasstNichtServer satisfies Party.Worker;
