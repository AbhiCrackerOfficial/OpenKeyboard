import React, { useEffect, useRef } from 'react';
import { hsv } from '../utils/colorUtils';
import { DEFAULT_KEYBOARD_PROFILE } from '../config/keyboards';
import { renderAudioFrame, renderEffectFrame } from '../utils/renderEngine';

// Dynamic keycaps rendering utility based on keyboard layout profile dimensions

const CODE_TO_IDX = {
  Escape: 0, F1: 12, F2: 18, F3: 24, F4: 30, F5: 36, F6: 42, F7: 48, F8: 54, F9: 60, F10: 66, F11: 72, F12: 78, PrintScreen: 84, ScrollLock: 90, Pause: 96,
  Backquote: 1, Digit1: 7, Digit2: 13, Digit3: 19, Digit4: 25, Digit5: 31, Digit6: 37, Digit7: 43, Digit8: 49, Digit9: 55, Digit0: 61, Minus: 67, Equal: 73, Backspace: 79, Insert: 85, Home: 91, PageUp: 97,
  Tab: 2, KeyQ: 8, KeyW: 14, KeyE: 20, KeyR: 26, KeyT: 32, KeyY: 38, KeyU: 44, KeyI: 50, KeyO: 56, KeyP: 62, BracketLeft: 68, BracketRight: 74, Backslash: 80, Delete: 86, End: 92, PageDown: 98,
  CapsLock: 3, KeyA: 9, KeyS: 15, KeyD: 21, KeyF: 27, KeyG: 33, KeyH: 39, KeyJ: 45, KeyK: 51, KeyL: 57, Semicolon: 63, Quote: 69, Enter: 81,
  ShiftLeft: 4, KeyZ: 10, KeyX: 16, KeyC: 22, KeyV: 28, KeyB: 34, KeyN: 40, KeyM: 46, Comma: 52, Period: 58, Slash: 64, ShiftRight: 82, ArrowUp: 94,
  ControlLeft: 5, MetaLeft: 11, AltLeft: 17, Space: 35, AltRight: 53, ControlRight: 83, ArrowLeft: 89, ArrowDown: 95, ArrowRight: 101,
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
  audioColorful,
  perKeyEditing = false,
  perKeyColors = {},
  onKeyPaint = null,
}) {
  const keyRefs = useRef({});
  const lightBarRef = useRef(null);
  const pressRef = useRef({});
  const phaseRef = useRef(0);
  const rafRef = useRef(null);
  const freqBuf = useRef(null);

  const keys = profile.keys || DEFAULT_KEYBOARD_PROFILE.keys;

  // Calculate dynamic dimensions of the keyboard layout
  const maxW = keys.length > 0 ? Math.max(...keys.map(k => k[1] + k[3])) : 18.25;
  const maxH = keys.length > 0 ? Math.max(...keys.map(k => k[2] + k[4])) : 6.25;
  const totalW = maxW + 0.3;
  const totalH = maxH + 0.3;

  const getKeyStyle = (leftU, topU, widthU, heightU) => {
    const marginX = 0.2;
    const marginY = 0.2;
    return {
      position: 'absolute',
      left: `${((leftU + marginX) / totalW) * 100}%`,
      top: `${((topU + marginY) / totalH) * 100}%`,
      width: `${(widthU / totalW) * 100}%`,
      height: `${(heightU / totalH) * 100}%`,
    };
  };

  const audioModeRef = useRef(audioMode);
  const audioGainRef = useRef(audioGain);
  const audioColorfulRef = useRef(audioColorful);
  const rgbRef = useRef(rgb);
  const activeEffectRef = useRef(activeEffect);
  const speedRef = useRef(speed);
  const brightnessRef = useRef(brightness);
  const colorfulRef = useRef(colorful);
  const perKeyEditingRef = useRef(perKeyEditing);
  const perKeyColorsRef = useRef(perKeyColors);

  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { audioGainRef.current = audioGain; }, [audioGain]);
  useEffect(() => { audioColorfulRef.current = audioColorful; }, [audioColorful]);
  useEffect(() => { rgbRef.current = rgb; }, [rgb]);
  useEffect(() => { activeEffectRef.current = activeEffect; }, [activeEffect]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { brightnessRef.current = brightness; }, [brightness]);
  useEffect(() => { colorfulRef.current = colorful; }, [colorful]);
  useEffect(() => { perKeyEditingRef.current = perKeyEditing; }, [perKeyEditing]);
  useEffect(() => { perKeyColorsRef.current = perKeyColors || {}; }, [perKeyColors]);

  useEffect(() => {
    const onDown = (e) => {
      const idx = CODE_TO_IDX[e.code];
      if (idx !== undefined) pressRef.current[idx] = 1;
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
      const rate = speedRates[speedRef.current] ?? 1;
      phaseRef.current += rate * dtSec * 55;
      const phase = phaseRef.current;

      for (const idx of Object.keys(pressRef.current)) {
        pressRef.current[idx] = Math.max(0, pressRef.current[idx] - dtSec * 2.5);
      }

      let colors;
      if (perKeyEditingRef.current) {
        colors = new Map();
        for (const [idx] of keys) {
          const c = perKeyColorsRef.current?.[idx] || perKeyColorsRef.current?.[String(idx)] || [0, 0, 0];
          colors.set(idx, c);
        }
      } else if (audioAnalyser) {
        if (!freqBuf.current || freqBuf.current.length !== audioAnalyser.frequencyBinCount) {
          freqBuf.current = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        audioAnalyser.getByteFrequencyData(freqBuf.current);
        colors = renderAudioFrame(profile, freqBuf.current, {
          mode: audioModeRef.current,
          gain: audioGainRef.current,
          colorful: audioColorfulRef.current,
          rgb: rgbRef.current,
          phase: phase * 0.02,
        });
      } else {
        colors = renderEffectFrame(profile, {
          effectId: activeEffectRef.current,
          rgb: rgbRef.current,
          colorful: colorfulRef.current,
          brightness: brightnessRef.current,
          phase,
          pressMap: pressRef.current,
        });
      }

      for (const [idx] of keys) {
        const el = keyRefs.current[idx];
        if (!el) continue;
        let [r, g, b] = colors.get(idx) || [0, 0, 0];

        // Overlay click/press state to flash the keycap
        const pressVal = pressRef.current[idx] || 0;
        if (pressVal > 0.01) {
          const [actR, actG, actB] = rgbRef.current || [255, 0, 0];
          r = Math.min(255, r + actR * pressVal * 1.6);
          g = Math.min(255, g + actG * pressVal * 1.6);
          b = Math.min(255, b + actB * pressVal * 1.6);
        }

        const peak = Math.max(r, g, b) / 255;
        const lit = peak > 0.012;

        if (lit) {
          const glow = Math.max(0.08, peak);
          el.style.borderColor = `rgba(${r},${g},${b},${Math.min(1, glow * 1.35)})`;
          el.style.backgroundColor = `rgba(${Math.round(r * 0.34)},${Math.round(g * 0.34)},${Math.round(b * 0.34)},${0.56 + glow * 0.4})`;
          el.style.boxShadow = `0 0 ${Math.round(glow * 14)}px rgba(${r},${g},${b},${glow * 0.72}), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.6)`;
          el.style.color = '#fff';
          el.style.textShadow = `0 0 6px rgba(${r},${g},${b},0.9)`;
        } else {
          el.style.borderColor = 'rgba(255,255,255,0.14)';
          el.style.backgroundColor = 'rgba(28,31,38,0.96)';
          el.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -2px 4px rgba(0,0,0,0.7)';
          el.style.color = '#f8fafc';
          el.style.textShadow = 'none';
        }
      }

      if (lightBarRef.current) {
        let [br, bg, bb] = rgbRef.current;
        if (perKeyEditingRef.current) {
          const vals = Object.values(perKeyColorsRef.current || {}).filter(Array.isArray);
          if (vals.length) {
            [br, bg, bb] = vals[0];
          } else {
            [br, bg, bb] = [75, 85, 99];
          }
        } else if (audioAnalyser || colorfulRef.current || [3, 15, 16, 17].includes(activeEffectRef.current)) {
          [br, bg, bb] = hsv((phase * 1.5) % 360, 90, 100);
        }
        lightBarRef.current.style.background = `linear-gradient(90deg, rgb(${br},${bg},${bb}), rgb(${bb},${br},${bg}))`;
        lightBarRef.current.style.boxShadow = `0 0 10px rgb(${br},${bg},${bb})`;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioAnalyser, keys, profile]);

  const handleKeyClick = idx => {
    if (perKeyEditing && onKeyPaint) {
      onKeyPaint(idx);
      return;
    }
    pressRef.current[idx] = 1;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none">

      {/* Metallic Chassis Container */}
      <div
        className="kb-chassis w-full max-w-5xl overflow-hidden shadow-2xl relative"
        style={{
          aspectRatio: `${totalW} / ${totalH}`,
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
          {profile.brand === 'AULA' && (
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
          )}

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
                  cursor: perKeyEditing ? 'crosshair' : 'pointer',
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
          {profile.name} — {perKeyEditing ? 'PER-KEY PAINT EDITOR' : 'REALTIME INTERACTIVE PREVIEW'}
        </span>
        <span>87 PHYSICAL KEYS · REALTIME RGB LIGHT BAR</span>
        <span>{perKeyEditing ? 'Click a keycap to paint it' : 'Click any keycap to flash'}</span>
      </div>
    </div>
  );
}
