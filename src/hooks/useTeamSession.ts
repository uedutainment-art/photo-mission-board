import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MissionEvent, Team } from "../lib/types";
import { ensureUploaderUser, saveTeamSession, type StoredTeamSession } from "../lib/teamSession";
import { registerParticipantToken } from "../lib/participantAccess";

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

export function useTeamSession(teamToken: string | undefined): UseTeamSessionResult {
  const navigate = useNavigate();
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
      setSession(null);
      setEvent(null);
      setTeam(null);
      let eventError: string | null = null;
      let teamError: string | null = null;
      let eventReady = false;
      let teamReady = false;
      const updateStatus = () => {
        if (!mounted) return;
        setError(eventError || teamError);
        setLoading(!(eventReady && teamReady) && !eventError && !teamError);
      };

      try {
        const uploader = await ensureUploaderUser();
        const registered = await registerParticipantToken(resolvedToken);
        const teamMatch = {
          eventId: registered.eventId,
          teamId: registered.teamId,
          teamRef: doc(db, "events", registered.eventId, "teams", registered.teamId),
        };
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
            if (!mounted) return;
            if (!snapshot.exists()) {
              if (snapshot.metadata.fromCache) return;
              eventError = "이벤트를 찾을 수 없습니다.";
              eventReady = false;
              setEvent(null);
              updateStatus();
              return;
            }

            eventError = null;
            eventReady = true;
            setEvent({
              ...(snapshot.data() as MissionEvent),
              id: snapshot.id,
            });
            updateStatus();
          },
          (snapshotError) => {
            console.error("Participant event subscription failed", snapshotError);
            eventError = "이벤트 정보를 불러오지 못했습니다.";
            updateStatus();
          },
        );

        unsubscribeTeam = onSnapshot(
          teamMatch.teamRef,
          (snapshot) => {
            if (!mounted) return;
            if (!snapshot.exists()) {
              if (snapshot.metadata.fromCache) return;
              teamError = "팀 정보를 찾을 수 없습니다.";
              teamReady = false;
              setTeam(null);
              updateStatus();
              return;
            }

            teamError = null;
            teamReady = true;
            setTeam({
              ...(snapshot.data() as Team),
              id: snapshot.id,
            });
            updateStatus();
          },
          (snapshotError) => {
            console.error("Participant team subscription failed", snapshotError);
            teamError = "팀 정보를 불러오지 못했습니다.";
            updateStatus();
          },
        );

      } catch (sessionError) {
        if (!mounted) {
          return;
        }

        const details = (sessionError as { details?: { eventId?: string } })?.details;
        if (details?.eventId) navigate(`/e/${encodeURIComponent(details.eventId)}/join`, { replace: true });

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
  }, [teamToken, navigate]);

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
