import { createPortal } from "react-dom";
import { useGameStore } from "../store/gameStore";
import { CardView } from "./Card";
import { CARD_COLORS } from "../game/types";
import type { AnyCard } from "../game/types";

export function DragPreview() {
  const dragState = useGameStore((s) => s.dragState);
  const gameState = useGameStore((s) => s.gameState);

  if (!dragState || !gameState) return null;

  let card: AnyCard | undefined;
  if (dragState.from === "hand") {
    card = gameState.myHand.find((c) => c.id === dragState.cardId);
  } else {
    for (const color of CARD_COLORS) {
      const stack = gameState.myDisplay.stacks[color];
      if (stack && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.id === dragState.cardId) {
          card = top;
          break;
        }
      }
    }
  }

  if (!card) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    transform: `translate(${dragState.currentX - 28}px, ${dragState.currentY - 39}px)`,
    pointerEvents: "none",
    zIndex: 10000,
    opacity: 0.9,
    filter: "drop-shadow(0 0 8px rgba(0,255,204,0.6))",
    scale: "1.1",
  };

  return createPortal(
    <div style={style}>
      <CardView card={card} />
    </div>,
    document.body
  );
}
