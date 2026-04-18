import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * GET /get-number-question?event_id=<uuid>
 *
 * Returns the number-based question and answer for an event.
 * Called by the frontend to poll for when the question is ready.
 * Returns: { question: string | null, answer: string | null, is_started: boolean }
 */

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const event_id = url.searchParams.get("event_id")

    if (!event_id) {
      return json({ error: "event_id query param is required" }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data, error } = await supabase
      .from("events")
      .select("number_based_question, number_based_question_answer, is_started")
      .eq("id", event_id)
      .single()

    if (error) return json({ error: error.message }, 500)
    if (!data) return json({ error: "Event not found" }, 404)

    return json({
      question: data.number_based_question,
      answer: data.number_based_question_answer,
      is_started: data.is_started,
    })
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
