import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, BarChart3, BellRing, CheckCircle2, Upload } from "lucide-react";
import { brand } from "@/lib/brand";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";
import { AccountDeletedToast } from "@/components/account/account-deleted-toast";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/home");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <Suspense fallback={null}>
        <AccountDeletedToast />
      </Suspense>

      <header className="sticky top-0 z-20 border-b border-[#e5e5ea]/80 bg-white/75 backdrop-blur-xl">
        <div className="page-shell flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-3">
            <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
            <ButtonLink href="/register">Continue with Email</ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="page-shell py-20 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-medium text-brand-700 shadow-soft ring-1 ring-[#e5e5ea]">
              Smart document expiry, beautifully organized
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
              {brand.tagline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">
              {brand.description}
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-ink-secondary">
              Track work permits, residence permits, passports, certifications,
              health cards, and employee documents automatically.
            </p>
            <div className="mx-auto mt-10 max-w-2xl">
              <form
                action="/register"
                className="rounded-[2rem] border border-[#e5e5ea]/80 bg-white p-2 shadow-card transition-all duration-300 ease-apple hover:shadow-float sm:flex sm:items-center"
              >
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Work email address"
                  className="h-14 min-w-0 flex-1 rounded-[1.5rem] px-5 text-base text-ink outline-none placeholder:text-ink-tertiary"
                />
                <button
                  type="submit"
                  className="mt-2 h-12 w-full rounded-[1.5rem] bg-ink px-6 text-sm font-semibold text-white transition-all duration-300 ease-apple hover:bg-[#333336] active:scale-[0.98] sm:mt-0 sm:w-auto"
                >
                  Get Started Free
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
                {[
                  "No credit card required",
                  "Setup in minutes",
                  "Import from Excel instantly",
                  "Smart reminders included",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/register" variant="outline">
                  Continue with Email
                </ButtonLink>
                <ButtonLink href="/demo" variant="outline">
                  View Demo
                </ButtonLink>
                <ButtonLink href="/login" variant="ghost">
                  Continue with Google
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Expiry dashboard",
                description: "See valid, urgent, expiring, and expired documents at a glance.",
                icon: BarChart3,
                href: "/dashboard",
                cta: "View Dashboard",
              },
              {
                title: "Excel import",
                description: "Upload your existing expiry sheet and merge records automatically.",
                icon: Upload,
                href: "/dashboard/documents#import",
                cta: "Import Spreadsheet",
              },
              {
                title: "Smart alerts",
                description: "In-app alerts now. Email reminders ready with Resend and Vercel Cron.",
                icon: BellRing,
                href: "/dashboard/reminders",
                cta: "View Alerts",
              },
            ].map((feature) => (
              <Link
                key={feature.title}
                href={session?.user ? feature.href : "/register"}
                className="group rounded-3xl border border-[#e5e5ea]/80 bg-white p-8 shadow-soft transition-all duration-300 ease-apple hover:-translate-y-1 hover:border-brand-200 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-ink ring-1 ring-[#e5e5ea] transition-colors duration-300 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-100">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {feature.description}
                </p>
                <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  {feature.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-apple group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e5ea]/80 py-8 text-center text-sm text-ink-tertiary">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
