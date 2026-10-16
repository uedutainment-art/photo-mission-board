import type { EventGuideScheduleItem, MissionEvent } from "./types";

type BrandableEvent = Pick<MissionEvent, "title" | "externalEvent">;

export function isSonovaFamilyDay(event?: BrandableEvent | null): boolean {
  if (!event) return false;

  return /sonova|소노바/i.test(`${event.title} ${event.externalEvent?.brandName ?? ""}`);
}

export function getEventBrandName(event?: BrandableEvent | null): string {
  if (isSonovaFamilyDay(event)) return "Sonova Consumer Hearing Korea";

  return event?.externalEvent?.brandName || event?.title || "Photo Mission Board";
}

const SONOVA_DEFAULT_SCHEDULE: EventGuideScheduleItem[] = [
  { id: "sonova-arrival", time: "13:00", title: "입장 및 가족 확인", description: "공통 QR로 가족 이름과 코드를 입력하고 행사 안내를 확인합니다." },
  { id: "sonova-activity", time: "14:10", title: "가족 자유 활동", description: "전통놀이를 즐기며 네 가지 가족 사진 미션을 진행합니다." },
  { id: "sonova-dinner", time: "16:00", title: "저녁 만찬 · 신청곡", description: "신청곡과 사연을 함께 즐기며 사진 등록을 마무리합니다. 다른 가족 사진은 투표 시작 후 공개됩니다." },
  { id: "sonova-vote", time: "17:20", title: "사진 접수 마감 · 투표", description: "우리 가족을 제외하고 마음에 드는 두 가족에게 투표합니다." },
  { id: "sonova-awards", time: "17:50", title: "베스트 포토 발표", description: "운영팀이 3등, 2등, 1등 순서로 결과를 공개합니다." },
];

export function getEventSchedule(event?: MissionEvent | null): EventGuideScheduleItem[] {
  if (event?.guide?.schedule?.length) return event.guide.schedule;
  return isSonovaFamilyDay(event) ? SONOVA_DEFAULT_SCHEDULE : [];
}
