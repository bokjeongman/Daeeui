-- 닉네임으로 마스킹된 이메일을 찾는 보안 함수 생성
CREATE OR REPLACE FUNCTION public.find_email_by_nickname(search_nickname text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
  masked_email text;
  email_parts text[];
BEGIN
  -- 닉네임으로 이메일 검색
  SELECT email INTO found_email
  FROM public.profiles
  WHERE nickname = search_nickname;
  
  -- 이메일이 없으면 NULL 반환
  IF found_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 이메일 마스킹 처리 (앞 3글자만 보여주고 나머지 마스킹)
  email_parts := string_to_array(found_email, '@');
  IF array_length(email_parts, 1) = 2 THEN
    masked_email := left(email_parts[1], 3) || '***@' || email_parts[2];
  ELSE
    masked_email := left(found_email, 3) || '***';
  END IF;
  
  RETURN masked_email;
END;
$$;