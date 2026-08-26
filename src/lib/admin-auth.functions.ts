import { createServerFn } from "@tanstack/react-start";
import { useSession, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSessionData = {
  user?: string;
  loggedInAt?: number;
};

const SESSION_NAME = "skale_admin";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8h

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return {
    password,
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional().default(false),
  source: z.enum(["web", "app"]).optional().default("web"),
});

function getClientIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("verify_admin", {
      _username: data.username,
      _password: data.password,
    });

    const match = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const ip = getClientIp();
    const userAgent = (() => {
      try {
        return getRequestHeader("user-agent") ?? null;
      } catch {
        return null;
      }
    })();

    if (error || !match) {
      // Fallback: maybe it's a freelance editor account (same login door)
      const { data: eRows } = await supabaseAdmin.rpc("verify_editor", {
        _username: data.username,
        _password: data.password,
      });
      const editor = Array.isArray(eRows) && eRows.length > 0 ? eRows[0] : null;

      await supabaseAdmin.from("admin_login_events").insert({
        username: data.username,
        success: !!editor,
        ip,
        user_agent: userAgent,
      });

      if (!editor) return { ok: false as const };
      if (editor.status !== "active") {
        return { ok: false as const, suspended: true as const };
      }

      await supabaseAdmin
        .from("editor_accounts")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", editor.id);

      if (data.remember && ip) {
        const { error: rememberError } = await supabaseAdmin.from("admin_remembered_ips").upsert(
          {
            ip,
            username: editor.username,
            source: data.source,
            owner_type: "editor",
            owner_id: editor.id,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "ip,source,owner_type,username" },
        );
        if (rememberError) console.error("[remember editor device]", rememberError.message);
      }


      const { getEditorSession } = await import("./auth-sessions.server");
      const eSession = await getEditorSession();
      await eSession.update({
        editorId: editor.id,
        username: editor.username,
        displayName: editor.display_name,
        loggedInAt: Date.now(),
      });

      return { ok: true as const, role: "editor" as const, user: editor.username };
    }

    await supabaseAdmin.from("admin_login_events").insert({
      username: data.username,
      success: !!match,
      ip,
      user_agent: userAgent,
    });

    await supabaseAdmin
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", match.id);

    if (data.remember && ip) {
      await supabaseAdmin.from("admin_remembered_ips").upsert(
        {
          ip,
          username: match.username,
          source: data.source,
          owner_type: "admin",
          owner_id: match.id,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "ip,source,owner_type,username" },
      );
    }

    const session = await useSession<AdminSessionData>(sessionConfig());
    await session.update({ user: match.username, loggedInAt: Date.now() });

    return { ok: true as const, role: "admin" as const, user: match.username };
  });

const profileSchema = z.object({
  firstName: z.string().trim().max(64).optional().nullable(),
  lastName: z.string().trim().max(64).optional().nullable(),
  avatarDataUrl: z
    .string()
    .max(2_000_000)
    .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/)
    .optional()
    .nullable(),
  removeAvatar: z.boolean().optional().default(false),
});

async function requireSessionUser() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

export const getAdminProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSessionData>(sessionConfig());
  const username = session.data.user;
  if (!username) {
    return { username: "", firstName: null, lastName: null, avatarUrl: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admins")
    .select("username, first_name, last_name, avatar_url")
    .eq("username", username)
    .maybeSingle();
  return {
    username,
    firstName: data?.first_name ?? null,
    lastName: data?.last_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
  };
});

export const updateAdminProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data }) => {
    const username = await requireSessionUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      first_name: string | null;
      last_name: string | null;
      avatar_url?: string | null;
    } = {
      first_name: data.firstName?.trim() || null,
      last_name: data.lastName?.trim() || null,
    };
    if (data.removeAvatar) patch.avatar_url = null;
    else if (data.avatarDataUrl) patch.avatar_url = data.avatarDataUrl;
    const { error } = await supabaseAdmin
      .from("admins")
      .update(patch)
      .eq("username", username);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


export const tryAutoLoginByIp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ source: z.enum(["web", "app"]).optional().default("web") }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getClientIp();
    if (!ip) return { ok: false as const };

    const { data: rows } = await supabaseAdmin
      .from("admin_remembered_ips")
      .select("id, username, owner_type, owner_id")
      .eq("ip", ip)
      .eq("source", data.source)
      .order("last_seen_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row?.username) return { ok: false as const };

    await supabaseAdmin
      .from("admin_remembered_ips")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", row.id);

    if (row.owner_type === "editor") {
      const { data: editor } = await supabaseAdmin
        .from("editor_accounts")
        .select("id, username, display_name, status")
        .eq("id", row.owner_id ?? "")
        .maybeSingle();
      if (!editor || editor.status !== "active") return { ok: false as const };

      const { getEditorSession } = await import("./auth-sessions.server");
      const eSession = await getEditorSession();
      await eSession.update({
        editorId: editor.id,
        username: editor.username,
        displayName: editor.display_name,
        loggedInAt: Date.now(),
      });
      return { ok: true as const, role: "editor" as const, user: editor.username };
    }

    const session = await useSession<AdminSessionData>(sessionConfig());
    await session.update({ user: row.username, loggedInAt: Date.now() });

    return { ok: true as const, role: "admin" as const, user: row.username };
  });


export const getAdminSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await useSession<AdminSessionData>(sessionConfig());
    if (!session.data.user) return null;
    return { user: session.data.user, loggedInAt: session.data.loggedInAt ?? 0 };
  } catch {
    return null;
  }
});

export const logoutAdminFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSessionData>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getAdminAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) {
    throw new Error("Unauthorized");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: events } = await supabaseAdmin
    .from("admin_login_events")
    .select("username, success, ip, user_agent, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const recent = events ?? [];
  const totalAttempts = recent.length;
  const successful = recent.filter((e) => e.success).length;
  const failed = totalAttempts - successful;
  const uniqueUsers = new Set(recent.filter((e) => e.success).map((e) => e.username)).size;

  return {
    currentUser: session.data.user,
    loggedInAt: session.data.loggedInAt ?? 0,
    totals: { totalAttempts, successful, failed, uniqueUsers },
    recent: recent.slice(0, 20),
  };
});
