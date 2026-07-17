import type { GenerationJob } from '@/types'
import { supabase, getCurrentUserId } from './supabase'

/**
 * Generation history. Local-first: every job is stored in localStorage
 * immediately (instant UX), then synced to Supabase in the background when
 * the user is signed in. Conflicts resolve last-write-wins.
 */

const LS_KEY = 'ai-byte-studio:history'

type SyncListener = (syncing: boolean) => void
const syncListeners = new Set<SyncListener>()

export function onSyncChange(fn: SyncListener): () => void {
  syncListeners.add(fn)
  return () => syncListeners.delete(fn)
}

function notifySync(state: boolean) {
  syncListeners.forEach((fn) => fn(state))
}

function readLocal(): GenerationJob[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as GenerationJob[]) : []
  } catch {
    return []
  }
}

function writeLocal(jobs: GenerationJob[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(jobs.slice(0, 100)))
}

export function listLocalJobs(): GenerationJob[] {
  return readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getJob(id: string): GenerationJob | undefined {
  return readLocal().find((j) => j.id === id)
}

export function saveJob(job: GenerationJob): void {
  const jobs = readLocal().filter((j) => j.id !== job.id)
  jobs.unshift(job)
  writeLocal(jobs)
  void syncJobToCloud(job)
}

export function deleteJob(id: string): void {
  writeLocal(readLocal().filter((j) => j.id !== id))
  void deleteJobFromCloud(id)
}

// ---------- cloud sync (best-effort, background) ----------

async function syncJobToCloud(job: GenerationJob): Promise<void> {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  notifySync(true)
  try {
    await supabase.from('generations').upsert({
      id: job.id,
      user_id: userId,
      project_id: job.projectId,
      status: job.status,
      // jsonb payload also carries job metadata so it round-trips losslessly
      steps: { type: job.type, title: job.title, provider: job.provider, items: job.steps },
      result_url: job.resultUrl ?? null,
      share_kit: job.shareKit,
      created_at: job.createdAt,
    })
  } catch {
    // Local copy is the source of truth; cloud sync retries on next save.
  } finally {
    notifySync(false)
  }
}

async function deleteJobFromCloud(id: string): Promise<void> {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  try {
    await supabase.from('generations').delete().eq('id', id)
  } catch {
    /* best-effort */
  }
}

/** Pull cloud history and merge into local (last-write-wins by createdAt). */
export async function refreshFromCloud(): Promise<GenerationJob[]> {
  if (!supabase) return listLocalJobs()
  const userId = await getCurrentUserId()
  if (!userId) return listLocalJobs()
  notifySync(true)
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error || !data) return listLocalJobs()
    const local = readLocal()
    const byId = new Map<string, GenerationJob>(local.map((j) => [j.id, j]))
    for (const row of data) {
      const existing = byId.get(row.id)
      const meta = row.steps && !Array.isArray(row.steps) ? row.steps : {}
      const cloudJob: GenerationJob = {
        id: row.id,
        projectId: row.project_id,
        type: meta.type ?? existing?.type ?? 'solo',
        title: meta.title ?? existing?.title ?? 'Generation',
        status: row.status,
        provider: meta.provider ?? existing?.provider ?? 'heygen',
        steps: Array.isArray(meta.items) ? meta.items : (existing?.steps ?? []),
        resultUrl: row.result_url ?? undefined,
        shareKit: row.share_kit ?? {},
        createdAt: row.created_at,
      }
      if (!existing || existing.createdAt <= cloudJob.createdAt) byId.set(row.id, cloudJob)
    }
    const merged = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    writeLocal(merged)
    return merged
  } finally {
    notifySync(false)
  }
}
