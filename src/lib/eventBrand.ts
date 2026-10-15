import type { MissionEvent } from "./types";

type BrandableEvent = Pick<MissionEvent, "title" | "externalEvent">;

export function isSonovaFamilyDay(event?: BrandableEvent | null): boolean {
  if (!event) return false;

  return /sonova|소노바/i.test(`${event.title} ${event.externalEvent?.brandName ?? ""}`);
}

export function getEventBrandName(event?: BrandableEvent | null): string {
  if (isSonovaFamilyDay(event)) return "Sonova Consumer Hearing Korea";

  return event?.externalEvent?.brandName || event?.title || "Photo Mission Board";
}
