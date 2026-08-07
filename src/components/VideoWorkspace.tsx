import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Upload,
  Send,
  MessageSquare,
  Loader2,
  FileVideo,
  Film,
  Link as LinkIcon,
  ExternalLink,
  HardDrive,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getProjectWorkspace,
  getVideoWorkspace,
  setVideoStatus,
  createVideoUploadUrl,
  addVideoVersion,
  postVideoComment,
  markVideoCommentsRead,
  signWorkspaceUrls,
} from "@/lib/video-workspace.functions";
import {
  videoStatusBadgeClass,
  VIDEO_STATUSES,
  EDITOR_VIDEO_STATUSES,
  fmtDateTimeFR,
} from "@/lib/project-display";

export type WorkspaceRole = "editor" | "admin";

export function useWorkspace(projectId: string) {
  const fetchWorkspace = useServerFn(getProjectWorkspace);
  return useQuery({
    queryKey: ["workspace", projectId],
    queryFn: () => fetchWorkspace({ data: { project_id: projectId } }),
    refetchInterval: 20_000,
  });
}

export function RushLink({ href, label }: { href: string; label?: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  const drive = /drive\.google|docs\.google/.test(url);
  const wetransfer = /wetransfer|we\.tl/.test(url);
  const Icon = drive ? HardDrive : wetransfer ? Upload : LinkIcon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 break-all text-sm text-red-300 transition hover:text-red-200"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label || href}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

export function ProjectVideosBoard({
  projectId,
  role,
  onRefresh,
}: {
  projectId: string;
  role: WorkspaceRole;
  onRefresh?: () => void;
}) {
  const q = useWorkspace(projectId);
  const [openId, setOpenId] = useState<string | null>(null);
  const videos = q.data?.videos ?? [];

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des vidéos…
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-neutral-900/40 px-4 py-6 text-center text-sm text-neutral-500">
        Aucune vidéo — renseigne la quantité dans la fiche projet.
      </p>
    );
  }

  return (
    <div className="flex gap-5">
      <div className={openId ? "w-[30%] shrink-0" : "w-full"}>
        <div
          className={`grid gap-3 ${
            openId ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          }`}
        >
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setOpenId(v.id)}
              className={`group rounded-xl border p-3 text-left transition ${
                openId === v.id
                  ? "border-red-500/60 bg-red-500/[0.07]"
                  : "border-white/10 bg-neutral-900/50 hover:border-white/25 hover:bg-neutral-900"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">
                  #{String(v.video_number).padStart(2, "0")}
                </span>
                {v.unread_comments > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">
                    {v.unread_comments}
                  </span>
                )}
              </div>
              <div className="mb-2 grid aspect-video place-items-center rounded-lg border border-white/5 bg-neutral-950/70">
                {v.last_version ? (
                  <FileVideo className="h-5 w-5 text-red-400" />
                ) : (
                  <Film className="h-5 w-5 text-neutral-600" />
                )}
              </div>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${videoStatusBadgeClass(v.status)}`}
              >
                {v.status}
              </span>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                {v.versions_count} version{v.versions_count > 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openId && (
          <motion.div
            key={openId}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22 }}
            className="min-w-0 flex-1"
          >
            <VideoDetail
              videoId={openId}
              projectId={projectId}
              role={role}
              onClose={() => setOpenId(null)}
              onChanged={onRefresh}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoDetail({
  videoId,
  projectId,
  role,
  onClose,
  onChanged,
}: {
  videoId: string;
  projectId: string;
  role: WorkspaceRole;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const fetchVideo = useServerFn(getVideoWorkspace);
  const updateStatus = useServerFn(setVideoStatus);
  const makeUploadUrl = useServerFn(createVideoUploadUrl);
  const pushVersion = useServerFn(addVideoVersion);
  const sendComment = useServerFn(postVideoComment);
  const markRead = useServerFn(markVideoCommentsRead);
  const signUrls = useServerFn(signWorkspaceUrls);

  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["workspace", "video", videoId],
    queryFn: () => fetchVideo({ data: { video_id: videoId } }),
    refetchInterval: 15_000,
  });

  const unreadIds = useMemo(() => {
    const list = q.data?.comments ?? [];
    return new Set(
      list
        .filter((c) =>
          role === "editor"
            ? c.author_type === "admin" && !c.read_by_editor
            : c.author_type === "editor" && !c.read_by_admin,
        )
        .map((c) => c.id),
    );
  }, [q.data, role]);

  useEffect(() => {
    if (unreadIds.size === 0) return;
    const t = setTimeout(() => {
      markRead({ data: { video_id: videoId } })
        .then(() => qc.invalidateQueries({ queryKey: ["workspace", projectId] }))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [unreadIds, videoId, projectId, markRead, qc]);

  useEffect(() => {
    const paths = (q.data?.versions ?? [])
      .map((v) => v.file_url)
      .filter((u) => u.startsWith("storage://"));
    if (paths.length === 0) return;
    signUrls({ data: { paths } })
      .then(setSigned)
      .catch(() => {});
  }, [q.data, signUrls]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["workspace", "video", videoId] });
    qc.invalidateQueries({ queryKey: ["workspace", projectId] });
    onChanged?.();
  };

  async function handleFile(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const { path, token } = await makeUploadUrl({ data: { video_id: videoId, file_name: file.name } });
      const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await pushVersion({
        data: { video_id: videoId, file_url: `storage://site-videos/${path}`, file_name: file.name },
      });
      toast.success("Version envoyée");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  }

  async function handleLink() {
    if (!link.trim() || busy) return;
    setBusy(true);
    try {
      await pushVersion({ data: { video_id: videoId, file_url: link.trim(), file_name: "" } });
      setLink("");
      toast.success("Version envoyée");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function handleComment() {
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      await sendComment({ data: { video_id: videoId, content: message.trim() } });
      setMessage("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(status: string) {
    setBusy(true);
    try {
      await updateStatus({ data: { video_id: videoId, status: status as (typeof VIDEO_STATUSES)[number] } });
      toast.success(`Statut : ${status}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const video = q.data?.video;
  const options = role === "admin" ? [...VIDEO_STATUSES] : EDITOR_VIDEO_STATUSES;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-neutral-900/50">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        <h3 className="text-base font-semibold text-white">
          Vidéo #{video ? String(video.video_number).padStart(2, "0") : "…"}
        </h3>
        <select
          value={video?.status ?? "À faire"}
          disabled={busy || !video}
          onChange={(e) => handleStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none disabled:opacity-60"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          {video && !options.includes(video.status as (typeof options)[number]) && (
            <option value={video.status}>{video.status}</option>
          )}
        </select>
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-white"
        >
          Fermer <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Rushs source</h4>
          {(q.data?.rushs_links ?? []).length === 0 ? (
            <p className="text-sm text-neutral-500">Aucun rush déposé.</p>
          ) : (
            <ul className="space-y-1.5">
              {(q.data?.rushs_links ?? []).map((l, i) => (
                <li key={i} className="rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2">
                  <RushLink href={l} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Versions</h4>

          {role === "editor" && (
            <div className="mb-3 rounded-xl border border-white/10 bg-neutral-950/50 p-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-lg border border-dashed border-white/15 px-4 py-5 text-center transition hover:border-red-500/50"
              >
                <Upload className="mx-auto mb-1.5 h-5 w-5 text-neutral-500" />
                <p className="text-xs text-neutral-400">
                  {busy ? "Envoi en cours…" : "Glisse un fichier ici"}
                </p>
                <span className="mt-1 inline-block text-[11px] text-red-300 underline">
                  Parcourir les fichiers
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ou coller un lien (Drive, WeTransfer…)"
                  className="flex-1 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
                <button
                  onClick={handleLink}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> Envoyer cette version
                </button>
              </div>
            </div>
          )}

          {(q.data?.versions ?? []).length === 0 ? (
            <p className="text-sm text-neutral-500">Aucune version déposée.</p>
          ) : (
            <ul className="space-y-2">
              {(q.data?.versions ?? []).map((v, i) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-950/60 px-3 py-2.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-500/15 text-xs font-semibold text-red-300">
                    V{v.version_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-400">{fmtDateTimeFR(v.created_at)}</p>
                    <RushLink href={signed[v.file_url] ?? v.file_url} label={v.file_name} />
                  </div>
                  {i === 0 && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                      Actuelle
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Commentaires</h4>
          <div className="mb-3 space-y-2">
            {(q.data?.comments ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun commentaire sur cette vidéo.</p>
            ) : (
              (q.data?.comments ?? []).map((c) => {
                const mine = c.author_type === role;
                return (
                  <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        mine
                          ? "border border-red-500/20 bg-red-500/10"
                          : "border border-white/10 bg-white/[0.04]"
                      } ${unreadIds.has(c.id) ? "border-l-2 border-l-red-500" : ""}`}
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{c.author_name}</span>
                        <span className="text-[11px] text-neutral-500">{fmtDateTimeFR(c.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-neutral-200">{c.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Écrire un message…"
              className="flex-1 resize-none rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
            <button
              onClick={handleComment}
              disabled={busy}
              className="inline-flex items-center gap-1.5 self-end rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              <MessageSquare className="h-4 w-4" /> Envoyer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ValidateRevisionButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
    >
      <Check className="h-4 w-4" /> Valider la révision
    </button>
  );
}