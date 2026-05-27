import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2, MapPin, Star } from "lucide-react";
import { SelfieBanner } from "../components/SelfieBanner";
import { useSelfies } from "../hooks/useSelfies";
import { useTeamMission, type SlotWithId } from "../hooks/useTeamMission";
import { useTeamSession } from "../hooks/useTeamSession";
import type { Place } from "../lib/types";

function isSelfieReady(selfieMode: string, selfiesCount: number, hasMySelfie: boolean): boolean {
  if (selfieMode === "none") {
    return true;
  }

  if (selfieMode === "group") {
    return selfiesCount > 0;
  }

  return hasMySelfie;
}

function getProgressPercent(filled: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((filled / total) * 100);
}

function SlotDot({ slot }: { slot: SlotWithId }) {
  if (slot.representativePhotoId) {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[9px] font-black text-amber-950">
        ★
      </span>
    );
  }

  if (slot.submissionCount > 0) {
    return <span className="h-3 w-3 rounded-full bg-app-ink" />;
  }

  return <span className="h-3 w-3 rounded-full bg-slate-300" />;
}

interface PlaceCardProps {
  place: Place;
  slots: SlotWithId[];
  teamToken: string;
}

function PlaceCard({ place, slots, teamToken }: PlaceCardProps) {
  const completedCount = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const uploadedCount = slots.reduce((sum, slot) => sum + slot.submissionCount, 0);
  const done = completedCount >= slots.length && slots.length > 0;

  return (
    <Link to={`/t/${teamToken}/places/${place.id}`} className="card block overflow-hidden">
      <div
        className="h-24 bg-gradient-to-br from-sky-200 to-emerald-200"
        style={place.coverUrl ? { backgroundImage: `url(${place.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black">{place.name}</h2>
            <p className="mt-1 truncate text-xs font-bold text-app-muted">
              {place.verifyHint || place.description || "인증 조건 없음"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {slots.map((slot) => (
            <SlotDot key={slot.id} slot={slot} />
          ))}
          <span className="ml-1 text-xs font-black text-app-muted">
            {completedCount}/{slots.length}
            {done ? " · 완료" : uploadedCount > 0 ? ` · ${uploadedCount}장 올라옴` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TeamPlaces() {
  const { teamToken } = useParams();
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { error: missionError, loading: missionLoading, slots } = useTeamMission(
    context?.eventId,
    context?.teamId,
  );
  const { selfies } = useSelfies(context?.eventId, context?.teamId);
  const hasMySelfie = selfies.some((selfie) => selfie.uploaderId === context?.uploaderId);
  const selfieReady = context
    ? isSelfieReady(context.event.selfieMode, selfies.length, hasMySelfie)
    : false;
  const filledSlots = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const progressPercent = getProgressPercent(filledSlots, slots.length);

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to={teamToken ? `/t/${teamToken}` : "/"}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-black text-app-muted">
                {context ? `${context.team.name} · ${context.team.displayName}` : "팀 미션"}
              </p>
              <h1 className="text-base font-black">우리 팀의 장소</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50 p-4">
          {(sessionLoading || missionLoading) && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              미션을 불러오는 중
            </section>
          )}

          {(sessionError || missionError) && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {sessionError || missionError}
            </section>
          )}

          {!sessionLoading && !sessionError && context && (
            <>
              <SelfieBanner
                currentUploaderId={context.uploaderId}
                selfies={selfies}
                team={context.team}
              />

              {!selfieReady && (
                <section className="card p-5 text-center">
                  <Star className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
                  <h2 className="mt-3 text-lg font-black">셀카부터 올려주세요</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                    장소 미션을 시작하려면 먼저 셀카 단계가 필요합니다.
                  </p>
                  <Link
                    to={`/t/${teamToken}/selfie`}
                    className="mt-4 block rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                  >
                    셀카 단계로
                  </Link>
                </section>
              )}

              {selfieReady && (
                <>
                  <section className="rounded-panel bg-app-ink p-5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">미션 진행률</span>
                      <span className="text-2xl font-black">{progressPercent}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-app-success"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-300">
                      {slots.length}장 중 {filledSlots}장 대표 선택됨
                    </p>
                  </section>

                  <section className="card flex items-center gap-3 p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black">가야 할 장소 {context.event.places.length}곳</h2>
                      <p className="mt-1 text-xs font-bold text-app-muted">
                        노란 별은 콜라주에 들어가는 대표 사진입니다.
                      </p>
                    </div>
                  </section>

                  <div className="space-y-3">
                    {context.event.places.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        slots={slots.filter((slot) => slot.placeId === place.id)}
                        teamToken={teamToken ?? ""}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
