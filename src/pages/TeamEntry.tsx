import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, ChevronRight, Gamepad2, Images, Loader2, Music2, Share2, Target, Users } from "lucide-react";
import { EventBrandMark } from "../components/EventBrandMark";
import { useTeamSession, type TeamSessionContext } from "../hooks/useTeamSession";
import { isSonovaFamilyDay } from "../lib/eventBrand";
import { formatKoreanDate } from "../lib/formatDate";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel } from "../lib/teamLabel";

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

  return (
    <>
      <section className={sonova ? "overflow-hidden rounded-[8px] border border-white/80 bg-white/90 shadow-[0_18px_45px_rgba(31,65,47,0.14)]" : "rounded-panel bg-app-ink p-6 text-white"}>
        {sonova ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[#d9dfd2] px-5 py-5">
              <EventBrandMark event={context.event} />
              <span className="rounded-full border border-[#9eb4a5] px-3 py-1 text-[9px] font-black uppercase text-[#385444]">Family Day</span>
            </div>
            <div className="px-5 py-5">
              <p className="text-[10px] font-black uppercase text-[#78877c]">Welcome to</p>
              <h1 className="mt-2 text-2xl font-black leading-8 text-[#173c2c]">{context.event.title}</h1>
              <div className="mt-5 flex items-center justify-between border-t border-[#d9dfd2] pt-4">
                <p className="text-xs font-bold text-[#617466]">함께하는 가족</p>
                <p className="text-lg font-black text-[#173c2c]">{getTeamLabel(context.team)}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">FAMILY DAY</p>
            <h1 className="mt-2 text-2xl font-black tracking-normal">{context.event.title}</h1>
            <div className="mt-5 border-t border-slate-700 pt-4">
              <p className="text-xs font-bold text-slate-400">로그인한 가족</p>
              <p className="mt-1 text-lg font-black">{getTeamLabel(context.team)}</p>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black">행사 메뉴</h2>
        <div className="grid grid-cols-2 gap-3">
          {(modules?.guide ?? true) && (
            <Link to={`/e/${context.eventId}/guide?team=${encodeURIComponent(teamToken)}`} className="card p-4">
              <CalendarDays className="h-6 w-6 text-app-primary" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-black">행사 안내</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-app-muted">시간표·장소·이용 안내</p>
            </Link>
          )}
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
          {modules?.photoContest && (
            <Link to={`/t/${teamToken}/contest`} className="card col-span-2 flex items-center gap-4 p-4">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-amber-100 text-amber-700"><Camera className="h-6 w-6" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black">사진 콘테스트</h3>
                <p className="mt-1 text-xs font-bold leading-5 text-app-muted">우리 가족 사진 등록·감상·투표</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
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

        <div className={`relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto p-4 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
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
      </section>
    </main>
  );
}
