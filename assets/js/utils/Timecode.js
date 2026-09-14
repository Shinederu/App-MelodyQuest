export function parseTimecode(value, optional = false) {
  const text = String(value ?? "").trim();
  if (!text) return optional ? null : 0;
  if (!/^\d+(?::[0-5]\d){0,2}$/.test(text)) throw new Error("Timecode invalide : utilise des secondes, m:ss ou h:mm:ss.");
  const seconds = text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  if (!Number.isSafeInteger(seconds) || seconds > 86400) throw new Error("Le timecode doit être compris entre 0 et 86400 secondes.");
  return seconds;
}

export function formatTimecode(value) {
  if (value === null || value === undefined || value === "") return "";
  const seconds = Math.max(0, Math.floor(Number(value)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
