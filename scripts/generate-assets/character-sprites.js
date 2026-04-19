const { createCanvas } = require('canvas');
const path = require('path');
const { PALETTE, SKIN_TONES } = require('./palette');
const { drawPixelRect, saveCanvas, ASSETS_DIR, ensureDir } = require('./utils');
const fs = require('fs');

const FRAME_W = 32;
const FRAME_H = 48;
const COLS = 8;
const ROWS = 4;
const TRANSPARENT = [0, 0, 0, 0];

// Animation definitions: name -> frame count
const ANIMATIONS = {
  'walk-down': 4,
  'walk-up': 4,
  'walk-left': 4,
  'walk-right': 4,
  'idle': 2,
  'sitting-coding': 4,
  'talking': 4,
  'thinking': 2,
};

// Character role configurations
const ROLES = [
  {
    id: 'ceo',
    name: 'CEO',
    skin: SKIN_TONES.light,
    hair: PALETTE.darkGrey,
    shirt: PALETTE.darkBlue,
    pants: PALETTE.darkBlue,
    shoes: PALETTE.black,
    tie: PALETTE.red,
    accessory: 'tie',
  },
  {
    id: 'cto',
    name: 'CTO',
    skin: SKIN_TONES.medium,
    hair: PALETTE.brown,
    shirt: PALETTE.darkGreen,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.brown,
    glasses: PALETTE.lightGrey,
    accessory: 'glasses',
  },
  {
    id: 'senior-manager',
    name: 'Senior Manager',
    skin: SKIN_TONES.light,
    hair: PALETTE.brown,
    shirt: PALETTE.brown,
    undershirt: PALETTE.white,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.black,
    accessory: 'blazer',
  },
  {
    id: 'team-manager',
    name: 'Team Manager',
    skin: SKIN_TONES.tan,
    hair: PALETTE.black,
    shirt: PALETTE.blue,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.brown,
    accessory: 'collar',
  },
  {
    id: 'pm',
    name: 'Product Manager',
    skin: SKIN_TONES.light,
    hair: PALETTE.orange,
    shirt: PALETTE.orange,
    undershirt: PALETTE.white,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.brown,
    accessory: 'clipboard',
  },
  {
    id: 'senior-dev',
    name: 'Senior Developer',
    skin: SKIN_TONES.medium,
    hair: PALETTE.darkPurple,
    shirt: PALETTE.darkPurple,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.darkGrey,
    accessory: 'headphones',
  },
  {
    id: 'developer',
    name: 'Developer',
    skin: SKIN_TONES.light,
    hair: PALETTE.brown,
    shirt: PALETTE.green,
    pants: PALETTE.blue,
    shoes: PALETTE.darkGrey,
    accessory: 'none',
  },
  {
    id: 'qa-engineer',
    name: 'QA Engineer',
    skin: SKIN_TONES.tan,
    hair: PALETTE.black,
    shirt: PALETTE.darkGrey,
    undershirt: PALETTE.blue,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.black,
    accessory: 'vest',
  },
  {
    id: 'tester',
    name: 'Tester',
    skin: SKIN_TONES.dark,
    hair: PALETTE.black,
    shirt: PALETTE.brown,
    pants: PALETTE.darkGrey,
    shoes: PALETTE.brown,
    accessory: 'notebook',
  },
];

function dr(ctx, x, y, w, h, color) {
  drawPixelRect(ctx, x, y, w, h, color);
}

// Draw a character at a given frame position
function drawCharacter(ctx, ox, oy, role, pose) {
  const { skin, hair, shirt, pants, shoes, undershirt } = role;
  const skinC = [...skin, 255];
  const hairC = hair;
  const shirtC = shirt;
  const pantsC = pants;
  const shoesC = shoes;

  const {
    headY = 0, bodyY = 0,
    legLX = 0, legRX = 0, legLY = 0, legRY = 0,
    armLY = 0, armRY = 0, armLX = 0, armRX = 0,
    facing = 'down', mouthOpen = false, eyeShift = 0,
    sitting = false,
  } = pose;

  // Center character in frame
  const cx = ox + 10;
  const cy = oy + 4;

  // --- Legs ---
  const legBaseY = sitting ? cy + 32 : cy + 34 + bodyY;
  if (!sitting) {
    dr(ctx, cx + 3 + legLX, legBaseY + legLY, 4, 10, pantsC);
    dr(ctx, cx + 3 + legLX, legBaseY + 8 + legLY, 4, 2, shoesC);
    dr(ctx, cx + 7 + legRX, legBaseY + legRY, 4, 10, pantsC);
    dr(ctx, cx + 7 + legRX, legBaseY + 8 + legRY, 4, 2, shoesC);
  } else {
    // Sitting legs go forward
    dr(ctx, cx + 2, legBaseY, 10, 4, pantsC);
    dr(ctx, cx + 2, legBaseY + 4, 4, 2, shoesC);
    dr(ctx, cx + 8, legBaseY + 4, 4, 2, shoesC);
  }

  // --- Body/Torso ---
  const bodyBaseY = cy + 18 + bodyY;
  dr(ctx, cx + 2, bodyBaseY, 10, 16, shirtC);

  // Undershirt stripe for blazer/vest roles
  if (undershirt) {
    dr(ctx, cx + 5, bodyBaseY + 1, 4, 14, undershirt);
  }

  // Tie for CEO
  if (role.accessory === 'tie' && role.tie) {
    dr(ctx, cx + 6, bodyBaseY + 2, 2, 10, role.tie);
  }

  // Collar for team manager
  if (role.accessory === 'collar') {
    dr(ctx, cx + 4, bodyBaseY, 6, 2, PALETTE.white);
  }

  // --- Arms ---
  const armBaseY = bodyBaseY + 2;
  if (facing === 'left' || facing === 'right') {
    // Side view: one arm visible
    const armSide = facing === 'left' ? -1 : 1;
    dr(ctx, cx + 6 + armSide * 4 + armRX, armBaseY + armRY, 3, 10, shirtC);
    dr(ctx, cx + 6 + armSide * 4 + armRX, armBaseY + 8 + armRY, 3, 2, skinC);
  } else {
    // Front/back view: both arms
    dr(ctx, cx - 1 + armLX, armBaseY + armLY, 3, 10, shirtC);
    dr(ctx, cx - 1 + armLX, armBaseY + 8 + armLY, 3, 2, skinC);
    dr(ctx, cx + 12 + armRX, armBaseY + armRY, 3, 10, shirtC);
    dr(ctx, cx + 12 + armRX, armBaseY + 8 + armRY, 3, 2, skinC);
  }

  // --- Head ---
  const headBaseY = cy + 4 + headY;
  // Head shape
  dr(ctx, cx + 3, headBaseY, 8, 12, skinC);

  // Hair
  if (facing === 'up') {
    dr(ctx, cx + 2, headBaseY - 1, 10, 5, hairC);
    dr(ctx, cx + 3, headBaseY + 4, 8, 2, hairC);
  } else {
    dr(ctx, cx + 2, headBaseY - 1, 10, 4, hairC);
  }

  // Face (only for front and side views)
  if (facing !== 'up') {
    // Eyes
    const eyeY = headBaseY + 5;
    if (facing === 'down') {
      dr(ctx, cx + 4 + eyeShift, eyeY, 2, 2, PALETTE.black);
      dr(ctx, cx + 8 + eyeShift, eyeY, 2, 2, PALETTE.black);
    } else {
      const ex = facing === 'left' ? cx + 3 : cx + 9;
      dr(ctx, ex + eyeShift, eyeY, 2, 2, PALETTE.black);
    }

    // Mouth
    if (mouthOpen) {
      dr(ctx, cx + 6, headBaseY + 9, 2, 1, PALETTE.red);
    }
  }

  // --- Accessories ---
  if (role.accessory === 'glasses' && facing !== 'up') {
    const glassC = role.glasses || PALETTE.lightGrey;
    if (facing === 'down') {
      dr(ctx, cx + 3, headBaseY + 4, 3, 3, glassC);
      dr(ctx, cx + 7, headBaseY + 4, 3, 3, glassC);
      dr(ctx, cx + 6, headBaseY + 5, 1, 1, glassC);
    } else {
      const gx = facing === 'left' ? cx + 2 : cx + 8;
      dr(ctx, gx, headBaseY + 4, 3, 3, glassC);
    }
  }

  if (role.accessory === 'headphones') {
    dr(ctx, cx + 1, headBaseY + 1, 2, 6, PALETTE.darkGrey);
    dr(ctx, cx + 11, headBaseY + 1, 2, 6, PALETTE.darkGrey);
    dr(ctx, cx + 2, headBaseY - 2, 10, 2, PALETTE.darkGrey);
  }

  if (role.accessory === 'clipboard' && (facing === 'down' || facing === 'right')) {
    dr(ctx, cx + 13, armBaseY + 4 + armRY, 3, 6, PALETTE.peach);
    dr(ctx, cx + 13, armBaseY + 3 + armRY, 3, 1, PALETTE.brown);
  }

  if (role.accessory === 'notebook' && (facing === 'down' || facing === 'left')) {
    dr(ctx, cx - 3 + armLX, armBaseY + 4 + armLY, 3, 5, PALETTE.white);
    dr(ctx, cx - 3 + armLX, armBaseY + 5 + armLY, 2, 3, PALETTE.blue);
  }
}

// Generate pose parameters for each animation frame
function getPose(animName, frameIdx) {
  const f = frameIdx;
  const walkCycle = [0, -1, 0, 1]; // leg offsets
  const bobCycle = [0, -1, 0, -1];

  switch (animName) {
    case 'walk-down':
      return {
        facing: 'down',
        headY: bobCycle[f],
        legLX: walkCycle[f], legRX: -walkCycle[f],
        legLY: f % 2 === 0 ? 0 : 1, legRY: f % 2 === 0 ? 1 : 0,
        armLY: walkCycle[f], armRY: -walkCycle[f],
      };
    case 'walk-up':
      return {
        facing: 'up',
        headY: bobCycle[f],
        legLX: walkCycle[f], legRX: -walkCycle[f],
        legLY: f % 2 === 0 ? 0 : 1, legRY: f % 2 === 0 ? 1 : 0,
        armLY: walkCycle[f], armRY: -walkCycle[f],
      };
    case 'walk-left':
      return {
        facing: 'left',
        headY: bobCycle[f],
        legLX: walkCycle[f], legRX: -walkCycle[f],
        legLY: f % 2 === 0 ? 0 : 1, legRY: f % 2 === 0 ? 1 : 0,
        armRY: walkCycle[f],
      };
    case 'walk-right':
      return {
        facing: 'right',
        headY: bobCycle[f],
        legLX: walkCycle[f], legRX: -walkCycle[f],
        legLY: f % 2 === 0 ? 0 : 1, legRY: f % 2 === 0 ? 1 : 0,
        armRY: -walkCycle[f],
      };
    case 'idle':
      return {
        facing: 'down',
        headY: f === 0 ? 0 : -1,
        bodyY: f === 0 ? 0 : -1,
      };
    case 'sitting-coding':
      return {
        facing: 'down',
        sitting: true,
        armLY: -4 + (f % 2 === 0 ? 0 : -1),
        armRY: -4 + (f % 2 === 0 ? -1 : 0),
        armLX: 2, armRX: -2,
      };
    case 'talking':
      return {
        facing: 'down',
        mouthOpen: f % 2 === 0,
        armRY: f < 2 ? -2 : 0,
        armRX: f < 2 ? 1 : 0,
        headY: f === 1 || f === 3 ? -1 : 0,
      };
    case 'thinking':
      return {
        facing: 'down',
        armRY: -4, armRX: -2,
        headY: f === 0 ? 0 : -1,
        eyeShift: 1,
      };
    default:
      return { facing: 'down' };
  }
}

// Generate the Phaser 3 atlas JSON for a character
function generateCharacterAtlas(roleId, imageFile) {
  const frames = {};
  let frameIdx = 0;

  for (const [animName, count] of Object.entries(ANIMATIONS)) {
    for (let i = 0; i < count; i++) {
      const col = frameIdx % COLS;
      const row = Math.floor(frameIdx / COLS);
      frames[`${roleId}_${animName}_${i}`] = {
        frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
        sourceSize: { w: FRAME_W, h: FRAME_H },
      };
      frameIdx++;
    }
  }

  return {
    frames,
    animations: Object.fromEntries(
      Object.entries(ANIMATIONS).map(([name, count]) => [
        `${roleId}_${name}`,
        Array.from({ length: count }, (_, i) => `${roleId}_${name}_${i}`),
      ])
    ),
    meta: {
      app: 'swarm-dev-studio-asset-gen',
      version: '1.0',
      image: imageFile,
      format: 'RGBA8888',
      size: { w: COLS * FRAME_W, h: ROWS * FRAME_H },
      scale: '1',
    },
  };
}

function generateCharacterSprites() {
  const outDir = path.join(ASSETS_DIR, 'sprites');
  ensureDir(outDir);

  const results = [];

  for (const role of ROLES) {
    const canvas = createCanvas(COLS * FRAME_W, ROWS * FRAME_H);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let frameIdx = 0;
    for (const [animName, count] of Object.entries(ANIMATIONS)) {
      for (let i = 0; i < count; i++) {
        const col = frameIdx % COLS;
        const row = Math.floor(frameIdx / COLS);
        const ox = col * FRAME_W;
        const oy = row * FRAME_H;
        const pose = getPose(animName, i);
        drawCharacter(ctx, ox, oy, role, pose);
        frameIdx++;
      }
    }

    const pngPath = path.join(outDir, `${role.id}.png`);
    saveCanvas(canvas, pngPath);

    const atlas = generateCharacterAtlas(role.id, `${role.id}.png`);
    const jsonPath = path.join(outDir, `${role.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(atlas, null, 2));
    console.log(`  Saved: ${path.relative(process.cwd(), jsonPath)}`);

    results.push({ role: role.id, pngPath, jsonPath });
  }

  return results;
}

module.exports = { generateCharacterSprites, ROLES, ANIMATIONS };
