import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Share, Plus, MoreVertical, Smartphone, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold truncate">앱 설치 안내</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-safe">
        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                <Download className="h-5 w-5" />
                이미 설치됨
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                휠체어 경로 안내 앱이 이미 설치되어 있습니다. 홈 화면에서 앱을 실행할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">앱처럼 사용하기</CardTitle>
                <CardDescription>
                  휠체어 경로 안내를 홈 화면에 추가하면 앱처럼 빠르게 실행할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deferredPrompt && (
                  <Button
                    onClick={handleInstallClick}
                    className="w-full h-12 text-base touch-manipulation active:scale-[0.98]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    지금 설치하기
                  </Button>
                )}
              </CardContent>
            </Card>

            {isIOS && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    iPhone / iPad 설치 방법
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Safari에서 열기</p>
                      <p className="text-sm text-muted-foreground">
                        이 페이지를 Safari 브라우저에서 열어주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        공유 버튼 탭
                        <Share className="h-4 w-4" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        화면 하단의 공유 버튼을 탭하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        "홈 화면에 추가" 선택
                        <Plus className="h-4 w-4" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        스크롤하여 "홈 화면에 추가"를 찾아 탭하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">"추가" 탭</p>
                      <p className="text-sm text-muted-foreground">
                        오른쪽 상단의 "추가" 버튼을 탭하면 완료!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAndroid && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Android 설치 방법
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Chrome에서 열기</p>
                      <p className="text-sm text-muted-foreground">
                        이 페이지를 Chrome 브라우저에서 열어주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        메뉴 버튼 탭
                        <MoreVertical className="h-4 w-4" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        오른쪽 상단의 점 3개 메뉴를 탭하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">"앱 설치" 또는 "홈 화면에 추가" 선택</p>
                      <p className="text-sm text-muted-foreground">
                        메뉴에서 해당 옵션을 찾아 탭하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">"설치" 탭</p>
                      <p className="text-sm text-muted-foreground">
                        확인 창에서 "설치"를 탭하면 완료!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isIOS && !isAndroid && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    데스크톱 설치 방법
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Chrome 또는 Edge에서 열기</p>
                      <p className="text-sm text-muted-foreground">
                        이 페이지를 지원되는 브라우저에서 열어주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">주소창의 설치 아이콘 클릭</p>
                      <p className="text-sm text-muted-foreground">
                        주소창 오른쪽에 있는 설치 아이콘을 클릭하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">"설치" 클릭</p>
                      <p className="text-sm text-muted-foreground">
                        확인 창에서 "설치"를 클릭하면 완료!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">앱 설치의 장점</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                홈 화면에서 바로 실행
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                전체 화면으로 사용
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                더 빠른 로딩 속도
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                오프라인에서도 일부 기능 사용 가능
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Install;
