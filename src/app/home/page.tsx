import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  Plus,
  Settings2,
  Upload,
  ShieldAlert,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getDashboardCounts,
  getDocumentsForOrganization,
  getDocumentPersonName,
  getAlertsForUser,
  getRecentImports,
  getUpcomingExpiries,
} from "@/lib/documents";
import { getOrganizationForUser } from "@/lib/org";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/format";
import { UserMenu } from "@/components/navigation/user-menu";
import { brand } from "@/lib/brand";
import { AlertBell } from "@/components/dashboard/alert-bell";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomeWorkspacePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await getOrganizationForUser(session.user.id);
  if (!membership) {
    redirect("/register");
  }

  const documents = await getDocumentsForOrganization(membership.organizationId);
  const imports = await getRecentImports(membership.organizationId, 3);
  const counts = getDashboardCounts(documents);
  const alerts = await getAlertsForUser({
    organizationId: membership.organizationId,
    userId: session.user.id,
  });
  const upcoming = getUpcomingExpiries(documents, 5);
  const expiredDocuments = upcoming.filter((document) => document.status === "EXPIRED");
  const recentDocuments = [...documents]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const userName = session.user.name || "there";

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-[#e5e5ea]/80 bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between">
          <Logo href="/home" />
          <div className="flex items-center gap-3">
            <AlertBell alerts={alerts} />
            <UserMenu userName={session.user.name} userEmail={session.user.email} />
          </div>
        </div>
      </header>

      <main className="page-shell space-y-8 py-8">
        <section className="rounded-[2rem] border border-[#e5e5ea]/80 bg-white p-8 shadow-card sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-ink-tertiary">
                {membership.organization.name}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
                Welcome back, {userName}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary">
                Compliance command center for documents, expiries, and operational risk.
              </p>
            </div>
            <ButtonLink href="/dashboard/reminders" variant="outline">
              Review alerts
            </ButtonLink>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ComplianceMetric
              label="Expired Documents"
              value={counts.expired}
              description="Renewal required now"
              icon={ShieldAlert}
              tone="red"
            />
            <ComplianceMetric
              label="Urgent Documents"
              value={counts.urgent}
              description="0-7 days remaining"
              icon={AlertTriangle}
              tone="orange"
            />
            <ComplianceMetric
              label="Expiring Soon"
              value={counts.expiringSoon}
              description="8-30 days remaining"
              icon={CalendarDays}
              tone="amber"
            />
            <ComplianceMetric
              label="Total Documents"
              value={counts.total}
              description="All tracked records"
              icon={FileText}
              tone="neutral"
            />
          </div>
        </section>

        <ImmediateActions documents={expiredDocuments} />

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Quick actions
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Common workflows for keeping document compliance current.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <QuickAction
            href="/dashboard/documents"
            icon={Plus}
            title="Add Document"
            description="Create a single compliance record."
          />
          <QuickAction
            href="/dashboard/documents#import"
            icon={Upload}
            title="Import Excel"
            description="Upload sheets and merge records."
          />
          <QuickAction
            href="/dashboard/reminders"
            icon={BellRing}
            title="View Alerts"
            description="Review urgent and expired items."
          />
          <QuickAction
            href="/dashboard"
            icon={BarChart3}
            title="Open Dashboard"
            description="See metrics across all companies."
          />
          <QuickAction
            href="/dashboard/settings"
            icon={Settings2}
            title="Preferences"
            description="Manage reminders and email settings."
          />
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-5">
          <div className="space-y-8 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming expiries</CardTitle>
                <p className="mt-1 text-sm text-ink-secondary">
                  Expired documents appear first, followed by the closest upcoming expiries.
                </p>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <EmptyState message="No upcoming expiries. Add documents or import Excel to begin." />
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[#f2f2f7] bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-ink">
                            {getDocumentPersonName(document)}
                          </p>
                          <p className="mt-1 text-sm text-ink-secondary">
                            {document.documentType} · #{document.referenceId}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-right text-sm text-ink-secondary">
                            {formatDate(document.expiresAt)}
                            <br />
                            <span className="font-medium text-ink">
                              {document.remainingDays} days
                            </span>
                          </p>
                          <StatusBadge status={document.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Things to do today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {buildInsights(counts, upcoming.length, imports.length).map((insight) => (
                  <InsightItem key={insight.title} insight={insight} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SummaryRow label="Active alerts" value={alerts.length} />
                <SummaryRow label="Expired" value={counts.expired} />
                <SummaryRow label="Urgent" value={counts.urgent} />
                <SummaryRow label="Expiring soon" value={counts.expiringSoon} />
                <ButtonLink href="/dashboard/reminders" className="mt-3 w-full" variant="secondary">
                  Review alerts
                </ButtonLink>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentDocuments.length === 0 && imports.length === 0 ? (
                  <EmptyState message="Activity will appear after documents are added or imported." />
                ) : (
                  <>
                    {recentDocuments.slice(0, 3).map((document) => (
                      <ActivityItem
                        key={document.id}
                        title={getDocumentPersonName(document)}
                        description={`${document.documentType} expires ${formatDate(document.expiresAt)}`}
                      />
                    ))}
                    {imports.map((entry) => (
                      <ActivityItem
                        key={entry.id}
                        title={`${entry.imported} documents imported`}
                        description={formatDate(entry.createdAt)}
                      />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

function ComplianceMetric({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "red" | "orange" | "amber" | "neutral";
}) {
  const toneClasses = {
    red: "bg-red-50 text-red-700 ring-red-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    neutral: "bg-surface-subtle text-ink ring-[#e5e5ea]",
  }[tone];

  return (
    <div className="rounded-3xl border border-[#e5e5ea]/80 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${toneClasses}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-4xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
      </div>
      <p className="mt-5 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{description}</p>
    </div>
  );
}

function ImmediateActions({
  documents,
}: {
  documents: ReturnType<typeof getUpcomingExpiries>;
}) {
  if (documents.length === 0) {
    return (
      <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-soft">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              No expired documents.
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Your highest-priority compliance queue is clear.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-red-100 bg-red-50/80 p-6 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-700 shadow-soft ring-1 ring-red-100">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Immediate action required
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              {documents.length} expired document{documents.length === 1 ? "" : "s"} need renewal.
            </p>
          </div>
        </div>
        <ButtonLink href="/dashboard/reminders" variant="destructive">
          View all expired
        </ButtonLink>
      </div>

      <div className="mt-5 space-y-3">
        {documents.slice(0, 4).map((document) => (
          <div
            key={document.id}
            className="rounded-3xl border border-red-100 bg-white p-4 shadow-soft"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{document.company.name}</p>
                <p className="mt-1 text-base font-semibold tracking-tight text-ink">
                  {document.documentType}
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  Expired {Math.abs(document.remainingDays)} day
                  {Math.abs(document.remainingDays) === 1 ? "" : "s"} ago ·{" "}
                  {formatDate(document.expiresAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/dashboard/documents#all-documents" variant="outline" size="sm">
                  View Document
                </ButtonLink>
                <ButtonLink href="/dashboard/documents#all-documents" variant="secondary" size="sm">
                  Renew / Edit
                </ButtonLink>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col justify-between rounded-[1.75rem] border border-[#e5e5ea]/80 bg-white p-6 text-left shadow-soft transition-all duration-300 ease-apple hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10"
    >
      <span className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-ink ring-1 ring-[#e5e5ea] transition-colors duration-300 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-100">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <ArrowRight className="h-4 w-4 text-ink-tertiary transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-600" aria-hidden />
      </span>
      <span>
        <span className="block text-base font-semibold tracking-tight text-ink">
          {title}
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-ink-secondary">
          {description}
        </span>
      </span>
    </Link>
  );
}

function ActivityItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-surface-subtle px-4 py-3">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-secondary">{description}</p>
    </div>
  );
}

function InsightItem({
  insight,
}: {
  insight: { icon: LucideIcon; title: string; description: string };
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#f2f2f7] bg-surface-subtle px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-soft">
        <insight.icon className="h-4 w-4" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">
          {insight.title}
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-secondary">
          {insight.description}
        </span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d2d2d7] bg-surface-subtle px-5 py-8 text-center text-sm text-ink-secondary">
      {message}
    </div>
  );
}

function buildInsights(counts: {
  urgent: number;
  expiringSoon: number;
  total: number;
}, upcomingCount: number, importCount: number) {
  const insights = [
    counts.urgent > 0
      ? {
          icon: AlertTriangle,
          title: `${counts.urgent} document${counts.urgent === 1 ? "" : "s"} need urgent attention`,
          description: "Review expired and urgent records before they create compliance risk.",
        }
      : {
          icon: CheckCircle2,
          title: "No urgent expirations this week",
          description: "Your immediate compliance queue is clear.",
        },
    counts.expiringSoon > 0
      ? {
          icon: FileText,
          title: `${counts.expiringSoon} document${counts.expiringSoon === 1 ? "" : "s"} expire within 30 days`,
          description: "Plan renewals before they become urgent.",
        }
      : {
          icon: CalendarDays,
          title: "No documents expiring in the next 30 days",
          description: "Your upcoming calendar is in good shape.",
        },
    importCount === 0 && counts.total === 0
      ? {
          icon: Upload,
          title: "Import your Excel sheet to save time",
          description: `Start with your customer document list and let ${brand.name} organize it.`,
        }
      : {
          icon: Lightbulb,
          title: `${upcomingCount} upcoming record${upcomingCount === 1 ? "" : "s"} need attention`,
          description: "Use the dashboard to keep the highest-risk items moving.",
        },
  ];

  return insights;
}
