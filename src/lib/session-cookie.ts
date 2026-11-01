/** HttpOnly dashboard session cookie (set only by Next route handlers). */
export const SESSION_COOKIE = "gresspay_session";

/** Client-visible flag that a session cookie was established (not the JWT). */
export const SESSION_FLAG = "gresspay_authed";

export const SESSION_CLIENT_HEADER = "X-GressPay-Client";
export const SESSION_CLIENT_VALUE = "dashboard";

export const TTL_DEFAULT_SEC = 86400;
export const TTL_REMEMBER_SEC = 604800;
