import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { AppUser, SelfQuestion } from "../types";

interface SelfQuestionsScreenProps {
  user: AppUser;
  eventId: string;
  onComplete: () => void;
}

export function SelfQuestionsScreen({
  user,
  eventId,
  onComplete,
}: SelfQuestionsScreenProps) {
  const [questions, setQuestions] = useState<SelfQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch questions from edge function, then load any previously saved answers
  useEffect(() => {
    async function init() {
      // 1. Get questions from edge function
      const { data: qs, error: fnErr } = await supabase.functions.invoke<
        SelfQuestion[]
      >("get-self-questions");
      if (fnErr || !qs) {
        setError("Could not load questions. Please refresh.");
        setLoading(false);
        return;
      }
      setQuestions(qs);

      // 2. Pre-fill any answers this player already saved for this event
      const { data: saved } = await supabase
        .from("self_answers")
        .select("question, answer")
        .eq("player_id", user.id)
        .eq("event_id", eventId);

      setAnswers(
        qs.map((q) => saved?.find((r) => r.question === q.text)?.answer ?? "")
      );
      setLoading(false);
    }
    init();
  }, [user.id, eventId]);

  const allAnswered =
    questions.length > 0 && answers.every((a) => a.trim().length > 0);

  function handleChange(index: number, value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError("");

    const rows = questions.map((q, i) => ({
      player_id: user.id,
      event_id: eventId,
      question: q.text,
      answer: answers[i].trim(),
    }));

    const { error } = await supabase
      .from("self_answers")
      .upsert(rows, { onConflict: "player_id,event_id,question" });

    if (error) {
      setError("Failed to save answers. Please try again.");
      setSubmitting(false);
      return;
    }

    // Mark this player as having answered in the event
    const { data: event } = await supabase
      .from("events")
      .select("answered_player_ids")
      .eq("id", eventId)
      .single();

    const existing: string[] = event?.answered_player_ids ?? [];
    if (!existing.includes(user.id)) {
      await supabase
        .from("events")
        .update({ answered_player_ids: [...existing, user.id] })
        .eq("id", eventId);
    }

    onComplete();
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
        <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] p-6 animate-fade-in">
      <div className="mt-4 mb-8">
        <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-2">
          Hey {user.name} 👋
        </p>
        <h1 className="text-2xl font-bold text-white leading-tight">
          Tell us about yourself
        </h1>
        <p className="text-white/35 text-sm mt-2 leading-relaxed">
          Your crew will answer questions about you to unlock clues. Make it
          interesting.
        </p>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="flex flex-col gap-2 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
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
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
              className="w-full bg-white/[0.04] border border-white/15 rounded-2xl py-3 px-4
                         text-white placeholder-white/20 text-sm leading-relaxed resize-none
                         focus:outline-none focus:border-white/35 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="mt-8">
        {error && (
          <p className="text-red-400/80 text-xs text-center mb-3 animate-fade-in">
            {error}
          </p>
        )}
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
            ? "Your answers are saved to the crew database"
            : `${answers.filter((a) => a.trim()).length} of ${
                questions.length
              } answered`}
        </p>
      </div>
    </div>
  );
}
