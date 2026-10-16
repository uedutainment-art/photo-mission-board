import { collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { sanitizePhone } from "./phone";
import type { MissionEvent, Slot, Team, TeamLeader } from "./types";

const TEAM_COLORS = [
  "#0284c7",
  "#7c3aed",
  "#d97706",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
  "#65a30d",
  "#ea580c",
];
const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomToken(length = 32): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => TOKEN_CHARS[value % TOKEN_CHARS.length]).join("");
}

function randomAccessCode(): string {
  const values = new Uint32Array(3);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 100).padStart(2, "0")).join("");
}

async function hashAccessCode(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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

export async function addParticipantTeam(
  eventId: string,
  event: MissionEvent,
  existingTeams: Array<Team & { id: string }>,
): Promise<{ accessCode?: string; index: number }> {
  if (event.outputMode === "collage" && !event.modules?.photoContest) {
    throw new Error("고정 콜라주 행사는 칸 수가 달라지므로 참가 단위를 추가할 수 없습니다.");
  }

  const nextIndex = Math.max(event.teamCount, ...existingTeams.map((team) => team.index), 0) + 1;
  const unitLabel = event.participantConfig?.labels.singular ?? "팀";
  const teamRef = doc(collection(db, "events", eventId, "teams"));
  const batch = writeBatch(db);
  const teamData: Team = {
    eventId,
    index: nextIndex,
    name: `${nextIndex}${unitLabel}`,
    displayName: `${nextIndex}${unitLabel}`,
    color: TEAM_COLORS[(nextIndex - 1) % TEAM_COLORS.length],
    token: randomToken(),
    status: "idle",
    joinedMembers: [],
    uploadedCount: 0,
  };

  batch.set(teamRef, teamData);

  let accessCode: string | undefined;
  if (event.participantConfig?.accessMethod === "code") {
    accessCode = randomAccessCode();
    batch.set(doc(db, "events", eventId, "accessCodes", teamRef.id), {
      eventId,
      teamId: teamRef.id,
      codeHash: await hashAccessCode(accessCode),
      displayCode: accessCode,
      createdAt: serverTimestamp(),
    });
  }

  let teamSlotOffset = 0;
  for (const place of event.places) {
    for (let indexInPlace = 0; indexInPlace < place.perTeamCount; indexInPlace += 1) {
      const slotRef = doc(collection(db, "events", eventId, "slots"));
      const slotData: Omit<Slot, "checkedAt" | "createdAt" | "representativePhotoId"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
        eventId,
        teamId: teamRef.id,
        placeId: place.id,
        indexInPlace,
        globalIndex: (nextIndex - 1) * event.perTeamCount + teamSlotOffset,
        submissionCount: 0,
        reviewStatus: "unchecked",
        createdAt: serverTimestamp(),
      };
      batch.set(slotRef, slotData);
      teamSlotOffset += 1;
    }
  }

  batch.update(doc(db, "events", eventId), {
    teamCount: nextIndex,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return { accessCode, index: nextIndex };
}
