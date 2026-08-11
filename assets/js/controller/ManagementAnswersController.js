import { escapeAttribute, escapeHtml, formatDate } from "../utils/ui.js?v=20260617-admin-workflow";

export class ManagementAnswersController {
  constructor() {
    this.aliasCandidates = [];
    this.contentIdeas = [];
    this.items = [];
    this.categories = [];
    this.summary = {};
    this.outcome = "wrong";
    this.categoryId = "";
    this.period = "90";
    this.search = "";
    this.insightMode = "aliases";
    this.refreshSequence = 0;

    document.getElementById("btn-answers-back")?.addEventListener("click", () => window.appCtrl.changeView("management"));
    document.getElementById("btn-answers-refresh")?.addEventListener("click", () => this.refresh());
    document.getElementById("answers-filter-outcome")?.addEventListener("change", (event) => {
      this.outcome = String(event?.target?.value || "wrong");
      this.refresh();
    });
    document.getElementById("answers-filter-category")?.addEventListener("change", (event) => {
      this.categoryId = String(event?.target?.value || "");
      this.refresh();
    });
    document.getElementById("answers-filter-period")?.addEventListener("change", (event) => {
      this.period = String(event?.target?.value || "90");
      this.refresh();
    });
    document.getElementById("answers-filter-search")?.addEventListener("input", (event) => {
      this.search = String(event?.target?.value || "").trim();
      window.clearTimeout(this.searchTimeout);
      this.searchTimeout = window.setTimeout(() => this.refresh(), 280);
    });
    document.getElementById("btn-answers-clear")?.addEventListener("click", () => this.clearFilters());
    document.getElementById("btn-answers-aliases")?.addEventListener("click", () => this.setInsightMode("aliases"));
    document.getElementById("btn-answers-ideas")?.addEventListener("click", () => this.setInsightMode("ideas"));

    this.initialize();
  }

  async initialize() {
    const categoriesRes = await window.httpClient.listCategories();
    this.categories = categoriesRes.success ? (categoriesRes.data?.items ?? []) : [];
    this.renderCategoryOptions();
    await this.refresh();
  }

  async refresh() {
    const sequence = ++this.refreshSequence;
    this.setStatus("Analyse en cours…");
    const res = await window.httpClient.listAnswerAttempts({
      outcome: this.outcome,
      category_id: this.categoryId,
      period: this.period,
      search: this.search,
    });
    if (sequence !== this.refreshSequence) return;

    if (!res.success) {
      this.setStatus(res.error || "Impossible de charger les réponses.", false);
      return;
    }

    this.aliasCandidates = res.data?.alias_candidates ?? res.data?.groups ?? [];
    this.contentIdeas = res.data?.content_ideas ?? [];
    this.items = res.data?.items ?? [];
    this.summary = res.data?.summary ?? {};
    this.renderSummary();
    this.renderInsights();
    this.renderAttempts();
    this.setStatus(this.summary.truncated ? "Résultats principaux affichés." : "Analyse à jour.", true);
  }

  renderCategoryOptions() {
    const select = document.getElementById("answers-filter-category");
    if (!select) return;
    const options = this.categories
      .map((item) => `<option value="${Number(item.id)}">${this.escapeHtml(item.name)}</option>`)
      .join("");
    select.innerHTML = `<option value="">Toutes les catégories</option>${options}`;
    select.value = this.categoryId;
  }

  renderSummary() {
    this.setText("answers-count", `${Number(this.summary.attempt_count || 0)} essais analysés`);
    this.setText("answers-alias-count", `${this.aliasCandidates.length} alias à examiner`);
    this.setText("answers-ideas-count", `${this.contentIdeas.length} idées`);
    this.setText("answers-visible-count", `${this.items.length} affichés`);
  }

  setInsightMode(mode) {
    this.insightMode = mode === "ideas" ? "ideas" : "aliases";
    const aliasesButton = document.getElementById("btn-answers-aliases");
    const ideasButton = document.getElementById("btn-answers-ideas");
    const showingAliases = this.insightMode === "aliases";
    aliasesButton?.classList.toggle("is-active", showingAliases);
    aliasesButton?.setAttribute("aria-selected", String(showingAliases));
    ideasButton?.classList.toggle("is-active", !showingAliases);
    ideasButton?.setAttribute("aria-selected", String(!showingAliases));
    this.setText("answers-insight-title", showingAliases ? "Alias à examiner" : "Idées de contenu");
    this.renderInsights();
  }

  renderInsights() {
    if (this.insightMode === "ideas") {
      this.renderContentIdeas();
      return;
    }
    this.renderAliasCandidates();
  }

  renderAliasCandidates() {
    const list = document.getElementById("answers-insights");
    if (!list) return;
    if (!this.aliasCandidates.length) {
      list.innerHTML = this.emptyState("Aucun alias à examiner", "Les essais du filtre actuel ne font ressortir aucune variante utile.");
      return;
    }

    list.innerHTML = this.aliasCandidates.map((item, index) => `
      <article class="mq-admin-item mq-answer-insight">
        <div class="mq-answer-insight__heading">
          <div>
            <strong>${this.escapeHtml(item.guess_text || "Réponse vide")}</strong>
            <span>pour ${this.escapeHtml(item.family_name || "œuvre supprimée")}</span>
          </div>
          <span class="mq-admin-badge ${this.confidenceClass(item.confidence)}">${this.confidenceLabel(item.confidence)}</span>
        </div>
        <div class="mq-admin-item__meta">
          <span class="mq-admin-badge">${Number(item.attempt_count || 0)} essais</span>
          <span class="mq-admin-badge">${Number(item.user_count || 0)} joueurs</span>
          <span class="mq-admin-badge">${Number(item.expected_similarity || 0)}% proche</span>
          <span class="mq-muted">${this.escapeHtml(item.category_name || "Sans catégorie")}</span>
        </div>
        ${this.renderVariants(item.variants)}
        <div class="mq-actions mq-answer-insight__actions">
          ${item.can_add_alias ? `<button type="button" data-add-alias="${index}">Ajouter comme alias</button>` : `<span class="mq-admin-badge mq-admin-badge--success">Déjà accepté</span>`}
          <button type="button" class="mq-secondary" data-filter-answer="${this.escapeAttribute(item.guess_text || "")}">Voir les essais</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-add-alias]").forEach((button) => {
      button.addEventListener("click", () => this.addAlias(Number(button.dataset.addAlias), button));
    });
    this.bindAnswerFilters(list);
  }

  renderContentIdeas() {
    const list = document.getElementById("answers-insights");
    if (!list) return;
    if (!this.contentIdeas.length) {
      list.innerHTML = this.emptyState("Aucune idée récurrente", "Les réponses du filtre actuel ne signalent pas encore de contenu manifestement attendu.");
      return;
    }

    list.innerHTML = this.contentIdeas.map((item, index) => `
      <article class="mq-admin-item mq-answer-insight">
        <div class="mq-answer-insight__heading">
          <div>
            <strong>${this.escapeHtml(item.guess_text || "Réponse vide")}</strong>
            <span>proposée face à ${Number(item.family_count || 0)} œuvres</span>
          </div>
          <span class="mq-admin-badge mq-admin-badge--pending">À explorer</span>
        </div>
        <div class="mq-admin-item__meta">
          <span class="mq-admin-badge">${Number(item.attempt_count || 0)} essais</span>
          <span class="mq-admin-badge">${Number(item.user_count || 0)} joueurs</span>
          ${(item.categories || []).slice(0, 2).map((value) => `<span class="mq-muted">${this.escapeHtml(value)}</span>`).join("")}
        </div>
        ${this.renderVariants(item.variants)}
        <div class="mq-answer-insight__context">
          <span>À la place de :</span>
          <strong>${this.escapeHtml((item.expected_answers || []).slice(0, 4).join(" · ") || "plusieurs œuvres")}</strong>
        </div>
        <div class="mq-actions mq-answer-insight__actions">
          <button type="button" data-prepare-idea="${index}">Préparer une musique</button>
          <button type="button" class="mq-secondary" data-filter-answer="${this.escapeAttribute(item.guess_text || "")}">Voir les essais</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-prepare-idea]").forEach((button) => {
      button.addEventListener("click", () => this.prepareContentIdea(Number(button.dataset.prepareIdea)));
    });
    this.bindAnswerFilters(list);
  }

  renderAttempts() {
    const list = document.getElementById("answers-attempts");
    if (!list) return;
    if (!this.items.length) {
      list.innerHTML = this.emptyState("Aucun essai", "Aucune réponse ne correspond aux filtres actuels.");
      return;
    }

    list.innerHTML = this.items.map((item) => `
      <article class="mq-admin-item mq-answer-attempt">
        <div class="mq-answer-insight__heading">
          <strong>${this.escapeHtml(item.guess_text || "Réponse vide")}</strong>
          <span class="mq-admin-badge ${Number(item.is_correct) === 1 ? "mq-admin-badge--success" : "mq-admin-badge--pending"}">
            ${Number(item.is_correct) === 1 ? "Trouvée" : "Ratée"}
          </span>
        </div>
        <div class="mq-admin-item__meta">
          ${Number(item.score_awarded || 0) > 0 ? `<span class="mq-admin-badge mq-admin-badge--success">+${Number(item.score_awarded)} pt</span>` : ""}
          <span class="mq-muted">${this.escapeHtml(item.username || "Joueur")}</span>
          <span class="mq-muted">${this.escapeHtml(this.formatDate(item.attempted_at))}</span>
          <span class="mq-admin-badge">${item.source === "history" ? "Historique" : "Salon en cours"}</span>
        </div>
        <div class="mq-answer-attempt__context">
          <span>${this.escapeHtml(item.category_name || "Sans catégorie")}</span>
          <span>${this.escapeHtml(item.family_name || "Sans œuvre")}</span>
          <span>${this.escapeHtml(item.track_title || "Sans piste")}</span>
          ${item.lobby_code ? `<span>Salon ${this.escapeHtml(item.lobby_code)}</span>` : ""}
        </div>
      </article>
    `).join("");
  }

  async addAlias(index, button) {
    const item = this.aliasCandidates[index];
    if (!item?.can_add_alias || !button) return;
    button.disabled = true;
    button.textContent = "Ajout…";
    const res = await window.httpClient.addFamilyAlias({
      family_id: Number(item.family_id),
      alias: String(item.guess_text || "").trim(),
    });
    if (!res.success) {
      button.disabled = false;
      button.textContent = "Ajouter comme alias";
      this.setStatus(res.error || "Impossible d'ajouter l'alias.", false);
      return;
    }

    this.setStatus(res.data?.added ? "Alias ajouté à l'œuvre." : "Cet alias était déjà accepté.", true);
    await this.refresh();
  }

  prepareContentIdea(index) {
    const item = this.contentIdeas[index];
    if (!item) return;
    window.sessionStorage.setItem("mq.admin.track-draft", JSON.stringify({
      categoryId: Number(item.recommended_category_id || 0) || null,
      familyName: String(item.guess_text || "").trim(),
    }));
    window.appCtrl.changeView("management-tracks");
  }

  bindAnswerFilters(root) {
    root.querySelectorAll("[data-filter-answer]").forEach((button) => {
      button.addEventListener("click", () => this.filterByAnswer(button.getAttribute("data-filter-answer")));
    });
  }

  filterByAnswer(value) {
    this.search = String(value || "").trim();
    const input = document.getElementById("answers-filter-search");
    if (input) input.value = this.search;
    this.refresh();
  }

  clearFilters() {
    this.outcome = "wrong";
    this.categoryId = "";
    this.period = "90";
    this.search = "";

    const outcome = document.getElementById("answers-filter-outcome");
    const category = document.getElementById("answers-filter-category");
    const period = document.getElementById("answers-filter-period");
    const search = document.getElementById("answers-filter-search");
    if (outcome) outcome.value = this.outcome;
    if (category) category.value = this.categoryId;
    if (period) period.value = this.period;
    if (search) search.value = this.search;
    this.refresh();
  }

  renderVariants(variants) {
    const values = Array.isArray(variants) ? variants.filter(Boolean) : [];
    if (values.length <= 1) return "";
    return `
      <div class="mq-answer-variants">
        <span>Variantes regroupées</span>
        <strong>${this.escapeHtml(values.slice(0, 5).join(" · "))}</strong>
      </div>
    `;
  }

  confidenceLabel(value) {
    if (value === "strong") return "Signal fort";
    if (value === "medium") return "Signal régulier";
    return "À vérifier";
  }

  confidenceClass(value) {
    if (value === "strong") return "mq-admin-badge--success";
    if (value === "medium") return "mq-admin-badge--pending";
    return "";
  }

  emptyState(title, text) {
    return `
      <div class="mq-admin-empty">
        <strong>${this.escapeHtml(title)}</strong>
        <p class="mq-muted">${this.escapeHtml(text)}</p>
      </div>
    `;
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  formatDate(value) {
    return formatDate(value);
  }

  setStatus(text, ok = null) {
    const element = document.getElementById("answers-status");
    if (!element) return;
    element.textContent = text || "";
    element.className = ok === true ? "status success" : (ok === false ? "status error" : "status");
  }

  escapeHtml(value) {
    return escapeHtml(value);
  }

  escapeAttribute(value) {
    return escapeAttribute(value);
  }
}
