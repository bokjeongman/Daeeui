import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { z } from "zod";

const nicknameSchema = z.string()
  .min(1, "닉네임을 입력해주세요.")
  .max(8, "닉네임은 8자 이하여야 합니다.")
  .regex(/^[가-힣a-zA-Z0-9]+$/, "한글, 영어, 숫자만 사용할 수 있습니다.");

interface NicknameSetupModalProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

const NicknameSetupModal = ({ open, onComplete, userId }: NicknameSetupModalProps) => {
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkNicknameAvailability = async (value: string) => {
    if (!value || value.length === 0) {
      setIsAvailable(null);
      return;
    }

    try {
      nicknameSchema.parse(value);
    } catch {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      // Use the secure function to check nickname availability
      const { data, error } = await supabase.rpc("check_nickname_exists", {
        check_nickname: value,
      });

      if (error) throw error;
      setIsAvailable(!data); // data is true if nickname exists, so we invert it
    } catch (error) {
      if (import.meta.env.DEV) console.error("닉네임 확인 실패:", error);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    setIsAvailable(null);
  };

  const handleCheckClick = () => {
    checkNicknameAvailability(nickname);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      nicknameSchema.parse(nickname);
    } catch (error: any) {
      toast.error(error.errors[0].message);
      return;
    }

    if (isAvailable !== true) {
      toast.error("닉네임 중복 확인을 해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname })
        .eq("id", userId);

      if (error) {
        if (error.code === "23505") {
          toast.error("이미 사용 중인 닉네임입니다.");
          setIsAvailable(false);
        } else {
          throw error;
        }
        return;
      }

      toast.success("닉네임이 설정되었습니다!");
      onComplete();
    } catch (error) {
      if (import.meta.env.DEV) console.error("닉네임 설정 실패:", error);
      toast.error("닉네임 설정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>닉네임 설정</DialogTitle>
          <DialogDescription>
            서비스에서 사용할 닉네임을 설정해주세요. (최대 8자)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <div className="flex gap-2">
              <Input
                id="nickname"
                placeholder="닉네임 입력"
                value={nickname}
                onChange={handleNicknameChange}
                maxLength={8}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCheckClick}
                disabled={isChecking || !nickname}
              >
                {isChecking ? "확인 중..." : "중복확인"}
              </Button>
            </div>
            {isAvailable === true && (
              <p className="text-sm text-green-600">사용 가능한 닉네임입니다.</p>
            )}
            {isAvailable === false && (
              <p className="text-sm text-destructive">이미 사용 중인 닉네임입니다.</p>
            )}
            <p className="text-xs text-muted-foreground">
              한글, 영어, 숫자만 사용 가능 (최대 8자)
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isAvailable !== true}
          >
            {isLoading ? "설정 중..." : "설정 완료"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NicknameSetupModal;
