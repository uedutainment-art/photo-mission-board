import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from "firebase/messaging";
import type { Unsubscribe } from "firebase/firestore";
import { db, firebaseApp } from "./firebase";
import { registerAppServiceWorker } from "./pwa";

export type PushRegistrationStatus =
  | "enabled"
  | "denied"
  | "unsupported"
  | "missing-token";

export interface PushReadiness {
  hasNotificationApi: boolean;
  hasServiceWorker: boolean;
  hasVapidKey: boolean;
  isSecureContext: boolean;
  permission: NotificationPermission | "unsupported";
  supported: boolean;
}

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  permission: NotificationPermission | "unsupported";
  tokenHash?: string;
  usedDefaultVapidKey: boolean;
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

function hasNotificationApi(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getPushReadiness(): Promise<PushReadiness> {
  const notificationApi = hasNotificationApi();
  const serviceWorker = "serviceWorker" in navigator;
  const secure = window.isSecureContext;
  const supported = notificationApi && serviceWorker && secure && (await isSupported());

  return {
    hasNotificationApi: notificationApi,
    hasServiceWorker: serviceWorker,
    hasVapidKey: Boolean(vapidKey),
    isSecureContext: secure,
    permission: notificationApi ? Notification.permission : "unsupported",
    supported,
  };
}

export async function requestAndSaveFcmToken(uid: string): Promise<PushRegistrationResult> {
  const readiness = await getPushReadiness();

  if (!readiness.supported) {
    return {
      permission: readiness.permission,
      status: "unsupported",
      usedDefaultVapidKey: !vapidKey,
    };
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      permission,
      status: "denied",
      usedDefaultVapidKey: !vapidKey,
    };
  }

  const serviceWorkerRegistration = await registerAppServiceWorker();

  if (!serviceWorkerRegistration) {
    return {
      permission,
      status: "unsupported",
      usedDefaultVapidKey: !vapidKey,
    };
  }

  const token = await getToken(getMessaging(firebaseApp), {
    ...(vapidKey ? { vapidKey } : {}),
    serviceWorkerRegistration,
  });

  if (!token) {
    return {
      permission,
      status: "missing-token",
      usedDefaultVapidKey: !vapidKey,
    };
  }

  const tokenHash = await hashToken(token);

  await setDoc(
    doc(db, "users", uid, "fcmTokens", tokenHash),
    {
      permission,
      token,
      tokenHash,
      uid,
      updatedAt: serverTimestamp(),
      userAgent: navigator.userAgent,
      usedDefaultVapidKey: !vapidKey,
    },
    { merge: true },
  );

  return {
    permission,
    status: "enabled",
    tokenHash,
    usedDefaultVapidKey: !vapidKey,
  };
}

export async function listenForForegroundMessages(
  onReceived: (payload: MessagePayload) => void,
): Promise<Unsubscribe | null> {
  if (!(await isSupported())) {
    return null;
  }

  return onMessage(getMessaging(firebaseApp), onReceived);
}
