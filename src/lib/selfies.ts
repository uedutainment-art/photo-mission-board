import { arrayUnion, collection, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { uploadImage } from "./storage";
import type { CropMeta, TeamMember } from "./types";

export interface UploadSelfieInput {
  eventId: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  file: File;
}

const defaultCropMeta: CropMeta = {
  x: 0.5,
  y: 0.5,
  scale: 1,
};

export async function uploadSelfie({
  eventId,
  file,
  teamId,
  uploaderId,
  uploaderName,
}: UploadSelfieInput): Promise<void> {
  const selfieRef = doc(collection(db, "events", eventId, "selfies"));
  const image = await uploadImage(file, `events/${eventId}/selfies/${selfieRef.id}`);
  const cleanName = uploaderName?.trim();
  const selfieData = {
    eventId,
    teamId,
    uploaderId,
    originalPath: image.originalPath,
    thumbPath: image.thumbPath,
    originalUrl: image.originalUrl,
    thumbUrl: image.thumbUrl,
    cropMeta: defaultCropMeta,
    width: image.width,
    height: image.height,
    bytes: image.bytes,
    uploadedAt: serverTimestamp(),
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
