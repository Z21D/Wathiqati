"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/password-reset";
import type { PasswordResetActionState } from "@/lib/password-reset-constants";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/lib/brand";

const initialState: PasswordResetActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState
  );

  if (state.success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Your {brand.name} password has been changed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.success}
          </p>
          <ButtonLink href="/login" className="w-full">
            Sign in
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Use at least 8 characters with one uppercase letter and one number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <Input
            label="New password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Need a new link?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-brand-600 hover:underline"
          >
            Request another reset
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
