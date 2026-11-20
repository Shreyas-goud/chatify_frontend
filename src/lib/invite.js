// An invite opened before signing in is kept for this tab, then accepted right after sign-in.
const KEY = "chatify:invite";

export function savePendingInvite(code) {
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // storage blocked: the visitor can open the link again after signing in
  }
}

export function takePendingInvite() {
  try {
    const code = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

export function peekPendingInvite() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const inviteUrl = (code) => `${window.location.origin}/i/${code}`;

// Only same-site paths, so ?next= can't send someone to another website.
export const safeNext = (next) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
