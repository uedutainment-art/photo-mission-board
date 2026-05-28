import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import type { CreateEventPlaceInput } from "../lib/createEvent";
import { uploadImage } from "../lib/storage";
import type { MapPlatform } from "../lib/types";

interface PlaceEditModalProps {
  eventId: string;
  initialPlace?: CreateEventPlaceInput;
  onClose: () => void;
  onDelete?: (placeId: string) => void;
  onSave: (place: CreateEventPlaceInput) => void;
}

const platformLabels: Record<MapPlatform, string> = {
  naver: "네이버지도",
  kakao: "카카오맵",
  google: "구글지도",
};

function createPlaceId(): string {
  return `place-${crypto.randomUUID().slice(0, 8)}`;
}

export function PlaceEditModal({ eventId, initialPlace, onClose, onDelete, onSave }: PlaceEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [place, setPlace] = useState<CreateEventPlaceInput>(
    initialPlace ?? {
      id: createPlaceId(),
      name: "",
      description: "",
      verifyHint: "",
      coverUrl: "",
      coverStoragePath: "",
      mapPlatform: "naver",
      mapUrl: "",
      perTeamCount: 1,
    },
  );
  const [draggingImage, setDraggingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlace) {
      setPlace(initialPlace);
    }
  }, [initialPlace]);

  const canSave = useMemo(
    () => place.name.trim().length > 0 && place.perTeamCount > 0,
    [place.name, place.perTeamCount],
  );

  function updatePlace(nextPlace: Partial<CreateEventPlaceInput>) {
    setPlace((current) => ({
      ...current,
      ...nextPlace,
    }));
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setUploadError(null);

    try {
      const result = await uploadImage(file, `events/${eventId}/places/${place.id}/cover`);
      updatePlace({
        coverStoragePath: result.thumbPath,
        coverUrl: result.thumbUrl,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "대표 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingImage(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDrag(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    handleDrag(event);
    setDraggingImage(false);
    void handleImageFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
      <section className="mx-auto flex h-full max-w-[430px] flex-col overflow-hidden rounded-[30px] bg-slate-50 shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="닫기"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="text-base font-black">{initialPlace ? "장소 편집" : "새 장소"}</h2>
            <button
              type="button"
              onClick={() => {
                onSave(place);
              }}
              disabled={!canSave}
              className="rounded-xl bg-app-ink px-3 py-2 text-xs font-black text-white disabled:opacity-40"
            >
              저장
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            대표 이미지
          </div>
          <div className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-white">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleImageFile(event.target.files?.[0]);
              }}
            />
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              onDragEnter={(event) => {
                handleDrag(event);
                setDraggingImage(true);
              }}
              onDragOver={handleDrag}
              onDragLeave={(event) => {
                handleDrag(event);
                setDraggingImage(false);
              }}
              onDrop={handleDrop}
              className={
                draggingImage
                  ? "block w-full overflow-hidden border-2 border-dashed border-app-primary bg-blue-50"
                  : "block w-full overflow-hidden border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200"
              }
              disabled={uploadingImage}
            >
              {place.coverUrl ? (
                <div className="relative aspect-video">
                  <img src={place.coverUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-app-ink/70 px-4 py-3 text-center text-xs font-black text-white">
                    {uploadingImage ? "업로드 중" : "이미지를 교체하려면 클릭하거나 드롭"}
                  </div>
                </div>
              ) : (
                <div className="grid aspect-video place-items-center px-5 text-center text-sm font-black text-slate-400">
                  <div>
                    {uploadingImage ? (
                      <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" aria-hidden="true" />
                    ) : (
                      <ImagePlus className="mx-auto mb-2 h-7 w-7" aria-hidden="true" />
                    )}
                    {uploadingImage ? "업로드 중" : "이미지를 끌어다 놓거나 클릭"}
                  </div>
                </div>
              )}
            </button>

            {place.coverUrl && (
              <div className="flex gap-2 border-t border-app-border bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingImage}
                  className="flex-1 rounded-xl bg-app-ink px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  교체
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updatePlace({ coverStoragePath: "", coverUrl: "" });
                    setUploadError(null);
                  }}
                  disabled={uploadingImage}
                  className="flex-1 rounded-xl border border-app-border bg-white px-3 py-2 text-xs font-black text-app-muted disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            )}

            {uploadError && (
              <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700">
                {uploadError}
              </p>
            )}

            <label className="block">
              <span className="sr-only">대표 이미지 URL</span>
              <input
                value={place.coverUrl ?? ""}
                onChange={(event) => {
                  updatePlace({ coverStoragePath: "", coverUrl: event.target.value });
                }}
                placeholder="외부 이미지 URL도 입력할 수 있어요"
                className="w-full border-t border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none placeholder:text-slate-300"
              />
            </label>
          </div>

          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            기본 정보
          </div>
          <div className="space-y-3">
            <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
              <span className="block text-[11px] font-black text-slate-400">장소 이름 *</span>
              <input
                value={place.name}
                onChange={(event) => {
                  updatePlace({ name: event.target.value });
                }}
                placeholder="예: 경포 해변"
                className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
              />
            </label>
            <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
              <span className="block text-[11px] font-black text-slate-400">설명</span>
              <textarea
                value={place.description ?? ""}
                onChange={(event) => {
                  updatePlace({ description: event.target.value });
                }}
                placeholder="참가자 화면에 표시됩니다"
                rows={3}
                className="mt-1 w-full resize-none bg-transparent text-sm font-bold leading-6 outline-none placeholder:text-slate-300"
              />
            </label>
            <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
              <span className="block text-[11px] font-black text-slate-400">인증 조건</span>
              <input
                value={place.verifyHint ?? ""}
                onChange={(event) => {
                  updatePlace({ verifyHint: event.target.value });
                }}
                placeholder="예: 모든 팀원 함께 / 입장권 인증"
                className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
              />
            </label>
          </div>

          <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            팀당 사진 수 *
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-app-border bg-white px-4 py-3">
            <span className="text-sm font-black">이 장소에서 찍을 사진</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updatePlace({ perTeamCount: Math.max(1, place.perTeamCount - 1) });
                }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
                aria-label="사진 수 줄이기"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-8 text-center text-lg font-black">{place.perTeamCount}</span>
              <button
                type="button"
                onClick={() => {
                  updatePlace({ perTeamCount: place.perTeamCount + 1 });
                }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
                aria-label="사진 수 늘리기"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            지도 링크
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
            {(Object.keys(platformLabels) as MapPlatform[]).map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  updatePlace({ mapPlatform: platform });
                }}
                className={
                  place.mapPlatform === platform
                    ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                    : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                }
              >
                {platformLabels[platform]}
              </button>
            ))}
          </div>
          <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
            <span className="block text-[11px] font-black text-slate-400">지도 URL</span>
            <input
              value={place.mapUrl ?? ""}
              onChange={(event) => {
                updatePlace({ mapUrl: event.target.value });
              }}
              placeholder="https://naver.me/..."
              className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
            />
          </label>

          {initialPlace && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(place.id);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              이 장소 삭제
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
