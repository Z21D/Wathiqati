"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { googleSignInAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/lib/brand";

export function RegisterForm({
  initialEmail = "",
  googleEnabled = false,
}: {
  initialEmail?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      organizationName: formData.get("organizationName"),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start managing document expiry with {brand.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {googleEnabled && (
          <form action={googleSignInAction} className="mb-4">
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
        )}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e5ea]" />
          <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
            Continue with email
          </span>
          <div className="h-px flex-1 bg-[#e5e5ea]" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            name="name"
            placeholder="Jane Smith"
            required
            autoComplete="name"
          />
          <Input
            label="Work email"
            name="email"
            type="email"
            placeholder="company@example.com"
            defaultValue={initialEmail}
            required
            autoComplete="email"
          />
          <Input
            label="Organization name"
            name="organizationName"
            placeholder="Company Name"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            required
            autoComplete="new-password"
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
