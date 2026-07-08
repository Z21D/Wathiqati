"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  retryFailedEmailAction,
  runReminderSimulationAction,
  sendSimulationEmailsAction,
  sendTestEmailAction,
  sendVerificationEmailAction,
} from "@/lib/actions/email-center";
import { Button, ButtonLink } from "@/components/ui/button";
import type { ReminderSimulationResult } from "@/lib/email/simulation";

export function EmailCenterTools() {
  const [simulation, setSimulation] = useState<ReminderSimulationResult | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  async function handleTestEmail() {
    startTransition(async () => {
      const result = await sendTestEmailAction();
      if (result.success) toast.success(result.success);
      if (result.error) toast.error(result.error);
    });
  }

  async function handleVerifyEmail() {
    startTransition(async () => {
      const result = await sendVerificationEmailAction();
      if (result.success) toast.success(result.success);
      if (result.error) toast.error(result.error);
    });
  }

  async function handleRunSimulation() {
    startTransition(async () => {
      const result = await runReminderSimulationAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSimulation(result.data as ReminderSimulationResult);
      toast.success("Reminder simulation ready.");
    });
  }

  async function handleSendSimulation() {
    if (
      !window.confirm(
        "Send simulated emails to your notification address? This will not change reminder schedules."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await sendSimulationEmailsAction();
      if (result.success) toast.success(result.success);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={handleTestEmail} disabled={pending} variant="secondary">
          Send Test Email
        </Button>
        <Button onClick={handleVerifyEmail} disabled={pending} variant="outline">
          Verify Notification Email
        </Button>
        <Button onClick={handleRunSimulation} disabled={pending} variant="outline">
          Run Reminder Simulation
        </Button>
        <ButtonLink href="/api/email-center/export" variant="outline">
          Export Email History (CSV)
        </ButtonLink>
      </div>

      {simulation && (
        <div className="rounded-3xl border border-[#e5e5ea] bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Simulation preview</p>
              <p className="text-xs text-ink-secondary">
                Recipient: {simulation.recipientEmail}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSendSimulation}
              disabled={pending}
            >
              Send simulated emails
            </Button>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <StatPill label="Expired" value={simulation.expired.length} tone="red" />
            <StatPill label="Urgent" value={simulation.urgent.length} tone="amber" />
            <StatPill
              label="Expiring soon"
              value={simulation.expiringSoon.length}
              tone="yellow"
            />
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-ink">
              Digest: {simulation.digest.template}{" "}
              {simulation.digest.wouldSend ? "(would send)" : `(skipped${simulation.digest.skipReason ? `: ${simulation.digest.skipReason}` : ""})`}
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {simulation.reminders
                .filter((item) => item.wouldSend || item.skipReason)
                .slice(0, 12)
                .map((item) => (
                  <div
                    key={item.documentId}
                    className="rounded-2xl bg-surface-subtle px-3 py-2 ring-1 ring-[#f2f2f7]"
                  >
                    <p className="font-medium text-ink">
                      {item.documentType} — {item.employeeName}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {item.wouldSend
                        ? `Would send: ${item.template}`
                        : `Skipped: ${item.skipReason}`}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "yellow";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700"
      : tone === "amber"
        ? "bg-orange-50 text-orange-700"
        : "bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-2xl px-3 py-2 text-sm font-medium ${toneClass}`}>
      {label}: {value}
    </div>
  );
}

export function RetryFailedEmailButton({ emailLogId }: { emailLogId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryFailedEmailAction(emailLogId);
          if (result.success) toast.success(result.success);
          if (result.error) toast.error(result.error);
        })
      }
    >
      Retry
    </Button>
  );
}
