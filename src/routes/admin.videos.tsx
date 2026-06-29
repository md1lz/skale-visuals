import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, X, Upload, Link as LinkIcon, Loader2, Save, Video as VideoIcon,
} from "lucide-react";
import {
  listAllVideos, createVideo, updateVideo, deleteVideo, reorderVideos, createVideoUploadUrl,
} from "@/lib/admin-videos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/videos")({ component: AdminVideosPage });

type Carousel = { key: string; label: string; description: string | null; position: number };
type Video = {
  id: string; carousel_key: string; title: string; source_url: string;
  thumbnail_url: string | null; format: "court" | "long" | "miniature"; visible: boolean; position: number;
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

function VideoPreview({ url, className = "" }: { url: string; className?: string }) {
  const { kind, src } = detectEmbed(url);
  if (kind === "none") {
    return <div className={`grid place-items-center text-neutral-500 text-xs ${className}`}>Aucun aperçu</div>;
  }
  if (kind === "image") return <img src={src} className={`object-cover w-full h-full ${className}`} alt="" />;
  if (kind === "video") return <video src={src} className={`object-cover w-full h-full ${className}`} muted playsInline controls={false} />;
  return <iframe src={src} className={`w-full h-full ${className}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
}

function AdminVideosPage() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Video | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await listAllVideos();
      setCarousels(res.carousels);
      setVideos(res.videos as Video[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const byCarousel = useMemo(() => {
    const m = new Map<string, Video[]>();
    for (const c of carousels) m.set(c.key, []);
    for (const v of videos) {
      if (!m.has(v.carousel_key)) m.set(v.carousel_key, []);
      m.get(v.carousel_key)!.push(v);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.position - b.position);
    return m;
  }, [carousels, videos]);

  async function handleAdd(carouselKey: string) {
    setBusy(true);
    try {
      const created = await createVideo({ data: { carousel_key: carouselKey } });
      setVideos((v) => [...v, created as Video]);
      setEditing(created as Video);
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette vidéo ?")) return;
    setVideos((v) => v.filter((x) => x.id !== id));
    await deleteVideo({ data: { id } });
  }

  async function handleToggle(v: Video) {
    const next = { ...v, visible: !v.visible };
    setVideos((arr) => arr.map((x) => (x.id === v.id ? next : x)));
    await updateVideo({ data: { id: v.id, visible: next.visible } });
  }

  async function handleMove(v: Video, dir: -1 | 1) {
    const list = (byCarousel.get(v.carousel_key) ?? []).slice();
    const i = list.findIndex((x) => x.id === v.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((it, idx) => (it.position = idx));
    setVideos((arr) => {
      const others = arr.filter((x) => x.carousel_key !== v.carousel_key);
      return [...others, ...list];
    });
    await reorderVideos({ data: { carousel_key: v.carousel_key, ids: list.map((x) => x.id) } });
  }

  async function handleSave(patch: Partial<Video> & { id: string }) {
    setBusy(true);
    try {
      await updateVideo({ data: patch });
      setVideos((arr) => arr.map((x) => (x.id === patch.id ? { ...x, ...patch } as Video : x)));
      setEditing(null);
    } finally { setBusy(false); }
  }

  return (
    <div className="p-8 mx-auto max-w-[1400px] w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <VideoIcon className="h-7 w-7 text-red-500" /> Vidéos
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Panneau de contrôle des carrousels affichés sur le site public. Chaque modification se reflète immédiatement.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : (
        <div className="space-y-10">
          {carousels.map((c) => {
            const list = byCarousel.get(c.key) ?? [];
            return (
              <section key={c.key} className="rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{c.label}</h2>
                    {c.description && <p className="text-sm text-neutral-400 mt-0.5 max-w-2xl">{c.description}</p>}
                    <p className="text-xs text-neutral-500 mt-1">{list.length} vidéo{list.length > 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(c.key)} disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                </div>

                {list.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-neutral-950/30 py-10 text-center text-sm text-neutral-500">
                    Aucune vidéo. Cliquez sur « Ajouter » pour en créer une.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {list.map((v, i) => (
                      <motion.div
                        key={v.id} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`group rounded-xl overflow-hidden border ${v.visible ? "border-white/10" : "border-white/5 opacity-60"} bg-neutral-950/60`}
                      >
                        <div className="relative aspect-video bg-black">
                          {v.thumbnail_url ? (
                            <img src={v.thumbnail_url} className="object-cover w-full h-full" alt="" />
                          ) : (
                            <VideoPreview url={v.source_url} />
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="text-[10px] uppercase tracking-wide bg-black/70 backdrop-blur px-2 py-0.5 rounded">{v.format}</span>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={() => handleMove(v, -1)} disabled={i === 0} className="bg-black/70 backdrop-blur p-1 rounded text-neutral-300 hover:text-white disabled:opacity-30" title="Monter"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleMove(v, 1)} disabled={i === list.length - 1} className="bg-black/70 backdrop-blur p-1 rounded text-neutral-300 hover:text-white disabled:opacity-30" title="Descendre"><ArrowDown className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          <input
                            value={v.title}
                            onChange={(e) => setVideos((arr) => arr.map((x) => x.id === v.id ? { ...x, title: e.target.value } : x))}
                            onBlur={(e) => updateVideo({ data: { id: v.id, title: e.target.value } })}
                            placeholder="Titre…"
                            className="w-full bg-transparent border-b border-white/10 focus:border-red-500 outline-none text-sm py-1"
                          />
                          <input
                            value={v.source_url}
                            onChange={(e) => setVideos((arr) => arr.map((x) => x.id === v.id ? { ...x, source_url: e.target.value } : x))}
                            onBlur={(e) => updateVideo({ data: { id: v.id, source_url: e.target.value } })}
                            placeholder="Source URL…"
                            className="w-full bg-transparent border-b border-white/10 focus:border-red-500 outline-none text-xs text-neutral-400 py-1 truncate"
                          />
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <select
                              value={v.format}
                              onChange={(e) => {
                                const f = e.target.value as Video["format"];
                                setVideos((arr) => arr.map((x) => x.id === v.id ? { ...x, format: f } : x));
                                updateVideo({ data: { id: v.id, format: f } });
                              }}
                              className="bg-neutral-900 border border-white/10 rounded px-2 py-1 text-xs"
                            >
                              <option value="court">Court</option>
                              <option value="long">Long</option>
                              <option value="miniature">Miniature</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleToggle(v)} title={v.visible ? "Masquer" : "Afficher"} className="p-1.5 rounded hover:bg-white/10">
                                {v.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-neutral-500" />}
                              </button>
                              <button onClick={() => setEditing(v)} title="Modifier" className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(v.id)} title="Supprimer" className="p-1.5 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {editing && <EditModal key={editing.id} video={editing} onClose={() => setEditing(null)} onSave={handleSave} busy={busy} />}
      </AnimatePresence>
    </div>
  );
}

function EditModal({
  video, onClose, onSave, busy,
}: { video: Video; onClose: () => void; onSave: (p: Partial<Video> & { id: string }) => void; busy: boolean }) {
  const [title, setTitle] = useState(video.title);
  const [sourceUrl, setSourceUrl] = useState(video.source_url);
  const [thumb, setThumb] = useState(video.thumbnail_url ?? "");
  const [format, setFormat] = useState<Video["format"]>(video.format);
  const [visible, setVisible] = useState(video.visible);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const res = await createVideoUploadUrl({
        data: { filename: file.name, contentType: file.type || "application/octet-stream" },
      });
      const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(res.path, res.token, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      setSourceUrl(res.publicUrl);
    } catch (e) {
      alert("Échec de l'upload: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold">Modifier la vidéo</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed ${dragOver ? "border-red-500 bg-red-500/5" : "border-white/15 bg-neutral-900/40"} p-6 text-center transition-colors`}
          >
            <Upload className="h-6 w-6 mx-auto text-neutral-400" />
            <p className="mt-2 text-sm">{uploading ? "Upload en cours…" : "Glissez un fichier vidéo ici ou cliquez pour parcourir"}</p>
            <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> Ou coller un lien</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://youtu.be/… , vimeo.com/… , drive.google.com/… , https://…/video.mp4"
              className="mt-1 w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none" />
          </div>

          {sourceUrl && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
              <VideoPreview url={sourceUrl} />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Titre</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Miniature (URL, optionnel)</label>
              <input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="https://…/cover.jpg" className="mt-1 w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as Video["format"])} className="mt-1 w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option value="court">Court</option>
                <option value="long">Long</option>
                <option value="miniature">Miniature</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="accent-red-500" />
                <span className="text-sm">Visible sur le site</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-white/10">Annuler</button>
          <button
            onClick={() => onSave({ id: video.id, title, source_url: sourceUrl, thumbnail_url: thumb || null, format, visible })}
            disabled={busy || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}