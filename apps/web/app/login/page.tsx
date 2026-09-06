"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/lib/ui/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [mode, setMode] = useState<"login" | "forgot">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 브라우저에서 직접 supabase-js의 resetPasswordForEmail을 호출하면 이 배포
    // 환경에서 간헐적으로 "non ISO-8859-1 code point" fetch 에러가 발생하는
    // 문제가 있어(원인 불명), 서버 라우트를 거쳐 우회한다.
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "재설정 이메일 발송에 실패했습니다.");
        return;
      }
      setForgotSent(true);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? `재설정 이메일 발송에 실패했습니다. (${err.message})` : "재설정 이메일 발송에 실패했습니다.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-5 text-[var(--ink)]">
      <div className="w-full max-w-[380px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
        <div className="mb-6 text-center">
          <div className="mb-1.5 font-[family-name:var(--font-display)] text-[1.2rem] font-bold text-[var(--brand-green)]">
            PDMPS
          </div>
          <div className="text-[0.8rem] text-[var(--ink-soft)]">{mode === "login" ? "관리자 로그인" : "비밀번호 재설정"}</div>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[0.8rem] font-bold">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-[9px] border border-[var(--line)] px-[13px] py-[11px] text-[0.92rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.8rem] font-bold">
                비밀번호
              </label>
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" required />
            </div>

            {error && (
              <div className="rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-[0.78rem] leading-[1.55] text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-[10px] bg-[var(--accent)] py-[13px] text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06] disabled:opacity-60"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setForgotSent(false);
              }}
              className="text-center text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent-ink)]"
            >
              비밀번호를 잊으셨나요?
            </button>
          </form>
        ) : forgotSent ? (
          <div className="text-center">
            <p className="mb-5 text-[0.84rem] leading-[1.6] text-[var(--ink-soft)]">
              <b className="text-[var(--ink)]">{email}</b> 주소로 재설정 링크를 보냈어요. 메일함(스팸함 포함)을 확인해주세요.
            </p>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-[0.82rem] text-[var(--accent-ink)] underline underline-offset-2"
            >
              ‹ 로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-[16px]" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-[0.8rem] font-bold">
                이메일
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-[9px] border border-[var(--line)] px-[13px] py-[11px] text-[0.92rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
            </div>

            {error && (
              <div className="rounded-[10px] bg-[var(--danger-soft)] px-3 py-2.5 text-[0.78rem] leading-[1.55] text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-[10px] bg-[var(--accent)] py-[13px] text-[0.92rem] font-bold text-white transition-[filter] hover:brightness-[1.06] disabled:opacity-60"
            >
              {loading ? "발송 중…" : "재설정 이메일 보내기"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="text-center text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent-ink)]"
            >
              ‹ 로그인으로 돌아가기
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
