import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateMCQs } from "../lib/utils";
import type { AppUser, MCQQuestion } from "../types";

interface GameScreenProps {
  user: AppUser;
  eventId: string;
  onNavigateToInstructions: () => void;
}

/** Pick a random underscore position in displayed_clue and reveal it from daily_clue. */
function revealOneRandom(dailyClue: string, displayedClue: string): string {
  const hiddenPositions: number[] = [];
  for (let i = 0; i < displayedClue.length; i++) {
    if (displayedClue[i] === "_") hiddenPositions.push(i);
  }
  if (hiddenPositions.length === 0) return displayedClue;
  const idx =
    hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)];
  return (
    displayedClue.slice(0, idx) + dailyClue[idx] + displayedClue.slice(idx + 1)
  );
}

function countRevealed(displayed: string): number {
  return displayed.split("").filter((c) => c !== "_" && c !== " ").length;
}

function countTotal(daily: string): number {
  return daily.split("").filter((c) => c !== " ").length;
}

export function GameScreen({
  user,
  eventId,
  onNavigateToInstructions,
}: GameScreenProps) {
  const [dailyClue, setDailyClue] = useState<string>("");
  const [displayedClue, setDisplayedClue] = useState<string>("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const [showInstructionsPrompt, setShowInstructionsPrompt] = useState(false);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loadingMCQs, setLoadingMCQs] = useState(true);
  const [mcqError, setMcqError] = useState<string | null>(null);
  const [loadingClue, setLoadingClue] = useState(true);
  // Keep a ref so the correct-answer handler always has fresh values without stale closure
  const clueRef = useRef({ daily: "", displayed: "" });

  // Load initial clue state + subscribe to realtime updates
  useEffect(() => {
    supabase
      .from("events")
      .select("daily_clue, displayed_clue")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setDailyClue(data.daily_clue ?? "");
          setDisplayedClue(data.displayed_clue ?? "");
          clueRef.current = {
            daily: data.daily_clue ?? "",
            displayed: data.displayed_clue ?? "",
          };
        }
        setLoadingClue(false);
      });

    const channel = supabase
      .channel(`game-clue-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const ev = payload.new as {
            displayed_clue?: string;
            daily_clue?: string;
          };
          if (ev.displayed_clue !== undefined) {
            setDisplayedClue(ev.displayed_clue);
            clueRef.current.displayed = ev.displayed_clue;
          }
          if (ev.daily_clue !== undefined) {
            setDailyClue(ev.daily_clue);
            clueRef.current.daily = ev.daily_clue;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    generateMCQs(user.id)
      .then(({ questions }) => {
        // Filter out questions about the current player — you shouldn't get quizzed about yourself
        const filtered = questions.filter(
          (q) => q.aboutPlayer.toLowerCase() !== user.name.toLowerCase()
        );
        setQuestions(filtered);
      })
      .catch((err) => setMcqError(err.message ?? "Failed to load questions"))
      .finally(() => setLoadingMCQs(false));
  }, [user.id, user.name]);

  // Cycle questions infinitely from the pool
  const question =
    questions.length > 0 ? questions[questionIndex % questions.length] : null;
  const correctOption = question?.options.find((o) => o.isCorrect);

  const totalLetters = dailyClue ? countTotal(dailyClue) : 0;
  const revealedLetters = displayedClue ? countRevealed(displayedClue) : 0;
  const revealPercent =
    totalLetters > 0 ? Math.round((revealedLetters / totalLetters) * 100) : 0;
  const allRevealed = totalLetters > 0 && revealedLetters >= totalLetters;

  async function handleCorrectAnswer() {
    const next = revealOneRandom(
      clueRef.current.daily,
      clueRef.current.displayed
    );
    // Optimistic update so the current player sees it instantly
    setDisplayedClue(next);
    clueRef.current.displayed = next;
    await supabase
      .from("events")
      .update({ displayed_clue: next })
      .eq("id", eventId);
  }

  function handleSelect(optionId: string) {
    if (showFeedback || !correctOption) return;
    setSelected(optionId);
    setShowFeedback(true);
    if (optionId === correctOption.id) {
      handleCorrectAnswer();
    }
  }

  function handleNext() {
    setShowFeedback(false);
    setSelected(null);
    setQuestionIndex((i) => i + 1);
  }

  const isCorrect = correctOption ? selected === correctOption.id : false;

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
            {loadingClue ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            ) : (
              displayedClue.split("").map((char, index) => {
                const isSpace = dailyClue[index] === " ";
                if (isSpace) {
                  return (
                    <span
                      key={index}
                      className="font-mono text-xl font-bold text-white/20 w-3 text-center select-none"
                    >
                      {"\u00A0"}
                    </span>
                  );
                }
                const isRevealed = char !== "_";
                return (
                  <span
                    key={index}
                    className={`font-mono text-2xl font-bold w-7 text-center transition-all duration-200 select-none ${
                      isRevealed ? "text-white" : "text-white/20"
                    }`}
                    style={
                      isRevealed
                        ? { animation: "letter-pop 0.3s ease-out" }
                        : undefined
                    }
                  >
                    {isRevealed ? char : "_"}
                  </span>
                );
              })
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-700"
              style={{ width: `${revealPercent}%` }}
            />
          </div>
        </div>

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
            <h2 className="text-xl font-bold text-white mb-2">
              Clue fully revealed!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              You cracked it. Time to move.
            </p>
            <button
              onClick={onNavigateToInstructions}
              className="w-full py-4 rounded-2xl border border-white text-white font-semibold
                         active:scale-[0.98] transition-all hover:bg-white/5"
            >
              Get final instructions →
            </button>
          </div>
        ) : loadingMCQs ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-mono">
              Generating questions…
            </p>
          </div>
        ) : mcqError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-red-400/80 text-sm">{mcqError}</p>
            <button
              onClick={() => {
                setMcqError(null);
                setLoadingMCQs(true);
                generateMCQs(user.id)
                  .then(({ questions }) => setQuestions(questions))
                  .catch((err) =>
                    setMcqError(err.message ?? "Failed to load questions")
                  )
                  .finally(() => setLoadingMCQs(false));
              }}
              className="px-4 py-2 rounded-xl border border-white/20 text-white/50 text-sm active:scale-[0.98]"
            >
              Retry
            </button>
          </div>
        ) : question && correctOption ? (
          <>
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-white/30 tracking-widest uppercase">
                About {question.aboutPlayer}
              </p>
              <p className="text-xs font-mono text-white/20">
                Q{(questionIndex % questions.length) + 1}/{questions.length}
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
              {question.options.map((option) => {
                let cls = "btn-option";
                if (showFeedback) {
                  if (option.isCorrect) cls = "btn-option btn-option-correct";
                  else cls = "btn-option btn-option-wrong";
                } else if (selected === option.id) {
                  cls = "btn-option btn-option-selected";
                }
                return (
                  <button
                    key={option.id}
                    className={cls}
                    onClick={() => handleSelect(option.id)}
                  >
                    <span className="font-mono text-white/25 mr-3 text-xs">
                      {option.id.toUpperCase()}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className="mt-4 animate-slide-up">
                <div
                  className={`mb-3 p-3.5 rounded-2xl border text-sm font-medium ${
                    isCorrect
                      ? "border-green-400/40 bg-green-400/10 text-green-300"
                      : "border-red-400/25 bg-red-400/[0.06] text-red-300/80"
                  }`}
                >
                  {isCorrect
                    ? `✓ Correct! A letter was revealed.`
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
        ) : null}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-2">Ready to go?</h2>
            <p className="text-white/45 text-sm leading-relaxed mb-6">
              You can still come back and answer more questions to reveal the
              clue further. Or head to the instructions now.
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
  );
}
