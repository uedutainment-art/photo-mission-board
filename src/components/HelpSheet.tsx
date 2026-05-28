import { MessageCircle, Phone, X } from "lucide-react";
import { formatPhone, smsHref, telHref } from "../lib/phone";
import type { MissionEvent, Team } from "../lib/types";

interface HelpSheetProps {
  event: MissionEvent;
  open: boolean;
  team: Team;
  teamLabel: string;
  onClose: () => void;
}

const FAQ_ITEMS = [
  {
    question: "QR 스캔이 안 돼요",
    answer:
      "휴대폰 기본 카메라 앱으로 다시 스캔해 보세요. 그래도 안 되면 운영팀에게 카톡으로 받은 링크를 직접 눌러주세요.",
  },
  {
    question: "장소를 못 찾았어요",
    answer:
      "장소 카드의 [지도로 위치 보기]를 눌러 네이버/카카오 지도로 이동할 수 있어요. 그래도 안 보이면 운영팀에 문자해 주세요.",
  },
  {
    question: "사진이 안 올라가요",
    answer:
      "잠시 후 다시 시도하거나 새로고침 후 재업로드해 주세요. 같은 문제가 반복되면 운영팀에 문자해 주세요.",
  },
  {
    question: "팀이 잘못 들어왔어요",
    answer: "운영팀에 문자로 알려주세요. 운영팀에서 정리해 드립니다.",
  },
  {
    question: "셀카를 다시 찍고 싶어요",
    answer: "현재 운영팀에서만 변경 가능합니다. 운영팀에 문자로 요청해 주세요.",
  },
];

export function HelpSheet({ event, open, onClose, team, teamLabel }: HelpSheetProps) {
  if (!open) {
    return null;
  }

  const organizer = event.organizer;
  const organizerPhone = organizer?.phone;
  const leader = team.leader;
  const leaderPhone = leader?.phone;
  const showLeaderCard = Boolean(leader && leaderPhone);
  const organizerSmsBody = `[${teamLabel}] 도움이 필요합니다. `;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-app-ink/55 px-4 py-5">
      <section className="mx-auto flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-slate-50 text-app-ink shadow-phone">
        <header className="flex items-center justify-between gap-3 border-b border-app-border bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-black text-app-muted">HELP</p>
            <h2 className="text-base font-black">도움이 필요해요</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
            aria-label="도움 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto p-4">
          {organizerPhone && (
            <section className="rounded-panel border border-app-border bg-white p-4 shadow-card">
              <p className="text-[11px] font-black text-app-muted">행사 운영팀</p>
              <h3 className="mt-1 text-base font-black">{organizer.name}</h3>
              <p className="mt-1 text-xs font-bold text-app-muted">
                {organizer.role ? `${organizer.role} · ` : ""}
                {formatPhone(organizerPhone)}
              </p>
              <a
                href={smsHref(organizerPhone, organizerSmsBody)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                문자 보내기
              </a>
              <a
                href={telHref(organizerPhone)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black text-app-ink"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                전화
              </a>
              <p className="mt-2 text-center text-[11px] font-bold text-app-muted">* 정말 급할 때만</p>
            </section>
          )}

          {showLeaderCard && leader && leaderPhone && (
            <section className="rounded-panel border border-app-border bg-white p-4 shadow-card">
              <p className="text-[11px] font-black text-app-muted">우리 팀 팀장</p>
              <h3 className="mt-1 text-base font-black">{leader.name}</h3>
              <p className="mt-1 text-xs font-bold text-app-muted">
                {leader.role ? `${leader.role} · ` : ""}
                {formatPhone(leaderPhone)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={telHref(leaderPhone)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  전화
                </a>
                <a
                  href={smsHref(leaderPhone)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-3 text-sm font-black text-white"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  문자
                </a>
              </div>
            </section>
          )}

          <section className="rounded-panel border border-app-border bg-white p-4 shadow-card">
            <h3 className="text-sm font-black">자주 묻는 질문</h3>
            <div className="mt-3 divide-y divide-app-border">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-3 first:pt-0 last:pb-0">
                  <summary className="cursor-pointer list-none text-sm font-black">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
