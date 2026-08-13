// ─── Shared Utilities & Constants ────────────────────────────────────────────

/**
 * Convert HSV to RGB [0-255] triple.
 * h: 0-360, s: 0-100, v: 0-100
 */
export function hsv(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s /= 100; v /= 100;
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if      (h <  60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return [r, g, b].map(z => Math.round((z + m) * 255));
}

/** All verified non-experimental effects for AULA F87 */
export const effects = [
  { id:0,  name:"OFF",                 speed:false, color:false, colorfulOnly:false },
  { id:1,  name:"Fixed On",            speed:false, color:true,  colorful:false     },
  { id:2,  name:"Respire",             speed:true,  color:true,  colorful:true      },
  { id:3,  name:"Rainbow",             speed:true,  color:false, colorfulOnly:true  },
  { id:4,  name:"Flash Away",          speed:true,  color:true,  colorful:true      },
  { id:5,  name:"Raindrops",           speed:true,  color:true,  colorful:true      },
  { id:7,  name:"Ripples Shining",     speed:true,  color:true,  colorful:true      },
  { id:8,  name:"Stars Twinkle",       speed:true,  color:true,  colorful:true      },
  { id:10, name:"Retro Snake",         speed:true,  color:true,  colorful:true      },
  { id:11, name:"Neon Stream",         speed:true,  color:true,  colorful:true      },
  { id:12, name:"Reaction",            speed:true,  color:true,  colorful:true      },
  { id:13, name:"Sine Wave",           speed:true,  color:true,  colorful:true      },
  { id:15, name:"Rotating Windmill",   speed:true,  color:false, colorfulOnly:true  },
  { id:16, name:"Colorful Waterfall",  speed:true,  color:false, colorfulOnly:true  },
  { id:17, name:"Blossoming",          speed:true,  color:false, colorfulOnly:true  },
];

export const audioModes = [
  "Audio dance – soft",
  "Dazzling – rock",
  "Clouds rise and snow fly",
  "Light Field Change – voice",
  "The gurgling stream",
  "Blooming – passion",
  "Pearl falling jade plate",
  "Clouds follow the moon",
  "Mountains and Flowing Waters",
  "Raining like silk – regular",
];

/**
 * LED index → [x, y] grid positions for 87-key TKL layout.
 * Ordered as: [ledIndex, gridX, gridY]
 */
export const KEY_LAYOUT = [
  // Row 0 – Fn / Esc row
  [0,0,0],[12,1,0],[18,2,0],[24,3,0],[30,4,0],[36,5,0],[42,6,0],[48,7,0],[54,8,0],[60,9,0],[66,10,0],[72,11,0],[78,12,0],[84,13,0],[90,14,0],[96,15,0],
  // Row 1 – Number row
  [1,0,1],[7,1,1],[13,2,1],[19,3,1],[25,4,1],[31,5,1],[37,6,1],[43,7,1],[49,8,1],[55,9,1],[61,10,1],[67,11,1],[73,12,1],[79,13,1],[85,14,1],[91,15,1],[97,16,1],
  // Row 2 – QWERTY
  [2,0,2],[8,1,2],[14,2,2],[20,3,2],[26,4,2],[32,5,2],[38,6,2],[44,7,2],[50,8,2],[56,9,2],[62,10,2],[68,11,2],[74,12,2],[80,13,2],[86,14,2],[92,15,2],[98,16,2],
  // Row 3 – ASDF (no right-nav)
  [3,0,3],[9,1,3],[15,2,3],[21,3,3],[27,4,3],[33,5,3],[39,6,3],[45,7,3],[51,8,3],[57,9,3],[63,10,3],[69,11,3],[81,13,3],
  // Row 4 – ZXCV
  [4,0,4],[10,1,4],[16,2,4],[22,3,4],[28,4,4],[34,5,4],[40,6,4],[46,7,4],[52,8,4],[58,9,4],[64,10,4],[82,13,4],[94,15,4],
  // Row 5 – Space bar row
  [5,0,5],[11,1,5],[17,2,5],[35,5,5],[53,9,5],[59,10,5],[65,11,5],[83,13,5],[89,14,5],[95,15,5],[101,16,5],
];

/**
 * Pre-computed serpentine snake path through all LED positions.
 * Each element is a ledIndex. Row 0 goes L→R, Row 1 goes R→L, alternating.
 */
const _keysByRow = {};
KEY_LAYOUT.forEach(([idx, x, y]) => {
  if (!_keysByRow[y]) _keysByRow[y] = [];
  _keysByRow[y].push({ idx, x });
});
export const SNAKE_PATH = [];
for (let y = 0; y <= 5; y++) {
  if (!_keysByRow[y]) continue;
  const row = [..._keysByRow[y]].sort((a, b) => a.x - b.x).map(k => k.idx);
  if (y % 2 === 0) SNAKE_PATH.push(...row);
  else             SNAKE_PATH.push(...[...row].reverse());
}

/** Total snake path length */
export const SNAKE_LEN = SNAKE_PATH.length;

/**
 * Corrected 520-byte OEM palette template (Feature Report 0x06 / Cmd 0x0A).
 * custom RGB bytes are at offsets [29, 30, 31].
 */
export const PALETTE_HEX =
  "060a000001000002000000000000000000000000000000000000000000ff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00" +
  "ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff" +
  "00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00" +
  "ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ff" +
  "ffffffffff000000ff000000ffffff00ff00ff00ffffffffffff800000ff000000ffffff00ff00ff00ffffffffff000000000000000000000000000000000000" +
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
  "00005aa500000000";

export function hexToBytes(s) {
  // Strip whitespace just in case
  s = s.replace(/\s+/g, "");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
