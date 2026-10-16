import type { MissionEvent } from "../lib/types";
import { getEventBrandName, isSonovaFamilyDay } from "../lib/eventBrand";

export function EventBrandMark({ event, compact = false, light = false }: { event: MissionEvent; compact?: boolean; light?: boolean }) {
  const sonova = isSonovaFamilyDay(event);
  const primaryClass = light ? "text-white" : "text-[#173c2c]";
  const secondaryClass = light ? "text-white/65" : "text-[#617466]";

  if (sonova) {
    return (
      <img
        src="/assets/sonova-hear-the-world-transparent.png"
        alt="Sonova - Hear the World"
        className={`${compact ? "w-[92px]" : "w-[164px]"} h-auto`}
      />
    );
  }

  return <p className={`text-xs font-black ${primaryClass}`}>{getEventBrandName(event)}</p>;
}
