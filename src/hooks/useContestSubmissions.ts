import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { FamilySubmission } from "../lib/types";

export interface FamilySubmissionWithId extends FamilySubmission {
  id: string;
}

export function useContestSubmissions(eventId: string | undefined) {
  const [submissions, setSubmissions] = useState<FamilySubmissionWithId[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setSubmissions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return onSnapshot(
      collection(db, "events", eventId, "familySubmissions"),
      (snapshot) => {
        setSubmissions(snapshot.docs.map((item) => ({ ...(item.data() as FamilySubmission), id: item.id })));
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("사진 목록을 불러오지 못했습니다.");
      },
    );
  }, [eventId]);

  return useMemo(() => ({ error, loading, submissions }), [error, loading, submissions]);
}
