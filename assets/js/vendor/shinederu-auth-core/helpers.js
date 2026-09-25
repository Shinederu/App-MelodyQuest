export const DEFAULT_ENDPOINTS = {
    login: "",
    register: "",
    me: "",
    listUsers: "",
    logout: "",
    logoutAll: "",
    requestPasswordReset: "",
    resetPassword: "",
    requestEmailUpdate: "",
    confirmEmailUpdate: "",
    verifyEmail: "",
    revokeRegister: "",
    revokeEmailUpdate: "",
    updateProfile: "",
    updateAvatar: "",
    updateUserRole: "",
    deleteAccount: "",
};
export const EMPTY_SESSION = {
    isAuthenticated: false,
    user: null,
    updatedAt: Date.now(),
};
export const mergeEndpoints = (custom) => ({
    ...DEFAULT_ENDPOINTS,
    ...(custom ?? {}),
});
export const toQueryString = (payload) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return;
        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, String(entry)));
            return;
        }
        params.append(key, String(value));
    });
    return params.toString();
};
export const defaultTransformUser = (payload) => {
    if (!payload || typeof payload !== "object")
        return null;
    const raw = payload;
    const fromData = raw.data && typeof raw.data === "object" ? raw.data : null;
    if (raw.user && typeof raw.user === "object") {
        return normalizeUser(raw.user);
    }
    if (fromData?.user && typeof fromData.user === "object") {
        return normalizeUser(fromData.user);
    }
    return null;
};
const toBool = (value) => {
    if (value === null || value === undefined)
        return false;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return ["1", "true", "yes", "on", "admin"].includes(normalized);
};
const normalizeUser = (user) => {
    const role = String(user.role ?? "").toLowerCase();
    const isAdmin = toBool(user.is_admin) || role === "admin";
    return {
        ...user,
        role: isAdmin ? "admin" : (role || "user"),
        is_admin: isAdmin,
    };
};
//# sourceMappingURL=helpers.js.map