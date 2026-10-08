// ============================================================
// REMINDER — Monitoring Dokumen Mahasiswa Asing (≤ 90 hari)
// ============================================================

import { supabase } from './config.js';

const BATAS_HARI = 90;

// ============================================================
// LOAD REMINDER
// ============================================================
export async function loadReminder() {
  // Tampilkan loading dulu
  const loadingHtml = '<div style="padding:20px;text-align:center;color:#6b7280;font-style:italic;">Memuat data...</div>';
  document.getElementById('tabelPaspor').innerHTML = loadingHtml;
  document.getElementById('tabelItas').innerHTML = loadingHtml;
  document.getElementById('tabelStm').innerHTML = loadingHtml;
  document.getElementById('tabelSktt').innerHTML = loadingHtml;
  
  // Ambil data dokumen + mahasiswa
  const { data, error } = await supabase
    .from('mahasiswa_dokumen')
    .select(`
      masa_berlaku_paspor,
      masa_berlaku_itas,
      masa_berlaku_skj_stm,
      masa_berlaku_sktt,
      mahasiswa:mahasiswa_id (nama, nim, fakultas, status, mode_kuliah)
    `);
  
  if (error) {
    const errHtml = `<div style="padding:20px;text-align:center;color:#c0392b;">Error: ${error.message}</div>`;
    document.getElementById('tabelPaspor').innerHTML = errHtml;
    document.getElementById('tabelItas').innerHTML = errHtml;
    document.getElementById('tabelStm').innerHTML = errHtml;
    document.getElementById('tabelSktt').innerHTML = errHtml;
    return;
  }
  
  // Filter & kelompokkan
  const listPaspor = [];
  const listItas = [];
  const listStm = [];
  const listSktt = [];
  
  (data || []).forEach(d => {
    if (!d.mahasiswa) return;
    
    const mhs = d.mahasiswa;
    
    // Hanya mahasiswa Aktif
    const statusMhs = (mhs.status || '').trim();
    if (statusMhs !== 'Aktif') return;
    
    // Skip mahasiswa Online (PJJ)
    const modeKuliah = (mhs.mode_kuliah || 'Offline').trim();
    if (modeKuliah === 'Online') return;
    
    const infoMhs = {
      nama: mhs.nama || '-',
      nim: mhs.nim || '-',
      fakultas: mhs.fakultas || '-'
    };
    
    // Cek tiap dokumen
    const cekDokumen = (tglStr) => {
      if (!tglStr) return null;
      const sisa = hitungSisaHari(tglStr);
      if (sisa === null) return null;
      if (sisa > BATAS_HARI) return null;
      return {
        ...infoMhs,
        tglExpired: tglStr,
        sisaHari: sisa,
        kategori: getKategori(sisa),
        statusLabel: getStatusLabel(sisa)
      };
    };
    
    const p = cekDokumen(d.masa_berlaku_paspor);
    if (p) listPaspor.push(p);
    
    const i = cekDokumen(d.masa_berlaku_itas);
    if (i) listItas.push(i);
    
    const s = cekDokumen(d.masa_berlaku_skj_stm);
    if (s) listStm.push(s);
    
    const k = cekDokumen(d.masa_berlaku_sktt);
    if (k) listSktt.push(k);
  });
  
  // Sort per list
  sortList(listPaspor);
  sortList(listItas);
  sortList(listStm);
  sortList(listSktt);
  
  // Render
  renderTabel('Paspor', listPaspor);
  renderTabel('Itas', listItas);
  renderTabel('Stm', listStm);
  renderTabel('Sktt', listSktt);
}

// ============================================================
// SORT — EXPIRED dulu, baru URGENT, PERHATIAN
// ============================================================
function sortList(list) {
  const urutan = { 'EXPIRED': 1, 'URGENT': 2, 'PERHATIAN': 3 };
  list.sort((a, b) => {
    const uA = urutan[a.kategori] || 99;
    const uB = urutan[b.kategori] || 99;
    if (uA !== uB) return uA - uB;
    return a.sisaHari - b.sisaHari;
  });
}

// ============================================================
// HITUNG SISA HARI
// ============================================================
function hitungSisaHari(tglStr) {
  if (!tglStr) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(tglStr);
  target.setHours(0, 0, 0, 0);
  
  if (isNaN(target.getTime())) return null;
  
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

// ============================================================
// KATEGORI
// ============================================================
function getKategori(sisaHari) {
  if (sisaHari < 0) return 'EXPIRED';
  if (sisaHari <= 7) return 'URGENT';
  if (sisaHari <= 30) return 'PERHATIAN';
  return 'AMAN';
}

function getStatusLabel(sisaHari) {
  if (sisaHari < 0) return `EXPIRED (${Math.abs(sisaHari)} hari lalu)`;
  if (sisaHari === 0) return 'EXPIRED HARI INI';
  if (sisaHari <= 7) return `URGENT (${sisaHari} hari lagi)`;
  if (sisaHari <= 30) return `PERHATIAN (${sisaHari} hari lagi)`;
  return `AMAN (${sisaHari} hari lagi)`;
}

// ============================================================
// FORMAT TANGGAL → 1 Agustus 2023
// ============================================================
function formatTanggal(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTabel(key, list) {
  const container = document.getElementById('tabel' + key);
  const counter = document.getElementById('count' + key);
  
  if (!container) return;
  
  // Update counter
  if (counter) {
    if (list.length === 0) {
      counter.textContent = 'Aman';
      counter.style.color = '#16a34a';
    } else {
      counter.textContent = `${list.length} dokumen`;
      counter.style.color = '';
    }
  }
  
  // Kalau kosong — tampil "Aman"
  if (list.length === 0) {
    container.innerHTML = `
      <div style="padding:32px 20px; text-align:center;">
        <div style="font-size:48px; margin-bottom:12px;">✅</div>
        <div style="font-size:16px; font-weight:700; color:#16a34a; margin-bottom:4px;">Aman</div>
        <div style="font-size:13px; color:#6b7280;">Tidak ada dokumen yang mendekati masa berakhir (≤ 90 hari)</div>
      </div>
    `;
    return;
  }
  
  // Ada data — tampilkan tabel
  const rows = list.map((d, i) => {
    let bgColor = '#ffffff';
    let statusColor = '#6b7280';
    
    if (d.kategori === 'EXPIRED') {
      bgColor = '#fef2f2';
      statusColor = '#dc2626';
    } else if (d.kategori === 'URGENT') {
      bgColor = '#fef3c7';
      statusColor = '#d97706';
    } else if (d.kategori === 'PERHATIAN') {
      bgColor = '#fef9c3';
      statusColor = '#ca8a04';
    }
    
    return `<tr style="background:${bgColor};">
      <td style="text-align:center; width:40px;">${i + 1}</td>
      <td><strong>${d.nama}</strong></td>
      <td>${d.nim}</td>
      <td>${d.fakultas}</td>
      <td style="text-align:center;">${formatTanggal(d.tglExpired)}</td>
      <td style="text-align:center;">${d.sisaHari} hari</td>
      <td style="text-align:center; color:${statusColor}; font-weight:600;">${d.statusLabel}</td>
    </tr>`;
  }).join('');
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th style="text-align:center; width:40px;">No</th>
          <th>Nama Mahasiswa</th>
          <th style="width:100px;">NIM</th>
          <th style="width:140px;">Fakultas</th>
          <th style="text-align:center; width:120px;">Tgl Berakhir</th>
          <th style="text-align:center; width:80px;">Sisa Hari</th>
          <th style="text-align:center; width:180px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadReminder = loadReminder;
