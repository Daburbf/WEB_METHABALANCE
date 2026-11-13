/* Master configuration: nodes, sensors, zones, topology, thresholds, power assets.
   Configured with verified field assets at TPAS Manggar, Balikpapan. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var KEY = 'mb.config.v3';
  var AUDIT_KEY = 'mb.audit.v3';

  var PARAMS = {
    pressure:  { label: 'Tekanan gas', short: 'Tekanan', unit: 'kPa', dec: 2, group: 'proses' },
    flow:      { label: 'Laju aliran', short: 'Aliran', unit: 'Nm³/h', dec: 1, group: 'proses' },
    gas_temp:  { label: 'Suhu gas', short: 'Suhu gas', unit: '°C', dec: 1, group: 'proses' },
    ch4:       { label: 'Konsentrasi CH₄', short: 'CH₄', unit: '%vol', dec: 1, group: 'kualitas' },
    o2:        { label: 'Konsentrasi O₂', short: 'O₂', unit: '%vol', dec: 2, group: 'kualitas' },
    h2s:       { label: 'Konsentrasi H₂S', short: 'H₂S', unit: 'ppm', dec: 0, group: 'kualitas' },
    amb_temp:  { label: 'Suhu lingkungan', short: 'Suhu ling.', unit: '°C', dec: 1, group: 'lingkungan' },
    humidity:  { label: 'Kelembapan relatif lingkungan', short: '%RH', unit: '%RH', dec: 0, group: 'lingkungan' },
    battery_v: { label: 'Tegangan baterai', short: 'Baterai', unit: 'V', dec: 2, group: 'daya' },
    soc:       { label: 'State of charge baterai', short: 'SoC', unit: '%', dec: 0, group: 'daya' },
    solar_w:   { label: 'Daya panel surya', short: 'Panel', unit: 'W', dec: 1, group: 'daya' }
  };
  var PARAM_ORDER = ['pressure', 'flow', 'gas_temp', 'ch4', 'o2', 'h2s', 'amb_temp', 'humidity', 'battery_v', 'soc', 'solar_w'];

  var SENSOR_STATUS = {
    installed:       { label: 'Terpasang', cls: 'st-ok' },
    not_installed:   { label: 'Tidak dipasang', cls: 'st-info' },
    maintenance:     { label: 'Pemeliharaan', cls: 'st-maint' },
    calibration_due: { label: 'Kalibrasi jatuh tempo', cls: 'st-warn' },
    fault:           { label: 'Fault', cls: 'st-crit' },
    no_data:         { label: 'Tidak ada data', cls: 'st-off' }
  };

  var CALIB_STATUS = {
    valid: 'Valid',
    due: 'Jatuh tempo',
    expired: 'Kedaluwarsa'
  };

  var ROLES = {
    operator:  { label: 'Operator DLH Balikpapan', perms: ['view', 'incident', 'report'] },
    admin_dlh: { label: 'Admin DLH Kota Balikpapan', perms: ['view', 'incident', 'report', 'config'] },
    teknisi:   { label: 'Teknisi Lapangan WASTECO', perms: ['view', 'incident'] },
    sysadmin:  { label: 'Administrator Sistem', perms: ['view', 'incident', 'report', 'config'] },
    viewer:    { label: 'Pimpinan & Evaluator', perms: ['view', 'report'] }
  };

  function sensor(status, extra) {
    var s = {
      status: status,
      model: 'Sensata 114PC SS316L',
      serial: 'SN-2026-PT01',
      rangeMin: 0,
      rangeMax: 100,
      calib: 'valid',
      lastCal: '2026-01-15',
      nextCal: '2027-01-15',
      note: ''
    };
    if (extra) Object.keys(extra).forEach(function (k) { s[k] = extra[k]; });
    return s;
  }

  var DEFAULTS = {
    version: 3,
    configNote: 'Konfigurasi teknis stasiun ekstraksi dan 4 batas zona distribusi TPAS Manggar.',
    telemetry: { intervalMin: 5, staleMin: 15, offlineMin: 30, syncTolSec: 120 },
    flow: { unit: 'Nm³/h', basis: 'Normal (0 °C; 101,325 kPa)', basisVerified: true },
    nodes: [
      {
        id: 'MB-HU-01', name: 'Master Hulu', type: 'upstream', placement: 'Stasiun Ekstraksi TPAS Manggar', zoneId: 'ZU',
        lat: -1.21125, lon: 116.93679, coordVerified: true, elevation: 42, installStatus: 'operational', firmware: 'v2.4.1-mb', maintenance: false,
        sensors: {
          pressure: sensor('installed', { model: 'Sensata 114PC SS316L', serial: 'SN-2026-PT01', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15', note: 'Port 1/4" NPT, rentang 0-100 kPa' }),
          flow: sensor('installed', { model: 'FCI ST50 Thermal Mass', serial: 'SN-2026-FM01', rangeMin: 0, rangeMax: 150, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15', note: 'Thermal mass flow meter, basis Nm³/h' }),
          gas_temp: sensor('installed', { model: 'Pt100 RTD SS316', serial: 'SN-2026-RTD01', rangeMin: -20, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          ch4: sensor('installed', { model: 'Dynament MSH-P-NDIR', serial: 'SN-2026-CH01', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15', note: 'NDIR infrared optical sensor' }),
          o2: sensor('installed', { model: 'Alphasense O2-A2', serial: 'SN-2026-O201', rangeMin: 0, rangeMax: 25, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15', note: 'Sensor elektrokimia O2' }),
          h2s: sensor('installed', { model: 'Alphasense H2S-B4', serial: 'SN-2026-HS01', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15', note: 'Sensor elektrokimia H2S' }),
          amb_temp: sensor('installed', { model: 'SHT31-DIS', serial: 'SN-2026-TH01', calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          humidity: sensor('installed', { model: 'SHT31-DIS', serial: 'SN-2026-TH01', calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          battery_v: sensor('installed', { model: 'ADC Internal Atten', serial: 'MB-HU-PWR', calib: 'valid' }),
          soc: sensor('not_installed'),
          solar_w: sensor('not_installed')
        },
        power: { panelWp: 100, batteryV: 12.8, batteryAh: 50, dailyWh: 480, dod: 20, note: 'Sistem hybrid PLN stasiun ekstraksi + UPS baterai' }
      },
      {
        id: 'MB-HD-01', name: 'Edge Hilir 01', type: 'downstream', placement: 'Batas Zona 1 - Gang Swadaya Utara', zoneId: 'Z1',
        lat: -1.20846, lon: 116.94052, coordVerified: true, elevation: 38, installStatus: 'operational', firmware: 'v2.4.1-mb', maintenance: false,
        sensors: {
          pressure: sensor('installed', { model: 'Sensata 114PC SS316L', serial: 'SN-2026-PT02', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          flow: sensor('installed', { model: 'FCI ST50 Thermal Mass', serial: 'SN-2026-FM02', rangeMin: 0, rangeMax: 150, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          gas_temp: sensor('installed', { model: 'Pt100 RTD SS316', serial: 'SN-2026-RTD02', rangeMin: -20, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          ch4: sensor('not_installed'),
          o2: sensor('installed', { model: 'Alphasense O2-A2', serial: 'SN-2026-O202', rangeMin: 0, rangeMax: 25, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          h2s: sensor('not_installed'),
          amb_temp: sensor('not_installed'),
          humidity: sensor('not_installed'),
          battery_v: sensor('installed', { model: 'INA219 I2C Sensor', serial: 'SN-2026-PW02', calib: 'valid' }),
          soc: sensor('not_installed'),
          solar_w: sensor('installed', { model: 'MPPT Telemetry 50W', serial: 'SN-2026-SL02', calib: 'valid' })
        },
        power: { panelWp: 50, batteryV: 12.6, batteryAh: 20, dailyWh: 180, dod: 30, note: 'Panel surya 50 Wp monokristalin + LiFePO4 20Ah' }
      },
      {
        id: 'MB-HD-02', name: 'Edge Hilir 02', type: 'downstream', placement: 'Batas Zona 2 - Poros RT 36 Manggar', zoneId: 'Z2',
        lat: -1.21039, lon: 116.94352, coordVerified: true, elevation: 35, installStatus: 'operational', firmware: 'v2.4.1-mb', maintenance: false,
        sensors: {
          pressure: sensor('installed', { model: 'Sensata 114PC SS316L', serial: 'SN-2026-PT03', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          flow: sensor('installed', { model: 'FCI ST50 Thermal Mass', serial: 'SN-2026-FM03', rangeMin: 0, rangeMax: 150, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          gas_temp: sensor('installed', { model: 'Pt100 RTD SS316', serial: 'SN-2026-RTD03', rangeMin: -20, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          ch4: sensor('not_installed'),
          o2: sensor('not_installed'),
          h2s: sensor('installed', { model: 'Alphasense H2S-B4', serial: 'SN-2026-HS02', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          amb_temp: sensor('not_installed'),
          humidity: sensor('not_installed'),
          battery_v: sensor('installed', { model: 'INA219 I2C Sensor', serial: 'SN-2026-PW03', calib: 'valid' }),
          soc: sensor('not_installed'),
          solar_w: sensor('installed', { model: 'MPPT Telemetry 50W', serial: 'SN-2026-SL03', calib: 'valid' })
        },
        power: { panelWp: 50, batteryV: 12.5, batteryAh: 20, dailyWh: 180, dod: 30, note: 'Panel surya 50 Wp + LiFePO4 20Ah' }
      },
      {
        id: 'MB-HD-03', name: 'Edge Hilir 03', type: 'downstream', placement: 'Batas Zona 3 - Gang Padaidi Timur', zoneId: 'Z3',
        lat: -1.20927, lon: 116.94208, coordVerified: true, elevation: 29, installStatus: 'operational', firmware: 'v2.4.1-mb', maintenance: false,
        sensors: {
          pressure: sensor('installed', { model: 'Sensata 114PC SS316L', serial: 'SN-2026-PT04', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          flow: sensor('installed', { model: 'FCI ST50 Thermal Mass', serial: 'SN-2026-FM04', rangeMin: 0, rangeMax: 150, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          gas_temp: sensor('installed', { model: 'Pt100 RTD SS316', serial: 'SN-2026-RTD04', rangeMin: -20, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          ch4: sensor('not_installed'),
          o2: sensor('installed', { model: 'Alphasense O2-A2', serial: 'SN-2026-O203', rangeMin: 0, rangeMax: 25, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          h2s: sensor('not_installed'),
          amb_temp: sensor('not_installed'),
          humidity: sensor('not_installed'),
          battery_v: sensor('installed', { model: 'INA219 I2C Sensor', serial: 'SN-2026-PW04', calib: 'valid' }),
          soc: sensor('not_installed'),
          solar_w: sensor('not_installed')
        },
        power: { panelWp: 50, batteryV: 12.4, batteryAh: 20, dailyWh: 160, dod: 35, note: 'Panel surya 50 Wp + baterai cadangan' }
      },
      {
        id: 'MB-HD-04', name: 'Edge Hilir 04', type: 'downstream', placement: 'Batas Zona 4 - Kluster Selatan TPA', zoneId: 'Z4',
        lat: -1.21042, lon: 116.94319, coordVerified: true, elevation: 28, installStatus: 'operational', firmware: 'v2.4.1-mb', maintenance: false,
        sensors: {
          pressure: sensor('installed', { model: 'Sensata 114PC SS316L', serial: 'SN-2026-PT05', rangeMin: 0, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          flow: sensor('installed', { model: 'FCI ST50 Thermal Mass', serial: 'SN-2026-FM05', rangeMin: 0, rangeMax: 150, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          gas_temp: sensor('installed', { model: 'Pt100 RTD SS316', serial: 'SN-2026-RTD05', rangeMin: -20, rangeMax: 100, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          ch4: sensor('not_installed'),
          o2: sensor('installed', { model: 'Alphasense O2-A2', serial: 'SN-2026-O204', rangeMin: 0, rangeMax: 25, calib: 'valid', lastCal: '2026-01-15', nextCal: '2027-01-15' }),
          h2s: sensor('not_installed'),
          amb_temp: sensor('not_installed'),
          humidity: sensor('not_installed'),
          battery_v: sensor('installed', { model: 'INA219 I2C Sensor', serial: 'SN-2026-PW05', calib: 'valid' }),
          soc: sensor('not_installed'),
          solar_w: sensor('not_installed')
        },
        power: { panelWp: 50, batteryV: 12.3, batteryAh: 20, dailyWh: 150, dod: 40, note: 'Panel surya 50 Wp + baterai cadangan' }
      }
    ],
    zones: [
      { id: 'ZU', name: 'Jaringan Utama', inlets: ['MB-HU-01'], outlets: ['MB-HD-01', 'MB-HD-02', 'MB-HD-03', 'MB-HD-04'], verified: true, note: 'Trunk line pipa transmisi utama dari stasiun ekstraksi ke 4 zona percabangan sekitar TPAS Manggar.' },
      { id: 'Z1', name: 'Zona Hilir 1 (Gang Swadaya Utara)', inlets: ['MB-HD-01'], outlets: [], verified: true, note: 'Kluster permukiman warga gerbang TPA (95 SR)' },
      { id: 'Z2', name: 'Zona Hilir 2 (Poros RT 36 Manggar)', inlets: ['MB-HD-02'], outlets: [], verified: true, note: 'Kluster permukiman warga RT 36 sekitar TPA (110 SR)' },
      { id: 'Z3', name: 'Zona Hilir 3 (Gang Padaidi Timur)', inlets: ['MB-HD-03'], outlets: [], verified: true, note: 'Kluster permukiman lembah selatan TPA (85 SR)' },
      { id: 'Z4', name: 'Zona Hilir 4 (Kluster Selatan TPA)', inlets: ['MB-HD-04'], outlets: [], verified: true, note: 'Sentra UMKM kuliner & warga sekitar TPA (29 UMKM + 90 SR)' }
    ],
    points: [
      { id: 'SRC', kind: 'source', label: 'Sumber Gas Landfill' },
      { id: 'J-1', kind: 'junction', label: 'Header Percabangan Utama' },
      { id: 'U-1', kind: 'use', label: 'Distribusi Zona 1 (95 SR)' },
      { id: 'U-2', kind: 'use', label: 'Distribusi Zona 2 (110 SR)' },
      { id: 'U-3', kind: 'use', label: 'Distribusi Zona 3 (85 SR)' },
      { id: 'U-4', kind: 'use', label: 'Distribusi Zona 4 (29 UMKM + 90 SR)' }
    ],
    segments: [
      { id: 'S-00', from: 'SRC', to: 'MB-HU-01', zoneId: 'ZU', lengthM: 150, diameter: 'DN100 (4")', material: 'HDPE PN10', verified: true },
      { id: 'S-01', from: 'MB-HU-01', to: 'J-1', zoneId: 'ZU', lengthM: 1200, diameter: 'DN80 (3")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-02', from: 'J-1', to: 'MB-HD-01', zoneId: 'ZU', lengthM: 850, diameter: 'DN80 (3")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-03', from: 'J-1', to: 'MB-HD-02', zoneId: 'ZU', lengthM: 920, diameter: 'DN80 (3")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-04', from: 'J-1', to: 'MB-HD-03', zoneId: 'ZU', lengthM: 1100, diameter: 'DN80 (3")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-05', from: 'J-1', to: 'MB-HD-04', zoneId: 'ZU', lengthM: 1450, diameter: 'DN80 (3")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-11', from: 'MB-HD-01', to: 'U-1', zoneId: 'Z1', lengthM: 650, diameter: 'DN50 (2")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-12', from: 'MB-HD-02', to: 'U-2', zoneId: 'Z2', lengthM: 700, diameter: 'DN50 (2")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-13', from: 'MB-HD-03', to: 'U-3', zoneId: 'Z3', lengthM: 580, diameter: 'DN50 (2")', material: 'PVC-AW SNI 06-0084', verified: true },
      { id: 'S-14', from: 'MB-HD-04', to: 'U-4', zoneId: 'Z4', lengthM: 700, diameter: 'DN50 (2")', material: 'PVC-AW SNI 06-0084', verified: true }
    ],
    thresholds: {
      pressure_low:   { enabled: true, warn: 6, crit: 4.5, unit: 'kPa', label: 'Tekanan rendah', dir: 'below' },
      pressure_high:  { enabled: true, warn: 16, crit: 18, unit: 'kPa', label: 'Tekanan tinggi', dir: 'above' },
      pressure_drop:  { enabled: true, warn: 15, crit: 30, unit: '% vs median 60 menit', label: 'Penurunan tekanan cepat', dir: 'above' },
      flow_change:    { enabled: true, warn: 45, crit: 70, unit: '% vs median 30 menit', label: 'Perubahan aliran tidak wajar', dir: 'above' },
      balance_loss:   { enabled: true, warn: 5, crit: 10, unit: '% losses', label: 'Ketidaksesuaian neraca', dir: 'above' },
      ch4_low:        { enabled: true, warn: 45, crit: 40, unit: '%vol', label: 'CH₄ rendah', dir: 'below' },
      o2_high:        { enabled: true, warn: 2, crit: 4, unit: '%vol', label: 'O₂ meningkat', dir: 'above' },
      h2s_high:       { enabled: true, warn: 50, crit: 80, unit: 'ppm', label: 'H₂S meningkat', dir: 'above' },
      battery_low:    { enabled: true, warn: 12.0, crit: 11.6, unit: 'V', label: 'Tegangan baterai rendah', dir: 'below' },
      water_block:    { enabled: true, warn: 4, crit: null, unit: '% CV tekanan 60 menit + aliran turun >15%', label: 'Indikasi water-blocking', dir: 'above' }
    },
    thresholdsValidated: true,
    economics: {
      pricePerUnit: 1100,
      priceSource: 'SK Penetapan Tarif Distribusi Biogas TPAS Manggar',
      ch4Density: 0.717,
      densitySource: 'NIST Chemistry Reference',
      gwp: 28,
      gwpHorizon: 'GWP-100 AR5',
      gwpSource: 'IPCC Fifth Assessment',
      heatingValue: 21.5,
      heatingSource: 'SNI 7926:2013 Biogas Spesifikasi Mutu'
    },
    integration: { apiBase: '/api/v1', pollSec: 60 },
    valve: { installed: false }
  };

  var NETWORK_SPECS = [
    ['Panjang Jaringan Pipa Distribusi', '8,3 km (Akumulasi Pipa Trunk & Jaringan SR Kawasan Sekitar TPA)'],
    ['Sambungan Rumah (SR)', '380 Sambungan Rumah Aktif'],
    ['Penerima Manfaat Langsung', '1.520 Jiwa'],
    ['Sentra UMKM Terlayani', '29 Unit Usaha'],
    ['Kapasitas Produksi Gas Landfill', '820.800 m³/tahun'],
    ['Tekanan Operasi Nominal', '6,0 – 14,0 kPa'],
    ['Nilai Kalor Biogas', '21,5 MJ/Nm³ (SNI 7926:2013)'],
    ['Reduksi Emisi Gas Rumah Kaca', '100.651 ton CO₂eq/tahun']
  ];

  var INVENTORY = [
    { item: 'ESP32-S3 IoT Node Controller', qty: '5 Unit', spec: 'Dual-core Xtensa LX7, 8MB Flash, 2MB PSRAM, LoRa SPI' },
    { item: 'Pressure Transmitter SS316L', qty: '5 Unit', spec: 'Sensata 114PC, Rentang 0–100 kPa, Akurasi ±0.5% FS, 4-20mA' },
    { item: 'Thermal Mass Flow Meter', qty: '5 Unit', spec: 'FCI ST50 Series, Rentang 0–150 Nm³/h, Suhu -10–100°C' },
    { item: 'Sensor H₂S Elektrokimia', qty: '2 Unit', spec: 'Alphasense H2S-B4, Resolusi 0.5 ppm, Rentang 0–100 ppm' },
    { item: 'Sensor O₂ Elektrokimia', qty: '4 Unit', spec: 'Alphasense O2-A2, Rentang 0–25% Vol, Akurasi ±0.1%' },
    { item: 'Sensor CH₄ Optical NDIR', qty: '1 Unit', spec: 'Dynament MSH-P-NDIR, Rentang 0–100% Vol, Dual Wavelength' },
    { item: 'Sensor Suhu Gas Pt100 RTD', qty: '5 Unit', spec: 'Pt100 Kelas A, Probe SS316 100mm, Rentang -20–100°C' },
    { item: 'Gateway LoRaWAN Outdoor AS923', qty: '1 Unit', spec: 'IP67 Outdoor, 8-Channel Semtech SX1302, AS923-2' }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      var c = JSON.parse(raw);
      if (!c || c.version !== DEFAULTS.version || !Array.isArray(c.nodes)) return clone(DEFAULTS);
      return c;
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  var current = load();

  function audit(action, detail) {
    var list = auditList();
    list.unshift({ ts: Date.now(), role: MB.config.role(), action: action, detail: detail || '' });
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, 500))); } catch (e) { /* storage full */ }
  }
  function auditList() {
    try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch (e) { return []; }
  }

  MB.config = {
    PARAMS: PARAMS,
    PARAM_ORDER: PARAM_ORDER,
    SENSOR_STATUS: SENSOR_STATUS,
    CALIB_STATUS: CALIB_STATUS,
    ROLES: ROLES,
    INVENTORY: INVENTORY,
    NETWORK_SPECS: NETWORK_SPECS,
    PROPOSAL_REF: NETWORK_SPECS,
    get: function () { return current; },
    defaults: function () { return clone(DEFAULTS); },
    save: function (action, detail) {
      localStorage.setItem(KEY, JSON.stringify(current));
      audit(action, detail);
    },
    replace: function (cfg, action) {
      current = cfg;
      MB.config.save(action || 'Pembaruan konfigurasi', 'Konfigurasi stasiun diperbarui');
    },
    reset: function () {
      current = clone(DEFAULTS);
      localStorage.setItem(KEY, JSON.stringify(current));
      audit('Reset konfigurasi', 'Kembali ke konfigurasi default stasiun');
    },
    node: function (id) { return current.nodes.find(function (n) { return n.id === id; }) || null; },
    zone: function (id) { return current.zones.find(function (z) { return z.id === id; }) || null; },
    point: function (id) { return current.points.find(function (p) { return p.id === id; }) || null; },
    unitOf: function (param) { return param === 'flow' ? current.flow.unit : PARAMS[param].unit; },
    sensorInstalled: function (nodeId, param) {
      var n = MB.config.node(nodeId);
      return !!(n && n.sensors[param] && n.sensors[param].status !== 'not_installed');
    },
    role: function () {
      var r = localStorage.getItem('mb.role');
      return ROLES[r] ? r : 'operator';
    },
    setRole: function (r) { if (ROLES[r]) localStorage.setItem('mb.role', r); },
    can: function (perm) { return ROLES[MB.config.role()].perms.indexOf(perm) >= 0; },
    audit: audit,
    auditList: auditList
  };
})(window.MB);
