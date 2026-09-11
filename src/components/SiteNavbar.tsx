import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";

const NAV_LINKS = [
  { label: "Accueil", target: "top" },
  { label: "Services", target: "services" },
  { label: "Projets", target: "projets" },
  { label: "Process", target: "processus" },
];

export function scrollTo(target: string) {
  if (typeof window === "undefined") return;
  if (target === "top") return window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SlotMachineText({ text, active }: { text: string; active: boolean }) {
  return (
    <span className="inline-flex items-center leading-none" aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden"
          style={{ height: "1.25em", lineHeight: "1.25em" }}
        >
          <motion.span
            className="flex flex-col"
            animate={{ y: active ? "-50%" : "0%" }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              delay: i * 0.018,
            }}
          >
            <span className="block">{char === " " ? "\u00A0" : char}</span>
            <span className="block">{char === " " ? "\u00A0" : char}</span>
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function useScrollHeader() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 20) {
          setHidden(false);
        } else if (y > lastY) {
          setHidden(true);
        } else {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

function CenteredTopMenu({ onNavigate }: { onNavigate: (target: string) => void }) {
  return (
    <nav className="pointer-events-auto absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 sm:gap-8 md:flex">
      {NAV_LINKS.map((item) => (
        <button
          key={item.target}
          type="button"
          onClick={() => onNavigate(item.target)}
          className="font-codec text-sm tracking-[-0.04em] text-foreground/80 transition-colors duration-200 hover:text-foreground uppercase"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function SiteNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [skaleHover, setSkaleHover] = useState(false);
  const [studioHover, setStudioHover] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const scrollHidden = useScrollHeader();
  const headerHidden = scrollHidden && !menuOpen && !mobileNavOpen;

  const handleNav = (target: string) => {
    if (isHome) {
      scrollTo(target);
    } else {
      if (target === "top") {
        navigate({ to: "/" });
      } else {
        navigate({ to: "/", hash: target as "services" | "projets" | "processus" });
      }
    }
    setMobileNavOpen(false);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 w-full py-3 md:py-4">
      <motion.div
        animate={{ y: headerHidden ? "-120%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative mx-4 flex h-[60px] items-start justify-between rounded-2xl border border-black/[0.06] bg-white px-1 shadow-[0_14px_35px_-12px_rgba(0,0,0,0.28)] sm:mx-6 md:mx-0 md:h-auto md:w-full md:rounded-none md:border-0 md:bg-transparent md:px-6 md:shadow-none"
      >
        <motion.div
          whileHover={menuOpen ? undefined : { scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="pointer-events-auto relative h-13"
        >
          <div
            className={`absolute left-0 top-0 z-50 flex w-fit flex-col rounded-xl p-1 transition-colors duration-300 ${
              menuOpen
                ? "bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]"
                : "bg-transparent"
            }`}
          >
            <div className="flex items-center">
              <Link
                to="/"
                onMouseEnter={() => setSkaleHover(true)}
                onMouseLeave={() => setSkaleHover(false)}
                className="group flex h-11 items-center gap-2.5 rounded-lg px-2.5 transition-transform duration-300 ease-out hover:scale-[1.055]"
              >
                <motion.img
                  src={skaleSymbol.url}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-auto rounded-md object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)]"
                  animate={skaleHover ? { rotate: -18, scale: 1.12 } : { rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 10, mass: 0.85 }}
                />
                <span
                  className={`font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em] ${
                    menuOpen ? "text-slate-900" : "text-foreground"
                  }`}
                >
                  skale
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={`ml-3 h-9 w-9 rounded-lg bg-transparent hover:bg-transparent ${
                  menuOpen ? "text-slate-500 hover:text-slate-900" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <motion.span
                  animate={{ rotate: menuOpen ? 180 : 0, y: menuOpen ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 16 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="overflow-hidden pt-1 pb-2"
                >
                  <motion.button
                    type="button"
                    onClick={() => undefined}
                    onMouseEnter={() => setStudioHover(true)}
                    onMouseLeave={() => setStudioHover(false)}
                    aria-label="Skale Studio, bientôt disponible"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06, type: "spring", stiffness: 300, damping: 20 }}
                    className="group relative flex h-11 w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 text-left transition-transform duration-300 ease-out hover:scale-[1.035]"
                  >
                    <motion.img
                      src={skaleSymbol.url}
                      alt=""
                      aria-hidden="true"
                      className="h-8 w-auto rounded-md object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)]"
                      animate={studioHover ? { rotate: 14, scale: 1.12 } : { rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 10, mass: 0.85 }}
                    />
                    <span
                      className={`font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em] ${
                        menuOpen ? "text-slate-400" : "text-muted-foreground"
                      }`}
                    >
                      studio
                    </span>
                    <span className="absolute right-1.5 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-none text-primary-foreground">
                      bientôt
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <CenteredTopMenu onNavigate={handleNav} />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={mobileNavOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
          className="pointer-events-auto mr-1 mt-2 grid h-10 w-10 place-items-center rounded-xl bg-transparent text-foreground hover:bg-foreground/5 md:hidden"
        >
          <span className="flex w-5 flex-col items-end gap-1.5" aria-hidden="true">
            <motion.span
              animate={mobileNavOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
              className="block h-0.5 w-5 rounded-full bg-current"
            />
            <motion.span
              animate={mobileNavOpen ? { rotate: -45, y: -4, width: 20 } : { rotate: 0, y: 0, width: 14 }}
              className="block h-0.5 rounded-full bg-current"
            />
          </span>
        </Button>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 60 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 60 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="pointer-events-auto absolute inset-x-0 top-0 -z-10 overflow-hidden rounded-2xl border border-black/[0.06] bg-white px-2 pb-2 pt-[66px] shadow-[0_18px_45px_-14px_rgba(0,0,0,0.3)] md:hidden"
            >
              {NAV_LINKS.map((item) => (
                <Button
                  key={item.target}
                  type="button"
                  variant="ghost"
                  onClick={() => handleNav(item.target)}
                  className="font-codec-bold h-12 w-full justify-start rounded-xl px-4 text-sm uppercase text-foreground hover:bg-foreground/5"
                >
                  {item.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMobileNavOpen(false)}
                className="font-codec-bold h-12 w-full justify-start gap-2 rounded-xl px-4 text-sm uppercase text-foreground hover:bg-foreground/5"
              >
                ESPACE CLIENT
                <User className="h-4 w-4" strokeWidth={2.5} />
              </Button>
              <Button asChild className="font-codec-bold mt-1 h-12 w-full rounded-xl border-2 border-dashed border-gray-600 bg-black text-sm uppercase text-white hover:bg-black/90">
                <Link
                  to="/bookacall"
                  onMouseEnter={() => setCtaHover(true)}
                  onMouseLeave={() => setCtaHover(false)}
                  onFocus={() => setCtaHover(true)}
                  onBlur={() => setCtaHover(false)}
                >
                  <SlotMachineText text="RÉSERVER UN APPEL" active={ctaHover} />
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => undefined}
            className="font-codec-bold flex items-center gap-1.5 text-sm tracking-[-0.04em] text-foreground transition-colors duration-200 hover:text-foreground/80 uppercase"
          >
            espace client
            <User className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Link
              to="/bookacall"
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              onFocus={() => setCtaHover(true)}
              onBlur={() => setCtaHover(false)}
              className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-600 bg-black px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
            >
              <SlotMachineText text="RÉSERVER UN APPEL" active={ctaHover} />
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </header>
  );
}
