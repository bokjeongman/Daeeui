import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: '이미지가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI 서비스 설정이 필요합니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing accessibility from image...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `당신은 건물/장소의 접근성 시설을 분석하는 전문가입니다.
이미지를 분석하여 다음 5가지 접근성 항목을 확인해주세요:

1. has_ramp (경사로): 휠체어 접근 가능한 경사로가 있는지
2. has_elevator (엘리베이터): 엘리베이터나 승강기가 보이는지
3. has_accessible_restroom (장애인 화장실): 장애인 화장실 표시나 시설이 있는지
4. has_low_threshold (턱/단차): 출입구나 바닥에 턱이나 단차가 있는지 (있으면 true)
5. has_wide_door (넓은 출입문): 휠체어가 통과할 수 있을 정도로 넓은 문이 있는지

반드시 다음 JSON 형식으로만 응답하세요:
{
  "has_ramp": true/false/null,
  "has_elevator": true/false/null,
  "has_accessible_restroom": true/false/null,
  "has_low_threshold": true/false/null,
  "has_wide_door": true/false/null,
  "confidence": "high"/"medium"/"low",
  "description": "분석 내용 설명 (한국어)"
}

확인할 수 없는 항목은 null로 표시하세요.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '이 이미지에서 접근성 시설을 분석해주세요.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 사용량이 초과되었습니다.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'AI 응답을 받지 못했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonStr = content.replace(/```\n?/g, '');
      }
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: '분석 결과를 처리할 수 없습니다.',
          raw: content 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-accessibility:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
