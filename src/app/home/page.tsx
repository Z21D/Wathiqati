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
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  buildDocumentAlerts,
  countByStatus,
  getDocumentsForOrganization,
  getDocumentPersonName,
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
  const counts = countByStatus(documents);
  const alerts = buildDocumentAlerts(documents);
  const upcoming = getUpcomingExpiries(documents, 5);
  const recentDocuments = [...documents]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const userName = session.user.name || "there";

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-[#e5e5ea]/80 bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between">
          <Logo href="/home" />
          <UserMenu userName={session.user.name} userEmail={session.user.email} />
        </div>
      </header>

      <main className="page-shell space-y-8 py-8">
        <section className="rounded-[2rem] border border-white/10 bg-ink p-8 text-white shadow-float sm:p-10">
          <p className="text-sm font-medium text-white/60">
            {membership.organization.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Stay compliant. Stay ahead.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <WelcomeStat label="Urgent documents" value={counts.urgent} />
            <WelcomeStat label="Expiring this month" value={counts.expiringSoon} />
            <WelcomeStat label="Active records" value={counts.total} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        </section>

        <section className="grid gap-8 xl:grid-cols-5">
          <div className="space-y-8 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Things to do today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {buildInsights(counts, upcoming.length, imports.length).map((insight) => (
                  <div
                    key={insight.title}
                    className="flex gap-3 rounded-2xl border border-[#f2f2f7] bg-surface-subtle px-4 py-3"
                  >
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
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming expiries</CardTitle>
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
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentDocuments.length === 0 && imports.length === 0 ? (
                  <EmptyState message="Activity will appear after documents are added or imported." />
                ) : (
                  <>
                    {recentDocuments.map((document) => (
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
          </div>
        </section>
      </main>
    </div>
  );
}

function WelcomeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/60">{label}</p>
    </div>
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
      className="group flex min-h-36 flex-col justify-between rounded-3xl border border-[#e5e5ea]/80 bg-white p-5 text-left shadow-soft transition-all duration-300 ease-apple hover:-translate-y-1 hover:border-brand-200 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10"
    >
      <span className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-subtle text-ink ring-1 ring-[#e5e5ea] transition-colors duration-300 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-100">
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
          title: `${counts.urgent} permit${counts.urgent === 1 ? "" : "s"} expire this week`,
          description: "Review urgent records and prioritize renewals.",
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
          description: "Start with your customer document list and let ExpiryGuard organize it.",
        }
      : {
          icon: Lightbulb,
          title: `${upcomingCount} upcoming record${upcomingCount === 1 ? "" : "s"} need attention`,
          description: "Use the dashboard to keep the highest-risk items moving.",
        },
  ];

  return insights;
}
