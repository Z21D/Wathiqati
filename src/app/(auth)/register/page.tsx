import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-errors";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <RegisterForm
      initialEmail={params.email ?? ""}
      googleEnabled={googleEnabled}
      oauthError={getOAuthErrorMessage(params.error)}
    />
  );
}
