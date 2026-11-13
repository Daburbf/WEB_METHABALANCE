/**
 * Script Otomatisasi Screenshot Full-Feature METHABALANCE (Web, Mobile Warga & Mobile Admin)
 * Format: High-Quality JPEG (.jpg), 1 per 1 tanpa terpotong
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:8080';

const OUT_DIR = path.join(__dirname, 'screenshots');
const DIRS = {
  web: path.join(OUT_DIR, '01_web'),
  warga: path.join(OUT_DIR, '02_mobile_warga'),
  admin: path.join(OUT_DIR, '03_mobile_admin')
};

// Buat direktori jika belum ada
Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function run() {
  console.log('🚀 Memulai browser headless Microsoft Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Helper screenshot JPG
  async function takeJpg(filepath, fullPage = true) {
    await page.screenshot({
      path: filepath,
      type: 'jpeg',
      quality: 95,
      fullPage: fullPage
    });
    console.log('  ✅ Tersimpan:', path.basename(filepath));
  }

  /* ==========================================================================
     1. WEB PLATFORM SCREENSHOTS (Viewport: 1600 x 1000, Full Page Views)
     ========================================================================== */
  console.log('\n📸 Mengambil screenshot fitur WEB PLATFORM...');
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#overview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 1.1 Web Overview / Dashboard SCADA
  await page.evaluate(() => { window.MB.views.navigate('overview'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '01_web_dashboard_scada_ringkasan.jpg'), true);

  // 1.2 Web GIS & Topologi Jalur Pipa
  await page.evaluate(() => { window.MB.views.navigate('gis'); });
  await new Promise(r => setTimeout(r, 1500));
  await takeJpg(path.join(DIRS.web, '02_web_gis_topologi_jalur_pipa.jpg'), true);

  // 1.3 Web Analytics Pelanggan & Emisi Karbon (Lovable Style)
  await page.evaluate(() => { window.MB.views.navigate('analytics'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '03_web_analytics_pelanggan_karbon.jpg'), true);

  // 1.4 Web Live Monitoring & Telemetri Real-time
  await page.evaluate(() => { window.MB.views.navigate('live'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '04_web_live_monitoring_telemetri.jpg'), true);

  // 1.5 Web Neraca Massa Biogas & Losses
  await page.evaluate(() => { window.MB.views.navigate('mass-balance'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '05_web_neraca_massa_biogas.jpg'), true);

  // 1.6 Web Sensor & Status Katup 15 Node
  await page.evaluate(() => { window.MB.views.navigate('nodes'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '06_web_sensor_katup_15_node.jpg'), true);

  // 1.7 Web Kualitas Gas Metana & Odorisasi
  await page.evaluate(() => { window.MB.views.navigate('gas-quality'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '07_web_kualitas_gas_metana.jpg'), true);

  // 1.8 Web Insiden & Tiket Laporan Warga
  await page.evaluate(() => { window.MB.views.navigate('incidents'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '08_web_insiden_tiket_lapangan.jpg'), true);

  /* ==========================================================================
     2. MOBILE WARGA SCREENSHOTS (Viewport: 430 x 932)
     ========================================================================== */
  console.log('\n📸 Mengambil screenshot fitur MOBILE WARGA...');
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/methabalance-mobile-warga/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 2.1 Tab 1: Beranda Warga Utuh (Normal)
  await takeJpg(path.join(DIRS.warga, '01_mobile_warga_tab1_beranda_full.jpg'), true);

  // 2.2 Tab 2: Telemetri Warga Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="telemetri"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '02_mobile_warga_tab2_telemetri_full.jpg'), true);

  // 2.3 Tab 3: Lapor Warga Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="lapor"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '03_mobile_warga_tab3_lapor_full.jpg'), true);

  // 2.4 Tab 4: Profil Warga Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="profil"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '04_mobile_warga_tab4_profil_full.jpg'), true);

  // 2.5 Switcher Akun ke UMKM Tahu & Tempe
  await page.evaluate(() => {
    const btnSelectUmkm = document.getElementById('btnSelectUmkm');
    if (btnSelectUmkm) btnSelectUmkm.click();
    const tabBeranda = document.querySelector('[data-tab="beranda"]');
    if (tabBeranda) tabBeranda.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '05_mobile_warga_beranda_akun_umkm.jpg'), true);

  // 2.6 Simulasi Kondisi Pipa Terisolasi Darurat
  await page.evaluate(() => {
    const btnIsolated = document.getElementById('btnSetGridIsolated');
    if (btnIsolated) btnIsolated.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '06_mobile_warga_kondisi_isolasi_darurat.jpg'), true);

  // Reset state kembali ke normal
  await page.evaluate(() => {
    const btnNormal = document.getElementById('btnSetGridNormal');
    if (btnNormal) btnNormal.click();
    const btnSelectWarga = document.getElementById('btnSelectWarga');
    if (btnSelectWarga) btnSelectWarga.click();
  });

  /* ==========================================================================
     3. MOBILE ADMIN SCREENSHOTS (Viewport: 430 x 932)
     ========================================================================== */
  console.log('\n📸 Mengambil screenshot fitur MOBILE ADMIN...');
  await page.goto(`${BASE_URL}/methabalance-mobile-admin/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 3.1 Tab 1: Ringkasan Admin Utuh
  await takeJpg(path.join(DIRS.admin, '01_mobile_admin_tab1_ringkasan_full.jpg'), true);

  // 3.2 Tab 2: Pelanggan Admin Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="pelanggan"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '02_mobile_admin_tab2_pelanggan_full.jpg'), true);

  // 3.3 Modal Detail Pelanggan
  await page.evaluate(() => {
    const firstCust = document.querySelector('.customer-item-card');
    if (firstCust) firstCust.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '03_mobile_admin_modal_detail_pelanggan.jpg'), false);

  // Tutup modal
  await page.evaluate(() => {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.remove('active');
  });
  await new Promise(r => setTimeout(r, 400));

  // 3.4 Tab 3: Pipa & Katup Admin Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="pipa"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '04_mobile_admin_tab3_pipa_katup_full.jpg'), true);

  // 3.5 Modal Konfirmasi Kendali Katup Motorik
  await page.evaluate(() => {
    const btnQuick = document.getElementById('btnQuickEmergencyValve');
    if (btnQuick) btnQuick.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '05_mobile_admin_modal_kendali_katup.jpg'), false);

  // Tutup modal
  await page.evaluate(() => {
    const modal = document.getElementById('valveModal');
    if (modal) modal.classList.remove('active');
  });
  await new Promise(r => setTimeout(r, 400));

  // 3.6 Tab 4: Tiket Lapangan Utuh
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tiket"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '06_mobile_admin_tab4_tiket_lapangan_full.jpg'), true);

  // 3.7 Modal Detail Tiket Lapangan
  await page.evaluate(() => {
    const firstTicket = document.querySelector('.ticket-item-card');
    if (firstTicket) firstTicket.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '07_mobile_admin_modal_detail_tiket.jpg'), false);

  await browser.close();
  console.log('\n🎉 Selesai! Semua fitur telah berhasil disimpan dalam format .jpg beresolusi tinggi tanpa terpotong.');
}

run().catch(err => {
  console.error('❌ Error generating screenshots:', err);
  process.exit(1);
});
