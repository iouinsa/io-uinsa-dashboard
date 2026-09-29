// ============================================================
// TEMPAT TINGGAL — PETA + KAMAR MAHAD + NON-MAHAD + SEARCH
// ============================================================

import { supabase } from './config.js';

// ============================================================
// STATE
// ============================================================
let map = null;
let mapMarkers = [];
let allNonMahad = [];
let searchNonMahadQuery = '';

const UINSA_LAT = -7.3214;
const UINSA_LNG = 112.7344;

// ============================================================
// LOAD TEMPAT TINGGAL
// ============================================================
export async function loadTempatTinggal() {
  initMap();
  await loadPetaMahasiswa();
  await loadKamarGrid();
  await loadNonMahad();
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
  }).addTo(map).bindPopup('<strong>UIN Sunan Ampel Surabaya</strong><br>Jl. A. Yani 117, Surabaya');
}

// ============================================================
// PETA — MARKER DARI ALAMAT MAHASISWA
// ============================================================
async function loadPetaMahasiswa() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  
  const { data, error } = await supabase
    .from('mahasiswa_kontak')
    .select('alamat_sekarang, mahasiswa:mahasiswa_id (nama, nim, fakultas)')
    .not('alamat_sekarang', 'is', null);
  
  if (error || !data) return;
  
  const alamatMap = {};
  data.forEach(d => {
    const alamat = (d.alamat_sekarang || '').trim();
    if (!alamat || !d.mahasiswa) return;
    if (!alamatMap[alamat]) alamatMap[alamat] = [];
    alamatMap[alamat].push(d.mahasiswa);
  });
  
  const alamatList = Object.keys(alamatMap);
  document.getElementById('totalAlamat').textContent = `${alamatList.length} lokasi unik`;
  
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
        await new Promise(r => setTimeout(r, 1100));
      } catch (e) {
        console.error('Geocode error:', alamat, e);
        continue;
      }
    }
    
    if (!coords) continue;
    
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

function getCachedCoords(alamat) {
  const c = localStorage.getItem('geocode_' + alamat);
  return c ? JSON.parse(c) : null;
}

function setCachedCoords(alamat, coords) {
  localStorage.setItem('geocode_' + alamat, JSON.stringify(coords));
}

// ============================================================
// KAMAR MAHAD
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
// NON-MAHAD
// ============================================================
async function loadNonMahad() {
  const { data, error } = await supabase
    .from('tempat_tinggal')
    .select('*')
    .in('jenis', ['kos', 'apartemen', 'lainnya'])
    .order('created_at', { ascending: false });
  
  if (error) {
    document.getElementById('tbodyNonMahad').innerHTML = 
      `<tr><td colspan="5" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  allNonMahad = data || [];
  renderNonMahad();
}

// ============================================================
// RENDER TABEL NON-MAHAD (dengan search)
// ============================================================
function renderNonMahad() {
  const tbody = document.getElementById('tbodyNonMahad');
  
  let filtered = allNonMahad;
  if (searchNonMahadQuery.trim()) {
    const q = searchNonMahadQuery.toLowerCase().trim();
    filtered = allNonMahad.filter(t => 
      (t.nama_tempat || '').toLowerCase().includes(q) ||
      (t.jenis || '').toLowerCase().includes(q) ||
      (t.alamat_lengkap || '').toLowerCase().includes(q) ||
      (t.nama_pemilik || '').toLowerCase().includes(q) ||
      (t.kota || '').toLowerCase().includes(q)
    );
  }
  
  if (filtered.length === 0) {
    const msg = searchNonMahadQuery.trim() 
      ? `Tidak ada hasil untuk "<strong>${searchNonMahadQuery}</strong>".`
      : 'Belum ada data.';
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">${msg}</td></tr>`;
    document.getElementById('totalNonMahad').textContent = '0 tempat';
    return;
  }
  
  tbody.innerHTML = filtered.map(t => `<tr>
    <td><strong>${t.nama_tempat || '—'}</strong></td>
    <td>${t.jenis || '—'}</td>
    <td>${t.alamat_lengkap || '—'}</td>
    <td>${t.nama_pemilik ? `${t.nama_pemilik}<br><small>${t.telepon_pemilik || ''}</small>` : '—'}</td>
    <td><span class="tag tag-active">${t.status || '—'}</span></td>
  </tr>`).join('');
  
  if (searchNonMahadQuery.trim()) {
    document.getElementById('totalNonMahad').textContent = 
      `${filtered.length} dari ${allNonMahad.length} tempat`;
  } else {
    document.getElementById('totalNonMahad').textContent = `${filtered.length} tempat`;
  }
}

// ============================================================
// SEARCH NON-MAHAD
// ============================================================
export function searchNonMahad(query) {
  searchNonMahadQuery = query;
  renderNonMahad();
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadTempatTinggal = loadTempatTinggal;
window.searchNonMahad = searchNonMahad;
