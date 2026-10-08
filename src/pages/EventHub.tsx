import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Album, CalendarDays, Camera, Loader2, Music2 } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ensureUploaderUser } from "../lib/teamSession";
import type { MissionEvent } from "../lib/types";

export function EventHub() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<(MissionEvent & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return undefined;
    let unsubscribe: (() => void) | undefined;
    let active = true;

    void ensureUploaderUser()
      .then(() => {
        if (!active) return;
        unsubscribe = onSnapshot(doc(db, "events", eventId), (snapshot) => {
          if (!snapshot.exists()) {
            setError("행사를 찾을 수 없습니다.");
            setLoading(false);
            return;
          }
          setEvent({ ...(snapshot.data() as MissionEvent), id: snapshot.id });
          setLoading(false);
        }, () => {
          setError("행사 정보를 불러오지 못했습니다.");
          setLoading(false);
        });
      })
      .catch(() => {
        setError("행사에 접속하지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [eventId]);

  const modules = event?.modules;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="bg-app-ink px-5 pb-6 pt-5 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">EVENT HUB</p>
          <h1 className="mt-2 text-2xl font-black tracking-normal">{event?.title ?? "행사 메뉴"}</h1>
          <p className="mt-2 text-sm font-bold text-slate-300">필요한 메뉴를 선택해주세요.</p>
        </header>
        <div className="flex-1 bg-slate-50 p-4">
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && event && eventId && (
            <div className="grid grid-cols-2 gap-3">
              {(modules?.guide ?? true) && <Link to={`/e/${eventId}/guide`} className="card p-4"><CalendarDays className="h-6 w-6 text-app-primary" /><h2 className="mt-4 text-sm font-black">행사 안내</h2><p className="mt-1 text-xs font-bold text-app-muted">시간표·장소·이용 안내</p></Link>}
              {modules?.songRequest && <Link to={`/e/${eventId}/songs`} className="card p-4"><Music2 className="h-6 w-6 text-rose-500" /><h2 className="mt-4 text-sm font-black">신청곡</h2><p className="mt-1 text-xs font-bold text-app-muted">곡명·가수·짧은 사연</p></Link>}
              {modules?.photoContest && <Link to={`/e/${eventId}/join`} className="card p-4"><Camera className="h-6 w-6 text-amber-600" /><h2 className="mt-4 text-sm font-black">사진 콘테스트</h2><p className="mt-1 text-xs font-bold text-app-muted">사진 등록·감상·투표</p></Link>}
              {(modules?.archive ?? true) && <Link to={`/e/${eventId}/archive`} className="card p-4"><Album className="h-6 w-6 text-emerald-600" /><h2 className="mt-4 text-sm font-black">행사 후 기록</h2><p className="mt-1 text-xs font-bold text-app-muted">준비되면 공개됩니다</p></Link>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
