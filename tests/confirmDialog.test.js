import assert from "node:assert/strict";
import test from "node:test";

import { buildDeleteConfirmationText } from "../assets/js/utils/confirmDialog.js";

test("le message nomme précisément l élément supprimé", () => {
  assert.equal(
    buildDeleteConfirmationText("la musique", "Genshin Impact"),
    "Êtes-vous sûr de vouloir supprimer la musique « Genshin Impact » ?"
  );
});

test("le message reste naturel sans nom disponible", () => {
  assert.equal(
    buildDeleteConfirmationText("le salon"),
    "Êtes-vous sûr de vouloir supprimer le salon ?"
  );
});
