import { useState, useEffect, useRef, useCallback } from 'react'
import { createJob, startJob, getJob } from '../api/client'
import { POLL_INTERVAL_MS, JOB_TIMEOUT_MS } from '../constants'
import type { Job, CreateJobRequest } from '../types'

export function useJob() {
  const [job, setJob] = useState<Job | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
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
    setTimedOut(false)
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

      // Start timeout
      timeoutRef.current = setTimeout(() => {
        // Mark unfinished agents as timed-out
        setJob((prev) => {
          if (!prev) return prev
          const updatedAgents = prev.agents.map((a) =>
            a.status === 'ready' || a.status === 'working'
              ? { ...a, status: 'error' as const, error: 'Timed out after 1:30' }
              : a,
          )
          return { ...prev, status: 'done', agents: updatedAgents }
        })
        setTimedOut(true)
        stopPolling()
      }, JOB_TIMEOUT_MS)

      return created.job_id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch job')
      return null
    } finally {
      setLaunching(false)
    }
  }, [poll, stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setJob(null)
    setError(null)
    setTimedOut(false)
    jobIdRef.current = null
  }, [stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { job, isPolling, error, launching, launch, reset, timedOut }
}
