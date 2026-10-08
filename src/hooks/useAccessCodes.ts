import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface ParticipantAccessCode {
  id: string;
  teamId: string;
  displayCode: string;
}

export function useAccessCodes(eventId: string | undefined) {
  const [codes, setCodes] = useState<ParticipantAccessCode[]>([]);

  useEffect(() => {
    if (!eventId) {
      setCodes([]);
      return undefined;
    }

    return onSnapshot(collection(db, "events", eventId, "accessCodes"), (snapshot) => {
      setCodes(snapshot.docs.map((item) => ({
        id: item.id,
        teamId: item.data().teamId as string,
        displayCode: item.data().displayCode as string,
      })));
    });
  }, [eventId]);

  return codes;
}
