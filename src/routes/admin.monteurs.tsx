import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Loader2,
  Scissors,
  Ban,
  CircleCheck,
  Trash2,
  KeyRound,
} from "lucide-react";
import {
  listEditors,
  createEditorAccount,
  updateEditorAccount,
  updateEditorCredentials,
  deleteEditorAccount,
  getEditorDetail,
  generateEditorPassword,
} from "@/lib/admin-editors.functions";
import { statusBadgeClass, fmtDateFR } from "@/lib/project-display";

export const Route = createFileRoute("/admin/monteurs")({ component: AdminEditorsPage });

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

function AdminEditorsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listEditors);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "editors"],
    queryFn: () => fetchList(),
    initialData: [] as Awaited<ReturnType<typeof fetchList>>,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "editors"] });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des monteurs</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Comptes freelances, activité et rémunération.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition shadow-lg shadow-red-600/20"
        >
          <Plus className="h-4 w-4" /> Créer un compte monteur
        </button>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : q.data.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 px-6 py-12 text-center">
          <Scissors className="h-6 w-6 mx-auto text-neutral-600 mb-3" />
          <p className="text-sm text-neutral-400">Aucun monteur pour l'instant.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-neutral-900/40">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-neutral-400">
              <tr>
                <th className="text-left font-medium px-4 py-3">Nom / Identifiant</th>
                <th className="text-left font-medium px-4 py-3">Projets réalisés</th>
                <th className="text-left font-medium px-4 py-3">CA généré</th>
                <th className="text-left font-medium px-4 py-3">Total payé</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setDetailId(e.id)}>
                    <p className="text-white">{e.display_name}</p>
                    <p className="text-xs text-neutral-500">@{e.username}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-200">{e.projects_done}</td>
                  <td className="px-4 py-3 text-neutral-200">{eur(e.revenue)}</td>
                  <td className="px-4 py-3 text-neutral-200">{eur(e.paid)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] rounded-full border px-2 py-0.5 ${
                        e.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-neutral-500/15 text-neutral-300 border-neutral-500/30"
                      }`}
                    >
                      {e.status === "active" ? "Actif" : "Suspendu"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setDetailId(e.id)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-white/5 transition"
                      >
                        Voir fiche
                      </button>
                      <button
                        title={e.status === "active" ? "Suspendre" : "Réactiver"}
                        onClick={async () => {
                          await updateEditorAccount({
                            data: { id: e.id, status: e.status === "active" ? "suspended" : "active" },
                          });
                          refresh();
                        }}
                        className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                      >
                        {e.status === "active" ? <Ban className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                      </button>
                      <button
                        title="Supprimer"
                        onClick={async () => {
                          if (!confirm(`Supprimer le compte de ${e.display_name} ?`)) return;
                          await deleteEditorAccount({ data: { id: e.id } });
                          toast.success("Compte supprimé");
                          refresh();
                        }}
                        className="grid place-items-center h-8 w-8 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <CreateEditorModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              refresh();
            }}
          />
        )}
        {detailId && <EditorDetailPanel id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
      </AnimatePresence>
    </div>
  );
}

function PasswordField({ value, onRegenerate }: { value: string; onRegenerate?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          readOnly
          type={show ? "text" : "password"}
          value={value}
          className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 pr-16 text-sm text-white font-mono"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(value);
              toast.success("Copié");
            }}
            className="text-neutral-400 hover:text-white"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setShow((s) => !s)} className="text-neutral-400 hover:text-white">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Régénérer
        </button>
      )}
    </div>
  );
}

function CreateEditorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const create = useServerFn(createEditorAccount);
  const gen = useServerFn(generateEditorPassword);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    const r = await gen();
    setPassword(r.password);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await create({ data: { display_name: displayName.trim(), username: username.trim(), password } });
      toast.success("Compte monteur créé");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-base font-semibold">Créer un compte monteur</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-xs text-neutral-400 mb-1.5">Prénom</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </label>

        <label className="block mb-3">
          <span className="block text-xs text-neutral-400 mb-1.5">Identifiant de connexion</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
            placeholder="nathan_skale"
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </label>

        <div className="mb-2">
          <span className="block text-xs text-neutral-400 mb-1.5">Mot de passe</span>
          {password ? (
            <PasswordField value={password} onRegenerate={regenerate} />
          ) : (
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition"
            >
              <KeyRound className="h-3.5 w-3.5" /> Générer un mot de passe
            </button>
          )}
        </div>
        <p className="text-[11px] text-neutral-500 mb-4">
          Transmets cet identifiant et ce mot de passe au monteur — il pourra le modifier dans ses paramètres.
        </p>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy || !displayName.trim() || username.trim().length < 3 || password.length < 8}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-medium text-white transition disabled:opacity-60"
          >
            {busy ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function CredentialsEditor({
  id,
  username,
  onSaved,
}: {
  id: string;
  username: string;
  onSaved: () => void;
}) {
  const save = useServerFn(updateEditorCredentials);
  const gen = useServerFn(generateEditorPassword);
  const [u, setU] = useState(username);
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setU(username);
    setP("");
  }, [username]);

  const dirty = u.trim().toLowerCase() !== username || p.length > 0;

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await save({
        data: {
          id,
          username: u.trim().toLowerCase() !== username ? u.trim() : undefined,
          password: p ? p : undefined,
        },
      });
      toast.success("Identifiants mis à jour");
      setP("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs text-neutral-400 mb-1.5">Identifiant de connexion</span>
        <input
          value={u}
          onChange={(e) => setU(e.target.value.replace(/\s+/g, ""))}
          className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </label>
      <div>
        <span className="block text-xs text-neutral-400 mb-1.5">Nouveau mot de passe</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="Définir un nouveau mot de passe"
              className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 pr-10 text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(p);
                toast.success("Copié");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              const r = await gen();
              setP(r.password);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Générer
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1.5">
          Le mot de passe est chiffré et ne peut plus être consulté après enregistrement — copiez-le avant de valider. Le
          monteur ne peut pas modifier ses identifiants lui-même.
        </p>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || !dirty || u.trim().length < 3 || (p.length > 0 && p.length < 8)}
        className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
      >
        {busy ? "Enregistrement…" : "Enregistrer les identifiants"}
      </button>
    </div>
  );
}

function EditorDetailPanel({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const fetchDetail = useServerFn(getEditorDetail);
  const q = useQuery({ queryKey: ["admin", "editor", id], queryFn: () => fetchDetail({ data: { id } }) });
  const d = q.data;

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
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-neutral-950/95 backdrop-blur border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">{d?.account.display_name ?? "…"}</h2>
            <p className="text-xs text-neutral-500">@{d?.account.username ?? ""}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Informations du compte</h3>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[11px] rounded-full border px-2 py-0.5 ${
                  d?.account.status === "active"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-neutral-500/15 text-neutral-300 border-neutral-500/30"
                }`}
              >
                {d?.account.status === "active" ? "Actif" : "Suspendu"}
              </span>
              <button
                onClick={async () => {
                  if (!d) return;
                  await updateEditorAccount({
                    data: { id, status: d.account.status === "active" ? "suspended" : "active" },
                  });
                  q.refetch();
                  onChanged();
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-200 hover:bg-white/5 transition"
              >
                {d?.account.status === "active" ? "Suspendre" : "Réactiver"}
              </button>
            </div>
            {d && (
              <CredentialsEditor
                id={id}
                username={d.account.username}
                onSaved={() => {
                  q.refetch();
                  onChanged();
                }}
              />
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Analytiques</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="🎬 Projets réalisés" value={String(d?.stats.done ?? 0)} />
              <Stat label="📁 Projets en cours" value={String(d?.stats.active ?? 0)} />
              <Stat label="💰 CA généré" value={eur(d?.stats.revenue ?? 0)} />
              <Stat label="💸 Total versé" value={eur(d?.stats.paid ?? 0)} />
              <Stat label="📈 Bénéfice net généré" value={eur(d?.stats.net ?? 0)} />
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Historique des projets</h3>
            {!d || d.projects.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun projet assigné.</p>
            ) : (
              <div className="space-y-1.5">
                {d.projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg bg-neutral-900/60 border border-white/5 px-3 py-2"
                  >
                    <span className="flex-1 min-w-0 text-sm text-white truncate">{p.title}</span>
                    <span className={`text-[11px] rounded-full border px-2 py-0.5 ${statusBadgeClass(p.status)}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-neutral-500 shrink-0">{fmtDateFR(p.deadline)}</span>
                    <span className="text-xs text-neutral-300 shrink-0">{eur(Number(p.amount_invoiced_ht ?? 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-sm text-white truncate">{value}</div>
    </div>
  );
}
