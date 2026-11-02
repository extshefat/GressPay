const inviteKey = "gresspay_team_invite";

export function rememberTeamInvite() {
  const token = new URLSearchParams(window.location.search).get("accept");
  if (["/dashboard/team", "/team"].includes(window.location.pathname) && token && /^[a-f0-9]{48}$/.test(token)) {
    sessionStorage.setItem(inviteKey, token);
  }
}

export function afterSignIn(fallback: string) {
  const token = sessionStorage.getItem(inviteKey);
  sessionStorage.removeItem(inviteKey);
  return token && /^[a-f0-9]{48}$/.test(token) ? `/dashboard/team?accept=${token}` : fallback;
}
