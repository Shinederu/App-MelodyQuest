import { escapeHtml } from "../utils/ui.js?v=20260617-admin-workflow";
import { clearPlayerIdentity } from "../utils/PlayerIdentity.js?v=20260831-guest-mode";
import { setupGameMenu } from "../utils/GameMenu.js?v=20260912-game-ui-v2";

const PAGE_META = {
  "autoplay-setup": {
    eyebrow: "Mode automatique",
    title: "Préparer un blindtest",
    description: "Sans réponses à saisir, sans score, avec enchaînement automatique.",
  },
  autoplay: {
    eyebrow: "Mode automatique",
    title: "Lecture en cours",
    titleId: "autoplay-title",
    description: "Les musiques et les réponses s'enchaînent seules.",
  },
  "suggest-track": {
    eyebrow: "Contribution",
    title: "Proposer une musique",
    description: "Envoie une piste ou une correction à vérifier.",
  },
  "tv-link": {
    eyebrow: "Mode TV",
    title: "Lier un écran",
    description: "Associe une télévision au salon en cours.",
  },
  "lobby-list": {
    eyebrow: "Rejoindre",
    title: "Trouver une partie",
    description: "Entre un code ou choisis un salon public.",
  },
  lobby: {
    eyebrow: "Salon d'attente",
    title: "Salon",
    titleId: "lobby-title",
    description: "Chargement du salon...",
    descriptionId: "lobby-meta",
  },
  game: {
    eyebrow: "Session en cours",
    title: "Partie en cours",
    titleId: "game-title",
  },
  result: {
    eyebrow: "Fin de partie",
    title: "Partie terminée",
    titleId: "result-title",
    description: "Les scores sont posés. Le salon se prépare pour une revanche.",
  },
  management: {
    eyebrow: "Administration",
    title: "Management",
    description: "Gestion du catalogue MelodyQuest.",
  },
  "management-categories": {
    eyebrow: "Catalogue",
    title: "Gestion des catégories",
    description: "Sélectionne une catégorie ou crée-en une nouvelle.",
  },
  "management-families": {
    eyebrow: "Catalogue",
    title: "Gestion des œuvres",
    description: "Regroupe les musiques par réponse attendue.",
  },
  "management-tracks": {
    eyebrow: "Catalogue",
    title: "Gestion des musiques",
    description: "Ajoute et corrige les pistes jouables.",
  },
  "management-validation": {
    eyebrow: "Administration",
    title: "Vérification / validation",
    description: "Contrôle les nouvelles musiques avant de les rendre jouables.",
  },
  "management-suggestions": {
    eyebrow: "Administration",
    title: "Suggestions joueurs",
    description: "Trie les corrections, alias et nouvelles musiques proposés.",
  },
  "management-answers": {
    eyebrow: "Administration",
    title: "Réponses joueurs",
    description: "Repère les essais utiles pour enrichir le catalogue.",
  },
};

export class HeaderModel {
  refresh(headerElement, view, user = null) {
    if (view === "tv") {
      headerElement.innerHTML = "";
      return;
    }

    const username = String(user?.username || "");
    const isGuest = Boolean(user?.is_guest);
    const isAuthenticated = Boolean(user?.is_authenticated) && !isGuest;
    const isAdmin = Boolean(user?.is_admin) && isAuthenticated;
    const canLogout = isAuthenticated;

    let buttonHtml = "";
    if (canLogout) {
      buttonHtml = `<button id="header-btn-logout" type="button" class="mq-danger">Déconnexion</button>`;
    } else if (view === "public") {
      buttonHtml = `<button id="header-btn-play-as-guest" type="button">Continuer sans compte</button>`;
    } else {
      buttonHtml = `<button id="header-btn-login" type="button">Se connecter</button>`;
    }

    const roleLabel = isGuest ? "invité" : (isAdmin ? "admin" : (user?.role || "user"));
    const safeUsername = this.escapeHtml(username || "visiteur");
    const safeRole = this.escapeHtml(roleLabel);
    const page = this.getPageMeta(view);
    const pageHtml = page ? this.renderPageMeta(page) : "";

    const headerHtml = `
      <div class="mq-topbar">
        <div class="mq-topbar__brand">
          <div class="mq-topbar__eyebrow">MelodyQuest</div>
          <div class="mq-topbar__user">${username ? safeUsername : "MelodyQuest"}</div>
        </div>
        ${pageHtml}
        <div class="mq-topbar__actions">
          ${isGuest && view === "main" ? `<button id="btn-main-guest-rename" type="button" class="mq-secondary mq-icon-button" aria-label="Changer le pseudo" title="Changer le pseudo">✎</button>` : ""}
          ${username && !isGuest ? `<span class="mq-topbar__role">${safeRole}</span>` : ""}
          ${buttonHtml}
          ${isAdmin && ["game", "autoplay"].includes(view) ? '<a class="mq-nav-link" href="#/management">Administration</a>' : ""}
        </div>
      </div>
    `;

    if (view === "game" || view === "autoplay") {
      setupGameMenu(headerElement, headerHtml);
    } else {
      headerElement.innerHTML = headerHtml;
    }
    if (view.startsWith("management")) {
      const links = [["main", "Jouer"], ["management", "Vue d’ensemble"], ["management-validation", "À valider"], ["management-suggestions", "Propositions"], ["management-tracks", "Musiques"], ["management-families", "Œuvres"], ["management-categories", "Catégories"], ["management-answers", "Réponses"]];
      headerElement.insertAdjacentHTML("beforeend", `<nav class="mq-management-nav" aria-label="Administration">${links.map(([route, label]) => `<a href="#/${route}"${view === route ? ' aria-current="page"' : ''}>${label}</a>`).join("")}</nav>`);
      document.getElementById("app")?.classList.add("mq-management-app");
    } else {
      document.getElementById("app")?.classList.remove("mq-management-app");
    }

    if (canLogout) this.bindLogout();
    document.getElementById("header-btn-login")?.addEventListener("click", () => window.appCtrl.changeView("public"));
    document.getElementById("header-btn-play-as-guest")?.addEventListener("click", () => window.appCtrl.changeView("main"));
  }

  getPageMeta(view) {
    return PAGE_META[view] || null;
  }

  renderPageMeta(page) {
    const titleAttr = page.titleId ? ` id="${page.titleId}"` : "";
    const descriptionAttr = page.descriptionId ? ` id="${page.descriptionId}"` : "";
    const description = page.description
      ? `<p${descriptionAttr} class="mq-topbar__page-copy">${this.escapeHtml(page.description)}</p>`
      : "";
    const chips = Array.isArray(page.chips) && page.chips.length
      ? `
        <div class="mq-topbar__page-chips">
          ${page.chips.map((chip) => `<span id="${chip.id}" class="mq-chip">${this.escapeHtml(chip.text)}</span>`).join("")}
        </div>
      `
      : "";

    return `
      <div class="mq-topbar__page" aria-label="Page active">
        <div class="mq-topbar__page-eyebrow">${this.escapeHtml(page.eyebrow || "Page")}</div>
        <div class="mq-topbar__page-title">
          <strong${titleAttr}>${this.escapeHtml(page.title || "")}</strong>
          ${chips}
        </div>
        ${description}
      </div>
    `;
  }

  bindLogout() {
    const logoutButton = document.getElementById("header-btn-logout");
    logoutButton?.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Déconnexion...";

      const response = await window.httpClient.logout();
      if (response.success) {
        clearPlayerIdentity();
        window.appCtrl.changeView("main", { force: true });
        return;
      }

      logoutButton.disabled = false;
      logoutButton.textContent = "Erreur";
      logoutButton.title = response.error || "Déconnexion impossible";
      window.setTimeout(() => {
        if (document.body.contains(logoutButton)) {
          logoutButton.textContent = "Déconnexion";
          logoutButton.title = "";
        }
      }, 2200);
    });
  }

  escapeHtml(value) {
    return escapeHtml(value);
  }
}
