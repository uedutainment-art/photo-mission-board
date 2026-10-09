import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { formatKoreanDate } from "../lib/formatDate";

export function EventGuide() {
  const { eventId } = useParams();
  const { event, loading, error } = usePublicEvent(eventId);

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <Link to={`/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="행사 메뉴로 돌아가기">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">행사 안내</h1>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {loading && <div className="card p-5 text-center text-sm font-black text-app-muted">불러오는 중</div>}
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {event && (
            <>
              <section className="rounded-panel bg-app-ink p-5 text-white">
                <p className="text-[11px] font-black text-slate-400">EVENT GUIDE</p>
                <h2 className="mt-2 text-2xl font-black">{event.title}</h2>
                {(event.guide?.intro || event.subtitle) && <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{event.guide?.intro || event.subtitle}</p>}
              </section>

              {(event.scheduledAt || event.guide?.venue) && (
                <section className="card divide-y divide-app-border p-4">
                  {event.scheduledAt && (
                    <div className="flex items-center gap-3 pb-3 last:pb-0">
                      <CalendarDays className="h-5 w-5 text-app-primary" aria-hidden="true" />
                      <div><p className="text-xs font-black text-app-muted">행사 일정</p><p className="mt-1 text-sm font-black">{formatKoreanDate(event.scheduledAt)}</p></div>
                    </div>
                  )}
                  {event.guide?.venue && (
                    <div className="flex items-center gap-3 pt-3 first:pt-0">
                      <MapPin className="h-5 w-5 text-app-primary" aria-hidden="true" />
                      <div><p className="text-xs font-black text-app-muted">행사 장소</p><p className="mt-1 text-sm font-black">{event.guide.venue}</p></div>
                    </div>
                  )}
                </section>
              )}

              {event.guide?.schedule && event.guide.schedule.length > 0 && (
                <section className="card p-4">
                  <h2 className="text-sm font-black">시간표</h2>
                  <div className="mt-3 divide-y divide-app-border">
                    {event.guide.schedule.map((item) => (
                      <div key={item.id} className="grid grid-cols-[64px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="inline-flex items-start gap-1 text-xs font-black text-app-primary"><Clock3 className="mt-0.5 h-3.5 w-3.5" aria-hidden="true" />{item.time}</span>
                        <div><p className="text-sm font-black">{item.title}</p>{item.description && <p className="mt-1 text-xs font-bold leading-5 text-app-muted">{item.description}</p>}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="card p-4">
                <h2 className="text-sm font-black">장소·활동 안내</h2>
                <div className="mt-3 divide-y divide-app-border">
                  {event.places.map((place) => (
                    <div key={place.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-app-primary" aria-hidden="true" /><strong className="text-sm font-black">{place.name}</strong></div>
                      {place.description && <p className="mt-1 pl-6 text-xs font-bold leading-5 text-app-muted">{place.description}</p>}
                      {place.mapUrl && <a href={place.mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block pl-6 text-xs font-black text-app-primary">지도에서 보기</a>}
                    </div>
                  ))}
                </div>
              </section>

              {event.guide?.notices && event.guide.notices.length > 0 && (
                <section className="card p-4">
                  <h2 className="text-sm font-black">이용 안내</h2>
                  <ul className="mt-3 space-y-2">
                    {event.guide.notices.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm font-bold leading-6 text-app-muted"><span className="text-app-primary">•</span><span>{item}</span></li>)}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
