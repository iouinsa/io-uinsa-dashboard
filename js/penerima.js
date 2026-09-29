// ============================================================
// PENERIMA EMAIL — CRUD
// ============================================================

import { supabase } from './config.js';
import { escapeAttr, showModal, closeModal, konfirmasi } from './utils.js';

// ============================================================
// LOAD DAFTAR PENERIMA
// ============================================================
export async function loadPenerima() {
  const tbody = document.getElementById('tbodyPenerima');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Memuat data...</td></tr>';
  
  const { data, error } = await supabase
    .from('penerima_email')
    .select('*')
    .order('id');
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Belum ada data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(p => `<tr>
    <td><strong>${p.nama}</strong></td>
    <td>${p.jabatan || '—'}</td>
    <td>${p.email}</td>
    <td><span class="tag tag-muted">${p.kategori}</span></td>
    <td><span class="tag ${p.aktif ? 'tag-active' : 'tag-muted'}">${p.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.editPenerima(${p.id})">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="window.hapusPenerima(${p.id}, '${escapeAttr(p.nama || '')}')">Hapus</button>
    </td>
  </tr>`).join('');
  
  document.getElementById('totalPenerima').textContent = `${data.length} penerima`;
}

// ============================================================
// FORM TAMBAH
// ============================================================
export function openTambahPenerima() {
  document.getElementById('formPenerimaTitle').textContent = 'Tambah Penerima';
  document.getElementById('formPenerima').reset();
  document.getElementById('id_penerima').value = '';
  document.getElementById('modalAlertPenerima').innerHTML = '';
  showModal('modalFormPenerima');
}

// ============================================================
// FORM EDIT
// ============================================================
export async function editPenerima(id) {
  const { data, error } = await supabase
    .from('penerima_email')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) { alert('Error: ' + error.message); return; }
  
  document.getElementById('formPenerimaTitle').textContent = 'Edit Penerima';
  const form = document.getElementById('formPenerima');
  form.reset();
  document.getElementById('id_penerima').value = data.id;
  document.getElementById('modalAlertPenerima').innerHTML = '';
  
  form.elements['nama'].value = data.nama || '';
  form.elements['jabatan'].value = data.jabatan || '';
  form.elements['email'].value = data.email || '';
  form.elements['kategori'].value = data.kategori || 'semua';
  form.elements['aktif'].checked = data.aktif;
  
  showModal('modalFormPenerima');
}

// ============================================================
// SIMPAN (INSERT / UPDATE)
// ============================================================
export async function simpanPenerima() {
  const form = document.getElementById('formPenerima');
  const btn = document.getElementById('btnSimpanPenerima');
  const alertBox = document.getElementById('modalAlertPenerima');
  const editId = document.getElementById('id_penerima').value;
  
  if (!form.checkValidity()) { form.reportValidity(); return; }
  
  const payload = {
    nama: form.elements['nama'].value.trim(),
    jabatan: form.elements['jabatan'].value.trim() || null,
    email: form.elements['email'].value.trim(),
    kategori: form.elements['kategori'].value,
    aktif: form.elements['aktif'].checked
  };
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    if (editId) {
      const { error } = await supabase.from('penerima_email').update(payload).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('penerima_email').insert(payload);
      if (error) throw error;
    }
    
    alertBox.innerHTML = '<div class="alert alert-success">✅ Data berhasil disimpan.</div>';
    setTimeout(() => { closeModal('modalFormPenerima'); loadPenerima(); }, 1200);
    
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
export function hapusPenerima(id, nama) {
  konfirmasi(`Yakin ingin menghapus penerima "${nama}"?`, async () => {
    const { error } = await supabase.from('penerima_email').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    loadPenerima();
  });
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadPenerima = loadPenerima;
window.openTambahPenerima = openTambahPenerima;
window.editPenerima = editPenerima;
window.simpanPenerima = simpanPenerima;
window.hapusPenerima = hapusPenerima;