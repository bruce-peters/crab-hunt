import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { GamePhase, AppUser } from "./types";
import { supabase } from "./lib/supabase";
import { CLUE_TEXT } from "./data/mockData";

function initDisplayedClue(clue: string): string {
  return clue
    .split("")
    .map((c) => (c === " " ? " " : "_"))
    .join("");
}
import { LoginScreen } from "./screens/LoginScreen";
import { SelfQuestionsScreen } from "./screens/SelfQuestionsScreen";
import { WaitingScreen } from "./screens/WaitingScreen";
import { GameScreen } from "./screens/GameScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("LOGIN");
  const [user, setUser] = useState<AppUser | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

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

  async function loadPlayer(authUser: User) {
    const { data: player } = await supabase
      .from("players")
      .select("id, name, emoji")
      .eq("user_id", authUser.id)
      .single();

    if (player) {
      setUser({ id: player.id, name: player.name, emoji: player.emoji });
      const result = await loadOrCreateEvent(player.id);
      if (result) {
        setEventId(result.eventId);
        if (result.isStarted) {
          setPhase("GAME");
        } else {
          setPhase(result.alreadyAnswered ? "WAITING" : "SELF_QUESTIONS");
        }
      }
    }
    setBooting(false);
  }

  async function loadOrCreateEvent(
    playerId: string
  ): Promise<{
    eventId: string;
    alreadyAnswered: boolean;
    isStarted: boolean;
  } | null> {
    // Try to find the most recent event that includes this player
    let { data: event } = await supabase
      .from("events")
      .select("id, answered_player_ids, is_started")
      .contains("player_ids", [playerId])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!event) {
      // No event found for this player — find the latest event overall or create one
      const { data: latest } = await supabase
        .from("events")
        .select("id, player_ids")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        // Join the existing event
        const updatedIds = [...(latest.player_ids ?? []), playerId];
        await supabase
          .from("events")
          .update({ player_ids: updatedIds })
          .eq("id", latest.id);
        event = { id: latest.id, answered_player_ids: [], is_started: false };
      } else {
        // Create the first event of the day
        const { data: created } = await supabase
          .from("events")
          .insert({
            player_ids: [playerId],
            daily_clue: CLUE_TEXT,
            displayed_clue: initDisplayedClue(CLUE_TEXT),
          })
          .select("id, answered_player_ids, is_started")
          .single();
        event = created;
      }
    }

    if (!event) return null;
    const alreadyAnswered = (event.answered_player_ids ?? []).includes(
      playerId
    );
    return {
      eventId: event.id,
      alreadyAnswered,
      isStarted: event.is_started ?? false,
    };
  }
  if (booting) {
    return (
      <div className="max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
        <span className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-dvh">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-dvh">
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
        />
      )}
      {phase === "INSTRUCTIONS" && (
        <InstructionsScreen onBackToGame={() => setPhase("GAME")} />
      )}
    </div>
  );
}
