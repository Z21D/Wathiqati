"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateNotificationSettingsAction,
  type SettingsActionState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SettingsActionState = {};

export function NotificationSettingsForm({
  companyName,
  accountEmail,
  notificationEmail,
  emailRemindersEnabled,
  reminderSchedule,
  expiredReminderFrequency = "once",
  healthyReportFrequency = "weekly",
}: {
  companyName?: string | null;
  accountEmail: string;
  notificationEmail?: string | null;
  emailRemindersEnabled: boolean;
  reminderSchedule: string;
  expiredReminderFrequency?: string | null;
  healthyReportFrequency?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationSettingsAction,
    initialState
  );

  useEffect(() => {
    if (state.success) toast.success("Notification settings updated");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Company name"
        name="companyName"
        defaultValue={companyName ?? ""}
        placeholder="Company Name"
      />
      <Input
        label="Notification email"
        name="notificationEmail"
        type="email"
        defaultValue={notificationEmail ?? ""}
        placeholder={accountEmail}
      />
      <p className="-mt-3 text-xs leading-relaxed text-ink-secondary">
        Leave blank to send reminders to your account email:{" "}
        <span className="font-medium text-ink">{accountEmail}</span>
      </p>

      <label className="flex items-center justify-between gap-4 rounded-3xl bg-surface-subtle p-4 ring-1 ring-[#f2f2f7]">
        <span>
          <span className="block text-sm font-medium text-ink">Email reminders</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-secondary">
            Send scheduled reminders before documents expire.
          </span>
        </span>
        <input
          type="checkbox"
          name="emailRemindersEnabled"
          defaultChecked={emailRemindersEnabled}
          className="h-5 w-5 rounded border-[#d2d2d7] text-brand-600 focus:ring-brand-500"
        />
      </label>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
          Reminder schedule
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["30", "30 days"],
            ["14", "14 days"],
            ["7", "7 days"],
            ["3", "3 days"],
            ["1", "1 day"],
            ["expired", "Expired"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-2xl bg-surface-subtle px-3 py-2 text-sm text-ink-secondary"
            >
              <input
                type="checkbox"
                name="reminderSchedule"
                value={value}
                defaultChecked={reminderSchedule.split(",").includes(value)}
                className="h-4 w-4 rounded border-[#d2d2d7] text-brand-600 focus:ring-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
          Expired reminder frequency
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Choose whether expired documents send one final reminder or continue daily
          until the document is renewed.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["once", "Send once", "One email when the document first becomes expired."],
            [
              "daily",
              "Send daily until resolved",
              "One email per day while the document remains expired.",
            ],
          ].map(([value, label, description]) => (
            <label
              key={value}
              className="rounded-2xl bg-surface-subtle px-3 py-3 text-sm text-ink-secondary"
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                <input
                  type="radio"
                  name="expiredReminderFrequency"
                  value={value}
                  defaultChecked={(expiredReminderFrequency ?? "once") === value}
                  className="h-4 w-4 border-[#d2d2d7] text-brand-600 focus:ring-brand-500"
                />
                {label}
              </span>
              <span className="mt-1 block pl-6 text-xs leading-relaxed">
                {description}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
          Healthy-status reports
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          When every document is valid, we send a “good standing” summary. Choose
          how often you want to receive it.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            [
              "weekly",
              "Weekly",
              "One summary each week (Monday) when everything is compliant.",
            ],
            [
              "daily",
              "Daily",
              "A daily confirmation that nothing needs attention.",
            ],
          ].map(([value, label, description]) => (
            <label
              key={value}
              className="rounded-2xl bg-surface-subtle px-3 py-3 text-sm text-ink-secondary"
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                <input
                  type="radio"
                  name="healthyReportFrequency"
                  value={value}
                  defaultChecked={(healthyReportFrequency ?? "weekly") === value}
                  className="h-4 w-4 border-[#d2d2d7] text-brand-600 focus:ring-brand-500"
                />
                {label}
              </span>
              <span className="mt-1 block pl-6 text-xs leading-relaxed">
                {description}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save notification settings"}
      </Button>
    </form>
  );
}
