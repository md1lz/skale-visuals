import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, Globe, Moon, Phone, Plus, Sun, Video, X } from "lucide-react";

import {
  DEFAULT_AVAILABILITY,
  slotsBetween,
  weekdayIndex,
  type Availability,
} from "@/lib/bookings.shared";
import { createBooking, getBookingPublicData } from "@/lib/bookings.functions";

export const Route = createFileRoute("/bookacall")({
  head: () => ({
    meta: [
      { title: "Réserver un appel — Skale Visuals" },
      {
        name: "description",
        content:
          "Réservez un appel de consultation de 30 minutes avec Skale Visuals pour cadrer vos besoins en montage vidéo.",
      },
      { property: "og:title", content: "Réserver un appel — Skale Visuals" },
      {
        property: "og:description",
        content: "30 minutes pour cadrer vos besoins vidéo avec l'équipe Skale Visuals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookACall,
});

/* ---------------- theme (shared with the site) ---------------- */

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("skale-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("site-light", theme === "light");
    window.localStorage.setItem("skale-theme", theme);
    return () => root.classList.remove("site-light");
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

/* ---------------- date helpers ---------------- */

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function prettyDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ---------------- page ---------------- */

function BookACall() {
  const { theme, toggle } = useTheme();
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [taken, setTaken] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [step, setStep] = useState<"calendar" | "form">("calendar");
  const [done, setDone] = useState(false);

  useEffect(() => {
    getBookingPublicData()
      .then((d) => {
        setAvailability(d.availability);
        setTaken(d.taken);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="site-root relative min-h-screen overflow-hidden px-4 py-6">
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          to="/"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
        <button
          type="button"
          onClick={toggle}
          role="switch"
          aria-checked={theme === "light"}
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          className="site-glass relative flex h-10 w-[74px] cursor-pointer items-center rounded-full p-1 transition hover:scale-[1.03]"
        >
          <motion.span
            animate={{ x: theme === "dark" ? 0 : 30 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="absolute left-1 h-8 w-8 rounded-full bg-foreground/90"
          />
          <span className="relative z-10 grid h-8 w-8 place-items-center">
            <Moon className={`h-4 w-4 transition-colors ${theme === "dark" ? "text-background" : "text-foreground/60"}`} />
          </span>
          <span className="relative z-10 grid h-8 w-8 place-items-center">
            <Sun className={`h-4 w-4 transition-colors ${theme === "light" ? "text-background" : "text-foreground/60"}`} />
          </span>
        </button>
      </header>

      <main className="relative z-10 mx-auto mt-8 w-full max-w-5xl pb-16">
        <div className="relative">
          <motion.div layout transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="site-pill site-corner-glow overflow-hidden rounded-3xl">
            <div className="grid gap-0 md:grid-cols-[280px_1fr]">
              {/* left column */}
              <aside className="border-b border-foreground/10 p-6 md:border-b-0 md:border-r">
                <p className="font-kangge text-3xl text-foreground">
                  skale<span className="text-primary">.</span>
                </p>
                <h1 className="mt-6 text-lg font-medium text-foreground">
                  Appel de consultation | Skale Visuals
                </h1>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> 30 min
                  </p>
                  <AnimatePresence>
                    {date && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2 text-foreground"
                      >
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="capitalize">
                          {time ? `${time} — ` : ""}
                          {prettyDate(date)}
                        </span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Heure d'Europe Centrale (Paris)
                  </p>
                </div>
              </aside>

              {/* right column */}
              <section className="p-6">
                {done ? (
                  <Confirmed date={date!} time={time!} />
                ) : step === "calendar" ? (
                  <CalendarPane
                    availability={availability}
                    taken={taken}
                    date={date}
                    time={time}
                    onPickDate={(d) => {
                      setDate(d);
                      setTime(null);
                    }}
                    onPickTime={setTime}
                    onNext={() => setStep("form")}
                  />
                ) : (
                  <BookingForm
                    date={date!}
                    time={time!}
                    onBack={() => setStep("calendar")}
                    onDone={() => setDone(true)}
                  />
                )}
              </section>
            </div>
          </motion.div>

          {/* Calendly-style side watermark */}
          <span className="pointer-events-none absolute left-full top-1/2 hidden origin-left translate-x-3 -translate-y-1/2 rotate-90 whitespace-nowrap text-[11px] tracking-wide text-muted-foreground lg:block">
            Alimenté par <span className="font-kangge text-foreground">skale</span>
            <span className="text-primary">.</span>
          </span>
        </div>
        <p className="mt-5 text-center text-[11px] text-muted-foreground lg:hidden">
          Alimenté par <span className="font-kangge text-foreground">skale</span>
          <span className="text-primary">.</span>
        </p>
      </main>
    </div>
  );
}


/* ---------------- calendar ---------------- */

function CalendarPane({
  availability,
  taken,
  date,
  time,
  onPickDate,
  onPickTime,
  onNext,
}: {
  availability: Availability;
  taken: string[];
  date: string | null;
  time: string | null;
  onPickDate: (d: string) => void;
  onPickTime: (t: string) => void;
  onNext: () => void;
}) {
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) out.push(iso(cursor.y, cursor.m, d));
    return out;
  }, [cursor]);

  const slotsFor = (d: string) => {
    const day = availability.days[weekdayIndex(d)];
    if (!day?.enabled) return [];
    return slotsBetween(day.start, day.end).filter((t) => !taken.includes(`${d}T${t}`));
  };

  const isAvailable = (d: string) => d >= todayIso && slotsFor(d).length > 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
      <motion.div layout className="mx-auto w-full max-w-sm flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium capitalize text-foreground">
            {MONTHS[cursor.m]} {cursor.y}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Mois précédent"
              onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 }))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-foreground/20 text-sm text-foreground/70 transition hover:border-primary/60 hover:bg-foreground/10 hover:text-foreground"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Mois suivant"
              onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 }))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-foreground/20 text-sm text-foreground/70 transition hover:border-primary/60 hover:bg-foreground/10 hover:text-foreground"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((d, i) =>
            d === null ? (
              <span key={`e${i}`} />
            ) : (
              <button
                key={d}
                type="button"
                disabled={!isAvailable(d)}
                onClick={() => onPickDate(d)}
                className={`aspect-square rounded-full text-sm transition ${
                  date === d
                    ? "cursor-pointer bg-primary text-primary-foreground"
                    : isAvailable(d)
                      ? "cursor-pointer bg-foreground/5 text-foreground hover:bg-primary/20"
                      : "cursor-not-allowed text-muted-foreground/40"
                }`}
              >
                {Number(d.slice(-2))}
              </button>
            ),
          )}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Globe className="h-3.5 w-3.5" /> Heure d'Europe Centrale (Paris)
        </p>
      </motion.div>

      <AnimatePresence>
        {date && (
          <motion.div
            key="slots"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col lg:w-80 lg:shrink-0"
          >
            <p className="text-sm font-medium capitalize text-foreground">{prettyDate(date)}</p>
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {slotsFor(date).length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun créneau disponible.</p>
              )}
              {slotsFor(date).map((t) => (
                <div key={t} className="flex gap-2">
                  <motion.button
                    layout
                    type="button"
                    onClick={() => onPickTime(t)}
                    className={`flex-1 cursor-pointer rounded-xl border py-2.5 text-sm transition ${
                      time === t
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-foreground/15 text-foreground hover:border-primary/60"
                    }`}
                  >
                    {t}
                  </motion.button>
                  <AnimatePresence mode="popLayout">
                    {time === t && (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        type="button"
                        onClick={onNext}
                        className="w-32 shrink-0 cursor-pointer rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground"
                      >
                        Suivant
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

}

/* ---------------- form ---------------- */

function BookingForm({
  date,
  time,
  onBack,
  onDone,
}: {
  date: string;
  time: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [location, setLocation] = useState<"meet" | "phone">("meet");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBooking({
        data: {
          name,
          email,
          guests: guests.map((g) => g.trim()).filter(Boolean),
          slot_date: date,
          slot_time: time,
          location_type: location,
          phone: location === "phone" ? phone : null,
          notes: notes || null,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-foreground/15 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary";

  return (
    <motion.form
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={submit}
      className="space-y-4"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Modifier le créneau
      </button>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">Votre nom *</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">Votre email *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </div>

      {guests.map((g, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Email de l'invité"
            value={g}
            onChange={(e) => setGuests((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
            className={field}
          />
          <button
            type="button"
            aria-label="Retirer l'invité"
            onClick={() => setGuests((prev) => prev.filter((_, j) => j !== i))}
            className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setGuests((prev) => [...prev, ""])}
        className="flex items-center gap-1.5 text-xs text-primary transition hover:opacity-80"
      >
        <Plus className="h-3.5 w-3.5" /> Ajouter des invités
      </button>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Lieu</p>
        <button
          type="button"
          onClick={() => setLocation("meet")}
          className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
            location === "meet" ? "border-primary bg-primary/10" : "border-foreground/15"
          }`}
        >
          <Video className="mt-0.5 h-4 w-4 text-foreground" />
          <span>
            <span className="block text-sm text-foreground">Google Meet</span>
            <span className="block text-[11px] text-muted-foreground">
              Informations sur la conférence en ligne fournies à la confirmation.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setLocation("phone")}
          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
            location === "phone" ? "border-primary bg-primary/10" : "border-foreground/15"
          }`}
        >
          <Phone className="h-4 w-4 text-foreground" />
          <span className="text-sm text-foreground">Appel téléphonique</span>
        </button>
        <AnimatePresence>
          {location === "phone" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <input
                required
                type="tel"
                placeholder="Votre numéro de téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={field}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">
          Veuillez partager tout ce qui pourra être utile à la préparation de notre réunion.
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${field} resize-none`}
        />
      </div>

      {error && <p className="text-xs text-primary">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="btn-glow w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Confirmation…" : "Confirmer l'événement"}
      </button>
    </motion.form>
  );
}

function Confirmed({ date, time }: { date: string; time: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
        <CalendarDays className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-5 text-lg font-medium text-foreground">C'est confirmé !</h2>
      <p className="mt-2 text-sm capitalize text-muted-foreground">
        {time} — {prettyDate(date)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Vous recevrez les détails par email.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full border border-foreground/15 px-5 py-2.5 text-sm text-foreground transition hover:border-primary"
      >
        Retour au site
      </Link>
    </motion.div>
  );
}
