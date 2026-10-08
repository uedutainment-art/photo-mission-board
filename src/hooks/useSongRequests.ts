import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { SongRequest } from "../lib/types";

export function useSongRequests(eventId: string | undefined, enabled: boolean) {
  const [requests, setRequests] = useState<Array<SongRequest & { id: string }>>([]);
  useEffect(() => {
    if (!eventId || !enabled) {
      setRequests([]);
      return undefined;
    }
    return onSnapshot(query(collection(db, "events", eventId, "songRequests"), orderBy("submittedAt", "desc")), (snapshot) => {
      setRequests(snapshot.docs.map((item) => ({ ...(item.data() as SongRequest), id: item.id })));
    });
  }, [enabled, eventId]);
  return requests;
}
