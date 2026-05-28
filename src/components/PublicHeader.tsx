interface PublicHeaderProps {
  title: string;
  subtitle?: string;
}

export function PublicHeader({ subtitle, title }: PublicHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-6 border-b border-white/10 px-8 py-5 text-white">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-black md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-sm font-bold text-slate-300 md:text-lg">{subtitle}</p>}
      </div>
      <div className="inline-flex shrink-0 items-center gap-3 rounded-full border border-red-400/50 bg-red-500/15 px-5 py-2 text-sm font-black text-red-100 md:text-base">
        <span className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.9)]" />
        LIVE
      </div>
    </header>
  );
}
