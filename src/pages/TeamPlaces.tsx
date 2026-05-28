import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, HelpCircle, Loader2, PhoneCall, Star } from "lucide-react";
import { HelpSheet } from "../components/HelpSheet";
import { SelfieBanner } from "../components/SelfieBanner";
import { useEventTeams } from "../hooks/useEventTeams";
import { useSelfies } from "../hooks/useSelfies";
import { useTeamMission, type SlotWithId } from "../hooks/useTeamMission";
import { useTeamSession } from "../hooks/useTeamSession";
import { getTeamLabel } from "../lib/teamLabel";
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

function getLeaderboardLine(
  enabled: boolean,
  teams: Array<{ id: string; index: number; uploadedCount: number }>,
  teamId: string,
  teamCount: number,
): string | null {
  if (!enabled || teams.length === 0) {
    return null;
  }

  const currentTeam = teams.find((team) => team.id === teamId);

  if (!currentTeam) {
    return `전체 ${teamCount}팀 진행 중`;
  }

  const rankedTeams = [...teams].sort((a, b) => b.uploadedCount - a.uploadedCount || a.index - b.index);
  const rank = rankedTeams.findIndex((team) => team.id === teamId) + 1;
  const averageUploads = teams.reduce((sum, team) => sum + team.uploadedCount, 0) / teams.length;
  const difference = currentTeam.uploadedCount - averageUploads;
  const roundedDifference = Math.round(Math.abs(difference));

  if (roundedDifference === 0) {
    return `전체 ${teamCount}팀 중 ${rank}등 · 평균과 비슷해요`;
  }

  const averageText = difference > 0
    ? `평균보다 ${roundedDifference}장 앞서요`
    : `평균보다 ${roundedDifference}장 뒤예요`;

  return `전체 ${teamCount}팀 중 ${rank}등 · ${averageText}`;
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
    return <span className="h-3 w-3 rounded-full bg-app-primary" />;
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
  const active = !done && uploadedCount > 0;
  const remainingCount = Math.max(slots.length - completedCount, 0);
  const stripClass = done ? "bg-emerald-500" : active ? "bg-sky-500" : "bg-slate-300";
  const statusClass = done
    ? "bg-emerald-50 text-emerald-700"
    : active
      ? "bg-sky-50 text-sky-700"
      : "bg-slate-100 text-app-muted";
  const cardClass = active
    ? "card block overflow-hidden border-sky-200 ring-2 ring-sky-100"
    : "card block overflow-hidden";
  const statusLabel = done ? "완료" : active ? `${remainingCount}장 더!` : "시작 전";

  return (
    <Link to={`/t/${teamToken}/places/${place.id}`} className={cardClass}>
      <div className="grid grid-cols-[6px_1fr]">
        <div className={stripClass} />
        <div>
          <div
            className="h-24 bg-slate-200"
            style={
              place.coverUrl
                ? {
                    backgroundImage: `url(${place.coverUrl})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }
                : undefined
            }
          />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black">{place.name}</h2>
                <p className="mt-1 truncate text-xs font-bold text-app-muted">
                  {place.verifyHint || place.description || "인증 조건 없음"}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>
                {statusLabel}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {slots.map((slot) => (
                <SlotDot key={slot.id} slot={slot} />
              ))}
              <span className="ml-auto text-xs font-black text-app-muted">
                {completedCount}/{slots.length}
              </span>
              <ChevronRight className="h-4 w-4 flex-none text-app-muted" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TeamPlaces() {
  const { teamToken } = useParams();
  const [helpOpen, setHelpOpen] = useState(false);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { teams: allTeams } = useEventTeams(context?.eventId);
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
  const remainingSlots = Math.max(slots.length - filledSlots, 0);
  const teamLabel = context ? getTeamLabel(context.team) : "팀 미션";
  const hasHelpContact = Boolean(context?.event.organizer?.phone || context?.team.leader?.phone);
  const leaderboardLine = context
    ? getLeaderboardLine(
        context.event.showLeaderboard !== false,
        allTeams,
        context.teamId,
        context.event.teamCount,
      )
    : null;

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
              <p className="truncate text-[11px] font-black text-app-muted">{teamLabel}</p>
              <h1 className="text-base font-black">우리 팀의 장소</h1>
            </div>
            {hasHelpContact ? (
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-app-ink text-white"
                aria-label="도움 요청"
              >
                <PhoneCall className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
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
                  <section className="rounded-panel bg-app-primary p-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white/80">미션 진행률</p>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-5xl font-black leading-none">{filledSlots}</span>
                          <span className="pb-1 text-xl font-black text-white/80">/ {slots.length}</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                        {remainingSlots}개 남음
                      </span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {leaderboardLine && (
                      <p className="mt-3 text-xs font-black text-white/85">{leaderboardLine}</p>
                    )}
                  </section>

                  <SelfieBanner
                    currentUploaderId={context.uploaderId}
                    selfies={selfies}
                    team={context.team}
                  />

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

                  {hasHelpContact && (
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="card flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                        <HelpCircle className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black">도움이 필요해요</h2>
                        <p className="mt-1 text-xs font-bold text-app-muted">
                          운영팀이나 우리 팀 팀장에게 바로 연락할 수 있어요.
                        </p>
                      </div>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {context && (
        <HelpSheet
          event={context.event}
          open={helpOpen}
          team={context.team}
          teamLabel={teamLabel}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </main>
  );
}
