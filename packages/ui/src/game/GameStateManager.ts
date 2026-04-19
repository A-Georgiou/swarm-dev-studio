import Phaser from "phaser";
import type {
  AgentState,
  CharacterSprite,
  SpeechBubble as SpeechBubbleData,
  GameState,
} from "@swarm/types";

// ----- Event types emitted by the GameStateManager -----

export interface AgentMovedEvent {
  agentId: string;
  x: number;
  y: number;
}

export interface AgentStateChangedEvent {
  agentId: string;
  state: AgentState;
}

export interface AgentSpeechEvent {
  agentId: string;
  text: string;
  style: SpeechBubbleData["style"];
  duration: number;
}

export interface AgentSpawnedEvent {
  agent: CharacterSprite;
}

/**
 * Central event bus that bridges external state updates (WebSocket / mock)
 * into Phaser-consumable events.
 *
 * Scenes subscribe to events via `GameStateManager.on(...)`.
 * The backend adapter (or mock) pushes updates via the `apply*` methods.
 */
export class GameStateManager extends Phaser.Events.EventEmitter {
  private characters = new Map<string, CharacterSprite>();

  /** Current full snapshot. */
  private snapshot: GameState | null = null;

  constructor() {
    super();
  }

  /** Replace the entire game state (initial load or reconnect). */
  applyFullState(state: GameState): void {
    this.snapshot = state;
    for (const character of state.characters) {
      this.characters.set(character.agentId, character);
    }
    this.emit("full-state", state);
  }

  /** An agent moved to a new tile position. */
  applyAgentMoved(agentId: string, x: number, y: number): void {
    const character = this.characters.get(agentId);
    if (character) {
      character.position = { x, y };
    }
    this.emit("agent-moved", { agentId, x, y } satisfies AgentMovedEvent);
  }

  /** An agent changed observable state (idle → coding, etc.). */
  applyAgentStateChanged(agentId: string, state: AgentState): void {
    const character = this.characters.get(agentId);
    if (character) {
      character.currentAnimation = state;
    }
    this.emit("agent-state-changed", {
      agentId,
      state,
    } satisfies AgentStateChangedEvent);
  }

  /** An agent said something — show a speech bubble. */
  applyAgentSpeech(
    agentId: string,
    text: string,
    style: SpeechBubbleData["style"] = "normal",
    duration = 4000,
  ): void {
    this.emit("agent-speech", {
      agentId,
      text,
      style,
      duration,
    } satisfies AgentSpeechEvent);
  }

  /** Register a new agent in the world. */
  applyAgentSpawned(agent: CharacterSprite): void {
    this.characters.set(agent.agentId, agent);
    this.emit("agent-spawned", { agent } satisfies AgentSpawnedEvent);
  }

  getCharacter(agentId: string): CharacterSprite | undefined {
    return this.characters.get(agentId);
  }

  getAllCharacters(): CharacterSprite[] {
    return Array.from(this.characters.values());
  }
}

/** Singleton shared across scenes. */
export const gameStateManager = new GameStateManager();
