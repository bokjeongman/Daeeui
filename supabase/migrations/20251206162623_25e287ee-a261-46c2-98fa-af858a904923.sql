-- 1. 두 개의 accessibility_level check constraint 모두 삭제
ALTER TABLE accessibility_reports DROP CONSTRAINT IF EXISTS accessibility_level_check;
ALTER TABLE accessibility_reports DROP CONSTRAINT IF EXISTS accessibility_reports_accessibility_level_check;

-- 2. 공공데이터를 'public'으로 변경
UPDATE accessibility_reports 
SET accessibility_level = 'public' 
WHERE location_name LIKE '%공공데이터%';

-- 3. 기존 good/moderate/difficult 값을 가진 나머지 데이터는 'door'로 변경
UPDATE accessibility_reports 
SET accessibility_level = 'door' 
WHERE accessibility_level IN ('good', 'moderate', 'difficult');

-- 4. 새로운 check constraint 추가 (ramp, elevator, restroom, threshold, door, public)
ALTER TABLE accessibility_reports ADD CONSTRAINT accessibility_level_check 
CHECK (accessibility_level IN ('ramp', 'elevator', 'restroom', 'threshold', 'door', 'public'));