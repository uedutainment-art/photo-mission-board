import { deleteObject, ref } from "firebase/storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "./firebase";
import { uploadImage } from "./storage";
import type { CropMeta, FamilySubmission } from "./types";

const defaultCropMeta: CropMeta = { x: 0.5, y: 0.5, scale: 1 };

export async function saveContestSubmission({
  eventId,
  file,
  teamId,
  title,
  uploaderId,
}: {
  eventId: string;
  file: File;
  teamId: string;
  title: string;
  uploaderId: string;
}): Promise<void> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error("사진 제목을 입력해주세요.");
  }

  if (cleanTitle.length > 30) {
    throw new Error("사진 제목은 30자 이하로 입력해주세요.");
  }

  const submissionRef = doc(db, "events", eventId, "familySubmissions", teamId);
  const previousSnapshot = await getDoc(submissionRef);
  const previous = previousSnapshot.exists() ? previousSnapshot.data() as FamilySubmission : null;
  const image = await uploadImage(file, `events/${eventId}/contest/${teamId}/submission-${Date.now()}`);

  await setDoc(submissionRef, {
    eventId,
    teamId,
    uploaderId,
    title: cleanTitle,
    originalPath: image.originalPath,
    thumbPath: image.thumbPath,
    originalUrl: image.originalUrl,
    thumbUrl: image.thumbUrl,
    cropMeta: defaultCropMeta,
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    hidden: false,
    submittedAt: previous?.submittedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (previous) {
    await Promise.allSettled([
      deleteObject(ref(storage, previous.originalPath)),
      deleteObject(ref(storage, previous.thumbPath)),
    ]);
  }
}

export async function castContestVote(eventId: string, targetTeamId: string): Promise<void> {
  const callable = httpsCallable<{ eventId: string; targetTeamId: string }>(functions, "castContestVote");
  await callable({ eventId, targetTeamId });
}

export async function clearContestVote(eventId: string, voterTeamId: string): Promise<void> {
  const callable = httpsCallable<{ eventId: string; voterTeamId: string }>(functions, "clearContestVote");
  await callable({ eventId, voterTeamId });
}
