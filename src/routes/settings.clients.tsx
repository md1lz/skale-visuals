import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserRound, X } from "lucide-react";

import {
  createClientAccount,
  deleteClientAccount,
  sendClientSetupEmail,
  listClientAccounts,
  updateClientAccount,
  type ClientAccount,
} from "@/lib/client-accounts.functions";

export const Route = createFileRoute("/settings/clients")({
  component: ClientsPage,
});

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-neutral-500 outline-none focus:border-white/25";

type Draft = { id: string | null; email: string; full_name: string; company: string };

const EMPTY: Draft = { id: null, email: "", full_name: "", company: "" };

function ClientsPage() {
  const [rows, setRows] = useState<ClientAccount[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await listClientAccounts());
    } catch {
      setRows([]);
      setError("Impossible de charger les clients.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!draft || pending) return;
    setPending(true);
    setError(null);
    try {
      const payload = {
        email: draft.email,
        full_name: draft.full_name,
        company: draft.company,
      };
      if (draft.id) await updateClientAccount({ data: { id: draft.id, ...payload } });
      else await createClientAccount({ data: payload });
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  async function resend(id: string) {
    try {
      await sendClientSetupEmail({ data: { id } });
      setError(null);
      window.alert("E-mail de création de mot de passe renvoyé.");
    } catch {
      setError("Envoi impossible.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer définitivement ce client et son accès ?")) return;
    try {
      await deleteClientAccount({ data: { id } });
      await load();
    } catch {
      setError("Suppression impossible.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Espace client</h1>
          <p className="mt-1 text-[13px] text-neutral-400">
            Créez et gérez les accès à app.skalevisuals.com.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-500/90"
        >
          <Plus className="h-4 w-4" /> Nouveau client
        </button>
      </header>

      {error && <p className="mt-4 text-[12.5px] text-red-400">{error}</p>}

      {draft && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[14px] font-medium">
              {draft.id ? "Modifier le client" : "Nouveau client"}
            </h2>
            <button type="button" onClick={() => setDraft(null)} className="text-neutral-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="E-mail"
              className={inputClass}
            />
            <input
              value={draft.full_name}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              placeholder="Nom complet"
              className={inputClass}
            />
            <input
              value={draft.company}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              placeholder="Société (facultatif)"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending || !draft.email.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-neutral-900 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {rows === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center text-[13px] text-neutral-400">
            Aucun client pour le moment.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-neutral-300">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">
                  {row.full_name || row.email || "Sans nom"}
                </p>
                <p className="truncate text-[12px] text-neutral-400">
                  {row.email}
                  {row.company ? ` · ${row.company}` : ""}
                </p>
              </div>
              <span className="text-[11.5px] text-neutral-500">
                {row.last_sign_in_at
                  ? `Dernière connexion ${new Date(row.last_sign_in_at).toLocaleDateString("fr-FR")}`
                  : "Jamais connecté"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: row.id,
                      email: row.email,
                      full_name: row.full_name,
                      company: row.company ?? "",
                    })
                  }
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-neutral-300 hover:text-white"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => resend(row.id)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-neutral-300 hover:text-white"
                >
                  Renvoyer l'e-mail
                </button>
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  className="rounded-full border border-white/10 p-1.5 text-neutral-400 hover:text-red-400"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
