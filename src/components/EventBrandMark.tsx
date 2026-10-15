import type { MissionEvent } from "../lib/types";
import { getEventBrandName, isSonovaFamilyDay } from "../lib/eventBrand";

export function EventBrandMark({ event, light = false }: { event: MissionEvent; light?: boolean }) {
  const sonova = isSonovaFamilyDay(event);
  const primaryClass = light ? "text-white" : "text-[#173c2c]";
  const secondaryClass = light ? "text-white/65" : "text-[#617466]";

  if (sonova) {
    return (
      <div aria-label="Sonova Consumer Hearing Korea">
        <p className={`text-xl font-black lowercase leading-none ${primaryClass}`}>sonova</p>
        <p className={`mt-1 text-[8px] font-black uppercase ${secondaryClass}`}>Consumer Hearing Korea</p>
      </div>
    );
  }

  return <p className={`text-xs font-black ${primaryClass}`}>{getEventBrandName(event)}</p>;
}
