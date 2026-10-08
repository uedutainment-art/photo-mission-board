import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Vote, X } from "lucide-react";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventTeams } from "../hooks/useEventTeams";
import { useContestVote } from "../hooks/useContestVote";
import { useTeamSession } from "../hooks/useTeamSession";
import { castContestVote } from "../lib/contest";
import { getTeamLabel } from "../lib/teamLabel";

function stableOrder(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function ContestGallery() {
  const { teamToken } = useParams();
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { submissions, error: submissionError, loading: submissionLoading } = useContestSubmissions(context?.eventId);
  const { teams } = useEventTeams(context?.eventId);
  const myVote = useContestVote(context?.eventId, context?.teamId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const visibleSubmissions = useMemo(
    () => submissions.filter((item) => !item.hidden).sort((a, b) => stableOrder(`${context?.eventId}:${a.id}`) - stableOrder(`${context?.eventId}:${b.id}`)),
    [context?.eventId, submissions],
  );
  const selected = visibleSubmissions.find((item) => item.id === selectedId) ?? null;
  const votingOpen = context?.event.voting?.status === "open";

  async function handleVote(targetTeamId: string) {
    if (!context) return;
    setBusyId(targetTeamId);
    setError(null);
    try {
      await castContestVote(context.eventId, targetTeamId);
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "투표를 저장하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  const loading = sessionLoading || submissionLoading;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface relative overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between"><Link to={`/t/${teamToken}/contest`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><div className="text-center"><h1 className="text-base font-black">전체 사진</h1><p className="text-[11px] font-bold text-app-muted">{visibleSubmissions.length}개 참가 사진</p></div><div className="h-10 w-10" /></div>
        </header>
        <div className="flex-1 bg-slate-50 p-4">
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 사진 불러오는 중</div>}
          {(sessionError || submissionError || error) && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{sessionError || submissionError || error}</div>}
          {!loading && context && (
            <>
              <section className="mb-4 rounded-2xl bg-app-ink p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-[11px] font-black text-slate-400">{votingOpen ? "투표 진행 중" : context.event.voting?.status === "closed" ? "투표 마감" : "사진 감상"}</p><h2 className="mt-1 text-sm font-black">{votingOpen ? "마음에 드는 사진 한 장을 골라주세요" : "다른 참가자의 사진을 둘러보세요"}</h2></div><Vote className="h-5 w-5 text-slate-300" /></div>{myVote && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-black">선택 완료 · 다른 사진을 누르면 변경됩니다</p>}</section>
              <div className="grid grid-cols-3 gap-1">
                {visibleSubmissions.map((submission) => {
                  const team = teamById.get(submission.teamId);
                  return <button key={submission.id} type="button" onClick={() => setSelectedId(submission.id)} className="relative aspect-square overflow-hidden bg-slate-200"><img src={submission.thumbUrl} alt={submission.title} className="h-full w-full object-cover" /><span className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-black text-white">{team ? getTeamLabel(team) : "참가자"}</span>{myVote?.teamId === submission.teamId && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-app-primary text-white"><Check className="h-3.5 w-3.5" /></span>}</button>;
                })}
              </div>
              {visibleSubmissions.length === 0 && <div className="card p-8 text-center text-sm font-black text-app-muted">아직 등록된 사진이 없습니다.</div>}
            </>
          )}
        </div>
        {selected && context && (
          <div className="absolute inset-0 z-10 flex flex-col bg-white">
            <div className="relative flex-1 bg-slate-950"><img src={selected.originalUrl} alt={selected.title} className="h-full w-full object-contain" /><button type="button" onClick={() => setSelectedId(null)} className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white" aria-label="닫기"><X className="h-5 w-5" /></button></div>
            <div className="p-4"><p className="text-xs font-black text-app-muted">{teamById.get(selected.teamId) ? getTeamLabel(teamById.get(selected.teamId)!) : "참가자"}</p><h2 className="mt-1 text-lg font-black">{selected.title}</h2>{selected.teamId === context.teamId ? <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-app-muted">우리 사진에는 투표할 수 없습니다.</p> : votingOpen ? <button type="button" onClick={() => void handleVote(selected.teamId)} disabled={busyId === selected.teamId} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:opacity-50">{busyId === selected.teamId && <Loader2 className="h-4 w-4 animate-spin" />}{myVote?.teamId === selected.teamId ? "이 사진으로 투표 완료" : "이 사진에 한 표"}</button> : <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-app-muted">현재 투표 시간이 아닙니다.</p>}</div>
          </div>
        )}
      </section>
    </main>
  );
}
