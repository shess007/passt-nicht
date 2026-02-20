import { useState } from "react";
import { useGameStore } from "../store/gameStore";

export function Lobby() {
  const {
    connected,
    roomId,
    playerName,
    gameState,
    playerId,
    setPlayerName,
    connect,
    joinGame,
    startGame,
  } = useGameStore();

  const [inputRoom, setInputRoom] = useState("");
  const [inputName, setInputName] = useState("");
  const [step, setStep] = useState<"room" | "name">("room");

  const isHost = gameState?.hostId === playerId;
  const playerCount = gameState?.players.length ?? 0;
  const hasJoined = gameState?.players.some((p) => p.id === playerId);

  const handleCreateRoom = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    connect(id);
    setStep("name");
  };

  const handleJoinRoom = () => {
    if (!inputRoom.trim()) return;
    connect(inputRoom.trim().toUpperCase());
    setStep("name");
  };

  const handleSetName = () => {
    if (!inputName.trim()) return;
    setPlayerName(inputName.trim());
    joinGame();
  };

  // Step 1: Room selection
  if (!connected || step === "room") {
    return (
      <div className="lobby">
        <div className="lobby-box">
          <h2>» PASST NICHT! «</h2>

          <div className="input-group">
            <label>Create a new room:</label>
            <button className="pixel-btn" onClick={handleCreateRoom}>
              Create Room
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: "8px", color: "var(--text-dim)", margin: "12px 0" }}>
            — OR —
          </div>

          <div className="input-group">
            <label>Join with room code:</label>
            <input
              className="pixel-input"
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={8}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            />
            <button className="pixel-btn" onClick={handleJoinRoom} disabled={!inputRoom.trim()}>
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Name entry
  if (!hasJoined) {
    return (
      <div className="lobby">
        <div className="lobby-box">
          <h2>Enter Your Name</h2>

          <div className="room-code">
            <div style={{ fontSize: "7px", color: "var(--text-dim)", marginBottom: "4px" }}>Room Code</div>
            <span>{roomId}</span>
          </div>

          <div className="input-group">
            <label>Your name:</label>
            <input
              className="pixel-input"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Player name"
              maxLength={16}
              onKeyDown={(e) => e.key === "Enter" && handleSetName()}
              autoFocus
            />
            <button className="pixel-btn" onClick={handleSetName} disabled={!inputName.trim()}>
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Waiting in lobby
  return (
    <div className="lobby">
      <div className="lobby-box">
        <h2>» Waiting Room «</h2>

        <div className="room-code">
          <div style={{ fontSize: "7px", color: "var(--text-dim)", marginBottom: "4px" }}>
            Share this code:
          </div>
          <span>{roomId}</span>
        </div>

        <ul className="player-list">
          {gameState?.players.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.id === gameState.hostId && <span className="host-badge">HOST</span>}
              {!p.connected && <span style={{ color: "var(--danger)", fontSize: "7px" }}>(disconnected)</span>}
            </li>
          ))}
        </ul>

        <div style={{ fontSize: "7px", color: "var(--text-dim)", textAlign: "center", marginBottom: "12px" }}>
          {playerCount}/6 players • Need at least 2
        </div>

        {isHost ? (
          <button
            className="pixel-btn"
            onClick={() => startGame()}
            disabled={playerCount < 2}
          >
            Start Game
          </button>
        ) : (
          <div style={{ fontSize: "8px", color: "var(--text-dim)", textAlign: "center" }}>
            Waiting for host to start...
          </div>
        )}
      </div>
    </div>
  );
}
