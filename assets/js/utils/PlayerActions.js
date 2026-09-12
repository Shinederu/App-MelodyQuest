import { escapeHtml } from "./ui.js?v=20260912-game-ui";

export function openPlayerActions(player, onPresence, onKick) {
  document.getElementById("player-actions-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "player-actions-dialog";
  dialog.className = "mq-player-dialog";
  dialog.setAttribute("aria-labelledby", "player-actions-title");
  dialog.innerHTML = `
    <h3 id="player-actions-title">${escapeHtml(player.username)}</h3>
    <button type="button" data-presence class="mq-secondary">${player.presence_status === "away" ? "Remettre présent" : "Mettre absent"}</button>
    <button type="button" data-kick class="mq-danger">Exclure du salon</button>
    <button type="button" data-close class="mq-secondary">Annuler</button>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.querySelector("[data-presence]").onclick = () => { dialog.close(); onPresence(); };
  dialog.querySelector("[data-kick]").onclick = () => { dialog.close(); onKick(); };
  dialog.showModal();
}
