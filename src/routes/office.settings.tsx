import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  UserCircle2,
  Bell,
  Plug,
  Scale,
  FileText,
  Globe,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { ADMIN_THEMES, useAdminPrefs, type AdminTheme } from "@/components/admin-prefs";
import {
  listAdmins,
  updateAdminCredentials,
  createAdminAccount,
} from "@/lib/admin-settings.functions";
import { getAdminProfile, updateAdminProfile } from "@/lib/admin-auth.functions";
import { getBillingConfig, saveBillingConfig } from "@/lib/billing.functions";
import { DEFAULT_BILLING, type BillingSettings } from "@/lib/billing.shared";
import { RememberedConnections } from "@/components/RememberedConnections";
import { SiteAdminPanel } from "@/components/office/SiteAdminPanel";
import { AvailabilitySettings } from "@/components/office/AvailabilitySettings";

type TabId =
  | "account"
  | "appearance"
  | "notifications"
  | "connections"
  | "legal"
  | "documents"
  | "website"
  | "availability"
  | "admins";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Mon compte", icon: UserCircle2 },
  { id: "appearance", label: "Apparence", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "connections", label: "Connexions", icon: Plug },
  { id: "legal", label: "Informations légales", icon: Scale },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "website", label: "Gestion du site web", icon: Globe },
  { id: "availability", label: "Disponibilités", icon: CalendarClock },
  { id: "admins", label: "Comptes admin", icon: Users },
];

export const Route = createFileRoute("/office/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: TabId } => {
    const tab = typeof s.tab === "string" ? (s.tab as TabId) : undefined;
    return TABS.some((t) => t.id === tab) ? { tab } : {};
  },
  component: ParametresPage,
});

function Card({
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  const cls =
    "w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-white outline-none focus:border-red-500";
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}

function ParametresPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const active: TabId = tab ?? "account";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Compte, apparence, informations légales, site web et accès administrateurs.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="lg:w-60 lg:shrink-0">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ to: "/office/settings", search: { tab: t.id } })}
                  className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] transition ${
                    on
                      ? "bg-white/[0.06] text-white"
                      : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="settings-tab"
                      className="absolute inset-0 -z-10 rounded-xl border border-white/10"
                    />
                  )}
                  <Icon className={`h-4 w-4 ${on ? "text-red-400" : "text-neutral-500"}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="min-w-0 flex-1 space-y-6"
        >
          {active === "account" && <AccountPanel />}
          {active === "appearance" && (
            <>
              <ThemeSection />
              <BackgroundSection />
            </>
          )}
          {active === "notifications" && <NotificationsPanel />}
          {active === "connections" && <RememberedConnections />}
          {active === "legal" && <BillingPanel section="legal" />}
          {active === "documents" && <BillingPanel section="documents" />}
          {active === "website" && <SiteAdminPanel />}
          {active === "availability" && (
            <Card title="Disponibilités" description="Créneaux proposés sur la page Book a Call.">
              <AvailabilitySettings />
            </Card>
          )}
          {active === "admins" && <AccountsSection />}
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- MON COMPTE ---------- */
function AccountPanel() {
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
      <Card title="Mon profil" description="Nom affiché dans Skale Office.">
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
        description="Changer l'identifiant ou le mot de passe. Code de sauvetage requis."
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

/* ---------- NOTIFICATIONS ---------- */
const NOTIF_KEY = "office:notifications";
type NotifPrefs = { banners: boolean; sound: boolean; emailAlerts: boolean };
const DEFAULT_NOTIF: NotifPrefs = { banners: true, sound: true, emailAlerts: true };

function NotificationsPanel() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs({ ...DEFAULT_NOTIF, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(key: keyof NotifPrefs) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const rows: { key: keyof NotifPrefs; label: string; hint: string }[] = [
    { key: "banners", label: "Bannières in-app", hint: "Nouveaux messages et versions vidéo." },
    { key: "sound", label: "Son des messages", hint: "Petit son à la réception d'un message." },
    {
      key: "emailAlerts",
      label: "Alertes email",
      hint: "Réservations d'appels et devis signés.",
    },
  ];

  return (
    <Card title="Notifications" description="Préférences enregistrées sur cet appareil.">
      <div className="space-y-2">
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => toggle(r.key)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-left transition hover:border-white/15"
          >
            <span>
              <span className="block text-sm text-white">{r.label}</span>
              <span className="block text-[11px] text-neutral-500">{r.hint}</span>
            </span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                prefs[r.key] ? "bg-red-500" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  prefs[r.key] ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ---------- LÉGAL / DOCUMENTS ---------- */
function BillingPanel({ section }: { section: "legal" | "documents" }) {
  const fetchCfg = useServerFn(getBillingConfig);
  const saveCfg = useServerFn(saveBillingConfig);
  const q = useQuery({ queryKey: ["office", "billing-config"], queryFn: () => fetchCfg() });
  const [cfg, setCfg] = useState<BillingSettings>(DEFAULT_BILLING);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) setCfg(q.data as BillingSettings);
  }, [q.data]);

  const patch = (p: Partial<BillingSettings>) => setCfg((c) => ({ ...c, ...p }));

  async function save() {
    setBusy(true);
    try {
      await saveCfg({ data: cfg });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  const saveButton = (
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
  );

  if (section === "legal") {
    return (
      <Card
        title="Informations légales"
        description="Ces informations apparaissent sur les devis et factures PDF."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Nom légal"
            value={cfg.legalName}
            onChange={(v) => patch({ legalName: v })}
          />
          <div className="space-y-2 sm:col-span-2">
            <span className="block text-[11px] text-neutral-400">SIRET</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: true, label: "Pas encore de SIRET" },
                { key: false, label: "Renseigner le SIRET" },
              ].map((o) => (
                <button
                  key={String(o.key)}
                  type="button"
                  onClick={() => patch({ siretPending: o.key })}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    !!cfg.siretPending === o.key
                      ? "bg-red-600 text-white"
                      : "border border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {cfg.siretPending ? (
              <p className="text-[11px] text-neutral-500">
                Les documents afficheront « en attente d'immatriculation » avec la mention légale.
              </p>
            ) : (
              <Field label="Numéro SIRET" value={cfg.siret} onChange={(v) => patch({ siret: v })} />
            )}
          </div>

          <Field
            label="TVA intracommunautaire"
            value={cfg.vatNumber}
            onChange={(v) => patch({ vatNumber: v })}
          />
          <Field
            label="Email de facturation"
            value={cfg.email}
            onChange={(v) => patch({ email: v })}
          />
          <Field label="Téléphone" value={cfg.phone} onChange={(v) => patch({ phone: v })} />
          <Field label="IBAN" value={cfg.iban} onChange={(v) => patch({ iban: v })} />
          <Field label="BIC" value={cfg.bic} onChange={(v) => patch({ bic: v })} />
        </div>
        <div className="mt-3 grid gap-3">
          <Field
            label="Adresse"
            value={cfg.address}
            onChange={(v) => patch({ address: v })}
            textarea
          />
          <Field
            label="Conditions de paiement"
            value={cfg.paymentTerms}
            onChange={(v) => patch({ paymentTerms: v })}
            textarea
          />
          <Field
            label="Mentions légales"
            value={cfg.legalMentions}
            onChange={(v) => patch({ legalMentions: v })}
            textarea
          />
        </div>
        {saveButton}
      </Card>
    );
  }

  return (
    <Card
      title="Documents"
      description="Numérotation et conditions par défaut des devis et factures."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Préfixe devis"
          value={cfg.quotePrefix}
          onChange={(v) => patch({ quotePrefix: v })}
        />
        <Field
          label="Numéro de départ (devis)"
          type="number"
          value={cfg.quoteStart}
          onChange={(v) => patch({ quoteStart: Number(v) || 0 })}
        />
        <Field
          label="Préfixe factures"
          value={cfg.invoicePrefix}
          onChange={(v) => patch({ invoicePrefix: v })}
        />
        <Field
          label="Numéro de départ (factures)"
          type="number"
          value={cfg.invoiceStart}
          onChange={(v) => patch({ invoiceStart: Number(v) || 0 })}
        />
      </div>
      <div className="mt-3">
        <Field
          label="Conditions par défaut"
          value={cfg.defaultConditions}
          onChange={(v) => patch({ defaultConditions: v })}
          textarea
        />
      </div>
      {saveButton}
    </Card>
  );
}

/* ---------- THEME ---------- */
function ThemeSection() {
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
    <Card
      title="Comptes admins"
      description="Modifier les identifiants existants ou créer un nouveau compte. Code de sauvetage requis."
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
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Code de sauvetage</span>
          <PasswordInput
            value={rescueCode}
            onChange={setRescueCode}
            placeholder="Code de sauvetage"
          />
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
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Code de sauvetage</span>
          <PasswordInput value={rescueCode} onChange={setRescueCode} />
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
