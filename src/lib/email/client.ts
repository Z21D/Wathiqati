export {
  APP_NAME,
  getActiveEmailProvider,
  getAppUrl,
  getEmailProviderConfigurationError,
  getFromEmail,
  isEmailProviderConfigured,
  sendEmail,
} from "@/lib/email/provider";
export type { EmailTrackingContext, EmailType } from "@/lib/email/types";
