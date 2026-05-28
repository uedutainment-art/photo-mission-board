import { Link } from "react-router-dom";
import { CalendarDays, Grid2X2, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AccountBar } from "../components/AccountBar";
import { NotificationSettings } from "../components/NotificationSettings";
import { useAuth } from "../lib/auth";
import type { GridSize } from "../lib/types";
import { filterEvents, type EventFilter, type EventRecord, useEvents } from "../hooks/useEvents";

const filterLabels: Record<EventFilter, string> = {
  live: "진행 중",
  draft: "예정",
  completed: "종료",
};

function getGridTotal(grid: GridSize): number {
  return grid.rows * grid.cols;
}

function getEventMeta(event: EventRecord): string {
  const gridTotal = getGridTotal(event.grid);
  const statusText = filterLabels[event.status === "archived" ? "completed" : event.status];
  const subtitle = event.subtitle ? ` · ${event.subtitle}` : "";

  return `${event.teamCount}팀 · ${gridTotal}칸 · ${statusText}${subtitle}`;
}

function EventCard({ event }: { event: EventRecord }) {
  const gridTotal = getGridTotal(event.grid);

  return (
    <Link to={`/events/${event.id}`} className="card block overflow-hidden">
      <div className="relative h-28 bg-gradient-to-br from-sky-200 via-emerald-100 to-violet-200">
        {event.status === "live" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-app-ink px-2.5 py-1 text-[10px] font-black text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-app-success" />
            LIVE
          </span>
        )}
        <div className="absolute bottom-3 right-3 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-black text-app-ink">
          {event.grid.cols} × {event.grid.rows}
        </div>
      </div>
      <div className="p-4">
        <h2 className="truncate text-base font-black">{event.title}</h2>
        <p className="mt-1 text-xs font-bold text-app-muted">{getEventMeta(event)}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-black text-app-muted">
          <span className="inline-flex items-center gap-1">
            <Grid2X2 className="h-3.5 w-3.5" aria-hidden="true" />
            {gridTotal} 슬롯
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            팀당 {event.perTeamCount}장
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Events() {
  const { signOut, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<EventFilter>("live");
  const [signingOut, setSigningOut] = useState(false);
  const { counts, error, events, loading } = useEvents(user?.uid ?? null);
  const visibleEvents = useMemo(
    () => filterEvents(events, activeFilter),
    [activeFilter, events],
  );

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black tracking-normal">내 이벤트</h1>
            <div className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">⋮</div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 bg-slate-50 p-4">
          <AccountBar busy={signingOut} user={user} onSignOut={handleSignOut} />

          <NotificationSettings user={user} />

          <Link
            to="/events/new"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-center text-sm font-black text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            새 이벤트 만들기
          </Link>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {(["live", "draft", "completed"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setActiveFilter(filter);
                }}
                className={
                  activeFilter === filter
                    ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                    : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                }
              >
                {filterLabels[filter]} ({counts[filter]})
              </button>
            ))}
          </div>

          {loading && (
            <section className="card flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-app-primary" aria-hidden="true" />
              <p className="text-sm font-black text-app-muted">이벤트를 불러오는 중</p>
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && visibleEvents.length === 0 && (
            <section className="card flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-2xl font-black text-app-muted">
                ▦
              </div>
              <h2 className="text-lg font-black">{filterLabels[activeFilter]} 이벤트가 없습니다</h2>
              <p className="text-sm font-bold leading-6 text-app-muted">
                새 이벤트 만들기를 눌러 첫 Photo Mission Board를 준비하세요.
              </p>
            </section>
          )}

          {!loading && !error && visibleEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
