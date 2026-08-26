export type CompareRow = {
  criterion: string;
  other: string;
  skaleTitle: string;
  skaleText: string;
};

export type CompareContent = {
  badge: string;
  title: string;
  subtitle: string;
  otherLabel: string;
  skaleLabel: string;
  rows: CompareRow[];
};

export const DEFAULT_COMPARE: CompareContent = {
  badge: "Comparatif 100% transparent",
  title: "Skale VS les monteurs freelance (ou agences)",
  subtitle:
    "Découvrez point par point ce qui fait vraiment la différence quand il s'agit de déléguer proprement pour que ça ne cause pas de problème lors du scaling !",
  otherLabel: "Freelance / Agence classique",
  skaleLabel: "skale.",
  rows: [
    {
      criterion: "Objectif",
      other: "Monter vos vidéos, point.",
      skaleTitle: "Faire performer chaque vidéo",
      skaleText: "Watchtime, conversion, algorithme — pensé à chaque coupe.",
    },
    {
      criterion: "Délais",
      other: "Variables, peu fiables, ghostent parfois...",
      skaleTitle: "24-48h formats courts, 3-4j formats longs",
      skaleText: "Des délais tenus, sans exception.",
    },
    {
      criterion: "Stratégie",
      other: "Aucune. Ils montent, vous vous débrouillez avec le reste.",
      skaleTitle: "Incluse dans chaque projet",
      skaleText: "Format, rythme, accroche — tout est pensé pour scaler.",
    },
    {
      criterion: "Révisions",
      other: "Limitées, parfois facturées en plus.",
      skaleTitle: "Illimitées",
      skaleText: "Via plateforme dédiée avec commentaires à la minute.",
    },
    {
      criterion: "Scalabilité",
      other: "Bloqué au volume d'un seul monteur.",
      skaleTitle: "+10 monteurs mobilisables",
      skaleText: "Votre volume augmente, on s'adapte.",
    },
    {
      criterion: "Communication",
      other: "Un freelance qui ghost, une agence injoignable.",
      skaleTitle: "Manager dédié sur WhatsApp",
      skaleText: "Une vraie équipe disponible, pas un ticket support.",
    },
    {
      criterion: "Suivi",
      other: "Débrouillez-vous — pas de visibilité sur l'avancement.",
      skaleTitle: "Dashboard temps réel",
      skaleText: "Vous voyez où en est chaque vidéo, à tout moment.",
    },
  ],
};

function str(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.trim() ? s : fallback;
}

export function normalizeCompare(raw: unknown): CompareContent {
  const v = (raw ?? {}) as Partial<CompareContent>;
  const rows = Array.isArray(v.rows) ? v.rows : null;
  return {
    badge: str(v.badge, DEFAULT_COMPARE.badge),
    title: str(v.title, DEFAULT_COMPARE.title),
    subtitle: str(v.subtitle, DEFAULT_COMPARE.subtitle),
    otherLabel: str(v.otherLabel, DEFAULT_COMPARE.otherLabel),
    skaleLabel: str(v.skaleLabel, DEFAULT_COMPARE.skaleLabel),
    rows: rows
      ? rows.slice(0, 30).map((r) => {
          const x = (r ?? {}) as Partial<CompareRow>;
          return {
            criterion: typeof x.criterion === "string" ? x.criterion : "",
            other: typeof x.other === "string" ? x.other : "",
            skaleTitle: typeof x.skaleTitle === "string" ? x.skaleTitle : "",
            skaleText: typeof x.skaleText === "string" ? x.skaleText : "",
          };
        })
      : DEFAULT_COMPARE.rows,
  };
}
