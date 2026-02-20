import { useGameStore } from "./store/gameStore";
import { Lobby } from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";
import "./styles/game.css";

export default function App() {
  const { gameState, error } = useGameStore();
  const phase = gameState?.phase;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PASST NICHT!</h1>
        <div className="app-subtitle">The card game where not fitting in is a good thing</div>
      </header>

      {(!phase || phase === "lobby") ? (
        <Lobby />
      ) : (
        <GameBoard />
      )}

      {error && (
        <div className="error-toast">{error}</div>
      )}
    </div>
  );
}
