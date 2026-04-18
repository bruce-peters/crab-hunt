import { useState, useEffect } from 'react'
import type { EventSummary, Contact } from '../types'
import { supabase } from '../lib/supabase'
import { MOCK_EVENT_SUMMARIES, MOCK_CONTACTS } from '../data/mockData'

const USE_MOCK = false

interface DashboardData {
  pastEvents: EventSummary[]
  contacts: Contact[]
  loading: boolean
  error: string | null
}

export function useDashboardData(playerId: string): DashboardData {
  const [pastEvents, setPastEvents] = useState<EventSummary[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCK) {
      setPastEvents(MOCK_EVENT_SUMMARIES)
      setContacts(MOCK_CONTACTS)
      setLoading(false)
      return
    }

    async function fetch() {
      try {
        const { data: events, error: evErr } = await supabase
          .from('events')
          .select('id, created_at, player_ids, daily_clue, status')
          .contains('player_ids', [playerId])
          .order('created_at', { ascending: false })

        if (evErr) throw evErr

        const summaries: EventSummary[] = (events ?? []).map((ev) => ({
          id: ev.id,
          createdAt: ev.created_at,
          playerCount: (ev.player_ids ?? []).length,
          clueText: ev.daily_clue ?? null,
          status: ev.status,
        }))
        setPastEvents(summaries)

        // Collect all unique player IDs seen across events, excluding self
        const allIds = new Set<string>()
        for (const ev of events ?? []) {
          for (const pid of ev.player_ids ?? []) {
            if (pid !== playerId) allIds.add(pid)
          }
        }

        if (allIds.size > 0) {
          const { data: players, error: pErr } = await supabase
            .from('players')
            .select('id, name, emoji, email')
            .in('id', [...allIds])

          if (pErr) throw pErr

          setContacts(
            (players ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              emoji: p.emoji,
              email: p.email ?? null,
            }))
          )
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [playerId])

  return { pastEvents, contacts, loading, error }
}
