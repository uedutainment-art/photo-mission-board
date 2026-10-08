import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PhotoVote } from "../lib/types";

export function useContestVote(eventId: string | undefined, teamId: string | undefined) {
  const [vote, setVote] = useState<(PhotoVote & { id: string }) | null>(null);

  useEffect(() => {
    if (!eventId || !teamId) {
      setVote(null);
      return undefined;
    }

    return onSnapshot(doc(db, "events", eventId, "votes", `team_${teamId}`), (snapshot) => {
      setVote(snapshot.exists() ? { ...(snapshot.data() as PhotoVote), id: snapshot.id } : null);
    });
  }, [eventId, teamId]);

  return vote;
}
