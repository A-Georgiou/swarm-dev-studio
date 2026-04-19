import EasyStar from "easystarjs";
import Phaser from "phaser";
import { WORLD } from "../config";

/** Tile indices that are walkable (0 = empty, all floor tiles). */
const WALKABLE_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface PathNode {
  x: number;
  y: number;
}

/**
 * Grid-based A* pathfinding controller using EasyStar.js.
 *
 * Reads the collision data from the tilemap's walls and furniture layers
 * to build a walkability grid. Characters request paths and receive
 * a list of tile-coordinate waypoints.
 */
export class MovementController {
  private finder: EasyStar.js;
  private grid: number[][];

  constructor() {
    this.finder = new EasyStar.js();
    this.grid = [];
    this.finder.setAcceptableTiles(WALKABLE_TILES);
    this.finder.enableDiagonals();
    this.finder.disableCornerCutting();
  }

  /**
   * Build the walkability grid from tilemap layers.
   * Any non-zero tile in `walls` or `furniture` is treated as blocked.
   */
  buildGrid(
    wallsLayer: Phaser.Tilemaps.TilemapLayer | null,
    furnitureLayer: Phaser.Tilemaps.TilemapLayer | null,
  ): void {
    const width = WORLD.widthInTiles;
    const height = WORLD.heightInTiles;
    this.grid = [];

    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        let blocked = false;

        if (wallsLayer) {
          const tile = wallsLayer.getTileAt(x, y);
          if (tile && tile.index > 0) blocked = true;
        }
        if (!blocked && furnitureLayer) {
          const tile = furnitureLayer.getTileAt(x, y);
          if (tile && tile.index > 0) blocked = true;
        }

        row.push(blocked ? 99 : 0);
      }
      this.grid.push(row);
    }

    this.finder.setGrid(this.grid);
  }

  /**
   * Request a path from (startX, startY) to (endX, endY) in tile coordinates.
   * Returns a Promise that resolves with the path or null if unreachable.
   */
  findPath(startX: number, startY: number, endX: number, endY: number): Promise<PathNode[] | null> {
    const clampX = (v: number) => Math.max(0, Math.min(WORLD.widthInTiles - 1, Math.round(v)));
    const clampY = (v: number) => Math.max(0, Math.min(WORLD.heightInTiles - 1, Math.round(v)));

    const sx = clampX(startX);
    const sy = clampY(startY);
    const ex = clampX(endX);
    const ey = clampY(endY);

    return new Promise((resolve) => {
      this.finder.findPath(sx, sy, ex, ey, (path) => {
        resolve(path as PathNode[] | null);
      });
      this.finder.calculate();
    });
  }

  /** Check whether a specific tile is walkable. */
  isWalkable(tileX: number, tileY: number): boolean {
    if (tileY < 0 || tileY >= this.grid.length) return false;
    if (tileX < 0 || tileX >= this.grid[0].length) return false;
    return WALKABLE_TILES.includes(this.grid[tileY][tileX]);
  }

  /**
   * Convert world pixel coordinates to tile coordinates.
   */
  static worldToTile(worldX: number, worldY: number): PathNode {
    return {
      x: Math.floor(worldX / WORLD.tileSize),
      y: Math.floor(worldY / WORLD.tileSize),
    };
  }

  /**
   * Convert tile coordinates to world pixel coordinates (center of tile).
   */
  static tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * WORLD.tileSize + WORLD.tileSize / 2,
      y: tileY * WORLD.tileSize + WORLD.tileSize / 2,
    };
  }
}
