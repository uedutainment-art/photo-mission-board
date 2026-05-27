import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { OperatorTabNav } from "../components/OperatorTabNav";
import { useEventLive, type EventLivePhoto, type EventLiveSlot } from "../hooks/useEventLive";
import { setSlotReviewStatus } from "../lib/live";
import { setRepresentativePhoto } from "../lib/upload";

function getUploadedAt(photo: EventLivePhoto): number {
  return photo.uploadedAt?.toMillis?.() ?? 0;
}

function getPhotoTime(photo: EventLivePhoto): string {
  const date = photo.uploadedAt?.toDate?.();

  if (!date) {
    return "방금";
  }

  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function getPlaceName(slot: EventLiveSlot, places: Array<{ id: string; name: string }>): string {
  return places.find((place) => place.id === slot.placeId)?.name ?? "장소";
}

function getFirstReviewSlot(slots: EventLiveSlot[]): EventLiveSlot | undefined {
  return (
    slots.find((slot) => slot.reviewStatus === "unchecked" && slot.representativePhotoId) ??
    slots.find((slot) => slot.representativePhotoId) ??
    slots[0]
  );
}

export function EventReview() {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { error, event, loading, photos, slots, teams } = useEventLive(eventId);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const selectedSlotId = searchParams.get("slot");
  const selectedSlot = useMemo(() => {
    if (selectedSlotId) {
      return slots.find((slot) => slot.id === selectedSlotId) ?? null;
    }

    return getFirstReviewSlot(slots) ?? null;
  }, [selectedSlotId, slots]);
  const selectedIndex = selectedSlot ? slots.findIndex((slot) => slot.id === selectedSlot.id) : -1;
  const selectedPhotos = useMemo(
    () =>
      selectedSlot
        ? photos
            .filter((photo) => photo.slotId === selectedSlot.id)
            .sort((a, b) => getUploadedAt(b) - getUploadedAt(a))
        : [],
    [photos, selectedSlot],
  );
  const uncheckedSlots = slots.filter(
    (slot) => slot.reviewStatus === "unchecked" && slot.representativePhotoId,
  );
  const teamById = new Map(teams.map((team) => [team.id, team]));

  useEffect(() => {
    if (!selectedSlotId && selectedSlot) {
      setSearchParams({ slot: selectedSlot.id }, { replace: true });
    }
  }, [selectedSlot, selectedSlotId, setSearchParams]);

  function moveToSlot(slot: EventLiveSlot | undefined) {
    if (!slot) {
      return;
    }

    setSearchParams({ slot: slot.id });
  }

  function moveNextUnchecked() {
    const nextUnchecked = uncheckedSlots.find((slot) => slot.id !== selectedSlot?.id);
    moveToSlot(nextUnchecked ?? selectedSlot ?? undefined);
  }

  async function handleRepresentative(photo: EventLivePhoto) {
    if (!eventId || !selectedSlot) {
      return;
    }

    setBusy(true);
    setLocalError(null);

    try {
      await setRepresentativePhoto(eventId, selectedSlot.id, photo.id);
    } catch (representativeError) {
      setLocalError(
        representativeError instanceof Error
          ? representativeError.message
          : "대표 사진을 바꾸지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewToggle() {
    if (!eventId || !selectedSlot) {
      return;
    }

    const nextChecked = selectedSlot.reviewStatus !== "checked";
    setBusy(true);
    setLocalError(null);

    try {
      await setSlotReviewStatus(eventId, selectedSlot.id, nextChecked);

      if (nextChecked) {
        const nextUnchecked = uncheckedSlots.find((slot) => slot.id !== selectedSlot.id);

        if (nextUnchecked) {
          moveToSlot(nextUnchecked);
        }
      }
    } catch (reviewError) {
      setLocalError(reviewError instanceof Error ? reviewError.message : "검수 상태를 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link to={eventId ? `/events/${eventId}/board` : "/events"} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">슬롯 검수</h1>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              검수 데이터 불러오는 중
            </section>
          )}

          {(error || localError) && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error || localError}
            </section>
          )}

          {!loading && !error && event && eventId && !selectedSlot && (
            <section className="card p-6 text-center">
              <h2 className="font-black">검수할 슬롯이 없습니다</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                팀이 사진을 올리면 이곳에서 대표 사진을 확인할 수 있습니다.
              </p>
            </section>
          )}

          {!loading && !error && event && eventId && selectedSlot && (
            <div className="space-y-4">
              <section className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {teamById.get(selectedSlot.teamId)?.name ?? "팀"} · {getPlaceName(selectedSlot, event.places)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-app-muted">
                      슬롯 {selectedIndex + 1} / {slots.length} · 미확인 {uncheckedSlots.length}개
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        moveToSlot(slots[selectedIndex - 1]);
                      }}
                      disabled={selectedIndex <= 0}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted disabled:opacity-40"
                      aria-label="이전 슬롯"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        moveToSlot(slots[selectedIndex + 1]);
                      }}
                      disabled={selectedIndex >= slots.length - 1}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted disabled:opacity-40"
                      aria-label="다음 슬롯"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                      제출 현황
                    </p>
                    <h2 className="mt-1 text-sm font-black">
                      올라온 사진 {selectedPhotos.length}장 · 대표 {selectedSlot.representativePhotoId ? "1장" : "없음"}
                    </h2>
                  </div>
                  <div className="text-lg font-black">
                    {selectedSlot.representativePhotoId ? "✓" : "대기"}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-black">올라온 사진</h2>
                <div className="grid grid-cols-2 gap-3">
                  {selectedPhotos.map((photo) => (
                    <article key={photo.id} className="card overflow-hidden">
                      <div className="relative aspect-square bg-slate-200">
                        <img
                          src={photo.thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void handleRepresentative(photo);
                          }}
                          disabled={busy}
                          className={
                            photo.isRepresentative
                              ? "absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-card"
                              : "absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-app-ink/70 text-white shadow-card"
                          }
                          aria-label="대표 사진 선택"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-black">{photo.uploaderName || "팀원"}</p>
                        <p className="mt-1 text-[11px] font-bold text-app-muted">
                          {getPhotoTime(photo)} · {photo.isRepresentative ? "대표" : "후보"}
                        </p>
                      </div>
                    </article>
                  ))}

                  {selectedPhotos.length === 0 && (
                    <section className="col-span-2 card p-6 text-center">
                      <p className="text-sm font-black text-app-muted">아직 사진이 없습니다</p>
                    </section>
                  )}
                </div>
              </section>

              <button
                type="button"
                onClick={() => {
                  void handleReviewToggle();
                }}
                disabled={busy || selectedPhotos.length === 0}
                className={
                  selectedSlot.reviewStatus === "checked"
                    ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-4 py-4 text-sm font-black text-emerald-800 disabled:opacity-50"
                    : "flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-50"
                }
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {selectedSlot.reviewStatus === "checked" ? "확인 완료됨" : "이 슬롯 확인 완료"}
              </button>

              <button
                type="button"
                onClick={moveNextUnchecked}
                className="w-full rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black"
              >
                다음 미확인 →
              </button>
            </div>
          )}
        </div>

        {eventId && <OperatorTabNav active="review" eventId={eventId} />}
      </section>
    </main>
  );
}
