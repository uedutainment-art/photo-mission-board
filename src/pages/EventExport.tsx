import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, serverTimestamp, updateDoc, deleteField } from "firebase/firestore";
import { Archive, ArrowLeft, Download, Loader2, Lock, RotateCw, Users } from "lucide-react";
import { OperatorTabNav } from "../components/OperatorTabNav";
import { useEventLive } from "../hooks/useEventLive";
import { createCollagePng, createSelfieCollagePng, orderSlotsForExport, type ExportLayoutMode } from "../lib/collage";
import { downloadBlob, safeFilename } from "../lib/download";
import { db } from "../lib/firebase";
import { createOriginalsZip, type ZipProgress } from "../lib/zip";

type ExportJob = "collage" | "zip" | "selfies" | null;

function getFilledCount(slots: Array<{ representativePhotoId?: string }>): number {
  return slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
}

function getProgressPercent(progress: ZipProgress | null): number {
  if (!progress || progress.total === 0) {
    return 0;
  }

  return Math.min(100, Math.round((progress.current / progress.total) * 100));
}

export function EventExport() {
  const { eventId } = useParams();
  const { error, event, loading, photos, selfies, slots, teams } = useEventLive(eventId);
  const [layoutMode, setLayoutMode] = useState<ExportLayoutMode>("random");
  const [seed, setSeed] = useState(1);
  const [job, setJob] = useState<ExportJob>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const representativeById = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);
  const previewSlots = useMemo(
    () => orderSlotsForExport(slots, layoutMode, seed).slice(0, Math.min(slots.length, 100)),
    [layoutMode, seed, slots],
  );
  const filledCount = getFilledCount(slots);
  const filenameBase = safeFilename(event?.title ?? "photo-mission-board");
  const locked = Boolean(event?.layoutLockedAt);
  const busy = Boolean(job);

  async function handleLockToggle() {
    if (!eventId) {
      return;
    }

    await updateDoc(doc(db, "events", eventId), {
      layoutLockedAt: locked ? deleteField() : serverTimestamp(),
      layoutMode,
      updatedAt: serverTimestamp(),
    });
  }

  async function runJob(nextJob: ExportJob, task: () => Promise<void>) {
    setJob(nextJob);
    setJobError(null);
    setZipProgress(null);

    try {
      await task();
    } catch (exportError) {
      setJobError(exportError instanceof Error ? exportError.message : "다운로드를 만들지 못했습니다.");
    } finally {
      setJob(null);
    }
  }

  async function handleDownloadCollage() {
    if (!event) {
      return;
    }

    await runJob("collage", async () => {
      const blob = await createCollagePng({
        event,
        layoutMode,
        photos,
        seed,
        slots,
      });
      downloadBlob(blob, `${filenameBase}-collage.png`);
    });
  }

  async function handleDownloadZip() {
    if (!event) {
      return;
    }

    await runJob("zip", async () => {
      const blob = await createOriginalsZip({
        photos,
        places: event.places,
        selfies,
        slots,
        teams,
        onProgress: setZipProgress,
      });
      downloadBlob(blob, `${filenameBase}-originals.zip`);
    });
  }

  async function handleDownloadSelfies() {
    await runJob("selfies", async () => {
      const blob = await createSelfieCollagePng({ selfies, teams });
      downloadBlob(blob, `${filenameBase}-selfies.png`);
    });
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
              <h1 className="text-base font-black">Export</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              Export 데이터 불러오는 중
            </section>
          )}

          {(error || jobError) && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error || jobError}
            </section>
          )}

          {!loading && !error && event && eventId && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-panel bg-app-ink p-3 text-white">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black">
                    LIVE · {filledCount}/{slots.length}
                  </span>
                  <span className="text-[11px] font-black text-slate-400">2400 × 2400</span>
                </div>
                <div
                  className="grid gap-0.5 overflow-hidden rounded-2xl bg-slate-900 p-1"
                  style={{ gridTemplateColumns: `repeat(${Math.min(event.grid.cols, 10)}, minmax(0, 1fr))` }}
                >
                  {previewSlots.map((slot) => {
                    const photo = slot.representativePhotoId
                      ? representativeById.get(slot.representativePhotoId)
                      : undefined;

                    return (
                      <div key={slot.id} className="aspect-square rounded-[3px] bg-slate-800">
                        {photo && (
                          <img
                            src={photo.thumbUrl}
                            alt=""
                            className="h-full w-full rounded-[3px] object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between px-1 text-xs font-bold text-slate-300">
                  <span>현재 레이아웃: {layoutMode === "random" ? "랜덤 셔플" : "팀별 그룹"}</span>
                  <span>{locked ? "잠김" : "라이브"}</span>
                </div>
              </section>

              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode("random");
                  }}
                  className={layoutMode === "random" ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm" : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"}
                >
                  랜덤 셔플
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode("team");
                  }}
                  className={layoutMode === "team" ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm" : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"}
                >
                  팀별 그룹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeed((current) => current + 1);
                    setLayoutMode("random");
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  다시
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleLockToggle();
                }}
                className={
                  locked
                    ? "flex w-full items-center gap-3 rounded-2xl bg-emerald-100 px-4 py-4 text-left text-sm font-black text-emerald-800"
                    : "flex w-full items-center gap-3 rounded-2xl border border-app-border bg-white px-4 py-4 text-left text-sm font-black"
                }
              >
                <Lock className="h-5 w-5 flex-none" aria-hidden="true" />
                <span className="flex-1">
                  {locked ? "이 배치로 잠김" : "이 배치로 잠금"}
                  <span className="mt-1 block text-xs font-bold text-app-muted">
                    잠금 후 다운로드하는 것을 권장합니다.
                  </span>
                </span>
              </button>

              {job === "zip" && zipProgress && (
                <section className="card p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-black">
                    <span>{zipProgress.label}</span>
                    <span>{getProgressPercent(zipProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-app-primary" style={{ width: `${getProgressPercent(zipProgress)}%` }} />
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h2 className="text-sm font-black">다운로드</h2>
                <button
                  type="button"
                  onClick={() => {
                    void handleDownloadCollage();
                  }}
                  disabled={busy || slots.length === 0}
                  className="card flex w-full items-center gap-3 p-4 text-left disabled:opacity-50"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-app-ink text-white">
                    {job === "collage" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black">최종 콜라주 PNG</div>
                    <div className="text-xs font-bold text-app-muted">2400×2400 · 대표 사진 {filledCount}장</div>
                  </div>
                  <span className="text-xl font-black">↓</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleDownloadZip();
                  }}
                  disabled={busy || (photos.length === 0 && selfies.length === 0)}
                  className="card flex w-full items-center gap-3 p-4 text-left disabled:opacity-50"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-app-ink">
                    {job === "zip" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Archive className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black">원본 사진 ZIP</div>
                    <div className="text-xs font-bold text-app-muted">사진 {photos.length}장 · 셀카 {selfies.length}장</div>
                  </div>
                  <span className="text-xl font-black">↓</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleDownloadSelfies();
                  }}
                  disabled={busy || selfies.length === 0}
                  className="card flex w-full items-center gap-3 p-4 text-left disabled:opacity-50"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-app-ink">
                    {job === "selfies" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Users className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black">팀 셀카 모음 PNG</div>
                    <div className="text-xs font-bold text-app-muted">{teams.length}팀 셀카 콜라주</div>
                  </div>
                  <span className="text-xl font-black">↓</span>
                </button>
              </section>

              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
                원본 사진은 행사 종료 후 60일 안에 ZIP으로 받아 따로 보관해주세요. 최종 콜라주와 썸네일은 영구 보관 대상으로 둡니다.
              </section>
            </div>
          )}
        </div>

        {eventId && <OperatorTabNav active="export" eventId={eventId} />}
      </section>
    </main>
  );
}
