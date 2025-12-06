
-- 새 제약조건 추가: public, notpublic 모두 허용
ALTER TABLE accessibility_reports ADD CONSTRAINT accessibility_level_check 
CHECK (accessibility_level IN ('public', 'notpublic'));
