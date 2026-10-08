import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { VotingUnit } from "./types";

export function getVoteId({
  unit,
  voterId,
  voterTeamId,
}: {
  unit: VotingUnit;
  voterId: string;
  voterTeamId: string;
}): string {
  return unit === "team" ? `team_${voterTeamId}` : `participant_${voterId}`;
}

export async function setPhotoVote({
  active,
  eventId,
  photoId,
  teamId,
  unit,
  voterId,
  voterTeamId,
}: {
  active: boolean;
  eventId: string;
  photoId: string;
  teamId: string;
  unit: VotingUnit;
  voterId: string;
  voterTeamId: string;
}): Promise<void> {
  const voteRef = doc(db, "events", eventId, "votes", getVoteId({ unit, voterId, voterTeamId }));

  if (!active) {
    await deleteDoc(voteRef);
    return;
  }

  await setDoc(voteRef, {
    eventId,
    photoId,
    teamId,
    unit,
    voterId,
    voterTeamId,
    createdAt: serverTimestamp(),
  });
}
