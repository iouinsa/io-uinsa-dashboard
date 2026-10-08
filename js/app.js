// ============================================================
// APP — Inisialisasi & Navigasi
// ============================================================

import { supabase, requireLogin, logout } from './config.js';
import { showModal, closeModal, konfirmasi } from './utils.js';
import { loadDashboard } from './dashboard.js';
import {
  loadMahasiswa, openDetailMahasiswa, openTambahMahasiswa,
  openEditMahasiswa, simpanMahasiswa, hapusMahasiswa,
  openImportCSV, downloadTemplateMhs, handleFileSelect,
  prosesImportMhs, setupMahasiswaDragDrop,
  previewDokumen, closePreviewDokumen, searchMahasiswa, setFilterStatus,
  exportCSVMahasiswa
} from './mahasiswa.js';
import {
  loadKerjasama, openTambahKerjasama, editKerjasama,
  simpanKerjasama, hapusKerjasama, openImportKerjasama,
  downloadTemplateKjs, handleFileSelectKjs, prosesImportKjs,
  setupKerjasamaDragDrop, searchKerjasama
} from './kerjasama.js';
import {
  loadTempatTinggal, searchTempatTinggal, editTempatTinggal,
  simpanTempatTinggal, toggleKamarField
} from './tempat-tinggal.js';
import {
  loadPenerima, openTambahPenerima, editPenerima,
  simpanPenerima, hapusPenerima, searchPenerima,
  openBuatAkun, prosesBuatAkun, hapusAkunPenerima
} from './penerima.js';
import { loadReminder } from './reminder.js';

// ============================================================
// INIT
// ============================================================
const session = await requireLogin();

if (session) {
  const email = session.user.email;
  document.getElementById('userEmail').textContent = email;
  document.getElementById('avatar').textContent = email.charAt(0).toUpperCase();
  
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
  
  setupNavigasi();
  
  document.getElementById('btnLogout').addEventListener('click', logout);
  
  setupMahasiswaDragDrop();
  setupKerjasamaDragDrop();
  
  // Load dashboard pertama kali
  loadDashboard();
}

// ============================================================
// NAVIGASI SIDEBAR
// ============================================================
function setupNavigasi() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      
      if (page === 'dashboard') loadDashboard();
      if (page === 'mahasiswa') loadMahasiswa();
      if (page === 'kerjasama') loadKerjasama();
      if (page === 'tempat_tinggal') loadTempatTinggal();
      if (page === 'reminder') loadReminder();
      if (page === 'penerima') loadPenerima();
    });
  });
}
