import { httpsCallable } from "firebase/functions";
import { signInAnonymously } from "firebase/auth";
import { auth, functions } from "./firebase";

export interface ParticipantJoinResult {
  eventId: string;
  teamId: string;
  teamToken: string;
  teamName: string;
}

async function ensureParticipantUser(): Promise<void> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function joinParticipantGroup(eventId: string, accessCode: string): Promise<ParticipantJoinResult> {
  await ensureParticipantUser();
  const callable = httpsCallable<{ eventId: string; accessCode: string }, ParticipantJoinResult>(
    functions,
    "joinParticipantGroup",
  );
  const result = await callable({ eventId, accessCode });
  return result.data;
}

export async function registerParticipantToken(token: string): Promise<{ eventId: string; teamId: string }> {
  await ensureParticipantUser();
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
