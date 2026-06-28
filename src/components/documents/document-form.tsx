"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  createDocumentAction,
  type DocumentActionState,
} from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: DocumentActionState = {};

export function DocumentForm() {
  const [state, formAction, pending] = useActionState(
    createDocumentAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Document saved");
      formRef.current?.reset();
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add document</CardTitle>
        <p className="text-sm text-ink-secondary">
          Track a company document with an expiry date. Status updates automatically.
        </p>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Company name" name="companyName" placeholder="Company Name" required />
            <Input label="Employee name" name="employeeName" placeholder="Employee Name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Document name" name="documentType" placeholder="CR, License, Computer Card" required />
            <Input label="Document number" name="referenceId" placeholder="11111" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Expiry date" name="expiresAt" type="date" required />
            <Input label="Notes" name="description" placeholder="Optional notes" />
          </div>
          <Button type="submit" disabled={pending} variant="secondary">
            {pending ? "Saving…" : "Save document"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
