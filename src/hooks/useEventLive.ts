import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MissionEvent, Photo, Slot, Team } from "../lib/types";

export interface EventLiveEvent extends MissionEvent {
  id: string;
}

export interface EventLiveTeam extends Team {
  id: string;
}

export interface EventLiveSlot extends Slot {
  id: string;
}

export interface EventLivePhoto extends Photo {
  id: string;
}

export interface UseEventLiveResult {
  event: EventLiveEvent | null;
  teams: EventLiveTeam[];
  slots: EventLiveSlot[];
  photos: EventLivePhoto[];
  loading: boolean;
  error: string | null;
}

function sortTeams(a: EventLiveTeam, b: EventLiveTeam): number {
  return a.index - b.index;
}

function sortSlots(a: EventLiveSlot, b: EventLiveSlot): number {
  return a.globalIndex - b.globalIndex;
}

function uploadedAtMillis(photo: EventLivePhoto): number {
  return photo.uploadedAt?.toMillis?.() ?? 0;
}

export function useEventLive(eventId: string | undefined): UseEventLiveResult {
  const [event, setEvent] = useState<EventLiveEvent | null>(null);
  const [teams, setTeams] = useState<EventLiveTeam[]>([]);
  const [slots, setSlots] = useState<EventLiveSlot[]>([]);
  const [photos, setPhotos] = useState<EventLivePhoto[]>([]);
  const [eventLoading, setEventLoading] = useState(Boolean(eventId));
  const [teamsLoading, setTeamsLoading] = useState(Boolean(eventId));
  const [slotsLoading, setSlotsLoading] = useState(Boolean(eventId));
  const [photosLoading, setPhotosLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setEventLoading(false);
      return undefined;
    }

    setEventLoading(true);
    setError(null);

    return onSnapshot(
      doc(db, "events", eventId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setEvent(null);
          setError("이벤트를 찾을 수 없습니다.");
          setEventLoading(false);
          return;
        }

        setEvent({ ...(snapshot.data() as MissionEvent), id: snapshot.id });
        setEventLoading(false);
      },
      () => {
        setError("이벤트 정보를 불러오지 못했습니다.");
        setEventLoading(false);
      },
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setTeams([]);
      setTeamsLoading(false);
      return undefined;
    }

    setTeamsLoading(true);

    return onSnapshot(
      collection(db, "events", eventId, "teams"),
      (snapshot) => {
        setTeams(
          snapshot.docs
            .map((teamDoc): EventLiveTeam => ({ ...(teamDoc.data() as Team), id: teamDoc.id }))
            .sort(sortTeams),
        );
        setTeamsLoading(false);
      },
      () => {
        setError("팀 목록을 불러오지 못했습니다.");
        setTeamsLoading(false);
      },
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setSlots([]);
      setSlotsLoading(false);
      return undefined;
    }

    setSlotsLoading(true);

    return onSnapshot(
      collection(db, "events", eventId, "slots"),
      (snapshot) => {
        setSlots(
          snapshot.docs
            .map((slotDoc): EventLiveSlot => ({ ...(slotDoc.data() as Slot), id: slotDoc.id }))
            .sort(sortSlots),
        );
        setSlotsLoading(false);
      },
      () => {
        setError("슬롯 목록을 불러오지 못했습니다.");
        setSlotsLoading(false);
      },
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setPhotos([]);
      setPhotosLoading(false);
      return undefined;
    }

    setPhotosLoading(true);

    return onSnapshot(
      collection(db, "events", eventId, "photos"),
      (snapshot) => {
        setPhotos(
          snapshot.docs
            .map((photoDoc): EventLivePhoto => ({ ...(photoDoc.data() as Photo), id: photoDoc.id }))
            .sort((a, b) => uploadedAtMillis(b) - uploadedAtMillis(a)),
        );
        setPhotosLoading(false);
      },
      () => {
        setError("사진 목록을 불러오지 못했습니다.");
        setPhotosLoading(false);
      },
    );
  }, [eventId]);

  return useMemo(
    () => ({
      error,
      event,
      loading: eventLoading || teamsLoading || slotsLoading || photosLoading,
      photos,
      slots,
      teams,
    }),
    [error, event, eventLoading, photos, photosLoading, slots, slotsLoading, teams, teamsLoading],
  );
}
