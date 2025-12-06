import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure, unpredictable password using server-side secrets
function generateSecurePassword(kakaoId: string): string {
  const clientSecret = Deno.env.get('KAKAO_CLIENT_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Combine multiple server-side secrets with kakaoId for unpredictable password
  const combined = `${kakaoId}_${clientSecret}_${serviceRoleKey?.slice(-16)}`;
  
  // Create a hash-like string (using base64 encoding of the combined string)
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `kakao_secure_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const kakaoClientId = Deno.env.get('KAKAO_CLIENT_ID') || 'dc0db09ad3ab9f29fed146728402f08a';
    const kakaoClientSecret = Deno.env.get('KAKAO_CLIENT_SECRET');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoClientId,
        client_secret: kakaoClientSecret || '',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Kakao token error:', tokenData);
      return new Response(
        JSON.stringify({ error: 'Failed to get Kakao access token', details: tokenData.error_description }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info from Kakao
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    const kakaoEmail = userData.kakao_account?.email;
    const kakaoId = userData.id;
    const kakaoNickname = userData.properties?.nickname || userData.kakao_account?.profile?.nickname;

    if (!kakaoEmail) {
      return new Response(
        JSON.stringify({ error: 'Email not provided by Kakao account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure password server-side
    const securePassword = generateSecurePassword(kakaoId.toString());

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists by trying to get their profile
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', kakaoEmail)
      .limit(1);

    let userId: string;
    let isNewUser = false;

    if (existingProfiles && existingProfiles.length > 0) {
      // Existing user - update their password to the new secure one
      userId = existingProfiles[0].id;
      
      // Update user's password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: securePassword,
      });

      if (updateError) {
        console.error('Error updating user password:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to authenticate existing user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // New user - create account
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: kakaoEmail,
        password: securePassword,
        email_confirm: true,
        user_metadata: {
          provider: 'kakao',
          kakao_id: kakaoId,
        },
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError);
        
        // If user already exists with different auth method
        if (signUpError.message?.includes('already been registered')) {
          return new Response(
            JSON.stringify({ error: 'This email is already registered with a different login method' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = signUpData.user!.id;
      isNewUser = true;

      // Set nickname if available
      if (kakaoNickname) {
        await supabase
          .from('profiles')
          .update({ nickname: kakaoNickname })
          .eq('id', userId);
      }
    }

    // Return credentials for client-side sign in
    return new Response(
      JSON.stringify({
        email: kakaoEmail,
        password: securePassword,
        isNewUser,
        kakaoNickname,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Kakao auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
