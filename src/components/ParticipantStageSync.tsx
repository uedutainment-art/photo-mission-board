import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ensureUploaderUser, readLatestTeamSessionForEvent, readStoredTeamSession } from "../lib/teamSession";

export function ParticipantStageSync() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const parts = location.pathname.split("/");
    if (!['t', 'e'].includes(parts[1]) || parts[3] === 'join') return;
    const token = parts[1] === 't' ? parts[2] : new URLSearchParams(location.search).get('team');
    const session = token ? readStoredTeamSession(token) : readLatestTeamSessionForEvent(parts[2]);
    if (!session) return;
    let stop: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    void ensureUploaderUser().then(() => {
      if (disposed) return;
      stop = onSnapshot(doc(db, 'events', session.eventId), snapshot => {
        if (timer) clearInterval(timer);
        const event = snapshot.data();
        if (!event?.modules?.photoContest) return;
        const base = `/t/${session.token}`;
        const destination = event.voting?.status === 'open' ? `${base}/gallery`
          : event.voting?.status === 'closed' ? `${base}/results`
            : /\/(gallery|results)$/.test(location.pathname) ? base : null;
        if (!destination || destination === location.pathname) return;
        const move = () => {
          if (document.querySelector('[data-upload-busy="true"]')) return;
          if (timer) clearInterval(timer);
          navigate(destination, { replace: true });
        };
        timer = setInterval(move, 500);
        move();
      });
    });
    return () => { disposed = true; stop?.(); if (timer) clearInterval(timer); };
  }, [location.pathname, location.search, navigate]);
  return null;
}
