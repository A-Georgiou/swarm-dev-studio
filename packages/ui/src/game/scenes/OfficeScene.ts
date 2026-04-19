import Phaser from "phaser";
import { AgentRole, AgentState, type CharacterSprite, type GameState } from "@swarm/types";
import { WORLD, SPRITE } from "../config";
import { Character } from "../entities/Character";
import { MovementController } from "../controllers/MovementController";
import {
  gameStateManager,
  type AgentMovedEvent,
  type AgentStateChangedEvent,
  type AgentSpeechEvent,
  type AgentSpawnedEvent,
} from "../GameStateManager";

/** Friendly display name for each role. */
const ROLE_DISPLAY: Record<string, string> = {
  ceo: "CEO",
  cto: "CTO",
  staff_manager: "Staff Mgr",
  senior_manager: "Sr Mgr",
  manager: "Manager",
  pm: "PM",
  developer: "Dev",
  senior_developer: "Sr Dev",
  qa: "QA",
  tester: "Tester",
};

/**
 * OfficeScene — the main gameplay scene.
 *
 * Renders the office tilemap, spawns characters at their desks,
 * handles camera controls, and processes real-time state updates
 * from the GameStateManager event bus.
 */
export class OfficeScene extends Phaser.Scene {
  private characters: Map<string, Character> = new Map();
  private movementController!: MovementController;
  private selectedCharacter: Character | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private cameraSpeed = 3;

  constructor() {
    super({ key: "OfficeScene" });
  }

  create(): void {
    // ── Tilemap ───────────────────────────────────────────
    const map = this.make.tilemap({ key: "office-map" });
    const tileset = map.addTilesetImage("office-tileset", "office-tileset");

    if (!tileset) {
      console.error("Failed to load tileset");
      return;
    }

    const floorLayer = map.createLayer("floor", tileset, 0, 0);
    const wallsLayer = map.createLayer("walls", tileset, 0, 0);
    const furnitureLayer = map.createLayer("furniture", tileset, 0, 0);
    const decorationLayer = map.createLayer("decoration", tileset, 0, 0);

    // Set collision on wall and furniture tiles
    if (wallsLayer) {
      wallsLayer.setCollisionByExclusion([-1, 0]);
    }
    if (furnitureLayer) {
      furnitureLayer.setCollisionByExclusion([-1, 0]);
    }

    // ── Pathfinding ───────────────────────────────────────
    this.movementController = new MovementController();
    this.movementController.buildGrid(wallsLayer, furnitureLayer);

    // ── Camera ────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD.widthPx, WORLD.heightPx);
    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(WORLD.widthPx / 2, WORLD.heightPx / 4);

    // ── Input ─────────────────────────────────────────────
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Zoom with mouse wheel
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 4);
      cam.setZoom(newZoom);
    });

    // Click on empty space to deselect
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.downElement || pointer.downElement.tagName === "CANVAS") {
        if (this.selectedCharacter) {
          this.selectedCharacter.setSelected(false);
          this.selectedCharacter = null;
          gameStateManager.emit("character-deselected");
        }
      }
    });

    // ── Subscribe to state updates ────────────────────────
    gameStateManager.on("full-state", this.onFullState, this);
    gameStateManager.on("agent-moved", this.onAgentMoved, this);
    gameStateManager.on("agent-state-changed", this.onAgentStateChanged, this);
    gameStateManager.on("agent-speech", this.onAgentSpeech, this);
    gameStateManager.on("agent-spawned", this.onAgentSpawned, this);

    // ── Start UIScene on top ──────────────────────────────
    this.scene.launch("UIScene");
  }

  update(_time: number, delta: number): void {
    // Update character movements
    for (const character of this.characters.values()) {
      character.updateMovement(delta);
    }

    // Camera panning with arrow keys / WASD
    this.updateCamera(delta);
  }

  // ── Camera Controls ─────────────────────────────────────

  private updateCamera(delta: number): void {
    const cam = this.cameras.main;
    const speed = this.cameraSpeed * delta;

    if (!this.cursors) return;

    if (this.cursors.left.isDown || this.wasd?.A?.isDown) {
      cam.scrollX -= speed;
    }
    if (this.cursors.right.isDown || this.wasd?.D?.isDown) {
      cam.scrollX += speed;
    }
    if (this.cursors.up.isDown || this.wasd?.W?.isDown) {
      cam.scrollY -= speed;
    }
    if (this.cursors.down.isDown || this.wasd?.S?.isDown) {
      cam.scrollY += speed;
    }
  }

  // ── State Event Handlers ────────────────────────────────

  private onFullState(state: GameState): void {
    // Clear existing characters
    for (const character of this.characters.values()) {
      character.destroy();
    }
    this.characters.clear();

    // Spawn all characters from the state
    for (const charData of state.characters) {
      this.spawnCharacter(charData);
    }

    // Apply any active speech bubbles
    for (const bubble of state.speechBubbles) {
      const character = this.characters.get(bubble.agentId);
      if (character) {
        character.say(bubble.text, bubble.style, bubble.duration);
      }
    }
  }

  private onAgentMoved(event: AgentMovedEvent): void {
    const character = this.characters.get(event.agentId);
    if (character) {
      const worldPos = MovementController.tileToWorld(event.x, event.y);
      character.walkTo(worldPos.x, worldPos.y).catch(() => {
        // If pathfinding fails, teleport
        character.setPosition(worldPos.x, worldPos.y);
      });
    }
  }

  private onAgentStateChanged(event: AgentStateChangedEvent): void {
    const character = this.characters.get(event.agentId);
    if (character) {
      character.setAgentState(event.state);
    }
  }

  private onAgentSpeech(event: AgentSpeechEvent): void {
    const character = this.characters.get(event.agentId);
    if (character) {
      character.say(event.text, event.style, event.duration);
    }
  }

  private onAgentSpawned(event: AgentSpawnedEvent): void {
    this.spawnCharacter(event.agent);
  }

  // ── Character Spawning ──────────────────────────────────

  private spawnCharacter(data: CharacterSprite): void {
    const worldPos = MovementController.tileToWorld(data.position.x, data.position.y);
    const spriteKey = `sprite-${data.spriteSheet}`;
    const displayName = ROLE_DISPLAY[data.spriteSheet] ?? data.spriteSheet;

    const character = new Character(
      this,
      worldPos.x,
      worldPos.y,
      data.agentId,
      displayName,
      spriteKey,
    );

    character.setMovementController(this.movementController);
    character.setAgentState(data.currentAnimation);

    // Click handler for selecting a character
    character.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.selectedCharacter && this.selectedCharacter !== character) {
        this.selectedCharacter.setSelected(false);
      }
      character.setSelected(true);
      this.selectedCharacter = character;

      // Follow selected character
      this.cameras.main.startFollow(character, true, 0.05, 0.05);

      gameStateManager.emit("character-selected", { agentId: data.agentId });
    });

    this.characters.set(data.agentId, character);
  }
}
