import { signInAnonymously, type User } from "firebase/auth";
import { auth } from "./firebase";

const TEAM_SESSION_KEY_PREFIX = "photoMissionTeamSession";

export interface StoredTeamSession {
  eventId: string;
  teamId: string;
  token: string;
  uploaderId: string;
  savedAt?: number;
}

function getSessionKey(token: string): string {
  return `${TEAM_SESSION_KEY_PREFIX}:${token}`;
}

export function readStoredTeamSession(token: string): StoredTeamSession | null {
  const rawValue = localStorage.getItem(getSessionKey(token));

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StoredTeamSession>;

    if (
      parsedValue.eventId &&
      parsedValue.teamId &&
      parsedValue.token === token &&
      parsedValue.uploaderId
    ) {
      return {
        eventId: parsedValue.eventId,
        teamId: parsedValue.teamId,
        token: parsedValue.token,
        uploaderId: parsedValue.uploaderId,
        savedAt: parsedValue.savedAt,
      };
    }
  } catch {
    localStorage.removeItem(getSessionKey(token));
  }

  return null;
}

export function saveTeamSession(session: StoredTeamSession): void {
  localStorage.setItem(getSessionKey(session.token), JSON.stringify({ ...session, savedAt: Date.now() }));
}

export function clearStoredTeamSession(token: string): void {
  localStorage.removeItem(getSessionKey(token));
}

export function readLatestTeamSessionForEvent(eventId: string): StoredTeamSession | null {
  let latest: StoredTeamSession | null = null;

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(`${TEAM_SESSION_KEY_PREFIX}:`)) continue;
    const session = readStoredTeamSession(key.slice(TEAM_SESSION_KEY_PREFIX.length + 1));
    if (session?.eventId === eventId && (!latest || (session.savedAt ?? 0) > (latest.savedAt ?? 0))) {
      latest = session;
    }
  }

  return latest;
}

export async function ensureUploaderUser(): Promise<User> {
  await auth.authStateReady();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}
