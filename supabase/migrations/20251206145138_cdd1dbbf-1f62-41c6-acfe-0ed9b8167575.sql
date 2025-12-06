-- accessibility_reports 테이블에 5개 Boolean 접근성 항목 추가
ALTER TABLE public.accessibility_reports
ADD COLUMN IF NOT EXISTS has_ramp BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_accessible_restroom BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_low_threshold BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_wide_door BOOLEAN DEFAULT NULL;

-- modification_requests 테이블에도 제안된 5개 항목 추가
ALTER TABLE public.modification_requests
ADD COLUMN IF NOT EXISTS proposed_has_ramp BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposed_has_elevator BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposed_has_accessible_restroom BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposed_has_low_threshold BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposed_has_wide_door BOOLEAN DEFAULT NULL;

-- 기존 accessibility_level 및 category 컬럼은 유지 (기존 데이터 호환성)