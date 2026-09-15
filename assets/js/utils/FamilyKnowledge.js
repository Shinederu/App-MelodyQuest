import { NOTORIETY_DEFAULT } from "./Notoriety.js?v=20260915-notoriety-votes";
import { getActorId, getStoredPlayerIdentity } from "./PlayerIdentity.js?v=20260831-guest-mode";

export function formatKnowledge(summary) {
  const total = Number(summary?.vote_count || 0);
  const percent = Number(summary?.notoriety_percent ?? summary?.notoriety_seed ?? NOTORIETY_DEFAULT);
  return `Notoriété : ${percent} % · ${total ? `${total} avis` : "estimation initiale"}`;
}

export class FamilyKnowledge {
  constructor({ prefix, getLobbyId, client = window.httpClient,
    isAccount = () => getActorId(getStoredPlayerIdentity()) > 0 }) {
    this.root = document.getElementById(`${prefix}-knowledge`);
    this.getLobbyId = getLobbyId;
    this.client = client;
    this.isAccount = isAccount;
    this.roundId = 0;
    this.destroyed = false;
    this.busy = false;
    this.data = null;
    if (!this.root) return;
    this.root.innerHTML = `<span>Tu connaissais cette œuvre ?</span>
      <div class="mq-knowledge-choices" role="group" aria-label="Connaissance de l’œuvre">
        <button type="button" class="mq-secondary" data-known="yes" aria-pressed="false">Oui</button>
        <button type="button" class="mq-secondary" data-known="no" aria-pressed="false">Non</button>
      </div>
      <small class="mq-muted" data-knowledge-result role="status"></small>
      <button type="button" class="mq-secondary" data-knowledge-retry hidden>Réessayer</button>`;
    this.root.querySelectorAll("[data-known]").forEach((button) => {
      button.addEventListener("click", () => this.request(button.dataset.known === "yes"));
    });
    this.root.querySelector("[data-knowledge-retry]").addEventListener("click", () => this.request(this.retryChoice));
  }

  update(round) {
    if (this.destroyed || !this.root) return;
    if (!this.isAccount()) {
      this.root.hidden = true;
      this.roundId = 0;
      this.data = null;
      return;
    }
    const visible = Number(round?.track?.family_id) > 0 && !round?.unavailable_skip_at_unix;
    this.root.hidden = !visible;
    if (!visible || this.roundId === Number(round.id)) return;
    this.roundId = Number(round.id);
    this.data = null;
    this.retryChoice = undefined;
    this.busy = false;
    this.request();
  }

  async request(choice) {
    if (this.destroyed || this.busy || !this.roundId || !this.isAccount()) return;
    if (typeof choice === "boolean" && (!this.data || this.data.choice != null || this.data.can_vote === false)) return;
    this.busy = true;
    this.retryChoice = choice;
    const roundId = this.roundId;
    const payload = { lobby_id: this.getLobbyId(), round_id: roundId };
    this.render();
    try {
      const res = typeof choice === "boolean"
        ? await this.client.voteFamilyKnowledge({ ...payload, known: choice })
        : await this.client.getFamilyKnowledge(payload);
      if (this.destroyed || roundId !== this.roundId) return;
      if (!res.success) throw new Error(res.error || "Vote indisponible");
      this.data = res.data;
      this.busy = false;
      this.render();
    } catch {
      if (this.destroyed || roundId !== this.roundId) return;
      this.busy = false;
      this.render("Vote indisponible. Réessaie.");
    }
  }

  render(error = "") {
    this.root.querySelectorAll("[data-known]").forEach((button) => {
      button.disabled = this.busy || !this.data || this.data.choice != null || this.data.can_vote === false;
      button.setAttribute("aria-pressed", String(this.data?.choice === (button.dataset.known === "yes")));
    });
    this.root.querySelector("[data-knowledge-result]").textContent = error || (this.busy ? "…" : this.data?.choice != null ? formatKnowledge(this.data) : "");
    this.root.querySelector("[data-knowledge-retry]").hidden = !error;
  }

  destroy() {
    this.destroyed = true;
  }
}
