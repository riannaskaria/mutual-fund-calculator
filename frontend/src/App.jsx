import Calculator from './components/Calculator'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 font-sans">
      <header className="py-12 px-4 text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Mutual Fund Calculator
        </h1>
        <p className="mt-2 text-slate-600 max-w-md mx-auto">
          Estimate potential returns on your mutual fund investment
        </p>
      </header>

      <main className="px-4 pb-16">
        <Calculator />
      </main>
    </div>
  )
}

export default App
