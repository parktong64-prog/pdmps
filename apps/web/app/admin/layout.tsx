"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드 홈" },
  { href: "/admin/consultations", label: "상담 관리" },
  { href: "/admin/reservations", label: "예약 관리" },
  { href: "/admin/schedule", label: "일정 설정" },
  { href: "/admin/patients", label: "환자 관리" },
  { href: "/admin/payments", label: "결제·매출" },
  { href: "/admin/settings", label: "설정" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

        <div className="mt-auto hidden border-t border-white/10 pt-3 text-[0.76rem] text-[var(--sidebar-muted)] md:block">
          <b className="block font-semibold text-[var(--sidebar-ink)]">박동만</b>
          원장 · 로그아웃
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-5 py-7 md:px-8">{children}</main>
    </div>
  );
}
