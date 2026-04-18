import { useEffect, useState } from 'react'
import { MOCK_PLAYERS } from '../data/mockData'
import type { AppUser, Player } from '../types'

interface WaitingScreenProps {
  user: AppUser
  onGameStart: () => void
}

export function WaitingScreen({ user, onGameStart }: WaitingScreenProps) {
  const [players, setPlayers] = useState<Player[]>(
    // Mark current user as already arrived
    MOCK_PLAYERS.map(p =>
      p.id === user.id.toLowerCase() || p.name.toLowerCase() === user.name.toLowerCase()
        ? { ...p, arrived: true }
        : p
    )
  )

  // Simulate other players arriving one by one
  useEffect(() => {
    const pending = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.arrived)

    const timers = pending.map(({ i }, order) =>
      setTimeout(() => {
        setPlayers(prev =>
          prev.map((pl, idx) => (idx === i ? { ...pl, arrived: true } : pl))
        )
      }, (order + 1) * 1800)
    )
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const arrivedCount = players.filter(p => p.arrived).length
  const allArrived   = arrivedCount === players.length

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8 mt-4">
        <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-2">
          Crab Hunt
        </p>
        <h1 className="text-3xl font-bold text-white leading-tight">
          Waiting for the crew
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          Everyone needs to be here before we start.
        </p>
      </div>

      {/* Arrival counter */}
      <div className="mb-6 p-4 rounded-2xl border border-white/15 bg-white/[0.03]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/50">Players arrived</span>
          <span className="font-mono font-bold text-white text-lg">
            {arrivedCount} / {players.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-700 ease-out"
            style={{ width: `${(arrivedCount / players.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-3 flex-1">
        {players.map(player => {
          const isCurrentUser = player.name.toLowerCase() === user.name.toLowerCase()
          return (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${
                player.arrived
                  ? 'border-white/25 bg-white/5'
                  : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              <div
                className={`text-2xl w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-500 ${
                  player.arrived ? 'opacity-100' : 'opacity-20'
                }`}
              >
                {player.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold text-sm transition-colors duration-500 ${
                      player.arrived ? 'text-white' : 'text-white/25'
                    }`}
                  >
                    {player.name}
                  </p>
                  {isCurrentUser && (
                    <span className="text-[10px] font-mono text-white/30 border border-white/15 rounded-full px-1.5 py-0.5">
                      you
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/30 mt-0.5">
                  {player.arrived
                    ? player.answeredSelfQuestions
                      ? 'Here · questions done ✓'
                      : 'Here'
                    : 'On the way...'}
                </p>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-700 ${
                  player.arrived
                    ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                    : 'bg-white/15 animate-pulse-slow'
                }`}
              />
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="mt-6">
        {allArrived ? (
          <button
            onClick={onGameStart}
            className="w-full py-4 rounded-2xl border border-white text-white font-semibold text-base
                       active:scale-[0.98] transition-all hover:bg-white/5 animate-slide-up"
          >
            Start the hunt 🦀
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl border border-white/10 text-center">
            <p className="text-white/25 text-sm font-medium">
              Waiting for {players.length - arrivedCount} more player{players.length - arrivedCount !== 1 ? 's' : ''}...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
