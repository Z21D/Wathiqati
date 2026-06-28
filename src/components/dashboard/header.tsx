import { auth } from "@/lib/auth";
import { AlertBell } from "@/components/dashboard/alert-bell";
import { getAlertsForUser } from "@/lib/documents";
import { getOrganizationForUser } from "@/lib/org";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  userName?: string | null;
}

export async function DashboardHeader({
  title,
  description,
  userName,
}: DashboardHeaderProps) {
  const session = await auth();
  const membership = session?.user?.id
    ? await getOrganizationForUser(session.user.id)
    : null;
  const alerts =
    session?.user?.id && membership
      ? await getAlertsForUser({
          organizationId: membership.organizationId,
          userId: session.user.id,
        })
      : [];

  return (
    <div className="border-b border-[#e5e5ea]/80 bg-white/70 px-4 py-6 backdrop-blur-xl sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 self-start">
          <AlertBell alerts={alerts} />
          {userName && (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-surface-subtle px-4 py-2.5 ring-1 ring-[#e5e5ea]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink shadow-soft">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-tertiary">Signed in</p>
                <p className="text-sm font-medium text-ink">{userName}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
