// ============================================================
// SwarmServer — HTTP + WebSocket server for the swarm system
// ============================================================

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  AgentState,
  type ServerWsEvent,
  type ClientWsEvent,
  type GameState,
  type GetAgentsResponse,
  type GetTasksResponse,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type GetMessagesResponse,
  type GetOrgChartResponse,
  type GameCommandRequest,
  type GameCommandResponse,
} from "@swarm/types";
import { SimulationEngine } from "@swarm/engine";
import type { SimulationEvent } from "@swarm/engine";

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
}

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 3001,
  host: "0.0.0.0",
  corsOrigin: "*",
};

export class SwarmServer {
  private config: ServerConfig;
  private simulation: SimulationEngine;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(config?: Partial<ServerConfig>) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    this.simulation = new SimulationEngine();
  }

  /** Start the server. */
  async start(): Promise<void> {
    // Initialize the simulation engine
    this.simulation.initialize();

    // Wire up simulation events to WebSocket broadcasts
    this.simulation.onEvent((event) => this.broadcastSimEvent(event));

    // Create HTTP server
    this.httpServer = createServer((req, res) => this.handleHttp(req, res));

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on("connection", (ws) => this.handleWsConnection(ws));

    // Start listening
    return new Promise((resolve) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        console.log(
          `🏢 Swarm Dev Studio server running at http://${this.config.host}:${this.config.port}`
        );
        resolve();
      });
    });
  }

  /** Start the simulation loop. */
  startSimulation(): void {
    this.simulation.start();
    console.log("🔄 Simulation started");
  }

  /** Stop everything. */
  stop(): void {
    this.simulation.stop();
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.wss.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    console.log("🛑 Server stopped");
  }

  /** Get the simulation engine (for testing/direct access). */
  getSimulation(): SimulationEngine {
    return this.simulation;
  }

  // ── HTTP Handler ──────────────────────────────────────────

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", this.config.corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? "/";

    if (req.method === "GET" && url === "/api/agents") {
      this.handleGetAgents(res);
    } else if (req.method === "GET" && url === "/api/tasks") {
      this.handleGetTasks(res);
    } else if (req.method === "POST" && url === "/api/tasks") {
      this.handleCreateTask(req, res);
    } else if (req.method === "GET" && url.startsWith("/api/messages/")) {
      this.handleGetMessages(url, res);
    } else if (req.method === "GET" && url === "/api/org") {
      this.handleGetOrg(res);
    } else if (req.method === "POST" && url === "/api/game/command") {
      this.handleGameCommand(req, res);
    } else if (req.method === "GET" && url === "/api/state") {
      this.handleGetState(res);
    } else if (req.method === "GET" && url === "/api/health") {
      this.jsonResponse(res, 200, { status: "ok", tick: this.simulation.getTick() });
    } else {
      this.jsonResponse(res, 404, { error: "Not found" });
    }
  }

  private handleGetAgents(res: ServerResponse): void {
    const agents = this.simulation.agentManager.getAll();
    const response = {
      agents: agents.map((a) => ({
        id: a.id,
        role: a.role,
        name: a.persona.name,
        title: a.persona.title,
        state: a.state,
        teamId: a.teamId,
        model: a.persona.modelAssignment,
        personality: a.persona.personality,
        communicationStyle: a.persona.communicationStyle,
        catchphrases: a.persona.catchphrases,
        currentTaskId: a.currentTaskId,
      })),
    };
    this.jsonResponse(res, 200, response);
  }

  private handleGetTasks(res: ServerResponse): void {
    const tasks = this.simulation.taskManager.getAll();
    const response: GetTasksResponse = { tasks };
    this.jsonResponse(res, 200, response);
  }

  private handleCreateTask(req: IncomingMessage, res: ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body) as CreateTaskRequest;
        if (!data.title || !data.description) {
          this.jsonResponse(res, 400, { error: "title and description required" });
          return;
        }
        const task = this.simulation.submitTask(data.title, data.description);
        const response: CreateTaskResponse = { task };
        this.jsonResponse(res, 201, response);
      } catch {
        this.jsonResponse(res, 400, { error: "Invalid JSON" });
      }
    });
  }

  private handleGetMessages(url: string, res: ServerResponse): void {
    const channelId = url.replace("/api/messages/", "");
    const messages = this.simulation.messageBus.getMessages(channelId, 100);
    const response: GetMessagesResponse = {
      messages,
      hasMore: false,
    };
    this.jsonResponse(res, 200, response);
  }

  private handleGetOrg(res: ServerResponse): void {
    const orgChart = this.simulation.orgManager.getOrgChart();
    const response: GetOrgChartResponse = { orgChart };
    this.jsonResponse(res, 200, response);
  }

  private handleGameCommand(req: IncomingMessage, res: ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body) as GameCommandRequest;
        let response: GameCommandResponse;

        switch (data.command) {
          case "pause":
            this.simulation.setPaused(true);
            response = { success: true, message: "Simulation paused" };
            break;
          case "resume":
            this.simulation.setPaused(false);
            response = { success: true, message: "Simulation resumed" };
            break;
          case "speed":
            const speed = (data.params?.speed as number) ?? 1;
            this.simulation.setSpeed(speed);
            response = { success: true, message: `Speed set to ${speed}x` };
            break;
          case "reset":
            this.simulation.stop();
            this.simulation.initialize();
            this.simulation.start();
            response = { success: true, message: "Simulation reset" };
            break;
          default:
            response = { success: false, message: "Unknown command" };
        }

        this.jsonResponse(res, 200, response);
      } catch {
        this.jsonResponse(res, 400, { error: "Invalid JSON" });
      }
    });
  }

  private handleGetState(res: ServerResponse): void {
    const state = this.simulation.getGameState();
    this.jsonResponse(res, 200, state);
  }

  // ── WebSocket Handler ─────────────────────────────────────

  private handleWsConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`🔌 Client connected (${this.clients.size} total)`);

    // Send initial state
    const state = this.simulation.getGameState();
    this.sendWsEvent(ws, { event: "game:state", payload: state });

    ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString()) as ClientWsEvent;
        this.handleWsMessage(ws, event);
      } catch {
        this.sendWsEvent(ws, {
          event: "error",
          payload: { code: "INVALID_MESSAGE", message: "Invalid JSON" },
        });
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
      console.log(`🔌 Client disconnected (${this.clients.size} total)`);
    });
  }

  private handleWsMessage(ws: WebSocket, event: ClientWsEvent): void {
    switch (event.event) {
      case "request:state": {
        const state = this.simulation.getGameState();
        this.sendWsEvent(ws, { event: "game:state", payload: state });
        break;
      }
      case "send:message": {
        // User sends a message (treated as a task submission)
        const { content } = event.payload;
        this.simulation.submitTask("User Request", content);
        break;
      }
      case "subscribe":
      case "unsubscribe":
        // Channel subscription management (simplified — broadcast all)
        break;
    }
  }

  // ── Broadcasting ──────────────────────────────────────────

  private broadcastSimEvent(simEvent: SimulationEvent): void {
    let wsEvent: ServerWsEvent;

    switch (simEvent.type) {
      case "agent-state-changed":
        wsEvent = {
          event: "agent:stateChange",
          payload: {
            agentId: simEvent.payload.agentId as string,
            previousState: simEvent.payload.previousState as AgentState,
            newState: simEvent.payload.newState as AgentState,
          },
        };
        break;
      case "agent-speech":
        wsEvent = {
          event: "agent:message",
          payload: {
            id: `speech-${Date.now()}`,
            timestamp: Date.now(),
            channelId: "speech",
            senderId: simEvent.payload.agentId as string,
            type: "chat" as never,
            content: simEvent.payload.text as string,
            references: [],
          },
        };
        break;
      case "task-updated":
        wsEvent = {
          event: "task:update",
          payload: simEvent.payload.task as never,
        };
        break;
      case "agent-moved":
        // Send as a game state update with just the character positions
        wsEvent = {
          event: "game:state",
          payload: this.simulation.getGameState(),
        };
        break;
      default:
        return;
    }

    this.broadcast(wsEvent);
  }

  private broadcast(event: ServerWsEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private sendWsEvent(ws: WebSocket, event: ServerWsEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private jsonResponse(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }
}
