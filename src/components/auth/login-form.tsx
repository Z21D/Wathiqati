"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
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

const initialState: AuthActionState = {};

export function LoginForm({
  googleEnabled = false,
  oauthError = null,
}: {
  googleEnabled?: boolean;
  oauthError?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your {brand.name} account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleEnabled && (
          <>
            <GoogleSignInButton />
            <p className="text-center text-xs text-ink-tertiary">
              Sign in with Google — no password required.
            </p>
            <AuthMethodDivider />
          </>
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
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {(oauthError || state.error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {oauthError ?? state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in with email"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
