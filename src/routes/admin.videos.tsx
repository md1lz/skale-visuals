import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Upload, Link as LinkIcon, Loader2, Check, Video as VideoIcon, Image as ImageIcon,
} from "lucide-react";
import { listAllVideos, updateVideo, createVideoUploadUrl } from "@/lib/admin-videos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/videos")({ component: AdminVideosPage });

type Carousel = {
  key: string; label: string; description: string | null; position: number;
  media_kind: "video" | "image"; aspect: "16/9" | "1/1" | "9/16"; show_title: boolean; show_source: boolean;
};
type Video = {
  id: string; carousel_key: string; title: string; source_url: string;
  source_label: string; thumbnail_url: string | null;
  format: "court" | "long" | "miniature"; visible: boolean; position: number;
};

function detectEmbed(url: string): { kind: "youtube" | "vimeo" | "drive" | "video" | "image" | "none"; src: string } {
  if (!url) return { kind: "none", src: "" };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return { kind: "drive", src: `https://drive.google.com/file/d/${dr[1]}/preview` };
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

function AdminVideosPage() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    <div className="p-8 mx-auto max-w-[1400px] w-full">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          {selected && (
            <button
              onClick={() => setSelectedKey(null)}
              className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Changer de carrousel
            </button>
          )}
        </div>
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
      </header>

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
    </div>
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
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setTitle(video.title); }, [video.title]);
  useEffect(() => { setSource(video.source_label); }, [video.source_label]);
  useEffect(() => { setMediaUrl(video.source_url); }, [video.source_url]);

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
    } catch (e) {
      alert("Échec de l'upload: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<Video> & { id: string } = { id: video.id };
      if (carousel.show_title) patch.title = title;
      if (carousel.show_source) patch.source_label = source;
      patch.source_url = mediaUrl;
      await updateVideo({ data: patch });
      onLocalPatch(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("Échec: " + (e as Error).message);
    } finally { setSaving(false); }
  }

  const hasMedia = mediaUrl.trim().length > 0;

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
          <MediaPreview url={mediaUrl} />
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
            <button onClick={() => setMediaUrl("")} className="hover:text-red-400">Vider</button>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-wide text-neutral-500 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" /> Ou coller un lien
          </label>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
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

        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${saved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-red-600 hover:bg-red-500"}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Enregistré</> : "Enregistrer"}
        </button>
      </div>
    </motion.div>
  );
}