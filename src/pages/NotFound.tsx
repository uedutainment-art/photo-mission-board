import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-app-background px-4 text-app-ink">
      <section className="card max-w-sm p-6 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-app-primary">
          NOT FOUND
        </p>
        <h1 className="mt-2 text-xl font-black">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-app-muted">
          주소를 확인하거나 이벤트 목록으로 돌아가주세요.
        </p>
        <Link
          to="/events"
          className="mt-5 block rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
        >
          이벤트 목록으로
        </Link>
      </section>
    </main>
  );
}
