import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, ExternalLink, Loader2, Monitor, RotateCw } from "lucide-react";
import { BoardCell } from "../components/BoardCell";
import { OperatorTabNav } from "../components/OperatorTabNav";
import { useEventLive, type EventLivePhoto, type EventLiveSlot } from "../hooks/useEventLive";
import { db } from "../lib/firebase";

type BoardMode = "random" | "team" | "unchecked";

function hashString(value: string): number {
  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function seededShuffle(slots: EventLiveSlot[], seedText: string): EventLiveSlot[] {
  const nextSlots = [...slots];
  let seed = hashString(seedText);

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  for (let index = nextSlots.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = nextSlots[index];
    nextSlots[index] = nextSlots[swapIndex];
    nextSlots[swapIndex] = temp;
  }

  return nextSlots;
}

function orderSlots(slots: EventLiveSlot[], mode: BoardMode, seed: number): EventLiveSlot[] {
  if (mode === "random") {
    return seededShuffle(slots, String(seed));
  }

  if (mode === "unchecked") {
    return [...slots].sort((a, b) => {
      const aUnchecked = a.reviewStatus === "unchecked" && Boolean(a.representativePhotoId);
      const bUnchecked = b.reviewStatus === "unchecked" && Boolean(b.representativePhotoId);

      if (aUnchecked !== bUnchecked) {
        return aUnchecked ? -1 : 1;
      }

      return a.globalIndex - b.globalIndex;
    });
  }

  return [...slots].sort((a, b) => a.globalIndex - b.globalIndex);
}

export function EventBoard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { error, event, loading, photos, slots } = useEventLive(eventId);
  const [mode, setMode] = useState<BoardMode>("random");
  const [publicError, setPublicError] = useState<string | null>(null);
  const [publicSaving, setPublicSaving] = useState(false);
  const [seed, setSeed] = useState(1);
  const photoById = useMemo(
    () => new Map(photos.map((photo): [string, EventLivePhoto] => [photo.id, photo])),
    [photos],
  );
  const orderedSlots = useMemo(() => orderSlots(slots, mode, seed), [mode, seed, slots]);
  const filledSlots = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const uncheckedSlots = slots.filter(
    (slot) => slot.reviewStatus === "unchecked" && Boolean(slot.representativePhotoId),
  ).length;
  const publicViewMode = event?.publicViewMode ?? "board";

  async function savePublicViewMode() {
    if (!eventId) {
      return;
    }

    setPublicSaving(true);
    setPublicError(null);

    try {
      await updateDoc(doc(db, "events", eventId), {
        publicViewMode: "board",
        updatedAt: serverTimestamp(),
      });
    } catch {
      setPublicError("공개 보드 모드를 저장하지 못했습니다.");
    } finally {
      setPublicSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link to={eventId ? `/events/${eventId}` : "/events"} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-black text-app-muted">{event?.title ?? "이벤트"}</p>
              <h1 className="text-base font-black">LIVE 보드</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              보드 불러오는 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && event && eventId && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                {([
                  ["random", "랜덤 셔플"],
                  ["team", "팀별 그룹"],
                  ["unchecked", "미확인 강조"],
                ] as Array<[BoardMode, string]>).map(([nextMode, label]) => (
                  <button
                    key={nextMode}
                    type="button"
                    onClick={() => {
                      setMode(nextMode);
                    }}
                    className={
                      mode === nextMode
                        ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                        : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <section className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-app-muted">공개 화면</p>
                    <h2 className="mt-1 text-base font-black">빔프로젝터 보드</h2>
                  </div>
                  <Monitor className="h-5 w-5 text-app-primary" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.open(`/events/${eventId}/public`, "_blank", "noopener,noreferrer");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-3 text-sm font-black text-white"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  공개 보드 열기
                </button>

                <div className="rounded-2xl border border-app-border bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black text-app-muted">뷰 모드 변경</p>
                      <p className="mt-1 text-sm font-black">{publicViewMode === "board" ? "전체 보드" : publicViewMode}</p>
                    </div>
                    <button
                      type="button"
                      disabled={publicSaving || event.publicViewMode === "board"}
                      onClick={() => {
                        void savePublicViewMode();
                      }}
                      className="rounded-xl bg-app-ink px-3 py-2 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {publicSaving ? "저장 중" : event.publicViewMode === "board" ? "적용됨" : "보드로 설정"}
                    </button>
                  </div>
                  {publicError && <p className="mt-2 text-xs font-bold text-red-600">{publicError}</p>}
                </div>
              </section>

              <div
                className="grid gap-0.5 rounded-2xl bg-slate-200 p-2"
                style={{ gridTemplateColumns: `repeat(${event.grid.cols}, minmax(0, 1fr))` }}
              >
                {orderedSlots.map((slot) => {
                  const photo = slot.representativePhotoId ? photoById.get(slot.representativePhotoId) : undefined;

                  return (
                    <BoardCell
                      key={slot.id}
                      slot={slot}
                      photo={photo}
                      onClick={() => {
                        navigate(`/events/${eventId}/review?slot=${slot.id}`);
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-black text-app-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-gradient-to-br from-sky-200 to-emerald-200" />
                  대표 사진
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-slate-300 bg-white" />
                  빈 칸
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-app-warning" />
                  미확인
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <section className="card p-4">
                  <p className="text-[11px] font-black text-app-muted">채움률</p>
                  <div className="mt-2 text-2xl font-black">{filledSlots}/{slots.length}</div>
                </section>
                <section className="rounded-card bg-amber-100 p-4 text-amber-900">
                  <p className="text-[11px] font-black">미확인</p>
                  <div className="mt-2 text-2xl font-black">{uncheckedSlots}</div>
                </section>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSeed((current) => current + 1);
                    setMode("random");
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  다시 셔플
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstUnchecked = slots.find((slot) => slot.reviewStatus === "unchecked" && slot.representativePhotoId);
                    navigate(`/events/${eventId}/review${firstUnchecked ? `?slot=${firstUnchecked.id}` : ""}`);
                  }}
                  className="rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                >
                  미확인 슬롯 → 검수
                </button>
              </div>
            </div>
          )}
        </div>

        {eventId && <OperatorTabNav active="board" eventId={eventId} />}
      </section>
    </main>
  );
}
