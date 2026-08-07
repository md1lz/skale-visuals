import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EditorAccount = {
  id: string;
  display_name: string;
  username: string;
  status: "active" | "suspended";
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type EditorRow = EditorAccount & {
  projects_done: number;
  projects_active: number;
  revenue: number;
  paid: number;
  net_profit: number;
};

const DONE_STATUSES = ["Livrée", "Payée"];

async function guard() {
  const { requireAdminUser } = await import("./auth-sessions.server");
  return requireAdminUser();
}

export const listEditors = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: accounts, error } = await supabaseAdmin
    .from("editor_accounts")
    .select("id, display_name, username, status, avatar_url, last_login_at, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("editor_id, status, amount_invoiced_ht, editor_total_cost, net_profit");

  const rows: EditorRow[] = (accounts ?? []).map((a) => {
    const mine = (projects ?? []).filter((p) => p.editor_id === a.id);
    return {
      ...(a as EditorAccount),
      projects_done: mine.filter((p) => DONE_STATUSES.includes(p.status as string)).length,
      projects_active: mine.filter((p) => !DONE_STATUSES.includes(p.status as string)).length,
      revenue: Math.round(mine.reduce((s, p) => s + Number(p.amount_invoiced_ht ?? 0), 0) * 100) / 100,
      paid: Math.round(mine.reduce((s, p) => s + Number(p.editor_total_cost ?? 0), 0) * 100) / 100,
      net_profit: Math.round(mine.reduce((s, p) => s + Number(p.net_profit ?? 0), 0) * 100) / 100,
    };
  });
  return rows;
});

export const listActiveEditors = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("editor_accounts")
    .select("id, display_name, username")
    .eq("status", "active")
    .order("display_name");
  return (data ?? []) as { id: string; display_name: string; username: string }[];
});

export const generateEditorPassword = createServerFn({ method: "POST" }).handler(async () => {
  await guard();
  const { generateStrongPassword } = await import("./auth-sessions.server");
  return { password: generateStrongPassword(12) };
});

export const createEditorAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(64),
        username: z
          .string()
          .trim()
          .min(3)
          .max(48)
          .regex(/^[a-zA-Z0-9._-]+$/, "Identifiant invalide (pas d'espaces)"),
        password: z.string().min(8).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc("create_editor", {
      _display_name: data.display_name,
      _username: data.username.toLowerCase(),
      _password: data.password,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "Cet identifiant existe déjà." : error.message);
    return { id: id as unknown as string };
  });

export const updateEditorAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        display_name: z.string().trim().min(1).max(64).optional(),
        status: z.enum(["active", "suspended"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { display_name?: string; status?: string } = {};
    if (data.display_name) patch.display_name = data.display_name;
    if (data.status) patch.status = data.status;
    const { error } = await supabaseAdmin.from("editor_accounts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const resetEditorPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateStrongPassword } = await import("./auth-sessions.server");
    const password = generateStrongPassword(12);
    const { error } = await supabaseAdmin.rpc("set_editor_password", {
      _id: data.id,
      _new_password: password,
    });
    if (error) throw new Error(error.message);
    return { password };
  });

export const updateEditorCredentials = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        username: z
          .string()
          .trim()
          .min(3)
          .max(48)
          .regex(/^[a-zA-Z0-9._-]+$/, "Identifiant invalide (pas d'espaces)")
          .optional(),
        password: z.string().min(8).max(128).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.username) {
      const { error } = await supabaseAdmin
        .from("editor_accounts")
        .update({ username: data.username.toLowerCase() })
        .eq("id", data.id);
      if (error) throw new Error("Cet identifiant est déjà utilisé.");
    }
    if (data.password) {
      const { error } = await supabaseAdmin.rpc("set_editor_password", {
        _id: data.id,
        _new_password: data.password,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteEditorAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("projects").update({ editor_id: null }).eq("editor_id", data.id);
    const { error } = await supabaseAdmin.from("editor_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getEditorDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account } = await supabaseAdmin
      .from("editor_accounts")
      .select("id, display_name, username, status, avatar_url, last_login_at, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!account) throw new Error("Monteur introuvable");

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, title, status, deadline, created_at, amount_invoiced_ht, editor_total_cost, net_profit")
      .eq("editor_id", data.id)
      .order("created_at", { ascending: false });

    const list = projects ?? [];
    return {
      account: account as EditorAccount,
      stats: {
        done: list.filter((p) => DONE_STATUSES.includes(p.status as string)).length,
        active: list.filter((p) => !DONE_STATUSES.includes(p.status as string)).length,
        revenue: Math.round(list.reduce((s, p) => s + Number(p.amount_invoiced_ht ?? 0), 0) * 100) / 100,
        paid: Math.round(list.reduce((s, p) => s + Number(p.editor_total_cost ?? 0), 0) * 100) / 100,
        net: Math.round(list.reduce((s, p) => s + Number(p.net_profit ?? 0), 0) * 100) / 100,
      },
      projects: list,
    };
  });

/* ---------- Collaboration (admin side) ---------- */

export type ProjectComment = {
  id: string;
  project_id: string;
  author_type: "admin" | "editor";
  author_name: string;
  content: string;
  created_at: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  version_number: number;
  created_at: string;
};

export const getProjectThread = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: comments }, { data: files }] = await Promise.all([
      supabaseAdmin
        .from("project_comments")
        .select("id, project_id, author_type, author_name, content, created_at")
        .eq("project_id", data.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("project_files")
        .select("id, project_id, file_url, file_name, version_number, created_at")
        .eq("project_id", data.id)
        .order("version_number", { ascending: true }),
    ]);
    return {
      comments: (comments ?? []) as ProjectComment[],
      files: (files ?? []) as ProjectFile[],
    };
  });

export const postAdminComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const username = await guard();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("project_comments").insert({
      project_id: data.project_id,
      author_type: "admin",
      author_name: username,
      content: data.content,
    });
    if (error) throw new Error(error.message);

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("title, editor_id")
      .eq("id", data.project_id)
      .maybeSingle();

    if (project?.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      await notifyEditor({
        recipient_id: project.editor_id,
        type: "comment",
        project_id: data.project_id,
        message: `Message admin sur ${project.title}`,
      });
    }
    return { ok: true as const };
  });

export const listAdminNotifications = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, type, project_id, message, read, created_at")
    .eq("recipient_type", "admin")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as {
    id: string;
    type: string;
    project_id: string | null;
    message: string;
    read: boolean;
    created_at: string;
  }[];
});
