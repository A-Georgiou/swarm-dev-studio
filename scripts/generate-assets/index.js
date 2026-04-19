const fs = require('fs');
const path = require('path');
const { ASSETS_DIR, ensureDir } = require('./utils');

// ---------------------------------------------------------------------------
// Generator registry — each entry: [label, requirePath, exportName]
// ---------------------------------------------------------------------------
const GENERATORS = [
  ['Generating character sprites', './character-sprites', 'generateCharacterSprites'],
  ['Generating office tileset', './office-tileset', 'generateOfficeTileset'],
  ['Generating office tilemap', './office-tilemap', 'generateOfficeTilemap'],
  ['Generating UI assets', './ui-assets', 'generateUIAssets'],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return total;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(full);
    } else {
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Manifest generation
// ---------------------------------------------------------------------------

function buildManifest(allResults) {
  // Build character list dynamically from generator results
  const { ROLES } = require('./character-sprites');
  const characters = ROLES.map(r => ({
    role: r.id,
    spriteSheet: `sprites/${r.id}.png`,
    atlas: `sprites/${r.id}.json`,
    frameSize: { w: 32, h: 48 },
  }));

  return {
    version: '1.0.0',
    generated: new Date().toISOString(),
    assets: {
      sprites: {
        characters,
      },
      tiles: {
        tileset: {
          image: 'tiles/office-tileset.png',
          metadata: 'tiles/office-tileset.json',
          tileSize: 16,
          tileCount: 50,
        },
      },
      maps: {
        office: {
          file: 'maps/office-map.json',
          width: 80,
          height: 60,
        },
      },
      ui: {
        speechBubble: 'ui/speech-bubble.png',
        thoughtBubble: 'ui/thought-bubble.png',
        statusIcons: {
          spriteSheet: 'ui/status-icons.png',
          atlas: 'ui/status-icons.json',
        },
        teamColors: 'ui/team-colors.png',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

async function generateAll() {
  const startTime = Date.now();

  console.log('');
  console.log('🎮 Swarm Dev Studio — Asset Generator');
  console.log('='.repeat(42));
  console.log('');

  // Clean output directory
  console.log('Cleaning output directory...');
  cleanDir(ASSETS_DIR);
  console.log(`  Cleaned: ${path.relative(process.cwd(), ASSETS_DIR)}/`);
  console.log('');

  const total = GENERATORS.length;
  const allResults = [];
  const errors = [];

  for (let i = 0; i < total; i++) {
    const [label, modPath, fnName] = GENERATORS[i];
    const step = `[${i + 1}/${total}]`;
    console.log(`${step} ${label}...`);

    const stepStart = Date.now();
    try {
      const mod = require(modPath);
      const fn = mod[fnName];
      if (typeof fn !== 'function') {
        throw new Error(`${fnName} is not a function in ${modPath}`);
      }
      const result = fn();
      const results = Array.isArray(result) ? result : [result];
      allResults.push(...results);
      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.log(`  ✅ Done (${elapsed}s) — ${results.length} asset(s)`);
    } catch (err) {
      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(2);
      console.error(`  ❌ Failed (${elapsed}s): ${err.message}`);
      errors.push({ step: label, error: err });
    }
    console.log('');
  }

  // Generate manifest
  console.log('Writing manifest...');
  const manifest = buildManifest(allResults);
  const manifestPath = path.join(ASSETS_DIR, 'manifest.json');
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  Saved: ${path.relative(process.cwd(), manifestPath)}`);
  console.log('');

  // Summary
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const fileCount = countFiles(ASSETS_DIR);
  const totalSize = dirSize(ASSETS_DIR);

  console.log('='.repeat(42));
  console.log(`📦 Total assets generated: ${fileCount} files`);
  console.log(`💾 Total file size: ${formatBytes(totalSize)}`);
  console.log(`⏱  Time elapsed: ${totalElapsed}s`);

  if (errors.length > 0) {
    console.log('');
    console.log(`⚠️  ${errors.length} generator(s) failed:`);
    errors.forEach(({ step, error }) => {
      console.log(`   - ${step}: ${error.message}`);
    });
  }

  console.log('');

  return { manifest, results: allResults, errors };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  generateAll()
    .then(({ errors }) => {
      if (errors.length > 0) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { generateAll };
