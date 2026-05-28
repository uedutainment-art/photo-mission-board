import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import type { User } from "firebase/auth";
import {
  getPushReadiness,
  listenForForegroundMessages,
  requestAndSaveFcmToken,
  type PushReadiness,
  type PushRegistrationStatus,
} from "../lib/messaging";

interface NotificationSettingsProps {
  user: User;
}

function getStatusText(readiness: PushReadiness | null, status: PushRegistrationStatus | null): string {
  if (!readiness) {
    return "확인 중";
  }

  if (!readiness.supported) {
    return "지원 안 됨";
  }

  if (status === "enabled" || readiness.permission === "granted") {
    return "켜짐";
  }

  if (status === "denied" || readiness.permission === "denied") {
    return "차단됨";
  }

  return "꺼짐";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "푸시 알림을 준비하지 못했습니다.";
}

export function NotificationSettings({ user }: NotificationSettingsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<PushReadiness | null>(null);
  const [status, setStatus] = useState<PushRegistrationStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    void getPushReadiness().then((nextReadiness) => {
      if (mounted) {
        setReadiness(nextReadiness);
      }
    });

    void listenForForegroundMessages((payload) => {
      setLastMessage(payload.notification?.title || payload.data?.title || "새 알림");
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    setLastMessage(null);

    try {
      const result = await requestAndSaveFcmToken(user.uid);
      setStatus(result.status);
      setReadiness(await getPushReadiness());

      if (result.status !== "enabled") {
        setError(result.status === "denied" ? "브라우저에서 알림이 차단되었습니다." : "FCM 토큰을 저장하지 못했습니다.");
      }
    } catch (registrationError) {
      setError(getErrorMessage(registrationError));
    } finally {
      setBusy(false);
    }
  }

  const enabled = status === "enabled" || readiness?.permission === "granted";
  const blocked = status === "denied" || readiness?.permission === "denied";
  const unsupported = readiness ? !readiness.supported : false;

  return (
    <section className="card p-4">
      <div className="flex items-center gap-3">
        <div className={enabled ? "grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700" : "grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-app-muted"}>
          {enabled ? <Bell className="h-5 w-5" aria-hidden="true" /> : <BellOff className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black">푸시 알림</div>
          <div className="text-xs font-bold text-app-muted">{getStatusText(readiness, status)}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleEnable();
          }}
          disabled={busy || enabled || blocked || unsupported}
          className="rounded-xl bg-app-ink px-3 py-2 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : enabled ? "켜짐" : "켜기"}
        </button>
      </div>

      {readiness && !readiness.hasVapidKey && (
        <p className="mt-3 text-xs font-bold leading-5 text-amber-700">
          Web Push 키가 없어서 Firebase 기본 키로 시도합니다.
        </p>
      )}

      {error && <p className="mt-3 text-xs font-bold leading-5 text-red-600">{error}</p>}
      {lastMessage && <p className="mt-3 text-xs font-bold leading-5 text-emerald-700">{lastMessage}</p>}
    </section>
  );
}
