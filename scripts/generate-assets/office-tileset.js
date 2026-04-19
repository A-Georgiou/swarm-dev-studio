// Office tileset generator — produces a 10×5 grid (160×80) of 16×16 tiles
// Each tile ID maps to a specific office element (floors, walls, furniture, etc.)

const path = require('path');
const fs = require('fs');
const { PALETTE, TEAM_COLORS } = require('./palette');
const {
  ASSETS_DIR,
  drawPixel,
  drawPixelRect,
  drawPixelOutline,
  createSpriteSheet,
  saveCanvas,
} = require('./utils');

const TILE = 16;
const COLS = 10;
const ROWS = 5;

// ── Tile metadata ──────────────────────────────────────────────────────────
const TILE_META = {
  1:  { type: 'floor', name: 'carpet-neutral' },
  2:  { type: 'floor', name: 'carpet-alpha' },
  3:  { type: 'floor', name: 'carpet-beta' },
  4:  { type: 'floor', name: 'carpet-gamma' },
  5:  { type: 'floor', name: 'carpet-delta' },
  6:  { type: 'floor', name: 'carpet-epsilon' },
  7:  { type: 'floor', name: 'carpet-zeta' },
  8:  { type: 'floor', name: 'hardwood' },
  9:  { type: 'floor', name: 'tile-floor' },
  10: { type: 'floor', name: 'lobby-floor' },
  11: { type: 'floor', name: 'corridor' },
  12: { type: 'floor', name: 'grass' },
  13: { type: 'wall',  name: 'exterior-top' },
  14: { type: 'wall',  name: 'exterior-side' },
  15: { type: 'wall',  name: 'interior-horiz' },
  16: { type: 'wall',  name: 'interior-vert' },
  17: { type: 'wall',  name: 'glass-horiz' },
  18: { type: 'wall',  name: 'glass-vert' },
  19: { type: 'wall',  name: 'wall-corner' },
  20: { type: 'wall',  name: 'wall-endcap' },
  21: { type: 'furniture', name: 'desk-left' },
  22: { type: 'furniture', name: 'desk-right' },
  23: { type: 'furniture', name: 'chair' },
  24: { type: 'furniture', name: 'monitor' },
  25: { type: 'furniture', name: 'keyboard' },
  26: { type: 'furniture', name: 'whiteboard' },
  27: { type: 'furniture', name: 'coffee-machine' },
  28: { type: 'furniture', name: 'plant' },
  29: { type: 'furniture', name: 'bookshelf' },
  30: { type: 'furniture', name: 'meeting-table-left' },
  31: { type: 'furniture', name: 'meeting-table-right' },
  32: { type: 'furniture', name: 'water-cooler' },
  33: { type: 'furniture', name: 'printer' },
  34: { type: 'furniture', name: 'filing-cabinet' },
  35: { type: 'furniture', name: 'couch-left' },
  36: { type: 'furniture', name: 'couch-right' },
  37: { type: 'furniture', name: 'trash-can' },
  38: { type: 'furniture', name: 'lamp' },
  39: { type: 'door', name: 'door-closed-horiz' },
  40: { type: 'door', name: 'door-open-horiz' },
  41: { type: 'door', name: 'door-closed-vert' },
  42: { type: 'door', name: 'door-open-vert' },
  43: { type: 'decoration', name: 'team-banner' },
  44: { type: 'decoration', name: 'status-screen' },
  45: { type: 'decoration', name: 'clock' },
  46: { type: 'decoration', name: 'elevator-door' },
  47: { type: 'decoration', name: 'stairs' },
  48: { type: 'decoration', name: 'rug-center' },
  49: { type: 'decoration', name: 'window' },
  50: { type: 'decoration', name: 'empty' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Return the pixel offset for a tile ID (1-based) */
function tileOrigin(id) {
  const idx = id - 1;
  return { ox: (idx % COLS) * TILE, oy: Math.floor(idx / COLS) * TILE };
}

/** Mix two RGBA colors by ratio (0 = a, 1 = b) */
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255,
  ];
}

/** Lighten a color towards white */
function lighten(c, t) { return mix(c, PALETTE.white, t); }

/** Darken a color towards black */
function darken(c, t) { return mix(c, PALETTE.black, t); }

// ── Individual tile draw functions ─────────────────────────────────────────

function drawCarpetNeutral(ctx, ox, oy) {
  const base = PALETTE.darkGrey;
  const dot  = mix(PALETTE.darkGrey, PALETTE.lightGrey, 0.3);
  drawPixelRect(ctx, ox, oy, 16, 16, base);
  // subtle crosshatch every 4 pixels
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      drawPixel(ctx, ox + x, oy + y, dot);
    }
  }
}

function drawCarpetTeam(ctx, ox, oy, teamIdx) {
  const team = TEAM_COLORS[teamIdx];
  const base = darken(team.primary, 0.25);
  const dot  = team.secondary;
  drawPixelRect(ctx, ox, oy, 16, 16, base);
  // dots pattern offset for visual interest
  for (let y = 0; y < 16; y += 3) {
    for (let x = ((y / 3) % 2 === 0 ? 0 : 1); x < 16; x += 3) {
      drawPixel(ctx, ox + x, oy + y, dot);
    }
  }
}

function drawHardwood(ctx, ox, oy) {
  const plankA = PALETTE.brown;
  const plankB = PALETTE.peach;
  const line   = darken(PALETTE.brown, 0.3);
  for (let y = 0; y < 16; y++) {
    const plank = (y % 4 < 2) ? plankA : plankB;
    drawPixelRect(ctx, ox, oy + y, 16, 1, plank);
    if (y % 4 === 0) {
      drawPixelRect(ctx, ox, oy + y, 16, 1, line);
    }
  }
  // vertical stagger lines
  const staggerX = [5, 11, 3, 9];
  for (let y = 0; y < 16; y++) {
    const band = Math.floor(y / 4);
    drawPixel(ctx, ox + staggerX[band % staggerX.length], oy + y, line);
  }
}

function drawTileFloor(ctx, ox, oy) {
  // checkerboard
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      drawPixel(ctx, ox + x, oy + y, checker ? PALETTE.white : PALETTE.lightGrey);
    }
  }
}

function drawLobbyFloor(ctx, ox, oy) {
  const base = mix(PALETTE.darkGrey, PALETTE.darkBlue, 0.5);
  const accent = darken(base, 0.2);
  drawPixelRect(ctx, ox, oy, 16, 16, base);
  // diamond pattern
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) {
        drawPixel(ctx, ox + x, oy + y, accent);
      }
    }
  }
  // border accent
  drawPixelRect(ctx, ox, oy, 16, 1, lighten(base, 0.15));
  drawPixelRect(ctx, ox, oy + 15, 16, 1, lighten(base, 0.15));
}

function drawCorridorFloor(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  // subtle center line
  drawPixelRect(ctx, ox + 7, oy, 2, 16, darken(PALETTE.lightGrey, 0.12));
}

function drawGrass(ctx, ox, oy) {
  const base = PALETTE.green;
  drawPixelRect(ctx, ox, oy, 16, 16, base);
  // darker patches
  const patches = [[2,3],[7,1],[12,5],[4,10],[9,12],[14,8],[1,14],[10,7]];
  for (const [px, py] of patches) {
    drawPixel(ctx, ox + px, oy + py, PALETTE.darkGreen);
    drawPixel(ctx, ox + px + 1, oy + py, PALETTE.darkGreen);
    drawPixel(ctx, ox + px, oy + py + 1, PALETTE.darkGreen);
  }
}

// ── Walls ──────────────────────────────────────────────────────────────────

function drawExteriorTop(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.darkGrey);
  // subtle brick texture
  for (let y = 0; y < 16; y += 4) {
    drawPixelRect(ctx, ox, oy + y, 16, 1, darken(PALETTE.darkGrey, 0.15));
    const off = (Math.floor(y / 4) % 2) * 6;
    drawPixel(ctx, ox + off + 3, oy + y + 1, darken(PALETTE.darkGrey, 0.1));
    drawPixel(ctx, ox + off + 11, oy + y + 1, darken(PALETTE.darkGrey, 0.1));
  }
  drawPixelRect(ctx, ox, oy + 14, 16, 2, PALETTE.darkBlue);
}

function drawExteriorSide(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.darkGrey);
  for (let x = 0; x < 16; x += 4) {
    drawPixelRect(ctx, ox + x, oy, 1, 16, darken(PALETTE.darkGrey, 0.15));
  }
  drawPixelRect(ctx, ox + 14, oy, 2, 16, PALETTE.darkBlue);
}

function drawInteriorHoriz(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox, oy + 6, 16, 4, darken(PALETTE.lightGrey, 0.15));
  drawPixelRect(ctx, ox, oy + 7, 16, 2, darken(PALETTE.lightGrey, 0.25));
}

function drawInteriorVert(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 6, oy, 4, 16, darken(PALETTE.lightGrey, 0.15));
  drawPixelRect(ctx, ox + 7, oy, 2, 16, darken(PALETTE.lightGrey, 0.25));
}

function drawGlassHoriz(ctx, ox, oy) {
  // semi-transparent light blue
  const glass = [41, 173, 255, 140];
  const frame = PALETTE.lightGrey;
  drawPixelRect(ctx, ox, oy, 16, 16, glass);
  drawPixelRect(ctx, ox, oy + 7, 16, 2, frame);
  // vertical mullions
  drawPixelRect(ctx, ox + 4, oy, 1, 16, frame);
  drawPixelRect(ctx, ox + 11, oy, 1, 16, frame);
}

function drawGlassVert(ctx, ox, oy) {
  const glass = [41, 173, 255, 140];
  const frame = PALETTE.lightGrey;
  drawPixelRect(ctx, ox, oy, 16, 16, glass);
  drawPixelRect(ctx, ox + 7, oy, 2, 16, frame);
  drawPixelRect(ctx, ox, oy + 4, 16, 1, frame);
  drawPixelRect(ctx, ox, oy + 11, 16, 1, frame);
}

function drawWallCorner(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 6, oy, 4, 16, darken(PALETTE.lightGrey, 0.15));
  drawPixelRect(ctx, ox, oy + 6, 16, 4, darken(PALETTE.lightGrey, 0.15));
  drawPixelRect(ctx, ox + 6, oy + 6, 4, 4, darken(PALETTE.lightGrey, 0.3));
}

function drawWallEndCap(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 5, oy + 5, 6, 6, darken(PALETTE.lightGrey, 0.2));
  drawPixelRect(ctx, ox + 6, oy + 6, 4, 4, darken(PALETTE.lightGrey, 0.35));
}

// ── Furniture ──────────────────────────────────────────────────────────────

function drawDeskLeft(ctx, ox, oy) {
  // brown desk surface, darker front edge
  drawPixelRect(ctx, ox, oy + 2, 16, 12, PALETTE.brown);
  drawPixelRect(ctx, ox, oy + 2, 16, 1, darken(PALETTE.brown, 0.3));
  drawPixelRect(ctx, ox, oy + 13, 16, 1, darken(PALETTE.brown, 0.3));
  drawPixelRect(ctx, ox, oy + 2, 1, 12, darken(PALETTE.brown, 0.3));
  // lighter desktop
  drawPixelRect(ctx, ox + 2, oy + 4, 13, 8, lighten(PALETTE.brown, 0.15));
}

function drawDeskRight(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy + 2, 16, 12, PALETTE.brown);
  drawPixelRect(ctx, ox, oy + 2, 16, 1, darken(PALETTE.brown, 0.3));
  drawPixelRect(ctx, ox, oy + 13, 16, 1, darken(PALETTE.brown, 0.3));
  drawPixelRect(ctx, ox + 15, oy + 2, 1, 12, darken(PALETTE.brown, 0.3));
  drawPixelRect(ctx, ox + 1, oy + 4, 13, 8, lighten(PALETTE.brown, 0.15));
}

function drawChair(ctx, ox, oy) {
  // seat
  drawPixelRect(ctx, ox + 3, oy + 4, 10, 9, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 4, oy + 5, 8, 7, lighten(PALETTE.darkGrey, 0.15));
  // back
  drawPixelRect(ctx, ox + 3, oy + 2, 10, 3, darken(PALETTE.darkGrey, 0.2));
  // wheels (small dots)
  drawPixel(ctx, ox + 4, oy + 13, PALETTE.black);
  drawPixel(ctx, ox + 11, oy + 13, PALETTE.black);
  drawPixel(ctx, ox + 7, oy + 14, PALETTE.black);
}

function drawMonitor(ctx, ox, oy) {
  // screen frame
  drawPixelRect(ctx, ox + 2, oy + 1, 12, 10, PALETTE.black);
  // screen glow
  drawPixelRect(ctx, ox + 3, oy + 2, 10, 8, PALETTE.darkBlue);
  drawPixelRect(ctx, ox + 4, oy + 3, 8, 6, PALETTE.blue);
  // some green text lines
  drawPixelRect(ctx, ox + 5, oy + 4, 5, 1, PALETTE.green);
  drawPixelRect(ctx, ox + 5, oy + 6, 4, 1, PALETTE.green);
  // stand
  drawPixelRect(ctx, ox + 7, oy + 11, 2, 2, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 5, oy + 13, 6, 1, PALETTE.darkGrey);
}

function drawKeyboard(ctx, ox, oy) {
  // keyboard body
  drawPixelRect(ctx, ox + 2, oy + 5, 12, 6, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 3, oy + 6, 10, 4, lighten(PALETTE.darkGrey, 0.2));
  // key rows
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 4; k++) {
      drawPixelRect(ctx, ox + 4 + k * 2, oy + 6 + row, 1, 1, PALETTE.lightGrey);
    }
  }
}

function drawWhiteboard(ctx, ox, oy) {
  drawPixelOutline(ctx, ox + 1, oy + 1, 14, 14, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 2, oy + 2, 12, 12, PALETTE.white);
  // colored marks
  drawPixelRect(ctx, ox + 3, oy + 4, 5, 1, PALETTE.red);
  drawPixelRect(ctx, ox + 3, oy + 7, 7, 1, PALETTE.blue);
  drawPixelRect(ctx, ox + 3, oy + 10, 4, 1, PALETTE.green);
  // marker tray
  drawPixelRect(ctx, ox + 3, oy + 13, 8, 1, PALETTE.darkGrey);
}

function drawCoffeeMachine(ctx, ox, oy) {
  // body
  drawPixelRect(ctx, ox + 3, oy + 2, 10, 12, darken(PALETTE.darkGrey, 0.3));
  drawPixelRect(ctx, ox + 4, oy + 3, 8, 5, PALETTE.darkGrey);
  // orange indicator light
  drawPixelRect(ctx, ox + 5, oy + 4, 2, 2, PALETTE.orange);
  // cup area
  drawPixelRect(ctx, ox + 5, oy + 9, 6, 4, lighten(PALETTE.darkGrey, 0.1));
  drawPixelRect(ctx, ox + 6, oy + 10, 4, 3, PALETTE.brown);
}

function drawPlant(ctx, ox, oy) {
  // pot
  drawPixelRect(ctx, ox + 5, oy + 10, 6, 5, PALETTE.brown);
  drawPixelRect(ctx, ox + 4, oy + 10, 8, 1, darken(PALETTE.brown, 0.2));
  // leaves
  const g = PALETTE.green;
  const dg = PALETTE.darkGreen;
  drawPixelRect(ctx, ox + 5, oy + 4, 6, 6, g);
  drawPixelRect(ctx, ox + 3, oy + 5, 3, 4, g);
  drawPixelRect(ctx, ox + 10, oy + 5, 3, 4, g);
  drawPixelRect(ctx, ox + 6, oy + 2, 4, 3, g);
  // leaf veins
  drawPixel(ctx, ox + 7, oy + 4, dg);
  drawPixel(ctx, ox + 9, oy + 6, dg);
  drawPixel(ctx, ox + 5, oy + 7, dg);
  drawPixel(ctx, ox + 11, oy + 7, dg);
}

function drawBookshelf(ctx, ox, oy) {
  // frame
  drawPixelRect(ctx, ox + 1, oy + 1, 14, 14, PALETTE.brown);
  drawPixelRect(ctx, ox + 2, oy + 2, 12, 12, darken(PALETTE.brown, 0.2));
  // shelves
  drawPixelRect(ctx, ox + 2, oy + 5, 12, 1, lighten(PALETTE.brown, 0.1));
  drawPixelRect(ctx, ox + 2, oy + 9, 12, 1, lighten(PALETTE.brown, 0.1));
  // books on top shelf
  const bookColors = [PALETTE.red, PALETTE.blue, PALETTE.green, PALETTE.yellow, PALETTE.darkPurple];
  for (let i = 0; i < 5; i++) {
    drawPixelRect(ctx, ox + 3 + i * 2, oy + 2, 2, 3, bookColors[i]);
  }
  // books on middle shelf
  for (let i = 0; i < 4; i++) {
    drawPixelRect(ctx, ox + 3 + i * 3, oy + 6, 2, 3, bookColors[(i + 2) % 5]);
  }
  // books on bottom shelf
  for (let i = 0; i < 5; i++) {
    drawPixelRect(ctx, ox + 3 + i * 2, oy + 10, 2, 3, bookColors[(i + 1) % 5]);
  }
}

function drawMeetingTableLeft(ctx, ox, oy) {
  // rounded left end of a large conference table
  drawPixelRect(ctx, ox + 1, oy + 3, 15, 10, PALETTE.brown);
  drawPixelRect(ctx, ox + 2, oy + 2, 14, 12, PALETTE.brown);
  drawPixelRect(ctx, ox + 3, oy + 4, 12, 8, lighten(PALETTE.brown, 0.15));
  // edge highlight
  drawPixelRect(ctx, ox + 1, oy + 3, 1, 10, darken(PALETTE.brown, 0.3));
}

function drawMeetingTableRight(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy + 3, 15, 10, PALETTE.brown);
  drawPixelRect(ctx, ox, oy + 2, 14, 12, PALETTE.brown);
  drawPixelRect(ctx, ox + 1, oy + 4, 12, 8, lighten(PALETTE.brown, 0.15));
  drawPixelRect(ctx, ox + 14, oy + 3, 1, 10, darken(PALETTE.brown, 0.3));
}

function drawWaterCooler(ctx, ox, oy) {
  // bottle
  drawPixelRect(ctx, ox + 5, oy + 1, 6, 5, PALETTE.blue);
  drawPixelRect(ctx, ox + 6, oy + 2, 4, 3, lighten(PALETTE.blue, 0.3));
  // body
  drawPixelRect(ctx, ox + 4, oy + 6, 8, 8, PALETTE.white);
  drawPixelOutline(ctx, ox + 4, oy + 6, 8, 8, PALETTE.lightGrey);
  // spout
  drawPixelRect(ctx, ox + 6, oy + 9, 1, 2, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 9, oy + 9, 1, 2, PALETTE.red);
}

function drawPrinter(ctx, ox, oy) {
  // main body
  drawPixelRect(ctx, ox + 2, oy + 4, 12, 8, PALETTE.lightGrey);
  drawPixelOutline(ctx, ox + 2, oy + 4, 12, 8, PALETTE.darkGrey);
  // top panel
  drawPixelRect(ctx, ox + 3, oy + 3, 10, 2, darken(PALETTE.lightGrey, 0.1));
  // paper tray
  drawPixelRect(ctx, ox + 4, oy + 12, 8, 2, PALETTE.white);
  drawPixelOutline(ctx, ox + 4, oy + 12, 8, 2, PALETTE.darkGrey);
  // buttons
  drawPixelRect(ctx, ox + 10, oy + 6, 2, 1, PALETTE.green);
  drawPixelRect(ctx, ox + 10, oy + 8, 2, 1, PALETTE.orange);
}

function drawFilingCabinet(ctx, ox, oy) {
  drawPixelRect(ctx, ox + 2, oy + 1, 12, 14, PALETTE.lightGrey);
  drawPixelOutline(ctx, ox + 2, oy + 1, 12, 14, PALETTE.darkGrey);
  // drawer lines
  for (let d = 0; d < 3; d++) {
    const dy = oy + 2 + d * 4;
    drawPixelRect(ctx, ox + 3, dy, 10, 4, lighten(PALETTE.lightGrey, 0.1));
    drawPixelRect(ctx, ox + 3, dy + 3, 10, 1, PALETTE.darkGrey);
    // handle
    drawPixelRect(ctx, ox + 7, dy + 1, 2, 1, darken(PALETTE.darkGrey, 0.2));
  }
}

function drawCouchLeft(ctx, ox, oy) {
  const fabric = mix(PALETTE.blue, PALETTE.darkBlue, 0.3);
  // back
  drawPixelRect(ctx, ox + 1, oy + 2, 14, 4, darken(fabric, 0.2));
  // seat
  drawPixelRect(ctx, ox + 1, oy + 6, 15, 7, fabric);
  drawPixelRect(ctx, ox + 2, oy + 7, 13, 5, lighten(fabric, 0.15));
  // arm
  drawPixelRect(ctx, ox + 1, oy + 4, 3, 9, darken(fabric, 0.15));
}

function drawCouchRight(ctx, ox, oy) {
  const fabric = mix(PALETTE.blue, PALETTE.darkBlue, 0.3);
  drawPixelRect(ctx, ox + 1, oy + 2, 14, 4, darken(fabric, 0.2));
  drawPixelRect(ctx, ox, oy + 6, 15, 7, fabric);
  drawPixelRect(ctx, ox + 1, oy + 7, 13, 5, lighten(fabric, 0.15));
  drawPixelRect(ctx, ox + 12, oy + 4, 3, 9, darken(fabric, 0.15));
}

function drawTrashCan(ctx, ox, oy) {
  drawPixelRect(ctx, ox + 4, oy + 3, 8, 11, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 5, oy + 4, 6, 9, lighten(PALETTE.darkGrey, 0.15));
  // rim
  drawPixelRect(ctx, ox + 3, oy + 3, 10, 1, darken(PALETTE.darkGrey, 0.25));
  // lid edge
  drawPixelRect(ctx, ox + 3, oy + 2, 10, 1, darken(PALETTE.darkGrey, 0.1));
}

function drawLamp(ctx, ox, oy) {
  // outer glow
  const glow = [255, 236, 39, 80];
  for (let dy = 2; dy < 14; dy++) {
    for (let dx = 2; dx < 14; dx++) {
      const dist = Math.sqrt((dx - 7.5) ** 2 + (dy - 7.5) ** 2);
      if (dist < 6) drawPixel(ctx, ox + dx, oy + dy, glow);
    }
  }
  // bright center
  const bright = [255, 241, 232, 180];
  for (let dy = 4; dy < 12; dy++) {
    for (let dx = 4; dx < 12; dx++) {
      const dist = Math.sqrt((dx - 7.5) ** 2 + (dy - 7.5) ** 2);
      if (dist < 3) drawPixel(ctx, ox + dx, oy + dy, bright);
    }
  }
  drawPixel(ctx, ox + 7, oy + 7, PALETTE.yellow);
  drawPixel(ctx, ox + 8, oy + 7, PALETTE.yellow);
  drawPixel(ctx, ox + 7, oy + 8, PALETTE.yellow);
  drawPixel(ctx, ox + 8, oy + 8, PALETTE.yellow);
}

// ── Doors ──────────────────────────────────────────────────────────────────

function drawDoorClosedHoriz(ctx, ox, oy) {
  // wall gap
  drawPixelRect(ctx, ox, oy, 16, 6, PALETTE.lightGrey);
  drawPixelRect(ctx, ox, oy + 10, 16, 6, PALETTE.lightGrey);
  // door panel
  drawPixelRect(ctx, ox + 1, oy + 6, 14, 4, PALETTE.brown);
  drawPixelRect(ctx, ox + 2, oy + 7, 12, 2, lighten(PALETTE.brown, 0.1));
  // handle
  drawPixel(ctx, ox + 11, oy + 8, PALETTE.yellow);
}

function drawDoorOpenHoriz(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 6, PALETTE.lightGrey);
  drawPixelRect(ctx, ox, oy + 10, 16, 6, PALETTE.lightGrey);
  // door swung open (thinner, at edge)
  drawPixelRect(ctx, ox + 1, oy + 6, 3, 4, PALETTE.brown);
  drawPixelRect(ctx, ox + 2, oy + 7, 1, 2, lighten(PALETTE.brown, 0.1));
  // open gap
  drawPixelRect(ctx, ox + 4, oy + 6, 11, 4, [0, 0, 0, 0]);
}

function drawDoorClosedVert(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 6, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 10, oy, 6, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 6, oy + 1, 4, 14, PALETTE.brown);
  drawPixelRect(ctx, ox + 7, oy + 2, 2, 12, lighten(PALETTE.brown, 0.1));
  drawPixel(ctx, ox + 8, oy + 11, PALETTE.yellow);
}

function drawDoorOpenVert(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 6, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 10, oy, 6, 16, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 6, oy + 1, 4, 3, PALETTE.brown);
  drawPixelRect(ctx, ox + 7, oy + 2, 2, 1, lighten(PALETTE.brown, 0.1));
}

// ── Decorations ────────────────────────────────────────────────────────────

function drawTeamBanner(ctx, ox, oy) {
  // flagpole
  drawPixelRect(ctx, ox + 7, oy + 1, 2, 14, PALETTE.darkGrey);
  // banner flag
  drawPixelRect(ctx, ox + 3, oy + 2, 4, 8, PALETTE.red);
  drawPixelRect(ctx, ox + 9, oy + 2, 4, 8, PALETTE.blue);
  // pennant bottom
  drawPixel(ctx, ox + 5, oy + 10, PALETTE.red);
  drawPixel(ctx, ox + 10, oy + 10, PALETTE.blue);
}

function drawStatusScreen(ctx, ox, oy) {
  drawPixelOutline(ctx, ox + 1, oy + 2, 14, 10, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 2, oy + 3, 12, 8, PALETTE.darkBlue);
  // screen content – bar chart
  drawPixelRect(ctx, ox + 4, oy + 8, 2, 2, PALETTE.green);
  drawPixelRect(ctx, ox + 7, oy + 6, 2, 4, PALETTE.yellow);
  drawPixelRect(ctx, ox + 10, oy + 5, 2, 5, PALETTE.red);
  // title line
  drawPixelRect(ctx, ox + 4, oy + 4, 6, 1, PALETTE.white);
}

function drawClock(ctx, ox, oy) {
  // round clock face
  const cx = 8, cy = 8;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dist = Math.sqrt((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2);
      if (dist <= 6.5 && dist > 5.5) drawPixel(ctx, ox + x, oy + y, PALETTE.darkGrey);
      else if (dist <= 5.5) drawPixel(ctx, ox + x, oy + y, PALETTE.white);
    }
  }
  // hour hand
  drawPixelRect(ctx, ox + 7, oy + 5, 2, 3, PALETTE.black);
  // minute hand
  drawPixelRect(ctx, ox + 8, oy + 4, 1, 5, PALETTE.darkGrey);
  // center dot
  drawPixel(ctx, ox + 8, oy + 8, PALETTE.red);
}

function drawElevatorDoor(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, darken(PALETTE.lightGrey, 0.05));
  // metallic double door
  drawPixelRect(ctx, ox + 1, oy + 1, 6, 14, PALETTE.lightGrey);
  drawPixelRect(ctx, ox + 9, oy + 1, 6, 14, PALETTE.lightGrey);
  // gap
  drawPixelRect(ctx, ox + 7, oy + 1, 2, 14, darken(PALETTE.darkGrey, 0.3));
  // frame
  drawPixelOutline(ctx, ox, oy, 16, 16, PALETTE.darkGrey);
  // indicator
  drawPixel(ctx, ox + 7, oy + 0, PALETTE.green);
  drawPixel(ctx, ox + 8, oy + 0, PALETTE.green);
}

function drawStairs(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.lightGrey);
  // diagonal step pattern
  for (let i = 0; i < 6; i++) {
    drawPixelRect(ctx, ox + i * 2, oy + 2 + i * 2, 4, 2, darken(PALETTE.lightGrey, 0.1 + i * 0.05));
    drawPixelRect(ctx, ox + i * 2, oy + 2 + i * 2, 4, 1, darken(PALETTE.lightGrey, 0.2 + i * 0.05));
  }
}

function drawRugCenter(ctx, ox, oy) {
  drawPixelRect(ctx, ox, oy, 16, 16, PALETTE.darkPurple);
  drawPixelOutline(ctx, ox + 1, oy + 1, 14, 14, PALETTE.lavender);
  drawPixelOutline(ctx, ox + 3, oy + 3, 10, 10, darken(PALETTE.darkPurple, 0.15));
  // center diamond
  const mid = 8;
  for (let d = 0; d < 4; d++) {
    drawPixel(ctx, ox + mid - d, oy + mid - (3 - d), PALETTE.lavender);
    drawPixel(ctx, ox + mid + d, oy + mid - (3 - d), PALETTE.lavender);
    drawPixel(ctx, ox + mid - d, oy + mid + (3 - d), PALETTE.lavender);
    drawPixel(ctx, ox + mid + d, oy + mid + (3 - d), PALETTE.lavender);
  }
}

function drawWindow(ctx, ox, oy) {
  // frame
  drawPixelOutline(ctx, ox + 1, oy + 1, 14, 14, PALETTE.darkGrey);
  // glass panes
  drawPixelRect(ctx, ox + 2, oy + 2, 12, 12, lighten(PALETTE.blue, 0.4));
  // cross frame
  drawPixelRect(ctx, ox + 7, oy + 1, 2, 14, PALETTE.darkGrey);
  drawPixelRect(ctx, ox + 1, oy + 7, 14, 2, PALETTE.darkGrey);
  // highlight
  drawPixelRect(ctx, ox + 3, oy + 3, 2, 3, lighten(PALETTE.blue, 0.6));
}

// ── Main generator ─────────────────────────────────────────────────────────

function generateOfficeTileset() {
  const { canvas, ctx } = createSpriteSheet(TILE, TILE, COLS, ROWS);

  // tile 50 (empty) is naturally transparent on a fresh canvas

  const drawFns = {
    1:  (c, ox, oy) => drawCarpetNeutral(c, ox, oy),
    8:  (c, ox, oy) => drawHardwood(c, ox, oy),
    9:  (c, ox, oy) => drawTileFloor(c, ox, oy),
    10: (c, ox, oy) => drawLobbyFloor(c, ox, oy),
    11: (c, ox, oy) => drawCorridorFloor(c, ox, oy),
    12: (c, ox, oy) => drawGrass(c, ox, oy),
    13: (c, ox, oy) => drawExteriorTop(c, ox, oy),
    14: (c, ox, oy) => drawExteriorSide(c, ox, oy),
    15: (c, ox, oy) => drawInteriorHoriz(c, ox, oy),
    16: (c, ox, oy) => drawInteriorVert(c, ox, oy),
    17: (c, ox, oy) => drawGlassHoriz(c, ox, oy),
    18: (c, ox, oy) => drawGlassVert(c, ox, oy),
    19: (c, ox, oy) => drawWallCorner(c, ox, oy),
    20: (c, ox, oy) => drawWallEndCap(c, ox, oy),
    21: (c, ox, oy) => drawDeskLeft(c, ox, oy),
    22: (c, ox, oy) => drawDeskRight(c, ox, oy),
    23: (c, ox, oy) => drawChair(c, ox, oy),
    24: (c, ox, oy) => drawMonitor(c, ox, oy),
    25: (c, ox, oy) => drawKeyboard(c, ox, oy),
    26: (c, ox, oy) => drawWhiteboard(c, ox, oy),
    27: (c, ox, oy) => drawCoffeeMachine(c, ox, oy),
    28: (c, ox, oy) => drawPlant(c, ox, oy),
    29: (c, ox, oy) => drawBookshelf(c, ox, oy),
    30: (c, ox, oy) => drawMeetingTableLeft(c, ox, oy),
    31: (c, ox, oy) => drawMeetingTableRight(c, ox, oy),
    32: (c, ox, oy) => drawWaterCooler(c, ox, oy),
    33: (c, ox, oy) => drawPrinter(c, ox, oy),
    34: (c, ox, oy) => drawFilingCabinet(c, ox, oy),
    35: (c, ox, oy) => drawCouchLeft(c, ox, oy),
    36: (c, ox, oy) => drawCouchRight(c, ox, oy),
    37: (c, ox, oy) => drawTrashCan(c, ox, oy),
    38: (c, ox, oy) => drawLamp(c, ox, oy),
    39: (c, ox, oy) => drawDoorClosedHoriz(c, ox, oy),
    40: (c, ox, oy) => drawDoorOpenHoriz(c, ox, oy),
    41: (c, ox, oy) => drawDoorClosedVert(c, ox, oy),
    42: (c, ox, oy) => drawDoorOpenVert(c, ox, oy),
    43: (c, ox, oy) => drawTeamBanner(c, ox, oy),
    44: (c, ox, oy) => drawStatusScreen(c, ox, oy),
    45: (c, ox, oy) => drawClock(c, ox, oy),
    46: (c, ox, oy) => drawElevatorDoor(c, ox, oy),
    47: (c, ox, oy) => drawStairs(c, ox, oy),
    48: (c, ox, oy) => drawRugCenter(c, ox, oy),
    49: (c, ox, oy) => drawWindow(c, ox, oy),
  };

  // Team carpet tiles 2-7
  for (let i = 0; i < 6; i++) {
    drawFns[2 + i] = (c, ox, oy) => drawCarpetTeam(c, ox, oy, i);
  }

  // Render every tile
  for (let id = 1; id <= 50; id++) {
    const { ox, oy } = tileOrigin(id);
    if (drawFns[id]) drawFns[id](ctx, ox, oy);
    // id 50 stays transparent
  }

  // ── Save PNG ──
  const tilesDir = path.join(ASSETS_DIR, 'tiles');
  const pngPath  = path.join(tilesDir, 'office-tileset.png');
  saveCanvas(canvas, pngPath);

  // ── Save JSON metadata ──
  const meta = {
    image: 'office-tileset.png',
    imagewidth: COLS * TILE,
    imageheight: ROWS * TILE,
    tilewidth: TILE,
    tileheight: TILE,
    tilecount: 50,
    columns: COLS,
    tiles: {},
  };
  for (const [id, info] of Object.entries(TILE_META)) {
    meta.tiles[id] = info;
  }
  const jsonPath = path.join(tilesDir, 'office-tileset.json');
  fs.mkdirSync(tilesDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  console.log(`  Saved: ${path.relative(process.cwd(), jsonPath)}`);

  return {
    pngPath,
    jsonPath,
    tileCount: 50,
    imageSize: { width: COLS * TILE, height: ROWS * TILE },
  };
}

module.exports = { generateOfficeTileset };
