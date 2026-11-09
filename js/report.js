// ============================================================
// REPORT — Generate Laporan Resmi
// ============================================================

import { supabase } from './config.js';
import { formatTanggal, hitungStatusKerjasama, hitungSemester } from './utils.js';

// ============================================================
// INIT & PARAMETER URL
// ============================================================
const params = new URLSearchParams(window.location.search);
const jenis = params.get('jenis') || 'mahasiswa';
const filterStatus = params.get('status') || 'semua';
const filterSearch = params.get('search') || '';
const filterJenisTinggal = params.get('jenis_tinggal') || 'semua';

// Set tanggal cetak
document.getElementById('tanggalCetak').textContent = 
  new Intl.DateTimeFormat('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  }).format(new Date());

// ============================================================
// ROUTING LAPORAN BERDASARKAN URL
// ============================================================
if (jenis === 'mahasiswa') {
  loadLaporanMahasiswa();
} else if (jenis === 'kerjasama') {
  // Tampilkan tombol filter kerjasama
  const filterBar = document.getElementById('filterKerjasamaBar');
  if (filterBar) filterBar.style.display = 'flex';
  
  // Panggil fungsi awal dengan status 'semua'
  loadLaporanKerjasama('semua');
} else if (jenis === 'tempat_tinggal') {
  loadLaporanTempatTinggal();
} else {
  document.getElementById('kontenLaporan').innerHTML = '<p>Jenis laporan tidak dikenali.</p>';
}

// ============================================================
// LAPORAN MAHASISWA
// ============================================================
async function loadLaporanMahasiswa() {
  document.getElementById('judulLaporan').textContent = 'LAPORAN DATA MAHASISWA INTERNASIONAL';
  
  let query = supabase
    .from('mahasiswa')
    .select('nim, nama, jenis_kelamin, jenjang, fakultas, prodi, tahun_masuk, warga_negara, email_kampus, status')
    .order('nim');
  
  if (filterStatus !== 'semua') {
    query = query.eq('status', filterStatus);
  }
  
  const { data, error } = await query;
  
  if (error) {
    document.getElementById('kontenLaporan').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    return;
  }
  
  let filtered = data || [];
  if (filterSearch.trim()) {
    const q = filterSearch.toLowerCase().trim();
    filtered = filtered.filter(m => 
      (m.nim || '').toLowerCase().includes(q) ||
      (m.nama || '').toLowerCase().includes(q) ||
      (m.warga_negara || '').toLowerCase().includes(q) ||
      (m.fakultas || '').toLowerCase().includes(q) ||
      (m.prodi || '').toLowerCase().includes(q)
    );
  }
  
  // Hitung statistik per status
  const total = filtered.length;
  const aktif = filtered.filter(m => m.status === 'Aktif').length;
  const cuti = filtered.filter(m => m.status === 'Cuti').length;
  const alumni = filtered.filter(m => m.status === 'Alumni').length;
  const dropOut = filtered.filter(m => m.status === 'Drop Out').length;
  const mengundurkanDiri = filtered.filter(m => m.status === 'Mengundurkan Diri').length;
  
  // Tabel
  let html = `
    <table class="tabel-laporan">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th style="width:80px;">NIM</th>
          <th>Nama</th>
          <th style="width:40px;">L/P</th>
          <th style="width:50px;">Jenjang</th>
          <th>Fakultas</th>
          <th>Prodi</th>
          <th style="width:60px;">Angkatan</th>
          <th>Negara</th>
          <th style="width:70px;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (filtered.length === 0) {
    html += `<tr><td colspan="10" style="text-align:center; padding:20px; font-style:italic; color:#666;">Belum ada data.</td></tr>`;
  } else {
    filtered.forEach((m, i) => {
      html += `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${m.nim || '—'}</td>
          <td>${m.nama || '—'}</td>
          <td class="center">${m.jenis_kelamin || '—'}</td>
          <td class="center">${m.jenjang || '—'}</td>
          <td>${m.fakultas || '—'}</td>
          <td>${m.prodi || '—'}</td>
          <td class="center">${m.tahun_masuk || '—'}</td>
          <td>${m.warga_negara || '—'}</td>
          <td class="center">${m.status || 'Aktif'}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table>`;
  
  html += `
    <div class="ringkasan">
      <strong>Total: ${total} mahasiswa</strong>
      · Aktif: ${aktif}
      · Cuti: ${cuti}
      · Alumni: ${alumni}
      · Drop Out: ${dropOut}
      · Mengundurkan Diri: ${mengundurkanDiri}
    </div>
  `;
  
  document.getElementById('kontenLaporan').innerHTML = html;
}

// ============================================================
// LAPORAN KERJASAMA (DENGAN FILTER STATUS & JENIS)
// ============================================================
async function loadLaporanKerjasama(statusFilter = 'semua') {
  document.getElementById('judulLaporan').textContent = 'LAPORAN KERJA SAMA INTERNASIONAL';
  
  const { data, error } = await supabase
    .from('kerjasama')
    .select('*')
    .order('tanggal_mulai', { ascending: false });
  
  if (error) {
    document.getElementById('kontenLaporan').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    return;
  }
  
  let filtered = data || [];
  
  // 1. Filter Pencarian (dari URL)
  if (filterSearch.trim()) {
    const q = filterSearch.toLowerCase().trim();
    filtered = filtered.filter(k => 
      (k.kampus || '').toLowerCase().includes(q) ||
      (k.negara || '').toLowerCase().includes(q) ||
      (k.jenis || '').toLowerCase().includes(q) ||
      (k.unit_fakultas || '').toLowerCase().includes(q)
    );
  }

  // 2. Filter Status / Jenis (dari tombol yang diklik)
  if (statusFilter !== 'semua') {
    filtered = filtered.filter(k => {
      // Cek apakah filter berupa Status
      if (['aktif', 'berakhir'].includes(statusFilter)) {
        const st = hitungStatusKerjasama(k.tanggal_berakhir);
        if (statusFilter === 'aktif') return st === 'Aktif';
        if (statusFilter === 'berakhir') return st === 'Berakhir';
      }
      
      // Cek apakah filter berupa Jenis Dokumen (MoU, MoA, LoI, LoC)
      const jenis = (k.jenis || '').toUpperCase();
      if (statusFilter === 'mou' && jenis === 'MOU') return true;
      if (statusFilter === 'moa' && jenis === 'MOA') return true;
      if (statusFilter === 'loi' && jenis === 'LOI') return true;
      if (statusFilter === 'loc' && jenis === 'LOC') return true;

      return false;
    });
  }
  
  const total = filtered.length;
  let aktif = 0, akanBerakhir = 0, berakhir = 0;
  let mou = 0, moa = 0, loi = 0, loc = 0;
  
  filtered.forEach(k => {
    const st = hitungStatusKerjasama(k.tanggal_berakhir);
    if (st === 'Aktif') aktif++;
    else if (st === 'Akan Berakhir') akanBerakhir++;
    else if (st === 'Berakhir') berakhir++;
    
    const j = (k.jenis || '').toUpperCase();
    if (j === 'MOU') mou++;
    else if (j === 'MOA') moa++;
    else if (j === 'LOI') loi++;
    else if (j === 'LOC') loc++;
  });
  
  let html = `
    <table class="tabel-laporan">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th>Nama Kampus / Institusi</th>
          <th>Negara</th>
          <th style="width:80px;">Jenis</th>
          <th style="width:80px;">Mulai</th>
          <th style="width:80px;">Berakhir</th>
          <th style="width:70px;">Status</th>
          <th>Unit / Fakultas</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (filtered.length === 0) {
    html += `<tr><td colspan="8" style="text-align:center; padding:20px; font-style:italic; color:#666;">Belum ada data.</td></tr>`;
  } else {
    filtered.forEach((k, i) => {
      const st = hitungStatusKerjasama(k.tanggal_berakhir);
      html += `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${k.kampus || '—'}</td>
          <td>${k.negara || '—'}</td>
          <td class="center">${k.jenis || '—'}</td>
          <td class="center">${k.tanggal_mulai ? formatTanggal(k.tanggal_mulai) : '—'}</td>
          <td class="center">${k.tanggal_berakhir ? formatTanggal(k.tanggal_berakhir) : '—'}</td>
          <td class="center">${st}</td>
          <td>${k.unit_fakultas || '—'}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table>`;
  
  html += `
    <div class="ringkasan">
      <strong>Total: ${total} kerja sama</strong>
      · Aktif: ${aktif}
      · Akan Berakhir: ${akanBerakhir}
      · Berakhir: ${berakhir}
      <br>
      <strong>Jenis Dokumen:</strong>
      · MoU: ${mou}
      · MoA: ${moa}
      · LoI: ${loi}
      · LoC: ${loc}
    </div>
  `;
  
  document.getElementById('kontenLaporan').innerHTML = html;
}

// ============================================================
// LAPORAN TEMPAT TINGGAL
// ============================================================
async function loadLaporanTempatTinggal() {
  document.getElementById('judulLaporan').textContent = 'LAPORAN TEMPAT TINGGAL MAHASISWA INTERNASIONAL';
  
  const { data: mhsData, error } = await supabase
    .from('mahasiswa')
    .select('id, nim, nama, fakultas, jenis_tinggal, no_kamar, status')
    .in('status', ['Aktif', 'Cuti'])
    .order('nama');
  
  if (error) {
    document.getElementById('kontenLaporan').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    return;
  }
  
  const { data: kontakData } = await supabase
    .from('mahasiswa_kontak')
    .select('mahasiswa_id, alamat_sekarang');
  
  const alamatMap = {};
  (kontakData || []).forEach(k => { alamatMap[k.mahasiswa_id] = k.alamat_sekarang || ''; });
  
  let filtered = (mhsData || []).map(m => ({
    nim: m.nim,
    nama: m.nama || '(Tanpa Nama)',
    fakultas: m.fakultas || '—',
    alamat: alamatMap[m.id] || '—',
    jenis_tinggal: m.jenis_tinggal || 'Lainnya',
    no_kamar: m.no_kamar || null
  }));
  
  if (filterJenisTinggal !== 'semua') {
    filtered = filtered.filter(t => t.jenis_tinggal === filterJenisTinggal);
  }
  
  if (filterSearch.trim()) {
    const q = filterSearch.toLowerCase().trim();
    filtered = filtered.filter(t => 
      (t.nama || '').toLowerCase().includes(q) ||
      (t.nim || '').toLowerCase().includes(q) ||
      (t.alamat || '').toLowerCase().includes(q) ||
      (t.jenis_tinggal || '').toLowerCase().includes(q)
    );
  }
  
  const counts = {};
  filtered.forEach(t => { counts[t.jenis_tinggal] = (counts[t.jenis_tinggal] || 0) + 1; });
  
  let html = `
    <table class="tabel-laporan">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th style="width:80px;">NIM</th>
          <th>Nama</th>
          <th>Fakultas</th>
          <th>Alamat Sekarang</th>
          <th style="width:90px;">Jenis Tinggal</th>
          <th style="width:70px;">No. Kamar</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (filtered.length === 0) {
    html += `<tr><td colspan="7" style="text-align:center; padding:20px; font-style:italic; color:#666;">Belum ada data.</td></tr>`;
  } else {
    filtered.forEach((t, i) => {
      html += `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${t.nim || '—'}</td>
          <td>${t.nama || '—'}</td>
          <td>${t.fakultas || '—'}</td>
          <td>${t.alamat || '—'}</td>
          <td class="center">${t.jenis_tinggal}</td>
          <td class="center">${t.no_kamar || '—'}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table>`;
  
  let statsHtml = `<div class="ringkasan"><strong>Total: ${filtered.length} mahasiswa</strong>`;
  Object.entries(counts).forEach(([k, v]) => {
    statsHtml += ` · ${k}: ${v}`;
  });
  statsHtml += `</div>`;
  
  html += statsHtml;
  
  document.getElementById('kontenLaporan').innerHTML = html;
}

// ============================================================
// FUNGSI FILTER TOMBOL KERJASAMA (TANPA RELOAD)
// ============================================================
window.filterLaporanKjs = function(status) {
  // 1. Ubah gaya tombol agar yang aktif berwarna hijau dan teksnya putih
  document.querySelectorAll('#filterKerjasamaBar .filter-status-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.background = '#fff';
    btn.style.color = '#1a2332'; 
    btn.style.borderColor = '#e2e8f0';
    
    if (btn.dataset.status === status) {
      btn.classList.add('active');
      btn.style.background = '#0a5c4a';
      btn.style.color = '#fff'; 
      btn.style.borderColor = '#0a5c4a';
    }
  });

  // 2. Panggil ulang fungsinya dengan parameter filter
  loadLaporanKerjasama(status);
};
