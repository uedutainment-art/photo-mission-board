import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { ensureUploaderUser, saveTeamSession } from "./teamSession";

export interface ParticipantJoinResult {
  eventId: string;
  teamId: string;
  teamToken: string;
  teamName: string;
}

export async function joinParticipantGroup(eventId: string, accessCode: string): Promise<ParticipantJoinResult> {
  const user = await ensureUploaderUser();
  const callable = httpsCallable<{ eventId: string; accessCode: string }, ParticipantJoinResult>(
    functions,
    "joinParticipantGroup",
  );
  const result = await callable({ eventId, accessCode });
  saveTeamSession({
    eventId: result.data.eventId,
    teamId: result.data.teamId,
    token: result.data.teamToken,
    uploaderId: user.uid,
  });
  return result.data;
}

export async function registerParticipantToken(token: string): Promise<{ eventId: string; teamId: string }> {
  await ensureUploaderUser();
  const callable = httpsCallable<{ token: string }, { eventId: string; teamId: string }>(
    functions,
    "joinParticipantGroupByToken",
  );
  const result = await callable({ token });
  return result.data;
}

export async function regenerateParticipantCode(eventId: string, teamId: string): Promise<string> {
  const callable = httpsCallable<{ eventId: string; teamId: string }, { displayCode: string }>(
    functions,
    "regenerateParticipantCode",
  );
  const result = await callable({ eventId, teamId });
  return result.data.displayCode;
}
