import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CLUE_TEXT } from "../data/mockData";

interface EventRow {
  id: string;
  status: string;
  daily_clue: string | null;
  player_ids: string[];
  answered_player_ids: string[];
  created_at: string;
}

interface AdminDashboardProps {
  currentEventId: string | null;
  onClose: () => void;
}

function initDisplayedClue(clue: string): string {
  return clue
    .split("")
    .map((c) => (c === " " ? " " : "_"))
    .join("");
}

export function AdminDashboard({
  currentEventId,
  onClose,
}: AdminDashboardProps) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [newClue, setNewClue] = useState("");
  const [clueSeeded, setClueSeeded] = useState(false);
  const [newEventClue, setNewEventClue] = useState(CLUE_TEXT);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadEvent();
  }, [currentEventId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvent() {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select(
        "id, status, daily_clue, player_ids, answered_player_ids, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setEvent(data);
      if (!clueSeeded) {
        setNewClue(data.daily_clue ?? CLUE_TEXT);
        setClueSeeded(true);
      }
    }
    setLoading(false);
  }

  function flash(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleResetProgress() {
    if (!event) return;
    setActionLoading("reset");
    const clue = event.daily_clue ?? CLUE_TEXT;
    const { error } = await supabase
      .from("events")
      .update({
        answered_player_ids: [],
        displayed_clue: initDisplayedClue(clue),
        cached_mcqs: null,
        status: "waiting",
        is_started: false,
      })
      .eq("id", event.id);
    if (error) flash("error", error.message);
    else {
      flash("success", "Event progress reset ✓");
      loadEvent();
    }
    setActionLoading(null);
  }

  async function handleChangeClue() {
    if (!event || !newClue.trim()) return;
    setActionLoading("clue");
    const clue = newClue.trim();
    const { error } = await supabase
      .from("events")
      .update({
        daily_clue: clue,
        displayed_clue: initDisplayedClue(clue),
        cached_mcqs: null,
      })
      .eq("id", event.id);
    if (error) flash("error", error.message);
    else {
      flash("success", "Clue updated ✓");
      setEvent((prev) => (prev ? { ...prev, daily_clue: clue } : prev));
      setNewClue(clue);
    }
    setActionLoading(null);
  }

  async function handleNewEvent() {
    setActionLoading("new");
    const clue = newEventClue.trim() || CLUE_TEXT;
    const { data, error } = await supabase
      .from("events")
      .insert({
        player_ids: [],
        daily_clue: clue,
        displayed_clue: initDisplayedClue(clue),
        status: "waiting",
        answered_player_ids: [],
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) {
      flash("error", error?.message ?? "Failed to create event");
      setActionLoading(null);
    } else {
      window.location.reload();
    }
  }

  const statusColor =
    event?.status === "active"
      ? "text-green-400"
      : event?.status === "finished"
      ? "text-white/30"
      : "text-yellow-400";

  return (
    /* Overlay backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-3xl p-6 pb-10 animate-slide-up max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">
              Admin
            </p>
            <h2 className="text-xl font-bold text-white">Event Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/40 hover:text-white hover:bg-white/15 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Toast */}
        {message && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${
              message.type === "success"
                ? "bg-green-400/10 border-green-400/30 text-green-300"
                : "bg-red-400/10 border-red-400/30 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : event ? (
          <div className="flex flex-col gap-6">
            {/* Current event info */}
            <section className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                Current Event
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Status</span>
                <span className={`font-medium capitalize ${statusColor}`}>
                  {event.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Players</span>
                <span className="text-white/80">
                  {event.player_ids?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Answered</span>
                <span className="text-white/80">
                  {event.answered_player_ids?.length ?? 0} /{" "}
                  {event.player_ids?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Created</span>
                <span className="text-white/50 font-mono text-xs">
                  {new Date(event.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="pt-1">
                <p className="text-xs text-white/30 mb-1">Clue</p>
                <p className="text-white/60 text-sm leading-relaxed break-words">
                  {event.daily_clue ?? "—"}
                </p>
              </div>
            </section>

            {/* Reset Progress */}
            <section>
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                Reset Progress
              </p>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Clears all player answers, hides the clue again, and removes
                cached MCQs. Players stay in the event.
              </p>
              <button
                onClick={handleResetProgress}
                disabled={actionLoading !== null}
                className="w-full py-3.5 px-5 rounded-2xl border border-orange-400/40 bg-orange-400/8 text-orange-300 font-medium text-sm hover:bg-orange-400/15 hover:border-orange-400/60 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === "reset" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-orange-300/30 border-t-orange-300/80 rounded-full animate-spin" />
                    Resetting…
                  </span>
                ) : (
                  "↺  Reset event progress"
                )}
              </button>
            </section>

            {/* Change Clue */}
            <section>
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                Change Clue
              </p>

              {/* Current clue read-only */}
              <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 mb-1">
                <p className="text-xs text-white/30 mb-1.5">Current</p>
                <p className="text-white/60 text-sm leading-relaxed break-words">
                  {event.daily_clue ?? "—"}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-1 text-white/20 text-lg">
                ↓
              </div>

              {/* New clue input */}
              <textarea
                value={newClue}
                onChange={(e) => setNewClue(e.target.value)}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/12 rounded-2xl px-4 py-3 text-white text-sm resize-none placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors mb-3 caret-white"
                placeholder="Type replacement clue…"
              />

              <button
                onClick={handleChangeClue}
                disabled={
                  actionLoading !== null ||
                  !newClue.trim() ||
                  newClue.trim() === (event.daily_clue ?? "").trim()
                }
                className="w-full py-3.5 px-5 rounded-2xl border border-white/20 bg-white/6 text-white/80 font-medium text-sm hover:bg-white/10 hover:border-white/40 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === "clue" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "✎  Save new clue"
                )}
              </button>
            </section>

            {/* New Event */}
            <section>
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
                New Event
              </p>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Creates a fresh event. All players will be re-routed to the new
                event on their next interaction.
              </p>

              {/* Clue for new event */}
              <textarea
                value={newEventClue}
                onChange={(e) => setNewEventClue(e.target.value)}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/12 rounded-2xl px-4 py-3 text-white text-sm resize-none placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors mb-3 caret-white"
                placeholder="Secret clue for new event…"
              />

              <button
                onClick={handleNewEvent}
                disabled={actionLoading !== null}
                className="w-full py-3.5 px-5 rounded-2xl border border-white/20 bg-white/6 text-white/80 font-medium text-sm hover:bg-white/10 hover:border-white/40 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === "new" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : (
                  "＋  Create new event"
                )}
              </button>
            </section>
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-8">
            No event found.
          </p>
        )}
      </div>
    </div>
  );
}
