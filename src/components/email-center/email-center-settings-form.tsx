"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateEmailCenterSettingsAction,
  type EmailCenterActionState,
} from "@/lib/actions/email-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: EmailCenterActionState = {};

export function EmailCenterSettingsForm({
  accountEmail,
  notificationEmail,
  emailRemindersEnabled,
  reminderSchedule,
  expiredReminderFrequency = "once",
  healthyReportFrequency = "weekly",
}: {
  accountEmail: string;
  notificationEmail?: string | null;
  emailRemindersEnabled: boolean;
  reminderSchedule: string;
  expiredReminderFrequency?: string | null;
  healthyReportFrequency?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateEmailCenterSettingsAction,
    initialState
  );

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  const selected = new Set(reminderSchedule.split(",").filter(Boolean));

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Notification email"
        name="notificationEmail"
        type="email"
        defaultValue={notificationEmail ?? ""}
        placeholder={accountEmail}
      />
      <p className="-mt-3 text-xs text-ink-secondary">
        Leave blank to use your account email: {accountEmail}
      </p>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-subtle px-4 py-3 ring-1 ring-[#f2f2f7]">
        <input
          type="checkbox"
          name="emailRemindersEnabled"
          defaultChecked={emailRemindersEnabled}
          className="h-4 w-4 rounded border-[#d2d2d7]"
        />
        <span className="text-sm font-medium text-ink">Enable email reminders</span>
      </label>

      <div className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
        <p className="mb-3 text-sm font-semibold text-ink">Daily reminder schedule</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["30", "30 days before"],
            ["14", "14 days before"],
            ["7", "7 days before"],
            ["3", "3 days before"],
            ["1", "1 day before"],
            ["expired", "After expiry"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-3 rounded-2xl bg-surface-subtle px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="reminderSchedule"
                value={value}
                defaultChecked={selected.has(value)}
                className="h-4 w-4 rounded border-[#d2d2d7]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
          <legend className="px-1 text-sm font-semibold text-ink">
            Expired reminders
          </legend>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="expiredReminderFrequency"
              value="once"
              defaultChecked={expiredReminderFrequency !== "daily"}
            />
            Send once
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="expiredReminderFrequency"
              value="daily"
              defaultChecked={expiredReminderFrequency === "daily"}
            />
            Daily until resolved
          </label>
        </fieldset>

        <fieldset className="rounded-3xl bg-white p-4 ring-1 ring-[#e5e5ea]">
          <legend className="px-1 text-sm font-semibold text-ink">
            Healthy report frequency
          </legend>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="healthyReportFrequency"
              value="weekly"
              defaultChecked={healthyReportFrequency !== "daily"}
            />
            Weekly
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="healthyReportFrequency"
              value="daily"
              defaultChecked={healthyReportFrequency === "daily"}
            />
            Daily
          </label>
        </fieldset>
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save email settings"}
      </Button>
    </form>
  );
}
