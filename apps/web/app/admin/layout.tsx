"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markAdminBrowserAndOptOut } from "@/lib/posthog/client";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드 홈" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/consultations", label: "상담 관리" },
  { href: "/admin/reservations", label: "예약 관리" },
  { href: "/admin/schedule", label: "일정 설정" },
  { href: "/admin/patients", label: "환자 관리" },
  { href: "/admin/payments", label: "결제·매출" },
  { href: "/admin/settings", label: "설정" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // 환자 화면을 보다가 관리자 페이지로 들어온 경우 — 지금부터 이 브라우저의
  // PostHog 추적을 끄고, 다음 방문부터는 아예 초기화되지 않게 표시해둔다.
  // (환자 방문 통계에 원장님 본인의 관리자 사용이 섞이지 않도록.)
  useEffect(() => {
    markAdminBrowserAndOptOut();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)] text-[var(--ink)] md:flex-row">
      <nav className="flex flex-none flex-col gap-0.5 overflow-x-auto bg-[var(--sidebar-bg)] p-3.5 text-[var(--sidebar-ink)] md:w-[220px] md:overflow-visible md:p-5">
        <div className="mb-5 hidden font-[family-name:var(--font-display)] text-[1.1rem] font-bold text-[var(--brand-green)] md:block">
          PDMPS
          <span className="mt-0.5 block font-[family-name:var(--font-body)] text-[0.66rem] font-normal text-[var(--sidebar-muted)]">
            관리자 · Face Lift
          </span>
        </div>

        <div className="flex gap-1 md:flex-col md:gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-none items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.84rem] transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--sidebar-muted)] hover:bg-white/[0.06] hover:text-[var(--sidebar-ink)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-current opacity-100" : "bg-current opacity-50"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[0.76rem] text-[var(--sidebar-muted)]">
          <span className="hidden md:inline">
            <b className="font-semibold text-[var(--sidebar-ink)]">박동만</b> 원장
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md px-2 py-1 underline underline-offset-2 hover:text-[var(--sidebar-ink)]"
          >
            로그아웃
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-5 py-7 md:px-8">{children}</main>
    </div>
  );
}
