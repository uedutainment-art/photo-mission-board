import {
  collection,
  deleteField,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "./firebase";
import { uploadImage } from "./storage";
import type { PhotoWithId, SlotWithId } from "../hooks/useTeamMission";
import type { CropMeta } from "./types";

export interface UploadMissionPhotoInput {
  eventId: string;
  teamId: string;
  placeId: string;
  uploaderId: string;
  uploaderName?: string;
  file: File;
  slots: SlotWithId[];
}

export interface DeleteMissionPhotoInput {
  eventId: string;
  uploaderId: string;
  photo: PhotoWithId;
  slotPhotos: PhotoWithId[];
}

const defaultCropMeta: CropMeta = {
  x: 0.5,
  y: 0.5,
  scale: 1,
};

function chooseTargetSlot(slots: SlotWithId[]): SlotWithId {
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.representativePhotoId && !b.representativePhotoId) {
      return 1;
    }

    if (!a.representativePhotoId && b.representativePhotoId) {
      return -1;
    }

    if (a.submissionCount !== b.submissionCount) {
      return a.submissionCount - b.submissionCount;
    }

    return a.indexInPlace - b.indexInPlace;
  });
  const targetSlot = sortedSlots[0];

  if (!targetSlot) {
    throw new Error("업로드할 슬롯을 찾을 수 없습니다.");
  }

  return targetSlot;
}

function getUploadedAt(photo: PhotoWithId): number {
  return photo.uploadedAt?.toMillis?.() ?? 0;
}

export async function uploadMissionPhoto(input: UploadMissionPhotoInput): Promise<string> {
  const placeSlots = input.slots.filter((slot) => slot.placeId === input.placeId);
  const targetSlot = chooseTargetSlot(placeSlots);
  const photoRef = doc(collection(db, "events", input.eventId, "photos"));
  const image = await uploadImage(input.file, `events/${input.eventId}/photos/${photoRef.id}`);
  const cleanName = input.uploaderName?.trim();

  await runTransaction(db, async (transaction) => {
    const slotRef = doc(db, "events", input.eventId, "slots", targetSlot.id);
    const slotSnapshot = await transaction.get(slotRef);

    if (!slotSnapshot.exists()) {
      throw new Error("슬롯을 찾을 수 없습니다.");
    }

    const representativePhotoId = slotSnapshot.data().representativePhotoId as string | undefined;
    const isRepresentative = !representativePhotoId;

    transaction.set(photoRef, {
      eventId: input.eventId,
      teamId: input.teamId,
      slotId: targetSlot.id,
      uploaderId: input.uploaderId,
      originalPath: image.originalPath,
      thumbPath: image.thumbPath,
      originalUrl: image.originalUrl,
      thumbUrl: image.thumbUrl,
      cropMeta: defaultCropMeta,
      isRepresentative,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      uploadedAt: serverTimestamp(),
      ...(cleanName ? { uploaderName: cleanName } : {}),
    });

    transaction.update(slotRef, {
      submissionCount: increment(1),
      ...(isRepresentative ? { representativePhotoId: photoRef.id } : {}),
    });
  });

  return photoRef.id;
}

export async function setRepresentativePhoto(eventId: string, slotId: string, photoId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const slotRef = doc(db, "events", eventId, "slots", slotId);
    const slotSnapshot = await transaction.get(slotRef);

    if (!slotSnapshot.exists()) {
      throw new Error("슬롯을 찾을 수 없습니다.");
    }

    const previousPhotoId = slotSnapshot.data().representativePhotoId as string | undefined;

    if (previousPhotoId === photoId) {
      return;
    }

    if (previousPhotoId) {
      transaction.update(doc(db, "events", eventId, "photos", previousPhotoId), {
        isRepresentative: false,
      });
    }

    transaction.update(doc(db, "events", eventId, "photos", photoId), {
      isRepresentative: true,
    });
    transaction.update(slotRef, {
      representativePhotoId: photoId,
    });
  });
}

export async function deleteMissionPhoto({
  eventId,
  photo,
  slotPhotos,
  uploaderId,
}: DeleteMissionPhotoInput): Promise<void> {
  if (photo.uploaderId !== uploaderId) {
    throw new Error("본인이 올린 사진만 삭제할 수 있습니다.");
  }

  const nextRepresentative = slotPhotos
    .filter((candidate) => candidate.id !== photo.id)
    .sort((a, b) => getUploadedAt(b) - getUploadedAt(a))[0];

  await runTransaction(db, async (transaction) => {
    const slotRef = doc(db, "events", eventId, "slots", photo.slotId);

    transaction.delete(doc(db, "events", eventId, "photos", photo.id));
    transaction.update(slotRef, {
      submissionCount: increment(-1),
      ...(photo.isRepresentative
        ? {
            representativePhotoId: nextRepresentative ? nextRepresentative.id : deleteField(),
          }
        : {}),
    });

    if (photo.isRepresentative && nextRepresentative) {
      transaction.update(doc(db, "events", eventId, "photos", nextRepresentative.id), {
        isRepresentative: true,
      });
    }
  });

  await Promise.allSettled([
    deleteObject(ref(storage, photo.originalPath)),
    deleteObject(ref(storage, photo.thumbPath)),
  ]);
}
