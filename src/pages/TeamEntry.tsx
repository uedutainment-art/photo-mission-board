import { Link, useNavigate, useParams } from "react-router-dom";
import { Camera, ChevronRight, Loader2, Share2, Target, Users } from "lucide-react";
import { useTeamSession } from "../hooks/useTeamSession";
import { getTeamLabel } from "../lib/teamLabel";

function getStartLabel(selfieMode: string): string {
  if (selfieMode === "none") {
    return "장소 미션으로 시작하기";
  }

  if (selfieMode === "group") {
    return "단체사진 올리기";
  }

  return "셀카부터 시작하기";
}

export function TeamEntry() {
  const { teamToken } = useParams();
  const navigate = useNavigate();
  const { context, error, loading } = useTeamSession(teamToken);

  function handleStart() {
    if (!context || !teamToken) {
      return;
    }

    if (context.event.selfieMode === "none") {
      navigate(`/t/${teamToken}/places`);
      return;
    }

    navigate(`/t/${teamToken}/selfie`);
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black tracking-[0.08em] text-app-muted">
              PHOTO MISSION BOARD
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">···</div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              팀 링크 확인 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && context && (
            <>
              <section className="rounded-panel bg-gradient-to-br from-app-ink to-slate-700 p-6 text-white">
                <div className="mb-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  팀 입장 · 링크로 자동 인식
                </div>
                <div
                  className="mb-4 grid h-16 w-16 place-items-center rounded-[22px] text-2xl font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${context.team.color}, #34d399)`,
                  }}
                >
                  {context.team.index}
                </div>
                <h1 className="text-2xl font-black tracking-normal">
                  {getTeamLabel(context.team)}
                </h1>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  {context.event.title}
                  {context.event.subtitle ? ` · ${context.event.subtitle}` : ""}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-700 pt-5">
                  <div>
                    <div className="text-lg font-black">{context.event.perTeamCount}장</div>
                    <div className="text-[11px] font-bold text-slate-400">우리 팀 사진</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{context.event.places.length}곳</div>
                    <div className="text-[11px] font-bold text-slate-400">가야 할 장소</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{context.team.joinedMembers.length}명</div>
                    <div className="text-[11px] font-bold text-slate-400">함께</div>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white"
              >
                {getStartLabel(context.event.selfieMode)}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <section className="card flex gap-3 p-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-black">팀원 모두 같은 링크</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                    이 화면에 들어온 모든 사람이 사진을 올리고 볼 수 있어요.
                  </p>
                </div>
              </section>

              <section className="card flex gap-3 p-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-black">우리 팀만의 공간</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                    다른 팀 사진은 보이지 않아요. 마지막 공개 보드에서 모두 함께 봅니다.
                  </p>
                </div>
              </section>

              {context.event.selfieMode !== "none" && (
                <Link
                  to={`/t/${teamToken}/selfie`}
                  className="card flex gap-3 p-4"
                >
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black">셀카 단계가 필요합니다</h2>
                    <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                      {context.event.selfieMode === "group"
                        ? "팀 단체사진 1장을 올리면 장소 미션을 시작합니다."
                        : "내 셀카를 올리면 장소 미션을 시작할 수 있습니다."}
                    </p>
                  </div>
                  <Users className="mt-1 h-5 w-5 flex-none text-app-muted" aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
