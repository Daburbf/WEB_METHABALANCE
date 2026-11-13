/* ==========================================================================
   METHABALANCE — Production Domain & Operational Data Store
   Lokasi: UPTD TPAS Manggar, Balikpapan Timur (-1.2135° S, 116.9328° E)
   Sistem SCADA & SDSS Distribusi Biogas Terintegrasi Hulu–Hilir
   UPTD TPAS Manggar × DLH Kota Balikpapan × Koperasi WASTECO
   ========================================================================== */
(function () {
  'use strict';

  var SITE = {
    name: 'TPAS Manggar · Balikpapan Timur',
    lat: -1.2135,
    lon: 116.9328,
    wgs: '1°12′48,6″ S  116°55′58,1″ E',
    elev: 48.5,
    areaHa: 40.0,
    activeZoneHa: 3.25,
    remainingYears: 3.0,
    dailyWasteTon: 467.86,
    householdWasteTon: 328.91,
    organicPct: 48.56,
    foodWasteTon: 176.21,
    twigsWasteTon: 48.02,
    lfgAnnualM3: 820800,
    carbonAnnualTonCO2eq: 100651.70,
    dailyCarbonKgCO2eq: 275.8,
    gwpCH4: 28,
    pipelineLengthKm: 8.3,
    pipelineSpec: 'PVC 3 Inci Class AW (SNI 06-0084-2002)',
    flangeSpec: 'PVC Slip-on Socket Flange & SS316L Bolts',
    beneficiariesSR: 380,
    beneficiariesJiwa: 1520,
    beneficiariesUMKM: 29,
    annualSavingsRp: 456000000,
    dailySavingsRp: 1480000,
    monthlySavingsPerKK: 80000,
    lossesSecuredAnnualRp: 91000000,
    leakPracticalThresholdPct: 2.62,
    failSafeTimeSec: 3.8,
    failSafeLimitSec: 5.0,
    mPerDegLat: 110574,
    mPerDegLon: 111296
  };

  /* ----------------------------------------------------------------------
     Analytic Heightfield Terrain (TPAS Manggar Topography)
     ---------------------------------------------------------------------- */
  var dip = { x: 980, z: -510, depth: 4.6 };

  function gauss(x, z, cx, cz, rx, rz) {
    var dx = (x - cx) / rx, dz = (z - cz) / rz;
    return Math.exp(-(dx * dx + dz * dz));
  }

  function terrainHeight(x, z) {
    var h = 20 + z * 0.009 - x * 0.002;
    h += 30 * gauss(x, z, -340, 430, 560, 430);   // Plataran Sanitary Landfill
    h -= 6 * gauss(x, z, 320, -650, 900, 800);    // Cekungan Permukiman Manggar
    h += 24 * gauss(x, z, -1500, 600, 480, 700);  // Punggung Bukit Barat
    h += 12 * gauss(x, z, 1950, 450, 450, 620);   // Punggung Bukit Timur
    h += 2.2 * Math.sin(x / 150) * Math.cos(z / 190);
    h += 1.1 * Math.sin((x + z) / 85);
    h -= dip.depth * gauss(x, z, dip.x, dip.z, 95, 95);
    return h;
  }

  /* ----------------------------------------------------------------------
     Pipeline Geometri (8,3 km calibrated trunk & 3 zones)
     ---------------------------------------------------------------------- */
  function serpentine(x0, x1, z0, lanes, gap) {
    var pts = [[x0, z0]];
    for (var i = 0; i < lanes; i++) {
      var z = z0 - i * gap;
      var xe = (i % 2 === 0) ? x1 : x0;
      pts.push([xe, z]);
      if (i < lanes - 1) pts.push([xe, z - gap]);
    }
    return pts;
  }

  function makeRoute(points) {
    var pts = points.map(function (p) { return { x: p[0], z: p[1], d: 0 }; });
    var total = 0;
    for (var i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      pts[i].d = total;
    }
    function at(d) {
      d = Math.max(0, Math.min(total, d));
      var i = 1;
      while (i < pts.length && pts[i].d < d) i++;
      var a = pts[i - 1];
      var b = pts[Math.min(i, pts.length - 1)];
      var span = (b.d - a.d) || 1;
      var t = (d - a.d) / span;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    return { pts: pts, total: total, at: at };
  }

  var TRUNK = makeRoute([
    [-80, 300], [-100, 200], [-40, 100], [60, 30], [160, -50], [240, -140]
  ]);

  var A_SPUR = [[240, -140], [90, -190], [-60, -250], [-220, -290], [-340, -310]];
  var A_LANES = serpentine(-340, -905, -310, 3, 190);
  var A = makeRoute(A_SPUR.concat(A_LANES.slice(1)));

  var B_SPUR = [[240, -140], [400, -200], [560, -245], [720, -290]];
  var B_LANES = serpentine(720, 1170, -290, 3, 210);
  var B = makeRoute(B_SPUR.concat(B_LANES.slice(1)));

  var C_SPUR = [[240, -140], [300, -330], [360, -520], [420, -680]];
  var C_LANES = serpentine(420, -160, -680, 3, 225);
  var C = makeRoute(C_SPUR.concat(C_LANES.slice(1)));

  var ROUTES = { trunk: TRUNK, a: A, b: B, c: C };
  var NETWORK_LENGTH = TRUNK.total + A.total + B.total + C.total;

  /* ----------------------------------------------------------------------
     15 Nodes Telemetry Specs & Geo Locations
     ---------------------------------------------------------------------- */
  var RAW_NODES = [
    { id: 'N01', route: 'trunk', d: 0, name: 'Wellhead Hulu Utama', area: 'Zona 7 · Aktif', kind: 'master', role: 'Master Hulu LFG', install: 'Kepala Sumur Ekstraksi LFG-07' },
    { id: 'N02', route: 'trunk', d: 240, name: 'Knock-out Drum Outlet', area: 'Gerbang Landfill', kind: 'edge', role: 'Kondensat & Flare', install: 'Separator Uap Knock-out Drum' },
    { id: 'N03', route: 'trunk', d: 470, name: 'Gate Valve Zona 6/7', area: 'Batas Utara', kind: 'edge', role: 'Batas Zona Hulu', install: 'Header Utama SS304 Gate Valve 3"' },
    { id: 'N04', route: 'trunk', d: 'end', name: 'Manifold Distribusi Pusat', area: 'Header Cabang A/B/C', kind: 'edge', role: 'Manifold Pembagi', install: 'Header Distribusi Flange 3-Arah' },
    { id: 'N05', route: 'b', d: 560, name: 'Inlet Cabang B RT 21', area: 'Jl. Manggar Mulia', kind: 'edge', role: 'Batas Sektor B', install: 'Awal Pipa Distribusi Cabang B' },
    { id: 'N06', route: 'b', d: 900, name: 'Transmisi Cabang B RT 23', area: 'Sektor RT 23 Manggar', kind: 'edge', role: 'Distribusi RT 23', install: 'Batas Segmen Katup NC RT 23' },
    { id: 'N07', route: 'b', d: 1200, name: 'Low-Point Condensate Trap', area: 'Cekungan Elevasi B', kind: 'trap', role: 'Water Trap Rendah', install: 'Cekungan Pipa & Siphon Trap' },
    { id: 'N08', route: 'b', d: 'end', name: 'Terminus Cabang B RT 24', area: 'RT 24 Manggar Timur', kind: 'edge', role: 'Ujung Hilir B', install: 'Meter Ujung Hilir Cabang B' },
    { id: 'N09', route: 'a', d: 480, name: 'Inlet Cabang A Sepinggan', area: 'Jl. Sepinggan Baru', kind: 'edge', role: 'Batas Sektor A', install: 'Awal Pipa Distribusi Cabang A' },
    { id: 'N10', route: 'a', d: 1500, name: 'Klaster Sentra UMKM', area: 'Sentra Olahan Pangan', kind: 'edge', role: 'Segmen 29 UMKM', install: 'Header Distribusi UMKM Manggar' },
    { id: 'N11', route: 'a', d: 'end', name: 'Terminus Cabang A RT 12', area: 'RT 12 Manggar', kind: 'edge', role: 'Ujung Hilir A', install: 'Meter Ujung Hilir Cabang A' },
    { id: 'N12', route: 'c', d: 500, name: 'Inlet Cabang C Manggar', area: 'Jl. Poros Balikpapan', kind: 'edge', role: 'Batas Sektor C', install: 'Awal Pipa Distribusi Cabang C' },
    { id: 'N13', route: 'c', d: 1400, name: 'Transmisi Cabang C RT 09', area: 'Sektor RT 09', kind: 'edge', role: 'Distribusi RT 09', install: 'Segmen Distribusi RT 09' },
    { id: 'N14', route: 'c', d: 'end', name: 'Terminus Cabang C Zona 2', area: 'Zona Pemukiman 2', kind: 'edge', role: 'Ujung Hilir C', install: 'Meter Ujung Hilir Cabang C' },
    { id: 'N15', route: null, at: [520, -760], name: 'Master Gateway Desa & RTU', area: 'Pos Komando TPAS', kind: 'gateway', role: 'LoRaWAN Concentrator', install: 'Gateway LoRaWAN AS923 + Totalizer' }
  ];

  var NODES = RAW_NODES.map(function (n) {
    var x, z;
    if (n.route) {
      var route = ROUTES[n.route];
      var d = n.d === 'end' ? route.total : n.d;
      var p = route.at(d);
      x = p.x; z = p.z; n.dist = d;
    } else {
      x = n.at[0]; z = n.at[1]; n.dist = 0;
    }
    // Konversi koordinat ENU ke perkiraan WGS84
    var lat = SITE.lat + (z / SITE.mPerDegLat);
    var lon = SITE.lon + (x / SITE.mPerDegLon);
    return Object.assign({}, n, {
      x: x, z: z,
      lat: lat,
      lon: lon,
      wgsStr: lat.toFixed(5) + '° S, ' + lon.toFixed(5) + '° E'
    });
  });

  dip.x = NODES[6].x;
  dip.z = NODES[6].z;

  var BASE_TELEMETRY = {
    N01: { p: 4.80, q: 1245.8, ch4: 58.4, h2s: 42.0, o2: 0.42, t: 38.2, rh: 88.0 },
    N02: { p: 4.62, q: 1243.1, ch4: 57.9, h2s: 40.2, o2: 0.51, t: 36.8, rh: 90.1 },
    N03: { p: 4.41, q: 1239.6, ch4: 57.5, h2s: 38.5, o2: 0.60, t: 35.1, rh: 89.2 },
    N04: { p: 4.22, q: 1228.7, ch4: 57.2, h2s: 36.1, o2: 0.72, t: 33.8, rh: 88.4 },
    N05: { p: 4.05, q: 411.9, ch4: 56.9, h2s: 34.0, o2: 0.81, t: 32.4, rh: 87.1 },
    N06: { p: 3.92, q: 410.2, ch4: 56.6, h2s: 33.2, o2: 0.88, t: 31.6, rh: 86.5 },
    N07: { p: 3.52, q: 380.6, ch4: 56.2, h2s: 31.4, o2: 1.02, t: 29.8, rh: 91.4 },
    N08: { p: 3.21, q: 351.9, ch4: 55.8, h2s: 30.1, o2: 1.12, t: 29.1, rh: 86.0 },
    N09: { p: 3.84, q: 452.6, ch4: 56.8, h2s: 33.5, o2: 0.90, t: 32.0, rh: 87.4 },
    N10: { p: 3.42, q: 401.8, ch4: 56.3, h2s: 32.1, o2: 1.04, t: 30.7, rh: 88.2 },
    N11: { p: 3.12, q: 361.4, ch4: 55.9, h2s: 30.4, o2: 1.18, t: 29.6, rh: 86.3 },
    N12: { p: 3.73, q: 365.9, ch4: 56.4, h2s: 32.3, o2: 0.98, t: 31.4, rh: 88.0 },
    N13: { p: 3.34, q: 312.7, ch4: 56.0, h2s: 31.0, o2: 1.09, t: 30.2, rh: 89.1 },
    N14: { p: 3.01, q: 274.8, ch4: 55.6, h2s: 29.2, o2: 1.28, t: 29.0, rh: 87.2 },
    N15: { p: 3.45, q: 1228.7, ch4: 55.9, h2s: 30.5, o2: 1.10, t: 30.1, rh: 88.0 }
  };

  NODES.forEach(function (n, i) {
    n.y = terrainHeight(n.x, n.z);
    n.base = BASE_TELEMETRY[n.id];
    n.valveState = 'open'; // 'open' | 'closed'
    n.hw = {
      cpu: 44.9,
      wear: 8.7,
      solar: 13.4,
      battHours: 72,
      firmware: 'v2.4.1-esp32s3-lora'
    };
  });

  /* ----------------------------------------------------------------------
     Zona Landfill TPAS Manggar (7 Sel)
     ---------------------------------------------------------------------- */
  function bevelRect(x0, z0, x1, z1, b) {
    return [
      [x0 + b, z0], [x1 - b, z0], [x1, z0 + b], [x1, z1 - b],
      [x1 - b, z1], [x0 + b, z1], [x0, z1 - b], [x0, z0 + b]
    ];
  }

  var ZONE_DEFS = [
    { id: 'Z1', name: 'Zona 1', x0: -800, z0: 520, x1: -560, z1: 760, cap: 28, status: 'closed', statusLabel: 'Tutup Permanen', gasRate: '12,4 m³/jam', note: 'Ekstraksi pasif mantap' },
    { id: 'Z2', name: 'Zona 2', x0: -540, z0: 520, x1: -300, z1: 760, cap: 26, status: 'closed', statusLabel: 'Tutup Permanen', gasRate: '14,1 m³/jam', note: 'Ekstraksi pasif mantap' },
    { id: 'Z3', name: 'Zona 3', x0: -800, z0: 260, x1: -560, z1: 500, cap: 24, status: 'closed', statusLabel: 'Tutup Permanen', gasRate: '16,8 m³/jam', note: 'Penutupan geomembran HDPE' },
    { id: 'Z4', name: 'Zona 4', x0: -540, z0: 260, x1: -300, z1: 500, cap: 22, status: 'closed', statusLabel: 'Tutup Permanen', gasRate: '18,5 m³/jam', note: 'Penutupan geomembran HDPE' },
    { id: 'Z5', name: 'Zona 5', x0: -800, z0: 0, x1: -560, z1: 240, cap: 20, status: 'closed', statusLabel: 'Tutup Permanen', gasRate: '21,2 m³/jam', note: 'Stabilisasi lapisan lekat tanah' },
    { id: 'Z6', name: 'Zona 6', x0: -260, z0: 480, x1: 40, z1: 780, cap: 18, status: 'filling', statusLabel: 'Terisi >90%', gasRate: '34,6 m³/jam', note: 'Menjelang batas penutupan akhir' },
    { id: 'Z7', name: 'Zona 7', x0: -260, z0: 160, x1: 80, z1: 440, cap: 9, status: 'active', statusLabel: 'Aktif Beroperasi', gasRate: '58,4 m³/jam', note: '3,25 Ha aktif · Sisa operasional 3 tahun' }
  ];

  var ZONES = ZONE_DEFS.map(function (z) {
    var cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
    return Object.assign({}, z, {
      poly: bevelRect(z.x0, z.z0, z.x1, z.z1, 22),
      cx: cx, cz: cz,
      base: terrainHeight(cx, cz) - 2
    });
  });

  /* ----------------------------------------------------------------------
     Jalan Akses & Grid Manggar
     ---------------------------------------------------------------------- */
  var ROADS = [];
  ROADS.push({
    kind: 'primary',
    pts: [[760, 1020], [430, 800], [140, 590], [-10, 380], [-60, 170], [40, -30], [220, -300], [430, -570], [640, -840], [880, -1140], [1120, -1400]]
  });
  ROADS.push({
    kind: 'haul',
    pts: [[-880, -110], [-900, 300], [-880, 820], [-500, 860], [100, 860], [220, 480], [220, 120], [60, -70], [-420, -130], [-880, -110]]
  });
  (function villageGrid() {
    var i, x, z;
    for (i = 0; i < 9; i++) {
      x = -900 + i * 245;
      var jx = Math.sin(i * 12.9898) * 26;
      ROADS.push({ kind: 'street', pts: [[x + jx, -1260], [x, -900], [x + jx, -560], [x - jx, -240], [x, -80]] });
    }
    for (i = 0; i < 7; i++) {
      z = -1240 + i * 190;
      var jz = Math.cos(i * 7.233) * 22;
      ROADS.push({ kind: 'street', pts: [[-960, z + jz], [-500, z], [0, z - jz], [500, z + jz], [1000, z], [1250, z + jz]] });
    }
  })();

  /* ----------------------------------------------------------------------
     Kondisi Operasional Jaringan (SCADA Operational State Machine)
     Pengendali State Mesin Produksi SCADA Terdistribusi
     ---------------------------------------------------------------------- */
  var OPERATIONAL_STATES = {
    normal: {
      key: 'normal',
      label: 'Operasional Normal · Seimbang',
      badge: 'NORMAL • SEIMBANG',
      tone: 'normal',
      description: 'Neraca massa stabil. 15/15 node aktif, deviasi neraca ΔQ 1,4% (di bawah batas praktis 2,62%). Seluruh katup terbuka.',
      metrics: {
        qHulu: 1245.8,
        qHilir: 1228.7,
        dq: 17.1,
        dqPct: 1.37,
        efficiencyPct: 98.6,
        activeNodes: 15,
        totalNodes: 15,
        dailySavings: 1480000,
        dailyCarbon: 275.8
      },
      valveStatus: 'TERBUKA • MENGALIR',
      valveClass: 'is-open',
      valveN06State: 'open',
      stoveStatus: 'AMAN & NORMAL',
      stoveTone: 'normal',
      stoveMessage: 'Pasokan biogas dari TPAS Manggar mengalir stabil dengan tekanan 3,92 kPa. Kompor siap digunakan secara aman.',
      ticketActive: false,
      overrides: {}
    },
    leak: {
      key: 'leak',
      label: 'Insiden Kebocoran Pipa N06 (Aktuator Aktif)',
      badge: 'ANOMALI KRITIS • TERISOLASI',
      tone: 'crit',
      description: 'Penurunan tekanan drastis pada Node-06 RT 23. Logika lokal ESP32-S3 berhasil menutup Motorized Ball Valve NC SS304 dalam 3,8 detik (< 5 detik). Aliran gas segmen terisolasi.',
      metrics: {
        qHulu: 1245.8,
        qHilir: 1198.7,
        dq: 47.1,
        dqPct: 3.78,
        efficiencyPct: 96.2,
        activeNodes: 14,
        totalNodes: 15,
        dailySavings: 1440000,
        dailyCarbon: 268.4
      },
      valveStatus: 'TERISOLASI • FAIL-SAFE AKTIF (3,8s)',
      valveClass: 'is-closed',
      valveN06State: 'closed',
      stoveStatus: 'PASOKAN DIMATIKAN SEMENTARA DARI PUSAT',
      stoveTone: 'crit',
      stoveMessage: 'PERINGATAN: Sistem METHABALANCE mendeteksi anomali tekanan pada segmen RT 23. Katup otomatis telah menutup demi keselamatan warga. Teknisi DLH sedang berada di lokasi.',
      ticketActive: true,
      ticket: {
        id: 'TCK-2026-MGR-089',
        priority: 'TINGGI (DARURAT)',
        node: 'N06 (RT 23 Manggar)',
        loc: 'Jl. Manggar Mulia RT 23, No. 44 (-1.2185° S, 116.9382° E)',
        distMeter: '38,4 m arah tenggara dari Node-06',
        anomalyScore: 0.892,
        dropRate: '-2,8 kPa/detik',
        pressureNow: '0,04 Bar / 0,40 kPa',
        action: 'Inspeksi flens pipa PVC 3" dan fitting SS316L. Penggantian gasket silikon.',
        status: 'DISPATCHED KE TEKNISI SEKTOR'
      },
      overrides: {
        N05: { p: 4.10, q: 411.9 },
        N06: { p: 0.40, q: 380.2, o2: 1.85 },
        N07: { p: 0.90, q: 350.6, rh: 92.4 }
      }
    },
    condensate: {
      key: 'condensate',
      label: 'Peringatan Dini Water-Blocking N07 (Kondensat Cekungan)',
      badge: 'PERINGATAN KONDENSAT • %RH 92%',
      tone: 'warn',
      description: 'Akumulasi uap air pada cekungan pipa Node-07 (Low-Point Water Trap). Kelembapan relatif >90%, regresi polinomial memprediksi water-blocking dalam 42 menit.',
      metrics: {
        qHulu: 1245.8,
        qHilir: 1215.2,
        dq: 30.6,
        dqPct: 2.46,
        efficiencyPct: 97.5,
        activeNodes: 15,
        totalNodes: 15,
        dailySavings: 1460000,
        dailyCarbon: 271.2
      },
      valveStatus: 'TERBUKA • TEKANAN FLUKTUATIF',
      valveClass: 'is-warn',
      valveN06State: 'open',
      stoveStatus: 'API KECIL • FLUKTUASI TEKANAN',
      stoveTone: 'warn',
      stoveMessage: 'Tekanan gas di wilayah cekungan Manggar sedikit fluktuatif akibat kondensasi uap air di water trap. Teknisi sedang menjadwalkan drainase siphon.',
      ticketActive: true,
      ticket: {
        id: 'TCK-2026-MGR-088',
        priority: 'SEDANG (PREVENTIF)',
        node: 'N07 (Cekungan Pipa B)',
        loc: 'Siphon Water Trap Cekungan B (-1.2201° S, 116.9405° E)',
        distMeter: '0 m (Langsung pada titik kuras water-trap)',
        anomalyScore: 0.634,
        dropRate: '-0,45 kPa/menit',
        pressureNow: '0,31 Bar / 3,10 kPa',
        action: 'Buka kran siphon kuras kondensat manual / purge water-trap N07.',
        status: 'MENUNGGU TINDAKAN TEKNISI'
      },
      overrides: {
        N06: { p: 4.15 },
        N07: { p: 3.10, q: 362.0, rh: 92.8, t: 28.5 },
        N08: { p: 2.75, q: 341.0 }
      }
    }
  };

  /* ----------------------------------------------------------------------
     Spesifikasi Arsitektur 8 Komponen Perangkat Keras CAD
     ---------------------------------------------------------------------- */
  var HARDWARE_COMPONENTS = [
    {
      id: 1,
      title: 'Panel Surya Monokristalin 40 Wp',
      subtitle: 'Catu Daya Mandiri Pembangkit Lokal',
      specs: 'Daya puncak 40 Wp, efisiensi sel 21,8%, bracket kemiringan 25° hadap utara, anti-debu & getaran.',
      material: 'Anodized Aluminum Frame + Tempered Glass 3.2mm',
      metric: 'Output 13,4V DC / 2,38A MPPT'
    },
    {
      id: 2,
      title: 'Enclosure Weatherproof IP65/IP67',
      subtitle: 'Pusat Kendali Mikro ESP32-S3 & LiFePO₄',
      specs: 'ESP32-S3 Dual-core Xtensa LX7 (44,9°C), LiFePO₄ 12,8V 20Ah (otonomi 72 jam), Smart MPPT 10A, LoRaWAN SX1262 AS923 + SIM7600E Fallback.',
      material: 'Industrial ABS Housing + Polycarbonate Clear Cover + Cable Glands PG9',
      metric: 'Otonomi 3 Hari Penuh tanpa Sinar'
    },
    {
      id: 3,
      title: 'Smart Motorized Ball Valve NC SS304',
      subtitle: 'Proteksi Fisik Lokal (Hardware Fail-Safe)',
      specs: 'Normally Closed (NC) 12V DC, aktuator gear logam industri, respons penutupan mandiri 3,8 detik (< 5 detik) saat tekanan drop drastis.',
      material: 'Stainless Steel SS304 Body & PTFE Valve Seat + Manual Override Red Lever',
      metric: 'Respons < 5 Detik (Tanpa Cloud)'
    },
    {
      id: 4,
      title: 'SS316L Pressure Transducer',
      subtitle: 'Sensor Tekanan Saluran Biogas Presisi Tinggi',
      specs: 'Rentang ukur 0–100 kPa (0–1 Bar), sinyal output standar industri 4–20 mA, akurasi ±0,25% FS, tahan korosi gas asam H₂S.',
      material: 'Diafragma Stainless Steel SS316L, Port 1/4" NPT Male',
      metric: 'Akurasi ±0,25% FS / 4–20 mA'
    },
    {
      id: 5,
      title: 'NDIR CH₄ Chamber + Elektrokimia H₂S & O₂',
      subtitle: 'Analisis Komposisi Gas Multi-Parameter',
      specs: 'NDIR CH₄ (0–100% Vol) dilengkapi internal anti-dewing heater & SS mesh filter; Sensor H₂S (0–100 ppm); Sensor O₂ (0–25% Vol batas aman LEL 5%).',
      material: 'Anodized Aluminum Flow-cell + Sintered Bronze Flame Arrestor',
      metric: 'NDIR Anti-Dewing + Dual Electrochemical'
    },
    {
      id: 6,
      title: 'Immersion Stainless Probe SHT30',
      subtitle: 'Sensor Suhu Aliran & Kelembapan Relatif (%RH)',
      specs: 'Suhu -20 s/d +80°C (±0,2°C), RH 0–100% (±2% RH). Mengkalkulasi titik embun (dew point) untuk deteksi dini water-blocking.',
      material: 'SS316 Sintered Cap, Immersion Tube 1/2" NPT',
      metric: 'Kalkulasi Dew Point Real-Time'
    },
    {
      id: 7,
      title: 'Pipa Utama Biogas PVC 3 Inci Class AW',
      subtitle: 'Jaringan Saluran Gas 8,3 km Standar SNI',
      specs: 'PVC 3 Inci Class AW standar SNI 06-0084-2002, tekanan kerja nominal hingga 10 kg/cm² ( jauh melampaui tekanan operasi 3–5 kPa).',
      material: 'Unplasticized Polyvinyl Chloride (uPVC) AW Grade',
      metric: 'Panjang 8,3 km / SNI 06-0084-2002'
    },
    {
      id: 8,
      title: 'PVC Slip-on Socket Flange & SS316L Baut',
      subtitle: 'Sambungan Anti-Bocor & Anti-Korosi',
      specs: 'Slip-on socket flange dengan paking lembaran EPDM gasket tahan asam, baut mur stainless SS316L anti-korosi lingkungan landfill.',
      material: 'Molded uPVC Flange ANSI Class 150 + Baut SS316L',
      metric: 'Zero-Seepage EPDM + SS316L Fasteners'
    }
  ];

  /* ----------------------------------------------------------------------
     Buku Besar Reduksi Emisi & Dekarbonisasi (Carbon Credit Ledger)
     ---------------------------------------------------------------------- */
  var CARBON_LEDGER = [
    { bulan: 'Oktober 2026', lfgM3: 69840, ch4Avg: 58.2, co2eTon: 8542.4, valutaRp: 38760000, compliance: 'UU 18/2008 & Perpres 109/2025' },
    { bulan: 'September 2026', lfgM3: 68120, ch4Avg: 57.8, co2eTon: 8310.1, valutaRp: 37920000, compliance: 'UU 18/2008 & Perpres 109/2025' },
    { bulan: 'Agustus 2026', lfgM3: 70410, ch4Avg: 58.5, co2eTon: 8632.7, valutaRp: 39180000, compliance: 'UU 18/2008 & Perpres 109/2025' },
    { bulan: 'Juli 2026', lfgM3: 69150, ch4Avg: 58.1, co2eTon: 8460.5, valutaRp: 38400000, compliance: 'UU 18/2008 & Perpres 109/2025' },
    { bulan: 'Juni 2026', lfgM3: 67900, ch4Avg: 57.6, co2eTon: 8274.0, valutaRp: 37650000, compliance: 'UU 18/2008 & Perpres 109/2025' }
  ];

  /* ----------------------------------------------------------------------
     Shared Global State Container
     ---------------------------------------------------------------------- */
  window.METHA_DATA = {
    site: SITE,
    terrainHeight: terrainHeight,
    routes: ROUTES,
    networkLength: NETWORK_LENGTH,
    nodes: NODES,
    baseTelemetry: BASE_TELEMETRY,
    zones: ZONES,
    roads: ROADS,
    operationalStates: OPERATIONAL_STATES,
    hardwareComponents: HARDWARE_COMPONENTS,
    carbonLedger: CARBON_LEDGER
  };

  window.METHA = {
    state: {
      opStateKey: 'normal',
      activeTab: 'overview',
      selectedNodeId: 'N01',
      mapMode: '3d', // '3d' | 'sat'
      portalRole: 'warga', // 'warga' | 'teknisi'
      cadIndex: 0,
      valveN06State: 'open',
      valveLog: [],
      auditLog: []
    },
    listeners: [],
    subscribe: function (fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    },
    set: function (patch) {
      Object.assign(this.state, patch);
      var current = this.state;
      this.listeners.forEach(function (fn) {
        try { fn(current); } catch (e) { console.error('State listener error', e); }
      });
    }
  };

})();
