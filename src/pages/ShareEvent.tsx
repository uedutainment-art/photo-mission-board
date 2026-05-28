import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Image as ImageIcon, Loader2, Lock, Users } from "lucide-react";
import { useSharedEvent, type SharedPhoto, type SharedSelfie, type SharedSlot } from "../hooks/useSharedEvent";
import { getCropObjectStyle } from "../lib/crop";

const SELFIE_GROUP_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
  "#65a30d",
];

interface SelfieGroup {
  label: string;
  color: string;
  selfies: SharedSelfie[];
  teamId: string;
}

function getProgressPercent(filledSlots: number, totalSlots: number): number {
  if (totalSlots === 0) {
    return 0;
  }

  return Math.round((filledSlots / totalSlots) * 100);
}

function groupSelfies(selfies: SharedSelfie[], slots: SharedSlot[]): SelfieGroup[] {
  const orderByTeamId = new Map<string, number>();

  for (const slot of slots) {
    if (!orderByTeamId.has(slot.teamId)) {
      orderByTeamId.set(slot.teamId, orderByTeamId.size);
    }
  }

  for (const selfie of selfies) {
    if (!orderByTeamId.has(selfie.teamId)) {
      orderByTeamId.set(selfie.teamId, orderByTeamId.size);
    }
  }

  const grouped = new Map<string, SharedSelfie[]>();

  for (const selfie of selfies) {
    grouped.set(selfie.teamId, [...(grouped.get(selfie.teamId) ?? []), selfie]);
  }

  return Array.from(grouped.entries())
    .sort(([teamIdA], [teamIdB]) => (orderByTeamId.get(teamIdA) ?? 0) - (orderByTeamId.get(teamIdB) ?? 0))
    .map(([teamId, teamSelfies]) => {
      const order = orderByTeamId.get(teamId) ?? 0;

      return {
        color: SELFIE_GROUP_COLORS[order % SELFIE_GROUP_COLORS.length],
        label: `팀 셀카 ${order + 1}`,
        selfies: teamSelfies,
        teamId,
      };
    });
}

function getPhotoAlt(slot: SharedSlot, photo: SharedPhoto | undefined): string {
  if (!photo) {
    return `콜라주 ${slot.globalIndex + 1}번 빈 칸`;
  }

  return `콜라주 ${slot.globalIndex + 1}번 대표 사진`;
}

export function ShareEvent() {
  const { eventId } = useParams();
  const { error, event, loading, photos, selfies, slots } = useSharedEvent(eventId);
  const photoById = useMemo(
    () => new Map(photos.map((photo): [string, SharedPhoto] => [photo.id, photo])),
    [photos],
  );
  const selfieGroups = useMemo(() => groupSelfies(selfies, slots), [selfies, slots]);
  const filledSlots = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const progressPercent = getProgressPercent(filledSlots, slots.length);

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      {loading && (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-300" aria-hidden="true" />
            <p className="mt-4 text-lg font-black text-slate-200">공유 링크 불러오는 중</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <section className="max-w-sm rounded-[28px] border border-white/10 bg-white/95 p-6 text-app-ink shadow-phone">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-app-muted">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-xl font-black">공유 링크를 열 수 없습니다</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-app-muted">{error}</p>
            <Link
              to="/"
              className="mt-5 block rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
            >
              처음으로
            </Link>
          </section>
        </div>
      )}

      {!loading && !error && event && (
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 md:px-6 md:py-8">
          <header className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
                  Shared Archive
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-5xl">
                  {event.title}
                </h1>
                {event.subtitle && (
                  <p className="mt-2 text-sm font-bold text-slate-300 md:text-base">{event.subtitle}</p>
                )}
              </div>
              <div className="rounded-full bg-emerald-400/15 px-4 py-2 text-xs font-black text-emerald-200">
                종료된 이벤트 · 읽기 전용
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <section className="rounded-2xl bg-white/10 p-4">
                <div className="text-2xl font-black">{progressPercent}%</div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">콜라주 완성</div>
              </section>
              <section className="rounded-2xl bg-white/10 p-4">
                <div className="text-2xl font-black">{filledSlots}/{slots.length}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">대표 사진</div>
              </section>
              <section className="rounded-2xl bg-white/10 p-4">
                <div className="text-2xl font-black">{selfies.length}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">셀카</div>
              </section>
            </div>
          </header>

          <section className="mt-5 rounded-[28px] border border-white/10 bg-white p-3 text-app-ink shadow-phone md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-app-muted">
                  Final Collage
                </p>
                <h2 className="mt-1 text-xl font-black">완성된 콜라주</h2>
              </div>
              <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-slate-100 text-app-muted">
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div
              className="grid gap-1 overflow-hidden rounded-[22px] bg-slate-200 p-1"
              style={{
                gridTemplateColumns: `repeat(${event.grid.cols}, minmax(0, 1fr))`,
              }}
            >
              {slots.map((slot) => {
                const photo = slot.representativePhotoId ? photoById.get(slot.representativePhotoId) : undefined;

                return (
                  <div key={slot.id} className="relative aspect-square overflow-hidden rounded bg-slate-900">
                    {photo ? (
                      <img
                        src={photo.thumbUrl}
                        alt={getPhotoAlt(slot, photo)}
                        className="h-full w-full object-cover"
                        style={getCropObjectStyle(photo.cropMeta)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div aria-label={getPhotoAlt(slot, photo)} className="h-full w-full bg-slate-100" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/10 bg-white p-4 text-app-ink shadow-phone md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-app-muted">
                  Team Selfies
                </p>
                <h2 className="mt-1 text-xl font-black">셀카 모음</h2>
              </div>
              <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-slate-100 text-app-muted">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            {selfieGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-app-border bg-slate-50 p-6 text-center">
                <Camera className="mx-auto h-7 w-7 text-app-muted" aria-hidden="true" />
                <p className="mt-3 text-sm font-black">공유할 셀카가 없습니다</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {selfieGroups.map((group) => (
                  <section key={group.teamId} className="overflow-hidden rounded-2xl border border-app-border bg-slate-50">
                    <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: group.color }}>
                      <h3 className="text-sm font-black">{group.label}</h3>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                        {group.selfies.length}명
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1">
                      {group.selfies.map((selfie) => (
                        <div key={selfie.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200">
                          <img
                            src={selfie.thumbUrl || selfie.originalUrl}
                            alt={selfie.uploaderName ? `${selfie.uploaderName} 셀카` : "팀원 셀카"}
                            className="h-full w-full object-cover"
                            style={getCropObjectStyle(selfie.cropMeta)}
                            referrerPolicy="no-referrer"
                          />
                          {selfie.uploaderName && (
                            <div className="absolute bottom-1 left-1 max-w-[82%] truncate rounded-full bg-app-ink/75 px-2 py-0.5 text-[10px] font-black text-white">
                              {selfie.uploaderName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          <footer className="py-8 text-center text-xs font-bold text-slate-500">
            Photo Mission Board 공유 링크 · 로그인 없이 보기 전용
          </footer>
        </div>
      )}
    </main>
  );
}
