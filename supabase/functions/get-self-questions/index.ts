import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface Question {
  id: string
  text: string
  placeholder: string
}

const ALL_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "What's your go-to comfort food?",
    placeholder: "e.g. mac and cheese, ramen, cereal at midnight...",
  },
  {
    id: "q2",
    text: "What's something most people don't know about you?",
    placeholder: "A hidden talent, weird hobby, secret skill...",
  },
  {
    id: "q3",
    text: "What would your ideal Saturday look like?",
    placeholder: "Be honest — couch, adventure, chaos, whatever...",
  },
  {
    id: "q4",
    text: "What's a hill you'll die on, no matter what?",
    placeholder: "An opinion, preference, or belief you'll never budge on...",
  },
  {
    id: "q5",
    text: "What's the last thing you Googled that you're slightly embarrassed about?",
    placeholder: "Be honest, we won't judge...",
  },
  {
    id: "q6",
    text: "If you had to eat one cuisine for the rest of your life, what would it be?",
    placeholder: "Italian, Japanese, Mexican, Ethiopian...",
  },
  {
    id: "q7",
    text: "What's a skill you wish you had but have never learned?",
    placeholder: "Instrument, language, sport, craft...",
  },
  {
    id: "q8",
    text: "What's the most spontaneous thing you've ever done?",
    placeholder: "A trip, decision, purchase, or life choice...",
  },
  {
    id: "q9",
    text: "What's your go-to karaoke song?",
    placeholder: "Even if you'd never actually do karaoke...",
  },
  {
    id: "q10",
    text: "What's the weirdest thing you believed as a kid?",
    placeholder: "Something you genuinely thought was true...",
  },
  {
    id: "q11",
    text: "What's your most controversial food opinion?",
    placeholder: "e.g. pineapple on pizza is fine, ketchup goes in the fridge...",
  },
  {
    id: "q12",
    text: "If you had to live in a different decade, which would you pick and why?",
    placeholder: "60s, 80s, 2050s... and what draws you there?",
  },
  {
    id: "q13",
    text: "What's a movie or show everyone loves that you just couldn't get into?",
    placeholder: "No judgment... mostly.",
  },
  {
    id: "q14",
    text: "What's a small, weird thing that genuinely makes your day better?",
    placeholder: "A smell, ritual, sound, or tiny habit...",
  },
  {
    id: "q15",
    text: "What's the most niche thing you're an expert in?",
    placeholder: "Something obscure you know way too much about...",
  },
  {
    id: "q16",
    text: "You have one free day with zero obligations — what does it look like?",
    placeholder: "Be specific. Morning to night.",
  },
  {
    id: "q17",
    text: "What's a purchase under $20 that genuinely changed your life?",
    placeholder: "A product, tool, snack, or experience...",
  },
  {
    id: "q18",
    text: "What's your most used emoji and what does that say about you?",
    placeholder: "Think about it...",
  },
  {
    id: "q19",
    text: "What's something you're irrationally afraid of?",
    placeholder: "Not heights or spiders — something weird...",
  },
  {
    id: "q20",
    text: "What would your friends say is your most annoying habit?",
    placeholder: "Be honest.",
  },
  {
    id: "q21",
    text: "What's the best piece of advice you've ever received?",
    placeholder: "Who said it and did you actually follow it?",
  },
  {
    id: "q22",
    text: "What app do you spend the most time on that you'd be embarrassed to admit?",
    placeholder: "Screen time doesn't lie...",
  },
  {
    id: "q23",
    text: "If you had to describe your vibe in three words, what would they be?",
    placeholder: "Not what you aspire to — what you actually are.",
  },
  {
    id: "q24",
    text: "What's a recurring dream or nightmare you've had?",
    placeholder: "Falling, flying, forgetting something...",
  },
  {
    id: "q25",
    text: "What's something on your bucket list that most people would find boring?",
    placeholder: "Visiting a specific library, trying a certain food, etc.",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  let playerId: string | null = null

  try {
    const body = await req.json()
    playerId = body.player_id ?? null
  } catch {
    // no body provided — return random questions without filtering
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

  // Filter out already-answered questions; if all answered, use the full pool
  const unanswered = ALL_QUESTIONS.filter((q) => !answeredQuestionTexts.includes(q.text))
  const pool = unanswered.length > 0 ? unanswered : ALL_QUESTIONS

  const picked = shuffle(pool).slice(0, 3)

  return new Response(JSON.stringify(picked), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
