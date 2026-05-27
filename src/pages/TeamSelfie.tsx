import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, ChevronRight, Loader2, Upload } from "lucide-react";
import { SelfieBanner } from "../components/SelfieBanner";
import { useSelfies } from "../hooks/useSelfies";
import { useTeamSession } from "../hooks/useTeamSession";
import { uploadSelfie } from "../lib/selfies";

export function TeamSelfie() {
  const { teamToken } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { error: selfiesError, loading: selfiesLoading, selfies } = useSelfies(
    context?.eventId,
    context?.teamId,
  );
  const [uploaderName, setUploaderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasMySelfie = useMemo(
    () => selfies.some((selfie) => selfie.uploaderId === context?.uploaderId),
    [context?.uploaderId, selfies],
  );
  const groupPhotoReady = context?.event.selfieMode === "group" && selfies.length > 0;
  const canContinue =
    context?.event.selfieMode === "group" ? groupPhotoReady : hasMySelfie;
  const showUpload =
    context?.event.selfieMode === "group" ? !groupPhotoReady : !hasMySelfie;

  async function handleFile(file: File | undefined) {
    if (!file || !context) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await uploadSelfie({
        eventId: context.eventId,
        teamId: context.teamId,
        uploaderId: context.uploaderId,
        uploaderName,
        file,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "셀카 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function goPlaces() {
    if (teamToken) {
      navigate(`/t/${teamToken}/places`);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to={teamToken ? `/t/${teamToken}` : "/"}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">셀카 단계</h1>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50 p-4">
          {(sessionLoading || selfiesLoading) && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              셀카 화면 준비 중
            </section>
          )}

          {(sessionError || selfiesError) && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {sessionError || selfiesError}
            </section>
          )}

          {!sessionLoading && !sessionError && context && (
            <>
              <SelfieBanner
                currentUploaderId={context.uploaderId}
                selfies={selfies}
                team={context.team}
              />

              <section className="card p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                  {context.event.selfieMode === "group" ? "단체사진" : "내 셀카"}
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {canContinue ? "셀카가 등록됐어요" : "장소 미션 전에 사진을 올려주세요"}
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                  {context.event.selfieMode === "group"
                    ? "팀 단체사진 1장이 올라오면 모두 장소 미션으로 이동할 수 있습니다."
                    : "본인이 올린 셀카가 있어야 장소 미션으로 이동할 수 있습니다."}
                </p>
              </section>

              {showUpload && (
                <section className="card p-4">
                  <label className="mb-3 block rounded-2xl border border-app-border bg-white px-4 py-3">
                    <span className="block text-[11px] font-black text-slate-400">이름</span>
                    <input
                      value={uploaderName}
                      onChange={(event) => {
                        setUploaderName(event.target.value);
                      }}
                      placeholder="예: 민지"
                      className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                    />
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(event) => {
                      void handleFile(event.target.files?.[0]);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Camera className="h-4 w-4" aria-hidden="true" />
                    )}
                    {uploading ? "업로드 중" : "셀카 올리기"}
                  </button>

                  {uploadError && (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                      {uploadError}
                    </div>
                  )}
                </section>
              )}

              {canContinue && (
                <button
                  type="button"
                  onClick={goPlaces}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white"
                >
                  장소 미션으로
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              {!showUpload && !canContinue && (
                <section className="card flex gap-3 p-4">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                    <Upload className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold leading-6 text-app-muted">
                    팀원이 사진을 올리는 중입니다. 올라오면 자동으로 버튼이 활성화됩니다.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
