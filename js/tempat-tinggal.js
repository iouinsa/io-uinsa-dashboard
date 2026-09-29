// ============================================================
// TEMPAT TINGGAL — PETA + KAMAR MAHAD + DAFTAR MAHASISWA
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

// Pusat fallback (kalau semua alamat gagal)
const FALLBACK_LAT = -7.2575; // Surabaya
const FALLBACK_LNG = 112.7521;

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
  
  L.marker([UINSA_LAT, UINSA_LNG], {
    icon: L.divIcon({
      className: 'uinsa-marker',
      html: '<div style="background:#0a5c4a; color:white; padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px; white-space:nowrap; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏛 UINSA</div>',
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    })
  }).addTo(map).bindPopup('<strong>UIN Sunan Ampel Surabaya</strong>');
}

// ============================================================
// LOAD DAFTAR KAMAR (dari tabel kamar_mahad)
// ============================================================
async function loadDaftarKamar() {
  const { data } = await supabase
    .from('kamar_mahad')
    .select('id, no_kamar, kapasitas')
    .order('no_kamar');
  
  daftarKamar = data || [];
}

// ============================================================
// LOAD & RENDER KAMAR MAHAD (grid kotak)
// ============================================================
async function loadKamarMahad() {
  const grid = document.getElementById('kamarGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; grid-column: 1/-1;">Memuat data kamar...</div>';
  
  const { data: mhsData, error } = await supabase
    .from('mahasiswa')
    .select('id, nama, nim, no_kamar, jenis_tinggal')
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
    grid.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; grid-column: 1/-1;">Belum ada data kamar di database.</div>';
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
      const tampil = penghuni.slice(0, 3).map(p => p.nama || p.nim).join(', ');
      const sisa = penghuni.length > 3 ? ` +${penghuni.length - 3} lain` : '';
      namaList = `<div style="font-size:10px; color:#6b7280; margin-top:6px; line-height:1.3;">${tampil}${sisa}</div>`;
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
// PETA — MARKER DARI ALAMAT MAHASISWA (dengan fallback)
// ============================================================
async function loadPetaMahasiswa() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  
  const { data, error } = await supabase
    .from('mahasiswa_kontak')
    .select('alamat_sekarang, mahasiswa:mahasiswa_id (nama, nim, fakultas)')
    .not('alamat_sekarang', 'is', null);
  
  if (error || !data) return;
  
  // Kelompokkan per alamat unik
  const alamatMap = {};
  data.forEach(d => {
    const alamat = (d.alamat_sekarang || '').trim();
    if (!alamat || !d.mahasiswa) return;
    if (!alamatMap[alamat]) alamatMap[alamat] = [];
    alamatMap[alamat].push(d.mahasiswa);
  });
  
  const alamatList = Object.keys(alamatMap);
  const totalEl = document.getElementById('totalAlamat');
  
  if (totalEl) totalEl.textContent = `${alamatList.length} lokasi · memuat peta...`;
  
  // Hitung berapa yang berhasil & gagal
  let berhasil = 0;
  let gagal = 0;
  
  for (const alamat of alamatList) {
    let coords = getCachedCoords(alamat);
    let isFallback = false;
    
    if (!coords) {
      // Coba geocoding bertingkat
      coords = await geocodeWithFallback(alamat);
      
      if (coords) {
        setCachedCoords(alamat, coords);
      } else {
        // Fallback: taruh di pusat Surabaya
        coords = { lat: FALLBACK_LAT, lng: FALLBACK_LNG };
        isFallback = true;
        gagal++;
      }
      
      // Delay untuk hormati rate limit Nominatim
      await new Promise(r => setTimeout(r, 1100));
    }
    
    if (!isFallback) berhasil++;
    
    const mhs = alamatMap[alamat];
    
    // Marker normal (hijau) atau fallback (abu-abu)
    const markerColor = isFallback ? '#9ca3af' : '#0a5c4a';
    
    const popup = `
      <div style="font-size:13px; max-width: 250px;">
        <strong>${alamat}</strong>
        ${isFallback ? '<br><em style="color:#e67e22;">⚠ Titik perkiraan (alamat tidak spesifik)</em>' : ''}
        <br><em>${mhs.length} mahasiswa</em><br><br>
        ${mhs.map(m => `• ${m.nama} (${m.nim})`).join('<br>')}
      </div>
    `;
    
    const marker = L.circleMarker([coords.lat, coords.lng], {
      radius: 8,
      fillColor: markerColor,
      color: 'white',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(popup);
    
    // Tooltip nama alamat singkat
    marker.bindTooltip(alamat.length > 40 ? alamat.substring(0, 40) + '...' : alamat, {
      direction: 'top',
      offset: [0, -8]
    });
    
    mapMarkers.push(marker);
  }
  
  // Update status
  if (totalEl) {
    if (gagal > 0) {
      totalEl.textContent = `${alamatList.length} lokasi · ${berhasil} akurat · ${gagal} perkiraan`;
      totalEl.style.color = '#e67e22';
    } else {
      totalEl.textContent = `${alamatList.length} lokasi unik`;
      totalEl.style.color = '';
    }
  }
}

// ============================================================
// GEOCODING BERTINGKAT (fallback 3 level)
// ============================================================
async function geocodeWithFallback(alamat) {
  // Level 1: alamat lengkap
  let coords = await tryGeocode(alamat);
  if (coords) return coords;
  
  // Level 2: buang RT/RW/No rumah/GG
  const simpler = alamat
    .replace(/RT\.?\s*[\d\/]+/gi, '')
    .replace(/RW\.?\s*[\d\/]+/gi, '')
    .replace(/NO\.?\s*\d+[a-z]?/gi, '')
    .replace(/GG\.?\s*\w+/gi, '')
    .replace(/GANG\s+\w+/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^,|,$/g, '')
    .trim();
  
  if (simpler !== alamat && simpler.length > 5) {
    coords = await tryGeocode(simpler);
    if (coords) return coords;
  }
  
  // Level 3: ambil nama jalan utama saja
  const jalanOnly = alamat
    .split(',')[0]
    .replace(/RT\.?\s*[\d\/]+/gi, '')
    .replace(/RW\.?\s*[\d\/]+/gi, '')
    .replace(/NO\.?\s*\d+[a-z]?/gi, '')
    .replace(/GG\.?\s*\w+/gi, '')
    .replace(/GANG\s+\w+/gi, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (jalanOnly && jalanOnly.length > 3 && jalanOnly !== alamat) {
    coords = await tryGeocode(jalanOnly);
    if (coords) return coords;
  }
  
  // Level 4: coba nama kecamatan/kota yang ada di alamat
  const parts = alamat.split(',').map(p => p.trim()).filter(p => p.length > 2);
  if (parts.length > 1) {
    // Ambil 2 bagian terakhir (biasanya kecamatan, kota)
    const lastTwo = parts.slice(-2).join(', ');
    coords = await tryGeocode(lastTwo);
    if (coords) return coords;
  }
  
  return null;
}

// ============================================================
// TRY GEOCODE — Request ke Nominatim
// ============================================================
async function tryGeocode(alamat) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(alamat + ', Indonesia')}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IO-UINSA-Dashboard/1.0' }
    });
    const json = await res.json();
    
    if (json && json[0]) {
      return {
        lat: parseFloat(json[0].lat),
        lng: parseFloat(json[0].lon)
      };
    }
  } catch (e) {
    console.warn('Geocode error:', alamat, e);
  }
  return null;
}

// ============================================================
// CACHE KOORDINAT DI LOCALSTORAGE
// ============================================================
function getCachedCoords(alamat) {
  try {
    const c = localStorage.getItem('geocode_' + alamat);
    return c ? JSON.parse(c) : null;
  } catch (e) {
    return null;
  }
}

function setCachedCoords(alamat, coords) {
  try {
    localStorage.setItem('geocode_' + alamat, JSON.stringify(coords));
  } catch (e) {
    // Ignore — localStorage penuh
  }
}

// ============================================================
// LOAD TEMPAT TINGGAL MAHASISWA (tabel)
// ============================================================
async function loadTempatTinggalMahasiswa() {
  const tbody = document.getElementById('tbodyTempatTinggal');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Memuat data...</td></tr>';
  
  const { data: mhsData, error } = await supabase
    .from('mahasiswa')
    .select('id, nim, nama, fakultas, jenis_tinggal, no_kamar')
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
    no_kamar: m.no_kamar || null
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
export function editTempatTinggal(id) {
  const mhs = allTempatTinggal.find(t => t.id === id);
  if (!mhs) { alert('Data tidak ditemukan'); return; }
  
  document.getElementById('id_mahasiswa_tt').value = mhs.id;
  document.getElementById('nama_mahasiswa_tt').value = `${mhs.nama} (${mhs.nim})`;
  
  const kamarSelect = document.getElementById('no_kamar_tt');
  kamarSelect.innerHTML = '<option value="">— Pilih Kamar —</option>' + 
    daftarKamar.map(k => `<option value="${k.no_kamar}">${k.no_kamar}</option>`).join('');
  
  document.getElementById('jenis_tinggal_tt').value = mhs.jenis_tinggal || 'Lainnya';
  kamarSelect.value = mhs.no_kamar || '';
  
  toggleKamarField();
  
  document.getElementById('modalAlertTempatTinggal').innerHTML = '';
  showModal('modalEditTempatTinggal');
}

// ============================================================
// TOGGLE FIELD NO KAMAR
// ============================================================
export function toggleKamarField() {
  const jenis = document.getElementById('jenis_tinggal_tt').value;
  const rowKamar = document.getElementById('row_no_kamar');
  const kamarSelect = document.getElementById('no_kamar_tt');
  
  if (jenis === 'Mahad') {
    rowKamar.style.display = 'block';
    kamarSelect.setAttribute('required', 'required');
  } else {
    rowKamar.style.display = 'none';
    kamarSelect.removeAttribute('required');
    kamarSelect.value = '';
  }
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
  
  if (!jenis) {
    alertBox.innerHTML = '<div class="alert alert-error">❌ Jenis tinggal wajib dipilih.</div>';
    return;
  }
  
  if (jenis === 'Mahad' && !noKamar) {
    alertBox.innerHTML = '<div class="alert alert-error">❌ No. Kamar wajib diisi kalau tinggal di Mahad.</div>';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  alertBox.innerHTML = '';
  
  try {
    const payload = {
      jenis_tinggal: jenis,
      no_kamar: jenis === 'Mahad' ? noKamar : null
    };
    
    const { error } = await supabase
      .from('mahasiswa')
      .update(payload)
      .eq('id', id);
    
    if (error) throw error;
    
    alertBox.innerHTML = '<div class="alert alert-success">✅ Data berhasil disimpan.</div>';
    setTimeout(() => { 
      closeModal('modalEditTempatTinggal'); 
      loadTempatTinggalMahasiswa();
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