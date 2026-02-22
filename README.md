# 🎨 PaintBlitz

**Skill-based onchain multiplayer game built for Monad Blitz**

PaintBlitz is a fast-paced, winner-takes-all game where players **earn by knowledge, not luck**.  
Players stake MON, answer questions correctly, paint a shared grid in real time, and the player who controls the most cells at the end **wins the entire prize pool**.

Think **Polymarket × Multiplayer Game**, fully onchain.

---

## 🚀 Why PaintBlitz?

Most earning games rely on:
- randomness
- farming
- bots
- slow, sequential execution

PaintBlitz removes all of that.

- ❌ No RNG  
- ❌ No luck  
- ❌ No passive farming  

✅ **Pure skill**  
✅ **Real-time competition**  
✅ **Winner takes all**

---

## 🧠 How the Game Works

1. **Create Game**
   - Creator chooses grid size, duration, max players, and stake
   - Stakes MON onchain to initialize the prize pool

2. **Join Game**
   - Other players stake the same amount
   - Game starts once minimum players join

3. **Gameplay**
   - Players click empty cells
   - Answer a question correctly
   - Cell is painted in their color
   - All actions happen onchain with optimistic UI

4. **End Game**
   - Timer ends
   - Player with the most painted cells wins
   - **Entire prize pool is paid onchain to the winner**

---

## 👀 Spectators & Blinks (Monad-Native UX)

PaintBlitz separates **watching** from **transacting**.

### Watch Live (No Wallet Needed)
- The game is deployed on Vercel
- Anyone can watch a live game in real time without connecting a wallet

### Sponsor via Blink (1-Click Onchain Action)
- Spectators can sponsor the prize pool using a **Blink**
- No app navigation, no game UI required
- One click → transaction → prize pool updates live

This turns spectators into **active onchain participants**.

---

## 🔗 Blinks Used

PaintBlitz exposes core actions as Blinks:

- **Sponsor Game Blink**
  - Add MON directly to an active game’s prize pool
  - Works for any game using a single reusable Blink endpoint

Blinks act as **entry points**, while the game itself remains a full real-time dApp.

---

## ⚡ Why Monad?

PaintBlitz is designed around **concurrent user actions**:

- Multiple players painting simultaneously
- Multiple spectators sponsoring the prize pool
- Frequent state updates to the grid and scores

### Monad makes this possible because:

- **Parallel Execution**
  - Independent actions execute simultaneously
  - Conflicts are safely retried using optimistic execution
- **EVM Compatibility**
  - Standard Solidity contracts
  - No custom execution logic required
- **Low Latency**
  - Real-time gameplay feedback
  - Fast confirmation keeps the game fair and responsive

PaintBlitz naturally benefits from Monad’s execution model without changing Ethereum semantics.

---

## 🏗️ Tech Stack

### Frontend
- React + Vite
- Tailwind CSS
- Real-time optimistic UI

### Blockchain
- Monad Testnet (EVM compatible)
- Solidity `0.8.x`
- ethers.js v6

### Blinks
- Next.js 14
- Dialect Blinks (EVM)
- Wagmi + Viem

---

## 🔐 Key Design Decisions

- **Skill > Luck**
  - Outcomes depend only on correct answers and strategy
- **Optimistic UI**
  - UI updates instantly, reconciles with chain state
- **Session-based gameplay**
  - Minimal wallet interruptions during play
- **Single reusable Blink**
  - One Blink endpoint supports all games via parameters

---

## 🎯 Why This Wins at Monad Blitz

- Consumer-first UX
- Real money, real competition
- Blinks used correctly (as actions, not apps)
- Demonstrates Monad’s strengths naturally
- Playable, watchable, sponsorable — instantly

PaintBlitz is not a demo.  
It’s a **real onchain game designed for speed**.

---

## 🟣 Built for Monad Blitz ⚡

One day.  
No luck.  
Just skill — and speed.
