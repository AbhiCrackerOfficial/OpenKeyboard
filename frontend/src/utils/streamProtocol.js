const REPORT_13 = 0x13;
const CMD_AUDIO = 0x88;
const AUDIO_DATA_PER_FRAGMENT = 14;
const MAX_AUDIO_DATA = 14 * AUDIO_DATA_PER_FRAGMENT;

export function checksum20(frame) {
  let sum = 0;
  for (let i = 0; i < 19; i++) sum = (sum + frame[i]) & 0xff;
  return sum;
}

export function buildAudioIdleFrame() {
  const f = new Uint8Array(20);
  f[0] = REPORT_13;
  f[1] = CMD_AUDIO;
  f[2] = 0x01;
  f[3] = 0x00;
  f[4] = 0x23;
  f[19] = checksum20(f);
  return f;
}

function quantizeChannel(v, q) {
  if (!q) return v & 0xff;
  return Math.min(255, Math.round(v / q) * q) & 0xff;
}

/**
 * Encode a Map<ledIndex,[r,g,b]> into OEM 0x13/0x88 color-group frames.
 * This is a volatile realtime path; it does not perform a settings save.
 */
export function buildAudioStreamFrames(ledColors, initialQuantize = 64) {
  if (!ledColors?.size) return [buildAudioIdleFrame()];
  let q = Math.max(1, initialQuantize || 1);
  let data = null;

  while (true) {
    const groups = new Map();
    for (const [idx, rgb] of ledColors) {
      const [r0, g0, b0] = rgb;
      if (!(r0 || g0 || b0)) continue;
      const rgbq = [quantizeChannel(r0, q), quantizeChannel(g0, q), quantizeChannel(b0, q)];
      const key = rgbq.join(',');
      if (!groups.has(key)) groups.set(key, { rgb: rgbq, indices: [] });
      groups.get(key).indices.push(idx & 0xff);
    }

    const bytes = [];
    const ordered = [...groups.values()].sort((a, b) => b.indices.length - a.indices.length);
    for (const { rgb, indices } of ordered) {
      for (let i = 0; i < indices.length; i += 255) {
        const chunk = indices.slice(i, i + 255);
        bytes.push(rgb[0], rgb[1], rgb[2], chunk.length, ...chunk);
      }
    }
    data = Uint8Array.from(bytes);
    if (data.length <= MAX_AUDIO_DATA || q >= 256) break;
    q *= 2;
  }

  if (!data.length) return [buildAudioIdleFrame()];
  const chunks = [];
  for (let i = 0; i < data.length; i += AUDIO_DATA_PER_FRAGMENT) {
    chunks.push(data.slice(i, i + AUDIO_DATA_PER_FRAGMENT));
  }
  if (chunks.length > 14) chunks.length = 14;

  return chunks.map((chunk, seq) => {
    const f = new Uint8Array(20);
    f[0] = REPORT_13;
    f[1] = CMD_AUDIO;
    f[2] = chunks.length;
    f[3] = seq;
    f[4] = seq === chunks.length - 1 ? 0x10 + chunk.length : 0x1e;
    f.set(chunk, 5);
    f[19] = checksum20(f);
    return f;
  });
}

function walkCollections(collections, predicate) {
  for (const c of collections || []) {
    if (predicate(c)) return true;
    if (walkCollections(c.children, predicate)) return true;
  }
  return false;
}

export function hasFeatureReport(device, reportId) {
  return walkCollections(device?.collections, c => (c.featureReports || []).some(r => r.reportId === reportId));
}

export function hasOutputReport(device, reportId) {
  return walkCollections(device?.collections, c => (c.outputReports || []).some(r => r.reportId === reportId));
}
