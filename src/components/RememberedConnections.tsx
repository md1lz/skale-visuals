import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Wifi, Trash2, Pencil, Check, X } from "lucide-react";
import {
  listConnections,
  forgetConnection,
  renameConnection,
  type RememberedConnection,
} from "@/lib/connections.functions";

function formatLastSeen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return `vu aujourd'hui à ${time}`;
  if (isSameDay(d, yesterday)) return `vu hier à ${time}`;
  return `vu ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} à ${time}`;
}

export function RememberedConnections() {
  const source = "web" as const;
  const fetchList = useServerFn(listConnections);
  const forget = useServerFn(forgetConnection);
  const rename = useServerFn(renameConnection);

  const q = useQuery({
    queryKey: ["connections", source],
    queryFn: () => fetchList({ data: { source } }),
    initialData: [] as RememberedConnection[],
    refetchInterval: 15_000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const Icon = Wifi;
  const title = "Connexions enregistrées";
  const description = 'Appareils enregistrés avec "se souvenir de moi".';

  async function onForget(id: string) {
    await forget({ data: { id } });
    q.refetch();
  }

  async function onSaveRename(id: string) {
    await rename({ data: { id, label: draft.trim() || null } });
    setEditingId(null);
    setDraft("");
    q.refetch();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-red-500/15 text-red-400 shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
        </div>
      </div>

      {q.data.length === 0 ? (
        <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded-xl px-4 py-3 text-center">
          Aucun appareil enregistré.
        </div>
      ) : (
        <div className="space-y-2">
          {q.data.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <span className="grid place-items-center h-8 w-8 rounded-lg bg-red-500/15 text-red-400 shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveRename(row.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setDraft("");
                        }
                      }}
                      placeholder="Nom de l'appareil"
                      className="w-full bg-neutral-900/80 border border-white/10 rounded-md px-2 py-1 text-sm text-white outline-none focus:border-red-400/60"
                    />
                  ) : (
                    <p className="text-sm text-white truncate">
                      {row.label ? (
                        <>
                          <span className="font-medium">{row.label}</span>{" "}
                          <span className="font-mono text-neutral-500 text-xs">· {row.ip}</span>
                        </>
                      ) : (
                        <span className="font-mono">{row.ip}</span>
                      )}
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-1.5">
                    <span>@{row.username}</span>
                    <span>·</span>
                    <span className="rounded px-1.5 py-0.5 bg-white/5 text-neutral-400">
                      {row.ownerType === "editor" ? `Monteur · ${row.ownerName}` : "Admin"}
                    </span>
                    <span>·</span>
                    {row.online ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                        En ligne
                      </span>
                    ) : (
                      <span>{formatLastSeen(row.lastSeenAt)}</span>
                    )}
                  </p>
                </div>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => onSaveRename(row.id)}
                      className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                      title="Enregistrer"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setDraft("");
                      }}
                      className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                      title="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(row.id);
                      setDraft(row.label ?? "");
                    }}
                    className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                    title="Renommer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onForget(row.id)}
                  className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Oublier cet appareil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
