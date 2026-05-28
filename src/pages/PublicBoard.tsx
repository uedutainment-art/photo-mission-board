import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PublicFooter } from "../components/PublicFooter";
import { PublicHeader } from "../components/PublicHeader";
import { useEventLive, type EventLivePhoto } from "../hooks/useEventLive";
import { ensureUploaderUser } from "../lib/teamSession";

export function PublicBoard() {
  const { eventId } = useParams();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { error, event, loading, photos, slots } = useEventLive(authReady ? eventId : undefined);
  const photoById = useMemo(
    () => new Map(photos.map((photo): [string, EventLivePhoto] => [photo.id, photo])),
    [photos],
  );
  const filledSlots = slots.filter((slot) => Boolean(slot.representativePhotoId)).length;
  const progressPercent = slots.length > 0 ? Math.round((filledSlots / slots.length) * 100) : 0;
  const pageError = authError || error;

  useEffect(() => {
    let mounted = true;

    void ensureUploaderUser()
      .then(() => {
        if (mounted) {
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setAuthError("공개 보드 인증을 준비하지 못했습니다.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-dvh bg-black text-white">
      <section className="flex min-h-dvh w-full flex-col overflow-hidden bg-black">
        {(!authReady && !authError) || loading ? (
          <div className="grid flex-1 place-items-center">
            <div className="flex items-center gap-3 text-xl font-black text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-300" aria-hidden="true" />
              공개 보드 불러오는 중
            </div>
          </div>
        ) : null}

        {pageError && !loading && (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <p className="text-2xl font-black text-white">공개 보드를 열 수 없습니다.</p>
              <p className="mt-3 text-base font-bold text-slate-400">{pageError}</p>
            </div>
          </div>
        )}

        {authReady && !loading && !pageError && event && (
          <>
            <PublicHeader subtitle={event.subtitle} title={event.title} />

            <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
              <div
                className="grid h-full max-h-full w-full max-w-[calc(100vh*1.4)] gap-1 rounded-lg bg-white/10 p-1 md:gap-1.5 md:p-1.5"
                style={{
                  gridTemplateColumns: `repeat(${event.grid.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${event.grid.rows}, minmax(0, 1fr))`,
                }}
              >
                {slots.map((slot) => {
                  const photo = slot.representativePhotoId ? photoById.get(slot.representativePhotoId) : undefined;

                  return (
                    <div key={slot.id} className="relative min-h-0 overflow-hidden rounded bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                      {photo ? (
                        <img
                          key={photo.id}
                          src={photo.thumbUrl}
                          alt=""
                          className="h-full w-full animate-public-cell-fade object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.35))]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <PublicFooter
              filledSlots={filledSlots}
              progressPercent={progressPercent}
              teamCount={event.teamCount}
              totalSlots={slots.length}
            />
          </>
        )}
      </section>
    </main>
  );
}
