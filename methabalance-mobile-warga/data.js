/**
 * METHABALANCE Mobile - Data & State Management
 * Portal Warga & UMKM Penerima Manfaat Biogas WASTECO
 * UPTD TPAS Manggar × Dinas Lingkungan Hidup Kota Balikpapan
 */

window.MBM = window.MBM || {};

(function (MBM) {
  'use strict';

  // Customer Account Profiles (Real Operational Data)
  const ACCOUNTS = {
    warga: {
      key: 'warga',
      type: 'Rumah Tangga',
      roleBadge: 'Warga RT 23',
      id: 'SR-0142',
      customerName: 'Ibu Siti Aminah',
      phone: '0812-5814-9921',
      address: 'Jl. Mulawarman Gang TPA Manggar RT 23 No. 14',
      subDistrict: 'Kel. Manggar, Kec. Balikpapan Timur',
      coordinates: '-1.2152° S, 116.9304° E',
      nodeSegment: 'Jalur Node-06 Cabang B',
      nodeId: 'Node-06',
      meterSerial: 'MTR-MGR-SR-0142-AW',
      currentMonthUsage: 18.4, // m³
      previousMonthUsage: 19.1, // m³
      monthlyBilling: 10000, // Rp / bulan
      billingPeriod: 'November 2026',
      billingStatus: 'Lunas',
      billingAllocation: 'Kas Gotong Royong Perawatan RT 23',
      monthlyLpgSavings: 80000, // Rp / bulan
      yearlyLpgSavings: 960000, // Rp / tahun
      lpgTubesEquivalent: 4, // Tabung LPG 3kg subsidi
      carbonOffsetKg: 14.2, // kg CO2e
      stoveStatus: 'Kompor Aktif',
      savingsHistory: [
        { month: 'Jun', amount: 80000, tubes: 4 },
        { month: 'Jul', amount: 80000, tubes: 4 },
        { month: 'Agt', amount: 80000, tubes: 4 },
        { month: 'Sep', amount: 80000, tubes: 4 },
        { month: 'Okt', amount: 80000, tubes: 4 },
        { month: 'Nov', amount: 80000, tubes: 4 }
      ],
      weeklyUsage: [
        { day: 'Sen', date: '07 Nov', val: 2.4 },
        { day: 'Sel', date: '08 Nov', val: 2.8 },
        { day: 'Rab', date: '09 Nov', val: 2.5 },
        { day: 'Kam', date: '10 Nov', val: 2.7 },
        { day: 'Jum', date: '11 Nov', val: 2.3 },
        { day: 'Sab', date: '12 Nov', val: 3.1 },
        { day: 'Min', date: '13 Nov', val: 2.6 }
      ]
    },
    umkm: {
      key: 'umkm',
      type: 'Pelaku Usaha Mikro',
      roleBadge: 'UMKM Klaster C',
      id: 'UMKM-008',
      customerName: 'Bpk. Sukirman (Tahu & Tempe Manggar)',
      phone: '0813-4720-3345',
      address: 'Jl. TPAS Manggar KM 12 RT 22 No. 08',
      subDistrict: 'Kel. Manggar, Kec. Balikpapan Timur',
      coordinates: '-1.2140° S, 116.9315° E',
      nodeSegment: 'Jalur Node-11 Klaster C',
      nodeId: 'Node-11',
      meterSerial: 'MTR-MGR-UMKM-008-AW',
      currentMonthUsage: 94.2, // m³
      previousMonthUsage: 96.5, // m³
      monthlyBilling: 25000, // Rp / bulan (Tarif Resmi Pemanfaatan Biogas UMKM TPAS Manggar)
      billingPeriod: 'November 2026',
      billingStatus: 'Lunas',
      billingAllocation: 'Kas Perawatan Jalur UMKM Klaster C',
      monthlyLpgSavings: 420000, // Rp / bulan
      yearlyLpgSavings: 5040000, // Rp / tahun
      lpgTubesEquivalent: 21, // Tabung LPG 3kg subsidi
      carbonOffsetKg: 72.8, // kg CO2e
      stoveStatus: 'Kompor Aktif (Produksi)',
      savingsHistory: [
        { month: 'Jun', amount: 420000, tubes: 21 },
        { month: 'Jul', amount: 420000, tubes: 21 },
        { month: 'Agt', amount: 420000, tubes: 21 },
        { month: 'Sep', amount: 420000, tubes: 21 },
        { month: 'Okt', amount: 420000, tubes: 21 },
        { month: 'Nov', amount: 420000, tubes: 21 }
      ],
      weeklyUsage: [
        { day: 'Sen', date: '07 Nov', val: 13.2 },
        { day: 'Sel', date: '08 Nov', val: 14.5 },
        { day: 'Rab', date: '09 Nov', val: 13.8 },
        { day: 'Kam', date: '10 Nov', val: 14.1 },
        { day: 'Jum', date: '11 Nov', val: 12.9 },
        { day: 'Sab', date: '12 Nov', val: 15.2 },
        { day: 'Min', date: '13 Nov', val: 10.5 }
      ]
    }
  };

  // 24-Hour Pipeline Pressure Profile (WITA)
  // Reflects real cooking peak hours (05:00-08:00 & 16:30-19:30 WITA)
  const PRESSURE_HOURLY_CURVE = [
    { hour: '00:00', pressure: 4.6, label: '00:00' },
    { hour: '02:00', pressure: 4.7, label: '02:00' },
    { hour: '04:00', pressure: 4.5, label: '04:00' },
    { hour: '05:30', pressure: 3.8, label: '05:30 (Masak Pagi)' },
    { hour: '06:30', pressure: 3.4, label: '06:30 (Puncak Pagi)' },
    { hour: '08:00', pressure: 4.0, label: '08:00' },
    { hour: '10:00', pressure: 4.4, label: '10:00' },
    { hour: '12:00', pressure: 3.9, label: '12:00 (Masak Siang)' },
    { hour: '14:00', pressure: 4.3, label: '14:00' },
    { hour: '16:00', pressure: 4.2, label: '16:00' },
    { hour: '17:30', pressure: 3.5, label: '17:30 (Puncak Sore)' },
    { hour: '19:00', pressure: 3.7, label: '19:00 (Malam)' },
    { hour: '21:00', pressure: 4.4, label: '21:00' },
    { hour: '23:00', pressure: 4.6, label: '23:00' }
  ];

  // Pipeline Telemetry Specs
  const TELEMETRY_SPECS = {
    pipelineNetwork: '8,3 km Pipa PVC 3 Inci Class AW',
    origin: 'Stasiun Ekstraksi TPAS Manggar (-1.2135° S, 116.9328° E)',
    valveModel: 'Motorized Ball Valve SS304 NC (Tutup Otomatis < 5 Detik)',
    pressureNominal: {
      val: 4.2,
      unit: 'kPa',
      bar: '0,042 Bar',
      rangeSafe: '2,5 – 6,0 kPa',
      status: 'Stabil'
    },
    ch4Purity: {
      val: 56.4,
      unit: '% Vol',
      sensor: 'Optical NDIR Anti-Dewing',
      flameQuality: 'Api Biru Optimal',
      safeThreshold: '> 50,0% Vol'
    },
    o2Purity: {
      val: 0.3,
      unit: '% Vol',
      sensor: 'Elektrokimia Akurasi Tinggi',
      safetyStatus: 'Aman (Batas Ledak LEL 5,0% – 15,0%)',
      limit: '< 1,5% Vol'
    },
    h2sPurity: {
      val: 16,
      unit: 'ppm',
      scrubberStatus: 'Penyaring Bio-Filter Aktif',
      safetyStatus: 'Aman untuk Peralatan Masak Logam',
      limit: '< 50 ppm'
    },
    humidity: {
      val: 74,
      unit: '% RH',
      status: 'Aliran Bebas Kondensat',
      trapCondition: 'Water-Trap Gravitasi Bersih'
    }
  };

  // Local Storage Keys
  const STORAGE_KEYS = {
    ACCOUNT: 'mbm.active_account',
    GRID_STATE: 'mbm.grid_state',
    USER_VALVE: 'mbm.user_valve_shutoff',
    REPORTS: 'mbm.citizen_reports.v1',
    PREFS: 'mbm.citizen_prefs.v1'
  };

  // Default Incident Reports
  const INITIAL_REPORTS = [
    {
      ticketId: 'TKT-MGR-2026-088',
      category: 'Periksa Water-Trap / Tekanan',
      location: 'Jl. Mulawarman RT 23 Node-06',
      coordinates: '-1.2152° S, 116.9304° E',
      status: 'Selesai',
      statusClass: 'status-selesai',
      createdAt: '11 Nov 2026, 14:30 WITA',
      desc: 'Pembersihan kondensat air pada U-bend pipa distribusi RT 23 oleh teknisi UPTD.',
      technician: 'Budi Santoso (Teknisi Sektor RT 23)'
    },
    {
      ticketId: 'TKT-MGR-2026-074',
      category: 'Kualitas Nyala Api Kompor',
      location: 'Jl. Mulawarman RT 23 Gang 4 No. 12',
      coordinates: '-1.2150° S, 116.9308° E',
      status: 'Selesai',
      statusClass: 'status-selesai',
      createdAt: '04 Nov 2026, 09:15 WITA',
      desc: 'Penyetelan spuyer burner kompor gas biogas warga untuk mendapatkan nyala biru optimal.',
      technician: 'Ahmad Faisal (Teknisi DLH)'
    }
  ];

  // Default Preferences
  const INITIAL_PREFS = {
    notifyCutoff: true,
    notifyDrain: true,
    notifySavings: true
  };

  // State Getters & Setters
  function getActiveAccountKey() {
    return localStorage.getItem(STORAGE_KEYS.ACCOUNT) || 'warga';
  }

  function setActiveAccountKey(key) {
    if (ACCOUNTS[key]) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNT, key);
    }
  }

  function getActiveAccount() {
    const key = getActiveAccountKey();
    return ACCOUNTS[key] || ACCOUNTS.warga;
  }

  function getGridState() {
    return localStorage.getItem(STORAGE_KEYS.GRID_STATE) || 'NORMAL';
  }

  function setGridState(state) {
    if (state === 'NORMAL' || state === 'ISOLASI_DARURAT') {
      localStorage.setItem(STORAGE_KEYS.GRID_STATE, state);
    }
  }

  function isUserValveClosed() {
    return localStorage.getItem(STORAGE_KEYS.USER_VALVE) === 'true';
  }

  function setUserValveClosed(closed) {
    localStorage.setItem(STORAGE_KEYS.USER_VALVE, closed ? 'true' : 'false');
  }

  function getReports() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
        return INITIAL_REPORTS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_REPORTS;
    } catch (e) {
      return INITIAL_REPORTS;
    }
  }

  function addReport(reportData) {
    const reports = getReports();
    const seq = reports.length + 89;
    const ticketId = 'TKT-MGR-2026-' + (seq < 100 ? '0' : '') + seq;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WITA';

    const newReport = {
      ticketId: ticketId,
      category: reportData.category || 'Anomali Tekanan / Bau Gas',
      location: reportData.location || getActiveAccount().address,
      coordinates: reportData.coordinates || getActiveAccount().coordinates,
      status: 'Sedang Ditinjau',
      statusClass: 'status-proses',
      createdAt: formattedDate,
      desc: reportData.desc || '',
      technician: 'Petugas Piket DLH Balikpapan'
    };

    reports.unshift(newReport);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    return newReport;
  }

  function getPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
      if (!raw) return INITIAL_PREFS;
      return Object.assign({}, INITIAL_PREFS, JSON.parse(raw));
    } catch (e) {
      return INITIAL_PREFS;
    }
  }

  function setPref(key, value) {
    const prefs = getPrefs();
    prefs[key] = !!value;
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
    return prefs;
  }

  // Format Helper for Currency
  function formatRupiah(number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(number);
  }

  // Export to namespace
  MBM.data = {
    ACCOUNTS: ACCOUNTS,
    PRESSURE_HOURLY_CURVE: PRESSURE_HOURLY_CURVE,
    TELEMETRY_SPECS: TELEMETRY_SPECS,
    getActiveAccountKey: getActiveAccountKey,
    setActiveAccountKey: setActiveAccountKey,
    getActiveAccount: getActiveAccount,
    getGridState: getGridState,
    setGridState: setGridState,
    isUserValveClosed: isUserValveClosed,
    setUserValveClosed: setUserValveClosed,
    getReports: getReports,
    addReport: addReport,
    getPrefs: getPrefs,
    setPref: setPref,
    formatRupiah: formatRupiah
  };

})(window.MBM);
