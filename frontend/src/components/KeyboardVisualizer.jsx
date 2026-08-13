import React, { useEffect, useRef } from 'react';
import { hsv, KEY_LAYOUT, SNAKE_PATH } from '../utils/effects';

// ─── Physical key label map ────────────────────────────────────────────────
const KEY_LABELS = {
  "0,0":"Esc","1,0":"F1","2,0":"F2","3,0":"F3","4,0":"F4","5,0":"F5","6,0":"F6","7,0":"F7","8,0":"F8","9,0":"F9","10,0":"F10","11,0":"F11","12,0":"F12","13,0":"PrtSc","14,0":"ScrLk","15,0":"Pause",
  "0,1":"~`","1,1":"1","2,1":"2","3,1":"3","4,1":"4","5,1":"5","6,1":"6","7,1":"7","8,1":"8","9,1":"9","10,1":"0","11,1":"—","12,1":"=","13,1":"←BS","14,1":"Ins","15,1":"Home","16,1":"PgUp",
  "0,2":"Tab","1,2":"Q","2,2":"W","3,2":"E","4,2":"R","5,2":"T","6,2":"Y","7,2":"U","8,2":"I","9,2":"O","10,2":"P","11,2":"[","12,2":"]","13,2":"\\","14,2":"Del","15,2":"End","16,2":"PgDn",
  "0,3":"Caps","1,3":"A","2,3":"S","3,3":"D","4,3":"F","5,3":"G","6,3":"H","7,3":"J","8,3":"K","9,3":"L","10,3":";","11,3":"'","13,3":"Enter",
  "0,4":"⇧ Shift","1,4":"Z","2,4":"X","3,4":"C","4,4":"V","5,4":"B","6,4":"N","7,4":"M","8,4":",","9,4":".","10,4":"/","13,4":"Shift ⇧","15,4":"↑",
  "0,5":"Ctrl","1,5":"⊞","2,5":"Alt","5,5":"Space","9,5":"Alt","10,5":"Fn","11,5":"Ctrl","13,5":"←","14,5":"↓","15,5":"→","16,5":"▌",
};

// Physical key layout geometry helper
// Returns {left, width, top, height} as percentages in a 18.25u × 6.5u grid
function getKeyStyle(x, y) {
  // Stagger offsets and widths per row
  const ROW_OFFSET = [0, 0, 0.5, 0.75, 1.25, 0];
  const WIDE_KEYS  = {
    "13,1": 2,    // Backspace
    "0,2":  1.5,  // Tab
    "13,2": 1.5,  // Backslash
    "0,3":  1.75, // Caps
    "13,3": 2.25, // Enter
    "0,4":  2.25, // Left Shift
    "13,4": 2.75, // Right Shift
    "0,5":  1.25, // Left Ctrl
    "1,5":  1.25, // Win
    "2,5":  1.25, // Left Alt
    "5,5":  6.25, // Space
    "9,5":  1.25, // Right Alt
    "10,5": 1.25, // Fn
    "11,5": 1.25, // Right Ctrl
  };

  const rowBase = ROW_OFFSET[y] || 0;
  const w = WIDE_KEYS[`${x},${y}`] || 1;
  let left = rowBase + x;

  // Manual corrections for special positions
  if (y === 0) {
    if (x === 0) left = 0;
    else if (x === 1) left = 2;
    else if (x <= 4) left = x + 1;
    else if (x <= 8) left = x + 1.5;
    else if (x <= 12) left = x + 2;
    else left = x + 2.75;
  } else if (y === 2 && x >= 14) {
    left = 16.75 + (x - 14);
  } else if (y === 3 && x >= 12) {
    if (x === 13) left = 15.5;
  } else if (y === 4) {
    if (x >= 11) {
      if (x === 13) left = 14.5;
      else if (x === 15) left = 17.25;
    }
  } else if (y === 5) {
    if      (x === 5)  left = 3.75;
    else if (x === 9)  left = 10;
    else if (x === 10) left = 11.25;
    else if (x === 11) left = 12.5;
    else if (x === 13) left = 15.25;
    else if (x === 14) left = 16.25;
    else if (x === 15) left = 17.25;
    else if (x === 16) { left = 18.1; }
  }

  const COLS = 18.25;
  const ROWS = 6.5;
  const topY  = y === 0 ? 0 : (y + 0.3);

  return {
    position: 'absolute',
    left:   `${(left / COLS) * 100}%`,
    width:  `${(w    / COLS) * 100}%`,
    top:    `${(topY / ROWS) * 100}%`,
    height: `${(0.92 / ROWS) * 100}%`,
  };
}

// Map browser key code → [gridX, gridY]
const CODE_TO_XY = {
  Escape:[0,0],F1:[1,0],F2:[2,0],F3:[3,0],F4:[4,0],F5:[5,0],F6:[6,0],F7:[7,0],F8:[8,0],F9:[9,0],F10:[10,0],F11:[11,0],F12:[12,0],
  Backquote:[0,1],Digit1:[1,1],Digit2:[2,1],Digit3:[3,1],Digit4:[4,1],Digit5:[5,1],Digit6:[6,1],Digit7:[7,1],Digit8:[8,1],Digit9:[9,1],Digit0:[10,1],Minus:[11,1],Equal:[12,1],Backspace:[13,1],Insert:[14,1],Home:[15,1],PageUp:[16,1],
  Tab:[0,2],KeyQ:[1,2],KeyW:[2,2],KeyE:[3,2],KeyR:[4,2],KeyT:[5,2],KeyY:[6,2],KeyU:[7,2],KeyI:[8,2],KeyO:[9,2],KeyP:[10,2],BracketLeft:[11,2],BracketRight:[12,2],Backslash:[13,2],Delete:[14,2],End:[15,2],PageDown:[16,2],
  CapsLock:[0,3],KeyA:[1,3],KeyS:[2,3],KeyD:[3,3],KeyF:[4,3],KeyG:[5,3],KeyH:[6,3],KeyJ:[7,3],KeyK:[8,3],KeyL:[9,3],Semicolon:[10,3],Quote:[11,3],Enter:[13,3],
  ShiftLeft:[0,4],KeyZ:[1,4],KeyX:[2,4],KeyC:[3,4],KeyV:[4,4],KeyB:[5,4],KeyN:[6,4],KeyM:[7,4],Comma:[8,4],Period:[9,4],Slash:[10,4],ShiftRight:[13,4],ArrowUp:[15,4],
  ControlLeft:[0,5],MetaLeft:[1,5],AltLeft:[2,5],Space:[5,5],AltRight:[9,5],ControlRight:[11,5],ArrowLeft:[13,5],ArrowDown:[14,5],ArrowRight:[15,5],
};

// Pre-build a lookup map: idx → position-in-SNAKE_PATH
const IDX_TO_SNAKE_POS = new Map();
SNAKE_PATH.forEach((idx, pos) => IDX_TO_SNAKE_POS.set(idx, pos));

export default function KeyboardVisualizer({
  activeEffect, rgb, speed, brightness, colorful,
  audioAnalyser, audioMode, audioGain, audioColorful
}) {
  const keyRefs       = useRef({});
  const pressRef      = useRef({});   // idx → intensity [0–1]
  const phaseRef      = useRef(0);
  const rafRef        = useRef(null);
  const freqBuf       = useRef(null); // reused Uint8Array

  // ── Track physical keystrokes ──────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      const coord = CODE_TO_XY[e.code];
      if (!coord) return;
      const [cx, cy] = coord;
      const entry = KEY_LAYOUT.find(([, kx, ky]) => kx === cx && ky === cy);
      if (entry) pressRef.current[entry[0]] = 1.0;
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  // ── Main animation loop ────────────────────────────────────────────────
  useEffect(() => {
    const speedRates = [0.18, 0.45, 1.0, 2.0, 4.0];
    let lastT = performance.now();

    const loop = () => {
      const now    = performance.now();
      const dtSec  = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      const rate   = speedRates[speed] ?? 1.0;
      phaseRef.current += rate * dtSec * 55;

      const ph     = phaseRef.current;
      const bRatio = brightness / 4;
      const [baseR, baseG, baseB] = rgb;

      // Audio frequency data
      let freq = null;
      if (audioAnalyser) {
        if (!freqBuf.current || freqBuf.current.length !== audioAnalyser.frequencyBinCount) {
          freqBuf.current = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        audioAnalyser.getByteFrequencyData(freqBuf.current);
        freq = freqBuf.current;
      }

      let bass = 0, mid = 0, high = 0, level = 0;
      if (freq) {
        bass  = freq.slice(0,10).reduce((a,b)=>a+b,0)/10/255*audioGain;
        mid   = freq.slice(10,35).reduce((a,b)=>a+b,0)/25/255*audioGain;
        high  = freq.slice(35,64).reduce((a,b)=>a+b,0)/29/255*audioGain;
        level = Math.min(1, bass*0.5 + mid*0.35 + high*0.15);
      }

      KEY_LAYOUT.forEach(([idx, x, y]) => {
        const el = keyRefs.current[idx];
        if (!el) return;

        // Decay keystroke intensity at 2/s
        if (pressRef.current[idx] > 0) {
          pressRef.current[idx] = Math.max(0, pressRef.current[idx] - dtSec * 2.5);
        }
        const press = pressRef.current[idx] || 0;

        let r = 0, g = 0, b = 0, alpha = bRatio;

        // ── Audio visualizer mode ────────────────────────────────────────
        if (freq) {
          let v = 0, h = (x * 18 + ph * 1.6) % 360;
          switch (audioMode) {
            case "Audio dance – soft":
              v = Math.max(0, level - Math.abs(x-8)/14) * 1.3; break;
            case "Dazzling – rock":
              v = bass > 0.45 ? Math.min(1,bass*1.4) : mid*0.35;
              h = (ph*4 + x*25 + y*40) % 360; break;
            case "Clouds rise and snow fly":
              v = Math.max(0, high*1.4 - (5-y)/8) * (0.55 + 0.45*Math.sin(ph*0.08+x)); break;
            case "Light Field Change – voice":
              v = Math.min(1, mid*1.5) * (0.45 + 0.55*Math.sin(x*0.45+ph*0.05)**2); break;
            case "The gurgling stream":
              v = Math.max(0, level*0.9 + 0.35*Math.sin(x*0.55-y*0.7+ph*0.06));
              h = 185+x*4; break;
            case "Blooming – passion": {
              const d = Math.hypot(x-8, y-2.5);
              v = Math.max(0, level*1.6 - Math.abs(d-(ph*0.07)%9)*0.25);
              h = 330+d*7; break;
            }
            case "Pearl falling jade plate":
              v = (high>0.35 && ((x*7+y*13+Math.floor(ph*0.15))%17)<2) ? Math.min(1,high*1.5) : level*0.08;
              h = 160+high*100; break;
            case "Clouds follow the moon":
              v = 0.12 + level*0.45 + 0.16*Math.sin(x*0.25+ph*0.02);
              h = 205+20*Math.sin(ph*0.008); break;
            case "Mountains and Flowing Waters": {
              const bin = Math.min(freq.length-1, Math.floor((x/17)*freq.length));
              const ht  = (freq[bin]/255)*6*audioGain;
              v = (5-y) < ht ? Math.min(1, 0.25+freq[bin]/255*audioGain) : 0;
              h = 120+x*7; break;
            }
            case "Raining like silk – regular":
              v = Math.max(0, level*0.35 + 0.7*Math.sin(y*1.2 - ph*0.1 + (x%5)*1.5));
              v *= high*0.7 + mid*0.5; h = 190+x*3; break;
            default: v = level;
          }
          v     = Math.max(0, Math.min(1, v));
          alpha = v * bRatio;
          if (audioColorful) [r,g,b] = hsv(h, 90, v*100);
          else               [r,g,b] = [baseR*v|0, baseG*v|0, baseB*v|0];

        } else {
          // ── Static effect animations ─────────────────────────────────────
          switch (activeEffect) {

            case 0: // OFF
              alpha = 0; break;

            case 1: // Fixed On – solid colour
              r=baseR; g=baseG; b=baseB; break;

            case 2: { // Respire – whole-keyboard breathing
              const breath = (Math.sin(ph * 0.07) + 1) / 2;
              if (colorful) [r,g,b] = hsv((idx*3 + ph*0.25)%360, 90, 100);
              else           { r=baseR; g=baseG; b=baseB; }
              alpha = breath * bRatio; break;
            }

            case 3: { // Rainbow – column-based hue scroll
              [r,g,b] = hsv(((x*20) - ph + 360)%360, 90, 100);
              alpha   = bRatio; break;
            }

            case 4: { // Flash Away – full-board flash on keypress, dim ambient
              if (press > 0) {
                if (colorful) [r,g,b] = hsv((idx*17)%360, 90, 100);
                else           { r=baseR; g=baseG; b=baseB; }
                alpha = press * bRatio;
              } else {
                // Dim ambient that flickers randomly
                const flicker = Math.max(0, Math.sin(idx*7.3 + ph*0.25));
                alpha = flicker * 0.08 * bRatio;
              }
              break;
            }

            case 5: { // Raindrops – independent per-key twinkling
              const t    = ph * 0.06;
              const drop = Math.sin(idx * 1.618 * 7 + t) * Math.cos(idx * Math.PI + t * 0.7);
              const v    = Math.max(0, drop) ** 2;
              if (colorful) [r,g,b] = hsv((idx*41 + ph*0.5)%360, 90, 100);
              else           { r=baseR; g=baseG; b=baseB; }
              alpha = v * bRatio; break;
            }

            case 7: { // Ripples Shining – expanding concentric rings from center
              const cx=8, cy=2.5;
              const dist = Math.hypot(x-cx, y-cy);
              const maxD = 10;
              let maxV = 0;
              for (let i=0; i<3; i++) {
                const rp   = (ph * 0.06 + i*(maxD/3)) % maxD;
                const diff = Math.abs(dist - rp);
                maxV = Math.max(maxV, Math.max(0, 1 - diff * 2.5));
              }
              if (colorful) [r,g,b] = hsv((dist*30 + ph*2)%360, 90, 100);
              else           { r=baseR; g=baseG; b=baseB; }
              alpha = maxV * bRatio; break;
            }

            case 8: { // Stars Twinkle – each key twinkles independently
              const t  = ph * 0.07;
              const n  = Math.sin(idx*1.618*7 + t*1.1) *
                         Math.cos(idx*2.718*5 - t*0.8) *
                         Math.sin(t*0.5 + idx*0.35);
              const v  = Math.pow(Math.max(0, n), 3);
              if (colorful) [r,g,b] = hsv((idx*37 + ph*0.6)%360, 90, 100);
              else           { r=baseR; g=baseG; b=baseB; }
              alpha = v * bRatio; break;
            }

            case 10: { // Retro Snake – serpentine path, fading tail
              const BODY_LEN = 14;
              const snakeHead = Math.floor(ph * 0.22) % SNAKE_PATH.length;
              const posInPath = IDX_TO_SNAKE_POS.get(idx);
              if (posInPath === undefined) { alpha=0; break; }
              // Circular distance back from head (head = 0, tail = BODY_LEN-1)
              const bodyDist  = (snakeHead - posInPath + SNAKE_PATH.length) % SNAKE_PATH.length;
              if (bodyDist < BODY_LEN) {
                const intensity = (1 - bodyDist / BODY_LEN) ** 1.5;
                if (colorful) [r,g,b] = hsv((snakeHead * 5 + bodyDist * 8) % 360, 90, 100);
                else           { r=baseR; g=baseG; b=baseB; }
                alpha = intensity * bRatio;
              } else {
                alpha = 0;
              }
              break;
            }

            case 11: { // Neon Stream – flowing wave left→right with colour
              const hue = (x*16 - ph*1.2 + 360) % 360;
              [r,g,b]   = hsv(hue, 90, 100);
              const v   = (Math.sin(x*0.5 + ph*0.1) + Math.sin(x*0.9 - ph*0.07 + y*0.3)) / 2;
              alpha     = ((v+1)/2) * bRatio; break;
            }

            case 12: { // Reaction – keys light up only on physical press
              if (press > 0) {
                if (colorful) [r,g,b] = hsv((idx*23)%360, 90, 100);
                else           { r=baseR; g=baseG; b=baseB; }
                alpha = press * bRatio;
              } else {
                alpha = 0;
              }
              break;
            }

            case 13: { // Sine Wave – horizontal wave rolling across
              const v = (Math.sin(x * 0.5 - ph * 0.1 + y * 0.2) + 1) / 2;
              if (colorful) [r,g,b] = hsv((x*18 - ph)%360, 90, 100);
              else           { r=baseR; g=baseG; b=baseB; }
              alpha = v * bRatio; break;
            }

            case 15: { // Rotating Windmill – radial sectors from center
              const cx=7.5, cy=2.5;
              const angle  = ((Math.atan2(y-cy, x-cx) * 180/Math.PI) + ph * 1.5 + 360) % 360;
              const sector = angle % (360/4);
              const inBlade = sector < 45; // 4 blades, 45° each
              const dist   = Math.min(1, Math.hypot(x-cx, y-cy)/8);
              [r,g,b] = hsv((angle + ph)%360, 90, 100);
              alpha   = (inBlade ? dist : 0.06) * bRatio; break;
            }

            case 16: { // Colorful Waterfall – top→bottom cascade
              const hue = (y*45 + x*12 - ph*0.9 + 360) % 360;
              [r,g,b]   = hsv(hue, 90, 100);
              const flow = (Math.sin(y*1.4 - ph*0.09 + x*0.3) + 1) / 2;
              alpha     = flow * bRatio; break;
            }

            case 17: { // Blossoming – expanding petal rings from center
              const cx=8, cy=2.5;
              const dist  = Math.hypot(x-cx, y-cy);
              const angle = Math.atan2(y-cy, x-cx);
              const petal = Math.cos(angle * 5) * 0.35;
              const ring  = ((dist - ph*0.04) % 5 + 5) % 5;
              const bloom = ring < 1.2 + petal ? (1 - ring/(1.2+petal)) : 0;
              [r,g,b] = hsv((dist*28 + ph*1.8)%360, 90, 100);
              alpha   = bloom * bRatio; break;
            }

            default:
              r=baseR; g=baseG; b=baseB; break;
          }
        }

        // Overlay physical key press flash on any effect except reaction
        if (press > 0 && activeEffect !== 12 && activeEffect !== 4) {
          r = Math.min(255, (r + (255 - r) * press * 0.6) | 0);
          g = Math.min(255, (g + (255 - g) * press * 0.6) | 0);
          b = Math.min(255, (b + (255 - b) * press * 0.6) | 0);
          alpha = Math.max(alpha, press * bRatio);
        }

        // Apply to DOM element directly (skip React re-render for 60fps)
        const led = el.querySelector('.led');
        if (alpha > 0.015) {
          const rc = r|0, gc = g|0, bc = b|0;
          el.style.borderColor     = `rgba(${rc},${gc},${bc},${Math.min(1,alpha*1.2).toFixed(2)})`;
          el.style.backgroundColor = `rgba(${rc},${gc},${bc},${(alpha*0.22).toFixed(2)})`;
          el.style.boxShadow       = `inset 0 0 6px rgba(${rc},${gc},${bc},${(alpha*0.3).toFixed(2)}), 0 0 ${(alpha*12)|0}px rgba(${rc},${gc},${bc},${(alpha*0.35).toFixed(2)})`;
          el.style.color           = '#ffffff';
          if (led) {
            led.style.backgroundColor = `rgb(${rc},${gc},${bc})`;
            led.style.boxShadow       = `0 0 ${(alpha*8)|0}px rgb(${rc},${gc},${bc})`;
          }
        } else {
          el.style.borderColor     = 'rgba(255,255,255,0.05)';
          el.style.backgroundColor = 'rgba(15,23,42,0.55)';
          el.style.boxShadow       = 'none';
          el.style.color           = 'rgba(148,163,184,0.5)';
          if (led) {
            led.style.backgroundColor = 'rgba(255,255,255,0.05)';
            led.style.boxShadow       = 'none';
          }
        }
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeEffect, rgb, speed, brightness, colorful, audioAnalyser, audioMode, audioGain, audioColorful]);

  // Click a key to simulate a keypress flash
  const handleKeyClick = (idx) => { pressRef.current[idx] = 1.0; };

  return (
    <div className="w-full flex flex-col items-center gap-3">

      {/* Keyboard chassis */}
      <div
        className="panel w-full max-w-5xl overflow-hidden select-none"
        style={{
          aspectRatio: '18.25 / 6.8',
          padding: '3%',
          position: 'relative',
        }}
      >
        {/* Ambient glows inside chassis */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
          <div style={{
            position:'absolute',top:'20%',left:'15%',
            width:'30%',height:'60%',borderRadius:'50%',
            background:'rgba(var(--accent-rgb),0.05)',filter:'blur(40px)'
          }}/>
          <div style={{
            position:'absolute',top:'30%',right:'10%',
            width:'25%',height:'50%',borderRadius:'50%',
            background:'rgba(168,85,247,0.04)',filter:'blur(40px)'
          }}/>
        </div>

        {/* Inner keyboard plate */}
        <div
          style={{
            position:'relative', width:'100%', height:'100%',
            background:'rgba(0,0,0,0.5)',
            borderRadius:4,border:'1px solid rgba(255,255,255,0.04)',
            zIndex:1
          }}
        >
          {KEY_LAYOUT.map(([idx, x, y]) => {
            const label = KEY_LABELS[`${x},${y}`] || '';
            const isSide = x === 16 && y === 5;
            const isWide = label.length > 4;

            return (
              <button
                key={idx}
                ref={el => (keyRefs.current[idx] = el)}
                onClick={() => handleKeyClick(idx)}
                style={{
                  ...getKeyStyle(x, y),
                  border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(15,23,42,0.55)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6% 4% 4%',
                  overflow: 'hidden',
                  transition: 'none',
                  outline: 'none',
                  color: 'rgba(148,163,184,0.5)',
                  userSelect: 'none',
                }}
                aria-label={label || `Key ${idx}`}
              >
                {/* LED dot at top of keycap */}
                <div
                  className="led"
                  style={{
                    width: '28%',height: '18%',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    flexShrink: 0,
                    transition: 'none',
                  }}
                />

                {/* Keycap legend */}
                {!isSide && (
                  <span
                    style={{
                      fontSize: isWide ? '30%' : '38%',
                      fontWeight: 600,
                      fontFamily: "'Space Grotesk', monospace",
                      lineHeight: 1,
                      textAlign: 'center',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status bar below keyboard */}
      <div
        style={{
          width:'100%',maxWidth:'62rem',
          display:'flex',justifyContent:'space-between',
          fontSize:'0.7rem',fontFamily:'monospace',
          color:'var(--text3)',padding:'0 0.5rem'
        }}
      >
        <span style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{
            width:7,height:7,borderRadius:'50%',
            background:'var(--accent)',
            boxShadow:'0 0 6px var(--accent)',
            animation:'pulseDot 2s ease-in-out infinite',
            display:'inline-block'
          }}/>
          AULA F87 TKL — REALTIME LED VISUALIZER
        </span>
        <span>87 KEY POSITIONS · {KEY_LAYOUT.length} LED ZONES</span>
        <span>Click any key to trigger flash</span>
      </div>
    </div>
  );
}
