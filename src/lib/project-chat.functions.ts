import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getProjectChat = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const project = await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: comments }, { data: videos }] = await Promise.all([
      supabaseAdmin
        .from("project_comments")
        .select(
          "id, author_type, author_id, author_name, content, image_url, audio_url, audio_duration, read_by_editor, read_by_admin, read_at, reply_to, created_at",
        )
        .eq("project_id", data.project_id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("project_videos")
        .select("id, video_number, title")
        .eq("project_id", data.project_id)
        .order("video_number", { ascending: true }),
    ]);

    const signRef = async (ref: string | null) => {
      const m = ref?.match(/^storage:\/\/site-videos\/(.+)$/);
      if (!m) return ref ?? null;
      const { data: s } = await supabaseAdmin.storage
        .from("site-videos")
        .createSignedUrl(decodeURIComponent(m[1]!), 60 * 60 * 24);
      return s?.signedUrl ?? null;
    };
    await Promise.all(
      (comments ?? []).map(async (c) => {
        c.image_url = await signRef(c.image_url);
        c.audio_url = await signRef(c.audio_url);
      }),
    );

    const ids = (comments ?? []).map((c) => c.id);
    const { data: reactions } = ids.length
      ? await supabaseAdmin
          .from("project_comment_reactions")
          .select("id, comment_id, author_type, author_id, author_name, emoji")
          .in("comment_id", ids)
      : { data: [] as never[] };

    return {
      viewer: { kind: viewer.kind, id: viewer.id, name: viewer.name },
      project: { id: project.id, title: project.title },
      videos: videos ?? [],
      comments: comments ?? [],
      reactions: reactions ?? [],
    };
  });

export const postProjectComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        content: z.string().trim().max(4000).optional().default(""),
        image_path: z.string().trim().max(500).nullish(),
        audio_path: z.string().trim().max(500).nullish(),
        audio_duration: z.number().int().min(0).max(600).nullish(),
        reply_to: z.string().uuid().nullish(),
      })
      .refine((v) => Boolean(v.content || v.image_path || v.audio_path), { message: "Message vide" })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess, notifyAdmins } = await import(
      "./video-workspace.server"
    );
    const viewer = await resolveViewer();
    const project = await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("project_comments").insert({
      project_id: data.project_id,
      author_type: viewer.kind,
      author_id: viewer.id,
      author_name: viewer.name,
      content: data.content,
      image_url: data.image_path ? `storage://site-videos/${data.image_path}` : null,
      audio_url: data.audio_path ? `storage://site-videos/${data.audio_path}` : null,
      audio_duration: data.audio_duration ?? null,
      reply_to: data.reply_to ?? null,
      read_by_editor: viewer.kind === "editor",
      read_by_admin: viewer.kind === "admin",
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("project_typing_indicators")
      .delete()
      .eq("project_id", data.project_id)
      .eq("author_id", viewer.id);

    if (viewer.kind === "editor") {
      await notifyAdmins({
        type: "comment",
        project_id: project.id,
        message: `💬 ${viewer.name} a écrit dans le chat du projet « ${project.title} »`,
      });
    } else if (project.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      await notifyEditor({
        recipient_id: project.editor_id,
        type: "comment",
        project_id: project.id,
        message: `💬 Message admin dans le chat du projet « ${project.title} »`,
      });
    }
    return { ok: true as const };
  });

export const markProjectCommentsRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = viewer.kind === "editor" ? { read_by_editor: true } : { read_by_admin: true };
    await supabaseAdmin
      .from("project_comments")
      .update({ ...patch, read_at: new Date().toISOString() })
      .eq("project_id", data.project_id)
      .neq("author_type", viewer.kind);
    await supabaseAdmin.from("project_comments").update(patch).eq("project_id", data.project_id);
    return { ok: true as const };
  });

export const toggleProjectCommentReaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ comment_id: z.string().uuid(), emoji: z.string().trim().min(1).max(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comment } = await supabaseAdmin
      .from("project_comments")
      .select("id, project_id")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (!comment) throw new Error("Message introuvable");
    await assertProjectAccess(comment.project_id, viewer);

    const { data: existing } = await supabaseAdmin
      .from("project_comment_reactions")
      .select("id, emoji")
      .eq("comment_id", data.comment_id)
      .eq("author_id", viewer.id)
      .maybeSingle();

    if (existing && existing.emoji === data.emoji) {
      await supabaseAdmin.from("project_comment_reactions").delete().eq("id", existing.id);
      return { ok: true as const, removed: true };
    }
    if (existing) {
      await supabaseAdmin
        .from("project_comment_reactions")
        .update({ emoji: data.emoji })
        .eq("id", existing.id);
      return { ok: true as const, removed: false };
    }
    const { error } = await supabaseAdmin.from("project_comment_reactions").insert({
      comment_id: data.comment_id,
      author_type: viewer.kind,
      author_id: viewer.id,
      author_name: viewer.name,
      emoji: data.emoji,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, removed: false };
  });

export const deleteProjectComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ comment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    if (viewer.kind !== "admin") throw new Error("Réservé aux admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("project_comment_reactions").delete().eq("comment_id", data.comment_id);
    const { error } = await supabaseAdmin
      .from("project_comments")
      .delete()
      .eq("id", data.comment_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createProjectChatUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        file_name: z.string().trim().min(1).max(200),
        kind: z.enum(["image", "audio"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const path = `chat/${data.project_id}/general/${data.kind}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload impossible");
    return { path, token: signed.token };
  });

export const setProjectTyping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ project_id: z.string().uuid(), state: z.enum(["typing", "recording", "off"]) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.state === "off") {
      await supabaseAdmin
        .from("project_typing_indicators")
        .delete()
        .eq("project_id", data.project_id)
        .eq("author_id", viewer.id);
      return { ok: true as const };
    }
    await supabaseAdmin.from("project_typing_indicators").upsert(
      {
        project_id: data.project_id,
        author_type: viewer.kind,
        author_id: viewer.id,
        author_name: viewer.name,
        is_recording_audio: data.state === "recording",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,author_type,author_id" },
    );
    return { ok: true as const };
  });

export const getProjectTyping = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveViewer, assertProjectAccess } = await import("./video-workspace.server");
    const viewer = await resolveViewer();
    await assertProjectAccess(data.project_id, viewer);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("project_typing_indicators")
      .select("author_name, author_id, is_recording_audio, updated_at")
      .eq("project_id", data.project_id);
    const cutoff = Date.now() - 4000;
    const active = (rows ?? [])
      .filter((r) => r.author_id !== viewer.id && new Date(r.updated_at).getTime() > cutoff)
      .sort((a, b) => Number(b.is_recording_audio) - Number(a.is_recording_audio))[0];
    if (!active) return null;
    return { name: active.author_name || "Quelqu'un", recording: active.is_recording_audio };
  });
/** Latest unread chat message for the current viewer, for the in-app banner. */
export const getLatestUnreadMessage = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveViewer } = await import("./video-workspace.server");
  const viewer = await resolveViewer();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const readCol = viewer.kind === "editor" ? "read_by_editor" : "read_by_admin";
  const otherKind = viewer.kind === "editor" ? "admin" : "editor";

  const [{ data: projectMsgs }, { data: videoMsgs }] = await Promise.all([
    supabaseAdmin
      .from("project_comments")
      .select("id, project_id, author_name, author_type, content, image_url, audio_url, created_at")
      .eq("author_type", otherKind)
      .eq(readCol, false)
      .order("created_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("video_comments")
      .select(
        "id, project_video_id, author_name, author_type, content, image_url, audio_url, created_at",
      )
      .eq("author_type", otherKind)
      .eq(readCol, false)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const candidates: Array<{
    id: string;
    author_name: string;
    content: string | null;
    image_url: string | null;
    audio_url: string | null;
    created_at: string;
    project_id: string | null;
    video_id: string | null;
  }> = [];
  const pm = projectMsgs?.[0];
  if (pm)
    candidates.push({
      id: pm.id,
      author_name: pm.author_name,
      content: pm.content,
      image_url: pm.image_url,
      audio_url: pm.audio_url,
      created_at: pm.created_at,
      project_id: pm.project_id,
      video_id: null,
    });
  const vm = videoMsgs?.[0];
  if (vm) {
    const { data: pv } = await supabaseAdmin
      .from("project_videos")
      .select("id, project_id")
      .eq("id", vm.project_video_id)
      .maybeSingle();
    candidates.push({
      id: vm.id,
      author_name: vm.author_name,
      content: vm.content,
      image_url: vm.image_url,
      audio_url: vm.audio_url,
      created_at: vm.created_at,
      project_id: pv?.project_id ?? null,
      video_id: vm.project_video_id,
    });
  }
  if (candidates.length === 0) return null;

  const latest = candidates.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]!;
  if (!latest.project_id) return null;

  // Only surface a truly fresh message (last 2 minutes) as a banner.
  if (Date.now() - new Date(latest.created_at).getTime() > 120_000) return null;

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("title")
    .eq("id", latest.project_id)
    .maybeSingle();

  return {
    id: latest.id,
    author_name: latest.author_name,
    preview:
      (latest.content || "").replace(/#\[([^\]\n]+)\]\(vid:[0-9a-fA-F-]{36}\)/g, "#$1") ||
      (latest.image_url ? "Photo" : "Message vocal"),
    project_id: latest.project_id,
    project_title: project?.title ?? "Projet",
    video_id: latest.video_id,
    role: viewer.kind,
  };
});
