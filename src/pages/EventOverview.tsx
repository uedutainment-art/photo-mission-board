import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, Image, Loader2, MessageCircle, Phone, QrCode, Trophy, Users } from "lucide-react";
import { OperatorTabNav } from "../components/OperatorTabNav";
import { useEventLive, type EventLivePhoto, type EventLiveSlot, type EventLiveTeam } from "../hooks/useEventLive";
import { formatKoreanDate } from "../lib/formatDate";
import { smsHref, telHref } from "../lib/phone";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel } from "../lib/teamLabel";

function getPercent(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getPlaceName(slot: EventLiveSlot, places: Array<{ id: string; name: string }>): string {
  return places.find((place) => place.id === slot.placeId)?.name ?? "장소";
}

function formatUploadTime(photo: EventLivePhoto): string {
  const date = photo.uploadedAt?.toDate?.();

  if (!date) {
    return "방금";
  }

  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function EventOverview() {
  const { eventId } = useParams();
  const { error, event, loading, photos, slots, teams } = useEventLive(eventId);
  const filledSlots = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const uncheckedSlots = slots.filter(
    (slot) => slot.reviewStatus === "unchecked" && Boolean(slot.representativePhotoId),
  ).length;
  const activeTeams = teams.filter((team) => team.joinedMembers.length > 0 || team.uploadedCount > 0).length;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const recentPhotos = photos.slice(0, 6);
  const eventDateText = event ? formatKoreanDate(event.scheduledAt) || event.subtitle : "";
  const participantLabels = getParticipantLabels(event);

  function getTeamProgress(team: EventLiveTeam): number {
    const teamSlots = slots.filter((slot) => slot.teamId === team.id);
    const teamFilled = teamSlots.filter((slot) => Boolean(slot.representativePhotoId)).length;
    return getPercent(teamFilled, teamSlots.length);
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link to="/events" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-black text-app-muted">{event?.title ?? "이벤트"}</p>
              {eventDateText && (
                <p className="truncate text-[10px] font-bold text-app-muted">{eventDateText}</p>
              )}
              <h1 className="text-base font-black">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-app-success" />
                LIVE Overview
              </h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              라이브 데이터 불러오는 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && event && eventId && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <section className="rounded-card bg-app-ink p-4 text-white">
                  <p className="text-[11px] font-black text-slate-400">전체 진행률</p>
                  <div className="mt-2 text-3xl font-black">{getPercent(filledSlots, slots.length)}%</div>
                </section>
                <section className="rounded-card bg-amber-100 p-4 text-amber-900">
                  <p className="text-[11px] font-black">미확인 슬롯</p>
                  <div className="mt-2 text-3xl font-black">{uncheckedSlots}</div>
                </section>
                <section className="card p-4">
                  <p className="text-[11px] font-black text-app-muted">총 제출 사진</p>
                  <div className="mt-2 text-2xl font-black">{photos.length}</div>
                </section>
                <section className="card p-4">
                  <p className="text-[11px] font-black text-app-muted">활동 중 {participantLabels.singular}</p>
                  <div className="mt-2 text-2xl font-black">{activeTeams} / {teams.length}</div>
                </section>
              </div>

              <Link
                to={`/events/${eventId}/teams`}
                className="card flex items-center gap-3 p-4"
              >
                <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-app-ink text-white">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black">{participantLabels.singular} QR 관리</h2>
                  <p className="mt-1 text-xs font-bold text-app-muted">
                    {participantLabels.leader}에게 보낼 QR과 연락처를 바로 확인합니다.
                  </p>
                </div>
                <span className="text-xl font-black">→</span>
              </Link>

              {event.modules?.photoContest && (
                <>
                  <Link to={`/events/${eventId}/contest`} className="card flex items-center gap-3 p-4">
                    <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-amber-100 text-amber-800"><Trophy className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="min-w-0 flex-1"><h2 className="text-sm font-black">사진 콘테스트 운영</h2><p className="mt-1 text-xs font-bold text-app-muted">접수·투표·집계·결과 공개를 관리합니다.</p></div><span className="text-xl font-black">→</span>
                  </Link>
                  <Link to={`/e/${eventId}`} target="_blank" className="card flex items-center gap-3 p-4">
                    <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-blue-100 text-blue-800"><ExternalLink className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="min-w-0 flex-1"><h2 className="text-sm font-black">참가자 공통 QR 화면</h2><p className="mt-1 text-xs font-bold text-app-muted">행사 메뉴와 가족 코드 입장을 확인합니다.</p></div>
                  </Link>
                </>
              )}

              {(event.modules?.guide ?? true) && (
                <Link to={`/events/${eventId}/guide`} className="card flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black">행사 안내 편집</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">참가자에게 보일 시간표·장소·안내를 관리합니다.</p>
                  </div>
                  <span className="text-xl font-black">→</span>
                </Link>
              )}

              <section className="card p-4">
                <h2 className="mb-3 text-sm font-black">{participantLabels.singular}별 진행률</h2>
                <div className="space-y-3">
                  {teams.map((team) => {
                    const progress = getTeamProgress(team);
                    const leaderPhone = team.leader?.phone;
                    const contactMessage = `안녕하세요, ${event.title} 운영팀입니다.`;

                    return (
                      <div key={team.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black">
                            <span className="truncate">{getTeamLabel(team)}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="mb-1 text-[11px] font-bold">
                            {team.leader?.name ? (
                              <span className="text-app-muted">{participantLabels.leader} · {team.leader.name}</span>
                            ) : (
                              <Link to={`/events/${eventId}/teams`} className="text-slate-400 underline-offset-2 hover:underline">
                                {participantLabels.leader} 미등록
                              </Link>
                            )}
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-app-primary" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        {leaderPhone ? (
                          <div className="flex gap-1">
                            <a
                              href={telHref(leaderPhone)}
                              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-app-muted"
                              aria-label={`${team.name} ${participantLabels.leader} 전화`}
                              title={`${participantLabels.leader} 전화`}
                            >
                              <Phone className="h-4 w-4" aria-hidden="true" />
                            </a>
                            <a
                              href={smsHref(leaderPhone, contactMessage)}
                              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-app-muted"
                              aria-label={`${team.name} ${participantLabels.leader} 문자`}
                              title={`${participantLabels.leader} 문자`}
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </div>
                        ) : (
                          <Users className="h-4 w-4 text-app-muted" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="card p-4">
                <h2 className="mb-3 text-sm font-black">최근 업로드</h2>
                <div className="divide-y divide-app-border">
                  {recentPhotos.map((photo) => {
                    const team = teamById.get(photo.teamId);
                    const slot = slotById.get(photo.slotId);

                    return (
                      <div key={photo.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <img
                          src={photo.thumbUrl}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {team?.name ?? "팀"} · {slot ? getPlaceName(slot, event.places) : "장소"}
                          </p>
                          <p className="truncate text-xs font-bold text-app-muted">
                            {photo.uploaderName || "팀원"}이 올림 {photo.isRepresentative ? "· 대표" : ""}
                          </p>
                        </div>
                        <span className="text-[11px] font-black text-app-muted">{formatUploadTime(photo)}</span>
                      </div>
                    );
                  })}

                  {recentPhotos.length === 0 && (
                    <div className="grid place-items-center py-10 text-center">
                      <Image className="mb-2 h-8 w-8 text-app-muted" aria-hidden="true" />
                      <p className="text-sm font-black text-app-muted">아직 업로드가 없습니다</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {eventId && <OperatorTabNav active="overview" eventId={eventId} />}
      </section>
    </main>
  );
}
