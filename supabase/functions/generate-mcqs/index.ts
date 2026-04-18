import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * POST /generate-mcqs
 * Body: { event_id: string, requesting_player_id: string }
 *
 * Fetches all self_answers for the event, then uses OpenAI to generate
 * 10 MCQ questions about the OTHER players (not the requester).
 * Returns: { questions: MCQQuestion[] }
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
  try {
    const { event_id, requesting_player_id } = await req.json()

    if (!event_id || !requesting_player_id) {
      return json({ error: "event_id and requesting_player_id are required" }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Fetch all self_answers for this event, excluding the requester's own answers
    const { data: answers, error } = await supabase
      .from("self_answers")
      .select("player_id, question, answer, players(name, emoji)")
      .eq("event_id", event_id)
      .neq("player_id", requesting_player_id)

    if (error) return json({ error: error.message }, 500)
    if (!answers || answers.length === 0) {
      return json({ error: "No self-answers found for this event" }, 404)
    }

    // Group answers by player
    const byPlayer: Record<string, { name: string; emoji: string; qa: { q: string; a: string }[] }> = {}
    for (const row of answers) {
      const player = row.players as { name: string; emoji: string }
      if (!byPlayer[row.player_id]) {
        byPlayer[row.player_id] = { name: player.name, emoji: player.emoji, qa: [] }
      }
      byPlayer[row.player_id].qa.push({ q: row.question, a: row.answer })
    }

    const playerProfiles = Object.values(byPlayer)
      .map(p => `Player: ${p.name} ${p.emoji}\n${p.qa.map(qa => `Q: ${qa.q}\nA: ${qa.a}`).join("\n")}`)
      .join("\n\n")

    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not set" }, 500)

    const prompt = `You are generating multiple-choice trivia questions for a group scavenger hunt game.
Based on the players' self-answers below, generate exactly 10 fun MCQ questions.
Each question should be about ONE specific player (use their name in the question).
Mix easy and tricky questions. Make wrong answers plausible but clearly wrong.

Player profiles:
${playerProfiles}

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
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

    return json(content)
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
