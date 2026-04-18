import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * CRON JOB — runs every 30 seconds via pg_cron or Supabase scheduled functions.
 *
 * For each event that is NOT yet started:
 *   1. Check if every player in player_ids has submitted self_answers.
 *   2. If yes, generate a number-based question from their answers using OpenAI,
 *      write it back to the event row, and flip is_started = true.
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
      .select("id, player_ids, daily_questions")
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

      // All players answered — generate a number-based question
      const { data: answers } = await supabase
        .from("self_answers")
        .select("question, answer, players(name)")
        .eq("event_id", event.id)

      const profiles = (answers ?? [])
        .map((r: { question: string; answer: string; players: { name: string } }) =>
          `${r.players.name}: Q="${r.question}" A="${r.answer}"`
        )
        .join("\n")

      const openaiKey = Deno.env.get("OPENAI_API_KEY")!
      const prompt = `Based on these player self-answers from a scavenger hunt group, create ONE creative number-based trivia question about the group.
The question should have a specific numeric answer (e.g. "How many total pets do all players own combined?").
Be creative and fun.

Answers:
${profiles}

Return ONLY valid JSON:
{ "question": "...", "answer": "42" }`

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      })

      const aiData = await aiRes.json()
      const { question, answer } = JSON.parse(aiData.choices[0].message.content)

      // Write back and flip is_started
      const { error: updateErr } = await supabase
        .from("events")
        .update({
          number_based_question: question,
          number_based_question_answer: answer,
          is_started: true,
        })
        .eq("id", event.id)

      if (updateErr) {
        results.push({ event_id: event.id, status: `update error: ${updateErr.message}` })
      } else {
        results.push({ event_id: event.id, status: "started — number question generated" })
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
