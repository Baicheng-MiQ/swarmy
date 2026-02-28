import { useEffect, useState, useCallback } from 'react'
import { fetchModels } from '../api/client'
import type { Model } from '../types'

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchModels()
      setModels(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { models, loading, error, retry: load }
}
