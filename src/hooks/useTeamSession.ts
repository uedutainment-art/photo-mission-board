import { useEffect, useMemo, useState } from "react";
import {
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MissionEvent, Team } from "../lib/types";
import { ensureUploaderUser, saveTeamSession, type StoredTeamSession } from "../lib/teamSession";

export interface TeamSessionEvent extends MissionEvent {
  id: string;
}

export interface TeamSessionTeam extends Team {
  id: string;
}

export interface TeamSessionContext extends StoredTeamSession {
  event: TeamSessionEvent;
  team: TeamSessionTeam;
}

export interface UseTeamSessionResult {
  context: TeamSessionContext | null;
  loading: boolean;
  error: string | null;
}

function getTeamSessionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "팀 입장에 실패했습니다.";
  }

  if (error.message.includes("auth/admin-restricted-operation")) {
    return "Firebase Anonymous 로그인이 꺼져 있습니다. Authentication 설정을 확인해주세요.";
  }

  return error.message;
}

async function findTeamByToken(token: string): Promise<{
  eventId: string;
  teamId: string;
  teamRef: DocumentReference;
  eventRef: DocumentReference;
}> {
  const teamsQuery = query(collectionGroup(db, "teams"), where("token", "==", token), limit(1));
  const snapshot = await getDocs(teamsQuery);
  const teamDocument = snapshot.docs[0];

  if (!teamDocument) {
    throw new Error("팀 링크를 찾을 수 없습니다.");
  }

  const eventRef = teamDocument.ref.parent.parent;

  if (!eventRef) {
    throw new Error("이벤트 정보를 찾을 수 없습니다.");
  }

  return {
    eventId: eventRef.id,
    teamId: teamDocument.id,
    teamRef: teamDocument.ref,
    eventRef,
  };
}

export function useTeamSession(teamToken: string | undefined): UseTeamSessionResult {
  const [session, setSession] = useState<StoredTeamSession | null>(null);
  const [event, setEvent] = useState<TeamSessionEvent | null>(null);
  const [team, setTeam] = useState<TeamSessionTeam | null>(null);
  const [loading, setLoading] = useState(Boolean(teamToken));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamToken) {
      setSession(null);
      setEvent(null);
      setTeam(null);
      setLoading(false);
      setError("팀 링크가 올바르지 않습니다.");
      return undefined;
    }

    const resolvedToken = teamToken;
    let mounted = true;
    let unsubscribeEvent: (() => void) | undefined;
    let unsubscribeTeam: (() => void) | undefined;

    async function resolveSession() {
      setLoading(true);
      setError(null);

      try {
        const uploader = await ensureUploaderUser();
        const teamMatch = await findTeamByToken(resolvedToken);
        const nextSession: StoredTeamSession = {
          eventId: teamMatch.eventId,
          teamId: teamMatch.teamId,
          token: resolvedToken,
          uploaderId: uploader.uid,
        };

        saveTeamSession(nextSession);

        if (!mounted) {
          return;
        }

        setSession(nextSession);

        unsubscribeEvent = onSnapshot(
          doc(db, "events", teamMatch.eventId),
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("이벤트를 찾을 수 없습니다.");
              setEvent(null);
              return;
            }

            setEvent({
              ...(snapshot.data() as MissionEvent),
              id: snapshot.id,
            });
          },
          () => {
            setError("이벤트 정보를 불러오지 못했습니다.");
          },
        );

        unsubscribeTeam = onSnapshot(
          teamMatch.teamRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("팀 정보를 찾을 수 없습니다.");
              setTeam(null);
              return;
            }

            setTeam({
              ...(snapshot.data() as Team),
              id: snapshot.id,
            });
          },
          () => {
            setError("팀 정보를 불러오지 못했습니다.");
          },
        );

        setLoading(false);
      } catch (sessionError) {
        if (!mounted) {
          return;
        }

        setError(getTeamSessionErrorMessage(sessionError));
        setLoading(false);
      }
    }

    void resolveSession();

    return () => {
      mounted = false;
      unsubscribeEvent?.();
      unsubscribeTeam?.();
    };
  }, [teamToken]);

  const context = useMemo<TeamSessionContext | null>(() => {
    if (!session || !event || !team) {
      return null;
    }

    return {
      ...session,
      event,
      team,
    };
  }, [event, session, team]);

  return { context, error, loading };
}
