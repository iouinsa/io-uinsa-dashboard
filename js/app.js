// ============================================================
// APP — Inisialisasi & Navigasi
// ============================================================

import { supabase, requireLogin, logout } from './config.js';
import { showModal, closeModal, konfirmasi } from './utils.js';
import {
  loadMahasiswa, openDetailMahasiswa, openTambahMahasiswa,
  openEditMahasiswa, simpanMahasiswa, hapusMahasiswa,
  openImportCSV, downloadTemplateMhs, handleFileSelect,
  prosesImportMhs, setupMahasiswaDragDrop
} from './mahasiswa.js';
import {
  loadKerjasama, openTambahKerjasama, editKerjasama,
  simpanKerjasama, hapusKerjasama, openImportKerjasama,
  downloadTemplateKjs, handleFileSelectKjs, prosesImportKjs,
  setupKerjasamaDragDrop, previewDokumen, closePreviewDokumen
} from './kerjasama.js';
import { loadTempatTinggal } from './tempat-tinggal.js';
import {
  loadPenerima, openTambahPenerima, editPenerima,
  simpanPenerima, hapusPenerima
} from './penerima.js';

// ============================================================
// INIT
// ============================================================
const session = await requireLogin();

if (session) {
  // Set info user di topbar
  const email = session.user.email;
  document.getElementById('userEmail').textContent = email;
  document.getElementById('avatar').textContent = email.charAt(0).toUpperCase();
  
  // Ambil nama lengkap dari tabel users
  const { data: profile } = await supabase
    .from('users')
    .select('nama_lengkap')
    .eq('id', session.user.id)
    .maybeSingle();
  
  if (profile && profile.nama_lengkap) {
    document.getElementById('userName').textContent = profile.nama_lengkap;
  } else {
    document.getElementById('userName').textContent = email;
  }
  
  // Setup navigasi sidebar
  setupNavigasi();
  
  // Setup tombol logout
  document.getElementById('btnLogout').addEventListener('click', logout);
  
  // Setup drag & drop untuk import CSV
  setupMahasiswaDragDrop();
  setupKerjasamaDragDrop();
}

// ============================================================
// NAVIGASI SIDEBAR
// ============================================================
function setupNavigasi() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      
      // Update active state
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      
      // Load data sesuai halaman
      if (page === 'mahasiswa') loadMahasiswa();
      if (page === 'kerjasama') loadKerjasama();
      if (page === 'tempat_tinggal') loadTempatTinggal();
      if (page === 'penerima') loadPenerima();
    });
  });
}
