import { useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Loader2,
  FolderPlus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  getHomeAdminContent,
  saveHomeSettings,
  createHomeFolder,
  renameHomeFolder,
  deleteHomeFolder,
  createHomeVideo,
  updateHomeVideo,
  deleteHomeVideo,
  reorderHomeFolders,
  reorderHomeVideos,
  createHomeAssetUploadUrl,
  createHomeVideoUploadUrl,
} from "@/lib/admin-home.functions";
import type { HomeFolder, HomeSettings, HomeVideo } from "@/lib/home-content.functions";
import { getAboutAdminContent, saveAboutContent } from "@/lib/admin-about.functions";
import type { AboutContent } from "@/lib/about-content.shared";
import { getCompareAdminContent, saveCompareContent } from "@/lib/admin-compare.functions";
import type { CompareContent, CompareRow } from "@/lib/compare-content.shared";

async function uploadVideoFile(file: File, onProgress?: (p: number) => void): Promise<string> {
  const { uploadUrl, reference } = await createHomeVideoUploadUrl({
    data: { filename: file.name },
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload échoué"));
    xhr.onerror = () => reject(new Error("Upload échoué"));
    xhr.send(file);
  });
  return reference;
}

async function uploadAsset(file: File): Promise<string> {
  const { uploadUrl, reference } = await createHomeAssetUploadUrl({
    data: { filename: file.name },
  });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });
  if (!res.ok) throw new Error("Upload échoué");
  return reference;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5";
const input =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-red-600/50";
const btn =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50";

export function SiteAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [companyPreviews, setCompanyPreviews] = useState<(string | null)[]>([]);
  const [creatorPreviews, setCreatorPreviews] = useState<(string | null)[]>([]);
  const [footerLogoPreviews, setFooterLogoPreviews] = useState<(string | null)[]>([]);
  const [testimonialPreview, setTestimonialPreview] = useState<string | null>(null);
  const [projectPreviews, setProjectPreviews] = useState<{ image: string | null; avatar: string | null }[]>([]);
  const [folders, setFolders] = useState<HomeFolder[]>([]);
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploads, setUploads] = useState<Record<string, number | undefined>>({});

  async function reload() {
    setLoading(true);
    try {
      const res = await getHomeAdminContent();
      setSettings(res.settings);
      setCompanyPreviews(res.companyPreviews ?? []);
      setCreatorPreviews(res.creatorPreviews ?? []);
      setFooterLogoPreviews(res.footerLogoPreviews ?? []);
      setTestimonialPreview(res.testimonialPreview ?? null);
      setProjectPreviews(res.projectPreviews ?? []);
      setFolders(res.folders as HomeFolder[]);
      setVideos(res.videos as HomeVideo[]);
      setActiveFolder((cur) => cur ?? res.folders[0]?.id ?? null);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  const blocker = useBlocker({ shouldBlockFn: () => dirty, withResolver: true });

  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const folderVideos = useMemo(
    () =>
      videos.filter((v) => v.folder_id === activeFolder).sort((a, b) => a.position - b.position),
    [videos, activeFolder],
  );

  async function saveAll() {
    if (!settings) return;
    setSaving(true);
    try {
      await saveHomeSettings({
        data: {
          videosCount: Number(settings.videosCount) || 0,
          clientsCount: Number(settings.clientsCount) || 0,
          plusLabel: settings.plusLabel,
          trust: settings.trust.map((t) => ({ name: t.name, photo: t.photo })),
          companies: settings.companies.map((company) => ({ name: company.name, logo: company.logo })),
          creators: settings.creators.map((creator) => ({
            name: creator.name,
            audience: creator.audience,
            photo: creator.photo,
          })),
          footerLogos: settings.footerLogos.map((item) => ({ name: item.name, logo: item.logo })),
          testimonial: {
            name: settings.testimonial.name,
            role: settings.testimonial.role,
            photo: settings.testimonial.photo,
            quote: settings.testimonial.quote,
          },
          projects: settings.projects.map((p) => ({
            image: p.image,
            badge: p.badge,
            title: p.title,
            description: p.description,
            avatar: p.avatar,
          })),
        },
      });
      await Promise.all(
        folders.map((f) => renameHomeFolder({ data: { id: f.id, label: f.label } })),
      );
      await Promise.all(
        videos.map((v) =>
          updateHomeVideo({
            data: {
              id: v.id,
              title: v.title,
              author: v.author,
              source_url: v.source_url,
              thumbnail_url: v.thumbnail_url,
            },
          }),
        ),
      );
      setDirty(false);
      toast.success("Site mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function patchSettings(patch: Partial<HomeSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  }
  function patchCompany(i: number, patch: Partial<HomeSettings["companies"][number]>) {
    setSettings((s) =>
      s
        ? { ...s, companies: s.companies.map((company, idx) => (idx === i ? { ...company, ...patch } : company)) }
        : s,
    );
    setDirty(true);
  }
  function patchCreator(i: number, patch: Partial<HomeSettings["creators"][number]>) {
    setSettings((s) =>
      s
        ? { ...s, creators: s.creators.map((creator, idx) => (idx === i ? { ...creator, ...patch } : creator)) }
        : s,
    );
    setDirty(true);
  }
  function patchFooterLogo(i: number, patch: Partial<HomeSettings["footerLogos"][number]>) {
    setSettings((s) =>
      s
        ? { ...s, footerLogos: s.footerLogos.map((item, idx) => (idx === i ? { ...item, ...patch } : item)) }
        : s,
    );
    setDirty(true);
  }
  function moveSettingItem(kind: "companies" | "creators" | "footerLogos", index: number, direction: -1 | 1) {
    const target = index + direction;
    setSettings((s) => {
      if (!s || target < 0 || target >= s[kind].length) return s;
      const items = [...s[kind]];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...s, [kind]: items };
    });
    if (target >= 0 && settings && target < settings[kind].length) {
      const setPreviews =
        kind === "companies" ? setCompanyPreviews : kind === "creators" ? setCreatorPreviews : setFooterLogoPreviews;
      setPreviews((current) => {
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      setDirty(true);
    }
  }
  function patchVideo(id: string, patch: Partial<HomeVideo>) {
    setVideos((arr) => arr.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    setDirty(true);
  }
  function patchProject(i: number, patch: Partial<HomeSettings["projects"][number]>) {
    setSettings((s) =>
      s ? { ...s, projects: s.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } : s,
    );
    setDirty(true);
  }

  async function addFolder() {
    const label = newFolder.trim();
    if (!label) return;
    try {
      const row = (await createHomeFolder({ data: { label } })) as HomeFolder;
      setFolders((f) => [...f, row]);
      setActiveFolder(row.id);
      setNewFolder("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function removeFolder(id: string) {
    if (!confirm("Supprimer ce dossier et ses vidéos ?")) return;
    await deleteHomeFolder({ data: { id } });
    setFolders((f) => f.filter((x) => x.id !== id));
    setVideos((v) => v.filter((x) => x.folder_id !== id));
    if (activeFolder === id) setActiveFolder(null);
  }

  async function addVideo() {
    if (!activeFolder) return;
    const row = (await createHomeVideo({
      data: {
        folder_id: activeFolder,
        title: "Nouvelle vidéo",
        author: "Skale Visuals",
        source_url: "",
      },
    })) as HomeVideo;
    setVideos((v) => [...v, row]);
  }

  async function removeVideo(id: string) {
    await deleteHomeVideo({ data: { id } });
    setVideos((v) => v.filter((x) => x.id !== id));
  }

  async function moveFolder(id: string, dir: -1 | 1) {
    const list = [...folders].sort((a, b) => a.position - b.position);
    const i = list.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const ids = list.map((f) => f.id);
    setFolders(list.map((f, idx) => ({ ...f, position: idx })));
    await reorderHomeFolders({ data: { ids } });
  }

  async function move(id: string, dir: -1 | 1) {
    const list = [...folderVideos];
    const i = list.findIndex((v) => v.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const ids = list.map((v) => v.id);
    setVideos((all) =>
      all.map((v) => (ids.includes(v.id) ? { ...v, position: ids.indexOf(v.id) } : v)),
    );
    await reorderHomeVideos({ data: { ids } });
  }

  async function handleVideoFile(id: string, file: File) {
    setUploads((u) => ({ ...u, [id]: 0 }));
    try {
      const ref = await uploadVideoFile(file, (p) => setUploads((u) => ({ ...u, [id]: p })));
      patchVideo(id, { source_url: ref });
      await updateHomeVideo({ data: { id, source_url: ref } });
      toast.success("Vidéo importée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload échoué");
    } finally {
      setUploads((u) => ({ ...u, [id]: undefined }));
    }
  }

  async function pickImage(key: string, onDone: (ref: string) => void) {
    const el = fileRefs.current[key];
    el?.click();
    void onDone;
  }

  if (loading || !settings) {
    return (
      <div className="p-8 text-sm text-neutral-400 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Site web</h1>
          <p className="text-sm text-neutral-400">Contenus de la page d'accueil publique.</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || !dirty}
          className={`${btn} bg-red-600 text-white hover:bg-red-500`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </header>


      {/* Logos du bas de page */}
      <section className={`${card} mb-6`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Carrousel du bas de page
            </h2>
            <p className="mt-1 text-xs text-neutral-500">Logos affichés sous le logo Skale dans le bas de page.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              patchSettings({ footerLogos: [...settings.footerLogos, { name: "", logo: null }] });
              setFooterLogoPreviews((items) => [...items, null]);
            }}
            className={`${btn} border border-white/10 text-white hover:bg-white/10`}
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {settings.footerLogos.map((item, i) => (
            <div key={`footer-logo-${i}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <button
                type="button"
                aria-label={`Ajouter le logo de ${item.name || "ce partenaire"}`}
                onClick={() => fileRefs.current[`footer-logo-${i}`]?.click()}
                className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
              >
                {footerLogoPreviews[i] ? (
                  <img src={footerLogoPreviews[i] ?? ""} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <input
                ref={(el) => { fileRefs.current[`footer-logo-${i}`] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const reference = await uploadAsset(file);
                    patchFooterLogo(i, { logo: reference });
                    setFooterLogoPreviews((items) => items.map((it, idx) => (idx === i ? URL.createObjectURL(file) : it)));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Upload échoué");
                  }
                }}
              />
              <input className={input} placeholder="Nom" value={item.name} onChange={(e) => patchFooterLogo(i, { name: e.target.value })} />
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" aria-label="Monter" onClick={() => moveSettingItem("footerLogos", i, -1)} className="text-neutral-500 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Descendre" onClick={() => moveSettingItem("footerLogos", i, 1)} className="text-neutral-500 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => {
                  patchSettings({ footerLogos: settings.footerLogos.filter((_, idx) => idx !== i) });
                  setFooterLogoPreviews((items) => items.filter((_, idx) => idx !== i));
                }}
                className="text-neutral-500 hover:text-red-400"
              ><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Carrousels de confiance */}
      <section className={`${card} mb-6`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Carrousels de confiance
        </h2>
        <p className="mt-1 text-xs text-neutral-500">Logos d’entreprises puis profils de créateurs dans la partie noire.</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-white">Entreprises</h3>
          <button
            type="button"
            onClick={() => {
              patchSettings({ companies: [...settings.companies, { name: "", logo: null }] });
              setCompanyPreviews((items) => [...items, null]);
            }}
            className={`${btn} border border-white/10 text-white hover:bg-white/10`}
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {settings.companies.map((company, i) => (
            <div key={`company-${i}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <button
                type="button"
                aria-label={`Ajouter le logo de ${company.name || "l’entreprise"}`}
                onClick={() => fileRefs.current[`company-${i}`]?.click()}
                className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
              >
                {companyPreviews[i] ? (
                  <img src={companyPreviews[i] ?? ""} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <input
                ref={(el) => { fileRefs.current[`company-${i}`] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const reference = await uploadAsset(file);
                    patchCompany(i, { logo: reference });
                    setCompanyPreviews((items) => items.map((item, idx) => idx === i ? URL.createObjectURL(file) : item));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Upload échoué");
                  }
                }}
              />
              <input className={input} placeholder="Nom de l’entreprise" value={company.name} onChange={(e) => patchCompany(i, { name: e.target.value })} />
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" aria-label="Monter" onClick={() => moveSettingItem("companies", i, -1)} className="text-neutral-500 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Descendre" onClick={() => moveSettingItem("companies", i, 1)} className="text-neutral-500 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => {
                  patchSettings({ companies: settings.companies.filter((_, idx) => idx !== i) });
                  setCompanyPreviews((items) => items.filter((_, idx) => idx !== i));
                }}
                className="text-neutral-500 hover:text-red-400"
              ><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <h3 className="text-sm font-medium text-white">Créateurs</h3>
          <button
            type="button"
            onClick={() => {
              patchSettings({ creators: [...settings.creators, { name: "", audience: "", photo: null }] });
              setCreatorPreviews((items) => [...items, null]);
            }}
            className={`${btn} border border-white/10 text-white hover:bg-white/10`}
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {settings.creators.map((creator, i) => (
            <div key={`creator-${i}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <button
                type="button"
                aria-label={`Ajouter la photo de ${creator.name || "ce créateur"}`}
                onClick={() => fileRefs.current[`creator-${i}`]?.click()}
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
              >
                {creatorPreviews[i] ? (
                  <img src={creatorPreviews[i] ?? ""} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <input
                ref={(el) => { fileRefs.current[`creator-${i}`] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const reference = await uploadAsset(file);
                    patchCreator(i, { photo: reference });
                    setCreatorPreviews((items) => items.map((item, idx) => idx === i ? URL.createObjectURL(file) : item));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Upload échoué");
                  }
                }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input className={input} placeholder="Nom" value={creator.name} onChange={(e) => patchCreator(i, { name: e.target.value })} />
                <input className={input} placeholder="Audience, ex. 120K abonnés" value={creator.audience} onChange={(e) => patchCreator(i, { audience: e.target.value })} />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" aria-label="Monter" onClick={() => moveSettingItem("creators", i, -1)} className="text-neutral-500 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Descendre" onClick={() => moveSettingItem("creators", i, 1)} className="text-neutral-500 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => {
                  patchSettings({ creators: settings.creators.filter((_, idx) => idx !== i) });
                  setCreatorPreviews((items) => items.filter((_, idx) => idx !== i));
                }}
                className="text-neutral-500 hover:text-red-400"
              ><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Témoignage client */}
      <section className={`${card} mb-6`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Témoignage client</h2>
        <p className="mt-1 text-xs text-neutral-500">Affiché dans la partie noire de la page d’accueil.</p>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <button
            type="button"
            aria-label="Photo du client"
            onClick={() => fileRefs.current["testimonial"]?.click()}
            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
          >
            {testimonialPreview ? (
              <img src={testimonialPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
          <input
            ref={(el) => { fileRefs.current["testimonial"] = el; }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const reference = await uploadAsset(file);
                patchSettings({ testimonial: { ...settings.testimonial, photo: reference } });
                setTestimonialPreview(URL.createObjectURL(file));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Upload échoué");
              }
            }}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <input
              className={input}
              placeholder="Nom du client"
              value={settings.testimonial.name}
              onChange={(e) => patchSettings({ testimonial: { ...settings.testimonial, name: e.target.value } })}
            />
            <input
              className={input}
              placeholder="Rôle / entreprise"
              value={settings.testimonial.role}
              onChange={(e) => patchSettings({ testimonial: { ...settings.testimonial, role: e.target.value } })}
            />
            <textarea
              className={`${input} min-h-[70px]`}
              placeholder="Citation"
              value={settings.testimonial.quote}
              onChange={(e) => patchSettings({ testimonial: { ...settings.testimonial, quote: e.target.value } })}
            />
          </div>
        </div>
      </section>

      {/* Récap projets */}
      <section className={`${card} mb-6`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Récap projets</h2>
        <p className="mt-1 text-xs text-neutral-500">Deux cartes mises en avant sous “Nos meilleurs projets”.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {settings.projects.map((project, i) => (
            <div key={`project-${i}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={`Image du projet ${i + 1}`}
                  onClick={() => fileRefs.current[`project-image-${i}`]?.click()}
                  className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
                >
                  {projectPreviews[i]?.image ? (
                    <img src={projectPreviews[i].image ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={(el) => { fileRefs.current[`project-image-${i}`] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const reference = await uploadAsset(file);
                      patchProject(i, { image: reference });
                      setProjectPreviews((items) =>
                        items.map((item, idx) => (idx === i ? { ...item, image: URL.createObjectURL(file) } : item)),
                      );
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Upload échoué");
                    }
                  }}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    className={input}
                    placeholder="Titre"
                    value={project.title}
                    onChange={(e) => patchProject(i, { title: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder="Pastille"
                    value={project.badge}
                    onChange={(e) => patchProject(i, { badge: e.target.value })}
                  />
                </div>
              </div>
              <textarea
                className={`${input} mt-3 min-h-[70px]`}
                placeholder="Description"
                value={project.description}
                onChange={(e) => patchProject(i, { description: e.target.value })}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Photo de profil du projet ${i + 1}`}
                  onClick={() => fileRefs.current[`project-avatar-${i}`]?.click()}
                  className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
                >
                  {projectPreviews[i]?.avatar ? (
                    <img src={projectPreviews[i].avatar ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={(el) => { fileRefs.current[`project-avatar-${i}`] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const reference = await uploadAsset(file);
                      patchProject(i, { avatar: reference });
                      setProjectPreviews((items) =>
                        items.map((item, idx) => (idx === i ? { ...item, avatar: URL.createObjectURL(file) } : item)),
                      );
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Upload échoué");
                    }
                  }}
                />
                <p className="text-xs text-neutral-500">Avatar rond du client/créateur</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Réalisations */}
      <section className={card}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Réalisations
        </h2>
        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <div className="space-y-1">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                    activeFolder === f.id
                      ? "border-red-600/40 bg-red-600/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <button
                    className="shrink-0 text-left text-xs text-neutral-500"
                    onClick={() => setActiveFolder(f.id)}
                  >
                    ▸
                  </button>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                    value={f.label}
                    onFocus={() => setActiveFolder(f.id)}
                    onChange={(e) => {
                      setFolders((arr) =>
                        arr.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)),
                      );
                      setDirty(true);
                    }}
                  />
                  <button
                    onClick={() => removeFolder(f.id)}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className={input}
                placeholder="Nouveau dossier"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFolder()}
              />
              <button
                onClick={addFolder}
                className={`${btn} border border-white/10 text-white hover:bg-white/10`}
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            {!activeFolder ? (
              <p className="text-sm text-neutral-500">Sélectionnez un dossier.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {folderVideos.map((v, i) => (
                    <div key={v.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className={input}
                          placeholder="Titre (ex : VSL 1)"
                          value={v.title}
                          onChange={(e) => patchVideo(v.id, { title: e.target.value })}
                        />
                        <input
                          className={input}
                          placeholder="Auteur"
                          value={v.author}
                          onChange={(e) => patchVideo(v.id, { author: e.target.value })}
                        />
                        <input
                          className={`${input} sm:col-span-2`}
                          placeholder="Lien vidéo (YouTube, Drive, URL…)"
                          value={v.source_url}
                          onChange={(e) => patchVideo(v.id, { source_url: e.target.value })}
                        />
                        <input
                          className={`${input} sm:col-span-2`}
                          placeholder="Miniature (URL) — optionnel"
                          value={v.thumbnail_url ?? ""}
                          onChange={(e) =>
                            patchVideo(v.id, { thumbnail_url: e.target.value || null })
                          }
                        />
                      </div>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const f = e.dataTransfer.files?.[0];
                          if (f) await handleVideoFile(v.id, f);
                        }}
                        className="mt-2 rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-center"
                      >
                        <p className="text-xs text-neutral-400">
                          {uploads[v.id] != null
                            ? `Envoi en cours… ${uploads[v.id]}%`
                            : v.source_url.startsWith("storage://")
                              ? "Fichier vidéo importé ✓ — glissez un fichier pour remplacer"
                              : "Glissez un fichier vidéo ici ou importez-le"}
                        </p>
                        <button
                          onClick={() => fileRefs.current[`video-${v.id}`]?.click()}
                          disabled={uploads[v.id] != null}
                          className={`${btn} mt-2 border border-white/10 text-neutral-300 hover:bg-white/10`}
                        >
                          <Upload className="h-4 w-4" /> Importer une vidéo
                        </button>
                        <input
                          ref={(el) => {
                            fileRefs.current[`video-${v.id}`] = el;
                          }}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) await handleVideoFile(v.id, f);
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => fileRefs.current[`thumb-${v.id}`]?.click()}
                          className={`${btn} border border-white/10 text-neutral-300 hover:bg-white/10`}
                        >
                          <ImagePlus className="h-4 w-4" /> Miniature
                        </button>
                        <input
                          ref={(el) => {
                            fileRefs.current[`thumb-${v.id}`] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (!f) return;
                            try {
                              const ref = await uploadAsset(f);
                              patchVideo(v.id, { thumbnail_url: ref });
                              toast.success("Miniature ajoutée");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Upload échoué");
                            }
                          }}
                        />
                        <button
                          onClick={() => move(v.id, -1)}
                          disabled={i === 0}
                          className={`${btn} border border-white/10 text-neutral-300 hover:bg-white/10`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => move(v.id, 1)}
                          disabled={i === folderVideos.length - 1}
                          className={`${btn} border border-white/10 text-neutral-300 hover:bg-white/10`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeVideo(v.id)}
                          className={`${btn} ml-auto border border-white/10 text-neutral-400 hover:text-red-400`}
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addVideo}
                  className={`${btn} mt-3 border border-white/10 text-white hover:bg-white/10`}
                >
                  <Plus className="h-4 w-4" /> Ajouter une vidéo
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <AboutSection />

      <CompareSection />

      {blocker.status === "blocked" && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <p className="text-sm font-semibold text-white">Modifications non enregistrées</p>
            <p className="mt-1 text-sm text-neutral-400">
              Voulez-vous enregistrer avant de quitter ?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await saveAll();
                  blocker.proceed?.();
                }}
                className={`${btn} bg-red-600 text-white hover:bg-red-500`}
              >
                Enregistrer et quitter
              </button>
              <button
                onClick={() => {
                  setDirty(false);
                  blocker.proceed?.();
                }}
                className={`${btn} border border-white/10 text-neutral-300 hover:bg-white/10`}
              >
                Quitter sans enregistrer
              </button>
              <button
                onClick={() => blocker.reset?.()}
                className={`${btn} text-neutral-400 hover:text-white`}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- About Us ---------------- */

function AboutSection() {
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null]);
  const [saving, setSaving] = useState(false);
  const photoRefs = useRef<(HTMLInputElement | null)[]>([null, null]);

  useEffect(() => {
    getAboutAdminContent()
      .then((res) => {
        setAbout(res.about as AboutContent);
        setPreviews(res.photoPreviews ?? [null, null]);
      })
      .catch(() => {});
  }, []);

  function patch(p: Partial<AboutContent>) {
    setAbout((a) => (a ? { ...a, ...p } : a));
  }
  function patchFounder(i: 0 | 1, p: Partial<AboutContent["founders"][number]>) {
    setAbout((a) =>
      a
        ? {
            ...a,
            founders: [
              i === 0 ? { ...a.founders[0], ...p } : a.founders[0],
              i === 1 ? { ...a.founders[1], ...p } : a.founders[1],
            ],
          }
        : a,
    );
  }
  function patchValue(i: number, p: Partial<AboutContent["values"][number]>) {
    setAbout((a) =>
      a ? { ...a, values: a.values.map((v, idx) => (idx === i ? { ...v, ...p } : v)) } : a,
    );
  }

  async function save() {
    if (!about) return;
    setSaving(true);
    try {
      await saveAboutContent({ data: about });
      toast.success("Page À propos mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!about) return null;

  return (
    <section className={`${card} mt-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          About Us
        </h2>
        <button
          onClick={save}
          disabled={saving}
          className={`${btn} bg-red-600 text-white hover:bg-red-500`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Titre intro</span>
          <input
            className={input}
            value={about.introTitle}
            onChange={(e) => patch({ introTitle: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Sous-titre intro</span>
          <textarea
            className={`${input} min-h-[72px]`}
            value={about.introText}
            onChange={(e) => patch({ introText: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[0, 1].map((idx) => {
          const i = idx as 0 | 1;
          const f = about.founders[i];
          return (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => photoRefs.current[i]?.click()}
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-neutral-400 hover:border-red-600/40"
                >
                  {previews[i] ? (
                    <img src={previews[i]!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={(el) => {
                    photoRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const ref = await uploadAsset(file);
                      patchFounder(i, { photo: ref });
                      setPreviews((p) =>
                        p.map((v, x) => (x === i ? URL.createObjectURL(file) : v)),
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Upload échoué");
                    }
                  }}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    className={input}
                    placeholder="Nom"
                    value={f.name}
                    onChange={(e) => patchFounder(i, { name: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder="Rôle"
                    value={f.role}
                    onChange={(e) => patchFounder(i, { role: e.target.value })}
                  />
                </div>
              </div>
              <textarea
                className={`${input} mt-3 min-h-[160px]`}
                placeholder="Bio"
                value={f.bio}
                onChange={(e) => patchFounder(i, { bio: e.target.value })}
              />
              {f.photo && (
                <button
                  onClick={() => {
                    patchFounder(i, { photo: null });
                    setPreviews((p) => p.map((v, x) => (x === i ? null : v)));
                  }}
                  className="mt-2 text-xs text-neutral-500 hover:text-red-400"
                >
                  Retirer la photo
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(
        [
          ["storyTitle", "storyText", "Histoire"],
          ["visionTitle", "visionText", "Vision"],
          ["teamTitle", "teamText", "Équipe"],
        ] as const
      ).map(([tk, bk, label]) => (
        <div key={tk} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Titre — {label}</span>
            <input
              className={input}
              value={about[tk]}
              onChange={(e) => patch({ [tk]: e.target.value } as Partial<AboutContent>)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Paragraphe — {label}</span>
            <textarea
              className={`${input} min-h-[96px]`}
              value={about[bk]}
              onChange={(e) => patch({ [bk]: e.target.value } as Partial<AboutContent>)}
            />
          </label>
        </div>
      ))}

      <div className="mt-5">
        <label className="block max-w-[320px]">
          <span className="mb-1 block text-xs text-neutral-400">Titre — Valeurs</span>
          <input
            className={input}
            value={about.valuesTitle}
            onChange={(e) => patch({ valuesTitle: e.target.value })}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {about.values.map((v, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex gap-2">
                <input
                  className={`${input} w-16 text-center`}
                  value={v.emoji}
                  onChange={(e) => patchValue(i, { emoji: e.target.value })}
                />
                <input
                  className={input}
                  value={v.title}
                  onChange={(e) => patchValue(i, { title: e.target.value })}
                />
              </div>
              <textarea
                className={`${input} min-h-[72px]`}
                value={v.text}
                onChange={(e) => patchValue(i, { text: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Titre CTA</span>
          <input
            className={input}
            value={about.ctaTitle}
            onChange={(e) => patch({ ctaTitle: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Texte du bouton CTA</span>
          <input
            className={input}
            value={about.ctaButton}
            onChange={(e) => patch({ ctaButton: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}

/* ---------------- Comparatif ---------------- */

const EMPTY_ROW: CompareRow = { criterion: "", other: "", skaleTitle: "", skaleText: "" };

function CompareSection() {
  const [content, setContent] = useState<CompareContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    getCompareAdminContent()
      .then((c) => setContent(c as CompareContent))
      .catch(() => {});
  }, []);

  function patch(p: Partial<CompareContent>) {
    setContent((c) => (c ? { ...c, ...p } : c));
  }
  function patchRow(i: number, p: Partial<CompareRow>) {
    setContent((c) =>
      c ? { ...c, rows: c.rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) } : c,
    );
  }
  function addRow() {
    setContent((c) => (c ? { ...c, rows: [...c.rows, { ...EMPTY_ROW }] } : c));
  }
  function removeRow(i: number) {
    if (!window.confirm("Supprimer cette ligne du comparatif ?")) return;
    setContent((c) => (c ? { ...c, rows: c.rows.filter((_, idx) => idx !== i) } : c));
  }
  function moveRow(from: number, to: number) {
    setContent((c) => {
      if (!c || from === to || to < 0 || to >= c.rows.length) return c;
      const rows = [...c.rows];
      const [row] = rows.splice(from, 1);
      rows.splice(to, 0, row);
      return { ...c, rows };
    });
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      await saveCompareContent({ data: content });
      toast.success("Comparatif mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!content) return null;

  return (
    <section className={`${card} mt-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Comparatif
        </h2>
        <button
          onClick={save}
          disabled={saving}
          className={`${btn} bg-red-600 text-white hover:bg-red-500`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Badge</span>
          <input
            className={input}
            value={content.badge}
            onChange={(e) => patch({ badge: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Titre</span>
          <input
            className={input}
            value={content.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-neutral-400">Sous-titre</span>
          <textarea
            className={`${input} min-h-[72px]`}
            value={content.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Libellé colonne concurrence</span>
          <input
            className={input}
            value={content.otherLabel}
            onChange={(e) => patch({ otherLabel: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Libellé colonne Skale</span>
          <input
            className={input}
            value={content.skaleLabel}
            onChange={(e) => patch({ skaleLabel: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {content.rows.map((row, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveRow(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`rounded-xl border border-white/10 bg-black/20 p-3 ${dragIndex === i ? "opacity-50" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="cursor-grab text-xs text-neutral-500">⠿ Ligne {i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveRow(i, i - 1)}
                  className={`${btn} px-2 text-neutral-400 hover:text-white`}
                  aria-label="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveRow(i, i + 1)}
                  className={`${btn} px-2 text-neutral-400 hover:text-white`}
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeRow(i)}
                  className={`${btn} px-2 text-red-400 hover:bg-red-500/10`}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Critère</span>
                <input
                  className={input}
                  value={row.criterion}
                  onChange={(e) => patchRow(i, { criterion: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">
                  Texte Freelance / Agence
                </span>
                <input
                  className={input}
                  value={row.other}
                  onChange={(e) => patchRow(i, { other: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Titre Skale</span>
                <input
                  className={input}
                  value={row.skaleTitle}
                  onChange={(e) => patchRow(i, { skaleTitle: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-400">Description Skale</span>
                <input
                  className={input}
                  value={row.skaleText}
                  onChange={(e) => patchRow(i, { skaleText: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className={`${btn} mt-3 border border-white/10 text-white hover:bg-white/10`}
      >
        <Plus className="h-4 w-4" /> Ajouter une ligne
      </button>
    </section>
  );
}
