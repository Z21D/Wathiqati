import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-surface-muted">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(12,140,233,0.08),_transparent_42%)]" />
      <header className="relative border-b border-[#e5e5ea]/80 bg-white/75 px-6 py-4 backdrop-blur-xl">
        <Logo />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
