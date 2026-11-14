/* Demo dataset generator. Fully separate from live data: every value here is simulated.
   Values are a deterministic function of the timestamp, so history is stable between refreshes. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var STEP = 5 * 60 * 1000;
  var NODES = ['MB-HU-01', 'MB-HD-01', 'MB-HD-02', 'MB-HD-03', 'MB-HD-04'];
  var ZONES = ['ZU', 'Z1', 'Z2', 'Z3', 'Z4'];
  var SCN_KEY = 'mb.demo.scenario';

  var SCENARIOS = {
    normal:        { label: 'Normal', lead: 0, desc: 'Semua node mengirim data, pola konsumsi harian biasa.' },
    pressure_drop: { label: 'Pressure drop di MB-HD-03', lead: 40, desc: 'Tekanan MB-HD-03 turun sekitar 38% dan alirannya naik. Pola konsisten dengan kemungkinan kebocoran di Zona Hilir 3.' },
    water_block:   { label: 'Indikasi water-blocking di MB-HD-02', lead: 150, desc: 'Tekanan MB-HD-02 berosilasi dan aliran menurun bertahap selama 2 sampai 3 jam.' },
    node_offline:  { label: 'MB-HD-04 berhenti mengirim', lead: 45, desc: 'Paket terakhir MB-HD-04 diterima 45 menit sebelum skenario dipilih.' },
    comm_lost:     { label: 'Gateway terputus', lead: 25, desc: 'Gateway tidak meneruskan paket. Semua node menjadi stale lalu offline.' },
    low_battery:   { label: 'Baterai MB-HD-01 rendah', lead: 120, desc: 'Tegangan baterai MB-HD-01 turun bertahap di bawah ambang uji.' },
    unit_mismatch: { label: 'Satuan flow MB-HD-02 berbeda', lead: 0, desc: 'Meter MB-HD-02 melapor dalam m³/h aktual, bukan Nm³/h. Neraca harus ditandai tidak valid.' }
  };

  function hash(a, b, c) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((c | 0) + 13, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  /* smooth value noise in [-1, 1] */
  function smooth(t, b, c, period) {
    var x = t / period, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (hash(i, b, c) * (1 - u) + hash(i + 1, b, c) * u) * 2 - 1;
  }
  function jitter(t, b, c) { return hash(Math.floor(t / STEP), b, c + 101) * 2 - 1; }
  function hourW(t) { return MB.fmt.hourWITA(t); }
  function gauss(h, c, w) { return Math.exp(-((h - c) * (h - c)) / (2 * w * w)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ramp(t, start, mins) { return clamp((t - start) / (mins * 60000), 0, 1); }

  function scenarioState() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SCN_KEY) || 'null');
      if (s && SCENARIOS[s.id]) return s;
    } catch (e) { /* ignore malformed session value */ }
    return { id: 'normal', activatedAt: 0 };
  }
  var scn = scenarioState();
  function scnStart() { return scn.activatedAt - SCENARIOS[scn.id].lead * 60000; }
  function active(id, t) { return scn.id === id && t >= scnStart(); }

  function demand(t) {
    var h = hourW(t);
    var peaks = 0.9 * gauss(h, 6, 1.0) + 0.75 * gauss(h, 12, 0.9) + 1.0 * gauss(h, 18, 1.1);
    return 0.5 + 0.5 * Math.min(1, peaks) + 0.05 * smooth(t, 9, 1, 3600e3);
  }

  var cache = new Map();
  function base(t) {
    t = Math.floor(t / STEP) * STEP;
    var c = cache.get(t);
    if (c) return c;
    if (cache.size > 40000) cache.clear();

    var d = demand(t);
    var qH = 42 + 58 * d + 2 * jitter(t, 0, 1);
    var offU = qH * (0.12 + 0.01 * smooth(t, 0, 2, 7200e3));
    var lossU = qH * 0.015;
    var R = qH - offU - lossU;
    var sh = [0.31, 0.24, 0.27, 0.18].map(function (s, i) { return s * (1 + 0.04 * smooth(t, i + 1, 3, 5400e3)); });
    var sum = sh.reduce(function (a, b) { return a + b; }, 0);
    var qD = sh.map(function (s) { return R * s / sum; });
    var lossZ = [0.012, 0.02, 0.015, 0.01];
    var offZ = qD.map(function (q, i) { return q * (1 - lossZ[i]); });

    var P0 = 13.5 - 2.5 * d + 0.15 * jitter(t, 0, 4);
    var drops = [2.2, 3.1, 3.6, 4.4];
    var P = [P0].concat(drops.map(function (dr, i) { return P0 - dr * (0.6 + 0.8 * d) + 0.12 * jitter(t, i + 1, 4); }));

    /* scenario: pressure drop / possible leak in zone 3 */
    if (active('pressure_drop', t)) {
      var k = ramp(t, scnStart(), 10);
      P[3] *= 1 - 0.38 * k;
      P[4] *= 1 - 0.12 * k;
      var extra = qD[2] * 0.18 * k;
      qD[2] += extra;
      qH += extra;
    }
    /* scenario: condensate water-blocking near HD-02 */
    if (active('water_block', t)) {
      var w = ramp(t, scnStart(), 150);
      var osc = Math.sin((t - scnStart()) / (7 * 60000) * Math.PI * 2);
      P[2] = P[2] * (1 - 0.25 * w) + 1.2 * w * osc;
      var cut = qD[1] * 0.35 * w;
      qD[1] -= cut;
      offZ[1] = qD[1] * (1 - lossZ[1]);
      qH -= cut;
    }

    var amb = 27 + 4.5 * Math.sin((hourW(t) - 9) / 24 * Math.PI * 2) + 0.4 * smooth(t, 0, 5, 3600e3);
    var sun = Math.max(0, Math.sin((hourW(t) - 6) / 12 * Math.PI));
    var cloud = 0.6 + 0.4 * (smooth(t, 0, 6, 2400e3) * 0.5 + 0.5);

    c = {
      flow: [qH].concat(qD),
      pressure: P,
      offtake: { ZU: offU, Z1: offZ[0], Z2: offZ[1], Z3: offZ[2], Z4: offZ[3] },
      gas_temp: [34 + 1.2 * smooth(t, 0, 7, 5400e3)].concat([0, 1, 2, 3].map(function (i) { return amb + 2.5 + 0.8 * smooth(t, i + 1, 7, 5400e3); })),
      ch4: [52 + 1.6 * smooth(t, 0, 8, 10800e3)],
      o2: [null],
      h2s: [null],
      amb: amb,
      rh: clamp(88 - 2.6 * (amb - 27) + 3 * smooth(t, 0, 11, 3600e3), 55, 98),
      sun: sun * cloud
    };
    cache.set(t, c);
    return c;
  }

  function idx(nodeId) { return NODES.indexOf(nodeId); }

  /* Is a packet from this node available at step t? */
  function packetAt(nodeId, t) {
    t = Math.floor(t / STEP) * STEP;
    if (active('comm_lost', t)) return null;
    if (nodeId === 'MB-HD-04' && active('node_offline', t)) return null;
    var i = idx(nodeId);
    /* occasional single lost packet so charts show real gaps */
    if (hash(Math.floor(t / STEP), i, 77) < 0.006) return null;
    var measuredAt = t + Math.round(hash(Math.floor(t / STEP), i, 31) * 20000);
    return { measuredAt: measuredAt, receivedAt: measuredAt + 2000 + Math.round(hash(Math.floor(t / STEP), i, 32) * 6000) };
  }

  function valueAt(nodeId, param, t) {
    var i = idx(nodeId);
    if (i < 0 || !packetAt(nodeId, t)) return null;
    var b = base(t);
    switch (param) {
      case 'pressure': return b.pressure[i];
      case 'flow':
        if (nodeId === 'MB-HD-02' && scn.id === 'unit_mismatch') return b.flow[i] * 1.08;
        return b.flow[i];
      case 'gas_temp': return b.gas_temp[i];
      case 'ch4': return i === 0 ? b.ch4[0] : b.ch4[0] - 0.4 - 0.3 * i + 0.3 * smooth(t, i, 8, 7200e3);
      case 'o2': return null;
      case 'h2s': return null;
      case 'amb_temp': return b.amb + 0.3 * i;
      case 'humidity': return b.rh;
      case 'battery_v': {
        var v = 12.95 + 0.4 * b.sun + 0.03 * smooth(t, i, 12, 3600e3);
        if (nodeId === 'MB-HD-01' && active('low_battery', t)) v -= 1.55 * ramp(t, scnStart(), 120);
        return v;
      }
      case 'soc': return null;
      case 'solar_w': return 36 * b.sun * (0.92 + 0.08 * smooth(t, i, 13, 1800e3));
      default: return null;
    }
  }

  function offtakeAt(zoneId, t) {
    if (ZONES.indexOf(zoneId) < 0) return null;
    if (active('comm_lost', t)) return null;
    return base(t).offtake[zoneId];
  }

  function flowUnitOf(nodeId, cfgUnit) {
    if (nodeId === 'MB-HD-02' && scn.id === 'unit_mismatch') return 'm³/h';
    return cfgUnit;
  }

  function commAt(nodeId, t) {
    var i = idx(nodeId);
    if (!packetAt(nodeId, t)) return null;
    var rssi = [-79, -96, -104, -101, -112][i] + 3 * smooth(t, i, 20, 1800e3);
    var snr = [9.5, 4.0, -2.5, 1.0, -6.5][i] + 1.5 * smooth(t, i, 21, 1800e3);
    var sf = [7, 9, 10, 9, 11][i];
    return { rssi: rssi, snr: snr, sf: sf, gateway: 'GW-01' };
  }

  function gatewayAt(t) {
    if (active('comm_lost', t)) return { online: false, lastSeen: scnStart() };
    return { online: true, lastSeen: Math.floor(t / STEP) * STEP + 8000 };
  }

  MB.demo = {
    STEP: STEP,
    SCENARIOS: SCENARIOS,
    scenario: function () { return scn; },
    scenarioStart: scnStart,
    setScenario: function (id) {
      if (!SCENARIOS[id]) return;
      scn = { id: id, activatedAt: Date.now() };
      sessionStorage.setItem(SCN_KEY, JSON.stringify(scn));
      cache.clear();
    },
    packetAt: packetAt,
    valueAt: valueAt,
    offtakeAt: offtakeAt,
    flowUnitOf: flowUnitOf,
    commAt: commAt,
    gatewayAt: gatewayAt,
    firstTime: function () { return Date.now() - 31 * 24 * 3600e3; }
  };
})(window.MB);
