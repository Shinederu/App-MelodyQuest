export class ManagementController {
  constructor() {
    this.loadCounts();
  }

  async loadCounts() {
    const results = await Promise.allSettled([window.httpClient.listPendingTracks(), window.httpClient.listSuggestions("pending")]);
    ["management-pending-tracks", "management-pending-suggestions"].forEach((id, index) => {
      const result = results[index];
      const badge = document.getElementById(id);
      if (badge) badge.textContent = result.status === "fulfilled" && result.value.success
        ? String(result.value.data?.pending_total ?? result.value.data?.items?.length ?? 0) : "Indisponible";
    });
  }
}
