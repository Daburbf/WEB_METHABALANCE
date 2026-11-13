/**
 * Script Screenshot METHABALANCE (Format JPEG Quality 95)
 * Mobile di-capture menggunakan Viewport Native Smartphone (fullPage: false)
 * Tidak ada fixed navbar yang tabrakan atau menimpa konten.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:8080';

const OUT_DIR = path.resolve('C:\\Users\\TUF GAMING\\Downloads\\WEB_BIO', 'screenshots');
const DIRS = {
  web: path.join(OUT_DIR, '01_web'),
  warga: path.join(OUT_DIR, '02_mobile_warga'),
  admin: path.join(OUT_DIR, '03_mobile_admin')
};

// Pastikan folder bersih untuk mobile warga dan admin
[DIRS.warga, DIRS.admin].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      fs.unlinkSync(path.join(dir, file));
    });
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
});

if (!fs.existsSync(DIRS.web)) {
  fs.mkdirSync(DIRS.web, { recursive: true });
}

async function run() {
  console.log('🚀 Memulai browser headless Microsoft Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  async function takeJpg(filepath, fullPage = false) {
    await page.screenshot({
      path: filepath,
      type: 'jpeg',
      quality: 95,
      fullPage: fullPage
    });
    console.log('  ✅ Tersimpan:', path.basename(filepath));
  }

  /* ==========================================================================
     1. WEB PLATFORM (Viewport Desktop 1600 x 1000)
     ========================================================================== */
  console.log('\n📸 Verifikasi screenshot fitur WEB PLATFORM...');
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#overview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => { window.MB.views.navigate('overview'); });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.web, '01_web_dashboard_scada_ringkasan.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('gis'); });
  await new Promise(r => setTimeout(r, 1200));
  await takeJpg(path.join(DIRS.web, '02_web_gis_topologi_jalur_pipa.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('analytics'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '03_web_analytics_pelanggan_karbon.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('live'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '04_web_live_monitoring_telemetri.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('mass-balance'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '05_web_neraca_massa_biogas.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('nodes'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '06_web_sensor_katup_15_node.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('gas-quality'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '07_web_kualitas_gas_metana.jpg'), true);

  await page.evaluate(() => { window.MB.views.navigate('incidents'); });
  await new Promise(r => setTimeout(r, 1000));
  await takeJpg(path.join(DIRS.web, '08_web_insiden_tiket_lapangan.jpg'), true);

  /* ==========================================================================
     2. MOBILE WARGA (NATIVE VIEWPORT 430 x 932 — fullPage: false)
     Navbar tetap rapi di bagian bawah frame tanpa tabrakan.
     ========================================================================== */
  console.log('\n📸 Mengambil screenshot fitur MOBILE WARGA (Native Smartphone View)...');
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/methabalance-mobile-warga/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Pastikan akun warga dan state normal
  await page.evaluate(() => {
    if (window.MBM && window.MBM.data) {
      window.MBM.data.setActiveAccountKey('warga');
      window.MBM.data.setGridState('NORMAL');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // 2.1 Tab 1: Beranda Warga (View Atas)
  await takeJpg(path.join(DIRS.warga, '01_mobile_warga_tab1_beranda.jpg'), false);

  // 2.2 Tab 1: Beranda Warga (Scroll ke Bawah)
  await page.evaluate(() => { window.scrollTo({ top: 380, behavior: 'instant' }); });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.warga, '02_mobile_warga_tab1_beranda_kontrol.jpg'), false);

  // Scroll kembali ke atas
  await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); });
  await new Promise(r => setTimeout(r, 400));

  // 2.3 Tab 2: Telemetri Warga
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="telemetri"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '03_mobile_warga_tab2_telemetri.jpg'), false);

  // 2.4 Tab 3: Lapor Warga
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="lapor"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '04_mobile_warga_tab3_lapor.jpg'), false);

  // 2.5 Tab 4: Profil Warga
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="profil"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '05_mobile_warga_tab4_profil.jpg'), false);

  // 2.6 Beralih ke Akun UMKM Tahu & Tempe (Tarif Rp 25.000 / Bulan)
  await page.evaluate(() => {
    const btnSelectUmkm = document.getElementById('btnSelectUmkm');
    if (btnSelectUmkm) btnSelectUmkm.click();
    const tabBeranda = document.querySelector('[data-tab="beranda"]');
    if (tabBeranda) tabBeranda.click();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '06_mobile_warga_akun_umkm.jpg'), false);

  // 2.7 Simulasi Kondisi Pipa Terisolasi Darurat (Banner Merah)
  await page.evaluate(() => {
    const btnIsolated = document.getElementById('btnSetGridIsolated');
    if (btnIsolated) btnIsolated.click();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.warga, '07_mobile_warga_isolasi_darurat.jpg'), false);

  // Reset ke normal
  await page.evaluate(() => {
    const btnNormal = document.getElementById('btnSetGridNormal');
    if (btnNormal) btnNormal.click();
    const btnSelectWarga = document.getElementById('btnSelectWarga');
    if (btnSelectWarga) btnSelectWarga.click();
  });

  /* ==========================================================================
     3. MOBILE ADMIN (NATIVE VIEWPORT 430 x 932 — fullPage: false)
     Semua gauge, card, dan navbar rapi, tidak bertabrakan.
     ========================================================================== */
  console.log('\n📸 Mengambil screenshot fitur MOBILE ADMIN (Native Smartphone View)...');
  await page.goto(`${BASE_URL}/methabalance-mobile-admin/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 3.1 Tab 1: Ringkasan Admin (KPI & Gauge 96,2% yang rapi dan terpisah)
  await takeJpg(path.join(DIRS.admin, '01_mobile_admin_tab1_ringkasan.jpg'), false);

  // 3.2 Tab 1: Ringkasan Admin (Scroll ke Grafik Emisi & Rekap Finansial)
  await page.evaluate(() => { window.scrollTo({ top: 320, behavior: 'instant' }); });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '02_mobile_admin_tab1_emisi_keuangan.jpg'), false);

  // Scroll kembali ke atas
  await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); });
  await new Promise(r => setTimeout(r, 400));

  // 3.3 Tab 2: Pelanggan Admin
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="pelanggan"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '03_mobile_admin_tab2_pelanggan.jpg'), false);

  // 3.4 Modal Detail Pelanggan
  await page.evaluate(() => {
    const firstCust = document.querySelector('.customer-item-card');
    if (firstCust) firstCust.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '04_mobile_admin_modal_detail_pelanggan.jpg'), false);

  // Tutup modal
  await page.evaluate(() => {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.remove('active');
  });
  await new Promise(r => setTimeout(r, 400));

  // 3.5 Tab 3: Pipa & Katup SCADA
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="pipa"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '05_mobile_admin_tab3_pipa_katup.jpg'), false);

  // 3.6 Modal Konfirmasi Kendali Katup Motorik
  await page.evaluate(() => {
    const btnQuick = document.getElementById('btnQuickEmergencyValve');
    if (btnQuick) btnQuick.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '06_mobile_admin_modal_kendali_katup.jpg'), false);

  // Tutup modal
  await page.evaluate(() => {
    const modal = document.getElementById('valveModal');
    if (modal) modal.classList.remove('active');
  });
  await new Promise(r => setTimeout(r, 400));

  // 3.7 Tab 4: Tiket Lapangan
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="tiket"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await takeJpg(path.join(DIRS.admin, '07_mobile_admin_tab4_tiket_lapangan.jpg'), false);

  // 3.8 Modal Detail Tiket Lapangan
  await page.evaluate(() => {
    const firstTicket = document.querySelector('.ticket-item-card');
    if (firstTicket) firstTicket.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await takeJpg(path.join(DIRS.admin, '08_mobile_admin_modal_detail_tiket.jpg'), false);

  await browser.close();
  console.log('\n🎉 Selesai! Semua screenshot mobile telah diulang menggunakan viewport native smartphone tanpa ada navbar tabrakan.');
}

run().catch(err => {
  console.error('❌ Error generating screenshots:', err);
  process.exit(1);
});
