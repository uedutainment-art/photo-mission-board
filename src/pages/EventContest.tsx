import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Music2,
  Phone,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { ContestAdminNav } from "../components/ContestAdminNav";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useEventLive } from "../hooks/useEventLive";
import { useSongRequests } from "../hooks/useSongRequests";
import { clearContestVote, countFilledSlots } from "../lib/contest";
import { downloadBlob, safeFilename } from "../lib/download";
import { db } from "../lib/firebase";
import { formatPhone, smsHref, telHref } from "../lib/phone";
import { createSelphyJpeg } from "../lib/selphy";
import { getTeamLabel } from "../lib/teamLabel";
import type { ContestWinner, MissionEvent, ModuleStatus } from "../lib/types";

const prizeAmounts = [50000, 30000, 20000] as const;

const operationStages = [
  { id: "prepare", label: "준비", description: "가족·코드 확인" },
  { id: "submission", label: "접수", description: "미션 사진 등록" },
  { id: "voting", label: "투표", description: "가족당 2표" },
  { id: "results", label: "결과", description: "순위 확정·공개" },
] as const;

interface Confirmation {
  action: () => Promise<void>;
  confirmLabel: string;
  description: string;
  title: string;
  tone?: "default" | "danger";
}

interface PrintAsset {
  blob: Blob;
  url: string;
  usedFallback: boolean;
}

function getOperationStage(event: MissionEvent): number {
  if (event.submission?.status === "open") return 2;
  if (event.voting?.status === "open") return 3;
  if (event.results?.status === "published" || event.voting?.status === "closed") return 4;
  if (event.submission?.status === "closed") return 3;
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
  const [tieBreakNote, setTieBreakNote] = useState("");
  const [winnerIds, setWinnerIds] = useState<string[]>(["", "", ""]);
  const [photoTeamFilter, setPhotoTeamFilter] = useState("all");
  const [photoPromptFilter, setPhotoPromptFilter] = useState("all");
  const printAssetsRef = useRef(new Map<string, PrintAsset>());
  const preparingPrintIdsRef = useRef(new Set<string>());
  const [, setPrintAssetVersion] = useState(0);
  const selectionLimit = event?.voting?.selectionsPerVoter
    ?? (event?.preset === "family-photo-contest" ? 2 : 1);
  const minimumPhotos = event?.preset === "family-photo-contest"
    ? event.submission?.minimum ?? 4
    : 1;
  const promptById = useMemo(() => new Map((event?.submission?.prompts ?? []).map((prompt) => [prompt.id, prompt])), [event?.submission?.prompts]);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const votesByVoterTeam = useMemo(() => {
    const grouped = new Map<string, typeof votes>();
    for (const vote of votes) {
      if (!vote.voterTeamId) continue;
      grouped.set(vote.voterTeamId, [...(grouped.get(vote.voterTeamId) ?? []), vote]);
    }
    return grouped;
  }, [votes]);
  const countByTargetTeam = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.teamId, (counts.get(vote.teamId) ?? 0) + 1);
    }
    return counts;
  }, [votes]);
  const rankedSubmissions = useMemo(
    () => {
      const coverByTeam = new Map<string, (typeof submissions)[number]>();
      submissions
        .filter((item) => !item.hidden)
        .forEach((item) => {
          if (!coverByTeam.has(item.teamId)) coverByTeam.set(item.teamId, item);
        });
      return [...coverByTeam.values()]
        .map((submission) => ({ submission, votes: countByTargetTeam.get(submission.teamId) ?? 0 }))
        .sort((a, b) => b.votes - a.votes || a.submission.teamId.localeCompare(b.submission.teamId));
    },
    [countByTargetTeam, submissions],
  );
  const unvotedTeams = teams.filter((team) => (votesByVoterTeam.get(team.id)?.length ?? 0) < selectionLimit);
  const submissionCountByTeam = useMemo(() => {
    const byTeam = new Map<string, typeof submissions>();
    submissions.forEach((item) => byTeam.set(item.teamId, [...(byTeam.get(item.teamId) ?? []), item]));
    return new Map([...byTeam].map(([teamId, items]) => [teamId, countFilledSlots(items)]));
  }, [submissions]);
  const completedSubmissionTeams = teams.filter((team) => (submissionCountByTeam.get(team.id) ?? 0) >= minimumPhotos);
  const unregisteredTeams = teams.filter((team) => (submissionCountByTeam.get(team.id) ?? 0) < minimumPhotos);
  const tieVoteCounts = useMemo(() => {
    const groups = new Map<number, number>();
    rankedSubmissions.forEach((item) => groups.set(item.votes, (groups.get(item.votes) ?? 0) + 1));
    return new Set(
      rankedSubmissions
        .slice(0, 3)
        .filter((item) => (groups.get(item.votes) ?? 0) > 1)
        .map((item) => item.votes),
    );
  }, [rankedSubmissions]);
  const tiedCandidates = rankedSubmissions.filter((item) => tieVoteCounts.has(item.votes));
  const hasAwardTie = event?.voting?.status === "closed" && votes.length > 0 && tiedCandidates.length > 0;
  const hasDuplicateWinners = winnerIds.filter(Boolean).length !== new Set(winnerIds.filter(Boolean)).size;
  const resultsVisible = event?.voting?.status === "closed"
    && event.results?.status === "published";
  const revealedRanks = event?.results?.revealedRanks
    ?? (event?.results?.status === "published" ? [3, 2, 1] : []);
  const operationStage = event ? getOperationStage(event) : 1;
  const stageAction = getStageAction(operationStage);
  const filteredSubmissions = useMemo(
    () => submissions.filter((item) => (
      (photoTeamFilter === "all" || item.teamId === photoTeamFilter)
      && (photoPromptFilter === "all" || item.promptId === photoPromptFilter)
    )),
    [photoPromptFilter, photoTeamFilter, submissions],
  );
  const reviewGroups = useMemo(
    () => teams
      .map((team) => ({
        team,
        submissions: filteredSubmissions.filter((item) => item.teamId === team.id),
      }))
      .filter((group) => group.submissions.length > 0),
    [filteredSubmissions, teams],
  );
  const sortedSongRequests = useMemo(
    () => [...songRequests].sort((a, b) => Number(Boolean(a.playedAt)) - Number(Boolean(b.playedAt))),
    [songRequests],
  );
  const playedSongCount = songRequests.filter((request) => Boolean(request.playedAt)).length;

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

  useEffect(() => {
    setTieBreakNote(event?.results?.tieBreak?.note ?? "");
  }, [event?.results?.tieBreak?.note]);

  useEffect(() => () => {
    printAssetsRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    printAssetsRef.current.clear();
  }, []);

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
      const phaseUpdate: Record<string, unknown> = {
        [path]: status,
        [`${fieldPrefix}.${status === "open" ? "openedAt" : "closedAt"}`]:
          status === "waiting" || status === "draft" ? deleteField() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Reopening an earlier phase must not leave live voting or published results behind.
      if (path === "submission.status" && status !== "closed") {
        phaseUpdate["voting.status"] = "waiting";
        phaseUpdate["voting.openedAt"] = deleteField();
        phaseUpdate["voting.closedAt"] = deleteField();
        phaseUpdate["results.status"] = "hidden";
        phaseUpdate["results.publishedAt"] = deleteField();
      } else if (path === "voting.status" && status === "open") {
        phaseUpdate["results.status"] = "hidden";
        phaseUpdate["results.publishedAt"] = deleteField();
      }

      await updateDoc(doc(db, "events", eventId), phaseUpdate);
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
          open: ["사진 접수를 시작할까요?", "참가자가 가족 사진을 추가·교체·삭제할 수 있게 됩니다.", "접수 시작"],
          closed: ["사진 접수를 마감할까요?", "마감 후 참가자는 사진을 추가·교체·삭제할 수 없습니다.", "접수 마감"],
        }
      : {
          draft: ["투표를 준비 상태로 바꿀까요?", "참가자는 아직 투표할 수 없습니다.", "준비로 변경"],
          waiting: ["투표를 대기 상태로 바꿀까요?", "참가자는 아직 투표할 수 없습니다.", "대기로 변경"],
          open: ["투표를 시작할까요?", `가족당 서로 다른 ${selectionLimit}곳에 투표할 수 있게 됩니다.`, "투표 시작"],
          closed: ["투표를 마감할까요?", "마감 후 참가자는 투표를 제출하거나 변경할 수 없습니다.", "투표 마감"],
        };
    const [title, description, confirmLabel] = labels[status];
    const resetsLaterPhases = isSubmission
      && status !== "closed"
      && (event?.voting?.status === "open"
        || event?.voting?.status === "closed"
        || event?.results?.status === "published");
    const hidesPublishedResults = !isSubmission
      && status === "open"
      && event?.results?.status === "published";
    requestConfirmation({
      action: () => updatePhase(path, status),
      confirmLabel,
      description: resetsLaterPhases
        ? `${description} 기존 투표 상태와 공개 결과는 초기화됩니다.`
        : hidesPublishedResults
          ? `${description} 공개 중인 결과는 자동으로 비공개됩니다.`
          : description,
      title,
      tone: status === "closed" ? "danger" : "default",
    });
  }

  async function toggleHidden(submissionId: string, hidden: boolean) {
    if (!eventId) return;
    setBusy(`hide-${submissionId}`);
    try {
      await updateDoc(doc(db, "events", eventId, "familySubmissions", submissionId), {
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

  async function toggleSongPlayed(requestId: string, played: boolean) {
    if (!eventId) return;
    const busyKey = `song-${requestId}`;
    setBusy(busyKey);
    setLocalError(null);
    try {
      await updateDoc(doc(db, "events", eventId, "songRequests", requestId), {
        playedAt: played ? serverTimestamp() : deleteField(),
      });
      setNotice(played ? "신청곡을 재생 완료로 표시했습니다." : "신청곡을 미재생으로 되돌렸습니다.");
    } catch (songError) {
      setLocalError(songError instanceof Error ? songError.message : "신청곡 상태를 바꾸지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function publishResults(published: boolean, revealRank?: 1 | 2 | 3) {
    if (!eventId || !event) return;
    const selected = winnerIds.filter(Boolean);
    const requiredCount = Math.min(3, rankedSubmissions.length);
    if (published && (selected.length !== requiredCount || new Set(selected).size !== selected.length)) {
      throw new Error(`서로 다른 수상 가족 ${requiredCount}곳을 선택해주세요.`);
    }
    if (published && hasAwardTie && !tieBreakNote.trim()) {
      throw new Error("동점 선정 사유를 입력한 뒤 공개해주세요.");
    }
    const winners: ContestWinner[] = selected.map((teamId, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      teamId,
      prizeAmount: prizeAmounts[index],
    }));
    setBusy(revealRank ? `results-${revealRank}` : "results");
    try {
      const nextRevealedRanks = revealRank
        ? [3, 2, 1].filter((rank) => rank >= revealRank) as Array<1 | 2 | 3>
        : [];
      const resultUpdate: Record<string, unknown> = {
        "results.status": published ? "published" : "hidden",
        "results.winners": winners,
        "results.revealedRanks": published ? nextRevealedRanks : [],
        "results.publishedAt": published ? serverTimestamp() : deleteField(),
        updatedAt: serverTimestamp(),
      };
      if (published && hasAwardTie) {
        resultUpdate["results.tieBreak"] = {
          note: tieBreakNote.trim(),
          resolvedAt: serverTimestamp(),
        };
      }
      await updateDoc(doc(db, "events", eventId), resultUpdate);
      setNotice(published && revealRank
        ? `${revealRank}등을 참가자 화면에 공개했습니다.`
        : "결과를 비공개로 전환했습니다.");
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

  async function preparePrintAsset(item: (typeof submissions)[number]): Promise<PrintAsset> {
    const existing = printAssetsRef.current.get(item.id);
    if (existing) return existing;

    while (preparingPrintIdsRef.current.has(item.id)) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      const prepared = printAssetsRef.current.get(item.id);
      if (prepared) return prepared;
    }

    preparingPrintIdsRef.current.add(item.id);
    setPrintAssetVersion((version) => version + 1);
    try {
      const result = await createSelphyJpeg(item.originalUrl, item.thumbUrl);
      const asset = { ...result, url: URL.createObjectURL(result.blob) };
      printAssetsRef.current.set(item.id, asset);
      return asset;
    } finally {
      preparingPrintIdsRef.current.delete(item.id);
      setPrintAssetVersion((version) => version + 1);
    }
  }

  async function downloadPrintJpeg(item: (typeof submissions)[number]) {
    const busyKey = `download-${item.id}`;
    setBusy(busyKey);
    setLocalError(null);
    try {
      const { blob, usedFallback } = await preparePrintAsset(item);
      downloadBlob(blob, getPrintFilename(item));
      setNotice(usedFallback
        ? "원본 형식을 읽지 못해 미리보기로 출력용 JPG를 만들었습니다. 출력 전 화질을 확인해주세요."
        : "캐논 SELPHY용 JPG를 저장했습니다. SD카드에 옮겨 출력할 수 있습니다.");
    } catch (downloadError) {
      setLocalError(downloadError instanceof Error ? downloadError.message : "출력용 JPG를 만들지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  function getPrintFilename(item: (typeof submissions)[number]): string {
    const team = teamById.get(item.teamId);
    const teamLabel = getTeamLabel(team ?? { name: item.teamId });
    return `${String(team?.index ?? 0).padStart(2, "0")}-${safeFilename(teamLabel)}-${safeFilename(item.title)}-SELPHY.jpg`;
  }

  function setPrintDragData(
    dragEvent: DragEvent<HTMLAnchorElement>,
    item: (typeof submissions)[number],
  ) {
    const asset = printAssetsRef.current.get(item.id);
    if (!asset) {
      dragEvent.preventDefault();
      setNotice("출력용 JPG를 준비 중입니다. 잠시 후 다시 끌어주세요.");
      void preparePrintAsset(item);
      return;
    }

    const filename = getPrintFilename(item);
    dragEvent.dataTransfer.effectAllowed = "copy";
    dragEvent.dataTransfer.setData("DownloadURL", `image/jpeg:${filename}:${asset.url}`);
    dragEvent.dataTransfer.setData("text/uri-list", asset.url);
    dragEvent.dataTransfer.setData("text/plain", asset.url);
  }

  const pageLoading = loading || submissionsLoading;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface relative overflow-hidden rounded-[28px] border border-app-border shadow-phone">
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
              <ContestAdminNav active="contest" eventId={eventId} />

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

              <nav className="grid grid-cols-5 gap-1 rounded-2xl border border-app-border bg-white p-1.5" aria-label="운영 화면 바로가기">
                {[
                  ["접수", "submission-operations"],
                  ["투표", "voting-operations"],
                  ["사진", "photo-review"],
                  ["결과", "result-operations"],
                  [`신청곡 ${songRequests.length}`, "song-requests"],
                ].map(([label, targetId]) => (
                  <button key={targetId} type="button" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-0 rounded-xl px-1 py-2 text-[11px] font-black text-app-muted hover:bg-slate-100 hover:text-app-ink">
                    {label}
                  </button>
                ))}
              </nav>

              <section id="submission-operations" className="card scroll-mt-4 p-4">
                <h2 className="text-sm font-black">사진 접수</h2>
                <p className="mt-1 text-xs font-bold text-app-muted">
                  현재 {getSubmissionStatusLabel(event.submission?.status)} · 최소 {minimumPhotos}장 충족 {completedSubmissionTeams.length}/{teams.length}가족 · 총 {submissions.length}장
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                  {(["waiting", "open", "closed"] as ModuleStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => requestPhaseChange("submission.status", status)}
                      disabled={busy === "submission.status" || event.submission?.status === status || event.results?.status === "published"}
                      className={event.submission?.status === status ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm" : "rounded-xl px-2 py-2 text-xs font-black text-app-muted disabled:opacity-50"}
                    >
                      {status === "waiting" ? "대기" : status === "open" ? "접수 시작" : "접수 마감"}
                    </button>
                  ))}
                </div>
                {event.results?.status === "published" && (
                  <p className="mt-2 text-center text-[11px] font-bold text-app-muted">결과를 비공개로 전환해야 접수 단계를 다시 열 수 있습니다.</p>
                )}
                <div className="mt-4 border-t border-app-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black">사진 {minimumPhotos}장 미충족 가족</h3>
                    <span className={`text-xs font-black ${unregisteredTeams.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>{unregisteredTeams.length}가족</span>
                  </div>
                  {unregisteredTeams.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-800">모든 가족이 사진을 {minimumPhotos}장 이상 등록했습니다.</p>
                  ) : (
                    <div className="mt-2 divide-y divide-app-border">
                      {unregisteredTeams.map((team) => {
                        const phone = team.leader?.phone;
                        const photoCount = submissionCountByTeam.get(team.id) ?? 0;
                        const message = `안녕하세요, ${event.title} 운영팀입니다. ${getTeamLabel(team)} 사진이 현재 ${photoCount}장 등록되었습니다. 접수 마감 전에 ${minimumPhotos}장 이상 등록해주세요.`;
                        return (
                          <div key={team.id} className="flex items-center gap-2 py-2">
                            <span className="h-2.5 w-2.5 flex-none rounded-full bg-amber-400" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black">{getTeamLabel(team)}</p>
                              <p className="mt-0.5 truncate text-[11px] font-bold text-app-muted">{photoCount}/{minimumPhotos}장 · {phone ? `${team.leader?.name} · ${formatPhone(phone)}` : "가족 대표 연락처 없음"}</p>
                            </div>
                            {phone && (
                              <div className="flex flex-none gap-1">
                                <a href={telHref(phone)} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100" aria-label={`${getTeamLabel(team)} 가족 대표에게 전화`}><Phone className="h-3.5 w-3.5" aria-hidden="true" /></a>
                                <a href={smsHref(phone, message)} className="grid h-8 w-8 place-items-center rounded-xl bg-app-ink text-white" aria-label={`${getTeamLabel(team)} 가족 대표에게 문자`}><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /></a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section id="voting-operations" className="card scroll-mt-4 p-4">
                <h2 className="text-sm font-black">투표</h2>
                <p className="mt-1 text-xs font-bold text-app-muted">
                  2표 완료 {teams.length - unvotedTeams.length}/{teams.length} · 참가자에게 득표수 비공개
                </p>
                {event.submission?.status !== "closed" && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">사진 접수를 마감한 뒤 투표를 시작할 수 있습니다.</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => requestPhaseChange("voting.status", "open")}
                    disabled={event.submission?.status !== "closed" || event.voting?.status === "open" || event.results?.status === "published"}
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
                {event.results?.status === "published" && (
                  <p className="mt-2 text-center text-[11px] font-bold text-app-muted">결과를 비공개로 전환해야 투표를 다시 시작할 수 있습니다.</p>
                )}
                <div className="mt-4 divide-y divide-app-border">
                  {teams.map((team) => {
                    const teamVotes = votesByVoterTeam.get(team.id) ?? [];
                    const voteComplete = teamVotes.length >= selectionLimit;
                    const phone = team.leader?.phone;
                    const message = `안녕하세요, ${event.title} 운영팀입니다. ${getTeamLabel(team)}의 가족 투표가 아직 완료되지 않았습니다. 투표 마감 전에 다른 가족 두 곳을 선택해주세요.`;
                    return (
                      <div key={team.id} className="flex items-center gap-2 py-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${voteComplete ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-xs font-black">{getTeamLabel(team)}</span>
                        <span className="text-[11px] font-bold text-app-muted">{teamVotes.length}/{selectionLimit} {voteComplete ? "완료" : "미완료"}</span>
                        {!voteComplete && phone && (
                          <div className="flex flex-none gap-1">
                            <a href={telHref(phone)} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100" aria-label={`${getTeamLabel(team)} 가족 대표에게 전화`}><Phone className="h-3.5 w-3.5" aria-hidden="true" /></a>
                            <a href={smsHref(phone, message)} className="grid h-8 w-8 place-items-center rounded-xl bg-app-ink text-white" aria-label={`${getTeamLabel(team)} 가족 대표에게 문자`}><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /></a>
                          </div>
                        )}
                        {teamVotes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => requestConfirmation({
                              action: () => handleClearVote(team.id),
                              confirmLabel: "투표 초기화",
                              description: `${getTeamLabel(team)}의 기존 ${teamVotes.length}표가 삭제됩니다. 해당 가족은 다시 투표할 수 있습니다.`,
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

              <section id="photo-review" className="card scroll-mt-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black">사진 검수</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">부적절한 사진은 투표 대상에서 숨깁니다.</p>
                  </div>
                  <span className="text-sm font-black">{filteredSubmissions.length}/{submissions.length}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-black text-app-muted">
                    가족
                    <select value={photoTeamFilter} onChange={(changeEvent) => setPhotoTeamFilter(changeEvent.target.value)} className="mt-1 w-full rounded-xl border border-app-border bg-white px-2 py-2 text-xs font-bold text-app-ink">
                      <option value="all">전체 가족</option>
                      {teams.map((team) => <option key={team.id} value={team.id}>{getTeamLabel(team)}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-black text-app-muted">
                    사진 미션
                    <select value={photoPromptFilter} onChange={(changeEvent) => setPhotoPromptFilter(changeEvent.target.value)} className="mt-1 w-full rounded-xl border border-app-border bg-white px-2 py-2 text-xs font-bold text-app-ink">
                      <option value="all">전체 미션</option>
                      {(event.submission?.prompts ?? []).map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.title}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 space-y-5">
                  {reviewGroups.map(({ team, submissions: familySubmissions }) => {
                    const teamLabel = getTeamLabel(team);
                    return (
                      <section key={team.id} className="border-t border-app-border pt-4 first:border-t-0 first:pt-0">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="truncate text-sm font-black">{teamLabel}</h3>
                          <span className="flex-none rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-app-muted">{familySubmissions.length}장</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {familySubmissions.map((item) => {
                            const printAsset = printAssetsRef.current.get(item.id);
                            const printPreparing = preparingPrintIdsRef.current.has(item.id);
                            return (
                            <div key={item.id} className="overflow-hidden rounded-2xl border border-app-border bg-white">
                              <div className="relative">
                                <a
                                  href={printAsset?.url ?? item.thumbUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  draggable={Boolean(printAsset)}
                                  onDragStart={(dragEvent) => setPrintDragData(dragEvent, item)}
                                  onMouseEnter={() => void preparePrintAsset(item)}
                                  onFocus={() => void preparePrintAsset(item)}
                                  onClick={(clickEvent) => {
                                    if (printAsset) return;
                                    clickEvent.preventDefault();
                                    void preparePrintAsset(item);
                                    setNotice("출력용 JPG를 준비하고 있습니다. 잠시 후 사진을 다시 눌러주세요.");
                                  }}
                                  className={`block w-full ${printAsset ? "cursor-grab active:cursor-grabbing" : "cursor-wait"}`}
                                  aria-label={`${teamLabel} ${item.title} 출력용 JPG 크게 보기`}
                                >
                                  <img
                                    src={item.thumbUrl}
                                    alt={item.title}
                                    draggable={false}
                                    loading="lazy"
                                    onLoad={() => void preparePrintAsset(item)}
                                    className="aspect-square w-full object-cover"
                                    title={printAsset ? "끌어서 출력용 JPG 저장" : "출력용 JPG 준비 중"}
                                  />
                                </a>
                                <span className={`pointer-events-none absolute right-2 top-2 rounded-lg px-2 py-1 text-[10px] font-black text-white ${printAsset ? "bg-emerald-600" : "bg-slate-950/70"}`}>
                                  {printAsset ? "JPG 끌기" : printPreparing ? "JPG 준비 중" : "JPG 준비"}
                                </span>
                              </div>
                              <div className="p-2">
                                {item.promptId && promptById.get(item.promptId) && <p className="truncate text-[10px] font-black text-app-primary">미션 · {promptById.get(item.promptId)?.title}</p>}
                                <p className="truncate text-[11px] font-bold text-app-muted">{item.title}</p>
                                <div className="mt-2 grid grid-cols-2 gap-1">
                                  <button type="button" onClick={() => void downloadPrintJpeg(item)} disabled={busy === `download-${item.id}`} className="flex items-center justify-center gap-1 rounded-xl bg-app-ink px-2 py-2 text-[11px] font-black text-white disabled:opacity-50">
                                    {busy === `download-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}출력 JPG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.hidden) {
                                        void toggleHidden(item.id, false);
                                        return;
                                      }
                                      requestConfirmation({
                                        action: () => toggleHidden(item.id, true),
                                        confirmLabel: "사진 숨기기",
                                        description: `${teamLabel}의 사진이 포토 보드와 투표 대상에서 숨겨집니다. 나중에 다시 표시할 수 있습니다.`,
                                        title: "이 사진을 숨길까요?",
                                        tone: "danger",
                                      });
                                    }}
                                    disabled={busy === `hide-${item.id}`}
                                    className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black ${item.hidden ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-app-muted"}`}
                                  >
                                    {item.hidden ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {item.hidden ? "다시 표시" : "숨기기"}
                                  </button>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                  {reviewGroups.length === 0 && <p className="rounded-xl bg-slate-100 px-3 py-5 text-center text-xs font-bold text-app-muted">조건에 맞는 사진이 없습니다.</p>}
                </div>
              </section>

              <section id="result-operations" className="card scroll-mt-4 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-black">집계 및 결과 공개</h2>
                    <p className="mt-1 text-xs font-bold text-app-muted">동점은 사진·제목·사연 등을 검토해 운영팀이 최종 순서를 지정합니다.</p>
                  </div>
                  {hasAwardTie && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-900">동점 처리 필요</span>}
                </div>
                {hasAwardTie && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-black text-amber-900">시상권 동점 가족</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tiedCandidates.map((item) => (
                        <span key={item.submission.teamId} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-amber-900">
                          {getTeamLabel(teamById.get(item.submission.teamId) ?? { name: item.submission.teamId })} · {item.votes}표
                        </span>
                      ))}
                    </div>
                    <label className="mt-3 block text-xs font-black text-amber-900">
                      운영팀 선정 사유 *
                      <input value={tieBreakNote} onChange={(changeEvent) => setTieBreakNote(changeEvent.target.value)} placeholder="예: 사진의 사연과 행사 주제 표현이 좋아 행복한 김가족을 3등으로 선정" className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-app-ink outline-none focus:border-amber-500" />
                    </label>
                  </div>
                )}
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
                          <option key={item.submission.teamId} value={item.submission.teamId} disabled={winnerIds.some((winnerId, winnerIndex) => winnerIndex !== index && winnerId === item.submission.teamId)}>
                            {getTeamLabel(teamById.get(item.submission.teamId) ?? { name: item.submission.teamId })} · {item.votes}표
                          </option>
                        ))}
                      </select>
                      <span className="w-16 text-right text-xs font-black text-app-primary">{prizeAmounts[index].toLocaleString()}원</span>
                    </label>
                  ))}
                </div>
                {hasDuplicateWinners && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-center text-[11px] font-black text-red-700">같은 가족을 여러 순위에 선택할 수 없습니다.</p>}
                <div className="mt-4">
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
                    className="w-full rounded-2xl border border-app-border bg-white px-3 py-3 text-xs font-black disabled:opacity-40"
                  >
                    발표 초기화 · 결과 숨기기
                  </button>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([3, 2, 1] as const).map((rank) => {
                      const prerequisiteRank = rank === 3 ? null : rank + 1;
                      const canReveal = prerequisiteRank === null || revealedRanks.includes(prerequisiteRank as 2 | 3);
                      const alreadyRevealed = revealedRanks.includes(rank);
                      return (
                        <button
                          key={rank}
                          type="button"
                          onClick={() => requestConfirmation({
                            action: () => publishResults(true, rank),
                            confirmLabel: `${rank}등 공개`,
                            description: `${rank}등 가족과 사진이 모든 참가자의 결과 화면에 즉시 표시됩니다.`,
                            title: `${rank}등을 공개할까요?`,
                          })}
                          disabled={Boolean(busy) || event.voting?.status !== "closed" || hasDuplicateWinners || (hasAwardTie && !tieBreakNote.trim()) || !canReveal || alreadyRevealed}
                          className="rounded-2xl bg-app-primary px-2 py-3 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {alreadyRevealed ? `${rank}등 공개됨` : `${rank}등 공개`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {event.voting?.status !== "closed" && (
                  <p className="mt-2 text-center text-[11px] font-bold text-app-muted">투표 마감 후 결과를 공개할 수 있습니다.</p>
                )}
                {resultsVisible && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    참가자에게 {revealedRanks.join("·")}등 공개 중
                  </div>
                )}
                {!resultsVisible && event.results?.status === "published" && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800">
                    저장된 결과는 투표를 마감할 때까지 참가자에게 보이지 않습니다.
                  </p>
                )}
              </section>

              <section>
                <button type="button" onClick={downloadResultsCsv} className="card flex w-full items-center justify-center gap-2 p-4 text-xs font-black">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  집계 CSV
                </button>
              </section>

              {event.modules?.songRequest && (
                <section id="song-requests" className="card scroll-mt-4 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black">신청곡</h2>
                      <p className="mt-1 text-xs font-bold text-app-muted">재생 완료 {playedSongCount}/{songRequests.length}</p>
                    </div>
                    <strong className="text-lg font-black">{songRequests.length}</strong>
                  </div>
                  <div className="mt-3 divide-y divide-app-border">
                    {sortedSongRequests.map((request) => (
                      <div key={request.id} className={`flex items-start gap-3 py-3 ${request.playedAt ? "opacity-60" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-app-primary">{request.familyName ?? "가족 미확인"}</p>
                          <p className={`text-sm font-black ${request.playedAt ? "line-through" : ""}`}>{request.songTitle} · {request.artist}</p>
                          {request.story && <p className="mt-1 text-xs font-bold text-app-muted">{request.story}</p>}
                        </div>
                        <button type="button" onClick={() => void toggleSongPlayed(request.id, !request.playedAt)} disabled={busy === `song-${request.id}`} className={`flex flex-none items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-black ${request.playedAt ? "bg-slate-100 text-app-muted" : "bg-app-ink text-white"}`}>
                          {busy === `song-${request.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Music2 className="h-3.5 w-3.5" aria-hidden="true" />}
                          {request.playedAt ? "완료 취소" : "재생 완료"}
                        </button>
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
