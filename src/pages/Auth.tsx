import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import NicknameSetupModal from "@/components/NicknameSetupModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (options: { redirectUri: string; scope?: string }) => void;
        setAccessToken: (token: string) => void;
        getAccessToken: () => string | null;
      };
      API: {
        request: (options: {
          url: string;
          success: (res: any) => void;
          fail: (err: any) => void;
        }) => void;
      };
    };
  }
}

const KAKAO_JS_KEY = "dc0db09ad3ab9f29fed146728402f08a";

const emailSchema = z.string().email("올바른 이메일 주소를 입력해주세요.");
const passwordSchema = z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다.");

type LoginMethod = "email" | "google" | "kakao" | null;

const RECENT_LOGIN_KEY = "recent_login_method";

const getRecentLoginMethod = (): LoginMethod => {
  try {
    const method = localStorage.getItem(RECENT_LOGIN_KEY);
    if (method === "email" || method === "google" || method === "kakao") {
      return method;
    }
    return null;
  } catch {
    return null;
  }
};

const setRecentLoginMethod = (method: LoginMethod) => {
  try {
    if (method) {
      localStorage.setItem(RECENT_LOGIN_KEY, method);
    }
  } catch {
    // localStorage 접근 실패 무시
  }
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recentMethod, setRecentMethod] = useState<LoginMethod>(null);
  const [showFindIdModal, setShowFindIdModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [findNickname, setFindNickname] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setRecentMethod(getRecentLoginMethod());
    
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // OAuth 로그인 후 provider 감지하여 최근 로그인 방법 저장
        const provider = session.user.app_metadata?.provider;
        if (provider === "google") {
          setRecentLoginMethod("google");
          setRecentMethod("google");
        } else if (provider === "kakao") {
          setRecentLoginMethod("kakao");
          setRecentMethod("kakao");
        } else if (provider === "email") {
          setRecentLoginMethod("email");
          setRecentMethod("email");
        }
        
        await checkNicknameAndRedirect(session.user.id);
      }
    };
    checkUser();

    // Auth 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const provider = session.user.app_metadata?.provider;
        if (provider === "google") {
          setRecentLoginMethod("google");
          setRecentMethod("google");
        } else if (provider === "kakao") {
          setRecentLoginMethod("kakao");
          setRecentMethod("kakao");
        }
        // 닉네임 체크는 setTimeout으로 지연 (Supabase 권장)
        setTimeout(() => {
          checkNicknameAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkNicknameAndRedirect = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single();

    if (!profile?.nickname) {
      setCurrentUserId(userId);
      setShowNicknameModal(true);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleNicknameComplete = () => {
    setShowNicknameModal(false);
    navigate("/");
  };

  const handleFindId = async () => {
    if (!findNickname.trim()) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("find_email_by_nickname", { search_nickname: findNickname.trim() });

      if (error || !data) {
        toast.error("해당 닉네임으로 등록된 계정을 찾을 수 없습니다.");
        setFoundEmail(null);
      } else {
        setFoundEmail(data);
        toast.success("아이디를 찾았습니다!");
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      emailSchema.parse(resetEmail);
    } catch (error: any) {
      toast.error(error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error("비밀번호 재설정 이메일 발송에 실패했습니다.");
      } else {
        toast.success("비밀번호 재설정 링크가 이메일로 발송되었습니다.");
        setShowResetPasswordModal(false);
        setResetEmail("");
      }
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error: any) {
      toast.error(error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error("로그인 정보가 올바르지 않습니다.");
          if (import.meta.env.DEV) console.error("인증 오류:", error);
          return;
        }

        setRecentLoginMethod("email");
        toast.success("로그인 성공!");
        await checkNicknameAndRedirect(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          toast.error("회원가입 처리 중 오류가 발생했습니다.");
          if (import.meta.env.DEV) console.error("회원가입 오류:", error);
          return;
        }

        // 자동 확인이 활성화된 경우 바로 로그인됨
        if (data.session) {
          setRecentLoginMethod("email");
          toast.success("회원가입 및 로그인 성공!");
          await checkNicknameAndRedirect(data.user!.id);
        } else {
          toast.success("회원가입이 완료되었습니다! 이메일을 확인해주세요.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("인증 오류:", error);
      toast.error("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast.error("구글 로그인에 실패했습니다.");
        if (import.meta.env.DEV) console.error("구글 로그인 오류:", error);
      } else {
        setRecentLoginMethod("google");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("구글 로그인 오류:", error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const initKakao = useCallback(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY);
    }
  }, []);

  // 카카오 로그인 콜백 처리
  const processKakaoCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (!code) return;
    
    // URL에서 code 파라미터 제거
    const newUrl = window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    
    setIsLoading(true);
    
    try {
      // 인가 코드로 토큰 요청
      const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: KAKAO_JS_KEY,
          redirect_uri: `${window.location.origin}/auth`,
          code: code,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        toast.error("카카오 인증에 실패했습니다.");
        setIsLoading(false);
        return;
      }
      
      // 토큰으로 사용자 정보 요청
      const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      const userData = await userResponse.json();
      
      const kakaoEmail = userData.kakao_account?.email;
      const kakaoId = userData.id;
      const kakaoNickname = userData.properties?.nickname || userData.kakao_account?.profile?.nickname;

      if (!kakaoEmail) {
        toast.error("카카오 계정에 이메일이 없습니다. 이메일 제공에 동의해주세요.");
        setIsLoading(false);
        return;
      }

      // 카카오 ID를 사용한 고유 비밀번호 생성
      const kakaoPassword = `kakao_${kakaoId}_secure_password_${KAKAO_JS_KEY.slice(0, 8)}`;

      // 먼저 로그인 시도
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: kakaoEmail,
        password: kakaoPassword,
      });

      if (signInData?.user) {
        setRecentLoginMethod("kakao");
        toast.success("카카오 로그인 성공!");
        await checkNicknameAndRedirect(signInData.user.id);
      } else {
        // 신규 사용자 - 회원가입 진행
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: kakaoEmail,
          password: kakaoPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              provider: "kakao",
              kakao_id: kakaoId,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast.error("이미 다른 방법으로 가입된 이메일입니다.");
          } else {
            toast.error("회원가입에 실패했습니다.");
          }
          setIsLoading(false);
          return;
        }

        if (signUpData?.user) {
          setRecentLoginMethod("kakao");
          
          if (kakaoNickname) {
            await supabase
              .from("profiles")
              .update({ nickname: kakaoNickname })
              .eq("id", signUpData.user.id);
          }

          toast.success("카카오 계정으로 회원가입되었습니다!");
          await checkNicknameAndRedirect(signUpData.user.id);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("카카오 로그인 처리 오류:", error);
      toast.error("카카오 로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [checkNicknameAndRedirect]);

  useEffect(() => {
    initKakao();
    processKakaoCallback();
  }, [initKakao, processKakaoCallback]);

  const handleKakaoLogin = () => {
    initKakao();
    
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      toast.error("카카오 SDK 로드에 실패했습니다. 페이지를 새로고침해주세요.");
      return;
    }

    // 카카오 로그인 페이지로 리다이렉트
    window.Kakao.Auth.authorize({
      redirectUri: `${window.location.origin}/auth`,
      scope: "profile_nickname,account_email",
    });
  };

  const RecentBadge = () => (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
      <div className="relative bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
        <span>최근 로그인</span>
        {/* 말풍선 꼬리 */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            🦽 휠체어 경로 안내
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? "로그인하여 시작하기" : "계정을 만들어 시작하기"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SSO Buttons */}
          <div className="space-y-3">
            <div className={`relative ${recentMethod === "google" ? "mt-8" : ""}`}>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 계속하기
              </Button>
              {recentMethod === "google" && <RecentBadge />}
            </div>

            <div className={`relative ${recentMethod === "kakao" ? "mt-8" : ""}`}>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] border-[#FEE500]"
                onClick={handleKakaoLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.665 1.72 5.018 4.32 6.388-.19.702-.687 2.55-.787 2.943-.123.488.18.481.379.35.156-.103 2.49-1.696 3.496-2.386.852.125 1.73.19 2.592.19 5.523 0 10-3.463 10-7.714S17.523 3 12 3z" />
                </svg>
                카카오로 계속하기
              </Button>
              {recentMethod === "kakao" && <RecentBadge />}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className={`relative ${recentMethod === "email" ? "mt-8" : ""}`}>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
              </Button>
              {recentMethod === "email" && <RecentBadge />}
            </div>
          </form>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>

          {isLogin && (
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowFindIdModal(true)}
                className="hover:text-primary hover:underline"
              >
                아이디 찾기
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(true)}
                className="hover:text-primary hover:underline"
              >
                비밀번호 찾기
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 아이디 찾기 모달 */}
      <Dialog open={showFindIdModal} onOpenChange={setShowFindIdModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>아이디 찾기</DialogTitle>
            <DialogDescription>
              회원가입 시 등록한 닉네임을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="find-nickname">닉네임</Label>
              <Input
                id="find-nickname"
                placeholder="닉네임 입력"
                value={findNickname}
                onChange={(e) => setFindNickname(e.target.value)}
              />
            </div>
            {foundEmail && (
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">찾은 이메일</p>
                <p className="font-medium">{foundEmail}</p>
              </div>
            )}
            <Button onClick={handleFindId} className="w-full" disabled={isLoading}>
              {isLoading ? "검색 중..." : "아이디 찾기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 찾기 모달 */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 찾기</DialogTitle>
            <DialogDescription>
              가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">이메일</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="example@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleResetPassword} className="w-full" disabled={isLoading}>
              {isLoading ? "발송 중..." : "재설정 링크 발송"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {currentUserId && (
        <NicknameSetupModal
          open={showNicknameModal}
          onComplete={handleNicknameComplete}
          userId={currentUserId}
        />
      )}
    </div>
  );
};

export default Auth;
