import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, ChevronRight, Clock3, Gamepad2, Home, Images, Loader2, MapPin, Menu, Music2, Share2, Target, Trophy, Users } from "lucide-react";
import { EventBrandMark } from "../components/EventBrandMark";
import { useTeamSession, type TeamSessionContext } from "../hooks/useTeamSession";
import { getEventSchedule, isSonovaFamilyDay } from "../lib/eventBrand";
import { formatKoreanDate } from "../lib/formatDate";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel, getParticipantName } from "../lib/teamLabel";

function getStartLabel(selfieMode: string): string {
  if (selfieMode === "none") {
    return "장소 미션으로 시작하기";
  }

  if (selfieMode === "group") {
    return "단체사진 올리기";
  }

  return "셀카부터 시작하기";
}

function FamilyEventMenu({ context, teamToken }: { context: TeamSessionContext; teamToken: string }) {
  const modules = context.event.modules;
  const sonova = isSonovaFamilyDay(context.event);
  const schedulePreview = getEventSchedule(context.event).slice(0, 2);
  const eventDate = formatKoreanDate(context.event.scheduledAt);
  const venue = context.event.guide?.venue;
  const resultsPublished = context.event.results?.status === "published";
  const votingOpen = context.event.voting?.status === "open";
  const submissionOpen = context.event.submission?.status === "open";
  const photoAction = resultsPublished
    ? { eyebrow: "결과 공개", title: "베스트 포토 결과 확인하기", description: "우리 가족과 수상 가족의 사진을 확인해보세요.", href: `/t/${teamToken}/results` }
    : votingOpen
      ? { eyebrow: "투표 진행 중", title: "마음에 드는 가족사진 투표하기", description: "우리 가족을 제외한 다른 가족 사진을 선택해주세요.", href: `/t/${teamToken}/gallery` }
      : submissionOpen
        ? { eyebrow: "사진 접수 중 · 베스트 포토 선물", title: "우리 가족사진 4장 채우기", description: "가족의 즐거운 순간을 남겨주세요. 베스트 포토 가족에게 선물이 있어요.", href: `/t/${teamToken}/contest` }
        : { eyebrow: "사진 콘테스트", title: "가족사진 콘테스트 보기", description: "운영팀 안내에 따라 사진 접수와 투표가 열립니다.", href: `/t/${teamToken}/contest` };

  return (
    <>
      <section className={sonova ? "overflow-hidden rounded-[8px] border border-white/80 bg-white/90 shadow-[0_18px_45px_rgba(31,65,47,0.14)]" : "rounded-panel bg-app-ink p-6 text-white"}>
        {sonova ? (
          <>
            <div className="px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black text-[#385444]">{getParticipantName(context.team)} · 환영합니다</p>
                <span className="rounded-full border border-[#9eb4a5] px-3 py-1 text-[9px] font-black uppercase text-[#385444]">Family Day</span>
              </div>
              <h1 className="mt-2 text-2xl font-black leading-8 text-[#173c2c]">{context.event.title}</h1>
              {(eventDate || venue) && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#d9dfd2] pt-4 text-xs font-black text-[#385444]">
                  {eventDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{eventDate}</span>}
                  {venue && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{venue}</span>}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">FAMILY DAY</p>
            <h1 className="mt-2 text-2xl font-black tracking-normal">{context.event.title}</h1>
            {(eventDate || venue) && (
              <div className="mt-5 border-t border-slate-700 pt-4 text-xs font-bold text-slate-300">
                {eventDate && <p>{eventDate}</p>}
                {venue && <p className="mt-1">{venue}</p>}
              </div>
            )}
          </>
        )}
      </section>

      {(modules?.guide ?? true) && (
        <section className="overflow-hidden rounded-[8px] border border-white/80 bg-white/90 shadow-card">
          <div className="flex items-center justify-between border-b border-[#e2e7df] px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase text-[#78877c]">Today</p>
              <h2 className="mt-0.5 text-sm font-black text-[#173c2c]">오늘의 행사 일정</h2>
            </div>
            <Link to={`/e/${context.eventId}/guide?team=${encodeURIComponent(teamToken)}`} className="text-xs font-black text-[#47765c]">전체 일정</Link>
          </div>
          <div className="divide-y divide-[#e2e7df] px-4">
            {schedulePreview.length > 0 ? schedulePreview.map((item) => (
              <div key={item.id} className="grid grid-cols-[58px_1fr] gap-3 py-3">
                <span className="inline-flex items-center gap-1 text-xs font-black text-[#47765c]"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.time}</span>
                <div><p className="text-sm font-black text-[#173c2c]">{item.title}</p>{item.description && <p className="mt-1 text-[11px] font-bold leading-4 text-[#78877c]">{item.description}</p>}</div>
              </div>
            )) : (
              <p className="py-4 text-xs font-bold leading-5 text-[#617466]">전체 일정과 이용 안내를 확인해주세요.</p>
            )}
          </div>
        </section>
      )}

      {modules?.photoContest && (
        <Link to={photoAction.href} className="overflow-hidden rounded-[8px] bg-[#173c2c] p-5 text-white shadow-[0_18px_45px_rgba(31,65,47,0.18)]">
          <p className="text-[10px] font-black uppercase text-emerald-300">{photoAction.eyebrow}</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="grid h-12 w-12 flex-none place-items-center rounded-[8px] bg-white/10"><Camera className="h-6 w-6" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black leading-6">{photoAction.title}</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-white/65">{photoAction.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-white/60" aria-hidden="true" />
          </div>
          {submissionOpen && (
            <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 text-xs font-black text-amber-200">
              <Trophy className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>베스트 포토 가족에게 선물이 있어요.</span>
            </div>
          )}
        </Link>
      )}

      <section id="event-menu">
        <h2 className="mb-3 text-sm font-black">더 즐기기</h2>
        <div className="grid grid-cols-2 gap-3">
          {context.event.guide?.activities?.length ? (
            <Link to={`/e/${context.eventId}/games?team=${encodeURIComponent(teamToken)}`} className="card p-4">
              <Gamepad2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-black">전통놀이</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-app-muted">8가지 자유 체험 안내</p>
            </Link>
          ) : null}
          {modules?.songRequest && (
            <Link to={`/e/${context.eventId}/songs?team=${encodeURIComponent(teamToken)}`} className="card p-4">
              <Music2 className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-black">신청곡</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-app-muted">곡명·가수·짧은 사연</p>
            </Link>
          )}
        </div>
      </section>

      <section className="card flex items-center gap-3 p-4">
        <Images className="h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
        <p className="text-xs font-bold leading-5 text-app-muted">사진 공개와 투표 시작 시점은 운영팀이 행사 중 안내합니다.</p>
      </section>
    </>
  );
}

export function TeamEntry() {
  const { teamToken } = useParams();
  const navigate = useNavigate();
  const { context, error, loading } = useTeamSession(teamToken);
  const eventDateText = context ? formatKoreanDate(context.event.scheduledAt) || context.event.subtitle : "";
  const participantLabels = getParticipantLabels(context?.event);
  const sonova = isSonovaFamilyDay(context?.event);

  function handleStart() {
    if (!context || !teamToken) {
      return;
    }

    if (context.event.modules?.photoContest) {
      navigate(`/t/${teamToken}/contest`);
      return;
    }

    if (context.event.selfieMode === "none") {
      navigate(`/t/${teamToken}/places`);
      return;
    }

    navigate(`/t/${teamToken}/selfie`);
  }

  return (
    <main className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}>
      <section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>
        {sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-65" />}
        <header className={`relative z-10 border-b px-4 pb-4 pt-3 ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/90" : "border-app-border bg-white/95"}`}>
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            {sonova && context ? <EventBrandMark event={context.event} compact /> : <div className="text-[11px] font-black tracking-[0.08em] text-app-muted">PHOTO MISSION BOARD</div>}
            <div className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">···</div>
          </div>
        </header>

        <div className={`relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-28 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              {participantLabels.singular} 링크 확인 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && context && (
            (context.event.preset === "family-photo-contest" || context.event.modules?.photoContest) && teamToken ? (
              <FamilyEventMenu context={context} teamToken={teamToken} />
            ) : <>
              <section className="rounded-panel bg-gradient-to-br from-app-ink to-slate-700 p-6 text-white">
                <div className="mb-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {participantLabels.singular} 입장 · 링크로 자동 인식
                </div>
                <div
                  className="mb-4 grid h-16 w-16 place-items-center rounded-[22px] text-2xl font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${context.team.color}, #34d399)`,
                  }}
                >
                  {context.team.index}
                </div>
                <h1 className="text-2xl font-black tracking-normal">
                  {getTeamLabel(context.team)}
                </h1>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  {context.event.title}
                  {eventDateText ? ` · ${eventDateText}` : ""}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-700 pt-5">
                  <div>
                    <div className="text-lg font-black">{context.event.perTeamCount}장</div>
                    <div className="text-[11px] font-bold text-slate-400">우리 {participantLabels.singular} 사진</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{context.event.places.length}곳</div>
                    <div className="text-[11px] font-bold text-slate-400">가야 할 장소</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{context.team.joinedMembers.length}명</div>
                    <div className="text-[11px] font-bold text-slate-400">함께</div>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white"
              >
                {getStartLabel(context.event.selfieMode)}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <section className="card flex gap-3 p-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-black">참여자 모두 같은 링크</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                    이 화면에 들어온 모든 사람이 사진을 올리고 볼 수 있어요.
                  </p>
                </div>
              </section>

              <section className="card flex gap-3 p-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-black">우리 {participantLabels.singular}만의 공간</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                    다른 {participantLabels.singular} 사진은 보이지 않아요. 마지막 공개 보드에서 모두 함께 봅니다.
                  </p>
                </div>
              </section>

              {context.event.selfieMode !== "none" && (
                <Link
                  to={`/t/${teamToken}/selfie`}
                  className="card flex gap-3 p-4"
                >
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black">셀카 단계가 필요합니다</h2>
                    <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                      {context.event.selfieMode === "group"
                        ? `${participantLabels.singular} 단체사진 1장을 올리면 장소 미션을 시작합니다.`
                        : "내 셀카를 올리면 장소 미션을 시작할 수 있습니다."}
                    </p>
                  </div>
                  <Users className="mt-1 h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </div>

        {!loading && !error && context && teamToken && (context.event.preset === "family-photo-contest" || context.event.modules?.photoContest) && (
          <nav className={`fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[430px] grid-cols-4 border-t px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(31,65,47,0.08)] ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/95" : "border-app-border bg-white/95"}`} aria-label="참가자 메뉴">
            <Link to={`/t/${teamToken}`} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[#173c2c]"><Home className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-black">홈</span></Link>
            <Link to={`/e/${context.eventId}/guide?team=${encodeURIComponent(teamToken)}`} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[#617466]"><CalendarDays className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-black">일정</span></Link>
            <Link to={`/t/${teamToken}/contest`} className="flex min-h-12 flex-col items-center justify-center gap-1 text-[#617466]"><Camera className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-black">사진</span></Link>
            <a href="#event-menu" className="flex min-h-12 flex-col items-center justify-center gap-1 text-[#617466]"><Menu className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-black">더보기</span></a>
          </nav>
        )}
      </section>
    </main>
  );
}
