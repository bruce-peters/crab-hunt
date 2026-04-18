import { CLUE_TEXT } from '../data/mockData'

interface InstructionsScreenProps {
  onBackToGame: () => void
}

export function InstructionsScreen({ onBackToGame }: InstructionsScreenProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      {/* Phase label */}
      <div className="flex items-center gap-3 mb-6 mt-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-mono text-white/30 tracking-widest uppercase">
          Phase 2
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Hero */}
      <div className="mb-8">
        <p className="text-5xl mb-4">🦀</p>
        <h1 className="text-3xl font-bold text-white leading-tight mb-3">
          You cracked it.
        </h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Head to the location, solve the final puzzle on the box, and claim your prize.
        </p>
      </div>

      {/* Clue card */}
      <div className="mb-6 p-5 rounded-2xl border border-white/25 bg-white/5">
        <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-3">
          Your clue
        </p>
        <p className="font-mono text-2xl font-bold text-white tracking-widest">
          {CLUE_TEXT}
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 mb-8">
        {[
          { step: '01', text: 'Head to the location described in the clue.' },
          { step: '02', text: 'Find the physical box — first team there wins.' },
          { step: '03', text: 'Solve the final puzzle on the box to open it.' },
          { step: '04', text: 'Claim your prize. 🎉' },
        ].map(({ step, text }) => (
          <div
            key={step}
            className="flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]"
          >
            <span className="font-mono text-white/25 text-xs flex-shrink-0 mt-0.5">{step}</span>
            <p className="text-white/70 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] mb-6">
        <p className="text-xs font-mono text-white/25 tracking-widest uppercase mb-1.5">
          Remember
        </p>
        <p className="text-white/45 text-sm leading-relaxed">
          Other crews are hunting too. First come, first served.
        </p>
      </div>

      {/* Back button */}
      <button
        onClick={onBackToGame}
        className="w-full py-4 rounded-2xl border border-white/15 text-white/40 font-medium text-sm
                   active:scale-[0.98] transition-all hover:border-white/30 hover:text-white/60"
      >
        ← Back to clue
      </button>

      <p className="text-center text-white/10 text-xs font-mono mt-6">
        Crab Hunt · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}
