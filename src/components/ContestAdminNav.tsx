import { CalendarDays, QrCode, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

type AdminSection = "contest" | "teams" | "guide";

export function ContestAdminNav({ active, eventId }: { active: AdminSection; eventId: string }) {
  const items = [
    { id: "contest" as const, label: "운영", href: `/events/${eventId}/contest`, icon: SlidersHorizontal },
    { id: "teams" as const, label: "가족·QR", href: `/events/${eventId}/teams`, icon: QrCode },
    { id: "guide" as const, label: "행사안내", href: `/events/${eventId}/guide`, icon: CalendarDays },
  ];

  return (
    <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-app-border bg-white p-1.5" aria-label="행사 운영 콘솔">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.id === active;
        return (
          <Link
            key={item.id}
            to={item.href}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-black ${selected ? "bg-app-ink text-white" : "text-app-muted hover:bg-slate-100"}`}
            aria-current={selected ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
