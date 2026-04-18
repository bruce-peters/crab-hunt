import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * GET /get-number-question
 *
 * Returns the number_based_question and number_based_question_answer for the
 * most recent event. If the event hasn't started yet, returns "" and -1.
 * No API key required.
 */

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data, error } = await supabase
      .from("events")
      .select("number_based_question, number_based_question_answer, is_started")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data || !data.is_started) {
      return json({ number_based_question: "", number_based_question_answer: -1 })
    }

    return json({
      number_based_question: data.number_based_question ?? "",
      number_based_question_answer: data.number_based_question_answer ?? -1,
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
