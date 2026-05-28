import type { TeamSessionTeam } from "../hooks/useTeamSession";
import type { SelfieWithId } from "../hooks/useSelfies";
import { getCropObjectStyle } from "../lib/crop";

interface GridShape {
  cols: number;
  rows: number;
}

interface SelfieBannerProps {
  currentUploaderId?: string;
  selfies: SelfieWithId[];
  team: TeamSessionTeam;
}

function getGridShape(count: number): GridShape {
  if (count <= 1) {
    return { cols: 1, rows: 1 };
  }

  if (count <= 3) {
    return { cols: count, rows: 1 };
  }

  if (count === 4) {
    return { cols: 2, rows: 2 };
  }

  if (count <= 6) {
    return { cols: 3, rows: 2 };
  }

  if (count <= 9) {
    return { cols: 3, rows: 3 };
  }

  if (count === 10) {
    return { cols: 5, rows: 2 };
  }

  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

export function SelfieBanner({ currentUploaderId, selfies, team }: SelfieBannerProps) {
  const shape = getGridShape(Math.max(selfies.length, 1));
  const cellCount = Math.max(shape.cols * shape.rows, selfies.length || 1);
  const cells = Array.from({ length: cellCount }, (_, index) => selfies[index] ?? null);

  return (
    <section className="overflow-hidden rounded-panel bg-app-ink text-white shadow-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
            우리 팀
          </p>
          <h2 className="text-base font-black">{team.displayName}</h2>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
          {selfies.length}명 함께
        </div>
      </div>

      <div
        className="grid gap-1 bg-slate-900 p-1"
        style={{
          gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
          aspectRatio: `${shape.cols} / ${shape.rows}`,
        }}
      >
        {cells.map((selfie, index) => {
          const isMine = selfie?.uploaderId === currentUploaderId;

          return (
            <div
              key={selfie?.id ?? `empty-${index}`}
              className="relative min-h-0 overflow-hidden rounded-lg"
              style={{ backgroundColor: selfie ? undefined : team.color }}
            >
              {selfie ? (
                <>
                  <img
                    src={selfie.originalUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={getCropObjectStyle(selfie.cropMeta)}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1 left-1 max-w-[80%] truncate rounded-full bg-app-ink/75 px-2 py-0.5 text-[10px] font-black">
                    {isMine ? "나" : selfie.uploaderName || "팀원"}
                  </div>
                </>
              ) : (
                <div className="grid h-full min-h-[96px] place-items-center bg-black/10 text-xs font-black text-white/70">
                  대기 중
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
