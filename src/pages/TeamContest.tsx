import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Images, Loader2, RotateCw, Trophy } from "lucide-react";
import { useContestSubmissions } from "../hooks/useContestSubmissions";
import { useTeamSession } from "../hooks/useTeamSession";
import { saveContestSubmission } from "../lib/contest";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel } from "../lib/teamLabel";

export function TeamContest() {
  const { teamToken } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { error: submissionError, loading: submissionsLoading, submissions } = useContestSubmissions(context?.eventId);
  const ownSubmission = submissions.find((item) => item.teamId === context?.teamId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submissionOpen = context?.event.submission?.status === "open";
  const participantLabels = getParticipantLabels(context?.event);

  function handleFile(nextFile: File | undefined) {
    if (!nextFile) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  async function handleSubmit() {
    if (!context || !file) return;
    setBusy(true);
    setLocalError(null);
    setNotice(null);
    try {
      await saveContestSubmission({ eventId: context.eventId, teamId: context.teamId, uploaderId: context.uploaderId, title, file });
      setFile(null);
      setPreview(null);
      setTitle("");
      setNotice(ownSubmission ? "대표사진을 교체했습니다." : "대표사진을 등록했습니다.");
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "사진을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const loading = sessionLoading || submissionsLoading;
  const error = sessionError || submissionError || localError;

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
              <section className="card p-4"><h2 className="text-base font-black">오늘의 즐거운 순간</h2><p className="mt-2 text-sm font-bold leading-6 text-app-muted">{participantLabels.singular}을 대표할 사진 한 장과 짧은 제목을 등록해주세요.</p><span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${submissionOpen ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-app-muted"}`}>{submissionOpen ? "사진 접수 중" : context.event.submission?.status === "closed" ? "사진 접수 마감" : "접수 대기"}</span></section>
              {ownSubmission && !preview && <section className="card overflow-hidden"><img src={ownSubmission.thumbUrl} alt={ownSubmission.title} className="aspect-square w-full object-cover" /><div className="p-4"><p className="text-[11px] font-black text-app-muted">현재 대표사진</p><h2 className="mt-1 text-base font-black">{ownSubmission.title}</h2></div></section>}
              {submissionOpen && (
                <section className="card p-4">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-100 disabled:opacity-60">
                    {preview ? <img src={preview} alt="선택한 사진 미리보기" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm font-black text-app-muted"><Camera className="h-7 w-7" />{ownSubmission ? "교체할 사진 선택" : "대표사진 선택"}</span>}
                  </button>
                  <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 30))} placeholder="사진 제목 (30자 이하)" className="mt-3 w-full rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-app-primary" />
                  <button type="button" onClick={() => void handleSubmit()} disabled={!file || !title.trim() || busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : localError ? <RotateCw className="h-4 w-4" aria-hidden="true" /> : null}
                    {busy ? "업로드 중 · 잠시만 기다려주세요" : localError ? "같은 사진으로 다시 시도" : ownSubmission ? "대표사진 교체" : "대표사진 등록"}
                  </button>
                </section>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/t/${teamToken}/gallery`} className="card flex flex-col gap-3 p-4"><Images className="h-5 w-5 text-app-primary" /><div><h2 className="text-sm font-black">전체 사진</h2><p className="mt-1 text-xs font-bold text-app-muted">다른 사진 감상·투표</p></div></Link>
                <Link to={`/t/${teamToken}/results`} className="card flex flex-col gap-3 p-4"><Trophy className="h-5 w-5 text-amber-600" /><div><h2 className="text-sm font-black">결과</h2><p className="mt-1 text-xs font-bold text-app-muted">공개 후 확인</p></div></Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
