import { arrayUnion, collection, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { detectSelfieFaceCrop } from "./face";
import { uploadImage } from "./storage";
import type { TeamMember } from "./types";

export interface UploadSelfieInput {
  eventId: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  file: File;
}

export async function uploadSelfie({
  eventId,
  file,
  teamId,
  uploaderId,
  uploaderName,
}: UploadSelfieInput): Promise<void> {
  const selfieRef = doc(collection(db, "events", eventId, "selfies"));
  const [faceCrop, image] = await Promise.all([
    detectSelfieFaceCrop(file),
    uploadImage(file, `events/${eventId}/selfies/${selfieRef.id}`),
  ]);
  const cleanName = uploaderName?.trim();
  const selfieData = {
    eventId,
    teamId,
    uploaderId,
    originalPath: image.originalPath,
    thumbPath: image.thumbPath,
    originalUrl: image.originalUrl,
    thumbUrl: image.thumbUrl,
    cropMeta: faceCrop.cropMeta,
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    uploadedAt: serverTimestamp(),
    ...(faceCrop.faceDetected ? { faceDetected: faceCrop.faceDetected } : {}),
    ...(cleanName ? { uploaderName: cleanName } : {}),
  };
  const memberData: TeamMember = {
    uploaderId,
    selfieUrl: image.thumbUrl,
    joinedAt: Timestamp.now(),
    ...(cleanName ? { displayName: cleanName } : {}),
  };

  await setDoc(selfieRef, selfieData);
  await updateDoc(doc(db, "events", eventId, "teams", teamId), {
    joinedMembers: arrayUnion(memberData),
    status: "joined",
  });
}
