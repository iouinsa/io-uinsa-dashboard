// ============================================================
// MAHASISWA — CRUD + IMPORT CSV
// ============================================================

import { supabase } from './config.js';
import {
  formatTanggal, convertDriveLink, hitungSemester,
  escapeAttr, parseCSVLine, showModal, closeModal, konfirmasi, setupDragDrop
} from './utils.js';

// State
let currentMhsId = null;
let parsedData = [], validData = [], errorData = [];

// ============================================================
// LOAD DAFTAR MAHASISWA
// ============================================================
export async function loadMahasiswa() {
  const tbody = document.getElementById('tbodyMahasiswa');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Memuat data...</td></tr>';
  
  const { data, error } = await supabase
    .from('mahasiswa')
    .select('id, nim, nama, warga_negara, fakultas, prodi, tahun_masuk, link_foto')
    .order('nim');
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Belum ada data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(m => {
    const initial = (m.nama || '?').charAt(0).toUpperCase();
    const fotoHtml = m.link_foto
      ? `<img src="${convertDriveLink(m.link_foto)}" class="foto-thumb" onerror="this.outerHTML='<div class=\\'foto-thumb-empty\\'>${initial}</div>'">`
      : `<div class="foto-thumb-empty">${initial}</div>`;
    
    return `<tr class="clickable" onclick="window.openDetailMahasiswa(${m.id})">
      <td>${fotoHtml}</td>
      <td><strong>${m.nim}</strong></td>
      <td>${m.nama}</td>
      <td>${m.warga_negara || '—'}</td>
      <td>${m.fakultas || '—'}</td>
      <td>${m.prodi || '—'}</td>
      <td>${m.tahun_masuk || '—'}</td>
    </tr>`;
  }).join('');
  
  document.getElementById('totalMahasiswa').textContent = `${data.length} mahasiswa`;
}

// ============================================================
// DETAIL MAHASISWA
// ============================================================
export async function openDetailMahasiswa(id) {
  currentMhsId = id;
  const body = document.getElementById('detailBody');
  body.innerHTML = '<div class="loading-text">Memuat data...</div>';
  showModal('modalDetailMahasiswa');
  
  const [mhsRes, dokRes, kontakRes] = await Promise.all([
    supabase.from('mahasiswa').select('*').eq('id', id).single(),
    supabase.from('mahasiswa_dokumen').select('*').eq('mahasiswa_id', id).maybeSingle(),
    supabase.from('mahasiswa_kontak').select('*').eq('mahasiswa_id', id).maybeSingle()
  ]);
  
  if (mhsRes.error) {
    body.innerHTML = `<div class="alert alert-error">Error: ${mhsRes.error.message}</div>`;
    return;
  }
  
  const m = mhsRes.data;
  const d = dokRes.data || {};
  const k = kontakRes.data || {};
  const initial = (m.nama || '?').charAt(0).toUpperCase();
  
  const fotoHtml = m.link_foto
    ? `<img src="${convertDriveLink(m.link_foto)}" class="detail-foto" onerror="this.outerHTML='<div class=\\'detail-foto-empty\\'>${initial}</div>'">`
    : `<div class="detail-foto-empty">${initial}</div>`;
  
  function dokCard(title, noDok, tgl, link) {
    const preview = link
      ? `<img src="${convertDriveLink(link)}" onclick="window.open('${link}', '_blank')" onerror="this.outerHTML='<div class=\\'placeholder\\'>Gambar tidak bisa dimuat</div>'">`
      : `<div class="placeholder">Belum ada foto</div>`;
    return `<div class="dokumen-card">
      <div class="dokumen-title">
        <span>${title}</span>
        ${link ? `<a href="${link}" target="_blank" style="font-size:11px;color:#0a5c4a;">Buka ↗</a>` : ''}
      </div>
      <div class="dokumen-preview">${preview}</div>
      <div class="dokumen-info">
        <div>No: ${noDok || '—'}</div>
        <div>Berlaku: ${formatTanggal(tgl)}</div>
      </div>
    </div>`;
  }
  
  body.innerHTML = `
    <div class="detail-header">
      ${fotoHtml}
      <div class="detail-header-info">
        <h2>${m.nama}</h2>
        <p>${m.nim} · ${m.fakultas || '—'} · ${m.prodi || '—'}</p>
      </div>
    </div>
    
    <div class="detail-section"><h4>Identitas</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>NIM</label><span>${m.nim || '—'}</span></div>
        <div class="detail-item"><label>Nama</label><span>${m.nama || '—'}</span></div>
        <div class="detail-item"><label>Jenis Kelamin</label><span>${m.jenis_kelamin === 'L' ? 'Laki-laki' : m.jenis_kelamin === 'P' ? 'Perempuan' : '—'}</span></div>
        <div class="detail-item"><label>Jenjang</label><span>${m.jenjang || '—'}</span></div>
        <div class="detail-item"><label>Fakultas</label><span>${m.fakultas || '—'}</span></div>
        <div class="detail-item"><label>Prodi</label><span>${m.prodi || '—'}</span></div>
        <div class="detail-item"><label>Tahun Masuk</label><span>${m.tahun_masuk || '—'}</span></div>
        <div class="detail-item"><label>Semester</label><span>${hitungSemester(m.tahun_masuk)}</span></div>
        <div class="detail-item"><label>Warga Negara</label><span>${m.warga_negara || '—'}</span></div>
        <div class="detail-item"><label>Email Kampus</label><span>${m.email_kampus || '—'}</span></div>
        <div class="detail-item full"><label>Keterangan</label><span>${m.keterangan || '—'}</span></div>
      </div>
    </div>
    
    <div class="detail-section"><h4>Dokumen Imigrasi</h4>
      <div class="dokumen-grid">
        ${dokCard('Paspor', d.no_paspor, d.masa_berlaku_paspor, d.link_paspor)}
        ${dokCard('ITAS', d.no_itas, d.masa_berlaku_itas, d.link_itas)}
        ${dokCard('STM', d.no_stm, d.masa_berlaku_skj_stm, d.link_stm)}
        ${dokCard('SKTT', d.no_sktt, d.masa_berlaku_sktt, d.link_sktt)}
      </div>
    </div>
    
    <div class="detail-section"><h4>Kontak & Alamat</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Tempat Lahir</label><span>${k.tempat_lahir || '—'}</span></div>
        <div class="detail-item"><label>Tanggal Lahir</label><span>${formatTanggal(k.tanggal_lahir)}</span></div>
        <div class="detail-item full"><label>Alamat Sekarang</label><span>${k.alamat_sekarang || '—'}</span></div>
        <div class="detail-item full"><label>Alamat Asal</label><span>${k.alamat_asal || '—'}</span></div>
        <div class="detail-item"><label>Telepon</label><span>${k.telepon || '—'}</span></div>
        <div class="detail-item"><label>HP / WA</label><span>${k.hp || '—'}</span></div>
        <div class="detail-item"><label>No. Paket Data</label><span>${k.no_paketdata || '—'}</span></div>
        <div class="detail-item"><label>Email Pribadi</label><span>${k.email_pribadi || '—'}</span></div>
      </div>
    </div>
  `;
}

// ============================================================
// FORM TAMBAH MAHASISWA
// ============================================================
export function openTambahMahasiswa() {
  document.getElementById('formMhsTitle').textContent = 'Tambah Mahasiswa';
  document.getElementById('formMahasiswa').reset();
  document.getElementById('id_mahasiswa').value = '';
  document.getElementById('modalAlert').innerHTML = '';
  showModal('modalFormMahasiswa');
}

// ============================================================
// FORM EDIT MAHASISWA
// ============================================================
export async function openEditMahasiswa() {
  if (!currentMhsId) return;
  closeModal('modalDetailMahasiswa');
  
  const [mhsRes, dokRes, kontakRes] = await Promise.all([
    supabase.from('mahasiswa').select('*').eq('id', currentMhsId).single(),
    supabase.from('mahasiswa_dokumen').select('*').eq('mahasiswa_id', currentMhsId).maybeSingle(),
    supabase.from('mahasiswa_kontak').select('*').eq('mahasiswa_id', currentMhsId).maybeSingle()
  ]);
  
  if (mhsRes.error) { alert('Error: ' + mhsRes.error.message); return; }
  
  const m = mhsRes.data, d = dokRes.data || {}, k = kontakRes.data || {};
  const form = document.getElementById('formMahasiswa');
  form.reset();
  
  document.getElementById('formMhsTitle').textContent = 'Edit Mahasiswa';
  document.getElementById('id_mahasiswa').value = m.id;
  document.getElementById('modalAlert').innerHTML = '';
  
  const setVal = (name, val) => {
    const el = form.elements[name];
    if (el) el.value = val || '';
  };
  
  setVal('nim', m.nim); setVal('nama', m.nama); setVal('jenis_kelamin', m.jenis_kelamin);
  setVal('jenjang', m.jenjang); setVal('fakultas', m.fakultas); setVal('prodi', m.prodi);
  setVal('tahun_masuk', m.tahun_masuk); setVal('warga_negara', m.warga_negara);
  setVal('email_kampus', m.email_kampus); setVal('link_foto', m.link_foto);
  setVal('keterangan', m.keterangan);
  setVal('no_paspor', d.no_paspor); setVal('no_itas', d.no_itas);
  setVal('no_stm', d.no_stm); setVal('no_sktt', d.no_sktt);
  setVal('masa_berlaku_paspor', d.masa_berlaku_paspor);
  setVal('masa_berlaku_itas', d.masa_berlaku_itas);
  setVal('masa_berlaku_skj_stm', d.masa_berlaku_skj_stm);
  setVal('masa_berlaku_sktt', d.masa_berlaku_sktt);
  setVal('link_paspor', d.link_paspor); setVal('link_itas', d.link_itas);
  setVal('link_stm', d.link_stm); setVal('link_sktt', d.link_sktt);
  setVal('tempat_lahir', k.tempat_lahir); setVal('tanggal_lahir', k.tanggal_lahir);
  setVal('alamat_sekarang', k.alamat_sekarang); setVal('alamat_asal', k.alamat_asal);
  setVal('telepon', k.telepon); setVal('hp', k.hp);
  setVal('no_paketdata', k.no_paketdata); setVal('email_pribadi', k.email_pribadi);
  
  showModal('modalFormMahasiswa');
}

// ============================================================
// SIMPAN MAHASISWA (insert atau update)
// ============================================================
export async function simpanMahasiswa() {
  const form = document.getElementById('formMahasiswa');
  const btn = document.getElementById('btnSimpanMahasiswa');
  const alertBox = document.getElementById('modalAlert');
  const editId = document.getElementById('id_mahasiswa').value;
  
  if (!form.checkValidity()) { form.reportValidity(); return; }
  
  const fd = new FormData(form);
  const data = {};
  fd.forEach((v, k) => { data[k] = v.trim() || null; });
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    if (editId) {
      // ===== UPDATE =====
      const { error: err1 } = await supabase.from('mahasiswa').update({
        nim: data.nim, nama: data.nama,
        jenis_kelamin: data.jenis_kelamin, jenjang: data.jenjang,
        fakultas: data.fakultas, prodi: data.prodi,
        tahun_masuk: data.tahun_masuk ? parseInt(data.tahun_masuk) : null,
        warga_negara: data.warga_negara, email_kampus: data.email_kampus,
        keterangan: data.keterangan, link_foto: data.link_foto
      }).eq('id', editId);
      
      if (err1) throw { step: 'mahasiswa', error: err1 };
      
      const { data: exDok } = await supabase.from('mahasiswa_dokumen').select('id').eq('mahasiswa_id', editId).maybeSingle();
      const { data: exKontak } = await supabase.from('mahasiswa_kontak').select('id').eq('mahasiswa_id', editId).maybeSingle();
      
      const dokPayload = {
        no_paspor: data.no_paspor, no_itas: data.no_itas,
        no_stm: data.no_stm, no_sktt: data.no_sktt,
        masa_berlaku_paspor: data.masa_berlaku_paspor,
        masa_berlaku_itas: data.masa_berlaku_itas,
        masa_berlaku_skj_stm: data.masa_berlaku_skj_stm,
        masa_berlaku_sktt: data.masa_berlaku_sktt,
        link_paspor: data.link_paspor, link_itas: data.link_itas,
        link_stm: data.link_stm, link_sktt: data.link_sktt
      };
      
      const kontakPayload = {
        tempat_lahir: data.tempat_lahir, tanggal_lahir: data.tanggal_lahir,
        alamat_sekarang: data.alamat_sekarang, alamat_asal: data.alamat_asal,
        telepon: data.telepon, hp: data.hp,
        no_paketdata: data.no_paketdata, email_pribadi: data.email_pribadi
      };
      
      if (exDok) await supabase.from('mahasiswa_dokumen').update(dokPayload).eq('mahasiswa_id', editId);
      else await supabase.from('mahasiswa_dokumen').insert({ mahasiswa_id: editId, ...dokPayload });
      
      if (exKontak) await supabase.from('mahasiswa_kontak').update(kontakPayload).eq('mahasiswa_id', editId);
      else await supabase.from('mahasiswa_kontak').insert({ mahasiswa_id: editId, ...kontakPayload });
      
    } else {
      // ===== INSERT =====
      const { data: mhsResult, error: err1 } = await supabase.from('mahasiswa').insert({
        nim: data.nim, nama: data.nama,
        jenis_kelamin: data.jenis_kelamin, jenjang: data.jenjang,
        fakultas: data.fakultas, prodi: data.prodi,
        tahun_masuk: data.tahun_masuk ? parseInt(data.tahun_masuk) : null,
        warga_negara: data.warga_negara, email_kampus: data.email_kampus,
        keterangan: data.keterangan, link_foto: data.link_foto
      }).select('id').single();
      
      if (err1) throw { step: 'mahasiswa', error: err1 };
      const mhsId = mhsResult.id;
      
      const { error: err2 } = await supabase.from('mahasiswa_dokumen').insert({
        mahasiswa_id: mhsId,
        no_paspor: data.no_paspor, no_itas: data.no_itas,
        no_stm: data.no_stm, no_sktt: data.no_sktt,
        masa_berlaku_paspor: data.masa_berlaku_paspor,
        masa_berlaku_itas: data.masa_berlaku_itas,
        masa_berlaku_skj_stm: data.masa_berlaku_skj_stm,
        masa_berlaku_sktt: data.masa_berlaku_sktt,
        link_paspor: data.link_paspor, link_itas: data.link_itas,
        link_stm: data.link_stm, link_sktt: data.link_sktt
      });
      
      if (err2) throw { step: 'dokumen', error: err2 };
      
      const { error: err3 } = await supabase.from('mahasiswa_kontak').insert({
        mahasiswa_id: mhsId,
        tempat_lahir: data.tempat_lahir, tanggal_lahir: data.tanggal_lahir,
        alamat_sekarang: data.alamat_sekarang, alamat_asal: data.alamat_asal,
        telepon: data.telepon, hp: data.hp,
        no_paketdata: data.no_paketdata, email_pribadi: data.email_pribadi
      });
      
      if (err3) throw { step: 'kontak', error: err3 };
    }
    
    alertBox.innerHTML = `<div class="alert alert-success">✅ Data berhasil ${editId ? 'diupdate' : 'disimpan'}.</div>`;
    setTimeout(() => { closeModal('modalFormMahasiswa'); loadMahasiswa(); }, 1500);
    
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">❌ Gagal di tahap <strong>${err.step}</strong>: ${err.error.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

// ============================================================
// HAPUS MAHASISWA
// ============================================================
export function hapusMahasiswa() {
  if (!currentMhsId) return;
  konfirmasi('Yakin ingin menghapus mahasiswa ini? Semua data dokumen dan kontak terkait juga akan terhapus.', async () => {
    const { error } = await supabase.from('mahasiswa').delete().eq('id', currentMhsId);
    if (error) { alert('Error: ' + error.message); return; }
    closeModal('modalDetailMahasiswa');
    loadMahasiswa();
  });
}

// ============================================================
// IMPORT CSV — BUKA MODAL
// ============================================================
export function openImportCSV() {
  parsedData = []; validData = []; errorData = [];
  document.getElementById('fileCSV').value = '';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('btnImportCSV').disabled = true;
  document.getElementById('importAlert').innerHTML = '';
  showModal('modalImportCSV');
}

// ============================================================
// DOWNLOAD TEMPLATE CSV
// ============================================================
const CSV_COLUMNS = ['nim','nama','jenis_kelamin','jenjang','fakultas','prodi','tahun_masuk','warga_negara','email_kampus','keterangan','link_foto','no_paspor','no_itas','no_stm','no_sktt','masa_berlaku_paspor','masa_berlaku_itas','masa_berlaku_skj_stm','masa_berlaku_sktt','link_paspor','link_itas','link_stm','link_sktt','tempat_lahir','tanggal_lahir','alamat_sekarang','alamat_asal','telepon','hp','no_paketdata','email_pribadi'];

const COLUMN_LABELS = {
  nim:'NIM', nama:'Nama', jenis_kelamin:'Jenis Kelamin', jenjang:'Jenjang',
  fakultas:'Fakultas', prodi:'Prodi', tahun_masuk:'Tahun Masuk',
  warga_negara:'Warga Negara', email_kampus:'Email Kampus', keterangan:'Keterangan',
  link_foto:'Link Foto', no_paspor:'No. Paspor', no_itas:'No. ITAS',
  no_stm:'No. STM', no_sktt:'No. SKTT',
  masa_berlaku_paspor:'Masa Berlaku Paspor', masa_berlaku_itas:'Masa Berlaku ITAS',
  masa_berlaku_skj_stm:'Masa Berlaku SKJ/STM', masa_berlaku_sktt:'Masa Berlaku SKTT',
  link_paspor:'Link Paspor', link_itas:'Link ITAS', link_stm:'Link STM', link_sktt:'Link SKTT',
  tempat_lahir:'Tempat Lahir', tanggal_lahir:'Tanggal Lahir',
  alamat_sekarang:'Alamat Sekarang', alamat_asal:'Alamat Asal',
  telepon:'Telepon', hp:'HP', no_paketdata:'No. Paket Data', email_pribadi:'Email Pribadi'
};

export function downloadTemplateMhs() {
  const header = CSV_COLUMNS.map(c => COLUMN_LABELS[c]).join(',');
  const contoh = [
    '2024001','Ahmad Faizal','L','S1','Syariah','HKI','2024','Malaysia','ahmad@uinsa.ac.id','',
    'https://drive.google.com/file/d/CONTOH_FOTO/view',
    'A1234567','ITAS001','STM001','SKTT001',
    '2028-05-10','2026-08-01','2025-12-31','2026-08-01',
    'https://drive.google.com/file/d/PASPOR/view',
    'https://drive.google.com/file/d/ITAS/view',
    'https://drive.google.com/file/d/STM/view',
    'https://drive.google.com/file/d/SKTT/view',
    'Kuala Lumpur','2001-03-15','Jl. Ahmad Yani No. 10 Surabaya','Kuala Lumpur',
    '081234567890','081234567890','081234567890','ahmad@gmail.com'
  ];
  const csv = header + '\n' + contoh.map(v => v.includes(',') ? `"${v}"` : v).join(',') + '\n';
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_import_mahasiswa.csv';
  link.click();
}

// ============================================================
// HANDLE FILE SELECT
// ============================================================
export function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileInfo = document.getElementById('fileInfo');
  fileInfo.style.display = 'block';
  fileInfo.innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  
  const reader = new FileReader();
  reader.onload = (e) => parseCSVMhs(e.target.result);
  reader.readAsText(file, 'UTF-8');
}

// ============================================================
// PARSE CSV
// ============================================================
function parseCSVMhs(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { alert('File CSV kosong.'); return; }
  
  const rawHeader = parseCSVLine(lines[0]);
  const header = rawHeader.map(h => {
    h = h.trim();
    for (const [key, label] of Object.entries(COLUMN_LABELS)) {
      if (h.toLowerCase() === key.toLowerCase() || h.toLowerCase() === label.toLowerCase()) return key;
    }
    return h.toLowerCase().replace(/\s+/g, '_');
  });
  
  parsedData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    header.forEach((col, idx) => { row[col] = (values[idx] || '').trim(); });
    row._lineNumber = i + 1;
    parsedData.push(row);
  }
  validateDataMhs();
}

// ============================================================
// VALIDASI DATA
// ============================================================
function validateDataMhs() {
  validData = []; errorData = [];
  const nimCount = {};
  parsedData.forEach(r => { if (r.nim) nimCount[r.nim] = (nimCount[r.nim] || 0) + 1; });
  
  parsedData.forEach((row) => {
    const errors = [];
    if (!row.nim) errors.push('NIM kosong');
    if (!row.nama) errors.push('Nama kosong');
    if (!row.fakultas) errors.push('Fakultas kosong');
    if (!row.prodi) errors.push('Prodi kosong');
    if (row.nim && nimCount[row.nim] > 1) errors.push('NIM duplikat');
    
    ['masa_berlaku_paspor','masa_berlaku_itas','masa_berlaku_skj_stm','masa_berlaku_sktt','tanggal_lahir'].forEach(f => {
      if (row[f] && !/^\d{4}-\d{2}-\d{2}$/.test(row[f])) errors.push(`${f} harus YYYY-MM-DD`);
    });
    
    if (row.jenis_kelamin && !['L','P'].includes(row.jenis_kelamin)) errors.push('JK harus L/P');
    
    if (errors.length > 0) errorData.push({ row, errors, lineNumber: row._lineNumber });
    else validData.push(row);
  });
  
  document.getElementById('sumTotal').textContent = parsedData.length;
  document.getElementById('sumValid').textContent = validData.length;
  document.getElementById('sumError').textContent = errorData.length;
  
  if (errorData.length > 0) {
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorList').innerHTML = errorData.slice(0, 20)
      .map(e => `<div>❌ Baris ${e.lineNumber} (${e.row.nim || '—'}): ${e.errors.join(', ')}</div>`)
      .join('');
  } else {
    document.getElementById('errorSection').style.display = 'none';
  }
  
  document.getElementById('previewTable').innerHTML = `
    <table><thead><tr><th>Baris</th><th>NIM</th><th>Nama</th><th>Fakultas</th><th>Status</th></tr></thead>
    <tbody>${parsedData.slice(0, 10).map(r => {
      const isErr = errorData.some(e => e.row._lineNumber === r._lineNumber);
      return `<tr>
        <td>${r._lineNumber}</td><td>${r.nim || '—'}</td><td>${r.nama || '—'}</td>
        <td>${r.fakultas || '—'}</td>
        <td>${isErr ? '<span class="tag tag-error">Error</span>' : '<span class="tag tag-active">OK</span>'}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
  
  document.getElementById('previewSection').style.display = 'block';
  document.getElementById('btnImportCSV').disabled = validData.length === 0;
}

// ============================================================
// PROSES IMPORT
// ============================================================
export async function prosesImportMhs() {
  if (validData.length === 0) return;
  
  const btn = document.getElementById('btnImportCSV');
  const alertBox = document.getElementById('importAlert');
  
  if (!confirm(`Import ${validData.length} baris?`)) return;
  
  btn.disabled = true;
  alertBox.innerHTML = '';
  let sukses = 0, gagal = 0;
  const gagalDetail = [];
  
  for (let i = 0; i < validData.length; i++) {
    const row = validData[i];
    btn.textContent = `Import ${i + 1}/${validData.length}...`;
    
    try {
      const { data: mhsResult, error: err1 } = await supabase.from('mahasiswa').insert({
        nim: row.nim, nama: row.nama,
        jenis_kelamin: row.jenis_kelamin || null, jenjang: row.jenjang || null,
        fakultas: row.fakultas, prodi: row.prodi,
        tahun_masuk: row.tahun_masuk ? parseInt(row.tahun_masuk) : null,
        warga_negara: row.warga_negara || null, email_kampus: row.email_kampus || null,
        keterangan: row.keterangan || null, link_foto: row.link_foto || null
      }).select('id').single();
      
      if (err1) throw err1;
      const mhsId = mhsResult.id;
      
      await supabase.from('mahasiswa_dokumen').insert({
        mahasiswa_id: mhsId,
        no_paspor: row.no_paspor || null, no_itas: row.no_itas || null,
        no_stm: row.no_stm || null, no_sktt: row.no_sktt || null,
        masa_berlaku_paspor: row.masa_berlaku_paspor || null,
        masa_berlaku_itas: row.masa_berlaku_itas || null,
        masa_berlaku_skj_stm: row.masa_berlaku_skj_stm || null,
        masa_berlaku_sktt: row.masa_berlaku_sktt || null,
        link_paspor: row.link_paspor || null, link_itas: row.link_itas || null,
        link_stm: row.link_stm || null, link_sktt: row.link_sktt || null
      });
      
      await supabase.from('mahasiswa_kontak').insert({
        mahasiswa_id: mhsId,
        tempat_lahir: row.tempat_lahir || null, tanggal_lahir: row.tanggal_lahir || null,
        alamat_sekarang: row.alamat_sekarang || null, alamat_asal: row.alamat_asal || null,
        telepon: row.telepon || null, hp: row.hp || null,
        no_paketdata: row.no_paketdata || null, email_pribadi: row.email_pribadi || null
      });
      
      sukses++;
    } catch (err) {
      gagal++;
      gagalDetail.push(`Baris ${row._lineNumber} (${row.nim}): ${err.message}`);
    }
  }
  
  btn.textContent = 'Import Data';
  btn.disabled = false;
  
  let html = `<div class="alert alert-success"><strong>✅ Selesai!</strong><br>Berhasil: <strong>${sukses}</strong><br>Gagal: <strong>${gagal}</strong></div>`;
  if (gagalDetail.length > 0) {
    html += `<div class="error-list">${gagalDetail.map(d => `<div>❌ ${d}</div>`).join('')}</div>`;
  }
  alertBox.innerHTML = html;
  
  loadMahasiswa();
  if (gagal === 0) setTimeout(() => closeModal('modalImportCSV'), 3000);
}

// ============================================================
// SETUP DRAG & DROP
// ============================================================
export function setupMahasiswaDragDrop() {
  setupDragDrop('importArea', 'fileCSV', handleFileSelect);
}

// ============================================================
// EXPOSE KE WINDOW (untuk onclick di HTML)
// ============================================================
window.loadMahasiswa = loadMahasiswa;
window.openDetailMahasiswa = openDetailMahasiswa;
window.openTambahMahasiswa = openTambahMahasiswa;
window.openEditMahasiswa = openEditMahasiswa;
window.simpanMahasiswa = simpanMahasiswa;
window.hapusMahasiswa = hapusMahasiswa;
window.openImportCSV = openImportCSV;
window.downloadTemplateMhs = downloadTemplateMhs;
window.handleFileSelect = handleFileSelect;
window.prosesImportMhs = prosesImportMhs;