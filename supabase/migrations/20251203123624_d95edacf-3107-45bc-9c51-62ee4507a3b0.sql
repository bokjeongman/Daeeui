-- 모든 인증된 사용자가 다른 사용자의 닉네임을 조회할 수 있도록 RLS 정책 추가
CREATE POLICY "Anyone can view nicknames" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 기존 본인만 볼 수 있는 정책은 유지 (UPDATE용)