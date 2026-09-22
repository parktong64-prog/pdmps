"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    void fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, url: window.location.href }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--page-bg)] px-6 text-center text-[var(--ink)]">
      <div className="font-[family-name:var(--font-display)] text-[1.3rem] font-bold">문제가 발생했습니다</div>
      <p className="max-w-sm text-[0.9rem] text-[var(--ink-soft)]">
        일시적인 오류예요. 잠시 후 다시 시도해 주세요. 문제가 계속되면 병원으로 문의해 주세요.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[0.86rem] font-bold text-white"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-lg border border-[var(--line)] px-4 py-2 text-[0.86rem] font-bold text-[var(--ink-soft)]"
        >
          처음으로
        </Link>
      </div>
    </div>
  );
}
