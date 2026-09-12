export function setupGameMenu(header, headerHtml) {
  header.innerHTML = `
    <dialog id="game-menu" class="mq-game-drawer" aria-label="Menu de la partie">
      <button type="button" class="mq-secondary mq-icon-button mq-drawer-close" aria-label="Fermer le menu" title="Fermer">×</button>
      ${headerHtml}
      <div id="game-menu-options" class="mq-drawer-options"></div>
    </dialog>`;
  const dialog = header.querySelector("dialog");
  const trigger = document.getElementById("btn-game-menu");
  document.querySelectorAll("[data-game-menu-options]").forEach((node) => {
    dialog.querySelector("#game-menu-options").append(node);
  });
  trigger?.addEventListener("click", () => {
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
  });
  dialog.querySelector(".mq-drawer-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger?.setAttribute("aria-expanded", "false"));
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
