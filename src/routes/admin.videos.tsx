import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Upload, Link as LinkIcon, Loader2, Check, Video as VideoIcon, Image as ImageIcon, AlertTriangle,
} from "lucide-react";
import { listAllVideos, updateVideo, createVideoUploadUrl, createVideoPlaybackUrl } from "@/lib/admin-videos.functions";
import { logAdminActivity } from "@/lib/admin-activity.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/videos")({ component: AdminVideosPage });

type Carousel = {
  key: string; label: string; description: string | null; position: number;
  media_kind: "video" | "image"; aspect: "16/9" | "1/1" | "9/16"; show_title: boolean; show_source: boolean;
};
type Video = {
  id: string; carousel_key: string; title: string; source_url: string;
  playback_url?: string;
  source_label: string; thumbnail_url: string | null;
  thumbnail_playback_url?: string | null;
  format: "court" | "long" | "miniature"; visible: boolean; position: number;
};

function detectEmbed(url: string): { kind: "youtube" | "vimeo" | "drive" | "loom" | "streamable" | "video" | "image" | "none"; src: string } {
  if (!url) return { kind: "none", src: "" };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return { kind: "drive", src: `https://drive.google.com/file/d/${dr[1]}/preview` };
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return { kind: "loom", src: `https://www.loom.com/embed/${loom[1]}` };
  const stream = url.match(/streamable\.com\/(?:e\/)?([\w-]+)/);
  if (stream) return { kind: "streamable", src: `https://streamable.com/e/${stream[1]}` };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { kind: "video", src: url };
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)) return { kind: "image", src: url };
  return { kind: "none", src: url };
}

function MediaPreview({ url }: { url: string }) {
  const { kind, src } = detectEmbed(url);
  if (kind === "none") return null;
  if (kind === "image") return <img src={src} className="w-full h-full object-cover" alt="" />;
  if (kind === "video") return <video src={src} className="w-full h-full object-cover" muted playsInline controls />;
  return <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
}

function aspectClass(a: string) {
  if (a === "1/1") return "aspect-square";
  if (a === "9/16") return "aspect-[9/16]";
  return "aspect-video";
}

function dropHint(c: Carousel) {
  if (c.media_kind === "image") return "Dépose ton image horizontale ici";
  if (c.aspect === "1/1") return "Dépose ta vidéo carrée ici";
  if (c.aspect === "9/16") return "Dépose ta vidéo verticale ici";
  return "Dépose ta vidéo horizontale ici";
}

function acceptFor(c: Carousel) {
  return c.media_kind === "image" ? "image/*" : "video/*";
}

function storagePathFromReference(url: string) {
  const match = url.match(/^storage:\/\/site-videos\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---- Dirty cards tracker ----
type DirtyEntry = { save: () => Promise<void> };
type DirtyCtx = {
  setDirty: (id: string, entry: DirtyEntry | null) => void;
};
const DirtyContext = createContext<DirtyCtx>({ setDirty: () => {} });

function AdminVideosPage() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dirtyRef = useRef<Map<string, DirtyEntry>>(new Map());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [blockerBusy, setBlockerBusy] = useState(false);
  const [localPrompt, setLocalPrompt] = useState<null | (() => void)>(null);
  const [savingAll, setSavingAll] = useState(false);

  const setDirty = useCallback((id: string, entry: DirtyEntry | null) => {
    if (entry) dirtyRef.current.set(id, entry);
    else dirtyRef.current.delete(id);
    setDirtyCount(dirtyRef.current.size);
  }, []);

  // Block route changes when there are unsaved edits
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current.size > 0,
    withResolver: true,
  });
  const blockerOpen = blocker.status === "blocked" || !!localPrompt;

  // Block tab close / hard refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  async function saveAllDirty() {
    const entries = [...dirtyRef.current.values()];
    for (const e of entries) {
      try { await e.save(); } catch { /* card shows its own error */ }
    }
  }

  async function handleSaveAll() {
    if (dirtyRef.current.size === 0 || savingAll) return;
    setSavingAll(true);
    try { await saveAllDirty(); } finally { setSavingAll(false); }
  }

  function proceedLeave() {
    if (blocker.status === "blocked") blocker.proceed();
    if (localPrompt) { localPrompt(); setLocalPrompt(null); }
  }
  function cancelLeave() {
    if (blocker.status === "blocked") blocker.reset();
    if (localPrompt) setLocalPrompt(null);
  }
  function handleBlockerSave() {
    setBlockerBusy(true);
    saveAllDirty().finally(() => {
      setBlockerBusy(false);
      proceedLeave();
    });
  }
  function handleBlockerDiscard() {
    dirtyRef.current.clear();
    setDirtyCount(0);
    proceedLeave();
  }
  function handleBlockerCancel() { cancelLeave(); }

  // Intercept the in-page "Changer de carrousel" too
  function requestLeaveCarousel() {
    if (dirtyRef.current.size === 0) { setSelectedKey(null); return; }
    setLocalPrompt(() => () => setSelectedKey(null));
  }

  async function reload() {
    setLoading(true);
    try {
      const res = await listAllVideos();
      setCarousels(res.carousels as Carousel[]);
      setVideos(res.videos as Video[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const selected = useMemo(() => carousels.find((c) => c.key === selectedKey) ?? null, [carousels, selectedKey]);
  const cases = useMemo(
    () => videos.filter((v) => v.carousel_key === selectedKey).sort((a, b) => a.position - b.position),
    [videos, selectedKey],
  );

  function patchLocal(id: string, patch: Partial<Video>) {
    setVideos((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <DirtyContext.Provider value={{ setDirty }}>
    <div className="p-8 mx-auto max-w-[1400px] w-full">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {selected && (
            <button
              onClick={requestLeaveCarousel}
              className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white px-3 py-1.5 -ml-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Changer de carrousel
            </button>
          )}
          <h1 className="mt-2 text-3xl font-bold flex items-center gap-3">
            <VideoIcon className="h-7 w-7 text-red-500" /> {selected ? selected.label : "Vidéos"}
          </h1>
          {!selected && (
            <p className="mt-1 text-sm text-neutral-400">
              Panneau de contrôle des carrousels affichés sur le site public. Chaque modification se reflète immédiatement.
            </p>
          )}
          {selected?.description && (
            <p className="mt-1 text-sm text-neutral-400 max-w-2xl">{selected.description}</p>
          )}
        </div>

        <div className="self-center shrink-0">
          <button
            onClick={handleSaveAll}
            disabled={savingAll || dirtyCount === 0}
            className="inline-flex items-center gap-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 disabled:shadow-none transition-all"
          >
            {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {savingAll ? "Enregistrement…" : "Enregistrer"}
            {dirtyCount > 0 && !savingAll && (
              <span className="ml-1 grid place-items-center h-5 min-w-5 px-1.5 rounded-full bg-white/20 text-[11px] font-bold">
                {dirtyCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {dirtyCount > 0 && (
          <motion.div
            key="dirty-banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className="flex items-center gap-3 rounded-full bg-amber-500/15 border border-amber-500/40 backdrop-blur-md pl-4 pr-2 py-2 shadow-2xl shadow-black/40">
              <span className="grid place-items-center h-7 w-7 rounded-full bg-amber-500/25 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-sm text-amber-100">
                {dirtyCount} modification{dirtyCount > 1 ? "s" : ""} non enregistrée{dirtyCount > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-60 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {savingAll ? "…" : "Enregistrer"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : !selected ? (
        <div className="max-w-xl">
          <label className="text-xs uppercase tracking-wide text-neutral-400">MODIFIER UNE RUBRIQUE DE VIDÉOS</label>
          <div className="relative mt-1">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 bg-neutral-900 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <span className="text-neutral-400">Sélectionner un carrousel…</span>
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 mt-2 w-full bg-neutral-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                >
                  {carousels.map((c) => (
                    <li key={c.key}>
                      <button
                        onClick={() => { setSelectedKey(c.key); setDropdownOpen(false); }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm border-b border-white/5 last:border-0"
                      >
                        <span>{c.label}</span>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                          {c.media_kind === "image" ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />}
                          {c.aspect}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <motion.div
          key={selected.key}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {cases.map((v) => (
            <CaseCard
              key={v.id} video={v} carousel={selected}
              onLocalPatch={(p) => patchLocal(v.id, p)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {blockerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={handleBlockerCancel}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-amber-500/15 text-amber-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">Vous avez des modifications non enregistrées</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {dirtyCount} case{dirtyCount > 1 ? "s" : ""} en attente. Voulez-vous enregistrer avant de quitter ?
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={handleBlockerCancel}
                  disabled={blockerBusy}
                  className="px-4 py-2 text-sm rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBlockerDiscard}
                  disabled={blockerBusy}
                  className="px-4 py-2 text-sm rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Quitter sans enregistrer
                </button>
                <button
                  onClick={handleBlockerSave}
                  disabled={blockerBusy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 font-medium disabled:opacity-50"
                >
                  {blockerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </DirtyContext.Provider>
  );
}

function CaseCard({
  video, carousel, onLocalPatch,
}: {
  video: Video; carousel: Carousel;
  onLocalPatch: (p: Partial<Video>) => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [source, setSource] = useState(video.source_label);
  const [mediaUrl, setMediaUrl] = useState(video.source_url);
  const [previewUrl, setPreviewUrl] = useState(video.playback_url || video.source_url);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { setDirty } = useContext(DirtyContext);

  const supportsThumbnail = carousel.media_kind === "video" && carousel.aspect === "16/9";
  const [thumbUrl, setThumbUrl] = useState<string>(video.thumbnail_url ?? "");
  const [thumbPreview, setThumbPreview] = useState<string>(video.thumbnail_playback_url || video.thumbnail_url || "");
  const [thumbUploading, setThumbUploading] = useState(false);
  const thumbFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setTitle(video.title); }, [video.title]);
  useEffect(() => { setSource(video.source_label); }, [video.source_label]);
  useEffect(() => { setMediaUrl(video.source_url); setPreviewUrl(video.playback_url || video.source_url); }, [video.source_url, video.playback_url]);
  useEffect(() => {
    setThumbUrl(video.thumbnail_url ?? "");
    setThumbPreview(video.thumbnail_playback_url || video.thumbnail_url || "");
  }, [video.thumbnail_url, video.thumbnail_playback_url]);

  useEffect(() => {
    let alive = true;
    const path = storagePathFromReference(mediaUrl);
    if (!path || previewUrl !== mediaUrl) return;
    createVideoPlaybackUrl({ data: { path } })
      .then((res) => { if (alive) setPreviewUrl(res.playbackUrl); })
      .catch(() => {});
    return () => { alive = false; };
  }, [mediaUrl, previewUrl]);

  useEffect(() => {
    let alive = true;
    const path = storagePathFromReference(thumbUrl);
    if (!path || thumbPreview !== thumbUrl) return;
    createVideoPlaybackUrl({ data: { path } })
      .then((res) => { if (alive) setThumbPreview(res.playbackUrl); })
      .catch(() => {});
    return () => { alive = false; };
  }, [thumbUrl, thumbPreview]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const res = await createVideoUploadUrl({
        data: { filename: file.name, contentType: file.type || "application/octet-stream" },
      });
      const { error } = await supabase.storage
        .from("site-videos")
        .uploadToSignedUrl(res.path, res.token, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      setMediaUrl(res.publicUrl);
      setPreviewUrl(res.playbackUrl || res.publicUrl);
    } catch (e) {
      alert("Échec de l'upload: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  async function uploadThumb(file: File) {
    setThumbUploading(true);
    try {
      const res = await createVideoUploadUrl({
        data: { filename: file.name, contentType: file.type || "application/octet-stream" },
      });
      const { error } = await supabase.storage
        .from("site-videos")
        .uploadToSignedUrl(res.path, res.token, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      setThumbUrl(res.publicUrl);
      setThumbPreview(res.playbackUrl || res.publicUrl);
    } catch (e) {
      alert("Échec de l'upload : " + (e as Error).message);
    } finally { setThumbUploading(false); }
  }

  async function handleSave() {
    try {
      const patch: Partial<Video> & { id: string } = { id: video.id };
      if (carousel.show_title) patch.title = title;
      if (carousel.show_source) patch.source_label = source;
      patch.source_url = mediaUrl;
      if (supportsThumbnail) patch.thumbnail_url = thumbUrl ? thumbUrl : null;
      const before = video.source_url.trim();
      const after = mediaUrl.trim();
      const action: "create" | "delete" | "update" =
        !before && after ? "create"
        : before && !after ? "delete"
        : "update";
      await updateVideo({ data: patch });
      onLocalPatch({ ...patch, playback_url: previewUrl, thumbnail_playback_url: thumbPreview || null });
      setDirty(video.id, null);
      toast.success("Modifications enregistrées");
      const titleLabel = (carousel.show_title && title.trim()) || (carousel.show_source && source.trim()) || carousel.label;
      const messages = {
        create: `Vidéo ajoutée dans ${carousel.label} : ${titleLabel}`,
        update: `Vidéo modifiée dans ${carousel.label} : ${titleLabel}`,
        delete: `Vidéo retirée de ${carousel.label} : ${titleLabel}`,
      };
      logAdminActivity({ data: { kind: `video_${action}`, message: messages[action] } }).catch(() => {});
    } catch (e) {
      toast.error("Échec de l'enregistrement : " + (e as Error).message);
    }
  }

  // Track dirty state vs original video
  const isDirty =
    (carousel.show_title && title !== video.title) ||
    (carousel.show_source && source !== video.source_label) ||
    mediaUrl !== video.source_url ||
    (supportsThumbnail && (thumbUrl || "") !== (video.thumbnail_url || ""));
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (isDirty) setDirty(video.id, { save: () => handleSaveRef.current() });
    else setDirty(video.id, null);
    return () => setDirty(video.id, null);
  }, [isDirty, video.id, setDirty]);

  const hasMedia = mediaUrl.trim().length > 0;
  const isUploadedFile = storagePathFromReference(mediaUrl) !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-neutral-950/60 overflow-hidden flex flex-col"
    >
      <div className={`relative ${aspectClass(carousel.aspect)} bg-black`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
      >
        {hasMedia ? (
          <MediaPreview url={previewUrl || mediaUrl} />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className={`absolute inset-0 grid place-items-center text-center p-4 border-2 border-dashed transition-colors ${dragOver ? "border-red-500 bg-red-500/5" : "border-white/15 hover:border-white/30"}`}
          >
            <div>
              {uploading ? (
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-neutral-300" />
              ) : (
                carousel.media_kind === "image"
                  ? <ImageIcon className="h-6 w-6 mx-auto text-neutral-400" />
                  : <Upload className="h-6 w-6 mx-auto text-neutral-400" />
              )}
              <p className="mt-2 text-xs text-neutral-300">{uploading ? "Upload en cours…" : dropHint(carousel)}</p>
              <p className="mt-1 text-[10px] text-neutral-500">ou clique pour parcourir</p>
            </div>
          </button>
        )}
        <input
          ref={fileRef} type="file" accept={acceptFor(carousel)} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        {hasMedia && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 hover:text-white">
              <Upload className="h-3 w-3" /> Remplacer
            </button>
            <span className="text-neutral-700">·</span>
            <button onClick={() => { setMediaUrl(""); setPreviewUrl(""); }} className="hover:text-red-400">Vider</button>
            {isUploadedFile && <span className="ml-auto text-emerald-400">Fichier importé dans le visionneur vidéo</span>}
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-wide text-neutral-500 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" /> Ou coller un lien
          </label>
          <input
            value={isUploadedFile ? "" : mediaUrl}
            onChange={(e) => { setMediaUrl(e.target.value); setPreviewUrl(e.target.value); }}
            placeholder={isUploadedFile ? "Fichier importé — colle un lien ici pour le remplacer" : "https://…"}
            className="mt-1 w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-red-500 outline-none"
          />
        </div>

        {carousel.show_title && (
          <div>
            <label className="text-[10px] uppercase tracking-wide text-neutral-500">Titre</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-sm focus:border-red-500 outline-none"
            />
          </div>
        )}

        {carousel.show_source && (
          <div>
            <label className="text-[10px] uppercase tracking-wide text-neutral-500">Source</label>
            <input
              value={source} onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-sm focus:border-red-500 outline-none"
            />
          </div>
        )}

        {supportsThumbnail && (
          <div className="pt-2 border-t border-white/5">
            <label className="text-[10px] uppercase tracking-wide text-neutral-500 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Miniature (image affichée avant lecture)
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative w-24 aspect-video shrink-0 rounded-md overflow-hidden bg-neutral-900 border border-white/10">
                {thumbPreview ? (
                  <img src={thumbPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-neutral-600">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-neutral-400">
                <button
                  type="button"
                  onClick={() => thumbFileRef.current?.click()}
                  disabled={thumbUploading}
                  className="inline-flex items-center gap-1 hover:text-white disabled:opacity-60"
                >
                  {thumbUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {thumbUploading ? "Upload…" : (thumbUrl ? "Remplacer" : "Importer une image")}
                </button>
                {thumbUrl && (
                  <button
                    type="button"
                    onClick={() => { setThumbUrl(""); setThumbPreview(""); }}
                    className="hover:text-red-400 text-left"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <input
                ref={thumbFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumb(f); }}
              />
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}