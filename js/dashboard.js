// ============================================================
// DASHBOARD — Grafik & Ringkasan
// ============================================================

import { supabase } from './config.js';
import { hitungSemester } from './utils.js';

// Warna palette
const COLORS = {
  primary: '#0a5c4a',
  green: '#1e7a4d',
  blue: '#2563eb',
  orange: '#d4a017',
  red: '#a03a2a',
  gray: '#6b7280',
  palette: [
    '#0a5c4a', '#1e7a4d', '#2563eb', '#d4a017', '#a03a2a',
    '#6b7280', '#7c3aed', '#db2777', '#0891b2', '#65a30d',
    '#ea580c', '#0284c7', '#9333ea', '#be123c', '#15803d'
  ]
};

// Chart instances
let charts = {};

// ============================================================
// LOAD DASHBOARD
// ============================================================
export async function loadDashboard() {
  const [
    mhsData, kerjasamaData, kamarData, dokumenData
  ] = await Promise.all([
    supabase.from('mahasiswa').select('id, nim, nama, warga_negara, fakultas, jenjang, tahun_masuk, status, jenis_tinggal'),
    supabase.from('kerjasama').select('id, kampus, negara, jenis, tanggal_berakhir, tanggal_mulai'),
    supabase.from('kamar_mahad').select('id, no_kamar, kapasitas, terisi'),
    supabase.from('mahasiswa_dokumen').select('mahasiswa_id, masa_berlaku_itas, masa_berlaku_paspor')
  ]);
  
  const mhs = mhsData.data || [];
  const kjs = kerjasamaData.data || [];
  const kamar = kamarData.data || [];
  const dokumen = dokumenData.data || [];
  
  renderSummary(mhs, kjs, kamar);
  renderReminder(mhs, kjs, dokumen);
  
  renderChartNegara(mhs);
  renderChartFakultas(mhs);
  renderChartStatus(mhs);
  renderChartJenjang(mhs);
  renderChartKerjasamaNegara(kjs);
  renderChartJenisKerjasama(kjs);
  renderChartTrenTahun(mhs);
  renderChartJenisTinggal(mhs);
}

// ============================================================
// KARTU RINGKASAN
// ============================================================
function renderSummary(mhs, kjs, kamar) {
  const mhsAktif = mhs.filter(m => m.status === 'Aktif').length;
  const totalKamar = kamar.reduce((s, k) => s + (k.terisi || 0), 0);
  const totalKapasitas = kamar.reduce((s, k) => s + (k.kapasitas || 0), 0);
  const mouCount = kjs.filter(k => (k.jenis || '').toUpperCase() === 'MOU').length;
  const moaCount = kjs.filter(k => (k.jenis || '').toUpperCase() === 'MOA').length;
  const loiCount = kjs.filter(k => (k.jenis || '').toUpperCase() === 'LOI').length;
  
  const html = `
    <div class="summary-card-dash c-green">
      <div class="icon">👥</div>
      <div class="label">Mahasiswa Aktif</div>
      <div class="value">${mhsAktif}</div>
      <div class="sub">dari ${mhs.length} total</div>
    </div>
    <div class="summary-card-dash c-blue">
      <div class="icon">🤝</div>
      <div class="label">Mitra Kerjasama</div>
      <div class="value">${kjs.length}</div>
      <div class="sub">${mouCount} MoU · ${moaCount} MoA · ${loiCount} LoI</div>
    </div>
    <div class="summary-card-dash c-orange">
      <div class="icon">📄</div>
      <div class="label">Total Dokumen</div>
      <div class="value">${mouCount + moaCount + loiCount}</div>
      <div class="sub">MoU, MoA, LoI</div>
    </div>
    <div class="summary-card-dash c-green">
      <div class="icon">🏠</div>
      <div class="label">Kamar Mahad Terisi</div>
      <div class="value">${totalKamar}/${totalKapasitas}</div>
      <div class="sub">${totalKapasitas - totalKamar} kamar kosong</div>
    </div>
  `;
  
  const el = document.getElementById('summaryDashboard');
  if (el) el.innerHTML = html;
}

// ============================================================
// REMINDER (90 HARI)
// ============================================================
function renderReminder(mhs, kjs, dokumen) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 90);
  
  const visaAkanBerakhir = dokumen.filter(d => {
    if (!d.masa_berlaku_itas) return false;
    const tgl = new Date(d.masa_berlaku_itas);
    return tgl >= today && tgl <= limit;
  });
  
  const mouAkanBerakhir = kjs.filter(k => {
    if (!k.tanggal_berakhir) return false;
    const tgl = new Date(k.tanggal_berakhir);
    return tgl >= today && tgl <= limit;
  });
  
  const html = `
    <div class="reminder-box">
      <div class="reminder-icon">⏰</div>
      <div class="reminder-content">
        <div class="reminder-title">Visa/ITAS Akan Berakhir</div>
        <div class="reminder-value">${visaAkanBerakhir.length} mahasiswa</div>
        <div class="reminder-desc">Dalam 90 hari ke depan</div>
      </div>
    </div>
    <div class="reminder-box reminder-mou">
      <div class="reminder-icon">📋</div>
      <div class="reminder-content">
        <div class="reminder-title">Kerjasama Akan Berakhir</div>
        <div class="reminder-value">${mouAkanBerakhir.length} dokumen</div>
        <div class="reminder-desc">Dalam 90 hari ke depan</div>
      </div>
    </div>
  `;
  
  const el = document.getElementById('reminderDashboard');
  if (el) el.innerHTML = html;
}

// ============================================================
// HELPER
// ============================================================
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function showEmpty(canvasId, message = 'Belum ada data') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  parent.innerHTML = `<div class="chart-empty">${message}</div>`;
}

// ============================================================
// GRAFIK 1: Mahasiswa per Negara
// ============================================================
function renderChartNegara(mhs) {
  const counts = {};
  mhs.forEach(m => {
    const negara = (m.warga_negara || 'Tidak diketahui').trim();
    counts[negara] = (counts[negara] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  if (sorted.length === 0) { showEmpty('chartNegara'); return; }
  
  destroyChart('chartNegara');
  const canvas = document.getElementById('chartNegara');
  if (!canvas) return;
  
  charts.chartNegara = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Jumlah Mahasiswa',
        data: sorted.map(s => s[1]),
        backgroundColor: COLORS.primary,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ============================================================
// GRAFIK 2: Mahasiswa per Fakultas
// ============================================================
function renderChartFakultas(mhs) {
  const counts = {};
  mhs.forEach(m => {
    const f = (m.fakultas || 'Tidak diketahui').trim();
    counts[f] = (counts[f] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) { showEmpty('chartFakultas'); return; }
  
  destroyChart('chartFakultas');
  const canvas = document.getElementById('chartFakultas');
  if (!canvas) return;
  
  charts.chartFakultas = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: COLORS.palette,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 8 }
        }
      }
    }
  });
}

// ============================================================
// GRAFIK 3: Status Mahasiswa (Aktif, Cuti, Alumni, Drop Out, Mengundurkan Diri)
// ============================================================
function renderChartStatus(mhs) {
  const counts = { 
    'Aktif': 0, 
    'Online': 0, 
    'Cuti': 0, 
    'Alumni': 0, 
    'Drop Out': 0, 
    'Mengundurkan Diri': 0 
  };
  
  mhs.forEach(m => {
    const s = m.status || 'Aktif';
    if (counts[s] !== undefined) counts[s]++;
  });
  
  const labels = [];
  const data = [];
  const colors = [];
  
  const colorMap = {
    'Aktif': '#1e7a4d',
    'Online': '#0891b2',      // biru muda — beda dari aktif
    'Cuti': '#d4a017',
    'Alumni': '#2563eb',
    'Drop Out': '#a03a2a',
    'Mengundurkan Diri': '#dc2626'
  };
  
  Object.entries(counts).forEach(([k, v]) => {
    if (v > 0) {
      labels.push(k);
      data.push(v);
      colors.push(colorMap[k]);
    }
  });
  
  if (data.length === 0) { showEmpty('chartStatus'); return; }
  
  destroyChart('chartStatus');
  const canvas = document.getElementById('chartStatus');
  if (!canvas) return;
  
  charts.chartStatus = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 8 }
        }
      }
    }
  });
}

// ============================================================
// GRAFIK 4: Mahasiswa per Jenjang
// ============================================================
function renderChartJenjang(mhs) {
  const counts = {};
  mhs.forEach(m => {
    const j = (m.jenjang || 'Tidak diketahui').trim();
    counts[j] = (counts[j] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (sorted.length === 0) { showEmpty('chartJenjang'); return; }
  
  destroyChart('chartJenjang');
  const canvas = document.getElementById('chartJenjang');
  if (!canvas) return;
  
  charts.chartJenjang = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Jumlah',
        data: sorted.map(s => s[1]),
        backgroundColor: ['#0a5c4a', '#2563eb', '#d4a017'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ============================================================
// GRAFIK 5: Kerjasama per Negara
// ============================================================
function renderChartKerjasamaNegara(kjs) {
  const counts = {};
  kjs.forEach(k => {
    const negara = (k.negara || 'Tidak diketahui').trim();
    counts[negara] = (counts[negara] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  if (sorted.length === 0) { showEmpty('chartKerjasamaNegara'); return; }
  
  destroyChart('chartKerjasamaNegara');
  const canvas = document.getElementById('chartKerjasamaNegara');
  if (!canvas) return;
  
  charts.chartKerjasamaNegara = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Jumlah Kerjasama',
        data: sorted.map(s => s[1]),
        backgroundColor: '#2563eb',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ============================================================
// GRAFIK 6: Jenis Kerjasama
// ============================================================
function renderChartJenisKerjasama(kjs) {
  const counts = { MoU: 0, MoA: 0, LoI: 0, Lainnya: 0 };
  kjs.forEach(k => {
    const j = (k.jenis || '').trim();
    if (j === 'MoU') counts.MoU++;
    else if (j === 'MoA') counts.MoA++;
    else if (j === 'LoI') counts.LoI++;
    else counts.Lainnya++;
  });
  
  const labels = [];
  const data = [];
  const colors = [];
  
  const colorMap = {
    'MoU': '#0a5c4a',
    'MoA': '#d4a017',
    'LoI': '#2563eb',
    'Lainnya': '#6b7280'
  };
  
  Object.entries(counts).forEach(([k, v]) => {
    if (v > 0) {
      labels.push(k);
      data.push(v);
      colors.push(colorMap[k]);
    }
  });
  
  if (data.length === 0) { showEmpty('chartJenisKerjasama'); return; }
  
  destroyChart('chartJenisKerjasama');
  const canvas = document.getElementById('chartJenisKerjasama');
  if (!canvas) return;
  
  charts.chartJenisKerjasama = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 8 }
        }
      }
    }
  });
}

// ============================================================
// GRAFIK 7: Tren Mahasiswa Baru per Tahun
// ============================================================
function renderChartTrenTahun(mhs) {
  const counts = {};
  mhs.forEach(m => {
    if (m.tahun_masuk) {
      const t = m.tahun_masuk;
      counts[t] = (counts[t] || 0) + 1;
    }
  });
  
  const sorted = Object.entries(counts).sort((a, b) => a[0] - b[0]);
  
  if (sorted.length === 0) { showEmpty('chartTrenTahun'); return; }
  
  destroyChart('chartTrenTahun');
  const canvas = document.getElementById('chartTrenTahun');
  if (!canvas) return;
  
  charts.chartTrenTahun = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Mahasiswa Baru',
        data: sorted.map(s => s[1]),
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(10,92,74,0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: COLORS.primary
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ============================================================
// GRAFIK 8: Jenis Tinggal
// ============================================================
function renderChartJenisTinggal(mhs) {
  const counts = {};
  mhs.forEach(m => {
    const j = (m.jenis_tinggal || 'Lainnya').trim();
    counts[j] = (counts[j] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) { showEmpty('chartJenisTinggal'); return; }
  
  destroyChart('chartJenisTinggal');
  const canvas = document.getElementById('chartJenisTinggal');
  if (!canvas) return;
  
  const colorMap = {
    'Mahad': '#0a5c4a',
    'Kos': '#d4a017',
    'Apartemen': '#2563eb',
    'Kontrak': '#ea580c',
    'Lainnya': '#6b7280'
  };
  
  charts.chartJenisTinggal = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: sorted.map(s => colorMap[s[0]] || '#6b7280'),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 8 }
        }
      }
    }
  });
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadDashboard = loadDashboard;
