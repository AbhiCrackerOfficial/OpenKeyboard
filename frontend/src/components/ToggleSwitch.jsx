import React from 'react';

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  subLabel,
  disabled = false,
  badge = null,
  color = 'var(--accent)'
}) {
  return (
    <label
      className={`toggle-switch-container ${disabled ? 'disabled' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
      }}
    >
      <div
        className="toggle-track"
        style={{
          position: 'relative',
          width: 38,
          height: 22,
          borderRadius: 9999,
          background: checked ? color : 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: checked ? `0 0 10px ${color}` : 'none',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          flexShrink: 0,
        }}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div
          className="toggle-thumb"
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>
            {label}
          </span>
          {badge && (
            <span
              style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 9999,
                background: 'rgba(var(--accent-rgb), 0.15)',
                color: 'var(--accent)',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subLabel && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>
            {subLabel}
          </span>
        )}
      </div>
    </label>
  );
}
