const SERVICE_WORKER_URL = "/service-worker.js";

function canRegisterServiceWorker() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    (window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname))
  );
}

export function registerPwa() {
  if (!canRegisterServiceWorker()) return;

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
      });
      await registration.update();
    } catch {
      // Le jeu reste pleinement utilisable dans le navigateur si la PWA est indisponible.
    }
  };

  if (document.readyState === "complete") {
    void register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}
