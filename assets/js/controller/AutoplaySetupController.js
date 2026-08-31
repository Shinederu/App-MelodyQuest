import { setCurrentLobby } from "../utils/LobbyState.js";
import { escapeHtml } from "../utils/ui.js?v=20260617-lobby-mode-review";

const DEFAULT_AUTOPLAY_ROUNDS = 10;
const DEFAULT_LISTEN_SECONDS = 30;
const DEFAULT_REVEAL_SECONDS = 10;

export class AutoplaySetupController {
  constructor() {
    this.categories = [];
    this.isSubmitting = false;

    document.getElementById("btn-autoplay-start")?.addEventListener("click", () => this.createAutoplayLobby());
    document.getElementById("btn-autoplay-back")?.addEventListener("click", () => window.appCtrl.changeView("main"));
    document.getElementById("btn-autoplay-all-categories")?.addEventListener("click", () => this.setAllCategories(true));
    document.getElementById("btn-autoplay-clear-categories")?.addEventListener("click", () => this.setAllCategories(false));

    this.bindPlannerInputs();
    this.updateSummary();
    this.bootstrap();
  }

  async bootstrap() {
    const name = document.getElementById("autoplay-name");
    if (name && !name.value) {
      name.value = "Blindtest automatique";
      this.updateSummary();
    }

    const res = await window.httpClient.listCategories();
    if (!res.success) {
      this.setStatus(res.error || "Impossible de charger les catégories", false);
      return;
    }

    this.categories = res.data?.items ?? [];
    this.renderCategories();
  }

  renderCategories() {
    const target = document.getElementById("autoplay-categories");
    if (!target) return;

    if (!this.categories.length) {
      target.innerHTML = `<p class="mq-settings-empty">Aucune catégorie disponible.</p>`;
      this.updateSummary();
      return;
    }

    target.innerHTML = this.categories.map((category) => {
      const count = this.getCategoryTrackCount(category);
      return `
        <label class="mq-check mq-category-check">
          <input type="checkbox" value="${Number(category.id || 0)}" checked />
          <span class="mq-category-check__body">
            <strong>${escapeHtml(category.name || "Catégorie")}</strong>
            <small>${count} musique${count > 1 ? "s" : ""}</small>
          </span>
        </label>
      `;
    }).join("");

    target.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => this.updateSummary());
    });

    this.updateSummary();
  }

  bindPlannerInputs() {
    [
      "autoplay-name",
      "autoplay-rounds",
      "autoplay-listen-duration",
      "autoplay-reveal-duration",
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => this.updateSummary());
    });

    document.getElementById("autoplay-show-category")?.addEventListener("change", () => this.updateSummary());
  }

  setAllCategories(checked) {
    document.querySelectorAll("#autoplay-categories input").forEach((input) => {
      input.checked = Boolean(checked);
    });
    this.updateSummary();
  }

  updateSummary() {
    const summary = document.getElementById("autoplay-category-summary");
    if (!summary) return;

    const selected = this.getSelectedCategoryIds();
    const totalTracks = this.categories.reduce((total, category) => (
      selected.includes(Number(category.id || 0)) ? total + this.getCategoryTrackCount(category) : total
    ), 0);
    const values = this.getPlannerValues();

    summary.textContent = selected.length
      ? `${selected.length} catégorie${selected.length > 1 ? "s" : ""} - ${totalTracks} musique${totalTracks > 1 ? "s" : ""}`
      : "Sélectionne au moins une catégorie.";

    this.setText("autoplay-total-duration", this.formatDuration(values.estimatedSeconds));
    this.setText("autoplay-finish-time", selected.length
      ? `Fin vers ${this.formatFinishTime(values.estimatedSeconds)}`
      : "Aucune catégorie sélectionnée");
    this.setText("autoplay-summary-title", values.name);
    this.setText("autoplay-summary-rounds", `${values.rounds} musique${values.rounds > 1 ? "s" : ""}`);
    this.setText("autoplay-summary-rhythm", `${this.formatShortSeconds(values.listenSeconds)} écoute + ${this.formatShortSeconds(values.revealSeconds)} réponse`);
    this.setText("autoplay-summary-tracks", selected.length ? `${totalTracks} dispo.` : "Aucun");
    this.setText("autoplay-summary-categories", selected.length ? `${selected.length} sélectionnée${selected.length > 1 ? "s" : ""}` : "Aucune");
    this.setText("autoplay-flow-listen", this.formatShortSeconds(values.listenSeconds));
    this.setText("autoplay-flow-reveal", this.formatShortSeconds(values.revealSeconds));

    const note = this.getSummaryNote(selected.length, totalTracks, values.rounds);
    this.setText("autoplay-summary-note", note);
    this.refreshStartButton();
  }

  async createAutoplayLobby() {
    if (this.isSubmitting) return;

    const categoryIds = this.getSelectedCategoryIds();
    if (!categoryIds.length) {
      this.setStatus("Sélectionne au moins une catégorie", false);
      return;
    }

    this.isSubmitting = true;
    this.refreshStartButton();
    this.setStatus("Création du blindtest...", true);

    const values = this.getPlannerValues();
    const res = await window.httpClient.createLobby({
      name: values.name,
      visibility: "private",
      game_mode: "autoplay",
      max_players: 2,
      total_rounds: values.rounds,
      round_duration_seconds: values.listenSeconds,
      reveal_duration_seconds: values.revealSeconds,
      guess_mode: "title",
      selected_category_ids: categoryIds,
      show_track_category: document.getElementById("autoplay-show-category")?.checked === true,
      allow_early_reveal_vote: false,
      answer_similarity_threshold: 80,
    });

    this.isSubmitting = false;
    this.refreshStartButton();

    if (!res.success || !res.data?.lobby) {
      this.setStatus(res.error || "Impossible de créer le blindtest", false);
      return;
    }

    window.appCtrl.adoptPlayerIdentity(res.data.identity);
    setCurrentLobby(res.data.lobby);
    window.appCtrl.changeView("lobby");
  }

  getSelectedCategoryIds() {
    return Array.from(document.querySelectorAll("#autoplay-categories input:checked"))
      .map((input) => Number(input.value || 0))
      .filter((value) => value > 0);
  }

  getCategoryTrackCount(category) {
    return Math.max(0, Number(category?.track_count || 0));
  }

  getPlannerValues() {
    const rounds = this.readInt("autoplay-rounds", DEFAULT_AUTOPLAY_ROUNDS, 1, 1000);
    const listenSeconds = this.readInt("autoplay-listen-duration", DEFAULT_LISTEN_SECONDS, 1, 600);
    const revealSeconds = this.readInt("autoplay-reveal-duration", DEFAULT_REVEAL_SECONDS, 3, 60);

    return {
      name: this.normalizeName(document.getElementById("autoplay-name")?.value),
      rounds,
      listenSeconds,
      revealSeconds,
      estimatedSeconds: rounds * (listenSeconds + revealSeconds),
    };
  }

  normalizeName(value) {
    const normalized = String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
    return normalized || "Blindtest automatique";
  }

  readInt(id, fallback, min, max) {
    const value = Number.parseInt(String(document.getElementById(id)?.value ?? ""), 10);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  refreshStartButton() {
    const button = document.getElementById("btn-autoplay-start");
    if (!button) return;

    const hasCategories = this.getSelectedCategoryIds().length > 0;
    button.disabled = this.isSubmitting || !hasCategories;
    button.textContent = this.isSubmitting ? "Création..." : "Lancer";
  }

  getSummaryNote(selectedCount, totalTracks, requestedRounds) {
    if (!selectedCount) {
      return "Sélectionne au moins une catégorie pour lancer.";
    }

    if (totalTracks < requestedRounds) {
      return `Seulement ${totalTracks} musique${totalTracks > 1 ? "s" : ""} disponible${totalTracks > 1 ? "s" : ""} dans cette sélection.`;
    }

    return "Le temps estimé ne compte pas le chargement des vidéos.";
  }

  formatDuration(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;

    if (hours > 0) {
      return `${hours} h ${String(minutes).padStart(2, "0")} min`;
    }

    if (minutes > 0) {
      return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
    }

    return `${rest} s`;
  }

  formatShortSeconds(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    return value >= 60 ? this.formatDuration(value) : `${value}s`;
  }

  formatFinishTime(totalSeconds) {
    const end = new Date(Date.now() + (Math.max(0, Number(totalSeconds) || 0) * 1000));
    return end.toLocaleTimeString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  setText(id, text) {
    const target = document.getElementById(id);
    if (!target) return;
    target.textContent = text;
  }

  setStatus(text, ok) {
    const status = document.getElementById("autoplay-setup-status");
    if (!status) return;
    status.textContent = text;
    status.className = ok ? "status success" : "status error";
  }
}
