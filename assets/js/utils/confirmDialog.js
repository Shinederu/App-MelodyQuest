let activeDialogCloser = null;
let dialogSequence = 0;

export function buildDeleteConfirmationText(entityLabel, itemName = "") {
  const label = String(entityLabel || "").trim() || "cet élément";
  const name = String(itemName || "").trim();

  return name
    ? `Êtes-vous sûr de vouloir supprimer ${label} « ${name} » ?`
    : `Êtes-vous sûr de vouloir supprimer ${label} ?`;
}

export function confirmDeletion({
  entityLabel = "cet élément",
  itemName = "",
  title = "Confirmer la suppression",
  confirmLabel = "Supprimer",
} = {}) {
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  activeDialogCloser?.(false);

  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const dialogId = `mq-confirm-title-${++dialogSequence}`;
    const root = document.createElement("div");
    root.className = "mq-modal";
    root.setAttribute("role", "presentation");
    root.innerHTML = `
      <div class="mq-modal__backdrop" data-confirm-cancel></div>
      <section
        class="mq-card mq-modal__panel mq-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="${dialogId}"
        aria-describedby="${dialogId}-message"
      >
        <h2 id="${dialogId}"></h2>
        <p id="${dialogId}-message" class="mq-confirm-dialog__message"></p>
        <div class="mq-confirm-dialog__actions">
          <button type="button" class="mq-secondary" data-confirm-cancel>Annuler</button>
          <button type="button" class="mq-danger" data-confirm-accept></button>
        </div>
      </section>
    `;

    root.querySelector(`#${dialogId}`).textContent = title;
    root.querySelector(`#${dialogId}-message`).textContent =
      buildDeleteConfirmationText(entityLabel, itemName);

    const confirmButton = root.querySelector("[data-confirm-accept]");
    confirmButton.textContent = confirmLabel;

    let settled = false;
    const close = (confirmed) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", handleKeydown);
      root.remove();
      document.body.classList.remove("mq-modal-open");
      if (activeDialogCloser === close) {
        activeDialogCloser = null;
      }
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
      resolve(confirmed);
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...root.querySelectorAll("button:not([disabled])")];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    root.querySelectorAll("[data-confirm-cancel]").forEach((element) => {
      element.addEventListener("click", () => close(false));
    });
    confirmButton.addEventListener("click", () => close(true));
    document.addEventListener("keydown", handleKeydown);

    activeDialogCloser = close;
    document.body.appendChild(root);
    document.body.classList.add("mq-modal-open");

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => confirmButton.focus());
    } else {
      confirmButton.focus();
    }
  });
}
