import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AdminTheme = "red" | "violet" | "blue" | "green" | "yellow" | "gray";

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
];

type ThemeShades = { c400: string; c500: string; c600: string; c800: string };

type Ctx = {
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
  background: string | null;
  setBackground: (b: string | null) => void;
};

const AdminPrefsCtx = createContext<Ctx | null>(null);

const THEME_KEY = "skale.admin.theme";
const BG_KEY = "skale.admin.bg";

export function AdminPrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("red");
  const [background, setBackgroundState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as AdminTheme | null;
      if (t) setThemeState(t);
      const b = localStorage.getItem(BG_KEY);
      if (b) setBackgroundState(b);
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

  const value = useMemo(() => ({ theme, setTheme, background, setBackground }), [theme, background]);

  return <AdminPrefsCtx.Provider value={value}>{children}</AdminPrefsCtx.Provider>;
}

export function useAdminPrefs() {
  const ctx = useContext(AdminPrefsCtx);
  if (!ctx) throw new Error("useAdminPrefs outside provider");
  return ctx;
}

export function ThemeStyleInjector() {
  const { theme } = useAdminPrefs();
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
`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
