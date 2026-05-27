import { Link } from "react-router-dom";

export function Events() {
  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black tracking-normal">내 이벤트</h1>
            <div className="grid h-10 w-10 place-items-center rounded-xl text-app-muted">⋮</div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 bg-slate-50 p-4">
          <section className="card flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-app-ink text-sm font-black text-white">
              운
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black">운영자</div>
              <div className="truncate text-xs font-bold text-app-muted">Google 로그인 연결 예정</div>
            </div>
          </section>

          <Link
            to="/events/new"
            className="w-full rounded-2xl bg-app-ink px-4 py-4 text-center text-sm font-black text-white"
          >
            ＋ 새 이벤트 만들기
          </Link>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            <button className="rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm">진행 중</button>
            <button className="rounded-xl px-2 py-2 text-xs font-black text-app-muted">예정</button>
            <button className="rounded-xl px-2 py-2 text-xs font-black text-app-muted">종료</button>
          </div>

          <section className="card flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-2xl font-black text-app-muted">
              ▦
            </div>
            <h2 className="text-lg font-black">아직 이벤트가 없습니다</h2>
            <p className="text-sm font-bold leading-6 text-app-muted">
              Phase 2에서 Google 로그인과 Firestore 이벤트 목록이 연결됩니다.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
