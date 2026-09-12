import { escapeAttribute, escapeHtml, formatDate } from "../utils/ui.js?v=20260617-admin-workflow";
import { confirmDeletion } from "../utils/confirmDialog.js?v=20260810-history-safety";

export class ManagementSuggestionsController {
  constructor() {
    this.items = [];
    this.categories = [];
    this.families = [];
    this.selectedId = null;
    this.statusFilter = "pending";
    this.inFlight = false;

    document.getElementById("btn-suggestions-back")?.addEventListener("click", () => window.appCtrl.changeView("management"));
    document.getElementById("btn-suggestions-refresh")?.addEventListener("click", () => this.refresh());
    document.getElementById("suggestions-filter-status")?.addEventListener("change", (event) => {
      this.statusFilter = String(event?.target?.value || "pending");
      this.selectedId = null;
      this.refresh();
    });

    document.getElementById("btn-suggestion-save")?.addEventListener("click", () => this.saveSelected());
    document.getElementById("btn-suggestion-apply")?.addEventListener("click", () => this.applySelected());
    document.getElementById("btn-suggestion-reviewed")?.addEventListener("click", () => this.updateSelectedStatus("reviewed"));
    document.getElementById("btn-suggestion-rejected")?.addEventListener("click", () => this.updateSelectedStatus("rejected"));
    document.getElementById("btn-suggestion-pending")?.addEventListener("click", () => this.updateSelectedStatus("pending"));
    document.getElementById("suggestion-admin-category")?.addEventListener("change", () => this.renderFamilyOptions());

    this.refresh();
  }

  async refresh() {
    const [suggestionsRes, categoriesRes, familiesRes] = await Promise.all([
      window.httpClient.listSuggestions(this.statusFilter),
      window.httpClient.listCategories(),
      window.httpClient.listFamilies(),
    ]);

    if (!suggestionsRes.success) {
      this.setStatus(suggestionsRes.error || "Erreur", false);
      return;
    }

    this.items = suggestionsRes.data?.items ?? [];
    this.categories = categoriesRes.success ? (categoriesRes.data?.items ?? []) : [];
    this.families = familiesRes.success ? (familiesRes.data?.items ?? []) : [];
    this.renderCounters();
    this.renderList();

    const selected = this.items.find((item) => Number(item.id) === Number(this.selectedId)) || this.items[0] || null;
    this.selectedId = selected ? Number(selected.id) : null;
    this.renderList();
    this.renderDetail();
    this.setStatus("Propositions chargées.", true);
  }

  renderCounters() {
    const count = this.items.length;
    const text = `${count} ${count > 1 ? "propositions" : "proposition"}`;
    const el = document.getElementById("suggestions-count");
    if (el) el.textContent = text;
  }

  renderList() {
    const list = document.getElementById("suggestions-list");
    if (!list) return;

    if (!this.items.length) {
      list.innerHTML = `
        <div class="mq-admin-empty">
          <strong>Aucune proposition</strong>
          <p class="mq-muted">Rien à traiter avec le filtre actuel.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.items.map((item) => {
      const title = this.getSuggestionTitle(item);
      return `
        <button type="button" class="mq-admin-item ${Number(item.id) === Number(this.selectedId) ? "is-selected" : ""}" data-id="${Number(item.id)}">
          <strong>${this.escapeHtml(title)}</strong>
          <div class="mq-admin-item__meta">
            <span class="mq-admin-badge">${this.escapeHtml(this.formatType(item.suggestion_type))}</span>
            <span class="mq-admin-badge ${this.getStatusClass(item.status)}">${this.escapeHtml(this.formatStatus(item.status))}</span>
            ${item.applied_at ? `<span class="mq-admin-badge mq-admin-badge--success">Appliquée</span>` : ""}
            <span class="mq-muted">${this.escapeHtml(this.formatSubmitter(item))}</span>
            <span class="mq-muted">${this.escapeHtml(this.formatDate(item.created_at))}</span>
          </div>
        </button>
      `;
    }).join("");

    list.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedId = Number(button.dataset.id || 0);
        this.renderList();
        this.renderDetail();
      });
    });
  }

  renderDetail() {
    const item = this.getSelectedItem();
    const title = document.getElementById("suggestions-detail-title");
    const helper = document.getElementById("suggestions-detail-helper");
    const meta = document.getElementById("suggestions-detail-meta");
    const compare = document.getElementById("suggestions-detail-compare");
    const editor = document.getElementById("suggestions-editor");

    this.setActionButtonsEnabled(Boolean(item));

    if (!item) {
      if (title) title.textContent = "Aucune proposition sélectionnée";
      if (helper) helper.textContent = "Choisis une proposition pour la modifier ou l'appliquer au catalogue.";
      if (meta) meta.innerHTML = `<span class="mq-muted">Aucune proposition sélectionnée.</span>`;
      if (compare) compare.innerHTML = "";
      if (editor) editor.hidden = true;
      return;
    }

    if (title) title.textContent = this.getSuggestionTitle(item);
    if (helper) {
      helper.textContent = item.suggestion_type === "track_removal"
        ? "Demande de suppression. Vérifie le motif avant de supprimer définitivement la musique."
        : item.suggestion_type === "new_track"
        ? "Choisis la catégorie et l'œuvre, ajuste les champs, puis crée la musique validée."
        : "Ajuste les champs proposés, puis applique la correction sur la musique existante.";
    }
    if (meta) {
      meta.innerHTML = `
        <span class="mq-admin-badge">${this.escapeHtml(this.formatType(item.suggestion_type))}</span>
        <span class="mq-admin-badge ${this.getStatusClass(item.status)}">${this.escapeHtml(this.formatStatus(item.status))}</span>
        <span class="mq-muted">${item.suggestion_type === "video_unavailable" ? "" : "Envoyée par "}${this.escapeHtml(this.formatSubmitter(item))}</span>
        <span class="mq-muted">${this.escapeHtml(this.formatDate(item.created_at))}</span>
      `;
    }
    if (compare) compare.innerHTML = this.renderSuggestionCompare(item);
    if (editor) editor.hidden = false;

    this.fillEditor(item);
  }

  renderSuggestionCompare(item) {
    const rows = [
      [item.proposed_family_name ? "Renommer l’œuvre" : "Alias à ajouter", item.current_family_name, item.proposed_family_name || item.proposed_alias],
      ["Début (s)", item.current_start_offset_seconds == null ? null : String(item.current_start_offset_seconds), item.proposed_start_offset_seconds == null ? null : String(item.proposed_start_offset_seconds)],
      ["Fin (s)", item.current_end_offset_seconds == null ? null : String(item.current_end_offset_seconds), item.proposed_end_offset_seconds == null ? null : String(item.proposed_end_offset_seconds)],
      ["Libellé piste", item.current_title, item.proposed_title],
      ["Artiste / licence", item.current_artist, item.proposed_artist],
      ["YouTube", item.current_youtube_video_id, item.proposed_youtube_url || item.proposed_youtube_video_id],
    ];

    return `
      <div class="mq-suggestion-compare">
        ${rows.filter(([, , proposed]) => proposed != null && proposed !== "").map(([label, current, proposed]) => this.renderCompareRow(label, current, proposed)).join("")}
      </div>
      ${item.applied_at ? `
        <div class="mq-suggestion-note">
          <span class="mq-section-label">Application</span>
          <p>Appliquée le ${this.escapeHtml(this.formatDate(item.applied_at))}
            ${item.applied_track_title ? `sur ${this.escapeHtml(item.applied_track_title)}` : ""}.</p>
        </div>
      ` : ""}
    `;
  }

  renderCompareRow(label, current, proposed) {
    return `
      <div class="mq-suggestion-row">
        <span>${this.escapeHtml(label)}</span>
        <div>
          <small>Actuel</small>
          <strong>${this.escapeHtml(current || "-")}</strong>
        </div>
        <div class="${proposed ? "has-proposal" : ""}">
          <small>Proposé</small>
          <strong>${this.escapeHtml(proposed || "-")}</strong>
        </div>
      </div>
    `;
  }

  fillEditor(item) {
    const newTrack = item.suggestion_type === "new_track";
    const removal = item.suggestion_type === "track_removal";
    document.querySelector("#suggestions-editor > .mq-admin-form-grid").hidden = removal;
    const apply = document.getElementById("btn-suggestion-apply");
    apply.textContent = removal ? "Supprimer la musique" : "Appliquer au catalogue";
    apply.classList.toggle("mq-danger", removal);
    const newFields = document.getElementById("suggestion-new-track-fields");
    if (newFields) newFields.hidden = !newTrack;
    const replacement = document.getElementById("suggestion-replacement-family");
    if (replacement) replacement.closest(".mq-field").hidden = newTrack;
    this.setValue("suggestion-admin-category", item.admin_category_id || "");
    this.setValue("suggestion-admin-family", item.admin_family_name || (item.suggestion_type === "new_track" ? item.proposed_alias || "" : ""));
    this.setValue("suggestion-title", item.proposed_title || "");
    this.setValue("suggestion-artist", item.proposed_artist || "");
    this.setValue("suggestion-youtube", item.proposed_youtube_url || item.proposed_youtube_video_id || "");
    this.setValue("suggestion-alias", item.proposed_alias || "");
    this.setValue("suggestion-start-offset", item.admin_start_offset_seconds ?? "");
    this.setValue("suggestion-end-offset", item.admin_end_offset_seconds ?? "");
    this.setValue("suggestion-replacement-family", item.proposed_family_name ?? "");
    this.setValue("suggestion-note", item.note || "");
    for (const [id, value] of [["suggestion-title", item.current_title], ["suggestion-artist", item.current_artist], ["suggestion-youtube", item.current_youtube_video_id], ["suggestion-start-offset", item.current_start_offset_seconds], ["suggestion-end-offset", item.current_end_offset_seconds]]) {
      const input = document.getElementById(id);
      if (input) input.placeholder = value == null ? "" : String(value);
    }
    this.renderCategoryOptions();
    this.renderFamilyOptions();

    const category = document.getElementById("suggestion-admin-category");
    if (category && item.admin_category_id) {
      category.value = String(Number(item.admin_category_id));
    }
  }

  renderCategoryOptions() {
    const select = document.getElementById("suggestion-admin-category");
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = `
      <option value="">Catégorie à choisir</option>
      ${this.categories.map((item) => `<option value="${Number(item.id)}">${this.escapeHtml(item.name)}</option>`).join("")}
    `;

    if (currentValue && this.categories.some((item) => Number(item.id) === Number(currentValue))) {
      select.value = currentValue;
    }
  }

  renderFamilyOptions() {
    const list = document.getElementById("suggestion-family-options");
    if (!list) return;

    const categoryId = Number(document.getElementById("suggestion-admin-category")?.value || 0);
    const seen = new Set();
    const options = this.families
      .filter((item) => categoryId <= 0 || Number(item.category_id) === categoryId)
      .map((item) => String(item.name || "").trim())
      .filter((name) => {
        const key = name.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }))
      .map((name) => `<option value="${this.escapeAttribute(name)}"></option>`)
      .join("");

    list.innerHTML = options;
  }

  getEditorPayload() {
    return {
      id: Number(this.selectedId || 0),
      proposed_title: this.value("suggestion-title"),
      proposed_artist: this.value("suggestion-artist"),
      proposed_youtube_url: this.value("suggestion-youtube"),
      proposed_alias: this.value("suggestion-alias"),
      admin_category_id: Number(document.getElementById("suggestion-admin-category")?.value || 0) || null,
      admin_family_name: this.value("suggestion-admin-family"),
      admin_start_offset_seconds: this.optionalNumber("suggestion-start-offset"),
      admin_end_offset_seconds: this.optionalNumber("suggestion-end-offset"),
      proposed_family_name: this.value("suggestion-replacement-family"),
      note: this.value("suggestion-note"),
    };
  }

  async saveSelected() {
    if (this.inFlight || !this.getSelectedItem()) return;
    this.inFlight = true;
    this.setActionButtonsEnabled(false);
    this.setStatus("Enregistrement de la proposition...", null);

    const res = await window.httpClient.updateSuggestion(this.getEditorPayload());
    this.inFlight = false;
    this.setStatus(res.success ? "Proposition enregistrée." : (res.error || "Erreur"), res.success);
    if (res.success) {
      await this.refresh();
    } else {
      this.setActionButtonsEnabled(true);
    }
  }

  async applySelected() {
    if (this.inFlight || !this.getSelectedItem()) return;
    const item = this.getSelectedItem();
    const payload = this.getEditorPayload();
    if (item.suggestion_type === "track_removal") {
      const itemName = [item.current_family_name, item.current_title].filter(Boolean).join(" - ") || `Musique #${item.track_id}`;
      const confirmed = await confirmDeletion({ entityLabel: "la musique", itemName });
      if (!confirmed || this.selectedId !== Number(item.id) || this.inFlight) return;
      payload.confirm_removal = true;
    }
    this.inFlight = true;
    this.setActionButtonsEnabled(false);
    this.setStatus("Application au catalogue...", null);

    const res = await window.httpClient.applySuggestion(payload);
    this.inFlight = false;
    this.setStatus(res.success ? "Suggestion appliquée au catalogue." : (res.error || "Erreur"), res.success);
    if (res.success) {
      await this.refresh();
    } else {
      this.setActionButtonsEnabled(true);
    }
  }

  async updateSelectedStatus(status) {
    const item = this.getSelectedItem();
    if (this.inFlight || !item) return;

    this.inFlight = true;
    this.setActionButtonsEnabled(false);
    const res = await window.httpClient.updateSuggestionStatus(Number(item.id), status);
    this.inFlight = false;
    this.setStatus(res.success ? "Statut mis à jour." : (res.error || "Erreur"), res.success);
    if (res.success) {
      await this.refresh();
    } else {
      this.setActionButtonsEnabled(true);
    }
  }

  setActionButtonsEnabled(enabled) {
    [
      "btn-suggestion-save",
      "btn-suggestion-apply",
      "btn-suggestion-reviewed",
      "btn-suggestion-rejected",
      "btn-suggestion-pending",
    ].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = !enabled || this.inFlight;
    });
    const item = this.getSelectedItem();
    for (const [id, status] of [["btn-suggestion-reviewed", "reviewed"], ["btn-suggestion-rejected", "rejected"], ["btn-suggestion-pending", "pending"]]) {
      const button = document.getElementById(id);
      if (button) button.hidden = !item || item.status === status;
    }
    const apply = document.getElementById("btn-suggestion-apply");
    if (apply && item?.applied_at) apply.disabled = true;
  }

  getSuggestionTitle(item) {
    if (item.suggestion_type === "new_track") {
      return item.proposed_title || item.proposed_alias || "Nouvelle musique";
    }

    return item.current_family_name || item.current_title || "Correction de musique";
  }

  getSelectedItem() {
    return this.items.find((item) => Number(item.id) === Number(this.selectedId)) || null;
  }

  value(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  optionalNumber(id) {
    const raw = String(document.getElementById(id)?.value || "").trim();
    return raw || null;
  }

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value === null || value === undefined ? "" : String(value);
  }

  formatType(type) {
    return ({ new_track: "Nouvelle musique", track_removal: "Suppression", video_unavailable: "Vidéo indisponible" })[type] || "Correction";
  }

  formatSubmitter(item) {
    return item.suggestion_type === "video_unavailable" ? "Signalement automatique" : (item.username || "Anonyme");
  }

  formatStatus(status) {
    if (status === "reviewed") return "Traitée";
    if (status === "rejected") return "Refusée";
    return "En attente";
  }

  getStatusClass(status) {
    if (status === "reviewed") return "mq-admin-badge--success";
    if (status === "rejected") return "mq-admin-badge--danger";
    return "mq-admin-badge--pending";
  }

  formatDate(value) {
    return formatDate(value);
  }

  setStatus(text, ok = null) {
    const el = document.getElementById("suggestions-status");
    if (!el) return;
    el.textContent = text || "";
    if (ok === true) {
      el.className = "status success";
      return;
    }
    if (ok === false) {
      el.className = "status error";
      return;
    }
    el.className = "status";
  }

  escapeHtml(value) {
    return escapeHtml(value);
  }

  escapeAttribute(value) {
    return escapeAttribute(value);
  }
}
