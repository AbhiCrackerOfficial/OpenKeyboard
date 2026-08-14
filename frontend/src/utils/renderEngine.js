import { hsv } from './colorUtils';

const clamp01 = v => Math.max(0, Math.min(1, v));
const scaleRgb = (rgb, v) => rgb.map(c => Math.max(0, Math.min(255, Math.round(c * clamp01(v)))));
const choose = (colorful, rgb, hue, value = 1) => colorful ? hsv(hue, 90, clamp01(value) * 100) : scaleRgb(rgb, value);

export function audioMetrics(freq, gain = 1) {
  if (!freq?.length) return { bass: 0, mid: 0, high: 0, level: 0 };
  const avg = (a, b) => {
    const end = Math.min(b, freq.length);
    if (end <= a) return 0;
    let sum = 0;
    for (let i = a; i < end; i++) sum += freq[i];
    return (sum / (end - a) / 255) * gain;
  };
  const bass = avg(0, 10);
  const mid = avg(10, 35);
  const high = avg(35, 64);
  return { bass, mid, high, level: clamp01(bass * 0.5 + mid * 0.35 + high * 0.15) };
}

export function smoothingFromUi(value) {
  // Higher UI value = more smoothing, unlike the previous reversed mapping.
  const t = Math.max(1, Math.min(30, Number(value))) / 30;
  return 0.18 + t * 0.76;
}

/**
 * Shared audio renderer used by BOTH the on-screen keyboard and the hardware
 * streaming loop. This prevents preview/hardware drift.
 */
export function renderAudioFrame(profile, freq, opts = {}) {
  const {
    mode = profile.audioModes?.[0] || 'Audio dance – soft',
    gain = 1.5,
    colorful = true,
    rgb = [255, 0, 0],
    phase = 0,
  } = opts;
  const { bass, mid, high, level } = audioMetrics(freq, gain);
  const colors = new Map();

  for (const [idx, leftU, topU] of profile.keys) {
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

    v = clamp01(v);
    colors.set(idx, choose(colorful, rgb, h, v));
  }
  return colors;
}

/**
 * Firmware-effect preview. It is intentionally a visual approximation of the
 * built-in firmware animations, but every effect exposed by the profile has a
 * dedicated preview instead of falling through to a static color.
 */
export function renderEffectFrame(profile, opts = {}) {
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
  const keys = profile.keys;
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
        // Rainbow wheel: radial hue wheel rotating around the board center.
        const cx = 8.6, cy = 2.8;
        const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
        hue = angle + phase * 1.5;
        v *= 0.72 + 0.28 * Math.sin(Math.hypot(x - cx, y - cy) * 1.2 - phase * 0.08);
        forceRainbow = true;
        break;
      }
      case 7: {
        // Ripples shining: expanding concentric rings. The supplied capture
        // confirms effect ID 7, brightness 4, speed 3 and custom-red support.
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
        // Shadow disappear: a soft moving blackout sweeps through the board.
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
        // Retinue scanning: narrow scanner beam with fading tail.
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
        // Rotating storm: rotating spiral arms, custom-color or colorful.
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
