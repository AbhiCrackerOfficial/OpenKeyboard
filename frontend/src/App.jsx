import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi, WifiOff, Sliders, Volume2, Terminal,
  Sun, Gauge, Mic, Monitor, Square, Play,
  Trash2, RefreshCw, Activity, Layers, Info,
  Moon, SunMedium, Palette, Sparkles, ChevronDown, Check,
  Cpu, HardDrive, Zap, Radio
} from 'lucide-react';
import KeyboardVisualizer from './components/KeyboardVisualizer';
import FloatingColorBubble from './components/FloatingColorBubble';
import ToggleSwitch from './components/ToggleSwitch';
import { KEYBOARD_PROFILES, DEFAULT_KEYBOARD_PROFILE, findKeyboardProfile } from './config/keyboards';
import { hsv, hexFmt, rgbToHex, hexToRgb } from './utils/colorUtils';

const DEBOUNCE_MS = 550;
const AUTO_SYNC_INTERVAL_MS = 3000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ls = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

export default function App() {

  // ── Keyboard Profile ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState(DEFAULT_KEYBOARD_PROFILE);

  // ── UI Mode ─────────────────────────────────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => ls('f87_theme', 'dark'));
  const [styleMode, setStyleMode] = useState(() => ls('f87_style', 'glass'));

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('lighting');

  // ── Connection ────────────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false);
  const [devName,   setDevName]   = useState('');
  const [supported, setSupported] = useState(true);

  // ── Lighting Settings (Default to Red #FF0000 as per Requirement #5) ──────
  const [effectId,   setEffectId]   = useState(() => ls('f87_effectId', 1));
  const [brightness, setBrightness] = useState(() => ls('f87_brightness', 4));
  const [speed,      setSpeed]      = useState(() => ls('f87_speed', 4));
  const [colorful,   setColorful]   = useState(() => ls('f87_colorful', false));
  const [rgb,        setRgb]        = useState(() => ls('f87_rgb', [255, 0, 0]));
  const [hexColor,   setHexColor]   = useState(() => ls('f87_hex', '#FF0000'));

  // ── Audio ──────────────────────────────────────────────────────────────────
  const [audioSrc,      setAudioSrc]      = useState('none');
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const [audioMode,     setAudioMode]     = useState('Audio dance – soft');
  const [audioGain,     setAudioGain]     = useState(1.5);
  const [audioSmooth,   setAudioSmooth]   = useState(12);
  const [vizRunning,    setVizRunning]    = useState(false);

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [autoSync,    setAutoSync]    = useState(true);
  const [liveApply,   setLiveApply]   = useState(true);
  const [logs,        setLogs]        = useState([]);
  const [readback,    setReadback]    = useState('—');
  const [lastRawData, setLastRawData] = useState(null);
  const [showInfo,    setShowInfo]    = useState(false);

  // ── Live Mutable Refs ───────────────────────────────────────────────────
  const hidRef           = useRef(null);
  const ioBusyRef        = useRef(false);
  const lastWriteTimeRef = useRef(0);
  const liveTimerRef     = useRef(null);
  const audioCtxRef      = useRef(null);
  const audioStrRef      = useRef(null);
  const vizLoopRef       = useRef(false);
  const lastStateRef     = useRef(null);
  const logRef           = useRef(null);
  const specCanvasRef    = useRef(null);

  const audioModeRef     = useRef(audioMode);
  const audioGainRef     = useRef(audioGain);
  const colorfulRef      = useRef(colorful);
  const rgbRef           = useRef(rgb);
  const audioAnalyserRef = useRef(audioAnalyser);

  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { audioGainRef.current = audioGain; }, [audioGain]);
  useEffect(() => { colorfulRef.current = colorful; }, [colorful]);
  useEffect(() => { rgbRef.current = rgb; }, [rgb]);
  useEffect(() => { audioAnalyserRef.current = audioAnalyser; }, [audioAnalyser]);

  const activeEffect = profile.effects.find(e => e.id === effectId) || profile.effects[1];

  // ─────────────────────────────────────────────────────────────────────────
  // Whole-Site Theme & Color Dynamic Adaptation (Requirement #2 & #5)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.style = styleMode;
    localStorage.setItem('f87_theme', JSON.stringify(themeMode));
    localStorage.setItem('f87_style', JSON.stringify(styleMode));
  }, [themeMode, styleMode]);

  useEffect(() => {
    const [r, g, b] = rgb;
    // Dynamically adjust whole-site CSS color tokens to active keyboard RGB
    document.documentElement.style.setProperty('--kb-r', r);
    document.documentElement.style.setProperty('--kb-g', g);
    document.documentElement.style.setProperty('--kb-b', b);
    document.documentElement.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--glow', `rgba(${r}, ${g}, ${b}, 0.35)`);

    localStorage.setItem('f87_rgb', JSON.stringify(rgb));
    const h = rgbToHex(rgb);
    localStorage.setItem('f87_hex', JSON.stringify(h));
  }, [rgb]);

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

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('f87_effectId',   JSON.stringify(effectId));   }, [effectId]);
  useEffect(() => { localStorage.setItem('f87_brightness', JSON.stringify(brightness)); }, [brightness]);
  useEffect(() => { localStorage.setItem('f87_speed',      JSON.stringify(speed));      }, [speed]);
  useEffect(() => { localStorage.setItem('f87_colorful',   JSON.stringify(colorful));   }, [colorful]);

  // ─────────────────────────────────────────────────────────────────────────
  // Smooth Live Apply Debounce (Prevents Device Write Flooding)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveApply || !connected || vizLoopRef.current) return;
    clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      writeConfig('live').catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(liveTimerRef.current);
  }, [effectId, brightness, speed, colorful, rgb, liveApply, connected]);

  // Smooth Periodic Auto Sync (Runs only when completely idle)
  useEffect(() => {
    if (!connected || !autoSync) return;
    const id = setInterval(() => {
      if (Date.now() - lastWriteTimeRef.current < 2000 || vizLoopRef.current) return;
      syncDevice();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [connected, autoSync]);

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
      const d = list.find(x => x.vendorId === profile.vid && x.productId === profile.pid);
      if (!d) return;
      d.open().then(() => {
        hidRef.current = d;
        setConnected(true);
        setDevName(d.productName || profile.name);
        addLog('connect', `Auto-connected to ${d.productName || profile.name} via WebHID`);
        readConfig().then(raw => {
          if (!raw) return;
          const s = profile.decodeState(raw);
          lastStateRef.current = s;
          setLastRawData(raw.slice(0, 32));
          setReadback(describeState(s));
          applyStateToUI(s);
          addLog('read', `Initial state synchronized: Effect = ${getEffectName(s.id)}, Brightness = ${s.brightness}/4, Speed = ${s.speed}/4, Mode = ${s.colorful ? 'Rainbow' : 'Single-color'}`);
        }).catch(() => {});
      }).catch(() => {});
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
    if (!audioAnalyser || activeTab !== 'audio') return;
    let animId = null;
    const buf = new Uint8Array(audioAnalyser.frequencyBinCount);
    const canvas = specCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      audioAnalyser.getByteFrequencyData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const barH = (buf[i] / 255) * canvas.height;
        ctx.fillStyle = `hsl(${(i / buf.length) * 240 + 100}, 85%, 60%)`;
        ctx.fillRect(i * barW, canvas.height - barH, Math.max(1, barW - 1), barH);
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [audioAnalyser, activeTab]);

  // ─────────────────────────────────────────────────────────────────────────
  // Protocol helpers
  // ─────────────────────────────────────────────────────────────────────────
  const sendReport = async (full) => {
    if (!hidRef.current) throw new Error('Keyboard not connected.');
    if (full.length !== profile.reportSize)
      throw new Error(`Expected ${profile.reportSize} bytes, got ${full.length}.`);
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
    const raw  = normaliseBody(view);
    if (raw.length < 136) throw new Error(`Feature read returned only ${raw.length} bytes.`);
    if (raw[0] !== profile.reportId || raw[1] !== profile.commands.readInit)
      throw new Error(`Unexpected config header: ${hexFmt(raw.slice(0,8))}`);
    return raw;
  };

  const getEffectName = id => {
    const e = profile.effects.find(x => x.id === id);
    return e ? e.name : `Custom Effect (${id})`;
  };

  const describeState = s => {
    return `${getEffectName(s.id)} · Brightness: ${s.brightness ?? '?'}/4 · Speed: ${s.speed ?? '?'}/4 · ${s.colorful ? 'Rainbow' : 'Single-color'}`;
  };

  const applyStateToUI = s => {
    const found = profile.effects.find(e => e.id === s.id);
    if (!found) return;
    setEffectId(s.id);
    if (s.brightness !== null) setBrightness(Math.max(0, Math.min(4, s.brightness)));
    if (s.speed      !== null) setSpeed(Math.max(0, Math.min(4, s.speed)));
    if (s.colorful   !== null) setColorful(!!s.colorful);
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
      setConnected(true);
      setDevName(d.productName || matchedProfile.name);
      addLog('connect', `Connected to ${d.productName || matchedProfile.name}`);
      
      ioBusyRef.current = true;
      const raw = await readConfig();
      const s   = matchedProfile.decodeState(raw);
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
    if (hidRef.current?.opened) hidRef.current.close().catch(()=>{});
    hidRef.current = null;
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
      const s   = profile.decodeState(raw);
      setLastRawData(raw.slice(0, 32));
      const changed = !lastStateRef.current ||
        ['id','brightness','speed','colorful'].some(k => lastStateRef.current[k] !== s[k]);
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

  const writeConfig = async (src = 'manual', colorOnly = false) => {
    if (!connected || ioBusyRef.current || vizLoopRef.current) return;
    ioBusyRef.current = true;
    lastWriteTimeRef.current = Date.now();
    try {
      addLog('write', `Writing settings (${src})${colorOnly ? ' — Palette Only' : ''}`, {
        effect: activeEffect.name,
        brightness: `${brightness}/4`,
        speed: `${speed}/4`,
        mode: colorful ? 'Rainbow Spectrum' : 'Single-color (Custom RGB)',
        rgb: rgbToHex(rgb),
      });

      const currentRaw = await readConfig();
      let cfgReport;
      if (colorOnly) {
        cfgReport = new Uint8Array(profile.reportSize);
        cfgReport.set(currentRaw.slice(0, Math.min(currentRaw.length, profile.reportSize)));
        cfgReport[0] = profile.reportId;
        cfgReport[1] = profile.commands.writeConfig;
        if (activeEffect.id !== 0 && activeEffect.color) {
          const o = profile.effectPairOffset(activeEffect.id);
          const spd = (cfgReport[o+1] >> 4) & 0x0f;
          cfgReport[o+1] = (spd << 4) | 0x00;
        }
      } else {
        cfgReport = profile.buildConfigWrite(currentRaw, {
          effect: activeEffect,
          brightness,
          speed,
          colorful,
          rgb,
        });
      }
      const palette = profile.buildPaletteReport(rgb);

      // Paced write sequence
      await sleep(70);
      await sendReport(cfgReport);
      await sleep(70);
      await sendReport(palette);
      await sleep(320);

      const verifyRaw = await readConfig();
      const verified  = profile.decodeState(verifyRaw);
      lastStateRef.current = verified;
      setLastRawData(verifyRaw.slice(0, 32));
      const desc = describeState(verified);
      setReadback(desc);
      addLog('verify', `Hardware confirmed: ${desc}`);
    } catch (err) {
      addLog('error', `Write failed: ${err.message}`);
    } finally {
      ioBusyRef.current = false;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Audio & Direct RGB
  // ─────────────────────────────────────────────────────────────────────────
  const setupAudioPipeline = (stream, label) => {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, 1 - audioSmooth / 30));
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    audioStrRef.current = stream;
    setAudioAnalyser(analyser);
    addLog('audio', `${label} audio source initialized`);
  };

  const handleMic = async () => {
    try {
      stopAudioCapture(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setupAudioPipeline(stream, 'Microphone');
      setAudioSrc('mic');
    } catch (err) { addLog('error', `Microphone error: ${err.message}`); }
  };

  const handleSystemAudio = async () => {
    try {
      stopAudioCapture(false);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { systemAudio: 'include' } });
      const aTracks = stream.getAudioTracks();
      if (!aTracks.length) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('Selected share source did not provide an audio track.');
      }
      stream.getVideoTracks().forEach(t => t.stop());
      setupAudioPipeline(new MediaStream(aTracks), 'System/Tab');
      setAudioSrc('system');
    } catch (err) { addLog('error', `System audio error: ${err.message}`); }
  };

  const stopAudioCapture = (logIt = true) => {
    stopVisualizerLoop();
    if (audioStrRef.current) { audioStrRef.current.getTracks().forEach(t => t.stop()); audioStrRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    setAudioAnalyser(null);
    setAudioSrc('none');
    if (logIt) addLog('audio', 'Audio capture stopped');
  };

  const startVisualizerLoop = async () => {
    if (!connected)     { addLog('error', 'Connect keyboard before starting visualizer.'); return; }
    if (!audioAnalyserRef.current) { addLog('error', 'Select an audio source (Microphone or Tab) first.'); return; }
    if (vizLoopRef.current) return;

    vizLoopRef.current = true;
    setVizRunning(true);
    addLog('audio', 'Started 520-byte direct RGB stream to hardware (~20 FPS)');

    let phase = 0, frames = 0;

    const loop = async () => {
      if (!vizLoopRef.current) return;
      const curAnalyser = audioAnalyserRef.current;
      if (!curAnalyser) {
        vizLoopRef.current = false;
        setVizRunning(false);
        return;
      }

      try {
        const freq = new Uint8Array(curAnalyser.frequencyBinCount);
        curAnalyser.getByteFrequencyData(freq);

        const gainVal     = audioGainRef.current;
        const curMode     = audioModeRef.current;
        const curColorful = colorfulRef.current;
        const curRgb      = rgbRef.current;

        const bass  = freq.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255 * gainVal;
        const mid   = freq.slice(10, 35).reduce((a, b) => a + b, 0) / 25 / 255 * gainVal;
        const high  = freq.slice(35, 64).reduce((a, b) => a + b, 0) / 29 / 255 * gainVal;
        const level = Math.min(1, bass * 0.5 + mid * 0.35 + high * 0.15);
        phase += 0.08 + level * 0.12;

        const colors = new Map();
        profile.keys.forEach(([idx, leftU, topU]) => {
          const x = Math.round(leftU);
          const y = Math.round(topU);

          let v = 0, h = (x * 18 + phase * 80) % 360;
          switch (curMode) {
            case "Audio dance – soft":
              v = Math.max(0, level - Math.abs(x - 8) / 14) * 1.3; break;
            case "Dazzling – rock":
              v = bass > 0.45 ? Math.min(1, bass * 1.4) : mid * 0.35;
              h = (phase * 220 + x * 25 + y * 40) % 360; break;
            case "Clouds rise and snow fly":
              v = Math.max(0, high * 1.4 - (5 - y) / 8) * (0.55 + 0.45 * Math.sin(phase * 3 + x)); break;
            case "Light Field Change – voice":
              v = Math.min(1, mid * 1.5) * (0.45 + 0.55 * Math.sin(x * 0.45 + phase * 2) ** 2); break;
            case "The gurgling stream":
              v = Math.max(0, level * 0.9 + 0.35 * Math.sin(x * 0.55 - y * 0.7 + phase * 3)); h = 185 + x * 4; break;
            case "Blooming – passion": {
              const d = Math.hypot(x - 8, y - 2.5);
              v = Math.max(0, level * 1.6 - Math.abs(d - (phase * 3) % 9) * 0.25); h = 330 + d * 7; break;
            }
            case "Pearl falling jade plate":
              v = (high > 0.35 && ((x * 7 + y * 13 + Math.floor(phase * 8)) % 17) < 2) ? Math.min(1, high * 1.5) : level * 0.08;
              h = 160 + high * 100; break;
            case "Clouds follow the moon":
              v = 0.12 + level * 0.45 + 0.16 * Math.sin(x * 0.25 + phase); h = 205 + 20 * Math.sin(phase * 0.4); break;
            case "Mountains and Flowing Waters": {
              const bin = Math.min(freq.length - 1, Math.floor((x / 17) * freq.length));
              const ht  = (freq[bin] / 255) * 6 * gainVal;
              v = (5 - y) < ht ? Math.min(1, 0.25 + freq[bin] / 255 * gainVal) : 0; h = 120 + x * 7; break;
            }
            case "Raining like silk – regular":
              v = Math.max(0, level * 0.35 + 0.7 * Math.sin(y * 1.2 - phase * 5 + (x % 5) * 1.5));
              v *= high * 0.7 + mid * 0.5; h = 190 + x * 3; break;
            default: v = level;
          }
          v = Math.max(0, Math.min(1, v));
          colors.set(idx, curColorful ? hsv(h, 90, v * 100) : curRgb.map(c => (c * v) | 0));
        });

        await sendReport(profile.buildDirectFrame(colors));
        frames++;
        if (frames === 1) addLog('audio', 'First direct RGB frame accepted by WebHID hardware');
      } catch (err) {
        addLog('error', `Direct RGB Error: ${err.message}`);
        vizLoopRef.current = false;
        setVizRunning(false);
        return;
      }
      setTimeout(loop, 50);
    };
    loop();
  };

  const stopVisualizerLoop = () => {
    if (!vizLoopRef.current) return;
    vizLoopRef.current = false;
    setVizRunning(false);
    addLog('audio', 'Direct RGB stream stopped');
    if (hidRef.current) {
      const blank = new Uint8Array(profile.reportSize);
      blank[0] = profile.reportId;
      blank[1] = profile.commands.directRgb;
      sendReport(blank).catch(() => {});
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Global Color Change Handler (Synced to whole site & keyboard)
  // ─────────────────────────────────────────────────────────────────────────
  const handleGlobalColorChange = (newRgb, newHex) => {
    setRgb(newRgb);
    setHexColor(newHex);
    if (activeEffect.color && !activeEffect.colorfulOnly && colorful) {
      setColorful(false);
    }
  };

  const handleToggleColorful = (newVal) => {
    setColorful(newVal);
  };

  const accentCSS  = { color: 'var(--accent)' };
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
        background: 'var(--bg)',
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
        }}/>
        <div className="blob-2" style={{
          position: 'absolute', bottom: '-10%', right: '-5%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'rgba(168,85,247,0.06)', filter: 'blur(100px)'
        }}/>
        <div className="blob-3" style={{
          position: 'absolute', top: '40%', right: '30%',
          width: '25vw', height: '25vw', borderRadius: '50%',
          background: 'rgba(236,72,153,0.04)', filter: 'blur(70px)'
        }}/>
      </div>

      <div style={{ width: '100%', maxWidth: '72rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', zIndex: 1 }}>

        {/* 1. Header */}
        <header className="panel" style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {profile.name} · VID:0x{profile.vid.toString(16).toUpperCase()} PID:0x{profile.pid.toString(16).toUpperCase()}
                </div>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>
                  Web Controller
                </h1>
                <p style={{ margin: '0.4rem 0 0', color: 'var(--text2)', fontSize: '0.85rem' }}>
                  {profile.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {connected ? (<>
                  <button className="btn btn-secondary" onClick={syncDevice} disabled={vizLoopRef.current} title="Read current config from keyboard">
                    <RefreshCw size={15} /> Read Now
                  </button>
                  <button className="btn btn-danger" onClick={handleDisconnect}>
                    <WifiOff size={15} /> Disconnect
                  </button>
                </>) : (
                  <button className="btn btn-primary" onClick={connectDevice} disabled={!supported}>
                    <Wifi size={15} /> Connect Keyboard
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

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <ToggleSwitch
              checked={autoSync}
              onChange={setAutoSync}
              label="Auto sync"
              badge="3.0s"
              color="var(--accent)"
            />
            <ToggleSwitch
              checked={liveApply}
              onChange={setLiveApply}
              label="Live apply"
              color="var(--accent)"
            />
          </div>
        </div>

        {/* 3. Main Controls Section ON TOP of Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: `2px solid var(--border-alt)` }}>
            {[
              { id: 'lighting',    icon: <Sliders size={14}/>,  label: 'Lighting' },
              { id: 'audio',       icon: <Volume2 size={14}/>,  label: 'Audio Visualizer' },
              { id: 'diagnostics', icon: <Terminal size={14}/>, label: 'Diagnostics' },
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
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
                      onChange={e => setEffectId(Number(e.target.value))}
                    >
                      {profile.effects.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
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
                      onChange={e => setBrightness(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
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
                      disabled={!activeEffect.speed}
                      onChange={e => setSpeed(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', opacity: activeEffect.speed ? 1 : 0.35 }}
                    />
                  </div>

                  {/* Action buttons */}
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
                        disabled={!connected || !activeEffect.color || vizRunning}
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
                        {activeEffect.color ? (activeEffect.colorfulOnly ? 'Colorful Only' : 'Custom RGB Supported') : 'Not Applicable'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-alt)' }}>
                      <span>Speed Adjustment:</span>
                      <strong style={{ color: activeEffect.speed ? '#4ade80' : '#94a3b8' }}>
                        {activeEffect.speed ? 'Adjustable (0-4)' : 'Fixed Speed'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid var(--border-alt)', fontSize: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={accentCSS} />
                  <span>Use the floating color bubble at the bottom right to pick any RGB color or toggle Colorful mode anytime!</span>
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
                    Audio Source & Style
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.1rem' }}>
                  <button
                    className={`btn ${audioSrc === 'mic' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleMic}
                    style={{ justifyContent: 'center' }}
                  >
                    <Mic size={14} /> Microphone
                  </button>
                  <button
                    className={`btn ${audioSrc === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleSystemAudio}
                    style={{ justifyContent: 'center' }}
                  >
                    <Monitor size={14} /> Tab / System
                  </button>
                </div>

                {audioSrc !== 'none' && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '1rem' }}
                    onClick={() => stopAudioCapture(true)}
                  >
                    Stop Audio Source
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
                      if (audioAnalyser) audioAnalyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, 1 - v / 30));
                    }}
                    style={{ accentColor: 'var(--accent3)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {vizRunning ? (
                    <button className="btn btn-danger" style={{ width: '100%', padding: '0.85rem' }} onClick={stopVisualizerLoop}>
                      <Square size={15} fill="currentColor" /> Stop Keyboard Visualizer
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.85rem' }}
                      disabled={!connected || audioSrc === 'none'}
                      onClick={startVisualizerLoop}
                    >
                      <Play size={15} fill="currentColor" /> Start Keyboard Visualizer
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
                  Direct 520-byte RGB streaming frame format. Changes to styles, gain, and color mode stream live to the keyboard at ~20 FPS.
                </p>

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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                STREAMING DIRECT RGB
              </span>
            )}
          </div>

          <KeyboardVisualizer
            profile={profile}
            activeEffect={effectId}
            rgb={rgb}
            speed={speed}
            brightness={brightness}
            colorful={colorful}
            audioAnalyser={audioAnalyser}
            audioMode={audioMode}
            audioGain={audioGain}
            audioColorful={colorful}
          />
        </section>

      </div>

      {/* 5. Global Floating Color Bubble at Side (Requirements #3, #4, #5) */}
      <FloatingColorBubble
        rgb={rgb}
        hexColor={hexColor}
        colorful={colorful}
        onColorChange={handleGlobalColorChange}
        onToggleColorful={handleToggleColorful}
        onApplyPalette={() => writeConfig('manual', true)}
        connected={connected}
        liveApply={liveApply}
        styleMode={styleMode}
      />
    </div>
  );
}
