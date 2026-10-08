import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ensureUploaderUser } from "../lib/teamSession";
import type { MissionEvent } from "../lib/types";

export function usePublicEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<(MissionEvent & { id: string }) | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return undefined;
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void ensureUploaderUser().then(() => {
      if (!active) return;
      unsubscribe = onSnapshot(doc(db, "events", eventId), (snapshot) => {
        if (!snapshot.exists()) {
          setError("행사를 찾을 수 없습니다.");
        } else {
          setEvent({ ...(snapshot.data() as MissionEvent), id: snapshot.id });
        }
        setLoading(false);
      }, () => {
        setError("행사 정보를 불러오지 못했습니다.");
        setLoading(false);
      });
    }).catch(() => {
      setError("행사에 접속하지 못했습니다.");
      setLoading(false);
    });
    return () => { active = false; unsubscribe?.(); };
  }, [eventId]);

  return { event, loading, error };
}
