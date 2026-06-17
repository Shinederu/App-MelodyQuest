import { setCurrentLobby } from "../utils/LobbyState.js";
import { escapeHtml } from "../utils/ui.js?v=20260617-autoplay-mode";

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

    this.bootstrap();
  }

  async bootstrap() {
    const name = document.getElementById("autoplay-name");
    if (name && !name.value) {
      name.value = "Blindtest automatique";
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

    summary.textContent = selected.length
      ? `${selected.length} catégorie${selected.length > 1 ? "s" : ""} - ${totalTracks} musique${totalTracks > 1 ? "s" : ""}`
      : "Sélectionne au moins une catégorie.";
  }

  async createAutoplayLobby() {
    if (this.isSubmitting) return;

    const categoryIds = this.getSelectedCategoryIds();
    if (!categoryIds.length) {
      this.setStatus("Sélectionne au moins une catégorie", false);
      return;
    }

    this.isSubmitting = true;
    this.setStartDisabled(true);
    this.setStatus("Création du blindtest...", true);

    const res = await window.httpClient.createLobby({
      name: this.normalizeName(document.getElementById("autoplay-name")?.value),
      visibility: "private",
      game_mode: "autoplay",
      max_players: 2,
      total_rounds: this.readInt("autoplay-rounds", DEFAULT_AUTOPLAY_ROUNDS, 1, 1000),
      round_duration_seconds: this.readInt("autoplay-listen-duration", DEFAULT_LISTEN_SECONDS, 1, 600),
      reveal_duration_seconds: this.readInt("autoplay-reveal-duration", DEFAULT_REVEAL_SECONDS, 3, 60),
      guess_mode: "title",
      selected_category_ids: categoryIds,
      show_track_category: document.getElementById("autoplay-show-category")?.checked === true,
      allow_early_reveal_vote: false,
      answer_similarity_threshold: 80,
    });

    this.isSubmitting = false;
    this.setStartDisabled(false);

    if (!res.success || !res.data?.lobby) {
      this.setStatus(res.error || "Impossible de créer le blindtest", false);
      return;
    }

    setCurrentLobby(res.data.lobby);
    window.appCtrl.changeView("autoplay");
  }

  getSelectedCategoryIds() {
    return Array.from(document.querySelectorAll("#autoplay-categories input:checked"))
      .map((input) => Number(input.value || 0))
      .filter((value) => value > 0);
  }

  getCategoryTrackCount(category) {
    return Math.max(0, Number(category?.track_count || 0));
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

  setStartDisabled(disabled) {
    const button = document.getElementById("btn-autoplay-start");
    if (!button) return;
    button.disabled = Boolean(disabled);
    button.textContent = disabled ? "Création..." : "Lancer";
  }

  setStatus(text, ok) {
    const status = document.getElementById("autoplay-setup-status");
    if (!status) return;
    status.textContent = text;
    status.className = ok ? "status success" : "status error";
  }
}
