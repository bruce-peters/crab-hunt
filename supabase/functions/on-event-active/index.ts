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

    // ── 3. Fetch self_answers for this event only ────────────────────────────────
    const { data: allAnswers, error: answersError } = await supabase
      .from("self_answers")
      .select("player_id, question, answer")
      .eq("event_id", event_id)
      .in("player_id", playerIds)

    if (answersError) return json({ error: answersError.message }, 500)

    if (!allAnswers || allAnswers.length === 0) {
      return json({
        skipped: true,
        reason: "No self-answers found for this event",
        player_ids: playerIds,
      })
    }

    // ── 4. Build player profiles (group Q&A by player) ────────────────────────
    const byPlayer: Record<string, { name: string; emoji: string; qa: { q: string; a: string }[] }> = {}
    for (const row of allAnswers) {
      const p = playerMap[row.player_id]
      if (!p) continue
      if (!byPlayer[row.player_id]) {
        byPlayer[row.player_id] = { name: p.name, emoji: p.emoji, qa: [] }
      }
      byPlayer[row.player_id].qa.push({ q: row.question, a: row.answer })
    }

    const playerProfiles = Object.values(byPlayer)
      .map(p =>
        `Player: ${p.name} ${p.emoji}\n` +
        p.qa.map(({ q, a }) => `  Q: ${q}\n  A: ${a}`).join("\n")
      )
      .join("\n\n")

    const playerNames = players.map((p: { name: string; emoji: string }) => `${p.name} ${p.emoji}`).join(", ")

    // ── 5. Call OpenAI ─────────────────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not set" }, 500)

    const prompt = `You are designing the final clue questions for a scavenger hunt game played by a group of friends.

The group has ${players.length} players: ${playerNames}.

Each player answered fun "get to know you" questions for THIS session. Your job is to:
1. Carefully read every answer and look for genuine similarities, overlaps, or surprising patterns across the group — e.g. shared food opinions, mutual habits, same picks in a this-or-that question, common experiences.
2. Count precisely: for each candidate topic, count EXACTLY how many players answered in a way that matches.
3. Pick the TWO most fun or surprising similarities and turn each into a "how many people in the group…?" question.
4. Each answer must be a whole number between 1 and ${players.length}.

What makes a great question:
- Based on a clear, verifiable count from the answers below — no guessing.
- Surprising or reveals something fun about the group dynamic.
- Specific enough to be unambiguous (e.g. "prefer savoury over sweet" not just "like food").
- About DIFFERENT topics from each other.

Strict rules:
- ONLY use information explicitly stated in the answers below — never invent or assume.
- Double-check your count before writing the answer.
- Both questions must have different answers (avoid two questions that both equal ${players.length} or both equal 1).
- Keep tone warm, playful, and light-hearted.

Player profiles (from this session only):
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
