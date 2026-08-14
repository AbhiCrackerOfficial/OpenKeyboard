# OpenKeyboard — Device Driver Integration Guide ⌨️🚀

This guide explains how to add support for a new mechanical keyboard to **OpenKeyboard**. Because OpenKeyboard runs entirely in the browser using the **WebHID API**, a device driver is simply a static JavaScript configuration module containing layout coordinates and packet-formatting function encoders.

---

## 1. Directory Structure

Place your keyboard driver config file under `frontend/src/config/keyboards/` using the following folder structure:

```text
frontend/src/config/keyboards/
├── index.js                  # Registry index (re-exports profiles)
└── <brand-slug>/             # Brand directory in lowercase (e.g. keychron, rk, epomaker)
    └── <model-slug>.js       # Keyboard model driver (e.g. q1-pro.js, rk84.js)
```

For example, our AULA driver is located at:
`frontend/src/config/keyboards/aula/f87.js`

---

## 2. Locating Keyboard Hardware IDs (VID & PID)

To communicate with the keyboard, the app needs its **Vendor ID (VID)** and **Product ID (PID)**.

### Using Chrome DevTools (Recommended)
1. Plug in your keyboard to a USB port.
2. Open Chrome (or any Chromium browser) and navigate to `chrome://device-log`.
3. Locate the entry for your keyboard and copy the hexadecimal values for `vid` and `pid`.
   - *Example:* `vid=258a` (0x258A), `pid=010c` (0x010C).

### Using System Details
* **Windows:** Open Device Manager → Expand *Human Interface Devices* → Right-click your keyboard device → *Properties* → *Details* tab → Select *Hardware Ids*.
* **macOS:** Click the Apple Logo → *About This Mac* → *System Report* → *USB* → Locate your keyboard entry.

---

## 3. Bounding Boxes & Coordinate Sizing (U Metric)

The layout of keys in the visualizer is designed to match standard mechanical keyboard keycap units (U).
* Alphanumeric keys (A, B, C, 1, 2) are standard **`1U x 1U`** sizes (rendered as `0.95U x 0.95U` to account for standard key margins).
* Tab keys are typically `1.5U` wide.
* Caps Lock keys are typically `1.75U` wide.
* Left Shift keys are typically `2.25U` wide.
* Spacebars are typically `6.25U` wide.

The position coordinates are defined sequentially in the `keys` array:
`[ledIndex, leftU, topU, widthU, heightU, keyLabel, secondaryLabel]`

* **Dynamic Bounding Box:** OpenKeyboard automatically scans your `keys` coordinate matrix at runtime to calculate the maximum width and height bounds (`totalW`, `totalH`). It sets the CSS `aspectRatio` dynamically so that your keyboard box scales perfectly without squashing or stretching!

---

## 4. Capability-Based Feature Toggles

OpenKeyboard automatically configures its user interface depending on the capabilities exported by your profile:
* **Audio Visualizer:** The UI will automatically hide or show the Audio Visualizer tab based on whether your driver exports a valid `audioModes` array. If your keyboard does not support real-time audio streams, omit `audioModes`.
* **Per-Key RGB Canvas:** If your keyboard supports per-key static paint adjustments, include an effect in the `effects` registry with `perKey: true`.

---

## 5. Device Driver Boilerplate Code

Copy and paste this template to get started with your new driver:

```javascript
import { hexToBytes } from '../../../utils/colorUtils';

export const MY_KEYBOARD_PROFILE = {
  id: 'rk-84',                         // Unique identifier string
  name: 'Royal Kludge RK84',           // Human-readable model name
  brand: 'Royal Kludge',               // Brand manufacturer
  layoutType: '84-Key 75%',            // Keyboard layout factor description
  description: '84-key mechanical keyboard with WebHID control',

  // 1. USB HID Identification
  vid: 0x258A,                         // Vendor ID (number)
  pid: 0x00A1,                         // Product ID (number)

  // 2. Protocol Configuration Specs
  reportId: 0x06,                      // HID Feature Report ID
  reportSize: 520,                     // HID Report transaction length (in bytes)
  commands: {                          // Protocol operation codes
    readInit: 0x84,
    writeConfig: 0x04,
    palette: 0x0A,
    selfDefine: 0x06,
    directRgb: 0x08,
  },
  effectOffset: 18,                    // Packet byte index for active effect ID

  // 3. Supported Effects List
  // - speed: true if effect supports adjustable speed slider
  // - color: true if effect supports static RGB color selection
  // - colorful: true if effect supports rainbow mode toggle
  // - perKey: true if this is the brush-editable layout mode
  effects: [
    { id: 0,  name: "OFF",        speed: false, color: false, colorful: false },
    { id: 1,  name: "Fixed On",   speed: false, color: true,  colorful: false },
    { id: 2,  name: "Respire",    speed: true,  color: true,  colorful: true  },
    { id: 21, name: "Per-Key RGB",speed: false, color: true,  colorful: false, perKey: true },
  ],

  // 4. Audio reactive presets supported by firmware (omit to disable Audio Tab)
  audioModes: [
    "Soft Equalizer",
    "Rock Cascade",
  ],

  // 5. Visualizer Coordinate Key Grid
  // Format: [ledIndex, leftU, topU, widthU, heightU, label, subLabel]
  keys: [
    [0,   0,     0, 0.95, 0.95, "ESC"],
    [12,  2,     0, 0.95, 0.95, "F1"],
    // ... define the remaining key placement parameters here
  ],

  // ─── 6. Protocol Methods (Implement for your keyboard firmware) ───

  effectPairOffset(id) {
    return 64 + id * 2;
  },

  // A. Generates initial transaction payload to query device state
  buildReadInit() {
    const b = new Uint8Array(this.reportSize);
    b[0] = this.reportId;
    b[1] = this.commands.readInit;
    return b;
  },

  // B. Decodes raw bytes fetched from hardware into standard UI states
  decodeState(raw) {
    const id = raw[this.effectOffset];
    const brightness = raw[64];
    const speed = (raw[65] >> 4) & 0x0f;
    const colorful = (raw[65] & 0x0f) === 0x07;
    return { id, brightness, speed, colorful, raw };
  },

  // C. Encodes UI settings into a write config packet
  buildConfigWrite(currentRaw, req) {
    const b = new Uint8Array(currentRaw);
    b[0] = this.reportId;
    b[1] = this.commands.writeConfig;
    b[this.effectOffset] = req.effect.id;
    // ... apply brightness, speed, colorful states to buffer indexes
    return b;
  },

  // D. Builds custom per-key paint hex reports
  buildSelfDefineReport(keyColors = {}) {
    const f = new Uint8Array(this.reportSize);
    f[0] = this.reportId;
    f[1] = this.commands.selfDefine;
    // ... map keyColors map to payload indexes
    return f;
  },

  // E. Builds color palettes (if required by firmware)
  buildPaletteReport(rgb, effectId = 1, knownEffectColors = null) {
    // ... format palette command buffer
    return p;
  },

  // F. Audio streaming / Direct RGB frame packet builders
  buildDirectEnableSequence() {
    return [
      { reportId: 0x39, data: [0x20, 0x06, 0x00, 0x01, 0x00] }
    ];
  },
  buildDirectDisableReport() {
    return { reportId: 0x3c, data: [0x20, 0x00, 0x00] };
  },
  buildDirectFrame(colorsMap) {
    const f = new Uint8Array(this.reportSize);
    f[0] = this.reportId;
    f[1] = this.commands.directRgb;
    // ... write colorsMap RGB arrays sequentially
    return f;
  }
};
```

---

## 6. Registering and Testing Your Driver

1. **Register the Profile:** Import and append your keyboard driver structure inside `frontend/src/config/keyboards/index.js`.
2. **Local Preview:** Start the dev server (`npm run dev`) and select your model from the Active Keyboard dropdown in the header to preview key locations and bounds simulation.
3. **Inspect Output Bytes:** Click "Connect Device" to filter device connection lists. Toggle **Raw Debug** in the Diagnostics console tab to verify output bytes against hardware specs.
