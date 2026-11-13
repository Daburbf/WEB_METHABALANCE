/* Incident Management Module (Section 12.5)
   Status flow: Baru -> Ditinjau -> Ditugaskan -> Dalam Penanganan -> Menunggu Verifikasi -> Selesai
   Supports creating incidents from alarms, technician assignment, inspection logs, and resolution. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var INCIDENTS_KEY = 'mb.incidents.v3';

  var INCIDENT_STATUS = [
    'Baru',
    'Ditinjau',
    'Ditugaskan',
    'Dalam Penanganan',
    'Menunggu Verifikasi',
    'Selesai'
  ];

  var STATUS_CLASSES = {
    'Baru': 'st-crit',
    'Ditinjau': 'st-warn',
    'Ditugaskan': 'st-maint',
    'Dalam Penanganan': 'st-maint',
    'Menunggu Verifikasi': 'st-warn',
    'Selesai': 'st-ok'
  };

  var TECHNICIANS = [
    { id: 'T-01', name: 'Daniel Juan', role: 'Teknisi Jaringan Pipa' },
    { id: 'T-02', name: 'Budi Santoso', role: 'Teknisi Instrumen & IoT' },
    { id: 'T-03', name: 'Rian Pratama', role: 'Field Inspector' }
  ];

  function loadIncidents() {
    try {
      var raw = localStorage.getItem(INCIDENTS_KEY);
      if (!raw) return initDefaultIncidents();
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : initDefaultIncidents();
    } catch (e) {
      return initDefaultIncidents();
    }
  }

  function initDefaultIncidents() {
    var now = Date.now();
    var defaults = [
      {
        id: 'INC-2026-005',
        alarmId: 'pdr:MB-HD-03',
        scope: 'MB-HD-03',
        scopeType: 'node',
        zoneId: 'Z3',
        priority: 'critical',
        title: 'Penurunan Tekanan Mendadak & Potensi Kebocoran (MB-HD-03)',
        description: 'AI mendeteksi penurunan tekanan 32,4% dibanding baseline 60 menit terakhir disertai lonjakan selisih alir hilir (Losses 13,8%). Terindikasi kebocoran pada segmen distribusi sekunder Manggar Sari RT 31.',
        status: 'Dalam Penanganan',
        technician: 'Daniel Juan',
        assignedAt: now - 45 * 60000,
        createdAt: now - 55 * 60000,
        closedAt: null,
        logs: [
          {
            ts: now - 55 * 60000,
            author: 'AI SCADA Engine',
            text: 'Alarm kritis terpicu otomatis: Rapid Pressure Drop (-32.4%) pada node hilir MB-HD-03. Estimasi deviasi neraca aliran 11,8 Nm³/h.'
          },
          {
            ts: now - 50 * 60000,
            author: 'Operator Jaga DLH',
            text: 'Verifikasi pembacaan sensor valid. Disposisi penanganan darurat lapangan ke Koordinator Teknisi Pipa.'
          },
          {
            ts: now - 45 * 60000,
            author: 'Operator Jaga DLH',
            text: 'Tiket ditugaskan ke Daniel Juan untuk inspeksi fisik ke jalur pipa Manggar Sari RT 31.'
          },
          {
            ts: now - 20 * 60000,
            author: 'Daniel Juan',
            text: 'Tiba di lokasi MB-HD-03. Menggunakan portable gas detector CH₄ terdeteksi 180 ppm di dekat sambungan flange SR #14. Sedang dilakukan isolasi klem darurat dan pengetatan flange.'
          }
        ]
      },
      {
        id: 'INC-2026-004',
        alarmId: 'wbk:MB-HD-02',
        scope: 'MB-HD-02',
        scopeType: 'node',
        zoneId: 'Z2',
        priority: 'warning',
        title: 'Osilasi Siklis Tekanan & Risiko Penyumbatan Kondensat (Water-Blocking)',
        description: 'Pola fluktuasi osilasi tekanan berulang (CV 4,8%) terdeteksi disertai tren penurunan debit alir sebesar 22%. Konsisten dengan akumulasi cairan kondensat di cekungan pipa elevasi rendah RT 28.',
        status: 'Ditugaskan',
        technician: 'Budi Santoso',
        assignedAt: now - 90 * 60000,
        createdAt: now - 110 * 60000,
        closedAt: null,
        logs: [
          {
            ts: now - 110 * 60000,
            author: 'AI SCADA Engine',
            text: 'Algoritma water-block mendeteksi osilasi tekanan koefisien variasi CV = 4.8% dan penurunan debit gas secara bertahap.'
          },
          {
            ts: now - 90 * 60000,
            author: 'Operator Jaga DLH',
            text: 'Ditugaskan ke Budi Santoso untuk membawa perlengkapan pengurasan kondensat (manual purge valve) ke titik cekungan RT 28.'
          }
        ]
      },
      {
        id: 'INC-2026-003',
        alarmId: 'bal:ZU',
        scope: 'ZU',
        scopeType: 'zone',
        zoneId: 'ZU',
        priority: 'warning',
        title: 'Defisit Neraca Massa Sementara saat Purging Katup Manifold Hulu',
        description: 'Losses neraca aliran hulu-hilir naik menjadi 7,4% selama 40 menit akibat pengurasan jalur filter gas utama di stasiun ekstraksi TPAS Manggar.',
        status: 'Selesai',
        technician: 'Rian Pratama',
        assignedAt: now - 3600000 * 18,
        createdAt: now - 3600000 * 19,
        closedAt: now - 3600000 * 16,
        logs: [
          {
            ts: now - 3600000 * 19,
            author: 'AI SCADA Engine',
            text: 'Defisit neraca aliran transmisi melewati ambang 5% (terukur 7.4%).'
          },
          {
            ts: now - 3600000 * 18,
            author: 'Rian Pratama',
            text: 'Konfirmasi pemeliharaan berkala: sedang berlangsung proses blowing/purging pipa kondensat di stasiun ekstraksi.'
          },
          {
            ts: now - 3600000 * 16,
            author: 'Rian Pratama',
            text: 'Proses purging selesai dan katup bypass telah ditutup rapat. Neraca massa kembali seimbang pada toleransi normal 1.4% (Efisiensi 98.6%). Tiket ditutup.'
          }
        ]
      },
      {
        id: 'INC-2026-002',
        alarmId: 'bat:MB-HD-04',
        scope: 'MB-HD-04',
        scopeType: 'node',
        zoneId: 'Z4',
        priority: 'warning',
        title: 'Tegangan Baterai LiFePO4 Rendah di Node MB-HD-04',
        description: 'Tegangan catu daya cadangan surya turun ke 11,8V akibat tutupan debu pada modul solar cell 40 Wp pasca cuaca berangin di area zona hilir 4.',
        status: 'Selesai',
        technician: 'Budi Santoso',
        assignedAt: now - 3600000 * 42,
        createdAt: now - 3600000 * 44,
        closedAt: now - 3600000 * 40,
        logs: [
          {
            ts: now - 3600000 * 44,
            author: 'AI SCADA Engine',
            text: 'Alarm battery_low terpicu pada node MB-HD-04 (Vbat = 11.8 V di bawah ambang batas 12.0 V).'
          },
          {
            ts: now - 3600000 * 42,
            author: 'Budi Santoso',
            text: 'Inspeksi tiang sensor MB-HD-04. Membersihkan kaca panel surya dari lapisan debu dan mengencangkan konektor MC4.'
          },
          {
            ts: now - 3600000 * 40,
            author: 'Budi Santoso',
            text: 'Arus pengisian normal kembali 1.8A, tegangan baterai naik ke 13.2V (status charging penuh). Insiden diselesaikan.'
          }
        ]
      },
      {
        id: 'INC-2026-001',
        alarmId: 'ch4:MB-HU-01',
        scope: 'MB-HU-01',
        scopeType: 'node',
        zoneId: 'ZU',
        priority: 'warning',
        title: 'Fluktuasi Kualitas Metana (CH₄ < 52%) di Stasiun Ekstraksi TPAS',
        description: 'Kadar kemurnian metana sempat turun ke 51,2% vol pasca hujan deras akibat peningkatan kelembaban pada sumur lindi aktif zona landfill.',
        status: 'Selesai',
        technician: 'Daniel Juan',
        assignedAt: now - 3600000 * 68,
        createdAt: now - 3600000 * 70,
        closedAt: now - 3600000 * 64,
        logs: [
          {
            ts: now - 3600000 * 70,
            author: 'AI SCADA Engine',
            text: 'Konsentrasi gas metana CH₄ terukur 51.2% vol (di bawah ambang peringatan 52.0% vol).'
          },
          {
            ts: now - 3600000 * 68,
            author: 'Daniel Juan',
            text: 'Melakukan penyetelan suction valve blower dan pembuangan air kondensat tabung separator chiller.'
          },
          {
            ts: now - 3600000 * 64,
            author: 'Daniel Juan',
            text: 'Kadar CH₄ naik stabil ke 56,8% vol. Kualitas pembakaran flare dan pasokan aman. Tiket ditutup.'
          }
        ]
      }
    ];
    saveIncidents(defaults);
    return defaults;
  }

  function saveIncidents(list) {
    try {
      localStorage.setItem(INCIDENTS_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage quota exceeded */
    }
  }

  var incidents = loadIncidents();

  function createIncident(data) {
    var seq = incidents.length + 1;
    var id = 'INC-2026-' + (seq < 10 ? '00' : seq < 100 ? '0' : '') + seq;
    var inc = {
      id: id,
      alarmId: data.alarmId || null,
      scope: data.scope || '-',
      scopeType: data.scopeType || 'node',
      zoneId: data.zoneId || null,
      priority: data.priority || 'warning',
      title: data.title || 'Insiden Baru',
      description: data.description || '',
      status: 'Baru',
      technician: null,
      assignedAt: null,
      createdAt: Date.now(),
      closedAt: null,
      logs: [
        {
          ts: Date.now(),
          author: MB.config ? MB.config.role() : 'Operator',
          text: 'Insiden dicatat ke sistem.'
        }
      ]
    };
    incidents.unshift(inc);
    saveIncidents(incidents);
    if (MB.config) {
      MB.config.audit('Insiden Dibuat', id + ': ' + inc.title);
    }
    return inc;
  }

  function updateIncident(id, updates, logText) {
    var inc = incidents.find(function (i) { return i.id === id; });
    if (!inc) return null;

    if (updates.status && updates.status !== inc.status) {
      inc.status = updates.status;
      if (updates.status === 'Selesai') {
        inc.closedAt = Date.now();
      }
    }
    if (updates.technician !== undefined) {
      inc.technician = updates.technician;
      if (updates.technician && !inc.assignedAt) {
        inc.assignedAt = Date.now();
      }
    }
    if (updates.priority) inc.priority = updates.priority;
    if (updates.description) inc.description = updates.description;

    if (logText) {
      inc.logs.push({
        ts: Date.now(),
        author: MB.config ? MB.config.role() : 'Operator',
        text: logText
      });
    }

    saveIncidents(incidents);
    if (MB.config) {
      MB.config.audit('Insiden Diperbarui', id + ' status: ' + inc.status);
    }
    return inc;
  }

  function getIncidents() {
    return incidents;
  }

  function getIncident(id) {
    return incidents.find(function (i) { return i.id === id; }) || null;
  }

  MB.incidents = {
    STATUSES: INCIDENT_STATUS,
    STATUS_CLASSES: STATUS_CLASSES,
    TECHNICIANS: TECHNICIANS,
    list: getIncidents,
    get: getIncident,
    create: createIncident,
    update: updateIncident
  };
})(window.MB);
