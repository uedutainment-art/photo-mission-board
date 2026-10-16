import { CalendarDays, Camera, Home, Menu } from "lucide-react";
import { Link } from "react-router-dom";

export function ParticipantNav({ eventId, teamToken, active, sonova }: {
  eventId: string;
  teamToken: string;
  active: "home" | "guide";
  sonova: boolean;
}) {
  const items = [
    { id: "home", label: "홈", icon: Home, to: `/t/${teamToken}` },
    { id: "guide", label: "일정", icon: CalendarDays, to: `/e/${eventId}/guide?team=${encodeURIComponent(teamToken)}` },
    { id: "photos", label: "사진", icon: Camera, to: `/t/${teamToken}/contest` },
    { id: "more", label: "더보기", icon: Menu, to: `/t/${teamToken}#event-menu` },
  ];
  return (
    <nav aria-label="참가자 메뉴" className={`fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[430px] grid-cols-4 border-t px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(31,65,47,0.08)] ${sonova ? "border-[#d9dfd2] bg-[#f8f5e9]/95" : "border-app-border bg-white/95"}`}>
      {items.map(({ id, label, icon: Icon, to }) => <Link key={id} to={to} aria-current={id === active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 ${id === active ? "text-[#173c2c]" : "text-[#617466]"}`}><Icon className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-black">{label}</span></Link>)}
    </nav>
  );
}
