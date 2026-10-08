import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export function getVoteId(voterId: string, photoId: string): string {
  return `${voterId}_${photoId}`;
}

export async function setPhotoVote({
  active,
  eventId,
  photoId,
  teamId,
  voterId,
}: {
  active: boolean;
  eventId: string;
  photoId: string;
  teamId: string;
  voterId: string;
}): Promise<void> {
  const voteRef = doc(db, "events", eventId, "votes", getVoteId(voterId, photoId));

  if (!active) {
    await deleteDoc(voteRef);
    return;
  }

  await setDoc(voteRef, {
    eventId,
    photoId,
    teamId,
    voterId,
    createdAt: serverTimestamp(),
  });
}
