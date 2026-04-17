// PICO-8 inspired 16-color palette for pixel art
// Each color is [R, G, B, A]
const PALETTE = {
  black:      [0,   0,   0,   255],
  darkBlue:   [29,  43,  83,  255],
  darkPurple: [126, 37,  83,  255],
  darkGreen:  [0,   135, 81,  255],
  brown:      [171, 82,  54,  255],
  darkGrey:   [95,  87,  79,  255],
  lightGrey:  [194, 195, 199, 255],
  white:      [255, 241, 232, 255],
  red:        [255, 0,   77,  255],
  orange:     [255, 163, 0,   255],
  yellow:     [255, 236, 39,  255],
  green:      [0,   228, 54,  255],
  blue:       [41,  173, 255, 255],
  lavender:   [131, 118, 156, 255],
  pink:       [255, 119, 168, 255],
  peach:      [255, 204, 170, 255],
};

// Skin tone variants
const SKIN_TONES = {
  light:  [255, 220, 190],
  medium: [222, 178, 139],
  tan:    [190, 140, 100],
  dark:   [139, 90,  60],
};

// Team colors for carpet/banners
const TEAM_COLORS = [
  { name: 'alpha',   primary: PALETTE.blue,       secondary: PALETTE.darkBlue },
  { name: 'beta',    primary: PALETTE.green,       secondary: PALETTE.darkGreen },
  { name: 'gamma',   primary: PALETTE.orange,      secondary: PALETTE.brown },
  { name: 'delta',   primary: PALETTE.pink,        secondary: PALETTE.darkPurple },
  { name: 'epsilon', primary: PALETTE.yellow,       secondary: PALETTE.orange },
  { name: 'zeta',    primary: PALETTE.lavender,    secondary: PALETTE.darkPurple },
];

function colorToHex([r, g, b]) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function colorToRgba([r, g, b, a = 255]) {
  return `rgba(${r},${g},${b},${a / 255})`;
}

module.exports = { PALETTE, SKIN_TONES, TEAM_COLORS, colorToHex, colorToRgba };
