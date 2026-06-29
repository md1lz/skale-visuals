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
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("verify_admin", {
      _username: data.username,
      _password: data.password,
    });

    const match = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const ip = (() => {
      try {
        return getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        return null;
      }
    })();
    const userAgent = (() => {
      try {
        return getRequestHeader("user-agent") ?? null;
      } catch {
        return null;
      }
    })();

    await supabaseAdmin.from("admin_login_events").insert({
      username: data.username,
      success: !!match,
      ip,
      user_agent: userAgent,
    });

    if (error || !match) {
      // Generic message — never reveal which field failed
      return { ok: false as const };
    }

    await supabaseAdmin
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", match.id);

    const session = await useSession<AdminSessionData>(sessionConfig());
    await session.update({ user: match.username, loggedInAt: Date.now() });

    return { ok: true as const, user: match.username };
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
