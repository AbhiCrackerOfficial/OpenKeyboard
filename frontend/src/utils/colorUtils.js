// ─── Shared Color & Math Utilities ──────────────────────────────────────────

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

/** Convert hex string to Uint8Array */
export function hexToBytes(s) {
  s = s.replace(/\s+/g, "");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Format byte array to spaced hex string */
export function hexFmt(arr) {
  return [...arr].map(x => x.toString(16).padStart(2, '0')).join(' ');
}

/** Convert RGB array to Hex code */
export function rgbToHex(rgb) {
  return '#' + rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Convert Hex code to RGB array */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [255, 0, 0];
  const s = m[1];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
