import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Photo, Slot } from "../lib/types";

export interface SlotWithId extends Slot {
  id: string;
}

export interface PhotoWithId extends Photo {
  id: string;
}

export interface UseTeamMissionResult {
  slots: SlotWithId[];
  photos: PhotoWithId[];
  loading: boolean;
  error: string | null;
}

function compareSlots(a: SlotWithId, b: SlotWithId): number {
  return a.globalIndex - b.globalIndex;
}

function getUploadedAt(photo: PhotoWithId): number {
  return photo.uploadedAt?.toMillis?.() ?? 0;
}

export function useTeamMission(eventId: string | undefined, teamId: string | undefined): UseTeamMissionResult {
  const [slots, setSlots] = useState<SlotWithId[]>([]);
  const [photos, setPhotos] = useState<PhotoWithId[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(Boolean(eventId && teamId));
  const [photosLoading, setPhotosLoading] = useState(Boolean(eventId && teamId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !teamId) {
      setSlots([]);
      setSlotsLoading(false);
      return undefined;
    }

    setSlotsLoading(true);
    setError(null);

    const slotsQuery = query(
      collection(db, "events", eventId, "slots"),
      where("teamId", "==", teamId),
    );

    return onSnapshot(
      slotsQuery,
      (snapshot) => {
        setSlots(
          snapshot.docs
            .map((slotDoc): SlotWithId => ({
              ...(slotDoc.data() as Slot),
              id: slotDoc.id,
            }))
            .sort(compareSlots),
        );
        setSlotsLoading(false);
      },
      () => {
        setError("미션 슬롯을 불러오지 못했습니다.");
        setSlotsLoading(false);
      },
    );
  }, [eventId, teamId]);

  useEffect(() => {
    if (!eventId || !teamId) {
      setPhotos([]);
      setPhotosLoading(false);
      return undefined;
    }

    setPhotosLoading(true);
    setError(null);

    const photosQuery = query(
      collection(db, "events", eventId, "photos"),
      where("teamId", "==", teamId),
    );

    return onSnapshot(
      photosQuery,
      (snapshot) => {
        setPhotos(
          snapshot.docs
            .map((photoDoc): PhotoWithId => ({
              ...(photoDoc.data() as Photo),
              id: photoDoc.id,
            }))
            .sort((a, b) => getUploadedAt(b) - getUploadedAt(a)),
        );
        setPhotosLoading(false);
      },
      () => {
        setError("미션 사진을 불러오지 못했습니다.");
        setPhotosLoading(false);
      },
    );
  }, [eventId, teamId]);

  return useMemo(
    () => ({
      error,
      loading: slotsLoading || photosLoading,
      photos,
      slots,
    }),
    [error, photos, photosLoading, slots, slotsLoading],
  );
}
