-- 시술 진행 과정(7단계) 테이블 + 초기 시드
-- 출처: docs/DB_SCHEMA.md 2.6 procedure_steps — 문서와 이 파일은 항상 함께 갱신할 것.

create table procedure_steps (
  id uuid primary key default uuid_generate_v4(),
  procedure_id uuid not null references procedures(id),
  step_order integer not null,
  title text not null,
  description text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  updated_at timestamptz not null default now()
);

create unique index idx_step_order on procedure_steps(procedure_id, step_order);

insert into procedure_steps (procedure_id, step_order, title, description) values
  ('00000000-0000-0000-0000-000000000020', 1, '디자인', '처짐 부위와 원하는 라인에 맞춰 절개선과 리프팅 범위를 표시합니다.'),
  ('00000000-0000-0000-0000-000000000020', 2, '소독', '시술 부위와 주변을 소독해 감염 위험을 최소화합니다.'),
  ('00000000-0000-0000-0000-000000000020', 3, '마취', '시술 범위와 환자 상태에 따라 수면마취 또는 국소마취 중 적합한 방법을 진행합니다.'),
  ('00000000-0000-0000-0000-000000000020', 4, '절개', '귀 앞뒤의 자연스러운 라인을 따라 흉터가 눈에 띄지 않도록 최소한으로 절개합니다.'),
  ('00000000-0000-0000-0000-000000000020', 5, '근막(SMAS) 리프팅', '피부 아래 처진 근막층을 끌어올려 고정해, 처짐의 근본 원인을 교정합니다.'),
  ('00000000-0000-0000-0000-000000000020', 6, '봉합', '정리된 피부와 절개 부위를 자연스러운 라인을 따라 세밀하게 봉합합니다.'),
  ('00000000-0000-0000-0000-000000000020', 7, '드레싱', '부기와 압박을 관리할 수 있도록 시술 부위를 드레싱하며 마무리합니다.');
