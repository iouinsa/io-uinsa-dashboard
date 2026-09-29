// ============================================================
// TEMPAT TINGGAL — PETA + KAMAR MAHAD + NON-MAHAD
// ============================================================

import { supabase } from './config.js';

// ============================================================
// STATE PETA
// ============================================================
let map = null;
let mapMarkers = [];

// Koordinat UINSA Surabaya (pusat peta)
const UINSA_LAT = -7.3214;
const UINSA_LNG = 112.7344;

// ============================================================
// LOAD TEMPAT TINGGAL (peta + kamar + non-mahad)
// ============================================================
export async function loadTempatTinggal() {
  initMap();
  await loadPetaMahasiswa();
  await loadKamarGrid();
  await loadNonMahad();
}

// ============================================================
// INISIALISASI PETA (sekali saja)
// ============================================================
function initMap() {
  if (map) return;
  
  map = L.map('map').setView([UINSA_LAT, UINSA_LNG], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);
  
  // Marker UINSA sebagai pusat
  L.marker([UINSA_LAT, UINSA_LNG], {
    icon: L.divIcon({
      className: 'uinsa-marker',
      html: '<div style="background:#0a5c4a; color:white; padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px; white-space:nowrap; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏛 UINSA</div>',
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    })
  }).addTo(map).bindPopup('<strong>UIN Sunan Ampel Surabaya</strong><br>Jl. A. Yani 117, Surabaya');
}

// ============================================================
// LOAD PETA — MARKER DARI ALAMAT MAHASISWA
// ============================================================
async function loadPetaMahasiswa() {
  // Hapus marker lama
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  
  // Ambil alamat_sekarang dari mahasiswa_kontak + nama dari mahasiswa
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
  document.getElementById('totalAlamat').textContent = `${alamatList.length} lokasi unik`;
  
  // Untuk setiap alamat unik, geocode & pasang marker
  for (const alamat of alamatList) {
    let coords = getCachedCoords(alamat);
    
    if (!coords) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(alamat + ', Indonesia')}&limit=1`,
          { headers: { 'User-Agent': 'IO-UINSA-Dashboard/1.0' } }
        );
        const json = await res.json();
        if (json[0]) {
          coords = { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
          setCachedCoords(alamat, coords);
        }
        // Nominatim butuh minimal 1 detik antar request
        await new Promise(r => setTimeout(r, 1100));
      } catch (e) {
        console.error('Geocode error:', alamat, e);
        continue;
      }
    }
    
    if (!coords) continue;
    
    // Popup isi
    const mhs = alamatMap[alamat];
    const popup = `
      <div style="font-size:13px; max-width: 250px;">
        <strong>${alamat}</strong><br>
        <em>${mhs.length} mahasiswa</em><br><br>
        ${mhs.map(m => `• ${m.nama} (${m.nim})`).join('<br>')}
      </div>
    `;
    
    const marker = L.marker([coords.lat, coords.lng]).addTo(map).bindPopup(popup);
    mapMarkers.push(marker);
  }
}

// ============================================================
// CACHE KOORDINAT DI LOCALSTORAGE
// ============================================================
function getCachedCoords(alamat) {
  const c = localStorage.getItem('geocode_' + alamat);
  return c ? JSON.parse(c) : null;
}

function setCachedCoords(alamat, coords) {
  localStorage.setItem('geocode_' + alamat, JSON.stringify(coords));
}

// ============================================================
// LOAD KAMAR MAHAD (grid 10 kotak)
// ============================================================
async function loadKamarGrid() {
  const { data, error } = await supabase
    .from('kamar_mahad')
    .select('*')
    .order('no_kamar');
  
  if (error || !data) return;
  
  const grid = document.getElementById('kamarGrid');
  
  if (data.length === 0) {
    grid.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; grid-column: 1/-1;">Belum ada data kamar.</div>';
    return;
  }
  
  grid.innerHTML = data.map(k => {
    const isFull = k.terisi >= k.kapasitas;
    const isEmpty = k.terisi === 0;
    const bg = isFull ? '#fadbd4' : isEmpty ? '#f4f6f8' : '#fef3d4';
    const color = isFull ? '#a03a2a' : isEmpty ? '#6b7280' : '#8a6015';
    
    return `<div class="kamar-box" style="background:${bg}; border-color:${color}40;">
      <div style="font-weight:700; font-size:15px; color:${color};">${k.no_kamar}</div>
      <div style="font-size:24px; font-weight:700; color:${color}; margin:4px 0;">${k.terisi}/${k.kapasitas}</div>
      <div style="font-size:11px; color:${color};">${isEmpty ? 'Kosong' : isFull ? 'Penuh' : 'Terisi'}</div>
      ${k.nama_penghuni ? `<div style="font-size:11px; color:#6b7280; margin-top:6px;">${k.nama_penghuni}</div>` : ''}
    </div>`;
  }).join('');
  
  document.getElementById('totalKamar').textContent = `${data.length} kamar`;
}

// ============================================================
// LOAD NON-MAHAD (kos / apartemen / lainnya)
// ============================================================
async function loadNonMahad() {
  const { data, error } = await supabase
    .from('tempat_tinggal')
    .select('*')
    .in('jenis', ['kos', 'apartemen', 'lainnya'])
    .order('created_at', { ascending: false });
  
  const tbody = document.getElementById('tbodyNonMahad');
  
  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Belum ada data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(t => `<tr>
    <td><strong>${t.nama_tempat || '—'}</strong></td>
    <td>${t.jenis || '—'}</td>
    <td>${t.alamat_lengkap || '—'}</td>
    <td>${t.nama_pemilik ? `${t.nama_pemilik}<br><small>${t.telepon_pemilik || ''}</small>` : '—'}</td>
    <td><span class="tag tag-active">${t.status || '—'}</span></td>
  </tr>`).join('');
  
  document.getElementById('totalNonMahad').textContent = `${data.length} tempat`;
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadTempatTinggal = loadTempatTinggal;