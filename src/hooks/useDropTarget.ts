import { useRef, useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

export function useDropTarget(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useGameStore((s) => s.dragState);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!active || !dragState || !ref.current) {
      setIsOver(false);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const over =
      dragState.currentX >= rect.left &&
      dragState.currentX <= rect.right &&
      dragState.currentY >= rect.top &&
      dragState.currentY <= rect.bottom;

    setIsOver(over);
  }, [active, dragState?.currentX, dragState?.currentY]);

  return { ref, isOver };
}
