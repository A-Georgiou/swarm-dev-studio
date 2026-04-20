# Swarm Dev Studio

A developer swarm system where AI agents work together in a pixel-art office to solve tasks. Watch CEO Morgan delegate to CTO Aria, who breaks work into team tasks, managed by 6 team managers who coordinate developers, PMs, QA, and testers — all visualized in a real-time pixel-art office simulation.

## Architecture

```
@swarm/types    → Shared TypeScript type definitions (agent, task, message, game, API types)
@swarm/engine   → Agent orchestration, org hierarchy, task management, LLM integration, simulation loop
@swarm/server   → HTTP + WebSocket server, REST API, real-time state broadcasting
@swarm/ui       → Phaser 3 pixel-art game + React sidebar with speech bubbles and agent panels
```

## Team Structure (48 agents across 6 teams)

```
CEO (Morgan Blackwell) — Claude Opus 4.7
└── CTO (Aria Chen) — Claude Opus 4.6 (1M context)
    ├── Staff Manager — Delivery (Jordan Rivera) — Claude Opus 4.5
    │   ├── Sr Manager (Alex Mercer) — GPT-5.4
    │   │   ├── Team Alpha (Frontend/UI) — 7 members
    │   │   └── Team Beta (Backend/API) — 7 members
    │   └── Sr Manager (Sam Okafor) — GPT-5.4
    │       ├── Team Gamma (Data/Infra) — 7 members
    │       ├── Team Delta (Testing/QA) — 7 members
    │       ├── Team Epsilon (DevOps) — 7 members
    │       └── Team Zeta (Security) — 7 members
    └── Staff Manager — Quality (Casey Nguyen) — Claude Opus 4.5
```

Each team has: Manager, PM, Senior Developer, 2 Developers, QA Engineer, Tester

## Core Features

### Hierarchical Delegation Chain
Tasks submitted by users flow through the full org chart:
1. **CEO** receives the task, creates a strategic planning document, delegates to CTO
2. **CTO** decomposes into technical sub-tasks, creates architecture doc, routes through staff managers
3. **Staff Manager Jordan** (delivery) coordinates implementation across senior managers
4. **Staff Manager Casey** (quality) coordinates QA/testing across senior managers
5. **Senior Managers** route to specific team managers based on team expertise
6. **Team Managers** run standups, create implementation plans, assign to developers
7. **Developers** ask clarifying questions, receive answers, begin implementation
8. **QA Engineers** proactively define acceptance criteria before coding starts
9. **Testers** prepare test environments and automated suites during planning

### LLM-Powered Agent Intelligence
Each agent has an assigned AI model that drives their thinking and communication:
- `packages/engine/src/llm/LLMClient.ts` — Multi-provider abstraction (Anthropic + OpenAI)
- When API keys are configured (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), agents make real LLM calls
- Without keys, agents use personality-aware local generation based on Big Five traits
- 15 distinct models used: Claude Opus 4.7, Opus 4.6-1m, Opus 4.5, Sonnet 4.6/4.5/4, Haiku 4.5, GPT-5.4/5.4-mini/5-mini/5.2/5.2-codex/5.3-codex/4.1

### Multi-Turn Conversations
Agents have back-and-forth threaded discussions at every level:
- CEO ↔ CTO: strategic alignment
- Staff Managers ↔ Senior Managers: workstream coordination
- Team Managers ↔ Developers: Q&A on implementation details
- QA ↔ Developers: acceptance criteria negotiation
- Peer developers: spontaneous pair discussions

### Planning Documents
Structured planning documents are created at each delegation level via `TaskManager.createPlanningDoc()`:
- CEO: Strategic goal document
- CTO: Technical decomposition with component breakdown
- Staff Managers: Delivery/quality coordination plans
- Team Managers: Sprint-level implementation plans with developer assignments

### Pixel Art Office Visualization
- **Tilemap**: 80×60 tile office with floor, walls, furniture, and decoration layers
- **Generated sprites**: 9 role-specific character sprite sheets (32×48px) with walk/idle/coding/talking/thinking animations
- **Pathfinding**: EasyStar.js A* pathfinding for character movement
- **Speech bubbles**: Agents display thoughts and conversations above their heads
- **14 rooms**: Executive suite, management area, 6 team open spaces, 4 meeting rooms, break room
- **Desk assignments**: Each of the 48 agents has a unique desk position

### Real-Time WebSocket Communication
- Channel subscription management (subscribe/unsubscribe with per-client filtering)
- Live broadcasting of agent state changes, messages, task updates, and movement
- Full game state snapshots on demand

### Unique Agent Personalities
Each of the 48 agents has:
- **Big Five personality model**: openness, conscientiousness, extraversion, agreeableness, neuroticism
- **Communication style**: unique voice and approach (e.g., "visionary and decisive" vs "meticulous, detail-focused")
- **Catchphrases**: 3+ distinctive phrases per agent
- **Model assignment**: specific LLM model matched to their role level

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate pixel art assets
pnpm generate-assets

# Build all packages
pnpm build      # or: turbo run build

# Run tests (71 tests across 4 packages)
pnpm test       # or: turbo run test

# Start the server (port 3001)
cd packages/server && pnpm start

# Start the UI dev server (port 3000)
cd packages/ui && pnpm dev
```

### With LLM API Keys (optional)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
# Agents will now use real LLM calls instead of local generation
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/agents` | List all 48 agents with state |
| GET | `/api/tasks` | List all tasks with status |
| GET | `/api/org` | Full organization chart |
| GET | `/api/state` | Complete game state snapshot |
| POST | `/api/tasks` | Submit a new task |
| POST | `/api/game/command` | Pause/resume/speed/reset |
| WS | `/` | Real-time events (subscribe/unsubscribe channels) |

## Testing

```bash
pnpm test
# @swarm/types:  9 tests — enum validation, type coverage
# @swarm/engine: 41 tests — agents, org, tasks, messages, delegation chain, LLM client
# @swarm/server: 9 tests — REST endpoints, WebSocket, CORS
# @swarm/ui:     12 tests — build output, assets, components
```

## Key Source Files

| File | Description |
|------|-------------|
| `packages/engine/src/simulation/SimulationEngine.ts` | Core tick-based simulation with full delegation chain |
| `packages/engine/src/llm/LLMClient.ts` | Multi-provider LLM abstraction (Anthropic/OpenAI + local fallback) |
| `packages/engine/src/agents/personas.ts` | 48 agent personas with Big Five traits and model assignments |
| `packages/engine/src/agents/AgentManager.ts` | Agent lifecycle, desk positions, team management |
| `packages/engine/src/org/OrgManager.ts` | Org hierarchy and reporting chain |
| `packages/engine/src/tasks/TaskManager.ts` | Task decomposition and planning documents |
| `packages/engine/src/messages/MessageBus.ts` | Inter-agent messaging with threading |
| `packages/server/src/SwarmServer.ts` | HTTP + WebSocket server with channel subscriptions |
| `packages/ui/src/game/scenes/BootScene.ts` | Asset loading (atlas sprites + procedural fallback) |
| `packages/ui/src/game/scenes/OfficeScene.ts` | Main game scene with tilemap and characters |
| `packages/ui/src/game/entities/Character.ts` | Animated character sprites with state machine |
| `scripts/generate-assets/index.js` | Procedural pixel art asset generation |
