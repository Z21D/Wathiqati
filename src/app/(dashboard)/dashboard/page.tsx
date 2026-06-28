import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight, BellRing, Plus, Upload } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizationForUser } from "@/lib/org";
import {
  buildDocumentAlerts,
  countByStatus,
  getDocumentsForOrganization,
  getDocumentPersonName,
  getRecentImports,
  getTopPriorityCounts,
  getUpcomingExpiries,
  type DocumentWithCompany,
} from "@/lib/documents";
import { DashboardHeader } from "@/components/dashboard/header";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DocumentTable } from "@/components/documents/document-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  const membership = await getOrganizationForUser(session!.user.id);

  const documents = membership
    ? await getDocumentsForOrganization(membership.organizationId)
    : [];

  const recentImports = membership
    ? await getRecentImports(membership.organizationId)
    : [];

  const counts = countByStatus(documents);
  const alerts = buildDocumentAlerts(documents);
  const priorityCounts = getTopPriorityCounts(alerts);
  const upcoming = getUpcomingExpiries(documents, 8);
  const upcomingGroups = groupUpcomingByPerson(upcoming);
  const recentDocuments = documents.slice(0, 5);

  return (
    <>
      <DashboardHeader
        title="Overview"
        description={`Welcome back${session?.user.name ? `, ${session.user.name}` : ""}. Monitor document expiry across all companies.`}
        userName={session?.user.name}
      />

      <div className="flex-1 space-y-8 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Total documents" value={counts.total} description="All tracked documents" tone="neutral" />
          <MetricCard title="Valid" value={counts.valid} description="More than 30 days remaining" tone="success" />
          <MetricCard title="Expiring soon" value={counts.expiringSoon} description="Within 30 days" tone="warning" />
          <MetricCard title="Urgent" value={counts.urgent} description="Within 7 days" tone="danger" />
          <MetricCard title="Expired" value={counts.expired} description="Renewal required now" tone="danger" />
        </div>

        <div className="grid gap-8 xl:grid-cols-5">
          <div className="space-y-8 xl:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming expiries</CardTitle>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Next documents approaching their expiry dates
                  </p>
                </div>
                <ButtonLink href="/dashboard/documents" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <EmptyBlock message="No upcoming expiries yet." />
                ) : (
                  <div className="space-y-5">
                    {upcomingGroups.map((group) => (
                      <div key={group.personName} className="space-y-3">
                        <div>
                          <p className="font-semibold text-ink">{group.personName}</p>
                          <p className="text-xs uppercase tracking-wide text-ink-tertiary">
                            {group.items[0]?.company.name}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {group.items.map((document) => (
                            <div
                              key={document.id}
                              className="flex flex-col gap-3 rounded-2xl border border-[#f2f2f7] bg-surface-subtle/70 p-4 transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium text-ink">
                                  {document.documentType}
                                </p>
                                <p className="mt-1 text-sm text-ink-secondary">
                                  #{document.referenceId}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-ink">
                                    {formatDate(document.expiresAt)}
                                  </p>
                                  <p className="text-xs text-ink-tertiary">
                                    {document.remainingDays} days left
                                  </p>
                                </div>
                                <StatusBadge status={document.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <AlertsPanel alerts={alerts} compact />
          </div>

          <div className="space-y-8 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Top priority alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-5 rounded-3xl bg-ink p-5 text-white">
                  <p className="text-sm text-white/70">Total priority items</p>
                  <p className="mt-2 text-4xl font-semibold">{priorityCounts.total}</p>
                </div>
                <div className="space-y-2">
                  <PriorityRow label="Expired" value={priorityCounts.expired} />
                  <PriorityRow label="Expiring in 1 day" value={priorityCounts.oneDay} />
                  <PriorityRow label="Expiring in 3 days" value={priorityCounts.threeDays} />
                  <PriorityRow label="Expiring in 7 days" value={priorityCounts.sevenDays} />
                  <PriorityRow label="Expiring in 14 days" value={priorityCounts.fourteenDays} />
                </div>
                <ButtonLink
                  href="/dashboard/reminders"
                  className="mt-5 w-full"
                  variant="secondary"
                >
                  Open Alert Center
                </ButtonLink>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <ActionCard href="/dashboard/documents" icon={Plus} title="Add Document" description="Create a new record manually." />
                <ActionCard href="/dashboard/documents#import" icon={Upload} title="Import Excel" description="Upload and merge spreadsheet records." />
                <ActionCard href="/dashboard/reminders" icon={BellRing} title="View Alerts" description="Review compliance risks now." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent imports</CardTitle>
              </CardHeader>
              <CardContent>
                {recentImports.length === 0 ? (
                  <EmptyBlock message="No imports yet. Upload your Excel sheet to get started." />
                ) : (
                  <ul className="space-y-3">
                    {recentImports.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-[#f2f2f7] bg-surface-subtle/70 p-4"
                      >
                        <p className="font-medium text-ink">
                          {entry.fileName ?? "Excel import"}
                        </p>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {entry.imported} rows · {entry.created} created · {entry.updated} updated
                        </p>
                        <p className="mt-2 text-xs text-ink-tertiary">
                          {formatDate(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent documents</CardTitle>
            <ButtonLink href="/dashboard/documents" variant="ghost" size="sm">
              View all
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <EmptyBlock message="No documents yet. Add manually or import Excel." actionHref="/dashboard/documents" actionLabel="Go to documents" />
            ) : (
              <DocumentTable documents={recentDocuments} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PriorityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-3xl border border-[#e5e5ea]/80 bg-white p-5 text-left shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-ink ring-1 ring-[#e5e5ea] transition-colors duration-300 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-100">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm font-normal leading-relaxed text-ink-secondary">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-tertiary transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}

function groupUpcomingByPerson(documents: ReturnType<typeof getUpcomingExpiries>) {
  const groups = new Map<string, typeof documents>();

  for (const document of documents) {
    const personName = getDocumentPersonName(document as DocumentWithCompany);
    const current = groups.get(personName) ?? [];
    groups.set(personName, [...current, document]);
  }

  return Array.from(groups.entries()).map(([personName, items]) => ({
    personName,
    items,
  }));
}

function EmptyBlock({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d2d2d7] bg-surface-subtle px-6 py-10 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      {actionHref && actionLabel && (
        <div className="mt-4">
          <ButtonLink href={actionHref} size="sm" variant="secondary">
            {actionLabel}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
