import type { Player, SelfQuestion, MCQQuestion, EventSummary, Contact } from '../types'

export const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'Bruce',  emoji: '🦀', arrived: false, answeredSelfQuestions: true  },
  { id: '2', name: 'Alex',   emoji: '🐙', arrived: false, answeredSelfQuestions: false },
  { id: '3', name: 'Sam',    emoji: '🦑', arrived: false, answeredSelfQuestions: false },
  { id: '4', name: 'Jordan', emoji: '🐡', arrived: false, answeredSelfQuestions: false },
]

export const SELF_QUESTIONS: SelfQuestion[] = [
  {
    id: 'sq1',
    text: "What's your go-to comfort food?",
    placeholder: 'e.g. mac and cheese, ramen, cereal at midnight...',
  },
  {
    id: 'sq2',
    text: "What's something most people don't know about you?",
    placeholder: 'A hidden talent, weird hobby, secret skill...',
  },
  {
    id: 'sq3',
    text: 'What would your ideal Saturday look like?',
    placeholder: 'Be honest — couch, adventure, chaos, whatever...',
  },
]

export const MOCK_EVENT_SUMMARIES: EventSummary[] = [
  { id: 'evt-1', createdAt: '2026-04-10T18:00:00Z', playerCount: 6, clueText: 'EAST DOCK SHELF 3', status: 'finished' },
  { id: 'evt-2', createdAt: '2026-04-12T18:00:00Z', playerCount: 4, clueText: 'NORTH PIER BOX 7',  status: 'finished' },
  { id: 'evt-3', createdAt: '2026-04-15T18:00:00Z', playerCount: 8, clueText: 'SOUTH GATE CRATE',  status: 'finished' },
]

export const MOCK_CONTACTS: Contact[] = [
  { id: '2', name: 'Alex',   emoji: '🐙', email: 'alex@example.com' },
  { id: '3', name: 'Sam',    emoji: '🦑', email: 'sam@example.com' },
  { id: '4', name: 'Jordan', emoji: '🐡', email: 'jordan@example.com' },
]

// The clue revealed letter-by-letter. Spaces always visible.
export const CLUE_TEXT = 'EAST DOCK SHELF 3'

// Mock MCQ pool — in production these come from a Supabase edge function
export const MOCK_MCQ: MCQQuestion[] = [
  // ── "Who is it?" questions ──
  {
    id: 'w1',
    type: 'who-is-it',
    text: "Who said their ideal Saturday involves a road trip with no plan?",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Bruce 🦀',  isCorrect: false },
      { id: 'b', text: 'Alex 🐙',   isCorrect: false },
      { id: 'c', text: 'Sam 🦑',    isCorrect: true  },
      { id: 'd', text: 'Jordan 🐡', isCorrect: false },
    ],
  },
  {
    id: 'w2',
    type: 'who-is-it',
    text: "Who has cereal at midnight as their go-to comfort food?",
    aboutPlayer: 'Jordan',
    options: [
      { id: 'a', text: 'Alex 🐙',   isCorrect: false },
      { id: 'b', text: 'Jordan 🐡', isCorrect: true  },
      { id: 'c', text: 'Sam 🦑',    isCorrect: false },
      { id: 'd', text: 'Bruce 🦀',  isCorrect: false },
    ],
  },
  {
    id: 'w3',
    type: 'who-is-it',
    text: "Who leaves 47 browser tabs open at all times?",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Jordan 🐡', isCorrect: false },
      { id: 'b', text: 'Bruce 🦀',  isCorrect: false },
      { id: 'c', text: 'Alex 🐙',   isCorrect: false },
      { id: 'd', text: 'Sam 🦑',    isCorrect: true  },
    ],
  },
  {
    id: 'w4',
    type: 'who-is-it',
    text: "Who can draw realistic portraits as a hidden talent?",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Bruce 🦀',  isCorrect: false },
      { id: 'b', text: 'Sam 🦑',    isCorrect: true  },
      { id: 'c', text: 'Jordan 🐡', isCorrect: false },
      { id: 'd', text: 'Alex 🐙',   isCorrect: false },
    ],
  },
  // ── "About player" questions ──
  {
    id: 'q1',
    type: 'about-player',
    text: 'What is Alex most likely doing at 2am?',
    aboutPlayer: 'Alex',
    options: [
      { id: 'a', text: 'Doom-scrolling TikTok',  isCorrect: false },
      { id: 'b', text: 'Coding a side project',   isCorrect: true  },
      { id: 'c', text: 'Making a midnight snack', isCorrect: false },
      { id: 'd', text: 'Fast asleep',             isCorrect: false },
    ],
  },
  {
    id: 'q2',
    type: 'about-player',
    text: "What would Sam's dream Saturday look like?",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Hiking with no service',  isCorrect: false },
      { id: 'b', text: 'Gaming marathon at home', isCorrect: false },
      { id: 'c', text: 'Road trip with no plan',  isCorrect: true  },
      { id: 'd', text: 'Catching up on sleep',    isCorrect: false },
    ],
  },
  {
    id: 'q3',
    type: 'about-player',
    text: "If Jordan could only eat one food forever?",
    aboutPlayer: 'Jordan',
    options: [
      { id: 'a', text: 'Pizza',  isCorrect: false },
      { id: 'b', text: 'Tacos',  isCorrect: true  },
      { id: 'c', text: 'Ramen',  isCorrect: false },
      { id: 'd', text: 'Sushi',  isCorrect: false },
    ],
  },
  {
    id: 'q4',
    type: 'about-player',
    text: "What's Bruce's go-to hype song?",
    aboutPlayer: 'Bruce',
    options: [
      { id: 'a', text: 'Eye of the Tiger',          isCorrect: false },
      { id: 'b', text: 'Bohemian Rhapsody',          isCorrect: false },
      { id: 'c', text: 'HUMBLE. — Kendrick Lamar',   isCorrect: true  },
      { id: 'd', text: 'Mr. Brightside',             isCorrect: false },
    ],
  },
  {
    id: 'q5',
    type: 'about-player',
    text: "Which superpower would Alex secretly want?",
    aboutPlayer: 'Alex',
    options: [
      { id: 'a', text: 'Teleportation', isCorrect: true  },
      { id: 'b', text: 'Mind reading',  isCorrect: false },
      { id: 'c', text: 'Invisibility',  isCorrect: false },
      { id: 'd', text: 'Time travel',   isCorrect: false },
    ],
  },
  {
    id: 'q6',
    type: 'about-player',
    text: "Sam's hidden talent is most likely...",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Beatboxing',                    isCorrect: false },
      { id: 'b', text: "Speed-solving a Rubik's cube",  isCorrect: false },
      { id: 'c', text: 'Drawing realistic portraits',   isCorrect: true  },
      { id: 'd', text: 'Memorising capital cities',     isCorrect: false },
    ],
  },
  {
    id: 'q7',
    type: 'about-player',
    text: "What comfort food does Jordan reach for first?",
    aboutPlayer: 'Jordan',
    options: [
      { id: 'a', text: 'Instant ramen',      isCorrect: false },
      { id: 'b', text: 'Cereal at midnight', isCorrect: true  },
      { id: 'c', text: 'Frozen pizza',       isCorrect: false },
      { id: 'd', text: 'Peanut butter toast', isCorrect: false },
    ],
  },
  {
    id: 'q8',
    type: 'about-player',
    text: "How would Alex's friends describe them in one word?",
    aboutPlayer: 'Alex',
    options: [
      { id: 'a', text: 'Chaotic',  isCorrect: false },
      { id: 'b', text: 'Focused',  isCorrect: true  },
      { id: 'c', text: 'Dramatic', isCorrect: false },
      { id: 'd', text: 'Chill',    isCorrect: false },
    ],
  },
  {
    id: 'q9',
    type: 'about-player',
    text: "What would Bruce choose for a last meal?",
    aboutPlayer: 'Bruce',
    options: [
      { id: 'a', text: 'Sushi omakase',    isCorrect: false },
      { id: 'b', text: 'Loaded burgers',   isCorrect: true  },
      { id: 'c', text: 'Pasta carbonara',  isCorrect: false },
      { id: 'd', text: 'Chicken and rice', isCorrect: false },
    ],
  },
  {
    id: 'q10',
    type: 'about-player',
    text: "Sam's most chaotic habit is probably...",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Leaving 47 browser tabs open', isCorrect: true  },
      { id: 'b', text: 'Never charging their phone',    isCorrect: false },
      { id: 'c', text: 'Rearranging furniture at 1am',  isCorrect: false },
      { id: 'd', text: 'Buying every kitchen gadget',   isCorrect: false },
    ],
  },
]
