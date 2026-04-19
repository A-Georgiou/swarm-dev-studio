// ============================================================
// Agent — runtime representation of a single agent in the swarm
// ============================================================

import {
  AgentRole,
  AgentState,
  type AgentPersona,
  type AgentDefinition,
} from "@swarm/types";

/** Position in the office grid (tile coordinates). */
export interface AgentPosition {
  x: number;
  y: number;
}

/** Desk assignment for an agent. */
export interface DeskAssignment {
  tileX: number;
  tileY: number;
  direction: "up" | "down" | "left" | "right";
}

/**
 * Runtime agent instance.
 * Wraps the static AgentDefinition with mutable simulation state.
 */
export class Agent {
  readonly id: string;
  readonly role: AgentRole;
  readonly persona: AgentPersona;
  readonly teamId: string;

  private _state: AgentState = AgentState.Idle;
  private _position: AgentPosition = { x: 0, y: 0 };
  private _direction: "up" | "down" | "left" | "right" = "down";
  private _desk: DeskAssignment | null = null;
  private _currentTaskId: string | null = null;
  private _stateStartedAt: number = Date.now();

  constructor(definition: AgentDefinition) {
    this.id = definition.id;
    this.role = definition.role;
    this.persona = definition.persona;
    this.teamId = definition.teamId;
  }

  // ── Accessors ─────────────────────────────────────────────

  get state(): AgentState {
    return this._state;
  }

  get position(): AgentPosition {
    return { ...this._position };
  }

  get direction(): "up" | "down" | "left" | "right" {
    return this._direction;
  }

  get desk(): DeskAssignment | null {
    return this._desk;
  }

  get currentTaskId(): string | null {
    return this._currentTaskId;
  }

  get stateStartedAt(): number {
    return this._stateStartedAt;
  }

  get timeInCurrentState(): number {
    return Date.now() - this._stateStartedAt;
  }

  // ── Mutators (used by simulation engine) ──────────────────

  setState(state: AgentState): void {
    if (this._state !== state) {
      this._state = state;
      this._stateStartedAt = Date.now();
    }
  }

  setPosition(x: number, y: number): void {
    this._position = { x, y };
  }

  setDirection(dir: "up" | "down" | "left" | "right"): void {
    this._direction = dir;
  }

  assignDesk(desk: DeskAssignment): void {
    this._desk = desk;
    this._position = { x: desk.tileX, y: desk.tileY };
    this._direction = desk.direction;
  }

  assignTask(taskId: string | null): void {
    this._currentTaskId = taskId;
  }

  /** Produce a snapshot for serialisation / game state. */
  toDefinition(): AgentDefinition {
    return {
      id: this.id,
      role: this.role,
      persona: this.persona,
      teamId: this.teamId,
    };
  }
}
