export class WakeLockService {
  constructor() {
    this.enabled = false;
    this.sentinel = null;
    this.visibilityHandler = () => this.handleVisibilityChange();
    this.interactionHandler = () => this.request();
    this.releaseHandler = () => this.handleRelease();

    document.addEventListener("visibilitychange", this.visibilityHandler);
    document.addEventListener("pointerdown", this.interactionHandler, { passive: true });
    document.addEventListener("keydown", this.interactionHandler);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);

    if (this.enabled) {
      this.request();
      return;
    }

    this.release();
  }

  async request() {
    if (!this.enabled || this.sentinel || document.visibilityState !== "visible") {
      return false;
    }

    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
      return false;
    }

    try {
      this.sentinel = await navigator.wakeLock.request("screen");
      this.sentinel.addEventListener?.("release", this.releaseHandler);
      return true;
    } catch {
      this.sentinel = null;
      return false;
    }
  }

  async release() {
    const sentinel = this.sentinel;
    this.sentinel = null;

    if (!sentinel) {
      return;
    }

    try {
      sentinel.removeEventListener?.("release", this.releaseHandler);
      await sentinel.release();
    } catch {
      // Le verrou est best-effort: certains navigateurs le relachent eux-memes.
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.enabled) {
      this.request();
    }
  }

  handleRelease() {
    this.sentinel = null;
    if (this.enabled && document.visibilityState === "visible") {
      window.setTimeout(() => this.request(), 250);
    }
  }

  destroy() {
    this.enabled = false;
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    document.removeEventListener("pointerdown", this.interactionHandler);
    document.removeEventListener("keydown", this.interactionHandler);
    this.release();
  }
}
