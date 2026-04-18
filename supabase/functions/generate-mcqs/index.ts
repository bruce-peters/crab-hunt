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
  type: 'about-player' | 'who-is-it'
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
      .select("id, player_ids")
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
      .in("player_id", playerIds)

    if (answersError) return json({ error: answersError.message }, 500)
    if (!answers || answers.length === 0) {
      return json({ error: "No self-answers found for any players in this event" }, 404)
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

    const playerNames = Object.values(byPlayer).map(p => `${p.name} ${p.emoji}`)

    const prompt = `You are crafting fun "get to know you" multiple-choice questions for a scavenger hunt game.

Based on the answers each player gave about themselves, generate exactly 10 MCQ questions that help players learn fun, light-hearted things about each other.

Keep questions easy, breezy, and fun — think "cats vs dogs", "controversial food opinion", "go-to karaoke song". Nothing too deep or serious. The goal is laughs and quick answers, not soul-searching.

There are TWO question types you must mix together:

TYPE 1 — "about-player": Ask something about a specific named player.
  Example: "What is Alex's most controversial food opinion?" with answer options.
  - Use the player's name in the question text.
  - Options are content choices (not player names).

TYPE 2 — "who-is-it": Ask which player matches a description, without naming them.
  Example: "Who said their go-to karaoke song is Mr Brightside?"
  - Do NOT mention the player's name in the question text.
  - The 4 options are player names (all players in the game, with their emoji).
  - The correct option is the player whose answer inspired the question.
  - "aboutPlayer" should still be set to the correct player's name (without emoji).

Rules (both types):
- Generate exactly 5 "about-player" questions and 5 "who-is-it" questions.
- Spread questions across as many different players as possible.
- Generate a MAXIMUM of 3 questions about any single player (across both types combined).
- NEVER generate a question where the person being asked IS the subject (set "aboutPlayer" correctly so the app can filter).
- Base every question on something a player actually said in their answers.
- Wrong answer options should be plausible but clearly incorrect.
- Keep tone fun, warm, and light-hearted.

Players in this game (for "who-is-it" option lists): ${playerNames.join(', ')}

Player profiles:
${playerProfiles}

Return ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "type": "about-player",
      "text": "question text here",
      "aboutPlayer": "Player Name",
      "options": [
        { "id": "a", "text": "option text", "isCorrect": false },
        { "id": "b", "text": "option text", "isCorrect": true },
        { "id": "c", "text": "option text", "isCorrect": false },
        { "id": "d", "text": "option text", "isCorrect": false }
      ]
    },
    {
      "id": "q2",
      "type": "who-is-it",
      "text": "Who said their ideal Saturday is a spontaneous road trip with no plan?",
      "aboutPlayer": "Sam",
      "options": [
        { "id": "a", "text": "Bruce 🦀", "isCorrect": false },
        { "id": "b", "text": "Alex 🐙", "isCorrect": false },
        { "id": "c", "text": "Sam 🦑", "isCorrect": true },
        { "id": "d", "text": "Jordan 🐡", "isCorrect": false }
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
    const raw = JSON.parse(aiData.choices[0].message.content) as { questions: MCQQuestion[] }

    console.log("[generate-mcqs] GPT raw question types:", raw.questions?.map(q => ({ id: q.id, type: q.type, aboutPlayer: q.aboutPlayer, optionTexts: q.options?.map(o => o.text) })))

    // Normalize type field.
    // A question is "who-is-it" if GPT set that type AND at least some of its options resemble
    // player names. We use a lenient check (any option contains a known player's first name)
    // rather than requiring exact full-string matches, because GPT may vary spacing/emoji format.
    const playerFirstNames = new Set(playerNames.map(n => n.split(" ")[0].toLowerCase()))
    const normalized: MCQQuestion[] = raw.questions.map(q => {
      const optionTexts = q.options.map(o => o.text.toLowerCase())
      const optionsLookLikePlayerNames = optionTexts.some(t =>
        playerFirstNames.has(t.split(" ")[0])
      )
      return {
        ...q,
        type: q.type === 'who-is-it' && optionsLookLikePlayerNames ? 'who-is-it' : 'about-player',
      }
    })

    console.log("[generate-mcqs] Normalized types:", normalized.map(q => ({ id: q.id, type: q.type })))

    // Enforce max 3 questions per player — only applies to 'about-player' type.
    // 'who-is-it' questions are always kept regardless of how many reference the same player.
    const countByPlayer: Record<string, number> = {}
    const capped = normalized.filter(q => {
      if (q.type === 'who-is-it') return true
      const key = q.aboutPlayer.toLowerCase()
      countByPlayer[key] = (countByPlayer[key] ?? 0) + 1
      return countByPlayer[key] <= 3
    })

    // Server-side: strip questions where the requesting player is the subject.
    // Both types: 'about-player' (they'd be asked about themselves) and
    // 'who-is-it' (they're the correct answer — trivially known).
    // Fall back to the full capped set if all questions get removed (single-player dev mode).
    const requestingPlayer = players.find((p: { id: string; name: string; emoji: string }) => p.id === requesting_player_id)
    const questions = (() => {
      if (!requestingPlayer) return capped
      const name = requestingPlayer.name.toLowerCase()
      const filtered = capped.filter(q => q.aboutPlayer.toLowerCase() !== name)
      return filtered.length > 0 ? filtered : capped
    })()

    return json({
      event_id: eventId,
      questions,
      _debug: {
        rawTypes: raw.questions?.map(q => ({ id: q.id, type: q.type, aboutPlayer: q.aboutPlayer, options: q.options?.map(o => o.text) })),
        normalizedTypes: normalized.map(q => ({ id: q.id, type: q.type, aboutPlayer: q.aboutPlayer })),
        finalQuestions: questions.map(q => ({ id: q.id, type: q.type, aboutPlayer: q.aboutPlayer })),
        playerNames,
      }
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
