import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * POST /on-event-active
 * Body: { event_id: string }
 *
 * Called by a Postgres trigger (via pg_net) when an event's is_started flips to true.
 *
 * 1. Fetches all players in the event and their self_answers.
 * 2. Sends everything to GPT-4o-mini, asking it to find group similarities and
 *    generate TWO number-based questions + answers.
 * 3. Stores the result in events.number_based_question as JSON: {questions:[{q,a},{q,a}]}.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const { event_id } = await req.json()

    if (!event_id) {
      return json({ error: "event_id is required" }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // ── 1. Fetch the event ─────────────────────────────────────────────────────
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, player_ids, number_based_question")
      .eq("id", event_id)
      .single()

    if (eventError || !event) {
      return json({ error: "Event not found", event_id }, 404)
    }

    // Skip if already generated
    if (event.number_based_question) {
      return json({ skipped: true, reason: "number_based_question already set" })
    }

    const playerIds: string[] = event.player_ids ?? []

    if (playerIds.length === 0) {
      return json({ skipped: true, reason: "Event has no players yet — is_started was flipped before anyone joined" })
    }

    // ── 2. Fetch players ───────────────────────────────────────────────────────
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, emoji")
      .in("id", playerIds)

    if (playersError || !players || players.length === 0) {
      return json({ error: "Could not fetch players" }, 500)
    }

    const playerMap: Record<string, { name: string; emoji: string }> = {}
    for (const p of players) {
      playerMap[p.id] = { name: p.name, emoji: p.emoji }
    }

    // ── 3. Fetch ALL historical self_answers for these players ─────────────────
    // We use the full history across all events to find the richest similarities.
    // Later answers for the same question overwrite earlier ones (handled in step 4).
    const { data: allAnswers, error: answersError } = await supabase
      .from("self_answers")
      .select("player_id, question, answer, created_at")
      .in("player_id", playerIds)
      .order("created_at", { ascending: true })

    if (answersError) return json({ error: answersError.message }, 500)

    if (!allAnswers || allAnswers.length === 0) {
      return json({
        skipped: true,
        reason: "No self-answers found for these players across any event",
        player_ids: playerIds,
      })
    }

    // ── 4. Build player profiles (group Q&A by player, dedup by question text) ─
    const byPlayer: Record<string, { name: string; emoji: string; qa: Map<string, string> }> = {}
    for (const row of allAnswers) {
      const p = playerMap[row.player_id]
      if (!p) continue
      if (!byPlayer[row.player_id]) {
        byPlayer[row.player_id] = { name: p.name, emoji: p.emoji, qa: new Map() }
      }
      // Later answers overwrite earlier ones for the same question
      byPlayer[row.player_id].qa.set(row.question, row.answer)
    }

    const playerProfiles = Object.values(byPlayer)
      .map(p =>
        `Player: ${p.name} ${p.emoji}\n` +
        Array.from(p.qa.entries()).map(([q, a]) => `  Q: ${q}\n  A: ${a}`).join("\n")
      )
      .join("\n\n")

    const playerNames = players.map((p: { name: string; emoji: string }) => `${p.name} ${p.emoji}`).join(", ")

    // ── 5. Call OpenAI ─────────────────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not set" }, 500)

    const prompt = `You are designing the final clue questions for a group scavenger hunt game.

The group has ${players.length} players: ${playerNames}.

Each player answered personal "get to know you" questions (drawn from all their previous sessions). Your job is to:
1. Study all the answers and find interesting similarities or patterns across the group (e.g. shared hobbies, foods, opinions, habits, places).
2. Pick the TWO most fun or surprising similarities and craft TWO different number-based questions about them.
3. Each answer must be a whole number between 1 and ${players.length}.

Example questions (do NOT copy these, invent your own based on the actual answers):
- "How many people in the group have visited more than 3 countries?"
- "How many people in the group like pineapple on pizza?"
- "How many people in the group have a pet at home?"

Rules:
- Each question must be answerable purely from the answers given below — do NOT invent facts.
- Each answer MUST be a whole number.
- The two questions must be about DIFFERENT topics.
- Keep tone fun and light-hearted.

Player profiles:
${playerProfiles}

Return ONLY valid JSON with no markdown or code fences:
{
  "questions": [
    {"q": "How many people in the group ...?", "a": 3},
    {"q": "How many people in the group ...?", "a": 2}
  ]
}`

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

    if (!aiRes.ok) {
      const err = await aiRes.text()
      return json({ error: `OpenAI error: ${err}` }, 502)
    }

    const aiData = await aiRes.json()
    const result = JSON.parse(aiData.choices[0].message.content) as {
      questions: { q: string; a: number }[]
    }

    if (!Array.isArray(result.questions) || result.questions.length < 2) {
      return json({ error: "GPT returned unexpected structure", raw: result }, 502)
    }

    // ── 6. Persist into the event row ──────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("events")
      .update({
        number_based_question: result,
      })
      .eq("id", event_id)

    if (updateError) {
      return json({ error: `Failed to update event: ${updateError.message}` }, 500)
    }

    return json({
      event_id,
      questions: result.questions,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}
