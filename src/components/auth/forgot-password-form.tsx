"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  type PasswordResetActionState,
} from "@/lib/password-reset-constants";
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  const submitted = state.success === PASSWORD_RESET_SUCCESS_MESSAGE;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          Enter the email linked to your {brand.name} account and we&apos;ll send
          reset instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {state.success}
            </p>
            <p className="text-sm text-slate-600">
              Check your inbox and spam folder. The link expires in 1 hour.
            </p>
            <ButtonLink href="/login" variant="outline" className="w-full">
              Back to sign in
            </ButtonLink>
          </div>
        ) : (
          <>
            <form action={formAction} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
              {state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-brand-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
