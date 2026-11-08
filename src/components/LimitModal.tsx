"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";

/** Shown when a free-plan learner has used all of today's turns. */
export default function LimitModal({
  used,
  limit,
  onClose,
}: {
  used?: number;
  limit?: number | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-2xl"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Lock size={26} aria-hidden="true" />
        </span>
        <h2 id="limit-title" className="mt-4">Daily limit reached</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {used != null && limit != null
            ? `You've used all ${limit} of your free turns for today (${used}/${limit}). `
            : "You've used all of your free turns for today. "}
          Your turns reset tomorrow, or upgrade to Pro for unlimited daily practice.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/app/profile" className="btn rounded-xl px-5">View my plan</Link>
          <button ref={closeRef} type="button" onClick={onClose} className="btn secondary rounded-xl px-5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
