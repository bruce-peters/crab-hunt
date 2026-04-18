import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { AppUser, Player } from "../types";

interface WaitingScreenProps {
  user: AppUser;
  eventId: string;
  onGameStart: () => void;
}

export function WaitingScreen({
  user,
  eventId,
  onGameStart,
}: WaitingScreenProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPlayers(playerIds: string[], answeredIds: string[]) {
    if (playerIds.length === 0) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("players")
      .select("id, name, emoji")
      .in("id", playerIds);
    if (data) {
      setPlayers(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          arrived: true,
          answeredSelfQuestions: answeredIds.includes(p.id),
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase
      .from("events")
      .select("player_ids, answered_player_ids")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data)
          loadPlayers(data.player_ids ?? [], data.answered_player_ids ?? []);
        else setLoading(false);
      });

    const channel = supabase
      .channel(`event-lobby-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const { player_ids, answered_player_ids, is_started, status } =
            payload.new as {
              player_ids: string[];
              answered_player_ids: string[];
              is_started: boolean;
              status: string;
            };
          if (is_started || status === "active") {
            onGameStart();
            return;
          }
          loadPlayers(player_ids ?? [], answered_player_ids ?? []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const answeredCount = players.filter((p) => p.answeredSelfQuestions).length;
  const allAnswered = players.length > 0 && answeredCount === players.length;

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
        <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

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
          Everyone needs to answer their questions before we start.
        </p>
      </div>

      {/* Questions answered counter */}
      <div className="mb-6 p-4 rounded-2xl border border-white/15 bg-white/[0.03]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/50">Questions answered</span>
          <span className="font-mono font-bold text-white text-lg">
            {answeredCount} / {players.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-700 ease-out"
            style={{
              width:
                players.length > 0
                  ? `${(answeredCount / players.length) * 100}%`
                  : "0%",
            }}
          />
        </div>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-3 flex-1">
        {players.map((player) => {
          const isCurrentUser = player.id === user.id;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${
                player.answeredSelfQuestions
                  ? "border-white/25 bg-white/5"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <div
                className={`text-2xl w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-500 ${
                  player.answeredSelfQuestions ? "opacity-100" : "opacity-30"
                }`}
              >
                {player.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold text-sm transition-colors duration-500 ${
                      player.answeredSelfQuestions
                        ? "text-white"
                        : "text-white/40"
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
                  {player.answeredSelfQuestions
                    ? "Questions done ✓"
                    : "Answering questions..."}
                </p>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-700 ${
                  player.answeredSelfQuestions
                    ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                    : "bg-white/15 animate-pulse-slow"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-6">
        {allAnswered ? (
          <button
            onClick={async () => {
              await supabase
                .from("events")
                .update({ is_started: true, status: "active" })
                .eq("id", eventId);
              onGameStart();
            }}
            className="w-full py-4 rounded-2xl border border-white text-white font-semibold text-base
                       active:scale-[0.98] transition-all hover:bg-white/5 animate-slide-up"
          >
            Start the hunt 🦀
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl border border-white/10 text-center">
            <p className="text-white/25 text-sm font-medium">
              Waiting for {players.length - answeredCount} more player
              {players.length - answeredCount !== 1 ? "s" : ""} to answer...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
