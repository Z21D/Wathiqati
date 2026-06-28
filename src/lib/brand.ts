export const brand = {
  name: "Wathiqati",
  arabicName: "وثيقتي",
  meaning: "My Document",
  shortName: "WQ",
  tagline: "Never miss a document expiry again.",
  description:
    "Smart workforce compliance and document expiry reminders for modern companies.",
  extendedDescription:
    "Smart workforce compliance and document expiry reminders for modern companies.",
  logo: {
    text: "WQ",
  },
  colors: {
    brand: "#0c8ce9",
    ink: "#1d1d1f",
    surface: "#f5f5f7",
  },
  favicon: "/favicon.svg",
  metadata: {
    title: "Wathiqati",
    template: "%s | Wathiqati",
  },
} as const;

export const APP_NAME = brand.name;
export const APP_DESCRIPTION = brand.extendedDescription;
