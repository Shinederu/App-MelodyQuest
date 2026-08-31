export function getCurrentLobby() {
  try {
    const raw = localStorage.getItem("mq_current_lobby");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentLobby(lobby) {
  if (!lobby) return;
  const payload = {
    id: Number(lobby.id || 0),
    lobby_code: String(lobby.lobby_code || "").toUpperCase(),
    name: String(lobby.name || ""),
    game_mode: String(lobby.game_mode || "participative"),
    owner_actor_id: Number(lobby.owner_actor_id ?? lobby.owner_user_id ?? 0),
    current_actor_id: Number(lobby.current_actor_id ?? 0),
  };
  localStorage.setItem("mq_current_lobby", JSON.stringify(payload));
}

export function clearCurrentLobby() {
  localStorage.removeItem("mq_current_lobby");
}
