import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEventLive } from "../hooks/useEventLive";
import { db } from "../lib/firebase";
import type { EventGuideScheduleItem, EventGuideSettings } from "../lib/types";

function newScheduleItem(): EventGuideScheduleItem {
  return { id: crypto.randomUUID(), time: "", title: "", description: "" };
}

export function EventGuideEditor() {
  const { eventId } = useParams();
  const { event, loading, error } = useEventLive(eventId);
  const [intro, setIntro] = useState("");
  const [venue, setVenue] = useState("");
  const [schedule, setSchedule] = useState<EventGuideScheduleItem[]>([]);
  const [noticesText, setNoticesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setIntro(event.guide?.intro ?? "");
    setVenue(event.guide?.venue ?? "");
    setSchedule(event.guide?.schedule ?? []);
    setNoticesText((event.guide?.notices ?? []).join("\n"));
  }, [event]);

  function updateScheduleItem(id: string, change: Partial<EventGuideScheduleItem>) {
    setSchedule((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  }

  async function handleSave() {
    if (!eventId) return;
    const cleanSchedule = schedule
      .map((item) => ({
        id: item.id,
        time: item.time.trim(),
        title: item.title.trim(),
        ...(item.description?.trim() ? { description: item.description.trim() } : {}),
      }))
      .filter((item) => item.time && item.title);
    const guide: EventGuideSettings = {
      ...(intro.trim() ? { intro: intro.trim() } : {}),
      ...(venue.trim() ? { venue: venue.trim() } : {}),
      schedule: cleanSchedule,
      notices: noticesText.split("\n").map((item) => item.trim()).filter(Boolean),
    };

    setSaving(true);
    setLocalError(null);
    setNotice(null);
    try {
      await updateDoc(doc(db, "events", eventId), { guide, updatedAt: serverTimestamp() });
      setNotice("참가자 행사 안내를 저장했습니다.");
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "행사 안내를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link to={eventId ? `/events/${eventId}` : "/events"} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="이벤트로 돌아가기">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-black text-app-muted">{event?.title}</p>
              <h1 className="text-base font-black">행사 안내 편집</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</div>}
          {(error || localError) && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error || localError}</div>}
          {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">{notice}</div>}

          {!loading && event && (
            <>
              <section className="card p-4">
                <label className="block text-xs font-black text-app-muted">첫 안내 문구</label>
                <textarea value={intro} onChange={(changeEvent) => setIntro(changeEvent.target.value)} rows={3} placeholder="예: 오늘 우리 가족의 즐거운 순간을 사진으로 남겨주세요." className="mt-2 w-full resize-none rounded-xl border border-app-border px-3 py-3 text-sm font-bold leading-6 outline-none focus:border-app-primary" />
                <label className="mt-4 block text-xs font-black text-app-muted">행사 장소</label>
                <input value={venue} onChange={(changeEvent) => setVenue(changeEvent.target.value)} placeholder="예: 소노캄 그랜드볼룸" className="mt-2 w-full rounded-xl border border-app-border px-3 py-3 text-sm font-bold outline-none focus:border-app-primary" />
              </section>

              <section className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black">행사 시간표</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">시간과 제목이 있는 항목만 표시됩니다.</p>
                  </div>
                  <button type="button" onClick={() => setSchedule((current) => [...current, newScheduleItem()])} className="grid h-10 w-10 place-items-center rounded-xl bg-app-ink text-white" aria-label="시간표 추가">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {schedule.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-app-border bg-slate-50 p-3">
                      <div className="grid grid-cols-[92px_1fr_auto] gap-2">
                        <input value={item.time} onChange={(changeEvent) => updateScheduleItem(item.id, { time: changeEvent.target.value })} placeholder="14:10" className="min-w-0 rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-black outline-none focus:border-app-primary" />
                        <input value={item.title} onChange={(changeEvent) => updateScheduleItem(item.id, { title: changeEvent.target.value })} placeholder="가족 활동" className="min-w-0 rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-black outline-none focus:border-app-primary" />
                        <button type="button" onClick={() => setSchedule((current) => current.filter((candidate) => candidate.id !== item.id))} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-red-600" aria-label="시간표 삭제">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <input value={item.description ?? ""} onChange={(changeEvent) => updateScheduleItem(item.id, { description: changeEvent.target.value })} placeholder="선택 설명" className="mt-2 w-full rounded-xl border border-app-border bg-white px-3 py-2 text-xs font-bold outline-none focus:border-app-primary" />
                    </div>
                  ))}
                  {schedule.length === 0 && <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-app-muted">등록된 시간표가 없습니다.</p>}
                </div>
              </section>

              <section className="card p-4">
                <label className="block text-sm font-black">이용 안내</label>
                <p className="mt-1 text-xs font-bold text-app-muted">한 줄에 안내 하나씩 입력합니다.</p>
                <textarea value={noticesText} onChange={(changeEvent) => setNoticesText(changeEvent.target.value)} rows={5} placeholder={"가족별 코드는 다른 가족과 공유하지 마세요.\n사진 접수 마감 전까지 대표사진을 교체할 수 있습니다."} className="mt-3 w-full resize-none rounded-xl border border-app-border px-3 py-3 text-sm font-bold leading-6 outline-none focus:border-app-primary" />
              </section>

              <button type="button" onClick={() => void handleSave()} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "저장 중" : "참가자 안내 저장"}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
