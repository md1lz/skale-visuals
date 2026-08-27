import { motion } from "framer-motion";

/** Rubrique préparée mais pas encore implémentée (phase 1). */
export function OfficePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-neutral-400">{description}</p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 grid place-items-center rounded-3xl border border-white/[0.07] bg-white/[0.02] px-6 py-20 text-center backdrop-blur"
      >
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-400">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-sm text-neutral-300">Bientôt disponible</p>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          Cette rubrique est en cours de préparation et sera activée prochainement.
        </p>
      </motion.div>
    </div>
  );
}
