import { escapeAttribute, escapeHtml, formatDate } from "../utils/ui.js?v=20260617-admin-workflow";

export class ManagementAnswersController {
  constructor() {
    this.groups = [];
    this.items = [];
    this.outcome = "wrong";
    this.search = "";

    document.getElementById("btn-answers-back")?.addEventListener("click", () => window.appCtrl.changeView("management"));
    document.getElementById("btn-answers-refresh")?.addEventListener("click", () => this.refresh());
    document.getElementById("answers-filter-outcome")?.addEventListener("change", (event) => {
      this.outcome = String(event?.target?.value || "wrong");
      this.refresh();
    });
    document.getElementById("answers-filter-search")?.addEventListener("input", (event) => {
      this.search = String(event?.target?.value || "").trim();
      window.clearTimeout(this.searchTimeout);
      this.searchTimeout = window.setTimeout(() => this.refresh(), 260);
    });
    document.getElementById("btn-answers-clear")?.addEventListener("click", () => this.clearFilters());

    this.refresh();
  }

  async refresh() {
    const res = await window.httpClient.listAnswerAttempts({
      outcome: this.outcome,
      search: this.search,
    });

    if (!res.success) {
      this.setStatus(res.error || "Erreur", false);
      return;
    }

    this.groups = res.data?.groups ?? [];
    this.items = res.data?.items ?? [];
    this.renderCounters();
    this.renderGroups();
    this.renderAttempts();
    this.setStatus("Réponses chargées.", true);
  }

  renderCounters() {
    const counter = document.getElementById("answers-count");
    if (!counter) return;

    counter.textContent = `${this.groups.length} idées / ${this.items.length} essais`;
  }

  renderGroups() {
    const list = document.getElementById("answers-groups");
    if (!list) return;

    if (!this.groups.length) {
      list.innerHTML = `
        <div class="mq-admin-empty">
          <strong>Aucune idée détectée</strong>
          <p class="mq-muted">Change le filtre ou attends plus de parties.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.groups.map((item) => `
      <button type="button" class="mq-admin-item mq-answer-group" data-answer-search="${this.escapeAttribute(item.guess_text || "")}">
        <strong>${this.escapeHtml(item.guess_text || "Réponse vide")}</strong>
        <div class="mq-admin-item__meta">
          <span class="mq-admin-badge">${Number(item.attempt_count || 0)} essais</span>
          <span class="mq-admin-badge">${Number(item.user_count || 0)} joueurs</span>
          <span class="mq-admin-badge">${Number(item.track_count || 0)} musiques</span>
          ${Number(item.correct_count || 0) > 0 ? `<span class="mq-admin-badge mq-admin-badge--success">${Number(item.correct_count)} correctes</span>` : ""}
        </div>
        <div class="mq-admin-submeta">
          ${this.escapeHtml(item.expected_answers || "Solutions variées")}
        </div>
        <div class="mq-admin-submeta">
          Dernière fois: ${this.escapeHtml(this.formatDate(item.last_at))}
        </div>
      </button>
    `).join("");

    list.querySelectorAll("[data-answer-search]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = String(button.getAttribute("data-answer-search") || "").trim();
        const input = document.getElementById("answers-filter-search");
        if (input) input.value = value;
        this.search = value;
        this.refresh();
      });
    });
  }

  renderAttempts() {
    const list = document.getElementById("answers-attempts");
    if (!list) return;

    if (!this.items.length) {
      list.innerHTML = `
        <div class="mq-admin-empty">
          <strong>Aucun essai</strong>
          <p class="mq-muted">Le filtre actuel ne remonte aucune réponse joueur.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.items.map((item) => `
      <article class="mq-admin-item mq-answer-attempt">
        <strong>${this.escapeHtml(item.guess_text || "Réponse vide")}</strong>
        <div class="mq-admin-item__meta">
          <span class="mq-admin-badge ${Number(item.is_correct) === 1 ? "mq-admin-badge--success" : "mq-admin-badge--pending"}">
            ${Number(item.is_correct) === 1 ? "Trouvée" : "Ratée"}
          </span>
          ${Number(item.score_awarded || 0) > 0 ? `<span class="mq-admin-badge mq-admin-badge--success">+${Number(item.score_awarded)} pt</span>` : ""}
          <span class="mq-muted">${this.escapeHtml(item.username || "Joueur")}</span>
          <span class="mq-muted">${this.escapeHtml(this.formatDate(item.created_at))}</span>
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

  clearFilters() {
    this.outcome = "wrong";
    this.search = "";

    const outcome = document.getElementById("answers-filter-outcome");
    const search = document.getElementById("answers-filter-search");
    if (outcome) outcome.value = "wrong";
    if (search) search.value = "";

    this.refresh();
  }

  formatDate(value) {
    return formatDate(value);
  }

  setStatus(text, ok = null) {
    const el = document.getElementById("answers-status");
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
