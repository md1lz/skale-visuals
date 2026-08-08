import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Film,
  Plus,
  Trash2,
  Play,
  EyeOff,
  Link as LinkIcon,
  ExternalLink,
  HardDrive,
  Check,
  CheckCheck,
  SmilePlus,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getProjectWorkspace,
  getVideoWorkspace,
  setVideoStatus,
  createVideoUploadUrl,
  addVideoVersion,
  deleteVideoVersion,
  renameVideoVersion,
  postVideoComment,
  markVideoCommentsRead,
  toggleCommentReaction,
  deleteVideoComment,
  signWorkspaceUrls,
  setVideoScript,
} from "@/lib/video-workspace.functions";
import {
  videoStatusBadgeClass,
  VIDEO_STATUSES,
  EDITOR_VIDEO_STATUSES,
  ADMIN_VIDEO_STATUSES,
  fmtDateTimeFR,
} from "@/lib/project-display";
import {
  driveEmbed,
  driveThumbnail,
  frameioFallbackEmbed,
  linkKind,
  normalizeHref,
} from "@/lib/video-preview";
import { getFrameioPreview } from "@/lib/frameio.functions";

export type WorkspaceRole = "editor" | "admin";

/** Resolves Frame.io embed + poster (no-op for other links). */
function useFrameioPreview(url: string | null) {
  const fetchPreview = useServerFn(getFrameioPreview);
  const enabled = !!url && linkKind(url) === "frameio";
  const { data } = useQuery({
    queryKey: ["frameio-preview", url],
    queryFn: () => fetchPreview({ data: { url: url! } }),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
  if (!enabled) return null;
  return {
    embedUrl: data?.embedUrl ?? frameioFallbackEmbed(url!),
    thumbnailUrl: data?.thumbnailUrl ?? null,
  };
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "✅"];

type VersionRow = {
  id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  title: string | null;
  description: string | null;
  additional_links: unknown;
  created_at: string;
};

type ExtraLink = { title: string; url: string };

function extraLinks(v: { additional_links: unknown }): ExtraLink[] {
  const raw = v.additional_links;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is ExtraLink => !!x && typeof x === "object" && typeof (x as ExtraLink).url === "string")
    .map((x) => ({ title: String(x.title ?? ""), url: String(x.url) }));
}

export function useWorkspace(projectId: string) {
  const fetchWorkspace = useServerFn(getProjectWorkspace);
  return useQuery({
    queryKey: ["workspace", projectId],
    queryFn: () => fetchWorkspace({ data: { project_id: projectId } }),
    refetchInterval: 20_000,
  });
}

export function RushLink({ href, label }: { href: string; label?: string }) {
  const url = normalizeHref(href);
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

/* ---------------- Thumbnails ---------------- */

function VersionThumb({
  url,
  aspect,
  label,
}: {
  url: string | null;
  aspect: string;
  label?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const frameio = useFrameioPreview(url);
  const thumb = url ? (frameio ? frameio.thumbnailUrl : driveThumbnail(url)) : null;

  if (!url) {
    return (
      <div
        className={`${aspect} grid place-items-center rounded-lg border border-dashed border-white/10 bg-neutral-950/70`}
      >
        <Plus className="h-5 w-5 text-neutral-600" />
        <span className="mt-1 text-[10px] text-neutral-600">Aucune version</span>
      </div>
    );
  }

  if (thumb && !failed) {
    return (
      <div className={`${aspect} overflow-hidden rounded-lg border border-white/5 bg-neutral-950/70`}>
        <img
          src={thumb}
          alt={label || "Aperçu de la version"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${aspect} grid place-items-center gap-1 rounded-lg border border-white/5 bg-neutral-950/70 px-2 text-center`}
    >
      <Film className="h-5 w-5 text-red-400" />
      {label && <span className="line-clamp-2 text-[10px] text-neutral-500">{label}</span>}
    </div>
  );
}

/* ---------------- Inline player ---------------- */

function InlinePlayer({ url, aspect }: { url: string; aspect: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const kind = linkKind(url);
  const embed = driveEmbed(url);
  const frameio = useFrameioPreview(url);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = 0.5;
  }, [url]);

  const wrapper = (children: React.ReactNode, hint: React.ReactNode) => (
    <div className="mt-3">
      <div className="mx-auto w-1/2 max-w-full">
        <div className={`${aspect} w-full overflow-hidden rounded-xl border border-white/10 bg-black`}>
          {children}
        </div>
      </div>
      {hint}
    </div>
  );

  if (kind === "frameio" && frameio?.embedUrl) {
    return wrapper(
      <iframe
        src={frameio.embedUrl}
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        className="h-full w-full"
        title="Lecteur Frame.io"
      />,
      <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-neutral-500">
        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
        La vidéo ne se charge pas ? Vérifiez que le lien Frame.io est public (partage sans mot de
        passe).
        <a
          href={normalizeHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-300 underline hover:text-red-200"
        >
          Ouvrir dans Frame.io →
        </a>
      </p>
    );
  }

  if (kind === "drive" && embed) {
    return wrapper(
      <iframe
        src={embed}
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="h-full w-full"
        title="Lecteur vidéo"
      />,
      <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-neutral-500">
        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
        La vidéo ne se charge pas ? Vérifiez que le partage Drive est réglé sur « Tout le monde avec le
        lien ».
        <a
          href={normalizeHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-300 underline hover:text-red-200"
        >
          Ouvrir dans Drive →
        </a>
      </p>
    );
  }

  if (kind === "mp4") {
    return wrapper(
      <video
        ref={videoRef}
        src={url}
        controls
        preload="metadata"
        className="h-full w-full"
      />,
      null
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-4 text-center">
      <p className="text-sm text-neutral-400">Ce type de lien ne peut pas être lu directement ici.</p>
      <a
        href={normalizeHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-500"
      >
        Ouvrir dans un nouvel onglet →
      </a>
    </div>
  );
}

/* ---------------- Board ---------------- */

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
  const aspect = q.data?.project.format === "Court" ? "aspect-[9/16]" : "aspect-video";
  const gridRef = useRef<HTMLDivElement>(null);
  const [listMaxH, setListMaxH] = useState<number | null>(null);

  useEffect(() => {
    if (!openId) {
      setListMaxH(null);
      return;
    }
    const measure = () => {
      const el = gridRef.current;
      const first = el?.firstElementChild as HTMLElement | undefined;
      if (!first) return;
      const gap = 12;
      setListMaxH(first.offsetHeight * 3 + gap * 2 + 4);
    };
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [openId, videos.length, aspect]);

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
    <div
      style={openId && listMaxH ? { height: listMaxH } : undefined}
      className={`flex gap-5 ${openId ? "min-h-[420px] items-stretch" : ""}`}
    >
      <div
        className={
          openId
            ? "h-full w-[30%] shrink-0 min-h-0 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-width:thin]"
            : "w-full"
        }
      >
        <div
          ref={gridRef}
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
              <div className="mb-2">
                <VersionThumb
                  url={v.last_version?.file_url ?? null}
                  aspect={aspect}
                  label={v.last_version?.title || v.last_version?.file_name || null}
                />
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
            className="min-h-0 min-w-0 flex-1 self-stretch"
          >
            <VideoDetail
              videoId={openId}
              projectId={projectId}
              role={role}
              aspect={aspect}
              onClose={() => setOpenId(null)}
              onChanged={onRefresh}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- New version form ---------------- */

function NewVersionForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: {
    title: string;
    url: string;
    description: string;
    additional: ExtraLink[];
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [additional, setAdditional] = useState<ExtraLink[]>([]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Le titre de la version est obligatoire.");
    if (!url.trim()) return toast.error("Le lien principal est obligatoire.");
    await onSubmit({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      additional: additional.filter((a) => a.url.trim()).map((a) => ({ title: a.title.trim(), url: a.url.trim() })),
    });
    setTitle("");
    setUrl("");
    setDescription("");
    setAdditional([]);
  };

  const input =
    "w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none";

  return (
    <div className="mb-3 space-y-2.5 rounded-xl border border-white/10 bg-neutral-950/50 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la version (ex : V1 - Première version) *"
        className={input}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Lien principal (Drive, WeTransfer, lien direct…) *"
        className={input}
      />
      {additional.map((a, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={a.title}
            onChange={(e) =>
              setAdditional((list) => list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
            }
            placeholder="Titre court"
            className={`${input} w-1/3`}
          />
          <input
            value={a.url}
            onChange={(e) =>
              setAdditional((list) => list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
            }
            placeholder="Lien supplémentaire"
            className={input}
          />
          <button
            onClick={() => setAdditional((list) => list.filter((_, j) => j !== i))}
            className="rounded-lg p-2 text-neutral-500 transition hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setAdditional((l) => [...l, { title: "", url: "" }])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-neutral-300 transition hover:bg-white/5"
      >
        <Plus className="h-3 w-3" /> Ajouter un lien
      </button>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Description (optionnel) — explique tes choix, pose une question…"
        className={`${input} resize-y`}
      />
      <button
        onClick={submit}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer cette
        version
      </button>
    </div>
  );
}

/* ---------------- Confirm modal ---------------- */

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[400] grid place-items-center bg-black/70 p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 text-center"
      >
        <p className="text-sm text-white">{message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Oui, supprimer
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Non, annuler
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- Detail ---------------- */

function VideoDetail({
  videoId,
  projectId,
  role,
  aspect,
  onClose,
  onChanged,
}: {
  videoId: string;
  projectId: string;
  role: WorkspaceRole;
  aspect: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const fetchVideo = useServerFn(getVideoWorkspace);
  const updateStatus = useServerFn(setVideoStatus);
  const makeUploadUrl = useServerFn(createVideoUploadUrl);
  const pushVersion = useServerFn(addVideoVersion);
  const dropVersion = useServerFn(deleteVideoVersion);
  const renameVersion = useServerFn(renameVideoVersion);
  const sendComment = useServerFn(postVideoComment);
  const markRead = useServerFn(markVideoCommentsRead);
  const react = useServerFn(toggleCommentReaction);
  const removeComment = useServerFn(deleteVideoComment);
  const signUrls = useServerFn(signWorkspaceUrls);
  const saveScript = useServerFn(setVideoScript);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [script, setScript] = useState("");
  const [scriptDirty, setScriptDirty] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["workspace", "video", videoId],
    queryFn: () => fetchVideo({ data: { video_id: videoId } }),
    refetchInterval: 15_000,
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["workspace", "video", videoId] });
    qc.invalidateQueries({ queryKey: ["workspace", projectId] });
    onChanged?.();
  }, [qc, videoId, projectId, onChanged]);

  // Realtime: read receipts + reactions
  useEffect(() => {
    const channel = supabase
      .channel(`video-${videoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["workspace", "video", videoId] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "video_comments" }, () => {
        qc.invalidateQueries({ queryKey: ["workspace", "video", videoId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, qc]);

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
    setVisibleCount(10);
    setLoadingOlder(false);
  }, [videoId]);

  // Load the video-level script (not per version) when the video changes.
  useEffect(() => {
    const v = q.data?.video as { script?: string | null } | undefined;
    if (!v) return;
    setScript((prev) => (scriptDirty ? prev : v.script ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.video, videoId]);

  useEffect(() => {
    setScriptDirty(false);
  }, [videoId]);

  async function submitScript() {
    if (savingScript) return;
    setSavingScript(true);
    try {
      await saveScript({ data: { video_id: videoId, script } });
      setScriptDirty(false);
      toast.success("Script enregistré");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingScript(false);
    }
  }

  function loadOlder() {
    if (loadingOlder) return;
    setLoadingOlder(true);
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      setVisibleCount((c) => c + 10);
      setLoadingOlder(false);
    }, delay);
  }

  useEffect(() => {
    if (unreadIds.size === 0) return;
    const t = setTimeout(() => {
      markRead({ data: { video_id: videoId } })
        .then(() => {
          qc.invalidateQueries({ queryKey: ["workspace", projectId] });
          qc.invalidateQueries({ queryKey: ["workspace", "video", videoId] });
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [unreadIds, videoId, projectId, markRead, qc]);

  useEffect(() => {
    const paths = ((q.data?.versions ?? []) as VersionRow[])
      .map((v) => v.file_url)
      .filter((u) => u.startsWith("storage://"));
    if (paths.length === 0) return;
    signUrls({ data: { paths } })
      .then(setSigned)
      .catch(() => {});
  }, [q.data, signUrls]);

  async function handleFile(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const { path, token } = await makeUploadUrl({ data: { video_id: videoId, file_name: file.name } });
      const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await pushVersion({
        data: {
          video_id: videoId,
          file_url: `storage://site-videos/${path}`,
          file_name: file.name,
          title: file.name,
        },
      });
      toast.success("Version envoyée");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  }

  async function submitVersion(payload: {
    title: string;
    url: string;
    description: string;
    additional: ExtraLink[];
  }) {
    if (busy) return;
    setBusy(true);
    try {
      await pushVersion({
        data: {
          video_id: videoId,
          file_url: payload.url,
          file_name: payload.title,
          title: payload.title,
          description: payload.description,
          additional_links: payload.additional,
        },
      });
      toast.success("Version envoyée");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteVersion(id: string) {
    setPendingDelete(null);
    try {
      await dropVersion({ data: { version_id: id } });
      if (playingId === id) setPlayingId(null);
      toast.success("Version supprimée");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function saveVersionTitle(id: string) {
    const title = editingTitle.trim();
    setEditingVersion(null);
    if (!title) return;
    try {
      await renameVersion({ data: { version_id: id, title } });
      toast.success("Titre mis à jour");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
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

  async function handleReaction(commentId: string, emoji: string) {
    setPickerFor(null);
    try {
      await react({ data: { comment_id: commentId, emoji } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleDeleteComment(commentId: string) {
    setPickerFor(null);
    try {
      await removeComment({ data: { comment_id: commentId } });
      toast.success("Message supprimé");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
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
  const options: string[] = role === "admin" ? [...ADMIN_VIDEO_STATUSES] : [...EDITOR_VIDEO_STATUSES];
  const versions = (q.data?.versions ?? []) as VersionRow[];
  const reactions = q.data?.reactions ?? [];
  const me = q.data?.viewer;

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
          {video && !options.includes(video.status) && (
            <option value={video.status}>{video.status}</option>
          )}
        </select>
        {role === "admin" && video?.status === "En révision" && (
          <>
            <ValidateRevisionButton
              onClick={() => handleStatus("Approuvée")}
              busy={busy}
            />
            <RequestCorrectionsButton
              onClick={() => handleStatus("Corrections à faire")}
              busy={busy}
            />
          </>
        )}
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
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Script (transcription des dialogues)
          </h4>
          {role === "editor" ? (
            <div className="space-y-2">
              <textarea
                value={script}
                onChange={(e) => {
                  setScript(e.target.value);
                  setScriptDirty(true);
                }}
                rows={6}
                placeholder="Écris ici la transcription des dialogues de cette vidéo…"
                className="w-full resize-y rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={submitScript}
                  disabled={savingScript || !scriptDirty}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {savingScript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Enregistrer le script
                </button>
                {scriptDirty && <span className="text-[11px] text-orange-300">Modifications non enregistrées</span>}
              </div>
            </div>
          ) : script ? (
            <p className="whitespace-pre-wrap rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2.5 text-sm text-neutral-200">
              {script}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Aucun script fourni par le monteur.</p>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Versions</h4>

          {role === "editor" && (
            <>
              <NewVersionForm busy={busy} onSubmit={submitVersion} />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className="mb-3 cursor-pointer rounded-lg border border-dashed border-white/15 px-4 py-4 text-center transition hover:border-red-500/50"
              >
                <Upload className="mx-auto mb-1.5 h-4 w-4 text-neutral-500" />
                <p className="text-[11px] text-neutral-400">
                  {busy ? "Envoi en cours…" : "Ou glisse directement un fichier ici"}
                </p>
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
            </>
          )}

          {versions.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucune version déposée.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v, i) => {
                const src = signed[v.file_url] ?? v.file_url;
                const open = playingId === v.id;
                return (
                  <li
                    key={v.id}
                    className="group rounded-xl border border-white/5 bg-neutral-950/60 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-500/15 text-xs font-semibold text-red-300">
                        V{v.version_number}
                      </span>
                      <div className="min-w-0 flex-1">
                        {editingVersion === v.id ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => void saveVersionTitle(v.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveVersionTitle(v.id);
                              }
                              if (e.key === "Escape") setEditingVersion(null);
                            }}
                            maxLength={200}
                            className="w-full rounded-lg border border-white/15 bg-neutral-900 px-2 py-1 text-sm text-white outline-none focus:border-red-500/50"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVersion(v.id);
                              setEditingTitle(v.title || v.file_name || `Version ${v.version_number}`);
                            }}
                            title="Renommer cette version"
                            className="flex max-w-full items-center gap-1.5 text-left"
                          >
                            <span className="truncate text-sm font-medium text-white">
                              {v.title || v.file_name || `Version ${v.version_number}`}
                            </span>
                            <Pencil className="h-3 w-3 shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        )}
                        <p className="text-[11px] text-neutral-500">{fmtDateTimeFR(v.created_at)}</p>
                        {v.description && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-300">{v.description}</p>
                        )}
                        <div className="mt-1">
                          <RushLink href={src} label={normalizeHref(v.file_url)} />
                        </div>
                        {extraLinks(v).length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {extraLinks(v).map((l, j) => (
                              <li key={j}>
                                {l.title && (
                                  <p className="text-xs font-medium text-neutral-200">{l.title}</p>
                                )}
                                <RushLink href={l.url} label={normalizeHref(l.url)} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {i === 0 && (
                        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                          Actuelle
                        </span>
                      )}
                      <button
                        onClick={() => setPendingDelete(v.id)}
                        title="Supprimer cette version"
                        className="shrink-0 rounded-lg p-1.5 text-neutral-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => setPlayingId(open ? null : v.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-neutral-200 transition hover:bg-white/5"
                    >
                      {open ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Masquer la vidéo
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> Voir la vidéo
                        </>
                      )}
                    </button>
                    {open && <InlinePlayer url={src} aspect={aspect} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Commentaires</h4>
          <div
            className={`mb-3 space-y-3 pr-1.5 ${
              visibleCount > 10
                ? "max-h-[48vh] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                : "overflow-visible"
            }`}
          >
            {(q.data?.comments ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun commentaire sur cette vidéo.</p>
            ) : (
              <>
                {(q.data?.comments ?? []).length > visibleCount && (
                  <div className="flex justify-center pb-1">
                    {loadingOlder ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-neutral-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des anciens messages…
                      </span>
                    ) : (
                      <button
                        onClick={loadOlder}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-neutral-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Charger les anciens messages
                      </button>
                    )}
                  </div>
                )}
                {(q.data?.comments ?? []).slice(-visibleCount).map((c) => {
                const mine = me
                  ? c.author_type === me.kind && (c.author_id ? c.author_id === me.id : true)
                  : c.author_type === role;
                const mineReaction = reactions.find(
                  (r) => r.comment_id === c.id && me && r.author_name === me.name,
                );
                const grouped = new Map<string, number>();
                reactions
                  .filter((r) => r.comment_id === c.id)
                  .forEach((r) => grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1));
                return (
                  <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="group relative max-w-[85%]">
                      <div
                        className={`rounded-xl px-3 py-2 ${
                          mine
                            ? "border border-red-500/20 bg-red-500/10"
                            : "border border-white/10 bg-white/[0.04]"
                        } ${unreadIds.has(c.id) ? "border-l-2 border-l-red-500" : ""}`}
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-white">
                            {mine ? "Moi" : c.author_name}
                          </span>
                          <span className="text-[11px] text-neutral-500">{fmtDateTimeFR(c.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-neutral-200">{c.content}</p>
                        {mine && (
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            {c.read_at ? (
                              <>
                                <span className="text-[10px] text-emerald-400">Lu</span>
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-neutral-500">Envoyé</span>
                                <Check className="h-3.5 w-3.5 text-neutral-500" />
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {grouped.size > 0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                          {[...grouped.entries()].map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(c.id, emoji)}
                              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
                                mineReaction?.emoji === emoji
                                  ? "border-red-500/40 bg-red-500/15 text-white"
                                  : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 1 && <span>{count}</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setPickerFor(pickerFor === c.id ? null : c.id)}
                        className={`absolute top-1 ${
                          mine ? "-left-7" : "-right-7"
                        } rounded-full p-1 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-white`}
                      >
                        <SmilePlus className="h-4 w-4" />
                      </button>

                      {role === "admin" && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          title="Supprimer ce message"
                          className={`absolute top-8 ${
                            mine ? "-left-7" : "-right-7"
                          } rounded-full p-1 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {pickerFor === c.id && (
                        <>
                          <div className="fixed inset-0 z-[290]" onClick={() => setPickerFor(null)} />
                          <div className="absolute bottom-full z-[300] mb-1 flex gap-1 rounded-full border border-white/10 bg-neutral-900 px-2 py-1 shadow-xl">
                            {REACTION_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => handleReaction(c.id, e)}
                                className="rounded-full px-1 text-base transition hover:scale-125"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
                })}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
              rows={2}
              placeholder="Écrire un message…  (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
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

      {pendingDelete && (
        <ConfirmDialog
          message="Êtes-vous sûr de vouloir supprimer cette version ?"
          onConfirm={() => confirmDeleteVersion(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
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

export function RequestCorrectionsButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:opacity-60"
    >
      <Pencil className="h-4 w-4" /> Demander des corrections
    </button>
  );
}