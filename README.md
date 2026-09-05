# Counsel

Face Lift 전문(원장: 박동만) 성형외과의 상담·예약 서비스.

## 문서

- [prd.md](prd.md) — 제품 요구사항
- [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) — 데이터베이스 스키마
- [docs/TECH_STACK.md](docs/TECH_STACK.md) — 기술 스택 결정
- [docs/wireframes.html](docs/wireframes.html) — 초기 와이어프레임(블루프린트 스타일)

## 프로토타입

`prototypes/`에 있는 정적 HTML 데모 — 실제 앱을 만들기 전 화면 흐름을 검증한 것들입니다.

- `home.html` — 환자 홈
- `procedure-explainer.html` — 수술 방법 안내
- `ai-simulation.html` — AI 시뮬레이션
- `reservation-calendar.html` — 예약 캘린더
- `inquiry-form.html` — 예약자 정보 확인 · 결제
- `admin-dashboard.html` — 관리자 대시보드 (상담/예약/일정/환자/결제/설정)

## 실제 앱 (`apps/web`)

Next.js(App Router) + Tailwind CSS + Supabase.

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # Supabase 프로젝트 URL/anon key 입력
npm run dev
```

### 데이터베이스

`supabase/migrations/0001_init.sql`에 스키마, `supabase/seed.sql`에 초기 시드(Face Lift 시술, 박동만 원장 등)가 있습니다. Supabase CLI로 로컬 또는 프로젝트에 적용하세요:

```bash
supabase db push
```

## 구조

```
Counsel/
├── prd.md
├── docs/               # 문서, 초기 와이어프레임
├── prototypes/         # 정적 HTML 프로토타입
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── apps/
    └── web/            # Next.js 앱
```
