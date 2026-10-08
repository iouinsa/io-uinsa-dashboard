// ============================================================
// TEMPAT TINGGAL — PETA + KAMAR MAHAD + DAFTAR MAHASISWA
// Koordinat manual (lat/lng) — tidak pakai geocoding otomatis
// ============================================================

import { supabase } from './config.js';
import { showModal, closeModal } from './utils.js';

// State
let map = null;
let mapMarkers = [];
let allTempatTinggal = [];
let searchTempatTinggalQuery = '';
let daftarKamar = [];

const UINSA_LAT = -7.3214;
const UINSA_LNG = 112.7344;

// ============================================================
// SORT KAMAR
// ============================================================
function sortKamar(arr) {
  return arr.slice().sort((a, b) => {
    const numA = parseInt((a.no_kamar || '').replace(/\D/g, '')) || 0;
    const numB = parseInt((b.no_kamar || '').replace(/\D/g, '')) || 0;
    return numA - numB;
  });
}

// ============================================================
// LOAD TEMPAT TINGGAL
// ============================================================
export async function loadTempatTinggal() {
  initMap();
  await loadDaftarKamar();
  await loadPetaMahasiswa();
  await loadTempatTinggalMahasiswa();
}

// ============================================================
// INISIALISASI PETA
// ============================================================
function initMap() {
  if (map) return;
  
  map = L.map('map').setView([UINSA_LAT, UINSA_LNG], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);
}

// ============================================================
// LOAD DAFTAR KAMAR
// ============================================================
async function loadDaftarKamar() {
  const { data } = await supabase
    .from('kamar_mahad')
    .select('id, no_kamar, kapasitas');
  
  daftarKamar = sortKamar(data || []);
}

// ============================================================
// LOAD & RENDER KAMAR MAHAD
// ============================================================
async function loadKamarMahad() {
  const grid = document.getElementById('kamarGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; grid-column: 1/-1;">Memuat data kamar...</div>';
  
  const { data: mhsData, error } = await supabase
    .from('mahasiswa')
    .select('id, nama, nim, no_kamar, jenis_tinggal, jenis_kelamin')
    .eq('jenis_tinggal', 'Mahad')
    .not('no_kamar', 'is', null);
  
  if (error) {
    grid.innerHTML = `<div style="padding:20px; text-align:center; color:#c0392b; grid-column: 1/-1;">Error: ${error.message}</div>`;
    return;
  }
  
  const perKamar = {};
  (mhsData || []).forEach(m => {
    const k = m.no_kamar;
    if (!k) return;
    if (!perKamar[k]) perKamar[k] = [];
    perKamar[k].push(m);
  });
  
  if (daftarKamar.length === 0) {
    grid.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; grid-column: 1/-1;">Belum ada data kamar.</div>';
    return;
  }
  
  grid.innerHTML = daftarKamar.map(k => {
    const penghuni = perKamar[k.no_kamar] || [];
    const terisi = penghuni.length;
    const kapasitas = k.kapasitas || 4;
    const isFull = terisi >= kapasitas;
    const isEmpty = terisi === 0;
    
    const bg = isFull ? '#fadbd4' : isEmpty ? '#f4f6f8' : '#fef3d4';
    const color = isFull ? '#a03a2a' : isEmpty ? '#6b7280' : '#8a6015';
    
    let namaList = '';
    if (penghuni.length > 0) {
      namaList = `<div style="font-size:10px; color:#6b7280; margin-top:6px; line-height:1.4; text-align:left;">` +
        penghuni.map((p, idx) => `<div>${idx + 1}. ${p.nama || p.nim}</div>`).join('') +
        `</div>`;
    }
    
    return `<div class="kamar-box" style="background:${bg}; border-color:${color}40;">
      <div style="font-weight:700; font-size:15px; color:${color};">${k.no_kamar}</div>
      <div style="font-size:24px; font-weight:700; color:${color}; margin:4px 0;">${terisi}/${kapasitas}</div>
      <div style="font-size:11px; color:${color}; font-weight:600;">${isEmpty ? 'Kosong' : isFull ? 'Penuh' : 'Terisi'}</div>
      ${namaList}
    </div>`;
  }).join('');
  
  const totalKapasitas = daftarKamar.reduce((s, k) => s + (k.kapasitas || 4), 0);
  const totalTerisi = Object.values(perKamar).reduce((s, arr) => s + arr.length, 0);
  
  const el = document.getElementById('totalKamar');
  if (el) el.textContent = `${daftarKamar.length} kamar · ${totalTerisi}/${totalKapasitas} terisi`;
}

// ============================================================
// PETA — MARKER DARI KOORDINAT TERSIMPAN (INSTAN)
// ============================================================
async function loadPetaMahasiswa() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  
  const totalEl = document.getElementById('totalAlamat');
  
  const { data, error } = await supabase
    .from('mahasiswa_kontak')
    .select('id, mahasiswa_id, alamat_sekarang, latitude, longitude, mahasiswa:mahasiswa_id (nama, nim, fakultas, jenis_tinggal, no_kamar)');
  
  if (error || !data) return;
  
  // Kelompokkan
  const alamatMap = {};
  const mahadList = [];
  let tanpaKoordinat = 0;
  
  data.forEach(d => {
    if (!d.mahasiswa) return;
    const mhs = d.mahasiswa;
    
    // Mahasiswa mahad
    if (mhs.jenis_tinggal === 'Mahad') {
      mahadList.push(mhs);
      return;
    }
    
    // Bukan mahad — cek alamat & koordinat
    const alamat = (d.alamat_sekarang || '').trim();
    if (!alamat) return;
    
    // Kalau tidak ada koordinat → skip (tidak ditampilkan di peta)
    if (!d.latitude || !d.longitude) {
      tanpaKoordinat++;
      return;
    }
    
    // Group by koordinat (bukan alamat) — biar kalau ada 2 mahasiswa di alamat sama, marker tetap 1
    const key = `${d.latitude}_${d.longitude}`;
    
    if (!alamatMap[key]) {
      alamatMap[key] = {
        coords: { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude) },
        alamat: alamat,
        mahasiswa: []
      };
    }
    
    alamatMap[key].mahasiswa.push(mhs);
  });
  
  const alamatList = Object.keys(alamatMap);
  
  // Pasang marker (INSTAN — tidak ada geocoding)
  alamatList.forEach(key => {
    const info = alamatMap[key];
    
    const popup = `
      <div style="font-size:13px; max-width: 250px;">
        <strong>${info.alamat}</strong>
        <br><em>${info.mahasiswa.length} mahasiswa</em><br><br>
        ${info.mahasiswa.map(m => `• ${m.nama || '-'} (${m.nim})`).join('<br>')}
      </div>
    `;
    
    const marker = L.circleMarker([info.coords.lat, info.coords.lng], {
      radius: 8,
      fillColor: '#2563eb',
      color: 'white',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(popup);
    
    marker.bindTooltip(info.alamat.length > 40 ? info.alamat.substring(0, 40) + '...' : info.alamat, {
      direction: 'top',
      offset: [0, -8]
    });
    
    mapMarkers.push(marker);
  });
  
  // Marker UINSA
  addMarkerUinsa(mahadList);
  
  // Update status
  if (totalEl) {
    let statusText = `${alamatList.length} lokasi`;
    if (mahadList.length > 0) statusText += ` · ${mahadList.length} di mahad`;
    if (tanpaKoordinat > 0) {
      statusText += ` · ⚠️ ${tanpaKoordinat} belum ada koordinat`;
      totalEl.style.color = '#e67e22';
    } else {
      totalEl.style.color = '';
    }
    totalEl.textContent = statusText;
  }
}

// ============================================================
// MARKER UINSA
// ============================================================
function addMarkerUinsa(mahadList) {
  const popupUinsa = `
    <div style="font-size:13px; max-width: 320px;">
      <strong style="font-size:14px;">🏛 UIN Sunan Ampel Surabaya</strong><br>
      <em style="color:#6b7280; font-size:11px;">Jl. Ahmad Yani No. 117, Surabaya</em>
      ${mahadList.length > 0 ? `
        <hr style="margin:8px 0; border:none; border-top:1px solid #e2e8f0;">
        <strong style="color:#0a5c4a;">🏠 Mahasiswa di Mahad (${mahadList.length})</strong>
        <div style="margin-top:6px; font-size:12px; line-height:1.6;">
          ${mahadList.map(m => `• ${m.nama || '-'} <span style="color:#6b7280; font-size:11px;">(${m.nim})</span>${m.no_kamar ? ` — <em style="color:#8a6015;">${m.no_kamar}</em>` : ''}`).join('<br>')}
        </div>
      ` : `
        <hr style="margin:8px 0; border:none; border-top:1px solid #e2e8f0;">
        <em style="color:#6b7280; font-size:12px;">Belum ada mahasiswa di Mahad</em>
      `}
    </div>
  `;
  
  const markerUinsa = L.marker([UINSA_LAT, UINSA_LNG], {
    icon: L.divIcon({
      className: 'uinsa-marker',
      html: `<div style="background:#0a5c4a; color:white; padding:6px 12px; border-radius:6px; font-weight:700; font-size:13px; white-space:nowrap; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏛 UINSA${mahadList.length > 0 ? ` · ${mahadList.length} mahad` : ''}</div>`,
      iconSize: [130, 34],
      iconAnchor: [65, 17]
    })
  }).addTo(map).bindPopup(popupUinsa);
  
  mapMarkers.push(markerUinsa);
}

// ============================================================
// LOAD TEMPAT TINGGAL MAHASISWA (tabel)
// ============================================================
async function loadTempatTinggalMahasiswa() {
  const tbody = document.getElementById('tbodyTempatTinggal');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Memuat data...</td></tr>';
  
  const { data: mhsData, error } = await supabase
    .from('mahasiswa')
    .select('id, nim, nama, fakultas, jenis_tinggal, no_kamar, jenis_kelamin')
    .in('status', ['Aktif', 'Cuti'])
    .order('nama');
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  const { data: kontakData } = await supabase
    .from('mahasiswa_kontak')
    .select('mahasiswa_id, alamat_sekarang');
  
  const alamatMap = {};
  (kontakData || []).forEach(k => {
    alamatMap[k.mahasiswa_id] = k.alamat_sekarang || '';
  });
  
  allTempatTinggal = (mhsData || []).map(m => ({
    id: m.id,
    nim: m.nim,
    nama: m.nama || '(Tanpa Nama)',
    fakultas: m.fakultas || '—',
    alamat_sekarang: alamatMap[m.id] || '—',
    jenis_tinggal: m.jenis_tinggal || 'Lainnya',
    no_kamar: m.no_kamar || null,
    jenis_kelamin: m.jenis_kelamin || null
  }));
  
  await loadKamarMahad();
  renderTempatTinggal();
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTempatTinggal() {
  const tbody = document.getElementById('tbodyTempatTinggal');
  
  let filtered = allTempatTinggal;
  if (searchTempatTinggalQuery.trim()) {
    const q = searchTempatTinggalQuery.toLowerCase().trim();
    filtered = allTempatTinggal.filter(t => 
      (t.nama || '').toLowerCase().includes(q) ||
      (t.nim || '').toLowerCase().includes(q) ||
      (t.fakultas || '').toLowerCase().includes(q) ||
      (t.alamat_sekarang || '').toLowerCase().includes(q) ||
      (t.jenis_tinggal || '').toLowerCase().includes(q)
    );
  }
  
  if (filtered.length === 0) {
    const msg = searchTempatTinggalQuery.trim() 
      ? `Tidak ada hasil untuk "<strong>${searchTempatTinggalQuery}</strong>".`
      : 'Belum ada data.';
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${msg}</td></tr>`;
    document.getElementById('totalTempatTinggal').textContent = '0 mahasiswa';
    return;
  }
  
  tbody.innerHTML = filtered.map(t => {
    const jenisClass = 
      t.jenis_tinggal === 'Mahad' ? 'tag-active' :
      t.jenis_tinggal === 'Kos' ? 'tag-warning' :
      t.jenis_tinggal === 'Apartemen' ? 'tag-mou' :
      t.jenis_tinggal === 'Kontrak' ? 'tag-warning' :
      'tag-muted';
    
    const kamarInfo = t.no_kamar ? ` (${t.no_kamar})` : '';
    
    return `<tr>
      <td><strong>${t.nama}</strong></td>
      <td>${t.nim}</td>
      <td>${t.fakultas}</td>
      <td>${t.alamat_sekarang}</td>
      <td><span class="tag ${jenisClass}">${t.jenis_tinggal}${kamarInfo}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="window.editTempatTinggal(${t.id})">Edit</button></td>
    </tr>`;
  }).join('');
  
  if (searchTempatTinggalQuery.trim()) {
    document.getElementById('totalTempatTinggal').textContent = 
      `${filtered.length} dari ${allTempatTinggal.length} mahasiswa`;
  } else {
    document.getElementById('totalTempatTinggal').textContent = `${filtered.length} mahasiswa`;
  }
}

// ============================================================
// SEARCH
// ============================================================
export function searchTempatTinggal(query) {
  searchTempatTinggalQuery = query;
  renderTempatTinggal();
}

// ============================================================
// EDIT TEMPAT TINGGAL
// ============================================================
export async function editTempatTinggal(id) {
  const mhs = allTempatTinggal.find(t => t.id === id);
  if (!mhs) { alert('Data tidak ditemukan'); return; }
  
  // Ambil koordinat dari database
  const { data: kontak } = await supabase
    .from('mahasiswa_kontak')
    .select('latitude, longitude')
    .eq('mahasiswa_id', id)
    .maybeSingle();
  
  document.getElementById('id_mahasiswa_tt').value = mhs.id;
  document.getElementById('nama_mahasiswa_tt').value = `${mhs.nama} (${mhs.nim})`;
  
  const kamarSelect = document.getElementById('no_kamar_tt');
  kamarSelect.innerHTML = '<option value="">— Pilih Kamar —</option>' + 
    daftarKamar.map(k => `<option value="${k.no_kamar}">${k.no_kamar}</option>`).join('');
  
  document.getElementById('jenis_tinggal_tt').value = mhs.jenis_tinggal || 'Lainnya';
  kamarSelect.value = mhs.no_kamar || '';
  
  // Set koordinat
  document.getElementById('latitude_tt').value = (kontak && kontak.latitude) || '';
  document.getElementById('longitude_tt').value = (kontak && kontak.longitude) || '';
  
  // Simpan jenis kelamin untuk validasi
  document.getElementById('jenis_kelamin_tt').value = mhs.jenis_kelamin || '';
  
  toggleKamarField();
  
  document.getElementById('modalAlertTempatTinggal').innerHTML = '';
  showModal('modalEditTempatTinggal');
}

// ============================================================
// TOGGLE FIELD NO KAMAR
// ============================================================
export function toggleKamarField() {
  const jenis = document.getElementById('jenis_tinggal_tt').value;
  const jk = (document.getElementById('jenis_kelamin_tt').value || '').toUpperCase();
  const rowKamar = document.getElementById('row_no_kamar');
  const kamarSelect = document.getElementById('no_kamar_tt');
  const kamarLabel = document.getElementById('label_no_kamar');
  
  const wajibIsi = (jenis === 'Mahad' && jk === 'L');
  
  if (jenis === 'Mahad') {
    rowKamar.style.display = 'block';
    
    if (wajibIsi) {
      kamarSelect.setAttribute('required', 'required');
      if (kamarLabel) kamarLabel.innerHTML = 'No. Kamar <span class="req">*</span>';
    } else {
      kamarSelect.removeAttribute('required');
      if (kamarLabel) kamarLabel.innerHTML = 'No. Kamar <small style="color:#6b7280; font-weight:400;">(opsional untuk mahasiswa perempuan)</small>';
    }
  } else {
    rowKamar.style.display = 'none';
    kamarSelect.removeAttribute('required');
    kamarSelect.value = '';
  }
}

// ============================================================
// BUKA GOOGLE MAPS
// ============================================================
export function bukaGoogleMaps() {
  const alamat = allTempatTinggal.find(t => t.id == document.getElementById('id_mahasiswa_tt').value);
  const alamatText = alamat ? alamat.alamat_sekarang : '';
  
  const query = alamatText && alamatText !== '—' 
    ? encodeURIComponent(alamatText)
    : 'UIN Sunan Ampel Surabaya';
  
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

// ============================================================
// SIMPAN
// ============================================================
export async function simpanTempatTinggal() {
  const btn = document.getElementById('btnSimpanTempatTinggal');
  const alertBox = document.getElementById('modalAlertTempatTinggal');
  
  const id = document.getElementById('id_mahasiswa_tt').value;
  const jenis = document.getElementById('jenis_tinggal_tt').value;
  const noKamar = document.getElementById('no_kamar_tt').value;
  const jk = (document.getElementById('jenis_kelamin_tt').value || '').toUpperCase();
  const latInput = document.getElementById('latitude_tt').value.trim();
  const lngInput = document.getElementById('longitude_tt').value.trim();
  
  if (!jenis) {
    alertBox.innerHTML = '<div class="alert alert-error">❌ Jenis tinggal wajib dipilih.</div>';
    return;
  }
  
  if (jenis === 'Mahad' && jk === 'L' && !noKamar) {
    alertBox.innerHTML = '<div class="alert alert-error">❌ No. Kamar wajib diisi untuk mahasiswa laki-laki di Mahad.</div>';
    return;
  }
  
  // Validasi koordinat
  let lat = null, lng = null;
  if (latInput || lngInput) {
    if (!latInput || !lngInput) {
      alertBox.innerHTML = '<div class="alert alert-error">❌ Latitude dan Longitude harus diisi keduanya, atau dikosongkan keduanya.</div>';
      return;
    }
    
    lat = parseFloat(latInput);
    lng = parseFloat(lngInput);
    
    if (isNaN(lat) || isNaN(lng)) {
      alertBox.innerHTML = '<div class="alert alert-error">❌ Format koordinat salah. Contoh: -7.369555</div>';
      return;
    }
    
    if (lat < -90 || lat > 90) {
      alertBox.innerHTML = '<div class="alert alert-error">❌ Latitude harus antara -90 dan 90</div>';
      return;
    }
    
    if (lng < -180 || lng > 180) {
      alertBox.innerHTML = '<div class="alert alert-error">❌ Longitude harus antara -180 dan 180</div>';
      return;
    }
  }
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    // Update mahasiswa
    const payload = {
      jenis_tinggal: jenis,
      no_kamar: (jenis === 'Mahad' && noKamar) ? noKamar : null
    };
    
    const { error: err1 } = await supabase
      .from('mahasiswa')
      .update(payload)
      .eq('id', id);
    
    if (err1) throw err1;
    
    // Update koordinat di mahasiswa_kontak
    const { error: err2 } = await supabase
      .from('mahasiswa_kontak')
      .update({
        latitude: lat,
        longitude: lng
      })
      .eq('mahasiswa_id', id);
    
    if (err2) throw err2;
    
    alertBox.innerHTML = '<div class="alert alert-success">✅ Data berhasil disimpan.</div>';
    setTimeout(() => { 
      closeModal('modalEditTempatTinggal'); 
      loadTempatTinggal();
    }, 1200);
    
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadTempatTinggal = loadTempatTinggal;
window.searchTempatTinggal = searchTempatTinggal;
window.editTempatTinggal = editTempatTinggal;
window.simpanTempatTinggal = simpanTempatTinggal;
window.toggleKamarField = toggleKamarField;
window.bukaGoogleMaps = bukaGoogleMaps;
