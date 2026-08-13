import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi, WifiOff, Sliders, Volume2, Terminal,
  Sun, Gauge, Mic, Monitor, Square, Play,
  Trash2, RefreshCw, Activity, Layers, Info,
  Moon, SunMedium, Palette, Sparkles, Columns3
} from 'lucide-react';
import KeyboardVisualizer from './components/KeyboardVisualizer';
import { hsv, effects, audioModes, hexToBytes, PALETTE_HEX } from './utils/effects';

// ─── HID Constants ────────────────────────────────────────────────────────────
const VID           = 0x258A;
const PID           = 0x010C;
const REPORT_ID     = 0x06;
const REPORT_SIZE   = 520;
const CMD_READ_INIT = 0x84;
const CMD_WRITE     = 0x04;
const CMD_PALETTE   = 0x0A;
const CMD_DIRECT    = 0x08;
const EFFECT_OFFSET = 18;
const DEBOUNCE_MS   = 480;

const PALETTE_TEMPLATE = hexToBytes(PALETTE_HEX);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hexFmt = arr => [...arr].map(x => x.toString(16).padStart(2,'0')).join(' ');
const ls = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {

  // ── UI Mode ─────────────────────────────────────────────────────────────
  const [themeMode,  setThemeMode]  = useState(() => ls('f87_theme','dark'));      // 'dark'|'light'
  const [styleMode,  setStyleMode]  = useState(() => ls('f87_style','glass'));     // 'glass'|'neo'
  const [accentMode, setAccentMode] = useState(() => ls('f87_accent','default')); // 'default'|'keyboard'

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('lighting');

  // ── Connection ────────────────────────────────────────────────────────────
  const [connected,  setConnected]  = useState(false);
  const [devName,    setDevName]    = useState('');
  const [supported,  setSupported]  = useState(true);

  // ── Lighting Settings ─────────────────────────────────────────────────────
  const [effectId,   setEffectId]   = useState(() => ls('f87_effectId', 1));
  const [brightness, setBrightness] = useState(() => ls('f87_brightness', 3));
  const [speed,      setSpeed]      = useState(() => ls('f87_speed', 2));
  const [colorful,   setColorful]   = useState(() => ls('f87_colorful', false));
  const [rgb,        setRgb]        = useState(() => ls('f87_rgb', [255, 0, 0]));
  const [hexColor,   setHexColor]   = useState(() => ls('f87_hex', '#FF0000'));

  // ── Audio ──────────────────────────────────────────────────────────────────
  const [audioSrc,      setAudioSrc]      = useState('none'); // 'none'|'mic'|'system'
  const [audioAnalyser, setAudioAnalyser] = useState(null);   // triggers re-render on change
  const [audioMode,     setAudioMode]     = useState('Audio dance – soft');
  const [audioGain,     setAudioGain]     = useState(1.5);
  const [audioSmooth,   setAudioSmooth]   = useState(12);
  const [audioColorful, setAudioColorful] = useState(true);
  const [vizRunning,    setVizRunning]    = useState(false);

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [autoSync,    setAutoSync]    = useState(true);
  const [liveApply,   setLiveApply]   = useState(true);
  const [logs,        setLogs]        = useState([]);
  const [readback,    setReadback]    = useState('—');
  const [showInfo,    setShowInfo]    = useState(false); // color-only tooltip

  // ── Refs (mutable, no re-render) ──────────────────────────────────────────
  const hidRef        = useRef(null);
  const ioBusyRef     = useRef(false);
  const liveTimerRef  = useRef(null);
  const audioCtxRef   = useRef(null);
  const audioStrRef   = useRef(null);
  const vizLoopRef    = useRef(false);
  const lastStateRef  = useRef(null);
  const logRef        = useRef(null); // for auto-scroll

  // ── Active effect object ───────────────────────────────────────────────────
  const activeEffect = effects.find(e => e.id === effectId) || effects[1];

  // ─────────────────────────────────────────────────────────────────────────
  // Theme / Style side-effects
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme  = themeMode;
    document.documentElement.dataset.style  = styleMode;
    document.documentElement.dataset.accent = accentMode;
    localStorage.setItem('f87_theme',  JSON.stringify(themeMode));
    localStorage.setItem('f87_style',  JSON.stringify(styleMode));
    localStorage.setItem('f87_accent', JSON.stringify(accentMode));
  }, [themeMode, styleMode, accentMode]);

  // Sync keyboard colour into CSS custom properties for "keyboard accent" mode
  useEffect(() => {
    const [r, g, b] = rgb;
    document.documentElement.style.setProperty('--kb-r', r);
    document.documentElement.style.setProperty('--kb-g', g);
    document.documentElement.style.setProperty('--kb-b', b);
    localStorage.setItem('f87_rgb', JSON.stringify(rgb));
    const h = '#' + rgb.map(c => c.toString(16).padStart(2,'0')).join('').toUpperCase();
    localStorage.setItem('f87_hex', JSON.stringify(h));
  }, [rgb]);

  // ─────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────
  const addLog = (label, ...parts) => {
    const ts  = new Date().toLocaleTimeString();
    const msg = `[${ts}] ${label.toUpperCase().padEnd(8)} : ${parts.join(' ')}`;
    setLogs(prev => [...prev.slice(-199), msg]); // keep last 200 lines
  };
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence – save settings
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('f87_effectId',   JSON.stringify(effectId));   }, [effectId]);
  useEffect(() => { localStorage.setItem('f87_brightness', JSON.stringify(brightness)); }, [brightness]);
  useEffect(() => { localStorage.setItem('f87_speed',      JSON.stringify(speed));      }, [speed]);
  useEffect(() => { localStorage.setItem('f87_colorful',   JSON.stringify(colorful));   }, [colorful]);
  useEffect(() => { localStorage.setItem('f87_hex',        JSON.stringify(hexColor));   }, [hexColor]);

  // ─────────────────────────────────────────────────────────────────────────
  // Live Apply debounce
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveApply || !connected || vizLoopRef.current) return;
    clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      writeConfig('live').catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(liveTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId, brightness, speed, colorful, rgb, liveApply, connected]);

  // Auto-sync interval
  useEffect(() => {
    if (!connected || !autoSync) return;
    const id = setInterval(() => syncDevice(), 1800);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, autoSync]);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialise WebHID
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('hid' in navigator)) {
      setSupported(false);
      addLog('error', 'WebHID not available – use Chrome / Edge / Opera');
      return;
    }
    // Auto-reconnect previously granted device
    navigator.hid.getDevices().then(list => {
      const d = list.find(x => x.vendorId === VID && x.productId === PID);
      if (!d) return;
      d.open().then(() => {
        hidRef.current = d;
        setConnected(true);
        setDevName(d.productName || 'AULA F87');
        addLog('system', `Auto-reconnected: ${d.productName || 'AULA F87'}`);
        readConfig().then(raw => {
          if (!raw) return;
          const s = decodeState(raw);
          lastStateRef.current = s;
          setReadback(describeState(s));
          applyStateToUI(s);
        }).catch(() => {});
      }).catch(() => {});
    });

    navigator.hid.addEventListener('disconnect', ev => {
      if (hidRef.current && ev.device === hidRef.current) {
        handleDisconnect();
        addLog('system', 'Keyboard disconnected.');
      }
    });
    return () => { stopAudioCapture(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HID protocol helpers
  // ─────────────────────────────────────────────────────────────────────────
  const sendReport = async (full) => {
    if (!hidRef.current) throw new Error('Keyboard not connected.');
    if (full.length !== REPORT_SIZE)
      throw new Error(`Expected ${REPORT_SIZE} bytes, got ${full.length}.`);
    await hidRef.current.sendFeatureReport(full[0], full.slice(1));
  };

  const normaliseBody = (view) => {
    const body = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    if (body.length && body[0] === REPORT_ID) return new Uint8Array(body);
    const full = new Uint8Array(body.length + 1);
    full[0] = REPORT_ID;
    full.set(body, 1);
    return full;
  };

  const buildReadInit = () => {
    const b = new Uint8Array(REPORT_SIZE);
    b[0]=REPORT_ID; b[1]=CMD_READ_INIT; b[4]=0x01; b[6]=0x80;
    return b;
  };

  const readConfig = async () => {
    if (!hidRef.current) throw new Error('Keyboard not connected.');
    await sendReport(buildReadInit());
    await sleep(40);
    const view = await hidRef.current.receiveFeatureReport(REPORT_ID);
    const raw  = normaliseBody(view);
    if (raw.length < 136) throw new Error(`Feature read returned only ${raw.length} bytes.`);
    if (raw[0] !== REPORT_ID || raw[1] !== CMD_READ_INIT)
      throw new Error(`Unexpected config header: ${hexFmt(raw.slice(0,8))}`);
    return raw;
  };

  const effectPairOffset = id => 64 + id * 2;

  const decodeState = raw => {
    const id = raw[EFFECT_OFFSET];
    let b=null, s=null, c=null;
    if (id >= 1 && id <= 18) {
      const o = effectPairOffset(id);
      b = raw[o];
      s = (raw[o+1] >> 4) & 0x0f;
      c = (raw[o+1] & 0x0f) === 0x07;
    }
    return { id, brightness:b, speed:s, colorful:c, raw };
  };

  const describeState = s => {
    const e = effects.find(x => x.id === s.id) || { name:`Unknown (${s.id})` };
    return `${e.name} · B:${s.brightness ?? '?'} · S:${s.speed ?? '?'} · ${s.colorful ? 'Rainbow' : 'Solid'}`;
  };

  const buildConfigWrite = (currentRaw, req) => {
    const b = new Uint8Array(REPORT_SIZE);
    b.set(currentRaw.slice(0, Math.min(currentRaw.length, REPORT_SIZE)));
    b[0]=REPORT_ID; b[1]=CMD_WRITE;
    b[EFFECT_OFFSET] = req.effect.id;
    if (req.effect.id !== 0) {
      const o = effectPairOffset(req.effect.id);
      b[o] = req.brightness;
      const oldSpd = (b[o+1] >> 4) & 0x0f;
      const spd    = req.effect.speed ? req.speed : oldSpd;
      let mode = 0;
      if      (req.effect.colorfulOnly) mode = 0x07;
      else if (req.effect.colorful)     mode = req.colorful ? 0x07 : 0x00;
      b[o+1] = ((spd & 0x0f) << 4) | mode;
    }
    return b;
  };

  const buildPalette = colours => {
    const p = new Uint8Array(PALETTE_TEMPLATE);
    p[29]=colours[0]; p[30]=colours[1]; p[31]=colours[2];
    return p;
  };

  const applyStateToUI = s => {
    const found = effects.find(e => e.id === s.id);
    if (!found) return;
    setEffectId(s.id);
    if (s.brightness !== null) setBrightness(Math.max(0, Math.min(4, s.brightness)));
    if (s.speed      !== null) setSpeed(Math.max(0, Math.min(4, s.speed)));
    if (s.colorful   !== null) setColorful(!!s.colorful);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Device management
  // ─────────────────────────────────────────────────────────────────────────
  const connectDevice = async () => {
    if (!supported) return;
    try {
      const list = await navigator.hid.requestDevice({
        filters: [{ vendorId:VID, productId:PID }]
      });
      if (!list.length) { addLog('system','No device selected.'); return; }
      const d = list[0];
      if (!d.opened) await d.open();
      hidRef.current = d;
      setConnected(true);
      setDevName(d.productName || 'AULA F87');
      addLog('system', `Connected: ${d.productName || 'AULA F87'}`);
      ioBusyRef.current = true;
      const raw = await readConfig();
      const s   = decodeState(raw);
      lastStateRef.current = s;
      setReadback(describeState(s));
      applyStateToUI(s);
      addLog('read', `Initial state: ${describeState(s)}`);
    } catch (err) {
      addLog('error', `Connect failed: ${err.message}`);
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
  };

  const syncDevice = async () => {
    if (!hidRef.current || ioBusyRef.current || vizLoopRef.current) return;
    ioBusyRef.current = true;
    try {
      const raw = await readConfig();
      const s   = decodeState(raw);
      const changed = !lastStateRef.current ||
        ['id','brightness','speed','colorful'].some(k => lastStateRef.current[k] !== s[k]);
      lastStateRef.current = s;
      const desc = describeState(s);
      setReadback(desc);
      if (changed) { addLog('sync', `External change: ${desc}`); applyStateToUI(s); }
    } catch (err) { addLog('error', `Sync: ${err.message}`); }
    finally { ioBusyRef.current = false; }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Write configuration
  // ─────────────────────────────────────────────────────────────────────────
  const writeConfig = async (src='manual', colorOnly=false) => {
    if (!connected || ioBusyRef.current || vizLoopRef.current) return;
    ioBusyRef.current = true;
    try {
      addLog('write', `Writing (${src})${colorOnly ? ' — color only' : ''}...`);
      const currentRaw = await readConfig();
      let cfgReport;
      if (colorOnly) {
        cfgReport = new Uint8Array(REPORT_SIZE);
        cfgReport.set(currentRaw.slice(0, Math.min(currentRaw.length, REPORT_SIZE)));
        cfgReport[0]=REPORT_ID; cfgReport[1]=CMD_WRITE;
      } else {
        cfgReport = buildConfigWrite(currentRaw, { effect:activeEffect, brightness, speed, colorful, rgb });
      }
      const palette = buildPalette(rgb);
      await sleep(70);
      await sendReport(cfgReport);
      await sleep(70);
      await sendReport(palette);
      await sleep(320);
      const verifyRaw = await readConfig();
      const verified  = decodeState(verifyRaw);
      lastStateRef.current = verified;
      const desc = describeState(verified);
      setReadback(desc);
      addLog('readback', desc);
    } catch (err) { addLog('error', `Write failed: ${err.message}`); }
    finally { ioBusyRef.current = false; }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Audio pipeline
  // ─────────────────────────────────────────────────────────────────────────
  const setupAudioPipeline = (stream, label) => {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, 1 - audioSmooth/30));
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    audioStrRef.current = stream;
    setAudioAnalyser(analyser);     // state → re-render → visualizer gets it
    addLog('audio', `${label} pipeline ready.`);
  };

  const handleMic = async () => {
    try {
      stopAudioCapture(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      setupAudioPipeline(stream, 'Microphone');
      setAudioSrc('mic');
    } catch (err) { addLog('error', `Mic: ${err.message}`); }
  };

  const handleSystemAudio = async () => {
    try {
      stopAudioCapture(false);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:{ systemAudio:'include' } });
      const aTracks = stream.getAudioTracks();
      if (!aTracks.length) {
        stream.getTracks().forEach(t=>t.stop());
        throw new Error('No audio track in selected source.');
      }
      stream.getVideoTracks().forEach(t=>t.stop());
      setupAudioPipeline(new MediaStream(aTracks), 'System/Tab');
      setAudioSrc('system');
    } catch (err) { addLog('error', `System audio: ${err.message}`); }
  };

  const stopAudioCapture = (logIt=true) => {
    stopVisualizerLoop();
    if (audioStrRef.current) { audioStrRef.current.getTracks().forEach(t=>t.stop()); audioStrRef.current=null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(()=>{}); audioCtxRef.current=null; }
    setAudioAnalyser(null);
    setAudioSrc('none');
    if (logIt) addLog('audio', 'Capture stopped.');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Direct-RGB keyboard visualizer stream
  // ─────────────────────────────────────────────────────────────────────────
  const startVisualizerLoop = async () => {
    if (!connected)       { addLog('error','Connect keyboard first.'); return; }
    if (!audioAnalyser)   { addLog('error','Select an audio source first.'); return; }
    if (vizLoopRef.current) return;

    vizLoopRef.current = true;
    setVizRunning(true);
    addLog('audio', 'Starting 520-byte direct RGB stream (~20 FPS).');

    // Local snapshot of constants to avoid closure issues
    const KEY_LAYOUT_MAP = [
      [0,0,0],[12,1,0],[18,2,0],[24,3,0],[30,4,0],[36,5,0],[42,6,0],[48,7,0],[54,8,0],[60,9,0],[66,10,0],[72,11,0],[78,12,0],[84,13,0],[90,14,0],[96,15,0],
      [1,0,1],[7,1,1],[13,2,1],[19,3,1],[25,4,1],[31,5,1],[37,6,1],[43,7,1],[49,8,1],[55,9,1],[61,10,1],[67,11,1],[73,12,1],[79,13,1],[85,14,1],[91,15,1],[97,16,1],
      [2,0,2],[8,1,2],[14,2,2],[20,3,2],[26,4,2],[32,5,2],[38,6,2],[44,7,2],[50,8,2],[56,9,2],[62,10,2],[68,11,2],[74,12,2],[80,13,2],[86,14,2],[92,15,2],[98,16,2],
      [3,0,3],[9,1,3],[15,2,3],[21,3,3],[27,4,3],[33,5,3],[39,6,3],[45,7,3],[51,8,3],[57,9,3],[63,10,3],[69,11,3],[81,13,3],
      [4,0,4],[10,1,4],[16,2,4],[22,3,4],[28,4,4],[34,5,4],[40,6,4],[46,7,4],[52,8,4],[58,9,4],[64,10,4],[82,13,4],[94,15,4],
      [5,0,5],[11,1,5],[17,2,5],[35,5,5],[53,9,5],[59,10,5],[65,11,5],[83,13,5],[89,14,5],[95,15,5],[101,16,5],
    ];

    const buildDirectFrame = (colorsMap) => {
      const f = new Uint8Array(REPORT_SIZE);
      f[0]=REPORT_ID; f[1]=CMD_DIRECT; f[4]=1; f[6]=122; f[7]=1;
      colorsMap.forEach(([r,g,b], idx) => {
        if (idx < 0 || idx >= 122) return;
        const o = 8 + idx*3; f[o]=r; f[o+1]=g; f[o+2]=b;
      });
      return f;
    };

    let phase = 0, frames = 0;
    const freq = new Uint8Array(audioAnalyser.frequencyBinCount);
    const gainSnap = audioGain;
    const modeSnap = audioMode;
    const colSnap  = audioColorful;
    const rgbSnap  = rgb.slice();
    const analyserSnap = audioAnalyser;

    const loop = async () => {
      if (!vizLoopRef.current) return;
      try {
        analyserSnap.getByteFrequencyData(freq);
        const bass  = freq.slice(0,10).reduce((a,b)=>a+b,0)/10/255 * gainSnap;
        const mid   = freq.slice(10,35).reduce((a,b)=>a+b,0)/25/255 * gainSnap;
        const high  = freq.slice(35,64).reduce((a,b)=>a+b,0)/29/255 * gainSnap;
        const level = Math.min(1, bass*0.5 + mid*0.35 + high*0.15);
        phase += 0.08 + level*0.12;

        const colors = new Map();
        KEY_LAYOUT_MAP.forEach(([idx, x, y]) => {
          let v = 0, h = (x*18 + phase*80) % 360;
          switch (modeSnap) {
            case "Audio dance – soft":
              v = Math.max(0, level - Math.abs(x-8)/14) * 1.3; break;
            case "Dazzling – rock":
              v = bass>0.45 ? Math.min(1,bass*1.4) : mid*0.35;
              h = (phase*220 + x*25 + y*40)%360; break;
            case "Clouds rise and snow fly":
              v = Math.max(0, high*1.4-(5-y)/8) * (0.55+0.45*Math.sin(phase*3+x)); break;
            case "Light Field Change – voice":
              v = Math.min(1, mid*1.5) * (0.45+0.55*Math.sin(x*0.45+phase*2)**2); break;
            case "The gurgling stream":
              v = Math.max(0, level*0.9+0.35*Math.sin(x*0.55-y*0.7+phase*3)); h=185+x*4; break;
            case "Blooming – passion": {
              const d = Math.hypot(x-8,y-2.5);
              v = Math.max(0, level*1.6-Math.abs(d-(phase*3)%9)*0.25); h=330+d*7; break;
            }
            case "Pearl falling jade plate":
              v = (high>0.35 && ((x*7+y*13+Math.floor(phase*8))%17)<2) ? Math.min(1,high*1.5) : level*0.08;
              h = 160+high*100; break;
            case "Clouds follow the moon":
              v = 0.12+level*0.45+0.16*Math.sin(x*0.25+phase); h=205+20*Math.sin(phase*0.4); break;
            case "Mountains and Flowing Waters": {
              const bin = Math.min(freq.length-1, Math.floor((x/17)*freq.length));
              const ht  = (freq[bin]/255)*6*gainSnap;
              v = (5-y)<ht ? Math.min(1, 0.25+freq[bin]/255*gainSnap) : 0; h=120+x*7; break;
            }
            case "Raining like silk – regular":
              v = Math.max(0, level*0.35+0.7*Math.sin(y*1.2-phase*5+(x%5)*1.5));
              v *= high*0.7+mid*0.5; h=190+x*3; break;
            default: v = level;
          }
          v = Math.max(0, Math.min(1, v));
          colors.set(idx, colSnap ? hsv(h,90,v*100) : rgbSnap.map(c=>(c*v)|0));
        });

        await sendReport(buildDirectFrame(colors));
        frames++;
        if (frames === 1) addLog('audio', 'First direct RGB frame delivered.');
      } catch (err) {
        addLog('error', `Stream error: ${err.message}`);
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
    addLog('audio', 'Direct RGB stream stopped.');
    // Send blank frame to restore effect
    if (hidRef.current) {
      const blank = new Uint8Array(REPORT_SIZE);
      blank[0]=REPORT_ID; blank[1]=CMD_DIRECT;
      sendReport(blank).catch(()=>{});
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Colour helpers
  // ─────────────────────────────────────────────────────────────────────────
  const setRgbAndHex = (r, g, b) => {
    setRgb([r,g,b]);
    setHexColor('#' + [r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('').toUpperCase());
  };

  const handleColorPicker = e => {
    const v = e.target.value;
    setHexColor(v.toUpperCase());
    setRgb([parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)]);
  };

  const handleHexInput = e => {
    const v = e.target.value;
    setHexColor(v);
    const m = /^#?([0-9a-f]{6})$/i.exec(v.trim());
    if (m) {
      const s = m[1];
      setRgb([parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)]);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────
  const accentCSS = { color:'var(--accent)' };
  const accent2CSS = { color:'var(--accent2)' };

  const ThemeBar = () => (
    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap' }}>
      {/* Style mode toggle */}
      <div className="toggle-pill" title="Toggle UI style mode">
        <button
          className={`toggle-pill-btn ${styleMode==='glass' ? 'active' : ''}`}
          onClick={() => setStyleMode('glass')}
        >
          🫧 Glass
        </button>
        <button
          className={`toggle-pill-btn ${styleMode==='neo' ? 'active' : ''}`}
          onClick={() => setStyleMode('neo')}
        >
          ⬛ Neo
        </button>
      </div>

      {/* Theme toggle */}
      <div className="toggle-pill" title="Toggle light / dark theme">
        <button
          className={`toggle-pill-btn ${themeMode==='dark' ? 'active' : ''}`}
          onClick={() => setThemeMode('dark')}
        >
          🌙 Dark
        </button>
        <button
          className={`toggle-pill-btn ${themeMode==='light' ? 'active' : ''}`}
          onClick={() => setThemeMode('light')}
        >
          ☀️ Light
        </button>
      </div>

      {/* Accent toggle */}
      <div className="toggle-pill" title="Keyboard custom accent mirrors your selected RGB color">
        <button
          className={`toggle-pill-btn ${accentMode==='default' ? 'active' : ''}`}
          onClick={() => setAccentMode('default')}
        >
          Default
        </button>
        <button
          className={`toggle-pill-btn ${accentMode==='keyboard' ? 'active' : ''}`}
          onClick={() => setAccentMode('keyboard')}
          title="UI accent follows the keyboard's selected color"
        >
          🎨 KB Color
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:'100svh',
        background:'var(--bg)',
        color:'var(--text)',
        padding:'clamp(1rem,3vw,2.5rem)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem',
        transition:'background 0.3s, color 0.3s',
        position:'relative', overflow:'hidden',
      }}
    >
      {/* Background blobs */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
        <div className="blob-1" style={{
          position:'absolute',top:'-5%',left:'-10%',
          width:'45vw',height:'45vw',borderRadius:'50%',
          background:'rgba(var(--accent-rgb),0.08)',filter:'blur(90px)'
        }}/>
        <div className="blob-2" style={{
          position:'absolute',bottom:'-10%',right:'-5%',
          width:'50vw',height:'50vw',borderRadius:'50%',
          background:'rgba(168,85,247,0.06)',filter:'blur(100px)'
        }}/>
        <div className="blob-3" style={{
          position:'absolute',top:'40%',right:'30%',
          width:'25vw',height:'25vw',borderRadius:'50%',
          background:'rgba(236,72,153,0.04)',filter:'blur(70px)'
        }}/>
      </div>

      <div style={{ width:'100%', maxWidth:'72rem', display:'flex', flexDirection:'column', gap:'1.25rem', zIndex:1 }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="panel" style={{ padding:'1.75rem 2rem' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem' }}>
              <div>
                <div style={{ fontSize:'0.7rem', fontFamily:'monospace', letterSpacing:'0.15em', color:'var(--accent)', fontWeight:700, marginBottom:'0.4rem' }}>
                  AULA F87 / F87 Pro · VID:258A PID:010C
                </div>
                <h1 style={{ margin:0, fontSize:'clamp(1.6rem,4vw,3rem)', fontWeight:900, letterSpacing:'-0.02em', color:'var(--text)', lineHeight:1 }}>
                  Web Controller
                </h1>
                <p style={{ margin:'0.4rem 0 0', color:'var(--text2)', fontSize:'0.85rem' }}>
                  Custom lighting profiles · Real-time Audio Visualizer · WebHID direct RGB
                </p>
              </div>

              {/* Connection controls */}
              <div style={{ display:'flex', gap:'0.6rem', alignItems:'center', flexWrap:'wrap' }}>
                {connected ? (<>
                  <button className="btn btn-secondary" onClick={syncDevice} disabled={vizLoopRef.current} title="Read current config from keyboard">
                    <RefreshCw size={15} /> Sync
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

            {/* Theme bar */}
            <ThemeBar />
          </div>
        </header>

        {/* ── Unsupported banner ─────────────────────────────────────── */}
        {!supported && (
          <div style={{
            padding:'1rem',borderRadius:8,
            background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',
            color:'#f87171',textAlign:'center',fontWeight:700,fontFamily:'monospace'
          }}>
            ⚠️ WebHID API unavailable. Use a Chromium browser (Chrome 89+, Edge 89+, Opera 75+).
          </div>
        )}

        {/* ── Status Bar ────────────────────────────────────────────── */}
        <div className="panel" style={{ padding:'0.75rem 1.25rem', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'0.75rem', fontSize:'0.75rem', fontFamily:'monospace' }}>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="pulse-dot" style={{
              color: connected ? 'var(--accent)' : '#ef4444',
              background: connected ? 'var(--accent)' : '#ef4444'
            }} />
            <strong>{connected ? `CONNECTED — ${devName}` : 'DISCONNECTED'}</strong>
          </span>

          <span style={{ flex:1, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {readback !== '—' && `Config: ${readback}`}
          </span>

          <div style={{ display:'flex', gap:'1rem', alignItems:'center', marginLeft:'auto' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="checkbox" checked={autoSync} onChange={e=>setAutoSync(e.target.checked)} style={{ accentColor:'var(--accent)' }} />
              Auto-sync
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="checkbox" checked={liveApply} onChange={e=>setLiveApply(e.target.checked)} style={{ accentColor:'var(--accent)' }} />
              Live Apply
            </label>
          </div>
        </div>

        {/* ── Keyboard Visualizer ────────────────────────────────────── */}
        <section className="panel" style={{ padding:'1.5rem 1.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Activity size={18} style={accentCSS} />
              <span style={{ fontWeight:700, fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Realtime LED Preview
              </span>
            </div>
            {vizRunning && (
              <span style={{
                padding:'0.2rem 0.6rem', borderRadius:9999,
                background:'rgba(236,72,153,0.15)', color:'#ec4899',
                fontSize:'0.65rem', fontFamily:'monospace', fontWeight:700,
                letterSpacing:'0.1em', border:'1px solid rgba(236,72,153,0.3)',
                animation:'pulseDot 2s ease-in-out infinite'
              }}>
                STREAMING TO KEYBOARD
              </span>
            )}
          </div>
          <KeyboardVisualizer
            activeEffect={effectId}
            rgb={rgb}
            speed={speed}
            brightness={brightness}
            colorful={colorful}
            audioAnalyser={audioAnalyser}
            audioMode={audioMode}
            audioGain={audioGain}
            audioColorful={audioColorful}
          />
        </section>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:'0.25rem', borderBottom:`2px solid var(--border-alt)` }}>
          {[
            { id:'lighting',    icon:<Sliders size={14}/>,  label:'Lighting' },
            { id:'audio',       icon:<Volume2 size={14}/>,  label:'Audio Visualizer' },
            { id:'diagnostics', icon:<Terminal size={14}/>, label:'Diagnostics' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab===t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:6 }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Lighting ─────────────────────────────────────────── */}
        {activeTab === 'lighting' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'1.25rem' }}>

            {/* Effect Controls */}
            <article className="panel panel-accent" style={{ padding:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
                <Sun size={18} style={accentCSS} />
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Lighting Effect
                </h2>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
                {/* Effect select */}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>
                    Effect Style
                  </label>
                  <select
                    className="app-select"
                    value={effectId}
                    onChange={e => setEffectId(Number(e.target.value))}
                  >
                    {effects.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Brightness */}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>Brightness</label>
                    <strong style={accentCSS}>{brightness} / 4</strong>
                  </div>
                  <input type="range" min={0} max={4} step={1} value={brightness}
                    onChange={e=>setBrightness(Number(e.target.value))}
                    style={{ width:'100%', accentColor:'var(--accent)' }} />
                </div>

                {/* Speed */}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>Speed</label>
                    <strong style={accentCSS}>{speed} / 4</strong>
                  </div>
                  <input type="range" min={0} max={4} step={1} value={speed}
                    disabled={!activeEffect.speed}
                    onChange={e=>setSpeed(Number(e.target.value))}
                    style={{ width:'100%', accentColor:'var(--accent)', opacity: activeEffect.speed ? 1 : 0.35 }} />
                </div>

                {/* Rainbow */}
                <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer',
                  padding:'0.6rem 0.8rem', background:'rgba(var(--accent-rgb),0.05)',
                  border:'1px solid rgba(var(--accent-rgb),0.1)', borderRadius:styleMode==='neo'?0:8 }}>
                  <span style={{ fontSize:'0.8rem', fontWeight:600 }}>Rainbow / Colorful Mode</span>
                  <input type="checkbox"
                    checked={activeEffect.colorfulOnly || colorful}
                    disabled={activeEffect.colorfulOnly || !activeEffect.colorful}
                    onChange={e=>setColorful(e.target.checked)}
                    style={{ accentColor:'var(--accent)', width:16, height:16 }} />
                </label>

                {/* Buttons */}
                <div style={{ display:'flex', gap:'0.6rem' }}>
                  <button className="btn btn-primary" style={{ flex:1, position:'relative' }}
                    onClick={() => writeConfig('manual')}
                    disabled={!connected || vizRunning}
                  >
                    Apply Settings
                  </button>
                  <div style={{ position:'relative', flex:1 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ width:'100%' }}
                      disabled={!connected || !activeEffect.color || vizRunning}
                      onClick={() => writeConfig('manual', true)}
                    >
                      Palette Only
                    </button>
                    <button
                      onClick={() => setShowInfo(v=>!v)}
                      style={{ position:'absolute', top:-6, right:-6, background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:2 }}
                      title="What is Palette Only?"
                    >
                      <Info size={13} />
                    </button>
                    {showInfo && (
                      <div style={{
                        position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:50, width:200,
                        background:'var(--surface2)', border:'1px solid var(--border-alt)',
                        borderRadius:styleMode==='neo'?0:10, padding:'0.75rem', fontSize:'0.72rem',
                        color:'var(--text2)', lineHeight:1.5,
                        boxShadow: styleMode==='neo' ? '4px 4px 0 var(--border)' : '0 8px 24px rgba(0,0,0,0.3)'
                      }}>
                        <strong style={{ color:'var(--text)', display:'block', marginBottom:4 }}>Palette Only</strong>
                        Writes only the RGB color to the keyboard without changing the effect mode, brightness, or speed. Useful for updating color without resetting other settings.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* Custom RGB Card */}
            <article className="panel" style={{ padding:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
                <Layers size={18} style={accent2CSS} />
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Custom RGB Palette
                </h2>
              </div>

              {/* Color preview + picker */}
              <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1.1rem' }}>
                <div style={{
                  width:60, height:60, flexShrink:0, borderRadius:styleMode==='neo'?0:10,
                  border:`2px solid var(--border)`,
                  boxShadow: styleMode==='neo'
                    ? `4px 4px 0 var(--border), 0 0 20px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`
                    : `0 0 20px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`,
                  background:`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
                  position:'relative', overflow:'hidden', cursor:'pointer'
                }}>
                  <input type="color"
                    disabled={!activeEffect.color}
                    value={hexColor.startsWith('#') ? hexColor.toLowerCase() : '#ff0000'}
                    onChange={handleColorPicker}
                    style={{ position:'absolute', inset:0, width:'200%', height:'200%', transform:'translate(-25%,-25%)', cursor:'pointer', opacity:0.01 }} />
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>Hex Code</label>
                  <input className="app-input"
                    type="text"
                    maxLength={7}
                    value={hexColor}
                    disabled={!activeEffect.color}
                    onChange={handleHexInput}
                    style={{ fontFamily:'monospace', fontWeight:700 }} />
                </div>
              </div>

              {/* R/G/B sliders */}
              {[['R','#ef4444',0],['G','#22c55e',1],['B','#3b82f6',2]].map(([ch,col,i]) => (
                <div key={ch} style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.7rem' }}>
                  <span style={{ width:16, fontWeight:800, color:col, fontFamily:'monospace', fontSize:'0.85rem', textAlign:'center' }}>{ch}</span>
                  <input type="range" min={0} max={255} value={rgb[i]}
                    disabled={!activeEffect.color}
                    onChange={e => {
                      const v = Number(e.target.value);
                      const nr = [...rgb]; nr[i]=v;
                      setRgb(nr);
                      setHexColor('#'+nr.map(c=>c.toString(16).padStart(2,'0')).join('').toUpperCase());
                    }}
                    style={{ flex:1, accentColor:col, opacity:activeEffect.color?1:0.35 }} />
                  <span style={{ width:28, textAlign:'right', fontFamily:'monospace', fontSize:'0.8rem', color:'var(--text2)' }}>{rgb[i]}</span>
                </div>
              ))}

              {accentMode === 'keyboard' && (
                <div style={{ marginTop:'0.75rem', padding:'0.5rem 0.75rem', borderRadius:6,
                  background:'rgba(var(--accent-rgb),0.08)', border:'1px solid rgba(var(--accent-rgb),0.2)',
                  fontSize:'0.72rem', color:'var(--accent)', fontWeight:600 }}>
                  🎨 UI accent is mirroring your selected keyboard color
                </div>
              )}
            </article>
          </div>
        )}

        {/* ── Tab: Audio ────────────────────────────────────────────── */}
        {activeTab === 'audio' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'1.25rem' }}>

            {/* Audio Source */}
            <article className="panel" style={{ padding:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
                <Mic size={18} style={{ color:'var(--accent3)' }} />
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Audio Source
                </h2>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'1.1rem' }}>
                <button className={`btn ${audioSrc==='mic' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleMic}
                  style={{ justifyContent:'center' }}>
                  <Mic size={14} /> Microphone
                </button>
                <button className={`btn ${audioSrc==='system' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleSystemAudio}
                  style={{ justifyContent:'center' }}>
                  <Monitor size={14} /> System Audio
                </button>
              </div>
              {audioSrc !== 'none' && (
                <button className="btn btn-secondary" style={{ width:'100%', marginBottom:'1rem' }}
                  onClick={() => stopAudioCapture(true)}>
                  Stop Capture Source
                </button>
              )}

              {/* Visualizer style */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'1rem' }}>
                <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>
                  Visualizer Style
                </label>
                <select className="app-select" value={audioMode} onChange={e=>setAudioMode(e.target.value)}>
                  {audioModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Gain */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>Gain</label>
                  <strong style={{ color:'var(--accent3)', fontFamily:'monospace' }}>{audioGain.toFixed(1)}×</strong>
                </div>
                <input type="range" min={0.2} max={4} step={0.1} value={audioGain}
                  onChange={e=>setAudioGain(Number(e.target.value))}
                  style={{ accentColor:'var(--accent3)' }} />
              </div>

              {/* Smoothness */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <label style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', fontWeight:700 }}>Smoothness</label>
                  <strong style={{ color:'var(--accent3)', fontFamily:'monospace' }}>{audioSmooth}</strong>
                </div>
                <input type="range" min={1} max={30} step={1} value={audioSmooth}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setAudioSmooth(v);
                    if (audioAnalyser) audioAnalyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, 1-v/30));
                  }}
                  style={{ accentColor:'var(--accent3)' }} />
              </div>

              <label style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer',
                padding:'0.6rem 0.8rem', background:'rgba(236,72,153,0.05)',
                border:'1px solid rgba(236,72,153,0.1)', borderRadius:styleMode==='neo'?0:8 }}>
                <span style={{ fontSize:'0.8rem', fontWeight:600 }}>Colorful (rainbow)</span>
                <input type="checkbox" checked={audioColorful} onChange={e=>setAudioColorful(e.target.checked)}
                  style={{ accentColor:'var(--accent3)', width:16, height:16 }} />
              </label>
            </article>

            {/* Streaming Engine */}
            <article className="panel" style={{ padding:'1.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
                  <Gauge size={18} style={accentCSS} />
                  <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Streaming Engine
                  </h2>
                </div>

                <p style={{ color:'var(--text2)', fontSize:'0.82rem', lineHeight:1.6, marginBottom:'1.25rem' }}>
                  Streams audio-reactive color frames directly to the keyboard via 520-byte Feature Report
                  (cmd <code style={{ background:'rgba(var(--accent-rgb),0.15)', padding:'1px 5px', borderRadius:4, fontSize:'0.78rem' }}>0x08</code>).
                  Bypasses EEPROM saves to prevent hardware wear.
                </p>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', fontFamily:'monospace', fontSize:'0.72rem', marginBottom:'1.25rem' }}>
                  {[
                    ['Audio Source', audioSrc !== 'none' ? audioSrc.toUpperCase() : 'STOPPED'],
                    ['Hardware FPS', vizRunning ? '~20 FPS' : 'OFFLINE'],
                    ['Frame Size', '520 bytes'],
                    ['LED Zones', '122 keys'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ padding:'0.5rem 0.65rem', background:'rgba(var(--accent-rgb),0.04)', borderRadius:styleMode==='neo'?0:6, border:'1px solid var(--border-alt)' }}>
                      <div style={{ color:'var(--text3)', marginBottom:2 }}>{k}</div>
                      <div style={{ color: v==='OFFLINE'?'var(--text3)':v==='STOPPED'?'var(--text3)':'var(--accent)', fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                {vizRunning ? (
                  <button className="btn btn-danger" style={{ width:'100%', padding:'0.85rem' }}
                    onClick={stopVisualizerLoop}>
                    <Square size={15} fill="currentColor" /> Stop Keyboard Visualizer
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{ width:'100%', padding:'0.85rem' }}
                    disabled={!connected || audioSrc === 'none'}
                    onClick={startVisualizerLoop}>
                    <Play size={15} fill="currentColor" /> Start Keyboard Visualizer
                  </button>
                )}
              </div>
            </article>
          </div>
        )}

        {/* ── Tab: Diagnostics ──────────────────────────────────────── */}
        {activeTab === 'diagnostics' && (
          <article className="panel" style={{ padding:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border-alt)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Terminal size={18} style={accent2CSS} />
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Diagnostics Console
                </h2>
              </div>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <button className="btn btn-secondary" style={{ fontSize:'0.7rem', padding:'0.35rem 0.7rem' }}
                  onClick={() => navigator.clipboard.writeText(logs.join('\n')).then(()=>addLog('system','Logs copied.'))}>
                  Copy
                </button>
                <button className="btn btn-danger" style={{ fontSize:'0.7rem', padding:'0.35rem 0.7rem' }}
                  onClick={() => setLogs([])}>
                  <Trash2 size={11} /> Clear
                </button>
              </div>
            </div>

            {/* Terminal */}
            <div
              ref={logRef}
              style={{
                width:'100%', height:320,
                background:'#000', borderRadius:styleMode==='neo'?0:10,
                border:`1px solid var(--border-alt)`,
                padding:'1rem', overflowY:'auto',
                fontFamily:'monospace', fontSize:'0.72rem', lineHeight:1.6,
                color:'#4ade80'
              }}
            >
              {logs.length === 0
                ? <span style={{ color:'#374151', fontStyle:'italic' }}>No events yet. Connect a keyboard to begin.</span>
                : logs.map((l,i) => <div key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.15)', paddingBottom:1 }}>{l}</div>)
              }
            </div>

            {/* Protocol reference */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px,1fr))', gap:'0.5rem', marginTop:'1rem' }}>
              {[['VID','258A'],['PID','010C'],['Report','0x06'],['Read','0x84'],['Write','0x04'],['Palette','0x0A'],['Direct','0x08'],['Size','520 B']].map(([k,v]) => (
                <div key={k} style={{ padding:'0.55rem', textAlign:'center',
                  background:'rgba(var(--accent-rgb),0.05)',border:'1px solid var(--border-alt)',
                  borderRadius:styleMode==='neo'?0:6, fontFamily:'monospace', fontSize:'0.7rem' }}>
                  <div style={{ color:'var(--text3)', marginBottom:2 }}>{k}</div>
                  <div style={{ color:'var(--accent)', fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer style={{ textAlign:'center', color:'var(--text3)', fontSize:'0.72rem', fontFamily:'monospace', padding:'1.5rem 0 0.5rem', lineHeight:1.8 }}>
          <div>AULA F87 Web Controller — Browser WebHID, no backend required</div>
          <div>
            Developed by&nbsp;
            <a href="https://github.com/AbhiCrackerOffiicial" target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'none' }}>
              AbhiCracker
            </a>
            &nbsp;·&nbsp;
            <a href="https://Abhishekkumar001.dev" target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'none' }}>
              Abhishekkumar001.dev
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
