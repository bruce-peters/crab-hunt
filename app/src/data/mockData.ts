import type { Player, SelfQuestion, MCQQuestion } from '../types'

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

// The clue revealed letter-by-letter. Spaces always visible.
export const CLUE_TEXT = 'EAST DOCK SHELF 3'

// Mock MCQ pool — in production these come from a Supabase edge function
export const MOCK_MCQ: MCQQuestion[] = [
  {
    id: 'q1',
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
    text: "Sam's hidden talent is most likely...",
    aboutPlayer: 'Sam',
    options: [
      { id: 'a', text: 'Beatboxing',             isCorrect: false },
      { id: 'b', text: 'Speed-solving a Rubik\'s cube', isCorrect: false },
      { id: 'c', text: 'Drawing realistic portraits', isCorrect: true },
      { id: 'd', text: 'Memorising capital cities',   isCorrect: false },
    ],
  },
  {
    id: 'q7',
    text: "What comfort food does Jordan reach for first?",
    aboutPlayer: 'Jordan',
    options: [
      { id: 'a', text: 'Instant ramen',     isCorrect: false },
      { id: 'b', text: 'Cereal at midnight', isCorrect: true  },
      { id: 'c', text: 'Frozen pizza',      isCorrect: false },
      { id: 'd', text: 'Peanut butter toast', isCorrect: false },
    ],
  },
  {
    id: 'q8',
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
