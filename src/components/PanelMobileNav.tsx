import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export type PanelNavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean };

/** Sticky top bar + slide-in drawer used on small screens in both panels. */
export function PanelMobileNav({
  title,
  items,
  children,
}: {
  title: string;
  items: PanelNavItem[];
  children?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-neutral-300 active:scale-95 transition"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
        <p className="text-sm font-semibold">{title}</p>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="md:hidden fixed inset-y-0 left-0 z-[95] w-[82%] max-w-xs overflow-y-auto border-r border-white/10 bg-neutral-950 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">{title}</p>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {children && <div className="mb-4 space-y-3">{children}</div>}

              <nav className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to as "/crm/admin"}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                        active
                          ? "border border-red-600/30 bg-red-600/15 text-white"
                          : "border border-transparent text-neutral-400 active:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
