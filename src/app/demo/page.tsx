import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Demo",
};

const demoDocuments = [
  {
    employee: "Ahmed Ali",
    company: "Sample Workforce Co.",
    document: "Work Permit",
    number: "WP-1029",
    expiry: "Jun 30, 2026",
    days: 4,
    status: "URGENT",
  },
  {
    employee: "Sara Khan",
    company: "Sample Workforce Co.",
    document: "Residence Permit",
    number: "RP-8841",
    expiry: "Jul 12, 2026",
    days: 16,
    status: "EXPIRING_SOON",
  },
  {
    employee: "Maya Chen",
    company: "Sample Workforce Co.",
    document: "Health Card",
    number: "HC-4420",
    expiry: "May 18, 2026",
    days: -39,
    status: "EXPIRED",
  },
  {
    employee: "Omar Hassan",
    company: "Sample Workforce Co.",
    document: "Passport",
    number: "P-9912",
    expiry: "Dec 05, 2026",
    days: 162,
    status: "VALID",
  },
] as const;

export default function DemoPage() {
  const counts = {
    total: demoDocuments.length,
    valid: demoDocuments.filter((doc) => doc.status === "VALID").length,
    soon: demoDocuments.filter((doc) => doc.status === "EXPIRING_SOON").length,
    urgent: demoDocuments.filter((doc) => doc.status === "URGENT").length,
    expired: demoDocuments.filter((doc) => doc.status === "EXPIRED").length,
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-[#e5e5ea]/80 bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ButtonLink href="/" variant="ghost">
              Home
            </ButtonLink>
            <ButtonLink href="/register" variant="secondary">
              Create account
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="page-shell space-y-8 py-10">
        <section className="rounded-[2rem] bg-ink p-8 text-white shadow-float sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/60">
            Interactive sample
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Explore {brand.name} without registering.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            This demo uses static sample data only. No records are created and no
            emails are sent.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DemoMetric label="Total" value={counts.total} />
          <DemoMetric label="Valid" value={counts.valid} />
          <DemoMetric label="Expiring Soon" value={counts.soon} />
          <DemoMetric label="Urgent" value={counts.urgent} />
          <DemoMetric label="Expired" value={counts.expired} />
        </section>

        <section className="grid gap-8 lg:grid-cols-5">
          <div className="rounded-3xl bg-white p-6 shadow-soft lg:col-span-3">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Upcoming expiries
            </h2>
            <div className="mt-5 space-y-3">
              {demoDocuments
                .filter((doc) => doc.status !== "VALID")
                .map((doc) => (
                  <div
                    key={doc.number}
                    className="rounded-2xl border border-[#f2f2f7] bg-surface-subtle p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-ink">{doc.employee}</p>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {doc.document} · #{doc.number}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-right text-sm text-ink-secondary">
                          {doc.expiry}
                          <br />
                          <span className="font-medium text-ink">
                            {doc.days} days
                          </span>
                        </p>
                        <StatusBadge status={doc.status} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft lg:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Quick actions
            </h2>
            <div className="mt-5 grid gap-3">
              <ButtonLink href="/register" variant="secondary" className="w-full">
                Start tracking documents
              </ButtonLink>
              <ButtonLink href="/register?email=" variant="outline" className="w-full">
                Import Excel after signup
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost" className="w-full">
                Continue with Google
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DemoMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}
