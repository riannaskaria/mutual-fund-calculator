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
        background: T.panelBg, borderLeft: `1px solid ${T.border}`,
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
            <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px' }}>
              <div style={{ fontSize: 11, color: T.textSub, marginBottom: 12 }}>Color Theme</div>
              <div style={{ display: 'flex', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3, position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 3, bottom: 3,
                  left: theme === 'dark' ? 3 : 'calc(50% + 1.5px)',
                  width: 'calc(50% - 4.5px)',
                  background: T.panelBg, borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: 'none',
                }} />
                {[{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }].map(opt => (
                  <button key={opt.id} onClick={() => setTheme(opt.id)} style={{
                    flex: 1, background: 'none', border: 'none', borderRadius: 6,
                    padding: '7px 0', cursor: 'pointer', position: 'relative', zIndex: 1,
                    fontSize: 12, fontWeight: theme === opt.id ? 600 : 400,
                    color: theme === opt.id ? T.text : T.textMute,
                    transition: 'color 0.2s',
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}