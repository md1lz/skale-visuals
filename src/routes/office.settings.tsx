import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/components/NotificationsSettings";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  ImageIcon,
  Users,
  Trash2,
  Upload,
  KeyRound,
  Plus,
  Check,
  Eye,
  EyeOff,
  Sun,
  MonitorSmartphone,
  Moon,
} from "lucide-react";
import {
  ADMIN_THEMES,
  useAdminPrefs,
  type AdminTheme,
} from "@/components/admin-prefs";
import {
  listAdmins,
  updateAdminCredentials,
  createAdminAccount,
} from "@/lib/admin-settings.functions";
import { RememberedConnections } from "@/components/RememberedConnections";


export const Route = createFileRoute("/office/settings")({
  component: ParametresPage,
});

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
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
          {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function ParametresPage() {
  return (
    <div className="px-4 pt-6 pb-12 md:px-8 md:pt-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Personnalisation, sécurité et gestion des comptes administrateurs.
        </p>
      </div>

      <ThemeSection />
      <BackgroundSection />
      <RememberedConnections source="web" />
      <RememberedConnections source="app" />
      <NotificationsSettings defaultUrl="/office" />
      <AccountsSection />
    </div>
  );
}

/* ---------- THEME ---------- */
function ThemeSection() {
  const { theme, setTheme, modePref, setMode } = useAdminPrefs();
  return (
    <Section icon={Palette} title="Changer de thème" description="La couleur d'accent du panneau admin, mémorisée sur cet appareil.">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {ADMIN_THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as AdminTheme)}
              className={`relative rounded-xl border p-3 flex flex-col items-center gap-2 transition ${
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
                <span className="absolute top-2 right-2 grid place-items-center h-5 w-5 rounded-full bg-white text-black">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- BACKGROUND ---------- */
function BackgroundSection() {
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
    <Section
      icon={ImageIcon}
      title="Ajouter un background"
      description="Image d'arrière-plan personnelle, visible uniquement sur cet appareil."
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div
          className="h-32 w-48 rounded-xl border border-white/10 bg-neutral-800/50 overflow-hidden flex items-center justify-center text-xs text-neutral-500 shrink-0"
          style={
            background
              ? { backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {!background && "Aucun"}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-900 hover:bg-white/5 px-3 py-2 text-xs text-neutral-200 transition w-fit"
          >
            <Upload className="h-3.5 w-3.5" />
            {background ? "Changer l'image" : "Importer une image"}
          </button>
          {background && (
            <button
              onClick={() => setBackground(null)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:text-red-300 transition w-fit"
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
    </Section>
  );
}

/* ---------- ACCOUNTS ---------- */
function AccountsSection() {
  const fetchList = useServerFn(listAdmins);
  const q = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: () => fetchList(),
    initialData: [],
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Section
      icon={Users}
      title="Comptes admins"
      description="Modifier les identifiants existants ou créer un nouveau compte. Code de sauvetage requis."
    >
      <div className="space-y-2 mb-3">
        {q.data.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
          >
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-red-500/15 text-red-400 shrink-0">
              <Users className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">@{a.username}</p>
              <p className="text-[11px] text-neutral-500">
                {a.last_login_at
                  ? `Dernière connexion : ${new Date(a.last_login_at).toLocaleString("fr-FR")}`
                  : "Jamais connecté"}
              </p>
            </div>
            <button
              onClick={() => setEditing(a.username)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-white/5 transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Modifier
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-medium text-white transition"
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
    </Section>
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <h2 className="text-white text-base font-semibold mb-4">{title}</h2>
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
        className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 pr-9 text-sm text-white focus:outline-none focus:border-red-500"
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
  const [rescueCode, setRescueCode] = useState("");
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
          rescueCode,
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
          <span className="block text-[11px] text-neutral-400 mb-1">Nouvel identifiant</span>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] text-neutral-400 mb-1">Nouveau mot de passe (laisser vide pour conserver)</span>
          <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
        </label>
        <label className="block">
          <span className="block text-[11px] text-neutral-400 mb-1">Code de sauvetage</span>
          <PasswordInput value={rescueCode} onChange={setRescueCode} placeholder="Code de sauvetage" />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-70 px-3 py-2 text-sm font-medium text-white transition"
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
  const [rescueCode, setRescueCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await create({ data: { username, password, rescueCode } });
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
          <span className="block text-[11px] text-neutral-400 mb-1">Identifiant</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] text-neutral-400 mb-1">Mot de passe (min. 8 caractères)</span>
          <PasswordInput value={password} onChange={setPassword} />
        </label>
        <label className="block">
          <span className="block text-[11px] text-neutral-400 mb-1">Code de sauvetage</span>
          <PasswordInput value={rescueCode} onChange={setRescueCode} />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-70 px-3 py-2 text-sm font-medium text-white transition"
          >
            {busy ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
