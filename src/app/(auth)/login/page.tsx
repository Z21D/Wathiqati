import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-errors";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <div className="w-full max-w-md space-y-4">
      {params.registered === "1" && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Account created successfully. Please sign in.
        </p>
      )}
      <LoginForm
        googleEnabled={googleEnabled}
        oauthError={getOAuthErrorMessage(params.error)}
      />
    </div>
  );
}
