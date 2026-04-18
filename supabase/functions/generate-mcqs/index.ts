import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * POST /generate-mcqs
 * Body: { requesting_player_id: string }
 *
 * 1. Finds the current event (most recently created).
 * 2. Fetches all players in that event.
 * 3. Fetches all self_answers for every player in the event.
 * 4. Sends everything to GPT-4o-mini to generate 10 "get to know you" MCQs.
 * 5. Returns: { event_id: string, questions: MCQQuestion[] }
 */

interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

interface MCQQuestion {
  id: string
  text: string
  aboutPlayer: string
  options: QuestionOption[]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const { requesting_player_id } = await req.json()

    if (!requesting_player_id) {
      return json({ error: "requesting_player_id is required" }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // ── 1. Get the current (most recently created) event ──────────────────────
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, player_ids, cached_mcqs")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (eventError || !event) {
      return json({ error: "No active event found" }, 404)
    }

    const eventId: string = event.id
    const playerIds: string[] = event.player_ids ?? []

    if (playerIds.length === 0) {
      return json({ error: "Event has no players" }, 404)
    }

    // ── 2a. Return cached questions if available ───────────────────────────────
    if (event.cached_mcqs && Array.isArray(event.cached_mcqs) && event.cached_mcqs.length > 0) {
      return json({ event_id: eventId, questions: event.cached_mcqs })
    }

    // ── 2. Fetch all players in the event ─────────────────────────────────────
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, emoji")
      .in("id", playerIds)

    if (playersError || !players || players.length === 0) {
      return json({ error: "Could not fetch players for this event" }, 500)
    }

    const playerMap: Record<string, { name: string; emoji: string }> = {}
    for (const p of players) {
      playerMap[p.id] = { name: p.name, emoji: p.emoji }
    }

    // ── 3. Fetch ALL self_answers for the event ────────────────────────────────
    const { data: answers, error: answersError } = await supabase
      .from("self_answers")
      .select("player_id, question, answer")
      .eq("event_id", eventId)

    if (answersError) return json({ error: answersError.message }, 500)
    if (!answers || answers.length === 0) {
      return json({ error: "No self-answers found for this event" }, 404)
    }

    // ── 4. Build player profiles (group Q&A by player) ────────────────────────
    const byPlayer: Record<string, { name: string; emoji: string; qa: { q: string; a: string }[] }> = {}
    for (const row of answers) {
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
        p.qa.map(qa => `  Q: ${qa.q}\n  A: ${qa.a}`).join("\n")
      )
      .join("\n\n")

    // ── 5. Call OpenAI ─────────────────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not set" }, 500)

    const prompt = `You are crafting fun "get to know you" multiple-choice questions for a group scavenger hunt game.

Based on the personal answers each player gave about themselves, generate exactly 10 MCQ questions that help players learn interesting things about each other.

Rules:
- Each question must be about ONE specific player — use their name in the question text.
- Spread questions across as many different players as possible.
- Base every question directly on something a player actually said in their answers.
- Wrong answer options should be plausible but clearly incorrect to someone who knows the person.
- Keep tone fun, warm and light-hearted.

Player profiles:
${playerProfiles}

Return ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "text": "question text here",
      "aboutPlayer": "Player Name",
      "options": [
        { "id": "a", "text": "option text", "isCorrect": false },
        { "id": "b", "text": "option text", "isCorrect": true },
        { "id": "c", "text": "option text", "isCorrect": false },
        { "id": "d", "text": "option text", "isCorrect": false }
      ]
    }
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
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      return json({ error: `OpenAI error: ${err}` }, 502)
    }

    const aiData = await aiRes.json()
    const content = JSON.parse(aiData.choices[0].message.content) as { questions: MCQQuestion[] }

    // ── 6. Persist the generated questions so future calls use the cache ───────
    await supabase
      .from("events")
      .update({ cached_mcqs: content.questions })
      .eq("id", eventId)

    return json({ event_id: eventId, ...content })
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
