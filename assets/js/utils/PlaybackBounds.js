// Do not rely solely on YouTube endSeconds: seekTo cancels that bound.
export function pauseAtTrackEnd(player, round, nowSeconds) {
  const end = Number(round?.track?.end_offset_seconds);
  const start = Number(round?.track?.start_offset_seconds || 0);
  const startedAt = Number(round?.started_at_unix || 0);
  if (!player || !Number.isFinite(end) || end <= start || !startedAt || nowSeconds < startedAt) return false;
  if (start + nowSeconds - startedAt < end) return false;
  try {
    const state = player.getPlayerState?.();
    if (state !== 2 && state !== 0) {
      player.mute?.();
      player.pauseVideo?.();
    }
  } catch { /* The iframe can be transitioning between states. */ }
  return true;
}
