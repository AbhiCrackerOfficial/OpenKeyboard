import React, { useEffect, useRef } from 'react';
import { hsv } from '../utils/colorUtils';
import { DEFAULT_KEYBOARD_PROFILE } from '../config/keyboards';

// Total grid dimensions in key units
const TOTAL_WIDTH_U = 19.1;
const TOTAL_HEIGHT_U = 6.65;

function getKeyStyle(leftU, topU, widthU, heightU) {
  const marginX = 0.2;
  const marginY = 0.2;
  return {
    position: 'absolute',
    left: `${((leftU + marginX) / TOTAL_WIDTH_U) * 100}%`,
    top: `${((topU + marginY) / TOTAL_HEIGHT_U) * 100}%`,
    width: `${(widthU / TOTAL_WIDTH_U) * 100}%`,
    height: `${(heightU / TOTAL_HEIGHT_U) * 100}%`,
  };
}

// Map browser code to LED index
const CODE_TO_IDX = {
  Escape: 0, F1: 12, F2: 18, F3: 24, F4: 30, F5: 36, F6: 42, F7: 48, F8: 54, F9: 60, F10: 66, F11: 72, F12: 78, PrintScreen: 84, ScrollLock: 90, Pause: 96,
  Backquote: 1, Digit1: 7, Digit2: 13, Digit3: 19, Digit4: 25, Digit5: 31, Digit6: 37, Digit7: 43, Digit8: 49, Digit9: 55, Digit0: 61, Minus: 67, Equal: 73, Backspace: 79, Insert: 85, Home: 91, PageUp: 97,
  Tab: 2, KeyQ: 8, KeyW: 14, KeyE: 20, KeyR: 26, KeyT: 32, KeyY: 38, KeyU: 44, KeyI: 50, KeyO: 56, KeyP: 62, BracketLeft: 68, BracketRight: 74, Backslash: 80, Delete: 86, End: 92, PageDown: 98,
  CapsLock: 3, KeyA: 9, KeyS: 15, KeyD: 21, KeyF: 27, KeyG: 33, KeyH: 39, KeyJ: 45, KeyK: 51, KeyL: 57, Semicolon: 63, Quote: 69, Enter: 81,
  ShiftLeft: 4, KeyZ: 10, KeyX: 16, KeyC: 22, KeyV: 28, KeyB: 34, KeyN: 40, KeyM: 46, Comma: 52, Period: 58, Slash: 64, ShiftRight: 82, ArrowUp: 94,
  ControlLeft: 5, MetaLeft: 11, AltLeft: 17, Space: 35, AltRight: 53, Fn: 59, ControlRight: 83, ArrowLeft: 89, ArrowDown: 95, ArrowRight: 101,
};

export default function KeyboardVisualizer({
  profile = DEFAULT_KEYBOARD_PROFILE,
  activeEffect,
  rgb,
  speed,
  brightness,
  colorful,
  audioAnalyser,
  audioMode,
  audioGain,
  audioColorful
}) {
  const keyRefs = useRef({});
  const lightBarRef = useRef(null);
  const pressRef = useRef({});
  const phaseRef = useRef(0);
  const rafRef = useRef(null);
  const freqBuf = useRef(null);

  const keys = profile.keys || DEFAULT_KEYBOARD_PROFILE.keys;
  const snakePath = keys.map(k => k[0]);
  const idxToSnakePos = useRef(new Map());

  useEffect(() => {
    const map = new Map();
    snakePath.forEach((idx, pos) => map.set(idx, pos));
    idxToSnakePos.current = map;
  }, [keys]);

  // Live mutable refs
  const audioModeRef = useRef(audioMode);
  const audioGainRef = useRef(audioGain);
  const audioColorfulRef = useRef(audioColorful);
  const rgbRef = useRef(rgb);
  const activeEffectRef = useRef(activeEffect);
  const speedRef = useRef(speed);
  const brightnessRef = useRef(brightness);
  const colorfulRef = useRef(colorful);

  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { audioGainRef.current = audioGain; }, [audioGain]);
  useEffect(() => { audioColorfulRef.current = audioColorful; }, [audioColorful]);
  useEffect(() => { rgbRef.current = rgb; }, [rgb]);
  useEffect(() => { activeEffectRef.current = activeEffect; }, [activeEffect]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { brightnessRef.current = brightness; }, [brightness]);
  useEffect(() => { colorfulRef.current = colorful; }, [colorful]);

  useEffect(() => {
    const onDown = (e) => {
      const idx = CODE_TO_IDX[e.code];
      if (idx !== undefined) pressRef.current[idx] = 1.0;
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  useEffect(() => {
    const speedRates = [0.18, 0.45, 1.0, 2.0, 4.0];
    let lastT = performance.now();

    const loop = () => {
      const now = performance.now();
      const dtSec = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      const rate = speedRates[speedRef.current] ?? 1.0;
      phaseRef.current += rate * dtSec * 55;

      const ph = phaseRef.current;
      const bRatio = brightnessRef.current / 4;
      const [baseR, baseG, baseB] = rgbRef.current;

      let freq = null;
      if (audioAnalyser) {
        if (!freqBuf.current || freqBuf.current.length !== audioAnalyser.frequencyBinCount) {
          freqBuf.current = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        audioAnalyser.getByteFrequencyData(freqBuf.current);
        freq = freqBuf.current;
      }

      let bass = 0, mid = 0, high = 0, level = 0;
      const gainVal = audioGainRef.current;
      if (freq) {
        bass = freq.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255 * gainVal;
        mid = freq.slice(10, 35).reduce((a, b) => a + b, 0) / 25 / 255 * gainVal;
        high = freq.slice(35, 64).reduce((a, b) => a + b, 0) / 29 / 255 * gainVal;
        level = Math.min(1, bass * 0.5 + mid * 0.35 + high * 0.15);
      }

      const curAudioMode = audioModeRef.current;
      const curAudioColorful = audioColorfulRef.current;
      const curEffect = activeEffectRef.current;
      const curColorful = colorfulRef.current;

      keys.forEach(([idx, leftU, topU]) => {
        const el = keyRefs.current[idx];
        if (!el) return;

        const x = Math.round(leftU);
        const y = Math.round(topU);

        if (pressRef.current[idx] > 0) {
          pressRef.current[idx] = Math.max(0, pressRef.current[idx] - dtSec * 2.5);
        }
        const press = pressRef.current[idx] || 0;

        let r = 0, g = 0, b = 0, alpha = bRatio;

        if (freq) {
          let v = 0, h = (x * 18 + ph * 1.6) % 360;
          switch (curAudioMode) {
            case "Audio dance – soft":
              v = Math.max(0, level - Math.abs(x - 8) / 14) * 1.3; break;
            case "Dazzling – rock":
              v = bass > 0.45 ? Math.min(1, bass * 1.4) : mid * 0.35;
              h = (ph * 4 + x * 25 + y * 40) % 360; break;
            case "Clouds rise and snow fly":
              v = Math.max(0, high * 1.4 - (5 - y) / 8) * (0.55 + 0.45 * Math.sin(ph * 0.08 + x)); break;
            case "Light Field Change – voice":
              v = Math.min(1, mid * 1.5) * (0.45 + 0.55 * Math.sin(x * 0.45 + ph * 0.05) ** 2); break;
            case "The gurgling stream":
              v = Math.max(0, level * 0.9 + 0.35 * Math.sin(x * 0.55 - y * 0.7 + ph * 0.06));
              h = 185 + x * 4; break;
            case "Blooming – passion": {
              const d = Math.hypot(x - 8, y - 2.5);
              v = Math.max(0, level * 1.6 - Math.abs(d - (ph * 0.07) % 9) * 0.25);
              h = 330 + d * 7; break;
            }
            case "Pearl falling jade plate":
              v = (high > 0.35 && ((x * 7 + y * 13 + Math.floor(ph * 0.15)) % 17) < 2) ? Math.min(1, high * 1.5) : level * 0.08;
              h = 160 + high * 100; break;
            case "Clouds follow the moon":
              v = 0.12 + level * 0.45 + 0.16 * Math.sin(x * 0.25 + ph * 0.02);
              h = 205 + 20 * Math.sin(ph * 0.008); break;
            case "Mountains and Flowing Waters": {
              const bin = Math.min(freq.length - 1, Math.floor((x / 17) * freq.length));
              const ht = (freq[bin] / 255) * 6 * gainVal;
              v = (5 - y) < ht ? Math.min(1, 0.25 + freq[bin] / 255 * gainVal) : 0;
              h = 120 + x * 7; break;
            }
            case "Raining like silk – regular":
              v = Math.max(0, level * 0.35 + 0.7 * Math.sin(y * 1.2 - ph * 0.1 + (x % 5) * 1.5));
              v *= high * 0.7 + mid * 0.5; h = 190 + x * 3; break;
            default: v = level;
          }
          v = Math.max(0, Math.min(1, v));
          alpha = v * bRatio;
          if (curAudioColorful) [r, g, b] = hsv(h, 90, v * 100);
          else[r, g, b] = [baseR * v | 0, baseG * v | 0, baseB * v | 0];

        } else {
          switch (curEffect) {
            case 0: alpha = 0; break;
            case 1: r = baseR; g = baseG; b = baseB; break;
            case 2: {
              const breath = (Math.sin(ph * 0.07) + 1) / 2;
              if (curColorful) [r, g, b] = hsv((idx * 3 + ph * 0.25) % 360, 90, 100);
              else { r = baseR; g = baseG; b = baseB; }
              alpha = breath * bRatio; break;
            }
            case 3: {
              [r, g, b] = hsv(((x * 20) - ph + 360) % 360, 90, 100);
              alpha = bRatio; break;
            }
            case 4: {
              if (press > 0) {
                if (curColorful) [r, g, b] = hsv((idx * 17) % 360, 90, 100);
                else { r = baseR; g = baseG; b = baseB; }
                alpha = press * bRatio;
              } else {
                const flicker = Math.max(0, Math.sin(idx * 7.3 + ph * 0.25));
                alpha = flicker * 0.08 * bRatio;
              }
              break;
            }
            case 5: {
              const t = ph * 0.06;
              const drop = Math.sin(idx * 1.618 * 7 + t) * Math.cos(idx * Math.PI + t * 0.7);
              const v = Math.max(0, drop) ** 2;
              if (curColorful) [r, g, b] = hsv((idx * 41 + ph * 0.5) % 360, 90, 100);
              else { r = baseR; g = baseG; b = baseB; }
              alpha = v * bRatio; break;
            }
            case 7: {
              const cx = 8, cy = 2.5;
              const dist = Math.hypot(x - cx, y - cy);
              const maxD = 10;
              let maxV = 0;
              for (let i = 0; i < 3; i++) {
                const rp = (ph * 0.06 + i * (maxD / 3)) % maxD;
                const diff = Math.abs(dist - rp);
                maxV = Math.max(maxV, Math.max(0, 1 - diff * 2.5));
              }
              if (curColorful) [r, g, b] = hsv((dist * 30 + ph * 2) % 360, 90, 100);
              else { r = baseR; g = baseG; b = baseB; }
              alpha = maxV * bRatio; break;
            }
            case 8: {
              const t = ph * 0.07;
              const n = Math.sin(idx * 1.618 * 7 + t * 1.1) * Math.cos(idx * 2.718 * 5 - t * 0.8);
              const v = Math.pow(Math.max(0, n), 3);
              if (curColorful) [r, g, b] = hsv((idx * 37 + ph * 0.6) % 360, 90, 100);
              else { r = baseR; g = baseG; b = baseB; }
              alpha = v * bRatio; break;
            }
            case 10: {
              const BODY_LEN = 14;
              const snakeHead = Math.floor(ph * 0.22) % snakePath.length;
              const posInPath = idxToSnakePos.current.get(idx);
              if (posInPath === undefined) { alpha = 0; break; }
              const bodyDist = (snakeHead - posInPath + snakePath.length) % snakePath.length;
              if (bodyDist < BODY_LEN) {
                const intensity = (1 - bodyDist / BODY_LEN) ** 1.5;
                if (curColorful) [r, g, b] = hsv((snakeHead * 5 + bodyDist * 8) % 360, 90, 100);
                else { r = baseR; g = baseG; b = baseB; }
                alpha = intensity * bRatio;
              } else {
                alpha = 0;
              }
              break;
            }
            case 11: {
              const hue = (x * 16 - ph * 1.2 + 360) % 360;
              [r, g, b] = hsv(hue, 90, 100);
              const v = (Math.sin(x * 0.5 + ph * 0.1) + Math.sin(x * 0.9 - ph * 0.07 + y * 0.3)) / 2;
              alpha = ((v + 1) / 2) * bRatio; break;
            }
            case 12: {
              if (press > 0) {
                if (curColorful) [r, g, b] = hsv((idx * 23) % 360, 90, 100);
                else { r = baseR; g = baseG; b = baseB; }
                alpha = press * bRatio;
              } else {
                alpha = 0;
              }
              break;
            }
            case 13: {
              const v = (Math.sin(x * 0.5 - ph * 0.1 + y * 0.2) + 1) / 2;
              if (curColorful) [r, g, b] = hsv((x * 18 - ph) % 360, 90, 100);
              else { r = baseR; g = baseG; b = baseB; }
              alpha = v * bRatio; break;
            }
            case 15: {
              const cx = 7.5, cy = 2.5;
              const angle = ((Math.atan2(y - cy, x - cx) * 180 / Math.PI) + ph * 1.5 + 360) % 360;
              const sector = angle % (360 / 4);
              const inBlade = sector < 45;
              const dist = Math.min(1, Math.hypot(x - cx, y - cy) / 8);
              [r, g, b] = hsv((angle + ph) % 360, 90, 100);
              alpha = (inBlade ? dist : 0.06) * bRatio; break;
            }
            case 16: {
              const hue = (y * 45 + x * 12 - ph * 0.9 + 360) % 360;
              [r, g, b] = hsv(hue, 90, 100);
              const flow = (Math.sin(y * 1.4 - ph * 0.09 + x * 0.3) + 1) / 2;
              alpha = flow * bRatio; break;
            }
            case 17: {
              const cx = 8, cy = 2.5;
              const dist = Math.hypot(x - cx, y - cy);
              const angle = Math.atan2(y - cy, x - cx);
              const petal = Math.cos(angle * 5) * 0.35;
              const ring = ((dist - ph * 0.04) % 5 + 5) % 5;
              const bloom = ring < 1.2 + petal ? (1 - ring / (1.2 + petal)) : 0;
              [r, g, b] = hsv((dist * 28 + ph * 1.8) % 360, 90, 100);
              alpha = bloom * bRatio; break;
            }
            default: r = baseR; g = baseG; b = baseB; break;
          }
        }

        if (press > 0 && curEffect !== 12 && curEffect !== 4) {
          r = Math.min(255, (r + (255 - r) * press * 0.6) | 0);
          g = Math.min(255, (g + (255 - g) * press * 0.6) | 0);
          b = Math.min(255, (b + (255 - b) * press * 0.6) | 0);
          alpha = Math.max(alpha, press * bRatio);
        }

        // Apply high-contrast realistic per-key underglow and keycap illumination
        if (alpha > 0.015) {
          const rc = r | 0, gc = g | 0, bc = b | 0;
          el.style.borderColor = `rgba(${rc},${gc},${bc},${Math.min(1, alpha * 1.4).toFixed(2)})`;
          el.style.backgroundColor = `rgba(${rc * 0.35 | 0},${gc * 0.35 | 0},${bc * 0.35 | 0},${(0.55 + alpha * 0.45).toFixed(2)})`;
          el.style.boxShadow = `
            0 0 ${(alpha * 14) | 0}px rgba(${rc},${gc},${bc},${(alpha * 0.75).toFixed(2)}),
            inset 0 1px 1px rgba(255,255,255,0.45),
            inset 0 -2px 4px rgba(0,0,0,0.6)
          `;
          el.style.color = '#ffffff';
          el.style.textShadow = `0 0 6px rgba(${rc},${gc},${bc},0.9)`;
        } else {
          el.style.borderColor = 'rgba(255,255,255,0.14)';
          el.style.backgroundColor = 'rgba(28, 31, 38, 0.96)';
          el.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -2px 4px rgba(0,0,0,0.7)';
          el.style.color = '#f8fafc';
          el.style.textShadow = 'none';
        }
      });

      // Animate AULA Logo RGB Light Bar
      if (lightBarRef.current) {
        let barHue = (ph * 1.5) % 360;
        let [br, bg, bb] = hsv(barHue, 90, 100);
        if (!curColorful && !freq) { br = baseR; bg = baseG; bb = baseB; }
        lightBarRef.current.style.background = `linear-gradient(90deg, rgb(${br},${bg},${bb}), rgb(${bb},${br},${bg}))`;
        lightBarRef.current.style.boxShadow = `0 0 10px rgb(${br},${bg},${bb})`;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioAnalyser, keys]);

  const handleKeyClick = (idx) => { pressRef.current[idx] = 1.0; };

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none">

      {/* Metallic Chassis Container */}
      <div
        className="kb-chassis w-full max-w-5xl overflow-hidden shadow-2xl relative"
        style={{
          aspectRatio: `${TOTAL_WIDTH_U} / ${TOTAL_HEIGHT_U}`,
          padding: '1.4%',
          borderRadius: 20,
          background: 'linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
          border: '2px solid rgba(255,255,255,0.85)',
          boxShadow: `
            0 25px 60px -15px rgba(0, 0, 0, 0.7),
            inset 0 2px 4px rgba(255,255,255,0.95),
            inset 0 -3px 6px rgba(0,0,0,0.3)
          `,
        }}
      >
        {/* Ambient chassis underglow overflow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0, borderRadius: 18 }}>
          <div style={{
            position: 'absolute', top: '-10%', left: '-5%', width: '110%', height: '120%',
            background: 'radial-gradient(ellipse at center, rgba(var(--accent-rgb),0.08) 0%, transparent 70%)',
          }} />
        </div>

        {/* Side Status Indicator Light Pill (Left Bezel next to Caps Lock) */}
        <div
          style={{
            position: 'absolute',
            left: '0.55%',
            top: '48%',
            width: '0.45%',
            height: '8%',
            borderRadius: 9999,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent), 0 0 14px var(--accent)',
            zIndex: 10,
          }}
          title="Status Indicator"
        />

        {/* Recessed Keyboard Plate Surface */}
        <div
          style={{
            position: 'relative', width: '100%', height: '100%',
            background: 'linear-gradient(180deg, #0b1120 0%, #050811 100%)',
            borderRadius: 14,
            border: '1.5px solid rgba(0,0,0,0.6)',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.5)',
            zIndex: 1,
          }}
        >
          {/* AULA Logo & RGB Light Bar (Right Plate above Arrow keys) */}
          <div
            style={{
              ...getKeyStyle(15.55, 3.55, 3.15, 0.55),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6%',
              padding: '0 2%',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 'clamp(8px, 0.9vw, 12px)',
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: '#e2e8f0',
                fontStyle: 'italic',
                textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(255,255,255,0.6)',
              }}
            >
              AULA
            </span>
            <div
              ref={lightBarRef}
              style={{
                flex: 1,
                height: '35%',
                borderRadius: 9999,
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)',
                transition: 'none',
              }}
            />
          </div>

          {/* 87 3D Mechanical Keycaps with crisp legible text */}
          {keys.map(([idx, leftU, topU, widthU, heightU, label, subLabel]) => {
            const isBlank = label === '';
            const hasDual = Boolean(subLabel);
            const isSpecial = label.length > 3;

            return (
              <button
                key={idx}
                ref={el => (keyRefs.current[idx] = el)}
                onClick={() => handleKeyClick(idx)}
                style={{
                  ...getKeyStyle(leftU, topU, widthU, heightU),
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(28, 31, 38, 0.96)',
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  userSelect: 'none',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -2px 4px rgba(0,0,0,0.7)',
                }}
                aria-label={label || `Key ${idx}`}
              >
                {!isBlank && (
                  hasDual ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        pointerEvents: 'none',
                        width: '100%',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'clamp(7px, 0.72vw, 10px)',
                          fontWeight: 800,
                          fontFamily: "'Space Grotesk', system-ui, sans-serif",
                          color: '#ffffff',
                          opacity: 0.95,
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 'clamp(8px, 0.85vw, 12px)',
                          fontWeight: 800,
                          fontFamily: "'Space Grotesk', system-ui, sans-serif",
                          color: '#ffffff',
                        }}
                      >
                        {subLabel}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: isSpecial ? 'clamp(6px, 0.65vw, 9.5px)' : 'clamp(8px, 0.95vw, 13px)',
                        fontWeight: 800,
                        fontFamily: "'Space Grotesk', system-ui, sans-serif",
                        lineHeight: 1,
                        textAlign: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        letterSpacing: isSpecial ? '-0.02em' : '0.02em',
                        color: '#ffffff',
                      }}
                    >
                      {label}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer info bar */}
      <div
        style={{
          width: '100%', maxWidth: '62rem',
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.72rem', fontFamily: 'monospace',
          color: 'var(--text3)', padding: '0 0.5rem'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
            animation: 'pulseDot 2s ease-in-out infinite',
            display: 'inline-block'
          }} />
          {profile.name} — REALTIME INTERACTIVE PREVIEW
        </span>
        <span>87 PHYSICAL KEYS · REALTIME RGB LIGHT BAR</span>
        <span>Click any keycap to flash</span>
      </div>
    </div>
  );
}
