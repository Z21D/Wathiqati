"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-[#e5e5ea] bg-white shadow-card text-ink",
          title: "font-medium",
          description: "text-ink-secondary",
        },
      }}
    />
  );
}
