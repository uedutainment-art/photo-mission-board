import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Selfie } from "../lib/types";

export interface SelfieWithId extends Selfie {
  id: string;
}

export interface UseSelfiesResult {
  selfies: SelfieWithId[];
  loading: boolean;
  error: string | null;
}

function getUploadedTime(selfie: SelfieWithId): number {
  return selfie.uploadedAt?.toMillis?.() ?? 0;
}

export function useSelfies(eventId: string | undefined, teamId: string | undefined): UseSelfiesResult {
  const [selfies, setSelfies] = useState<SelfieWithId[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId && teamId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !teamId) {
      setSelfies([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const selfiesQuery = query(
      collection(db, "events", eventId, "selfies"),
      where("teamId", "==", teamId),
    );

    return onSnapshot(
      selfiesQuery,
      (snapshot) => {
        const nextSelfies = snapshot.docs
          .map((selfieDoc): SelfieWithId => ({
            ...(selfieDoc.data() as Selfie),
            id: selfieDoc.id,
          }))
          .sort((a, b) => getUploadedTime(a) - getUploadedTime(b));

        setSelfies(nextSelfies);
        setLoading(false);
      },
      () => {
        setError("셀카 목록을 불러오지 못했습니다.");
        setLoading(false);
      },
    );
  }, [eventId, teamId]);

  return useMemo(() => ({ error, loading, selfies }), [error, loading, selfies]);
}
