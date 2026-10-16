import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Music2 } from "lucide-react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { EventBrandMark } from "../components/EventBrandMark";
import { ParticipantNav } from "../components/ParticipantNav";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { auth, db } from "../lib/firebase";
import { isSonovaFamilyDay } from "../lib/eventBrand";
import { getTeamLabel } from "../lib/teamLabel";
import { readLatestTeamSessionForEvent, readStoredTeamSession } from "../lib/teamSession";

// Tags the request with the family this phone joined as, so operators can see who asked for the song.
async function readRequestingFamily(eventId: string, teamToken: string | null): Promise<{ teamId?: string; familyName?: string }> {
  const session = (teamToken ? readStoredTeamSession(teamToken) : null) ?? readLatestTeamSessionForEvent(eventId);
  if (!session || session.eventId !== eventId) return {};
  try {
    const team = await getDoc(doc(db, "events", eventId, "teams", session.teamId));
    const data = team.data() as { name: string; displayName?: string } | undefined;
    return data ? { teamId: session.teamId, familyName: getTeamLabel(data) } : { teamId: session.teamId };
  } catch {
    return { teamId: session.teamId };
  }
}

export function SongRequestPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const teamToken = searchParams.get("team") || (eventId ? readLatestTeamSessionForEvent(eventId)?.token : null) || null;
  const { event } = usePublicEvent(eventId);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sonova = isSonovaFamilyDay(event);
  async function submit() {
    if (!eventId || !auth.currentUser || !songTitle.trim() || !artist.trim()) return;
    setBusy(true); setError(null);
    try {
      const family = await readRequestingFamily(eventId, teamToken);
      await addDoc(collection(db, "events", eventId, "songRequests"), { eventId, songTitle: songTitle.trim(), artist: artist.trim(), story: story.trim(), requesterId: auth.currentUser.uid, ...family, submittedAt: serverTimestamp() });
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "신청곡을 접수하지 못했습니다.");
    } finally { setBusy(false); }
  }
  return <main className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}><section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>{sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55" />}<header className={`relative z-10 border-b px-4 pb-4 pt-3 ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/90" : "border-app-border bg-white"}`}><div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><Link to={teamToken ? `/t/${teamToken}` : `/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-base font-black">신청곡</h1><div className="flex h-10 w-24 items-center justify-end">{event && sonova ? <EventBrandMark event={event} compact /> : <Music2 className="h-5 w-5 text-rose-500" />}</div></div></header><div className={`relative z-10 flex-1 p-4 pb-28 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>{done ? <div className="card p-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-4 text-lg font-black">신청곡을 접수했습니다</h2><p className="mt-2 text-sm font-bold text-app-muted">운영 상황에 따라 재생되지 않을 수 있습니다.</p><button type="button" onClick={() => { setDone(false); setSongTitle(""); setArtist(""); setStory(""); }} className={`mt-5 px-5 py-3 text-sm font-black text-white ${sonova ? "rounded-[6px] bg-[#173c2c]" : "rounded-2xl bg-app-ink"}`}>한 곡 더 신청</button><Link to={teamToken ? `/t/${teamToken}` : `/e/${eventId}`} className="mt-3 block rounded-lg border border-app-border px-4 py-3 text-sm font-black">홈으로 돌아가기</Link></div> : <div className="card p-5"><p className="text-xs font-black text-app-muted">{event?.title}</p><h2 className="mt-1 text-xl font-black">저녁 만찬 신청곡</h2><p className="mt-2 text-xs font-bold leading-5 text-app-muted">저녁 만찬 시간에 사연과 함께 소개해 드립니다. 베스트 사연에도 선물이 있어요. 모든 곡이 재생되지 않을 수 있습니다.</p><div className="mt-5 space-y-3"><input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="곡명 *" className="w-full rounded-xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /><input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="가수 *" className="w-full rounded-xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /><textarea value={story} onChange={(e) => setStory(e.target.value.slice(0,500))} placeholder="함께 나누고 싶은 사연 (500자 이내)" rows={4} className="w-full resize-none rounded-xl border border-app-border px-4 py-3 text-sm font-bold outline-none" /></div>{error && <p className="mt-3 text-xs font-black text-red-700">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy || !songTitle.trim() || !artist.trim()} className={`mt-4 w-full px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 ${sonova ? "rounded-[6px] bg-[#173c2c]" : "rounded-2xl bg-app-primary"}`}>신청하기</button></div>}</div></section>{eventId && teamToken && <ParticipantNav eventId={eventId} teamToken={teamToken} active="more" sonova={sonova} />}</main>;
}
