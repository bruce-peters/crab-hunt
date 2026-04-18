import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { GamePhase, AppUser } from './types'
import { supabase } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { SelfQuestionsScreen } from './screens/SelfQuestionsScreen'
import { WaitingScreen } from './screens/WaitingScreen'
import { GameScreen } from './screens/GameScreen'
import { InstructionsScreen } from './screens/InstructionsScreen'

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('LOGIN')
  const [user, setUser]   = useState<AppUser | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadPlayer(session.user)
      } else {
        setBooting(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadPlayer(session.user)
      } else {
        setUser(null)
        setPhase('LOGIN')
        setBooting(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadPlayer(authUser: User) {
    const { data: player } = await supabase
      .from('players')
      .select('id, name, emoji')
      .eq('user_id', authUser.id)
      .single()

    if (player) {
      setUser({ id: player.id, name: player.name, emoji: player.emoji })
      setPhase('SELF_QUESTIONS')
    }
    setBooting(false)
  }

  if (booting) {
    return (
      <div className="max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
        <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-dvh">
        <LoginScreen />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-dvh">
      {phase === 'SELF_QUESTIONS' && (
        <SelfQuestionsScreen
          user={user}
          onComplete={() => setPhase('WAITING')}
        />
      )}
      {phase === 'WAITING' && (
        <WaitingScreen
          user={user}
          onGameStart={() => setPhase('GAME')}
        />
      )}
      {phase === 'GAME' && (
        <GameScreen
          user={user}
          onNavigateToInstructions={() => setPhase('INSTRUCTIONS')}
        />
      )}
      {phase === 'INSTRUCTIONS' && (
        <InstructionsScreen
          onBackToGame={() => setPhase('GAME')}
        />
      )}
    </div>
  )
}
