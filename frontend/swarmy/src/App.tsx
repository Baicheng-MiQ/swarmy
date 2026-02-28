import { useEffect, useRef, useState } from 'react'
import './App.css'

const BASE_URL = '/api'
const POLL_INTERVAL_MS = 2000

// ── Types ──────────────────────────────────────────────────────────────────────

interface Model {
  id: string
  name: string
  pricing?: { prompt?: string; completion?: string }
  context_length?: number
}

interface AgentGroup {
  _id: number
  model_name: string
  count: number
  temperature: string
  persona: string
}

interface JobAgent {
  agent_id: string
  model_name: string
  temperature: number | null
  status: 'ready' | 'working' | 'done' | 'error'
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
  status: 'ready' | 'working' | 'done'
  agents: JobAgent[]
}

// Schema for structured "opinion vote" output
const VOTE_SCHEMA = {
  name: 'vote',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['yes', 'no', 'abstain'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasoning: { type: 'string' },
    },
    required: ['verdict', 'confidence', 'reasoning'],
    additionalProperties: false,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: JobAgent['status']) {
  const map: Record<string, string> = {
    ready: 'badge-neutral',
    working: 'badge-pending',
    done: 'badge-success',
    error: 'badge-error',
  }
  return <span className={`badge ${map[status] ?? 'badge-neutral'}`}>{status}</span>
}

function parseVote(response: string | null): { verdict: string; confidence: number; reasoning: string } | null {
  if (!response) return null
  try {
    const obj = JSON.parse(response)
    if (typeof obj.verdict === 'string') return obj
  } catch { /* invalid JSON – return null */ }
  return null
}

function computeConsensus(agents: JobAgent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const a of agents) {
    if (a.status !== 'done') continue
    const vote = parseVote(a.response)
    const key = vote ? vote.verdict : '_error'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

// ── App ────────────────────────────────────────────────────────────────────────

const MAX_AGENTS_PER_GROUP = 50

export default function App() {
  const agentGroupIdRef = useRef(0)
  // Models
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // Setup form
  const [prompt, setPrompt] = useState('')
  const [structuredMode, setStructuredMode] = useState(false)
  const [agentGroups, setAgentGroups] = useState<AgentGroup[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [addCount, setAddCount] = useState('1')
  const [addTemp, setAddTemp] = useState('')
  const [addPersona, setAddPersona] = useState('')

  // Job
  const [phase, setPhase] = useState<'setup' | 'job'>('setup')
  const [job, setJob] = useState<Job | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchModels()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Auto-select first model once loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModel) setSelectedModel(models[0].id)
  }, [models, selectedModel])

  async function fetchModels() {
    setLoadingModels(true)
    setModelsError(null)
    try {
      const res = await fetch(`${BASE_URL}/models/structured`)
      if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`)
      const data = await res.json()
      setModels(data.data ?? [])
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingModels(false)
    }
  }

  function addAgentGroup() {
    if (!selectedModel) return
    const count = Math.max(1, Math.min(MAX_AGENTS_PER_GROUP, parseInt(addCount) || 1))
    setAgentGroups(prev => [
      ...prev,
      { _id: ++agentGroupIdRef.current, model_name: selectedModel, count, temperature: addTemp, persona: addPersona },
    ])
    setAddCount('1')
    setAddPersona('')
  }

  function removeAgentGroup(id: number) {
    setAgentGroups(prev => prev.filter(g => g._id !== id))
  }

  function totalAgents() {
    return agentGroups.reduce((s, g) => s + g.count, 0)
  }

  async function launchSwarm() {
    if (!prompt.trim()) return
    if (agentGroups.length === 0) return
    setLaunching(true)
    setLaunchError(null)
    try {
      // Build agents list
      const agents = agentGroups.flatMap(g =>
        Array.from({ length: g.count }, () => ({
          model_name: g.model_name,
          ...(g.temperature !== '' ? { temperature: parseFloat(g.temperature) } : {}),
          ...(g.persona.trim() ? { persona: g.persona.trim() } : {}),
        }))
      )
      const body: Record<string, unknown> = {
        messages: [{ role: 'user', content: prompt.trim() }],
        agents,
      }
      if (structuredMode) {
        body.response_format = { type: 'json_schema', json_schema: VOTE_SCHEMA }
      }
      // Create job
      const createRes = await fetch(`${BASE_URL}/create_job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.detail ?? `Create job failed (${createRes.status})`)
      }
      const created = await createRes.json()
      const jobId: string = created.job_id

      // Start job
      const startRes = await fetch(`${BASE_URL}/start_job/${jobId}`, { method: 'POST' })
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}))
        throw new Error(err.detail ?? `Start job failed (${startRes.status})`)
      }

      // Fetch initial state then poll
      const initial = await fetch(`${BASE_URL}/job/${jobId}`)
      const initialData = await initial.json()
      setJob(initialData)
      setPhase('job')

      pollRef.current = setInterval(async () => {
        const res = await fetch(`${BASE_URL}/job/${jobId}`)
        if (!res.ok) return
        const data: Job = await res.json()
        setJob(data)
        if (data.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLaunching(false)
    }
  }

  function resetToSetup() {
    if (pollRef.current) clearInterval(pollRef.current)
    setJob(null)
    setPhase('setup')
  }

  // ── Render: Setup ────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    return (
      <div className="page">
        <header className="header">
          <h1 className="header-label">Swarmy</h1>
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
            placeholder="Ask the swarm a question… e.g. Should AI be regulated?"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
          />
        </section>

        {/* Output mode */}
        <section className="section">
          <div className="section-label">Output Mode</div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={structuredMode}
                onChange={e => setStructuredMode(e.target.checked)}
              />
              <span className="toggle-text">
                Structured vote output
              </span>
            </label>
            {structuredMode && (
              <span className="toggle-hint">
                Each agent responds with <code>{'{verdict, confidence, reasoning}'}</code>
              </span>
            )}
          </div>
        </section>

        {/* Agent builder */}
        <section className="section">
          <div className="section-label">Agents</div>

          {loadingModels && (
            <div className="skeleton-group">
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
              <div className="skeleton" style={{ height: 40, width: '100%' }} />
            </div>
          )}

          {modelsError && (
            <div className="error-block">
              <span className="badge badge-error">Error</span>
              <span className="error-text">{modelsError}</span>
              <button className="btn btn-secondary btn-sm" onClick={fetchModels}>Retry</button>
            </div>
          )}

          {!loadingModels && !modelsError && (
            <>
              <div className="agent-builder">
                <div className="builder-row">
                  <div className="field-group">
                    <div className="field-label">Model</div>
                    <select className="select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group field-group-sm">
                    <div className="field-label">Count</div>
                    <input
                      className="input-sm"
                      type="number"
                      min={1}
                      max={50}
                      value={addCount}
                      onChange={e => setAddCount(e.target.value)}
                    />
                  </div>
                  <div className="field-group field-group-sm">
                    <div className="field-label">Temp (opt)</div>
                    <input
                      className="input-sm"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      placeholder="default"
                      value={addTemp}
                      onChange={e => setAddTemp(e.target.value)}
                    />
                  </div>
                  <div className="field-group field-group-grow">
                    <div className="field-label">Persona (opt)</div>
                    <input
                      className="input-full"
                      type="text"
                      placeholder="e.g. You are a cynical economist"
                      value={addPersona}
                      onChange={e => setAddPersona(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={addAgentGroup}>
                    + Add
                  </button>
                </div>
              </div>

              {agentGroups.length > 0 && (
                <div className="agent-group-list">
                  {agentGroups.map(g => (
                    <div key={g._id} className="agent-group-row">
                      <span className="agent-group-count">{g.count}×</span>
                      <span className="agent-group-model">{g.model_name}</span>
                      {g.temperature !== '' && (
                        <span className="agent-group-meta">t={g.temperature}</span>
                      )}
                      {g.persona && (
                        <span className="agent-group-persona">"{g.persona}"</span>
                      )}
                      <button
                        className="btn-remove"
                        onClick={() => removeAgentGroup(g._id)}
                        title="Remove"
                      >✕</button>
                    </div>
                  ))}
                  <div className="agent-total">
                    <span className="stat-value-sm">{totalAgents()}</span>
                    <span className="stat-label">agents total</span>
                  </div>
                </div>
              )}
            </>
          )}
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
            disabled={launching || !prompt.trim() || agentGroups.length === 0 || loadingModels}
            onClick={launchSwarm}
          >
            {launching ? 'Launching…' : `Launch Swarm — ${totalAgents()} agents`}
          </button>
        </section>
      </div>
    )
  }

  // ── Render: Job ──────────────────────────────────────────────────────────────

  const agents = job?.agents ?? []
  const doneCount = agents.filter(a => a.status === 'done' || a.status === 'error').length
  const successCount = agents.filter(a => a.status === 'done').length
  const errorCount = agents.filter(a => a.status === 'error').length
  const total = agents.length
  const progress = total > 0 ? (doneCount / total) * 100 : 0
  const isFinished = job?.status === 'done'

  const consensus = structuredMode ? computeConsensus(agents) : null
  const consensusTotal = consensus ? Object.values(consensus).reduce((s, v) => s + v, 0) : 0

  const verdictColors: Record<string, string> = {
    yes: 'var(--color-success)',
    no: 'var(--color-error)',
    abstain: 'var(--color-n-500)',
    _error: 'var(--color-n-800)',
  }
  const verdictBadge: Record<string, string> = {
    yes: 'badge-success',
    no: 'badge-error',
    abstain: 'badge-neutral',
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-top-row">
          <button className="btn btn-ghost" onClick={resetToSetup}>← New swarm</button>
          {isFinished
            ? <span className="badge badge-success">Completed</span>
            : <span className="badge badge-pending">Running</span>
          }
        </div>
        <div className="header-title" style={{ marginTop: 12 }}>AI Democracy</div>
        <p className="header-subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-n-400)', marginTop: 6 }}>
          {prompt}
        </p>
      </header>

      {/* Progress */}
      <section className="section">
        <div className="section-label">Progress</div>
        <div className="progress-stats">
          <div>
            <span className="stat-value-sm">{doneCount}</span>
            <span className="stat-label" style={{ marginLeft: 8 }}>/ {total} completed</span>
          </div>
          <div className="progress-mini-stats">
            {successCount > 0 && <span style={{ color: 'var(--color-success)', fontSize: 11 }}>✓ {successCount}</span>}
            {errorCount > 0 && <span style={{ color: 'var(--color-error)', fontSize: 11 }}>✕ {errorCount}</span>}
          </div>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill${isFinished ? ' success' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {!isFinished && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-n-500)' }}>
            <span className="dot-live" />
            Swarm running — {doneCount} of {total} agents completed
          </div>
        )}
      </section>

      {/* Consensus (structured mode) */}
      {structuredMode && consensusTotal > 0 && (
        <section className="section">
          <div className="section-label">Consensus</div>
          <div className="consensus-bar">
            {Object.entries(consensus ?? {}).map(([verdict, count]) => (
              <div
                key={verdict}
                className="consensus-seg"
                style={{ flex: count, background: verdictColors[verdict] ?? 'var(--color-n-500)' }}
                title={`${verdict}: ${count}`}
              />
            ))}
          </div>
          <div className="consensus-legend">
            {Object.entries(consensus ?? {}).map(([verdict, count]) => (
              <span key={verdict} style={{ color: verdictColors[verdict] ?? 'var(--color-n-500)', fontSize: 11 }}>
                ● {verdict} {Math.round((count / consensusTotal) * 100)}%
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Agent results */}
      <section className="section">
        <div className="section-label">Agents</div>
        <div className="card-tight">
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Status</th>
                {structuredMode && <th>Verdict</th>}
                {structuredMode && <th>Confidence</th>}
                {!structuredMode && <th>Response</th>}
                <th>Tokens</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => {
                const vote = structuredMode ? parseVote(a.response) : null
                return (
                  <tr key={a.agent_id}>
                    <td>
                      <div className="model-name">{a.model_name}</div>
                      {a.persona && <div className="model-id">"{a.persona}"</div>}
                    </td>
                    <td>{statusBadge(a.status)}</td>
                    {structuredMode && (
                      <td>
                        {vote
                          ? <span className={`badge ${verdictBadge[vote.verdict] ?? 'badge-neutral'}`}>{vote.verdict}</span>
                          : a.status === 'error'
                            ? <span className="model-id" style={{ color: 'var(--color-error)' }}>{a.error}</span>
                            : <span className="model-id">—</span>
                        }
                      </td>
                    )}
                    {structuredMode && (
                      <td>
                        {vote ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{vote.confidence.toFixed(2)}</span>
                            <div className="progress-track" style={{ width: 80, marginTop: 4 }}>
                              <div className={`progress-fill ${vote.verdict === 'yes' ? 'success' : ''}`} style={{ width: `${vote.confidence * 100}%` }} />
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                    )}
                    {!structuredMode && (
                      <td className="response-cell">
                        {a.status === 'done' && a.response
                          ? <span className="response-text">{a.response}</span>
                          : a.status === 'error'
                            ? <span style={{ color: 'var(--color-error)', fontSize: 11 }}>{a.error}</span>
                            : <span className="model-id">—</span>
                        }
                      </td>
                    )}
                    <td style={{ fontSize: 11, color: 'var(--color-n-500)' }}>
                      {a.input_token != null ? `${a.input_token}↑ ${a.output_token ?? 0}↓` : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-n-500)' }}>
                      {a.cost != null ? `$${a.cost.toFixed(5)}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Reasoning accordion (structured mode) */}
        {structuredMode && isFinished && agents.some(a => parseVote(a.response)?.reasoning) && (
          <div style={{ marginTop: 24 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Reasoning</div>
            {agents.filter(a => parseVote(a.response)?.reasoning).map(a => {
              const vote = parseVote(a.response)!
              return (
                <details key={a.agent_id} className="reasoning-details">
                  <summary className="reasoning-summary">
                    <span className="model-name">{a.model_name}</span>
                    <span className={`badge ${verdictBadge[vote.verdict] ?? 'badge-neutral'}`} style={{ marginLeft: 8 }}>{vote.verdict}</span>
                  </summary>
                  <p className="reasoning-body">{vote.reasoning}</p>
                </details>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
