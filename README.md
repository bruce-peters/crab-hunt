# Crab Hunt 🦀

A real-time multiplayer scavenger hunt app for small groups. Players answer AI-generated "get to know you" questions about each other to progressively reveal a hidden location clue, then race to find a physical prize box.

---

## What it does

Crab Hunt turns a group of people at a shared location into a scavenger hunt team. Before the game starts, each player answers a few open-ended questions about themselves (favorite comfort food, hidden talent, ideal Saturday). The app feeds those answers to an AI that generates personalized multiple-choice trivia about the group. Players then answer the trivia: each correct answer reveals one more letter of a hidden clue phrase. When enough letters are uncovered, players can read the full clue, follow the step-by-step instructions, and race to find a physical box with a prize inside. It's part icebreaker, part geocache, designed for hackathons and small group events.

---

## Features

- **Phase-based flow:** Login, event dashboard, self-questions, waiting lobby, game, final instructions, success screen.
- **AI-generated MCQs:** A Supabase Edge Function calls GPT-4o-mini to create 10 personalized questions from each session's self-answers. Mixes "about player" and "who is it?" formats.
- **Progressive clue reveal:** Letters of the hidden clue unlock one at a time as players answer correctly.
- **Real-time multiplayer:** Supabase Realtime keeps all players in sync across lobby arrivals, game start, and MCQ refreshes.
- **Admin dashboard:** Create events, set clue text, activate and reset the game, and monitor player progress.
- **Event history:** Dashboard screen lists past events with player counts and statuses.
- **Mobile-first UI:** Constrained to max-w-md, designed to feel like a native phone app.
- **Dark minimal design:** Near-monochromatic (white on black), monospace accents, tactile micro-animations.

---

## How it works

```
LOGIN → DASHBOARD → SELF_QUESTIONS → WAITING → GAME → INSTRUCTIONS → SUCCESS
```

1. **Login:** Players authenticate with Supabase Auth.
2. **Dashboard:** Players see available events and join one.
3. **Self-questions:** Each player answers 3 open-ended questions. Answers are saved to Supabase and used to generate MCQs for that session.
4. **Waiting lobby:** Real-time lobby shows which players have arrived. The game starts when an admin activates the event.
5. **Game:** Players answer MCQs. Each correct answer reveals a letter of the hidden clue. When all letters are revealed, the final instructions button unlocks.
6. **Instructions:** Full clue displayed with step-by-step directions to find the physical prize box.

MCQ generation is handled by a Supabase Edge Function (`generate-mcqs`) that builds player profiles from `self_answers`, sends them to GPT-4o-mini, and returns 10 questions filtered so players are never asked about themselves.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v3 + custom CSS |
| Components | shadcn/ui (button, card, progress, badge) |
| Backend | Supabase (Auth, Postgres, Realtime, Edge Functions) |
| AI | OpenAI GPT-4o-mini (via Edge Function) |
| Fonts | Inter (body), JetBrains Mono (labels) |

---

## Getting started

**Prerequisites:** Node.js 18+, npm.

```bash
git clone https://github.com/bruce-peters/crab-hunt.git
cd crab-hunt/app
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

**Environment variables:** The app expects a `.env` file in `app/` with Supabase credentials:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The Edge Functions require `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` set in the Supabase dashboard.

To build for production:

```bash
npm run build
```

---

## Usage

Open the app on a phone or mobile-sized browser window. Log in with a player name and password. Follow the phases: answer questions about yourself, wait in the lobby, then play through MCQs to reveal the clue.

Admin users see an admin button after login that opens the dashboard for event management (creating events, setting the clue, activating the game).

---

## Project structure

```
crab-hunt/
├── app/
│   └── src/
│       ├── App.tsx                  # Phase state machine root
│       ├── types.ts                 # All TypeScript interfaces
│       ├── index.css                # CSS variables and component styles
│       ├── data/
│       │   └── mockData.ts          # Fallback mock data (players, clue, MCQs)
│       ├── lib/
│       │   └── supabase.ts          # Supabase client init
│       └── screens/
│           ├── LoginScreen.tsx
│           ├── DashboardScreen.tsx
│           ├── SelfQuestionsScreen.tsx
│           ├── WaitingScreen.tsx
│           ├── GameScreen.tsx
│           ├── InstructionsScreen.tsx
│           ├── SuccessScreen.tsx
│           └── AdminDashboard.tsx
└── supabase/
    └── functions/
        ├── generate-mcqs/           # AI MCQ generation (GPT-4o-mini)
        ├── check-all-answered/      # Checks if all players submitted self-answers
        ├── get-self-questions/      # Returns self-question prompts
        ├── get-number-question/     # Returns question count
        ├── mark-event-solved/       # Marks the event finished
        └── on-event-active/         # Triggered when admin activates an event
```

---

## Status

Active development. Supabase backend is integrated and Edge Functions are deployed. The frontend phase machine and AI MCQ generation are functional. Some mock data remains in `mockData.ts` as fallbacks. The app was built for a specific hackathon context and will need Supabase project configuration (player accounts, clue text) before running a new event.
