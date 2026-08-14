import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi, WifiOff, Sliders, Volume2, Terminal,
  Sun, Gauge, Mic, Monitor, Square, Play,
  Trash2, RefreshCw, Activity, Layers, Info,
  Palette, Sparkles, Cpu, Download, Paintbrush, Eraser, X
} from 'lucide-react';
import KeyboardVisualizer from './components/KeyboardVisualizer';
import FloatingColorBubble from './components/FloatingColorBubble';
import ToggleSwitch from './components/ToggleSwitch';
import { KEYBOARD_PROFILES, DEFAULT_KEYBOARD_PROFILE, findKeyboardProfile } from './config/keyboards';
import { hexFmt, rgbToHex } from './utils/colorUtils';
import { renderAudioFrame, smoothingFromUi } from './utils/renderEngine';
import { buildAudioStreamFrames, hasFeatureReport, hasOutputReport } from './utils/streamProtocol';

const DEBOUNCE_MS = 1000;
const AUTO_SYNC_INTERVAL_MS = 1000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ls = (k, fb) => {
  try {
    const val = localStorage.getItem(k);
    if (val !== null) return JSON.parse(val);
    const oldKey = k.replace('openkeyboard_', 'f87_');
    if (oldKey !== k) {
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal !== null) return JSON.parse(oldVal);
    }
    return fb;
  } catch {
    return fb;
  }
};

export default function App() {

  // ── Keyboard Profile ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState(DEFAULT_KEYBOARD_PROFILE);

  // ── UI Mode ─────────────────────────────────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => ls('openkeyboard_theme', 'dark'));
  const [styleMode, setStyleMode] = useState(() => ls('openkeyboard_style', 'glass'));

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('lighting');

  // ── Connection ────────────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false);
  const [devName, setDevName] = useState('');
  const [supported, setSupported] = useState(true);

  // ── Lighting Settings (Default to Red #FF0000 as per Requirement #5) ──────
  const [effectId, setEffectId] = useState(() => ls('openkeyboard_effectId', 1));
  const [brightness, setBrightness] = useState(() => ls('openkeyboard_brightness', 4));
  const [speed, setSpeed] = useState(() => ls('openkeyboard_speed', 4));
  const [colorful, setColorful] = useState(() => ls('openkeyboard_colorful', false));
  const [rgb, setRgb] = useState(() => ls('openkeyboard_rgb', [255, 0, 0]));
  const [hexColor, setHexColor] = useState(() => ls('openkeyboard_hex', '#FF0000'));
  const [effectColors, setEffectColors] = useState(() => ls('openkeyboard_effectColors', {}));
  const [perKeyColors, setPerKeyColors] = useState(() => ls('openkeyboard_perKeyColors', {}));
  const [perKeyErase, setPerKeyErase] = useState(false);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const [audioSrc, setAudioSrc] = useState('none');
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const [audioMode, setAudioMode] = useState('Audio dance – soft');
  const [audioGain, setAudioGain] = useState(1.5);
  const [audioSmooth, setAudioSmooth] = useState(12);
  const [vizRunning, setVizRunning] = useState(false);
  // Only the two REAL transports are selectable. Automatic fallback is a
  // separate behavior toggle, not a fake third transport.
  const [audioTransport, setAudioTransport] = useState(() => ls('openkeyboard_audioTransport', 'audio88') === 'direct520' ? 'direct520' : 'audio88');
  const [audioFallback, setAudioFallback] = useState(() => ls('openkeyboard_audioFallback', true));
  const [audioColorful, setAudioColorful] = useState(true);
  const [backgroundEngine, setBackgroundEngine] = useState('idle');
  const [transportCaps, setTransportCaps] = useState({ audio88: null, direct520: null });

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [realtimeSync, setRealtimeSync] = useState(true);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [logs, setLogs] = useState([]);
  const [readback, setReadback] = useState('—');
  const [lastRawData, setLastRawData] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState(() => ls('openkeyboard_custom_templates', []));
  const [txStatus, setTxStatus] = useState('idle');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)')?.matches || false
  );

  // ── Live Mutable Refs ───────────────────────────────────────────────────
  const hidRef = useRef(null);
  const ioBusyRef = useRef(false);
  const lastWriteTimeRef = useRef(0);
  const liveTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioStrRef = useRef(null);
  const vizLoopRef = useRef(false);
  const lastStateRef = useRef(null);
  const logRef = useRef(null);
  const specCanvasRef = useRef(null);
  const suppressLiveRef = useRef(false);
  const pendingWriteRef = useRef(null);
  const writeLoopRef = useRef(false);
  const streamTransportRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const hidWorkerRef = useRef(null);
  const workerAudioChannelRef = useRef(null);
  const workerActiveRef = useRef(false);
  const debugModeRef = useRef(debugMode);

  const audioModeRef = useRef(audioMode);
  const audioGainRef = useRef(audioGain);
  const audioColorfulRef = useRef(audioColorful);
  const colorfulRef = useRef(colorful);
  const rgbRef = useRef(rgb);
  const audioAnalyserRef = useRef(audioAnalyser);

  useEffect(() => { debugModeRef.current = debugMode; }, [debugMode]);
  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { audioGainRef.current = audioGain; }, [audioGain]);
  useEffect(() => { audioColorfulRef.current = audioColorful; }, [audioColorful]);
  useEffect(() => { colorfulRef.current = colorful; }, [colorful]);
  useEffect(() => { rgbRef.current = rgb; }, [rgb]);
  useEffect(() => { audioAnalyserRef.current = audioAnalyser; }, [audioAnalyser]);

  useEffect(() => {
    const supportsAudio = profile.audioModes && profile.audioModes.length > 0;
    if (!supportsAudio && activeTab === 'audio') {
      setActiveTab('lighting');
    }
    const hasEffect = profile.effects.some(e => e.id === effectId);
    if (!hasEffect) {
      const firstValid = profile.effects.find(e => e.id !== 0) || profile.effects[0];
      setEffectId(firstValid ? firstValid.id : 1);
    }
  }, [profile, activeTab, effectId]);

  const bytesToHex = (arr) => {
    return [...arr].map(x => x.toString(16).padStart(2, '0')).join(' ');
  };

  useEffect(() => {
    if (!hidWorkerRef.current || !workerActiveRef.current) return;
    hidWorkerRef.current.postMessage({
      type: 'settings',
      settings: { mode: audioMode, gain: audioGain, colorful: audioColorful, rgb },
    });
  }, [audioMode, audioGain, audioColorful, rgb]);

  const activeEffect = profile.effects.find(e => e.id === effectId) || profile.effects[1];

  // ─────────────────────────────────────────────────────────────────────────
  // Whole-Site Theme & Color Dynamic Adaptation (Requirement #2 & #5)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.style = styleMode;
    localStorage.setItem('openkeyboard_theme', JSON.stringify(themeMode));
    localStorage.setItem('openkeyboard_style', JSON.stringify(styleMode));
  }, [themeMode, styleMode]);

  useEffect(() => {
    document.documentElement.dataset.lightingOff = effectId === 0 ? 'true' : 'false';
  }, [effectId]);

  useEffect(() => {
    let r = 255, g = 0, b = 0;
    let r2 = 168, g2 = 85, b2 = 247; // Default purple #a855f7
    let r3 = 236, g3 = 72, b3 = 153; // Default pink #ec4899

    const [realR, realG, realB] = rgb;

    if (effectId === 0) {
      // Powered down (grey accents)
      r = 107; g = 114; b = 128;
      r2 = 120; g2 = 120; b2 = 120;
      r3 = 130; g3 = 130; b3 = 130;
    } else if (effectId === 21 && Object.keys(perKeyColors).length > 0) {
      // Count frequencies of rgb colors in perKeyColors
      const counts = {};
      Object.values(perKeyColors).forEach(color => {
        if (!Array.isArray(color) || color.length < 3) return;
        const key = color.slice(0, 3).join(',');
        counts[key] = (counts[key] || 0) + 1;
      });

      // Sort colors by frequency descending
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key.split(',').map(Number));

      if (sorted[0]) {
        [r, g, b] = sorted[0];
      } else {
        [r, g, b] = [realR, realG, realB];
      }

      if (sorted[1]) {
        [r2, g2, b2] = sorted[1];
      } else {
        // Fallback to primary dominant
        [r2, g2, b2] = [r, g, b];
      }

      if (sorted[2]) {
        [r3, g3, b3] = sorted[2];
      } else {
        // Fallback to secondary dominant
        [r3, g3, b3] = [r2, g2, b2];
      }
    } else {
      // Standard preset mode: coordinate all accents to primary selected color
      [r, g, b] = [realR, realG, realB];
      [r2, g2, b2] = [realR, realG, realB];
      [r3, g3, b3] = [realR, realG, realB];
    }

    let displayR = r, displayG = g, displayB = b;
    if (r + g + b < 90) {
      displayR = 156; displayG = 163; displayB = 175; // premium gray fallback
    }

    let displayR2 = r2, displayG2 = g2, displayB2 = b2;
    if (r2 + g2 + b2 < 90) {
      displayR2 = 168; displayG2 = 85; displayB2 = 247; // default purple #a855f7 fallback
    }

    let displayR3 = r3, displayG3 = g3, displayB3 = b3;
    if (r3 + g3 + b3 < 90) {
      displayR3 = 236; displayG3 = 72; displayB3 = 153; // default pink #ec4899 fallback
    }

    // Set document CSS properties dynamically
    document.documentElement.style.setProperty('--kb-r', r);
    document.documentElement.style.setProperty('--kb-g', g);
    document.documentElement.style.setProperty('--kb-b', b);
    document.documentElement.style.setProperty('--accent', `rgb(${displayR}, ${displayG}, ${displayB})`);
    document.documentElement.style.setProperty('--accent-rgb', `${displayR}, ${displayG}, ${displayB}`);

    // Dynamic text contrast for elements on top of --accent
    const contrast1 = (displayR < 127.5 && displayG < 127.5 && displayB < 127.5) ? '#ffffff' : '#0b0f19';
    document.documentElement.style.setProperty('--accent-contrast', contrast1);

    // Dynamic accent2 (coordinating PROFILE & CAPABILITIES / Diagnostics)
    document.documentElement.style.setProperty('--accent2', `rgb(${displayR2}, ${displayG2}, ${displayB2})`);
    document.documentElement.style.setProperty('--accent2-rgb', `${displayR2}, ${displayG2}, ${displayB2}`);
    const contrast2 = (displayR2 < 127.5 && displayG2 < 127.5 && displayB2 < 127.5) ? '#ffffff' : '#0b0f19';
    document.documentElement.style.setProperty('--accent2-contrast', contrast2);

    // Dynamic accent3 (coordinating Audio tab components)
    document.documentElement.style.setProperty('--accent3', `rgb(${displayR3}, ${displayG3}, ${displayB3})`);
    document.documentElement.style.setProperty('--accent3-rgb', `${displayR3}, ${displayG3}, ${displayB3}`);
    const contrast3 = (displayR3 < 127.5 && displayG3 < 127.5 && displayB3 < 127.5) ? '#ffffff' : '#0b0f19';
    document.documentElement.style.setProperty('--accent3-contrast', contrast3);

    document.documentElement.style.setProperty('--glow', `rgba(${displayR}, ${displayG}, ${displayB}, ${effectId === 0 ? 0.14 : 0.35})`);

    localStorage.setItem('openkeyboard_rgb', JSON.stringify(rgb));
    const h = rgbToHex(rgb);
    localStorage.setItem('openkeyboard_hex', JSON.stringify(h));
  }, [rgb, effectId, perKeyColors]);

  // ─────────────────────────────────────────────────────────────────────────
  // Human-Readable Diagnostics Logging (Requirement #6)
  // ─────────────────────────────────────────────────────────────────────────
  const addLog = (tag, message, details = null) => {
    const ts = new Date().toLocaleTimeString();
    const entry = {
      id: Date.now() + Math.random(),
      time: ts,
      tag: tag.toUpperCase(),
      message,
      details,
    };
    setLogs(prev => [...prev.slice(-199), entry]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
  useEffect(() => {
    const onBeforeInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      addLog('system', 'Web app installed successfully.');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  };


  // ─────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('openkeyboard_effectId', JSON.stringify(effectId)); }, [effectId]);
  useEffect(() => { localStorage.setItem('openkeyboard_brightness', JSON.stringify(brightness)); }, [brightness]);
  useEffect(() => { localStorage.setItem('openkeyboard_speed', JSON.stringify(speed)); }, [speed]);
  useEffect(() => { localStorage.setItem('openkeyboard_colorful', JSON.stringify(colorful)); }, [colorful]);
  useEffect(() => { localStorage.setItem('openkeyboard_effectColors', JSON.stringify(effectColors)); }, [effectColors]);
  useEffect(() => { localStorage.setItem('openkeyboard_perKeyColors', JSON.stringify(perKeyColors)); }, [perKeyColors]);
  useEffect(() => { localStorage.setItem('openkeyboard_audioTransport', JSON.stringify(audioTransport)); }, [audioTransport]);
  useEffect(() => { localStorage.setItem('openkeyboard_audioFallback', JSON.stringify(audioFallback)); }, [audioFallback]);

  // ─────────────────────────────────────────────────────────────────────────
  // Smooth Live Apply Debounce
  // Programmatic Auto-Sync updates are suppressed so a READ never causes an
  // unnecessary READ -> UI -> WRITE feedback loop.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (effectId === 21 || suppressLiveRef.current || !realtimeSync || !connected || vizLoopRef.current) return;
    clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      writeConfig('live').catch(() => { });
    }, DEBOUNCE_MS);
    return () => clearTimeout(liveTimerRef.current);
  }, [effectId, brightness, speed, colorful, rgb, realtimeSync, connected]);

  // Self-Define live apply only reacts to painted key data. Changing the
  // floating RGB picker changes the brush color, not existing keys.
  useEffect(() => {
    if (effectId !== 21 || suppressLiveRef.current || !realtimeSync || !connected || vizLoopRef.current) return;
    clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      writeConfig('per-key-live').catch(() => { });
    }, DEBOUNCE_MS);
    return () => clearTimeout(liveTimerRef.current);
  }, [perKeyColors, effectId, realtimeSync, connected]);

  // Smooth Periodic Auto Sync (Runs only when completely idle)
  useEffect(() => {
    if (!connected || !realtimeSync) return;
    const id = setInterval(() => {
      if (Date.now() - lastWriteTimeRef.current < 2000 || vizLoopRef.current) return;
      syncDevice();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [connected, realtimeSync, profile, effectColors]);

  // ─────────────────────────────────────────────────────────────────────────
  // WebHID Connection & Auto Reconnect
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('hid' in navigator)) {
      setSupported(false);
      addLog('error', 'WebHID not available in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }
    navigator.hid.getDevices().then(list => {
      let matchedDev = null;
      let matchedProf = null;
      for (const p of KEYBOARD_PROFILES) {
        const found = list.find(x => x.vendorId === p.vid && x.productId === p.pid);
        if (found) {
          matchedDev = found;
          matchedProf = p;
          break;
        }
      }
      if (!matchedDev) return;

      setProfile(matchedProf);
      matchedDev.open().then(() => {
        hidRef.current = matchedDev;
        setConnected(true);
        setDevName(matchedDev.productName || matchedProf.name);
        setTransportCaps({
          audio88: hasOutputReport(matchedDev, 0x13),
          direct520: hasFeatureReport(matchedDev, matchedProf.reportId),
        });
        addLog('connect', `Auto-connected to ${matchedDev.productName || matchedProf.name} via WebHID`);
        readConfig().then(raw => {
          if (!raw) return;
          const s = matchedProf.decodeState(raw);
          lastStateRef.current = s;
          setLastRawData(raw.slice(0, 32));
          setReadback(describeState(s));
          applyStateToUI(s);
          addLog('read', `Initial state synchronized: Effect = ${getEffectName(s.id)}, Brightness = ${s.brightness}/4, Speed = ${s.speed}/4, Mode = ${s.colorful ? 'Rainbow' : 'Single-color'}`);
        }).catch(() => { });
      }).catch(() => { });
    });

    navigator.hid.addEventListener('disconnect', ev => {
      if (hidRef.current && ev.device === hidRef.current) {
        handleDisconnect();
        addLog('disconnect', 'Keyboard disconnected from USB.');
      }
    });
    return () => { stopAudioCapture(false); };
  }, [profile]);

  // ─────────────────────────────────────────────────────────────────────────
  // Spectrum Canvas Drawer
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let animId = null;
    const canvas = specCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const buf = audioAnalyser ? new Uint8Array(audioAnalyser.frequencyBinCount) : null;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const rootStyle = getComputedStyle(document.documentElement);
      const accent3Str = rootStyle.getPropertyValue('--accent3').trim() || 'rgb(236, 72, 153)';
      const accent3RgbStr = rootStyle.getPropertyValue('--accent3-rgb').trim() || '236, 72, 153';

      if (audioAnalyser && vizRunning && buf) {
        // Active Audio Visualization
        audioAnalyser.getByteFrequencyData(buf);

        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = accent3Str;

        const totalBars = 64;
        const barW = canvas.width / totalBars;
        const step = Math.max(1, Math.floor(buf.length / totalBars));

        for (let i = 0; i < totalBars; i++) {
          const val = buf[i * step] || 0;
          const barH = (val / 255) * canvas.height * 0.85;

          // Premium linear gradient using dynamic accent3 color
          const grad = ctx.createLinearGradient(0, canvas.height - barH, 0, canvas.height);
          grad.addColorStop(0, accent3Str);
          grad.addColorStop(1, `rgba(${accent3RgbStr}, 0.15)`);

          ctx.fillStyle = grad;
          ctx.fillRect(i * barW, canvas.height - barH, Math.max(1.5, barW - 2.5), barH);
        }
        ctx.restore();
      } else {
        // Idle state: Slow, beautiful ambient wave
        phase += 0.025;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = accent3Str;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
          const breath = Math.sin(phase * 0.55) * 0.5 + 0.5;
          const amp = 12 + breath * 14;
          const y = canvas.height / 2 + Math.sin(x * 0.02 + phase) * amp * Math.sin(x * Math.PI / canvas.width);

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = accent3Str;
        ctx.stroke();
        ctx.restore();

        // Subtly print status text in the center
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '700 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ENGINE ONLINE — AWAITING AUDIO', canvas.width / 2, canvas.height - 20);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [audioAnalyser, vizRunning, activeTab]);

  // ─────────────────────────────────────────────────────────────────────────
  // Protocol helpers
  // ─────────────────────────────────────────────────────────────────────────
  const sendReport = async (full) => {
    if (!hidRef.current) throw new Error('Keyboard not connected.');
    if (full.length !== profile.reportSize)
      throw new Error(`Expected ${profile.reportSize} bytes, got ${full.length}.`);
    if (debugModeRef.current) {
      addLog('debug', `HID OUT [${full[0].toString(16).padStart(2, '0')}] ${bytesToHex(full.slice(1, 32))}...`);
    }
    await hidRef.current.sendFeatureReport(full[0], full.slice(1));
  };

  const normaliseBody = (view) => {
    const body = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    if (body.length && body[0] === profile.reportId) return new Uint8Array(body);
    const full = new Uint8Array(body.length + 1);
    full[0] = profile.reportId;
    full.set(body, 1);
    return full;
  };

  const readConfig = async () => {
    if (!hidRef.current) throw new Error('Keyboard not connected.');
    await sendReport(profile.buildReadInit());
    await sleep(38);
    const view = await hidRef.current.receiveFeatureReport(profile.reportId);
    const raw = normaliseBody(view);
    if (raw.length < 136) throw new Error(`Feature read returned only ${raw.length} bytes.`);
    if (raw[0] !== profile.reportId || raw[1] !== profile.commands.readInit)
      throw new Error(`Unexpected config header: ${hexFmt(raw.slice(0, 8))}`);
    if (debugModeRef.current) {
      addLog('debug', `HID IN  [${raw[0].toString(16).padStart(2, '0')}] ${bytesToHex(raw.slice(1, 32))}...`);
    }
    return raw;
  };

  const getEffectName = id => {
    const e = profile.effects.find(x => x.id === id);
    return e ? e.name : `Custom Effect (${id})`;
  };

  const describeState = s => {
    if (s.id === 0) return 'OFF · Keyboard lighting disabled';
    if (s.id === 21) return 'Self Define / Per-Key RGB';
    return `${getEffectName(s.id)} · Brightness: ${s.brightness ?? '?'}/4 · Speed: ${s.speed ?? '?'}/4 · ${s.colorful ? 'Colorful' : 'Single-color'}`;
  };

  const applyStateToUI = s => {
    const found = profile.effects.find(e => e.id === s.id);
    if (!found) return;
    suppressLiveRef.current = true;
    setEffectId(s.id);
    const remembered = effectColors[s.id];
    if (Array.isArray(remembered) && remembered.length >= 3) {
      const nextRgb = remembered.slice(0, 3);
      setRgb(nextRgb);
      setHexColor(rgbToHex(nextRgb));
    }
    if (s.brightness !== null) setBrightness(Math.max(0, Math.min(4, s.brightness)));
    if (s.speed !== null) setSpeed(Math.max(0, Math.min(4, s.speed)));
    if (s.colorful !== null) setColorful(!!s.colorful);
    // Keep suppression through React's effect flush.
    setTimeout(() => { suppressLiveRef.current = false; }, 80);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
  const connectDevice = async () => {
    if (!supported) return;
    try {
      const list = await navigator.hid.requestDevice({
        filters: KEYBOARD_PROFILES.map(p => ({ vendorId: p.vid, productId: p.pid }))
      });
      if (!list.length) { addLog('system', 'No keyboard selected in browser dialog.'); return; }
      const d = list[0];
      const matchedProfile = findKeyboardProfile(d.vendorId, d.productId);
      setProfile(matchedProfile);

      if (!d.opened) await d.open();
      hidRef.current = d;
      setTransportCaps({
        audio88: hasOutputReport(d, 0x13),
        direct520: hasFeatureReport(d, matchedProfile.reportId),
      });
      setConnected(true);
      setDevName(d.productName || matchedProfile.name);
      addLog('connect', `Connected to ${d.productName || matchedProfile.name}`);

      ioBusyRef.current = true;
      const raw = await readConfig();
      const s = matchedProfile.decodeState(raw);
      lastStateRef.current = s;
      setLastRawData(raw.slice(0, 32));
      setReadback(describeState(s));
      applyStateToUI(s);
      addLog('sync', `Loaded hardware config: ${describeState(s)}`);
    } catch (err) {
      addLog('error', `Connection error: ${err.message}`);
    } finally { ioBusyRef.current = false; }
  };

  const handleDisconnect = () => {
    stopVisualizerLoop();
    stopAudioCapture(false);
    if (hidRef.current?.opened) hidRef.current.close().catch(() => { });
    hidRef.current = null;
    setTransportCaps({ audio88: null, direct520: null });
    setConnected(false);
    setDevName('');
    setReadback('—');
    setLastRawData(null);
  };

  const syncDevice = async () => {
    if (!hidRef.current || ioBusyRef.current || vizLoopRef.current) return;
    ioBusyRef.current = true;
    try {
      const raw = await readConfig();
      const s = profile.decodeState(raw);
      setLastRawData(raw.slice(0, 32));
      const changed = !lastStateRef.current ||
        ['id', 'brightness', 'speed', 'colorful'].some(k => lastStateRef.current[k] !== s[k]);
      lastStateRef.current = s;
      const desc = describeState(s);
      setReadback(desc);
      if (changed) {
        addLog('sync', `Detected knob/hardware changes: ${desc}`);
        applyStateToUI(s);
      }
    } catch (err) {
      addLog('error', `Sync failed: ${err.message}`);
    } finally { ioBusyRef.current = false; }
  };

  const performWrite = async (job) => {
    const { src, colorOnly, snapshot } = job;
    const jobEffect = profile.effects.find(e => e.id === snapshot.effectId) || profile.effects[1];
    ioBusyRef.current = true;
    lastWriteTimeRef.current = Date.now();
    setTxStatus('sending');

    try {
      addLog('write', `Writing settings (${src})${colorOnly ? ' — Palette Only' : ''}`, {
        effect: jobEffect.name,
        brightness: `${snapshot.brightness}/4`,
        speed: `${snapshot.speed}/4`,
        mode: snapshot.colorful ? 'Rainbow Spectrum' : 'Single-color (Custom RGB)',
        rgb: rgbToHex(snapshot.rgb),
      });

      const currentRaw = await readConfig();
      let cfgReport;
      let secondReport = null;
      let secondLabel = null;
      let palOff = null;

      if (jobEffect.perKey) {
        // OEM Self-Define transaction captured from the official app:
        // 0x84 GET -> 0x04 config selecting effect 21 -> 0x06 RGB planes.
        cfgReport = profile.buildConfigWrite(currentRaw, {
          effect: jobEffect,
          brightness: snapshot.brightness,
          speed: snapshot.speed,
          colorful: false,
          rgb: snapshot.rgb,
        });
        secondReport = profile.buildSelfDefineReport(snapshot.perKeyColors || {});
        secondLabel = `Self-Define RGB planes (${Object.keys(snapshot.perKeyColors || {}).length} painted keys)`;
      } else {
        if (colorOnly) {
          cfgReport = new Uint8Array(profile.reportSize);
          cfgReport.set(currentRaw.slice(0, Math.min(currentRaw.length, profile.reportSize)));
          cfgReport[0] = profile.reportId;
          cfgReport[1] = profile.commands.writeConfig;

          if (jobEffect.id !== 0 && jobEffect.color && !jobEffect.colorfulOnly) {
            const o = profile.effectPairOffset(jobEffect.id);
            const spd = (cfgReport[o + 1] >> 4) & 0x0f;
            cfgReport[o + 1] = (spd << 4) | 0x00;
          }
        } else {
          cfgReport = profile.buildConfigWrite(currentRaw, {
            effect: jobEffect,
            brightness: snapshot.brightness,
            speed: snapshot.speed,
            colorful: snapshot.colorful,
            rgb: snapshot.rgb,
          });
        }

        // OFF is a real firmware effect and needs only the config selector.
        // Built-in lit effects use their effect-specific 0x0A palette blocks.
        if (jobEffect.id !== 0) {
          secondReport = profile.buildPaletteReport(snapshot.rgb, jobEffect.id, snapshot.effectColors);
          secondLabel = 'Effect palette';
          palOff = profile.paletteColorOffset?.(jobEffect.id);
        } else {
          secondLabel = 'OFF config only';
        }
      }

      await sleep(70);
      await sendReport(cfgReport);
      if (secondReport) {
        await sleep(70);
        await sendReport(secondReport);
      }
      await sleep(320);

      const verifyRaw = await readConfig();
      const verified = profile.decodeState(verifyRaw);
      lastStateRef.current = verified;
      setLastRawData(verifyRaw.slice(0, 32));
      setReadback(describeState(verified));

      addLog('verify', `Hardware confirmed: ${describeState(verified)}`,
        jobEffect.perKey
          ? { protocol: 'Feature 0x06 / command 0x06', paintedKeys: Object.keys(snapshot.perKeyColors || {}).length }
          : palOff !== null && palOff !== undefined
            ? { protocol: 'Feature 0x06 / command 0x0A', paletteSlot: `${palOff}..${palOff + 2}`, rgb: rgbToHex(snapshot.rgb) }
            : { protocol: secondLabel }
      );
      setTxStatus('success');
      setTimeout(() => {
        setTxStatus(prev => prev === 'success' ? 'idle' : prev);
      }, 1500);
    } catch (err) {
      addLog('error', `Write failed: ${err.message}`);
      setTxStatus('idle');
    } finally {
      ioBusyRef.current = false;
    }
  };

  const drainWriteQueue = async () => {
    if (writeLoopRef.current) return;
    writeLoopRef.current = true;
    try {
      while (pendingWriteRef.current && hidRef.current && !vizLoopRef.current) {
        const job = pendingWriteRef.current;
        pendingWriteRef.current = null;

        // If an auto-sync read is already in progress, wait rather than losing
        // the latest slider/color change.
        while (ioBusyRef.current && hidRef.current && !vizLoopRef.current) {
          await sleep(20);
        }
        if (!hidRef.current || vizLoopRef.current) break;
        await performWrite(job);
      }
    } finally {
      writeLoopRef.current = false;
      // Close the tiny race where a fresh UI change can arrive after the loop
      // observes an empty queue but before writeLoopRef is cleared.
      if (pendingWriteRef.current && hidRef.current && !vizLoopRef.current) {
        queueMicrotask(() => drainWriteQueue());
      }
    }
  };

  const writeConfig = async (src = 'manual', colorOnly = false) => {
    if (!connected || !hidRef.current || vizLoopRef.current) return;

    const snapshotEffect = profile.effects.find(e => e.id === effectId) || profile.effects[1];
    const effectiveColorful = snapshotEffect.colorfulOnly
      ? true
      : snapshotEffect.colorful
        ? colorful
        : false;

    const snapshot = {
      effectId,
      brightness,
      speed,
      colorful: effectiveColorful,
      rgb: [...rgb],
      // Only remember custom RGB for effects that actually expose a custom
      // color. Colorless effects must not silently overwrite hidden slots.
      effectColors: snapshotEffect.color && !snapshotEffect.perKey
        ? { ...effectColors, [effectId]: [...rgb] }
        : { ...effectColors },
      perKeyColors: { ...perKeyColors },
    };

    // Latest-wins queue: changes made while USB is busy are not silently lost.
    pendingWriteRef.current = { src, colorOnly, snapshot };
    await drainWriteQueue();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Audio & Direct RGB
  // ─────────────────────────────────────────────────────────────────────────
  const setupAudioPipeline = async (stream, label) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = smoothingFromUi(audioSmooth);

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    // AudioWorklet runs on the Web Audio rendering thread. Its 20 FPS spectrum
    // messages can be wired directly to the HID worker, so changing Chrome
    // tabs does not depend on requestAnimationFrame/setTimeout on this page.
    try {
      await ctx.audioWorklet.addModule('/audio-analysis-worklet.js');
      const worklet = new AudioWorkletNode(ctx, 'openkeyboard-audio-analysis', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      const silent = ctx.createGain();
      silent.gain.value = 0;
      source.connect(worklet);
      worklet.connect(silent).connect(ctx.destination);
      audioWorkletNodeRef.current = worklet;
      addLog('audio', 'Background audio engine ready: AudioWorklet @ ~20 FPS.');
    } catch (err) {
      audioWorkletNodeRef.current = null;
      addLog('system', `AudioWorklet unavailable; using foreground analyser fallback: ${err.message}`);
    }

    audioCtxRef.current = ctx;
    audioStrRef.current = stream;
    setAudioAnalyser(analyser);
    if (ctx.state === 'suspended') await ctx.resume().catch(() => { });
    addLog('audio', `${label} audio source initialized`);
  };

  const handleMic = async () => {
    try {
      stopAudioCapture(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await setupAudioPipeline(stream, 'Microphone');
      setAudioSrc('mic');
    } catch (err) { addLog('error', `Microphone error: ${err.message}`); }
  };

  const handleSystemAudio = async () => {
    try {
      stopAudioCapture(false);

      // systemAudio is a display-capture hint, not an AudioTrackConstraint.
      // Chrome/Edge still decide which surfaces can expose audio.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        systemAudio: 'include',
        surfaceSwitching: 'include',
        selfBrowserSurface: 'exclude',
      });

      const aTracks = stream.getAudioTracks();
      if (!aTracks.length) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('That shared tab/window/screen did not expose an audio track. Try sharing a browser tab with “Share tab audio” enabled.');
      }

      // Keep the original display stream alive. Some Chromium/OS combinations
      // end the associated audio capture when the video track is stopped. The
      // Web Audio node ignores video tracks, so retaining them costs no canvas
      // rendering and makes system/tab audio substantially more reliable.
      await setupAudioPipeline(stream, 'System/Tab');
      setAudioSrc('system');

      const ended = () => stopAudioCapture(true);
      stream.getTracks().forEach(track =>
        track.addEventListener('ended', ended, { once: true })
      );
    } catch (err) {
      if (err.name !== 'NotAllowedError') addLog('error', `System audio error: ${err.message}`);
    }
  };

  const stopAudioCapture = (logIt = true) => {
    stopVisualizerLoop();
    if (audioStrRef.current) { audioStrRef.current.getTracks().forEach(t => t.stop()); audioStrRef.current = null; }
    audioWorkletNodeRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => { }); audioCtxRef.current = null; }
    setAudioAnalyser(null);
    setAudioSrc('none');
    if (logIt) addLog('audio', 'Audio capture stopped');
  };

  const sendSmallFeatureReport = async (reportId, data) => {
    const body = new Uint8Array(profile.reportSize - 1);
    body.set(data.slice(0, body.length));
    await hidRef.current.sendFeatureReport(reportId, body);
  };

  const enableDirectMode = async () => {
    let sent = 0;
    for (const step of profile.buildDirectEnableSequence?.() || []) {
      try {
        await sendSmallFeatureReport(step.reportId, step.data);
        sent++;
      } catch {
        // Some firmware exposes only report 0x06 and needs no enable preamble.
      }
      await sleep(6);
    }
    return sent;
  };

  const disableDirectMode = async () => {
    const step = profile.buildDirectDisableReport?.();
    if (!step || !hidRef.current) return;
    try { await sendSmallFeatureReport(step.reportId, step.data); } catch { }
  };

  const send20ByteOutput = async (frame) => {
    // WebHID strips the report ID from the body.
    await hidRef.current.sendReport(frame[0], frame.slice(1));
  };

  const chooseStreamTransport = () => {
    const d = hidRef.current;
    const selected = audioTransport === 'direct520' ? 'direct520' : 'audio88';
    const other = selected === 'audio88' ? 'direct520' : 'audio88';
    const support = {
      direct520: hasFeatureReport(d, profile.reportId),
      audio88: hasOutputReport(d, 0x13),
    };
    if (support[selected]) return selected;
    if (audioFallback && support[other]) return other;
    throw new Error(
      `${selected === 'audio88' ? 'OEM Audio 0x13/0x88' : 'Direct RGB 0x06/0x08'} is not exposed by this HID collection` +
      (audioFallback ? ' and the fallback transport is unavailable.' : '.')
    );
  };

  const ensureMainHidOpen = async () => {
    if (hidRef.current?.opened) return hidRef.current;
    const list = await navigator.hid.getDevices();
    const d = list.find(x => x.vendorId === profile.vid && x.productId === profile.pid);
    if (!d) throw new Error('Previously-authorized keyboard is not available.');
    if (!d.opened) await d.open();
    hidRef.current = d;
    return d;
  };

  const startWorkerVisualizer = async () => {
    if (!audioWorkletNodeRef.current || typeof Worker === 'undefined') {
      throw new Error('AudioWorklet background engine is unavailable.');
    }

    // WorkerNavigator.hid can access already-authorized WebHID devices without
    // another chooser. Close the window-owned handle before worker takeover.
    if (hidRef.current?.opened) await hidRef.current.close();
    hidRef.current = null;

    const worker = new Worker(new URL('./workers/hid-stream-worker.js', import.meta.url), { type: 'module' });
    hidWorkerRef.current = worker;
    const channel = new MessageChannel();
    workerAudioChannelRef.current = channel;

    worker.postMessage({ type: 'attach-audio-port', port: channel.port1 }, [channel.port1]);
    audioWorkletNodeRef.current.port.postMessage(
      { type: 'attach-stream-port', port: channel.port2 },
      [channel.port2]
    );
    worker.postMessage({
      type: 'settings',
      settings: {
        mode: audioModeRef.current,
        gain: audioGainRef.current,
        colorful: audioColorfulRef.current,
        rgb: rgbRef.current,
      }
    });

    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Background HID worker did not become ready in time.')), 2500);
      worker.onmessage = event => {
        const msg = event.data || {};
        if (msg.type === 'ready') {
          clearTimeout(timer);
          resolve(msg);
        } else if (msg.type === 'error') {
          clearTimeout(timer);
          reject(new Error(msg.message || 'Background HID worker failed.'));
        } else if (msg.type === 'stopped') {
          setBackgroundEngine('idle');
        }
      };
      worker.postMessage({
        type: 'start',
        preference: audioTransport === 'direct520' ? 'direct520' : 'audio88',
        fallback: audioFallback,
      });
    });

    // After startup, keep a persistent handler so a runtime HID failure does
    // not disappear into a Promise that has already resolved.
    worker.onmessage = event => {
      const msg = event.data || {};
      if (msg.type === 'error') {
        addLog('error', `Background HID worker stopped: ${msg.message || 'unknown error'}`);
        workerActiveRef.current = false;
        vizLoopRef.current = false;
        setVizRunning(false);
        setBackgroundEngine('worker error');
        try { worker.terminate(); } catch { }
        hidWorkerRef.current = null;
        ensureMainHidOpen().catch(err => addLog('error', `Could not reclaim keyboard after worker error: ${err.message}`));
      } else if (msg.type === 'stopped') {
        setBackgroundEngine('idle');
      }
    };
    worker.onerror = event => {
      addLog('error', `Background worker exception: ${event.message || 'unknown worker error'}`);
      workerActiveRef.current = false;
      vizLoopRef.current = false;
      setVizRunning(false);
      setBackgroundEngine('worker error');
      try { worker.terminate(); } catch { }
      hidWorkerRef.current = null;
      ensureMainHidOpen().catch(err => addLog('error', `Could not reclaim keyboard after worker exception: ${err.message}`));
    };

    workerActiveRef.current = true;
    streamTransportRef.current = result.transport;
    vizLoopRef.current = true;
    setVizRunning(true);
    setBackgroundEngine(`AudioWorklet + HID Worker · ${result.transport === 'audio88' ? 'OEM Audio 0x13/0x88' : 'Direct RGB 0x06/0x08'}`);
    addLog('audio', `Background realtime engine started: ${result.transport === 'audio88' ? 'OEM Audio Stream 0x13/0x88' : 'Direct RGB Framebuffer 0x06/0x08'}.`);
  };


  const startVisualizerLoop = async () => {
    if (!connected) {
      addLog('error', 'Connect keyboard before starting visualizer.');
      return;
    }
    if (!audioAnalyserRef.current) {
      addLog('error', 'Select an audio source (Microphone or Tab/System) first.');
      return;
    }
    if (vizLoopRef.current) return;

    // Preferred path: AudioWorklet -> Dedicated HID Worker. This removes the
    // main page's timer/render loop from the hardware stream and is far more
    // resistant to Chrome background-tab throttling.
    if (audioWorkletNodeRef.current) {
      try {
        pendingWriteRef.current = null;
        clearTimeout(liveTimerRef.current);
        await startWorkerVisualizer();
        return;
      } catch (err) {
        addLog('system', `Background worker stream unavailable; falling back to page loop: ${err.message}`);
        setBackgroundEngine('foreground fallback');
        try { await ensureMainHidOpen(); } catch (openErr) {
          addLog('error', `Could not reopen keyboard after worker fallback: ${openErr.message}`);
          return;
        }
        if (hidWorkerRef.current) {
          try { hidWorkerRef.current.terminate(); } catch { }
          hidWorkerRef.current = null;
        }
        workerActiveRef.current = false;
      }
    }

    try {
      const transport = chooseStreamTransport();
      streamTransportRef.current = transport;

      if (transport === 'direct520') {
        const enabled = await enableDirectMode();
        addLog('audio', `Realtime transport: 520-byte Feature 0x06 / cmd 0x08${enabled ? ` (${enabled} enable reports accepted)` : ''}`);
      } else {
        // Prime OEM audio stream with a few idle frames.
        const idles = buildAudioStreamFrames(new Map());
        for (let i = 0; i < 3; i++) {
          await send20ByteOutput(idles[0]);
          await sleep(12);
        }
        addLog('audio', 'Realtime transport: 20-byte Output 0x13 / cmd 0x88');
      }
    } catch (err) {
      addLog('error', `Cannot start realtime visualizer: ${err.message}`);
      return;
    }

    pendingWriteRef.current = null;
    clearTimeout(liveTimerRef.current);
    vizLoopRef.current = true;
    setVizRunning(true);
    setBackgroundEngine('Foreground page loop');

    let phase = 0;
    let frames = 0;
    let lastFrameAt = performance.now();

    const loop = async () => {
      if (!vizLoopRef.current) return;

      const curAnalyser = audioAnalyserRef.current;
      if (!curAnalyser) {
        vizLoopRef.current = false;
        setVizRunning(false);
        return;
      }

      try {
        // Keep target cadence stable instead of piling up asynchronous writes.
        const now = performance.now();
        const elapsed = now - lastFrameAt;
        if (elapsed < 45) {
          setTimeout(loop, 45 - elapsed);
          return;
        }
        lastFrameAt = performance.now();

        const freq = new Uint8Array(curAnalyser.frequencyBinCount);
        curAnalyser.getByteFrequencyData(freq);

        phase += 0.055;
        const colors = renderAudioFrame(profile, freq, {
          mode: audioModeRef.current,
          gain: audioGainRef.current,
          colorful: audioColorfulRef.current,
          rgb: rgbRef.current,
          phase,
        });

        if (streamTransportRef.current === 'audio88') {
          const fragments = buildAudioStreamFrames(colors, 64);
          for (let i = 0; i < fragments.length; i++) {
            await send20ByteOutput(fragments[i]);
            if (i + 1 < fragments.length) await sleep(8);
          }
        } else {
          await sendReport(profile.buildDirectFrame(colors));
        }

        frames++;
        if (frames === 1) addLog('audio', 'First realtime keyboard frame sent successfully.');
      } catch (err) {
        addLog('error', `Realtime RGB error: ${err.message}`);
        vizLoopRef.current = false;
        setVizRunning(false);
        return;
      }

      setTimeout(loop, 0);
    };

    loop();
  };

  const stopVisualizerLoop = async () => {
    if (!vizLoopRef.current && !workerActiveRef.current) return;
    vizLoopRef.current = false;
    setVizRunning(false);

    if (workerActiveRef.current && hidWorkerRef.current) {
      try { hidWorkerRef.current.postMessage({ type: 'stop' }); } catch { }
      await sleep(180);
      try { hidWorkerRef.current.terminate(); } catch { }
      hidWorkerRef.current = null;
      workerActiveRef.current = false;
      workerAudioChannelRef.current = null;

      try { await ensureMainHidOpen(); }
      catch (err) { addLog('error', `Keyboard reopen after background stream failed: ${err.message}`); }

      streamTransportRef.current = null;
      setBackgroundEngine('idle');
      addLog('audio', 'Background keyboard visualizer stopped.');
      if (hidRef.current && connected) {
        setTimeout(() => writeConfig('restore-after-stream').catch(() => { }), 140);
      }
      return;
    }

    try {
      if (hidRef.current && streamTransportRef.current === 'audio88') {
        const idle = buildAudioStreamFrames(new Map())[0];
        await send20ByteOutput(idle);
      } else if (hidRef.current) {
        const blank = profile.buildDirectFrame(new Map());
        await sendReport(blank);
        await disableDirectMode();
      }
    } catch { }

    streamTransportRef.current = null;
    setBackgroundEngine('idle');
    addLog('audio', 'Realtime keyboard visualizer stopped');

    if (hidRef.current && connected) {
      setTimeout(() => writeConfig('restore-after-stream').catch(() => { }), 120);
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && vizLoopRef.current && !workerActiveRef.current) {
        addLog('system', 'Controller tab is hidden while the foreground audio loop is active. Chromium may throttle it; use the AudioWorklet + HID Worker engine or install/open the PWA in its own window.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Global Color Change Handler (Synced to whole site & keyboard)
  // ─────────────────────────────────────────────────────────────────────────
  const handleGlobalColorChange = (newRgb, newHex) => {
    setRgb(newRgb);
    setHexColor(newHex);
    if (activeEffect.color && !activeEffect.perKey) {
      setEffectColors(prev => ({ ...prev, [effectId]: [...newRgb] }));
    }
    if (activeEffect.color && !activeEffect.perKey && !activeEffect.colorfulOnly && colorful) {
      setColorful(false);
    }
  };

  const handleToggleColorful = (newVal) => {
    setColorful(newVal);
  };

  const handleEffectChange = (nextId) => {
    const nextEffect = profile.effects.find(e => e.id === nextId);
    setEffectId(nextId);

    // Keep the UI state valid for the selected firmware effect. This avoids
    // stale Colorful=true from a previous effect making colorless/fixed effects
    // preview differently from the bytes we actually send.
    if (nextEffect?.colorfulOnly) setColorful(true);
    else if (!nextEffect?.colorful) setColorful(false);

    if (nextEffect?.perKey) {
      if (!Object.keys(perKeyColors || {}).length) {
        setPerKeyColors(profile.selfDefineGamingDefault?.() || {});
      }
      setColorful(false);
      return;
    }

    const remembered = effectColors[nextId];
    if (Array.isArray(remembered) && remembered.length >= 3) {
      const nextRgb = remembered.slice(0, 3);
      setRgb(nextRgb);
      setHexColor(rgbToHex(nextRgb));
    }
  };

  const handlePerKeyPaint = (idx) => {
    if (effectId !== 21) return;
    setPerKeyColors(prev => {
      if (perKeyErase) {
        if (!(idx in prev)) return prev;
        const next = { ...prev };
        delete next[idx];
        return next;
      } else {
        if (prev[idx] && prev[idx][0] === rgb[0] && prev[idx][1] === rgb[1] && prev[idx][2] === rgb[2]) {
          return prev;
        }
        const next = { ...prev };
        next[idx] = [...rgb];
        return next;
      }
    });
  };

  const setPerKeyPreset = (kind) => {
    if (kind === 'default') {
      setPerKeyColors(profile.selfDefineGamingDefault?.() || {});
      setPerKeyErase(false);
      return;
    }
    if (kind === 'all') {
      const next = {};
      profile.keys.forEach(([idx]) => { next[idx] = [...rgb]; });
      setPerKeyColors(next);
      setPerKeyErase(false);
      return;
    }
    if (kind === 'clear') {
      setPerKeyColors(prev => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
    }
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const name = templateName.trim();
    const next = [...templates.filter(t => t.name !== name), { name, colors: { ...perKeyColors } }];
    setTemplates(next);
    localStorage.setItem('openkeyboard_custom_templates', JSON.stringify(next));
    setTemplateName('');
    addLog('system', `Saved custom layout template "${name}"`);
  };

  const loadTemplate = (colors) => {
    setPerKeyColors(colors || {});
    addLog('system', 'Loaded layout template from storage.');
  };

  const deleteTemplate = (name) => {
    const next = templates.filter(t => t.name !== name);
    setTemplates(next);
    localStorage.setItem('openkeyboard_custom_templates', JSON.stringify(next));
    addLog('system', `Deleted template "${name}"`);
  };

  const accentCSS = { color: 'var(--accent)' };
  const accent2CSS = { color: 'var(--accent2)' };

  const ThemeBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <div className="toggle-pill" title="Toggle UI style mode">
        <button
          className={`toggle-pill-btn ${styleMode === 'glass' ? 'active' : ''}`}
          onClick={() => setStyleMode('glass')}
        >
          🫧 Glass
        </button>
        <button
          className={`toggle-pill-btn ${styleMode === 'neo' ? 'active' : ''}`}
          onClick={() => setStyleMode('neo')}
        >
          ⬛ Neo
        </button>
      </div>

      <div className="toggle-pill" title="Toggle light / dark theme">
        <button
          className={`toggle-pill-btn ${themeMode === 'dark' ? 'active' : ''}`}
          onClick={() => setThemeMode('dark')}
        >
          🌙 Dark
        </button>
        <button
          className={`toggle-pill-btn ${themeMode === 'light' ? 'active' : ''}`}
          onClick={() => setThemeMode('light')}
        >
          ☀️ Light
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#1a2640',
        color: 'var(--text)',
        padding: 'clamp(1rem, 3vw, 2.5rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        transition: 'background 0.3s, color 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Blobs with dynamic keyboard accent */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="blob-1" style={{
          position: 'absolute', top: '-5%', left: '-10%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'rgba(var(--accent-rgb),0.1)', filter: 'blur(90px)'
        }} />
        <div className="blob-2" style={{
          position: 'absolute', bottom: '-10%', right: '-5%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'rgba(168,85,247,0.06)', filter: 'blur(100px)'
        }} />
        <div className="blob-3" style={{
          position: 'absolute', top: '40%', right: '30%',
          width: '25vw', height: '25vw', borderRadius: '50%',
          background: 'rgba(236,72,153,0.04)', filter: 'blur(70px)'
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: '72rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', zIndex: 1 }}>

        {/* 1. Header */}
        <header className="panel" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  OpenKeyboard · Universal Controller
                </div>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  <span style={{ color: 'var(--text)', opacity: 0.92 }}>Open</span><span style={{ color: '#ffffff' }}>Keyboard</span>
                </h1>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text2)', fontSize: '0.85rem' }}>
                  A universal open-source web controller for mechanical keyboards.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {/* Profile Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', fontWeight: 800 }}>
                    Active Keyboard
                  </label>
                  <select
                    value={profile.id}
                    onChange={(e) => {
                      const matched = KEYBOARD_PROFILES.find(p => p.id === e.target.value);
                      if (matched) {
                        setProfile(matched);
                        addLog('system', `Selected profile model: ${matched.name}`);
                      }
                    }}
                    disabled={connected}
                    className="app-select"
                    style={{
                      padding: '0.45rem 2.2rem 0.45rem 0.75rem',
                      fontSize: '0.75rem',
                      width: '210px',
                      height: '35px',
                      cursor: connected ? 'not-allowed' : 'pointer',
                      opacity: connected ? 0.6 : 1,
                    }}
                  >
                    {KEYBOARD_PROFILES.map(p => (
                      <option key={p.id} value={p.id}>{p.brand} — {p.name}</option>
                    ))}
                  </select>
                </div>

                <a
                  href="https://github.com/AbhiCrackerOfficial/OpenKeyboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.58rem 0.85rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  title="Star and Contribute on GitHub"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg> GitHub
                </a>

                {!isInstalled && installPrompt && (
                  <button className="btn btn-secondary" onClick={installApp} style={{ padding: '0.58rem 0.85rem' }} title="Install as a standalone desktop web app">
                    <Download size={15} /> Install
                  </button>
                )}
                {connected ? (<>
                  <button className="btn btn-secondary" onClick={syncDevice} disabled={vizLoopRef.current} style={{ padding: '0.58rem 0.85rem' }} title="Read current config from keyboard">
                    <RefreshCw size={15} /> Sync
                  </button>
                  <button className="btn btn-danger" onClick={handleDisconnect} style={{ padding: '0.58rem 0.85rem' }}>
                    <WifiOff size={15} /> Disconnect
                  </button>
                </>) : (
                  <button className="btn btn-primary" onClick={connectDevice} disabled={!supported} style={{ padding: '0.58rem 1.1rem' }}>
                    <Wifi size={15} /> Connect Device
                  </button>
                )}
              </div>
            </div>

            <ThemeBar />
          </div>
        </header>

        {!supported && (
          <div style={{
            padding: '1rem', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace'
          }}>
            WebHID is unavailable in this browser. Use a Chromium-based desktop browser that supports WebHID.
          </div>
        )}

        {/* 2. Status Banner with Modern ToggleSwitches */}
        <div className="panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" style={{
              color: connected ? 'var(--accent)' : '#ef4444',
              background: connected ? 'var(--accent)' : '#ef4444'
            }} />
            <strong style={{ letterSpacing: '0.04em' }}>{connected ? `CONNECTED — ${devName}` : 'DISCONNECTED'}</strong>
          </span>

          <span style={{ flex: 1, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {readback !== '—' && `Config: ${readback}`}
          </span>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap', position: 'relative' }}>
            <ToggleSwitch
              checked={realtimeSync}
              onChange={setRealtimeSync}
              label="Realtime Sync"
              color="var(--accent)"
            />
            <button
              onClick={() => setShowSyncInfo(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex', alignItems: 'center', marginLeft: -12 }}
              title="What is Realtime Sync?"
            >
              <Info size={14} />
            </button>
            {showSyncInfo && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100, width: 260,
                background: 'var(--surface2)', border: '1px solid var(--border-alt)',
                borderRadius: styleMode === 'neo' ? 0 : 10, padding: '0.85rem', fontSize: '0.72rem',
                color: 'var(--text2)', lineHeight: 1.5,
                boxShadow: styleMode === 'neo' ? '4px 4px 0 var(--border)' : '0 8px 24px rgba(0,0,0,0.45)'
              }}>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Realtime Sync</strong>
                Retrieves external changes (speed, brightness, knobs) from your keyboard every 3s, and instantly streams color changes back. Manual Apply buttons are hidden when active.
              </div>
            )}
          </div>
        </div>

        {/* 3. Main Controls Section ON TOP of Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', borderBottom: `2px solid var(--border-alt)`, paddingBottom: '0.85rem' }}>
            {[
              { id: 'lighting', icon: <Sliders size={14} />, label: 'Lighting' },
              { id: 'audio', icon: <Volume2 size={14} />, label: 'Audio Visualizer', supported: profile.audioModes && profile.audioModes.length > 0 },
              { id: 'diagnostics', icon: <Terminal size={14} />, label: 'Diagnostics' },
            ].filter(t => t.supported !== false).map(t => (
              <button
                key={t.id}
                className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.72rem',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Lighting Tab */}
          {activeTab === 'lighting' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <article className="panel panel-accent" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={18} style={accentCSS} />
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Lighting Effect
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text3)' }}>
                    {profile.effects.length} Effects Available
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Fixed Dropdown Menu (Requirement #1) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                      Effect Preset
                    </label>
                    <select
                      className="app-select"
                      value={effectId}
                      onChange={e => handleEffectChange(Number(e.target.value))}
                    >
                      {profile.effects.map(e => (
                        <option key={e.id} value={e.id}>{e.name}{e.experimental ? ' — Experimental' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brightness */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                        Brightness
                      </label>
                      <strong style={accentCSS}>{brightness} / 4</strong>
                    </div>
                    <input
                      type="range" min={0} max={4} step={1} value={brightness}
                      disabled={effectId === 0 || activeEffect.perKey}
                      onChange={e => setBrightness(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', opacity: effectId === 0 || activeEffect.perKey ? 0.35 : 1 }}
                    />
                  </div>

                  {/* Speed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                        Speed
                      </label>
                      <strong style={accentCSS}>{speed} / 4</strong>
                    </div>
                    <input
                      type="range" min={0} max={4} step={1} value={speed}
                      disabled={effectId === 0 || activeEffect.perKey || !activeEffect.speed}
                      onChange={e => setSpeed(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', opacity: effectId !== 0 && !activeEffect.perKey && activeEffect.speed ? 1 : 0.35 }}
                    />
                  </div>

                  {/* Action buttons */}
                  {!realtimeSync && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => writeConfig('manual')}
                        disabled={!connected || vizRunning}
                      >
                        Apply Now
                      </button>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ width: '100%' }}
                          disabled={!connected || effectId === 0 || activeEffect.perKey || !activeEffect.color || vizRunning}
                          onClick={() => writeConfig('manual', true)}
                        >
                          Palette Only
                        </button>
                        <button
                          onClick={() => setShowInfo(v => !v)}
                          style={{ position: 'absolute', top: -6, right: -6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                          title="What is Palette Only?"
                        >
                          <Info size={13} />
                        </button>
                        {showInfo && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50, width: 220,
                            background: 'var(--surface2)', border: '1px solid var(--border-alt)',
                            borderRadius: styleMode === 'neo' ? 0 : 10, padding: '0.75rem', fontSize: '0.72rem',
                            color: 'var(--text2)', lineHeight: 1.5,
                            boxShadow: styleMode === 'neo' ? '4px 4px 0 var(--border)' : '0 8px 24px rgba(0,0,0,0.3)'
                          }}>
                            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Palette Only</strong>
                            Writes only the RGB color to the keyboard hardware without overriding active effect mode or speed settings.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>

              {/* Profile & Capabilities */}
              <article className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                    <Layers size={18} style={accent2CSS} />
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Profile & Capabilities
                    </h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-alt)' }}>
                      <span>Connected Device:</span>
                      <strong style={{ color: 'var(--text)' }}>{devName || profile.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-alt)' }}>
                      <span>Report Format:</span>
                      <strong style={{ color: 'var(--text)' }}>{profile.reportSize}-byte Feature Report</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-alt)' }}>
                      <span>Color Customization:</span>
                      <strong style={{ color: activeEffect.color ? '#4ade80' : '#f87171' }}>
                        {effectId === 0 ? 'Lighting Off' : activeEffect.perKey ? 'Per-Key RGB' : activeEffect.color ? (activeEffect.colorfulOnly ? 'Colorful Only' : 'Custom RGB Supported') : 'Not Applicable'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-alt)' }}>
                      <span>Speed Adjustment:</span>
                      <strong style={{ color: activeEffect.speed ? '#4ade80' : '#94a3b8' }}>
                        {effectId === 0 ? 'Disabled' : activeEffect.perKey ? 'Per-Key Mode' : activeEffect.speed ? 'Adjustable (0-4)' : 'Fixed Speed'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid var(--border-alt)', fontSize: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={accentCSS} />
                  <span>{activeEffect.perKey ? 'Self Define: the floating color bubble is your paint color. Click keys in the editor below, then Apply.' : effectId === 0 ? 'Lighting is OFF. Select any non-OFF effect above to re-enable lighting controls.' : 'Use the floating color bubble at the bottom right to pick any RGB color or toggle Colorful mode anytime!'}</span>
                </div>
              </article>

              <article className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: activeEffect.perKey ? 1 : 0.55, transition: 'opacity 0.2s ease' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Paintbrush size={18} style={accentCSS} />
                      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Self Define RGB
                      </h2>
                    </div>
                    <ToggleSwitch
                      checked={activeEffect.perKey}
                      onChange={(checked) => {
                        setEffectId(checked ? 21 : 1);
                      }}
                      color="var(--accent)"
                    />
                  </div>

                  <p style={{ margin: '0 0 1rem', color: 'var(--text2)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    Pick a brush color from the bubble, click keys below to draw your map.
                  </p>

                  {/* Compact Grid Tools */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', pointerEvents: activeEffect.perKey ? 'auto' : 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <button
                        className={`btn ${!perKeyErase ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPerKeyErase(false)}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.68rem',
                          background: !perKeyErase ? 'var(--accent)' : undefined,
                          color: !perKeyErase ? 'var(--accent-contrast)' : undefined
                        }}
                      >
                        <Paintbrush size={13} /> Brush
                      </button>
                      <button
                        className={`btn ${perKeyErase ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPerKeyErase(true)}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.68rem',
                          background: perKeyErase ? 'var(--accent)' : undefined,
                          color: perKeyErase ? 'var(--accent-contrast)' : undefined
                        }}
                      >
                        <Eraser size={13} /> Eraser
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" onClick={() => setPerKeyPreset('default')} style={{ padding: '0.5rem', fontSize: '0.62rem' }} title="Default Gaming Layout">
                        Gaming
                      </button>
                      <button className="btn btn-secondary" onClick={() => setPerKeyPreset('all')} style={{ padding: '0.5rem', fontSize: '0.62rem' }}>
                        Fill
                      </button>
                      <button className="btn btn-secondary" onClick={() => setPerKeyPreset('clear')} style={{ padding: '0.5rem', fontSize: '0.62rem' }}>
                        Clear
                      </button>
                    </div>

                    {!realtimeSync && (
                      <button
                        className="btn btn-primary"
                        disabled={!connected || vizRunning}
                        onClick={() => writeConfig('per-key-manual')}
                        style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem' }}
                      >
                        Apply Per-Key Map
                      </button>
                    )}

                    {/* Template Builder */}
                    <div style={{
                      marginTop: '0.65rem',
                      borderTop: '1px solid var(--border-alt)',
                      paddingTop: '0.65rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      pointerEvents: activeEffect.perKey ? 'auto' : 'none'
                    }}>
                      <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                        Save Layout Template
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          className="app-input"
                          type="text"
                          placeholder="My Custom Preset..."
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value)}
                          style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem' }}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={saveTemplate}
                          style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                        >
                          Save
                        </button>
                      </div>

                      {templates.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 85, overflowY: 'auto', marginTop: '0.25rem' }}>
                          {templates.map(t => (
                            <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.45rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.7rem' }}>
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontWeight: 650, flex: 1, padding: 0 }}
                                onClick={() => loadTemplate(t.colors)}
                                title="Click to load layout"
                              >
                                {t.name}
                              </button>
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
                                onClick={() => deleteTemplate(t.name)}
                                title="Delete template"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.8rem', color: 'var(--text3)', fontSize: '0.65rem', fontFamily: 'monospace', borderTop: '1px solid var(--border-alt)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{Object.keys(perKeyColors).length} Painted Keys</span>
                  <span>Feature 0x06 / 0x06</span>
                </div>
              </article>
            </div>
          )}

          {/* Audio Visualizer Tab */}
          {activeTab === 'audio' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <article className="panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                  <Mic size={18} style={{ color: 'var(--accent3)' }} />
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Audio Capture & Keyboard Reactive Lighting
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.1rem' }}>
                  <button
                    className={`btn ${audioSrc === 'mic' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleMic}
                    style={{ justifyContent: 'center' }}
                  >
                    <Mic size={14} /> Use Microphone
                  </button>
                  <button
                    className={`btn ${audioSrc === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleSystemAudio}
                    style={{ justifyContent: 'center' }}
                  >
                    <Monitor size={14} /> Capture Tab / System Audio
                  </button>
                </div>

                <div style={{ margin: '-0.35rem 0 1rem', color: 'var(--text3)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                  For YouTube/Spotify in Chrome, choose <strong style={{ color: 'var(--text2)' }}>Capture Tab / System Audio</strong>, select the playing tab, and enable <strong style={{ color: 'var(--text2)' }}>Share tab audio</strong>. For the smoothest background operation, install this PWA and keep the controller in its own app window.
                </div>

                {audioSrc !== 'none' && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '1rem' }}
                    onClick={() => stopAudioCapture(true)}
                  >
                    Stop Audio Capture
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                    Visualizer Style
                  </label>
                  <select className="app-select" value={audioMode} onChange={e => setAudioMode(e.target.value)}>
                    {profile.audioModes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                    Real Transport Protocol
                  </label>
                  <select className="app-select" value={audioTransport} onChange={e => setAudioTransport(e.target.value)} disabled={vizRunning}>
                    <option value="audio88">OEM Audio Stream — 0x13 / 0x88</option>
                    <option value="direct520">Direct RGB Framebuffer — 0x06 / 0x08</option>
                  </select>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.55rem', fontSize: '0.66rem', fontFamily: 'monospace' }}>
                    <span style={{ padding: '0.2rem 0.45rem', border: '1px solid var(--border-alt)', borderRadius: 999, color: transportCaps.audio88 === true ? '#4ade80' : transportCaps.audio88 === false ? '#f87171' : 'var(--text3)' }}>
                      0x13 output report: {transportCaps.audio88 === true ? 'EXPOSED' : transportCaps.audio88 === false ? 'NOT EXPOSED' : 'UNKNOWN'}
                    </span>
                    <span style={{ padding: '0.2rem 0.45rem', border: '1px solid var(--border-alt)', borderRadius: 999, color: transportCaps.direct520 === true ? '#4ade80' : transportCaps.direct520 === false ? '#f87171' : 'var(--text3)' }}>
                      0x06 feature report: {transportCaps.direct520 === true ? 'EXPOSED' : transportCaps.direct520 === false ? 'NOT EXPOSED' : 'UNKNOWN'}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.65rem' }}>
                    <ToggleSwitch
                      checked={audioFallback}
                      onChange={setAudioFallback}
                      label="Automatic fallback"
                      subLabel={audioFallback ? 'If the selected real protocol is unavailable, try the other one.' : 'Use only the selected protocol.'}
                      color="var(--accent3)"
                    />
                  </div>

                  <div style={{
                    marginTop: '0.6rem',
                    fontSize: '0.7rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-alt)',
                    borderRadius: styleMode === 'neo' ? 0 : 8,
                    padding: '0.7rem 0.85rem',
                    lineHeight: 1.55,
                    color: 'var(--text2)'
                  }}>
                    <div><strong style={{ color: 'var(--text)' }}>0x13 / 0x88 OEM Audio Stream:</strong> sparse RGB groups; best first choice for music-reactive effects.</div>
                    <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--text)' }}>0x06 / 0x08 Direct RGB:</strong> full 122-LED framebuffer; best for complex per-key animation.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>Gain</label>
                    <strong style={{ color: 'var(--accent3)', fontFamily: 'monospace' }}>{audioGain.toFixed(1)}</strong>
                  </div>
                  <input
                    type="range" min={0.2} max={4} step={0.1} value={audioGain}
                    onChange={e => setAudioGain(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent3)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>Smoothness</label>
                    <strong style={{ color: 'var(--accent3)', fontFamily: 'monospace' }}>{audioSmooth}</strong>
                  </div>
                  <input
                    type="range" min={1} max={30} step={1} value={audioSmooth}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setAudioSmooth(v);
                      if (audioAnalyser) audioAnalyser.smoothingTimeConstant = smoothingFromUi(v);
                    }}
                    style={{ accentColor: 'var(--accent3)' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <ToggleSwitch
                    checked={audioColorful}
                    onChange={setAudioColorful}
                    label="Dynamic Multicolor"
                    subLabel={audioColorful ? 'The browser generates changing colors for every audio frame.' : `Single-color audio uses ${rgbToHex(rgb)} as the base color.`}
                    color="var(--accent3)"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {vizRunning ? (
                    <button
                      className="btn btn-danger"
                      style={{ width: '100%', padding: '0.85rem' }}
                      onClick={stopVisualizerLoop}
                    >
                      <Square size={15} fill="currentColor" /> Stop Keyboard Audio
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={!connected || audioSrc === 'none'}
                      onClick={startVisualizerLoop}
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        background: connected && audioSrc !== 'none' ? 'var(--accent3)' : 'rgba(255,255,255,0.04)',
                        color: connected && audioSrc !== 'none' ? 'var(--accent3-contrast)' : 'var(--text3)',
                        borderColor: connected && audioSrc !== 'none' ? 'var(--border)' : 'var(--border-alt)',
                        boxShadow: connected && audioSrc !== 'none' ? (styleMode === 'neo' ? '4px 4px 0 var(--border)' : '0 4px 18px rgba(var(--accent3-rgb), 0.4)') : 'none',
                        cursor: connected && audioSrc !== 'none' ? 'pointer' : 'not-allowed',
                        opacity: connected && audioSrc !== 'none' ? 1 : 0.4
                      }}
                    >
                      <Play size={15} fill="currentColor" /> Start Keyboard Audio
                    </button>
                  )}
                </div>
              </article>

              <article className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                  <Gauge size={18} style={accentCSS} />
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Live FFT Realtime Engine
                  </h2>
                </div>

                <p style={{ color: 'var(--text2)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  The audio preview and physical keyboard share one renderer. When supported, audio analysis runs in an AudioWorklet and HID streaming moves into a Dedicated Worker, so changing Chrome tabs does not depend on this page's requestAnimationFrame or timer loop.
                </p>

                <div style={{
                  padding: '0.65rem 0.8rem',
                  border: '1px solid var(--border-alt)',
                  borderRadius: styleMode === 'neo' ? 0 : 8,
                  background: 'rgba(255,255,255,0.03)',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  color: backgroundEngine.includes('Worker') ? '#4ade80' : 'var(--text2)'
                }}>
                  Stream engine: {backgroundEngine}
                  {backgroundEngine === 'foreground fallback' && (
                    <div style={{ marginTop: 4, color: '#fbbf24' }}>
                      Background-tab smoothness is not guaranteed in fallback mode. Install/open this controller as its own app window for better stability.
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', height: 180, background: '#000', borderRadius: styleMode === 'neo' ? 0 : 8, overflow: 'hidden', border: '1px solid var(--border-alt)' }}>
                  <canvas ref={specCanvasRef} width={520} height={180} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </article>
            </div>
          )}

          {/* Diagnostics Tab with Human-Readable Logs (Requirement #6) */}
          {activeTab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Hardware State Inspector */}
              <article className="panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                  <Cpu size={16} style={accentCSS} />
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Live Hardware State
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: 8, background: 'rgba(var(--accent-rgb),0.06)', border: '1px solid var(--border-alt)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Active Effect</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{activeEffect.name}</div>
                  </div>
                  <div style={{ padding: '0.65rem', borderRadius: 8, background: 'rgba(var(--accent-rgb),0.06)', border: '1px solid var(--border-alt)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Brightness / Speed</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>B: {brightness}/4 · S: {speed}/4</div>
                  </div>
                  <div style={{ padding: '0.65rem', borderRadius: 8, background: 'rgba(var(--accent-rgb),0.06)', border: '1px solid var(--border-alt)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Color Mode / Palette</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, display: 'inline-block' }} />
                      {colorful ? 'Rainbow Spectrum' : rgbToHex(rgb)}
                    </div>
                  </div>
                </div>
              </article>

              {/* Logs Console */}
              <article className="panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={18} style={accent2CSS} />
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Human-Readable Activity Log
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <ToggleSwitch
                      checked={debugMode}
                      onChange={setDebugMode}
                      label="Raw Debug"
                      color="var(--accent2)"
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '0.35rem 0.7rem' }}
                      onClick={() => navigator.clipboard.writeText(logs.map(l => `[${l.time}] [${l.tag}] ${l.message}`).join('\n')).then(() => addLog('system', 'Logs copied to clipboard.'))}
                    >
                      Copy Logs
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '0.35rem 0.7rem' }} onClick={() => setLogs([])}>
                      <Trash2 size={11} /> Clear
                    </button>
                  </div>
                </div>

                <div
                  ref={logRef}
                  style={{
                    width: '100%',
                    height: 320,
                    background: '#060a12',
                    borderRadius: styleMode === 'neo' ? 0 : 10,
                    border: `1px solid var(--border-alt)`,
                    padding: '1rem',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: 1.6,
                    color: '#f0f4ff'
                  }}
                >
                  {logs.length === 0 ? (
                    <span style={{ color: '#475569', fontStyle: 'italic' }}>
                      No events recorded yet. Connect keyboard to begin tracking events.
                    </span>
                  ) : (
                    logs.map((l) => {
                      const tagColors = {
                        CONNECT: '#38bdf8',
                        SYNC: '#a855f7',
                        READ: '#4ade80',
                        WRITE: '#fbbf24',
                        VERIFY: '#22c55e',
                        AUDIO: '#ec4899',
                        ERROR: '#f87171',
                        DISCONNECT: '#ef4444',
                      };
                      const tagCol = tagColors[l.tag] || '#94a3b8';

                      return (
                        <div key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 0', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <span style={{ color: '#64748b', flexShrink: 0 }}>[{l.time}]</span>
                          <span style={{
                            color: tagCol,
                            fontWeight: 800,
                            padding: '0 4px',
                            background: `rgba(255,255,255,0.06)`,
                            borderRadius: 4,
                            flexShrink: 0,
                          }}>
                            {l.tag}
                          </span>
                          <span style={{ color: '#e2e8f0', flex: 1 }}>{l.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </div>
          )}

        </div>

        {/* 4. Realtime Keyboard Visualizer Section */}
        <section className="panel" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={accentCSS} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Realtime LED Visualizer Preview
              </span>
            </div>
            {vizRunning && (
              <span style={{
                padding: '0.25rem 0.75rem', borderRadius: 9999,
                background: 'rgba(236,72,153,0.15)', color: '#ec4899',
                fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800,
                letterSpacing: '0.1em', border: '1px solid rgba(236,72,153,0.3)',
                animation: 'pulseDot 2s ease-in-out infinite'
              }}>
                STREAMING AUDIO RGB
              </span>
            )}
          </div>

          <KeyboardVisualizer
            profile={profile}
            activeEffect={effectId}
            rgb={rgb}
            speed={speed}
            brightness={brightness}
            colorful={activeEffect.colorfulOnly ? true : (activeEffect.colorful ? colorful : false)}
            audioAnalyser={audioAnalyser}
            audioMode={audioMode}
            audioGain={audioGain}
            audioColorful={audioColorful}
            perKeyEditing={activeEffect.perKey === true}
            perKeyColors={perKeyColors}
            onKeyPaint={handlePerKeyPaint}
          />
        </section>

      </div>

      {/* 5. Global Floating Color Bubble at Side (Requirements #3, #4, #5) */}
      <FloatingColorBubble
        rgb={rgb}
        hexColor={hexColor}
        colorful={activeEffect.colorfulOnly ? true : (activeEffect.colorful ? colorful : false)}
        onColorChange={handleGlobalColorChange}
        onToggleColorful={handleToggleColorful}
        onApplyPalette={() => writeConfig('manual', true)}
        connected={connected}
        liveApply={realtimeSync}
        disabled={effectId === 0 || !activeEffect.color || activeEffect.colorfulOnly}
        colorfulDisabled={effectId === 0 || activeEffect.perKey || !activeEffect.colorful || activeEffect.colorfulOnly}
        styleMode={styleMode}
        profile={profile}
      />

      {/* 6. Floating Status Indicator (Requirement #2) */}
      <div
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-alt)',
          padding: '0.45rem 0.75rem',
          borderRadius: styleMode === 'neo' ? 0 : 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontFamily: 'monospace',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'border-color 0.25s, background-color 0.25s',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background:
              (vizRunning || txStatus === 'sending') ? '#eab308' :
              txStatus === 'success' ? '#22c55e' : '#ef4444',
            boxShadow:
              (vizRunning || txStatus === 'sending') ? '0 0 12px #eab308' :
              txStatus === 'success' ? '0 0 12px #22c55e' : '0 0 12px #ef4444',
            display: 'inline-block',
            transition: 'background-color 0.25s, box-shadow 0.25s',
            animation: (vizRunning || txStatus === 'sending') ? 'indicatorPulse 1.2s infinite ease-in-out' : 'none',
          }}
        />
        <span style={{ color: 'var(--text2)', textTransform: 'uppercase' }}>
          {(vizRunning || txStatus === 'sending') ? 'TX Stream' :
           txStatus === 'success' ? 'TX Success' : 'TX Idle'}
        </span>
      </div>
    </div>
  );
}
