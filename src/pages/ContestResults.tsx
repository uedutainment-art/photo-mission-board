import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { EventBrandMark } from "../components/EventBrandMark";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventTeams } from "../hooks/useEventTeams";
import { useTeamSession } from "../hooks/useTeamSession";
import { isSonovaFamilyDay } from "../lib/eventBrand";
import { getParticipantName } from "../lib/teamLabel";

export function ContestResults() {
  const { teamToken } = useParams();
  const { context, error, loading } = useTeamSession(teamToken);
  const { submissions } = useContestSubmissions(context?.eventId);
  const { teams } = useEventTeams(context?.eventId);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const submissionsByTeam = new Map<string, typeof submissions>();
  submissions.filter((item) => !item.hidden).forEach((item) => {
    submissionsByTeam.set(item.teamId, [...(submissionsByTeam.get(item.teamId) ?? []), item]);
  });
  const winners = context?.event.results?.winners ?? [];
  const published = context?.event.voting?.status === "closed"
    && context.event.results?.status === "published";
  const revealedRanks = context?.event.results?.revealedRanks
    ?? (published ? [3, 2, 1] : []);
  const revealedWinners = [...winners]
    .filter((winner) => revealedRanks.includes(winner.rank))
    .sort((a, b) => b.rank - a.rank);
  const sonova = isSonovaFamilyDay(context?.event);

  return (
    <main className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}>
      <section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>
        {sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55" />}
        <header className={`relative z-10 border-b px-4 pb-4 pt-3 ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/90" : "border-app-border bg-white"}`}><div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><Link to={`/t/${teamToken}/contest`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-base font-black">베스트 포토</h1><div className="flex h-10 w-24 items-center justify-end">{context && sonova ? <EventBrandMark event={context.event} compact /> : null}</div></div></header>
        <div className={`relative z-10 flex-1 p-4 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 결과 불러오는 중</div>}
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {!loading && context && !published && <div className="card p-8 text-center"><Award className="mx-auto h-10 w-10 text-amber-500" /><h2 className="mt-4 text-lg font-black">결과를 준비하고 있습니다</h2><p className="mt-2 text-sm font-bold text-app-muted">운영팀이 결과를 공개하면 이곳에서 확인할 수 있어요.</p></div>}
          {published && <div className="space-y-3">{revealedWinners.map((winner) => {
            const team = teamById.get(winner.teamId);
            const familyPhotos = submissionsByTeam.get(winner.teamId) ?? [];
            return <section key={winner.rank} className="card overflow-hidden"><div className={`relative grid gap-0.5 bg-slate-200 ${familyPhotos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{familyPhotos.slice(0, 4).map((photo) => <img key={photo.id} src={photo.thumbUrl} alt={photo.title} className="aspect-square w-full object-cover" />)}<span className="absolute left-3 top-3 rounded-full bg-app-ink px-3 py-1 text-sm font-black text-white">{winner.rank}등</span></div><div className="p-4"><h2 className="text-base font-black">{team ? getParticipantName(team) : "참가 가족"}</h2><p className="mt-1 text-sm font-bold text-app-muted">가족 사진 {familyPhotos.length}장</p><p className="mt-3 text-sm font-black text-app-primary">베스트 포토 수상을 축하합니다!</p></div></section>;
          })}{revealedWinners.length < winners.length && <div className="card p-6 text-center"><Award className="mx-auto h-8 w-8 text-amber-500" /><p className="mt-3 text-sm font-black">다음 순위 발표를 기다려주세요</p><p className="mt-1 text-xs font-bold text-app-muted">운영팀이 순서대로 공개하고 있습니다.</p></div>}</div>}
        </div>
      </section>
    </main>
  );
}
