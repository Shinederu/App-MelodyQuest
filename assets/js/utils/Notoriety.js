export const NOTORIETY_STEPS = [0, 60, 90];
export const NOTORIETY_DEFAULT = 60;
export const NOTORIETY_LABELS = ["Tout", "Connues, au moins 60 %", "Très connues, au moins 90 %"];

export function notorietyStep(minimum) {
  return Math.max(0, NOTORIETY_STEPS.indexOf(Number(minimum)));
}

export function notorietyMinimum(step) {
  return NOTORIETY_STEPS[Number(step)] ?? 0;
}

export function countKnownTracks(category, minimum) {
  if (Number(minimum) > 0) {
    return Object.entries(category?.track_counts_by_notoriety || {}).reduce(
      (count, [rating, amount]) => count + (Number(rating) >= minimum ? Number(amount) : 0), 0);
  }
  return Math.max(0, Number(category?.track_count || 0));
}

// A track edit must not overwrite the shared work estimate unless explicitly changed.
export class FamilySeedField {
  constructor(id) {
    this.input = document.getElementById(id);
    this.key = null;
    this.dirty = false;
    this.input?.addEventListener("change", () => { this.dirty = true; });
  }

  sync(family, key, force = false) {
    if (!this.input || (!force && this.key === key)) return;
    this.key = key;
    this.dirty = false;
    this.input.value = String(family?.notoriety_seed ?? NOTORIETY_DEFAULT);
  }

  payload() {
    return this.dirty ? { notoriety_seed: Number(this.input.value) } : {};
  }
}
