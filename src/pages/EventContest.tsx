import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import JSZip from "jszip";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventLive } from "../hooks/useEventLive";
import { useSongRequests } from "../hooks/useSongRequests";
import { clearContestVote } from "../lib/contest";
import { downloadBlob, safeFilename } from "../lib/download";
import { db } from "../lib/firebase";
import { getTeamLabel } from "../lib/teamLabel";
import type { ContestWinner, MissionEvent, ModuleStatus } from "../lib/types";

const prizeAmounts = [50000, 30000, 20000] as const;

const operationStages = [
  { id: "prepare", label: "준비", description: "가족·코드 확인" },
  { id: "submission", label: "접수", description: "대표사진 등록" },
  { id: "voting", label: "투표", description: "가족당 1표" },
  { id: "results", label: "결과", description: "순위 확정·공개" },
] as const;

interface Confirmation {
  action: () => Promise<void>;
  confirmLabel: string;
  description: string;
  title: string;
  tone?: "default" | "danger";
}

function getOperationStage(event: MissionEvent): number {
  if (event.results?.status === "published" || event.voting?.status === "closed") return 4;
  if (event.voting?.status === "open" || event.submission?.status === "closed") return 3;
  if (event.submission?.status === "open") return 2;
  return 1;
}

function getStageAction(stage: number): { label: string; targetId: string } {
  if (stage === 1) return { label: "사진 접수 준비", targetId: "submission-operations" };
  if (stage === 2) return { label: "접수 현황 확인", targetId: "submission-operations" };
  if (stage === 3) return { label: "투표 현황 확인", targetId: "voting-operations" };
  return { label: "수상 가족 확정", targetId: "result-operations" };
}

function getSubmissionStatusLabel(status: ModuleStatus | undefined): string {
  if (status === "open") return "접수 중";
  if (status === "closed") return "마감";
  return "대기";
}

export function EventContest() {
  const { eventId } = useParams();
  const { event, teams, votes, loading, error } = useEventLive(eventId);
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
  } = useContestSubmissions(eventId);
  const songRequests = useSongRequests(eventId, Boolean(event?.modules?.songRequest));
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [winnerIds, setWinnerIds] = useState<string[]>(["", "", ""]);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const voteByVoterTeam = useMemo(
    () => new Map(votes.filter((vote) => vote.voterTeamId).map((vote) => [vote.voterTeamId!, vote])),
    [votes],
  );
  const countByTargetTeam = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.teamId, (counts.get(vote.teamId) ?? 0) + 1);
    }
    return counts;
  }, [votes]);
  const rankedSubmissions = useMemo(
    () => submissions
      .filter((item) => !item.hidden)
      .map((item) => ({ submission: item, votes: countByTargetTeam.get(item.teamId) ?? 0 }))
      .sort((a, b) => b.votes - a.votes || a.submission.teamId.localeCompare(b.submission.teamId)),
    [countByTargetTeam, submissions],
  );
  const unvotedTeams = teams.filter((team) => !voteByVoterTeam.has(team.id));
  const cutoffVotes = rankedSubmissions[2]?.votes;
  const tieAtCutoff = cutoffVotes !== undefined
    && rankedSubmissions.filter((item) => item.votes === cutoffVotes).length > 1;
  const operationStage = event ? getOperationStage(event) : 1;
  const stageAction = getStageAction(operationStage);

  useEffect(() => {
    if (event?.results?.winners?.length) {
      setWinnerIds(
        [...event.results.winners]
          .sort((a, b) => a.rank - b.rank)
          .map((winner) => winner.teamId),
      );
      return;
    }
    setWinnerIds(rankedSubmissions.slice(0, 3).map((item) => item.submission.teamId));
  }, [event?.results?.winners, rankedSubmissions]);

  function requestConfirmation(nextConfirmation: Confirmation) {
    setLocalError(null);
    setConfirmation(nextConfirmation);
  }

  async function handleConfirm() {
    if (!confirmation) return;
    setConfirmBusy(true);
    try {
      await confirmation.action();
      setConfirmation(null);
    } catch (actionError) {
      setLocalError(actionError instanceof Error ? actionError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setConfirmBusy(false);
    }
  }

  async function updatePhase(
    path: "submission.status" | "voting.status",
    status: ModuleStatus | "draft",
  ) {
    if (!eventId) return;
    setBusy(path);
    setLocalError(null);
    try {
      const fieldPrefix = path.split(".")[0];
      await updateDoc(doc(db, "events", eventId), {
        [path]: status,
        [`${fieldPrefix}.${status === "open" ? "openedAt" : "closedAt"}`]:
          status === "waiting" || status === "draft" ? deleteField() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNotice("운영 상태를 변경했습니다.");
    } finally {
      setBusy(null);
    }
  }

  function requestPhaseChange(
    path: "submission.status" | "voting.status",
    status: ModuleStatus | "draft",
  ) {
    const isSubmission = path === "submission.status";
    const labels: Record<ModuleStatus | "draft", [string, string, string]> = isSubmission
      ? {
          draft: ["사진 접수를 준비할까요?", "참가자는 아직 사진을 등록할 수 없습니다.", "준비로 변경"],
          waiting: ["사진 접수를 대기로 바꿀까요?", "참가자에게 접수 대기 상태가 표시됩니다.", "대기로 변경"],
          open: ["사진 접수를 시작할까요?", "참가자가 대표사진을 등록하거나 교체할 수 있게 됩니다.", "접수 시작"],
          closed: ["사진 접수를 마감할까요?", "마감 후 참가자는 대표사진을 등록하거나 교체할 수 없습니다.", "접수 마감"],
        }
      : {
          draft: ["투표를 준비 상태로 바꿀까요?", "참가자는 아직 투표할 수 없습니다.", "준비로 변경"],
          waiting: ["투표를 대기 상태로 바꿀까요?", "참가자는 아직 투표할 수 없습니다.", "대기로 변경"],
          open: ["투표를 시작할까요?", "가족당 한 표를 제출할 수 있게 됩니다.", "투표 시작"],
          closed: ["투표를 마감할까요?", "마감 후 참가자는 투표를 제출하거나 변경할 수 없습니다.", "투표 마감"],
        };
    const [title, description, confirmLabel] = labels[status];
    requestConfirmation({
      action: () => updatePhase(path, status),
      confirmLabel,
      description,
      title,
      tone: status === "closed" ? "danger" : "default",
    });
  }

  async function toggleHidden(teamId: string, hidden: boolean) {
    if (!eventId) return;
    setBusy(`hide-${teamId}`);
    try {
      await updateDoc(doc(db, "events", eventId, "familySubmissions", teamId), {
        hidden,
        updatedAt: serverTimestamp(),
      });
      setNotice(hidden ? "사진을 참가자 보드에서 숨겼습니다." : "사진을 참가자 보드에 다시 표시했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleClearVote(teamId: string) {
    if (!eventId) return;
    setBusy(`vote-${teamId}`);
    try {
      await clearContestVote(eventId, teamId);
      setNotice("해당 가족의 투표를 초기화했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function publishResults(published: boolean) {
    if (!eventId || !event) return;
    const selected = winnerIds.filter(Boolean);
    const requiredCount = Math.min(3, rankedSubmissions.length);
    if (published && (selected.length !== requiredCount || new Set(selected).size !== selected.length)) {
      throw new Error(`서로 다른 수상 가족 ${requiredCount}곳을 선택해주세요.`);
    }
    const winners: ContestWinner[] = selected.map((teamId, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      teamId,
      prizeAmount: prizeAmounts[index],
    }));
    setBusy("results");
    try {
      await updateDoc(doc(db, "events", eventId), {
        "results.status": published ? "published" : "hidden",
        "results.winners": winners,
        "results.publishedAt": published ? serverTimestamp() : deleteField(),
        updatedAt: serverTimestamp(),
      });
      setNotice(published ? "결과를 참가자에게 공개했습니다." : "결과를 비공개로 전환했습니다.");
    } finally {
      setBusy(null);
    }
  }

  function downloadResultsCsv() {
    if (!event) return;
    const rows = [
      ["순위", "참가 단위", "사진 제목", "득표수"],
      ...rankedSubmissions.map((item, index) => [
        String(index + 1),
        getTeamLabel(teamById.get(item.submission.teamId) ?? { name: item.submission.teamId }),
        item.submission.title,
        String(item.votes),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.split('"').join('""')}"`).join(","))
      .join("\n");
    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      `${safeFilename(event.title)}-contest-results.csv`,
    );
  }

  async function downloadOriginals() {
    if (!event) return;
    setBusy("zip");
    setLocalError(null);
    try {
      const zip = new JSZip();
      for (const item of submissions) {
        const response = await fetch(item.originalUrl);
        if (!response.ok) throw new Error(`${item.title} 원본을 불러오지 못했습니다.`);
        const team = teamById.get(item.teamId);
        const name = getTeamLabel(team ?? { name: item.teamId });
        zip.file(
          `${String(team?.index ?? 0).padStart(2, "0")}-${safeFilename(name)}-${safeFilename(item.title)}.jpg`,
          await response.blob(),
        );
      }
      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        `${safeFilename(event.title)}-contest-originals.zip`,
      );
    } catch (zipError) {
      setLocalError(zipError instanceof Error ? zipError.message : "원본 ZIP을 만들지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const pageLoading = loading || submissionsLoading;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <Link to={eventId ? `/events/${eventId}` : "/events"} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="이벤트로 돌아가기">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="text-center">
              <p className="text-[11px] font-black text-app-muted">{event?.title}</p>
              <h1 className="text-base font-black">콘테스트 운영</h1>
            </div>
            <Trophy className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {pageLoading && (
            <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              운영 데이터 불러오는 중
            </div>
          )}
          {(error || submissionsError || localError) && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error || submissionsError || localError}
            </div>
          )}
          {notice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
              {notice}
            </div>
          )}

          {!pageLoading && event && eventId && (
            <>
              <section className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-app-muted">현장 운영 순서</p>
                    <h2 className="mt-1 text-base font-black">지금은 {operationStages[operationStage - 1].label} 단계입니다</h2>
                  </div>
                  <span className="rounded-full bg-app-ink px-3 py-1 text-[11px] font-black text-white">{operationStage}/4</span>
                </div>
                <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="콘테스트 운영 단계">
                  {operationStages.map((stage, index) => {
                    const stageNumber = index + 1;
                    const active = stageNumber === operationStage;
                    const complete = stageNumber < operationStage;
                    return (
                      <li key={stage.id} className="min-w-0 text-center">
                        <div className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black ${active ? "bg-app-primary text-white" : complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-app-muted"}`}>
                          {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : stageNumber}
                        </div>
                        <p className={`mt-1 text-xs font-black ${active ? "text-app-primary" : "text-app-ink"}`}>{stage.label}</p>
                        <p className="mt-0.5 hidden text-[10px] font-bold text-app-muted sm:block">{stage.description}</p>
                      </li>
                    );
                  })}
                </ol>
                <button
                  type="button"
                  onClick={() => document.getElementById(stageAction.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="mt-4 flex w-full items-center justify-center rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                >
                  {stageAction.label}
                </button>
              </section>

              <section id="submission-operations" className="card scroll-mt-4 p-4">
                <h2 className="text-sm font-black">사진 접수</h2>
                <p className="mt-1 text-xs font-bold text-app-muted">
                  현재 {getSubmissionStatusLabel(event.submission?.status)} · {submissions.length}/{teams.length} 등록
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                  {(["waiting", "open", "closed"] as ModuleStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => requestPhaseChange("submission.status", status)}
                      disabled={busy === "submission.status" || event.submission?.status === status}
                      className={event.submission?.status === status ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm" : "rounded-xl px-2 py-2 text-xs font-black text-app-muted disabled:opacity-50"}
                    >
                      {status === "waiting" ? "대기" : status === "open" ? "접수 시작" : "접수 마감"}
                    </button>
                  ))}
                </div>
              </section>

              <section id="voting-operations" className="card scroll-mt-4 p-4">
                <h2 className="text-sm font-black">투표</h2>
                <p className="mt-1 text-xs font-bold text-app-muted">
                  완료 {teams.length - unvotedTeams.length}/{teams.length} · 참가자에게 득표수 비공개
                </p>
                {event.submission?.status !== "closed" && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">사진 접수를 마감한 뒤 투표를 시작할 수 있습니다.</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => requestPhaseChange("voting.status", "open")}
                    disabled={event.submission?.status !== "closed" || event.voting?.status === "open"}
                    className="rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    투표 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => requestPhaseChange("voting.status", "closed")}
                    disabled={event.voting?.status !== "open"}
                    className="rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black disabled:opacity-40"
                  >
                    투표 마감
                  </button>
                </div>
                <div className="mt-4 divide-y divide-app-border">
                  {teams.map((team) => {
                    const vote = voteByVoterTeam.get(team.id);
                    return (
                      <div key={team.id} className="flex items-center gap-2 py-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${vote ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-xs font-black">{getTeamLabel(team)}</span>
                        <span className="text-[11px] font-bold text-app-muted">{vote ? "투표 완료" : "미투표"}</span>
                        {vote && (
                          <button
                            type="button"
                            onClick={() => requestConfirmation({
                              action: () => handleClearVote(team.id),
                              confirmLabel: "투표 초기화",
                              description: `${getTeamLabel(team)}의 기존 한 표가 삭제됩니다. 해당 가족은 다시 투표할 수 있습니다.`,
                              title: "이 가족의 투표를 초기화할까요?",
                              tone: "danger",
                            })}
                            disabled={busy === `vote-${team.id}`}
                            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100"
                            aria-label={`${getTeamLabel(team)} 투표 초기화`}
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black">사진 검수</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">부적절한 사진은 투표 대상에서 숨깁니다.</p>
                  </div>
                  <span className="text-sm font-black">{submissions.length}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {submissions.map((item) => {
                    const teamLabel = getTeamLabel(teamById.get(item.teamId) ?? { name: item.teamId });
                    return (
                      <div key={item.id} className="overflow-hidden rounded-2xl border border-app-border bg-white">
                        <img src={item.thumbUrl} alt={item.title} className="aspect-square w-full object-cover" />
                        <div className="p-2">
                          <p className="truncate text-xs font-black">{teamLabel}</p>
                          <p className="truncate text-[11px] font-bold text-app-muted">{item.title}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.hidden) {
                                void toggleHidden(item.teamId, false);
                                return;
                              }
                              requestConfirmation({
                                action: () => toggleHidden(item.teamId, true),
                                confirmLabel: "사진 숨기기",
                                description: `${teamLabel}의 사진이 포토 보드와 투표 대상에서 숨겨집니다. 나중에 다시 표시할 수 있습니다.`,
                                title: "이 사진을 숨길까요?",
                                tone: "danger",
                              });
                            }}
                            disabled={busy === `hide-${item.teamId}`}
                            className={`mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black ${item.hidden ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-app-muted"}`}
                          >
                            {item.hidden ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                            {item.hidden ? "다시 표시" : "숨기기"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section id="result-operations" className="card scroll-mt-4 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-black">집계 및 결과 공개</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">동점은 현장 추첨 후 수상 순서를 직접 지정합니다.</p>
                  </div>
                  {tieAtCutoff && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-900">동점 확인</span>}
                </div>
                <div className="mt-4 space-y-2">
                  {[0, 1, 2].slice(0, Math.min(3, rankedSubmissions.length)).map((index) => (
                    <label key={index} className="flex items-center gap-3">
                      <span className="w-9 text-sm font-black">{index + 1}등</span>
                      <select
                        value={winnerIds[index] ?? ""}
                        onChange={(changeEvent) => setWinnerIds((current) => {
                          const next = [...current];
                          next[index] = changeEvent.target.value;
                          return next;
                        })}
                        className="min-w-0 flex-1 rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-bold"
                      >
                        <option value="">선택</option>
                        {rankedSubmissions.map((item) => (
                          <option key={item.submission.teamId} value={item.submission.teamId}>
                            {getTeamLabel(teamById.get(item.submission.teamId) ?? { name: item.submission.teamId })} · {item.votes}표
                          </option>
                        ))}
                      </select>
                      <span className="w-16 text-right text-xs font-black text-app-primary">{prizeAmounts[index].toLocaleString()}원</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => requestConfirmation({
                      action: () => publishResults(false),
                      confirmLabel: "결과 숨기기",
                      description: "참가자 결과 화면에서 순위가 다시 숨겨집니다.",
                      title: "공개된 결과를 숨길까요?",
                      tone: "danger",
                    })}
                    disabled={event.results?.status !== "published"}
                    className="rounded-2xl border border-app-border bg-white px-3 py-3 text-xs font-black disabled:opacity-40"
                  >
                    결과 비공개
                  </button>
                  <button
                    type="button"
                    onClick={() => requestConfirmation({
                      action: () => publishResults(true),
                      confirmLabel: "결과 공개",
                      description: "선택한 1·2·3등이 모든 참가자의 결과 화면에 즉시 표시됩니다.",
                      title: "최종 결과를 공개할까요?",
                    })}
                    disabled={busy === "results" || event.voting?.status !== "closed"}
                    className="rounded-2xl bg-app-primary px-3 py-3 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    결과 공개
                  </button>
                </div>
                {event.voting?.status !== "closed" && (
                  <p className="mt-2 text-center text-[11px] font-bold text-app-muted">투표 마감 후 결과를 공개할 수 있습니다.</p>
                )}
                {event.results?.status === "published" && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    참가자에게 결과 공개 중
                  </div>
                )}
              </section>

              <section className="grid grid-cols-2 gap-2">
                <button type="button" onClick={downloadResultsCsv} className="card flex items-center justify-center gap-2 p-4 text-xs font-black">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  집계 CSV
                </button>
                <button type="button" onClick={() => void downloadOriginals()} disabled={busy === "zip"} className="card flex items-center justify-center gap-2 p-4 text-xs font-black disabled:opacity-50">
                  {busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  원본 ZIP
                </button>
              </section>

              {event.modules?.songRequest && (
                <section className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black">신청곡</h2>
                      <p className="mt-1 text-xs font-bold text-app-muted">공통 QR에서 접수된 곡입니다.</p>
                    </div>
                    <strong className="text-lg font-black">{songRequests.length}</strong>
                  </div>
                  <div className="mt-3 divide-y divide-app-border">
                    {songRequests.map((request) => (
                      <div key={request.id} className="py-3">
                        <p className="text-sm font-black">{request.songTitle} · {request.artist}</p>
                        {request.story && <p className="mt-1 text-xs font-bold text-app-muted">{request.story}</p>}
                      </div>
                    ))}
                    {songRequests.length === 0 && <p className="py-4 text-center text-xs font-bold text-app-muted">아직 신청곡이 없습니다.</p>}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>

      <ConfirmActionDialog
        busy={confirmBusy}
        confirmLabel={confirmation?.confirmLabel ?? "확인"}
        description={confirmation?.description ?? ""}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void handleConfirm()}
        open={Boolean(confirmation)}
        title={confirmation?.title ?? "확인"}
        tone={confirmation?.tone}
      />
    </main>
  );
}
