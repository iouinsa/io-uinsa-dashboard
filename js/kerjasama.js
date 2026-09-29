// ============================================================
// KERJASAMA — CRUD + IMPORT CSV + PETA + PREVIEW DOKUMEN
// ============================================================

import { supabase } from './config.js';
import {
  formatTanggal, hitungStatusKerjasama, statusClassKerjasama,
  escapeAttr, parseCSVLine, showModal, closeModal, konfirmasi, setupDragDrop
} from './utils.js';

// ============================================================
// KOORDINAT NEGARA (hardcoded — untuk peta)
// ============================================================
const KOORDINAT_NEGARA = {
  'malaysia': [4.2105, 101.9758],
  'singapura': [1.3521, 103.8198],
  'singapore': [1.3521, 103.8198],
  'thailand': [15.8700, 100.9925],
  'indonesia': [-0.7893, 113.9213],
  'brunei': [4.5353, 114.7277],
  'brunei darussalam': [4.5353, 114.7277],
  'vietnam': [14.0583, 108.2772],
  'filipina': [12.8797, 121.7740],
  'philippines': [12.8797, 121.7740],
  'myanmar': [21.9162, 95.9560],
  'kamboja': [12.5657, 104.9910],
  'cambodia': [12.5657, 104.9910],
  'laos': [19.8563, 102.4955],
  'timor leste': [-8.8742, 125.7275],
  'mesir': [26.8206, 30.8025],
  'egypt': [26.8206, 30.8025],
  'arab republic of egypt': [26.8206, 30.8025],
  'arab saudi': [23.8859, 45.0792],
  'saudi arabia': [23.8859, 45.0792],
  'makkah': [21.3891, 39.8579],
  'uni emirat arab': [23.4241, 53.8478],
  'uae': [23.4241, 53.8478],
  'qatar': [25.3548, 51.1839],
  'kuwait': [29.3117, 47.4818],
  'bahrain': [25.9304, 50.6378],
  'oman': [21.4735, 55.9754],
  'yordania': [30.5852, 36.2384],
  'jordan': [30.5852, 36.2384],
  'lebanon': [33.8547, 35.8623],
  'suriah': [34.8021, 38.9968],
  'irak': [33.2232, 43.6793],
  'iran': [32.4279, 53.6880],
  'turki': [38.9637, 35.2433],
  'turkey': [38.9637, 35.2433],
  'maroko': [31.7917, -7.0926],
  'morocco': [31.7917, -7.0926],
  'aljazair': [28.0339, 1.6596],
  'algeria': [28.0339, 1.6596],
  'tunisia': [33.8869, 9.5375],
  'libya': [26.3351, 17.2283],
  'sudan': [12.8628, 30.2176],
  'somalia': [5.1521, 46.1996],
  'yaman': [15.5527, 48.5164],
  'yemen': [15.5527, 48.5164],
  'palestina': [31.9522, 35.2332],
  'palestine': [31.9522, 35.2332],
  'inggris': [55.3781, -3.4360],
  'uk': [55.3781, -3.4360],
  'united kingdom': [55.3781, -3.4360],
  'prancis': [46.2276, 2.2137],
  'francis': [46.2276, 2.2137],
  'france': [46.2276, 2.2137],
  'jerman': [51.1657, 10.4515],
  'germany': [51.1657, 10.4515],
  'belanda': [52.1326, 5.2913],
  'netherlands': [52.1326, 5.2913],
  'belgia': [50.5039, 4.4699],
  'belgium': [50.5039, 4.4699],
  'spanyol': [40.4637, -3.7492],
  'spain': [40.4637, -3.7492],
  'italia': [41.8719, 12.5674],
  'italy': [41.8719, 12.5674],
  'portugal': [39.3999, -8.2245],
  'swiss': [46.8182, 8.2275],
  'switzerland': [46.8182, 8.2275],
  'austria': [47.5162, 14.5501],
  'swedia': [60.1282, 18.6435],
  'sweden': [60.1282, 18.6435],
  'norwegia': [60.4720, 8.4689],
  'norway': [60.4720, 8.4689],
  'denmark': [56.2639, 9.5018],
  'finlandia': [61.9241, 25.7482],
  'finland': [61.9241, 25.7482],
  'irlandia': [53.1424, -7.6921],
  'ireland': [53.1424, -7.6921],
  'polandia': [51.9194, 19.1451],
  'poland': [51.9194, 19.1451],
  'rusia': [61.5240, 105.3188],
  'russia': [61.5240, 105.3188],
  'ukraina': [48.3794, 31.1656],
  'ukraine': [48.3794, 31.1656],
  'yunani': [39.0742, 21.8243],
  'greece': [39.0742, 21.8243],
  'cek': [49.8175, 15.4730],
  'czech': [49.8175, 15.4730],
  'hungaria': [47.1625, 19.5033],
  'hungary': [47.1625, 19.5033],
  'rumania': [45.9432, 24.9668],
  'romania': [45.9432, 24.9668],
  'amerika serikat': [37.0902, -95.7129],
  'usa': [37.0902, -95.7129],
  'united states': [37.0902, -95.7129],
  'kanada': [56.1304, -106.3468],
  'canada': [56.1304, -106.3468],
  'meksiko': [23.6345, -102.5528],
  'mexico': [23.6345, -102.5528],
  'brasil': [-14.2350, -51.9253],
  'brazil': [-14.2350, -51.9253],
  'argentina': [-38.4161, -63.6167],
  'chile': [-35.6751, -71.5430],
  'peru': [-9.1900, -75.0152],
  'kolombia': [4.5709, -74.2973],
  'colombia': [4.5709, -74.2973],
  'venezuela': [6.4238, -66.5897],
  'china': [35.8617, 104.1954],
  'tiongkok': [35.8617, 104.1954],
  'jepang': [36.2048, 138.2529],
  'japan': [36.2048, 138.2529],
  'korea selatan': [35.9078, 127.7669],
  'south korea': [35.9078, 127.7669],
  'korea': [35.9078, 127.7669],
  'korea utara': [40.3399, 127.5101],
  'north korea': [40.3399, 127.5101],
  'india': [20.5937, 78.9629],
  'pakistan': [30.3753, 69.3451],
  'bangladesh': [23.6850, 90.3563],
  'sri lanka': [7.8731, 80.7718],
  'nepal': [28.3949, 84.1240],
  'afghanistan': [33.9391, 67.7100],
  'uzbekistan': [41.3775, 64.5853],
  'kazakhstan': [48.0196, 66.9237],
  'kazakhtan': [48.0196, 66.9237],
  'taiwan': [23.6978, 120.9605],
  'hong kong': [22.3193, 114.1694],
  'maldives': [3.2028, 73.2207],
  'australia': [-25.2744, 133.7751],
  'selandia baru': [-40.9006, 174.8860],
  'new zealand': [-40.9006, 174.8860],
  'fiji': [-17.7134, 178.0650],
  'afrika selatan': [-30.5595, 22.9375],
  'south africa': [-30.5595, 22.9375],
  'nigeria': [9.0820, 8.6753],
  'kenya': [-0.0236, 37.9062],
  'ethiopia': [9.1450, 40.4897],
  'ghana': [7.9465, -1.0232],
  'senegal': [14.4974, -14.4524],
  'tanzania': [-6.3690, 34.8888],
  'uganda': [1.3733, 32.2903]
};

// ============================================================
// PREVIEW DOKUMEN (PDF)
// ============================================================
export function previewDokumen(driveLink, judul) {
  const modal = document.getElementById('modalPreviewDokumen');
  const iframe = document.getElementById('previewIframe');
  const fallback = document.getElementById('previewFallback');
  const title = document.getElementById('previewTitle');
  const openBtn = document.getElementById('previewOpenBtn');
  const openBtnFooter = document.getElementById('previewOpenBtnFooter');
  
  if (!modal) {
    // Modal tidak ada → buka langsung di tab baru
    window.open(driveLink, '_blank');
    return;
  }
  
  title.textContent = judul || 'Preview Dokumen';
  if (openBtn) openBtn.href = driveLink;
  if (openBtnFooter) openBtnFooter.href = driveLink;
  
  const embedUrl = convertToEmbedUrl(driveLink);
  
  if (!embedUrl) {
    iframe.style.display = 'none';
    fallback.classList.add('show');
    modal.classList.add('show');
    return;
  }
  
  iframe.style.display = 'block';
  fallback.classList.remove('show');
  iframe.src = embedUrl;
  
  // Timer fallback kalau iframe tidak load dalam 4 detik
  const loadTimer = setTimeout(() => {
    iframe.style.display = 'none';
    fallback.classList.add('show');
  }, 4000);
  
  iframe.onload = () => {
    clearTimeout(loadTimer);
  };
  
  modal.classList.add('show');
}

export function closePreviewDokumen() {
  const modal = document.getElementById('modalPreviewDokumen');
  const iframe = document.getElementById('previewIframe');
  if (iframe) iframe.src = 'about:blank';
  if (modal) modal.classList.remove('show');
}

function convertToEmbedUrl(url) {
  if (!url) return null;
  
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  
  if (url.includes('/preview')) return url;
  
  return url;
}

// ============================================================
// LOAD DAFTAR KERJASAMA
// ============================================================
export async function loadKerjasama() {
  const tbody = document.getElementById('tbodyKerjasama');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="8">Memuat data...</td></tr>';
  
  const { data, error } = await supabase
    .from('kerjasama')
    .select('*')
    .order('tanggal_mulai', { ascending: false });
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#c0392b;padding:20px;">Error: ${error.message}</td></tr>`;
    return;
  }
  
  renderStatistikKerjasama(data || []);
  renderPetaKerjasama(data || []);
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Belum ada data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(k => {
    const status = hitungStatusKerjasama(k.tanggal_berakhir);
    const cls = statusClassKerjasama(status);
    
    // Kolom dokumen
    const dokHtml = k.link_dokumen
      ? `<button class="btn btn-outline btn-sm" onclick="window.previewDokumen('${escapeAttr(k.link_dokumen)}', 'Dokumen ${escapeAttr(k.kampus || '')}')">📄 Lihat</button>`
      : '—';
    
    return `<tr>
      <td><strong>${k.kampus}</strong></td>
      <td>${k.negara || '—'}</td>
      <td>${k.jenis || '—'}</td>
      <td>${formatTanggal(k.tanggal_mulai)}</td>
      <td>${formatTanggal(k.tanggal_berakhir)}</td>
      <td><span class="tag ${cls}">${status}</span></td>
      <td>${dokHtml}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.editKerjasama(${k.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="window.hapusKerjasama(${k.id}, '${escapeAttr(k.kampus || '')}')">Hapus</button>
      </td>
    </tr>`;
  }).join('');
  
  document.getElementById('totalKerjasama').textContent = `${data.length} kerja sama`;
}

// ============================================================
// RENDER STATISTIK
// ============================================================
function renderStatistikKerjasama(data) {
  const total = data.length;
  let onGoing = 0, berakhir = 0;
  let mou = 0, moa = 0, loi = 0;
  
  data.forEach(k => {
    const status = hitungStatusKerjasama(k.tanggal_berakhir);
    if (status === 'Aktif') onGoing++;
    if (status === 'Berakhir') berakhir++;
    
    const jenis = (k.jenis || '').toUpperCase();
    if (jenis === 'MOU') mou++;
    else if (jenis === 'MOA') moa++;
    else if (jenis === 'LOI') loi++;
  });
  
  const container = document.getElementById('statistikKerjasama');
  if (!container) return;
  
  container.innerHTML = `
    <div class="stat-box stat-total"><div class="stat-num">${total}</div><div class="stat-label">Total Mitra</div></div>
    <div class="stat-box stat-ongoing"><div class="stat-num">${onGoing}</div><div class="stat-label">On Going</div></div>
    <div class="stat-box stat-berakhir"><div class="stat-num">${berakhir}</div><div class="stat-label">Berakhir</div></div>
    <div class="stat-box stat-mou"><div class="stat-num">${mou}</div><div class="stat-label">Dokumen MoU</div></div>
    <div class="stat-box stat-moa"><div class="stat-num">${moa}</div><div class="stat-label">Dokumen MoA</div></div>
    <div class="stat-box stat-loi"><div class="stat-num">${loi}</div><div class="stat-label">Dokumen LoI</div></div>
  `;
}

// ============================================================
// RENDER PETA
// ============================================================
let petaKerjasama = null;
let layerGaris = null;
let layerMarkers = null;

function renderPetaKerjasama(data) {
  const mapEl = document.getElementById('mapKerjasama');
  if (!mapEl) return;
  
  if (!petaKerjasama) {
    petaKerjasama = L.map('mapKerjasama', {
      center: [-2, 80], zoom: 3, minZoom: 2, maxZoom: 8,
      scrollWheelZoom: true, worldCopyJump: true
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(petaKerjasama);
    
    L.marker([-7.3214, 112.7344], {
      icon: L.divIcon({
        className: 'uinsa-marker',
        html: '<div style="background:#0a5c4a; color:white; padding:4px 8px; border-radius:6px; font-weight:700; font-size:12px; white-space:nowrap; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏛 UINSA</div>',
        iconSize: [80, 30], iconAnchor: [40, 15]
      })
    }).addTo(petaKerjasama).bindPopup('<strong>UIN Sunan Ampel Surabaya</strong>');
    
    layerGaris = L.layerGroup().addTo(petaKerjasama);
    layerMarkers = L.layerGroup().addTo(petaKerjasama);
  }
  
  layerGaris.clearLayers();
  layerMarkers.clearLayers();
  
  const negaraMap = {};
  data.forEach(k => {
    const negara = (k.negara || '').trim().toLowerCase();
    if (!negara) return;
    if (!negaraMap[negara]) negaraMap[negara] = { nama: k.negara, mitra: [], onGoing: 0, berakhir: 0 };
    negaraMap[negara].mitra.push(k.kampus);
    const status = hitungStatusKerjasama(k.tanggal_berakhir);
    if (status === 'Aktif') negaraMap[negara].onGoing++;
    if (status === 'Berakhir') negaraMap[negara].berakhir++;
  });
  
  const UINSA_COORD = [-7.3214, 112.7344];
  
  for (const [key, info] of Object.entries(negaraMap)) {
    const coords = KOORDINAT_NEGARA[key];
    if (!coords) continue;
    
    const arc = getArcPoints(UINSA_COORD, coords);
    L.polyline(arc, { color: '#0a5c4a', weight: 1.8, opacity: 0.6, dashArray: '4, 6' }).addTo(layerGaris);
    
    const marker = L.circleMarker(coords, {
      radius: 7,
      fillColor: info.onGoing > 0 ? '#0a5c4a' : '#c0392b',
      color: 'white', weight: 2, fillOpacity: 0.9
    }).addTo(layerMarkers);
    
    const popup = `
      <div style="font-size:13px; min-width: 180px;">
        <strong style="font-size:14px;">${info.nama}</strong><br>
        <em style="color:#6b7280;">${info.mitra.length} mitra</em>
        <div style="margin-top:6px; font-size:12px;">
          ${info.onGoing > 0 ? `<span style="color:#1e7a4d;">● ${info.onGoing} on going</span><br>` : ''}
          ${info.berakhir > 0 ? `<span style="color:#a03a2a;">● ${info.berakhir} berakhir</span>` : ''}
        </div>
        <hr style="margin:6px 0; border:none; border-top:1px solid #e2e8f0;">
        <div style="font-size:11px; color:#6b7280;">
          ${info.mitra.slice(0, 5).map(m => `• ${m}`).join('<br>')}
          ${info.mitra.length > 5 ? `<br><em>... dan ${info.mitra.length - 5} lainnya</em>` : ''}
        </div>
      </div>`;
    
    marker.bindPopup(popup);
    marker.bindTooltip(info.nama, { direction: 'top', offset: [0, -8] });
  }
}

function getArcPoints(start, end, numPoints = 40) {
  const points = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dist = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  const offset = dist * 0.25;
  const ctrlLat = midLat + offset;
  const ctrlLng = midLng;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
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
// SIMPAN
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
// IMPORT CSV
// ============================================================
let parsedKjs = [], validKjs = [], errorKjs = [];

const KJS_COLUMNS = ['kampus','unit_fakultas','negara','tanggal_mulai','tanggal_berakhir','jenis','link_dokumen'];
const KJS_LABELS = {
  kampus:'Kampus', unit_fakultas:'Unit Fakultas', negara:'Negara',
  tanggal_mulai:'Tanggal Mulai', tanggal_berakhir:'Tanggal Berakhir',
  jenis:'Jenis', link_dokumen:'Link Dokumen'
};

export function openImportKerjasama() {
  parsedKjs = []; validKjs = []; errorKjs = [];
  document.getElementById('fileCSVKjs').value = '';
  document.getElementById('fileInfoKjs').style.display = 'none';
  document.getElementById('previewSectionKjs').style.display = 'none';
  document.getElementById('btnImportKjs').disabled = true;
  document.getElementById('importKjsAlert').innerHTML = '';
  showModal('modalImportKerjasama');
}

export function downloadTemplateKjs() {
  const header = KJS_COLUMNS.map(c => KJS_LABELS[c]).join(',');
  const contoh = ['Universitas Malaya','Fakultas Syariah','Malaysia','2023-08-01','2028-08-01','MoU','https://drive.google.com/file/d/xxx/view'];
  const csv = header + '\n' + contoh.map(v => v.includes(',') ? `"${v}"` : v).join(',') + '\n';
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'template_import_kerjasama.csv';
  link.click();
}

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

function validateKjs() {
  validKjs = []; errorKjs = [];
  parsedKjs.forEach((row) => {
    const errors = [];
    if (!row.kampus) errors.push('Kampus kosong');
    ['tanggal_mulai','tanggal_berakhir'].forEach(f => {
      if (row[f] && !/^\d{4}-\d{2}-\d{2}$/.test(row[f])) errors.push(`${f} harus YYYY-MM-DD`);
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
      .map(e => `<div>❌ Baris ${e.lineNumber} (${e.row.kampus || '—'}): ${e.errors.join(', ')}</div>`).join('');
  } else {
    document.getElementById('errorSectionKjs').style.display = 'none';
  }
  
  document.getElementById('previewTableKjs').innerHTML = `
    <table><thead><tr><th>Baris</th><th>Kampus</th><th>Negara</th><th>Mulai</th><th>Status</th></tr></thead>
    <tbody>${parsedKjs.slice(0, 10).map(r => {
      const isErr = errorKjs.some(e => e.row._lineNumber === r._lineNumber);
      return `<tr><td>${r._lineNumber}</td><td>${r.kampus || '—'}</td><td>${r.negara || '—'}</td><td>${r.tanggal_mulai || '—'}</td><td>${isErr ? '<span class="tag tag-error">Error</span>' : '<span class="tag tag-active">OK</span>'}</td></tr>`;
    }).join('')}</tbody></table>`;
  
  document.getElementById('previewSectionKjs').style.display = 'block';
  document.getElementById('btnImportKjs').disabled = validKjs.length === 0;
}

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
  if (gagalDetail.length > 0) html += `<div class="error-list">${gagalDetail.map(d => `<div>❌ ${d}</div>`).join('')}</div>`;
  alertBox.innerHTML = html;
  
  loadKerjasama();
  if (gagal === 0) setTimeout(() => closeModal('modalImportKerjasama'), 3000);
}

export function setupKerjasamaDragDrop() {
  setupDragDrop('importAreaKjs', 'fileCSVKjs', handleFileSelectKjs);
}

// ============================================================
// EXPOSE KE WINDOW
// ============================================================
window.loadKerjasama = loadKerjasama;
window.previewDokumen = previewDokumen;
window.closePreviewDokumen = closePreviewDokumen;
window.openTambahKerjasama = openTambahKerjasama;
window.editKerjasama = editKerjasama;
window.simpanKerjasama = simpanKerjasama;
window.hapusKerjasama = hapusKerjasama;
window.openImportKerjasama = openImportKerjasama;
window.downloadTemplateKjs = downloadTemplateKjs;
window.handleFileSelectKjs = handleFileSelectKjs;
window.prosesImportKjs = prosesImportKjs;