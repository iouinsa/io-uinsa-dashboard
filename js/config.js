// ============================================================
// KONFIGURASI SUPABASE
// ============================================================
// File ini menyimpan koneksi ke Supabase.
// Jangan ubah kecuali kamu tahu apa yang kamu lakukan.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://kkxovkdrzhthalpchmfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreG92a2Ryemh0aGFscGNobWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1ODgsImV4cCI6MjEwNjE5OTU4OH0.PvLnlGIs6PEn-oUoDi25_szVJxdcGtQqftaLyonSfNA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ============================================================
// SESSION HELPER
// ============================================================
// Cek apakah user sudah login. Kalau belum, redirect ke login.

export async function requireLogin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

// ============================================================
// LOGOUT
// ============================================================
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}