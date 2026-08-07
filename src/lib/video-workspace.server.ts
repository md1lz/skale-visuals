export type Viewer =
  | { kind: "editor"; id: string; name: string; username: string }
  | { kind: "admin"; id: string; name: string; username: string };

export async function resolveViewer(): Promise<Viewer> {
  const { readEditorSession, requireAdminUser } = await import("./auth-sessions.server");
  const sess = await readEditorSession();
  if (sess) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("editor_accounts")
      .select("id, username, display_name, status")
      .eq("id", sess.editorId)
      .maybeSingle();
    if (data && data.status === "active") {
      return { kind: "editor", id: data.id, name: data.display_name, username: data.username };
    }
  }
  const user = await requireAdminUser();
  return { kind: "admin", id: user, name: "Admin Skale", username: user };
}

/** Ensures the viewer may access this project; returns the project row. */
export async function assertProjectAccess(projectId: string, viewer: Viewer) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id, title, status, deadline, brief, rushs_links, editor_id, editor_quantity")
    .eq("id", projectId)
    .maybeSingle();
  if (!data) throw new Error("Projet introuvable");
  if (viewer.kind === "editor" && data.editor_id !== viewer.id) throw new Error("Projet introuvable");
  return data;
}

export async function assertVideoAccess(videoId: string, viewer: Viewer) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: video } = await supabaseAdmin
    .from("project_videos")
    .select("id, project_id, video_number, status")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) throw new Error("Vidéo introuvable");
  const project = await assertProjectAccess(video.project_id, viewer);
  return { video, project };
}

export async function notifyAdmins(input: { type: string; project_id: string; message: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    recipient_type: "admin",
    recipient_id: null,
    type: input.type,
    project_id: input.project_id,
    message: input.message,
  });
}