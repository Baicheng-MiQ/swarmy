import type { CreateJobRequest, Job, Model } from '../types'

const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${body || res.statusText}`)
  }
  return res.json()
}

export async function fetchModels(): Promise<Model[]> {
  const data = await request<{ data: Model[] }>(`${BASE}/models/structured`)
  return data.data ?? []
}

export async function createJob(
  req: CreateJobRequest,
): Promise<{ job_id: string; agents: Array<{ agent_id: string; model_name: string; status: string }> }> {
  return request(`${BASE}/create_job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export async function startJob(jobId: string): Promise<{ job_id: string; status: string }> {
  return request(`${BASE}/start_job/${jobId}`, { method: 'POST' })
}

export async function getJob(jobId: string): Promise<Job> {
  return request<Job>(`${BASE}/job/${jobId}`)
}
