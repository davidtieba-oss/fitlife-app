"use client";

import { ReactNode, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
};

export default function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md bg-surface rounded-t-2xl border-t border-border p-4 pb-6 animate-[fadeSlideUp_0.2s_ease-out]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-muted" />
        {title != null && (
          <h2 className="text-base font-semibold text-foreground mb-3">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
