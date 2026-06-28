import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 26, 2026">
      <Section title="Overview">
        {brand.name} helps organizations track document expirations and compliance
        reminders. We collect only the information required to provide account,
        document tracking, import, and notification functionality.
      </Section>
      <Section title="Information We Process">
        We may process account details, organization information, uploaded
        spreadsheet data, document metadata, notification preferences, and email
        delivery logs.
      </Section>
      <Section title="How We Use Data">
        Data is used to authenticate users, display dashboards, calculate expiry
        alerts, import records, send configured reminders, and improve reliability
        and security.
      </Section>
      <Section title="Data Isolation">
        Document records and alerts are scoped to each organization. Users only
        access records through their authenticated organization membership.
      </Section>
      <Section title="Email Notifications">
        Reminder emails are sent to the configured notification email or the
        authenticated account email. You can disable reminders in Settings.
      </Section>
      <Section title="Contact">
        For privacy requests, contact your {brand.name} workspace administrator.
      </Section>
    </LegalPage>
  );
}

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-[#e5e5ea]/80 bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between">
          <Logo />
          <ButtonLink href="/" variant="ghost">
            Home
          </ButtonLink>
        </div>
      </header>
      <main className="page-shell py-12">
        <article className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 shadow-soft sm:p-10">
          <p className="text-sm font-medium text-brand-700">Last updated {updated}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <div className="mt-8 space-y-7">{children}</div>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 leading-relaxed text-ink-secondary">{children}</p>
    </section>
  );
}
