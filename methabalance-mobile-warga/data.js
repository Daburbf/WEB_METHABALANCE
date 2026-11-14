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

  // Weather Telemetry (Stasiun Cuaca TPAS Manggar & Pengaruh Kondensasi Jaringan Pipa)
  const WEATHER_DATA = {
    location: 'TPAS Manggar, Balikpapan Timur',
    coordinates: '-1.2135° S, 116.9328° E',
    temp: 29.4,
    tempUnit: '°C',
    condition: 'Cerah Berawan',
    conditionCode: 'partly-cloudy',
    humidity: 81,
    humidityUnit: '% RH',
    windSpeed: 12,
    windDirection: 'Barat Daya',
    barometricPressure: 1011,
    pressureUnit: 'hPa',
    dewPoint: 24.1,
    dewPointUnit: '°C',
    dewPointStatus: 'Aman (Di Bawah Titik Jenuh)',
    condensateTrapStatus: 'Normal (Katup Kuras Node-07 Siaga)',
    lastUpdated: '14 Nov 2026, 13:30 WITA',
    pipelineImpact: 'Kelembaban udara 81% berada dalam rentang aman. Laju pembentukan kondensat air di cekungan pipa Node-07 terkontrol normal tanpa indikasi penyumbatan uap air (water-blocking).'
  };

  // Local Storage Keys
  const STORAGE_KEYS = {
    ACCOUNT: 'mbm.active_account',
    GRID_STATE: 'mbm.grid_state',
    USER_VALVE: 'mbm.user_valve_shutoff',
    REPORTS: 'mbm.citizen_reports.v1',
    PREFS: 'mbm.citizen_prefs.v1',
    HELP_TICKETS: 'mbm.helpdesk_tickets.v1',
    CHAT_HISTORY: 'mbm.chat_history.v1',
    VALVE_OVERRIDES: 'mbm.valve_overrides.v1'
  };


  // Topologi Pipa Induk Transmisi & 4 Cabang Distribusi Sektor (Identik Web GIS)
  const PIPELINE_TOPOLOGY = {
  "trunkCoords": [
    [
      -1.211254,
      116.93679
    ],
    [
      -1.2111,
      116.93705
    ],
    [
      -1.21075,
      116.9374
    ],
    [
      -1.21035,
      116.93775
    ],
    [
      -1.20995,
      116.9381
    ],
    [
      -1.2094,
      116.93845
    ],
    [
      -1.208884,
      116.938774
    ],
    [
      -1.208388,
      116.93886
    ],
    [
      -1.208388,
      116.93886
    ],
    [
      -1.208393,
      116.939021
    ],
    [
      -1.208382,
      116.939174
    ],
    [
      -1.208354,
      116.939379
    ],
    [
      -1.20846,
      116.94052
    ],
    [
      -1.208564,
      116.940694
    ],
    [
      -1.208646,
      116.940938
    ],
    [
      -1.208731,
      116.941355
    ],
    [
      -1.208775,
      116.941455
    ],
    [
      -1.209029,
      116.941816
    ],
    [
      -1.209273,
      116.942081
    ],
    [
      -1.209416,
      116.942158
    ],
    [
      -1.210076,
      116.942316
    ],
    [
      -1.210163,
      116.942383
    ],
    [
      -1.210302,
      116.942537
    ],
    [
      -1.210369,
      116.942755
    ],
    [
      -1.210397,
      116.942898
    ],
    [
      -1.210424,
      116.943191
    ]
  ],
  "branches": [
    {
      "name": "Distribusi Zona 1: Gang Swadaya Pemukiman Utara (32 SR)",
      "nodeId": "MB-HD-1",
      "coords": [
        [
          -1.20846,
          116.94052
        ],
        [
          -1.208203,
          116.940579
        ],
        [
          -1.207991,
          116.940636
        ],
        [
          -1.207839,
          116.940654
        ],
        [
          -1.207689,
          116.940651
        ],
        [
          -1.207508,
          116.940644
        ],
        [
          -1.207236,
          116.940667
        ],
        [
          -1.206981,
          116.940718
        ],
        [
          -1.206903,
          116.940736
        ],
        [
          -1.206724,
          116.940775
        ],
        [
          -1.206551,
          116.94083
        ],
        [
          -1.206497,
          116.940877
        ],
        [
          -1.206453,
          116.940952
        ],
        [
          -1.206437,
          116.941031
        ],
        [
          -1.206434,
          116.941093
        ],
        [
          -1.206419,
          116.941135
        ],
        [
          -1.206401,
          116.941156
        ],
        [
          -1.206323,
          116.941203
        ],
        [
          -1.206217,
          116.941273
        ],
        [
          -1.206116,
          116.941359
        ],
        [
          -1.206056,
          116.941415
        ],
        [
          -1.206017,
          116.941498
        ],
        [
          -1.206006,
          116.94157
        ],
        [
          -1.205998,
          116.94167
        ],
        [
          -1.205953,
          116.941745
        ],
        [
          -1.205872,
          116.94178
        ],
        [
          -1.205758,
          116.941793
        ],
        [
          -1.205703,
          116.941818
        ],
        [
          -1.205654,
          116.94186
        ],
        [
          -1.205614,
          116.941895
        ],
        [
          -1.205526,
          116.941891
        ],
        [
          -1.205348,
          116.941823
        ]
      ]
    },
    {
      "name": "Distribusi Zona 2: Poros Utama Pemukiman RT 36 Manggar (45 SR)",
      "nodeId": "MB-HD-2",
      "coords": [
        [
          -1.210391,
          116.943523
        ],
        [
          -1.21055,
          116.943596
        ],
        [
          -1.210684,
          116.943646
        ],
        [
          -1.2108,
          116.943637
        ],
        [
          -1.211032,
          116.943624
        ],
        [
          -1.211177,
          116.943591
        ],
        [
          -1.211332,
          116.943516
        ],
        [
          -1.211442,
          116.943466
        ],
        [
          -1.211579,
          116.943425
        ],
        [
          -1.211654,
          116.943444
        ],
        [
          -1.211796,
          116.943519
        ],
        [
          -1.21207,
          116.943726
        ],
        [
          -1.212322,
          116.943881
        ],
        [
          -1.21252,
          116.943994
        ],
        [
          -1.212611,
          116.944053
        ],
        [
          -1.212705,
          116.944088
        ],
        [
          -1.212788,
          116.944098
        ],
        [
          -1.212887,
          116.944082
        ],
        [
          -1.212932,
          116.944067
        ],
        [
          -1.212982,
          116.944053
        ],
        [
          -1.213035,
          116.944039
        ],
        [
          -1.213075,
          116.944023
        ],
        [
          -1.213132,
          116.943999
        ],
        [
          -1.213209,
          116.943984
        ],
        [
          -1.213274,
          116.943979
        ],
        [
          -1.213341,
          116.943969
        ],
        [
          -1.213418,
          116.943958
        ],
        [
          -1.213479,
          116.943946
        ],
        [
          -1.213518,
          116.94394
        ],
        [
          -1.213564,
          116.943932
        ],
        [
          -1.213609,
          116.943935
        ],
        [
          -1.213666,
          116.943935
        ],
        [
          -1.213708,
          116.943939
        ],
        [
          -1.213775,
          116.943943
        ],
        [
          -1.213838,
          116.943948
        ],
        [
          -1.2139,
          116.943954
        ]
      ]
    },
    {
      "name": "Distribusi Zona 3: Gang Padaidi & Permukiman Timur (28 SR)",
      "nodeId": "MB-HD-3",
      "coords": [
        [
          -1.209273,
          116.942081
        ],
        [
          -1.208774,
          116.942189
        ],
        [
          -1.208385,
          116.942318
        ],
        [
          -1.208047,
          116.942442
        ],
        [
          -1.207827,
          116.942521
        ],
        [
          -1.207603,
          116.942592
        ],
        [
          -1.207032,
          116.942737
        ],
        [
          -1.206689,
          116.942835
        ]
      ]
    },
    {
      "name": "Distribusi Zona 4: Kluster Pemukiman Sisi Selatan TPA (35 SR)",
      "nodeId": "MB-HD-4",
      "coords": [
        [
          -1.210424,
          116.943191
        ],
        [
          -1.210789,
          116.942629
        ],
        [
          -1.211095,
          116.942206
        ],
        [
          -1.211241,
          116.942076
        ],
        [
          -1.211386,
          116.941976
        ],
        [
          -1.211571,
          116.941843
        ],
        [
          -1.21159,
          116.941814
        ],
        [
          -1.211639,
          116.941739
        ],
        [
          -1.211968,
          116.941045
        ],
        [
          -1.211993,
          116.94093
        ],
        [
          -1.211969,
          116.940883
        ],
        [
          -1.211825,
          116.940738
        ],
        [
          -1.211718,
          116.940614
        ],
        [
          -1.211678,
          116.940501
        ],
        [
          -1.21169,
          116.940404
        ],
        [
          -1.211721,
          116.940372
        ],
        [
          -1.211827,
          116.940347
        ]
      ]
    }
  ]
};

  function getPipelineTopology() {
    return PIPELINE_TOPOLOGY;
  }

  // 5 Node Telemetri & Katup Distribusi (8,3 km Pipa PVC 3 Inci TPAS Manggar)
  const NODES_GIS_DATA = [
    {
      id: 'MB-HU-01',
      code: 'Node-01',
      name: 'Stasiun Ekstraksi Utama TPA',
      type: 'Hulu (Upstream)',
      zone: 'Zona Ekstraksi Sanitary Landfill',
      lat: -1.211254,
      lng: 116.93679,
      elevation: 42,
      valveModel: 'Motorized Ball Valve SS304 NC 3 Inci',
      valveStatus: 'OPEN',
      valveResponseTime: '3.8 detik',
      pressure: 4.8,
      flow: 124.5,
      ch4: 58.2,
      affectedSectors: 'Seluruh Jaringan Distribusi (380 SR + 29 UMKM)',
      reasonClosed: null,
      updatedAt: '14 Nov 2026, 13:45 WITA'
    },
    {
      id: 'MB-HD-01',
      code: 'Node-02',
      name: 'Header Transmisi Gang Swadaya RT 22',
      type: 'Transmisi Hilir',
      zone: 'Zona 1 (Gang Swadaya RT 22)',
      lat: -1.20846,
      lng: 116.94052,
      elevation: 38,
      valveModel: 'Motorized Ball Valve SS304 NC',
      valveStatus: 'OPEN',
      valveResponseTime: '3.6 detik',
      pressure: 4.5,
      flow: 32.1,
      ch4: 57.4,
      affectedSectors: '98 Sambungan Rumah (SR) RT 22',
      reasonClosed: null,
      updatedAt: '14 Nov 2026, 13:45 WITA'
    },
    {
      id: 'MB-HD-02',
      code: 'Node-03',
      name: 'Katup Distribusi Poros RT 23',
      type: 'Distribusi Sektor',
      zone: 'Zona 2 (Poros RT 23 Manggar)',
      lat: -1.21039,
      lng: 116.94352,
      elevation: 35,
      valveModel: 'Motorized Ball Valve SS304 NC (Fail-Safe)',
      valveStatus: 'CLOSED',
      valveResponseTime: '3.8 detik',
      pressure: 0.0,
      flow: 0.0,
      ch4: 0.0,
      affectedSectors: '95 Sambungan Rumah (SR) RT 23',
      reasonClosed: 'Katup diisolasi darurat akibat pemeliharaan pipa cabang RT 23 oleh Regu Siaga DLH.',
      updatedAt: '14 Nov 2026, 14:30 WITA'
    },
    {
      id: 'MB-HD-03',
      code: 'Node-04',
      name: 'Katup Distribusi Gang Padaidi RT 24',
      type: 'Distribusi Sektor & UMKM',
      zone: 'Zona 3 (Gang Padaidi Timur)',
      lat: -1.20927,
      lng: 116.94208,
      elevation: 29,
      valveModel: 'Motorized Ball Valve SS304 NC',
      valveStatus: 'CLOSED',
      valveResponseTime: '3.8 detik',
      pressure: 0.0,
      flow: 0.0,
      ch4: 0.0,
      affectedSectors: '92 Sambungan Rumah (SR) RT 24 & Sentra UMKM',
      reasonClosed: 'Katup ditutup untuk penggantian gasket flange pipa inlet sentra UMKM RT 24.',
      updatedAt: '14 Nov 2026, 14:30 WITA'
    },
    {
      id: 'MB-HD-04',
      code: 'Node-05',
      name: 'Ujung Distribusi Kluster Selatan RT 25',
      type: 'Distribusi Ujung',
      zone: 'Zona 4 (Kluster Selatan TPA RT 25)',
      lat: -1.21042,
      lng: 116.94319,
      elevation: 28,
      valveModel: 'Motorized Ball Valve SS304 NC',
      valveStatus: 'OPEN',
      valveResponseTime: '3.8 detik',
      pressure: 4.1,
      flow: 26.5,
      ch4: 55.9,
      affectedSectors: '95 Sambungan Rumah (SR) RT 25',
      reasonClosed: null,
      updatedAt: '14 Nov 2026, 13:45 WITA'
    }
  ];

  // Petugas Siaga & Tim Lapangan (Kontak Nyata UPTD TPAS Manggar × Koperasi WASTECO)
  const HELP_STAFF = [
    {
      id: 'st-01',
      name: 'Bpk. Bambang Sutrisno',
      role: 'Koordinator Lapangan WASTECO RT 23',
      phone: '0812-5489-2210',
      whatsapp: '6281254892210',
      status: 'Sedang Bertugas',
      sector: 'RT 22, RT 23, RT 24 Manggar',
      badge: 'Koordinator Sektor'
    },
    {
      id: 'st-02',
      name: 'Bpk. Agus Priyanto',
      role: 'Teknisi Katup & Jaringan Pipa DLH',
      phone: '0821-4876-3391',
      whatsapp: '6282148763391',
      status: 'Siaga di Posko',
      sector: 'Node-04 Manifold & Node-06 Distribusi',
      badge: 'Teknisi Jaringan'
    },
    {
      id: 'st-03',
      name: 'Posko Induk UPTD TPAS Manggar',
      role: 'Pusat Kontrol SCADA & Layanan DLH',
      phone: '0542-745812',
      whatsapp: '62811540789',
      status: 'Layanan 24 Jam',
      sector: 'Pusat Ekstraksi & Flare Gas KM 12',
      badge: 'Posko Induk'
    }
  ];

  // Standar Operasional Prosedur (SOP) Lapangan Praktis untuk Warga
  const SOP_GUIDES = [
    {
      id: 'sop-sabun',
      title: 'Uji Kebocoran Mandiri Pakai Air Sabun',
      summary: 'Cara aman mendeteksi kebocoran tanpa alat elektronik.',
      steps: [
        'Campurkan 2 sendok sabun cuci piring dengan sedikit air hingga berbusa pekat.',
        'Oleskan busa sabun dengan kuas kecil atau spons pada sambungan kran gas, selang kompor, dan meteran.',
        'Perhatikan apakah timbul gelembung sabun yang terus membesar atau meletup.',
        'Jika gelembung membesar: Terjadi kebocoran kecil. Segera tutup kran utama dan hubungi teknisi lapangan.'
      ]
    },
    {
      id: 'sop-bau-gas',
      title: 'Tindakan Pertama Jika Bau Gas Menyengat',
      summary: 'Prosedur keselamatan darurat pencegahan kebakaran/ledakan.',
      steps: [
        'TUTUP kran gas utama di samping kompor (posisi tuas tegak lurus pipa).',
        'Buka semua daun jendela dan pintu dapur selebar-lebarnya agar gas keluar.',
        'JANGAN menyalakan pemantik api, rokok, kompor, atau saklar listrik lampu rumah.',
        'JANGAN mencabut colokan listrik dinding (percikan api kecil sakelar dapat memicu gas).',
        'Segera keluar ke area terbuka dan tekan tombol Tutup Katup Mandiri di aplikasi atau hubungi posko siaga.'
      ]
    },
    {
      id: 'sop-api-merah',
      title: 'Cara Setel Kompor Bila Api Kemerahan',
      summary: 'Menyesuaikan pasokan udara agar pembakaran kembali biru optimal.',
      steps: [
        'Biogas metana membutuhkan pasokan oksigen yang cukup agar menyala biru tanpa jelaga.',
        'Lihat bagian bawah burner kompor (leher pipa pembakar), terdapat cincin logam pengatur udara (air shutter).',
        'Kendurkan sedikit sekrup cincin pengatur udara, lalu putar perlahan celah udara hingga api kompor berubah menjadi biru bersih.',
        'Kencangkan kembali sekrup agar posisi tidak bergeser saat kompor digunakan.',
        'Bersihkan lubang-lubang kuningan tungku dari sisa minyak atau kerak masakan menggunakan jarum kecil.'
      ]
    },
    {
      id: 'sop-aliran-lemah',
      title: 'Mengapa Aliran Gas Melemah Saat Hujan Lebat?',
      summary: 'Penjelasan fenomena kondensasi uap air di titik cekungan pipa.',
      steps: [
        'Biogas mentah dari landfill mengandung uap air alami. Saat suhu udara turun drastis (hujan), uap air mengembun menjadi butiran air di dalam pipa.',
        'Butiran air mengalir gravitasi ke titik terendah (Node-07 Cekungan Kondensat).',
        'Bila air menumpuk sesaat sebelum katup kuras bekerja, terjadi resistensi aliran sementara (water-blocking).',
        'Teknisi UPTD TPAS Manggar mengoperasikan katup kuras gravitasi setiap 3 jam untuk membuang air kondensat sehingga aliran normal kembali dalam beberapa menit.'
      ]
    }
  ];

  // Initial Help Desk Tickets
  const INITIAL_HELP_TICKETS = [
    {
      ticketId: 'HD-MGR-2026-104',
      category: 'Penyetelan Spuyer Kompor',
      customerName: 'Ibu Siti Aminah (SR-0142)',
      location: 'Jl. Mulawarman Gang TPA Manggar RT 23 No. 14',
      status: 'Selesai',
      statusClass: 'status-selesai',
      createdAt: '10 Nov 2026, 11:20 WITA',
      scheduledAt: '10 Nov 2026, 13:00 WITA',
      technician: 'Bpk. Agus Priyanto',
      notes: 'Penyetelan cincin pasokan udara leher kompor selesai; nyala api kompor kembali biru bersih 100%.'
    },
    {
      ticketId: 'HD-MGR-2026-118',
      category: 'Pemeriksaan Sambungan Keran Gas Dapur',
      customerName: 'Ibu Siti Aminah (SR-0142)',
      location: 'Jl. Mulawarman Gang TPA Manggar RT 23 No. 14',
      status: 'Teknisi Menuju Lokasi',
      statusClass: 'status-proses',
      createdAt: '14 Nov 2026, 10:45 WITA',
      scheduledAt: '14 Nov 2026, 14:00 WITA',
      technician: 'Bpk. Bambang Sutrisno',
      notes: 'Pemeriksaan rutin sambungan kran gas sekunder RT 23 dan uji kebocoran busa sabun.'
    }
  ];

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

  function getNodesGis() {
    const isIsolated = getGridState() === 'ISOLASI_DARURAT';
    let overrides = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VALVE_OVERRIDES);
      if (raw) overrides = JSON.parse(raw);
    } catch (e) {}

    return NODES_GIS_DATA.map(node => {
      const n = Object.assign({}, node);
      if (isIsolated && (n.code === 'Node-06' || n.id === 'MB-HD-06')) {
        n.valveStatus = 'CLOSED';
        n.pressure = 0.0;
        n.reasonClosed = 'Katup Motorik Node-06 menutup otomatis (< 5 detik) akibat mode isolasi darurat SCADA DLH.';
      } else if (overrides[n.id]) {
        n.valveStatus = overrides[n.id].valveStatus;
        if (n.valveStatus === 'CLOSED') {
          n.pressure = 0.0;
          n.reasonClosed = overrides[n.id].reasonClosed || 'Katup ditutup untuk pemeliharaan teknis.';
        } else {
          n.reasonClosed = null;
        }
      }
      return n;
    });
  }

  function setNodeValveState(nodeId, newStatus, reason) {
    let overrides = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VALVE_OVERRIDES);
      if (raw) overrides = JSON.parse(raw);
    } catch (e) {}

    overrides[nodeId] = {
      valveStatus: newStatus,
      reasonClosed: reason || null,
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA'
    };

    localStorage.setItem(STORAGE_KEYS.VALVE_OVERRIDES, JSON.stringify(overrides));
    return getNodesGis();
  }

  function getClosedNodes() {
    return getNodesGis().filter(n => n.valveStatus === 'CLOSED');
  }

  function getWeather() {
    return WEATHER_DATA;
  }

  function getHelpStaff() {
    return HELP_STAFF;
  }

  function getSopGuides() {
    return SOP_GUIDES;
  }

  function getHelpTickets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HELP_TICKETS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(INITIAL_HELP_TICKETS));
        return INITIAL_HELP_TICKETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_HELP_TICKETS;
    } catch (e) {
      return INITIAL_HELP_TICKETS;
    }
  }

  function addHelpTicket(ticketData) {
    const tickets = getHelpTickets();
    const seq = tickets.length + 119;
    const ticketId = 'HD-MGR-2026-' + seq;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WITA';

    const account = getActiveAccount();
    const newTicket = {
      ticketId: ticketId,
      category: ticketData.category || 'Pengecekan Kompor / Sambungan',
      customerName: account.customerName + ' (' + account.id + ')',
      location: ticketData.location || account.address,
      status: 'Dalam Antrean Petugas',
      statusClass: 'status-proses',
      createdAt: formattedDate,
      scheduledAt: ticketData.scheduledAt || 'Hari ini (Segera)',
      technician: ticketData.technician || 'Bpk. Bambang Sutrisno (Koordinator Sektor)',
      notes: ticketData.notes || 'Permintaan kunjungan pengecekan oleh warga via aplikasi mobile.'
    };

    tickets.unshift(newTicket);
    localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(tickets));
    return newTicket;
  }

  // Mesin Respon Chatbot Operasional Lapangan (Non-AI, Bahasa Petugas Praktis & Faktual)
  function answerChatQuery(rawQuery) {
    const q = (rawQuery || '').toLowerCase().trim();
    const account = getActiveAccount();
    const telem = TELEMETRY_SPECS;
    const weather = WEATHER_DATA;

    // 1. Cek Tekanan / Status Aliran Gas Rumah
    if (q.includes('tekanan') || q.includes('cek gas') || q.includes('cek pipa') || q.includes('status gas') || q.includes('lancar')) {
      return {
        text: `Data Telemetri Langsung di Sektor Anda (${account.nodeSegment}):\n\n` +
              `• Tekanan Pipa: ${telem.pressureNominal.val} kPa (${telem.pressureNominal.rangeSafe} — Normal & Stabil)\n` +
              `• Kemurnian CH₄: ${telem.ch4Purity.val}% Vol (Batas Aman > 50%)\n` +
              `• Kadar Oksigen O₂: ${telem.o2Purity.val}% Vol (Aman dari risiko letupan)\n` +
              `• Katup Sektor: Terbuka normal ke sambungan ${account.id}.\n\n` +
              `Pasokan dari stasiun pusat TPAS Manggar mengalir lancar. Jika api kompor Anda kecil, periksa kran fleksibel kompor atau setelan cincin udara burner.`,
        actionLabel: 'Lihat Telemetri Lengkap',
        actionTarget: 'tab-telemetri'
      };
    }

    // 2. Bau Gas / Kebocoran / Bahaya
    if (q.includes('bau') || q.includes('bocor') || q.includes('gas keluar') || q.includes('desis') || q.includes('bahaya') || q.includes('meledak')) {
      return {
        text: `PERINGATAN KESELAMATAN DARURAT:\n\n` +
              `1. Segera TUTUP katup kran gas di samping kompor rumah Anda (putar tuas 90° tegak lurus selang).\n` +
              `2. Buka semua jendela dan pintu dapur selebar-lebarnya agar udara mengalir keluar.\n` +
              `3. JANGAN menyalakan kompor, korek api, atau menyentuh sakelar lampu listrik.\n` +
              `4. Segera keluar ruangan ke halaman terbuka.\n\n` +
              `Ingin kami kirimkan petugas piket (Bpk. Bambang Sutrisno / Bpk. Agus) ke rumah Anda sekarang?`,
        actionLabel: 'Buat Tiket Teknisi Darurat',
        actionType: 'create-emergency-ticket'
      };
    }

    // 3. Api Kompor Merah / Berasap / Kuning
    if (q.includes('merah') || q.includes('kuning') || q.includes('asap') || q.includes('jelaga') || q.includes('warna api')) {
      return {
        text: `Penyebab dan Solusi Api Kompor Kemerahan:\n\n` +
              `1. Setelan Cincin Udara (Air Shutter): Pada leher pembakar di bawah kompor, ada cincin logam. Kendurkan bautnya sedikit, putar celah hingga udara masuk lebih banyak dan api berubah jadi biru bersih.\n` +
              `2. Bersihkan Burner: Jika ada sisa minyak atau kerak sup yang mengering di lubang kuningan, bersihkan dengan jarum atau sikat kawat kecil saat kompor dingin.\n` +
              `3. Faktor Kelembaban Cuaca: Saat ini kelembaban udara Manggar ${weather.humidity}%. Uap air mikro di udara dapat memunculkan percik kemerahan sesaat, namun aman selama tidak menimbulkan jelaga hitam pada panci.`,
        actionLabel: 'Buka Panduan SOP Kompor',
        actionType: 'open-sop',
        sopId: 'sop-api-merah'
      };
    }

    // 4. Gas Mengecil / Mati saat Hujan / Kondensat / Water-blocking
    if (q.includes('hujan') || q.includes('kondensat') || q.includes('air') || q.includes('mati') || q.includes('kecil') || q.includes('lemah') || q.includes('macet')) {
      return {
        text: `Penjelasan Penurunan Tekanan / Aliran Lemah:\n\n` +
              `Saat suhu turun atau hujan, biogas mentah mengalami pengembunan di dalam pipa. Butiran air mengalir ke titik cekungan (Node-07 Cekungan Kondensat).\n\n` +
              `• Status Katup Kuras Node-07 saat ini: Siaga Normal.\n` +
              `• Petugas lapangan mengoperasikan katup kuras secara berkala setiap 3 jam.\n` +
              `Aliran biasanya pulih stabil dalam 5-10 menit setelah air terbuang ke bak penampung. Jika kompor tetap tidak menyala setelah 15 menit, silakan buat tiket pengecekan.`,
        actionLabel: 'Panggil Teknisi Kuras',
        actionType: 'create-ticket',
        defaultCategory: 'Pembersihan Water-Trap / Tekanan'
      };
    }

    // 5. Iuran / Tagihan / Biaya / Penghematan
    if (q.includes('iuran') || q.includes('biaya') || q.includes('bayar') || q.includes('tagihan') || q.includes('lpg') || q.includes('hemat') || q.includes('tarif')) {
      return {
        text: `Informasi Iuran Pemanfaatan Biogas WASTECO:\n\n` +
              `• Tarif Iuran Warga: ${formatRupiah(account.monthlyBilling)} / bulan.\n` +
              `• Status Pembayaran Akun ${account.id}: ${account.billingStatus} (${account.billingPeriod}).\n` +
              `• Alokasi: ${account.billingAllocation}.\n` +
              `• Estimasi Penghematan Anda: ${formatRupiah(account.monthlyLpgSavings)}/bulan (setara hemat ${account.lpgTubesEquivalent} tabung gas LPG 3 kg).\n\n` +
              `Iuran dikelola secara transparan oleh Koperasi Gotong Royong WASTECO untuk dana pemeliharaan pipa PVC, fitting, dan katup otomatis.`,
        actionLabel: 'Lihat Rincian Tagihan',
        actionTarget: 'tab-beranda'
      };
    }

    // 6. Kontak Petugas / Panggil Teknisi / Nomor HP
    if (q.includes('kontak') || q.includes('nomor') || q.includes('telepon') || q.includes('teknisi') || q.includes('panggil') || q.includes('petugas') || q.includes('bambang') || q.includes('agus') || q.includes('wa')) {
      return {
        text: `Kontak Petugas Lapangan Siaga Hari Ini:\n\n` +
              `1. Bpk. Bambang Sutrisno (Koordinator WASTECO RT 23): 0812-5489-2210\n` +
              `2. Bpk. Agus Priyanto (Teknisi Katup Jaringan DLH): 0821-4876-3391\n` +
              `3. Posko Induk UPTD TPAS Manggar: 0542-745812 (24 Jam)\n\n` +
              `Anda dapat langsung menghubungi nomor di atas via WhatsApp atau membuat tiket kunjungan langsung di bawah.`,
        actionLabel: 'Buat Tiket Kunjungan',
        actionType: 'open-helpdesk-form'
      };
    }

    // 7. Uji Air Sabun
    if (q.includes('sabun') || q.includes('uji') || q.includes('tes') || q.includes('periksa bocor')) {
      return {
        text: `Langkah Uji Kebocoran Menggunakan Busa Sabun:\n\n` +
              `1. Siapkan larutan sabun cuci piring berbusa kental.\n` +
              `2. Oleskan busa sabun pada sambungan drat kran gas, regulator meteran, dan klem selang kompor.\n` +
              `3. Amati selama 30 detik: jika busa sabun membentuk gelembung yang membesar dan meletup terus-menerus, berarti terjadi kebocoran.\n` +
              `4. Jika ditemukan gelembung, tutup kran segera dan laporkan ke teknisi kami.`,
        actionLabel: 'Buka SOP Air Sabun',
        actionType: 'open-sop',
        sopId: 'sop-sabun'
      };
    }

    // 8. Cuaca / Pengaruh Cuaca
    if (q.includes('cuaca') || q.includes('hujan') || q.includes('suhu') || q.includes('panas') || q.includes('lembab')) {
      return {
        text: `Informasi Cuaca Terkini di TPAS Manggar (${weather.lastUpdated}):\n\n` +
              `• Suhu Udara: ${weather.temp}°C (${weather.condition})\n` +
              `• Kelembapan Relatif: ${weather.humidity}%\n` +
              `• Titik Embun Pipa (Dew Point): ${weather.dewPoint}°C (${weather.dewPointStatus})\n` +
              `• Angin: ${weather.windSpeed} km/h ${weather.windDirection}\n\n` +
              `Kondisi cuaca saat ini tidak menimbulkan hambatan tekanan pada jaringan distribusi 8,3 km.`,
        actionLabel: 'Detail Telemetri Cuaca',
        actionType: 'open-weather-modal'
      };
    }

    // 9. Cek Node & Katup Motorik (Motorized Ball Valve) / Status Penutupan Pipa
    if (q.includes('node') || q.includes('katup') || q.includes('valve') || q.includes('tutup') || q.includes('gis') || q.includes('peta') || q.includes('mati')) {
      const closed = getClosedNodes();
      if (closed.length === 0) {
        return {
          text: `Status Katup Motorik Seluruh Jaringan (5 Node):\n\n` +
                `• Semua katup (Motorized Ball Valve SS304 NC) saat ini berstatus TERBUKA (Aliran Normal 100%).\n` +
                `• Tekanan pipa dari Stasiun Ekstraksi TPA hingga RT 22, RT 23, RT 24, dan UMKM stabil (4,2 kPa).\n` +
                `• Tidak ada pemadaman atau isolasi wilayah saat ini.\n\n` +
                `Anda dapat memantau posisi spasial seluruh 5 node pada Peta GIS aplikasi.`,
          actionLabel: 'Buka Peta Spasial GIS',
          actionTarget: 'tab-gis'
        };
      } else {
        const closedList = closed.map(c => `• ${c.code} (${c.name}): TERTUTUP\n  Alasan: ${c.reasonClosed || 'Pemeliharaan'}\n  Sektor Terdampak: ${c.affectedSectors}`).join('\n\n');
        return {
          text: `PERHATIAN: Ada ${closed.length} Katup Motorik yang sedang TERTUTUP:\n\n` +
                closedList + `\n\n` +
                `Warga di sektor terdampak diimbau tidak menyalakan kompor sampai petugas menyelesaikan pemeriksaan lapangan.`,
          actionLabel: 'Lihat Posisi di Peta GIS',
          actionTarget: 'tab-gis'
        };
      }
    }

    // 10. Default Fallback
    return {
      text: `Pesan Anda telah kami terima di sistem posko WASTECO. Untuk penanganan cepat seputar jaringan biogas rumah tangga ${account.id} (${account.customerName}), silakan pilih menu tindakan atau hubungi langsung nomor kontak petugas piket kami di (0542) 745812.`,
      actionLabel: 'Hubungi Petugas Lapangan',
      actionType: 'open-helpdesk-info'
    };
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
    WEATHER_DATA: WEATHER_DATA,
    HELP_STAFF: HELP_STAFF,
    SOP_GUIDES: SOP_GUIDES,
    NODES_GIS_DATA: NODES_GIS_DATA,
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
    formatRupiah: formatRupiah,
    getWeather: getWeather,
    getHelpStaff: getHelpStaff,
    getSopGuides: getSopGuides,
    getHelpTickets: getHelpTickets,
    addHelpTicket: addHelpTicket,
    answerChatQuery: answerChatQuery,
    getNodesGis: getNodesGis,
    setNodeValveState: setNodeValveState,
    getClosedNodes: getClosedNodes,
    getPipelineTopology: getPipelineTopology
  };

})(window.MBM);
