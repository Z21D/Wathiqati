"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import type { DocumentWithCompany } from "@/lib/documents";
import { enrichDocument, getDocumentPersonName } from "@/lib/documents";
import {
  deleteDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentTable({ documents }: { documents: DocumentWithCompany[] }) {
  const [rows, setRows] = useState(documents);
  const [activeDocument, setActiveDocument] =
    useState<DocumentWithCompany | null>(null);
  const [modal, setModal] = useState<"view" | "edit" | "delete" | null>(null);

  useEffect(() => {
    setRows(documents);
  }, [documents]);

  function openModal(type: "view" | "edit" | "delete", document: DocumentWithCompany) {
    setActiveDocument(document);
    setModal(type);
  }

  function closeModal() {
    setModal(null);
    setActiveDocument(null);
  }

  function replaceDocument(updatedDocument: DocumentWithCompany) {
    setRows((current) =>
      current.map((document) =>
        document.id === updatedDocument.id ? updatedDocument : document
      )
    );
  }

  function removeDocument(documentId: string) {
    setRows((current) => current.filter((document) => document.id !== documentId));
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d2d2d7] bg-surface-subtle px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft">
          <FileText className="h-5 w-5 text-ink-secondary" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium text-ink">No documents yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-secondary">
          Add a document manually or import your Excel file above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-visible md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5ea] text-left text-ink-tertiary">
              <th className="pb-4 pr-5 font-medium">Employee</th>
              <th className="pb-4 pr-5 font-medium">Document</th>
              <th className="pb-4 pr-5 font-medium">Number</th>
              <th className="pb-4 pr-5 font-medium">Expiry</th>
              <th className="pb-4 pr-5 font-medium">Remaining</th>
              <th className="pb-4 pr-5 font-medium">Status</th>
              <th className="pb-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                onAction={openModal}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onAction={openModal}
          />
        ))}
      </div>

      {activeDocument && modal === "view" && (
        <ViewDocumentModal document={activeDocument} onClose={closeModal} />
      )}
      {activeDocument && modal === "edit" && (
        <EditDocumentModal
          document={activeDocument}
          onClose={closeModal}
          onSaved={replaceDocument}
        />
      )}
      {activeDocument && modal === "delete" && (
        <DeleteDocumentModal
          document={activeDocument}
          onClose={closeModal}
          onDeleted={removeDocument}
        />
      )}
    </>
  );
}

function DocumentRow({
  document,
  onAction,
}: {
  document: DocumentWithCompany;
  onAction: (type: "view" | "edit" | "delete", document: DocumentWithCompany) => void;
}) {
  const enriched = enrichDocument(document);

  return (
    <tr className="data-table-row">
      <td className="py-5 pr-5">
        <p className="font-medium text-ink">{getDocumentPersonName(document)}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-ink-tertiary">
          {document.company.name}
        </p>
      </td>
      <td className="py-5 pr-5">
        <p className="font-medium text-ink">{document.documentType}</p>
        {document.description && (
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-secondary">
            {document.description}
          </p>
        )}
      </td>
      <td className="py-5 pr-5 text-ink-secondary">{document.referenceId}</td>
      <td className="py-5 pr-5 text-ink-secondary">{formatDate(document.expiresAt)}</td>
      <td className="py-5 pr-5 font-medium text-ink">{enriched.remainingDays} days</td>
      <td className="py-5 pr-5">
        <StatusBadge status={enriched.status} />
      </td>
      <td className="relative py-5 text-right">
        <ActionsDropdown document={document} onAction={onAction} />
      </td>
    </tr>
  );
}

function DocumentCard({
  document,
  onAction,
}: {
  document: DocumentWithCompany;
  onAction: (type: "view" | "edit" | "delete", document: DocumentWithCompany) => void;
}) {
  const enriched = enrichDocument(document);

  return (
    <div className="rounded-3xl border border-[#e5e5ea] bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{document.documentType}</p>
          <p className="mt-1 truncate text-xs uppercase tracking-wide text-ink-tertiary">
            {getDocumentPersonName(document)} · #{document.referenceId}
          </p>
        </div>
        <ActionsDropdown document={document} onAction={onAction} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-surface-subtle p-3">
          <p className="text-xs text-ink-tertiary">Expiry</p>
          <p className="mt-1 font-medium text-ink">{formatDate(document.expiresAt)}</p>
        </div>
        <div className="rounded-2xl bg-surface-subtle p-3">
          <p className="text-xs text-ink-tertiary">Remaining</p>
          <p className="mt-1 font-medium text-ink">{enriched.remainingDays} days</p>
        </div>
      </div>
      <div className="mt-4">
        <StatusBadge status={enriched.status} />
      </div>
    </div>
  );
}

function ActionsDropdown({
  document,
  onAction,
}: {
  document: DocumentWithCompany;
  onAction: (type: "view" | "edit" | "delete", document: DocumentWithCompany) => void;
}) {
  const [open, setOpen] = useState(false);

  function choose(type: "view" | "edit" | "delete") {
    setOpen(false);
    onAction(type, document);
  }

  return (
    <div className="relative inline-block text-left">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Actions
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close actions menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-[#e5e5ea] bg-white p-1 shadow-float">
            <ActionItem onClick={() => choose("view")}>View details</ActionItem>
            <ActionItem onClick={() => choose("edit")}>Edit document</ActionItem>
            <ActionItem destructive onClick={() => choose("delete")}>
              Delete
            </ActionItem>
          </div>
        </>
      )}
    </div>
  );
}

function ActionItem({
  children,
  destructive = false,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
        destructive
          ? "text-accent-red hover:bg-red-50"
          : "text-ink hover:bg-surface-subtle"
      }`}
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-6 shadow-float sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-subtle px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-[#e8e8ed] hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function ViewDocumentModal({
  document,
  onClose,
}: {
  document: DocumentWithCompany;
  onClose: () => void;
}) {
  const enriched = enrichDocument(document);

  return (
    <ModalShell
      title={document.documentType}
      description="Complete document metadata"
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail label="Employee" value={getDocumentPersonName(document)} />
        <Detail label="Company" value={document.company.name} />
        <Detail label="Document name" value={document.documentType} />
        <Detail label="Document number" value={document.referenceId} />
        <Detail label="Expiry date" value={formatDate(document.expiresAt)} />
        <Detail label="Remaining days" value={`${enriched.remainingDays} days`} />
        <div className="rounded-2xl bg-surface-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-ink-tertiary">Status</p>
          <div className="mt-2">
            <StatusBadge status={enriched.status} />
          </div>
        </div>
        <Detail label="Created" value={formatDate(document.createdAt)} />
        <Detail label="Last updated" value={formatDate(document.updatedAt)} />
        <div className="rounded-2xl bg-surface-subtle p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-ink-tertiary">Notes</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink">
            {document.description || "No notes added."}
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-subtle p-4">
      <p className="text-xs uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function EditDocumentModal({
  document,
  onClose,
  onSaved,
}: {
  document: DocumentWithCompany;
  onClose: () => void;
  onSaved: (document: DocumentWithCompany) => void;
}) {
  const [pending, startTransition] = useTransition();
  const expiresAt = useMemo(() => toDateInputValue(document.expiresAt), [document.expiresAt]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateDocumentAction(document.id, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const updatedDocument: DocumentWithCompany = {
        ...document,
        company: {
          ...document.company,
          name: String(formData.get("companyName") ?? "").trim(),
        },
        employeeName: String(formData.get("employeeName") ?? "").trim() || null,
        documentType: String(formData.get("documentType") ?? "").trim(),
        referenceId: String(formData.get("referenceId") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
        expiresAt: new Date(String(formData.get("expiresAt"))),
        updatedAt: new Date(),
      };

      onSaved(updatedDocument);
      toast.success("Document updated");
      onClose();
    });
  }

  return (
    <ModalShell
      title="Edit document"
      description="Update company, document details, expiry date, and notes."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            name="companyName"
            defaultValue={document.company.name}
            required
          />
          <Input
            label="Employee name"
            name="employeeName"
            defaultValue={document.employeeName ?? ""}
            placeholder="Optional employee/person name"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Document name"
            name="documentType"
            defaultValue={document.documentType}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Document number"
            name="referenceId"
            defaultValue={document.referenceId}
            required
          />
          <Input
            label="Expiry date"
            name="expiresAt"
            type="date"
            defaultValue={expiresAt}
            required
          />
        </div>
        <Input
          label="Notes"
          name="description"
          defaultValue={document.description ?? ""}
          placeholder="Optional notes"
        />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteDocumentModal({
  document,
  onClose,
  onDeleted,
}: {
  document: DocumentWithCompany;
  onClose: () => void;
  onDeleted: (documentId: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteDocumentAction(document.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      onDeleted(document.id);
      toast.success("Document deleted");
      onClose();
    });
  }

  return (
    <ModalShell
      title="Delete document?"
      description="This action cannot be undone."
      onClose={onClose}
    >
      <div className="rounded-3xl bg-red-50 p-5 ring-1 ring-red-100">
        <p className="text-sm text-red-700">You are about to delete:</p>
        <p className="mt-1 text-lg font-semibold text-red-950">
          {document.documentType}
        </p>
        <p className="mt-1 text-sm text-red-700">
          {getDocumentPersonName(document)} · #{document.referenceId}
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={confirmDelete}
        >
          {pending ? "Deleting…" : "Delete document"}
        </Button>
      </div>
    </ModalShell>
  );
}

function toDateInputValue(date: Date | string) {
  const parsed = new Date(date);
  return parsed.toISOString().slice(0, 10);
}
