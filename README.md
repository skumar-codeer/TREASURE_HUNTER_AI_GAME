<<<<<<< HEAD
# 🧭 Treasure Hunter AI — Ultimate Edition v5.0

An advanced AI pathfinding visualization and interactive game, built as a showcase of classic search algorithms in action.

## 🆕 What's New in Ultimate Edition

### 4 AI Algorithms
| Algorithm | Type | Description |
|-----------|------|-------------|
| **A\*** | Optimal + Fast | Uses `f(n) = g(n) + h(n)` with Manhattan heuristic |
| **BFS** | Complete | Explores all nodes level by level — shortest in unweighted grids |
| **Dijkstra** | Optimal (Weighted) | Accounts for terrain cost — best with Mud terrain |
| **Greedy Best-First** | Fast but not optimal | Only uses heuristic — fast but may miss the true shortest path |

### ⚔️ Algorithm Race Mode (NEW)
- Run all 4 algorithms simultaneously on the **same grid**
- Watch them explore and find paths in real time, side by side
- A winner is crowned based on fewest steps (then fewest nodes explored)

### 🌍 Terrain Engine (NEW)
- **🟫 Mud Tiles** — Cost ×3 for movement, tests Dijkstra's weighted advantage
- **❄️ Ice Tiles** — Slide continuously until hitting a wall or empty cell
- **⚡ Power-Up Tiles** — Grants a one-time trap immunity shield

### 🎮 Enhanced Player Mode
- Ice sliding mechanic
- Shield power-ups protect against traps
- Improved scoring: `1000 - moves×5 - time×2 + livesBonus + diffBonus`

### 🏆 Persistent Leaderboard
- Top scores saved locally per browser
- Shows difficulty, algorithm used, and score

### ✨ Visual Overhaul
- Cyberpunk neon aesthetic with Orbitron/Rajdhani/Share Tech Mono fonts
- Animated circuit-board grid background
- Particle burst effects on wins, power-up collection
- Per-algorithm color coding (cyan A*, blue BFS, purple Dijkstra, gold Greedy)
- CRT scanline overlay for atmosphere

## 📁 Project Structure
```
treasure-hunter-ai/
├── index.html      — Main UI (Splash, Game, Compare, End screens)
├── style.css       — Full cyberpunk design system
├── script.js       — Game engine + 4 pathfinding algorithms
├── assets/
│   ├── agent.png
│   ├── treasure.png
│   ├── trap.png
│   └── obstacle.png
└── README.md
```

## 🧠 Algorithm Details

### A* Search
```
f(n) = g(n) + h(n)
g(n) = actual cost from start (includes terrain weight)
h(n) = Manhattan distance = |x₁−x₂| + |y₁−y₂|
```
Uses a min-heap priority queue. Optimal and complete.

### BFS (Breadth-First Search)
Explores all nodes at distance d before d+1. Guarantees shortest path in **unweighted** grids. Ignores terrain cost.

### Dijkstra's Algorithm
Like BFS but uses a priority queue ordered by cumulative cost. Handles **weighted terrain** (mud = 3×). Always optimal.

### Greedy Best-First
Only uses the heuristic `h(n)` — no path cost tracking. Fastest in simple mazes, but can fail or take suboptimal routes in complex ones.

## 🕹️ Controls
- **Arrow Keys / WASD** — Move agent
- **Touch D-Pad** — Mobile movement
- **🤖 AI Solve** — Let selected algorithm solve current grid
- **⏩ Speed** — 3× animation speed toggle
- **⚔️ Algorithm Race** — Compare all 4 from the splash screen

## 🎯 Difficulty Levels
| Level | Grid | Traps | Terrain | Fog | Lives |
|-------|------|-------|---------|-----|-------|
| Easy | 8×8 | 4 | None | No | 1 |
| Medium | 10×10 | 6 | Mud+Ice+Power | No | 1 |
| Hard | 12×12 | 10 | All terrain | No | 2 |
| Extreme | 15×15 | 14 | All terrain | Yes | 3 |

## 🔧 Run Locally
Open `index.html` directly in a browser. No server required.
For best results, serve with a local HTTP server:
```bash
python -m http.server 8080
# then visit http://localhost:8080
```

---
*Built as an AI course project demonstrating heuristic search algorithms.*
=======
# TREASURE_HUNTER_AI_GAME
>>>>>>> 01d76e3c5680b1f9372a517693a360d785ae1b50
