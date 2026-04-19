import Phaser from "phaser";
import type { SpeechBubble as SpeechBubbleData } from "@swarm/types";

const PADDING = 4;
const MAX_WIDTH = 120;
const FONT_SIZE = 8;
const LINE_HEIGHT = 10;

/** Appearance presets keyed by bubble style. */
const STYLE_CONFIG: Record<
  SpeechBubbleData["style"],
  { fill: number; stroke: number; alpha: number }
> = {
  normal: { fill: 0xfff1e8, stroke: 0x5f574f, alpha: 0.95 },
  thinking: { fill: 0xc2c3c7, stroke: 0x5f574f, alpha: 0.85 },
  exclaim: { fill: 0xff004d, stroke: 0xfff1e8, alpha: 0.95 },
};

/**
 * A pixel-art speech bubble that floats above a character.
 *
 * Features:
 * - Scales background to fit text content
 * - Auto-hides after a configurable duration
 * - Queue system: sequential messages don't overlap
 * - Three visual styles: normal, thinking, exclaim
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private queue: Array<{ text: string; style: SpeechBubbleData["style"]; duration: number }> = [];
  private isShowing = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.background = new Phaser.GameObjects.Graphics(scene);
    this.add(this.background);

    this.label = new Phaser.GameObjects.Text(scene, 0, 0, "", {
      fontSize: `${FONT_SIZE}px`,
      fontFamily: "monospace",
      color: "#1d2b53",
      wordWrap: { width: MAX_WIDTH - PADDING * 2 },
      resolution: 2,
    });
    this.label.setOrigin(0.5, 1);
    this.add(this.label);

    this.setVisible(false);
    this.setDepth(1000);
  }

  /**
   * Enqueue a message to display. If no bubble is currently showing,
   * it displays immediately; otherwise it waits in line.
   */
  show(text: string, style: SpeechBubbleData["style"] = "normal", duration = 4000): void {
    this.queue.push({ text, style, duration });
    if (!this.isShowing) {
      this.displayNext();
    }
  }

  /** Immediately hide the current bubble and advance the queue. */
  dismiss(): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
      this.hideTimer = null;
    }
    this.setVisible(false);
    this.isShowing = false;
    if (this.queue.length > 0) {
      this.displayNext();
    }
  }

  private displayNext(): void {
    const item = this.queue.shift();
    if (!item) {
      this.isShowing = false;
      this.setVisible(false);
      return;
    }

    this.isShowing = true;
    const { fill, stroke, alpha } = STYLE_CONFIG[item.style];

    this.label.setText(item.text);
    this.label.setColor(item.style === "exclaim" ? "#fff1e8" : "#1d2b53");

    const textWidth = Math.min(this.label.width, MAX_WIDTH - PADDING * 2);
    const textHeight = this.label.height;
    const bgWidth = textWidth + PADDING * 2;
    const bgHeight = textHeight + PADDING * 2;

    this.background.clear();
    this.background.fillStyle(fill, alpha);
    this.background.lineStyle(1, stroke, 1);

    if (item.style === "thinking") {
      this.drawThoughtBubble(bgWidth, bgHeight);
    } else if (item.style === "exclaim") {
      this.drawExclaimBubble(bgWidth, bgHeight);
    } else {
      this.drawSpeechBubble(bgWidth, bgHeight);
    }

    this.label.setPosition(0, -(PADDING + 4));
    this.setVisible(true);

    this.hideTimer = this.scene.time.delayedCall(item.duration, () => {
      this.dismiss();
    });
  }

  /** Standard rounded-rectangle speech bubble with a small tail. */
  private drawSpeechBubble(width: number, height: number): void {
    const x = -width / 2;
    const y = -(height + 6);
    this.background.fillRoundedRect(x, y, width, height, 3);
    this.background.strokeRoundedRect(x, y, width, height, 3);
    // Tail triangle
    this.background.fillTriangle(
      -2, y + height,
      2, y + height,
      0, y + height + 4,
    );
    this.background.strokeTriangle(
      -2, y + height,
      2, y + height,
      0, y + height + 4,
    );
  }

  /** Cloud-shaped thought bubble with small circles as the tail. */
  private drawThoughtBubble(width: number, height: number): void {
    const x = -width / 2;
    const y = -(height + 10);
    this.background.fillRoundedRect(x, y, width, height, 5);
    this.background.strokeRoundedRect(x, y, width, height, 5);
    // Thought dots
    this.background.fillCircle(0, y + height + 3, 2);
    this.background.fillCircle(2, y + height + 7, 1);
  }

  /** Spiky exclamation bubble. */
  private drawExclaimBubble(width: number, height: number): void {
    const x = -width / 2;
    const y = -(height + 6);
    this.background.fillRoundedRect(x, y, width, height, 2);
    this.background.strokeRoundedRect(x, y, width, height, 2);
    // Small spike tail
    this.background.fillTriangle(
      -3, y + height,
      3, y + height,
      0, y + height + 5,
    );
  }

  destroy(fromScene?: boolean): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
