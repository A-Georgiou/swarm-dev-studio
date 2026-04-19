import Phaser from "phaser";
import { AgentState } from "@swarm/types";
import { SPRITE, WORLD } from "../config";
import { SpeechBubble } from "../ui/SpeechBubble";
import { MovementController, type PathNode } from "../controllers/MovementController";
import type { SpeechBubble as SpeechBubbleData } from "@swarm/types";

/** Walk speed in pixels per second. */
const WALK_SPEED = 48;

/** Maps agent state to the animation key suffix. */
const STATE_TO_ANIM: Record<AgentState, string> = {
  [AgentState.Idle]: "idle",
  [AgentState.Thinking]: "idle",
  [AgentState.Coding]: "idle",
  [AgentState.Discussing]: "idle",
  [AgentState.Reviewing]: "idle",
  [AgentState.Walking]: "walk",
  [AgentState.Meeting]: "idle",
};

/**
 * A single agent character rendered in the office.
 *
 * Composed of:
 * - Animated sprite (walk cycle / idle)
 * - Name label above head
 * - Status icon indicator
 * - SpeechBubble (shown when talking)
 *
 * Manages its own pathfinding movement via the shared MovementController.
 */
export class Character extends Phaser.GameObjects.Container {
  readonly agentId: string;
  readonly roleName: string;

  private sprite: Phaser.GameObjects.Sprite;
  private nameLabel: Phaser.GameObjects.Text;
  private statusIcon: Phaser.GameObjects.Text;
  private speechBubble: SpeechBubble;

  private currentState: AgentState = AgentState.Idle;
  private direction: "up" | "down" | "left" | "right" = "down";

  private path: PathNode[] = [];
  private pathIndex = 0;
  private isMoving = false;
  private movementController: MovementController | null = null;

  private selected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    agentId: string,
    roleName: string,
    spriteKey: string,
  ) {
    super(scene, x, y);
    this.agentId = agentId;
    this.roleName = roleName;

    // Animated sprite
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, spriteKey, 0);
    this.sprite.setOrigin(0.5, 1);
    this.add(this.sprite);

    // Name label above head
    this.nameLabel = new Phaser.GameObjects.Text(
      scene,
      0,
      -(SPRITE.height + 2),
      roleName,
      {
        fontSize: "7px",
        fontFamily: "monospace",
        color: "#fff1e8",
        stroke: "#1d2b53",
        strokeThickness: 2,
        resolution: 2,
      },
    );
    this.nameLabel.setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Status indicator emoji
    this.statusIcon = new Phaser.GameObjects.Text(
      scene,
      SPRITE.width / 2 + 1,
      -(SPRITE.height),
      "",
      { fontSize: "7px", resolution: 2 },
    );
    this.statusIcon.setOrigin(0, 0.5);
    this.add(this.statusIcon);

    // Speech bubble
    this.speechBubble = new SpeechBubble(scene, 0, -(SPRITE.height + 4));
    this.add(this.speechBubble);

    // Make interactive
    this.setSize(SPRITE.width, SPRITE.height);
    this.setInteractive({ useHandCursor: true });

    this.setDepth(y);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);

    this.updateStatusIcon();
  }

  /** Attach the shared movement controller for pathfinding. */
  setMovementController(controller: MovementController): void {
    this.movementController = controller;
  }

  /** Change the agent's observable state and update visuals. */
  setAgentState(newState: AgentState): void {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.updateStatusIcon();
    this.playStateAnimation();
  }

  getState(): AgentState {
    return this.currentState;
  }

  /** Show a speech bubble above this character. */
  say(text: string, style: SpeechBubbleData["style"] = "normal", duration = 4000): void {
    this.speechBubble.show(text, style, duration);
  }

  /** Toggle selection highlight. */
  setSelected(value: boolean): void {
    this.selected = value;
    if (this.selected) {
      this.nameLabel.setColor("#ffec27");
    } else {
      this.nameLabel.setColor("#fff1e8");
    }
  }

  isSelected(): boolean {
    return this.selected;
  }

  /**
   * Walk to a target position using A* pathfinding.
   * Resolves when the character arrives or rejects if no path found.
   */
  async walkTo(targetX: number, targetY: number): Promise<void> {
    if (!this.movementController) return;

    const start = MovementController.worldToTile(this.x, this.y);
    const end = MovementController.worldToTile(targetX, targetY);

    const path = await this.movementController.findPath(start.x, start.y, end.x, end.y);
    if (!path || path.length < 2) return;

    this.path = path;
    this.pathIndex = 1;
    this.isMoving = true;
    this.setAgentState(AgentState.Walking);
  }

  /**
   * Called every frame from the scene's update loop.
   * Handles smooth interpolated movement along the current path.
   */
  updateMovement(delta: number): void {
    if (!this.isMoving || this.pathIndex >= this.path.length) {
      if (this.isMoving) {
        this.isMoving = false;
        this.setAgentState(AgentState.Idle);
      }
      return;
    }

    const target = this.path[this.pathIndex];
    const targetWorld = MovementController.tileToWorld(target.x, target.y);
    const dx = targetWorld.x - this.x;
    const dy = targetWorld.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update facing direction based on dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? "right" : "left";
    } else {
      this.direction = dy > 0 ? "down" : "up";
    }

    const step = (WALK_SPEED * delta) / 1000;

    if (distance <= step) {
      this.x = targetWorld.x;
      this.y = targetWorld.y;
      this.pathIndex++;
    } else {
      this.x += (dx / distance) * step;
      this.y += (dy / distance) * step;
    }

    // Keep depth sorted by Y for proper overlap
    this.setDepth(this.y);
    this.playStateAnimation();
  }

  /** Get the current tile position. */
  getTilePosition(): PathNode {
    return MovementController.worldToTile(this.x, this.y);
  }

  private playStateAnimation(): void {
    const animSuffix = STATE_TO_ANIM[this.currentState];
    const animKey = `${this.roleName}-${animSuffix}-${this.direction}`;

    if (this.sprite.anims.currentAnim?.key !== animKey) {
      if (this.sprite.anims.animationManager.exists(animKey)) {
        this.sprite.play(animKey);
      }
    }

    // Flip sprite for left-facing movement
    this.sprite.setFlipX(this.direction === "left");
  }

  private updateStatusIcon(): void {
    const icons: Record<AgentState, string> = {
      [AgentState.Idle]: "",
      [AgentState.Thinking]: "💭",
      [AgentState.Coding]: "⌨️",
      [AgentState.Discussing]: "💬",
      [AgentState.Reviewing]: "🔍",
      [AgentState.Walking]: "",
      [AgentState.Meeting]: "📋",
    };
    this.statusIcon.setText(icons[this.currentState]);
  }
}
