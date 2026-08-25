export type AboutFounder = {
  name: string;
  role: string;
  bio: string;
  photo: string | null;
};

export type AboutValue = { emoji: string; title: string; text: string };

export type AboutContent = {
  introTitle: string;
  introText: string;
  founders: [AboutFounder, AboutFounder];
  storyTitle: string;
  storyText: string;
  visionTitle: string;
  visionText: string;
  valuesTitle: string;
  values: AboutValue[];
  teamTitle: string;
  teamText: string;
  ctaTitle: string;
  ctaButton: string;
};

export const DEFAULT_ABOUT: AboutContent = {
  introTitle: "L'équipe derrière vos vidéos.",
  introText:
    "Skale Visuals, c'est deux fondateurs, une équipe de 10 monteurs, et une obsession commune : faire performer chaque vidéo qu'on touche.",
  founders: [
    {
      name: "Madi Harrois",
      role: "Fondateur et CEO, Directeur de production",
      bio: "J'ai toujours eu cette soif d'entreprendre, depuis l'enfance. Avant de fonder Skale Visuals, je suis passé par plusieurs petits business — du reselling de sneakers à d'autres projets à droite et à gauche. Cette période m'a appris à repérer les tendances, à comprendre ce qui capte l'attention, et surtout à ne jamais attendre le moment \"idéal\" pour se lancer.\n\nC'est ce qui m'a poussé à fonder Skale Visuals à 18 ans, avec une conviction : la création digitale peut devenir le canal d'acquisition numéro 1 pour un business, à condition de savoir capter l'attention et construire une vraie crédibilité.",
      photo: null,
    },
    {
      name: "Lorenzo Di Dio",
      role: "Fondateur et CEO, Directeur commercial",
      bio: "J'ai rencontré Madi Harrois au lycée. On s'est vite rendu compte qu'on avait la même dalle, la même envie d'entreprendre et de construire quelque chose de concret. Naturellement, après le lycée, on s'est associés pour fonder Skale Visuals en étant à peine majeur.\n\nAujourd'hui, on accompagne plus de 50 clients à transformer leur contenu vidéo en véritable levier de croissance — short form, long form et motion design — avec une obsession commune : livrer un travail rapide, stratégique, et qui convertit.",
      photo: null,
    },
  ],
  storyTitle: "Comment Skale est né.",
  storyText:
    "Skale est né d'un constat simple : trop de créateurs et d'entreprises perdent un temps fou à gérer leur montage, à courir après des freelances et à corriger des vidéos qui ne performent pas. On a voulu créer autre chose — une vraie équipe, une vraie stratégie, une vraie fiabilité. C'est ça, Skale.",
  visionTitle: "Notre vision.",
  visionText:
    "On ne veut pas juste monter des vidéos. On veut devenir le partenaire vidéo de référence pour les créateurs et les marques qui cherchent à scaler. Chaque vidéo qu'on livre est pensée pour performer — pas pour être belle, mais pour être efficace.",
  valuesTitle: "Ce qui nous drive.",
  values: [
    { emoji: "⚡", title: "Rapidité", text: "48h, c'est notre engagement. Pas une exception." },
    { emoji: "🎯", title: "Performance", text: "Chaque coupe est une décision stratégique." },
    { emoji: "🤝", title: "Transparence", text: "On communique directement, sans intermédiaire." },
  ],
  teamTitle: "Une équipe de 10 monteurs.",
  teamText:
    "Derrière Skale, il y a une équipe de 10 monteurs professionnels, chacun spécialisé dans son format. Shorts, VSL, ads, podcasts, vlogs — chaque vidéo est confiée au bon expert.",
  ctaTitle: "Prêt à déléguer votre montage ?",
  ctaButton: "Réserver un appel",
};

function str(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.trim() ? s : fallback;
}

export function normalizeAbout(raw: unknown): AboutContent {
  const v = (raw ?? {}) as Partial<AboutContent>;
  const founders = Array.isArray(v.founders) ? v.founders : [];
  const founder = (i: 0 | 1): AboutFounder => {
    const f = (founders[i] ?? {}) as Partial<AboutFounder>;
    const d = DEFAULT_ABOUT.founders[i];
    return {
      name: str(f.name, d.name),
      role: str(f.role, d.role),
      bio: str(f.bio, d.bio),
      photo: typeof f.photo === "string" && f.photo ? f.photo : null,
    };
  };
  const rawValues = Array.isArray(v.values) ? v.values : [];
  return {
    introTitle: str(v.introTitle, DEFAULT_ABOUT.introTitle),
    introText: str(v.introText, DEFAULT_ABOUT.introText),
    founders: [founder(0), founder(1)],
    storyTitle: str(v.storyTitle, DEFAULT_ABOUT.storyTitle),
    storyText: str(v.storyText, DEFAULT_ABOUT.storyText),
    visionTitle: str(v.visionTitle, DEFAULT_ABOUT.visionTitle),
    visionText: str(v.visionText, DEFAULT_ABOUT.visionText),
    valuesTitle: str(v.valuesTitle, DEFAULT_ABOUT.valuesTitle),
    values: DEFAULT_ABOUT.values.map((d, i) => {
      const x = (rawValues[i] ?? {}) as Partial<AboutValue>;
      return {
        emoji: str(x.emoji, d.emoji),
        title: str(x.title, d.title),
        text: str(x.text, d.text),
      };
    }),
    teamTitle: str(v.teamTitle, DEFAULT_ABOUT.teamTitle),
    teamText: str(v.teamText, DEFAULT_ABOUT.teamText),
    ctaTitle: str(v.ctaTitle, DEFAULT_ABOUT.ctaTitle),
    ctaButton: str(v.ctaButton, DEFAULT_ABOUT.ctaButton),
  };
}
