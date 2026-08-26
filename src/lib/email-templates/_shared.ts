export const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "0",
} as const;

export const container = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 28px",
} as const;

/** Wordmark rendered in the brand font (Kangge), hosted on the site. */
export const LOGO_URL = "https://skalevisuals.com/email/skale-logo.png";

export const logo = {
  display: "block",
  width: "118px",
  height: "auto",
  margin: "0 0 32px",
} as const;

export const CONTACT_LINE =
  "Une question ? Écrivez-nous à contact@skalevisuals.com en décrivant votre situation, ou envoyez-nous un DM Instagram @skalevisuals.";

export const heading = {
  fontSize: "28px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "#0a0a0a",
  margin: "0 0 20px",
} as const;

export const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 16px",
} as const;

export const detail = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#0a0a0a",
  fontWeight: 600,
  margin: "0",
} as const;

export const detailBox = {
  backgroundColor: "#fafafa",
  borderRadius: "14px",
  padding: "18px 20px",
  margin: "0 0 24px",
} as const;

export const button = {
  display: "inline-block",
  backgroundColor: "#e11d48",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  borderRadius: "999px",
  padding: "13px 26px",
  textDecoration: "none",
} as const;

export const hr = { borderColor: "#ececec", margin: "32px 0 18px" } as const;

export const footer = { fontSize: "12px", color: "#a1a1aa", margin: "0" } as const;

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** "lundi 8 septembre" from an ISO date string, without relying on ICU data. */
export function formatFrDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function firstName(fullName?: string): string {
  return (fullName ?? "").trim().split(/\s+/)[0] || "";
}
