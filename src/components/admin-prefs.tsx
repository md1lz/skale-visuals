import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AdminTheme =
  | "red"
  | "violet"
  | "blue"
  | "green"
  | "yellow"
  | "gray"
  | "orange"
  | "pink"
  | "teal"
  | "indigo"
  | "emerald"
  | "rose";

export const ADMIN_THEMES: { id: AdminTheme; label: string; swatch: string; shades: ThemeShades }[] = [
  {
    id: "red",
    label: "Rouge",
    swatch: "#ef4444",
    shades: { c400: "#f87171", c500: "#ef4444", c600: "#dc2626", c800: "#991b1b" },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "#a855f7",
    shades: { c400: "#c084fc", c500: "#a855f7", c600: "#9333ea", c800: "#6b21a8" },
  },
  {
    id: "blue",
    label: "Bleu",
    swatch: "#3b82f6",
    shades: { c400: "#60a5fa", c500: "#3b82f6", c600: "#2563eb", c800: "#1e40af" },
  },
  {
    id: "green",
    label: "Vert",
    swatch: "#22c55e",
    shades: { c400: "#4ade80", c500: "#22c55e", c600: "#16a34a", c800: "#166534" },
  },
  {
    id: "yellow",
    label: "Jaune",
    swatch: "#eab308",
    shades: { c400: "#facc15", c500: "#eab308", c600: "#ca8a04", c800: "#854d0e" },
  },
  {
    id: "gray",
    label: "Gris",
    swatch: "#a3a3a3",
    shades: { c400: "#d4d4d4", c500: "#a3a3a3", c600: "#737373", c800: "#404040" },
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "#f97316",
    shades: { c400: "#fb923c", c500: "#f97316", c600: "#ea580c", c800: "#9a3412" },
  },
  {
    id: "pink",
    label: "Rose bonbon",
    swatch: "#ec4899",
    shades: { c400: "#f472b6", c500: "#ec4899", c600: "#db2777", c800: "#9d174d" },
  },
  {
    id: "teal",
    label: "Turquoise",
    swatch: "#14b8a6",
    shades: { c400: "#2dd4bf", c500: "#14b8a6", c600: "#0d9488", c800: "#115e59" },
  },
  {
    id: "indigo",
    label: "Indigo",
    swatch: "#6366f1",
    shades: { c400: "#818cf8", c500: "#6366f1", c600: "#4f46e5", c800: "#3730a3" },
  },
  {
    id: "emerald",
    label: "Émeraude",
    swatch: "#10b981",
    shades: { c400: "#34d399", c500: "#10b981", c600: "#059669", c800: "#065f46" },
  },
  {
    id: "rose",
    label: "Corail",
    swatch: "#f43f5e",
    shades: { c400: "#fb7185", c500: "#f43f5e", c600: "#e11d48", c800: "#9f1239" },
  },
];

type ThemeShades = { c400: string; c500: string; c600: string; c800: string };

type Ctx = {
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
  background: string | null;
  setBackground: (b: string | null) => void;
  mode: PanelMode;
  setMode: (m: PanelMode) => void;
};

export type PanelMode = "dark" | "light";

const AdminPrefsCtx = createContext<Ctx | null>(null);

const THEME_KEY = "skale.admin.theme";
const BG_KEY = "skale.admin.bg";
const MODE_KEY = "skale.admin.mode";

export function AdminPrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("red");
  const [background, setBackgroundState] = useState<string | null>(null);
  const [mode, setModeState] = useState<PanelMode>("dark");

  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as AdminTheme | null;
      if (t) setThemeState(t);
      const b = localStorage.getItem(BG_KEY);
      if (b) setBackgroundState(b);
      const m = localStorage.getItem(MODE_KEY) as PanelMode | null;
      if (m === "light" || m === "dark") setModeState(m);
    } catch {}
  }, []);

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
  };
  const setBackground = (b: string | null) => {
    setBackgroundState(b);
    try {
      if (b) localStorage.setItem(BG_KEY, b);
      else localStorage.removeItem(BG_KEY);
    } catch {}
  };
  const setMode = (m: PanelMode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch {}
  };

  const value = useMemo(
    () => ({ theme, setTheme, background, setBackground, mode, setMode }),
    [theme, background, mode],
  );

  return <AdminPrefsCtx.Provider value={value}>{children}</AdminPrefsCtx.Provider>;
}

export function useAdminPrefs() {
  const ctx = useContext(AdminPrefsCtx);
  if (!ctx) throw new Error("useAdminPrefs outside provider");
  return ctx;
}

export function ThemeStyleInjector() {
  const { theme, mode } = useAdminPrefs();
  const shades = (ADMIN_THEMES.find((t) => t.id === theme) ?? ADMIN_THEMES[0]).shades;
  // Override Tailwind red-* utilities used across the admin UI, scoped to .admin-themed.
  const css = `
.admin-themed .text-red-400 { color: ${shades.c400} !important; }
.admin-themed .text-red-500 { color: ${shades.c500} !important; }
.admin-themed .text-red-600 { color: ${shades.c600} !important; }
.admin-themed .bg-red-500 { background-color: ${shades.c500} !important; }
.admin-themed .bg-red-600 { background-color: ${shades.c600} !important; }
.admin-themed .hover\\:bg-red-500:hover { background-color: ${shades.c500} !important; }
.admin-themed .border-red-500\\/30 { border-color: ${shades.c500}4d !important; }
.admin-themed .border-red-600\\/30 { border-color: ${shades.c600}4d !important; }
.admin-themed .bg-red-600\\/15 { background-color: ${shades.c600}26 !important; }
.admin-themed .bg-red-500\\/15 { background-color: ${shades.c500}26 !important; }
.admin-themed .bg-red-500\\/10 { background-color: ${shades.c500}1a !important; }
.admin-themed .hover\\:bg-red-500\\/10:hover { background-color: ${shades.c500}1a !important; }
.admin-themed .from-red-600 { --tw-gradient-from: ${shades.c600} !important; }
.admin-themed .to-red-800 { --tw-gradient-to: ${shades.c800} !important; }
.admin-themed .shadow-\\[0_0_8px_rgba\\(220\\,38\\,38\\,0\\.8\\)\\] { box-shadow: 0 0 8px ${shades.c600}cc !important; }
.admin-themed .focus\\:border-red-500:focus { border-color: ${shades.c500} !important; }
.admin-themed [stroke="#ef4444"] { stroke: ${shades.c500} !important; }
.admin-themed [fill="#ef4444"] { fill: ${shades.c500} !important; }
.admin-themed [stop-color="#ef4444"] { stop-color: ${shades.c500} !important; }
${mode === "light" ? LIGHT_CSS : ""}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/**
 * Light mode is built from utility-token matching so it covers every
 * dark utility used across the admin/monteur panels, whatever the opacity
 * suffix. `sel` matches a token only at a class-name boundary, so variants
 * like `hover:bg-white/5` are not caught by the base rule.
 */
const sel = (tokens: string[], suffix = "") =>
  tokens
    .flatMap((t) => [
      `.admin-themed.mode-light [class^="${t}"]${suffix}`,
      `.admin-themed.mode-light [class*=" ${t}"]${suffix}`,
    ])
    .join(",\n");

const LIGHT_CSS = `
.admin-themed.mode-light { color-scheme: light; background-color: #e7e8eb !important; color: #17181b !important; }

/* Surfaces — soft greys, never pure white slabs */
${sel(["bg-neutral-950", "bg-black"])} { background-color: #e7e8eb !important; }
${sel(["bg-neutral-900"])} { background-color: #f1f2f4 !important; }
${sel(["bg-neutral-800"])} { background-color: #e2e3e7 !important; }
${sel(["bg-white/", "bg-white "])} { background-color: rgba(15,17,21,0.05) !important; }
.admin-themed.mode-light [class*="hover:bg-white/"]:hover,
.admin-themed.mode-light [class*="hover:bg-neutral-9"]:hover,
.admin-themed.mode-light [class*="hover:bg-neutral-8"]:hover { background-color: rgba(15,17,21,0.08) !important; }

/* Text */
${sel(["text-white"])} { color: #17181b !important; }
${sel(["text-neutral-100", "text-neutral-200", "text-neutral-300"])} { color: #3f3f46 !important; }
${sel(["text-neutral-400"])} { color: #52525b !important; }
${sel(["text-neutral-500", "text-neutral-600"])} { color: #71717a !important; }
.admin-themed.mode-light [class*="hover:text-white"]:hover { color: #09090b !important; }
.admin-themed.mode-light ::placeholder { color: #8a8a93 !important; }

/* Borders & dividers */
${sel(["border-white"])} { border-color: rgba(15,17,21,0.12) !important; }
${sel(["border-neutral-800", "border-neutral-900"])} { border-color: rgba(15,17,21,0.12) !important; }
${sel(["divide-white"], " > * + *")} { border-color: rgba(15,17,21,0.10) !important; }
${sel(["ring-white"])} { --tw-ring-color: rgba(15,17,21,0.12) !important; }

/* Form controls */
.admin-themed.mode-light input,
.admin-themed.mode-light textarea,
.admin-themed.mode-light select {
  background-color: #ffffff !important;
  color: #17181b !important;
  border-color: rgba(15,17,21,0.14) !important;
}
.admin-themed.mode-light option { background-color: #ffffff !important; color: #17181b !important; }

/* Overlays / effects */
.admin-themed.mode-light [class*="backdrop-blur"] { backdrop-filter: none !important; }
.admin-themed.mode-light [class*="bg-black/"] { background-color: rgba(15,17,21,0.35) !important; }
.admin-themed.mode-light [class*="shadow-"] { --tw-shadow-color: rgba(15,17,21,0.12) !important; }
`;
