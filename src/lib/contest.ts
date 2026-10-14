import { deleteObject, ref } from "firebase/storage";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "./firebase";
import { uploadImage } from "./storage";
import type { CropMeta, FamilySubmission } from "./types";

const defaultCropMeta: CropMeta = { x: 0.5, y: 0.5, scale: 1 };

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function uploadContestImage(file: File, basePath: string) {
  try {
    return await uploadImage(file, basePath);
  } catch {
    await wait(700);
    return uploadImage(file, basePath);
  }
}

export async function saveContestSubmission({
  eventId,
  file,
  teamId,
  title,
  uploaderId,
  submissionId,
}: {
  eventId: string;
  file: File;
  teamId: string;
  title: string;
  uploaderId: string;
  submissionId?: string;
}): Promise<void> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error("사진 제목을 입력해주세요.");
  }

  if (cleanTitle.length > 30) {
    throw new Error("사진 제목은 30자 이하로 입력해주세요.");
  }

  const submissionsRef = collection(db, "events", eventId, "familySubmissions");
  const submissionRef = submissionId
    ? doc(submissionsRef, submissionId)
    : doc(submissionsRef);
  const previousSnapshot = await getDoc(submissionRef);
  const previous = previousSnapshot.exists() ? previousSnapshot.data() as FamilySubmission : null;

  if (!previous) {
    const ownSubmissions = await getDocs(query(submissionsRef, where("teamId", "==", teamId)));
    if (ownSubmissions.size >= 6) {
      throw new Error("사진은 가족당 최대 6장까지 등록할 수 있습니다.");
    }
  }
  const image = await uploadContestImage(
    file,
    `events/${eventId}/contest/${teamId}/submission-${Date.now()}`,
  );

  try {
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
      hidden: previous?.hidden ?? false,
      submittedAt: previous?.submittedAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (saveError) {
    await Promise.allSettled([
      deleteObject(ref(storage, image.originalPath)),
      deleteObject(ref(storage, image.thumbPath)),
    ]);
    throw saveError;
  }

  if (previous) {
    await Promise.allSettled([
      deleteObject(ref(storage, previous.originalPath)),
      deleteObject(ref(storage, previous.thumbPath)),
    ]);
  }
}

export async function deleteContestSubmission(
  eventId: string,
  submissionId: string,
  submission: Pick<FamilySubmission, "originalPath" | "thumbPath">,
): Promise<void> {
  await deleteDoc(doc(db, "events", eventId, "familySubmissions", submissionId));
  await Promise.allSettled([
    deleteObject(ref(storage, submission.originalPath)),
    deleteObject(ref(storage, submission.thumbPath)),
  ]);
}

export async function castContestVotes(eventId: string, targetTeamIds: string[]): Promise<void> {
  const callable = httpsCallable<{ eventId: string; targetTeamIds: string[] }>(functions, "castContestVote");
  await callable({ eventId, targetTeamIds });
}

export async function clearContestVote(eventId: string, voterTeamId: string): Promise<void> {
  const callable = httpsCallable<{ eventId: string; voterTeamId: string }>(functions, "clearContestVote");
  await callable({ eventId, voterTeamId });
}
