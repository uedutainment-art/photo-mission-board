import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MissionEvent, Team } from "../lib/types";

export interface EventWithId extends MissionEvent {
  id: string;
}

export interface TeamWithId extends Team {
  id: string;
}

export interface UseEventTeamsResult {
  event: EventWithId | null;
  teams: TeamWithId[];
  loading: boolean;
  error: string | null;
}

export function useEventTeams(eventId: string | undefined): UseEventTeamsResult {
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [teams, setTeams] = useState<TeamWithId[]>([]);
  const [eventLoading, setEventLoading] = useState(Boolean(eventId));
  const [teamsLoading, setTeamsLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setEventLoading(false);
      return undefined;
    }

    setEventLoading(true);
    setError(null);

    return onSnapshot(
      doc(db, "events", eventId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setEvent(null);
          setError("이벤트를 찾을 수 없습니다.");
          setEventLoading(false);
          return;
        }

        setEvent({
          ...(snapshot.data() as MissionEvent),
          id: snapshot.id,
        });
        setEventLoading(false);
      },
      () => {
        setError("이벤트 정보를 불러오지 못했습니다.");
        setEventLoading(false);
      },
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setTeams([]);
      setTeamsLoading(false);
      return undefined;
    }

    setTeamsLoading(true);
    setError(null);

    const teamsQuery = query(collection(db, "events", eventId, "teams"), orderBy("index", "asc"));

    return onSnapshot(
      teamsQuery,
      (snapshot) => {
        setTeams(
          snapshot.docs.map((teamDoc): TeamWithId => ({
            ...(teamDoc.data() as Team),
            id: teamDoc.id,
          })),
        );
        setTeamsLoading(false);
      },
      () => {
        setError("팀 목록을 불러오지 못했습니다.");
        setTeamsLoading(false);
      },
    );
  }, [eventId]);

  const loading = useMemo(() => eventLoading || teamsLoading, [eventLoading, teamsLoading]);

  return { error, event, loading, teams };
}
