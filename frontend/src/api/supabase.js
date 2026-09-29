import { createClient } from '@supabase/supabase-js';

// Supabase configuration - reads from Vite env variables or falls back to provided project instance
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ujnatjiitgnexckofdvy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbmF0amlpdGduZXhja29mZHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NjkxMTYsImV4cCI6MjEwNjE0NTExNn0.-FBIIMzF3UZuQCdaIuJYztfVs_UgjpiM40mvD2FoXdY';

let supabaseClient = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
} catch (e) {
  console.warn('Supabase client initialization notice:', e);
}

export const supabase = supabaseClient;

// Helper to verify if live Supabase instance is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseClient && supabaseUrl && supabaseAnonKey);
};
