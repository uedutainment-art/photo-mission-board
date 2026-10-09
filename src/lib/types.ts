import type { Timestamp } from "firebase/firestore";

export type EventStatus = "draft" | "live" | "completed" | "archived";
export type SelfieMode = "individual" | "group" | "none";
export type EventUseMode = "standalone" | "attached";
export type OutputMode = "collage" | "collection";
export type LayoutMode = "random" | "team" | "manual";
export type PublicViewMode = "board";
export type ReviewStatus = "unchecked" | "checked";
export type TeamStatus = "idle" | "joined" | "active" | "completed";
export type MapPlatform = "naver" | "kakao" | "google";
export type ContactPreference = "sms-first" | "call-first";
export type VotingStatus = "off" | "draft" | "open" | "closed";
export type VotingTarget = "all" | "representatives" | "checked";
export type VotingResultMode = "team-balanced" | "popular";
export type VotingUnit = "participant" | "team";
export type EventPreset = "photo-mission" | "family-photo-contest" | "custom";
export type ParticipantUnitType = "individual" | "group";
export type ModuleStatus = "waiting" | "open" | "closed";
export type ResultStatus = "hidden" | "published";

export interface ParticipantLabels {
  singular: string;
  plural: string;
  leader: string;
  code: string;
}

export interface ParticipantConfig {
  unitType: ParticipantUnitType;
  labels: ParticipantLabels;
  accessMethod: "code" | "unique-link" | "external";
}

export interface EventModules {
  guide: boolean;
  songRequest: boolean;
  photoMission: boolean;
  photoContest: boolean;
  voting: boolean;
  archive: boolean;
}

export interface EventGuideScheduleItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

export interface EventGuideSettings {
  intro?: string;
  venue?: string;
  schedule: EventGuideScheduleItem[];
  notices: string[];
}

export interface SubmissionSettings {
  status: ModuleStatus;
  limit: number;
  titleRequired: boolean;
  allowReplacement: boolean;
  openedAt?: Timestamp;
  closedAt?: Timestamp;
}

export interface ContestWinner {
  rank: 1 | 2 | 3;
  teamId: string;
  prizeAmount: number;
}

export interface ResultSettings {
  status: ResultStatus;
  winnerCount: number;
  winners?: ContestWinner[];
  publishedAt?: Timestamp;
  tieBreak?: {
    note: string;
    resolvedAt?: Timestamp;
  };
}

export interface OrganizerContact {
  name: string;
  role?: string;
  phone: string;
  contactPreference?: ContactPreference;
}

export interface TeamLeader {
  name: string;
  role?: string;
  phone: string;
}

export interface VotingSettings {
  enabled: boolean;
  status: VotingStatus;
  target: VotingTarget;
  resultMode: VotingResultMode;
  unit?: VotingUnit;
}

export interface ExternalEventReference {
  title?: string;
  url?: string;
  brandName?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface GridSize {
  rows: number;
  cols: number;
}

export interface Place {
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

export interface MissionEvent {
  ownerId: string;
  title: string;
  subtitle?: string;
  scheduledAt?: string;
  organizer: OrganizerContact;
  status: EventStatus;
  useMode?: EventUseMode;
  externalEvent?: ExternalEventReference;
  outputMode?: OutputMode;
  grid: GridSize;
  teamCount: number;
  perTeamCount: number;
  places: Place[];
  selfieMode: SelfieMode;
  voting?: VotingSettings;
  preset?: EventPreset;
  participantConfig?: ParticipantConfig;
  modules?: EventModules;
  guide?: EventGuideSettings;
  submission?: SubmissionSettings;
  results?: ResultSettings;
  layoutMode: LayoutMode;
  publicViewMode?: PublicViewMode;
  showLeaderboard?: boolean;
  layoutLockedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  closedAt?: Timestamp;
  retentionUntil?: Timestamp;
}

export interface TeamMember {
  uploaderId: string;
  displayName?: string;
  selfieUrl?: string;
  joinedAt: Timestamp;
}

export interface Team {
  eventId: string;
  index: number;
  name: string;
  displayName: string;
  leader?: TeamLeader;
  color: string;
  token: string;
  status: TeamStatus;
  joinedMembers: TeamMember[];
  uploadedCount: number;
  completedAt?: Timestamp;
}

export interface Slot {
  eventId: string;
  teamId: string;
  placeId: string;
  indexInPlace: number;
  globalIndex: number;
  representativePhotoId?: string;
  submissionCount: number;
  reviewStatus: ReviewStatus;
  checkedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface CropMeta {
  x: number;
  y: number;
  scale: number;
}

export interface StoredImage {
  eventId: string;
  teamId: string;
  uploaderId: string;
  uploaderName?: string;
  originalPath: string;
  thumbPath: string;
  originalUrl: string;
  thumbUrl: string;
  cropMeta: CropMeta;
  width: number;
  height: number;
  bytes: number;
}

export interface Photo extends StoredImage {
  slotId: string;
  isRepresentative: boolean;
  uploadedAt: Timestamp;
}

export interface PhotoVote {
  eventId: string;
  photoId: string;
  teamId: string;
  voterId: string;
  voterTeamId?: string;
  unit?: VotingUnit;
  createdAt: Timestamp;
}

export interface FamilySubmission extends StoredImage {
  title: string;
  hidden: boolean;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SongRequest {
  eventId: string;
  songTitle: string;
  artist: string;
  story?: string;
  requesterId: string;
  submittedAt: Timestamp;
}

export interface FaceDetectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Selfie extends StoredImage {
  faceDetected?: FaceDetectionBox;
  uploadedAt: Timestamp;
}
