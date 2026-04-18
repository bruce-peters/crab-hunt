import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from './supabase'
import type { MCQQuestion } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MCQ_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface MCQCache {
  expiresAt: number
  event_id: string
  questions: MCQQuestion[]
}

function mcqCacheKey(playerId: string) {
  return `mcq_cache_${playerId}`
}

function readMCQCache(playerId: string, eventId: string): MCQCache | null {
  try {
    const raw = localStorage.getItem(mcqCacheKey(playerId))
    if (!raw) return null
    const cached: MCQCache = JSON.parse(raw)
    if (Date.now() > cached.expiresAt || cached.event_id !== eventId) {
      localStorage.removeItem(mcqCacheKey(playerId))
      return null
    }
    return cached
  } catch {
    return null
  }
}

function writeMCQCache(playerId: string, data: { event_id: string; questions: MCQQuestion[] }) {
  try {
    const entry: MCQCache = { expiresAt: Date.now() + MCQ_CACHE_TTL_MS, ...data }
    localStorage.setItem(mcqCacheKey(playerId), JSON.stringify(entry))
  } catch {
    // localStorage quota exceeded — just skip caching
  }
}

export function clearMCQCache(playerId: string) {
  try {
    localStorage.removeItem(mcqCacheKey(playerId))
  } catch {
    // ignore
  }
}

export async function generateMCQs(
  requestingPlayerId: string,
  eventId: string,
): Promise<{ event_id: string; questions: MCQQuestion[] }> {
  const cached = readMCQCache(requestingPlayerId, eventId)
  if (cached) return { event_id: cached.event_id, questions: cached.questions }

  const { data, error } = await supabase.functions.invoke<{
    event_id: string
    questions: MCQQuestion[]
  }>('generate-mcqs', {
    body: { requesting_player_id: requestingPlayerId },
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No data returned from generate-mcqs')

  writeMCQCache(requestingPlayerId, data)
  return data
}
