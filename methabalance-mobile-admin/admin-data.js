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

  // SCADA Network Pipeline Nodes (15 Nodes)
  const SCADA_NODES = [
    { id: 'Node-01', name: 'Stasiun Hulu Flare & Blower TPA', type: 'upstream', pressure: 14.8, ch4: 58.2, o2: 0.2, h2s: 12, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-02', name: 'Manifold Distribusi Utama 3 Inch', type: 'transmission', pressure: 12.4, ch4: 57.9, o2: 0.2, h2s: 14, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-03', name: 'Water-Trap Sentral Zona 1', type: 'separator', pressure: 10.6, ch4: 57.5, o2: 0.3, h2s: 15, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-04', name: 'Cabang Distribusi RT 21', type: 'branch', pressure: 4.8, ch4: 57.1, o2: 0.3, h2s: 15, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-05', name: 'Cabang Distribusi RT 22', type: 'branch', pressure: 4.5, ch4: 56.8, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-06', name: 'Cabang B Distribusi RT 23', type: 'branch', pressure: 4.2, ch4: 56.4, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-07', name: 'Cabang Distribusi RT 24', type: 'branch', pressure: 4.1, ch4: 56.2, o2: 0.4, h2s: 16, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-08', name: 'Regulator Tekanan Menengah Selatan', type: 'regulator', pressure: 6.8, ch4: 56.5, o2: 0.3, h2s: 15, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-09', name: 'Water-Trap Sektor RT 23 Gang 4', type: 'separator', pressure: 4.2, ch4: 56.3, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-10', name: 'Booster Pompa Mikro Sub-Z', type: 'booster', pressure: 5.5, ch4: 56.4, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-11', name: 'Klaster C Jalur UMKM Sentra Tahu', type: 'commercial', pressure: 5.1, ch4: 56.5, o2: 0.3, h2s: 15, valve: 'OPEN', motorized: true, status: 'OK' },
    { id: 'Node-12', name: 'Sensata Pressure Transmitter Titik Barat', type: 'sensor', pressure: 4.3, ch4: 56.2, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-13', name: 'Katup Pengurasan Lumpur / Drain Hilir', type: 'drain', pressure: 3.9, ch4: 56.0, o2: 0.4, h2s: 17, valve: 'CLOSED', motorized: true, status: 'OK' },
    { id: 'Node-14', name: 'Header Pemantauan Emisi & Odorisasi', type: 'sensor', pressure: 4.0, ch4: 56.2, o2: 0.3, h2s: 16, valve: 'OPEN', motorized: false, status: 'OK' },
    { id: 'Node-15', name: 'Ujung Jalur Hilir Manggar Timur', type: 'downstream', pressure: 3.8, ch4: 55.9, o2: 0.4, h2s: 17, valve: 'OPEN', motorized: true, status: 'OK' }
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
    formatRupiah,
    formatNumber
  };

})(window.MB_ADMIN);
