interface PublicFooterProps {
  filledSlots: number;
  progressPercent: number;
  teamCount: number;
  totalSlots: number;
}

export function PublicFooter({ filledSlots, progressPercent, teamCount, totalSlots }: PublicFooterProps) {
  return (
    <footer className="grid shrink-0 gap-4 border-t border-white/10 px-8 py-5 text-white md:grid-cols-[1fr_auto_auto] md:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-4 text-sm font-black text-slate-300">
          <span>진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-5 py-3">
        <p className="text-xs font-black text-slate-400">팀 수</p>
        <p className="text-2xl font-black">{teamCount}</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-5 py-3">
        <p className="text-xs font-black text-slate-400">채운 슬롯</p>
        <p className="text-2xl font-black">
          {filledSlots}/{totalSlots}
        </p>
      </div>
    </footer>
  );
}
