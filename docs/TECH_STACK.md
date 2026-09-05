# 기술 스택 결정 (Tech Stack Decision)

| 항목 | 내용 |
|---|---|
| 문서 상태 | Draft v0.2 |
| 작성일 | 2026-09-05 |
| 전제 | 1인 개발, 빠른 MVP 출시 우선, 단일 병원용 자체 시스템 |

> 아래는 "1인/소규모 개발, MVP 속도 우선"을 전제로 한 추천안입니다. 팀 규모나 예산, 선호 언어가 다르면 언제든 조정 가능합니다.

---

## 1. 전체 아키텍처 요약

```
[환자 앱: React Native(Expo)]   [환자 웹: Next.js]   [관리자 대시보드: Next.js]
                \                    |                    /
                 \                   |                   /
                  \-------- REST/Realtime API ----------/
                                    |
                        [Supabase: Postgres DB]
                        [Supabase Auth / Storage / Realtime]
                                    |
   +---------------+---------------+---------------+------------------+
   |               |               |               |                  |
[PG사: 포트원 - 결제] [카카오 알림톡/SMS] [FCM 푸시] [AI 사진분석 API] [AI 시뮬레이션 API/SaaS]
```

## 2. 프론트엔드

| 영역 | 선택 | 이유 |
|---|---|---|
| 환자용 웹 | **Next.js 14 (App Router) + TypeScript + Tailwind CSS** | SEO/초기 로딩 필요한 랜딩·상담신청 페이지에 적합, Vercel 배포로 운영 부담 최소화 |
| 관리자 대시보드 | **Next.js (동일 레포 내 별도 라우트 그룹 또는 별도 앱)** | 프론트 스택 통일로 유지보수 부담 감소, UI 컴포넌트 재사용 |
| UI 컴포넌트 | **shadcn/ui + Tailwind** | 빠른 대시보드/폼 구축, 커스터마이징 용이 |
| 상태관리 | **TanStack Query (서버 상태) + Zustand (클라이언트 상태)** | 상담/예약처럼 서버 동기화가 잦은 데이터에 적합 |

### 모바일 앱: 네이티브 vs 하이브리드 → **React Native (Expo) 추천**

| 비교 | 네이티브 (Swift/Kotlin) | React Native (Expo) |
|---|---|---|
| 개발 리소스 | iOS/Android 각각 별도 코드, 인력 2배 | 코드베이스 1개로 양쪽 대응 |
| 개발 속도 | 느림 | 빠름 (1인 개발에 유리) |
| 웹과 로직/타입 공유 | 불가 | TypeScript 타입, API 클라이언트, 유효성 검증 로직 공유 가능 |
| 카메라/사진 업로드·푸시·캘린더 | 고성능이지만 구현량 많음 | Expo 모듈로 충분히 커버 가능 |
| 결론 | 성능이 극도로 중요한 경우가 아니면 과함 | **1인 개발 + MVP 속도 우선 조건에 부합 → 채택** |

> 상담앱은 카메라/사진 업로드, 푸시, 캘린더 정도가 핵심이라 네이티브 수준의 고성능이 필요하지 않음. Expo로 시작 후 필요 시 특정 화면만 네이티브 모듈로 전환 가능. (환자-원장 소통은 채팅이 아닌 전화 응대로 처리 — [prd.md](../prd.md) 참고)

## 3. 백엔드 & 데이터베이스

| 영역 | 선택 | 이유 |
|---|---|---|
| BaaS/백엔드 | **Supabase (Postgres + Auth + Realtime + Storage)** | 인증, DB, 파일(사진) 저장을 하나로 해결 → 1인 개발 부담 대폭 축소 |
| DB | **PostgreSQL (Supabase 관리형)** | 관계형 데이터(환자-상담-예약-결제)에 적합, RLS(Row Level Security)로 권한 분리 |
| 실시간 슬롯 상태 갱신 | **Supabase Realtime (Postgres Changes)** | 예약 캘린더에서 다른 환자가 슬롯을 선점(held)/확정(booked)하면 즉시 반영 → 이중 예약 UX 방지 |
| 파일 저장 | **Supabase Storage** | 문진표 첨부 사진 저장, 서명된 URL로 접근 제어 |
| 서버리스 함수 | **Supabase Edge Functions** | 결제 웹훅 처리, 알림 발송 트리거 등 서버 로직 |

> 향후 트래픽이 커지거나 세밀한 서버 로직이 많아지면 NestJS 기반 자체 백엔드로 이관 가능하도록 DB 스키마는 표준 Postgres로 설계 (벤더 종속 최소화).

## 4. AI 기능 (사진 분석 · 시뮬레이션)

| 기능 | 접근 방식 | 이유 |
|---|---|---|
| AI 사진 분석 (처짐 부위/정도) | **멀티모달 LLM API(예: Claude/GPT-4V 계열) 프롬프트 기반 분석**으로 시작, 정확도 검증 후 필요 시 전용 안면 랜드마크/피부 분석 모델로 고도화 | 자체 모델 학습 없이 빠르게 MVP 검증 가능. 단, 의료 진단이 아닌 "참고 소견" 수준으로 결과를 제한해야 함 |
| AI 가상 시뮬레이션 (Before/After) | **전문 미용 시뮬레이션 SaaS 연동을 1순위로 검토** (예: Crisalix 등 성형외과 전용 3D 시뮬레이션 서비스), 대안으로 이미지 생성 모델(예: Stable Diffusion 기반 inpainting) 자체 구축 | 자체 생성형 모델은 결과 신뢰성·부작용(비현실적 이미지) 관리가 어렵고 법적 리스크가 큼. 전문 SaaS가 정확도·책임소재 면에서 유리 |
| 처리 방식 | **Supabase Edge Function → 외부 AI API 호출 → 결과를 `ai_photo_analyses`/`simulation_images`에 저장** | 프론트엔드에서 AI API 키를 직접 다루지 않도록 서버 경유 필수 (키 노출 방지) |
| 처리 지연 대응 | 비동기 처리 + 폴링 또는 Realtime 구독으로 결과 수신, 실패/지연 시 다음 단계로 건너뛰기 허용 | 사용자 이탈 방지, [prd.md](../prd.md) FR-2.7 |

> ⚠️ AI 분석/시뮬레이션 벤더 선정과 별개로, 두 기능 모두 **의료광고·의료기기법 법무 검토가 선행되어야 한다** ([prd.md](../prd.md) 7.1). 기술 구현보다 규제 검토가 먼저다.

## 5. 외부 연동

| 영역 | 후보 | 비고 |
| --- | --- | --- |
| 결제(PG) | **포트원(구 아임포트)** 또는 토스페이먼츠 | 여러 PG사(카드, 카카오페이, 토스페이 등)를 하나의 API로 통합 |
| 알림톡 | **카카오 비즈니스 알림톡** (NHN Toast, 알리고 등 대행사 경유) | 예약 확정/리마인드 알림의 기본 채널 |
| SMS | 알림톡 실패 시 폴백 (동일 대행사 또는 Twilio) | |
| 푸시 알림 | **Firebase Cloud Messaging (FCM)** | Expo Push와 연동 용이 |

## 6. 인프라 / 배포

| 영역 | 선택 |
|---|---|
| 웹/관리자 호스팅 | Vercel |
| DB/백엔드 | Supabase Cloud |
| 앱 빌드/배포 | Expo EAS Build & Submit (App Store / Play Store) |
| 모니터링 | Sentry (에러 트래킹), Vercel Analytics |

## 7. 모노레포 구조 (제안)

```
Counsel/
├── apps/
│   ├── web/          # Next.js 환자용 웹 + 관리자 대시보드
│   └── mobile/        # React Native(Expo) 환자용 앱
├── packages/
│   ├── shared-types/  # 공통 TypeScript 타입 (DB row 타입 등)
│   └── api-client/    # Supabase client wrapper, API 호출 함수
├── supabase/
│   ├── migrations/    # DB 마이그레이션 SQL
│   └── functions/     # Edge Functions
├── docs/
│   ├── prd.md
│   ├── TECH_STACK.md
│   └── DB_SCHEMA.md
```

관리는 **Turborepo** 또는 **pnpm workspace**로 단순하게 시작 권장.

## 8. 다음에 확정할 사항

- **AI 사진 분석/시뮬레이션 관련 법무 검토** (최우선) — [prd.md](../prd.md) 7.1
- AI 시뮬레이션 벤더 선정 (전문 SaaS 연동 vs 자체 생성 모델)
- PG사 최종 선정 (포트원 vs 토스페이먼츠) — 수수료/정산 주기 비교 필요
- 카카오 알림톡 발신 프로필 등록 (사업자 필요)
- Supabase 요금제 (무료 티어로 MVP 검증 후 Pro 전환)
