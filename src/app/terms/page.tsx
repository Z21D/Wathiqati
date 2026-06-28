import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
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
          <p className="text-sm font-medium text-brand-700">
            Last updated June 26, 2026
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
            Terms of Service
          </h1>
          <div className="mt-8 space-y-7">
            <Section title="Use of Service">
              ExpiryGuard provides document expiry tracking, import, alert, and
              reminder tools. You are responsible for the accuracy of uploaded
              data and for reviewing reminders before taking compliance action.
            </Section>
            <Section title="Accounts">
              You must keep account credentials secure and ensure only authorized
              users access your organization workspace.
            </Section>
            <Section title="Notifications">
              Reminder emails are provided as an operational aid and should not be
              the only source of compliance review. Delivery may depend on
              third-party email providers and configuration.
            </Section>
            <Section title="Data">
              You retain responsibility for the document and employee information
              uploaded to the service. Do not upload data you are not authorized
              to process.
            </Section>
            <Section title="Availability">
              We aim to keep the service reliable, but uptime and delivery of
              notifications are not guaranteed unless covered by a separate
              written agreement.
            </Section>
          </div>
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
