import { collection, doc, serverTimestamp, writeBatch, type FieldValue } from "firebase/firestore";
import { db } from "./firebase";
import { sanitizePhone } from "./phone";
import type {
  ContactPreference,
  GridSize,
  MapPlatform,
  OrganizerContact,
  Place,
  SelfieMode,
  Slot,
  Team,
  TeamLeader,
} from "./types";

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

export interface CreateEventPlaceInput {
  id: string;
  name: string;
  description?: string;
  verifyHint?: string;
  coverUrl?: string;
  mapPlatform?: MapPlatform;
  mapUrl?: string;
  perTeamCount: number;
}

export interface CreateEventInput {
  ownerId: string;
  title: string;
  subtitle?: string;
  organizer: OrganizerContact;
  grid: GridSize;
  teamCount: number;
  leaders: Array<{
    teamIndex: number;
    name: string;
    role?: string;
    phone: string;
  }>;
  places: CreateEventPlaceInput[];
  selfieMode: SelfieMode;
}

interface EventCreateDocument {
  ownerId: string;
  title: string;
  subtitle?: string;
  organizer: OrganizerContact;
  status: "draft";
  grid: GridSize;
  teamCount: number;
  perTeamCount: number;
  places: Place[];
  selfieMode: SelfieMode;
  layoutMode: "random";
  publicViewMode: "board";
  showLeaderboard: boolean;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

type TeamCreateDocument = Omit<Team, "completedAt">;
type SlotCreateDocument = Omit<Slot, "checkedAt" | "createdAt" | "representativePhotoId"> & {
  createdAt: FieldValue;
};

function randomToken(length = 32): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => TOKEN_CHARS[value % TOKEN_CHARS.length]).join("");
}

function cleanPlace(place: CreateEventPlaceInput): Place {
  const nextPlace: Place = {
    id: place.id,
    name: place.name.trim(),
    perTeamCount: place.perTeamCount,
  };

  if (place.description?.trim()) {
    nextPlace.description = place.description.trim();
  }

  if (place.verifyHint?.trim()) {
    nextPlace.verifyHint = place.verifyHint.trim();
  }

  if (place.coverUrl?.trim()) {
    nextPlace.coverUrl = place.coverUrl.trim();
  }

  if (place.mapUrl?.trim()) {
    nextPlace.mapPlatform = place.mapPlatform;
    nextPlace.mapUrl = place.mapUrl.trim();
  }

  return nextPlace;
}

function cleanOrganizer(organizer: OrganizerContact): OrganizerContact {
  const name = organizer.name.trim();
  const phone = sanitizePhone(organizer.phone);
  const contactPreference: ContactPreference = organizer.contactPreference ?? "sms-first";

  if (!name || !phone) {
    throw new Error("운영팀 이름과 전화번호가 필요합니다.");
  }

  const nextOrganizer: OrganizerContact = {
    name,
    phone,
    contactPreference,
  };

  if (organizer.role?.trim()) {
    nextOrganizer.role = organizer.role.trim();
  }

  return nextOrganizer;
}

function cleanLeader(leader: CreateEventInput["leaders"][number]): TeamLeader {
  const name = leader.name.trim();
  const phone = sanitizePhone(leader.phone);

  if (!name || !phone) {
    throw new Error(`${leader.teamIndex}팀 팀장 이름과 전화번호가 필요합니다.`);
  }

  const nextLeader: TeamLeader = {
    name,
    phone,
  };

  if (leader.role?.trim()) {
    nextLeader.role = leader.role.trim();
  }

  return nextLeader;
}

export function getPerTeamCount(grid: GridSize, teamCount: number): number | null {
  const total = grid.rows * grid.cols;

  if (teamCount <= 0 || total <= 0 || total % teamCount !== 0) {
    return null;
  }

  return total / teamCount;
}

export async function createEvent(input: CreateEventInput): Promise<string> {
  const title = input.title.trim();
  const subtitle = input.subtitle?.trim();
  const perTeamCount = getPerTeamCount(input.grid, input.teamCount);
  const placeTotal = input.places.reduce((sum, place) => sum + place.perTeamCount, 0);
  const organizer = cleanOrganizer(input.organizer);
  const leaderByIndex = new Map(input.leaders.map((leader) => [leader.teamIndex, cleanLeader(leader)]));

  if (!title) {
    throw new Error("이벤트 제목이 필요합니다.");
  }

  if (perTeamCount === null) {
    throw new Error("그리드 칸 수가 팀 수로 나누어져야 합니다.");
  }

  if (placeTotal !== perTeamCount) {
    throw new Error("장소별 사진 수 합계가 팀당 사진 수와 같아야 합니다.");
  }

  if (input.places.length === 0 || input.places.some((place) => !place.name.trim())) {
    throw new Error("장소 이름을 모두 입력해주세요.");
  }

  if (leaderByIndex.size !== input.teamCount) {
    throw new Error("모든 팀의 팀장 정보를 입력해주세요.");
  }

  const batch = writeBatch(db);
  const eventRef = doc(collection(db, "events"));
  const eventId = eventRef.id;
  const now = serverTimestamp();
  const places = input.places.map(cleanPlace);
  const eventData: EventCreateDocument = {
    ownerId: input.ownerId,
    title,
    organizer,
    status: "draft",
    grid: input.grid,
    teamCount: input.teamCount,
    perTeamCount,
    places,
    selfieMode: input.selfieMode,
    layoutMode: "random",
    publicViewMode: "board",
    showLeaderboard: true,
    createdAt: now,
    updatedAt: now,
  };

  if (subtitle) {
    eventData.subtitle = subtitle;
  }

  batch.set(eventRef, eventData);

  for (let teamIndex = 1; teamIndex <= input.teamCount; teamIndex += 1) {
    const teamRef = doc(collection(db, "events", eventId, "teams"));
    const leader = leaderByIndex.get(teamIndex);

    if (!leader) {
      throw new Error(`${teamIndex}팀 팀장 정보를 찾을 수 없습니다.`);
    }

    const teamData: TeamCreateDocument = {
      eventId,
      index: teamIndex,
      name: `${teamIndex}팀`,
      displayName: `${teamIndex}팀`,
      leader,
      color: TEAM_COLORS[(teamIndex - 1) % TEAM_COLORS.length],
      token: randomToken(),
      status: "idle",
      joinedMembers: [],
      uploadedCount: 0,
    };

    batch.set(teamRef, teamData);

    let teamSlotOffset = 0;

    for (const place of places) {
      for (let indexInPlace = 0; indexInPlace < place.perTeamCount; indexInPlace += 1) {
        const slotRef = doc(collection(db, "events", eventId, "slots"));
        const slotData: SlotCreateDocument = {
          eventId,
          teamId: teamRef.id,
          placeId: place.id,
          indexInPlace,
          globalIndex: (teamIndex - 1) * perTeamCount + teamSlotOffset,
          submissionCount: 0,
          reviewStatus: "unchecked",
          createdAt: now,
        };

        batch.set(slotRef, slotData);
        teamSlotOffset += 1;
      }
    }
  }

  await batch.commit();

  return eventId;
}
