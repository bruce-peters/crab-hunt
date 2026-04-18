import { useState, useEffect } from 'react'
import { CLUE_TEXT, MOCK_MCQ } from '../data/mockData'
import type { AppUser } from '../types'

interface GameScreenProps {
  user: AppUser
  onNavigateToInstructions: () => void
}

// Build clue structure
function buildClue(text: string) {
  return text.split('').map((char, index) => ({
    index,
    char,
    alwaysVisible: char === ' ',
  }))
}

const CLUE_CHARS = buildClue(CLUE_TEXT)
const LETTER_INDICES = CLUE_CHARS.filter(c => !c.alwaysVisible).map(c => c.index)

export function GameScreen({ onNavigateToInstructions }: GameScreenProps) {
  const [revealed, setRevealed]           = useState<Set<number>>(new Set())
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected]           = useState<string | null>(null)
  const [showFeedback, setShowFeedback]   = useState(false)
  const [showHint, setShowHint]           = useState(false)
  const [showInstructionsPrompt, setShowInstructionsPrompt] = useState(false)

  // Cycle questions infinitely from the pool of 10
  const question = MOCK_MCQ[questionIndex % MOCK_MCQ.length]
  const correctOption = question.options.find(o => o.isCorrect)!

  const lettersPerCorrect = 2
  const revealPercent = Math.round((revealed.size / LETTER_INDICES.length) * 100)
  const allRevealed = LETTER_INDICES.every(i => revealed.has(i))

  function revealLetters(count: number) {
    setRevealed(prev => {
      const next = new Set(prev)
      let added = 0
      for (const idx of LETTER_INDICES) {
        if (!next.has(idx) && added < count) {
          next.add(idx)
          added++
        }
      }
      return next
    })
  }

  function handleSelect(optionId: string) {
    if (showFeedback) return
    setSelected(optionId)
    setShowFeedback(true)
    if (optionId === correctOption.id) {
      revealLetters(lettersPerCorrect)
    }
  }

  function handleNext() {
    setShowFeedback(false)
    setSelected(null)
    setQuestionIndex(i => i + 1)
  }

  // Show hint after first correct answer
  useEffect(() => {
    if (revealed.size > 0) setShowHint(true)
  }, [revealed.size])

  const isCorrect = selected === correctOption.id

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] animate-fade-in">
      {/* ── TOP: Clue section ── */}
      <div className="p-6 pb-4">
        {/* Phase label */}
        <div className="flex items-center gap-3 mb-5 mt-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-mono text-white/30 tracking-widest uppercase">
            Phase 1 · Reveal the clue
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Clue display card */}
        <div className="p-5 rounded-2xl border border-white/15 bg-white/[0.03]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono text-white/30 tracking-widest uppercase">
              The clue
            </p>
            <span className="text-xs font-mono text-white/30">
              {revealPercent}%
            </span>
          </div>

          {/* Letters */}
          <div className="flex flex-wrap gap-x-1 gap-y-2 items-end mb-4 min-h-[40px]">
            {CLUE_CHARS.map(({ index, char, alwaysVisible }) => {
              const isRevealed = alwaysVisible || revealed.has(index)
              if (alwaysVisible) {
                return (
                  <span key={index} className="font-mono text-xl font-bold text-white/20 w-3 text-center select-none">
                    {'\u00A0'}
                  </span>
                )
              }
              return (
                <span
                  key={index}
                  className={`font-mono text-2xl font-bold w-7 text-center transition-all duration-200 select-none ${
                    isRevealed ? 'text-white' : 'text-white/20'
                  }`}
                  style={isRevealed ? { animation: 'letter-pop 0.3s ease-out' } : undefined}
                >
                  {isRevealed ? char : '_'}
                </span>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-700"
              style={{ width: `${revealPercent}%` }}
            />
          </div>
        </div>

        {/* AI hint */}
        {showHint && (
          <div className="mt-3 p-4 rounded-2xl border border-white/8 bg-white/[0.02] animate-slide-up">
            <p className="text-xs font-mono text-white/25 tracking-widest uppercase mb-1.5">
              AI Hint
            </p>
            <p className="text-white/50 text-sm leading-relaxed">
              "Think waterfront. Where boats rest and ropes tie. Something nearby stores more than cargo — it stores knowledge."
            </p>
          </div>
        )}

        {/* "I think I know" button */}
        <button
          onClick={() => setShowInstructionsPrompt(true)}
          className="mt-3 w-full py-3 rounded-2xl border border-white/15 text-white/40 text-sm font-medium
                     active:scale-[0.98] transition-all hover:border-white/30 hover:text-white/60"
        >
          I think I know where to go →
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/8 mx-6" />

      {/* ── BOTTOM: MCQ section ── */}
      <div className="flex flex-col flex-1 p-6 pt-5">
        {allRevealed ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-slide-up text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="text-xl font-bold text-white mb-2">Clue fully revealed!</h2>
            <p className="text-white/40 text-sm mb-6">You cracked it. Time to move.</p>
            <button
              onClick={onNavigateToInstructions}
              className="w-full py-4 rounded-2xl border border-white text-white font-semibold
                         active:scale-[0.98] transition-all hover:bg-white/5"
            >
              Get final instructions →
            </button>
          </div>
        ) : (
          <>
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-white/30 tracking-widest uppercase">
                About {question.aboutPlayer}
              </p>
              <p className="text-xs font-mono text-white/20">
                Q{(questionIndex % MOCK_MCQ.length) + 1}/{MOCK_MCQ.length}
              </p>
            </div>

            {/* Question text */}
            <div className="mb-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
              <p className="text-white font-semibold text-base leading-snug">
                {question.text}
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2.5 flex-1">
              {question.options.map(option => {
                let cls = 'btn-option'
                if (showFeedback) {
                  if (option.isCorrect) cls = 'btn-option btn-option-correct'
                  else cls = 'btn-option btn-option-wrong'
                } else if (selected === option.id) {
                  cls = 'btn-option btn-option-selected'
                }
                return (
                  <button key={option.id} className={cls} onClick={() => handleSelect(option.id)}>
                    <span className="font-mono text-white/25 mr-3 text-xs">{option.id.toUpperCase()}</span>
                    {option.text}
                  </button>
                )
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className="mt-4 animate-slide-up">
                <div
                  className={`mb-3 p-3.5 rounded-2xl border text-sm font-medium ${
                    isCorrect
                      ? 'border-green-400/40 bg-green-400/10 text-green-300'
                      : 'border-red-400/25 bg-red-400/[0.06] text-red-300/80'
                  }`}
                >
                  {isCorrect
                    ? `✓ Correct! ${lettersPerCorrect} letters revealed.`
                    : `✗ The answer was "${correctOption.text}".`}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl border border-white/25 text-white font-semibold text-sm
                             active:scale-[0.98] transition-all hover:bg-white/5"
                >
                  Next question →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions confirmation sheet */}
      {showInstructionsPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowInstructionsPrompt(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md mx-auto p-6 pb-10 bg-[#111] border-t border-x border-white/15 rounded-t-3xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-2">Ready to go?</h2>
            <p className="text-white/45 text-sm leading-relaxed mb-6">
              You can still come back and answer more questions to reveal the clue further.
              Or head to the instructions now.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onNavigateToInstructions}
                className="w-full py-4 rounded-2xl border border-white text-white font-semibold
                           active:scale-[0.98] transition-all hover:bg-white/5"
              >
                Take me to instructions →
              </button>
              <button
                onClick={() => setShowInstructionsPrompt(false)}
                className="w-full py-3.5 rounded-2xl border border-white/15 text-white/50 font-medium text-sm
                           active:scale-[0.98] transition-all hover:bg-white/5"
              >
                Keep answering questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
