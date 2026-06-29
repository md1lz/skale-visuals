const ACCOUNTS: Record<string, string> = {
  didiolorenzo: "V7qM-92xL-K4pZ",
  harroismadi: "R8tN-5Qw3-X9mK",
};

const KEY = "skale_admin_session";

export function tryLogin(username: string, password: string): boolean {
  const expected = ACCOUNTS[username.trim()];
  if (!expected || expected !== password) return false;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ user: username.trim(), at: Date.now() }),
    );
  } catch {}
  return true;
}

export function getAdminSession(): { user: string; at: number } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
