import type { Timestamp } from "firebase/firestore";

export type EventStatus = "draft" | "live" | "completed" | "archived";
export type SelfieMode = "individual" | "group" | "none";
export type LayoutMode = "random" | "team" | "manual";
export type PublicViewMode = "board";
export type ReviewStatus = "unchecked" | "checked";
export type TeamStatus = "idle" | "joined" | "active" | "completed";
export type MapPlatform = "naver" | "kakao" | "google";
export type ContactPreference = "sms-first" | "call-first";

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
  grid: GridSize;
  teamCount: number;
  perTeamCount: number;
  places: Place[];
  selfieMode: SelfieMode;
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
