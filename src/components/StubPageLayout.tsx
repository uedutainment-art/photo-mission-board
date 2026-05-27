import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface StubPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function StubPageLayout({
  eyebrow,
  title,
  description,
  children,
}: StubPageLayoutProps) {
  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/events"
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600"
            >
              ←
            </Link>
            <div className="min-w-0 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-app-primary">
                {eyebrow}
              </p>
              <h1 className="truncate text-lg font-black tracking-normal">{title}</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-slate-50 p-4">
          <div className="card p-5">
            <p className="text-sm font-bold leading-6 text-app-muted">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
