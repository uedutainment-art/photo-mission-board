import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Vote, X } from "lucide-react";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventTeams } from "../hooks/useEventTeams";
import { useContestVote } from "../hooks/useContestVote";
import { useTeamSession } from "../hooks/useTeamSession";
import { castContestVotes } from "../lib/contest";
import { getTeamLabel } from "../lib/teamLabel";

function stableOrder(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sameSelection(left: string[], right: string[]): boolean {
  return left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function ContestGallery() {
  const { teamToken } = useParams();
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { submissions, error: submissionError, loading: submissionLoading } = useContestSubmissions(context?.eventId);
  const { teams } = useEventTeams(context?.eventId);
  const myVotes = useContestVote(context?.eventId, context?.teamId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const visibleSubmissions = useMemo(
    () => submissions.filter((item) => !item.hidden),
    [submissions],
  );
  const familyGroups = useMemo(() => {
    const grouped = new Map<string, typeof visibleSubmissions>();
    for (const submission of visibleSubmissions) {
      grouped.set(submission.teamId, [...(grouped.get(submission.teamId) ?? []), submission]);
    }
    return [...grouped.entries()]
      .map(([teamId, photos]) => ({ teamId, photos: photos.sort((a, b) => a.id.localeCompare(b.id)) }))
      .sort((a, b) => stableOrder(`${context?.eventId}:${a.teamId}`) - stableOrder(`${context?.eventId}:${b.teamId}`));
  }, [context?.eventId, visibleSubmissions]);
  const selected = visibleSubmissions.find((item) => item.id === selectedId) ?? null;
  const votingOpen = context?.event.submission?.status === "closed"
    && context.event.voting?.status === "open"
    && context.event.results?.status !== "published";
  const selectionLimit = context?.event.voting?.selectionsPerVoter
    ?? (context?.event.preset === "family-photo-contest" ? 2 : 1);
  const savedTeamIds = useMemo(() => myVotes.map((vote) => vote.teamId), [myVotes]);
  const voteComplete = savedTeamIds.length === selectionLimit;
  const selectionChanged = !sameSelection(selectedTeamIds, savedTeamIds);

  useEffect(() => {
    setSelectedTeamIds(savedTeamIds);
  }, [savedTeamIds]);

  function toggleSelection(targetTeamId: string) {
    if (targetTeamId === context?.teamId) return;
    setSelectedTeamIds((current) => {
      if (current.includes(targetTeamId)) {
        return current.filter((teamId) => teamId !== targetTeamId);
      }
      if (current.length >= selectionLimit) {
        return current;
      }
      return [...current, targetTeamId];
    });
  }

  async function handleVoteSubmit() {
    if (!context || !selectionChanged) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await castContestVotes(context.eventId, selectedTeamIds);
      setNotice("두 가족에게 투표를 저장했습니다.");
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "투표를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const loading = sessionLoading || submissionLoading;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface relative overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between"><Link to={`/t/${teamToken}/contest`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><div className="text-center"><h1 className="text-base font-black">가족 포토 보드</h1><p className="text-[11px] font-bold text-app-muted">{familyGroups.length}가족 · 사진 {visibleSubmissions.length}장</p></div><div className="h-10 w-10" /></div>
        </header>
        <div className="flex-1 bg-slate-50 p-4">
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 사진 불러오는 중</div>}
          {(sessionError || submissionError || error) && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{sessionError || submissionError || error}</div>}
          {notice && <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">{notice}</div>}
          {!loading && context && (
            <>
              <section className="mb-4 rounded-2xl bg-app-ink p-4 text-white"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black text-slate-400">{votingOpen ? "투표 진행 중" : context.event.voting?.status === "closed" ? "투표 마감" : "사진 감상"}</p><h2 className="mt-1 text-sm font-black">{votingOpen ? `마음에 드는 다른 가족 ${selectionLimit}곳을 골라주세요` : "가족별 사진을 눌러 크게 감상하세요"}</h2></div><span className="flex-none rounded-full bg-white/10 px-3 py-1 text-xs font-black">{votingOpen ? `${selectedTeamIds.length}/${selectionLimit}` : <Vote className="h-5 w-5 text-slate-300" />}</span></div>{voteComplete && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-black">{votingOpen ? "저장된 투표가 있습니다 · 선택을 바꾸면 다시 저장할 수 있어요" : `내 ${selectionLimit}표가 저장되어 있습니다.`}</p>}</section>

              <div className="space-y-3">
                {familyGroups.map(({ teamId, photos }) => {
                  const team = teamById.get(teamId);
                  const isOwnFamily = teamId === context.teamId;
                  const isSelected = selectedTeamIds.includes(teamId);
                  return (
                    <section key={teamId} className={`overflow-hidden rounded-2xl border bg-white ${isSelected ? "border-app-primary ring-2 ring-blue-100" : "border-app-border"}`}>
                      <div className="flex items-center justify-between gap-3 px-3 py-3"><div className="min-w-0"><h2 className="truncate text-sm font-black">{team ? getTeamLabel(team) : "참가 가족"}</h2><p className="mt-0.5 text-[11px] font-bold text-app-muted">{photos.length}장{isOwnFamily ? " · 우리 가족" : ""}</p></div>{isOwnFamily && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-app-muted">우리 가족</span>}{!isOwnFamily && votingOpen && <button type="button" onClick={() => toggleSelection(teamId)} disabled={!isSelected && selectedTeamIds.length >= selectionLimit} className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-40 ${isSelected ? "bg-app-primary text-white" : "bg-slate-100 text-app-ink"}`}>{isSelected && <Check className="h-3.5 w-3.5" />}{isSelected ? "선택됨" : "투표 선택"}</button>}</div>
                      <div className={`grid gap-1 bg-slate-100 p-1 ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{photos.map((photo) => <button key={photo.id} type="button" onClick={() => setSelectedId(photo.id)} className="relative aspect-square overflow-hidden bg-slate-200"><img src={photo.thumbUrl} alt={photo.title} className="h-full w-full object-cover" /><span className="absolute bottom-0 left-0 right-0 truncate bg-slate-950/65 px-1.5 py-1 text-left text-[9px] font-bold text-white">{photo.title}</span></button>)}</div>
                    </section>
                  );
                })}
              </div>

              {votingOpen && (
                <button type="button" onClick={() => void handleVoteSubmit()} disabled={busy || selectedTeamIds.length !== selectionLimit || !selectionChanged} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedTeamIds.length !== selectionLimit ? `${selectionLimit - selectedTeamIds.length}곳 더 선택해주세요` : selectionChanged ? `${selectionLimit}표 저장하기` : "저장된 투표와 같습니다"}
                </button>
              )}
              {familyGroups.length === 0 && <div className="card p-8 text-center text-sm font-black text-app-muted">아직 등록된 사진이 없습니다.</div>}
            </>
          )}
        </div>
        {selected && context && (
          <div className="absolute inset-0 z-10 flex flex-col bg-white">
            <div className="relative flex-1 bg-slate-950"><img src={selected.originalUrl} alt={selected.title} className="h-full w-full object-contain" /><button type="button" onClick={() => setSelectedId(null)} className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white" aria-label="닫기"><X className="h-5 w-5" /></button></div>
            <div className="p-4"><p className="text-xs font-black text-app-muted">{teamById.get(selected.teamId) ? getTeamLabel(teamById.get(selected.teamId)!) : "참가 가족"}{selected.teamId === context.teamId ? " · 우리 가족" : ""}</p><h2 className="mt-1 text-lg font-black">{selected.title}</h2><button type="button" onClick={() => setSelectedId(null)} className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black">목록으로 돌아가기</button></div>
          </div>
        )}
      </section>
    </main>
  );
}
