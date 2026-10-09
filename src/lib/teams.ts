import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { sanitizePhone } from "./phone";
import type { TeamLeader } from "./types";

export interface TeamLeaderInput {
  name: string;
  role?: string;
  phone: string;
}

export async function updateTeamLeader(
  eventId: string,
  teamId: string,
  leader: TeamLeaderInput,
): Promise<void> {
  const name = leader.name.trim();
  const role = leader.role?.trim();
  const phone = sanitizePhone(leader.phone);

  if (!name || !phone) {
    throw new Error("대표자 이름과 전화번호가 필요합니다.");
  }

  const nextLeader: TeamLeader = { name, phone };

  if (role) {
    nextLeader.role = role;
  }

  await updateDoc(doc(db, "events", eventId, "teams", teamId), {
    leader: nextLeader,
  });
}

export async function updateParticipantDisplayName(eventId: string, teamId: string, displayName: string): Promise<void> {
  const cleanName = displayName.trim();

  if (!cleanName) {
    throw new Error("표시 이름을 입력해주세요.");
  }

  await updateDoc(doc(db, "events", eventId, "teams", teamId), {
    displayName: cleanName,
  });
}
