import { useEffect, useState } from 'react'

const RING_SIZE   = 148
const RING_STROKE = 2.5
const RING_R      = (RING_SIZE - RING_STROKE) / 2
const CIRCUMF     = 2 * Math.PI * RING_R

export default function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [exiting,  setExiting]  = useState(false)

  useEffect(() => {
    const steps = [20, 45, 65, 85, 100]
    let i = 0
    const tick = () => {
      if (i >= steps.length) return
      setProgress(steps[i++])
      if (i < steps.length) {
        setTimeout(tick, 320)
      } else {
        setTimeout(() => {
          setExiting(true)
          setTimeout(() => onDone?.(), 700)
        }, 280)
      }
    }
    const t = setTimeout(tick, 180)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dashOffset = CIRCUMF * (1 - progress / 100)

  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0f1117',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28,
        userSelect: 'none',
        // zoom-in: whole screen scales up and fades — feels like flying into the logo
        opacity:    exiting ? 0 : 1,
        transform:  exiting ? 'scale(4)' : 'scale(1)',
        transition: exiting
          ? 'transform 0.65s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.55s ease'
          : 'none',
      }}
    >
      {/* Ring + logo */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE} height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke="rgba(115,153,198,0.12)" strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMF}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.32s ease' }}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#092C61" />
              <stop offset="55%"  stopColor="#186ade" />
              <stop offset="100%" stopColor="#7399C6" />
            </linearGradient>
          </defs>
        </svg>

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src="https://companieslogo.com/img/orig/GS.D-55ee2e2e.png?t=1740321324"
            alt="Goldman Sachs"
            style={{ width: 76, height: 76, objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Text */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontFamily: "'GS Sans', 'Helvetica Neue', Arial, sans-serif",
          fontSize: 19,
          fontWeight: 500,
          color: '#dce8f4',
          letterSpacing: '0.02em',
        }}>
          Mutual Fund Calculator
        </span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: '#7399C6',
              animation: `ld 1s ${i * 0.18}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ld {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
