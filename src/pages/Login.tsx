import { Link } from "react-router-dom";

export function Login() {
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

        <div className="flex flex-1 flex-col justify-center gap-5 bg-slate-50 p-4">
          <section className="rounded-panel bg-gradient-to-br from-app-ink to-slate-700 p-6 text-white">
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/12 text-2xl font-black">
              ▦
            </div>
            <h1 className="text-[26px] font-black leading-tight tracking-normal">
              팀의 순간이 모여
              <br />
              하나의 보드가 됩니다
            </h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
              운영자로 이벤트를 만들려면 로그인해주세요.
            </p>
          </section>

          <Link
            to="/events"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-app-border bg-white px-4 py-4 text-sm font-black shadow-card"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-app-border text-xs font-black text-app-primary">
              G
            </span>
            Google로 로그인
          </Link>

          <p className="text-center text-sm font-bold leading-6 text-app-muted">
            팀원으로 참여하시나요?
            <br />
            운영자가 보낸 QR을 스캔해주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
