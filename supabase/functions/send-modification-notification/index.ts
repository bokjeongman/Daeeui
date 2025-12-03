import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requesterNickname: string;
  requestType: "MODIFY" | "DELETE";
  locationName: string;
  reason: string;
  proposedDetails?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requesterNickname, requestType, locationName, reason, proposedDetails }: NotificationRequest = await req.json();

    console.log("Sending notification email for modification request:", {
      requesterNickname,
      requestType,
      locationName,
    });

    const requestTypeText = requestType === "MODIFY" ? "수정" : "삭제";
    
    const emailResponse = await resend.emails.send({
      from: "Wheelchair Route App <onboarding@resend.dev>",
      to: ["songachon@gachon.ac.kr"],
      subject: `[휠체어 경로 앱] 새로운 ${requestTypeText} 요청이 접수되었습니다`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            새로운 ${requestTypeText} 요청
          </h1>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>요청자:</strong> ${requesterNickname}</p>
            <p style="margin: 0 0 10px 0;"><strong>요청 유형:</strong> ${requestTypeText} 요청</p>
            <p style="margin: 0 0 10px 0;"><strong>위치:</strong> ${locationName}</p>
          </div>
          
          <h3 style="color: #333;">요청 사유</h3>
          <p style="background: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
            ${reason}
          </p>
          
          ${proposedDetails ? `
            <h3 style="color: #333;">제안된 수정 내용</h3>
            <p style="background: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${proposedDetails}
            </p>
          ` : ''}
          
          <div style="margin-top: 30px; padding: 15px; background: #4F46E5; border-radius: 8px; text-align: center;">
            <a href="https://qewzkjoyygyiygpymejj.lovable.app/admin" 
               style="color: white; text-decoration: none; font-weight: bold;">
              관리자 페이지에서 확인하기
            </a>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            이 이메일은 휠체어 경로 앱에서 자동으로 발송되었습니다.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
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
