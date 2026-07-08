export function getOAuthErrorMessage(error?: string | null) {
  if (!error) return null;

  switch (error) {
    case "OAuthAccountNotLinked":
      return "This email is already linked to another sign-in method. Use your email and password, or contact support.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Google sign-in failed. Please try again.";
    case "Configuration":
      return "Google sign-in is not configured correctly. Please try again later.";
    case "AccessDenied":
      return "Google sign-in was cancelled.";
    default:
      return "Something went wrong with Google sign-in. Please try again.";
  }
}
