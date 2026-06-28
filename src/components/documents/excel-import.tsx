"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewResult = {
  totalRows: number;
  newRows: number;
  duplicates: number;
  skipped: number;
  warnings: string[];
  duplicateSamples: {
    companyName: string;
    documentType: string;
    referenceId: string;
  }[];
};

type ImportResult = {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  skippedDuplicates?: number;
  warnings: string[];
};

type ImportStep = "idle" | "reading" | "checking" | "confirming" | "importing" | "complete";

export function ExcelImport() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<ImportStep>("idle");
  const [hideImport, setHideImport] = useState(false);
  const [activeAction, setActiveAction] = useState<"new-only" | "import" | null>(
    null
  );
  const progressTimer = useRef<number | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = selectedFile;

    if (!(file instanceof File) || file.size === 0) {
      toast.error("Please choose an Excel file to import.");
      return;
    }

    try {
      setPending(true);
      setResult(null);
      setPreview(null);
      setHideImport(false);
      setStep("checking");
      startProgress(12, 35);

      const previewData = await requestImport<PreviewResult>(file, "preview");

      setProgress(55);

      if (previewData.duplicates > 0) {
        setPreview(previewData);
        setStep("confirming");
        stopProgress();
        setPending(false);
        return;
      }

      await importFile(file);
    } catch {
      toast.error("Something went wrong during import.");
      resetProgress();
    } finally {
      setPending(false);
    }
  }

  async function importFile(file: File, mode: "import" | "new-only" = "import") {
    try {
      setPending(true);
      setActiveAction(mode);
      setPreview(null);
      setHideImport(false);
      setStep("importing");
      startProgress(Math.max(progress, 60), 92);

      const importResult = await requestImport<ImportResult>(file, mode);

      stopProgress();
      setProgress(100);
      setStep("complete");
      setResult(importResult);
      setSelectedFile(null);
      setHideImport(false);
      router.refresh();
      toast.success(`Imported ${importResult.imported} documents`);
    } catch {
      toast.error("Import failed. Please try again.");
      resetProgress();
    } finally {
      setPending(false);
      setActiveAction(null);
    }
  }

  function startProgress(from: number, target: number) {
    stopProgress();
    setProgress(from);
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= target) return current;
        const next = current + Math.max(1, Math.round((target - current) / 8));
        return Math.min(next, target);
      });
    }, 350);
  }

  function stopProgress() {
    if (progressTimer.current !== null) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  function resetProgress() {
    stopProgress();
    setProgress(0);
    setStep("idle");
    setPending(false);
    setHideImport(false);
    setActiveAction(null);
  }

  function closeResult() {
    setResult(null);
    setProgress(0);
    setStep("idle");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Excel</CardTitle>
        <p className="text-sm text-ink-secondary">
          Upload COMPANY NAME, DOC NAME, NUMBER, and EXPIERY DATE columns. The importer
          checks for existing records before saving.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block rounded-3xl border border-dashed border-[#d2d2d7] bg-surface-subtle p-5 transition-all duration-300 ease-apple hover:bg-white hover:shadow-soft">
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setResult(null);
                setPreview(null);
                setHideImport(false);
                resetProgress();
              }}
            />
            <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="text-sm font-semibold text-ink">
                  {selectedFile ? selectedFile.name : "Choose Excel file"}
                </span>
                <span className="mt-1 block text-sm text-ink-secondary">
                  {selectedFile
                    ? `${formatFileSize(selectedFile.size)} ready to check`
                    : "Drag-free upload with preview, duplicate check, and import summary."}
                </span>
              </span>
              <span className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-medium text-ink shadow-soft">
                Browse
              </span>
            </span>
          </label>

          {(pending || step !== "idle") && (
            <ImportProgress progress={progress} step={step} />
          )}

          <Button
            type="submit"
            disabled={pending || !selectedFile}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {pending ? "Checking file…" : "Check and import"}
          </Button>
        </form>
      </CardContent>

      {preview && selectedFile && (
        <DuplicateConfirmModal
          preview={preview}
          pending={pending}
          activeAction={activeAction}
          onCancel={() => {
            setPreview(null);
            resetProgress();
          }}
          onImportNewOnly={() => importFile(selectedFile, "new-only")}
          onUpdateExisting={() => importFile(selectedFile, "import")}
        />
      )}

      {pending && step === "importing" && !hideImport && (
        <ImportRunningModal
          progress={progress}
          onHide={() => setHideImport(true)}
        />
      )}

      {pending && step === "importing" && hideImport && (
        <FloatingImportStatus progress={progress} onShow={() => setHideImport(false)} />
      )}

      {result && (
        <ImportCompleteModal
          result={result}
          onClose={closeResult}
          onCheck={() => {
            closeResult();
            router.push("/dashboard/documents#all-documents");
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}

async function requestImport<T>(
  file: File,
  mode: "preview" | "import" | "new-only"
): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  body.append("mode", mode);

  const response = await fetch("/api/import/excel", {
    method: "POST",
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Import failed");
  }

  return data as T;
}

function ImportProgress({
  progress,
  step,
}: {
  progress: number;
  step: ImportStep;
}) {
  const remaining = Math.max(0, 100 - progress);
  const steps = [
    { key: "reading", label: "Reading Excel file" },
    { key: "checking", label: "Checking duplicates" },
    { key: "importing", label: "Saving documents" },
    { key: "complete", label: "Refreshing dashboard" },
  ] as const;

  return (
    <div className="rounded-3xl border border-[#e5e5ea] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">
            {step === "confirming" ? "Duplicate check complete" : "Import progress"}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {progress}% complete · {remaining}% left
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-700">
          {progress}%
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#f2f2f7]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-apple"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map((item, index) => {
          const activeIndex = steps.findIndex((candidate) => candidate.key === step);
          const isDone = activeIndex > index || step === "complete";
          const isActive = item.key === step;

          return (
            <div
              key={item.key}
              className="rounded-2xl bg-surface-subtle px-3 py-2 text-xs font-medium text-ink-secondary"
            >
              <span
                className={
                  isDone || isActive
                    ? "flex items-center gap-1.5 text-ink"
                    : "flex items-center gap-1.5"
                }
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                ) : isActive ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden />
                ) : (
                  <Circle className="h-3.5 w-3.5" aria-hidden />
                )}
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DuplicateConfirmModal({
  preview,
  pending,
  activeAction,
  onCancel,
  onImportNewOnly,
  onUpdateExisting,
}: {
  preview: PreviewResult;
  pending: boolean;
  activeAction: "new-only" | "import" | null;
  onCancel: () => void;
  onImportNewOnly: () => void;
  onUpdateExisting: () => void;
}) {
  return (
    <ModalShell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-5 text-center text-xl font-semibold tracking-tight text-ink">
        Some documents are already imported
      </h3>
      <p className="mt-3 text-center text-sm leading-relaxed text-ink-secondary">
        We found {preview.duplicates} existing document
        {preview.duplicates === 1 ? "" : "s"}. You can skip duplicates and add only
        {preview.newRows} new document
        {preview.newRows === 1 ? "" : "s"}.
      </p>

      {preview.duplicateSamples.length > 0 && (
        <div className="mt-5 space-y-2 rounded-3xl bg-surface-subtle p-4">
          {preview.duplicateSamples.map((sample) => (
            <div
              key={`${sample.companyName}-${sample.documentType}-${sample.referenceId}`}
              className="text-sm text-ink-secondary"
            >
              <span className="font-medium text-ink">{sample.documentType}</span>{" "}
              #{sample.referenceId} · {sample.companyName}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onImportNewOnly}
          disabled={pending || preview.newRows === 0}
        >
          {activeAction === "new-only" ? "Importing…" : "Continue without duplicates"}
        </Button>
        <Button type="button" onClick={onUpdateExisting} disabled={pending}>
          {activeAction === "import" ? "Importing…" : "Update existing too"}
        </Button>
      </div>
    </ModalShell>
  );
}

function ImportRunningModal({
  progress,
  onHide,
}: {
  progress: number;
  onHide: () => void;
}) {
  return (
    <ModalShell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Clock3 className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-5 text-center text-xl font-semibold tracking-tight text-ink">
        Importing in the background
      </h3>
      <p className="mt-3 text-center text-sm leading-relaxed text-ink-secondary">
        You can hide this and keep browsing. We will show the import summary when it
        finishes.
      </p>
      <div className="mt-6">
        <ImportProgress progress={progress} step="importing" />
      </div>
      <Button type="button" className="mt-6 w-full" variant="outline" onClick={onHide}>
        Hide import
      </Button>
    </ModalShell>
  );
}

function FloatingImportStatus({
  progress,
  onShow,
}: {
  progress: number;
  onShow: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="fixed bottom-6 right-6 z-40 w-[min(22rem,calc(100vw-3rem))] rounded-3xl border border-[#e5e5ea] bg-white p-4 text-left shadow-float transition-all duration-300 ease-apple hover:-translate-y-1"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Import running</p>
          <p className="mt-1 text-xs text-ink-secondary">
            {progress}% complete · click to reopen
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-xs font-semibold text-brand-700">
          {progress}%
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2f2f7]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-apple"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

function ImportCompleteModal({
  result,
  onClose,
  onCheck,
}: {
  result: ImportResult;
  onClose: () => void;
  onCheck: () => void;
}) {
  return (
    <ModalShell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-green-50 text-green-700 ring-1 ring-green-100">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-5 text-center text-xl font-semibold tracking-tight text-ink">
        Import complete
      </h3>
      <p className="mt-3 text-center text-sm leading-relaxed text-ink-secondary">
        {result.imported} document{result.imported === 1 ? "" : "s"} were imported.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <ResultStat label="New" value={result.created} />
        <ResultStat label="Updated" value={result.updated} />
        <ResultStat label="Skipped" value={result.skipped} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose}>
          OK
        </Button>
        <Button type="button" onClick={onCheck}>
          Check them
        </Button>
      </div>
    </ModalShell>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-surface-subtle p-4 text-center">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        {label}
      </p>
    </div>
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-float sm:p-8">
        {children}
      </div>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
