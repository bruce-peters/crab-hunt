import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface Question {
  id: string
  text: string
  placeholder: string
}

// Mix of two styles:
// - Short answer (q*): question naturally gets a quick specific response ("mac and cheese", "Mr Brightside")
// - Pick & explain (p*): phrased as a binary choice, user picks a side and explains in their own words
const ALL_QUESTIONS: Question[] = [
  // Short answer
  {
    id: "q1",
    text: "What's your go-to comfort food?",
    placeholder: "e.g. mac and cheese, ramen, cereal at midnight...",
  },
  {
    id: "q2",
    text: "What's your go-to karaoke song?",
    placeholder: "Even if you'd never actually do karaoke...",
  },
  {
    id: "q3",
    text: "What's a movie or show everyone loves that you couldn't get into?",
    placeholder: "No judgment... mostly.",
  },
  {
    id: "q4",
    text: "What's the weirdest thing you believed as a kid?",
    placeholder: "Something you genuinely thought was true...",
  },
  {
    id: "q5",
    text: "What's something you're weirdly good at?",
    placeholder: "A random skill, party trick, or useless talent...",
  },
  {
    id: "q6",
    text: "What's your most-used emoji?",
    placeholder: "e.g. 😭, 💀, 🫠... and why?",
  },
  {
    id: "q7",
    text: "What's a movie, book, or show you could quote on demand?",
    placeholder: "Something so ingrained you could recite it in your sleep...",
  },
  {
    id: "q8",
    text: "What's your most controversial food opinion?",
    placeholder: "e.g. pineapple on pizza is fine, mayo is evil...",
  },
  {
    id: "q9",
    text: "What's a small weird thing that genuinely makes your day better?",
    placeholder: "A smell, ritual, sound, or tiny habit...",
  },
  {
    id: "q10",
    text: "What's the last thing that made you genuinely laugh out loud?",
    placeholder: "A meme, moment, video, or real-life disaster...",
  },
  // Pick & explain
  {
    id: "p1",
    text: "Cats or dogs? Pick a side and tell us why.",
    placeholder: "e.g. Dogs — they actually seem happy to see you",
  },
  {
    id: "p2",
    text: "Sweet or savoury? What's your go-to and why?",
    placeholder: "e.g. Savoury — I could eat cheese forever and feel zero guilt",
  },
  {
    id: "p3",
    text: "Morning person or night owl? What does that actually look like for you?",
    placeholder: "e.g. Night owl — best ideas hit at midnight, mornings are a write-off",
  },
  {
    id: "p4",
    text: "Beach or mountains? Sell it.",
    placeholder: "e.g. Mountains — I love the quiet, the views, and not getting sand everywhere",
  },
  {
    id: "p5",
    text: "Tea or coffee? How do you take it and why?",
    placeholder: "e.g. Oat flat white — anything else is not coffee",
  },
  {
    id: "p6",
    text: "Texter or caller? Be honest about why.",
    placeholder: "e.g. Texter — I panic when my phone rings unexpectedly",
  },
  {
    id: "p7",
    text: "Cook at home or eat out? What's your usual move?",
    placeholder: "e.g. Same Thai place every week — I've tried cooking, it ends badly",
  },
  {
    id: "p8",
    text: "Spicy or mild? Where do you actually draw the line?",
    placeholder: "e.g. Hot sauce on everything, but I regret it every single time",
  },
  {
    id: "p9",
    text: "Planner or spontaneous? Give an example.",
    placeholder: "e.g. Planner — I have a spreadsheet for holidays and I'm not sorry",
  },
  {
    id: "p10",
    text: "City or countryside? What does your ideal setting feel like?",
    placeholder: "e.g. City — I need noise, food options, and things happening",
  },
]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Simple seeded PRNG (mulberry32) — deterministic for a given seed
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Convert a UUID string to a numeric seed
function uuidToSeed(uuid: string): number {
  const hex = uuid.replace(/-/g, "").slice(0, 8)
  return parseInt(hex, 16)
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  const rand = seededRandom(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  let playerId: string | null = null
  let eventId: string | null = null

  try {
    const body = await req.json()
    playerId = body.player_id ?? null
    eventId = body.event_id ?? null
  } catch {
    // no body — return random questions without filtering
  }

  let answeredQuestionTexts: string[] = []

  if (playerId) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data } = await supabase
      .from("self_answers")
      .select("question")
      .eq("player_id", playerId)

    if (data && data.length > 0) {
      answeredQuestionTexts = data.map((row: { question: string }) => row.question)
    }
  }

  // Pick 2 short-answer questions (q*) and 1 pick-and-explain question (p*)
  const shortPool = shuffle(
    ALL_QUESTIONS.filter((q) => q.id.startsWith("q") && !answeredQuestionTexts.includes(q.text))
  )

  // Use event_id as seed so everyone in the same event gets the same p* question
  const pickAllFresh = ALL_QUESTIONS.filter((q) => q.id.startsWith("p") && !answeredQuestionTexts.includes(q.text))
  const pickAll = ALL_QUESTIONS.filter((q) => q.id.startsWith("p"))
  const pickSource = pickAllFresh.length >= 1 ? pickAllFresh : pickAll
  const pickPool = eventId
    ? seededShuffle(pickSource, uuidToSeed(eventId))
    : shuffle(pickSource)

  // Fall back to full pool if we've run out of fresh short questions
  const shorts = shortPool.length >= 2 ? shortPool : shuffle(ALL_QUESTIONS.filter((q) => q.id.startsWith("q")))

  const picked = [...shorts.slice(0, 2), ...pickPool.slice(0, 1)]

  return new Response(JSON.stringify(picked), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
