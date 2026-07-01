"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAccountAction } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRMATION_TEXT = "DELETE";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const canDelete = confirmation === CONFIRMATION_TEXT;

  function closeModal() {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
  }

  function confirmDelete() {
    if (!canDelete || pending) return;

    startTransition(async () => {
      const result = await deleteAccountAction(confirmation);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <section className="rounded-3xl border border-red-200/80 bg-red-50/60 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-soft ring-1 ring-red-100">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                Danger Zone
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-red-950">
                Delete account
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-800">
                Deleting your account is permanent and cannot be undone. All
                employees, documents, notifications, and organization data owned
                by you will be permanently removed.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Delete Account
          </Button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close account deletion modal"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-red-100 bg-white p-6 shadow-float sm:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2
                  id="delete-account-title"
                  className="text-xl font-semibold tracking-tight text-ink"
                >
                  Are you absolutely sure?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-red-50 p-5 ring-1 ring-red-100">
              <p className="text-sm leading-relaxed text-red-800">
                This will permanently delete your Wathiqati account and remove
                employees, documents, notifications, reminder logs, and
                organization data owned by you.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Input
                label='Type "DELETE" to confirm'
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs leading-relaxed text-ink-tertiary">
                The final delete button is disabled until the confirmation text
                exactly matches DELETE.
              </p>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canDelete || pending}
                onClick={confirmDelete}
              >
                {pending ? "Deleting account…" : "Permanently delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
