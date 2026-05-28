import type {
  EventLiveEvent,
  EventLivePhoto,
  EventLiveSelfie,
  EventLiveSlot,
  EventLiveTeam,
} from "../hooks/useEventLive";
import { drawImageCover } from "./crop";

const OUTPUT_SIZE = 2400;

export type ExportLayoutMode = "random" | "team";

function hashString(value: string): number {
  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function seededShuffle<T>(items: T[], seedText: string): T[] {
  const nextItems = [...items];
  let seed = hashString(seedText);

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = nextItems[index];
    nextItems[index] = nextItems[swapIndex];
    nextItems[swapIndex] = temp;
  }

  return nextItems;
}

export function orderSlotsForExport(
  slots: EventLiveSlot[],
  mode: ExportLayoutMode,
  seed: number,
): EventLiveSlot[] {
  if (mode === "random") {
    return seededShuffle(slots, String(seed));
  }

  return [...slots].sort((a, b) => a.globalIndex - b.globalIndex);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("이미지를 만들지 못했습니다."));
        return;
      }

      resolve(blob);
    }, type);
  });
}

export async function createCollagePng({
  event,
  layoutMode,
  photos,
  seed,
  slots,
}: {
  event: EventLiveEvent;
  layoutMode: ExportLayoutMode;
  photos: EventLivePhoto[];
  seed: number;
  slots: EventLiveSlot[];
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("콜라주 캔버스를 만들지 못했습니다.");
  }

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const photoById = new Map(photos.map((photo): [string, EventLivePhoto] => [photo.id, photo]));
  const orderedSlots = orderSlotsForExport(slots, layoutMode, seed);
  const cellWidth = OUTPUT_SIZE / event.grid.cols;
  const cellHeight = OUTPUT_SIZE / event.grid.rows;

  for (const [index, slot] of orderedSlots.entries()) {
    const col = index % event.grid.cols;
    const row = Math.floor(index / event.grid.cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    const photo = slot.representativePhotoId ? photoById.get(slot.representativePhotoId) : undefined;

    if (!photo) {
      context.fillStyle = "#1e293b";
      context.fillRect(x, y, cellWidth, cellHeight);
      continue;
    }

    const image = await loadImage(photo.thumbUrl);
    drawImageCover(context, image, x, y, cellWidth, cellHeight);
  }

  return canvasToBlob(canvas);
}

export async function createSelfieCollagePng({
  selfies,
  teams,
}: {
  selfies: EventLiveSelfie[];
  teams: EventLiveTeam[];
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("셀카 모음 캔버스를 만들지 못했습니다.");
  }

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const cols = Math.ceil(Math.sqrt(Math.max(teams.length, 1)));
  const rows = Math.ceil(Math.max(teams.length, 1) / cols);
  const cellWidth = OUTPUT_SIZE / cols;
  const cellHeight = OUTPUT_SIZE / rows;

  for (const [teamIndex, team] of teams.entries()) {
    const teamSelfies = selfies.filter((selfie) => selfie.teamId === team.id);
    const x = (teamIndex % cols) * cellWidth;
    const y = Math.floor(teamIndex / cols) * cellHeight;

    context.fillStyle = team.color;
    context.fillRect(x, y, cellWidth, cellHeight);

    const innerCols = Math.ceil(Math.sqrt(Math.max(teamSelfies.length, 1)));
    const innerRows = Math.ceil(Math.max(teamSelfies.length, 1) / innerCols);
    const innerWidth = cellWidth / innerCols;
    const innerHeight = cellHeight / innerRows;

    for (const [selfieIndex, selfie] of teamSelfies.entries()) {
      const image = await loadImage(selfie.originalUrl).catch(() => loadImage(selfie.thumbUrl));
      const innerX = x + (selfieIndex % innerCols) * innerWidth;
      const innerY = y + Math.floor(selfieIndex / innerCols) * innerHeight;
      drawImageCover(context, image, innerX, innerY, innerWidth, innerHeight, selfie.cropMeta);
    }

    context.fillStyle = "rgba(15, 23, 42, 0.74)";
    context.fillRect(x, y + cellHeight - 64, cellWidth, 64);
    context.fillStyle = "#ffffff";
    context.font = "900 34px sans-serif";
    context.fillText(team.displayName || team.name, x + 24, y + cellHeight - 22);
  }

  return canvasToBlob(canvas);
}
