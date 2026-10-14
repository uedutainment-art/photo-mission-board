import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Images, Loader2, Pencil, Plus, RotateCw, Trash2, Trophy, X } from "lucide-react";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { useContestSubmissions, type FamilySubmissionWithId } from "../hooks/useContestSubmissions";
import { useTeamSession } from "../hooks/useTeamSession";
import { deleteContestSubmission, saveContestSubmission } from "../lib/contest";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel } from "../lib/teamLabel";

export function TeamContest() {
  const { teamToken } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { error: submissionError, loading: submissionsLoading, submissions } = useContestSubmissions(context?.eventId);
  const ownSubmissions = useMemo(
    () => submissions.filter((item) => item.teamId === context?.teamId).sort((a, b) => a.id.localeCompare(b.id)),
    [context?.teamId, submissions],
  );
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FamilySubmissionWithId | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submissionOpen = context?.event.submission?.status === "open";
  const photoLimit = context?.event.preset === "family-photo-contest"
    ? Math.max(6, context.event.submission?.limit ?? 0)
    : context?.event.submission?.limit ?? 1;
  const minimumPhotos = context?.event.preset === "family-photo-contest"
    ? context.event.submission?.minimum ?? 4
    : 1;
  const participantLabels = getParticipantLabels(context?.event);
  const editingSubmission = ownSubmissions.find((item) => item.id === editingId);

  function clearEditor() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setEditingId(null);
    setTitle("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(nextFile: File | undefined) {
    if (!nextFile) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  function chooseNewPhoto() {
    clearEditor();
    setTitle(`우리 가족의 순간 ${ownSubmissions.length + 1}`);
    fileRef.current?.click();
  }

  function chooseReplacement(submission: FamilySubmissionWithId) {
    clearEditor();
    setEditingId(submission.id);
    setTitle(submission.title);
    fileRef.current?.click();
  }

  async function handleSubmit() {
    if (!context || !file) return;
    const replacing = Boolean(editingId);
    setBusy(true);
    setLocalError(null);
    setNotice(null);
    try {
      await saveContestSubmission({
        eventId: context.eventId,
        teamId: context.teamId,
        uploaderId: context.uploaderId,
        title,
        file,
        submissionId: editingId ?? undefined,
      });
      clearEditor();
      setNotice(replacing ? "사진을 교체했습니다." : "사진을 추가했습니다.");
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "사진을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!context || !pendingDelete) return;
    setBusy(true);
    setLocalError(null);
    try {
      await deleteContestSubmission(context.eventId, pendingDelete.id, pendingDelete);
      setPendingDelete(null);
      setNotice("사진을 삭제했습니다.");
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : "사진을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const loading = sessionLoading || submissionsLoading;
  const error = sessionError || submissionError || localError;
  const enoughPhotos = ownSubmissions.length >= minimumPhotos;

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="bg-app-ink px-5 pb-5 pt-5 text-white"><p className="text-[11px] font-black text-slate-400">PHOTO CONTEST</p><h1 className="mt-1 text-xl font-black">{context ? getTeamLabel(context.team) : "사진 콘테스트"}</h1></header>
        <div className="flex-1 space-y-4 bg-slate-50 p-4">
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">{notice}</div>}
          {!loading && context && (
            <>
              <section className="card p-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black">오늘의 즐거운 순간</h2><p className="mt-2 text-sm font-bold leading-6 text-app-muted">{participantLabels.singular}의 사진을 {minimumPhotos}~{photoLimit}장 등록해주세요.</p></div><strong className={enoughPhotos ? "text-emerald-700" : "text-app-primary"}>{ownSubmissions.length}/{photoLimit}</strong></div>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${submissionOpen ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-app-muted"}`}>{submissionOpen ? "사진 접수 중" : context.event.submission?.status === "closed" ? "사진 접수 마감" : "접수 대기"}</span>
                {ownSubmissions.length > 0 && !enoughPhotos && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">사진을 {minimumPhotos - ownSubmissions.length}장 더 등록해주세요.</p>}
              </section>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />

              {ownSubmissions.length > 0 && (
                <section className="card p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {ownSubmissions.map((submission, index) => (
                      <article key={submission.id} className="overflow-hidden rounded-2xl border border-app-border bg-white">
                        <div className="relative aspect-square"><img src={submission.thumbUrl} alt={submission.title} className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-black text-white">{index + 1}</span></div>
                        <div className="p-2"><p className="truncate text-xs font-black">{submission.title}</p>{submissionOpen && <div className="mt-2 grid grid-cols-2 gap-1"><button type="button" onClick={() => chooseReplacement(submission)} className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2 py-2 text-[11px] font-black"><Pencil className="h-3 w-3" />교체</button><button type="button" onClick={() => setPendingDelete(submission)} className="flex items-center justify-center gap-1 rounded-xl bg-red-50 px-2 py-2 text-[11px] font-black text-red-700"><Trash2 className="h-3 w-3" />삭제</button></div>}</div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {submissionOpen && ownSubmissions.length < photoLimit && !preview && (
                <button type="button" onClick={chooseNewPhoto} className="card flex w-full items-center justify-center gap-2 border-dashed p-5 text-sm font-black text-app-primary"><Plus className="h-5 w-5" />사진 추가</button>
              )}

              {submissionOpen && preview && (
                <section className="card p-4">
                  <div className="flex items-center justify-between"><h2 className="text-sm font-black">{editingSubmission ? "사진 교체" : "새 사진 추가"}</h2><button type="button" onClick={clearEditor} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100" aria-label="취소"><X className="h-4 w-4" /></button></div>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-3 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-slate-100 disabled:opacity-60"><img src={preview} alt="선택한 사진 미리보기" className="h-full w-full object-cover" /></button>
                  <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 30))} placeholder="사진 제목 (30자 이하)" className="mt-3 w-full rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-app-primary" />
                  <button type="button" onClick={() => void handleSubmit()} disabled={!file || !title.trim() || busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : localError ? <RotateCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{busy ? "업로드 중 · 잠시만 기다려주세요" : editingSubmission ? "이 사진 교체" : "사진 등록"}</button>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Link to={`/t/${teamToken}/gallery`} className="card flex flex-col gap-3 p-4"><Images className="h-5 w-5 text-app-primary" /><div><h2 className="text-sm font-black">전체 사진</h2><p className="mt-1 text-xs font-bold text-app-muted">다른 가족 감상·투표</p></div></Link>
                <Link to={`/t/${teamToken}/results`} className="card flex flex-col gap-3 p-4"><Trophy className="h-5 w-5 text-amber-600" /><div><h2 className="text-sm font-black">결과</h2><p className="mt-1 text-xs font-bold text-app-muted">공개 후 확인</p></div></Link>
              </div>
            </>
          )}
        </div>
      </section>
      <ConfirmActionDialog busy={busy} confirmLabel="사진 삭제" description="이 사진의 원본과 썸네일이 모두 삭제되며 되돌릴 수 없습니다." onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} open={Boolean(pendingDelete)} title="사진을 삭제할까요?" tone="danger" />
    </main>
  );
}
