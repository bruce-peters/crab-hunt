import { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { GamePhase, AppUser } from "./types";
import { supabase } from "./lib/supabase";
import { clearMCQCache } from "./lib/utils";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { SelfQuestionsScreen } from "./screens/SelfQuestionsScreen";
import { WaitingScreen } from "./screens/WaitingScreen";
import { GameScreen } from "./screens/GameScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { AdminDashboard } from "./screens/AdminDashboard";
import { SuccessScreen } from "./screens/SuccessScreen";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("LOGIN");
  const [user, setUser] = useState<AppUser | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventEntry, setEventEntry] = useState<{
    alreadyAnswered: boolean;
    isStarted: boolean;
  } | null>(null);
  const [booting, setBooting] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Keep a ref to the current player id so realtime callbacks can read it
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadPlayer(session.user);
      } else {
        setBooting(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadPlayer(session.user);
      } else {
        setUser(null);
        setPhase("LOGIN");
        setBooting(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Clear MCQ cache when the current event is reset (is_started → false)
  useEffect(() => {
    const channel = supabase
      .channel("event-reset-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (payload) => {
          const updated = payload.new as {
            is_started?: boolean;
            status?: string;
          };
          if (updated.is_started === false && playerIdRef.current) {
            clearMCQCache(playerIdRef.current);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Watch the current event for status changes (active → game, completed → success)
  // Uses an eventId filter so it works correctly under RLS.
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`event-status-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as {
            is_started?: boolean;
            status?: string;
            answered_player_ids?: string[];
          };
          if (updated.status === "completed") {
            setPhase("SUCCESS");
          }
          if (updated.status === "active" || updated.is_started === true) {
            setEventEntry((prev) =>
              prev ? { ...prev, isStarted: true } : prev
            );
            setPhase((prev) =>
              prev === "WAITING" ||
              prev === "SELF_QUESTIONS" ||
              prev === "DASHBOARD"
                ? "GAME"
                : prev
            );
          }
          if (
            updated.answered_player_ids !== undefined &&
            playerIdRef.current
          ) {
            const answered = updated.answered_player_ids.includes(
              playerIdRef.current
            );
            setEventEntry((prev) =>
              prev ? { ...prev, alreadyAnswered: answered } : prev
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Subscribe to new events being inserted — update the dashboard so the player can choose to enter
  useEffect(() => {
    const channel = supabase
      .channel("global-new-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        async (payload) => {
          const newEventId = (payload.new as { id: string }).id;
          const pid = playerIdRef.current;
          if (!pid) return;
          // Fetch the new event and update dashboard state without auto-joining
          const { data: ev } = await supabase
            .from("events")
            .select("id, answered_player_ids, is_started")
            .eq("id", newEventId)
            .single();
          if (!ev) return;
          setEventId(newEventId);
          setEventEntry({
            alreadyAnswered: (ev.answered_player_ids ?? []).includes(pid),
            isStarted: ev.is_started ?? false,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPlayer(authUser: User) {
    const { data: player } = await supabase
      .from("players")
      .select("id, name, emoji, is_admin")
      .eq("user_id", authUser.id)
      .single();

    if (player) {
      playerIdRef.current = player.id;
      setUser({
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        isAdmin: player.is_admin ?? false,
      });
      const result = await loadOrCreateEvent(player.id);
      if (result) {
        setEventId(result.eventId);
        setEventEntry({
          alreadyAnswered: result.alreadyAnswered,
          isStarted: result.isStarted,
        });
        setPhase("DASHBOARD");
      }
    }
    setBooting(false);
  }

  async function loadOrCreateEvent(playerId: string): Promise<{
    eventId: string;
    alreadyAnswered: boolean;
    isStarted: boolean;
  } | null> {
    // Always use the globally most recent event so all players see the same session.
    // Read-only — joining (player_ids) happens only when the player clicks "Enter event".
    const { data: latest } = await supabase
      .from("events")
      .select("id, player_ids, answered_player_ids, is_started")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) return null;

    const alreadyAnswered = (latest.answered_player_ids ?? []).includes(playerId);
    return {
      eventId: latest.id,
      alreadyAnswered,
      isStarted: latest.is_started ?? false,
    };
  }
  async function handleEnterEvent() {
    if (!eventEntry || !eventId || !user) return;
    // Join the event (add to player_ids) now that the player has chosen to enter
    const { data: ev } = await supabase
      .from("events")
      .select("player_ids")
      .eq("id", eventId)
      .single();
    if (ev && !(ev.player_ids ?? []).includes(user.id)) {
      await supabase
        .from("events")
        .update({ player_ids: [...(ev.player_ids ?? []), user.id] })
        .eq("id", eventId);
    }
    if (eventEntry.isStarted) {
      setPhase("GAME");
    } else {
      setPhase(eventEntry.alreadyAnswered ? "WAITING" : "SELF_QUESTIONS");
    }
  }

  if (booting) {
    return (
      <div className="w-full max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
        <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto min-h-dvh">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-dvh">
      {/* Floating admin button */}
      {user.isAdmin && (
        <button
          onClick={() => setShowAdmin(true)}
          className="fixed top-4 right-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white/8 border border-white/15 text-white/50 hover:bg-white/15 hover:border-white/30 hover:text-white/80 transition-all active:scale-95 text-base"
          title="Admin dashboard"
        >
          ⚙
        </button>
      )}

      {/* Admin dashboard overlay */}
      {showAdmin && (
        <AdminDashboard
          currentEventId={eventId}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {phase === "DASHBOARD" && (
        <DashboardScreen
          user={user}
          currentEventId={eventId}
          eventEntry={eventEntry}
          onEnterEvent={handleEnterEvent}
        />
      )}
      {phase === "SELF_QUESTIONS" && (
        <SelfQuestionsScreen
          user={user}
          eventId={eventId!}
          onComplete={() => setPhase("WAITING")}
        />
      )}
      {phase === "WAITING" && (
        <WaitingScreen
          user={user}
          eventId={eventId!}
          onGameStart={() => setPhase("GAME")}
        />
      )}
      {phase === "GAME" && (
        <GameScreen
          user={user}
          eventId={eventId!}
          onNavigateToInstructions={() => setPhase("INSTRUCTIONS")}
          onNavigateToDashboard={() => setPhase("DASHBOARD")}
        />
      )}
      {phase === "INSTRUCTIONS" && (
        <InstructionsScreen onBackToGame={() => setPhase("GAME")} />
      )}
      {phase === "SUCCESS" && user && (
        <SuccessScreen
          user={user}
          onBackToDashboard={() => setPhase("DASHBOARD")}
        />
      )}
    </div>
  );
}
