import { hsv } from './colorUtils';

export const clamp01 = v => Math.max(0, Math.min(1, v));
export const scaleRgb = (rgb, v) => rgb.map(c => Math.max(0, Math.min(255, Math.round(c * clamp01(v)))));
export const choose = (colorful, rgb, hue, value = 1) => colorful ? hsv(hue, 90, clamp01(value) * 100) : scaleRgb(rgb, value);


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
  if (profile?.renderAudioFrame) {
    return profile.renderAudioFrame(freq, opts);
  }
  const colors = new Map();
  if (profile?.keys) {
    for (const [idx] of profile.keys) {
      colors.set(idx, opts.rgb || [255, 0, 0]);
    }
  }
  return colors;
}

export function renderEffectFrame(profile, opts = {}) {
  if (profile?.renderEffectFrame) {
    return profile.renderEffectFrame(opts);
  }
  const colors = new Map();
  if (profile?.keys) {
    for (const [idx] of profile.keys) {
      colors.set(idx, opts.effectId === 0 ? [0, 0, 0] : (opts.rgb || [255, 0, 0]));
    }
  }
  return colors;
}
