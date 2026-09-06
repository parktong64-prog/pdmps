-- PDMPS 초기 시드 데이터
-- 현재 운영 범위: Face Lift 단일 시술, 원장 1인(박동만) 체계 — 상담사 계정 없음, docs/DB_SCHEMA.md 상단 노트 참고

insert into staff (id, name, role, phone, is_active) values
  ('00000000-0000-0000-0000-000000000001', '박동만', 'doctor', '010-1111-2222', true);

insert into questionnaire_templates (id, name, procedure_category) values
  ('00000000-0000-0000-0000-000000000010', 'Face Lift 기본 문진표', 'Face Lift');

insert into questionnaire_fields (template_id, label, field_type, options, is_required, sort_order) values
  ('00000000-0000-0000-0000-000000000010', '고민 부위', 'multi_choice', '["팔자주름", "턱선 처짐", "목주름"]', true, 1),
  ('00000000-0000-0000-0000-000000000010', '희망 사항', 'textarea', null, false, 2),
  ('00000000-0000-0000-0000-000000000010', '기존 시술 이력', 'text', null, false, 3);

insert into procedures (id, category, name, base_price, deposit_amount, questionnaire_template_id, is_active) values
  ('00000000-0000-0000-0000-000000000020', 'Face Lift', 'Face Lift (안면거상술)', 27500000, 50000,
   '00000000-0000-0000-0000-000000000010', true);

-- video_url은 관리자가 실제 영상을 업로드하기 전까지 null (환자 화면은 미리보기로 대체)
insert into procedure_videos (procedure_id, title, video_url, duration_sec, is_active, sort_order) values
  ('00000000-0000-0000-0000-000000000020', 'Face Lift 과정 안내', null, 204, true, 1);
