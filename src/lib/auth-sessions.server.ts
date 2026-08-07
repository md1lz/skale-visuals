import { useSession } from "@tanstack/react-start/server";

export type EditorSessionData = {
  editorId?: string;
  username?: string;
  displayName?: string;
  loggedInAt?: number;
};

export function editorSessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return {
    password,
    name: "skale_editor",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function getEditorSession() {
  return useSession<EditorSessionData>(editorSessionConfig());
}

export async function readEditorSession() {
  try {
    const s = await getEditorSession();
    if (!s.data.editorId) return null;
    return {
      editorId: s.data.editorId,
      username: s.data.username ?? "",
      displayName: s.data.displayName ?? "",
      loggedInAt: s.data.loggedInAt ?? 0,
    };
  } catch {
    return null;
  }
}

export async function requireEditor() {
  const s = await readEditorSession();
  if (!s) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("editor_accounts")
    .select("id, username, display_name, status, avatar_url")
    .eq("id", s.editorId)
    .maybeSingle();
  if (!data || data.status !== "active") throw new Error("Unauthorized");
  return data;
}

export function generateStrongPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?-_";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const pick = (set: string, i: number) => set[bytes[i]! % set.length]!;
  const chars = [pick(upper, 0), pick(lower, 1), pick(digits, 2), pick(symbols, 3)];
  for (let i = 4; i < length; i++) chars.push(pick(all, i));
  // shuffle
  const shuffle = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffle);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

type AdminSessionData = { user?: string; loggedInAt?: number };

export function adminSessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return {
    password,
    name: "skale_admin",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function requireAdminUser() {
  const session = await useSession<AdminSessionData>(adminSessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}
