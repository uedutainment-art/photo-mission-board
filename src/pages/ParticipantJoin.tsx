import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound, Loader2, Users } from "lucide-react";
import { joinParticipantGroup } from "../lib/participantAccess";

export function ParticipantJoin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <div className="flex flex-1 flex-col justify-center bg-slate-50 p-5">
          <div className="card p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-app-ink text-white"><KeyRound className="h-5 w-5" /></div>
            <h1 className="mt-5 text-xl font-black">가족 정보를 입력해주세요</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-app-muted">운영팀에서 안내받은 코드와 가족 이름을 입력하면 별도 회원가입 없이 참여할 수 있습니다.</p>
            <input value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleJoin(); }} placeholder="예: 123456" inputMode="numeric" autoComplete="one-time-code" className="mt-5 w-full rounded-2xl border border-app-border bg-white px-4 py-4 text-center text-xl font-black tracking-[0.2em] outline-none focus:border-app-primary" />
            <label className="mt-3 block">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-app-muted"><Users className="h-3.5 w-3.5" aria-hidden="true" />가족 이름</span>
              <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleJoin(); }} maxLength={30} placeholder="예: 행복한 김가족" autoComplete="organization" className="w-full rounded-2xl border border-app-border bg-white px-4 py-4 text-sm font-black outline-none focus:border-app-primary" />
              <span className="mt-2 block text-xs font-bold leading-5 text-app-muted">처음 입력한 이름으로 사진 보드에 표시됩니다.</span>
            </label>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">{error}</p>}
            <button type="button" onClick={() => void handleJoin()} disabled={busy || !code.trim() || !familyName.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} 코드 확인
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
