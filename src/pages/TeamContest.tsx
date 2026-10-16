import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Gamepad2, Images, Loader2, Pencil, Plus, RotateCw, Trash2, Trophy, X } from "lucide-react";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { EventBrandMark } from "../components/EventBrandMark";
import { useContestSubmissions, type FamilySubmissionWithId } from "../hooks/useContestSubmissions";
import { useTeamSession } from "../hooks/useTeamSession";
import { deleteContestSubmission, saveContestSubmission } from "../lib/contest";
import { isSonovaFamilyDay } from "../lib/eventBrand";
import { getParticipantLabels } from "../lib/participantTerms";
import { getParticipantName } from "../lib/teamLabel";
import type { PhotoPrompt } from "../lib/types";

export function TeamContest() {
  const { teamToken } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { error: submissionError, loading: submissionsLoading, submissions } = useContestSubmissions(context?.eventId, context?.teamId);
  const ownSubmissions = useMemo(
    () => submissions.filter((item) => item.teamId === context?.teamId).sort((a, b) => a.id.localeCompare(b.id)),
    [context?.teamId, submissions],
  );
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [promptUploadTarget, setPromptUploadTarget] = useState<{ prompt: PhotoPrompt; submission?: FamilySubmissionWithId } | null>(null);
  const [uploadingPromptId, setUploadingPromptId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FamilySubmissionWithId | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submissionOpen = context?.event.submission?.status === "open";
  const galleryOpen = context?.event.voting?.status === "open" || context?.event.voting?.status === "closed";
  const photoPrompts = context?.event.submission?.prompts ?? [];
  const photoLimit = photoPrompts.length || (context?.event.submission?.limit ?? (context?.event.preset === "family-photo-contest" ? 6 : 1));
  const minimumPhotos = context?.event.preset === "family-photo-contest"
    ? context.event.submission?.minimum ?? 4
    : 1;
  const participantLabels = getParticipantLabels(context?.event);
  const editingSubmission = ownSubmissions.find((item) => item.id === editingId);
  const promptSlots = useMemo(() => {
    const legacy = ownSubmissions.filter((submission) => !submission.promptId);
    return photoPrompts.map((prompt) => ({
      prompt,
      submission: ownSubmissions.find((submission) => submission.promptId === prompt.id) ?? legacy.shift(),
    }));
  }, [ownSubmissions, photoPrompts]);
  const activePrompt = photoPrompts.find((prompt) => prompt.id === activePromptId);
  const sonova = isSonovaFamilyDay(context?.event);

  function clearEditor() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setEditingId(null);
    setActivePromptId(null);
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

  function chooseReplacement(submission: FamilySubmissionWithId, promptId?: string) {
    clearEditor();
    setEditingId(submission.id);
    setActivePromptId(promptId ?? submission.promptId ?? null);
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
        promptId: activePromptId ?? undefined,
        maxSubmissions: photoLimit,
      });
      clearEditor();
      setNotice(replacing ? "사진을 교체했습니다." : "사진을 추가했습니다.");
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "사진을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePromptFile(nextFile: File | undefined) {
    const target = promptUploadTarget;
    if (!context || !nextFile || !target) return;

    setPromptUploadTarget(null);
    setUploadingPromptId(target.prompt.id);
    setBusy(true);
    setLocalError(null);
    setNotice(null);
    try {
      await saveContestSubmission({
        eventId: context.eventId,
        teamId: context.teamId,
        uploaderId: context.uploaderId,
        title: target.prompt.title,
        file: nextFile,
        submissionId: target.submission?.id,
        promptId: target.prompt.id,
        maxSubmissions: photoLimit,
      });
      setNotice(target.submission ? `${target.prompt.title} 사진을 교체했습니다.` : `${target.prompt.title} 미션을 채웠습니다.`);
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "사진을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
      setUploadingPromptId(null);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
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
  const filledCount = photoPrompts.length > 0
    ? promptSlots.filter((slot) => slot.submission).length
    : ownSubmissions.length;
  const enoughPhotos = filledCount >= minimumPhotos;

  return (
    <main data-upload-busy={busy} className={`min-h-dvh px-4 py-6 text-app-ink ${sonova ? "bg-[#dfe7e2]" : "bg-app-background"}`}>
      <section className={`phone-surface relative overflow-hidden rounded-[28px] border shadow-phone ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]" : "border-app-border"}`}>
        {sonova && <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55" />}
        <header className={`relative z-10 px-5 pb-5 pt-5 ${sonova ? "border-b border-[#d9dfd2] bg-[#f8f5e9]/90 text-[#173c2c]" : "bg-app-ink text-white"}`}><div className="flex items-center gap-3"><Link to={`/t/${teamToken}`} className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${sonova ? "bg-white/80" : "bg-white/10"}`} aria-label="가족 행사 메뉴로 돌아가기"><ArrowLeft className="h-5 w-5" /></Link><div className="min-w-0 flex-1"><p className={`text-[11px] font-black ${sonova ? "text-[#617466]" : "text-slate-400"}`}>PHOTO CONTEST</p><h1 className="mt-1 truncate text-xl font-black">{context ? getParticipantName(context.team) : "사진 콘테스트"}</h1></div>{context && sonova ? <EventBrandMark event={context.event} compact /> : null}</div></header>
        <div className={`relative z-10 flex-1 space-y-4 p-4 ${sonova ? "bg-white/25" : "bg-slate-50"}`}>
          {loading && <div className="card flex items-center justify-center gap-2 p-5 text-sm font-black text-app-muted"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
          {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">{notice}</div>}
          {!loading && context && (
            <>
              <section className="card p-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black">우리 가족 사진 미션</h2><p className="mt-2 text-sm font-bold leading-6 text-app-muted">{photoPrompts.length > 0 ? `${photoPrompts.length}개 미션에 사진을 한 장씩 등록해주세요.` : `${participantLabels.singular}의 사진을 ${minimumPhotos}~${photoLimit}장 등록해주세요.`}</p></div><strong className={enoughPhotos ? "text-emerald-700" : "text-app-primary"}>{filledCount}/{photoLimit}</strong></div>
                {submissionOpen && context.event.results?.winnerCount ? <p className="mt-3 flex items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-xs font-black leading-5 text-amber-900"><Trophy className="h-4 w-4 flex-none text-amber-600" aria-hidden="true" /><span>가족의 즐거운 순간을 남겨주세요. 베스트 포토 가족에게 선물이 있어요.</span></p> : null}
                {submissionOpen && photoPrompts.length > 0 ? <p className="mt-2 rounded-[8px] bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-app-muted"><strong className="text-app-ink">잘 찍는 팁</strong> · 렌즈를 닦고 · 빛을 마주 보고 · 촬영 후 얼굴이 선명한지 확인하세요.</p> : null}
                {context.event.guide?.activities?.length && photoPrompts.length === 0 ? <Link to={`/e/${context.eventId}/games?team=${encodeURIComponent(teamToken ?? "")}`} className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black leading-5 text-emerald-800"><Gamepad2 className="h-4 w-4 flex-none" aria-hidden="true" /><span>전통놀이를 즐기는 장면도 한 장 정도 남겨보세요.</span></Link> : null}
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${submissionOpen ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-app-muted"}`}>{submissionOpen ? "사진 접수 중" : context.event.submission?.status === "closed" ? "사진 접수 마감" : "접수 대기"}</span>
                {filledCount > 0 && !enoughPhotos && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">사진을 {minimumPhotos - filledCount}장 더 등록해주세요.</p>}
              </section>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              <input ref={cameraRef} type="file" accept="image/*" capture={promptUploadTarget?.prompt.id.includes("selfie") ? "user" : "environment"} className="hidden" onChange={(event) => void handlePromptFile(event.target.files?.[0])} />
              <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handlePromptFile(event.target.files?.[0])} />

              {photoPrompts.length > 0 && (
                <section className="grid grid-cols-2 gap-3" aria-label="사진 미션 4칸">
                  {promptSlots.map(({ prompt, submission }, index) => (
                    <article key={prompt.id} className="flex min-h-[250px] flex-col overflow-hidden rounded-[8px] border border-app-border bg-white shadow-card">
                      <div className="flex items-start gap-2 p-3">
                        <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#173c2c] text-[11px] font-black text-white">{index + 1}</span>
                        <div className="min-w-0"><h3 className="text-sm font-black leading-5">{prompt.title}</h3><p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-app-muted">{prompt.description}</p></div>
                      </div>
                      {submission ? (
                        <div className="mt-auto border-t border-app-border p-2">
                          <div className="relative"><img src={submission.thumbUrl} alt={submission.title} className="aspect-square w-full rounded-[6px] object-cover" /><span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white">완료</span></div>
                          {submissionOpen && <div className="mt-2 grid grid-cols-2 gap-1"><button type="button" onClick={() => setPromptUploadTarget({ prompt, submission })} disabled={busy} className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-2 text-[11px] font-black"><Pencil className="h-3 w-3" />교체</button><button type="button" onClick={() => setPendingDelete(submission)} disabled={busy} className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-[11px] font-black text-red-700"><Trash2 className="h-3 w-3" />삭제</button></div>}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setPromptUploadTarget({ prompt })} disabled={!submissionOpen || busy} className="m-2 mt-auto flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-[#b9c9bd] bg-[#f4f7f2] px-2 text-center text-[#47765c] disabled:border-slate-200 disabled:bg-slate-50 disabled:text-app-muted">
                          {uploadingPromptId === prompt.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                          <span className="text-xs font-black">{uploadingPromptId === prompt.id ? "업로드 중" : submissionOpen ? "이 칸 채우기" : "접수 대기"}</span>
                          {submissionOpen && uploadingPromptId !== prompt.id && <span className="text-[10px] font-bold">촬영 또는 앨범</span>}
                        </button>
                      )}
                    </article>
                  ))}
                </section>
              )}

              {photoPrompts.length === 0 && ownSubmissions.length > 0 && (
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

              {photoPrompts.length === 0 && submissionOpen && ownSubmissions.length < photoLimit && !preview && (
                <button type="button" onClick={() => chooseNewPhoto()} className="card flex w-full items-center justify-center gap-2 border-dashed p-5 text-sm font-black text-app-primary"><Plus className="h-5 w-5" />사진 추가</button>
              )}

              {photoPrompts.length === 0 && submissionOpen && preview && (
                <section className="card p-4">
                  <div className="flex items-center justify-between"><div><h2 className="text-sm font-black">{editingSubmission ? "사진 교체" : "새 사진 추가"}</h2>{activePrompt && <p className="mt-1 text-xs font-bold text-app-primary">미션 · {activePrompt.title}</p>}</div><button type="button" onClick={clearEditor} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100" aria-label="취소"><X className="h-4 w-4" /></button></div>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-3 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-slate-100 disabled:opacity-60"><img src={preview} alt="선택한 사진 미리보기" className="h-full w-full object-cover" /></button>
                  <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 30))} placeholder="사진 제목 (30자 이하)" className="mt-3 w-full rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-app-primary" />
                  <button type="button" onClick={() => void handleSubmit()} disabled={!file || !title.trim() || busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : localError ? <RotateCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{busy ? "업로드 중 · 잠시만 기다려주세요" : editingSubmission ? "이 사진 교체" : "사진 등록"}</button>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                {galleryOpen ? <Link to={`/t/${teamToken}/gallery`} className="card flex flex-col gap-3 p-4"><Images className="h-5 w-5 text-app-primary" /><div><h2 className="text-sm font-black">전체 사진</h2><p className="mt-1 text-xs font-bold text-app-muted">다른 가족 감상·투표</p></div></Link> : <div className="card flex flex-col gap-3 p-4 text-app-muted" aria-disabled="true"><Images className="h-5 w-5" /><div><h2 className="text-sm font-black">전체 사진</h2><p className="mt-1 text-xs font-bold">투표 시작 후 공개됩니다</p></div></div>}
                <Link to={`/t/${teamToken}/results`} className="card flex flex-col gap-3 p-4"><Trophy className="h-5 w-5 text-amber-600" /><div><h2 className="text-sm font-black">결과</h2><p className="mt-1 text-xs font-bold text-app-muted">공개 후 확인</p></div></Link>
              </div>
            </>
          )}
        </div>
        {promptUploadTarget && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3" role="dialog" aria-modal="true" aria-label={`${promptUploadTarget.prompt.title} 사진 선택`}>
            <div className="w-full max-w-[406px] rounded-[12px] bg-white p-3 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[11px] font-black text-[#617466]">사진 미션</p><h2 className="mt-1 text-lg font-black text-[#173c2c]">{promptUploadTarget.prompt.title}</h2></div>
                <button type="button" onClick={() => setPromptUploadTarget(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100" aria-label="사진 선택 닫기"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-xs font-bold leading-5 text-app-muted">사진을 고르면 이 미션 칸에 바로 저장됩니다.</p>
              <button type="button" onClick={() => cameraRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#173c2c] px-4 py-3 text-sm font-black text-white"><Camera className="h-5 w-5" />카메라로 촬영</button>
              <button type="button" onClick={() => libraryRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#ccd6ca] bg-white px-4 py-3 text-sm font-black text-[#173c2c]"><Images className="h-5 w-5" />앨범에서 선택</button>
            </div>
          </div>
        )}
      </section>
      <ConfirmActionDialog busy={busy} confirmLabel="사진 삭제" description="이 사진의 원본과 썸네일이 모두 삭제되며 되돌릴 수 없습니다." onCancel={() => setPendingDelete(null)} onConfirm={() => void handleDelete()} open={Boolean(pendingDelete)} title="사진을 삭제할까요?" tone="danger" />
    </main>
  );
}
