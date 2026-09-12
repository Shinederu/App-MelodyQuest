import assert from "node:assert/strict";
import test from "node:test";
import { setupGameMenu } from "../assets/js/utils/GameMenu.js";
import { TvLinkController } from "../assets/js/controller/TvLinkController.js";

test("TV linking names the actual return destination", (t) => {
  const button = {};
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; });
  globalThis.document = { getElementById: () => button };
  for (const [lobby, route, label] of [
    [{ id: 1 }, "lobby", "Retour au salon"],
    [{ id: 1 }, "game", "Retour à la partie"],
    [{ id: 1 }, "autoplay", "Retour à la partie"],
    [null, "lobby", "Retour au menu"],
  ]) {
    TvLinkController.prototype.renderLobbyContext.call({ currentLobby: lobby, returnView: route, setStatus() {} });
    assert.equal(button.textContent, label);
  }
});

test("game menu moves existing controls and restores the trigger state on close", (t) => {
  const makeNode = () => ({
    children: [], listeners: {}, attributes: {},
    append(node) { this.children.push(node); },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(key, value) { this.attributes[key] = value; },
  });
  const page = makeNode();
  const sections = [makeNode(), makeNode()];
  const leave = makeNode();
  const trigger = makeNode();
  const closeButton = makeNode();
  const slots = {
    ".mq-topbar__page": page,
    ".mq-drawer-context": makeNode(),
    "#game-menu-options": makeNode(),
    ".mq-drawer-exit": makeNode(),
    ".mq-drawer-close": closeButton,
  };
  const dialog = Object.assign(makeNode(), {
    querySelector: (selector) => slots[selector],
    showModal() { this.open = true; },
    close() { this.open = false; this.listeners.close(); },
    getBoundingClientRect: () => ({ left: 10, right: 390, top: 0, bottom: 480 }),
  });
  const header = { innerHTML: "", querySelector: () => dialog };
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; });
  globalThis.document = {
    getElementById: () => trigger,
    querySelectorAll: (selector) => selector === "[data-game-menu-options]" ? sections : [leave],
  };

  setupGameMenu(header, "<div>Account controls</div>");
  assert.deepEqual(slots[".mq-drawer-context"].children, [page]);
  assert.deepEqual(slots["#game-menu-options"].children, sections);
  assert.deepEqual(slots[".mq-drawer-exit"].children, [leave]);
  assert.ok(header.innerHTML.indexOf("game-menu-options") < header.innerHTML.indexOf("Account controls"));
  assert.ok(header.innerHTML.indexOf("Account controls") < header.innerHTML.indexOf("mq-drawer-exit"));

  trigger.listeners.click();
  assert.equal(dialog.open, true);
  assert.equal(trigger.attributes["aria-expanded"], "true");
  dialog.listeners.click({ target: dialog, clientX: 50, clientY: 100 });
  assert.equal(dialog.open, true);
  dialog.listeners.click({ target: dialog, clientX: 5, clientY: 100 });
  assert.equal(dialog.open, false);
  assert.equal(trigger.attributes["aria-expanded"], "false");
  trigger.listeners.click();
  closeButton.listeners.click();
  assert.equal(dialog.open, false);
});
