import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MissionEvent, Photo, Selfie, Slot } from "../lib/types";

export interface SharedEvent extends MissionEvent {
  id: string;
}

export interface SharedSlot extends Slot {
  id: string;
}

export interface SharedPhoto extends Photo {
  id: string;
}

export interface SharedSelfie extends Selfie {
  id: string;
}

export interface UseSharedEventResult {
  event: SharedEvent | null;
  slots: SharedSlot[];
  photos: SharedPhoto[];
  selfies: SharedSelfie[];
  loading: boolean;
  error: string | null;
}

function sortSlots(a: SharedSlot, b: SharedSlot): number {
  return a.globalIndex - b.globalIndex;
}

function uploadedAtMillis(item: { uploadedAt?: { toMillis?: () => number } }): number {
  return item.uploadedAt?.toMillis?.() ?? 0;
}

export function useSharedEvent(eventId: string | undefined): UseSharedEventResult {
  const [event, setEvent] = useState<SharedEvent | null>(null);
  const [slots, setSlots] = useState<SharedSlot[]>([]);
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [selfies, setSelfies] = useState<SharedSelfie[]>([]);
  const [eventLoading, setEventLoading] = useState(Boolean(eventId));
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selfiesLoading, setSelfiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setSlots([]);
      setPhotos([]);
      setSelfies([]);
      setEventLoading(false);
      setError("공유 링크가 올바르지 않습니다.");
      return undefined;
    }

    setEventLoading(true);
    setError(null);

    return onSnapshot(
      doc(db, "events", eventId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setEvent(null);
          setSlots([]);
          setPhotos([]);
          setSelfies([]);
          setError("공유 링크를 찾을 수 없습니다.");
          setEventLoading(false);
          return;
        }

        const nextEvent = { ...(snapshot.data() as MissionEvent), id: snapshot.id };

        if (nextEvent.status !== "completed") {
          setEvent(null);
          setSlots([]);
          setPhotos([]);
          setSelfies([]);
          setError("종료된 이벤트만 공유 링크로 볼 수 있습니다.");
          setEventLoading(false);
          return;
        }

        setEvent(nextEvent);
        setError(null);
        setEventLoading(false);
      },
      () => {
        setEvent(null);
        setSlots([]);
        setPhotos([]);
        setSelfies([]);
        setError("종료된 이벤트만 공유 링크로 볼 수 있습니다.");
        setEventLoading(false);
      },
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !event) {
      setSlotsLoading(false);
      setPhotosLoading(false);
      setSelfiesLoading(false);
      return undefined;
    }

    setSlotsLoading(true);
    setPhotosLoading(true);
    setSelfiesLoading(true);

    const unsubscribeSlots = onSnapshot(
      collection(db, "events", eventId, "slots"),
      (snapshot) => {
        setSlots(
          snapshot.docs
            .map((slotDoc): SharedSlot => ({ ...(slotDoc.data() as Slot), id: slotDoc.id }))
            .sort(sortSlots),
        );
        setSlotsLoading(false);
      },
      () => {
        setError("공유 데이터를 불러오지 못했습니다.");
        setSlotsLoading(false);
      },
    );

    const unsubscribePhotos = onSnapshot(
      collection(db, "events", eventId, "photos"),
      (snapshot) => {
        setPhotos(
          snapshot.docs
            .map((photoDoc): SharedPhoto => ({ ...(photoDoc.data() as Photo), id: photoDoc.id }))
            .sort((a, b) => uploadedAtMillis(b) - uploadedAtMillis(a)),
        );
        setPhotosLoading(false);
      },
      () => {
        setError("공유 데이터를 불러오지 못했습니다.");
        setPhotosLoading(false);
      },
    );

    const unsubscribeSelfies = onSnapshot(
      collection(db, "events", eventId, "selfies"),
      (snapshot) => {
        setSelfies(
          snapshot.docs
            .map((selfieDoc): SharedSelfie => ({ ...(selfieDoc.data() as Selfie), id: selfieDoc.id }))
            .sort((a, b) => uploadedAtMillis(b) - uploadedAtMillis(a)),
        );
        setSelfiesLoading(false);
      },
      () => {
        setError("공유 데이터를 불러오지 못했습니다.");
        setSelfiesLoading(false);
      },
    );

    return () => {
      unsubscribeSlots();
      unsubscribePhotos();
      unsubscribeSelfies();
    };
  }, [event, eventId]);

  return useMemo(
    () => ({
      error,
      event,
      loading: eventLoading || slotsLoading || photosLoading || selfiesLoading,
      photos,
      selfies,
      slots,
    }),
    [error, event, eventLoading, photos, photosLoading, selfies, selfiesLoading, slots, slotsLoading],
  );
}
