import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getProjectChat,
  postProjectComment,
  markProjectCommentsRead,
  toggleProjectCommentReaction,
  deleteProjectComment,
  createProjectChatUploadUrl,
  setProjectTyping,
  getProjectTyping,
} from "@/lib/project-chat.functions";
import { InstaChat, type InstaMessage, type InstaSendPayload } from "@/components/InstaChat";
import { videoLabel } from "@/lib/project-display";

export function ProjectChat({
  projectId,
  role,
  onOpenVideo,
}: {
  projectId: string;
  role: "editor" | "admin";
  onOpenVideo?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const fetchChat = useServerFn(getProjectChat);
  const sendComment = useServerFn(postProjectComment);
  const markRead = useServerFn(markProjectCommentsRead);
  const react = useServerFn(toggleProjectCommentReaction);
  const removeComment = useServerFn(deleteProjectComment);
  const makeUpload = useServerFn(createProjectChatUploadUrl);
  const pingTyping = useServerFn(setProjectTyping);
  const fetchTyping = useServerFn(getProjectTyping);

  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["project-chat", projectId],
    queryFn: () => fetchChat({ data: { project_id: projectId } }),
    refetchInterval: 10_000,
  });

  const typingQ = useQuery({
    queryKey: ["project-chat", "typing", projectId],
    queryFn: () => fetchTyping({ data: { project_id: projectId } }),
    refetchInterval: open ? 2000 : false,
    staleTime: 0,
  });

  const comments = (q.data?.comments ?? []) as InstaMessage[];
  const reactions = (q.data?.reactions ?? []) as never[];
  const viewer = q.data?.viewer;
  const videos = q.data?.videos ?? [];

  const unreadIds = useMemo(
    () =>
      comments.filter((c) =>
        role === "editor"
          ? c.author_type === "admin" && !c.read_by_editor
          : c.author_type === "editor" && !c.read_by_admin,
      ),
    [comments, role],
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["project-chat", projectId] });
  }, [qc, projectId]);

  useEffect(() => {
    if (!open || unreadIds.length === 0) return;
    const t = setTimeout(() => {
      markRead({ data: { project_id: projectId } }).then(refresh).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [open, unreadIds.length, projectId, markRead, refresh]);

  async function uploadChatFile(blob: Blob, kind: "image" | "audio", fileName: string) {
    const { path, token } = await makeUpload({
      data: { project_id: projectId, file_name: fileName, kind },
    });
    const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, blob);
    if (error) throw new Error(error.message);
    return path;
  }

  async function handleSend(p: InstaSendPayload) {
    let image_path: string | null = null;
    let audio_path: string | null = null;
    if (p.imageFile) image_path = await uploadChatFile(p.imageFile, "image", p.imageFile.name);
    if (p.voice) {
      const ext = p.voice.blob.type.includes("mp4") ? "mp4" : "webm";
      audio_path = await uploadChatFile(p.voice.blob, "audio", `vocal.${ext}`);
    }
    await sendComment({
      data: {
        project_id: projectId,
        content: p.content,
        image_path,
        audio_path,
        audio_duration: p.voice ? Math.max(1, Math.round(p.voice.seconds)) : null,
        reply_to: p.replyTo,
      },
    });
    refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 px-4 py-3.5 text-left transition hover:border-white/25 hover:bg-neutral-900"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-white">
          <MessagesSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Chat général du projet</p>
          <p className="truncate text-[12px] text-neutral-500">
            {comments.length === 0
              ? "Aucun message — « # » pour mentionner une vidéo"
              : `${comments[comments.length - 1]?.author_name} : ${
                  comments[comments.length - 1]?.content?.replace(
                    /#\[([^\]\n]+)\]\(vid:[0-9a-fA-F-]{36}\)/g,
                    "#$1",
                  ) || (comments[comments.length - 1]?.image_url ? "Photo" : "Message vocal")
                }`}
          </p>
        </div>
        {unreadIds.length > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">
            {unreadIds.length}
          </span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
      </button>

      <InstaChat
        open={open}
        onClose={() => setOpen(false)}
        title={q.data?.project.title ?? "Projet"}
        subtitle="Chat général du projet"
        messages={comments}
        reactions={reactions}
        viewerId={viewer?.id ?? null}
        viewerKind={role}
        canDelete={role === "admin"}
        typing={typingQ.data ?? null}
        mentions={videos.map((v) => ({ id: v.id, label: videoLabel(v) }))}
        onOpenMention={(id) => {
          setOpen(false);
          onOpenVideo?.(id);
        }}
        placeholder="Message du projet…  (# pour mentionner une vidéo)"
        onSend={handleSend}
        onReact={async (id, emoji) => {
          try {
            await react({ data: { comment_id: id, emoji } });
            refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erreur");
          }
        }}
        onDelete={async (id) => {
          try {
            await removeComment({ data: { comment_id: id } });
            refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erreur");
          }
        }}
        onTyping={(state) => {
          void pingTyping({ data: { project_id: projectId, state } }).catch(() => {});
        }}
      />
    </>
  );
}
