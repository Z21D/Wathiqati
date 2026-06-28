"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  googleSignInAction,
  loginAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your ExpiryGuard account</CardDescription>
      </CardHeader>
      <CardContent>
        {googleEnabled && (
          <form action={googleSignInAction} className="mb-4">
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
        )}
        {googleEnabled && (
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e5e5ea]" />
            <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
              Continue with email
            </span>
            <div className="h-px flex-1 bg-[#e5e5ea]" />
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
