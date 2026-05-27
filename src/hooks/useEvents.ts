import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { EventStatus, MissionEvent } from "../lib/types";

export type EventFilter = "live" | "draft" | "completed";

export interface EventRecord extends MissionEvent {
  id: string;
}

export interface UseEventsResult {
  events: EventRecord[];
  loading: boolean;
  error: string | null;
  counts: Record<EventFilter, number>;
}

function compareByCreatedAtDesc(a: EventRecord, b: EventRecord): number {
  return b.createdAt.toMillis() - a.createdAt.toMillis();
}

function normalizeFilter(status: EventStatus): EventFilter {
  if (status === "live") {
    return "live";
  }

  if (status === "draft") {
    return "draft";
  }

  return "completed";
}

export function filterEvents(events: EventRecord[], filter: EventFilter): EventRecord[] {
  return events.filter((event) => normalizeFilter(event.status) === filter);
}

export function useEvents(ownerId: string | null): UseEventsResult {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(ownerId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setEvents([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const eventsQuery = query(collection(db, "events"), where("ownerId", "==", ownerId));

    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const nextEvents = snapshot.docs
          .map((eventDoc): EventRecord => {
            const data = eventDoc.data() as MissionEvent;
            return {
              ...data,
              id: eventDoc.id,
            };
          })
          .sort(compareByCreatedAtDesc);

        setEvents(nextEvents);
        setLoading(false);
      },
      () => {
        setError("이벤트 목록을 불러오지 못했습니다.");
        setLoading(false);
      },
    );
  }, [ownerId]);

  const counts = useMemo<Record<EventFilter, number>>(
    () => ({
      live: filterEvents(events, "live").length,
      draft: filterEvents(events, "draft").length,
      completed: filterEvents(events, "completed").length,
    }),
    [events],
  );

  return { counts, error, events, loading };
}
