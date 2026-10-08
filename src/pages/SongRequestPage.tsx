import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Music2 } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { auth, db } from "../lib/firebase";

export function SongRequestPage() {
  const { eventId } = useParams();
  const { event } = usePublicEvent(eventId);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!eventId || !auth.currentUser || !songTitle.trim() || !artist.trim()) return;
    setBusy(true); setError(null);
    try {
      await addDoc(collection(db, "events", eventId, "songRequests"), { eventId, songTitle: songTitle.trim(), artist: artist.trim(), story: story.trim(), requesterId: auth.currentUser.uid, submittedAt: serverTimestamp() });
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "신청곡을 접수하지 못했습니다.");
    } finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink"><section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone"><header className="border-b border-app-border bg-white px-4 pb-4 pt-3"><div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><Link to={`/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-base font-black">신청곡</h1><Music2 className="h-5 w-5 text-rose-500" /></div></header><div className="flex-1 bg-slate-50 p-4">{done ? <div className="card p-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-4 text-lg font-black">신청곡을 접수했습니다</h2><p className="mt-2 text-sm font-bold text-app-muted">운영 상황에 따라 재생되지 않을 수 있습니다.</p><button type="button" onClick={() => { setDone(false); setSongTitle(""); setArtist(""); setStory(""); }} className="mt-5 rounded-2xl bg-app-ink px-5 py-3 text-sm font-black text-white">한 곡 더 신청</button></div> : <div className="card p-5"><p className="text-xs font-black text-app-muted">{event?.title}</p><h2 className="mt-1 text-xl font-black">함께 듣고 싶은 곡</h2><div className="mt-5 space-y-3"><input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="곡명 *" className="w-full rounded-2xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /><input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="가수 *" className="w-full rounded-2xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /><textarea value={story} onChange={(e) => setStory(e.target.value.slice(0,100))} placeholder="짧은 사연 (선택)" rows={4} className="w-full resize-none rounded-2xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /></div>{error && <p className="mt-3 text-xs font-black text-red-700">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy || !songTitle.trim() || !artist.trim()} className="mt-4 w-full rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200">신청하기</button></div>}</div></section></main>;
}
