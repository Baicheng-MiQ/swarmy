import { useEffect, useRef, useState } from 'react'
import './App.css'

const BASE_URL = '/api'
const POLL_INTERVAL_MS = 2000

interface Model {
  id: string
  name: string
  pricing?: { prompt?: string; completion?: string }
  context_length?: number
}

interface AgentSpec {
  model_name: string
  temperature: number | null
  persona: string
}

interface AgentResult {
  agent_id: string
  model_name: string
  temperature: number | null
  status: string
  response: string | null
  reasoning: string | null
  error: string | null
  input_token: number | null
  output_token: number | null
  cost: number | null
  persona: string | null
}

interface Job {
  job_id: string
  status: string
  agents: AgentResult[]
}

function statusColor(status: string): string {
  if (status === 'done') return 'var(--color-success)'
  if (status === 'error') return 'var(--color-error)'
  if (status === 'working') return 'var(--color-pending)'
  return 'var(--color-n-500)'
}

function badgeStyle(status: string): React.CSSProperties {
  const color = statusColor(status)
  return { color, background: `color-mix(in srgb, ${color} 12%, transparent)`, flexShrink: 0 }
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`
}

function App() {
  // ── Models ──────────────────────────────────────────────
  const [models, setModels] = useState<Model[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // ── Compose ──────────────────────────────────────────────
  const [prompt, setPrompt] = useState('')
  const [agents, setAgents] = useState<AgentSpec[]>([])

  // New-agent form state
  const [newModel, setNewModel] = useState('')
  const [newTemp, setNewTemp] = useState('')
  const [newPersona, setNewPersona] = useState('')

  // ── Job / results ────────────────────────────────────────
  const [job, setJob] = useState<Job | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load models on mount ──────────────────────────────────
  useEffect(() => {
    fetchModels()
  }, [])

  // ── Polling ──────────────────────────────────────────────
  const jobId = job?.job_id
  const jobStatus = job?.status
  useEffect(() => {
    if (jobId && jobStatus === 'working') {
      pollRef.current = setInterval(() => pollJob(jobId), POLL_INTERVAL_MS)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, jobStatus])

  async function fetchModels() {
    setModelsLoading(true)
    setModelsError(null)
    try {
      const res = await fetch(`${BASE_URL}/models/structured`)
      if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`)
      const data = await res.json()
      const list: Model[] = data.data ?? []
      setModels(list)
      if (list.length > 0) setNewModel(list[0].id)
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setModelsLoading(false)
    }
  }

  function addAgent() {
    if (!newModel) return
    setAgents((prev) => [
      ...prev,
      {
        model_name: newModel,
        temperature: newTemp !== '' && !isNaN(parseFloat(newTemp)) ? parseFloat(newTemp) : null,
        persona: newPersona,
      },
    ])
    setNewTemp('')
    setNewPersona('')
  }

  function removeAgent(idx: number) {
    setAgents((prev) => prev.filter((_, i) => i !== idx))
  }

  async function launchSwarm() {
    if (!prompt.trim()) { setLaunchError('Prompt is required.'); return }
    if (agents.length === 0) { setLaunchError('Add at least one agent.'); return }
    setLaunchError(null)
    setLaunching(true)
    try {
      // 1. Create job
      const createRes = await fetch(`${BASE_URL}/create_job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt.trim() }],
          agents: agents.map((a) => ({
            model_name: a.model_name,
            ...(a.temperature !== null ? { temperature: a.temperature } : {}),
            ...(a.persona ? { persona: a.persona } : {}),
          })),
        }),
      })
      if (!createRes.ok) {
        const detail = await createRes.json().catch(() => ({}))
        throw new Error(detail?.detail ?? `Create job failed (${createRes.status})`)
      }
      const created = await createRes.json()
      const jobId: string = created.job_id

      // 2. Start job
      const startRes = await fetch(`${BASE_URL}/start_job/${jobId}`, { method: 'POST' })
      if (!startRes.ok && startRes.status !== 202) {
        const detail = await startRes.json().catch(() => ({}))
        throw new Error(detail?.detail ?? `Start job failed (${startRes.status})`)
      }

      // 3. Fetch initial state & switch to results view
      const jobData = await fetch(`${BASE_URL}/job/${jobId}`).then((r) => r.json())
      setJob(jobData)
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLaunching(false)
    }
  }

  async function pollJob(jobId: string) {
    try {
      const res = await fetch(`${BASE_URL}/job/${jobId}`)
      if (!res.ok) return
      const data: Job = await res.json()
      setJob(data)
    } catch {
      // ignore transient network errors during polling
    }
  }

  function resetToCompose() {
    setJob(null)
    setLaunchError(null)
  }

  // ── Results view ─────────────────────────────────────────
  if (job) {
    const done = job.agents.filter((a) => a.status === 'done').length
    const total = job.agents.length
    const totalCost = job.agents.reduce((sum, a) => sum + (a.cost ?? 0), 0)

    return (
      <div className="page">
        <header className="header">
          <h1 className="header-label">Swarm</h1>
          <div className="header-title">AI Democracy</div>
          <p className="header-subtitle">
            Spawn a swarm of agents, send the same prompt, and see if consensus emerges.
          </p>
        </header>

        <section className="section">
          <div className="section-label">Job Results</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <span
              className="badge"
              style={badgeStyle(job.status)}
            >
              {job.status}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-n-400)' }}>
              {done}/{total} agents done
            </span>
            {totalCost > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-n-400)' }}>
                {formatCost(totalCost)} total cost
              </span>
            )}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={resetToCompose}>
              ← New swarm
            </button>
          </div>

          <div className="agent-grid">
            {job.agents.map((agent) => (
              <div key={agent.agent_id} className="agent-card">
                <div className="agent-card-header">
                  <div>
                    <div className="model-name">{agent.model_name}</div>
                    {agent.persona && <div className="model-id">persona: {agent.persona}</div>}
                  </div>
                  <span
                    className="badge"
                    style={badgeStyle(agent.status)}
                  >
                    {agent.status}
                  </span>
                </div>

                {agent.status === 'working' && (
                  <div className="skeleton-group" style={{ marginTop: 12 }}>
                    <div className="skeleton" style={{ height: 12, width: '80%' }} />
                    <div className="skeleton" style={{ height: 12, width: '60%' }} />
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                )}

                {agent.status === 'error' && agent.error && (
                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-error)', background: 'color-mix(in srgb, var(--color-error) 8%, transparent)', padding: '8px 12px', borderRadius: 2 }}>
                    {agent.error}
                  </div>
                )}

                {agent.response && (
                  <pre className="agent-response">{agent.response}</pre>
                )}

                {(agent.input_token || agent.output_token) && (
                  <div className="agent-meta">
                    {agent.input_token != null && <span>{agent.input_token.toLocaleString()} in</span>}
                    {agent.output_token != null && <span>{agent.output_token.toLocaleString()} out</span>}
                    {agent.cost != null && agent.cost > 0 && <span>{formatCost(agent.cost)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  // ── Compose view ─────────────────────────────────────────
  return (
    <div className="page">
      <header className="header">
        <h1 className="header-label">Swarm</h1>
        <div className="header-title">AI Democracy</div>
        <p className="header-subtitle">
          Spawn a swarm of agents, send the same prompt, and see if consensus emerges.
        </p>
      </header>

      {/* Prompt */}
      <section className="section">
        <div className="section-label">Prompt</div>
        <textarea
          className="prompt-input"
          placeholder="What should the swarm deliberate on?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
      </section>

      {/* Agents */}
      <section className="section">
        <div className="section-label">Agents — {agents.length} configured</div>

        {agents.length > 0 && (
          <div className="card-tight" style={{ marginBottom: 24 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Temp</th>
                  <th>Persona</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <div className="model-name">{models.find((m) => m.id === a.model_name)?.name ?? a.model_name}</div>
                      <div className="model-id">{a.model_name}</div>
                    </td>
                    <td>{a.temperature !== null ? a.temperature.toFixed(1) : '—'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.persona || '—'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => removeAgent(i)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add agent form */}
        <div className="card-tight add-agent-form">
          <div className="section-label" style={{ marginBottom: 16 }}>Add Agent</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label className="field-label">Model</label>
              {modelsLoading ? (
                <div className="skeleton" style={{ height: 36, width: '100%' }} />
              ) : modelsError ? (
                <div className="error-block" style={{ padding: '8px 12px' }}>
                  <span className="error-text">{modelsError}</span>
                  <button className="btn btn-secondary btn-sm" onClick={fetchModels}>Retry</button>
                </div>
              ) : (
                <select className="field-input" value={newModel} onChange={(e) => setNewModel(e.target.value)}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ flex: '0 1 100px' }}>
              <label className="field-label">Temperature</label>
              <input
                className="field-input"
                type="number"
                min="0"
                max="2"
                step="0.1"
                placeholder="default"
                value={newTemp}
                onChange={(e) => setNewTemp(e.target.value)}
              />
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <label className="field-label">Persona (system prompt)</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. You are a skeptical scientist"
                value={newPersona}
                onChange={(e) => setNewPersona(e.target.value)}
              />
            </div>
            <div>
              <button
                className="btn btn-secondary"
                onClick={addAgent}
                disabled={!newModel || modelsLoading}
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Launch */}
      <section className="section">
        {launchError && (
          <div className="error-block" style={{ marginBottom: 16 }}>
            <span className="badge badge-error">Error</span>
            <span className="error-text">{launchError}</span>
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={launchSwarm}
          disabled={launching || !prompt.trim() || agents.length === 0}
        >
          {launching ? 'Launching…' : `Launch Swarm (${agents.length} agent${agents.length !== 1 ? 's' : ''})`}
        </button>
      </section>
    </div>
  )
}

export default App
