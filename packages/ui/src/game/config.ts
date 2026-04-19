import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { OfficeScene } from "./scenes/OfficeScene";
import { UIScene } from "./scenes/UIScene";

/** World dimensions derived from the tilemap (80×60 tiles at 16px each). */
export const WORLD = {
  tileSize: 16,
  widthInTiles: 80,
  heightInTiles: 60,
  get widthPx() {
    return this.widthInTiles * this.tileSize;
  },
  get heightPx() {
    return this.heightInTiles * this.tileSize;
  },
} as const;

/** Character sprite frame dimensions. */
export const SPRITE = {
  width: 16,
  height: 24,
  frameRate: 6,
} as const;

/**
 * Build the Phaser game configuration.
 * `parent` is the DOM element that Phaser mounts its canvas into.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#1d2b53",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 640,
      height: 480,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [BootScene, OfficeScene, UIScene],
  };
}
