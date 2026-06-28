export const brand = {
  name: "ExpiryGuard",
  shortName: "EG",
  tagline: "Never miss a permit expiration again.",
  description:
    "Automated workforce compliance for modern companies.",
  extendedDescription:
    "Track company document expiry dates, get alerts, and import Excel sheets in seconds.",
  logo: {
    text: "EG",
  },
  colors: {
    brand: "#0c8ce9",
    ink: "#1d1d1f",
    surface: "#f5f5f7",
  },
  favicon: "/favicon.ico",
  metadata: {
    title: "ExpiryGuard",
    template: "%s | ExpiryGuard",
  },
} as const;

export const APP_NAME = brand.name;
export const APP_DESCRIPTION = brand.extendedDescription;
