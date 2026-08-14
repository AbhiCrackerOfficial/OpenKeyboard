import React, { useState, useRef, useEffect } from 'react';
import { Palette, X, Sparkles } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import { rgbToHex, hexToRgb } from '../utils/colorUtils';

const PRESET_COLORS = [
  { name: 'Red',     hex: '#FF0000', rgb: [255, 0, 0] },
  { name: 'Green',   hex: '#00FF00', rgb: [0, 255, 0] },
  { name: 'Blue',    hex: '#0000FF', rgb: [0, 0, 255] },
  { name: 'Cyan',    hex: '#00FFFF', rgb: [0, 255, 255] },
  { name: 'Magenta', hex: '#FF00FF', rgb: [255, 0, 255] },
  { name: 'Yellow',  hex: '#FFFF00', rgb: [255, 255, 0] },
  { name: 'Orange',  hex: '#FF8000', rgb: [255, 128, 0] },
  { name: 'Purple',  hex: '#8000FF', rgb: [128, 0, 255] },
  { name: 'White',   hex: '#FFFFFF', rgb: [255, 255, 255] },
];

export default function FloatingColorBubble({
  rgb,
  hexColor,
  colorful,
  onColorChange,
  onToggleColorful,
  onApplyPalette,
  connected,
  liveApply = true,
  disabled = false,
  colorfulDisabled = false,
  styleMode = 'glass'
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [hexDraft, setHexDraft] = useState(hexColor || rgbToHex(rgb));
  const cardRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const [r, g, b] = rgb;
  const currentHex = hexColor || rgbToHex(rgb);
  // The official AULA UI displays its hex text in BGR order. Keep our editor
  // standards-correct (#RRGGBB) but show the OEM text as a reference.
  const aulaDisplayHex = '#' + [b, g, r]
    .map(v => Number(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  useEffect(() => {
    setHexDraft(currentHex);
  }, [currentHex]);

  const handleSliderChange = (channelIdx, val) => {
    const next = [...rgb];
    next[channelIdx] = Number(val);
    onColorChange(next, rgbToHex(next));
  };

  const handleColorPicker = (e) => {
    const val = e.target.value.toUpperCase();
    onColorChange(hexToRgb(val), val);
  };

  const handleHexInput = (e) => {
    const val = e.target.value.toUpperCase();
    setHexDraft(val);
    const m = /^#?([0-9A-F]{6})$/.exec(val.trim());
    if (m) onColorChange(hexToRgb(val), '#' + m[1]);
  };

  const commitHexInput = () => {
    const m = /^#?([0-9A-F]{6})$/.exec(hexDraft.trim());
    if (!m) {
      setHexDraft(currentHex);
      return;
    }
    const normalized = '#' + m[1];
    setHexDraft(normalized);
    onColorChange(hexToRgb(normalized), normalized);
  };

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.75rem',
      }}
    >
      {/* Expanded Floating Color Control Panel */}
      {isOpen && (
        <div
          className="panel shadow-2xl animate-fade-in"
          style={{
            width: '320px',
            padding: '1.25rem',
            background: 'var(--surface2)',
            border: '2px solid var(--border)',
            borderRadius: styleMode === 'neo' ? 0 : 16,
            boxShadow: styleMode === 'neo'
              ? '6px 6px 0 var(--border), 0 10px 30px rgba(0,0,0,0.5)'
              : '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={18} style={{ color: `rgb(${r},${g},${b})` }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Color & Spectrum
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Colorful / Rainbow Spectrum Toggle (Requirement #3) */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(var(--accent-rgb),0.08)',
              border: '1px solid var(--border-alt)',
              borderRadius: styleMode === 'neo' ? 0 : 8,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <ToggleSwitch
              checked={colorful}
              onChange={onToggleColorful}
              disabled={colorfulDisabled}
              label="Colorful Spectrum Mode"
              subLabel="Cycles rainbow hue spectrum"
              color="var(--accent)"
            />
          </div>

          {/* Color preview + hex + picker */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                flexShrink: 0,
                borderRadius: styleMode === 'neo' ? 0 : 10,
                border: '2px solid var(--border)',
                background: `rgb(${r},${g},${b})`,
                boxShadow: `0 0 16px rgba(${r},${g},${b},0.6)`,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <input
                type="color"
                value={currentHex.startsWith('#') ? currentHex.toLowerCase() : '#ff0000'}
                onChange={handleColorPicker}
                disabled={disabled}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '200%',
                  height: '200%',
                  transform: 'translate(-25%,-25%)',
                  cursor: 'pointer',
                  opacity: 0.01,
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700 }}>
                Custom Hex
              </label>
              <input
                className="app-input"
                type="text"
                maxLength={7}
                value={hexDraft}
                onChange={handleHexInput}
                onBlur={commitHexInput}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                disabled={disabled}
                style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
              />
            </div>
          </div>

          <div style={{
            marginTop: '-0.45rem',
            marginBottom: '0.85rem',
            fontSize: '0.66rem',
            color: 'var(--text3)',
            fontFamily: 'monospace',
            lineHeight: 1.4,
          }}>
            RGB hex: <strong style={{ color: 'var(--text2)' }}>{currentHex}</strong>
            {' · '}AULA OEM display: <strong style={{ color: 'var(--text2)' }}>{aulaDisplayHex}</strong>
          </div>

          {/* RGB Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
            {[
              ['R', '#ef4444', 0],
              ['G', '#22c55e', 1],
              ['B', '#3b82f6', 2],
            ].map(([ch, col, i]) => (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 14, fontWeight: 800, color: col, fontFamily: 'monospace', fontSize: '0.8rem', textAlign: 'center' }}>
                  {ch}
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb[i]}
                  onChange={(e) => handleSliderChange(i, e.target.value)}
                  disabled={disabled}
                  style={{ flex: 1, accentColor: col }}
                />
                <span style={{ width: 26, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text2)' }}>
                  {rgb[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Preset Color Chips */}
          <div style={{ marginBottom: liveApply ? '0.25rem' : '1rem' }}>
            <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
              Quick Presets
            </label>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => onColorChange(p.rgb, p.hex)}
                  disabled={disabled}
                  title={p.name}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: styleMode === 'neo' ? 0 : 6,
                    background: p.hex,
                    border: r === p.rgb[0] && g === p.rgb[1] && b === p.rgb[2]
                      ? '2px solid #ffffff'
                      : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: r === p.rgb[0] && g === p.rgb[1] && b === p.rgb[2]
                      ? `0 0 10px ${p.hex}`
                      : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Hide apply button when liveApply is active (Requirement #4) */}
          {!liveApply && (
            <button
              className="btn btn-primary"
              disabled={!connected || disabled}
              onClick={onApplyPalette}
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: '0.5rem',
              }}
            >
              <Sparkles size={14} />
              Apply Palette to Keyboard
            </button>
          )}
        </div>
      )}

      {/* Floating Color Trigger Bubble */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: 56,
          height: 56,
          borderRadius: styleMode === 'neo' ? 0 : '50%',
          background: `rgb(${r},${g},${b})`,
          border: styleMode === 'neo' ? '3px solid #000000' : '3px solid rgba(255,255,255,0.85)',
          boxShadow: styleMode === 'neo'
            ? '4px 4px 0 #000000, 0 0 20px rgba(var(--accent-rgb),0.5)'
            : `0 8px 25px rgba(0,0,0,0.5), 0 0 20px rgba(${r},${g},${b},0.75)`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: (r * 0.299 + g * 0.587 + b * 0.114) > 180 ? '#000000' : '#ffffff',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Open Color & Spectrum Controller"
      >
        <Palette size={26} />
      </button>
    </div>
  );
}
