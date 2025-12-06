
-- 기존 accessibility_level_check 제약조건 삭제
ALTER TABLE accessibility_reports DROP CONSTRAINT IF EXISTS accessibility_level_check;
