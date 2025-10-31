import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvmqkondihsomlebizjj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bXFrb25kaWhzb21sZWJpempqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTQ0NjcsImV4cCI6MjA2OTI3MDQ2N30.W1fSD_RLJjcsIoJhJDnE6Xri9AIxv5DuAlN65iqI6BE';

const configErrors: string[] = [];
if (!supabaseUrl) configErrors.push('Missing VITE_SUPABASE_URL');
if (!supabaseAnonKey) configErrors.push('Missing VITE_SUPABASE_ANON_KEY');

// Main client for public schema (auth, roles, permissions)
export const supabase = configErrors.length === 0
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      },
    })
  : null;

// ERMS-specific client for erms schema
export const ermsClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'erms'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  },
});

// Test function to verify ERMS connection
export const testERMSConnection = async () => {
  try {
    const { data: { user }, error: userError } = await supabase?.auth.getUser();
    if (userError) {
      await supabase?.auth.signOut();
    } else if (user) {
      // User info available
    }

    console.log('🔍 Checking auth.users table access...');
    const { data: authUsers, error: authError } = await supabase
      ?.from('users')
      .select('*')
      .limit(1);

    const { data: userRoles, error: rolesError } = await supabase
      ?.from('user_roles')
      .select('*')
      .limit(1);

    if (rolesError) {
      console.log('❌ Error accessing user_roles:', rolesError.message);
    } else {
      console.log('✅ User roles table structure:', userRoles);
    }

    console.log('🧪 Step 1: Testing basic connection...');
    const { data: sessionData, error: sessionError } = await supabase?.auth.getSession();

    if (sessionError) {
      await supabase?.auth.signOut();
      console.error('❌ Basic connection failed:', sessionError);
      return { success: false, error: `Basic connection failed: ${sessionError.message}`, data: null };
    }

  } catch (error) {
    try {
      await supabase?.auth.signOut();
    } catch (signOutError) {
      // Silent catch
    }
    console.error('❌ Error in testConnection:', error);
    return { success: false, error: error.message, data: null };
  }
};

// Export configuration status for components to check
export const isSupabaseConfigured = configErrors.length === 0;
export const supabaseConfigErrors = configErrors;