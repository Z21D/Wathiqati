import { logoutAction } from "@/lib/actions/auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function DashboardSidebar({
  organizationName,
  alertCount = 0,
}: {
  organizationName: string;
  alertCount?: number;
}) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#e5e5ea]/80 bg-white/90 backdrop-blur-xl lg:flex">
        <SidebarContent organizationName={organizationName} alertCount={alertCount} />
      </aside>

      <div className="border-b border-[#e5e5ea]/80 bg-white/90 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Logo size="sm" href="/home" />
          {alertCount > 0 && (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-100">
              {alertCount} alert{alertCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-4 overflow-x-auto pb-1">
          <SidebarNav mobile />
        </div>
      </div>
    </>
  );
}

function SidebarContent({
  organizationName,
  alertCount,
}: {
  organizationName: string;
  alertCount: number;
}) {
  return (
    <>
      <div className="border-b border-[#e5e5ea]/80 p-6">
        <Logo href="/home" />
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-ink-tertiary">
          Workspace
        </p>
        <p className="mt-1 truncate text-sm font-medium text-ink">{organizationName}</p>
        {alertCount > 0 && (
          <p className="mt-4 inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-100">
            {alertCount} active alert{alertCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <SidebarNav />

      <div className="mt-auto border-t border-[#e5e5ea]/80 p-4">
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
