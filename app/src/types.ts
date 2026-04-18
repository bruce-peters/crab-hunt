export type GamePhase = 'LOGIN' | 'SELF_QUESTIONS' | 'WAITING' | 'GAME' | 'INSTRUCTIONS'

// DB game state (from Supabase realtime)
export type DbGameStatus = 'waiting' | 'active' | 'finished'

export interface AppUser {
  id: string
  name: string
  emoji: string
  isAdmin: boolean
}

export interface Player {
  id: string
  name: string
  emoji: string
  arrived: boolean
  answeredSelfQuestions: boolean
}

export interface SelfQuestion {
  id: string
  text: string
  placeholder: string
}

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface MCQQuestion {
  id: string
  text: string
  aboutPlayer: string
  options: QuestionOption[]
}
