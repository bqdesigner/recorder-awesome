import type { Stage } from './engine'
import './App.css'

const STAGES: { id: Stage; label: string }[] = [
  { id: 'record', label: 'Grava' },
  { id: 'edit', label: 'Edita' },
  { id: 'format', label: 'Formata' },
  { id: 'export', label: 'Output' },
]

function App() {
  return (
    <main className="app">
      <h1>screen-recorder</h1>
      <p className="subtitle">
        Grava tela, edita, põe em moldura e exporta GIF ou MP4.
      </p>
      <ol className="stages">
        {STAGES.map((s) => (
          <li key={s.id}>{s.label}</li>
        ))}
      </ol>
      <p className="status">Fase 0 — scaffold. Chrome/Edge.</p>
    </main>
  )
}

export default App
