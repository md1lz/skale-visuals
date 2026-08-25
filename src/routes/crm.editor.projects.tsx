import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, FileText, Inbox, ArrowLeft, ChevronDown } from "lucide-react";
import { listMyProjectsOverview } from "@/lib/video-workspace.functions";
import { ProjectVideosBoard, RushLink, useWorkspace } from "@/components/VideoWorkspace";
import { ProjectProgress } from "@/components/ProjectProgress";
import { statusBadgeClass, deadlineTone, fmtDateFR } from "@/lib/project-display";

export const Route = createFileRoute("/crm/editor/projects")({
  validateSearch: (s: Record<string, unknown>) => ({
    p: typeof s.p === "string" ? s.p : undefined,
    v: typeof s.v === "string" ? s.v : undefined,
  }) as { p?: string; v?: string },
  component: EditorProjectsPage,
});

function EditorProjectsPage() {
  const navigate = useNavigate();
  const { p: selected, v: focusVideo } = Route.useSearch();
  const fetchProjects = useServerFn(listMyProjectsOverview);

  const q = useQuery({
    queryKey: ["editor", "projects"],
    queryFn: () => fetchProjects(),
    refetchInterval: 30_000,
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl">
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
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-neutral-900/40 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/5 text-neutral-400">
              <tr>
                <th className="text-left font-medium px-4 py-3">Projet</th>
                <th className="text-left font-medium px-4 py-3">Vidéos</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="text-left font-medium px-4 py-3">Deadline</th>
                <th className="text-left font-medium px-4 py-3">Progression</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate({ to: "/crm/editor/projects", search: { p: p.id, v: undefined } })}
                  className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition"
                >
                  <td className="px-4 py-3 text-white">{p.title}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    {p.total_videos} vidéo{p.total_videos > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] rounded-full border px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${deadlineTone(p.deadline)}`}>{fmtDateFR(p.deadline)}</td>
                  <td className="px-4 py-3">
                    <ProjectProgress approved={p.approved_videos} total={p.total_videos} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ProjectFullscreen
            id={selected}
            focusVideo={focusVideo ?? null}
            onClose={() => navigate({ to: "/crm/editor/projects", search: { p: undefined, v: undefined } })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectFullscreen({
  id,
  onClose,
  focusVideo,
}: {
  id: string;
  onClose: () => void;
  focusVideo?: string | null;
}) {
  const qc = useQueryClient();
  const q = useWorkspace(id);
  const [briefOpen, setBriefOpen] = useState(false);

  const project = q.data?.project;
  const videos = q.data?.videos ?? [];
  const approved = videos.filter((v) => v.status === "Approuvée" || v.status === "Livrée").length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["workspace", id] });
    qc.invalidateQueries({ queryKey: ["editor", "projects"] });
    qc.invalidateQueries({ queryKey: ["editor", "notifications"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex flex-col bg-neutral-950"
    >
      <div className="shrink-0 border-b border-white/10 bg-neutral-950/95 px-4 py-3 md:px-6 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Mes projets
          </button>
          <div className="hidden md:block h-6 w-px bg-white/10" />
          <h1 className="min-w-0 truncate text-base md:text-lg font-semibold text-white">{project?.title ?? "…"}</h1>
          {project && (
            <>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass(project.status)}`}>
                {project.status}
              </span>
              <span className={`text-xs ${deadlineTone(project.deadline)}`}>
                {project.deadline ? `Deadline ${fmtDateFR(project.deadline)}` : "Pas de deadline"}
              </span>
            </>
          )}
          <div className="w-full md:w-auto md:ml-auto flex items-center gap-4">
            <ProjectProgress approved={approved} total={videos.length} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-[1600px] space-y-5">
          <section className="rounded-2xl border border-white/10 bg-neutral-900/40">
            <button
              onClick={() => setBriefOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
            >
              <FileText className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white">
                Brief & Rushs du projet
              </span>
              <ChevronDown
                className={`ml-auto h-4 w-4 text-neutral-400 transition-transform duration-300 ${
                  briefOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {briefOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-5 pb-5">
                    <div className="whitespace-pre-wrap rounded-xl border border-white/5 bg-neutral-950/60 px-4 py-3 text-sm leading-relaxed text-neutral-200">
                      {project?.brief?.trim() || "Aucun brief pour l'instant."}
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-red-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Rushs
                        </span>
                      </div>
                      {(project?.rushs_links ?? []).length === 0 ? (
                        <p className="text-sm text-neutral-500">Aucun rush déposé.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(project?.rushs_links ?? []).map((l, i) => (
                            <li key={i} className="rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2">
                              <RushLink href={l} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {q.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement du projet…
            </div>
          ) : (
            <ProjectVideosBoard projectId={id} role="editor" onRefresh={refresh} initialVideoId={focusVideo} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
