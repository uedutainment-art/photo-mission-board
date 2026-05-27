import { Link } from "react-router-dom";
import { CheckCircle2, Download, Grid2X2, LayoutDashboard } from "lucide-react";

type OperatorTab = "overview" | "board" | "review" | "export";

interface OperatorTabNavProps {
  active: OperatorTab;
  eventId: string;
}

const tabItems: Array<{
  id: OperatorTab;
  label: string;
  href: (eventId: string) => string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "overview",
    label: "Overview",
    href: (eventId) => `/events/${eventId}`,
    icon: LayoutDashboard,
  },
  {
    id: "board",
    label: "보드",
    href: (eventId) => `/events/${eventId}/board`,
    icon: Grid2X2,
  },
  {
    id: "review",
    label: "검수",
    href: (eventId) => `/events/${eventId}/review`,
    icon: CheckCircle2,
  },
  {
    id: "export",
    label: "Export",
    href: (eventId) => `/events/${eventId}/export`,
    icon: Download,
  },
];

export function OperatorTabNav({ active, eventId }: OperatorTabNavProps) {
  return (
    <nav className="grid grid-cols-4 border-t border-app-border bg-white px-2 py-2">
      {tabItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;

        return (
          <Link
            key={item.id}
            to={item.href(eventId)}
            className={
              isActive
                ? "flex flex-col items-center gap-1 rounded-2xl bg-slate-100 px-2 py-2 text-[11px] font-black text-app-ink"
                : "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black text-app-muted"
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
