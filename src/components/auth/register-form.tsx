"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthMethodDivider,
  GoogleSignInButton,
} from "@/components/auth/google-sign-in-button";
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
  oauthError = null,
}: {
  initialEmail?: string;
  googleEnabled?: boolean;
  oauthError?: string | null;
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
      <CardContent className="space-y-4">
        {googleEnabled && (
          <>
            <GoogleSignInButton label="Sign up with Google" />
            <p className="text-center text-xs text-ink-tertiary">
              We&apos;ll create your workspace automatically after Google sign-in.
            </p>
            <AuthMethodDivider />
          </>
        )}
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
          {(oauthError || error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {oauthError ?? error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account with email"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
