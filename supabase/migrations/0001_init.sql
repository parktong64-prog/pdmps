-- 카운슬 초기 스키마
-- 출처: docs/DB_SCHEMA.md 3. PostgreSQL DDL — 문서와 이 파일은 항상 함께 갱신할 것.

create extension if not exists "uuid-ossp";

create table patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text unique not null,
  email text,
  birth_date date,
  gender text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null check (role in ('admin', 'doctor')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table questionnaire_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  procedure_category text not null
);

create table questionnaire_fields (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references questionnaire_templates(id) on delete cascade,
  label text not null,
  field_type text not null check (field_type in ('text', 'textarea', 'single_choice', 'multi_choice', 'date')),
  options jsonb,
  is_required boolean not null default false,
  sort_order integer not null default 0
);

create table procedures (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  name text not null,
  base_price integer not null default 0,
  deposit_amount integer not null default 50000,
  questionnaire_template_id uuid references questionnaire_templates(id),
  is_active boolean not null default true
);

create table procedure_videos (
  id uuid primary key default uuid_generate_v4(),
  procedure_id uuid not null references procedures(id),
  title text not null,
  video_url text not null,
  duration_sec integer,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table consultations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id),
  procedure_id uuid not null references procedures(id),
  assigned_staff_id uuid references staff(id),
  status text not null default 'pending' check (status in ('pending', 'needs_review', 'in_progress', 'reserved', 'cancelled')),
  source text not null default 'web' check (source in ('web', 'app')),
  video_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table consultation_answers (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  field_id uuid not null references questionnaire_fields(id),
  answer_text text
);

create table consultation_photos (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create table ai_photo_analyses (
  id uuid primary key default uuid_generate_v4(),
  consultation_photo_id uuid not null unique references consultation_photos(id) on delete cascade,
  concern_areas text[] not null default '{}',
  severity_score integer check (severity_score between 0 and 100),
  severity_label text check (severity_label in ('mild', 'moderate', 'severe')),
  confidence numeric(4,3),
  needs_review boolean not null default false,
  model_name text,
  raw_result jsonb,
  created_at timestamptz not null default now()
);

create table simulation_images (
  id uuid primary key default uuid_generate_v4(),
  consultation_photo_id uuid not null references consultation_photos(id) on delete cascade,
  generated_image_path text not null,
  model_name text,
  disclaimer_shown boolean not null default true,
  created_at timestamptz not null default now()
);

create table reservation_slots (
  id uuid primary key default uuid_generate_v4(),
  procedure_id uuid references procedures(id),
  staff_id uuid not null references staff(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'held', 'booked', 'blocked')),
  created_by uuid references staff(id),
  constraint valid_time_range check (end_at > start_at)
);

-- 동일 담당의·시간대 슬롯 중복 방지
create unique index idx_slot_staff_time on reservation_slots(staff_id, start_at);

create table reservations (
  id uuid primary key default uuid_generate_v4(),
  slot_id uuid not null unique references reservation_slots(id),
  consultation_id uuid not null references consultations(id),
  patient_id uuid not null references patients(id),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'confirmed', 'changed', 'cancelled', 'completed', 'no_show')),
  payment_deadline timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  reservation_id uuid not null references reservations(id),
  type text not null check (type in ('deposit', 'procedure_fee')),
  amount integer not null,
  pg_provider text,
  pg_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  refundable boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  reservation_id uuid references reservations(id),
  consultation_id uuid references consultations(id),
  recipient_patient_id uuid references patients(id),
  recipient_staff_id uuid references staff(id),
  channel text not null check (channel in ('push', 'alimtalk', 'sms', 'internal')),
  template_key text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  constraint recipient_required check (recipient_patient_id is not null or recipient_staff_id is not null)
);
