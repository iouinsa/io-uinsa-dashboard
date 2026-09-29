// ============================================================
// UTILITY FUNCTIONS
// ============================================================
// Kumpulan fungsi bantu yang dipakai di seluruh dashboard.

// ============================================================
// FORMAT TANGGAL → "1 Agustus 2023"
// ============================================================
export function formatTanggal(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

// ============================================================
// KONVERSI LINK GOOGLE DRIVE → THUMBNAIL
// ============================================================
// Mengubah link Drive biasa menjadi format yang bisa ditampilkan
// sebagai gambar. Mendukung 2 format:
//   - https://drive.google.com/file/d/FILE_ID/view
//   - https://drive.google.com/open?id=FILE_ID
export function convertDriveLink(url) {
  if (!url) return null;
  
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w400`;
  
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`;
  
  return url;
}

// ============================================================
// HITUNG SEMESTER OTOMATIS DARI TAHUN MASUK
// ============================================================
// Rumus: (tahun_sekarang - tahun_masuk) × 2 + semester_dalam_tahun
// Semester dalam tahun:
//   - Ganjil (Juli-Des)  = 1
//   - Genap  (Jan-Jun)   = 2
export function hitungSemester(tahunMasuk) {
  if (!tahunMasuk) return '—';
  
  const now = new Date();
  const tahunSekarang = now.getFullYear();
  const bulanSekarang = now.getMonth() + 1;
  
  const semesterDalamTahun = (bulanSekarang >= 7) ? 1 : 2;
  const total = (tahunSekarang - parseInt(tahunMasuk)) * 2 + semesterDalamTahun;
  
  return total > 0 ? total : '—';
}

// ============================================================
// HITUNG STATUS KERJASAMA OTOMATIS DARI TANGGAL BERAKHIR
// ============================================================
// Aturan:
//   - Berakhir        → sudah lewat
//   - Akan Berakhir   → ≤ 90 hari lagi
//   - Aktif           → > 90 hari lagi
export function hitungStatusKerjasama(tanggalBerakhir) {
  if (!tanggalBerakhir) return '—';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const berakhir = new Date(tanggalBerakhir);
  if (isNaN(berakhir.getTime())) return '—';
  
  const selisihHari = Math.ceil((berakhir - today) / (1000 * 60 * 60 * 24));
  
  if (selisihHari < 0) return 'Berakhir';
  if (selisihHari <= 90) return 'Akan Berakhir';
  return 'Aktif';
}

// ============================================================
// KELAS TAG BERDASARKAN STATUS
// ============================================================
export function statusClassKerjasama(status) {
  if (status === 'Aktif') return 'tag-active';
  if (status === 'Akan Berakhir') return 'tag-warning';
  return 'tag-muted';
}

// ============================================================
// ESCAPE HTML — untuk mencegah XSS
// ============================================================
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// ESCAPE UNTUK ONCLICK ATTRIBUTE
// ============================================================
// Karena kita pakai onclick="hapus(1, 'Nama')"
// Nama yang ada tanda kutip harus di-escape
export function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ============================================================
// PARSE CSV LINE (mendukung quoted fields)
// ============================================================
export function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ============================================================
// MODAL HELPERS
// ============================================================
export function showModal(id) {
  document.getElementById(id).classList.add('show');
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Supaya bisa dipanggil dari onclick di HTML
window.closeModal = closeModal;

// ============================================================
// KONFIRMASI HAPUS
// ============================================================
export function konfirmasi(text, callback) {
  document.getElementById('konfirmasiText').textContent = text;
  const btn = document.getElementById('btnKonfirmasiHapus');
  btn.onclick = () => {
    closeModal('modalKonfirmasi');
    callback();
  };
  showModal('modalKonfirmasi');
}

window.konfirmasi = konfirmasi;

// ============================================================
// DRAG & DROP UNTUK IMPORT CSV
// ============================================================
export function setupDragDrop(areaId, inputId, onFileSelect) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);
  if (!area || !input) return;
  
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragover');
  });
  
  area.addEventListener('dragleave', () => {
    area.classList.remove('dragover');
  });
  
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      onFileSelect({ target: { files: [file] } });
    }
  });
}