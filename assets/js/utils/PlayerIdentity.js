const PLAYER_STORAGE_KEY = "user";
const PROVISIONAL_STORAGE_KEY = "mq_provisional_guest";
const PROVISIONAL_TTL_MS = 2 * 60 * 60 * 1000;

const PREFIXES = [
  "Dark", "Super", "Pixel", "Cosmic", "Neon", "Lunaire",
  "Turbo", "Mystic", "Nova", "Retro", "Sonic", "Zen",
];

const WORDS = [
  "Armoire", "Casque", "Clavier", "Comete", "Disque", "Etoile",
  "Manette", "Melodie", "Nuage", "Pixel", "Tempo", "Vinyle",
];

export function getActorId(value) {
  return Number(value?.actor_id ?? value?.user_id ?? value?.id ?? 0);
}

export function getStoredPlayerIdentity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function persistPlayerIdentity(identity) {
  if (!identity || typeof identity !== "object") return null;

  const actorId = getActorId(identity);
  const normalized = {
    ...identity,
    id: actorId,
    actor_id: actorId,
    username: String(identity.username || "Invité"),
    role: String(identity.role || (identity.is_guest ? "guest" : "user")).toLowerCase(),
    is_guest: Boolean(identity.is_guest),
    is_authenticated: Boolean(identity.is_authenticated ?? !identity.is_guest),
    is_admin: Boolean(identity.is_admin) && !identity.is_guest,
  };

  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(normalized));
  if (!normalized.is_guest || actorId !== 0) {
    localStorage.removeItem(PROVISIONAL_STORAGE_KEY);
  }
  return normalized;
}

export function getOrCreateProvisionalGuest() {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(PROVISIONAL_STORAGE_KEY) || "null");
    const lastActiveAt = Number(stored?.last_active_at || 0);
    if (stored?.username && lastActiveAt > now - PROVISIONAL_TTL_MS) {
      const refreshed = { ...stored, last_active_at: now };
      localStorage.setItem(PROVISIONAL_STORAGE_KEY, JSON.stringify(refreshed));
      return persistPlayerIdentity(buildProvisionalIdentity(refreshed.username));
    }
  } catch {
    // A malformed local draft is replaced below.
  }

  const username = generateLocalNickname();
  localStorage.setItem(PROVISIONAL_STORAGE_KEY, JSON.stringify({ username, last_active_at: now }));
  return persistPlayerIdentity(buildProvisionalIdentity(username));
}

export function renameProvisionalGuest(nickname) {
  const username = normalizeLocalNickname(nickname);
  localStorage.setItem(PROVISIONAL_STORAGE_KEY, JSON.stringify({
    username,
    last_active_at: Date.now(),
  }));
  return persistPlayerIdentity(buildProvisionalIdentity(username));
}

export function clearPlayerIdentity() {
  localStorage.removeItem(PLAYER_STORAGE_KEY);
  localStorage.removeItem(PROVISIONAL_STORAGE_KEY);
}

export function normalizeLocalNickname(value) {
  const nickname = String(value || "").trim().replace(/\s+/g, "_");
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{2,31}$/u.test(nickname)) {
    throw new Error("Le pseudo doit contenir 3 à 32 lettres, chiffres, tirets ou underscores.");
  }
  return nickname;
}

function buildProvisionalIdentity(username) {
  return {
    id: 0,
    actor_id: 0,
    user_id: null,
    guest_session_id: null,
    username,
    avatar_url: "",
    role: "guest",
    is_guest: true,
    is_authenticated: false,
    is_admin: false,
    provisional: true,
  };
}

function generateLocalNickname() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${prefix}_${word}`;
}
