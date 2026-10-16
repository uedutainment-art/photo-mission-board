import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { FamilySubmission } from "../lib/types";

export interface FamilySubmissionWithId extends FamilySubmission {
  id: string;
}

export function useContestSubmissions(eventId: string | undefined, teamId?: string, publicOnly = false) {
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
      teamId ? query(collection(db, "events", eventId, "familySubmissions"), where("teamId", "==", teamId))
        : publicOnly ? query(collection(db, "events", eventId, "familySubmissions"), where("hidden", "==", false))
          : collection(db, "events", eventId, "familySubmissions"),
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
  }, [eventId, teamId, publicOnly]);

  return useMemo(() => ({ error, loading, submissions }), [error, loading, submissions]);
}
