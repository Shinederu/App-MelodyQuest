import { clearPlayerIdentity } from "../utils/PlayerIdentity.js?v=20260831-guest-mode";

export class UserModel {
  async submitLogin(username, password) {
    const response = await window.httpClient.submitLogin({ username, password });

    if (response.success) {
      await window.httpClient.endGuestSession().catch(() => {});
      clearPlayerIdentity();
      const pendingTvCode = sessionStorage.getItem("mq_pending_tv_code");
      if (pendingTvCode) {
        window.appCtrl.changeView(`tv-link?code=${encodeURIComponent(pendingTvCode)}`);
        return response;
      }

      window.appCtrl.changeView("main", { force: true });
    }

    return response;
  }

  async submitRegister(username, email, password, confirmPassword) {
    return window.httpClient.submitRegister({
      username,
      email,
      password,
      password_confirm: confirmPassword,
    });
  }

  async submitLogout() {
    const response = await window.httpClient.logout();

    if (response.success) {
      clearPlayerIdentity();
      window.appCtrl.changeView("main", { force: true });
    }

    return response;
  }
}
