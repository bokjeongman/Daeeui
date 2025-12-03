-- 수정 요청 테이블 생성
CREATE TABLE public.modification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.accessibility_reports(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('MODIFY', 'DELETE')),
  reason TEXT NOT NULL,
  proposed_details TEXT,
  proposed_photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.modification_requests ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 요청 제출 가능
CREATE POLICY "Users can submit modification requests"
ON public.modification_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- 자신의 요청 조회 가능
CREATE POLICY "Users can view their own requests"
ON public.modification_requests
FOR SELECT
USING (auth.uid() = requester_id);

-- 관리자는 모든 요청 조회 가능
CREATE POLICY "Admins can view all requests"
ON public.modification_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 관리자는 요청 상태 업데이트 가능
CREATE POLICY "Admins can update requests"
ON public.modification_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 자신의 pending 요청 삭제 가능
CREATE POLICY "Users can delete their own pending requests"
ON public.modification_requests
FOR DELETE
USING (auth.uid() = requester_id AND status = 'pending');