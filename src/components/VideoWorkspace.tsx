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
  ChevronDown,
  Copy,
} from "lucide-react";
import { ImageIcon, Mic, Pause, Square } from "lucide-react";
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
  createChatUploadUrl,
  setTypingIndicator,
  getTypingIndicator,
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
  const detailRef = useRef<HTMLDivElement>(null);
  const [listMaxH, setListMaxH] = useState<number | null>(null);

  useEffect(() => {
    if (!openId) {
      setListMaxH(null);
      return;
    }
    // The left list matches the height of the open video panel, and scrolls
    // internally while the panel itself grows with its content.
    const measure = () => {
      const el = detailRef.current;
      if (!el) return;
      setListMaxH(Math.max(320, el.offsetHeight));
    };
    const t = setTimeout(measure, 60);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (detailRef.current && ro) ro.observe(detailRef.current);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      ro?.disconnect();
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
    <div className={`flex gap-5 ${openId ? "items-start" : ""}`}>
      <div
        style={openId && listMaxH ? { maxHeight: listMaxH } : undefined}
        className={
          openId
            ? "w-[30%] shrink-0 min-h-0 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-width:thin]"
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
                <span className="flex items-center gap-1.5">
                  {role === "admin" && v.status === "En révision" && (
                    <span
                      title="Nouvelle version à réviser"
                      className="relative flex h-2.5 w-2.5"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                    </span>
                  )}
                  {v.unread_comments > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">
                      {v.unread_comments}
                    </span>
                  )}
                </span>
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
            ref={detailRef}
            className="min-w-0 flex-1"
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
  const makeChatUpload = useServerFn(createChatUploadUrl);
  const pingTyping = useServerFn(setTypingIndicator);
  const fetchTyping = useServerFn(getTypingIndicator);

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
  const [chatUnlocked, setChatUnlocked] = useState(false);
  const [script, setScript] = useState("");
  const [scriptDirty, setScriptDirty] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLocalUrl, setAudioLocalUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recCancelledRef = useRef(false);
  const typingSentAtRef = useRef(0);
  const typingOffRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = useQuery({
    queryKey: ["workspace", "video", videoId],
    queryFn: () => fetchVideo({ data: { video_id: videoId } }),
    refetchInterval: 15_000,
  });

  // Live "is typing / is recording" state of the other party.
  const typingQ = useQuery({
    queryKey: ["workspace", "typing", videoId],
    queryFn: () => fetchTyping({ data: { video_id: videoId } }),
    refetchInterval: 2000,
    staleTime: 0,
  });

  const sendTyping = useCallback(
    (state: "typing" | "recording" | "off") => {
      void pingTyping({ data: { video_id: videoId, state } }).catch(() => {});
    },
    [pingTyping, videoId],
  );

  const notifyTyping = useCallback(
    (value: string) => {
      if (typingOffRef.current) clearTimeout(typingOffRef.current);
      if (!value.trim()) {
        typingSentAtRef.current = 0;
        sendTyping("off");
        return;
      }
      const now = Date.now();
      if (now - typingSentAtRef.current > 1800) {
        typingSentAtRef.current = now;
        sendTyping("typing");
      }
      typingOffRef.current = setTimeout(() => {
        typingSentAtRef.current = 0;
        sendTyping("off");
      }, 4000);
    },
    [sendTyping],
  );

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
    setChatOpen(true);
    setScriptOpen(false);
    setChatUnlocked(false);
  }, [videoId]);

  // Leaving the page (or unmounting this video) must always reset the chat to
  // its default state so old messages are not still "loaded" when coming back.
  useEffect(() => {
    return () => {
      setVisibleCount(10);
      setLoadingOlder(false);
      setChatOpen(true);
      setScriptOpen(false);
      setChatUnlocked(false);
    };
  }, []);

  // If messages get deleted and 10 or fewer remain, collapse back to the
  // non-scrollable view automatically.
  const totalComments = (q.data?.comments ?? []).length;
  useEffect(() => {
    if (totalComments <= 10) {
      setVisibleCount(10);
      setChatUnlocked(false);
    }
  }, [totalComments]);
  const chatScrollable = chatUnlocked;

  // Locked mode always pins the view to the most recent message.
  useEffect(() => {
    if (chatUnlocked) return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatUnlocked, totalComments, chatOpen, visibleCount]);

  function toggleChatLock() {
    if (chatUnlocked) {
      setChatUnlocked(false);
      setVisibleCount(10);
      requestAnimationFrame(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } else {
      setChatUnlocked(true);
      setVisibleCount((c) => Math.max(c, totalComments));
      requestAnimationFrame(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }

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
    if ((!message.trim() && !imageFile && !audioBlob) || busy) return;
    setBusy(true);
    try {
      let image_path: string | null = null;
      let audio_path: string | null = null;
      if (imageFile) image_path = await uploadChatFile(imageFile, "image", imageFile.name);
      if (audioBlob) {
        const ext = (audioBlob.type.includes("mp4") ? "mp4" : "webm") as string;
        audio_path = await uploadChatFile(audioBlob, "audio", `vocal.${ext}`);
      }
      await sendComment({
        data: {
          video_id: videoId,
          content: message.trim(),
          image_path,
          audio_path,
          audio_duration: audioBlob ? Math.max(1, Math.round(audioDuration)) : null,
        },
      });
      setMessage("");
      clearImage();
      clearAudio();
      if (typingOffRef.current) clearTimeout(typingOffRef.current);
      typingSentAtRef.current = 0;
      sendTyping("off");
      refresh();
      setChatOpen(true);
      setTimeout(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }, 250);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function uploadChatFile(blob: Blob, kind: "image" | "audio", fileName: string) {
    const { path, token } = await makeChatUpload({
      data: { video_id: videoId, file_name: fileName, kind },
    });
    const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, blob);
    if (error) throw new Error(error.message);
    return path;
  }

  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("Format non supporté (jpg, png, gif, webp)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde, max 5 Mo");
      return;
    }
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearAudio() {
    setAudioLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioBlob(null);
    setAudioDuration(0);
  }

  async function startRecording() {
    if (recording) return;
    clearAudio();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Autorisez l'accès au microphone dans les paramètres de votre navigateur.");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recChunksRef.current = [];
    recCancelledRef.current = false;
    rec.ondataavailable = (e) => e.data.size && recChunksRef.current.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      sendTyping("off");
      setRecording(false);
      const seconds = recSecondsRef.current;
      setRecSeconds(0);
      if (recCancelledRef.current) return;
      const blob = new Blob(recChunksRef.current, { type: mime });
      if (!blob.size) return;
      setAudioBlob(blob);
      setAudioDuration(Math.max(1, seconds));
      setAudioLocalUrl(URL.createObjectURL(blob));
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setRecSeconds(0);
    recSecondsRef.current = 0;
    sendTyping("recording");
    recTimerRef.current = setInterval(() => {
      recSecondsRef.current += 1;
      setRecSeconds(recSecondsRef.current);
      if (recSecondsRef.current % 2 === 0) sendTyping("recording");
      if (recSecondsRef.current >= 120) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function cancelRecording() {
    recCancelledRef.current = true;
    stopRecording();
    clearAudio();
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-2xl border border-white/10 bg-neutral-900/50">
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
        {role === "editor" && video?.status === "Corrections à faire" && (
          <ResubmitRevisionButton onClick={() => handleStatus("En révision")} busy={busy} />
        )}
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-white"
        >
          Fermer <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <section className="rounded-xl border border-white/5 bg-neutral-950/40">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              onClick={() => setScriptOpen((o) => !o)}
              className="flex flex-1 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-300 transition hover:text-white"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${scriptOpen ? "rotate-0" : "-rotate-90"}`} />
              Script (transcription)
              <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-normal normal-case tracking-normal text-neutral-400">
                {script ? `${script.length} caractères — appuyer pour afficher` : "vide"}
              </span>
            </button>
            {script && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(script);
                  toast.success("Script copié");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" /> Copier
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {scriptOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3">
                  {role === "editor" ? (
                    <div className="space-y-2">
                      <textarea
                        value={script}
                        onChange={(e) => {
                          setScript(e.target.value);
                          setScriptDirty(true);
                        }}
                        rows={10}
                        placeholder="Écris ici la transcription des dialogues de cette vidéo…"
                        className="w-full resize-y rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={submitScript}
                          disabled={savingScript || !scriptDirty}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          {savingScript ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Enregistrer le script
                        </button>
                        {scriptDirty && (
                          <span className="text-[11px] text-orange-300">Modifications non enregistrées</span>
                        )}
                      </div>
                    </div>
                  ) : script ? (
                    <p className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2.5 text-sm text-neutral-200">
                      {script}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500">Aucun script fourni par le monteur.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/50">
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-300 transition hover:text-white"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${chatOpen ? "rotate-0" : "-rotate-90"}`} />
          Chat de la vidéo
          <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-normal normal-case tracking-normal text-neutral-400">
            {(q.data?.comments ?? []).length} message{(q.data?.comments ?? []).length > 1 ? "s" : ""}
          </span>
          {unreadIds.size > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">
              {unreadIds.size}
            </span>
          )}
        </button>
        {chatOpen && (
        <section className="border-t border-white/10 px-5 py-4">
          <div className="relative mb-3 h-[22rem]">
            <div className="chat-fade-top pointer-events-none absolute inset-x-0 top-0 z-20 h-16 rounded-t-xl" />
            <button
              type="button"
              onClick={toggleChatLock}
              className="absolute right-1.5 top-1.5 z-30 rounded-full border border-white/10 bg-neutral-900/80 px-2.5 py-1 text-[11px] text-neutral-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              {chatUnlocked ? "Verrouiller" : "↑ Voir les anciens messages"}
            </button>
            <div
              ref={chatScrollRef}
              className={`flex h-full flex-col gap-3 pr-1.5 ${
                chatScrollable
                  ? "overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                  : "justify-end overflow-hidden"
              }`}
            >
            <div className="mt-auto space-y-3">
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
            </div>
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
        )}
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

export function ResubmitRevisionButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
    >
      <Check className="h-4 w-4" /> Renvoyer en révision
    </button>
  );
}
/* ------------------------------ Chat médias ------------------------------ */

export function fmtSec(total: number) {
  const s = Math.max(0, Math.floor(total || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Pièce jointe"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

const WAVE_BARS = Array.from({ length: 32 }, (_, i) => 30 + ((i * 37) % 70));

function VoiceBubble({ src, duration }: { src: string; duration: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [rate, setRate] = useState(1);
  const total = duration || 0;
  const pct = total ? Math.min(100, (time / total) * 100) : 0;

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.playbackRate = rate;
      void a.play();
    } else a.pause();
  }

  function cycleRate() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="mt-1 flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[2px]">
        {WAVE_BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`w-[3px] rounded-full ${
              (i / WAVE_BARS.length) * 100 <= pct ? "bg-red-400" : "bg-white/25"
            }`}
          />
        ))}
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-neutral-400">
        {fmtSec(time)} / {fmtSec(total)}
      </span>
      <button
        onClick={cycleRate}
        className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-300 transition hover:bg-white/10"
      >
        x{rate}
      </button>
    </div>
  );
}
