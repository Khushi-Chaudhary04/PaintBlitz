# Pixel War - On-Chain Multiplayer Battle Game

A high-performance, fully on-chain multiplayer pixel battle game built for Sei v2 Devnet (adaptable to Monad).

## Features

- Real-time multiplayer gameplay (2-5 players)
- 10x10 pixel grid canvas
- 60-second battle rounds
- Quiz-based move validation
- Winner-takes-all prize pool (1 SEI per player stake)
- Event-driven synchronization (no backend database)
- Cyberpunk-themed UI with neon animations

## Tech Stack

- **Frontend**: React + Tailwind CSS + HTML5 Canvas
- **Web3**: ethers.js v6
- **Blockchain**: Sei v2 Devnet
- **Smart Contract**: Solidity ^0.8.20

## Setup Instructions

### 1. Deploy the Smart Contract

1. Navigate to the `contracts` folder
2. Deploy `PixelWar.sol` to Sei Devnet using your preferred method (Hardhat, Remix, etc.)
3. Copy the deployed contract address

### 2. Configure the Contract Address

Update the `CONTRACT_ADDRESS` in `src/constants.js`:

```javascript
export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

## Sei Devnet Configuration

- **RPC URL**: https://evm-rpc.arctic-1.seinetwork.io
- **Chain ID**: 713715 (0xAE3F3)
- **Currency**: SEI

MetaMask will automatically prompt you to add the network when you connect.

## How to Play

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Create/Join Game**:
   - Create a new game by staking 1 SEI
   - Or join an existing game using a Game ID
3. **Wait for Players**: Game starts when at least 2 players join
4. **Paint Pixels**:
   - Click on any grid cell to paint
   - Solve a math quiz to confirm your move
5. **Win**: Player with the most pixels when the timer runs out wins the entire stake pool

## Smart Contract Functions

- `createGame()`: Create a new game (requires 1 SEI stake)
- `joinGame(gameId)`: Join an existing game (requires 1 SEI stake)
- `paintCell(gameId, x, y)`: Paint a pixel at coordinates (x, y)
- `endGame(gameId)`: End the game and distribute winnings
- `getGameInfo(gameId)`: Get game information
- `getCell(gameId, x, y)`: Get cell color and owner

## Events

- `GameCreated`: Emitted when a new game is created
- `PlayerJoined`: Emitted when a player joins a game
- `CellPainted`: Emitted when a pixel is painted (enables real-time sync)
- `GameEnded`: Emitted when game ends with winner

## Migration to Monad

To migrate to Monad:

1. Update the network configuration in `src/constants.js`:
   - Change `chainId`, `chainName`, `rpcUrls`
2. Redeploy the smart contract to Monad
3. Update the `CONTRACT_ADDRESS`

## Project Structure

```
├── contracts/
│   └── PixelWar.sol          # Smart contract
├── src/
│   ├── components/
│   │   ├── LandingPage.jsx   # Wallet connection & game lobby
│   │   ├── GameView.jsx      # Main game view with event listeners
│   │   ├── GameCanvas.jsx    # 10x10 pixel grid
│   │   ├── Scoreboard.jsx    # Live player scores
│   │   ├── Timer.jsx         # Countdown timer
│   │   └── QuizOverlay.jsx   # Math quiz for moves
│   ├── hooks/
│   │   ├── useWallet.js      # Wallet connection logic
│   │   └── useContract.js    # Contract interaction logic
│   ├── constants.js          # Network config & contract ABI
│   ├── App.tsx               # Main app logic
│   └── index.css             # Cyberpunk theme styles
└── README.md
```

## License

MIT
