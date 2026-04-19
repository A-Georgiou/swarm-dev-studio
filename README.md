# Swarm Dev Studio

A developer swarm system where AI agents work together in a pixel-art office to solve tasks. Watch CEO Morgan delegate to CTO Aria, who breaks work into team tasks, managed by 5 team managers who coordinate developers, PMs, QA, and testers — all visualized in a real-time pixel-art office simulation.

## Architecture

```
@swarm/types    → Shared TypeScript type definitions
@swarm/engine   → Agent orchestration, org hierarchy, task management, simulation loop
@swarm/server   → HTTP + WebSocket server, REST API, real-time state broadcasting
@swarm/ui       → Phaser 3 pixel-art game + React sidebar
```

## Team Structure (48 agents across 6 teams)

```
CEO (Morgan Blackwell) — Claude Opus 4.6
└── CTO (Aria Chen) — Claude Opus 4.6 (1M context)
    ├── Staff Manager (Jordan Rivera) — Claude Opus 4.5
    │   ├── Sr Manager (Alex Mercer) — GPT-5.4
    │   │   ├── Team Alpha (Frontend/UI) — 7 members
    │   │   └── Team Beta (Backend/API) — 7 members
    │   └── Sr Manager (Sam Okafor) — GPT-5.4
    │       ├── Team Gamma (Data/Infra) — 7 members
    │       ├── Team Delta (Testing/QA) — 7 members
    │       ├── Team Epsilon (DevOps) — 7 members
    │       └── Team Zeta (Security) — 7 members
    └── Staff Manager (Casey Nguyen) — Claude Opus 4.5 (Quality)
```

Each team has: Manager, PM, Senior Developer, 2 Developers, QA Engineer, Test Engineer

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate pixel art assets
pnpm generate-assets

# Build all packages
pnpm build

# Start the server (port 3001)
cd packages/server && pnpm start

# Start the UI dev server (port 3000)
cd packages/ui && pnpm dev
```

## Features

- **Hierarchical delegation**: Tasks flow from CEO → CTO → Staff Managers → Team Managers → Developers
- **Pixel art office**: Watch agents walk around, discuss, code, and review
- **Real-time simulation**: Agents autonomously think, code, discuss, and review
- **Speech bubbles**: See what agents are saying with unique catchphrases
- **Activity feed**: Track all agent communications in real-time
- **Task submission**: Submit tasks via the sidebar and watch the team mobilize
- **WebSocket sync**: Real-time state updates between server and UI
- **Multi-model support**: Different AI models assigned to different roles

## API

- `GET /api/health` — Health check
- `GET /api/agents` — List all agents
- `GET /api/tasks` — List all tasks
- `GET /api/org` — Organization chart
- `POST /api/tasks` — Submit a new task
- `POST /api/game/command` — Pause/resume/speed/reset
- `GET /api/state` — Full game state snapshot
- `WS /` — WebSocket for real-time events

## Testing

```bash
pnpm test
```
