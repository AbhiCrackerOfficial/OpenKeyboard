// ─── AULA F87 / F87 Pro Keyboard Profile ──────────────────────────────────────
import { hexToBytes } from '../../../utils/colorUtils';

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
};
