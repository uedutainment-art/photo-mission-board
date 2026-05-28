import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  HelpCircle,
  ImagePlus,
  Loader2,
  MapPin,
  Star,
  Trash2,
} from "lucide-react";
import { HelpSheet } from "../components/HelpSheet";
import { useSelfies } from "../hooks/useSelfies";
import { useTeamMission, type PhotoWithId } from "../hooks/useTeamMission";
import { useTeamSession } from "../hooks/useTeamSession";
import {
  deleteMissionPhoto,
  setRepresentativePhoto,
  uploadMissionPhoto,
} from "../lib/upload";

function getUploadedAt(photo: PhotoWithId): number {
  return photo.uploadedAt?.toMillis?.() ?? 0;
}

function getUploaderLabel(photo: PhotoWithId, currentUploaderId: string): string {
  if (photo.uploaderId === currentUploaderId) {
    return "나";
  }

  return photo.uploaderName || "팀원";
}

function getTeamLabel(team: { displayName?: string; name: string }): string {
  return team.displayName && team.displayName !== team.name
    ? `${team.name} · ${team.displayName}`
    : team.name;
}

export function TeamPlaceDetail() {
  const { placeId, teamToken } = useParams();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { context, error: sessionError, loading: sessionLoading } = useTeamSession(teamToken);
  const { selfies } = useSelfies(context?.eventId, context?.teamId);
  const { error: missionError, loading: missionLoading, photos, slots } = useTeamMission(
    context?.eventId,
    context?.teamId,
  );
  const [uploaderName, setUploaderName] = useState("");
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const place = context?.event.places.find((candidate) => candidate.id === placeId);
  const placeSlots = useMemo(
    () => slots.filter((slot) => slot.placeId === placeId),
    [placeId, slots],
  );
  const placeSlotIds = useMemo(() => new Set(placeSlots.map((slot) => slot.id)), [placeSlots]);
  const placePhotos = useMemo(
    () =>
      photos
        .filter((photo) => placeSlotIds.has(photo.slotId))
        .sort((a, b) => getUploadedAt(b) - getUploadedAt(a)),
    [photos, placeSlotIds],
  );
  const representativeCount = placeSlots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const teamLabel = context ? getTeamLabel(context.team) : "팀";
  const hasHelpContact = Boolean(context?.event.organizer?.phone || context?.team.leader?.phone);
  const hasMySelfie = selfies.some((selfie) => selfie.uploaderId === context?.uploaderId);
  const selfieReady =
    !context ||
    context.event.selfieMode === "none" ||
    (context.event.selfieMode === "group" && selfies.length > 0) ||
    (context.event.selfieMode === "individual" && hasMySelfie);

  async function handleFile(file: File | undefined) {
    if (!file || !context || !placeId) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadMissionPhoto({
        eventId: context.eventId,
        teamId: context.teamId,
        placeId,
        uploaderId: context.uploaderId,
        uploaderName,
        file,
        slots,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  }

  async function handleRepresentative(photo: PhotoWithId) {
    if (!context) {
      return;
    }

    setBusyPhotoId(photo.id);
    setError(null);

    try {
      await setRepresentativePhoto(context.eventId, photo.slotId, photo.id);
    } catch (representativeError) {
      setError(
        representativeError instanceof Error
          ? representativeError.message
          : "대표 사진을 바꾸지 못했습니다.",
      );
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function handleDelete(photo: PhotoWithId) {
    if (!context) {
      return;
    }

    setBusyPhotoId(photo.id);
    setError(null);

    try {
      await deleteMissionPhoto({
        eventId: context.eventId,
        uploaderId: context.uploaderId,
        photo,
        slotPhotos: photos.filter((candidate) => candidate.slotId === photo.slotId),
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "사진을 삭제하지 못했습니다.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to={teamToken ? `/t/${teamToken}/places` : "/"}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="truncate text-base font-black">{place?.name || "장소 상세"}</h1>
            {hasHelpContact ? (
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-app-ink text-white"
                aria-label="도움 요청"
              >
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50 p-4">
          {(sessionLoading || missionLoading) && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              장소 미션 불러오는 중
            </section>
          )}

          {(sessionError || missionError || error) && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {sessionError || missionError || error}
            </section>
          )}

          {!sessionLoading && !sessionError && context && !place && (
            <section className="card p-6 text-center">
              <h2 className="font-black">장소를 찾을 수 없습니다</h2>
              <p className="mt-2 text-sm font-bold text-app-muted">장소 목록에서 다시 선택해주세요.</p>
            </section>
          )}

          {!sessionLoading && !sessionError && context && place && (
            <>
              <section
                className="relative h-44 overflow-hidden rounded-panel bg-gradient-to-br from-amber-200 to-orange-300"
                style={place.coverUrl ? { backgroundImage: `url(${place.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black">
                  팀당 {place.perTeamCount}장
                </span>
              </section>

              <section className="card p-4">
                <p className="text-sm font-bold leading-6 text-app-muted">
                  {place.description || "이 장소에서 미션 사진을 찍어 올려주세요."}
                </p>
                {place.verifyHint && (
                  <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-app-ink">
                    인증: {place.verifyHint}
                  </p>
                )}
              </section>

              {place.mapUrl && (
                <a
                  href={place.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  지도로 위치 보기
                </a>
              )}

              {!selfieReady && (
                <section className="card p-5 text-center">
                  <h2 className="text-lg font-black">셀카부터 올려주세요</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                    이 팀은 셀카 단계가 끝나야 미션 사진을 올릴 수 있습니다.
                  </p>
                  <Link
                    to={`/t/${teamToken}/selfie`}
                    className="mt-4 block rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                  >
                    셀카 단계로
                  </Link>
                </section>
              )}

              {selfieReady && (
                <>
                  <section className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                          진행 상황
                        </p>
                        <h2 className="mt-1 text-sm font-black">
                          {placeSlots.length}장 필요 · {placePhotos.length}장 올라옴 · 대표 {representativeCount}장
                        </h2>
                      </div>
                      <div className="text-2xl font-black">
                        {representativeCount}/{placeSlots.length}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-app-success"
                        style={{
                          width: `${placeSlots.length > 0 ? (representativeCount / placeSlots.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </section>

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
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        void handleFile(event.target.files?.[0]);
                      }}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleFile(event.target.files?.[0]);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        cameraInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Camera className="h-4 w-4" aria-hidden="true" />
                      )}
                      카메라로 찍어 올리기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        galleryInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-4 text-sm font-black disabled:opacity-50"
                    >
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      갤러리에서 선택
                    </button>
                  </section>

                  <section>
                    <h2 className="mb-3 text-sm font-black">올라온 사진</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {placePhotos.map((photo) => {
                        const isMine = photo.uploaderId === context.uploaderId;
                        const busy = busyPhotoId === photo.id;

                        return (
                          <article key={photo.id} className="card overflow-hidden">
                            <div className="relative aspect-square bg-slate-200">
                              <img
                                src={photo.thumbUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  void handleRepresentative(photo);
                                }}
                                disabled={busy}
                                className={
                                  photo.isRepresentative
                                    ? "absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-card"
                                    : "absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-app-ink/70 text-white shadow-card"
                                }
                                aria-label="대표 사진 선택"
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                                )}
                              </button>
                              {isMine && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDelete(photo);
                                  }}
                                  disabled={busy}
                                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-red-600/90 text-white shadow-card"
                                  aria-label="사진 삭제"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="truncate text-xs font-black">
                                {getUploaderLabel(photo, context.uploaderId)}
                              </p>
                              <p className="mt-1 text-[11px] font-bold text-app-muted">
                                {photo.isRepresentative ? "대표 사진" : "보관 사진"}
                              </p>
                            </div>
                          </article>
                        );
                      })}

                      {placePhotos.length === 0 &&
                        Array.from({ length: Math.max(placeSlots.length, 1) }, (_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="grid aspect-square place-items-center rounded-card border border-dashed border-slate-300 bg-white text-2xl font-black text-slate-300"
                          >
                            +
                          </div>
                        ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {context && (
        <HelpSheet
          event={context.event}
          open={helpOpen}
          team={context.team}
          teamLabel={teamLabel}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </main>
  );
}
