import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * CRON JOB — runs every 30 seconds via pg_cron or Supabase scheduled functions.
 *
 * For each event that is NOT yet started:
 *   1. Check if every player in player_ids has submitted self_answers.
 *   2. If yes, flip is_started = true.
 *      The DB trigger (on_event_becomes_active) then fires the on-event-active
 *      edge function which generates the number-based question via GPT.
 *
 * Can also be triggered manually via POST for testing.
 */

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Find all events not yet started
    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("id, player_ids")
      .eq("is_started", false)

    if (eventsErr) return json({ error: eventsErr.message }, 500)
    if (!events || events.length === 0) return json({ message: "No pending events" })

    const results: { event_id: string; status: string }[] = []

    for (const event of events) {
      const playerIds: string[] = event.player_ids ?? []
      if (playerIds.length === 0) {
        results.push({ event_id: event.id, status: "skipped — no players" })
        continue
      }

      // Count distinct players who have submitted at least one answer
      const { data: answered, error: answeredErr } = await supabase
        .from("self_answers")
        .select("player_id")
        .eq("event_id", event.id)

      if (answeredErr) {
        results.push({ event_id: event.id, status: `error: ${answeredErr.message}` })
        continue
      }

      const answeredIds = new Set((answered ?? []).map((r: { player_id: string }) => r.player_id))
      const allDone = playerIds.every(id => answeredIds.has(id))

      if (!allDone) {
        results.push({ event_id: event.id, status: `waiting — ${answeredIds.size}/${playerIds.length} answered` })
        continue
      }

      // All players answered — flip is_started.
      // The DB trigger (on_event_becomes_active) will call on-event-active
      // to generate the number-based question via GPT.
      const { error: updateErr } = await supabase
        .from("events")
        .update({ is_started: true })
        .eq("id", event.id)

      if (updateErr) {
        results.push({ event_id: event.id, status: `update error: ${updateErr.message}` })
      } else {
        results.push({ event_id: event.id, status: "started — awaiting question generation" })
      }
    }

    return json({ results })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
