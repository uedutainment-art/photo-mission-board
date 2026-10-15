import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  CircleDot,
  Cookie,
  Dices,
  Footprints,
  Grid3X3,
  Layers3,
  Loader2,
  Target,
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

export function EventActivities() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const teamToken = searchParams.get("team");
  const { event, loading, error } = usePublicEvent(eventId);
  const activities = event?.guide?.activities ?? [];
  const sonova = isSonovaFamilyDay(event);

  return (
    <main className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}>
      <section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>
        {sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55" />}
        <header className={`relative z-10 border-b px-4 pb-4 pt-3 ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/90" : "border-app-border bg-white"}`}>
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <Link to={teamToken ? `/t/${teamToken}` : `/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="행사 메뉴로 돌아가기">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">전통놀이 자유 체험</h1>
            <div className="flex h-10 w-16 items-center justify-end">{event && sonova ? <EventBrandMark event={event} /> : null}</div>
          </div>
        </header>

        <div className={`relative z-10 flex-1 space-y-4 overflow-y-auto p-4 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
          {loading && <section className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 안내 불러오는 중</section>}
          {error && <section className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</section>}
          {!loading && !error && event && (
            <>
              <section className={sonova ? "rounded-[8px] border border-white/80 bg-[#173c2c]/95 p-5 text-white shadow-[0_18px_45px_rgba(31,65,47,0.14)]" : "rounded-panel bg-app-ink p-5 text-white"}>
                <p className="text-[11px] font-black text-emerald-300">{sonova ? "SONOVA FAMILY DAY · TRADITIONAL PLAY" : "TRADITIONAL PLAY"}</p>
                <h2 className="mt-2 text-2xl font-black">원하는 놀이부터<br />자유롭게 즐겨주세요</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-300">횟수·점수·완료 확인 없이 가족과 편하게 체험하는 시간입니다.</p>
              </section>

              <section className="grid grid-cols-2 gap-3">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.id] ?? CircleDot;
                  return (
                    <article key={activity.id} className="card min-h-[164px] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                        <span className="text-[11px] font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <h3 className="mt-3 text-sm font-black">{activity.title}</h3>
                      <p className="mt-2 text-xs font-bold leading-5 text-app-muted">{activity.instruction}</p>
                      {activity.notice && <p className="mt-2 text-[11px] font-black leading-4 text-amber-700">{activity.notice}</p>}
                    </article>
                  );
                })}
              </section>

              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h2 className="text-sm font-black text-emerald-900">함께 지켜주세요</h2>
                <p className="mt-2 text-xs font-bold leading-5 text-emerald-800">다른 가족도 이용할 수 있도록 차례를 지키고, 놀이 도구는 사용 후 제자리에 놓아주세요. 주변 가족과 안전거리를 유지해주세요.</p>
              </section>

              <section className="card flex items-center gap-3 p-4">
                <CircleDot className="h-5 w-5 flex-none text-app-primary" aria-hidden="true" />
                <p className="text-xs font-bold leading-5 text-app-muted">사진 콘테스트에는 전통놀이를 함께 즐기는 장면도 한 장 정도 자유롭게 남겨보세요.</p>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
