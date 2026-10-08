import { Link, useParams } from "react-router-dom";
import { Album, ArrowLeft } from "lucide-react";
import { usePublicEvent } from "../hooks/usePublicEvent";

export function EventArchive() {
  const { eventId } = useParams();
  const { event } = usePublicEvent(eventId);
  const ready = event?.status === "completed";
  return <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink"><section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone"><header className="border-b border-app-border bg-white px-4 pb-4 pt-3"><div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><Link to={`/e/${eventId}`} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-base font-black">행사 후 기록</h1><div className="h-10 w-10" /></div></header><div className="flex flex-1 items-center bg-slate-50 p-4"><div className="card w-full p-8 text-center"><Album className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-4 text-lg font-black">{ready ? "행사의 순간을 다시 만나보세요" : "기록을 준비하고 있습니다"}</h2><p className="mt-2 text-sm font-bold leading-6 text-app-muted">{ready ? "최종 사진과 콜라주를 확인할 수 있습니다." : "사진과 영상 전달 링크는 준비가 끝난 뒤 공개됩니다."}</p>{ready && <Link to={`/share/${eventId}`} className="mt-5 inline-flex rounded-2xl bg-app-ink px-5 py-3 text-sm font-black text-white">사진 기록 보기</Link>}</div></div></section></main>;
}
