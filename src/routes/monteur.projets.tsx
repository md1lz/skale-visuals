import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Link as LinkIcon,
  ExternalLink,
  Upload,
  Send,
  MessageSquare,
  Loader2,
  FileVideo,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyProjects,
  getMyProject,
  addProjectVersion,
  createVersionUploadUrl,
  sendForRevision,
  postEditorComment,
  signVersionUrls,
} from "@/lib/editor.functions";
import { statusBadgeClass, deadlineTone, fmtDateFR, fmtDateTimeFR } from "@/lib/project-display";

export const Route = createFileRoute("/monteur/projets")({
  validateSearch: (s: Record<string, unknown>) => ({ p: typeof s.p === "string" ? s.p : undefined }),
  component: EditorProjectsPage,
});

function EditorProjectsPage() {
  const navigate = useNavigate();
  const { p: selected } = Route.useSearch();
  const fetchProjects = useServerFn(listMyProjects);

  const q = useQuery({
    queryKey: ["editor", "projects"],
    queryFn: () => fetchProjects(),
    initialData: [] as Awaited<ReturnType<typeof fetchProjects>>,
    refetchInterval: 30_000,
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mes projets</h1>
        <p className="text-sm text-neutral-400 mt-1">Les projets qui te sont assignés par l'équipe Skale.</p>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-6 py-12 text-center">
          <p className="text-sm text-neutral-400">Aucun projet ne t'a encore été assigné.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-neutral-900/40">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-neutral-400">
              <tr>
                <th className="text-left font-medium px-4 py-3">Projet</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="text-left font-medium px-4 py-3">Deadline</th>
                <th className="text-left font-medium px-4 py-3">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate({ to: "/monteur/projets", search: { p: p.id } })}
                  className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition"
                >
                  <td className="px-4 py-3 text-white">{p.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] rounded-full border px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${deadlineTone(p.deadline)}`}>{fmtDateFR(p.deadline)}</td>
                  <td className="px-4 py-3 text-neutral-400">{fmtDateTimeFR(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ProjectPanel id={selected} onClose={() => navigate({ to: "/monteur/projets", search: {} })} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchProject = useServerFn(getMyProject);
  const addVersion = useServerFn(addProjectVersion);
  const makeUploadUrl = useServerFn(createVersionUploadUrl);
  const revision = useServerFn(sendForRevision);
  const comment = useServerFn(postEditorComment);
  const signUrls = useServerFn(signVersionUrls);

  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["editor", "project", id],
    queryFn: () => fetchProject({ data: { id } }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const paths = (q.data?.files ?? []).map((f) => f.file_url).filter((u) => u.startsWith("storage://"));
    if (paths.length === 0) return;
    signUrls({ data: { paths } })
      .then(setSigned)
      .catch(() => {});
  }, [q.data, signUrls]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["editor", "project", id] });
    qc.invalidateQueries({ queryKey: ["editor", "projects"] });
    qc.invalidateQueries({ queryKey: ["editor", "notifications"] });
  };

  async function handleFile(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const { path, token } = await makeUploadUrl({ data: { project_id: id, file_name: file.name } });
      const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await addVersion({
        data: { project_id: id, file_url: `storage://site-videos/${path}`, file_name: file.name },
      });
      toast.success("Version déposée");
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
      await addVersion({ data: { project_id: id, file_url: link.trim(), file_name: "" } });
      setLink("");
      toast.success("Version ajoutée");
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
      await comment({ data: { project_id: id, content: message.trim() } });
      setMessage("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevision() {
    if (busy) return;
    setBusy(true);
    try {
      await revision({ data: { project_id: id } });
      toast.success("Projet envoyé en révision");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const project = q.data?.project;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="h-full w-full max-w-xl bg-neutral-950 border-l border-white/10 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 bg-neutral-950/95 backdrop-blur border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{project?.title ?? "…"}</h2>
            {project && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] rounded-full border px-2 py-0.5 ${statusBadgeClass(project.status)}`}>
                  {project.status}
                </span>
                <span className={`text-xs ${deadlineTone(project.deadline)}`}>{fmtDateFR(project.deadline)}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Brief & instructions</h3>
            <div className="rounded-xl bg-neutral-900/60 border border-white/5 px-4 py-3 text-sm text-neutral-200 whitespace-pre-wrap">
              {project?.brief?.trim() || "Aucun brief pour l'instant."}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Fichiers rushs</h3>
            {(project?.rushs_links ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun rush déposé.</p>
            ) : (
              <ul className="space-y-1.5">
                {(project?.rushs_links ?? []).map((l, i) => (
                  <li key={i}>
                    <LinkOut href={l} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Versions montage</h3>
            <div className="space-y-2 mb-3">
              {(q.data?.files ?? []).length === 0 ? (
                <p className="text-sm text-neutral-500">Aucune version déposée.</p>
              ) : (
                (q.data?.files ?? []).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                  >
                    <span className="grid place-items-center h-8 w-8 rounded-lg bg-red-500/15 text-red-400 shrink-0">
                      <FileVideo className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        Version {f.version_number} — {fmtDateTimeFR(f.created_at)}
                      </p>
                      <LinkOut href={signed[f.file_url] ?? f.file_url} label={f.file_name} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-dashed border-white/15 hover:border-red-500/50 bg-neutral-900/40 px-4 py-6 text-center cursor-pointer transition mb-3"
            >
              <Upload className="h-5 w-5 mx-auto text-neutral-500 mb-2" />
              <p className="text-xs text-neutral-400">
                {busy ? "Envoi en cours…" : "Glisse un fichier ici ou clique pour parcourir"}
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

            <div className="flex gap-2 mb-3">
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Ou colle un lien (Drive, WeTransfer…)"
                className="flex-1 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleLink}
                disabled={busy}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 transition disabled:opacity-60"
              >
                Ajouter
              </button>
            </div>

            <button
              onClick={handleRevision}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Envoyer pour révision
            </button>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Commentaires & retours</h3>
            <div className="space-y-2 mb-3">
              {(q.data?.comments ?? []).length === 0 ? (
                <p className="text-sm text-neutral-500">Aucun commentaire.</p>
              ) : (
                (q.data?.comments ?? []).map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl px-3 py-2.5 border ${
                      c.author_type === "admin"
                        ? "bg-white/[0.03] border-white/10"
                        : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-white">{c.author_name}</span>
                      <span className="text-[11px] text-neutral-500">{fmtDateTimeFR(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-neutral-200 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Écrire un message…"
                className="flex-1 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleComment}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm text-white transition disabled:opacity-60"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Historique des statuts</h3>
            {(q.data?.history ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun changement.</p>
            ) : (
              <ul className="space-y-1.5">
                {(q.data?.history ?? []).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between text-sm rounded-lg bg-neutral-900/60 border border-white/5 px-3 py-2"
                  >
                    <span className="font-medium">{h.status}</span>
                    <span className="text-xs text-neutral-500">{fmtDateTimeFR(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function LinkOut({ href, label }: { href: string; label?: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-red-300 hover:text-red-200 break-all"
    >
      <LinkIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label || href}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}
