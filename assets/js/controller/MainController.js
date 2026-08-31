import { setCurrentLobby } from "../utils/LobbyState.js";
import { normalizeLocalNickname } from "../utils/PlayerIdentity.js?v=20260831-guest-mode";
import { escapeAttribute, escapeHtml } from "../utils/ui.js?v=20260617-category-default-visible";

const MAIN_MODE_STORAGE_KEY = "mq_main_game_mode";
const GAME_MODES = {
  active: "participative",
  passive: "autoplay",
};
const ACTIVE_DEFAULTS = {
  rounds: 5,
  listenSeconds: 30,
  revealSeconds: 10,
};
const PASSIVE_DEFAULTS = {
  rounds: 10,
  listenSeconds: 30,
  revealSeconds: 10,
};

export class MainController {
  constructor() {
    this.user = JSON.parse(localStorage.getItem("user") || "null");
    this.mode = this.loadMode();
    this.stream = null;
    this.realtimeConfig = null;
    this.isDestroyed = false;
    this.realtimeConnected = false;
    this.hasRealtimeOpened = false;
    this.lastRealtimeRevision = "";

    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.refreshLobbies(true);
      }
    };

    document.getElementById("btn-main-create")?.addEventListener("click", () => this.createLobby());
    document.getElementById("btn-main-join-code")?.addEventListener("click", () => this.joinLobbyByCode());
    document.querySelectorAll("[data-main-mode]").forEach((button) => {
      button.addEventListener("click", () => this.setMode(button.dataset.mainMode || GAME_MODES.active));
    });
    document.getElementById("btn-main-refresh")?.addEventListener("click", () => this.refreshLobbies());
    document.getElementById("btn-main-suggest-track")?.addEventListener("click", () => window.appCtrl.changeView("suggest-track"));
    document.getElementById("btn-main-management")?.addEventListener("click", () => window.appCtrl.changeView("management"));
    document.getElementById("btn-main-guest-rename")?.addEventListener("click", () => this.openGuestModal());
    document.getElementById("main-guest-form")?.addEventListener("submit", () => this.submitGuestNickname());
    document.getElementById("btn-main-guest-close")?.addEventListener("click", () => this.closeGuestModal());
    document.getElementById("btn-main-guest-cancel")?.addEventListener("click", () => this.closeGuestModal());
    document.querySelector("[data-main-guest-close]")?.addEventListener("click", () => this.closeGuestModal());
    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.bootstrap();
  }

  async bootstrap() {
    this.renderAdminActions();
    this.renderGuestIdentity();
    this.renderMode();
    if (await this.consumePendingLobbyCode()) {
      return;
    }
    await this.refreshLobbies();
    this.startRealtime();
  }

  async consumePendingLobbyCode() {
    const code = String(sessionStorage.getItem("mq_pending_lobby_code") || "").trim().toUpperCase();
    if (!code) {
      return false;
    }

    sessionStorage.removeItem("mq_pending_lobby_code");
    const res = await window.httpClient.joinLobby(code);
    if (res.success && res.data?.lobby) {
      this.adoptResponseIdentity(res);
      setCurrentLobby(res.data.lobby);
      window.appCtrl.changeView("lobby");
      return true;
    }

    this.setStatus(res.error || "Impossible de rejoindre ce salon", false);
    return false;
  }

  async createLobby() {
    const lobbyName = this.normalizeLobbyName(
      document.getElementById("main-lobby-name")?.value,
      this.isPassiveMode() ? "Blindtest passif" : "Nouveau salon"
    );
    const isPublic = document.getElementById("main-lobby-public")?.checked !== false;
    const gameMode = this.mode;
    const defaults = this.isPassiveMode() ? PASSIVE_DEFAULTS : ACTIVE_DEFAULTS;

    const res = await window.httpClient.createLobby({
      name: lobbyName,
      visibility: isPublic ? "public" : "private",
      game_mode: gameMode,
      max_players: 8,
      round_duration_seconds: defaults.listenSeconds,
      reveal_duration_seconds: defaults.revealSeconds,
      total_rounds: defaults.rounds,
      guess_mode: "title",
      show_track_category: true,
      allow_early_reveal_vote: !this.isPassiveMode(),
      answer_similarity_threshold: 80,
    });

    this.setStatus(res.success ? "Salon créé" : (res.error || "Erreur"), res.success);

    if (res.success && res.data?.lobby) {
      this.adoptResponseIdentity(res);
      setCurrentLobby(res.data.lobby);
      window.appCtrl.changeView("lobby");
    }
  }

  async joinLobbyByCode() {
    const input = document.getElementById("main-lobby-code");
    const code = String(input?.value || "").trim().toUpperCase();
    if (!code) {
      this.setStatus("Code de salon requis", false);
      return;
    }

    const res = await window.httpClient.joinLobby(code);
    this.setStatus(res.success ? "Salon rejoint" : (res.error || "Erreur"), res.success);

    if (res.success && res.data?.lobby) {
      this.adoptResponseIdentity(res);
      setCurrentLobby(res.data.lobby);
      window.appCtrl.changeView("lobby");
    }
  }

  async refreshLobbies(silent = false) {
    const res = await window.httpClient.listPublicLobbies(this.mode);
    if (!res.success) {
      if (!silent) {
        this.setStatus(res.error || "Impossible de charger les salons", false);
      }
      return;
    }

    this.realtimeConfig = res.data?.realtime ?? null;
    this.renderLobbyList(res.data?.items ?? []);
  }

  startRealtime() {
    this.stopRealtime();
    this.startMercureRealtime();
  }

  startMercureRealtime() {
    if (this.realtimeConfig?.transport !== "mercure") {
      return false;
    }

    try {
      this.stream = window.httpClient.openMercureSubscription(this.realtimeConfig);
      this.stream.addEventListener("open", () => this.handleMercureOpen());
      this.stream.addEventListener(this.realtimeConfig.event || "message", (evt) => {
        if (!evt?.data) return;
        let payload;
        try {
          payload = JSON.parse(evt.data);
        } catch {
          return;
        }
        if (!this.shouldApplyRealtimePayload(payload)) {
          return;
        }
        this.renderLobbyList(payload?.items ?? []);
      });
      this.stream.onerror = () => this.handleMercureError();
      return true;
    } catch {
      return false;
    }
  }

  handleMercureOpen() {
    if (this.isDestroyed) return;

    const reopened = this.hasRealtimeOpened;
    this.hasRealtimeOpened = true;
    this.realtimeConnected = true;

    if (reopened) {
      this.refreshLobbies(true);
    }
  }

  handleMercureError() {
    if (this.isDestroyed || !this.stream) return;

    this.realtimeConnected = false;
  }

  shouldApplyRealtimePayload(payload) {
    const revision = String(payload?.revision ?? "");
    if (!revision) {
      return true;
    }

    if (revision === this.lastRealtimeRevision) {
      return false;
    }

    this.lastRealtimeRevision = revision;
    return true;
  }

  stopRealtime() {
    if (this.stream) {
      this.stream.close();
      this.stream = null;
    }
  }

  renderAdminActions() {
    const actions = document.getElementById("main-admin-actions");
    if (!actions) return;
    actions.style.display = this.user?.is_admin ? "" : "none";
  }

  renderGuestIdentity() {
    const host = document.getElementById("main-guest-identity");
    const nickname = document.getElementById("main-guest-nickname");
    const isGuest = Boolean(this.user?.is_guest);
    if (host) host.hidden = !isGuest;
    if (nickname) nickname.textContent = String(this.user?.username || "Invité");
  }

  openGuestModal() {
    if (!this.user?.is_guest) return;

    const modal = document.getElementById("main-guest-modal");
    const input = document.getElementById("main-guest-input");
    const status = document.getElementById("main-guest-status");
    if (!modal || !input) return;

    input.value = String(this.user?.username || "");
    if (status) {
      status.textContent = "";
      status.className = "status";
    }
    modal.hidden = false;
    document.body.classList.add("mq-modal-open");
    window.setTimeout(() => input.focus(), 0);
  }

  closeGuestModal() {
    const modal = document.getElementById("main-guest-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("mq-modal-open");
  }

  async submitGuestNickname() {
    const input = document.getElementById("main-guest-input");
    const status = document.getElementById("main-guest-status");
    const button = document.getElementById("btn-main-guest-save");
    if (!input || !button) return;

    let nickname;
    try {
      nickname = normalizeLocalNickname(input.value);
    } catch (error) {
      if (status) {
        status.textContent = error?.message || "Pseudo invalide.";
        status.className = "status error";
      }
      return;
    }

    button.disabled = true;
    button.textContent = "Vérification...";
    try {
      const res = await window.httpClient.updateGuestNickname(nickname);
      if (!res.success || !res.data?.identity) {
        if (status) {
          status.textContent = res.error || "Impossible de modifier le pseudo.";
          status.className = "status error";
        }
        return;
      }

      this.user = window.appCtrl.adoptPlayerIdentity(res.data.identity) || this.user;
      this.renderGuestIdentity();
      const headerUser = document.querySelector(".mq-topbar__user");
      if (headerUser) headerUser.textContent = `Bonjour ${this.user.username}`;
      this.closeGuestModal();
      this.setStatus("Pseudo mis à jour", true);
    } catch {
      if (status) {
        status.textContent = "Impossible de modifier le pseudo pour le moment.";
        status.className = "status error";
      }
    } finally {
      button.disabled = false;
      button.textContent = "Utiliser ce pseudo";
    }
  }

  adoptResponseIdentity(response) {
    const identity = response?.data?.identity;
    if (!identity) return;
    this.user = window.appCtrl.adoptPlayerIdentity(identity) || this.user;
  }

  setMode(mode) {
    const normalized = this.normalizeMode(mode);
    if (normalized === this.mode) return;

    this.mode = normalized;
    localStorage.setItem(MAIN_MODE_STORAGE_KEY, this.mode);
    this.lastRealtimeRevision = "";
    this.renderMode(true);
    this.refreshLobbies();
  }

  renderMode(resetVisibility = false) {
    document.querySelectorAll("[data-main-mode]").forEach((button) => {
      button.classList.toggle("is-active", this.normalizeMode(button.dataset.mainMode) === this.mode);
      button.setAttribute("aria-pressed", this.normalizeMode(button.dataset.mainMode) === this.mode ? "true" : "false");
    });

    const passive = this.isPassiveMode();
    const publicInput = document.getElementById("main-lobby-public");
    const modeCopy = document.getElementById("main-mode-copy");
    const createTitle = document.getElementById("main-create-title");
    const nameInput = document.getElementById("main-lobby-name");
    const publicLabel = document.getElementById("main-lobby-public-label");
    const publicTitle = document.getElementById("main-public-title");
    const publicCopy = document.getElementById("main-public-copy");

    if (publicInput && (resetVisibility || publicInput.dataset.modeInitialized !== "1")) {
      publicInput.checked = !passive;
      publicInput.dataset.modeInitialized = "1";
    }

    if (nameInput) {
      nameInput.placeholder = passive ? "Blindtest passif du soir" : "Blindtest du vendredi";
    }
    if (publicLabel) {
      publicLabel.textContent = passive
        ? "Visible dans la liste des écoutes publiques"
        : "Visible dans la liste des salons publics";
    }
    if (modeCopy) {
      modeCopy.textContent = passive
        ? "Crée un salon passif, règle les musiques, puis lance une écoute automatique à partager ou à afficher sur TV."
        : "Crée un salon actif si tu organises la partie, ou rejoins directement avec un code.";
    }
    if (createTitle) {
      createTitle.textContent = passive ? "Créer un salon passif" : "Créer un salon actif";
    }
    if (publicTitle) {
      publicTitle.textContent = passive ? "Rejoindre une écoute ouverte" : "Rejoindre une partie ouverte";
    }
    if (publicCopy) {
      publicCopy.textContent = passive
        ? "Les salons passifs sont privés par défaut, mais ceux rendus publics apparaissent ici."
        : "Choisis un salon public disponible. Les salons privés se rejoignent avec un code.";
    }
  }

  renderLobbyList(items) {
    const list = document.getElementById("main-lobby-list");
    const count = document.getElementById("main-lobby-count");
    if (!list) return;

    const visibleItems = this.filterLobbiesByMode(items);
    if (count) {
      const modeLabel = this.isPassiveMode() ? "passif" : "actif";
      count.textContent = `${visibleItems.length} salon${visibleItems.length > 1 ? "s" : ""} ${modeLabel}${visibleItems.length > 1 ? "s" : ""}`;
    }

    if (!visibleItems.length) {
      list.innerHTML = `
        <li class="mq-list-row mq-empty-row">
          <div>
            <strong>Aucun salon public</strong>
            <span class="mq-muted">${this.isPassiveMode() ? "Les salons passifs sont souvent privés. Utilise un code si quelqu'un t'en a partagé un." : "Crée ton salon depuis le départ rapide ou utilise un code privé."}</span>
          </div>
        </li>
      `;
      return;
    }

    list.innerHTML = visibleItems.map((lobby) => `
      <li class="mq-list-row mq-lobby-public-row">
        <div class="mq-lobby-public-row__main">
          <strong>${this.escapeHtml(lobby.name || "Salon")}</strong>
          <span class="mq-muted">${this.isPassiveLobby(lobby) ? "Mode passif" : "Mode actif"} - ${Number(lobby.players_count || 0)}/${Number(lobby.max_players || 0)} joueurs</span>
          ${lobby.owner_username ? `<span class="mq-muted">Créé par ${this.escapeHtml(lobby.owner_username)}</span>` : ""}
        </div>
        <span class="mq-chip">${this.escapeHtml(lobby.lobby_code || "")}</span>
        <button type="button" data-join-code="${this.escapeAttr(lobby.lobby_code || "")}">Entrer</button>
      </li>
    `).join("");

    list.querySelectorAll("[data-join-code]").forEach((button) => {
      button.addEventListener("click", () => this.joinFromButton(button.dataset.joinCode || ""));
    });
  }

  async joinFromButton(code) {
    if (!code) return;
    const res = await window.httpClient.joinLobby(code);
    this.setStatus(res.success ? "Salon rejoint" : (res.error || "Erreur"), res.success);

    if (res.success && res.data?.lobby) {
      this.adoptResponseIdentity(res);
      setCurrentLobby(res.data.lobby);
      window.appCtrl.changeView("lobby");
    }
  }

  setStatus(text, ok) {
    const status = document.getElementById("main-status");
    if (!status) return;
    status.textContent = text;
    status.className = ok ? "status success" : "status error";
  }

  escapeHtml(value) {
    return escapeHtml(value);
  }

  escapeAttr(value) {
    return escapeAttribute(value);
  }

  normalizeLobbyName(value, fallback = "Nouveau salon") {
    const normalized = String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
    return normalized || fallback;
  }

  loadMode() {
    return this.normalizeMode(localStorage.getItem(MAIN_MODE_STORAGE_KEY) || GAME_MODES.active);
  }

  normalizeMode(mode) {
    const value = String(mode || "").trim().toLowerCase();
    return value === GAME_MODES.passive ? GAME_MODES.passive : GAME_MODES.active;
  }

  isPassiveMode() {
    return this.mode === GAME_MODES.passive;
  }

  isPassiveLobby(lobby) {
    return this.normalizeMode(lobby?.game_mode) === GAME_MODES.passive;
  }

  filterLobbiesByMode(items) {
    return (Array.isArray(items) ? items : []).filter((lobby) => this.normalizeMode(lobby?.game_mode) === this.mode);
  }

  destroy() {
    this.isDestroyed = true;
    this.stopRealtime();
    document.body.classList.remove("mq-modal-open");
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }
}
