import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { CardView, CardBack } from "./Card";
import { JokerWishModal } from "./JokerWishModal";
import { DragPreview } from "./DragPreview";
import { useDropTarget } from "../hooks/useDropTarget";
import { cardMatchesDiscard } from "../game/engine";
import { isJoker, CARD_COLORS } from "../game/types";
import type { AnyCard, Card, Player } from "../game/types";

export function GameBoard() {
  const {
    gameState,
    playerId,
    selectedCardId,
    selectCard,
    playToDiscard,
    playToDisplay,
    restartGame,
    dragState,
    endDrag,
  } = useGameStore();

  if (!gameState) return null;

  const {
    players,
    myHand,
    myDisplay,
    discardPile,
    currentPlayerIndex,
    myPlayerIndex,
    drawPileCount,
    phase,
    roundNumber,
    hostId,
  } = gameState;

  const isMyTurn = currentPlayerIndex === myPlayerIndex && phase === "playing";
  const currentPlayer = players[currentPlayerIndex];
  const opponents = players.filter((_, i) => i !== myPlayerIndex);
  const isHost = playerId === hostId;

  // Determine which cards in hand are playable to discard
  const playableToDiscard = new Set<string>();
  if (isMyTurn) {
    myHand.forEach((c) => {
      if (cardMatchesDiscard(c, discardPile.topCard, discardPile.wish)) {
        playableToDiscard.add(c.id);
      }
    });
    // Also check display top cards
    for (const color of CARD_COLORS) {
      const stack = myDisplay.stacks[color];
      if (stack && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (cardMatchesDiscard(top, discardPile.topCard, discardPile.wish)) {
          playableToDiscard.add(top.id);
        }
      }
    }
  }

  // Drag: determine what the dragged card can do
  const draggedCard = dragState
    ? myHand.find((c) => c.id === dragState.cardId) ??
      Object.values(myDisplay.stacks)
        .flatMap((s) => s ?? [])
        .find((c) => c.id === dragState.cardId)
    : null;

  const dragCanDiscard = draggedCard ? playableToDiscard.has(draggedCard.id) : false;
  const dragCanDisplay =
    !!draggedCard &&
    dragState?.from === "hand" &&
    !isJoker(draggedCard);

  // Drop target hooks
  const discardDrop = useDropTarget(dragCanDiscard);
  const displayDrop = useDropTarget(!!dragCanDisplay);

  // Global pointerup handler for resolving drops
  useEffect(() => {
    if (!dragState) return;

    const handlePointerUp = (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);

      for (const el of elements) {
        if (el.closest(".discard-pile") && dragCanDiscard) {
          playToDiscard(dragState.cardId, dragState.from);
          endDrag();
          return;
        }
        if (el.closest(".my-display-cards") && dragCanDisplay) {
          playToDisplay(dragState.cardId);
          endDrag();
          return;
        }
      }

      endDrag();
    };

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [dragState, dragCanDiscard, dragCanDisplay, playToDiscard, playToDisplay, endDrag]);

  // Cancel drag on Escape
  useEffect(() => {
    if (!dragState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") endDrag();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState, endDrag]);

  // Cancel drag if turn changes
  useEffect(() => {
    if (dragState && !isMyTurn) endDrag();
  }, [dragState, isMyTurn, endDrag]);

  // Prevent scroll during drag on touch
  useEffect(() => {
    if (!dragState) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener("touchmove", prevent, { passive: false });
    return () => document.body.removeEventListener("touchmove", prevent);
  }, [dragState]);

  const handleCardClick = (card: AnyCard, from: "hand" | "display") => {
    if (!isMyTurn) return;

    if (selectedCardId === card.id) {
      selectCard(null);
      return;
    }

    selectCard(card.id);
  };

  const handlePlaySelected = (target: "discard" | "display") => {
    if (!selectedCardId) return;

    if (target === "discard") {
      const inHand = myHand.find((c) => c.id === selectedCardId);
      if (inHand) {
        playToDiscard(selectedCardId, "hand");
      } else {
        playToDiscard(selectedCardId, "display");
      }
    } else {
      playToDisplay(selectedCardId);
    }
  };

  // Get the selected card object
  const selectedCard = selectedCardId
    ? myHand.find((c) => c.id === selectedCardId) ??
      Object.values(myDisplay.stacks)
        .flatMap((s) => s ?? [])
        .find((c) => c.id === selectedCardId)
    : null;

  const canPlayToDiscard = selectedCard && playableToDiscard.has(selectedCard.id);
  const canPlayToDisplay =
    selectedCard &&
    myHand.some((c) => c.id === selectedCardId) &&
    !isJoker(selectedCard);

  // Wish text
  const wishText = discardPile.wish
    ? discardPile.wish.type === "color"
      ? `Wish: ${discardPile.wish.color.toUpperCase()}`
      : `Wish: ${discardPile.wish.number}`
    : null;

  return (
    <div className={`game-board ${dragState ? "game-board--dragging" : ""}`}>
      {/* Scores */}
      <div className="scores-area">
        {players.map((p, i) => (
          <div key={p.id} className={`score-badge ${i === myPlayerIndex ? "score-badge--me" : ""}`}>
            <span>{i === myPlayerIndex ? "You" : p.name}</span>
            <span className="score-value">{p.score}</span>
          </div>
        ))}
        <div className="score-badge">
          <span>Round</span>
          <span className="score-value">{roundNumber}</span>
        </div>
      </div>

      {/* Opponents */}
      <div className="opponents-area">
        {opponents.map((opp) => {
          const oppIdx = players.findIndex((p) => p.id === opp.id);
          const isActive = oppIdx === currentPlayerIndex;

          return (
            <div
              key={opp.id}
              className={`opponent ${isActive ? "opponent--active" : ""} ${!opp.connected ? "opponent--disconnected" : ""}`}
            >
              <div className={`opponent-name ${isActive ? "opponent-name--active" : ""}`}>
                {isActive && "► "}{opp.name}
              </div>
              <div className="opponent-info">
                <span>{opp.handCount} cards</span>
                <span>{opp.score}pts</span>
              </div>
              <div className="opponent-display">
                {CARD_COLORS.map((color) => {
                  const stack = opp.display.stacks[color];
                  if (!stack || stack.length === 0) return null;
                  const topCard = stack[stack.length - 1];
                  return (
                    <CardView
                      key={color}
                      card={topCard}
                      size="small"
                      disabled
                    />
                  );
                })}
                {Object.keys(opp.display.stacks).length === 0 && (
                  <span style={{ fontSize: "7px", color: "var(--text-dim)" }}>No cards</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center: Discard + Draw piles */}
      <div className="center-area">
        <div className="pile">
          <div className="draw-pile">{drawPileCount}</div>
          <span className="pile-label">Draw</span>
        </div>

        <div>
          {isMyTurn && (
            <div className="turn-indicator">YOUR TURN</div>
          )}
          {!isMyTurn && currentPlayer && (
            <div style={{ fontSize: "8px", color: "var(--text-dim)", textAlign: "center" }}>
              {currentPlayer.name}'s turn
            </div>
          )}
          {wishText && <div className="wish-indicator">{wishText}</div>}
        </div>

        <div className="pile">
          <div
            ref={discardDrop.ref}
            className={`discard-pile ${canPlayToDiscard ? "discard-pile--droppable" : ""} ${
              dragState && dragCanDiscard ? "discard-pile--drag-target" : ""
            } ${discardDrop.isOver && dragCanDiscard ? "discard-pile--drag-hover" : ""}`}
            onClick={() => canPlayToDiscard && handlePlaySelected("discard")}
          >
            {discardPile.topCard && (
              <CardView card={discardPile.topCard} size="small" disabled />
            )}
          </div>
          <span className="pile-label">Discard</span>
        </div>
      </div>

      {/* Action buttons when card is selected */}
      {selectedCardId && isMyTurn && (
        <div className="action-bar">
          {canPlayToDiscard && (
            <button className="pixel-btn pixel-btn--small" onClick={() => handlePlaySelected("discard")}>
              ► Play to Discard
            </button>
          )}
          {canPlayToDisplay && (
            <button className="pixel-btn pixel-btn--small" onClick={() => handlePlaySelected("display")}>
              ▼ Keep in Display
            </button>
          )}
          <button
            className="pixel-btn pixel-btn--small pixel-btn--danger"
            onClick={() => selectCard(null)}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* My Display */}
      <div className="my-display-area">
        <span className="my-display-label">DISPLAY</span>
        <div
          ref={displayDrop.ref}
          className={`my-display-cards ${
            dragState && dragCanDisplay ? "my-display-cards--drag-target" : ""
          } ${displayDrop.isOver && dragCanDisplay ? "my-display-cards--drag-hover" : ""}`}
        >
          {CARD_COLORS.map((color) => {
            const stack = myDisplay.stacks[color];
            if (!stack || stack.length === 0) return null;
            const topCard = stack[stack.length - 1];
            const isPlayable = isMyTurn && playableToDiscard.has(topCard.id);
            return (
              <div key={color} style={{ position: "relative" }}>
                <CardView
                  card={topCard}
                  selected={selectedCardId === topCard.id}
                  playable={isPlayable}
                  disabled={!isMyTurn}
                  onClick={() => handleCardClick(topCard, "display")}
                  draggable={isMyTurn}
                  dragFrom="display"
                />
                {stack.length > 1 && (
                  <span style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--bg-dark)",
                    color: "var(--text-dim)",
                    fontSize: "7px",
                    padding: "1px 3px",
                    border: "1px solid var(--text-dim)",
                  }}>
                    +{stack.length - 1}
                  </span>
                )}
              </div>
            );
          })}
          {Object.keys(myDisplay.stacks).length === 0 && (
            <span style={{ fontSize: "7px", color: "var(--text-dim)", alignSelf: "center" }}>
              Cards you keep will appear here
            </span>
          )}
        </div>
      </div>

      {/* My Hand */}
      <div className="my-hand-area">
        <span className="my-hand-label">HAND</span>
        <div className="my-hand-cards">
          {myHand.map((card) => {
            const isPlayable = isMyTurn && playableToDiscard.has(card.id);
            return (
              <CardView
                key={card.id}
                card={card}
                selected={selectedCardId === card.id}
                playable={isPlayable}
                disabled={!isMyTurn}
                onClick={() => handleCardClick(card, "hand")}
                draggable={isMyTurn}
                dragFrom="hand"
              />
            );
          })}
          {myHand.length === 0 && (
            <span style={{ fontSize: "8px", color: "var(--text-dim)", alignSelf: "center" }}>
              Hand empty!
            </span>
          )}
        </div>
      </div>

      {/* Joker Wish Modal */}
      <JokerWishModal />

      {/* Drag Preview */}
      <DragPreview />

      {/* Round End Overlay */}
      {(phase === "round_end" || phase === "game_over") && (
        <div className="round-overlay">
          <div className="round-box">
            <h2 className={phase === "game_over" ? "game-over-title" : ""}>
              {phase === "game_over" ? "★ GAME OVER ★" : `Round ${roundNumber} Complete`}
            </h2>

            <ul className="round-scores">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <li key={p.id} className={i === 0 && phase === "game_over" ? "winner" : ""}>
                    <span>
                      {i === 0 && phase === "game_over" && "👑 "}
                      {p.id === playerId ? "You" : p.name}
                    </span>
                    <span className="score-value">{p.score} pts</span>
                  </li>
                ))}
            </ul>

            {isHost && (
              <button className="pixel-btn" onClick={() => restartGame()}>
                {phase === "game_over" ? "New Game" : "Next Round"}
              </button>
            )}
            {!isHost && (
              <div style={{ fontSize: "8px", color: "var(--text-dim)" }}>
                Waiting for host...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
