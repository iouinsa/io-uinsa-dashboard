// ============================================================
// PENERIMA EMAIL — CRUD + SEARCH + AKUN LOGIN
// ============================================================

import { supabase } from './config.js';
import { escapeAttr, showModal, closeModal, konfirmasi } from './utils.js';

let allPenerima = [];
let searchPenerimaQuery = '';

// Password default untuk akun baru
const DEFAULT_PASSWORD = 'iouinsa';

// ============================================================
// LOAD DAFTAR PENERIMA
// ============================================================
export async function loadPenerima() {
  const tbody = document.getElementById('tbodyPenerima');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Memuat data...</td></tr>';
  
  const { data, error } = await supabase
    .from('penerima_email')
    .select('*')
    .order('id');
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  allPenerima = data || [];
  renderPenerima();
}

// ============================================================
// RENDER TABEL PENERIMA
// ============================================================
function renderPenerima() {
  const tbody = document.getElementById('tbodyPenerima');
  
  let filtered = allPenerima;
  if (searchPenerimaQuery.trim()) {
    const q = searchPenerimaQuery.toLowerCase().trim();
    filtered = allPenerima.filter(p => 
      (p.nama || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.jabatan || '').toLowerCase().includes(q) ||
      (p.kategori || '').toLowerCase().includes(q)
    );
  }
  
  if (filtered.length === 0) {
    const msg = searchPenerimaQuery.trim() 
      ? `Tidak ada hasil untuk "<strong>${searchPenerimaQuery}</strong>".`
      : 'Belum ada data.';
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">${msg}</td></tr>`;
    document.getElementById('totalPenerima').textContent = '0 penerima';
    return;
  }
  
  tbody.innerHTML = filtered.map(p => {
    // Status akun login
    let akunHtml;
    if (p.user_id) {
      const roleLabel = p.role === 'admin' ? 'Admin' : 'Viewer';
      const roleCls = p.role === 'admin' ? 'tag-active' : 'tag-mou';
      akunHtml = `<span class="tag ${roleCls}">✓ ${roleLabel}</span>`;
    } else {
      akunHtml = `<span class="tag tag-muted">Belum ada</span>`;
    }
    
    // Tombol aksi akun
    let akunBtn;
    if (p.user_id) {
      akunBtn = `<button class="btn btn-danger btn-sm" onclick="window.hapusAkunPenerima(${p.id}, '${escapeAttr(p.nama || '')}')">Hapus Akun</button>`;
    } else {
      akunBtn = `<button class="btn btn-primary btn-sm" onclick="window.openBuatAkun(${p.id})">Buat Akun</button>`;
    }
    
    return `<tr>
      <td><strong>${p.nama}</strong></td>
      <td>${p.jabatan || '—'}</td>
      <td>${p.email}</td>
      <td><span class="tag tag-muted">${p.kategori}</span></td>
      <td><span class="tag ${p.aktif ? 'tag-active' : 'tag-muted'}">${p.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td>${akunHtml}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${akunBtn}
          <button class="btn btn-outline btn-sm" onclick="window.editPenerima(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window.hapusPenerima(${p.id}, '${escapeAttr(p.nama || '')}')">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  
  if (searchPenerimaQuery.trim()) {
    document.getElementById('totalPenerima').textContent = 
      `${filtered.length} dari ${allPenerima.length} penerima`;
  } else {
    document.getElementById('totalPenerima').textContent = `${filtered.length} penerima`;
  }
}

// ============================================================
// SEARCH
// ============================================================
export function searchPenerima(query) {
  searchPenerimaQuery = query;
  renderPenerima();
}

// ============================================================
// FORM TAMBAH PENERIMA
// ============================================================
export function openTambahPenerima() {
  document.getElementById('formPenerimaTitle').textContent = 'Tambah Penerima';
  document.getElementById('formPenerima').reset();
  document.getElementById('id_penerima').value = '';
  document.getElementById('modalAlertPenerima').innerHTML = '';
  showModal('modalFormPenerima');
}

// ============================================================
// FORM EDIT PENERIMA
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
// SIMPAN PENERIMA
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
// HAPUS PENERIMA
// ============================================================
export function hapusPenerima(id, nama) {
  const p = allPenerima.find(x => x.id === id);
  let pesan = `Yakin ingin menghapus penerima "${nama}"?`;
  
  if (p && p.user_id) {
    pesan += `\n\n⚠️ Penerima ini punya akun login. Akun login juga akan dihapus.`;
  }
  
  konfirmasi(pesan, async () => {
    try {
      // Kalau punya akun, hapus akun dulu
      if (p && p.user_id) {
        const { data: result, error: rpcError } = await supabase.rpc('hapus_akun_penerima', {
          p_user_id: p.user_id
        });
        
        if (rpcError) throw rpcError;
        if (!result.success) throw new Error(result.error);
      }
      
      // Hapus dari penerima_email
      const { error } = await supabase.from('penerima_email').delete().eq('id', id);
      if (error) throw error;
      
      loadPenerima();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  });
}

// ============================================================
// BUAT AKUN — BUKA MODAL
// ============================================================
export function openBuatAkun(id) {
  const p = allPenerima.find(x => x.id === id);
  if (!p) { alert('Data tidak ditemukan'); return; }
  
  document.getElementById('buatAkunPenerimaId').value = p.id;
  document.getElementById('buatAkunNama').value = p.nama;
  document.getElementById('buatAkunEmail').value = p.email;
  document.getElementById('buatAkunRole').value = 'viewer';
  document.getElementById('buatAkunPassword').value = DEFAULT_PASSWORD;
  document.getElementById('modalAlertBuatAkun').innerHTML = '';
  
  showModal('modalBuatAkun');
}

// ============================================================
// BUAT AKUN — PROSES
// ============================================================
export async function prosesBuatAkun() {
  const btn = document.getElementById('btnProsesBuatAkun');
  const alertBox = document.getElementById('modalAlertBuatAkun');
  
  const nama = document.getElementById('buatAkunNama').value;
  const email = document.getElementById('buatAkunEmail').value;
  const role = document.getElementById('buatAkunRole').value;
  const password = document.getElementById('buatAkunPassword').value;
  
  if (!password || password.length < 6) {
    alertBox.innerHTML = '<div class="alert alert-error">❌ Password minimal 6 karakter.</div>';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Membuat akun...';
  alertBox.innerHTML = '';
  
  try {
    const { data: result, error: rpcError } = await supabase.rpc('buat_akun_penerima', {
      p_email: email,
      p_nama: nama,
      p_role: role,
      p_password: password
    });
    
    if (rpcError) throw rpcError;
    if (!result.success) throw new Error(result.error);
    
    alertBox.innerHTML = `<div class="alert alert-success">
      ✅ Akun berhasil dibuat!<br><br>
      <strong>Email:</strong> ${email}<br>
      <strong>Password:</strong> ${password}<br>
      <strong>Role:</strong> ${role === 'admin' ? 'Admin' : 'Viewer'}<br><br>
      <small>Kirim info login ini ke penerima via WhatsApp/chat.</small>
    </div>`;
    
    setTimeout(() => { closeModal('modalBuatAkun'); loadPenerima(); }, 4000);
    
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat Akun';
  }
}

// ============================================================
// HAPUS AKUN PENERIMA
// ============================================================
export function hapusAkunPenerima(penerimaId, nama) {
  const p = allPenerima.find(x => x.id === penerimaId);
  if (!p || !p.user_id) { alert('Akun tidak ditemukan'); return; }
  
  konfirmasi(
    `Yakin ingin menghapus AKUN LOGIN untuk "${nama}"?\n\nData penerima tetap ada, hanya akun login yang dihapus.`,
    async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('hapus_akun_penerima', {
          p_user_id: p.user_id
        });
        
        if (rpcError) throw rpcError;
        if (!result.success) throw new Error(result.error);
        
        loadPenerima();
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }
  );
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadPenerima = loadPenerima;
window.searchPenerima = searchPenerima;
window.openTambahPenerima = openTambahPenerima;
window.editPenerima = editPenerima;
window.simpanPenerima = simpanPenerima;
window.hapusPenerima = hapusPenerima;
window.openBuatAkun = openBuatAkun;
window.prosesBuatAkun = prosesBuatAkun;
window.hapusAkunPenerima = hapusAkunPenerima;