const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');
const { PALETTE, TEAM_COLORS } = require('./palette');
const {
  drawPixel,
  drawPixelRect,
  drawPixelOutline,
  saveCanvas,
  ensureDir,
  ASSETS_DIR,
} = require('./utils');

const UI_DIR = path.join(ASSETS_DIR, 'ui');

// ---------------------------------------------------------------------------
// Speech Bubble (9-slice, 24x24)
// ---------------------------------------------------------------------------
function generateSpeechBubble() {
  const W = 24;
  const H = 24;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const black = PALETTE.black;
  const white = PALETTE.white;

  // Fill interior with white (inset by 1px border)
  drawPixelRect(ctx, 1, 1, W - 2, H - 6, white); // leave room for tail at bottom

  // Draw 1px black border — top edge (skip 2px corners)
  drawPixelRect(ctx, 2, 0, W - 4, 1, black);
  // Bottom edge of bubble body (row 18), skip corners and tail gap
  // Bubble body ends at row 18 (0-indexed), tail starts below
  const bodyBottom = H - 6; // row 18
  drawPixelRect(ctx, 2, bodyBottom, 8, 1, black);            // left part of bottom
  drawPixelRect(ctx, W - 2 - 8, bodyBottom, 8, 1, black);    // right part of bottom
  // Left edge
  drawPixelRect(ctx, 0, 2, 1, bodyBottom - 2, black);
  // Right edge
  drawPixelRect(ctx, W - 1, 2, 1, bodyBottom - 2, black);

  // Rounded corners (2px radius) — top-left
  drawPixel(ctx, 1, 0, black);
  drawPixel(ctx, 0, 1, black);
  drawPixel(ctx, 1, 1, white);
  // Top-right
  drawPixel(ctx, W - 2, 0, black);
  drawPixel(ctx, W - 1, 1, black);
  drawPixel(ctx, W - 2, 1, white);
  // Bottom-left
  drawPixel(ctx, 1, bodyBottom, black);
  drawPixel(ctx, 0, bodyBottom - 1, black);
  drawPixel(ctx, 1, bodyBottom - 1, white);
  // Bottom-right
  drawPixel(ctx, W - 2, bodyBottom, black);
  drawPixel(ctx, W - 1, bodyBottom - 1, black);
  drawPixel(ctx, W - 2, bodyBottom - 1, white);

  // Tail triangle — 3px wide, 3px tall, centered at bottom
  const tailCx = Math.floor(W / 2); // 12
  // Row bodyBottom is the bottom border of the bubble; tail starts there
  // Fill the gap in the bottom border for the tail opening
  drawPixelRect(ctx, tailCx - 1, bodyBottom, 3, 1, white);

  // Tail outline: left side going down-left, right side going down-right
  // Row 0 of tail (row bodyBottom+1): two side pixels black, center white
  drawPixel(ctx, tailCx - 1, bodyBottom + 1, black);
  drawPixel(ctx, tailCx, bodyBottom + 1, white);
  drawPixel(ctx, tailCx + 1, bodyBottom + 1, black);
  // Row 1 of tail (bodyBottom+2): narrower
  drawPixel(ctx, tailCx, bodyBottom + 2, black);

  const filePath = path.join(UI_DIR, 'speech-bubble.png');
  saveCanvas(canvas, filePath);
  return { name: 'speech-bubble', path: 'ui/speech-bubble.png', description: 'Speech bubble 9-slice (24x24)' };
}

// ---------------------------------------------------------------------------
// Thought Bubble (9-slice, 24x28)
// ---------------------------------------------------------------------------
function generateThoughtBubble() {
  const W = 24;
  const H = 28;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const black = PALETTE.black;
  const white = PALETTE.white;

  const bodyBottom = 19; // bubble body spans rows 0..19 (20px tall)

  // Fill interior with white
  drawPixelRect(ctx, 1, 1, W - 2, bodyBottom - 1, white);

  // Top edge (skip 3px corners for rounder look)
  drawPixelRect(ctx, 3, 0, W - 6, 1, black);
  // Bottom edge of body
  drawPixelRect(ctx, 3, bodyBottom, W - 6, 1, black);
  // Left edge
  drawPixelRect(ctx, 0, 3, 1, bodyBottom - 5, black);
  // Right edge
  drawPixelRect(ctx, W - 1, 3, 1, bodyBottom - 5, black);

  // Rounded corners (3px radius) — top-left
  drawPixel(ctx, 2, 0, black);
  drawPixel(ctx, 1, 1, black);
  drawPixel(ctx, 0, 2, black);
  drawPixel(ctx, 2, 1, white);
  drawPixel(ctx, 1, 2, white);
  // Top-right
  drawPixel(ctx, W - 3, 0, black);
  drawPixel(ctx, W - 2, 1, black);
  drawPixel(ctx, W - 1, 2, black);
  drawPixel(ctx, W - 3, 1, white);
  drawPixel(ctx, W - 2, 2, white);
  // Bottom-left
  drawPixel(ctx, 2, bodyBottom, black);
  drawPixel(ctx, 1, bodyBottom - 1, black);
  drawPixel(ctx, 0, bodyBottom - 2, black);
  drawPixel(ctx, 2, bodyBottom - 1, white);
  drawPixel(ctx, 1, bodyBottom - 2, white);
  // Bottom-right
  drawPixel(ctx, W - 3, bodyBottom, black);
  drawPixel(ctx, W - 2, bodyBottom - 1, black);
  drawPixel(ctx, W - 1, bodyBottom - 2, black);
  drawPixel(ctx, W - 3, bodyBottom - 1, white);
  drawPixel(ctx, W - 2, bodyBottom - 2, white);

  // Thought dots descending below the bubble, centered
  const cx = Math.floor(W / 2);

  // Dot 1: 3px diameter circle (rows bodyBottom+2..bodyBottom+4)
  const d1y = bodyBottom + 2;
  drawPixel(ctx, cx, d1y, black);
  drawPixel(ctx, cx - 1, d1y + 1, black);
  drawPixel(ctx, cx, d1y + 1, white);
  drawPixel(ctx, cx + 1, d1y + 1, black);
  drawPixel(ctx, cx, d1y + 2, black);

  // Dot 2: 2px square (rows bodyBottom+5..bodyBottom+6)
  const d2y = bodyBottom + 5;
  drawPixel(ctx, cx, d2y, black);
  drawPixel(ctx, cx + 1, d2y, black);
  drawPixel(ctx, cx, d2y + 1, black);
  drawPixel(ctx, cx + 1, d2y + 1, black);

  // Dot 3: single 1px pixel
  const d3y = bodyBottom + 7;
  drawPixel(ctx, cx, d3y, black);

  const filePath = path.join(UI_DIR, 'thought-bubble.png');
  saveCanvas(canvas, filePath);
  return { name: 'thought-bubble', path: 'ui/thought-bubble.png', description: 'Thought bubble 9-slice (24x28)' };
}

// ---------------------------------------------------------------------------
// Status Icons — helper drawing functions
// ---------------------------------------------------------------------------

function drawGear(ctx, ox, oy) {
  const c = PALETTE.lightGrey;
  // Center circle 6x6 at (5,5)
  drawPixelRect(ctx, ox + 5, ox ? oy + 4 : 4, 6, 8, c);
  drawPixelRect(ctx, ox + 4, oy + 5, 8, 6, c);
  // Teeth — protruding 2px blocks on each side
  // Top
  drawPixelRect(ctx, ox + 6, oy + 1, 4, 2, c);
  // Bottom
  drawPixelRect(ctx, ox + 6, oy + 13, 4, 2, c);
  // Left
  drawPixelRect(ctx, ox + 1, oy + 6, 2, 4, c);
  // Right
  drawPixelRect(ctx, ox + 13, oy + 6, 2, 4, c);
  // Diagonal teeth (top-left, top-right, bottom-left, bottom-right)
  drawPixelRect(ctx, ox + 3, oy + 3, 2, 2, c);
  drawPixelRect(ctx, ox + 11, oy + 3, 2, 2, c);
  drawPixelRect(ctx, ox + 3, oy + 11, 2, 2, c);
  drawPixelRect(ctx, ox + 11, oy + 11, 2, 2, c);
  // Center hole
  drawPixelRect(ctx, ox + 6, oy + 6, 4, 4, PALETTE.darkGrey);
}

function drawCodeBrackets(ctx, ox, oy) {
  const c = PALETTE.blue;
  // '<' on left
  drawPixel(ctx, ox + 4, oy + 7, c);
  drawPixel(ctx, ox + 3, oy + 6, c);
  drawPixel(ctx, ox + 2, oy + 5, c);
  drawPixel(ctx, ox + 3, oy + 8, c);
  drawPixel(ctx, ox + 4, oy + 9, c);
  drawPixel(ctx, ox + 2, oy + 7, c); // tip extra for thickness

  // '/' in center
  drawPixel(ctx, ox + 8, oy + 4, c);
  drawPixel(ctx, ox + 8, oy + 5, c);
  drawPixel(ctx, ox + 7, oy + 6, c);
  drawPixel(ctx, ox + 7, oy + 7, c);
  drawPixel(ctx, ox + 6, oy + 8, c);
  drawPixel(ctx, ox + 6, oy + 9, c);
  drawPixel(ctx, ox + 5, oy + 10, c);
  drawPixel(ctx, ox + 5, oy + 11, c);

  // '>' on right
  drawPixel(ctx, ox + 10, oy + 7, c);
  drawPixel(ctx, ox + 11, oy + 6, c);
  drawPixel(ctx, ox + 12, oy + 5, c);
  drawPixel(ctx, ox + 11, oy + 8, c);
  drawPixel(ctx, ox + 10, oy + 9, c);
  drawPixel(ctx, ox + 12, oy + 7, c); // tip extra
}

function drawCheckmark(ctx, ox, oy) {
  const c = PALETTE.green;
  // Thick checkmark shape
  drawPixel(ctx, ox + 3, oy + 8, c);
  drawPixel(ctx, ox + 4, oy + 9, c);
  drawPixel(ctx, ox + 5, oy + 10, c);
  drawPixel(ctx, ox + 6, oy + 11, c);
  drawPixel(ctx, ox + 7, oy + 10, c);
  drawPixel(ctx, ox + 8, oy + 9, c);
  drawPixel(ctx, ox + 9, oy + 8, c);
  drawPixel(ctx, ox + 10, oy + 7, c);
  drawPixel(ctx, ox + 11, oy + 6, c);
  drawPixel(ctx, ox + 12, oy + 5, c);
  // Second row for thickness
  drawPixel(ctx, ox + 3, oy + 9, c);
  drawPixel(ctx, ox + 4, oy + 10, c);
  drawPixel(ctx, ox + 5, oy + 11, c);
  drawPixel(ctx, ox + 6, oy + 12, c);
  drawPixel(ctx, ox + 7, oy + 11, c);
  drawPixel(ctx, ox + 8, oy + 10, c);
  drawPixel(ctx, ox + 9, oy + 9, c);
  drawPixel(ctx, ox + 10, oy + 8, c);
  drawPixel(ctx, ox + 11, oy + 7, c);
  drawPixel(ctx, ox + 12, oy + 6, c);
}

function drawWarning(ctx, ox, oy) {
  const y = PALETTE.yellow;
  const b = PALETTE.black;
  // Triangle outline rows (top to bottom, centered)
  // Row 2: tip
  drawPixel(ctx, ox + 7, oy + 2, y);
  drawPixel(ctx, ox + 8, oy + 2, y);
  // Row 3
  drawPixelRect(ctx, ox + 6, oy + 3, 4, 1, y);
  // Row 4
  drawPixelRect(ctx, ox + 5, oy + 4, 6, 1, y);
  // Row 5
  drawPixelRect(ctx, ox + 5, oy + 5, 6, 1, y);
  // Row 6
  drawPixelRect(ctx, ox + 4, oy + 6, 8, 1, y);
  // Row 7
  drawPixelRect(ctx, ox + 4, oy + 7, 8, 1, y);
  // Row 8
  drawPixelRect(ctx, ox + 3, oy + 8, 10, 1, y);
  // Row 9
  drawPixelRect(ctx, ox + 3, oy + 9, 10, 1, y);
  // Row 10
  drawPixelRect(ctx, ox + 2, oy + 10, 12, 1, y);
  // Row 11
  drawPixelRect(ctx, ox + 2, oy + 11, 12, 1, y);
  // Row 12
  drawPixelRect(ctx, ox + 1, oy + 12, 14, 1, y);
  // Row 13 (base)
  drawPixelRect(ctx, ox + 1, oy + 13, 14, 1, y);

  // Exclamation mark in black
  drawPixelRect(ctx, ox + 7, oy + 5, 2, 5, b); // stem
  drawPixelRect(ctx, ox + 7, oy + 11, 2, 2, b); // dot
}

function drawBug(ctx, ox, oy) {
  const c = PALETTE.red;
  const b = PALETTE.black;
  // Body — oval
  drawPixelRect(ctx, ox + 5, oy + 5, 6, 8, c);
  drawPixelRect(ctx, ox + 4, oy + 6, 8, 6, c);
  // Center line
  drawPixelRect(ctx, ox + 7, oy + 5, 2, 8, b);
  // Head
  drawPixelRect(ctx, ox + 6, oy + 3, 4, 2, b);
  // Antennae
  drawPixel(ctx, ox + 5, oy + 2, b);
  drawPixel(ctx, ox + 4, oy + 1, b);
  drawPixel(ctx, ox + 10, oy + 2, b);
  drawPixel(ctx, ox + 11, oy + 1, b);
  // Legs — 3 on each side
  drawPixel(ctx, ox + 3, oy + 7, b);
  drawPixel(ctx, ox + 3, oy + 9, b);
  drawPixel(ctx, ox + 3, oy + 11, b);
  drawPixel(ctx, ox + 12, oy + 7, b);
  drawPixel(ctx, ox + 12, oy + 9, b);
  drawPixel(ctx, ox + 12, oy + 11, b);
}

function drawChat(ctx, ox, oy) {
  const c = PALETTE.blue;
  // Speech bubble outline (smaller, icon-sized)
  // Top edge
  drawPixelRect(ctx, ox + 4, oy + 2, 8, 1, c);
  // Bottom edge
  drawPixelRect(ctx, ox + 4, oy + 10, 8, 1, c);
  // Left edge
  drawPixelRect(ctx, ox + 3, oy + 3, 1, 7, c);
  // Right edge
  drawPixelRect(ctx, ox + 12, oy + 3, 1, 7, c);
  // Corners
  drawPixel(ctx, ox + 3, oy + 2, c);
  drawPixel(ctx, ox + 12, oy + 2, c);
  drawPixel(ctx, ox + 3, oy + 10, c);
  drawPixel(ctx, ox + 12, oy + 10, c);
  // Tail
  drawPixel(ctx, ox + 5, oy + 11, c);
  drawPixel(ctx, ox + 4, oy + 12, c);
  drawPixel(ctx, ox + 3, oy + 13, c);
  // Dots inside (chat indicator)
  drawPixel(ctx, ox + 6, oy + 6, c);
  drawPixel(ctx, ox + 8, oy + 6, c);
  drawPixel(ctx, ox + 10, oy + 6, c);
}

function drawCoffee(ctx, ox, oy) {
  const br = PALETTE.brown;
  const w = PALETTE.white;
  // Cup body
  drawPixelRect(ctx, ox + 4, oy + 6, 7, 7, br);
  // Handle
  drawPixelRect(ctx, ox + 11, oy + 7, 2, 1, br);
  drawPixel(ctx, ox + 12, oy + 8, br);
  drawPixel(ctx, ox + 12, oy + 9, br);
  drawPixelRect(ctx, ox + 11, oy + 10, 2, 1, br);
  // Rim
  drawPixelRect(ctx, ox + 3, oy + 5, 9, 1, br);
  // Steam wisps
  drawPixel(ctx, ox + 5, oy + 3, w);
  drawPixel(ctx, ox + 5, oy + 1, w);
  drawPixel(ctx, ox + 7, oy + 4, w);
  drawPixel(ctx, ox + 7, oy + 2, w);
  drawPixel(ctx, ox + 9, oy + 3, w);
  drawPixel(ctx, ox + 9, oy + 1, w);
}

function drawStar(ctx, ox, oy) {
  const c = PALETTE.yellow;
  // 5-pointed star drawn pixel-by-pixel
  // Top point
  drawPixelRect(ctx, ox + 7, oy + 1, 2, 1, c);
  drawPixelRect(ctx, ox + 6, oy + 2, 4, 1, c);
  drawPixelRect(ctx, ox + 6, oy + 3, 4, 1, c);
  drawPixelRect(ctx, ox + 5, oy + 4, 6, 1, c);
  // Middle bar
  drawPixelRect(ctx, ox + 1, oy + 5, 14, 1, c);
  drawPixelRect(ctx, ox + 2, oy + 6, 12, 1, c);
  drawPixelRect(ctx, ox + 3, oy + 7, 10, 1, c);
  // Lower V
  drawPixelRect(ctx, ox + 4, oy + 8, 8, 1, c);
  drawPixelRect(ctx, ox + 4, oy + 9, 8, 1, c);
  drawPixelRect(ctx, ox + 5, oy + 10, 6, 1, c);
  // Feet
  drawPixelRect(ctx, ox + 3, oy + 11, 3, 1, c);
  drawPixelRect(ctx, ox + 10, oy + 11, 3, 1, c);
  drawPixelRect(ctx, ox + 2, oy + 12, 2, 1, c);
  drawPixelRect(ctx, ox + 12, oy + 12, 2, 1, c);
  // Center bottom point
  drawPixelRect(ctx, ox + 6, oy + 11, 4, 1, c);
  drawPixelRect(ctx, ox + 7, oy + 12, 2, 1, c);
  drawPixelRect(ctx, ox + 7, oy + 13, 2, 1, c);
}

// ---------------------------------------------------------------------------
// Status Icons Sprite Sheet (128x16)
// ---------------------------------------------------------------------------
function generateStatusIcons() {
  const ICON_SIZE = 16;
  const ICON_COUNT = 8;
  const canvas = createCanvas(ICON_SIZE * ICON_COUNT, ICON_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const drawFns = [
    drawGear,         // 0: thinking
    drawCodeBrackets, // 1: code
    drawCheckmark,    // 2: checkmark
    drawWarning,      // 3: warning
    drawBug,          // 4: bug
    drawChat,         // 5: chat
    drawCoffee,       // 6: coffee
    drawStar,         // 7: star
  ];

  const iconNames = [
    'icon-thinking',
    'icon-code',
    'icon-checkmark',
    'icon-warning',
    'icon-bug',
    'icon-chat',
    'icon-coffee',
    'icon-star',
  ];

  drawFns.forEach((fn, i) => fn(ctx, i * ICON_SIZE, 0));

  // Build Phaser 3 atlas JSON
  const frames = {};
  iconNames.forEach((name, i) => {
    frames[name] = {
      frame: { x: i * ICON_SIZE, y: 0, w: ICON_SIZE, h: ICON_SIZE },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: ICON_SIZE, h: ICON_SIZE },
      sourceSize: { w: ICON_SIZE, h: ICON_SIZE },
    };
  });

  const atlas = {
    frames,
    meta: {
      app: 'swarm-dev-studio-asset-gen',
      version: '1.0',
      image: 'status-icons.png',
      format: 'RGBA8888',
      size: { w: ICON_SIZE * ICON_COUNT, h: ICON_SIZE },
      scale: '1',
    },
  };

  const sheetPath = path.join(UI_DIR, 'status-icons.png');
  const atlasPath = path.join(UI_DIR, 'status-icons.json');
  saveCanvas(canvas, sheetPath);
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2));
  console.log(`  Saved: ${path.relative(process.cwd(), atlasPath)}`);

  return [
    { name: 'status-icons', path: 'ui/status-icons.png', description: 'Status icons sprite sheet (128x16, 8 icons)' },
    { name: 'status-icons-atlas', path: 'ui/status-icons.json', description: 'Status icons atlas (Phaser 3)' },
  ];
}

// ---------------------------------------------------------------------------
// Team Color Indicators (48x8)
// ---------------------------------------------------------------------------
function generateTeamColors() {
  const SIZE = 8;
  const canvas = createCanvas(SIZE * TEAM_COLORS.length, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  TEAM_COLORS.forEach((team, i) => {
    const ox = i * SIZE;
    // Fill with primary color
    drawPixelRect(ctx, ox, 0, SIZE, SIZE, team.primary);
    // 1px black border
    drawPixelOutline(ctx, ox, 0, SIZE, SIZE, PALETTE.black);
  });

  const filePath = path.join(UI_DIR, 'team-colors.png');
  saveCanvas(canvas, filePath);
  return { name: 'team-colors', path: 'ui/team-colors.png', description: 'Team color indicators (48x8, 6 teams)' };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
function generateUIAssets() {
  ensureDir(UI_DIR);

  const results = [];

  results.push(generateSpeechBubble());
  results.push(generateThoughtBubble());
  results.push(...generateStatusIcons());
  results.push(generateTeamColors());

  return results;
}

module.exports = { generateUIAssets };
