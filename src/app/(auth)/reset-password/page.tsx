import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { validateResetToken } from "@/lib/password-reset-token";
import { getResetTokenErrorMessage } from "@/lib/password-reset";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const validation = await validateResetToken(token);

  if (!validation.valid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset link unavailable</CardTitle>
          <CardDescription>
            We couldn&apos;t use this password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {getResetTokenErrorMessage(validation.reason)}
          </p>
          <ButtonLink href="/forgot-password" className="w-full">
            Request a new reset link
          </ButtonLink>
          <p className="text-center text-sm text-slate-600">
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm token={token!} />;
}
