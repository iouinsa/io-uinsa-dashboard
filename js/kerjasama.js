// ============================================================
// KERJASAMA — CRUD + IMPORT CSV
// ============================================================

import { supabase } from './config.js';
import {
  formatTanggal, hitungStatusKerjasama, statusClassKerjasama,
  escapeAttr, parseCSVLine, showModal, closeModal, konfirmasi, setupDragDrop
} from './utils.js';

// ============================================================
// LOAD DAFTAR KERJASAMA
// ============================================================
export async function loadKerjasama() {
  const tbody = document.getElementById('tbodyKerjasama');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Memuat data...</td></tr>';
  
  const { data, error } = await supabase
    .from('kerjasama')
    .select('*')
    .order('tanggal_mulai', { ascending: false });
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Belum ada data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(k => {
    const status = hitungStatusKerjasama(k.tanggal_berakhir);
    const cls = statusClassKerjasama(status);
    return `<tr>
      <td><strong>${k.kampus}</strong></td>
      <td>${k.negara || '—'}</td>
      <td>${k.jenis || '—'}</td>
      <td>${formatTanggal(k.tanggal_mulai)}</td>
      <td>${formatTanggal(k.tanggal_berakhir)}</td>
      <td><span class="tag ${cls}">${status}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.editKerjasama(${k.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="window.hapusKerjasama(${k.id}, '${escapeAttr(k.kampus || '')}')">Hapus</button>
      </td>
    </tr>`;
  }).join('');
  
  document.getElementById('totalKerjasama').textContent = `${data.length} kerja sama`;
}

// ============================================================
// FORM TAMBAH
// ============================================================
export function openTambahKerjasama() {
  document.getElementById('formKjsTitle').textContent = 'Tambah Kerjasama';
  document.getElementById('formKerjasama').reset();
  document.getElementById('id_kerjasama').value = '';
  document.getElementById('modalAlertKjs').innerHTML = '';
  showModal('modalFormKerjasama');
}

// ============================================================
// FORM EDIT
// ============================================================
export async function editKerjasama(id) {
  const { data, error } = await supabase.from('kerjasama').select('*').eq('id', id).single();
  if (error) { alert('Error: ' + error.message); return; }
  
  document.getElementById('formKjsTitle').textContent = 'Edit Kerjasama';
  const form = document.getElementById('formKerjasama');
  form.reset();
  document.getElementById('id_kerjasama').value = data.id;
  document.getElementById('modalAlertKjs').innerHTML = '';
  
  ['kampus','negara','unit_fakultas','jenis','tanggal_mulai','tanggal_berakhir','link_dokumen'].forEach(f => {
    if (form.elements[f]) form.elements[f].value = data[f] || '';
  });
  
  showModal('modalFormKerjasama');
}

// ============================================================
// SIMPAN (INSERT / UPDATE)
// ============================================================
export async function simpanKerjasama() {
  const form = document.getElementById('formKerjasama');
  const btn = document.getElementById('btnSimpanKjs');
  const alertBox = document.getElementById('modalAlertKjs');
  const editId = document.getElementById('id_kerjasama').value;
  
  if (!form.checkValidity()) { form.reportValidity(); return; }
  
  const fd = new FormData(form);
  const data = {};
  fd.forEach((v, k) => { data[k] = v.trim() || null; });
  delete data.id_kerjasama;
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    if (editId) {
      const { error } = await supabase.from('kerjasama').update(data).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('kerjasama').insert(data);
      if (error) throw error;
    }
    
    alertBox.innerHTML = '<div class="alert alert-success">✅ Data berhasil disimpan.</div>';
    setTimeout(() => { closeModal('modalFormKerjasama'); loadKerjasama(); }, 1200);
    
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
export function hapusKerjasama(id, nama) {
  konfirmasi(`Yakin ingin menghapus kerjasama dengan "${nama}"?`, async () => {
    const { error } = await supabase.from('kerjasama').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    loadKerjasama();
  });
}

// ============================================================
// IMPORT CSV — STATE
// ============================================================
let parsedKjs = [], validKjs = [], errorKjs = [];

const KJS_COLUMNS = ['kampus','unit_fakultas','negara','tanggal_mulai','tanggal_berakhir','jenis','link_dokumen'];
const KJS_LABELS = {
  kampus:'Kampus', unit_fakultas:'Unit Fakultas', negara:'Negara',
  tanggal_mulai:'Tanggal Mulai', tanggal_berakhir:'Tanggal Berakhir',
  jenis:'Jenis', link_dokumen:'Link Dokumen'
};

// ============================================================
// BUKA MODAL IMPORT
// ============================================================
export function openImportKerjasama() {
  parsedKjs = []; validKjs = []; errorKjs = [];
  document.getElementById('fileCSVKjs').value = '';
  document.getElementById('fileInfoKjs').style.display = 'none';
  document.getElementById('previewSectionKjs').style.display = 'none';
  document.getElementById('btnImportKjs').disabled = true;
  document.getElementById('importKjsAlert').innerHTML = '';
  showModal('modalImportKerjasama');
}

// ============================================================
// DOWNLOAD TEMPLATE
// ============================================================
export function downloadTemplateKjs() {
  const header = KJS_COLUMNS.map(c => KJS_LABELS[c]).join(',');
  const contoh = [
    'Universitas Malaya','Fakultas Syariah','Malaysia',
    '2023-08-01','2028-08-01','MoU',
    'https://drive.google.com/file/d/xxx/view'
  ];
  const csv = header + '\n' + contoh.map(v => v.includes(',') ? `"${v}"` : v).join(',') + '\n';
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_import_kerjasama.csv';
  link.click();
}

// ============================================================
// HANDLE FILE SELECT
// ============================================================
export function handleFileSelectKjs(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileInfo = document.getElementById('fileInfoKjs');
  fileInfo.style.display = 'block';
  fileInfo.innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  
  const reader = new FileReader();
  reader.onload = (e) => parseCSVKjs(e.target.result);
  reader.readAsText(file, 'UTF-8');
}

// ============================================================
// PARSE CSV
// ============================================================
function parseCSVKjs(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { alert('File kosong.'); return; }
  
  const rawHeader = parseCSVLine(lines[0]);
  const header = rawHeader.map(h => {
    h = h.trim();
    for (const [key, label] of Object.entries(KJS_LABELS)) {
      if (h.toLowerCase() === key.toLowerCase() || h.toLowerCase() === label.toLowerCase()) return key;
    }
    return h.toLowerCase().replace(/\s+/g, '_');
  });
  
  parsedKjs = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    header.forEach((col, idx) => { row[col] = (values[idx] || '').trim(); });
    row._lineNumber = i + 1;
    parsedKjs.push(row);
  }
  validateKjs();
}

// ============================================================
// VALIDASI
// ============================================================
function validateKjs() {
  validKjs = []; errorKjs = [];
  
  parsedKjs.forEach((row) => {
    const errors = [];
    if (!row.kampus) errors.push('Kampus kosong');
    
    ['tanggal_mulai','tanggal_berakhir'].forEach(f => {
      if (row[f] && !/^\d{4}-\d{2}-\d{2}$/.test(row[f])) {
        errors.push(`${f} harus YYYY-MM-DD`);
      }
    });
    
    if (errors.length > 0) errorKjs.push({ row, errors, lineNumber: row._lineNumber });
    else validKjs.push(row);
  });
  
  document.getElementById('sumTotalKjs').textContent = parsedKjs.length;
  document.getElementById('sumValidKjs').textContent = validKjs.length;
  document.getElementById('sumErrorKjs').textContent = errorKjs.length;
  
  if (errorKjs.length > 0) {
    document.getElementById('errorSectionKjs').style.display = 'block';
    document.getElementById('errorListKjs').innerHTML = errorKjs.slice(0, 20)
      .map(e => `<div>❌ Baris ${e.lineNumber} (${e.row.kampus || '—'}): ${e.errors.join(', ')}</div>`)
      .join('');
  } else {
    document.getElementById('errorSectionKjs').style.display = 'none';
  }
  
  document.getElementById('previewTableKjs').innerHTML = `
    <table><thead><tr><th>Baris</th><th>Kampus</th><th>Negara</th><th>Mulai</th><th>Status</th></tr></thead>
    <tbody>${parsedKjs.slice(0, 10).map(r => {
      const isErr = errorKjs.some(e => e.row._lineNumber === r._lineNumber);
      return `<tr>
        <td>${r._lineNumber}</td><td>${r.kampus || '—'}</td>
        <td>${r.negara || '—'}</td><td>${r.tanggal_mulai || '—'}</td>
        <td>${isErr ? '<span class="tag tag-error">Error</span>' : '<span class="tag tag-active">OK</span>'}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
  
  document.getElementById('previewSectionKjs').style.display = 'block';
  document.getElementById('btnImportKjs').disabled = validKjs.length === 0;
}

// ============================================================
// PROSES IMPORT
// ============================================================
export async function prosesImportKjs() {
  if (validKjs.length === 0) return;
  
  const btn = document.getElementById('btnImportKjs');
  const alertBox = document.getElementById('importKjsAlert');
  
  if (!confirm(`Import ${validKjs.length} data kerjasama?`)) return;
  
  btn.disabled = true;
  alertBox.innerHTML = '';
  let sukses = 0, gagal = 0;
  const gagalDetail = [];
  
  for (let i = 0; i < validKjs.length; i++) {
    const row = validKjs[i];
    btn.textContent = `Import ${i + 1}/${validKjs.length}...`;
    
    try {
      const { error } = await supabase.from('kerjasama').insert({
        kampus: row.kampus,
        unit_fakultas: row.unit_fakultas || null,
        negara: row.negara || null,
        tanggal_mulai: row.tanggal_mulai || null,
        tanggal_berakhir: row.tanggal_berakhir || null,
        jenis: row.jenis || null,
        link_dokumen: row.link_dokumen || null
      });
      
      if (error) throw error;
      sukses++;
    } catch (err) {
      gagal++;
      gagalDetail.push(`Baris ${row._lineNumber} (${row.kampus}): ${err.message}`);
    }
  }
  
  btn.textContent = 'Import Data';
  btn.disabled = false;
  
  let html = `<div class="alert alert-success"><strong>✅ Selesai!</strong><br>Berhasil: <strong>${sukses}</strong><br>Gagal: <strong>${gagal}</strong></div>`;
  if (gagalDetail.length > 0) {
    html += `<div class="error-list">${gagalDetail.map(d => `<div>❌ ${d}</div>`).join('')}</div>`;
  }
  alertBox.innerHTML = html;
  
  loadKerjasama();
  if (gagal === 0) setTimeout(() => closeModal('modalImportKerjasama'), 3000);
}

// ============================================================
// SETUP DRAG & DROP
// ============================================================
export function setupKerjasamaDragDrop() {
  setupDragDrop('importAreaKjs', 'fileCSVKjs', handleFileSelectKjs);
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadKerjasama = loadKerjasama;
window.openTambahKerjasama = openTambahKerjasama;
window.editKerjasama = editKerjasama;
window.simpanKerjasama = simpanKerjasama;
window.hapusKerjasama = hapusKerjasama;
window.openImportKerjasama = openImportKerjasama;
window.downloadTemplateKjs = downloadTemplateKjs;
window.handleFileSelectKjs = handleFileSelectKjs;
window.prosesImportKjs = prosesImportKjs;