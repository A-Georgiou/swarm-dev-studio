const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'packages', 'ui', 'public', 'assets');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Draw a single pixel (for pixel art, we draw filled rectangles)
function drawPixel(ctx, x, y, color, scale = 1) {
  if (!color || color[3] === 0) return;
  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(color[3] || 255) / 255})`;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

// Draw a row of pixels from a color array
function drawPixelRow(ctx, startX, y, colors, scale = 1) {
  colors.forEach((color, i) => {
    if (color) drawPixel(ctx, startX + i, y, color, scale);
  });
}

// Draw a filled rectangle of pixels
function drawPixelRect(ctx, x, y, w, h, color, scale = 1) {
  if (!color || color[3] === 0) return;
  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(color[3] || 255) / 255})`;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

// Draw outline rectangle
function drawPixelOutline(ctx, x, y, w, h, color, scale = 1) {
  drawPixelRect(ctx, x, y, w, 1, color, scale);         // top
  drawPixelRect(ctx, x, y + h - 1, w, 1, color, scale); // bottom
  drawPixelRect(ctx, x, y, 1, h, color, scale);          // left
  drawPixelRect(ctx, x + w - 1, y, 1, h, color, scale); // right
}

// Create a canvas for a sprite sheet
function createSpriteSheet(frameWidth, frameHeight, cols, rows) {
  const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// Save canvas to PNG
function saveCanvas(canvas, filePath) {
  ensureDir(path.dirname(filePath));
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  console.log(`  Saved: ${path.relative(process.cwd(), filePath)}`);
}

// Generate a Phaser 3 compatible JSON atlas for a sprite sheet
function generateAtlas(imageFile, frameWidth, frameHeight, animations) {
  const frames = {};
  let frameIndex = 0;

  for (const [animName, frameCount] of Object.entries(animations)) {
    for (let i = 0; i < frameCount; i++) {
      const col = frameIndex % Math.ceil(Object.values(animations).reduce((a, b) => a + b, 0) / 1);
      const row = Math.floor(frameIndex / 8); // 8 columns per row
      const actualCol = frameIndex % 8;
      frames[`${animName}_${i}`] = {
        frame: {
          x: actualCol * frameWidth,
          y: row * frameHeight,
          w: frameWidth,
          h: frameHeight,
        },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
        sourceSize: { w: frameWidth, h: frameHeight },
      };
      frameIndex++;
    }
  }

  return {
    frames,
    meta: {
      app: 'swarm-dev-studio-asset-gen',
      version: '1.0',
      image: imageFile,
      format: 'RGBA8888',
      size: {
        w: 8 * frameWidth,
        h: Math.ceil(frameIndex / 8) * frameHeight,
      },
      scale: '1',
    },
  };
}

module.exports = {
  ASSETS_DIR,
  ensureDir,
  drawPixel,
  drawPixelRow,
  drawPixelRect,
  drawPixelOutline,
  createSpriteSheet,
  saveCanvas,
  generateAtlas,
};
