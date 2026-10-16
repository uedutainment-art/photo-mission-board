type Entry = { teamId: string; familyName: string; title: string; votes: number };
type Award = { teamId: string; rank: number };

export function buildContestResultsCsv(entries: Entry[], awards: Award[], tieBreakNote: string, revealedRanks: number[]) {
  const awardByTeam = new Map(awards.map((award) => [award.teamId, award]));
  const sorted = [...entries].sort((a, b) =>
    (awardByTeam.get(a.teamId)?.rank ?? Infinity) - (awardByTeam.get(b.teamId)?.rank ?? Infinity)
    || b.votes - a.votes || a.teamId.localeCompare(b.teamId));
  const rows = [
    ["시상 순위", "참가 단위", "사진 제목", "득표수", "집계 상태", "발표 상태", "운영팀 선정 사유"],
    ...sorted.map((entry) => {
      const award = awardByTeam.get(entry.teamId);
      return [
        award ? String(award.rank) : "",
        entry.familyName, entry.title, String(entry.votes),
        awards.length ? (award ? "시상 선정" : "수상 대상 아님") : "미확정 · 득표 집계",
        award ? (revealedRanks.includes(award.rank) ? "공개" : "발표 대기") : "",
        award ? tieBreakNote : "",
      ];
    }),
  ];
  // Neutralize spreadsheet formulas in participant-controlled text.
  return rows.map((row) => row.map((value) => {
    const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.split('"').join('""')}"`;
  }).join(",")).join("\n");
}
