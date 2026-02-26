import Calculator from './components/Calculator'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 font-sans">
      <header className="py-12 px-4 text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Mutual fund calculator
        </h1>
        <p className="mt-2 text-slate-600 max-w-md mx-auto">
          Enter your initial investment, future contributions, time horizon and projected annual return.
        </p>
        <hr className="mt-6 border-slate-200 max-w-2xl mx-auto" />
      </header>

      <main className="px-4 pb-16">
        <Calculator />
      </main>
    </div>
  )
}

export default App
