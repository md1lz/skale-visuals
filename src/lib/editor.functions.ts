import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EditorProject = {
  id: string;
  title: string;
  status: string;
  format: string;
  deadline: string | null;
  brief: string | null;
  rushs_received: boolean;
  rushs_links: string[];
  delivery_link: string | null;
  revision_link: string | null;
  created_at: string;
  updated_at: string;
};

const SAFE_COLUMNS =
  "id, title, status, format, deadline, brief, rushs_received, rushs_links, delivery_link, revision_link, created_at, updated_at";

export const getEditorSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { readEditorSession } = await import("./auth-sessions.server");
  const s = await readEditorSession();
  if (!s) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("editor_accounts")
    .select("id, username, display_name, status, avatar_url")
    .eq("id", s.editorId)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
  };
});

export const logoutEditorFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getEditorSession } = await import("./auth-sessions.server");
  const s = await getEditorSession();
  await s.clear();
  return { ok: true as const };
});

export const updateEditorProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        displayName: z.string().trim().min(1).max(64).optional(),
        avatarDataUrl: z
          .string()
          .max(2_000_000)
          .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/)
          .optional()
          .nullable(),
        removeAvatar: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { display_name?: string; avatar_url?: string | null } = {};
    if (data.displayName) patch.display_name = data.displayName;
    if (data.removeAvatar) patch.avatar_url = null;
    else if (data.avatarDataUrl) patch.avatar_url = data.avatarDataUrl;
    const { error } = await supabaseAdmin.from("editor_accounts").update(patch).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { requireEditor } = await import("./auth-sessions.server");
  const me = await requireEditor();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(SAFE_COLUMNS)
    .eq("editor_id", me.id)
    .is("archived_at", null)
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EditorProject[];
});

export const getMyProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select(SAFE_COLUMNS)
      .eq("id", data.id)
      .eq("editor_id", me.id)
      .maybeSingle();
    if (!project) throw new Error("Projet introuvable");

    const [{ data: files }, { data: comments }, { data: history }] = await Promise.all([
      supabaseAdmin
        .from("project_files")
        .select("id, project_id, file_url, file_name, version_number, created_at")
        .eq("project_id", data.id)
        .order("version_number", { ascending: true }),
      supabaseAdmin
        .from("project_comments")
        .select("id, project_id, author_type, author_name, content, created_at")
        .eq("project_id", data.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("project_status_history")
        .select("id, status, changed_at")
        .eq("project_id", data.id)
        .order("changed_at", { ascending: false }),
    ]);

    return {
      project: project as unknown as EditorProject,
      files: files ?? [],
      comments: comments ?? [],
      history: history ?? [],
    };
  });

async function assertMine(projectId: string, editorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id, title, editor_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!data || data.editor_id !== editorId) throw new Error("Projet introuvable");
  return data;
}

export const createVersionUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid(), file_name: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    await assertMine(data.project_id, me.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `montages/${data.project_id}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload impossible");
    return { path, token: signed.token };
  });

export const addProjectVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        file_url: z.string().trim().min(1).max(2000),
        file_name: z.string().trim().max(200).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    const project = await assertMine(data.project_id, me.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: last } = await supabaseAdmin
      .from("project_files")
      .select("version_number")
      .eq("project_id", data.project_id)
      .order("version_number", { ascending: false })
      .limit(1);
    const version = (last?.[0]?.version_number ?? 0) + 1;

    const { error } = await supabaseAdmin.from("project_files").insert({
      project_id: data.project_id,
      uploaded_by: me.id,
      file_url: data.file_url,
      file_name: data.file_name || `Version ${version}`,
      version_number: version,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      recipient_type: "admin",
      recipient_id: null,
      type: "file",
      project_id: data.project_id,
      message: `${me.display_name} a déposé la version ${version} — ${project.title}`,
    });
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `Nouvelle version (${version}) déposée sur « ${project.title} »`,
      actor_username: me.username,
    });

    return { ok: true as const, version };
  });

export const sendForRevision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    const project = await assertMine(data.project_id, me.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ status: "En révision" })
      .eq("id", data.project_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      recipient_type: "admin",
      recipient_id: null,
      type: "status",
      project_id: data.project_id,
      message: `${me.display_name} a envoyé « ${project.title} » en révision`,
    });
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `« ${project.title} » envoyé en révision par ${me.display_name}`,
      actor_username: me.username,
    });
    return { ok: true as const };
  });

export const postEditorComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireEditor } = await import("./auth-sessions.server");
    const me = await requireEditor();
    const project = await assertMine(data.project_id, me.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("project_comments").insert({
      project_id: data.project_id,
      author_type: "editor",
      author_id: me.id,
      author_name: me.display_name,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      recipient_type: "admin",
      recipient_id: null,
      type: "comment",
      project_id: data.project_id,
      message: `${me.display_name} a commenté « ${project.title} »`,
    });
    return { ok: true as const };
  });

export const listMyNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { requireEditor } = await import("./auth-sessions.server");
  const me = await requireEditor();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Deadline alerts (< 48h) computed on the fly
  const { data: soon } = await supabaseAdmin
    .from("projects")
    .select("id, title, deadline, status")
    .eq("editor_id", me.id)
    .is("archived_at", null)
    .not("deadline", "is", null);

  const alerts = (soon ?? [])
    .filter((p) => {
      if (!p.deadline) return false;
      const diff = new Date(`${p.deadline}T23:59:59`).getTime() - Date.now();
      return diff > 0 && diff < 48 * 3600 * 1000 && p.status !== "Livrée" && p.status !== "Payée";
    })
    .map((p) => ({
      id: `deadline-${p.id}`,
      type: "deadline",
      project_id: p.id,
      message: `Deadline dans moins de 48h — ${p.title}`,
      read: false,
      created_at: new Date().toISOString(),
    }));

  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, type, project_id, message, read, created_at")
    .eq("recipient_type", "editor")
    .eq("recipient_id", me.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return [...alerts, ...((data ?? []) as typeof alerts)].slice(0, 8);
});

export const markMyNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { requireEditor } = await import("./auth-sessions.server");
  const me = await requireEditor();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("recipient_type", "editor")
    .eq("recipient_id", me.id)
    .eq("read", false);
  return { ok: true as const };
});

export const signVersionUrls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string().max(500)).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readEditorSession, requireAdminUser } = await import("./auth-sessions.server");
    const editor = await readEditorSession();
    if (!editor) await requireAdminUser();
    const out: Record<string, string> = {};
    await Promise.all(
      data.paths.map(async (p) => {
        const m = p.match(/^storage:\/\/site-videos\/(.+)$/);
        if (!m) return;
        const { data: s } = await supabaseAdmin.storage
          .from("site-videos")
          .createSignedUrl(decodeURIComponent(m[1]!), 60 * 60 * 24);
        if (s?.signedUrl) out[p] = s.signedUrl;
      }),
    );
    return out;
  });
