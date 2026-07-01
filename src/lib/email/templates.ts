import { APP_NAME, getAppUrl } from "@/lib/email/client";

const COLORS = {
  bg: "#f5f5f7",
  card: "#ffffff",
  border: "#e5e5ea",
  ink: "#1d1d1f",
  inkSecondary: "#6e6e73",
  inkTertiary: "#86868b",
  expired: "#b42318",
  expiredBg: "#fef3f2",
  urgent: "#c4320a",
  urgentBg: "#fff4ed",
  expiring: "#b54708",
  expiringBg: "#fffaeb",
  healthy: "#067647",
  healthyBg: "#ecfdf3",
};

type EmailLayoutInput = {
  preheader: string;
  eyebrow: string;
  heading: string;
  intro: string;
  contentHtml?: string;
  cta?: { label: string; href: string };
  footerNote?: string;
};

export function emailLayout({
  preheader,
  eyebrow,
  heading,
  intro,
  contentHtml = "",
  cta,
  footerNote,
}: EmailLayoutInput): string {
  const ctaHtml = cta
    ? `<a href="${cta.href}" style="display:inline-block;background:${COLORS.ink};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:600;font-size:15px;">${cta.label}</a>`
    : "";

  const footer =
    footerNote ??
    `You are receiving this because ${APP_NAME} is monitoring document compliance for your workspace.`;

  return `
  <div style="margin:0;background:${COLORS.bg};padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
    <div style="max-width:620px;margin:0 auto;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:28px;padding:36px;box-shadow:0 12px 40px rgba(0,0,0,0.08);">
      <p style="margin:0 0 12px;color:${COLORS.inkTertiary};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">${eyebrow}</p>
      <h1 style="margin:0;color:${COLORS.ink};font-size:28px;line-height:1.2;">${heading}</h1>
      <p style="margin:16px 0 0;color:${COLORS.inkSecondary};line-height:1.6;font-size:16px;">${intro}</p>
      ${contentHtml}
      ${ctaHtml ? `<div style="margin-top:28px;">${ctaHtml}</div>` : ""}
      <p style="margin:28px 0 0;color:${COLORS.inkTertiary};font-size:12px;line-height:1.5;">${footer}</p>
    </div>
    <p style="max-width:620px;margin:16px auto 0;text-align:center;color:${COLORS.inkTertiary};font-size:12px;">${APP_NAME}</p>
  </div>`;
}

export function statRow(
  items: { label: string; value: number; tone: keyof typeof toneStyles }[]
): string {
  const cells = items
    .map(
      (item) => `
      <td style="padding:6px;" width="25%" valign="top">
        <div style="border-radius:18px;padding:16px;text-align:center;background:${toneStyles[item.tone].bg};">
          <div style="font-size:26px;font-weight:700;color:${toneStyles[item.tone].fg};line-height:1;">${item.value}</div>
          <div style="margin-top:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${COLORS.inkSecondary};">${item.label}</div>
        </div>
      </td>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;border-collapse:separate;">
      <tr>${cells}</tr>
    </table>`;
}

export const toneStyles = {
  expired: { bg: COLORS.expiredBg, fg: COLORS.expired },
  urgent: { bg: COLORS.urgentBg, fg: COLORS.urgent },
  expiring: { bg: COLORS.expiringBg, fg: COLORS.expiring },
  healthy: { bg: COLORS.healthyBg, fg: COLORS.healthy },
  neutral: { bg: COLORS.bg, fg: COLORS.ink },
} as const;

export function documentListSection(input: {
  title: string;
  tone: keyof typeof toneStyles;
  rows: {
    primary: string;
    secondary: string;
    meta: string;
  }[];
}): string {
  if (input.rows.length === 0) return "";

  const tone = toneStyles[input.tone];
  const rowsHtml = input.rows
    .map(
      (row) => `
      <div style="padding:14px 16px;border-top:1px solid ${COLORS.border};">
        <p style="margin:0;font-size:15px;font-weight:600;color:${COLORS.ink};">${row.primary}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${COLORS.inkSecondary};">${row.secondary}</p>
        <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:${tone.fg};">${row.meta}</p>
      </div>`
    )
    .join("");

  return `
    <div style="margin-top:24px;border:1px solid ${COLORS.border};border-radius:20px;overflow:hidden;">
      <div style="padding:12px 16px;background:${tone.bg};">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${tone.fg};">${input.title}</p>
      </div>
      ${rowsHtml}
    </div>`;
}

export function highlightCard(input: {
  label: string;
  primary: string;
  secondary: string;
  meta: string;
  tone: keyof typeof toneStyles;
}): string {
  const tone = toneStyles[input.tone];
  return `
    <div style="margin-top:24px;border-radius:20px;padding:20px;background:${tone.bg};border:1px solid ${COLORS.border};">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${tone.fg};">${input.label}</p>
      <p style="margin:10px 0 0;font-size:18px;font-weight:700;color:${COLORS.ink};">${input.primary}</p>
      <p style="margin:4px 0 0;font-size:14px;color:${COLORS.inkSecondary};">${input.secondary}</p>
      <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:${tone.fg};">${input.meta}</p>
    </div>`;
}

export function dashboardUrl(path = "/home"): string {
  return `${getAppUrl()}${path}`;
}
