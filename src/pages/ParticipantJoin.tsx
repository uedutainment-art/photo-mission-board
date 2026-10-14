import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound, Loader2, Users } from "lucide-react";
import { usePublicEvent } from "../hooks/usePublicEvent";
import { formatKoreanDate } from "../lib/formatDate";
import { joinParticipantGroup } from "../lib/participantAccess";

export function ParticipantJoin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { error: eventError, event, loading } = usePublicEvent(eventId);
  const [code, setCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventIdentity = `${event?.title ?? ""} ${event?.externalEvent?.brandName ?? ""}`;
  const isSonovaFamilyDay = /sonova|소노바/i.test(eventIdentity);
  const brandName = isSonovaFamilyDay
    ? "Sonova Consumer Hearing Korea"
    : event?.externalEvent?.brandName || event?.title || "Family Photo Day";
  const familyDayLabel = isSonovaFamilyDay ? "Family Day" : "가족 사진 콘테스트";
  const eventDate = isSonovaFamilyDay ? "2026.10.17 SAT" : formatKoreanDate(event?.scheduledAt);
  const eventVenue = isSonovaFamilyDay ? "더드림핑" : event?.guide?.venue || "";

  async function handleJoin() {
    if (!eventId || !code.trim() || !familyName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await joinParticipantGroup(eventId, code, familyName);
      navigate(`/t/${result.teamToken}/contest`, { replace: true });
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "참가 코드를 확인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#dfe7e2] px-0 text-[#173c2c] sm:px-4 sm:py-6">
      <section className="phone-surface relative overflow-hidden bg-[#f8f5e9] sm:rounded-[28px] sm:border sm:border-[#d9dfd2] sm:shadow-phone">
        <img src="/assets/sonova-family-day-watercolor.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
        <div className="relative z-10 flex min-h-dvh flex-1 flex-col px-5 pb-10 pt-8">
          <header className="text-center">
            <p className="text-[10px] font-bold uppercase text-[#385444]">{brandName}</p>
            <p className="mt-3 text-lg font-black text-[#234936]">{familyDayLabel}</p>
            <h1 className="mt-5 text-3xl font-black leading-[1.25] tracking-normal text-[#173c2c]">우리 가족의 오늘을<br />남겨주세요</h1>
            <p className="mt-3 text-sm font-black text-[#385444]">QR 하나로 함께해요</p>
            <p className="mt-2 text-[11px] font-bold text-[#617466]">가족 사진 미션 · 베스트 포토 투표 · 신청곡 신청</p>
          </header>

          <div className="mt-6 rounded-[8px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(31,65,47,0.14)] backdrop-blur-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm font-black text-[#617466]"><Loader2 className="h-5 w-5 animate-spin" /> 행사 불러오는 중</div>
            ) : eventError ? (
              <p className="rounded-[6px] bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{eventError}</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 flex-none place-items-center rounded-[6px] bg-[#173c2c] text-white"><KeyRound className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black text-[#78877c]">{event?.title ?? familyDayLabel}</p>
                    <h2 className="text-lg font-black text-[#173c2c]">가족 로그인</h2>
                  </div>
                </div>
                <p className="mt-4 text-xs font-bold leading-5 text-[#617466]">안내받은 6자리 코드와 가족 이름을 입력하면 회원가입 없이 바로 시작합니다.</p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-black text-[#385444]">6자리 가족 코드</span>
                  <input value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleJoin(); }} maxLength={6} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-[6px] border border-[#ccd6ca] bg-white px-4 py-3.5 text-center text-xl font-black tracking-[0.2em] text-[#173c2c] outline-none focus:border-[#47765c]" />
                </label>
                <label className="mt-3 block">
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#385444]"><Users className="h-3.5 w-3.5" aria-hidden="true" />가족 이름</span>
                  <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleJoin(); }} maxLength={30} placeholder="예: 행복한 김가족" autoComplete="organization" className="w-full rounded-[6px] border border-[#ccd6ca] bg-white px-4 py-3.5 text-sm font-black text-[#173c2c] outline-none focus:border-[#47765c]" />
                  <span className="mt-2 block text-[11px] font-bold leading-5 text-[#78877c]">처음 입력한 이름으로 사진 보드에 표시됩니다.</span>
                </label>
                {error && <p className="mt-3 rounded-[6px] bg-red-50 px-3 py-2 text-xs font-black text-red-700">{error}</p>}
                <button type="button" onClick={() => void handleJoin()} disabled={busy || !code.trim() || !familyName.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#173c2c] px-4 py-4 text-sm font-black text-white disabled:bg-[#cbd3ca] disabled:text-white/80">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} 바로 입장하기
                </button>
              </>
            )}
          </div>

          {(eventDate || eventVenue) && (
            <footer className="mt-auto pt-10 text-center text-[11px] font-black leading-5 text-[#385444]">
              {eventDate && <p>{eventDate}</p>}
              {eventVenue && <p>{eventVenue}</p>}
            </footer>
          )}
        </div>
      </section>
    </main>
  );
}
