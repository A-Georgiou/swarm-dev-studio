import Phaser from "phaser";
import { AgentRole, AgentState } from "@swarm/types";
import { SPRITE } from "../config";

/** Palette colors matching the PICO-8-inspired palette from palette.js. */
const PALETTE = {
  black: 0x000000,
  darkBlue: 0x1d2b53,
  darkPurple: 0x7e2553,
  darkGreen: 0x008751,
  brown: 0xab5236,
  darkGrey: 0x5f574f,
  lightGrey: 0xc2c3c7,
  white: 0xfff1e8,
  red: 0xff004d,
  orange: 0xffa300,
  yellow: 0xffec27,
  green: 0x00e436,
  blue: 0x29adff,
  lavender: 0x83769c,
  pink: 0xff77a8,
  peach: 0xffccaa,
};

/** Color assigned to each agent role for visual distinction. */
const ROLE_COLORS: Record<string, { body: number; accent: number }> = {
  ceo: { body: PALETTE.darkBlue, accent: PALETTE.yellow },
  cto: { body: PALETTE.darkPurple, accent: PALETTE.blue },
  staff_manager: { body: PALETTE.brown, accent: PALETTE.orange },
  senior_manager: { body: PALETTE.darkGreen, accent: PALETTE.green },
  manager: { body: PALETTE.blue, accent: PALETTE.white },
  pm: { body: PALETTE.lavender, accent: PALETTE.pink },
  developer: { body: PALETTE.darkGrey, accent: PALETTE.blue },
  senior_developer: { body: PALETTE.darkGrey, accent: PALETTE.green },
  qa: { body: PALETTE.orange, accent: PALETTE.yellow },
  tester: { body: PALETTE.red, accent: PALETTE.peach },
};

/**
 * BootScene — loads all assets and generates placeholder sprites.
 *
 * Shows a simple progress bar during loading, then transitions
 * to the OfficeScene.
 */
export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.createLoadingUI();

    this.load.on("progress", (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x29adff, 1);
      this.progressBar.fillRect(170, 240, 300 * value, 20);
      this.progressText.setText(`Loading… ${Math.round(value * 100)}%`);
    });

    // Tilemap + tileset
    this.load.tilemapTiledJSON("office-map", "assets/maps/office-map.json");
    this.load.image("office-tileset", "assets/tiles/office-tileset.png");
  }

  create(): void {
    this.generatePlaceholderSprites();
    this.createAnimations();

    this.progressText.setText("Ready!");
    this.time.delayedCall(200, () => {
      this.scene.start("OfficeScene");
    });
  }

  private createLoadingUI(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, "SWARM DEV STUDIO", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#fff1e8",
      })
      .setOrigin(0.5);

    // Progress bar outline
    const outline = this.add.graphics();
    outline.lineStyle(1, 0x5f574f, 1);
    outline.strokeRect(169, 239, 302, 22);

    this.progressBar = this.add.graphics();
    this.progressText = this.add
      .text(width / 2, height / 2 + 30, "Loading… 0%", {
        fontSize: "8px",
        fontFamily: "monospace",
        color: "#c2c3c7",
      })
      .setOrigin(0.5);
  }

  /**
   * Generate simple pixel-art character sprite sheets procedurally.
   * Each role gets a distinct color so characters are visually distinguishable.
   */
  private generatePlaceholderSprites(): void {
    const roles = Object.values(AgentRole);
    for (const role of roles) {
      this.generateRoleSpriteSheet(role);
    }
  }

  private generateRoleSpriteSheet(role: string): void {
    const colors = ROLE_COLORS[role] ?? { body: PALETTE.darkGrey, accent: PALETTE.lightGrey };
    const key = `sprite-${role}`;

    // 8 frames: 4 idle (one per direction), 4 walk (one per direction)
    const cols = 4;
    const rows = 2;
    const sheetWidth = SPRITE.width * cols;
    const sheetHeight = SPRITE.height * rows;

    const canvas = document.createElement("canvas");
    canvas.width = sheetWidth;
    canvas.height = sheetHeight;
    const ctx = canvas.getContext("2d")!;

    // Row 0: idle frames (down, up, right, left)
    // Row 1: walk frames (down, up, right, left) — with slight offset for animation
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = col * SPRITE.width;
        const offsetY = row * SPRITE.height;
        const isWalking = row === 1;
        const walkBob = isWalking ? (col % 2 === 0 ? -1 : 1) : 0;

        this.drawCharacter(ctx, offsetX, offsetY, colors.body, colors.accent, walkBob);
      }
    }

    this.textures.addCanvas(key, canvas);
  }

  /**
   * Draw a single 16×24 pixel character frame.
   * Simple top-down humanoid: head, body, legs.
   */
  private drawCharacter(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    bodyColor: number,
    accentColor: number,
    walkBob: number,
  ): void {
    const toCSS = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
    const body = toCSS(bodyColor);
    const accent = toCSS(accentColor);
    const skin = "#ffccaa";
    const dark = "#5f574f";

    const py = oy + walkBob;

    // Head (skin)
    ctx.fillStyle = skin;
    ctx.fillRect(ox + 5, py + 2, 6, 6);

    // Hair (accent)
    ctx.fillStyle = accent;
    ctx.fillRect(ox + 5, py + 1, 6, 3);

    // Eyes
    ctx.fillStyle = dark;
    ctx.fillRect(ox + 6, py + 5, 1, 1);
    ctx.fillRect(ox + 9, py + 5, 1, 1);

    // Body (shirt)
    ctx.fillStyle = body;
    ctx.fillRect(ox + 4, py + 8, 8, 7);

    // Arms
    ctx.fillStyle = skin;
    ctx.fillRect(ox + 3, py + 9, 1, 4);
    ctx.fillRect(ox + 12, py + 9, 1, 4);

    // Legs / pants
    ctx.fillStyle = dark;
    ctx.fillRect(ox + 5, py + 15, 3, 5);
    ctx.fillRect(ox + 8, py + 15, 3, 5);

    // Feet
    ctx.fillStyle = "#1d2b53";
    ctx.fillRect(ox + 4, py + 20, 4, 2);
    ctx.fillRect(ox + 8, py + 20, 4, 2);
  }

  /** Register Phaser animations for every generated role sprite sheet. */
  private createAnimations(): void {
    const roles = Object.values(AgentRole);

    for (const role of roles) {
      const key = `sprite-${role}`;

      // Add spritesheet frame data if not already configured
      if (!this.textures.exists(key)) continue;

      const texture = this.textures.get(key);
      // Manually add frames to the texture
      const frameWidth = SPRITE.width;
      const frameHeight = SPRITE.height;
      const cols = 4;
      const rows = 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const frameIndex = row * cols + col;
          texture.add(
            frameIndex,
            0,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
          );
        }
      }

      const directions = ["down", "up", "right", "left"] as const;

      // Idle animations (row 0, frames 0-3)
      for (let i = 0; i < directions.length; i++) {
        this.anims.create({
          key: `${role}-idle-${directions[i]}`,
          frames: [{ key, frame: i }],
          frameRate: 1,
          repeat: -1,
        });
      }

      // Walk animations (row 1, frames 4-7)
      for (let i = 0; i < directions.length; i++) {
        this.anims.create({
          key: `${role}-walk-${directions[i]}`,
          frames: [
            { key, frame: i },
            { key, frame: i + 4 },
          ],
          frameRate: SPRITE.frameRate,
          repeat: -1,
        });
      }
    }
  }
}
