import type { EventPreset, MissionEvent, ParticipantLabels } from "./types";

export const TEAM_PARTICIPANT_LABELS: ParticipantLabels = {
  singular: "팀",
  plural: "참가 팀",
  leader: "팀장",
  code: "팀 코드",
};

export const FAMILY_PARTICIPANT_LABELS: ParticipantLabels = {
  singular: "가족",
  plural: "참가 가족",
  leader: "가족 대표",
  code: "가족 코드",
};

type ParticipantTermSource = Pick<MissionEvent, "participantConfig" | "preset">;

export function getPresetParticipantLabels(preset: EventPreset): ParticipantLabels {
  return preset === "family-photo-contest"
    ? FAMILY_PARTICIPANT_LABELS
    : TEAM_PARTICIPANT_LABELS;
}

export function getParticipantLabels(
  event: Partial<ParticipantTermSource> | null | undefined,
): ParticipantLabels {
  return event?.participantConfig?.labels ?? getPresetParticipantLabels(event?.preset ?? "photo-mission");
}
