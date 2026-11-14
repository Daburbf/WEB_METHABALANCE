/**
 * METHABALANCE Mobile Admin - Data Management
 * Portal Operator & Manajemen Biogas WASTECO
 * UPTD TPAS Manggar × Dinas Lingkungan Hidup Kota Balikpapan
 */

window.MB_ADMIN = window.MB_ADMIN || {};

(function (MB_ADMIN) {
  'use strict';

  // Master KPI Metrics (Lovable Analytics Synchronized)
  const KPI_METRICS = {
    totalCustomers: 409,
    households: 380,
    umkm: 29,
    monthlyConsumption: 3416.4, // m³
    avgPerHousehold: 8.99, // m³
    monthlySavings: 44400000, // Rp / bulan
    annualSavings: 1065600000, // Rp / tahun
    monthlyRetribution: 4525000, // Rp / bulan (380 RT @Rp 10.000 + 29 UMKM @Rp 25.000)
    collectionRate: 98.2, // %
    methaneDestructionRate: 96.2, // %
    projectedRoiYears: 3.2,
    carbonReductionTon: 14825 // Ton CO2e
  };

  // Monthly Comparison: Pembakaran Bersih vs Flaring Terbuka (kg CO2eq)
  const MONTHLY_EMISSION = [
    { bulan: 'Jan', pembakaranBersih: 3200, flaringTerbuka: 1100 },
    { bulan: 'Feb', pembakaranBersih: 3450, flaringTerbuka: 1050 },
    { bulan: 'Mar', pembakaranBersih: 3900, flaringTerbuka: 980 },
    { bulan: 'Apr', pembakaranBersih: 4100, flaringTerbuka: 920 },
    { bulan: 'Mei', pembakaranBersih: 4350, flaringTerbuka: 850 },
    { bulan: 'Jun', pembakaranBersih: 4600, flaringTerbuka: 800 },
    { bulan: 'Jul', pembakaranBersih: 4800, flaringTerbuka: 750 },
    { bulan: 'Agt', pembakaranBersih: 5050, flaringTerbuka: 710 },
    { bulan: 'Sep', pembakaranBersih: 5200, flaringTerbuka: 680 },
    { bulan: 'Okt', pembakaranBersih: 5450, flaringTerbuka: 650 },
    { bulan: 'Nov', pembakaranBersih: 5600, flaringTerbuka: 620 }
  ];

  // Customer Registry (14 Representative Operational Records)
  const CUSTOMERS = [
    { id: 'MG-1001', name: 'Sunarto', type: 'Rumah Tangga', rt: 'RT 22', address: 'Jl. Mulawarman RT 22 No. 15', node: 'Node-05', meter: 18.0, tariff: 10000, savings: 34000, battery: 96, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1002', name: 'Siti Aminah', type: 'Rumah Tangga', rt: 'RT 23', address: 'Gang TPA Manggar RT 23 No. 14', node: 'Node-06', meter: 19.7, tariff: 10000, savings: 80000, battery: 94, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1003', name: 'Bambang Wijaya', type: 'Rumah Tangga', rt: 'RT 24', address: 'Jl. Mulawarman RT 24 No. 08', node: 'Node-07', meter: 21.4, tariff: 10000, savings: 37000, battery: 92, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1004', name: 'Rukmini', type: 'Rumah Tangga', rt: 'RT 21', address: 'RT 21 No. 22', node: 'Node-04', meter: 23.1, tariff: 10000, savings: 38500, battery: 90, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1005', name: 'Hasanuddin', type: 'Rumah Tangga', rt: 'RT 22', address: 'RT 22 No. 03', node: 'Node-05', meter: 24.8, tariff: 10000, savings: 40000, battery: 88, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1006', name: 'Ni Wayan Sari', type: 'Rumah Tangga', rt: 'RT 23', address: 'RT 23 No. 31', node: 'Node-06', meter: 26.5, tariff: 10000, savings: 41500, battery: 86, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1007', name: 'Agus Salim', type: 'Rumah Tangga', rt: 'RT 24', address: 'RT 24 No. 19', node: 'Node-07', meter: 28.2, tariff: 10000, savings: 43000, battery: 84, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1008', name: 'Tri Handayani', type: 'Rumah Tangga', rt: 'RT 21', address: 'RT 21 No. 05', node: 'Node-04', meter: 29.9, tariff: 10000, savings: 44500, battery: 82, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1009', name: 'M. Yusuf', type: 'Rumah Tangga', rt: 'RT 22', address: 'RT 22 No. 42', node: 'Node-05', meter: 31.6, tariff: 10000, savings: 46000, battery: 80, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1010', name: 'Dewi Lestari', type: 'Rumah Tangga', rt: 'RT 23', address: 'RT 23 No. 11', node: 'Node-06', meter: 33.3, tariff: 10000, savings: 47500, battery: 78, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1011', name: 'Hendro Siswanto', type: 'Rumah Tangga', rt: 'RT 24', address: 'RT 24 No. 27', node: 'Node-07', meter: 35.0, tariff: 10000, savings: 49000, battery: 76, status: 'Lunas', valve: 'Normal' },
    { id: 'MG-1012', name: 'Fatimah Az-Zahra', type: 'Rumah Tangga', rt: 'RT 21', address: 'RT 21 No. 16', node: 'Node-04', meter: 36.7, tariff: 10000, savings: 50500, battery: 74, status: 'Lunas', valve: 'Normal' },
    { id: 'UMKM-001', name: 'Sentra Tahu & Tempe Manggar', type: 'Pelaku Usaha', rt: 'RT 22', address: 'Sentra Industri RT 22', node: 'Node-11', meter: 94.2, tariff: 25000, savings: 420000, battery: 98, status: 'Lunas', valve: 'Normal' },
    { id: 'UMKM-002', name: 'Dapur Keripik Singkong Barokah', type: 'Pelaku Usaha', rt: 'RT 23', address: 'Gang TPA RT 23 No. 02', node: 'Node-11', meter: 68.5, tariff: 25000, savings: 310000, battery: 95, status: 'Lunas', valve: 'Normal' }
  ];

  
  // Pipeline Topology (8,3 km DLH Balikpapan)
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


  // SCADA Network Pipeline Nodes (5 Nodes with Real Coordinates & Actuators)
  const SCADA_NODES = [
    {
      id: 'Node-01',
      code: 'MB-HU-01',
      name: 'Stasiun Hulu Flare & Blower TPA',
      type: 'upstream',
      zone: 'Zona Ekstraksi TPA',
      pressure: 4.8,
      flow: 124.5,
      ch4: 58.2,
      o2: 0.2,
      h2s: 12,
      lat: -1.211254,
      lng: 116.93679,
      elevation: 42,
      valve: 'OPEN',
      motorized: true,
      valveModel: 'Motorized Ball Valve SS304 NC 3 Inci',
      status: 'OK'
    },
    {
      id: 'Node-02',
      code: 'MB-HD-01',
      name: 'Header Transmisi Gang Swadaya RT 22',
      type: 'transmission',
      zone: 'Zona 1 (Gang Swadaya RT 22)',
      pressure: 4.5,
      flow: 32.1,
      ch4: 57.4,
      o2: 0.2,
      h2s: 14,
      lat: -1.20846,
      lng: 116.94052,
      elevation: 38,
      valve: 'OPEN',
      motorized: true,
      valveModel: 'Motorized Ball Valve SS304 NC',
      status: 'OK'
    },
    {
      id: 'Node-03',
      code: 'MB-HD-02',
      name: 'Katup Distribusi Poros RT 23',
      type: 'branch',
      zone: 'Zona 2 (Poros RT 23 Manggar)',
      pressure: 0.0,
      flow: 0.0,
      ch4: 0.0,
      o2: 0.3,
      h2s: 16,
      lat: -1.21039,
      lng: 116.94352,
      elevation: 35,
      valve: 'CLOSED',
      motorized: true,
      valveModel: 'Motorized Ball Valve SS304 NC (Fail-Safe)',
      status: 'ISOLATED'
    },
    {
      id: 'Node-04',
      code: 'MB-HD-03',
      name: 'Katup Distribusi Gang Padaidi RT 24',
      type: 'commercial',
      zone: 'Zona 3 (Gang Padaidi Timur)',
      pressure: 0.0,
      flow: 0.0,
      ch4: 0.0,
      o2: 0.3,
      h2s: 15,
      lat: -1.20927,
      lng: 116.94208,
      elevation: 29,
      valve: 'CLOSED',
      motorized: true,
      valveModel: 'Motorized Ball Valve SS304 NC',
      status: 'ISOLATED'
    },
    {
      id: 'Node-05',
      code: 'MB-HD-04',
      name: 'Ujung Jalur Hilir Kluster Selatan RT 25',
      type: 'downstream',
      zone: 'Zona 4 (Kluster Selatan TPA RT 25)',
      pressure: 4.1,
      flow: 26.5,
      ch4: 55.9,
      o2: 0.4,
      h2s: 17,
      lat: -1.21042,
      lng: 116.94319,
      elevation: 28,
      valve: 'OPEN',
      motorized: true,
      valveModel: 'Motorized Ball Valve SS304 NC',
      status: 'OK'
    }
  ];


  // Citizen Incident Tickets (Field Reports)
  const TICKETS = [
    {
      id: 'TKT-MGR-2026-089',
      customerName: 'Ibu Siti Aminah',
      customerId: 'SR-0142',
      category: 'Tekanan Gas Melemah (Water-Blocking)',
      location: 'Jl. Mulawarman Gang TPA Manggar RT 23 No. 14',
      coordinates: '-1.2152° S, 116.9304° E',
      node: 'Node-06',
      time: '13 Nov 2026 • 09:15 WITA',
      status: 'In Progress',
      assignedTo: 'Budi Santoso (Teknisi RT 23)',
      notes: 'Teknisi ditugaskan untuk melakukan pembilasan siphon water-trap di Node-09.'
    },
    {
      id: 'TKT-MGR-2026-088',
      customerName: 'Sunarto',
      customerId: 'SR-0101',
      category: 'Nyala Api Kompor Merah',
      location: 'RT 22 / RW 04 No. 15',
      coordinates: '-1.2140° S, 116.9315° E',
      node: 'Node-05',
      time: '12 Nov 2026 • 16:40 WITA',
      status: 'Resolved',
      assignedTo: 'Agus Pratama (Teknisi RT 22)',
      notes: 'Pembersihan nozzle burner kompor warga selesai, nyala api biru optimal kembali.'
    },
    {
      id: 'TKT-MGR-2026-085',
      customerName: 'Dapur Keripik Barokah',
      customerId: 'UMKM-002',
      category: 'Pengecekan Rutin Sambungan UMKM',
      location: 'Gang TPA RT 23 No. 02',
      coordinates: '-1.2158° S, 116.9310° E',
      node: 'Node-11',
      time: '11 Nov 2026 • 11:20 WITA',
      status: 'Resolved',
      assignedTo: 'Dani Ramadhan (Teknisi Hulu)',
      notes: 'Kalibrasi manometer jarum dan uji kedap katup ball valve SS304 normal.'
    }
  ];

  // Format Helpers
  function formatRupiah(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  }

  function formatNumber(num, decimals = 1) {
    return Number(num).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // Public Interface
  MB_ADMIN.data = {
    getKpi: () => KPI_METRICS,
    getMonthlyEmission: () => MONTHLY_EMISSION,
    getCustomers: () => CUSTOMERS,
    getScadaNodes: () => SCADA_NODES,
    getTickets: () => TICKETS,
    getPipelineTopology: getPipelineTopology,
    formatRupiah,
    formatNumber
  };

})(window.MB_ADMIN);
