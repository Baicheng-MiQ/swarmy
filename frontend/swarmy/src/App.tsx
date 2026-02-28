import { useState, useCallback } from 'react'
import './App.css'
import { useModels } from './hooks/useModels'
import { useJob } from './hooks/useJob'
import { Layout } from './components/Layout'
import { SetupView } from './components/setup/SetupView'
import { ResultsView } from './components/results/ResultsView'
import type { CreateJobRequest } from './types'

type View = 'setup' | 'results'

function App() {
  const [view, setView] = useState<View>('setup')
  const { models, loading: modelsLoading, error: modelsError, retry } = useModels()
  const { job, isPolling, error: jobError, launching, launch, reset } = useJob()

  const handleLaunch = useCallback(
    async (request: CreateJobRequest) => {
      const jobId = await launch(request)
      if (jobId) setView('results')
    },
    [launch],
  )

  const handleReset = useCallback(() => {
    reset()
    setView('setup')
  }, [reset])

  return (
    <Layout>
      {view === 'setup' && (
        <SetupView
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          onRetryModels={retry}
          onLaunch={handleLaunch}
          launching={launching}
        />
      )}

      {view === 'results' && job && (
        <ResultsView job={job} isPolling={isPolling} onReset={handleReset} />
      )}

      {view === 'results' && !job && jobError && (
        <section className="section">
          <div className="error-block">
            <span className="badge badge-error">Error</span>
            <span className="error-text">{jobError}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              Back
            </button>
          </div>
        </section>
      )}
    </Layout>
  )
}

export default App
