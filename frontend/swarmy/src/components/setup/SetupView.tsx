import { useState, useCallback } from 'react'
import type { AgentConfig, Model, SpawnSettings, ResponseFormat, CreateJobRequest } from '../../types'
import { DEFAULT_SCHEMA } from '../../constants'
import { PromptInput } from './PromptInput'
import { SchemaConfig } from './SchemaConfig'
import { SpawnConfig } from './SpawnConfig'
import { defaultSpawnSettings } from './defaults'
import { AgentList } from './AgentList'
import { Button } from '../shared/Button'
import { Skeleton } from '../shared/Skeleton'

interface SetupViewProps {
  models: Model[]
  modelsLoading: boolean
  modelsError: string | null
  onRetryModels: () => void
  onLaunch: (request: CreateJobRequest) => void
  launching: boolean
}

type Phase = 'configure' | 'review'

/** Group models by provider family (first segment of ID) */
function getFamily(modelId: string): string {
  return modelId.split('/')[0] ?? modelId
}

/** Generate a diverse swarm of agents from available models */
function generateSwarm(
  models: Model[],
  settings: SpawnSettings,
): AgentConfig[] {
  if (models.length === 0) return []

  const { count, tempMin, tempMax, personas } = settings

  // Group models by provider family for diversity
  const familyMap = new Map<string, Model[]>()
  for (const m of models) {
    const fam = getFamily(m.id)
    if (!familyMap.has(fam)) familyMap.set(fam, [])
    familyMap.get(fam)!.push(m)
  }
  const families = Array.from(familyMap.values())

  // Round-robin pick from families to maximize diversity
  const pickedModels: Model[] = []
  let famIdx = 0
  const famCounters = new Array(families.length).fill(0)
  for (let i = 0; i < count; i++) {
    const fam = families[famIdx % families.length]
    const model = fam[famCounters[famIdx % families.length] % fam.length]
    pickedModels.push(model)
    famCounters[famIdx % families.length]++
    famIdx++
  }

  // Generate evenly spaced temperatures
  const temps: number[] = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? (tempMin + tempMax) / 2 : tempMin + ((tempMax - tempMin) * i) / (count - 1)
    temps.push(Math.round(t * 100) / 100)
  }

  // Build agent configs
  return pickedModels.map((model, i) => ({
    id: `spawn-${i}-${Date.now()}`,
    model_name: model.id,
    temperature: temps[i],
    persona: personas.length > 0 ? personas[i % personas.length] : undefined,
  }))
}

export function SetupView({
  models,
  modelsLoading,
  modelsError,
  onRetryModels,
  onLaunch,
  launching,
}: SetupViewProps) {
  const [phase, setPhase] = useState<Phase>('configure')
  const [prompt, setPrompt] = useState('')
  const [schema, setSchema] = useState<ResponseFormat | null>(DEFAULT_SCHEMA)
  const [spawnSettings, setSpawnSettings] = useState<SpawnSettings>(defaultSpawnSettings)
  const [agents, setAgents] = useState<AgentConfig[]>([])

  const handleSpawn = useCallback(() => {
    const spawned = generateSwarm(models, spawnSettings)
    setAgents(spawned)
    setPhase('review')
  }, [models, spawnSettings])

  const handleStart = useCallback(() => {
    const request: CreateJobRequest = {
      messages: [{ role: 'user', content: prompt }],
      response_format: schema ?? undefined,
      agents: agents.map((a) => ({
        model_name: a.model_name,
        temperature: a.temperature,
        persona: a.persona,
      })),
    }
    onLaunch(request)
  }, [prompt, schema, agents, onLaunch])

  const canSpawn = prompt.trim().length > 0 && spawnSettings.count >= 2 && !modelsLoading && models.length > 0

  if (modelsLoading) {
    return (
      <section className="section">
        <div className="section-label">Loading Models</div>
        <div className="skeleton-group">
          <Skeleton width="60%" height={14} />
          <Skeleton width="100%" height={32} />
          <Skeleton width="80%" height={14} />
        </div>
      </section>
    )
  }

  if (modelsError) {
    return (
      <section className="section">
        <div className="error-block">
          <span className="badge badge-error">Error</span>
          <span className="error-text">{modelsError}</span>
          <Button variant="secondary" size="sm" onClick={onRetryModels}>
            Retry
          </Button>
        </div>
      </section>
    )
  }

  return (
    <>
      {phase === 'configure' && (
        <>
          {/* Prompt */}
          <section className="section">
            <div className="section-label">Question</div>
            <PromptInput value={prompt} onChange={setPrompt} />
          </section>

          {/* Schema */}
          <section className="section">
            <div className="section-label">Response Format</div>
            <SchemaConfig value={schema} onChange={setSchema} />
          </section>

          {/* Spawn Config */}
          <section className="section">
            <div className="section-label">Swarm Configuration</div>
            <SpawnConfig value={spawnSettings} onChange={setSpawnSettings} />
          </section>

          {/* Spawn Button */}
          <div className="action-bar">
            <Button variant="primary" onClick={handleSpawn} disabled={!canSpawn}>
              Spawn Swarm
            </Button>
          </div>
        </>
      )}

      {phase === 'review' && (
        <>
          {/* Prompt preview */}
          <section className="section">
            <div className="section-label">Prompt</div>
            <div className="card-tight">
              <p className="prompt-preview">{prompt}</p>
            </div>
          </section>

          {/* Agent list */}
          <section className="section">
            <div className="section-label">Review Agents</div>
            <AgentList agents={agents} models={models} onChange={setAgents} />
          </section>

          {/* Actions */}
          <div className="action-bar">
            <Button variant="secondary" onClick={() => setPhase('configure')}>
              ← Re-configure
            </Button>
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={agents.length < 2 || launching}
            >
              {launching ? 'Starting…' : 'Start Job'}
            </Button>
          </div>
        </>
      )}
    </>
  )
}
