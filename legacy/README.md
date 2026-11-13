# METHABALANCE — Sistem Monitoring Terintegrasi Hulu–Hilir Berbasis IoT & Neraca Gas Real-Time

Platform Industrial SCADA & Spatial Decision Support System (SDSS) untuk pengawasan, deteksi kebocoran, dan mitigasi emisi jaringan pipa distribusi biogas 8,3 km di **UPTD TPAS Manggar × Dinas Lingkungan Hidup (DLH) Kota Balikpapan × Koperasi WASTECO**.

---

## 1. Parameter Infrastruktur & Hardware Lapangan (TPAS Manggar)

- **Koordinat Pusat:** `-1.2135° S, 116.9328° E` (Balikpapan Timur)
- **Sanitary Landfill:** 40 Hektare (Zona 1–5 Tutup Permanen / Ekstraksi Pasif, Zona 6 Terisi >90%, Zona 7 Aktif 3,25 Hektare / sisa operasional 3 tahun).
- **Timbulan Sampah:** 467,86 ton/hari (Rumah Tangga: 328,91 ton/hari atau 70,30%).
- **Fraksi Organik Aktif:** 48,56% (224,23 ton/hari = 176,21 ton sisa makanan + 48,02 ton kayu & ranting).
- **Produksi Biogas & Mitigasi Emisi:** 820.800 m³/tahun LFG | Reduksi Emisi: 100.651,70 ton CO₂eq/tahun (275,8 kg CO₂eq/hari, GWP CH₄ = 28× CO₂).
- **Jaringan Distribusi Pipa:** PVC 3 Inci Class AW (SNI 06-0084-2002) sepanjang 8,3 km, sambungan *PVC Slip-on Socket Flange* dan fitting drat NPT Stainless Steel SS316L.
- **Penerima Manfaat & Nilai Ekonomi:** 380 Sambungan Rumah (SR) / 1.520 Jiwa dan 29 UMKM; menghasilkan penghematan warga Rp456.000.000/tahun (Rp1.480.000/hari atau Rp80.000/bulan/KK setara 4 tabung LPG 3 kg subsidi) serta mengamankan potensi kerugian kehilangan gas senilai Rp91.000.000/tahun.
- **Node Perangkat Keras (15 Titik Ukur):**
  - ESP32-S3 Dual-core Xtensa LX7 (44,9°C) + LoRaWAN SX1262 AS923 (923,2 MHz, AES-128) + MQTT over TLS (Cellular Fallback 4G).
  - Rangkaian 7 Sensor Industri: NDIR CH₄ (0–100% Vol + Anti-Dewing Heater), Electrochemical H₂S (0–100 ppm), Electrochemical O₂ (0–25% Vol batas LEL 5%), SS316L Pressure Transducer (0–100 kPa / 0–1 Bar, 4–20 mA), Thermal Mass Flow Meter (batas deteksi praktis 2,62%), Immersion Stainless Probe SHT30 (Suhu & %RH > 90% Dew Point), Keausan Diafragma & Diagnostik Zero-Point ADC.
  - Fail-Safe Hardware Lokal: NC (Normally Closed) Motorized Ball Valve SS304 (12V DC), menutup mandiri dalam **3,8 detik** (< 5 detik) saat terdeteksi drop tekanan drastis tanpa bergantung cloud.
  - Catu Daya: Solar Cell 40 Wp Monokristalin + Baterai LiFePO₄ 12,8V 20Ah + Smart MPPT 10A (otonomi 72 jam) di dalam Enclosure IP65/IP67 Weatherproof.

---

## 2. Struktur Modul Aplikasi Web (6 Menu Terintegrasi)

1. **Overview Dashboard & Neraca Massa Real-Time (`overview`)**
   - 4 Hero KPI Cards: Volume Gas Tersalurkan, Efisiensi Distribusi, Estimasi Penghematan Ekonomi, Reduksi Emisi Karbon.
   - Matriks Kesetimbangan Neraca Massa $\Delta Q = Q_{\text{hulu}} - \sum Q_{\text{hilir}}$ dengan indikator batas deteksi 2,62%.
   - Tabel Topologi Distribusi 15 Node dengan live readings dan tombol sorot 3D.
2. **Topologi GIS 3D Helicopter View & Google Maps (`gis`)**
   - Kanvas 3D interaktif kemiringan 60°, orbit 360°, polygon 3D Zona 1–7, pipa 8,3 km dengan aliran partikel & heatmap tekanan dinamis.
   - Google Maps Satellite & Hybrid view.
   - Kontrol Penerbangan Helikopter Cepat: Node-01 (Ekstraksi Hulu), Node-04 (Manifold), Node-06 (Cabang B RT 23), Node-07 (Cekungan Kondensat), Node-10 (Sentra UMKM).
   - Penampang melintang elevasi tanah & gradien hidrolika pipa beserta posisi water trap.
3. **Deteksi Anomali AI (Isolation Forest) & Prediksi Kondensat (`ai`)**
   - Vektor multivariat $[P, Q, dP/dt, \Delta Q, \text{CH}_4, \text{O}_2]$ dengan diskriminasi otomatis jam memasak diurnal warga vs kebocoran fisik.
   - Triangulasi koordinat spasial kebocoran dan waktu eksekusi katup fail-safe 3,8 detik.
   - Model regresi polinomial prediksi titik embun dan penyumbatan uap air (*water-blocking*) di cekungan Node-07.
4. **Sensor Fleet Telemetry, Kontrol Katup & Diagnostik (`fleet`)**
   - Telemetri mendalam per node (Tekanan, Laju Alir, CH₄, H₂S, O₂, Suhu ESP32, %RH, Otonomi LiFePO₄, Keausan Diafragma).
   - Sakelar kontrol remote NC Motorized Ball Valve SS304 via MQTT over TLS/LoRaWAN, tombol Uji Coba Buka Katup, Self-Diagnostic Node, dan Kalibrasi Zero-Point ADC.
   - Inspektur Arsitektur Perangkat Keras CAD interaktif 8 komponen kunci.
   - Log audit eksekusi perintah SCADA.
5. **Portal Terpadu MethaSync (`portal`)**
   - Portal Warga: Indikator status keselamatan pasokan gas kompor, meteran bulanan (18,4 m³), kalkulator penghematan LPG, kontribusi reduksi emisi dapur, formulir pelaporan kebocoran ber-geotag GPS, SOP keselamatan, hotline darurat.
   - Portal Teknisi FieldOps: Antrean tiket penanganan prioritas, navigasi rute GPS lapangan, dan penerbitan Berita Acara Pemeriksaan (BAP) Digital resmi lengkap dengan tanda tangan digital & cetak PDF.
6. **Analitik Karbon, Kapasitas Zona TPA & Tata Kelola (`carbon`)**
   - Monitoring kapasitas 7 sel sanitary landfill TPAS Manggar dan masa pakai aktif Zona 7.
   - Carbon Credit Ledger bulanan terverifikasi konversi metana ke reduksi emisi.
   - Matriks kepatuhan hukum: UU No. 18/2008, Perpres No. 112/2022, dan Perpres No. 109/2025.
   - Ekspor laporan audit karbon (CSV).

---

## 3. Menjalankan Aplikasi Secara Lokal (Tanpa HTTP Server)

Aplikasi dibangun 100% menggunakan aset lokal (*offline standalone*) tanpa memerlukan server HTTP:

- Cukup klik dua kali atau buka berkas `index.html` langsung di peramban:
  `file:///C:/Users/TUF%20GAMING/Downloads/WEB_BIO/index.html`

Semua dependensi vendor (Leaflet, Chart.js, CSS, JS) tersimpan langsung di direktori lokal `assets/vendor/`.
