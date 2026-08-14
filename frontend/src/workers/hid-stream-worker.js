import { AULA_F87_PROFILE as profile } from '../config/keyboards/aula/f87';
import { renderAudioFrame } from '../utils/renderEngine';
import { buildAudioStreamFrames, hasFeatureReport, hasOutputReport } from '../utils/streamProtocol';

let device = null;
let audioPort = null;
let running = false;
let busy = false;
let latestBins = null;
let phase = 0;
let transport = null;
let preference = 'audio88';
let fallback = true;
let settings = {
  mode: 'Audio dance – soft',
  gain: 1.5,
  colorful: true,
  rgb: [255, 0, 0],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const postStatus = (type, message, extra = {}) => self.postMessage({ type, message, ...extra });

async function findDevice() {
  if (!self.navigator?.hid) throw new Error('Worker WebHID is not available in this Chromium build.');
  const devices = await self.navigator.hid.getDevices();
  const found = devices.find(d => d.vendorId === profile.vid && d.productId === profile.pid);
  if (!found) throw new Error('No previously-authorized keyboard is visible to the background HID worker.');
  if (!found.opened) await found.open();
  return found;
}

async function sendSmallFeature(reportId, data) {
  const body = new Uint8Array(profile.reportSize - 1);
  body.set(data.slice(0, body.length));
  await device.sendFeatureReport(reportId, body);
}

async function enableDirect() {
  let accepted = 0;
  for (const step of profile.buildDirectEnableSequence?.() || []) {
    try { await sendSmallFeature(step.reportId, step.data); accepted++; } catch {}
    await sleep(6);
  }
  return accepted;
}

async function disableDirect() {
  const step = profile.buildDirectDisableReport?.();
  if (!step || !device) return;
  try { await sendSmallFeature(step.reportId, step.data); } catch {}
}

async function sendFeatureFull(full) {
  await device.sendFeatureReport(full[0], full.slice(1));
}

async function sendOutput20(full) {
  await device.sendReport(full[0], full.slice(1));
}

function supported(name) {
  if (name === 'audio88') return hasOutputReport(device, 0x13);
  if (name === 'direct520') return hasFeatureReport(device, profile.reportId);
  return false;
}

async function selectTransport() {
  const other = preference === 'audio88' ? 'direct520' : 'audio88';
  if (supported(preference)) return preference;
  if (fallback && supported(other)) return other;
  throw new Error(`Selected transport ${preference} is not exposed by this HID collection${fallback ? ' and fallback is unavailable' : ''}.`);
}

async function start() {
  device = await findDevice();
  transport = await selectTransport();
  if (transport === 'direct520') {
    const accepted = await enableDirect();
    postStatus('ready', 'Background HID worker started Direct RGB framebuffer.', { transport, accepted });
  } else {
    const idle = buildAudioStreamFrames(new Map())[0];
    for (let i = 0; i < 3; i++) { await sendOutput20(idle); await sleep(12); }
    postStatus('ready', 'Background HID worker started OEM Audio Stream.', { transport });
  }
  running = true;
}

async function stop() {
  running = false;
  latestBins = null;
  try {
    if (device && transport === 'audio88') {
      await sendOutput20(buildAudioStreamFrames(new Map())[0]);
    } else if (device) {
      await sendFeatureFull(profile.buildDirectFrame(new Map()));
      await disableDirect();
    }
  } catch {}
  try { await device?.close(); } catch {}
  device = null;
  transport = null;
  postStatus('stopped', 'Background HID worker stopped.');
}

async function renderLatest() {
  if (busy || !running || !latestBins || !device) return;
  busy = true;
  try {
    while (latestBins && running) {
      const bins = latestBins;
      latestBins = null;
      phase += 0.055;
      const colors = renderAudioFrame(profile, bins, { ...settings, phase });
      if (transport === 'audio88') {
        const fragments = buildAudioStreamFrames(colors, 64);
        for (let i = 0; i < fragments.length; i++) {
          await sendOutput20(fragments[i]);
          if (i + 1 < fragments.length) await sleep(8);
        }
      } else {
        await sendFeatureFull(profile.buildDirectFrame(colors));
      }
    }
  } catch (error) {
    running = false;
    postStatus('error', error?.message || String(error));
  } finally {
    busy = false;
  }
}

function attachAudioPort(port) {
  audioPort = port;
  audioPort.onmessage = event => {
    if (event.data?.type !== 'spectrum' || !event.data.bins) return;
    latestBins = new Uint8Array(event.data.bins);
    renderLatest();
  };
  audioPort.start?.();
}

self.onmessage = async event => {
  const msg = event.data || {};
  try {
    if (msg.type === 'attach-audio-port' && msg.port) {
      attachAudioPort(msg.port);
      return;
    }
    if (msg.type === 'settings') {
      settings = { ...settings, ...msg.settings };
      return;
    }
    if (msg.type === 'start') {
      preference = msg.preference === 'direct520' ? 'direct520' : 'audio88';
      fallback = msg.fallback !== false;
      await start();
      return;
    }
    if (msg.type === 'stop') {
      await stop();
    }
  } catch (error) {
    postStatus('error', error?.message || String(error));
  }
};
