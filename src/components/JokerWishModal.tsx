import { useGameStore } from "../store/gameStore";
import type { CardColor, CardNumber } from "../game/types";
import { CARD_COLORS, CARD_NUMBERS } from "../game/types";

export function JokerWishModal() {
  const { showJokerWishModal, sendJokerWish } = useGameStore();

  if (!showJokerWishModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>✦ Joker Wish ✦</h3>
        <p style={{ fontSize: "7px", color: "var(--text-dim)", marginBottom: "16px", textAlign: "center" }}>
          Choose a color or number the next player must match:
        </p>

        <div className="wish-section">
          <h4>Choose Color:</h4>
          <div className="wish-colors">
            {CARD_COLORS.map((color) => (
              <button
                key={color}
                className={`wish-color-btn wish-color-btn--${color}`}
                onClick={() => sendJokerWish({ type: "color", color })}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        <div className="wish-section">
          <h4>Choose Number:</h4>
          <div className="wish-numbers">
            {CARD_NUMBERS.map((num) => (
              <button
                key={num}
                className="wish-number-btn"
                onClick={() => sendJokerWish({ type: "number", number: num })}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
