"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // 재설정 링크의 토큰을 세션으로 교환하는 이벤트를 기다린다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // 이미 처리된 뒤 마운트된 경우를 대비해 현재 세션도 한 번 확인
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const timer = setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalidLink(true);
        return r;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있어요, 다시 요청해주세요.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/admin"), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-5 text-[var(--ink)]">
      <div className="w-full max-w-[380px] rounded-[18px] border border-[var(--line)] bg-[var(--card-bg)] p-8 shadow-[0_24px_60px_-32px_rgba(42,31,34,0.35)]">
        <div className="mb-6 text-center">
          <div className="mb-1.5 font-[family-name:var(--font-display)] text-[1.2rem] font-bold text-[var(--brand-green)]">
            PDMPS
          </div>
          <div className="text-[0.8rem] text-[var(--ink-soft)]">새 비밀번호 설정</div>
        </div>

        {invalidLink && !ready ? (
          <div className="text-center">
            <p className="mb-4 text-[0.84rem] leading-[1.6] text-[var(--ink-soft)]">
              링크가 만료되었거나 올바르지 않습니다. 관리자 로그인 화면에서 비밀번호 재설정을 다시 요청해주세요.
            </p>
          </div>
        ) : done ? (
          <div className="text-center text-[0.86rem] text-[var(--success)] font-semibold">
            비밀번호가 변경되었습니다. 이동 중…
          </div>
        ) : !ready ? (
          <div className="py-4 text-center text-[0.84rem] text-[var(--ink-soft)]">확인 중…</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.8rem] font-bold">
                새 비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-[9px] border border-[var(--line)] px-[13px] py-[11px] text-[0.92rem] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="passwordConfirm" className="text-[0.8rem] font-bold">
                새 비밀번호 확인
              </label>
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
              {loading ? "변경 중…" : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
