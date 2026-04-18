import type { AppUser } from "../types";
import { useDashboardData } from "../hooks/useDashboardData";

interface DashboardScreenProps {
  user: AppUser;
  currentEventId: string | null;
  eventEntry: { alreadyAnswered: boolean; isStarted: boolean } | null;
  onEnterEvent: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-green-400/30 text-green-400/70 shrink-0">
          solved
        </span>
      );
    case "active":
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-yellow-400/30 text-yellow-400/70 shrink-0">
          active
        </span>
      );
    case "waiting":
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-white/15 text-white/30 shrink-0">
          waiting
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-white/10 text-white/20 shrink-0">
          {status}
        </span>
      );
  }
}

export function DashboardScreen({
  user,
  currentEventId,
  eventEntry,
  onEnterEvent,
}: DashboardScreenProps) {
  const { pastEvents, contacts, loading, error } = useDashboardData(user.id);

  const historyEvents = pastEvents.filter((ev) => ev.id !== currentEventId);
  const maxPlayers = Math.max(...historyEvents.map((ev) => ev.playerCount), 1);

  const enterLabel = !eventEntry
    ? "Loading..."
    : eventEntry.isStarted
    ? "Rejoin the game 🦀"
    : eventEntry.alreadyAnswered
    ? "Rejoin the lobby"
    : "Enter event 🦀";

  return (
    <div className="w-full max-w-md mx-auto min-h-dvh bg-[#0a0a0a] px-5 pt-12 pb-16 overflow-x-hidden overflow-y-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="mb-7">
        <div className="text-4xl mb-2">{user.emoji}</div>
        <h1 className="text-2xl font-bold text-white leading-tight">
          {user.name}
        </h1>
        <p className="text-sm text-white/40 mt-0.5">Welcome back</p>
      </div>

      {/* ── Current event CTA ── */}
      <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-white/30 tracking-widest uppercase">
            Current event
          </p>
          <span className="text-xs font-mono text-white/25">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <p className="text-sm text-white/50 mb-3">
          {currentEventId ? "You're registered" : "No active event"}
        </p>
        <button
          onClick={onEnterEvent}
          disabled={!eventEntry || !currentEventId}
          className="w-full py-3.5 rounded-2xl border border-white text-white font-semibold text-sm active:scale-[0.98] transition-all hover:bg-white/5 disabled:border-white/15 disabled:text-white/20 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {!eventEntry && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {enterLabel}
        </button>
      </div>

      {/* ── Stats row ── */}
      {!loading && (
        <div className="flex gap-2 mb-7">
          {[
            { label: "Events", value: historyEvents.length },
            { label: "People met", value: contacts.length },
            { label: "Crew size", value: contacts.length + 1 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-2xl border border-white/8 bg-white/[0.02] py-3 px-2 text-center"
            >
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-[9px] font-mono text-white/35 uppercase tracking-widest mt-0.5 leading-tight">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading / error ── */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <span className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-400/70 mb-5">{error}</p>
      )}

      {/* ── Event history ── */}
      {!loading && historyEvents.length > 0 && (
        <div className="mb-7">
          <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-3">
            Event history
          </p>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-14 mb-3">
            {historyEvents
              .slice()
              .reverse()
              .map((ev) => {
                const h = Math.max(6, (ev.playerCount / maxPlayers) * 56);
                return (
                  <div
                    key={ev.id}
                    className="flex-1 rounded-t-sm bg-white/25"
                    style={{ height: `${h}px` }}
                    title={`${formatDate(ev.createdAt)} · ${
                      ev.playerCount
                    } players`}
                  />
                );
              })}
          </div>

          {/* Event list */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            {historyEvents.map((ev, i) => (
              <div
                key={ev.id}
                className={`flex items-center gap-2 px-4 py-3 ${
                  i < historyEvents.length - 1 ? "border-b border-white/8" : ""
                }`}
              >
                <span className="text-xs font-mono text-white/40 w-10 shrink-0">
                  {formatDate(ev.createdAt)}
                </span>
                <span className="text-xs text-white/30 shrink-0">
                  {ev.playerCount}p
                </span>
                <span className="text-xs text-white/55 truncate flex-1 min-w-0 font-mono tracking-wider">
                  {ev.clueText ?? "—"}
                </span>
                {statusBadge(ev.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── People met ── */}
      {!loading && (
        <div>
          <p className="text-xs font-mono text-white/30 tracking-widest uppercase mb-3">
            People you've met
          </p>

          {contacts.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-white/25 italic">
                Play your first event to meet people
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                >
                  <div className="text-2xl mb-1.5">{contact.emoji}</div>
                  <div className="text-sm font-semibold text-white">
                    {contact.name}
                  </div>
                  {contact.email ? (
                    <div className="text-[11px] text-white/35 break-words mt-0.5 leading-tight">
                      {contact.email}
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/20 italic mt-0.5">
                      no email on record
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
