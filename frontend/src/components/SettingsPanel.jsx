import { useState, useEffect } from 'react';
import { useT, FONT_UI } from '../theme';
import { loadProfile } from './AccountPanel'; // shared localStorage key

export default function SettingsPanel({ open, onClose, theme, setTheme }) {
  const T = useT();
  const [profile, setProfile] = useState(loadProfile);
  // Reread profile from localStorage each time the panel opens
  useEffect(() => {
    if (open) setProfile(loadProfile());
  }, [open]);

  if (!open) return null;

  const initials = (() => {
    const name = profile.name;
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 300, zIndex: 100,
        background: T.glassPanel, borderLeft: `1px solid ${T.glassBorder || T.border}`,
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: T.glassShadow,
        display: 'flex', flexDirection: 'column', fontFamily: FONT_UI,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMute, fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Account */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Account</div>
            <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: T.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {profile.name || <span style={{ color: T.textMute, fontStyle: 'italic' }}>No name set</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMute }}>
                    {profile.email || <span style={{ fontStyle: 'italic' }}>No email set</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <div style={{ fontSize: 10, color: T.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Appearance</div>
            <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: 11, color: T.textSub, marginBottom: 12 }}>Color Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'light', label: '☀ Light', bg: '#F7F7FA', fg: '#0d1520' },
                  { id: 'dark',  label: '◑ Dark',  bg: '#1e1e1e', fg: '#f0f2f4' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setTheme(opt.id)} style={{
                    flex: 1,
                    background: theme === opt.id ? opt.bg : T.inputBg,
                    border: theme === opt.id ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: '10px 6px',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: theme === opt.id ? 700 : 400,
                    color: theme === opt.id ? opt.fg : T.textMute,
                    transition: 'all 0.18s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: opt.bg,
                      border: `2px solid ${theme === opt.id ? T.accent : T.border}`,
                      display: 'block',
                      boxShadow: theme === opt.id ? `0 0 0 3px ${T.accent}22` : 'none',
                    }} />
                    {opt.label.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}