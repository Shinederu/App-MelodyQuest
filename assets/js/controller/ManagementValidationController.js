import { confirmDeletion } from "../utils/confirmDialog.js?v=20260810-history-safety";
import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from "../utils/youtube.js?v=20260615-playtest-improvements";
import { escapeAttribute, escapeHtml, formatDate, normalizeSearch } from "../utils/ui.js?v=20260615-playtest-improvements";
import { parseTimecode, formatTimecode } from "../utils/Timecode.js?v=20260915-notoriety-votes";
import { formatKnowledge } from "../utils/FamilyKnowledge.js?v=20260915-notoriety-votes";
import { FamilySeedField } from "../utils/Notoriety.js?v=20260915-notoriety-votes";

export class ManagementValidationController {
  constructor() {
    this.items = [];
    this.categories = [];
    this.families = [];
    this.selectedId = null;
    this.seedField = new FamilySeedField("validation-notoriety-seed");
    this.aliases = [];
    this.aliasesAvailable = false;
    this.aliasDirty = false;
    this.page = 1;
    this.pages = 1;
    this.total = 0;
    this.pendingTotal = 0;
    this.refreshId = 0;
    this.isDestroyed = false;
    this.saving = false;
    this.searchTimer = null;

    document.getElementById("btn-validation-back")?.addEventListener("click", () => window.appCtrl.changeView("management"));
    document.getElementById("btn-validation-refresh")?.addEventListener("click", () => this.refresh());
    document.getElementById("btn-validation-approve")?.addEventListener("click", () => this.validateSelected());
    document.getElementById("btn-validation-reject")?.addEventListener("click", () => this.rejectSelected());
    document.getElementById("btn-validation-open-youtube")?.addEventListener("click", () => this.openSelectedTrackOnYouTube());
    document.getElementById("btn-validation-add-alias")?.addEventListener("click", () => this.addAliasFromInput());
    document.getElementById("validation-category")?.addEventListener("change", () => {
      this.renderFamilyOptions();
      this.syncAliasesFromSelectedFamily();
    });
    document.getElementById("validation-family-name")?.addEventListener("input", () => this.syncAliasesFromSelectedFamily());
    document.getElementById("validation-family-name")?.addEventListener("change", () => this.syncAliasesFromSelectedFamily());
    document.getElementById("validation-alias-input")?.addEventListener("keydown", (event) => this.handleAliasInputKeydown(event));
    document.getElementById("validation-youtube-url")?.addEventListener("change", () => this.updatePreviewFromForm());
    document.getElementById("btn-validation-preview")?.addEventListener("click", () => this.updatePreviewFromForm(true));
    document.getElementById("validation-filter-category")?.addEventListener("change", () => { this.page = 1; this.refresh(); });
    document.getElementById("validation-search")?.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.page = 1; this.refresh(); }, 300);
    });
    document.getElementById("btn-validation-prev")?.addEventListener("click", () => { this.page--; this.refresh(); });
    document.getElementById("btn-validation-next")?.addEventListener("click", () => { this.page++; this.refresh(); });
    document.getElementById("validation-track-title")?.addEventListener("input", () => this.updateTitleFromForm());

    this.refresh();
  }

  async refresh() {
    const refreshId = ++this.refreshId;
    const [pendingRes, catRes, famRes] = await Promise.all([
      window.httpClient.listPendingTracks({ page: this.page,
        category_id: document.getElementById("validation-filter-category")?.value || "",
        search: document.getElementById("validation-search")?.value || "" }),
      this.categories.length ? { success: true, data: { items: this.categories } } : window.httpClient.listCategories(),
      this.families.length ? { success: true, data: { items: this.families } } : window.httpClient.listFamilies(),
    ]);
    if (this.isDestroyed || refreshId !== this.refreshId) return;

    if (!pendingRes.success) {
      this.setStatus(pendingRes.error || "Erreur", false);
      return;
    }

    this.items = pendingRes.data?.items ?? [];
    this.total = Number(pendingRes.data?.total ?? this.items.length);
    this.pendingTotal = Number(pendingRes.data?.pending_total ?? this.total);
    this.page = Number(pendingRes.data?.page || 1);
    this.pages = Number(pendingRes.data?.pages || 1);
    this.categories = catRes.success ? (catRes.data?.items ?? []) : [];
    this.families = famRes.success ? (famRes.data?.items ?? []) : [];
    this.aliasesAvailable = famRes.success;
    this.renderCategoryOptions();
    this.renderCounters();
    this.renderList();

    const selected = this.items.find((item) => Number(item.id) === Number(this.selectedId)) || this.items[0] || null;
    if (!selected) {
      this.selectedId = null;
      this.renderDetail();
      return;
    }

    this.selectedId = Number(selected.id);
    this.renderList();
    this.renderDetail();
  }

  renderCounters() {
    const count = this.pendingTotal;
    const text = `${count} ${count > 1 ? "musiques en attente" : "musique en attente"}`;
    ["validation-count", "validation-count-inline"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
    document.getElementById("validation-pagination").textContent = `Page ${this.page} / ${this.pages} · ${this.total} résultat${this.total > 1 ? "s" : ""}`;
    document.getElementById("btn-validation-prev").disabled = this.page <= 1;
    document.getElementById("btn-validation-next").disabled = this.page >= this.pages;
  }

  renderCategoryOptions() {
    const filter = document.getElementById("validation-filter-category");
    const filterValue = filter.value;
    filter.innerHTML = `<option value="">Toutes les catégories</option>${this.categories.map((item) => `<option value="${Number(item.id)}">${this.escapeHtml(item.name)}</option>`).join("")}`;
    filter.value = filterValue;
    const select = document.getElementById("validation-category");
    if (!select) return;

    const selectedItem = this.getSelectedItem();
    const currentValue = Number(select.value || selectedItem?.category_id || 0);
    select.innerHTML = `
      <option value="">Choisir une catégorie</option>
      ${this.categories.map((item) => `<option value="${Number(item.id)}">${this.escapeHtml(item.name)}</option>`).join("")}
    `;

    if (currentValue > 0 && this.categories.some((item) => Number(item.id) === currentValue)) {
      select.value = String(currentValue);
    }

    this.renderFamilyOptions();
  }

  renderFamilyOptions() {
    const list = document.getElementById("validation-family-options");
    if (!list) return;

    const categoryId = this.getFormCategoryId();
    const seen = new Set();
    const options = this.families
      .filter((item) => categoryId <= 0 || Number(item.category_id) === categoryId)
      .map((item) => String(item.name || "").trim())
      .filter((name) => {
        const normalized = this.normalizeSearch(name);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }))
      .map((name) => `<option value="${this.escapeAttribute(name)}"></option>`)
      .join("");

    list.innerHTML = options;
  }

  renderList() {
    const list = document.getElementById("validation-list");
    if (!list) return;

    if (!this.items.length) {
      list.innerHTML = `
        <div class="mq-admin-empty">
          <strong>${this.pendingTotal ? "Aucun résultat" : "Toutes les musiques sont vérifiées"}</strong>
        </div>
      `;
      return;
    }

    list.innerHTML = this.items.map((item) => `
      <button type="button" class="mq-admin-item ${Number(item.id) === Number(this.selectedId) ? "is-selected" : ""}" data-id="${Number(item.id)}">
        <strong>${this.escapeHtml(item.family_name || "Sans œuvre")}</strong>
        <span>${this.escapeHtml(item.title || "Sans titre")}</span>
        <div class="mq-admin-item__meta">
          <span class="mq-admin-badge">${this.escapeHtml(item.category_name || "Sans catégorie")}</span>
          <span class="mq-muted">${formatTimecode(item.start_offset_seconds)} → ${formatTimecode(item.end_offset_seconds) || "fin de vidéo"}</span>
        </div>
      </button>
    `).join("");

    list.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedId = Number(button.dataset.id || 0);
        this.renderList();
        this.renderDetail();
        if (window.matchMedia("(max-width: 900px)").matches) document.getElementById("validation-detail-title")?.scrollIntoView({ block: "start" });
      });
    });
  }

  renderDetail() {
    const title = document.getElementById("validation-detail-title");
    const helper = document.getElementById("validation-detail-helper");
    const meta = document.getElementById("validation-detail-meta");
    const created = document.getElementById("validation-track-created");
    const approve = document.getElementById("btn-validation-approve");
    const reject = document.getElementById("btn-validation-reject");

    const item = this.getSelectedItem();
    const pane = title?.closest(".mq-admin-pane");
    pane?.querySelectorAll(":scope > .mq-admin-form-grid, :scope > .mq-admin-form-actions").forEach((element) => { element.hidden = !item; });
    if (!item) {
      if (title) title.textContent = "Aucune musique sélectionnée";
      if (helper) helper.textContent = "Choisis une piste en attente pour vérifier sa vidéo YouTube et la valider.";
      if (meta) meta.innerHTML = `<span class="mq-muted">Aucune piste n'est sélectionnée pour le moment.</span>`;
      if (created) created.textContent = "Date d'ajout indisponible";
      if (approve) approve.disabled = true;
      if (reject) reject.disabled = true;
      this.clearForm();
      this.updatePreviewFromForm();
      return;
    }

    this.fillForm(item);

    if (helper) {
      helper.textContent = formatKnowledge(this.findFamilyById(item.family_id)?.knowledge);
    }
    if (meta) {
      meta.innerHTML = `
        <span class="mq-admin-badge">${this.escapeHtml(item.category_name || "Sans catégorie")}</span>
        <span class="mq-admin-badge">${this.escapeHtml(item.family_name || "Sans œuvre")}</span>
        ${item.created_by_username ? `<span class="mq-muted">Ajoutée par ${this.escapeHtml(item.created_by_username)}</span>` : ""}
      `;
    }
    if (created) {
      created.textContent = `Ajoutée le ${this.formatDate(item.created_at)}`;
    }
    if (approve) approve.disabled = false;
    if (reject) reject.disabled = false;

    this.updateTitleFromForm();
    this.updatePreviewFromForm();
  }

  fillForm(item) {
    document.getElementById("validation-end-offset").value = formatTimecode(item.end_offset_seconds);
    this.seedField.sync(this.findFamilyById(item.family_id), `${Number(item.category_id)}:${this.normalizeSearch(item.family_name)}`, true);
    this.setFormDisabled(false);

    const category = document.getElementById("validation-category");
    const family = document.getElementById("validation-family-name");
    const title = document.getElementById("validation-track-title");
    const artist = document.getElementById("validation-track-artist");
    const youtube = document.getElementById("validation-youtube-url");
    const startOffset = document.getElementById("validation-start-offset");

    if (category) category.value = String(Number(item.category_id || 0) || "");
    if (family) family.value = item.family_name || "";
    if (title) title.value = item.title || "";
    if (artist) artist.value = item.artist || "";
    if (youtube) youtube.value = item.youtube_url || item.youtube_video_id || "";
    if (startOffset) startOffset.value = formatTimecode(item.start_offset_seconds || 0);

    this.aliasDirty = false;
    this.setAliases(this.getAliasesForTrack(item), { markDirty: false });
    this.renderFamilyOptions();
  }

  clearForm() {
    document.getElementById("validation-end-offset").value = "";
    this.seedField.sync(null, "", true);
    const category = document.getElementById("validation-category");
    const family = document.getElementById("validation-family-name");
    const title = document.getElementById("validation-track-title");
    const artist = document.getElementById("validation-track-artist");
    const youtube = document.getElementById("validation-youtube-url");
    const startOffset = document.getElementById("validation-start-offset");

    if (category) category.value = "";
    if (family) family.value = "";
    if (title) title.value = "";
    if (artist) artist.value = "";
    if (youtube) youtube.value = "";
    if (startOffset) startOffset.value = "0";

    this.aliasDirty = false;
    this.setAliases([], { markDirty: false });
    this.renderFamilyOptions();
    this.setFormDisabled(true);
  }

  setFormDisabled(disabled) {
    [
      "validation-category",
      "validation-family-name",
      "validation-track-title",
      "validation-track-artist",
      "validation-youtube-url",
      "validation-start-offset",
      "validation-end-offset",
      "validation-notoriety-seed",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });

    const aliasDisabled = disabled || !this.aliasesAvailable;
    ["validation-alias-input", "btn-validation-add-alias"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = aliasDisabled;
    });
  }

  updateTitleFromForm() {
    const title = document.getElementById("validation-detail-title");
    if (!title) return;

    const value = String(document.getElementById("validation-track-title")?.value || "").trim();
    title.textContent = value || "Sans titre";
  }

  updatePreviewFromForm(play = false) {
    const frame = document.getElementById("validation-preview-frame");
    const empty = document.getElementById("validation-preview-empty");
    const url = document.getElementById("validation-track-url");
    const openYoutube = document.getElementById("btn-validation-open-youtube");
    const videoId = extractYouTubeVideoId(this.getYoutubeInput());
    let bounds;
    try { bounds = this.getBounds(); } catch (error) { this.setStatus(error.message, false); return; }
    const startOffset = bounds.start;
    let embedUrl = buildYouTubeEmbedUrl(videoId, startOffset);
    if (embedUrl) {
      const parsed = new URL(embedUrl);
      if (bounds.end !== null) parsed.searchParams.set("end", String(bounds.end));
      if (play) parsed.searchParams.set("autoplay", "1");
      embedUrl = parsed.toString();
    }
    const youtubeUrl = buildYouTubeWatchUrl(videoId, startOffset);

    if (frame) {
      frame.hidden = !embedUrl;
      if (embedUrl) {
        if (play || frame.getAttribute("src") !== embedUrl) frame.src = embedUrl;
      } else {
        frame.removeAttribute("src");
      }
    }

    if (empty) {
      empty.hidden = Boolean(embedUrl);
      if (!embedUrl) {
        empty.innerHTML = `<p class="mq-muted">Impossible de générer la preview YouTube. Corrige l'ID ou l'URL avant validation.</p>`;
      }
    }

    if (url) {
      url.textContent = youtubeUrl || "Aucun lien";
      url.href = youtubeUrl || "#";
    }

    if (openYoutube) {
      openYoutube.disabled = !youtubeUrl || !this.getSelectedItem();
    }
  }

  async validateSelected() {
    const item = this.getSelectedItem();
    if (!item || this.saving) return;

    const payload = this.getValidationPayload(item);
    if (!payload) return;
    const index = this.items.findIndex((entry) => Number(entry.id) === Number(item.id));
    const nextId = this.items[index + 1]?.id ?? this.items[index - 1]?.id ?? null;

    this.saving = true;
    document.getElementById("btn-validation-approve").disabled = true;
    const res = await window.httpClient.validateTrack(payload);
    this.saving = false;
    if (this.isDestroyed) return;
    document.getElementById("btn-validation-approve").disabled = false;
    this.setStatus(res.success ? "Musique validée avec corrections appliquées" : (res.error || "Erreur"), res.success);
    if (res.success) {
      this.selectedId = nextId;
      this.families = [];
      await this.refresh();
    }
  }

  async rejectSelected() {
    const item = this.getSelectedItem();
    if (!item) return;

    const title = String(item.title || `#${item.id}`).trim();
    const confirmed = await confirmDeletion({
      entityLabel: "la musique",
      itemName: title,
      title: "Refuser cette musique",
      confirmLabel: "Refuser et supprimer",
    });
    if (!confirmed) return;

    const res = await window.httpClient.deleteTrack(Number(item.id));
    this.setStatus(res.success ? "Musique refusée et supprimée" : (res.error || "Erreur"), res.success);
    if (res.success) {
      this.selectedId = null;
      await this.refresh();
    }
  }

  getValidationPayload(item) {
    const categoryId = this.getFormCategoryId();
    const familyName = String(document.getElementById("validation-family-name")?.value || "").trim();
    const title = String(document.getElementById("validation-track-title")?.value || "").trim();
    const artist = String(document.getElementById("validation-track-artist")?.value || "").trim();
    const youtubeVideoId = extractYouTubeVideoId(this.getYoutubeInput());
    let bounds;
    try { bounds = this.getBounds(); } catch (error) { this.setStatus(error.message, false); return null; }

    if (categoryId <= 0) {
      this.setStatus("Catégorie requise avant validation", false);
      return null;
    }
    if (!familyName) {
      this.setStatus("Œuvre requise avant validation", false);
      return null;
    }
    if (!title) {
      this.setStatus("Libellé de piste requis avant validation", false);
      return null;
    }
    if (!youtubeVideoId) {
      this.setStatus("ID ou URL YouTube invalide", false);
      return null;
    }

    const payload = {
      track_id: Number(item.id),
      category_id: categoryId,
      family_name: familyName,
      title,
      artist,
      youtube_video_id: youtubeVideoId,
      start_offset_seconds: bounds.start,
      end_offset_seconds: bounds.end,
      ...this.seedField.payload(),
    };

    if (this.aliasesAvailable) {
      payload.aliases = [...this.aliases];
    }

    return payload;
  }

  handleAliasInputKeydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    this.addAliasFromInput();
  }

  addAliasFromInput() {
    const input = document.getElementById("validation-alias-input");
    if (!input || input.disabled) return;

    const value = String(input.value || "").trim();
    if (!value) return;

    const nextAliases = [...this.aliases];
    this.parseAliases(value).forEach((alias) => {
      if (this.hasAlias(nextAliases, alias)) return;
      nextAliases.push(alias);
    });

    input.value = "";
    this.setAliases(nextAliases, { markDirty: true });
  }

  setAliases(values, options = {}) {
    this.aliases = this.parseAliases(Array.isArray(values) ? values.join("\n") : values);
    if (options.markDirty) {
      this.aliasDirty = true;
    }
    this.renderAliasList();
  }

  renderAliasList() {
    const list = document.getElementById("validation-alias-list");
    if (!list) return;

    if (!this.aliasesAvailable) {
      list.innerHTML = `
        <div class="mq-alias-empty">
          <span>Alias indisponibles pour le moment.</span>
        </div>
      `;
      return;
    }

    if (!this.aliases.length) {
      list.innerHTML = `
        <div class="mq-alias-empty">
          <span>Aucun alias ajouté pour le moment.</span>
        </div>
      `;
      return;
    }

    list.innerHTML = this.aliases.map((alias, index) => `
      <div class="mq-alias-item">
        <span>${this.escapeHtml(alias)}</span>
        <button type="button" class="mq-danger mq-alias-item__remove" data-alias-index="${index}" aria-label="Supprimer l'alias ${this.escapeHtml(alias)}">X</button>
      </div>
    `).join("");

    list.querySelectorAll("[data-alias-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const aliasIndex = Number(button.dataset.aliasIndex);
        this.aliases = this.aliases.filter((_, index) => index !== aliasIndex);
        this.aliasDirty = true;
        this.renderAliasList();
      });
    });
  }

  syncAliasesFromSelectedFamily() {
    const name = document.getElementById("validation-family-name")?.value || "";
    const category = this.getFormCategoryId();
    this.seedField.sync(this.findMatchingFamily(category, name), `${category}:${this.normalizeSearch(name)}`);
    if (this.aliasDirty || !this.aliasesAvailable) return;

    const family = this.findMatchingFamily(
      this.getFormCategoryId(),
      document.getElementById("validation-family-name")?.value || "",
    );
    this.setAliases(family?.aliases || [], { markDirty: false });
  }

  getAliasesForTrack(item) {
    const family = this.findFamilyById(item.family_id)
      || this.findMatchingFamily(item.category_id, item.family_name);
    return family?.aliases || [];
  }

  findFamilyById(familyId) {
    const id = Number(familyId || 0);
    if (id <= 0) return null;
    return this.families.find((family) => Number(family.id) === id) || null;
  }

  findMatchingFamily(categoryId, familyName) {
    const normalizedName = this.normalizeSearch(familyName);
    const normalizedCategoryId = Number(categoryId || 0);
    if (!normalizedName || normalizedCategoryId <= 0) return null;

    return this.families.find((family) => {
      return Number(family.category_id) === normalizedCategoryId
        && this.normalizeSearch(family.name) === normalizedName;
    }) || null;
  }

  parseAliases(rawValue) {
    const seen = new Set();
    const values = String(rawValue || "")
      .split(/\r?\n|,|;/)
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return values.filter((value) => {
      const key = this.normalizeAlias(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  hasAlias(aliases, value) {
    const key = this.normalizeAlias(value);
    return aliases.some((alias) => this.normalizeAlias(alias) === key);
  }

  normalizeAlias(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  openSelectedTrackOnYouTube() {
    let bounds;
    try { bounds = this.getBounds(); } catch (error) { this.setStatus(error.message, false); return; }
    const youtubeUrl = buildYouTubeWatchUrl(extractYouTubeVideoId(this.getYoutubeInput()), bounds.start);
    if (!youtubeUrl) return;
    window.open(youtubeUrl, "_blank", "noopener,noreferrer");
  }

  getFormCategoryId() {
    return Number(document.getElementById("validation-category")?.value || 0);
  }

  getYoutubeInput() {
    return String(document.getElementById("validation-youtube-url")?.value || "").trim();
  }

  getBounds() {
    const start = parseTimecode(document.getElementById("validation-start-offset")?.value);
    const end = parseTimecode(document.getElementById("validation-end-offset")?.value, true);
    if (end !== null && end <= start) throw new Error("La fin doit être après le début de l’extrait.");
    return { start, end };
  }

  destroy() {
    this.isDestroyed = true;
    clearTimeout(this.searchTimer);
  }

  getSelectedItem() {
    return this.items.find((item) => Number(item.id) === Number(this.selectedId)) || null;
  }

  formatDate(value) {
    return formatDate(value);
  }

  normalizeSearch(value) {
    return normalizeSearch(value);
  }

  setStatus(text, ok) {
    const el = document.getElementById("validation-status");
    if (!el) return;
    el.textContent = text;
    el.className = ok ? "status success" : "status error";
  }

  escapeHtml(value) {
    return escapeHtml(value);
  }

  escapeAttribute(value) {
    return escapeAttribute(value);
  }
}
