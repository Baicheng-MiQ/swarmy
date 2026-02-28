import { useEffect, useState } from 'react'
import './App.css'

const BASE_URL = '/api'

interface Model {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt?: string
    completion?: string
  }
  context_length?: number
  architecture?: {
    input_modalities?: string[]
    output_modalities?: string[]
  }
  top_provider?: {
    max_completion_tokens?: number
  }
}

function App() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [])

  async function fetchModels() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/models/structured`)
      if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`)
      const data = await res.json()
      setModels(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <h1 className="header-label">Swarm</h1>
        <div className="header-title">AI Democracy</div>
        <p className="header-subtitle">
          Spawn a swarm of agents, send the same prompt, and see if consensus emerges.
        </p>
      </header>

      {/* Models section */}
      <section className="section">
        <div className="section-label">Available Models — Structured Output</div>

        {loading && (
          <div className="skeleton-group">
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
            <div className="skeleton" style={{ height: 32, width: '100%' }} />
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 32, width: '100%' }} />
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
          </div>
        )}

        {error && (
          <div className="error-block">
            <span className="badge badge-error">Error</span>
            <span className="error-text">{error}</span>
            <button className="btn btn-secondary btn-sm" onClick={fetchModels}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="model-count">
              <span className="stat-value-sm">{models.length}</span>
              <span className="stat-label">models available</span>
            </div>
            <div className="card-tight">
              <table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Context</th>
                    <th>Prompt $/M</th>
                    <th>Completion $/M</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="model-name">{m.name}</div>
                        <div className="model-id">{m.id}</div>
                      </td>
                      <td>{m.context_length ? m.context_length.toLocaleString() : '—'}</td>
                      <td>{m.pricing?.prompt ? `$${(parseFloat(m.pricing.prompt) * 1_000_000).toFixed(2)}` : '—'}</td>
                      <td>{m.pricing?.completion ? `$${(parseFloat(m.pricing.completion) * 1_000_000).toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default App
