import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventTeams } from "../hooks/useEventTeams";
import { useTeamSession } from "../hooks/useTeamSession";
import { getTeamLabel } from "../lib/teamLabel";

export function ContestResults() {
  const { teamToken } = useParams();
  const { context, error, loading } = useTeamSession(teamToken);
  const { submissions } = useContestSubmissions(context?.eventId);
  const { teams } = useEventTeams(context?.eventId);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const submissionByTeam = new Map(submissions.map((item) => [item.teamId, item]));
  const winners = context?.event.results?.winners ?? [];
  const published = context?.event.voting?.status === "closed"
    && context.event.results?.status === "published";

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink"><section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone"><header className="border-b border-app-border bg-white px-4 pb-4 pt-3"><div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><Link to={`/t/${teamToken}/contest`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-base font-black">베스트 포토</h1><div className="h-10 w-10" /></div></header><div className="flex-1 bg-slate-50 p-4">{loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 결과 불러오는 중</div>}{error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}{!loading && context && !published && <div className="card p-8 text-center"><Award className="mx-auto h-10 w-10 text-amber-500" /><h2 className="mt-4 text-lg font-black">결과를 준비하고 있습니다</h2><p className="mt-2 text-sm font-bold text-app-muted">운영팀이 결과를 공개하면 이곳에서 확인할 수 있어요.</p></div>}{published && <div className="space-y-3">{winners.sort((a,b) => a.rank-b.rank).map((winner) => { const team = teamById.get(winner.teamId); const submission = submissionByTeam.get(winner.teamId); return <section key={winner.rank} className="card overflow-hidden"><div className="relative">{submission && <img src={submission.thumbUrl} alt={submission.title} className="aspect-[4/3] w-full object-cover" />}<span className="absolute left-3 top-3 rounded-full bg-app-ink px-3 py-1 text-sm font-black text-white">{winner.rank}등</span></div><div className="p-4"><h2 className="text-base font-black">{team ? getTeamLabel(team) : "참가자"}</h2><p className="mt-1 text-sm font-bold text-app-muted">{submission?.title ?? "대표사진"}</p><p className="mt-3 text-sm font-black text-app-primary">{winner.prizeAmount.toLocaleString("ko-KR")}원 상당</p></div></section>; })}</div>}</div></section></main>
  );
}
