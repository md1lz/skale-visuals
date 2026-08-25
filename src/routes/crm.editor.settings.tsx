import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/components/NotificationsSettings";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Palette, ImageIcon, Upload, Trash2, Check, Sun, Moon, MonitorSmartphone } from "lucide-react";
import { RememberedConnections } from "@/components/RememberedConnections";
import { ADMIN_THEMES, useAdminPrefs, type AdminTheme } from "@/components/admin-prefs";

export const Route = createFileRoute("/crm/editor/settings")({ component: EditorSettingsPage });

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

function EditorSettingsPage() {
  return (
    <div className="px-4 pt-6 pb-12 md:px-8 md:pt-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-sm text-neutral-400 mt-1">Personnalisation de ton espace.</p>
      </div>
      <ThemeSection />
      <BackgroundSection />
      <RememberedConnections source="web" />
      <RememberedConnections source="app" />
      <NotificationsSettings defaultUrl="/crm/editor" />
    </div>
  );
}

function ThemeSection() {
  const { theme, setTheme, modePref, setMode } = useAdminPrefs();
  return (
    <Section icon={Palette} title="Changer de thème" description="La couleur d'accent, mémorisée sur cet appareil.">
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
                active ? "border-white/40 bg-white/5" : "border-white/10 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              <span className="h-10 w-10 rounded-full ring-1 ring-white/15" style={{ background: t.swatch }} />
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
    <Section icon={ImageIcon} title="Ajouter un background" description="Image d'arrière-plan visible sur cet appareil.">
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
