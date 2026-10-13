// ============================================================
// KEGIATAN — CRUD Agenda IO UINSA
// ============================================================

import { supabase } from './config.js';
import { showModal, closeModal, konfirmasi } from './utils.js';

let allKegiatan = [];
let searchKegiatanQuery = '';
let filterKegiatanStatus = 'semua';

// ============================================================
// HELPER — Hitung sisa hari
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

function formatTanggal(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}

function getReminderBadge(sisaHari, status) {
  if (status !== 'Aktif') return '<span class="tag tag-muted">—</span>';
  if (sisaHari === null) return '<span class="tag tag-muted">—</span>';
  
  if (sisaHari < 0) {
    return `<span class="tag tag-muted">Lewat</span>`;
  }
  if (sisaHari === 0) {
    return `<span class="tag tag-error">Hari ini</span>`;
  }
  if (sisaHari <= 7) {
    return `<span class="tag tag-warning">${sisaHari} hari lagi</span>`;
  }
  if (sisaHari <= 30) {
    return `<span class="tag tag-active">${sisaHari} hari lagi</span>`;
  }
  return `<span class="tag tag-muted">${sisaHari} hari lagi</span>`;
}

function getKategoriBadge(kategori) {
  if (!kategori) return '—';
  const colorMap = {
    'Rapat': 'tag-mou',
    'Kunjungan': 'tag-active',
    'Deadline': 'tag-error',
    'Acara': 'tag-warning',
    'Lainnya': 'tag-muted'
  };
  const cls = colorMap[kategori] || 'tag-muted';
  return `<span class="tag ${cls}">${kategori}</span>`;
}

// ============================================================
// LOAD DAFTAR KEGIATAN
// ============================================================
export async function loadKegiatan() {
  const tbody = document.getElementById('tbodyKegiatan');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Memuat data...</td></tr>';
  
  let query = supabase
    .from('kegiatan')
    .select('*')
    .order('tanggal', { ascending: true });
  
  if (filterKegiatanStatus !== 'semua') {
    query = query.eq('status', filterKegiatanStatus);
  }
  
  const { data, error } = await query;
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  allKegiatan = data || [];
  renderKegiatan();
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderKegiatan() {
  const tbody = document.getElementById('tbodyKegiatan');
  
  let filtered = allKegiatan;
  if (searchKegiatanQuery.trim()) {
    const q = searchKegiatanQuery.toLowerCase().trim();
    filtered = allKegiatan.filter(k => 
      (k.judul || '').toLowerCase().includes(q) ||
      (k.kategori || '').toLowerCase().includes(q) ||
      (k.deskripsi || '').toLowerCase().includes(q)
    );
  }
  
  if (filtered.length === 0) {
    const msg = searchKegiatanQuery.trim() 
      ? `Tidak ada hasil untuk "<strong>${searchKegiatanQuery}</strong>".`
      : (filterKegiatanStatus === 'semua' ? 'Belum ada data kegiatan.' : `Tidak ada kegiatan dengan status <strong>${filterKegiatanStatus}</strong>.`);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${msg}</td></tr>`;
    document.getElementById('totalKegiatan').textContent = '0 kegiatan';
    return;
  }
  
  tbody.innerHTML = filtered.map(k => {
    const sisaHari = hitungSisaHari(k.tanggal);
    const reminderBadge = getReminderBadge(sisaHari, k.status);
    
    // Status badge
    let statusCls = 'tag-active';
    if (k.status === 'Selesai') statusCls = 'tag-muted';
    if (k.status === 'Dibatalkan') statusCls = 'tag-error';
    
    // Row warna
    let rowStyle = '';
    if (k.status === 'Aktif' && sisaHari !== null && sisaHari >= 0 && sisaHari <= 30) {
      if (sisaHari <= 7) rowStyle = 'background:#fef3c7;';
      else rowStyle = 'background:#fef9c3;';
    }
    
    return `<tr style="${rowStyle}">
      <td><strong>${formatTanggal(k.tanggal)}</strong></td>
      <td>
        <div style="font-weight:600;">${k.judul || '—'}</div>
        ${k.deskripsi ? `<div style="font-size:11px; color:#6b7280; margin-top:2px;">${k.deskripsi.substring(0, 100)}${k.deskripsi.length > 100 ? '...' : ''}</div>` : ''}
      </td>
      <td>${getKategoriBadge(k.kategori)}</td>
      <td><span class="tag ${statusCls}">${k.status || 'Aktif'}</span></td>
      <td>${reminderBadge}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.editKegiatan(${k.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="window.hapusKegiatan(${k.id}, '${(k.judul || '').replace(/'/g, "\\'")}')">Hapus</button>
      </td>
    </tr>`;
  }).join('');
  
  if (searchKegiatanQuery.trim()) {
    document.getElementById('totalKegiatan').textContent = 
      `${filtered.length} dari ${allKegiatan.length} kegiatan`;
  } else {
    document.getElementById('totalKegiatan').textContent = `${filtered.length} kegiatan`;
  }
}

// ============================================================
// SEARCH
// ============================================================
export function searchKegiatan(query) {
  searchKegiatanQuery = query;
  renderKegiatan();
}

// ============================================================
// FILTER STATUS
// ============================================================
export function setFilterKegiatan(status) {
  filterKegiatanStatus = status;
  
  document.querySelectorAll('#page-kegiatan .filter-status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  
  loadKegiatan();
}

// ============================================================
// FORM TAMBAH
// ============================================================
export function openTambahKegiatan() {
  document.getElementById('formKegiatanTitle').textContent = 'Tambah Kegiatan';
  document.getElementById('formKegiatan').reset();
  document.getElementById('id_kegiatan').value = '';
  document.getElementById('modalAlertKegiatan').innerHTML = '';
  
  // Default status = Aktif
  const statusEl = document.getElementById('formKegiatan').elements['status'];
  if (statusEl) statusEl.value = 'Aktif';
  
  // Default tanggal = hari ini
  const tglEl = document.getElementById('formKegiatan').elements['tanggal'];
  if (tglEl) {
    const today = new Date().toISOString().split('T')[0];
    tglEl.value = today;
  }
  
  showModal('modalFormKegiatan');
}

// ============================================================
// FORM EDIT
// ============================================================
export async function editKegiatan(id) {
  const { data, error } = await supabase
    .from('kegiatan')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) { alert('Error: ' + error.message); return; }
  
  document.getElementById('formKegiatanTitle').textContent = 'Edit Kegiatan';
  const form = document.getElementById('formKegiatan');
  form.reset();
  document.getElementById('id_kegiatan').value = data.id;
  document.getElementById('modalAlertKegiatan').innerHTML = '';
  
  const setVal = (name, val) => {
    const el = form.elements[name];
    if (el) el.value = val || '';
  };
  
  setVal('judul', data.judul);
  setVal('tanggal', data.tanggal);
  setVal('kategori', data.kategori);
  setVal('deskripsi', data.deskripsi);
  setVal('status', data.status || 'Aktif');
  
  showModal('modalFormKegiatan');
}

// ============================================================
// SIMPAN
// ============================================================
export async function simpanKegiatan() {
  const form = document.getElementById('formKegiatan');
  const btn = document.getElementById('btnSimpanKegiatan');
  const alertBox = document.getElementById('modalAlertKegiatan');
  const editId = document.getElementById('id_kegiatan').value;
  
  if (!form.checkValidity()) { form.reportValidity(); return; }
  
  const fd = new FormData(form);
  const data = {};
  fd.forEach((v, k) => { data[k] = v.trim() || null; });
  delete data.id_kegiatan;
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    if (editId) {
      const { error } = await supabase.from('kegiatan').update(data).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('kegiatan').insert(data);
      if (error) throw error;
    }
    
    alertBox.innerHTML = '<div class="alert alert-success">✅ Data berhasil disimpan.</div>';
    setTimeout(() => { 
      closeModal('modalFormKegiatan'); 
      loadKegiatan();
    }, 1200);
    
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

// ============================================================
// HAPUS
// ============================================================
export function hapusKegiatan(id, judul) {
  konfirmasi(`Yakin ingin menghapus kegiatan "${judul}"?`, async () => {
    const { error } = await supabase.from('kegiatan').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    loadKegiatan();
  });
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadKegiatan = loadKegiatan;
window.searchKegiatan = searchKegiatan;
window.setFilterKegiatan = setFilterKegiatan;
window.openTambahKegiatan = openTambahKegiatan;
window.editKegiatan = editKegiatan;
window.simpanKegiatan = simpanKegiatan;
window.hapusKegiatan = hapusKegiatan;
