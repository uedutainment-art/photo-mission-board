import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PhotoVote } from "../lib/types";

export interface PhotoVoteWithId extends PhotoVote {
  id: string;
}

export interface UseEventVotesResult {
  votes: PhotoVoteWithId[];
  loading: boolean;
  error: string | null;
}

export function useEventVotes(eventId: string | undefined): UseEventVotesResult {
  const [votes, setVotes] = useState<PhotoVoteWithId[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setVotes([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    return onSnapshot(
      collection(db, "events", eventId, "votes"),
      (snapshot) => {
        setVotes(snapshot.docs.map((voteDoc): PhotoVoteWithId => ({ ...(voteDoc.data() as PhotoVote), id: voteDoc.id })));
        setLoading(false);
      },
      () => {
        setError("투표 데이터를 불러오지 못했습니다.");
        setLoading(false);
      },
    );
  }, [eventId]);

  return useMemo(() => ({ error, loading, votes }), [error, loading, votes]);
}
