const SERVICE_WORKER_PATH = "/service-worker.js";

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

export function registerPwaShell(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void registerAppServiceWorker().catch((error: unknown) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
