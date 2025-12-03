import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResultNotificationRequest {
  requesterEmail: string;
  requesterNickname: string;
  requestType: "MODIFY" | "DELETE";
  locationName: string;
  result: "approved" | "rejected";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requesterEmail, requesterNickname, requestType, locationName, result }: ResultNotificationRequest = await req.json();

    console.log("Sending result notification email:", {
      requesterEmail,
      requestType,
      locationName,
      result,
    });

    const requestTypeText = requestType === "MODIFY" ? "수정" : "삭제";
    const resultText = result === "approved" ? "승인" : "거절";
    const resultColor = result === "approved" ? "#22c55e" : "#ef4444";
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Wheelchair Route App <onboarding@resend.dev>",
        to: [requesterEmail],
        subject: `[휠체어 경로 앱] ${requestTypeText} 요청이 ${resultText}되었습니다`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; border-bottom: 2px solid ${resultColor}; padding-bottom: 10px;">
              ${requestTypeText} 요청 ${resultText}
            </h1>
            
            <p style="font-size: 16px; color: #333;">
              안녕하세요, ${requesterNickname}님!
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>요청 유형:</strong> ${requestTypeText} 요청</p>
              <p style="margin: 0 0 10px 0;"><strong>위치:</strong> ${locationName}</p>
              <p style="margin: 0;">
                <strong>처리 결과:</strong> 
                <span style="color: ${resultColor}; font-weight: bold;">${resultText}</span>
              </p>
            </div>
            
            ${result === "approved" 
              ? `<p style="color: #22c55e;">✅ 요청하신 ${requestTypeText}이(가) 성공적으로 처리되었습니다.</p>`
              : `<p style="color: #ef4444;">❌ 요청하신 ${requestTypeText}이(가) 관리자에 의해 거절되었습니다.</p>`
            }
            
            <div style="margin-top: 30px; padding: 15px; background: #4F46E5; border-radius: 8px; text-align: center;">
              <a href="https://qewzkjoyygyiygpymejj.lovable.app/my-requests" 
                 style="color: white; text-decoration: none; font-weight: bold;">
                내 요청 내역 확인하기
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
              이 이메일은 휠체어 경로 앱에서 자동으로 발송되었습니다.
            </p>
          </div>
        `,
      }),
    });

    const data = await emailResponse.json();
    console.log("Result notification email sent:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending result notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
