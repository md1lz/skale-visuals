import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageSquare, Paperclip, AlertTriangle, CheckCircle2, FolderOpen, Clock, FolderPlus, Repeat2 } from "lucide-react";
import { listMyNotifications, listMyProjects, getEditorSessionFn } from "@/lib/editor.functions";
import { statusBadgeClass, deadlineTone, fmtDateFR } from "@/lib/project-display";

export const Route = createFileRoute("/monteur/")({ component: EditorHome });

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className="text-lg font-semibold text-white">{letters || "?"}</span>;
}

const NOTIF_ICONS: Record<string, React.ElementType> = {
  assign: FolderOpen,
  created: FolderPlus,
  reassign: Repeat2,
  comment: MessageSquare,
  file: Paperclip,
  deadline: AlertTriangle,
  status: CheckCircle2,
};

function EditorHome() {
  const navigate = useNavigate();
  const fetchNotifs = useServerFn(listMyNotifications);
  const fetchProjects = useServerFn(listMyProjects);
  const fetchMe = useServerFn(getEditorSessionFn);

  const meQ = useQuery({ queryKey: ["editor", "me"], queryFn: () => fetchMe() });
  const notifQ = useQuery({
    queryKey: ["editor", "notifications"],
    queryFn: () => fetchNotifs(),
    initialData: [] as Awaited<ReturnType<typeof fetchNotifs>>,
    refetchInterval: 20_000,
  });
  const projQ = useQuery({
    queryKey: ["editor", "projects"],
    queryFn: () => fetchProjects(),
    initialData: [] as Awaited<ReturnType<typeof fetchProjects>>,
    refetchInterval: 30_000,
  });

  const name = meQ.data?.displayName ?? "";
  const active = (projQ.data ?? []).filter((p) => p.status !== "Livrée" && p.status !== "Payée");

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    if (h < 24) return `Il y a ${h} h`;
    return `Il y a ${d} j`;
  };

  return (
    <div className="px-8 pt-10 pb-12 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-5 mb-10"
      >
        <span className="grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 ring-1 ring-white/15 overflow-hidden shrink-0">
          {meQ.data?.avatarUrl ? (
            <img src={meQ.data.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Initials name={name} />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Bonjour,{" "}
            <span className="font-script text-red-500 text-3xl md:text-4xl leading-none align-middle">{name}</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Voici un aperçu de ton activité récente.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Notifications</h2>
        </div>
        <div className="space-y-2">
          {!(notifQ.data ?? []).length ? (
            <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded-xl px-4 py-3 text-center">
              Aucune notification pour l'instant.
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {(notifQ.data ?? []).slice(0, 8).map((n) => {
                const Icon = NOTIF_ICONS[n.type] ?? Bell;
                return (
                  <motion.button
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    onClick={() =>
                      n.project_id
                        ? navigate({ to: "/monteur/projets", search: { p: n.project_id } })
                        : navigate({ to: "/monteur/projets" })
                    }
                    className="w-full text-left flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] transition"
                  >
                    <span
                      className={`grid place-items-center h-9 w-9 rounded-lg shrink-0 ${
                        n.type === "deadline"
                          ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20"
                          : "bg-red-500/15 text-red-400 ring-1 ring-red-500/20"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-white truncate">{n.message}</span>
                    <span className="text-xs text-neutral-500 shrink-0">{relTime(n.created_at)}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Mes projets en cours</h2>
        </div>
        {active.length === 0 ? (
          <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded-xl px-4 py-3 text-center">
            Aucun projet en cours.
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate({ to: "/monteur/projets", search: { p: p.id } })}
                className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] transition text-left"
              >
                <span className="flex-1 min-w-0 text-sm text-white truncate">{p.title}</span>
                <span className={`text-[11px] rounded-full border px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                  {p.status}
                </span>
                <span className={`text-xs shrink-0 ${deadlineTone(p.deadline)}`}>
                  {p.deadline ? fmtDateFR(p.deadline) : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
