export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "If an account exists, we've sent a password reset email.";

export type PasswordResetActionState = {
  error?: string;
  success?: string;
};
