import { collection, doc, serverTimestamp, writeBatch, type FieldValue } from "firebase/firestore";
import { db } from "./firebase";
import { getCollectionGrid } from "./collageGrid";
import { sanitizePhone } from "./phone";
import type {
  ContactPreference,
  EventUseMode,
  EventModules,
  EventPreset,
  ExternalEventReference,
  GridSize,
  MapPlatform,
  OrganizerContact,
  OutputMode,
  ParticipantConfig,
  Place,
  SelfieMode,
  Slot,
  Team,
  TeamLeader,
  VotingSettings,
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
  coverStoragePath?: string;
  mapPlatform?: MapPlatform;
  mapUrl?: string;
  perTeamCount: number;
}

export interface CreateEventInput {
  eventId?: string;
  ownerId: string;
  title: string;
  subtitle?: string;
  scheduledAt?: string;
  organizer: OrganizerContact;
  useMode?: EventUseMode;
  externalEvent?: ExternalEventReference;
  outputMode?: OutputMode;
  grid: GridSize;
  teamCount: number;
  leaders?: Array<{
    teamIndex: number;
    name: string;
    role?: string;
    phone: string;
  }>;
  places: CreateEventPlaceInput[];
  selfieMode: SelfieMode;
  voting?: VotingSettings;
  preset?: EventPreset;
  participantConfig?: ParticipantConfig;
  modules?: EventModules;
}

interface EventCreateDocument {
  ownerId: string;
  title: string;
  subtitle?: string;
  scheduledAt?: string;
  organizer: OrganizerContact;
  status: "draft";
  useMode: EventUseMode;
  externalEvent?: ExternalEventReference;
  outputMode: OutputMode;
  grid: GridSize;
  teamCount: number;
  perTeamCount: number;
  places: Place[];
  selfieMode: SelfieMode;
  voting: VotingSettings;
  preset: EventPreset;
  participantConfig: ParticipantConfig;
  modules: EventModules;
  submission: {
    status: "waiting";
    limit: number;
    titleRequired: boolean;
    allowReplacement: boolean;
  };
  results: {
    status: "hidden";
    winnerCount: number;
  };
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

function randomAccessCode(): string {
  const values = new Uint32Array(3);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 100).padStart(2, "0")).join("");
}

async function hashAccessCode(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

  if (place.coverStoragePath?.trim()) {
    nextPlace.coverStoragePath = place.coverStoragePath.trim();
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

function cleanLeader(leader: NonNullable<CreateEventInput["leaders"]>[number]): TeamLeader {
  const name = leader.name.trim();
  const phone = sanitizePhone(leader.phone);

  if (!name || !phone) {
    throw new Error(`${leader.teamIndex}번 참가 단위의 대표자 이름과 전화번호가 필요합니다.`);
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

function cleanExternalEvent(externalEvent: ExternalEventReference | undefined): ExternalEventReference | undefined {
  const title = externalEvent?.title?.trim();
  const url = externalEvent?.url?.trim();
  const brandName = externalEvent?.brandName?.trim();
  const nextExternalEvent: ExternalEventReference = {};

  if (title) {
    nextExternalEvent.title = title;
  }

  if (url) {
    nextExternalEvent.url = url;
  }

  if (brandName) {
    nextExternalEvent.brandName = brandName;
  }

  return Object.keys(nextExternalEvent).length > 0 ? nextExternalEvent : undefined;
}

export function getPerTeamCount(grid: GridSize, teamCount: number): number | null {
  const total = grid.rows * grid.cols;

  if (teamCount <= 0 || total <= 0 || total % teamCount !== 0) {
    return null;
  }

  return total / teamCount;
}

export function createDraftEventId(): string {
  return doc(collection(db, "events")).id;
}

export async function createEvent(input: CreateEventInput): Promise<string> {
  const title = input.title.trim();
  const subtitle = input.subtitle?.trim();
  const scheduledAt = input.scheduledAt?.trim();
  const useMode = input.useMode ?? "standalone";
  const externalEvent = useMode === "attached" ? cleanExternalEvent(input.externalEvent) : undefined;
  const outputMode = input.outputMode ?? "collage";
  const collagePerTeamCount = getPerTeamCount(input.grid, input.teamCount);
  const placeTotal = input.places.reduce((sum, place) => sum + place.perTeamCount, 0);
  const perTeamCount = outputMode === "collage" ? collagePerTeamCount : placeTotal;
  const organizer = cleanOrganizer(input.organizer);
  const leaderByIndex = new Map((input.leaders ?? []).map((leader) => [leader.teamIndex, cleanLeader(leader)]));
  const voting: VotingSettings = input.voting ?? {
    enabled: false,
    resultMode: "team-balanced",
    status: "off",
    target: "representatives",
    unit: "participant",
  };
  const preset = input.preset ?? "photo-mission";
  const participantConfig: ParticipantConfig = input.participantConfig ?? {
    unitType: "group",
    accessMethod: "unique-link",
    labels: {
      singular: "팀",
      plural: "참가 팀",
      leader: "팀장",
      code: "팀 코드",
    },
  };
  const modules: EventModules = input.modules ?? {
    guide: true,
    songRequest: false,
    photoMission: true,
    photoContest: false,
    voting: Boolean(voting.enabled),
    archive: true,
  };

  if (!title) {
    throw new Error("이벤트 제목이 필요합니다.");
  }

  if (outputMode === "collage" && perTeamCount === null) {
    throw new Error(`${participantConfig.labels.singular} 수에 맞춰 그리드 칸 수를 조정해주세요.`);
  }

  if (placeTotal <= 0) {
    throw new Error("장소별 사진 수 합계가 1장 이상이어야 합니다.");
  }

  if (outputMode === "collage" && placeTotal !== perTeamCount) {
    throw new Error(`장소별 사진 수 합계가 ${participantConfig.labels.singular}당 사진 수와 같아야 합니다.`);
  }

  if (input.places.length === 0 || input.places.some((place) => !place.name.trim())) {
    throw new Error("장소 이름을 모두 입력해주세요.");
  }

  const batch = writeBatch(db);
  const eventRef = input.eventId ? doc(db, "events", input.eventId) : doc(collection(db, "events"));
  const eventId = eventRef.id;
  const now = serverTimestamp();
  const places = input.places.map(cleanPlace);
  const slotsPerTeam = perTeamCount ?? placeTotal;
  const eventGrid = outputMode === "collage"
    ? input.grid
    : getCollectionGrid(input.teamCount * placeTotal);
  const eventData: EventCreateDocument = {
    ownerId: input.ownerId,
    title,
    organizer,
    status: "draft",
    useMode,
    outputMode,
    grid: eventGrid,
    teamCount: input.teamCount,
    perTeamCount: slotsPerTeam,
    places,
    selfieMode: input.selfieMode,
    voting: {
      ...voting,
      status: voting.enabled ? voting.status : "off",
      unit: voting.unit ?? "participant",
    },
    preset,
    participantConfig,
    modules,
    submission: {
      status: "waiting",
      limit: preset === "family-photo-contest" ? 1 : Math.max(1, slotsPerTeam),
      titleRequired: preset === "family-photo-contest",
      allowReplacement: true,
    },
    results: {
      status: "hidden",
      winnerCount: 3,
    },
    layoutMode: "random",
    publicViewMode: "board",
    showLeaderboard: true,
    createdAt: now,
    updatedAt: now,
  };

  if (subtitle) {
    eventData.subtitle = subtitle;
  }

  if (scheduledAt) {
    eventData.scheduledAt = scheduledAt;
  }

  if (externalEvent) {
    eventData.externalEvent = externalEvent;
  }

  batch.set(eventRef, eventData);

  for (let teamIndex = 1; teamIndex <= input.teamCount; teamIndex += 1) {
    const teamRef = doc(collection(db, "events", eventId, "teams"));
    const leader = leaderByIndex.get(teamIndex);

    const unitLabel = participantConfig.labels.singular;
    const teamData: TeamCreateDocument = {
      eventId,
      index: teamIndex,
      name: `${teamIndex}${unitLabel}`,
      displayName: `${teamIndex}${unitLabel}`,
      color: TEAM_COLORS[(teamIndex - 1) % TEAM_COLORS.length],
      token: randomToken(),
      status: "idle",
      joinedMembers: [],
      uploadedCount: 0,
    };

    if (leader) {
      teamData.leader = leader;
    }

    batch.set(teamRef, teamData);

    if (participantConfig.accessMethod === "code") {
      const accessCode = randomAccessCode();
      const codeHash = await hashAccessCode(accessCode);
      batch.set(doc(db, "events", eventId, "accessCodes", teamRef.id), {
        eventId,
        teamId: teamRef.id,
        codeHash,
        displayCode: accessCode,
        createdAt: now,
      });
    }

    let teamSlotOffset = 0;

    for (const place of places) {
      for (let indexInPlace = 0; indexInPlace < place.perTeamCount; indexInPlace += 1) {
        const slotRef = doc(collection(db, "events", eventId, "slots"));
        const slotData: SlotCreateDocument = {
          eventId,
          teamId: teamRef.id,
          placeId: place.id,
          indexInPlace,
          globalIndex: (teamIndex - 1) * slotsPerTeam + teamSlotOffset,
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
