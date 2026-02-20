# PASST NICHT! — Multiplayer Card Game

A real-time multiplayer web implementation of the card game "Passt nicht!" built with React, TypeScript, and PartyKit.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **State Management:** Zustand
- **Real-time Multiplayer:** PartyKit (WebSockets)
- **Styling:** Custom CSS with retro pixel art theme

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run both dev servers

```bash
npm run dev:all
```

This starts:
- **Vite dev server** at `http://localhost:3000` (frontend)
- **PartyKit dev server** at `http://localhost:1999` (game server)

### 3. Play!

1. Open `http://localhost:3000` in your browser
2. Create a room or join with a room code
3. Share the room code with friends
4. Open multiple browser tabs to test multiplayer

## Game Rules

**Goal:** Collect the most points across rounds by keeping high-value cards in your display.

**Each turn, play exactly 1 card:**
- **To the discard pile** — if it matches by color or number (no card drawn)
- **To your display** — if it doesn't match (draw a new card)

**Jokers** are wild and can be played on any discard. When played, choose a color or number the next player must match.

**Round ends** when someone empties their hand via the discard pile. Display cards = positive points, hand cards = negative points.

**Game ends** when any player reaches 50+ points. Highest score wins!

## Project Structure

```
passt-nicht/
├── party/
│   └── server.ts          # PartyKit game server
├── src/
│   ├── game/
│   │   ├── types.ts        # Shared type definitions
│   │   └── engine.ts       # Pure game logic functions
│   ├── store/
│   │   └── gameStore.ts    # Zustand client state
│   ├── components/
│   │   ├── Card.tsx         # Card component
│   │   ├── Lobby.tsx        # Room/lobby UI
│   │   ├── GameBoard.tsx    # Main game view
│   │   └── JokerWishModal.tsx
│   ├── styles/
│   │   └── game.css         # Pixel art retro styling
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── partykit.json
├── package.json
└── tsconfig.json
```

## Deployment

### Deploy PartyKit server:
```bash
npx partykit deploy
```

### Build & deploy frontend:
```bash
npm run build
# Deploy the `dist/` folder to any static host (Vercel, Netlify, etc.)
```

Update the `PARTY_HOST` in `gameStore.ts` to point to your deployed PartyKit URL.
