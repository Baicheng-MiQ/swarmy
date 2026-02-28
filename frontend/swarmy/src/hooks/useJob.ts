import { useState, useEffect, useRef, useCallback } from 'react'
import { createJob, startJob, getJob } from '../api/client'
import { POLL_INTERVAL_MS } from '../constants'
import type { Job, CreateJobRequest } from '../types'

export function useJob() {
  const [job, setJob] = useState<Job | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const data = await getJob(jobId)
      setJob(data)
      if (data.status === 'done') {
        stopPolling()
      }
    } catch {
      // swallow poll errors — keep trying
    }
  }, [stopPolling])

  const launch = useCallback(async (request: CreateJobRequest) => {
    setError(null)
    setLaunching(true)
    try {
      const created = await createJob(request)
      jobIdRef.current = created.job_id
      await startJob(created.job_id)

      // Fetch initial state
      const initial = await getJob(created.job_id)
      setJob(initial)

      // Start polling
      setIsPolling(true)
      intervalRef.current = setInterval(() => {
        poll(created.job_id)
      }, POLL_INTERVAL_MS)

      return created.job_id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch job')
      return null
    } finally {
      setLaunching(false)
    }
  }, [poll])

  const reset = useCallback(() => {
    stopPolling()
    setJob(null)
    setError(null)
    jobIdRef.current = null
  }, [stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return { job, isPolling, error, launching, launch, reset }
}
