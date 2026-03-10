import { useState } from 'react'
import Calculator from './components/Calculator'
import Sidebar from './components/Sidebar'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F0F2F7 0%, #E8EBF2 25%, #F2F4F8 50%, #EBEDF4 75%, #F0F2F7 100%)",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        position: "fixed", inset: 0, opacity: 0.02, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />

      <div style={{
        display: "flex",
        gap: 20,
        maxWidth: 1800,
        margin: "0 auto",
        padding: "24px",
        position: "relative",
      }}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

        <div style={{ flex: 1, minWidth: 0, transition: "margin 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
          <header style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A1628", letterSpacing: "-0.02em", margin: 0 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "#7B8BA3", marginBottom: 4 }}>
                Mutual Fund Calculator
              </span>
              MTF 2O
            </h1>
            <p style={{ marginTop: 8, color: "#5A6A80", fontSize: 14, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              Enter your initial investment, future contributions, time horizon and projected annual return.
            </p>
          </header>
          <Calculator />
        </div>
      </div>
    </div>
  )
}

export default App
