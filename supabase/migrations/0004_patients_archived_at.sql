-- 환자 목록에서 "삭제"는 실제 삭제가 아니라 보관 처리.
-- 상담/예약/결제 이력은 FK로 계속 연결되어 있어야 하므로 하드 삭제하지 않는다.
-- 출처: docs/DB_SCHEMA.md 2.1 patients — archived_at

alter table patients add column archived_at timestamptz;
