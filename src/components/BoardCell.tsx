import type { EventLivePhoto, EventLiveSlot } from "../hooks/useEventLive";

interface BoardCellProps {
  photo?: EventLivePhoto;
  slot: EventLiveSlot;
  onClick?: () => void;
}

export function BoardCell({ onClick, photo, slot }: BoardCellProps) {
  const unchecked = slot.reviewStatus === "unchecked" && Boolean(photo);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        photo
          ? "relative aspect-square overflow-hidden rounded-[4px] bg-slate-200"
          : "relative aspect-square rounded-[4px] border border-slate-300 bg-white"
      }
      aria-label={`슬롯 ${slot.globalIndex + 1}`}
    >
      {photo && (
        <img
          src={photo.thumbUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      {unchecked && (
        <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-app-warning ring-2 ring-white" />
      )}
    </button>
  );
}
