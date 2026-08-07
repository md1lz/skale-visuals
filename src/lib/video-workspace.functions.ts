import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listMyProjectsOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireEditor } = await import("./auth-sessions.server");
  const me = await requireEditor();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, title, status, deadline, updated_at")
    .eq("editor_id", me.id)
    .is("archived_at", null)
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  const ids = (projects ?? []).map((p) => p.id);
  const { data: videos } = ids.length
    ? await supabaseAdmin.from("project_videos").select("project_id, status").in("project_id", ids)
    : { data: [] as { project_id: string; status: string }[] };
  return (projects ?? []).map((p) => {
    const mine = (videos ?? []).filter((v) => v.project_id === p.id);
    return {
      ...p,
      total_videos: mine.length,
      approved_videos: mine.filter((v) => v.status === "Approuvée").length,
    };
  });
});

export const getProjectWorkspace = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const project = await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: videos } = await supabaseAdmin
      .from("project_videos")
      .select("id, video_number, status, updated_at")
      .eq("project_id", data.project_id)
      .order("video_number", { ascending: true });

    const ids = (videos ?? []).map((v) => v.id);
    const [{ data: versions }, { data: comments }] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("video_versions")
            .select(
              "id, project_video_id, version_number, file_url, file_name, title, description, additional_links, created_at",
            )
            .in("project_video_id", ids)
            .order("version_number", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      ids.length
        ? supabaseAdmin
            .from("video_comments")
            .select("id, project_video_id, read_by_editor, read_by_admin, author_type")
            .in("project_video_id", ids)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    return {
      viewer: { kind: viewer.kind, id: viewer.id, name: viewer.name },
      project: {
        id: project.id,
        title: project.title,
        status: project.status as string,
        status_override: project.status_override,
        format: project.format as string,
        deadline: project.deadline,
        brief: project.brief,
        rushs_links: project.rushs_links ?? [],
      },
      videos: (videos ?? []).map((v) => {
        const vv = (versions ?? [])
          .filter((x) => x.project_video_id === v.id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
              b.version_number - a.version_number,
          );
        const unread = (comments ?? []).filter(
          (c) =>
            c.project_video_id === v.id &&
            (viewer.kind === "editor"
              ? c.author_type === "admin" && !c.read_by_editor
              : c.author_type === "editor" && !c.read_by_admin),
        ).length;
        return {
          id: v.id,
          video_number: v.video_number,
          status: v.status,
          updated_at: v.updated_at,
          versions_count: vv.length,
          last_version: vv[0] ?? null,
          unread_comments: unread,
        };
      }),
    };
  });

export const getVideoWorkspace = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { video, project } = await assertVideoAccess(data.video_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: versions }, { data: comments }] = await Promise.all([
      supabaseAdmin
        .from("video_versions")
        .select(
          "id, version_number, file_url, file_name, title, description, additional_links, created_at",
        )
        .eq("project_video_id", data.video_id)
        .order("version_number", { ascending: false }),
      supabaseAdmin
        .from("video_comments")
        .select(
          "id, author_type, author_id, author_name, content, read_by_editor, read_by_admin, read_at, created_at",
        )
        .eq("project_video_id", data.video_id)
        .order("created_at", { ascending: true }),
    ]);

    const commentIds = (comments ?? []).map((c) => c.id);
    const { data: reactions } = commentIds.length
      ? await supabaseAdmin
          .from("comment_reactions")
          .select("id, comment_id, author_type, author_id, author_name, emoji")
          .in("comment_id", commentIds)
      : { data: [] as never[] };

    return {
      viewer: { kind: viewer.kind, id: viewer.id, name: viewer.name },
      video,
      rushs_links: project.rushs_links ?? [],
      versions: versions ?? [],
      comments: comments ?? [],
      reactions: reactions ?? [],
    };
  });

export const markVideoCommentsRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    await assertVideoAccess(data.video_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = viewer.kind === "editor" ? { read_by_editor: true } : { read_by_admin: true };
    await supabaseAdmin
      .from("video_comments")
      .update({ ...patch, read_at: new Date().toISOString() })
      .eq("project_video_id", data.video_id)
      .neq("author_type", viewer.kind);
    await supabaseAdmin.from("video_comments").update(patch).eq("project_video_id", data.video_id);
    return { ok: true as const };
  });

export const setVideoStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        video_id: z.string().uuid(),
        status: z.enum(["À faire", "En cours", "En révision", "Approuvée", "Corrections à faire"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess, notifyAdmins, recomputeProjectStatus } = await import(
      "./video-workspace.server"
    );
    const viewer = await resolveViewer();
    const { video, project } = await assertVideoAccess(data.video_id, viewer);
    const editorOnly = ["À faire", "En cours", "En révision"];
    if (viewer.kind === "editor" && !editorOnly.includes(data.status)) {
      throw new Error("Statut réservé à l'administration");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("project_videos")
      .update({ status: data.status })
      .eq("id", data.video_id);
    if (error) throw new Error(error.message);

    await recomputeProjectStatus(project.id);

    const label = `#${String(video.video_number).padStart(2, "0")}`;
    if (viewer.kind === "editor") {
      if (data.status === "En révision") {
        await notifyAdmins({
          type: "status",
          project_id: project.id,
          message: `🔍 ${viewer.name} a envoyé la vidéo ${label} de « ${project.title} » en révision`,
        });
      }
    } else if (project.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      if (data.status === "Approuvée") {
        await notifyEditor({
          recipient_id: project.editor_id,
          type: "status",
          project_id: project.id,
          message: `✅ Vidéo ${label} approuvée — ${project.title}`,
        });
      } else if (data.status === "Corrections à faire") {
        await notifyEditor({
          recipient_id: project.editor_id,
          type: "status",
          project_id: project.id,
          message: `✏️ Corrections demandées sur la vidéo ${label} — ${project.title}`,
        });
      }
    }
    return { ok: true as const };
  });

export const createVideoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ video_id: z.string().uuid(), file_name: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { project } = await assertVideoAccess(data.video_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `montages/${project.id}/${data.video_id}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload impossible");
    return { path, token: signed.token };
  });

export const addVideoVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        video_id: z.string().uuid(),
        file_url: z.string().trim().min(1).max(2000),
        file_name: z.string().trim().max(200).optional().default(""),
        title: z.string().trim().max(200).optional().default(""),
        description: z.string().trim().max(4000).optional().default(""),
        additional_links: z
          .array(
            z.object({
              title: z.string().trim().max(200).default(""),
              url: z.string().trim().min(1).max(2000),
            }),
          )
          .max(10)
          .optional()
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess, notifyAdmins, recomputeProjectStatus } = await import(
      "./video-workspace.server"
    );
    const viewer = await resolveViewer();
    if (viewer.kind !== "editor") throw new Error("Réservé aux monteurs");
    const { video, project } = await assertVideoAccess(data.video_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: last } = await supabaseAdmin
      .from("video_versions")
      .select("version_number")
      .eq("project_video_id", data.video_id)
      .order("version_number", { ascending: false })
      .limit(1);
    const version = (last?.[0]?.version_number ?? 0) + 1;

    const { error } = await supabaseAdmin.from("video_versions").insert({
      project_video_id: data.video_id,
      version_number: version,
      file_url: data.file_url,
      file_name: data.file_name || `Version ${version}`,
      title: data.title || `V${version}`,
      description: data.description || null,
      additional_links: data.additional_links,
      uploaded_by: viewer.id,
    });
    if (error) throw new Error(error.message);

    if (video.status === "À faire") {
      await supabaseAdmin.from("project_videos").update({ status: "En cours" }).eq("id", data.video_id);
      await recomputeProjectStatus(project.id);
    }

    const label = `#${String(video.video_number).padStart(2, "0")}`;
    await notifyAdmins({
      type: "file",
      project_id: project.id,
      message: `${viewer.name} a déposé la V${version} de la vidéo ${label} — ${project.title}`,
    });
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `V${version} déposée sur la vidéo ${label} de « ${project.title} »`,
      actor_username: viewer.username,
    });
    return { ok: true as const, version };
  });

export const deleteVideoVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return data;
  });

export const renameVideoVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ version_id: z.string().uuid(), title: z.string().trim().min(1).max(200) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("video_versions")
      .select("id, project_video_id, version_number")
      .eq("id", data.version_id)
      .maybeSingle();
    if (!row) throw new Error("Version introuvable");
    const { project, video } = await assertVideoAccess(row.project_video_id, viewer);
    const { error } = await supabaseAdmin
      .from("video_versions")
      .update({ title: data.title })
      .eq("id", data.version_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `V${row.version_number} renommée « ${data.title} » sur la vidéo #${String(
        video.video_number,
      ).padStart(2, "0")} de « ${project.title} »`,
      actor_username: viewer.username,
    });
    return { ok: true as const };
  });

const _deleteVideoVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("video_versions")
      .select("id, project_video_id, version_number")
      .eq("id", data.version_id)
      .maybeSingle();
    if (!row) throw new Error("Version introuvable");
    const { project, video } = await assertVideoAccess(row.project_video_id, viewer);
    const { error } = await supabaseAdmin.from("video_versions").delete().eq("id", data.version_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `V${row.version_number} supprimée sur la vidéo #${String(video.video_number).padStart(
        2,
        "0",
      )} de « ${project.title} »`,
      actor_username: viewer.username,
    });
    return { ok: true as const };
  });

export const toggleCommentReaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ comment_id: z.string().uuid(), emoji: z.string().trim().min(1).max(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess, notifyAdmins } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comment } = await supabaseAdmin
      .from("video_comments")
      .select("id, project_video_id")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (!comment) throw new Error("Message introuvable");
    const { video, project } = await assertVideoAccess(comment.project_video_id, viewer);

    const { data: existing } = await supabaseAdmin
      .from("comment_reactions")
      .select("id, emoji")
      .eq("comment_id", data.comment_id)
      .eq("author_id", viewer.id)
      .maybeSingle();

    let removed = false;
    if (existing && existing.emoji === data.emoji) {
      await supabaseAdmin.from("comment_reactions").delete().eq("id", existing.id);
      removed = true;
    } else if (existing) {
      await supabaseAdmin
        .from("comment_reactions")
        .update({ emoji: data.emoji, created_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      const { error } = await supabaseAdmin.from("comment_reactions").insert({
        comment_id: data.comment_id,
        author_type: viewer.kind,
        author_id: viewer.id,
        author_name: viewer.name,
        emoji: data.emoji,
      });
      if (error) throw new Error(error.message);
    }

    if (!removed) {
      const label = `#${String(video.video_number).padStart(2, "0")}`;
      const message = `${viewer.name} a réagi ${data.emoji} à un message dans Vidéo ${label} — ${project.title}`;
      await notifyAdmins({ type: "reaction", project_id: project.id, message });
      if (project.editor_id) {
        const { notifyEditor } = await import("./notifications.server");
        await notifyEditor({
          recipient_id: project.editor_id,
          type: "reaction",
          project_id: project.id,
          message,
        });
      }
    }
    return { ok: true as const, removed };
  });

export const postVideoComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ video_id: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess, notifyAdmins } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { video, project } = await assertVideoAccess(data.video_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("video_comments").insert({
      project_video_id: data.video_id,
      author_type: viewer.kind,
      author_id: viewer.id,
      author_name: viewer.name,
      content: data.content,
      read_by_editor: viewer.kind === "editor",
      read_by_admin: viewer.kind === "admin",
    });
    if (error) throw new Error(error.message);

    const label = `#${String(video.video_number).padStart(2, "0")}`;
    if (viewer.kind === "editor") {
      await notifyAdmins({
        type: "comment",
        project_id: project.id,
        message: `💬 ${viewer.name} a commenté la vidéo ${label} — ${project.title}`,
      });
    } else if (project.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      await notifyEditor({
        recipient_id: project.editor_id,
        type: "comment",
        project_id: project.id,
        message: `💬 Message admin sur la vidéo ${label} — ${project.title}`,
      });
    }
    return { ok: true as const };
  });

/** Admin-only: delete any comment (and its reactions) on a video. */
export const deleteVideoComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ comment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertVideoAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    if (viewer.kind !== "admin") throw new Error("Réservé aux admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comment } = await supabaseAdmin
      .from("video_comments")
      .select("id, project_video_id, author_name")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (!comment) throw new Error("Message introuvable");
    const { video, project } = await assertVideoAccess(comment.project_video_id, viewer);
    await supabaseAdmin.from("comment_reactions").delete().eq("comment_id", data.comment_id);
    const { error } = await supabaseAdmin.from("video_comments").delete().eq("id", data.comment_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `Message de ${comment.author_name || "?"} supprimé sur la vidéo #${String(
        video.video_number,
      ).padStart(2, "0")} de « ${project.title} »`,
      actor_username: viewer.username,
    });
    return { ok: true as const };
  });
export const sendProjectForRevision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess, notifyAdmins } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    if (viewer.kind !== "editor") throw new Error("Réservé aux monteurs");
    const project = await assertProjectAccess(data.project_id, viewer);
    if (project.status !== "En cours" && project.status !== "Corrections") {
      throw new Error("Le projet ne peut pas être envoyé en révision");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ status: "En révision" })
      .eq("id", data.project_id);
    if (error) throw new Error(error.message);
    await notifyAdmins({
      type: "status",
      project_id: project.id,
      message: `🔍 ${viewer.name} a envoyé le projet « ${project.title} » en révision`,
    });
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `« ${project.title} » envoyé en révision par ${viewer.name}`,
      actor_username: viewer.username,
    });
    return { ok: true as const };
  });

export const validateProjectRevision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdminUser } = await import("./auth-sessions.server");
    const admin = await requireAdminUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, title, status, editor_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!project) throw new Error("Projet introuvable");
    if (project.status !== "En révision") throw new Error("Le projet n'est pas en révision");
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ status: "Montage terminé" })
      .eq("id", data.project_id);
    if (error) throw new Error(error.message);
    if (project.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      await notifyEditor({
        recipient_id: project.editor_id,
        type: "status",
        project_id: project.id,
        message: `✅ Ta révision a été validée — projet ${project.title} passé en Montage terminé`,
      });
    }
    await supabaseAdmin.from("admin_activity").insert({
      kind: "projet",
      message: `Révision validée sur « ${project.title} » → Montage terminé`,
      actor_username: admin,
    });
    return { ok: true as const };
  });

export const signWorkspaceUrls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string().max(500)).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer } = await import("./video-workspace.server");
    await resolveViewer();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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