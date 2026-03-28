import { useState } from 'react'
import TradingDashboard from './components/TradingDashboard'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
      <div style={{
        opacity:    loaded ? 1 : 0,
        transform:  loaded ? 'scale(1)' : 'scale(1.06)',
        transition: loaded
          ? 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'none',
      }}>
        <TradingDashboard />
      </div>
    </>
  )
}

export default App
