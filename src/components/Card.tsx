import type { AnyCard } from "../game/types";
import { isJoker } from "../game/types";

interface CardProps {
  card: AnyCard;
  size?: "normal" | "small";
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const COLOR_SYMBOLS: Record<string, string> = {
  red: "♥",
  blue: "♦",
  green: "♣",
  yellow: "★",
};

export function CardView({ card, size = "normal", selected, playable, disabled, onClick }: CardProps) {
  const joker = isJoker(card);
  const colorClass = joker ? "joker" : card.color;

  const classes = [
    "card",
    `card--${colorClass}`,
    size === "small" && "card--small",
    selected && "card--selected",
    playable && "card--playable",
    disabled && "card--disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onClick={disabled ? undefined : onClick}>
      {joker ? (
        <>
          <span className="card-joker-icon">✦</span>
          <span className="card-color-label">Joker</span>
        </>
      ) : (
        <>
          <span className="card-number">{card.number}</span>
          <span className="card-color-label">
            {COLOR_SYMBOLS[card.color]} {card.color}
          </span>
        </>
      )}
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return <div className={`card-back${small ? " card-back--small" : ""}`} />;
}
