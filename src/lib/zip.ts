import JSZip from "jszip";
import type {
  EventLivePhoto,
  EventLiveSelfie,
  EventLiveSlot,
  EventLiveTeam,
} from "../hooks/useEventLive";
import type { Place } from "./types";
import { safeFilename } from "./download";

export interface ZipProgress {
  current: number;
  total: number;
  label: string;
}

export interface ZipFailure {
  label: string;
  path: string;
  reason: string;
  url: string;
}

export interface OriginalsZipResult {
  blob: Blob;
  failures: ZipFailure[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "파일을 내려받지 못했습니다.";
}

async function addUrlToZip(zip: JSZip, path: string, url: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${path} 파일을 내려받지 못했습니다.`);
  }

  zip.file(path, await response.blob());
}

async function tryAddUrlToZip(
  zip: JSZip,
  failures: ZipFailure[],
  file: { label: string; path: string; url: string },
): Promise<void> {
  try {
    await addUrlToZip(zip, file.path, file.url);
  } catch (error) {
    failures.push({
      ...file,
      reason: getErrorMessage(error),
    });
  }
}

export async function createOriginalsZip({
  onProgress,
  photos,
  places,
  selfies,
  slots,
  teams,
}: {
  photos: EventLivePhoto[];
  places: Place[];
  selfies: EventLiveSelfie[];
  slots: EventLiveSlot[];
  teams: EventLiveTeam[];
  onProgress?: (progress: ZipProgress) => void;
}): Promise<OriginalsZipResult> {
  const zip = new JSZip();
  const failures: ZipFailure[] = [];
  const teamById = new Map(teams.map((team): [string, EventLiveTeam] => [team.id, team]));
  const slotById = new Map(slots.map((slot): [string, EventLiveSlot] => [slot.id, slot]));
  const placeById = new Map(places.map((place): [string, Place] => [place.id, place]));
  const total = photos.length + selfies.length;
  let current = 0;

  for (const photo of photos) {
    const team = teamById.get(photo.teamId);
    const slot = slotById.get(photo.slotId);
    const place = slot ? placeById.get(slot.placeId) : undefined;
    const teamFolder = safeFilename(`${team?.index ?? "team"}_${team?.displayName || team?.name || "team"}`);
    const placeFolder = safeFilename(place?.name || "place");
    const filename = `${safeFilename(photo.uploaderName || photo.id)}_${photo.id}.jpg`;

    current += 1;
    onProgress?.({ current, total, label: filename });
    await tryAddUrlToZip(zip, failures, {
      label: filename,
      path: `${teamFolder}/${placeFolder}/${filename}`,
      url: photo.originalUrl,
    });
  }

  for (const selfie of selfies) {
    const team = teamById.get(selfie.teamId);
    const teamFolder = safeFilename(`${team?.index ?? "team"}_${team?.displayName || team?.name || "team"}`);
    const filename = `${safeFilename(selfie.uploaderName || selfie.id)}_${selfie.id}.jpg`;

    current += 1;
    onProgress?.({ current, total, label: filename });
    await tryAddUrlToZip(zip, failures, {
      label: filename,
      path: `${teamFolder}/selfies/${filename}`,
      url: selfie.originalUrl,
    });
  }

  const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
    onProgress?.({
      current: Math.round((metadata.percent / 100) * total),
      total,
      label: "ZIP 압축 중",
    });
  });

  return { blob, failures };
}
