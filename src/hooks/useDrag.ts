import { useCallback, useRef } from "react";
import { useGameStore } from "../store/gameStore";

const DRAG_THRESHOLD = 5;

export function useDrag(cardId: string, from: "hand" | "display", enabled: boolean) {
  const isDraggingRef = useRef(false);
  const startDrag = useGameStore((s) => s.startDrag);
  const updateDrag = useGameStore((s) => s.updateDrag);
  const dragState = useGameStore((s) => s.dragState);
  const startPos = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;

      startPos.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - startPos.current.x;
        const dy = moveEvt.clientY - startPos.current.y;

        if (!isDraggingRef.current) {
          if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
            isDraggingRef.current = true;
            startDrag(cardId, from, startPos.current.x, startPos.current.y);
          }
          return;
        }

        updateDrag(moveEvt.clientX, moveEvt.clientY);
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", onPointerUp);
        try {
          target.releasePointerCapture(upEvt.pointerId);
        } catch {}

        isDraggingRef.current = false;
        // Drop handling is done by GameBoard's global pointerup listener
      };

      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerup", onPointerUp);
    },
    [enabled, cardId, from, startDrag, updateDrag]
  );

  const isBeingDragged = dragState?.cardId === cardId;

  return { onPointerDown, isBeingDragged };
}
