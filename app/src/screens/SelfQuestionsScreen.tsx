import { useState } from 'react'
import { SELF_QUESTIONS } from '../data/mockData'
import type { AppUser } from '../types'

interface SelfQuestionsScreenProps {
  user: AppUser
  onComplete: (answers: string[]) => void
}

export function SelfQuestionsScreen({ user, onComplete }: SelfQuestionsScreenProps) {
  const [answers, setAnswers] = useState<string[]>(SELF_QUESTIONS.map(() => ''))
  const [submitting, setSubmitting] = useState(false)

  const allAnswered = answers.every(a => a.trim().length > 0)

  function handleChange(index: number, value: string) {
    setAnswers(prev => prev.map((a, i) => (i === index ? value : a)))
  }

  async function handleSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    // Simulate Supabase upsert
    await new Promise(r => setTimeout(r, 700))
    onComplete(answers)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      {/* Header */}
      <div className="mt-4 mb-8">
        <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-2">
          Hey {user.name} 👋
        </p>
        <h1 className="text-2xl font-bold text-white leading-tight">
          Tell us about yourself
        </h1>
        <p className="text-white/35 text-sm mt-2 leading-relaxed">
          Your crew will answer questions about you to unlock clues. Make it interesting.
        </p>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-6 flex-1">
        {SELF_QUESTIONS.map((q, i) => (
          <div key={q.id} className="flex flex-col gap-2 animate-slide-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
            <label className="flex items-start gap-3">
              <span className="font-mono text-white/25 text-xs mt-0.5 flex-shrink-0 pt-0.5">
                0{i + 1}
              </span>
              <span className="text-white font-semibold text-sm leading-snug">
                {q.text}
              </span>
            </label>
            <textarea
              value={answers[i]}
              onChange={e => handleChange(i, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
              className="w-full bg-white/[0.04] border border-white/15 rounded-2xl py-3 px-4
                         text-white placeholder-white/20 text-sm leading-relaxed resize-none
                         focus:outline-none focus:border-white/35 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full py-4 rounded-2xl border border-white text-white font-semibold text-base
                     active:scale-[0.98] transition-all hover:bg-white/5
                     disabled:border-white/15 disabled:text-white/20 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving answers...
            </span>
          ) : (
            "I'm ready →"
          )}
        </button>
        <p className="text-center text-white/20 text-xs mt-3">
          {allAnswered
            ? 'Your answers are saved to the crew database'
            : `${answers.filter(a => a.trim()).length} of ${SELF_QUESTIONS.length} answered`}
        </p>
      </div>
    </div>
  )
}
