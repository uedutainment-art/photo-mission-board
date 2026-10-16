import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Camera,
  ChevronRight,
  CircleDot,
  Cookie,
  Dices,
  Footprints,
  Grid3X3,
  Layers3,
  Loader2,
  Target,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import { EventBrandMark } from "../components/EventBrandMark";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { isSonovaFamilyDay } from "../lib/eventBrand";

const activityIcons: Record<string, LucideIcon> = {
  air: CircleDot,
  jegi: Footprints,
  yut: Dices,
  ddakji: Layers3,
  tuho: Target,
  hopscotch: Grid3X3,
  biseok: Box,
  dalgona: Cookie,
};

const guidePages: Record<string, number> = {
  air: 1, jegi: 2, yut: 3, ddakji: 4,
  tuho: 5, hopscotch: 6, biseok: 7, dalgona: 8,
};

export function EventActivities() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const teamToken = searchParams.get("team");
  const { event, loading, error } = usePublicEvent(eventId);
  const activities = event?.guide?.activities ?? [];
  const sonova = isSonovaFamilyDay(event);
  const selected = activities.find((activity) => activity.id === searchParams.get("activity"));
  const page = sonova && selected ? guidePages[selected.id] : undefined;
  const listParams = new URLSearchParams(searchParams);
  listParams.delete("activity");
  const listUrl = `/e/${eventId}/games?${listParams}`;

  return (
    <main className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}>
      <section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>
        {sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55" />}
        <header className={`relative z-10 border-b px-4 pb-4 pt-3 ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/90" : "border-app-border bg-white"}`}>
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <Link to={page ? listUrl : teamToken ? `/t/${teamToken}` : `/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label={page ? "놀이 목록으로 돌아가기" : "행사 메뉴로 돌아가기"}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">{page ? selected?.title : "전통놀이 자유 체험"}</h1>
            <div className="flex h-10 w-20 items-center justify-end">{event && sonova ? <EventBrandMark event={event} compact /> : null}</div>
          </div>
        </header>

        <div key={page ?? "list"} className={`relative z-10 flex-1 space-y-4 overflow-y-auto p-4 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
          {loading && <section className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 안내 불러오는 중</section>}
          {error && <section className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</section>}
          {!loading && !error && page && selected && (
            <section className="space-y-3">
              <a href={`/assets/traditional-guides/guide-${page}.jpg`} target="_blank" rel="noreferrer" className="flex items-center justify-end gap-2 text-sm font-bold text-[#173c2c]"><ZoomIn size={18} />확대 보기</a>
              <img src={`/assets/traditional-guides/guide-${page}.jpg`} alt={`${selected.title} 안내판: 놀이 방법, 어린이용 방법과 안전 수칙`} width={990} height={1400} className="h-auto w-full bg-white" />
              <p className="text-sm leading-6">{selected.instruction}</p>
              {selected.notice && <p className="text-sm leading-6 text-amber-800">{selected.notice}</p>}
              <Link to={listUrl} className="flex items-center justify-center gap-2 py-3 font-bold"><ArrowLeft size={18} />놀이 목록</Link>
            </section>
          )}
          {!loading && !error && event && !page && (
            <>
              <section className={sonova ? "rounded-[8px] border border-white/80 bg-[#173c2c]/95 p-5 text-white shadow-[0_18px_45px_rgba(31,65,47,0.14)]" : "rounded-panel bg-app-ink p-5 text-white"}>
                <p className="text-[11px] font-black text-emerald-300">{sonova ? "SONOVA FAMILY DAY · TRADITIONAL PLAY" : "TRADITIONAL PLAY"}</p>
                <h2 className="mt-2 text-2xl font-black">원하는 놀이부터<br />자유롭게 즐겨주세요</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-300">횟수·점수·완료 확인 없이 가족과 편하게 체험하는 시간입니다.</p>
              </section>

              <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-950">마음에 드는 놀이 3개만 골라도 충분해요</p>
                <p className="mt-1 text-xs font-bold leading-5 text-amber-800">잘하는 모습보다 함께 웃는 순간을 즐겨보세요. 가장 즐거운 장면은 사진 미션으로 남길 수 있습니다.</p>
              </section>

              <section className="grid grid-cols-2 gap-3">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.id] ?? CircleDot;
                  const params = new URLSearchParams(searchParams);
                  params.set("activity", activity.id);
                  return (
                    <article key={activity.id} className="card relative min-h-[164px] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                        <span className="text-[11px] font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <h3 className="mt-3 text-sm font-black">{activity.title}</h3>
                      <p className="mt-2 text-xs font-bold leading-5 text-app-muted">{activity.instruction}</p>
                      {activity.notice && <p className="mt-2 text-[11px] font-black leading-4 text-amber-700">{activity.notice}</p>}
                      {sonova && guidePages[activity.id] && <Link to={`/e/${eventId}/games?${params}`} aria-label={`${activity.title} 안내판 보기`} className="mt-3 flex items-center gap-1 text-xs font-black text-emerald-800 after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-emerald-700">안내판 보기<ChevronRight size={16} /></Link>}
                    </article>
                  );
                })}
              </section>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h2 className="text-sm font-black text-emerald-900">함께 지켜주세요</h2>
                <p className="mt-2 text-xs font-bold leading-5 text-emerald-800">다른 가족도 이용할 수 있도록 차례를 지키고, 놀이 도구는 사용 후 제자리에 놓아주세요. 주변 가족과 안전거리를 유지해주세요.</p>
              </section>

              {teamToken && event.modules?.photoContest ? (
                <Link to={`/t/${teamToken}/contest`} className="card flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-[#173c2c] text-white"><Camera className="h-5 w-5" aria-hidden="true" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-black">전통놀이 사진 미션 채우기</p><p className="mt-1 text-xs font-bold leading-5 text-app-muted">함께 즐기는 장면 한 장을 바로 남겨보세요.</p></div>
                  <ChevronRight className="h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
                </Link>
              ) : (
                <section className="card flex items-center gap-3 p-4">
                  <CircleDot className="h-5 w-5 flex-none text-app-primary" aria-hidden="true" />
                  <p className="text-xs font-bold leading-5 text-app-muted">사진 콘테스트에는 전통놀이를 함께 즐기는 장면도 한 장 정도 자유롭게 남겨보세요.</p>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
