import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronRight } from "lucide-react";

export type PanelNavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  /** Hidden from the mobile (app) navigation. */
  desktopOnly?: boolean;
};

export type PanelProfile = { name: string; role: string; avatarUrl?: string | null };

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Sticky top bar + full-screen app menu used on small screens in both panels. */
export function PanelMobileNav({
  title,
  items,
  profile,
  children,
}: {
  title: string;
  items: PanelNavItem[];
  profile?: PanelProfile;
  children?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const visible = items.filter((i) => !i.desktopOnly);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-neutral-300 active:scale-95 transition"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel-menu"
            initial={{ opacity: 0, x: "-8%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-12%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 || info.velocity.x < -500) setOpen(false);
            }}
            className="md:hidden fixed inset-0 z-[95] flex flex-col overflow-y-auto overscroll-contain bg-neutral-950 px-5 pb-10 pt-5"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-red-600 to-red-800 ring-1 ring-white/15">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-semibold text-white">
                      {initials(profile?.name ?? title)}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    {profile?.name ?? title}
                  </p>
                  <p className="truncate text-xs uppercase tracking-wider text-neutral-500">
                    {profile?.role ?? title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-neutral-300 active:scale-95 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {children && <div className="mb-6 space-y-3">{children}</div>}

            <nav className="space-y-2">
              {visible.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to as "/office"}
                    className={`flex min-h-[56px] items-center gap-4 rounded-2xl px-4 py-3.5 text-base transition ${
                      active
                        ? "border border-red-600/30 bg-red-600/15 text-white"
                        : "border border-white/5 bg-white/[0.02] text-neutral-300 active:bg-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
                  </Link>
                );
              })}
            </nav>

            <p className="mt-8 text-center text-[11px] text-neutral-600">
              Balayez vers la gauche pour fermer
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
