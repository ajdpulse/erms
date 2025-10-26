import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import CryptoJS from 'npm:crypto-js@4.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, encryptedPassword } = await req.json()

    if (!email || !encryptedPassword) {
      return new Response(
        JSON.stringify({ error: 'Email and encrypted password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Decrypt password using the same key as frontend
    const ENCRYPTION_KEY = 'ZP_CHANDRAPUR_2025_SECURE_KEY_!@#$%^&*()'
    
    let decryptedPassword
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY)
      decryptedPassword = bytes.toString(CryptoJS.enc.Utf8)
      
      if (!decryptedPassword) {
        throw new Error('Decryption failed')
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Password decryption failed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Supabase environment variables with fallbacks for WebContainer
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://tvmqkondihsomlebizjj.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing environment variables' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client for authentication
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Authenticate with decrypted password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: decryptedPassword,
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Invalid login credentials' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!authData.session || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed - no session created' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return session data
    return new Response(
      JSON.stringify({
        session: authData.session,
        user: authData.user,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Auth decrypt error:', error)
    return new Response(
      JSON.stringify({ error: 'Authentication failed - ' + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})