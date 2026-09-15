import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  MonitorSmartphone,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
  Users,
  Loader2,
} from "lucide-react";
import { ADMIN_THEMES, useAdminPrefs, type AdminTheme } from "@/components/admin-prefs";
import {
  listAdmins,
  updateAdminCredentials,
  createAdminAccount,
} from "@/lib/admin-settings.functions";
import { getAdminProfile, updateAdminProfile } from "@/lib/admin-auth.functions";

export function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur">
      <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-neutral-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
    </div>
  );
}

export function SettingsPage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 pt-6 pb-12 md:px-8 md:pt-10">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
      />
    </label>
  );
}

/* ---------- MON COMPTE ---------- */
export function AccountPanel() {
  const fetchProfile = useServerFn(getAdminProfile);
  const saveProfile = useServerFn(updateAdminProfile);
  const q = useQuery({ queryKey: ["admin", "profile"], queryFn: () => fetchProfile() });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (q.data) {
      setFirstName(q.data.firstName ?? "");
      setLastName(q.data.lastName ?? "");
    }
  }, [q.data]);

  async function save() {
    setBusy(true);
    try {
      await saveProfile({ data: { firstName, lastName } });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      q.refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card title="Mon profil" description="Nom affiché dans Skale Settings.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom" value={firstName} onChange={setFirstName} />
          <Field label="Nom" value={lastName} onChange={setLastName} />
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Identifiant de connexion : <span className="text-neutral-300">@{q.data?.username}</span>
        </p>
        <button
          onClick={save}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </Card>

      <Card
        title="Identifiants de connexion"
        description="Changer l'identifiant ou le mot de passe de ce compte."
      >
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-200 transition hover:bg-white/5"
        >
          <KeyRound className="h-4 w-4" />
          Modifier mes identifiants
        </button>
        {editing && q.data?.username && (
          <EditCredentialsModal
            username={q.data.username}
            onClose={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        )}
      </Card>
    </>
  );
}

/* ---------- THEME ---------- */
export function ThemeSection() {
  const { theme, setTheme, modePref, setMode } = useAdminPrefs();
  return (
    <Card
      title="Changer de thème"
      description="La couleur d'accent du panneau, mémorisée sur cet appareil."
    >
      <div className="mb-4 grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 p-1 sm:inline-flex sm:w-auto">
        <button
          onClick={() => setMode("system")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
            modePref === "system" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          <MonitorSmartphone className="h-3.5 w-3.5" /> Système
        </button>
        <button
          onClick={() => setMode("dark")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
            modePref === "dark" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Moon className="h-3.5 w-3.5" /> Sombre
        </button>
        <button
          onClick={() => setMode("light")}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
            modePref === "light" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Sun className="h-3.5 w-3.5" /> Clair
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {ADMIN_THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as AdminTheme)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                active
                  ? "border-white/40 bg-white/5"
                  : "border-white/10 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              <span
                className="h-10 w-10 rounded-full ring-1 ring-white/15"
                style={{ background: t.swatch }}
              />
              <span className="text-xs text-neutral-300">{t.label}</span>
              {active && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-black">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- BACKGROUND ---------- */
export function BackgroundSection() {
  const { background, setBackground } = useAdminPrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(file: File) {
    if (file.size > 3_000_000) {
      setError("Image trop volumineuse (max 3 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setBackground(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card
      title="Ajouter un background"
      description="Image d'arrière-plan personnelle, visible uniquement sur cet appareil."
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <div
          className="flex h-32 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-neutral-800/50 text-xs text-neutral-500"
          style={
            background
              ? {
                  backgroundImage: `url(${background})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!background && "Aucun"}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/5"
          >
            <Upload className="h-3.5 w-3.5" />
            {background ? "Changer l'image" : "Importer une image"}
          </button>
          {background && (
            <button
              onClick={() => setBackground(null)}
              className="flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 transition hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Retirer le background
            </button>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Card>
  );
}

/* ---------- ACCOUNTS ---------- */
export function AccountsSection() {
  const fetchList = useServerFn(listAdmins);
  const q = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: () => fetchList(),
    initialData: [],
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card
      title="Comptes admins"
      description="Modifier les identifiants existants ou créer un nouveau compte."
    >
      <div className="mb-3 space-y-2">
        {q.data.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-400">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">@{a.username}</p>
              <p className="text-[11px] text-neutral-500">
                {a.last_login_at
                  ? `Dernière connexion : ${new Date(a.last_login_at).toLocaleString("fr-FR")}`
                  : "Jamais connecté"}
              </p>
            </div>
            <button
              onClick={() => setEditing(a.username)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-200 transition hover:bg-white/5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Modifier
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500"
      >
        <Plus className="h-4 w-4" />
        Ajouter un compte admin
      </button>

      {editing && (
        <EditCredentialsModal
          username={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            q.refetch();
          }}
        />
      )}
      {creating && (
        <CreateAccountModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            q.refetch();
          }}
        />
      )}
    </Card>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 pr-9 text-sm text-white focus:border-red-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function EditCredentialsModal({
  username,
  onClose,
  onSaved,
}: {
  username: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(updateAdminCredentials);
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await save({
        data: {
          targetUsername: username,
          newUsername: newUsername !== username ? newUsername : null,
          newPassword: newPassword || null,
        },
      });
      if (!res.ok) setError(res.error);
      else onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={`Modifier @${username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Nouvel identifiant</span>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">
            Nouveau mot de passe (laisser vide pour conserver)
          </span>
          <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-70"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = useServerFn(createAdminAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await create({ data: { username, password } });
      if (!res.ok) setError(res.error);
      else onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Nouveau compte admin" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Identifiant</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">
            Mot de passe (min. 8 caractères)
          </span>
          <PasswordInput value={password} onChange={setPassword} />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-70"
          >
            {busy ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
