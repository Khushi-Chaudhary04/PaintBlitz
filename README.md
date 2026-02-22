# 🎨 PaintBlitz

**Skill-based onchain multiplayer game built for Monad Blitz**

PaintBlitz is a fast-paced, winner-takes-all game where players **earn by knowledge, not luck**.  
Players stake MON, answer questions correctly, paint a shared grid in real time, and the player who controls the most cells at the end **wins the entire prize pool**.

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

---

## 🔐 Key Design Decisions

- **Skill > Luck**
  - Outcomes depend only on correct answers and strategy
- **Optimistic UI**
  - UI updates instantly, reconciles with chain state
- **Session-based gameplay**
  - Minimal wallet interruptions during play

---
