# Crab Hunt 🦀

A hackathon geocache-style scavenger hunt app. Players arrive at a physical location, answer AI-generated "get to know you" MCQ questions about each other to progressively reveal a hidden clue, then race to find a physical box and claim a prize.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v3 + custom CSS (index.css) |
| Components | shadcn/ui (button, card, progress, badge) |
| Fonts | Inter (body), JetBrains Mono (labels/mono) |
| Backend | Supabase (auth, realtime DB, edge functions) — currently mocked |
| Dev server | `npm run dev` in `app/` → localhost:5173 |

All source lives in `app/src/`. No routing — pure phase-based state machine in `App.tsx`.

---

## App Architecture

### Phase State Machine

```
LOGIN → SELF_QUESTIONS → WAITING → GAME → INSTRUCTIONS
```

- `App.tsx` owns `phase` state and passes `onXxx` callbacks down
- No bottom nav bar — phase transitions happen automatically or via explicit button actions
- Layout wrapper: `<div className="max-w-md mx-auto min-h-dvh">` on every screen

### File Structure

```
app/
├── src/
│   ├── App.tsx                      # Phase state machine root
│   ├── types.ts                     # All TypeScript interfaces
│   ├── index.css                    # CSS vars, base styles, component classes
│   ├── data/
│   │   └── mockData.ts              # Mock players, questions, MCQs, clue text
│   └── screens/
│       ├── LoginScreen.tsx          # Name + password auth
│       ├── SelfQuestionsScreen.tsx  # 3 open-ended questions about yourself
│       ├── WaitingScreen.tsx        # Lobby — wait for all players to arrive
│       ├── GameScreen.tsx           # Clue reveal + MCQ questions
│       └── InstructionsScreen.tsx   # Full clue + step-by-step instructions
├── tailwind.config.js
├── index.html
└── components.json                  # shadcn config
```

### Types (`src/types.ts`)

```ts
type GamePhase = 'LOGIN' | 'SELF_QUESTIONS' | 'WAITING' | 'GAME' | 'INSTRUCTIONS'
type DbGameStatus = 'waiting' | 'active' | 'finished'

interface AppUser      { id: string; name: string }
interface Player       { id, name, emoji, arrived, answeredSelfQuestions }
interface SelfQuestion { id, text, placeholder }
interface MCQQuestion  { id, text, aboutPlayer, options: QuestionOption[] }
interface QuestionOption { id, text, isCorrect }
```

---

## Screen Descriptions

### LoginScreen
- Name + password form (mock: any crew name + `"1234"`)
- Player emoji auto-populates in input prefix as you type your name (🦀 Bruce, 🐙 Alex, 🦑 Sam, 🐡 Jordan)
- Loading spinner on submit with 600ms simulated delay
- "Powered by Supabase" monospace footer
- Error message if wrong credentials

### SelfQuestionsScreen
- 3 open-ended textarea questions about yourself — the data the MCQs are later generated from
- Questions slide up with staggered animation (`animationDelay: i * 80ms`)
- Counter: "X of 3 answered" below the submit button
- Submit disabled until all 3 have text; shows spinner + "Saving answers..."
- **TODO:** Wire to Supabase — upsert answers into `self_answers` table

### WaitingScreen
- Lobby screen — players appear in a list with arrived/pending states
- Green glow dot (`.bg-green-400.shadow-[0_0_8px_rgba(74,222,128,0.5)]`) for arrived players
- Pulsing grey dot (`animate-pulse-slow`) for pending players
- "you" badge next to the current user
- Arrival progress bar at the top
- Auto-arrival simulation: other players arrive every ~1800ms (dev mock)
- "Start the hunt 🦀" CTA unlocks when all 4 arrive
- **TODO:** Replace timer simulation with Supabase Realtime subscription on `players` table

### GameScreen
- **Split layout:** clue display at top, MCQ section at bottom, separated by `h-px bg-white/8`
- **Clue panel:** Letters shown as `_` when hidden, animate in with `letter-pop` when revealed. Spaces always visible. Progress bar + percentage counter.
- **Reveal mechanic:** Each correct MCQ answer reveals 2 letters (`lettersPerCorrect = 2`)
- **AI hint:** Appears after the first correct answer (slide-up animation)
- **MCQ panel:** 10 questions cycling infinitely (`questionIndex % MOCK_MCQ.length`). Shows "About {player}" label + "Q{n}/10" counter.
- **Feedback:** Green card for correct (`✓ Correct! 2 letters revealed.`), red card for wrong (`✗ The answer was "..."`). Then "Next question →" button.
- **"I think I know where to go →"** button always visible — opens a bottom sheet confirmation modal
- **Bottom sheet:** `fixed inset-0 z-50`, black/60 backdrop blur, slides up from bottom (`rounded-t-3xl`)
- When all letters revealed → celebratory state with "Get final instructions →"

### InstructionsScreen
- Phase 2 header with horizontal rule dividers
- Full clue displayed in monospace card (`font-mono text-2xl font-bold tracking-widest`)
- 4 numbered steps (01–04) with monospace step numbers
- "Remember" warning card: "Other crews are hunting too."
- "← Back to clue" ghost button returns to GameScreen
- Date footer in monospace

---

## Design Language

### Vibe
**Deep dark, minimal, slightly mysterious.** Think hackathon terminal meets clean consumer app. No color splashes — the UI is almost monochromatic with white-on-black, using opacity as the primary design lever. Interactions feel tactile with micro-scale transforms (`active:scale-[0.98]`).

### Color Palette (CSS custom properties)

All colors are white/black variants with opacity modifiers — there is no hue in the palette except for feedback states.

| Token | Value | Usage |
|---|---|---|
| `--background` | `0 0% 4%` (`#0a0a0a`) | Page background |
| `--card` | `0 0% 6%` | Card backgrounds |
| `--foreground` | `0 0% 98%` | Primary text |
| `--muted` | `0 0% 12%` | Muted backgrounds |
| `--muted-foreground` | `0 0% 55%` | Secondary text |
| `--border` | `0 0% 16%` | Default borders |
| `--primary` | `0 0% 98%` (white) | CTA buttons |
| `--radius` | `1rem` | Base border radius |

**Common opacity modifiers in use:**
- `text-white` → primary text  
- `text-white/70` → secondary text  
- `text-white/40–50` → tertiary / labels  
- `text-white/25–30` → very muted / mono labels  
- `text-white/20` → placeholders  
- `border-white/15` → subtle borders  
- `border-white/25` → medium borders  
- `border-white` → active/CTA borders  
- `bg-white/[0.02–0.04]` → card fills  
- `bg-white/5` → hover states  
- `bg-white/10` → selected states  

**Feedback colors (only color in the UI):**
- Correct: `border-green-400`, `bg-green-400/10`, `text-green-300`
- Wrong: `border-red-400/25`, `bg-red-400/[0.06]`, `text-red-300/80`
- Arrived dot: `bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]`
- Error text: `text-red-400/80`

### Typography

- **Body / headings:** `Inter` — `font-semibold`, `font-bold` for headings
- **Labels / counters / metadata:** `JetBrains Mono` via `font-mono` — always in `text-white/25–40`, often `tracking-widest uppercase text-xs`
- **Clue text:** `font-mono text-2xl font-bold tracking-widest` — the "reveal" moment

**Typography patterns:**
```
Section label:  text-xs font-mono text-white/30 tracking-widest uppercase
Screen title:   text-2xl–3xl font-bold text-white
Body copy:      text-sm text-white/40 leading-relaxed
Card label:     text-xs font-mono text-white/30 tracking-widest uppercase
Step number:    font-mono text-white/25 text-xs
```

### Spacing & Radius

- Page padding: `p-6` on all screens
- Cards: `rounded-2xl` everywhere
- Bottom sheet: `rounded-t-3xl`
- CTA buttons: `rounded-2xl py-4`
- Option buttons: `rounded-2xl py-4 px-5`
- Inputs: `rounded-2xl py-4 px-4`
- Base radius token: `--radius: 1rem` → Tailwind `rounded-lg`

### Animation

| Name | Definition | Usage |
|---|---|---|
| `animate-fade-in` | opacity 0→1, 0.35s ease-out | Screen mount |
| `animate-slide-up` | opacity 0→1 + translateY(16px)→0, 0.4s ease-out | Cards, feedback |
| `animate-letter-pop` | scale 0.4→1.3→1, 0.35s ease-out | Letter reveal |
| `animate-pulse-slow` | pulse, 2.5s cubic-bezier | Pending player dots |
| `animate-spin` | built-in Tailwind | Loading spinners |

Staggered animations on SelfQuestionsScreen: `animationDelay: i * 80ms, animationFillMode: 'both'`

### Button Styles

**Primary CTA (full white border):**
```
py-4 rounded-2xl border border-white text-white font-semibold text-base
active:scale-[0.98] transition-all hover:bg-white/5
disabled:border-white/15 disabled:text-white/20 disabled:cursor-not-allowed
```

**Ghost / secondary:**
```
py-3.5 rounded-2xl border border-white/15 text-white/50 font-medium text-sm
active:scale-[0.98] transition-all hover:bg-white/5
```

**MCQ option buttons (custom CSS classes in `index.css`):**
```css
.btn-option          /* default: border-white/20, text-white/70 */
.btn-option-selected /* border-white, bg-white/10, text-white */
.btn-option-correct  /* border-green-400, bg-green-400/10, text-green-300 */
.btn-option-wrong    /* border-white/10, text-white/25, pointer-events-none */
```
Option buttons also show a monospace letter prefix: `A`, `B`, `C`, `D` in `text-white/25`.

### Input Styles
```
bg-white/[0.04] border border-white/15 rounded-2xl py-4 px-4
text-white placeholder-white/20 text-sm font-medium
focus:outline-none focus:border-white/40 transition-colors
```

### Cards
```
p-4–5 rounded-2xl border border-white/15 bg-white/[0.03]
```
Elevated/featured cards use `border-white/25 bg-white/5`.

### Dividers / Rule patterns
```
<div className="h-px flex-1 bg-white/10" />          /* horizontal rule */
<div className="h-px bg-white/8 mx-6" />              /* section divider */
```
Phase labels float between rules: `text-xs font-mono text-white/30 tracking-widest uppercase`

### Loading Spinner
```jsx
<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
```

### Scrollbar
Custom thin scrollbar: 4px width, transparent track, `rgba(255,255,255,0.12)` thumb.

---

## Mock Data

**Players** (`MOCK_PLAYERS`): Bruce 🦀, Alex 🐙, Sam 🦑, Jordan 🐡

**Self-questions** (`SELF_QUESTIONS`): 3 open-ended personal questions (comfort food, hidden talent, ideal Saturday)

**Clue text** (`CLUE_TEXT`): `"EAST DOCK SHELF 3"` — spaces always visible, letters revealed 2 at a time

**MCQ pool** (`MOCK_MCQ`): 10 questions about players, cycling infinitely. In production these come from a Supabase Edge Function that reads `self_answers` and generates MCQs with AI.

**Auth mock**: Any of the 4 crew names + password `"1234"` works.

---

## Supabase Integration (Pending)

The MCP server is configured in `.mcp.json`:
```json
{ "supabase": { "url": "https://mcp.supabase.com/mcp?project_ref=rrsijbdoqllgnyvcoyqs" } }
```

Agent skills installed: `supabase`, `supabase-postgres-best-practices`

### Tables to build
| Table | Purpose |
|---|---|
| `players` | User accounts (id, name, emoji) |
| `self_answers` | Answers to self-questions per player |
| `game_state` | Global game status (`waiting` / `active` / `finished`) |
| `clue_reveal` | Per-player revealed letter indices |

### Replace mocks with
1. **Login** → `supabase.auth.signInWithPassword()`
2. **Self-questions read** → `supabase.from('self_questions').select()`
3. **Self-questions write** → `supabase.from('self_answers').upsert()`
4. **Waiting lobby** → `supabase.channel('players').on('postgres_changes', ...)`
5. **Game start** → Subscribe to `game_state` table, transition on `status = 'active'`
6. **MCQ generation** → `supabase.functions.invoke('generate-mcq', { body: { playerId } })`
7. **Clue reveal** → `supabase.from('clue_reveal').upsert({ revealed_indices: [...] })`

---

## Dev Notes

- `app/index.html`: Mobile viewport with `user-scalable=no`, Google Fonts preconnect, title "Crab Hunt 🦀"
- `tsconfig.app.json`: Has `"ignoreDeprecations": "6.0"` for TypeScript 6 baseUrl warning
- `.claude/launch.json`: Dev server config — `npm run dev` in `app/`, port 5173
- shadcn components live in `app/src/components/ui/` (not `app/@/components/ui/`)
- `components.json` has `"aliases": { "components": "src/components", "utils": "src/lib/utils" }`
