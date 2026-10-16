import { useEffect, useState } from "react";
import { deleteField, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { BookOpen, Check, Music2, Trophy, X } from "lucide-react";
import { db } from "../lib/firebase";
import { useSongRequests } from "../hooks/useSongRequests";

export function StoryDesk({ eventId, votingClosed }: { eventId: string; votingClosed: boolean }) {
  const requests = useSongRequests(eventId, true);
  const [selected, setSelected] = useState('');
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  useEffect(() => onSnapshot(doc(db, 'events', eventId, 'private', 'story'), s => setSelected(s.data()?.requestId ?? '')), [eventId]);
  useEffect(() => onSnapshot(doc(db, 'events', eventId), s => setPublished(Boolean(s.data()?.results?.storyAward))), [eventId]);
  const current = requests.find(r => r.id === reading);
  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했습니다.'); } finally { setBusy(false); }
  }
  async function publish() {
    await runTransaction(db, async transaction => {
      const eventRef = doc(db, 'events', eventId);
      const selection = await transaction.get(doc(db, 'events', eventId, 'private', 'story'));
      const event = await transaction.get(eventRef);
      if (event.get('voting.status') !== 'closed' || !selection.get('requestId')) throw new Error('투표 마감 후 수상 사연을 선택해주세요.');
      const request = await transaction.get(doc(db, 'events', eventId, 'songRequests', selection.get('requestId')));
      if (!request.exists() || !request.get('story')) throw new Error('사연이 있는 신청곡을 선택해주세요.');
      transaction.update(eventRef, { 'results.storyAward': { requestId: request.id, familyName: request.get('familyName') ?? '참가자', story: request.get('story'), songTitle: request.get('songTitle') } });
    });
  }
  return <section id="song-requests" className="card scroll-mt-24 p-4">
    <h2 className="text-lg font-black">저녁 만찬 신청곡 · 사연</h2>
    <p className="mt-1 text-sm text-app-muted">소개 완료 {requests.filter(r => r.playedAt).length}/{requests.length} · 베스트 사연 선물 10,000원 상당</p>
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    <div className="mt-4 divide-y divide-app-border">{requests.map(request => <article key={request.id} className="py-4">
      <p className="text-sm font-black text-app-primary">{request.familyName ?? '가족 미확인'} {request.playedAt ? '· 소개 완료' : ''}</p>
      <h3 className="mt-1 font-black">{request.songTitle} · {request.artist}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{request.story || '사연 없음'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => setReading(request.id)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"><BookOpen className="h-4 w-4" />크게 읽기</button>
        <button disabled={busy} onClick={() => void act(() => updateDoc(doc(db, 'events', eventId, 'songRequests', request.id), { playedAt: request.playedAt ? deleteField() : serverTimestamp() }))} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"><Music2 className="h-4 w-4" />{request.playedAt ? '완료 취소' : '소개 완료'}</button>
        <button disabled={busy || !request.story || published} onClick={() => void act(() => setDoc(doc(db, 'events', eventId, 'private', 'story'), { requestId: request.id }))} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40 ${selected === request.id ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}><Trophy className="h-4 w-4" />{selected === request.id ? '베스트 사연 선정됨' : '베스트 사연 선정'}</button>
      </div>
    </article>)}</div>
    {!requests.length && <p className="py-6 text-center text-app-muted">신청곡이 들어오면 여기에 표시됩니다.</p>}
    <button disabled={busy || !selected || !votingClosed || published} onClick={() => setReading('publish')} className="mt-4 w-full rounded-lg bg-app-ink p-3 font-black text-white disabled:opacity-40">{published ? '베스트 사연 공개됨' : '베스트 사연 공개'}</button>
    {reading && <div role="dialog" aria-modal="true" aria-label="사연 진행 화면" className="fixed inset-0 z-50 overflow-y-auto bg-white p-6 sm:p-12"><button onClick={() => setReading(null)} aria-label="닫기" className="ml-auto block p-3"><X /></button>
      {reading === 'publish' ? <div className="mx-auto max-w-xl"><h2 className="text-2xl font-black">선정한 사연을 공개할까요?</h2><p className="my-5">{requests.find(r => r.id === selected)?.familyName} · 모든 참가자에게 이름과 사연이 표시됩니다.</p><button disabled={busy} onClick={() => void act(async () => { await publish(); setReading(null); })} className="rounded-lg bg-app-primary p-4 font-black text-white"><Check className="inline h-5 w-5" /> 공개하기</button></div>
      : <div className="mx-auto max-w-3xl"><p className="text-xl font-bold text-app-primary">{current?.familyName}</p><h2 className="mt-4 text-3xl font-black">{current?.songTitle} · {current?.artist}</h2><p className="mt-8 whitespace-pre-wrap break-words text-2xl leading-relaxed">{current?.story || '사연 없음'}</p></div>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    </div>}
  </section>;
}
