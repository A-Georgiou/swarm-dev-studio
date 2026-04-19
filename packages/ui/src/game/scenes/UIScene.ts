import Phaser from "phaser";
import { gameStateManager, type AgentSpeechEvent } from "../GameStateManager";
import type { AgentMessage, Task, GameState } from "@swarm/types";

/** Maximum entries in the activity feed. */
const MAX_FEED_ENTRIES = 100;

/**
 * UIScene — overlay HUD rendered on top of the OfficeScene.
 *
 * Displays:
 * - Title bar with game controls
 * - Activity feed (recent agent messages)
 * - Agent count and tick counter
 * - Mini-map indicator
 * - Help text
 *
 * This scene uses a fixed camera (ignores world scroll) so UI
 * elements remain stationary on screen.
 */
export class UIScene extends Phaser.Scene {
  private feedTexts: Phaser.GameObjects.Text[] = [];
  private feedEntries: string[] = [];
  private tickText!: Phaser.GameObjects.Text;
  private agentCountText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private feedContainer!: Phaser.GameObjects.Container;
  private feedBackground!: Phaser.GameObjects.Graphics;
  private selectedAgentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    // ── Title Bar ─────────────────────────────────────────
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1d2b53, 0.9);
    titleBg.fillRect(0, 0, width, 16);

    this.add.text(4, 2, "🏢 SWARM DEV STUDIO", {
      fontSize: "10px",
      fontFamily: "monospace",
      color: "#ffec27",
      resolution: 2,
    });

    this.tickText = this.add.text(width - 100, 2, "Tick: 0", {
      fontSize: "8px",
      fontFamily: "monospace",
      color: "#c2c3c7",
      resolution: 2,
    });

    this.agentCountText = this.add.text(width - 200, 2, "Agents: 0", {
      fontSize: "8px",
      fontFamily: "monospace",
      color: "#c2c3c7",
      resolution: 2,
    });

    // ── Status Bar ────────────────────────────────────────
    const statusBg = this.add.graphics();
    statusBg.fillStyle(0x1d2b53, 0.9);
    statusBg.fillRect(0, height - 14, width, 14);

    this.statusText = this.add.text(4, height - 12, "WASD/Arrows: Pan | Scroll: Zoom | Click: Select", {
      fontSize: "7px",
      fontFamily: "monospace",
      color: "#5f574f",
      resolution: 2,
    });

    // ── Activity Feed (right side) ────────────────────────
    const feedWidth = 180;
    const feedHeight = height - 30;
    const feedX = width - feedWidth;
    const feedY = 18;

    this.feedBackground = this.add.graphics();
    this.feedBackground.fillStyle(0x000000, 0.6);
    this.feedBackground.fillRect(feedX, feedY, feedWidth, feedHeight);

    this.add.text(feedX + 4, feedY + 2, "📋 Activity Feed", {
      fontSize: "8px",
      fontFamily: "monospace",
      color: "#ffec27",
      resolution: 2,
    });

    this.feedContainer = this.add.container(feedX + 4, feedY + 14);

    // Create feed text entries
    const maxVisible = Math.floor((feedHeight - 16) / 10);
    for (let i = 0; i < maxVisible; i++) {
      const text = this.add.text(0, i * 10, "", {
        fontSize: "6px",
        fontFamily: "monospace",
        color: "#c2c3c7",
        wordWrap: { width: feedWidth - 8 },
        resolution: 2,
      });
      this.feedTexts.push(text);
      this.feedContainer.add(text);
    }

    // ── Selected Agent Panel (left side) ──────────────────
    this.selectedAgentText = this.add.text(4, 20, "", {
      fontSize: "7px",
      fontFamily: "monospace",
      color: "#fff1e8",
      backgroundColor: "#1d2b53",
      padding: { x: 4, y: 4 },
      resolution: 2,
    });
    this.selectedAgentText.setVisible(false);

    // ── Event Subscriptions ───────────────────────────────
    gameStateManager.on("agent-speech", this.onAgentSpeech, this);
    gameStateManager.on("full-state", this.onFullState, this);
    gameStateManager.on("character-selected", this.onCharacterSelected, this);
    gameStateManager.on("character-deselected", this.onCharacterDeselected, this);
  }

  update(): void {
    // Periodically refresh the feed display
    this.refreshFeed();
  }

  // ── Feed Management ─────────────────────────────────────

  addFeedEntry(text: string): void {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    this.feedEntries.unshift(`[${timestamp}] ${text}`);
    if (this.feedEntries.length > MAX_FEED_ENTRIES) {
      this.feedEntries.pop();
    }
  }

  private refreshFeed(): void {
    for (let i = 0; i < this.feedTexts.length; i++) {
      if (i < this.feedEntries.length) {
        this.feedTexts[i].setText(this.feedEntries[i]);
      } else {
        this.feedTexts[i].setText("");
      }
    }
  }

  // ── Event Handlers ──────────────────────────────────────

  private onAgentSpeech(event: AgentSpeechEvent): void {
    const shortId = event.agentId.split("-").slice(-1)[0];
    this.addFeedEntry(`${shortId}: ${event.text}`);
  }

  private onFullState(state: GameState): void {
    this.agentCountText.setText(`Agents: ${state.characters.length}`);
    this.tickText.setText(`Tick: ${state.tick}`);
    this.addFeedEntry(`State synced — ${state.characters.length} agents`);
  }

  private onCharacterSelected(data: { agentId: string }): void {
    this.selectedAgentText.setText(`Selected: ${data.agentId}`);
    this.selectedAgentText.setVisible(true);
  }

  private onCharacterDeselected(): void {
    this.selectedAgentText.setVisible(false);
  }

  /** Called externally when a task update comes in. */
  onTaskUpdate(task: Task): void {
    this.addFeedEntry(`Task [${task.status}]: ${task.title}`);
  }

  /** Called externally when an agent message comes in. */
  onAgentMessage(msg: AgentMessage): void {
    const shortId = msg.senderId.split("-").slice(-1)[0];
    const content = msg.content.length > 60 ? msg.content.slice(0, 57) + "..." : msg.content;
    this.addFeedEntry(`${shortId}: ${content}`);
  }

  /** Update the tick counter display. */
  setTick(tick: number): void {
    this.tickText.setText(`Tick: ${tick}`);
  }
}
