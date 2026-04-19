// Office tilemap generator — produces a Tiled-compatible JSON map (80×60 tiles)
// Layout: lobby, corridors, exec offices, 6 team areas, meeting rooms, break room

const path = require('path');
const fs = require('fs');
const { ASSETS_DIR } = require('./utils');

// ── Tile IDs (must match office-tileset.js) ────────────────────────────────
const T = {
  // floors
  CARPET:        1,
  CARPET_ALPHA:  2,
  CARPET_BETA:   3,
  CARPET_GAMMA:  4,
  CARPET_DELTA:  5,
  CARPET_EPSILON:6,
  CARPET_ZETA:   7,
  HARDWOOD:      8,
  TILE_FLOOR:    9,
  LOBBY_FLOOR:  10,
  CORRIDOR:     11,
  GRASS:        12,
  // walls
  EXT_TOP:      13,
  EXT_SIDE:     14,
  INT_HORIZ:    15,
  INT_VERT:     16,
  GLASS_HORIZ:  17,
  GLASS_VERT:   18,
  WALL_CORNER:  19,
  WALL_ENDCAP:  20,
  // furniture
  DESK_L:       21,
  DESK_R:       22,
  CHAIR:        23,
  MONITOR:      24,
  KEYBOARD:     25,
  WHITEBOARD:   26,
  COFFEE:       27,
  PLANT:        28,
  BOOKSHELF:    29,
  MTG_TABLE_L:  30,
  MTG_TABLE_R:  31,
  WATER_COOLER: 32,
  PRINTER:      33,
  FILING_CAB:   34,
  COUCH_L:      35,
  COUCH_R:      36,
  TRASH:        37,
  LAMP:         38,
  // doors
  DOOR_CH:      39,
  DOOR_OH:      40,
  DOOR_CV:      41,
  DOOR_OV:      42,
  // decoration
  BANNER:       43,
  STATUS_SCR:   44,
  CLOCK:        45,
  ELEVATOR:     46,
  STAIRS:       47,
  RUG:          48,
  WINDOW:       49,
  EMPTY:         0,   // 0 means no tile in tiled format
};

const MAP_W = 80;
const MAP_H = 60;

// Team carpet tile IDs indexed 0-5 (6 teams used in the map layout)
const TEAM_CARPETS = [
  T.CARPET_ALPHA,
  T.CARPET_BETA,
  T.CARPET_GAMMA,
  T.CARPET_DELTA,
  T.CARPET_EPSILON,
  T.CARPET_ZETA,
];

// ── Layer helpers ──────────────────────────────────────────────────────────

function createLayer() {
  return new Array(MAP_W * MAP_H).fill(0);
}

function idx(x, y) { return y * MAP_W + x; }

function fillRect(layer, x, y, w, h, tile) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
        layer[idx(px, py)] = tile;
      }
    }
  }
}

function drawHLine(layer, x, y, len, tile) {
  fillRect(layer, x, y, len, 1, tile);
}

function drawVLine(layer, x, y, len, tile) {
  fillRect(layer, x, y, 1, len, tile);
}

/** Draw a room outline (walls on walls layer), fill on floor layer */
function drawRoom(floorL, wallsL, x, y, w, h, floorTile, opts = {}) {
  const {
    wallH = T.INT_HORIZ,
    wallV = T.INT_VERT,
    wallCorner = T.WALL_CORNER,
    exterior = false,
  } = opts;

  const wH = exterior ? T.EXT_TOP : wallH;
  const wV = exterior ? T.EXT_SIDE : wallV;
  const wC = wallCorner;

  // floor fill
  fillRect(floorL, x + 1, y + 1, w - 2, h - 2, floorTile);

  // walls
  drawHLine(wallsL, x + 1, y, w - 2, wH);          // top
  drawHLine(wallsL, x + 1, y + h - 1, w - 2, wH);  // bottom
  drawVLine(wallsL, x, y + 1, h - 2, wV);            // left
  drawVLine(wallsL, x + w - 1, y + 1, h - 2, wV);    // right
  // corners
  wallsL[idx(x, y)] = wC;
  wallsL[idx(x + w - 1, y)] = wC;
  wallsL[idx(x, y + h - 1)] = wC;
  wallsL[idx(x + w - 1, y + h - 1)] = wC;
}

/** Place a horizontal door in a horizontal wall at (x, y) */
function placeDoorH(wallsL, x, y) {
  wallsL[idx(x, y)] = T.DOOR_CH;
}

/** Place a vertical door in a vertical wall at (x, y) */
function placeDoorV(wallsL, x, y) {
  wallsL[idx(x, y)] = T.DOOR_CV;
}

// ── Object builders ────────────────────────────────────────────────────────

function makeObj(name, type, tileX, tileY, props = {}) {
  return {
    name,
    type,
    x: tileX * 16,
    y: tileY * 16,
    width: 16,
    height: 16,
    properties: props,
  };
}

// ── Main generator ─────────────────────────────────────────────────────────

function generateOfficeTilemap() {
  const floor     = createLayer();
  const walls     = createLayer();
  const furniture = createLayer();
  const above     = createLayer();
  const objects   = [];

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Fill entire map with grass (outside)
  // ═══════════════════════════════════════════════════════════════════════
  fillRect(floor, 0, 0, MAP_W, MAP_H, T.GRASS);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Building shell — exterior walls enclose the whole office
  //    Building occupies roughly cols 1-78, rows 1-58
  // ═══════════════════════════════════════════════════════════════════════
  const BX = 1, BY = 1, BW = 78, BH = 58;
  // Fill building interior with corridor first (default interior floor)
  fillRect(floor, BX + 1, BY + 1, BW - 2, BH - 2, T.CORRIDOR);
  // exterior walls
  drawHLine(walls, BX + 1, BY, BW - 2, T.EXT_TOP);
  drawHLine(walls, BX + 1, BY + BH - 1, BW - 2, T.EXT_TOP);
  drawVLine(walls, BX, BY + 1, BH - 2, T.EXT_SIDE);
  drawVLine(walls, BX + BW - 1, BY + 1, BH - 2, T.EXT_SIDE);
  walls[idx(BX, BY)] = T.WALL_CORNER;
  walls[idx(BX + BW - 1, BY)] = T.WALL_CORNER;
  walls[idx(BX, BY + BH - 1)] = T.WALL_CORNER;
  walls[idx(BX + BW - 1, BY + BH - 1)] = T.WALL_CORNER;

  // Windows on exterior walls
  for (let x = BX + 4; x < BX + BW - 4; x += 5) {
    above[idx(x, BY)] = T.WINDOW;
    above[idx(x, BY + BH - 1)] = T.WINDOW;
  }
  for (let y = BY + 4; y < BY + BH - 4; y += 5) {
    above[idx(BX, y)] = T.WINDOW;
    above[idx(BX + BW - 1, y)] = T.WINDOW;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. LOBBY — top of building (cols 2-77, rows 2-9)
  // ═══════════════════════════════════════════════════════════════════════
  const LOBBY = { x: 2, y: 2, w: 76, h: 8 };
  fillRect(floor, LOBBY.x, LOBBY.y, LOBBY.w, LOBBY.h, T.LOBBY_FLOOR);
  // lobby bottom wall
  drawHLine(walls, LOBBY.x, LOBBY.y + LOBBY.h, LOBBY.w, T.INT_HORIZ);

  // Lobby furniture
  // reception desk (center)
  furniture[idx(36, 4)] = T.DESK_L;
  furniture[idx(37, 4)] = T.DESK_R;
  furniture[idx(36, 5)] = T.CHAIR;
  furniture[idx(37, 5)] = T.MONITOR;

  // plants
  furniture[idx(5, 3)]  = T.PLANT;
  furniture[idx(72, 3)] = T.PLANT;
  furniture[idx(5, 7)]  = T.PLANT;
  furniture[idx(72, 7)] = T.PLANT;

  // couches (waiting area)
  furniture[idx(55, 5)] = T.COUCH_L;
  furniture[idx(56, 5)] = T.COUCH_R;
  furniture[idx(60, 5)] = T.COUCH_L;
  furniture[idx(61, 5)] = T.COUCH_R;

  // rugs
  furniture[idx(37, 6)] = T.RUG;
  furniture[idx(38, 6)] = T.RUG;

  // elevator
  furniture[idx(10, 2)] = T.ELEVATOR;
  furniture[idx(14, 2)] = T.STAIRS;

  // lobby doors (entrance from exterior)
  placeDoorH(walls, 38, BY);
  placeDoorH(walls, 39, BY);

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Main horizontal corridors (3 tiles wide)
  //    - Row 10-12: connects lobby to offices
  //    - Row 28-30: mid corridor
  //    - Row 48-50: lower corridor
  // ═══════════════════════════════════════════════════════════════════════
  const CORR_W = BW - 2;
  const CORR_X = BX + 1;

  // corridor at rows 10-12
  fillRect(floor, CORR_X, 10, CORR_W, 3, T.CORRIDOR);
  // corridor at rows 28-30
  fillRect(floor, CORR_X, 28, CORR_W, 3, T.CORRIDOR);
  // corridor at rows 48-50
  fillRect(floor, CORR_X, 48, CORR_W, 3, T.CORRIDOR);

  // Left vertical corridor (cols 12-14) connecting all horizontal corridors
  fillRect(floor, 12, 10, 3, 41, T.CORRIDOR);

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Executive offices — left side (cols 2-11)
  // ═══════════════════════════════════════════════════════════════════════

  // CEO Office (cols 2-11, rows 13-24) — 10w × 12h
  const CEO = { x: 2, y: 13, w: 10, h: 12 };
  fillRect(floor, CEO.x, CEO.y, CEO.w, CEO.h, T.HARDWOOD);
  drawHLine(walls, CEO.x, CEO.y, CEO.w, T.INT_HORIZ);
  drawHLine(walls, CEO.x, CEO.y + CEO.h - 1, CEO.w, T.INT_HORIZ);
  drawVLine(walls, CEO.x + CEO.w - 1, CEO.y, CEO.h, T.INT_VERT);
  placeDoorV(walls, CEO.x + CEO.w - 1, CEO.y + 5);
  // CEO furniture
  furniture[idx(4, 15)] = T.DESK_L;
  furniture[idx(5, 15)] = T.DESK_R;
  furniture[idx(5, 16)] = T.MONITOR;
  furniture[idx(4, 16)] = T.KEYBOARD;
  furniture[idx(5, 17)] = T.CHAIR;
  furniture[idx(3, 14)] = T.BOOKSHELF;
  furniture[idx(8, 14)] = T.PLANT;
  furniture[idx(3, 21)] = T.FILING_CAB;
  // CEO spawn
  objects.push(makeObj('spawn_ceo', 'spawn', 6, 18, { role: 'ceo' }));
  objects.push(makeObj('desk_ceo', 'desk', 4, 15, { team: 'executive', seatDir: 'down' }));

  // CTO Office (cols 2-11, rows 25-36) — 10w × 12h
  const CTO = { x: 2, y: 25, w: 10, h: 12 };
  fillRect(floor, CTO.x, CTO.y, CTO.w, CTO.h, T.HARDWOOD);
  drawHLine(walls, CTO.x, CTO.y, CTO.w, T.INT_HORIZ);
  drawHLine(walls, CTO.x, CTO.y + CTO.h - 1, CTO.w, T.INT_HORIZ);
  drawVLine(walls, CTO.x + CTO.w - 1, CTO.y, CTO.h, T.INT_VERT);
  placeDoorV(walls, CTO.x + CTO.w - 1, CTO.y + 5);
  // CTO furniture — dual monitors
  furniture[idx(4, 27)] = T.DESK_L;
  furniture[idx(5, 27)] = T.DESK_R;
  furniture[idx(4, 28)] = T.MONITOR;
  furniture[idx(5, 28)] = T.MONITOR;
  furniture[idx(5, 29)] = T.CHAIR;
  furniture[idx(3, 26)] = T.WHITEBOARD;
  furniture[idx(8, 26)] = T.BOOKSHELF;
  furniture[idx(3, 33)] = T.PLANT;
  // CTO spawn
  objects.push(makeObj('spawn_cto', 'spawn', 6, 30, { role: 'cto' }));
  objects.push(makeObj('desk_cto', 'desk', 4, 27, { team: 'executive', seatDir: 'down' }));

  // Leadership Meeting Room (cols 2-11, rows 37-47) — 10w × 11h
  const LDR_MTG = { x: 2, y: 37, w: 10, h: 11 };
  fillRect(floor, LDR_MTG.x, LDR_MTG.y, LDR_MTG.w, LDR_MTG.h, T.HARDWOOD);
  drawHLine(walls, LDR_MTG.x, LDR_MTG.y, LDR_MTG.w, T.INT_HORIZ);
  drawHLine(walls, LDR_MTG.x, LDR_MTG.y + LDR_MTG.h - 1, LDR_MTG.w, T.INT_HORIZ);
  drawVLine(walls, LDR_MTG.x + LDR_MTG.w - 1, LDR_MTG.y, LDR_MTG.h, T.INT_VERT);
  placeDoorV(walls, LDR_MTG.x + LDR_MTG.w - 1, LDR_MTG.y + 4);
  // meeting table
  furniture[idx(5, 40)] = T.MTG_TABLE_L;
  furniture[idx(6, 40)] = T.MTG_TABLE_R;
  // chairs around table
  furniture[idx(4, 40)] = T.CHAIR;
  furniture[idx(7, 40)] = T.CHAIR;
  furniture[idx(5, 39)] = T.CHAIR;
  furniture[idx(6, 39)] = T.CHAIR;
  furniture[idx(5, 41)] = T.CHAIR;
  furniture[idx(6, 41)] = T.CHAIR;
  furniture[idx(3, 38)] = T.WHITEBOARD;
  furniture[idx(8, 38)] = T.STATUS_SCR;
  objects.push(makeObj('meeting_spot_leader', 'meeting', 5, 40, { room: 'leader_mtg' }));

  // Senior manager spawn (in corridor near exec area)
  objects.push(makeObj('spawn_senior_manager', 'spawn', 13, 20, { role: 'senior_manager' }));

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Team areas — right of vertical corridor
  //    Upper row (rows 13-27): Teams 1, 2, 3
  //    Lower row (rows 31-47): Teams 4, 5
  // ═══════════════════════════════════════════════════════════════════════

  function buildTeamArea(teamIdx, areaX, areaY, teamName) {
    const carpetTile = TEAM_CARPETS[teamIdx];

    // ── Main team workspace: 16w × 14h ──
    const TW = 16, TH = 14;
    fillRect(floor, areaX, areaY, TW, TH, carpetTile);
    // borders
    drawHLine(walls, areaX, areaY, TW, T.INT_HORIZ);
    drawHLine(walls, areaX, areaY + TH - 1, TW, T.INT_HORIZ);
    drawVLine(walls, areaX, areaY, TH, T.INT_VERT);
    drawVLine(walls, areaX + TW - 1, areaY, TH, T.INT_VERT);
    walls[idx(areaX, areaY)] = T.WALL_CORNER;
    walls[idx(areaX + TW - 1, areaY)] = T.WALL_CORNER;
    walls[idx(areaX, areaY + TH - 1)] = T.WALL_CORNER;
    walls[idx(areaX + TW - 1, areaY + TH - 1)] = T.WALL_CORNER;

    // door from corridor
    placeDoorH(walls, areaX + 4, areaY);

    // team banner
    above[idx(areaX + 1, areaY + 1)] = T.BANNER;

    // Desks — 3 rows of 2 desks each (6 desks total)
    const deskPositions = [];
    for (let row = 0; row < 3; row++) {
      const dy = areaY + 2 + row * 4;
      // desk pair 1
      const dx1 = areaX + 2;
      furniture[idx(dx1, dy)]     = T.DESK_L;
      furniture[idx(dx1 + 1, dy)] = T.DESK_R;
      furniture[idx(dx1, dy + 1)] = T.MONITOR;
      furniture[idx(dx1 + 1, dy + 1)] = T.KEYBOARD;
      furniture[idx(dx1 + 1, dy + 2)] = T.CHAIR;
      deskPositions.push({ x: dx1, y: dy, seatDir: 'down' });

      // desk pair 2
      const dx2 = areaX + 6;
      furniture[idx(dx2, dy)]     = T.DESK_L;
      furniture[idx(dx2 + 1, dy)] = T.DESK_R;
      furniture[idx(dx2, dy + 1)] = T.MONITOR;
      furniture[idx(dx2 + 1, dy + 1)] = T.KEYBOARD;
      furniture[idx(dx2 + 1, dy + 2)] = T.CHAIR;
      deskPositions.push({ x: dx2, y: dy, seatDir: 'down' });
    }

    // register desk objects
    deskPositions.forEach((dp, i) => {
      objects.push(makeObj(
        `desk_${teamName}_${i + 1}`, 'desk',
        dp.x, dp.y,
        { team: teamName, seatDir: dp.seatDir }
      ));
    });

    // Printer + trash
    furniture[idx(areaX + 12, areaY + 2)] = T.PRINTER;
    furniture[idx(areaX + 12, areaY + 5)] = T.TRASH;

    // ── Manager office partition: 8w × 7h (glass walls) ──
    const MX = areaX + TW, MY = areaY;
    const MW = 8, MH = TH;
    fillRect(floor, MX, MY, MW, MH, carpetTile);
    drawHLine(walls, MX, MY, MW, T.INT_HORIZ);
    drawHLine(walls, MX, MY + MH - 1, MW, T.INT_HORIZ);
    drawVLine(walls, MX, MY + 1, MH - 2, T.GLASS_VERT);
    drawVLine(walls, MX + MW - 1, MY, MH, T.INT_VERT);
    walls[idx(MX, MY)] = T.WALL_CORNER;
    walls[idx(MX + MW - 1, MY)] = T.WALL_CORNER;
    walls[idx(MX, MY + MH - 1)] = T.WALL_CORNER;
    walls[idx(MX + MW - 1, MY + MH - 1)] = T.WALL_CORNER;
    placeDoorV(walls, MX, MY + 5);

    // manager desk
    furniture[idx(MX + 2, MY + 3)] = T.DESK_L;
    furniture[idx(MX + 3, MY + 3)] = T.DESK_R;
    furniture[idx(MX + 2, MY + 4)] = T.MONITOR;
    furniture[idx(MX + 3, MY + 4)] = T.CHAIR;
    furniture[idx(MX + 5, MY + 2)] = T.PLANT;
    objects.push(makeObj(`desk_mgr_${teamName}`, 'desk', MX + 2, MY + 3, { team: teamName, seatDir: 'down' }));

    return deskPositions;
  }

  // ── Upper row teams (rows 13-27) ──
  // Team 1 (alpha) — starts at col 15
  buildTeamArea(0, 15, 13, 'alpha');
  objects.push(makeObj('spawn_team_manager_1', 'spawn', 41, 17, { role: 'team_manager_1' }));

  // Team 2 (beta) — starts at col 39
  buildTeamArea(1, 39, 13, 'beta');
  objects.push(makeObj('spawn_team_manager_2', 'spawn', 65, 17, { role: 'team_manager_2' }));

  // Team 3 (gamma) — occupies the right edge, smaller. Use partial approach
  // Cols 63-78, rows 13-27 = 16w
  buildTeamArea(2, 55, 13, 'gamma');
  objects.push(makeObj('spawn_team_manager_3', 'spawn', 71, 17, { role: 'team_manager_3' }));

  // ── Lower row teams (rows 31-45) ──
  // Team 4 (delta)
  buildTeamArea(3, 15, 31, 'delta');
  objects.push(makeObj('spawn_team_manager_4', 'spawn', 41, 35, { role: 'team_manager_4' }));

  // Team 5 (epsilon)
  buildTeamArea(4, 39, 31, 'epsilon');
  objects.push(makeObj('spawn_team_manager_5', 'spawn', 65, 35, { role: 'team_manager_5' }));

  // Team 6 (zeta — Security)
  buildTeamArea(5, 55, 31, 'zeta');
  objects.push(makeObj('spawn_team_manager_6', 'spawn', 71, 35, { role: 'team_manager_6' }));

  // ═══════════════════════════════════════════════════════════════════════
  // 7. Break Room (cols 15-26, rows 47-55) — 12w × 9h
  // ═══════════════════════════════════════════════════════════════════════
  const BRK = { x: 15, y: 47, w: 12, h: 9 };
  fillRect(floor, BRK.x, BRK.y, BRK.w, BRK.h, T.TILE_FLOOR);
  drawHLine(walls, BRK.x, BRK.y, BRK.w, T.INT_HORIZ);
  drawHLine(walls, BRK.x, BRK.y + BRK.h - 1, BRK.w, T.INT_HORIZ);
  drawVLine(walls, BRK.x, BRK.y, BRK.h, T.INT_VERT);
  drawVLine(walls, BRK.x + BRK.w - 1, BRK.y, BRK.h, T.INT_VERT);
  walls[idx(BRK.x, BRK.y)] = T.WALL_CORNER;
  walls[idx(BRK.x + BRK.w - 1, BRK.y)] = T.WALL_CORNER;
  walls[idx(BRK.x, BRK.y + BRK.h - 1)] = T.WALL_CORNER;
  walls[idx(BRK.x + BRK.w - 1, BRK.y + BRK.h - 1)] = T.WALL_CORNER;
  placeDoorH(walls, BRK.x + 4, BRK.y);

  // break room furniture
  furniture[idx(BRK.x + 2, BRK.y + 2)] = T.COFFEE;
  furniture[idx(BRK.x + 4, BRK.y + 2)] = T.WATER_COOLER;
  furniture[idx(BRK.x + 6, BRK.y + 2)] = T.BOOKSHELF; // vending placeholder
  furniture[idx(BRK.x + 2, BRK.y + 5)] = T.COUCH_L;
  furniture[idx(BRK.x + 3, BRK.y + 5)] = T.COUCH_R;
  furniture[idx(BRK.x + 5, BRK.y + 7)] = T.DESK_L;
  furniture[idx(BRK.x + 6, BRK.y + 7)] = T.DESK_R;
  furniture[idx(BRK.x + 5, BRK.y + 8)] = T.CHAIR;
  furniture[idx(BRK.x + 6, BRK.y + 8)] = T.CHAIR;
  furniture[idx(BRK.x + 8, BRK.y + 9)] = T.TRASH;

  // ═══════════════════════════════════════════════════════════════════════
  // 8. Large Meeting Room (cols 29-40, rows 47-57) — 12w × 11h
  // ═══════════════════════════════════════════════════════════════════════
  const LRG_MTG = { x: 29, y: 47, w: 12, h: 11 };
  fillRect(floor, LRG_MTG.x, LRG_MTG.y, LRG_MTG.w, LRG_MTG.h, T.TILE_FLOOR);
  drawHLine(walls, LRG_MTG.x, LRG_MTG.y, LRG_MTG.w, T.INT_HORIZ);
  drawHLine(walls, LRG_MTG.x, LRG_MTG.y + LRG_MTG.h - 1, LRG_MTG.w, T.INT_HORIZ);
  drawVLine(walls, LRG_MTG.x, LRG_MTG.y, LRG_MTG.h, T.INT_VERT);
  drawVLine(walls, LRG_MTG.x + LRG_MTG.w - 1, LRG_MTG.y, LRG_MTG.h, T.INT_VERT);
  walls[idx(LRG_MTG.x, LRG_MTG.y)] = T.WALL_CORNER;
  walls[idx(LRG_MTG.x + LRG_MTG.w - 1, LRG_MTG.y)] = T.WALL_CORNER;
  walls[idx(LRG_MTG.x, LRG_MTG.y + LRG_MTG.h - 1)] = T.WALL_CORNER;
  walls[idx(LRG_MTG.x + LRG_MTG.w - 1, LRG_MTG.y + LRG_MTG.h - 1)] = T.WALL_CORNER;
  placeDoorH(walls, LRG_MTG.x + 4, LRG_MTG.y);

  // large meeting table (center)
  furniture[idx(LRG_MTG.x + 4, LRG_MTG.y + 5)] = T.MTG_TABLE_L;
  furniture[idx(LRG_MTG.x + 5, LRG_MTG.y + 5)] = T.MTG_TABLE_R;
  furniture[idx(LRG_MTG.x + 4, LRG_MTG.y + 7)] = T.MTG_TABLE_L;
  furniture[idx(LRG_MTG.x + 5, LRG_MTG.y + 7)] = T.MTG_TABLE_R;
  // chairs (5 per side)
  for (let i = 0; i < 5; i++) {
    furniture[idx(LRG_MTG.x + 3, LRG_MTG.y + 4 + i * 2)] = T.CHAIR;
    furniture[idx(LRG_MTG.x + 6, LRG_MTG.y + 4 + i * 2)] = T.CHAIR;
  }
  furniture[idx(LRG_MTG.x + 2, LRG_MTG.y + 2)] = T.WHITEBOARD;
  furniture[idx(LRG_MTG.x + 8, LRG_MTG.y + 2)] = T.STATUS_SCR;
  objects.push(makeObj('meeting_spot_large', 'meeting', LRG_MTG.x + 5, LRG_MTG.y + 6, { room: 'large_mtg' }));

  // ═══════════════════════════════════════════════════════════════════════
  // 9. Small Meeting Rooms (3 rooms, cols 43+)
  // ═══════════════════════════════════════════════════════════════════════
  for (let r = 0; r < 3; r++) {
    const smX = 43 + r * 12;
    const smY = 51;
    const smW = 10;
    const smH = 7;
    fillRect(floor, smX, smY, smW, smH, T.CARPET);
    drawHLine(walls, smX, smY, smW, T.INT_HORIZ);
    drawHLine(walls, smX, smY + smH - 1, smW, T.INT_HORIZ);
    drawVLine(walls, smX, smY, smH, T.INT_VERT);
    drawVLine(walls, smX + smW - 1, smY, smH, T.INT_VERT);
    walls[idx(smX, smY)] = T.WALL_CORNER;
    walls[idx(smX + smW - 1, smY)] = T.WALL_CORNER;
    walls[idx(smX, smY + smH - 1)] = T.WALL_CORNER;
    walls[idx(smX + smW - 1, smY + smH - 1)] = T.WALL_CORNER;
    placeDoorH(walls, smX + 3, smY);

    // small table + chairs
    furniture[idx(smX + 3, smY + 3)] = T.DESK_L;
    furniture[idx(smX + 4, smY + 3)] = T.DESK_R;
    furniture[idx(smX + 2, smY + 3)] = T.CHAIR;
    furniture[idx(smX + 5, smY + 3)] = T.CHAIR;
    furniture[idx(smX + 3, smY + 2)] = T.CHAIR;
    furniture[idx(smX + 4, smY + 4)] = T.CHAIR;
    objects.push(makeObj(`meeting_spot_small_${r + 1}`, 'meeting', smX + 4, smY + 3, { room: `small_mtg_${r + 1}` }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. Restrooms area (cols 2-11, rows 51-57)
  // ═══════════════════════════════════════════════════════════════════════
  const REST = { x: 2, y: 51, w: 10, h: 7 };
  fillRect(floor, REST.x, REST.y, REST.w, REST.h, T.TILE_FLOOR);
  drawHLine(walls, REST.x, REST.y, REST.w, T.INT_HORIZ);
  drawHLine(walls, REST.x, REST.y + REST.h - 1, REST.w, T.INT_HORIZ);
  drawVLine(walls, REST.x, REST.y, REST.h, T.INT_VERT);
  drawVLine(walls, REST.x + REST.w - 1, REST.y, REST.h, T.INT_VERT);
  walls[idx(REST.x, REST.y)] = T.WALL_CORNER;
  walls[idx(REST.x + REST.w - 1, REST.y)] = T.WALL_CORNER;
  walls[idx(REST.x, REST.y + REST.h - 1)] = T.WALL_CORNER;
  walls[idx(REST.x + REST.w - 1, REST.y + REST.h - 1)] = T.WALL_CORNER;
  placeDoorH(walls, REST.x + 3, REST.y);

  // ═══════════════════════════════════════════════════════════════════════
  // 11. Spawn points for all roles
  // ═══════════════════════════════════════════════════════════════════════

  // PM spawns in corridor near team areas
  objects.push(makeObj('spawn_pm', 'spawn', 30, 11, { role: 'pm' }));

  // Senior devs — near team areas
  objects.push(makeObj('spawn_senior_dev_1', 'spawn', 20, 15, { role: 'senior_dev_1' }));
  objects.push(makeObj('spawn_senior_dev_2', 'spawn', 44, 15, { role: 'senior_dev_2' }));
  objects.push(makeObj('spawn_senior_dev_3', 'spawn', 60, 15, { role: 'senior_dev_3' }));

  // Devs — in team areas
  objects.push(makeObj('spawn_dev_1', 'spawn', 18, 18, { role: 'dev_1' }));
  objects.push(makeObj('spawn_dev_2', 'spawn', 22, 18, { role: 'dev_2' }));
  objects.push(makeObj('spawn_dev_3', 'spawn', 42, 18, { role: 'dev_3' }));
  objects.push(makeObj('spawn_dev_4', 'spawn', 46, 18, { role: 'dev_4' }));
  objects.push(makeObj('spawn_dev_5', 'spawn', 58, 18, { role: 'dev_5' }));

  // QA — in lower team areas
  objects.push(makeObj('spawn_qa_1', 'spawn', 18, 36, { role: 'qa_1' }));
  objects.push(makeObj('spawn_qa_2', 'spawn', 42, 36, { role: 'qa_2' }));

  // Testers
  objects.push(makeObj('spawn_tester_1', 'spawn', 22, 36, { role: 'tester_1' }));
  objects.push(makeObj('spawn_tester_2', 'spawn', 46, 36, { role: 'tester_2' }));

  // ═══════════════════════════════════════════════════════════════════════
  // 12. A few corridor lamps and clocks
  // ═══════════════════════════════════════════════════════════════════════
  above[idx(20, 10)] = T.LAMP;
  above[idx(40, 10)] = T.LAMP;
  above[idx(60, 10)] = T.LAMP;
  above[idx(20, 28)] = T.LAMP;
  above[idx(40, 28)] = T.LAMP;
  above[idx(60, 28)] = T.LAMP;
  above[idx(20, 48)] = T.LAMP;
  above[idx(40, 48)] = T.LAMP;

  above[idx(30, 10)] = T.CLOCK;
  above[idx(50, 28)] = T.CLOCK;

  // ═══════════════════════════════════════════════════════════════════════
  // Build Tiled-compatible JSON
  // ═══════════════════════════════════════════════════════════════════════

  function makeTileLayer(name, data) {
    return {
      name,
      type: 'tilelayer',
      width: MAP_W,
      height: MAP_H,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      data,
    };
  }

  const map = {
    width: MAP_W,
    height: MAP_H,
    tilewidth: 16,
    tileheight: 16,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tilesets: [{
      firstgid: 1,
      source: '../tiles/office-tileset.json',
    }],
    layers: [
      makeTileLayer('floor', floor),
      makeTileLayer('walls', walls),
      makeTileLayer('furniture', furniture),
      makeTileLayer('above', above),
      {
        name: 'objects',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        objects,
      },
    ],
  };

  // ── Write output ──
  const mapsDir = path.join(ASSETS_DIR, 'maps');
  fs.mkdirSync(mapsDir, { recursive: true });
  const mapPath = path.join(mapsDir, 'office-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
  console.log(`  Saved: ${path.relative(process.cwd(), mapPath)}`);

  return {
    mapPath,
    mapSize: { width: MAP_W, height: MAP_H },
    pixelSize: { width: MAP_W * 16, height: MAP_H * 16 },
    layerCount: map.layers.length,
    objectCount: objects.length,
  };
}

module.exports = { generateOfficeTilemap };
