// ============================================================
// WebSocket client — connects the UI to the swarm server
// ============================================================

import type {
  ServerWsEvent,
  ClientWsEvent,
} from "@swarm/types";
import { gameStateManager } from "../game/GameStateManager";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type StatusChangeHandler = (status: ConnectionStatus) => void;

/**
 * WebSocket client that connects to the SwarmServer and bridges
 * incoming events into the GameStateManager event bus.
 */
export class SwarmClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private statusHandlers: StatusChangeHandler[] = [];
  private _status: ConnectionStatus = "disconnected";

  constructor(url?: string) {
    this.url = url ?? `ws://${window.location.hostname}:3001`;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.setStatus("connecting");
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectDelay = 2000;
      this.send({ event: "request:state", payload: {} });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerWsEvent;
        this.handleEvent(data);
      } catch {
        console.warn("Failed to parse WS message");
      }
    };

    this.ws.onclose = () => {
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setStatus("error");
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  send(event: ClientWsEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  submitTask(content: string): void {
    this.send({
      event: "send:message",
      payload: { channelId: "user", content },
    });
  }

  requestState(): void {
    this.send({ event: "request:state", payload: {} });
  }

  onStatusChange(handler: StatusChangeHandler): void {
    this.statusHandlers.push(handler);
  }

  private handleEvent(event: ServerWsEvent): void {
    switch (event.event) {
      case "game:state":
        gameStateManager.applyFullState(event.payload);
        break;
      case "agent:stateChange":
        gameStateManager.applyAgentStateChanged(
          event.payload.agentId,
          event.payload.newState,
        );
        break;
      case "agent:message":
        gameStateManager.applyAgentSpeech(
          event.payload.senderId,
          event.payload.content,
          "normal",
          4000,
        );
        break;
      case "task:update":
        gameStateManager.emit("task-updated", event.payload);
        break;
      case "error":
        console.error("Server error:", event.payload.message);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 1.5,
        this.maxReconnectDelay,
      );
      this.connect();
    }, this.reconnectDelay);
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }
}

export const swarmClient = new SwarmClient();
