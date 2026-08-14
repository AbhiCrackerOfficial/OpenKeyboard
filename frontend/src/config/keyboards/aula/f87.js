// ─── AULA F87 / F87 Pro Keyboard Profile ──────────────────────────────────────
import { hexToBytes, hsv } from '../../../utils/colorUtils';
import { audioMetrics, choose } from '../../../utils/renderEngine';


export const AULA_F87_PROFILE = {
  id: 'aula-f87-pro',
  name: 'AULA F87 / F87 Pro',
  brand: 'AULA',
  layoutType: '87-Key TKL',
  description: 'OEM 520-byte Feature Report controller with direct RGB engine',

  // USB HID Identification
  vid: 0x258A,
  pid: 0x010C,

  // Protocol Specs
  reportId: 0x06,
  reportSize: 520,
  commands: {
    readInit: 0x84,
    writeConfig: 0x04,
    palette: 0x0A,
    selfDefine: 0x06,
    directRgb: 0x08,
  },
  effectOffset: 18,

  // Effects supported by hardware.
  // IDs 0..18 are the OEM firmware effects. ID 21 is the OEM Self-Define /
  // per-key RGB mode captured from the official Windows software.
  effects: [
    { id: 0,  name: "OFF",                speed: false, color: false, colorfulOnly: false },
    { id: 1,  name: "Fixed On",           speed: false, color: true,  colorful: false     },
    { id: 2,  name: "Respire",            speed: true,  color: true,  colorful: true      },
    { id: 3,  name: "Rainbow",            speed: true,  color: false, colorfulOnly: true  },
    { id: 4,  name: "Flash Away",         speed: true,  color: true,  colorful: true      },
    { id: 5,  name: "Raindrops",          speed: true,  color: true,  colorful: true      },
    { id: 7,  name: "Ripples Shining",    speed: true,  color: true,  colorful: true      },
    { id: 8,  name: "Stars Twinkle",      speed: true,  color: true,  colorful: true      },
    { id: 10, name: "Retro Snake",        speed: true,  color: true,  colorful: true      },
    { id: 11, name: "Neon Stream",        speed: true,  color: true,  colorful: true      },
    { id: 12, name: "Reaction",           speed: true,  color: true,  colorful: true      },
    { id: 13, name: "Sine Wave",          speed: true,  color: true,  colorful: true      },
    { id: 15, name: "Rotating Windmill",  speed: true,  color: false, colorfulOnly: true  },
    { id: 16, name: "Colorful Waterfall", speed: true,  color: false, colorfulOnly: true  },
    { id: 17, name: "Blossoming",         speed: true,  color: false, colorfulOnly: true  },
    { id: 21, name: "Self Define / Per-Key", speed: false, color: true, colorful: false, perKey: true },
  ],


  // Audio visualization styles
  audioModes: [
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
  ],

  // 520-byte Palette Report Template
  paletteHex:
    "060a000001000002000000000000000000000000000000000000000000ff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00" +
    "ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff" +
    "00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00" +
    "ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ffffffffffff000000ff000000ffffff00ff00ff00ff" +
    "ffffffffff000000ff000000ffffff00ff00ff00ffffffffffff800000ff000000ffffff00ff00ff00ffffffffff000000000000000000000000000000000000" +
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
    "00005aa500000000",

  // Physical 87-key TKL mechanical keyboard layout definition
  // [ledIndex, leftU, topU, widthU, heightU, label, subLabel]
  keys: [
    // Row 0 – Fn Row (y = 0)
    [0,   0,     0, 0.95, 0.95, "ESC"],
    [12,  2,     0, 0.95, 0.95, "F1"],
    [18,  3,     0, 0.95, 0.95, "F2"],
    [24,  4,     0, 0.95, 0.95, "F3"],
    [30,  5,     0, 0.95, 0.95, "F4"],
    [36,  6.5,   0, 0.95, 0.95, "F5"],
    [42,  7.5,   0, 0.95, 0.95, "F6"],
    [48,  8.5,   0, 0.95, 0.95, "F7"],
    [54,  9.5,   0, 0.95, 0.95, "F8"],
    [60,  11,    0, 0.95, 0.95, "F9"],
    [66,  12,    0, 0.95, 0.95, "F10"],
    [72,  13,    0, 0.95, 0.95, "F11"],
    [78,  14,    0, 0.95, 0.95, "F12"],
    [84,  15.75, 0, 0.95, 0.95, "print"],
    [90,  16.75, 0, 0.95, 0.95, "scroll"],
    [96,  17.75, 0, 0.95, 0.95, "pause"],

    // Row 1 – Number Row (y = 1.25)
    [1,   0,     1.25, 0.95, 0.95, "~", "`"],
    [7,   1,     1.25, 0.95, 0.95, "!", "1"],
    [13,  2,     1.25, 0.95, 0.95, "@", "2"],
    [19,  3,     1.25, 0.95, 0.95, "#", "3"],
    [25,  4,     1.25, 0.95, 0.95, "$", "4"],
    [31,  5,     1.25, 0.95, 0.95, "%", "5"],
    [37,  6,     1.25, 0.95, 0.95, "^", "6"],
    [43,  7,     1.25, 0.95, 0.95, "&", "7"],
    [49,  8,     1.25, 0.95, 0.95, "*", "8"],
    [55,  9,     1.25, 0.95, 0.95, "(", "9"],
    [61,  10,    1.25, 0.95, 0.95, ")", "0"],
    [67,  11,    1.25, 0.95, 0.95, "_", "-"],
    [73,  12,    1.25, 0.95, 0.95, "+", "="],
    [79,  13,    1.25, 1.95, 0.95, "← backspace"],
    [85,  15.75, 1.25, 0.95, 0.95, "Insert"],
    [91,  16.75, 1.25, 0.95, 0.95, "Home"],
    [97,  17.75, 1.25, 0.95, 0.95, "PgUp"],

    // Row 2 – QWERTY Row (y = 2.3)
    [2,   0,     2.3, 1.45, 0.95, "Tab"],
    [8,   1.5,   2.3, 0.95, 0.95, "Q"],
    [14,  2.5,   2.3, 0.95, 0.95, "W"],
    [20,  3.5,   2.3, 0.95, 0.95, "E"],
    [26,  4.5,   2.3, 0.95, 0.95, "R"],
    [32,  5.5,   2.3, 0.95, 0.95, "T"],
    [38,  6.5,   2.3, 0.95, 0.95, "Y"],
    [44,  7.5,   2.3, 0.95, 0.95, "U"],
    [50,  8.5,   2.3, 0.95, 0.95, "I"],
    [56,  9.5,   2.3, 0.95, 0.95, "O"],
    [62,  10.5,  2.3, 0.95, 0.95, "P"],
    [68,  11.5,  2.3, 0.95, 0.95, "{", "["],
    [74,  12.5,  2.3, 0.95, 0.95, "}", "]"],
    [80,  13.5,  2.3, 1.45, 0.95, "|", "\\"],
    [86,  15.75, 2.3, 0.95, 0.95, "Delete"],
    [92,  16.75, 2.3, 0.95, 0.95, "End"],
    [98,  17.75, 2.3, 0.95, 0.95, "PgDn"],

    // Row 3 – ASDF Row (y = 3.35)
    [3,   0,     3.35, 1.7,  0.95, "Caps lock"],
    [9,   1.75,  3.35, 0.95, 0.95, "A"],
    [15,  2.75,  3.35, 0.95, 0.95, "S"],
    [21,  3.75,  3.35, 0.95, 0.95, "D"],
    [27,  4.75,  3.35, 0.95, 0.95, "F"],
    [33,  5.75,  3.35, 0.95, 0.95, "G"],
    [39,  6.75,  3.35, 0.95, 0.95, "H"],
    [45,  7.75,  3.35, 0.95, 0.95, "J"],
    [51,  8.75,  3.35, 0.95, 0.95, "K"],
    [57,  9.75,  3.35, 0.95, 0.95, "L"],
    [63,  10.75, 3.35, 0.95, 0.95, ":", ";"],
    [69,  11.75, 3.35, 0.95, 0.95, "\"", "'"],
    [81,  12.75, 3.35, 2.2,  0.95, "Enter"],

    // Row 4 – ZXCV Row (y = 4.4)
    [4,   0,     4.4, 2.2,  0.95, "Shift"],
    [10,  2.25,  4.4, 0.95, 0.95, "Z"],
    [16,  3.25,  4.4, 0.95, 0.95, "X"],
    [22,  4.25,  4.4, 0.95, 0.95, "C"],
    [28,  5.25,  4.4, 0.95, 0.95, "V"],
    [34,  6.25,  4.4, 0.95, 0.95, "B"],
    [40,  7.25,  4.4, 0.95, 0.95, "N"],
    [46,  8.25,  4.4, 0.95, 0.95, "M"],
    [52,  9.25,  4.4, 0.95, 0.95, "<", ","],
    [58,  10.25, 4.4, 0.95, 0.95, ">", "."],
    [64,  11.25, 4.4, 0.95, 0.95, "?", "/"],
    [82,  12.25, 4.4, 2.7,  0.95, "Shift"],
    [94,  16.75, 4.4, 0.95, 0.95, "↑"],

    // Row 5 – Space Row (y = 5.45)
    [5,   0,     5.45, 1.2,  0.95, "Ctrl"],
    [11,  1.25,  5.45, 1.2,  0.95, "Win"],
    [17,  2.5,   5.45, 1.2,  0.95, "Alt"],
    [35,  3.75,  5.45, 6.2,  0.95, ""], // Spacebar
    [53,  10,    5.45, 1.2,  0.95, "Alt"],
    [59,  11.25, 5.45, 1.2,  0.95, "Fn"],
    [65,  12.5,  5.45, 1.2,  0.95, "Super"],
    [83,  13.75, 5.45, 1.2,  0.95, "Ctrl"],
    [89,  15.75, 5.45, 0.95, 0.95, "←"],
    [95, 16.75, 5.45, 0.95, 0.95, "↓"],
    [101, 17.75, 5.45, 0.95, 0.95, "→"],
  ],

  // Protocol encoding / decoding helpers
  effectPairOffset(id) {
    return 64 + id * 2;
  },

  buildReadInit() {
    const b = new Uint8Array(this.reportSize);
    b[0] = this.reportId;
    b[1] = this.commands.readInit;
    b[4] = 0x01;
    b[6] = 0x80;
    return b;
  },

  decodeState(raw) {
    const id = raw[this.effectOffset];
    let b = null, s = null, c = null;
    if (id >= 1 && id <= 18) {
      const o = this.effectPairOffset(id);
      b = raw[o];
      s = (raw[o + 1] >> 4) & 0x0f;
      c = (raw[o + 1] & 0x0f) === 0x07;
    } else if (id === 21) {
      b = null; s = null; c = false;
    }
    return { id, brightness: b, speed: s, colorful: c, raw };
  },

  buildConfigWrite(currentRaw, req) {
    const b = new Uint8Array(this.reportSize);
    b.set(currentRaw.slice(0, Math.min(currentRaw.length, this.reportSize)));
    b[0] = this.reportId;
    b[1] = this.commands.writeConfig;
    b[this.effectOffset] = req.effect.id;
    if (req.effect.perKey) {
      b[17] = 0x01;
      return b;
    }
    if (req.effect.id !== 0) {
      b[17] = 0x00;
      const o = this.effectPairOffset(req.effect.id);
      b[o] = req.brightness;
      const oldSpd = (b[o + 1] >> 4) & 0x0f;
      const spd = req.effect.speed ? req.speed : oldSpd;
      let mode = 0;
      if (req.effect.colorfulOnly) mode = 0x07;
      else if (req.effect.colorful) mode = req.colorful ? 0x07 : 0x00;
      b[o + 1] = ((spd & 0x0f) << 4) | mode;
    } else {
      b[17] = 0x00;
    }
    return b;
  },

  /**
   * Build the OEM 0x0A palette report for the SELECTED effect.
   *
   * Packet captures prove custom RGB is effect-specific, not global.
   * Each effect owns a 21-byte palette block:
   *   effect 1  -> RGB at 29..31
   *   effect 5  -> RGB at 113..115 (Raindrops capture)
   *   effect 13 -> RGB at 281..283 (Sine Wave capture)
   *
   * Formula: 29 + (effectId - 1) * 21.
   */
  paletteColorOffset(effectId) {
    if (effectId < 1 || effectId > 18) return null;
    const offset = 29 + (effectId - 1) * 21;
    return offset + 2 < this.reportSize ? offset : null;
  },

  buildPaletteReport(rgb, effectId = 1, knownEffectColors = null) {
    const template = hexToBytes(this.paletteHex);
    const p = new Uint8Array(template);

    // Re-apply colors previously chosen in this frontend so changing another
    // effect does not reset earlier custom palettes back to template defaults.
    if (knownEffectColors) {
      Object.entries(knownEffectColors).forEach(([idText, color]) => {
        const id = Number(idText);
        const o = this.paletteColorOffset(id);
        if (o === null || !Array.isArray(color) || color.length < 3) return;
        p[o] = color[0];
        p[o + 1] = color[1];
        p[o + 2] = color[2];
      });
    }

    const offset = this.paletteColorOffset(effectId);
    if (offset !== null) {
      p[offset] = rgb[0];
      p[offset + 1] = rgb[1];
      p[offset + 2] = rgb[2];
    }
    return p;
  },

  /**
   * OEM Self-Define / per-key report captured from the official app.
   * RGB planes are 126 bytes each.
   */
  buildSelfDefineReport(keyColors = {}) {
    const f = new Uint8Array(this.reportSize);
    f[0] = this.reportId;
    f[1] = this.commands.selfDefine;
    f[4] = 0x01;
    f[6] = 0x80;
    f[7] = 0x01;
    const entries = keyColors instanceof Map ? [...keyColors.entries()] : Object.entries(keyColors || {});
    for (const [idxText, color] of entries) {
      const idx = Number(idxText);
      if (!Number.isInteger(idx) || idx < 0 || idx >= 126 || !Array.isArray(color) || color.length < 3) continue;
      f[8 + idx] = color[0] & 0xff;
      f[134 + idx] = color[1] & 0xff;
      f[260 + idx] = color[2] & 0xff;
    }
    return f;
  },

  selfDefineGamingDefault() {
    const out = {};
    [0, 9, 14, 15, 21, 89, 94, 95, 101].forEach(idx => { out[idx] = [255, 0, 0]; });
    return out;
  },

  buildDirectEnableSequence() {
    return [
      { reportId: 0x39, data: [0x20, 0x06, 0x00, 0x01, 0x00] },
      { reportId: 0x3c, data: [0x20, 0x01, 0x00] },
      { reportId: 0x39, data: [0x20, 0x06, 0x01, 0x01, 0x00] },
    ];
  },

  buildDirectDisableReport() {
    return { reportId: 0x3c, data: [0x20, 0x00, 0x00] };
  },

  buildDirectFrame(colorsMap) {
    const f = new Uint8Array(this.reportSize);
    f[0] = this.reportId;
    f[1] = this.commands.directRgb;
    f[4] = 1;
    f[6] = 122;
    f[7] = 1;
    colorsMap.forEach(([r, g, b], idx) => {
      if (idx < 0 || idx >= 122) return;
      const o = 8 + idx * 3;
      f[o] = r;
      f[o + 1] = g;
      f[o + 2] = b;
    });
    return f;
  },

  renderAudioFrame(freq, opts = {}) {
    const {
      mode = this.audioModes?.[0] || 'Audio dance – soft',
      gain = 1.5,
      colorful = true,
      rgb = [255, 0, 0],
      phase = 0,
    } = opts;
    const { bass, mid, high, level } = audioMetrics(freq, gain);
    const colors = new Map();

    for (const [idx, leftU, topU] of this.keys) {
      const x = leftU;
      const y = topU;
      let v = 0;
      let h = (x * 18 + phase * 80) % 360;

      switch (mode) {
        case 'Audio dance – soft':
          v = Math.max(0, level - Math.abs(x - 8.5) / 14) * 1.35;
          break;
        case 'Dazzling – rock':
          v = bass > 0.42 ? Math.min(1, bass * 1.5) : mid * 0.34;
          h = (phase * 220 + x * 25 + y * 40) % 360;
          break;
        case 'Clouds rise and snow fly':
          v = Math.max(0, high * 1.5 - (5.7 - y) / 8) * (0.55 + 0.45 * Math.sin(phase * 3 + x));
          break;
        case 'Light Field Change – voice':
          v = Math.min(1, mid * 1.55) * (0.42 + 0.58 * Math.sin(x * 0.45 + phase * 2) ** 2);
          break;
        case 'The gurgling stream':
          v = Math.max(0, level * 0.92 + 0.36 * Math.sin(x * 0.55 - y * 0.7 + phase * 3));
          h = 185 + x * 4;
          break;
        case 'Blooming – passion': {
          const d = Math.hypot(x - 8.6, y - 2.8);
          v = Math.max(0, level * 1.7 - Math.abs(d - (phase * 3) % 9) * 0.25);
          h = 330 + d * 7;
          break;
        }
        case 'Pearl falling jade plate':
          v = (high > 0.32 && ((Math.round(x * 7 + y * 13) + Math.floor(phase * 8)) % 17) < 2)
            ? Math.min(1, high * 1.55) : level * 0.07;
          h = 160 + high * 100;
          break;
        case 'Clouds follow the moon':
          v = 0.1 + level * 0.48 + 0.16 * Math.sin(x * 0.25 + phase);
          h = 205 + 20 * Math.sin(phase * 0.4);
          break;
        case 'Mountains and Flowing Waters': {
          const bin = Math.min(freq.length - 1, Math.floor((x / 18.7) * freq.length));
          const height = (freq[bin] / 255) * 6.2 * gain;
          v = (5.8 - y) < height ? Math.min(1, 0.22 + (freq[bin] / 255) * gain) : 0;
          h = 120 + x * 7;
          break;
        }
        case 'Raining like silk – regular':
          v = Math.max(0, level * 0.35 + 0.7 * Math.sin(y * 1.2 - phase * 5 + (Math.round(x) % 5) * 1.5));
          v *= high * 0.72 + mid * 0.5;
          h = 190 + x * 3;
          break;
        default:
          v = level;
      }

      v = Math.max(0, Math.min(1, v));
      colors.set(idx, choose(colorful, rgb, h, v));
    }
    return colors;
  },

  renderEffectFrame(opts = {}) {
    const {
      effectId = 1,
      rgb = [255, 0, 0],
      colorful = false,
      brightness = 4,
      phase = 0,
      pressMap = {},
    } = opts;
    const bRatio = Math.max(0, Math.min(1, brightness / 4));
    const colors = new Map();
    const keys = this.keys;
    const snake = keys.map(k => k[0]);
    const snakePos = new Map(snake.map((idx, i) => [idx, i]));

    for (const [idx, x, y] of keys) {
      const press = pressMap[idx] || 0;
      let v = bRatio;
      let hue = (x * 18 + phase) % 360;
      let forceRainbow = false;

      switch (effectId) {
        case 0: v = 0; break;
        case 1: break;
        case 2: v *= (Math.sin(phase * 0.07) + 1) / 2; break;
        case 3:
          hue = ((x * 20) - phase + 360) % 360;
          forceRainbow = true;
          break;
        case 4:
          v *= press > 0 ? press : Math.max(0.04, Math.max(0, Math.sin(idx * 7.3 + phase * 0.25)) * 0.10);
          break;
        case 5: {
          const t = phase * 0.06;
          const drop = Math.sin(idx * 1.618 * 7 + t) * Math.cos(idx * Math.PI + t * 0.7);
          v *= Math.max(0, drop) ** 2;
          hue = (idx * 41 + phase * 0.5) % 360;
          break;
        }
        case 6: {
          const cx = 8.6, cy = 2.8;
          const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
          hue = angle + phase * 1.5;
          v *= 0.72 + 0.28 * Math.sin(Math.hypot(x - cx, y - cy) * 1.2 - phase * 0.08);
          forceRainbow = true;
          break;
        }
        case 7: {
          const cx = 8.6, cy = 2.8;
          const d = Math.hypot(x - cx, y - cy);
          const ring = Math.sin(d * 2.7 - phase * 0.13);
          v *= Math.max(0.04, ring) ** 2;
          hue = d * 26 + phase * 0.5;
          break;
        }
        case 8: {
          const t = phase * 0.07;
          const n = Math.sin(idx * 1.618 * 7 + t * 1.1) * Math.cos(idx * 2.718 * 5 - t * 0.8);
          v *= Math.max(0, n) ** 3; hue = idx * 37 + phase * 0.6;
          break;
        }
        case 9: {
          const shadowX = ((phase * 0.035) % 23) - 2;
          const dist = Math.abs(x - shadowX);
          v *= Math.min(1, Math.max(0.03, dist / 4.2));
          hue = x * 14 + phase * 0.5;
          break;
        }
        case 10: {
          const bodyLen = 14;
          const head = Math.floor(phase * 0.22) % snake.length;
          const pos = snakePos.get(idx);
          const d = (head - pos + snake.length) % snake.length;
          v *= d < bodyLen ? (1 - d / bodyLen) ** 1.5 : 0;
          hue = head * 5 + d * 8;
          break;
        }
        case 11: {
          const wave = (Math.sin(x * 0.5 + phase * 0.1) + Math.sin(x * 0.9 - phase * 0.07 + y * 0.3)) / 2;
          v *= (wave + 1) / 2;
          hue = x * 16 - phase * 1.2;
          break;
        }
        case 12: v *= press; hue = idx * 23; break;
        case 13:
          v *= (Math.sin(x * 0.5 - phase * 0.1 + y * 0.2) + 1) / 2;
          hue = x * 18 - phase;
          break;
        case 14: {
          const pos = ((phase * 0.055) % 23) - 2;
          const d = x - pos;
          v *= d >= 0 && d < 5 ? Math.pow(1 - d / 5, 1.5) : 0.025;
          hue = 185 + y * 8;
          break;
        }
        case 15: {
          const cx = 8.2, cy = 2.8;
          const angle = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + phase * 1.5 + 360) % 360;
          const sector = angle % 90;
          const dist = Math.min(1, Math.hypot(x - cx, y - cy) / 8);
          v *= sector < 43 ? dist : 0.05;
          hue = angle + phase;
          forceRainbow = true;
          break;
        }
        case 16:
          v *= (Math.sin(y * 1.4 - phase * 0.09 + x * 0.3) + 1) / 2;
          hue = y * 45 + x * 12 - phase * 0.9;
          forceRainbow = true;
          break;
        case 17: {
          const cx = 8.6, cy = 2.8;
          const dist = Math.hypot(x - cx, y - cy);
          const angle = Math.atan2(y - cy, x - cx);
          const petal = Math.cos(angle * 5) * 0.35;
          const ring = ((dist - phase * 0.04) % 5 + 5) % 5;
          v *= ring < 1.2 + petal ? Math.max(0, 1 - ring / (1.2 + petal)) : 0;
          hue = dist * 28 + phase * 1.8;
          forceRainbow = true;
          break;
        }
        case 18: {
          const cx = 8.6, cy = 2.8;
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          const storm = Math.sin(a * 4 + d * 1.4 - phase * 0.16);
          v *= Math.max(0.03, storm) ** 2 * Math.max(0.28, 1 - d / 13);
          hue = (a * 180 / Math.PI) + phase * 1.2;
          break;
        }
        case 21:
          v = 0;
          break;
        default: break;
      }

      const useRainbow = forceRainbow || colorful;
      colors.set(idx, choose(useRainbow, rgb, hue, v));
    }
    return colors;
  }
};
