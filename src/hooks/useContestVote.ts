import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PhotoVote } from "../lib/types";

export function useContestVote(eventId: string | undefined, teamId: string | undefined) {
  const [votes, setVotes] = useState<(PhotoVote & { id: string })[]>([]);

  useEffect(() => {
    if (!eventId || !teamId) {
      setVotes([]);
      return undefined;
    }

    const snapshots = new Map<string, PhotoVote & { id: string }>();
    const voteIds = [`team_${teamId}`, `team_${teamId}_1`, `team_${teamId}_2`];
    const unsubscribes = voteIds.map((voteId) => onSnapshot(
      doc(db, "events", eventId, "votes", voteId),
      (snapshot) => {
        if (snapshot.exists()) {
          snapshots.set(voteId, { ...(snapshot.data() as PhotoVote), id: snapshot.id });
        } else {
          snapshots.delete(voteId);
        }
        setVotes([...snapshots.values()].sort((a, b) => (a.selectionIndex ?? 0) - (b.selectionIndex ?? 0)));
      },
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [eventId, teamId]);

  return votes;
}
