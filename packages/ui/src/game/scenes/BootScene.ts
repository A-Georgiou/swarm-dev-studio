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
 * Maps AgentRole enum values to the sprite asset filename prefix.
 * The generated sprites use kebab-case naming (e.g. "qa-engineer").
 */
const ROLE_SPRITE_KEYS: Record<string, string> = {
  ceo: "ceo",
  cto: "cto",
  staff_manager: "senior-manager",
  senior_manager: "senior-manager",
  manager: "team-manager",
  pm: "pm",
  developer: "developer",
  senior_developer: "senior-dev",
  qa: "qa-engineer",
  tester: "tester",
};

/**
 * BootScene — loads all assets including generated pixel-art sprites.
 *
 * Shows a simple progress bar during loading, then transitions
 * to the OfficeScene.
 */
export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private atlasLoadFailed = new Set<string>();

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

    // UI assets
    this.load.image("speech-bubble", "assets/ui/speech-bubble.png");
    this.load.image("thought-bubble", "assets/ui/thought-bubble.png");
    this.load.atlas("status-icons", "assets/ui/status-icons.png", "assets/ui/status-icons.json");

    // Load generated sprite atlas assets for each role
    const spriteKeys = new Set(Object.values(ROLE_SPRITE_KEYS));
    for (const spriteKey of spriteKeys) {
      this.load.atlas(
        `sprite-${spriteKey}`,
        `assets/sprites/${spriteKey}.png`,
        `assets/sprites/${spriteKey}.json`
      );
    }

    // Track any atlas load failures so we can fall back to procedural sprites
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if (file.key.startsWith("sprite-")) {
        this.atlasLoadFailed.add(file.key);
      }
    });
  }

  create(): void {
    // Generate fallback procedural sprites for any role whose atlas failed to load
    this.generateFallbackSprites();
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
   * Generate procedural fallback sprites only for roles whose atlas
   * asset failed to load. When the generated assets are available,
   * this creates nothing — the atlas textures are used directly.
   */
  private generateFallbackSprites(): void {
    const roles = Object.values(AgentRole);
    for (const role of roles) {
      const spriteKey = ROLE_SPRITE_KEYS[role] ?? role;
      const textureKey = `sprite-${spriteKey}`;

      // If the atlas loaded successfully, skip procedural generation
      if (this.textures.exists(textureKey) && !this.atlasLoadFailed.has(textureKey)) {
        // Multiple roles may share the same sprite (e.g. staff_manager → senior-manager)
        const roleTextureKey = `sprite-${role}`;
        if (roleTextureKey !== textureKey && !this.textures.exists(roleTextureKey)) {
          // Create an alias texture reference
          const src = this.textures.get(textureKey).getSourceImage() as HTMLCanvasElement;
          if (src) this.textures.addCanvas(roleTextureKey, src);
        }
        continue;
      }

      // Atlas missing — generate a procedural fallback sprite
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

  /**
   * Register Phaser animations for every role sprite sheet.
   * Supports both atlas-based sprites (from generated assets) and
   * procedural fallback sprites.
   */
  private createAnimations(): void {
    const roles = Object.values(AgentRole);

    for (const role of roles) {
      const spriteKey = ROLE_SPRITE_KEYS[role] ?? role;
      const atlasKey = `sprite-${spriteKey}`;
      const fallbackKey = `sprite-${role}`;

      // Determine which key to use for this role
      const useAtlas = this.textures.exists(atlasKey) && !this.atlasLoadFailed.has(atlasKey);
      const key = useAtlas ? atlasKey : fallbackKey;

      if (!this.textures.exists(key)) continue;

      if (useAtlas) {
        // Atlas-based animations using frame names from the JSON atlas
        const prefix = spriteKey;
        const directions = ["down", "up", "left", "right"] as const;

        // Walk animations from atlas
        for (const dir of directions) {
          const animFrames = this.anims.generateFrameNames(key, {
            prefix: `${prefix}_walk-${dir}_`,
            start: 0,
            end: 3,
          });
          if (animFrames.length > 0) {
            this.anims.create({
              key: `${role}-walk-${dir}`,
              frames: animFrames,
              frameRate: SPRITE.frameRate,
              repeat: -1,
            });
          }
        }

        // Idle animation from atlas
        const idleFrames = this.anims.generateFrameNames(key, {
          prefix: `${prefix}_idle_`,
          start: 0,
          end: 1,
        });
        if (idleFrames.length > 0) {
          for (const dir of directions) {
            this.anims.create({
              key: `${role}-idle-${dir}`,
              frames: idleFrames,
              frameRate: 2,
              repeat: -1,
            });
          }
        }
      } else {
        // Procedural fallback animations using frame indices
        const texture = this.textures.get(key);
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

        for (let i = 0; i < directions.length; i++) {
          this.anims.create({
            key: `${role}-idle-${directions[i]}`,
            frames: [{ key, frame: i }],
            frameRate: 1,
            repeat: -1,
          });
        }

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
}
