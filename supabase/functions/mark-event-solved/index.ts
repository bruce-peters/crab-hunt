import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

/**
 * POST /mark-event-solved
 * Body: {} (optional: { event_id: string } to target a specific event)
 *
 * Called by the physical device when the crab box is found/solved.
 * Sets status = 'completed' on the most recent active event (or the specified one).
 * The frontend listens for this change and forwards all players to the success screen.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    let event_id: string | undefined
    try {
      const body = await req.json()
      event_id = body?.event_id
    } catch {
      // No body or invalid JSON — that's fine, we'll use the latest event
    }

    let targetEventId = event_id

    if (!targetEventId) {
      // Use the most recent event that is active
      const { data: latest, error } = await supabase
        .from("events")
        .select("id, status")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error || !latest) {
        return json({ error: "No event found" }, 404)
      }

      targetEventId = latest.id
    }

    // Mark the event as completed
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", targetEventId)

    if (updateError) {
      return json({ error: updateError.message }, 500)
    }

    return json({ success: true, event_id: targetEventId })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
