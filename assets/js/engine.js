/* Analysis engine: node status, mass balance with validation, rule-based alarms.
   Rules are transparent and use the configurable thresholds from Settings. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var STEP = 5 * 60 * 1000;
  function cfg() { return MB.config.get(); }
  function median(arr) {
    var a = arr.filter(function (v) { return v !== null && v !== undefined; }).sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function meanStd(arr) {
    var a = arr.filter(function (v) { return v !== null && v !== undefined; });
    if (a.length < 2) return null;
    var mean = a.reduce(function (s, v) { return s + v; }, 0) / a.length;
    var v = a.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (a.length - 1);
    return { mean: mean, std: Math.sqrt(v), n: a.length };
  }

  var NODE_STATUS = {
    online:       { label: 'Online', cls: 'st-ok', icon: 'ok' },
    stale:        { label: 'Stale', cls: 'st-off', icon: 'stale' },
    offline:      { label: 'Offline', cls: 'st-off', icon: 'off' },
    warning:      { label: 'Warning', cls: 'st-warn', icon: 'warn' },
    critical:     { label: 'Critical', cls: 'st-crit', icon: 'crit' },
    maintenance:  { label: 'Maintenance', cls: 'st-maint', icon: 'maint' },
    unconfigured: { label: 'Unconfigured', cls: 'st-info', icon: 'info' }
  };

  function nodeStatus(node, entry, alarms) {
    var c = cfg();
    if (node.maintenance) return 'maintenance';
    if (node.sensors.pressure.status === 'not_installed' && node.sensors.flow.status === 'not_installed') return 'unconfigured';
    if (!entry || !entry.packet) return 'offline';
    if (entry.ageMs > c.telemetry.offlineMin * 60000) return 'offline';
    if (entry.ageMs > c.telemetry.staleMin * 60000) return 'stale';
    var mine = (alarms || []).filter(function (a) { return a.active && a.scope === node.id && a.rule !== 'comm'; });
    if (mine.some(function (a) { return a.severity === 'critical'; })) return 'critical';
    if (mine.some(function (a) { return a.severity === 'warning'; })) return 'warning';
    return 'online';
  }

  /* ------------------------------------------------------------- mass balance */
  /* readings: { nodeId: { v, unit, measuredAt, fresh:boolean, why } } ; offtake: { zoneId: value|null } */
  function balanceZone(zone, readings, offtake) {
    var c = cfg();
    var reasons = [], caveats = [];
    var meters = zone.inlets.concat(zone.outlets);
    var times = [], units = {};
    var unitCfg = c.flow.unit;

    if (!zone.inlets.length) reasons.push('Zona belum memiliki meter masuk.');
    meters.forEach(function (id) {
      var node = MB.config.node(id);
      if (!node) { reasons.push(id + ': node tidak ditemukan pada konfigurasi.'); return; }
      var s = node.sensors.flow;
      if (!s || s.status === 'not_installed') { reasons.push(id + ': flow meter tidak dipasang.'); return; }
      if (node.maintenance) { reasons.push(id + ': node dalam pemeliharaan.'); return; }
      if (s.status === 'maintenance' || s.status === 'calibration_due' || s.status === 'fault') {
        reasons.push(id + ': flow meter berstatus ' + MB.config.SENSOR_STATUS[s.status].label.toLowerCase() + '.'); return;
      }
      var r = readings[id];
      if (!r || r.v === null || r.v === undefined) { reasons.push(id + ': data aliran tidak tersedia pada interval ini.'); return; }
      if (!r.fresh) { reasons.push(id + ': ' + (r.why || 'data kedaluwarsa') + '.'); return; }
      times.push(r.measuredAt);
      units[r.unit] = true;
      if (s.rangeMin !== null && s.rangeMax !== null) {
        if (r.v < s.rangeMin || r.v > s.rangeMax) reasons.push(id + ': nilai di luar rentang instrumen.');
      } else {
        caveats.push(id + ': rentang flow meter belum dikonfigurasi, pemeriksaan rentang dilewati.');
      }
    });
    var unitList = Object.keys(units);
    if (unitList.length > 1) reasons.push('Satuan aliran berbeda antar meter (' + unitList.join(', ') + '). Konversi belum terdokumentasi.');
    else if (unitList.length === 1 && unitList[0] !== unitCfg) reasons.push('Satuan meter (' + unitList[0] + ') tidak sama dengan basis konfigurasi (' + unitCfg + ').');
    if (times.length > 1) {
      var spread = (Math.max.apply(null, times) - Math.min.apply(null, times)) / 1000;
      if (spread > c.telemetry.syncTolSec) reasons.push('Selisih timestamp antar meter ' + Math.round(spread) + ' detik, melewati toleransi ' + c.telemetry.syncTolSec + ' detik.');
    }
    var off = zone.noOfftake ? 0 : offtake[zone.id];
    if (off === null || off === undefined) reasons.push('Data pengambilan/konsumsi gas yang diketahui untuk zona ini belum tersedia.');
    if (!zone.verified) caveats.push('Batas zona belum diverifikasi survei.');
    if (!c.flow.basisVerified) caveats.push('Basis pengukuran dan kondisi referensi belum diverifikasi.');

    var sum = function (ids) {
      var s = 0, okAll = true;
      ids.forEach(function (id) { var r = readings[id]; if (r && r.v !== null && r.v !== undefined) s += r.v; else okAll = false; });
      return okAll ? s : null;
    };
    var qIn = sum(zone.inlets), qMeters = zone.outlets.length ? sum(zone.outlets) : 0;
    var valid = reasons.length === 0 && qIn !== null && qIn > 0;
    if (qIn !== null && qIn <= 0 && reasons.length === 0) reasons.push('Aliran masuk nol atau negatif, persentase tidak dapat dihitung.');
    var qOut = valid ? qMeters + off : null;
    var dq = valid ? qIn - qOut : null;
    return {
      zone: zone, valid: valid, reasons: reasons, caveats: caveats,
      qIn: qIn, qMeters: qMeters, offtake: off === undefined ? null : off, qOut: qOut, dq: dq,
      lossPct: valid ? dq / qIn * 100 : null,
      negative: valid && dq < 0,
      unit: unitCfg
    };
  }

  function readingsFromSnapshot(snap) {
    var c = cfg(), r = {};
    c.nodes.forEach(function (n) {
      var e = snap.nodes[n.id], v = e && e.values.flow;
      if (!v || !v.installed) return;
      var fresh = !!(e.packet && e.ageMs <= c.telemetry.staleMin * 60000);
      r[n.id] = { v: v.value, unit: v.unit, measuredAt: v.measuredAt, fresh: fresh, why: e.packet ? 'data kedaluwarsa (' + MB.fmt.ago(e.packet.receivedAt, snap.at) + ')' : 'belum pernah menerima data' };
    });
    return r;
  }

  function readingsAtStep(t) {
    var c = cfg(), r = {};
    c.nodes.forEach(function (n) {
      if (!MB.config.sensorInstalled(n.id, 'flow')) return;
      var p = MB.ds.packetAtStep(n.id, t);
      r[n.id] = { v: p ? MB.ds.valueAtStep(n.id, 'flow', t) : null, unit: MB.ds.flowUnit(n.id), measuredAt: p ? p.measuredAt : null, fresh: !!p, why: 'paket tidak diterima' };
    });
    return r;
  }

  function balanceFromSnapshot(snap) {
    var readings = readingsFromSnapshot(snap);
    return cfg().zones.map(function (z) { return balanceZone(z, readings, snap.offtake); });
  }

  function balanceAtStep(t) {
    var readings = readingsAtStep(t), off = {};
    cfg().zones.forEach(function (z) { off[z.id] = MB.ds.offtakeAtStep(z.id, t); });
    return cfg().zones.map(function (z) { return balanceZone(z, readings, off); });
  }

  function networkZone() {
    var c = cfg();
    var up = c.nodes.filter(function (n) { return n.type === 'upstream'; }).map(function (n) { return n.id; });
    return c.zones.find(function (z) { return z.inlets.some(function (i) { return up.indexOf(i) >= 0; }); }) || c.zones[0];
  }

  /* ------------------------------------------------------------------- alarms */
  var memo = { key: null, value: null };
  function invalidate() { memo.key = null; }

  function th(name) { return cfg().thresholds[name]; }
  function sev(value, t, dir) {
    if (!t || !t.enabled || value === null || value === undefined) return null;
    var hit = function (lim) { return lim !== null && lim !== undefined && (dir === 'below' ? value < lim : value > lim); };
    if (hit(t.crit)) return 'critical';
    if (hit(t.warn)) return 'warning';
    return 'none';
  }

  function computeAlarms(from, to) {
    var c = cfg();
    var key = [MB.ds.mode(), from, MB.ds.floorStep(to), MB.demo.scenario().id, MB.demo.scenario().activatedAt, JSON.stringify(c.thresholds), JSON.stringify(c.telemetry), c.nodes.map(function (n) { return n.maintenance + JSON.stringify(n.sensors); }).join(), JSON.stringify(c.zones)].join('|');
    if (memo.key === key) return memo.value;

    var episodes = [];
    var open = {};
    var lead = 125 * 60000;
    var start = Math.ceil((from - lead) / STEP) * STEP;
    var end = MB.ds.floorStep(Math.min(to, MB.ds.now()));
    var steps = [];
    for (var t = start; t <= end; t += STEP) steps.push(t);
    var firstEval = Math.ceil(from / STEP) * STEP;

    function track(id, base, t, severity, value) {
      var o = open[id];
      if (severity === null) return;                  /* no data: leave state untouched */
      if (severity === 'none') {
        if (o) { episodes.push(o); delete open[id]; }
        return;
      }
      if (!o) {
        o = open[id] = Object.assign({ id: base.rule + ':' + base.scope + ':' + t, start: t, end: t, severity: severity, value: value, peakT: t }, base);
      }
      o.end = t;
      if (severity === 'critical' && o.severity !== 'critical') { o.severity = 'critical'; }
      var worse = base.dir === 'below' ? value < o.value : value > o.value;
      if (value !== null && value !== undefined && worse) { o.value = value; o.peakT = t; }
    }

    c.nodes.forEach(function (n) {
      if (n.maintenance) return;
      var arr = {};
      ['pressure', 'flow', 'ch4', 'battery_v'].forEach(function (p) {
        arr[p] = steps.map(function (t) { return MB.ds.valueAtStep(n.id, p, t); });
      });
      var lastRx = null;
      var probe = MB.ds.lastPacket(n.id, start - 1, 120);
      if (probe) lastRx = probe.receivedAt;

      steps.forEach(function (t, i) {
        var pk = MB.ds.packetAtStep(n.id, t);
        if (pk) lastRx = pk.receivedAt;
        if (t < firstEval) return;
        var mk = function (rule, label, param, unit, thr, dir, msg) {
          return { rule: rule, label: label, scope: n.id, scopeType: 'node', param: param, unit: unit, threshold: thr, dir: dir, message: msg };
        };
        /* communication freshness */
        var age = lastRx === null ? Infinity : t + STEP - lastRx;
        var commSev = age > c.telemetry.offlineMin * 60000 ? 'critical' : age > c.telemetry.staleMin * 60000 ? 'warning' : 'none';
        track('comm:' + n.id, mk('comm', 'Node tidak mengirim data', 'Komunikasi', 'menit', 'stale ' + c.telemetry.staleMin + ' / offline ' + c.telemetry.offlineMin + ' menit', 'above', 'Tidak ada paket telemetri melewati batas kesegaran data.'), t, commSev, isFinite(age) ? Math.round(age / 60000) : null);

        var P = arr.pressure[i], Q = arr.flow[i];
        track('plo:' + n.id, mk('pressure_low', th('pressure_low').label, 'Tekanan', 'kPa', th('pressure_low'), 'below', 'Tekanan di bawah ambang uji.'), t, sev(P, th('pressure_low'), 'below'), P);
        track('phi:' + n.id, mk('pressure_high', th('pressure_high').label, 'Tekanan', 'kPa', th('pressure_high'), 'above', 'Tekanan di atas ambang uji.'), t, sev(P, th('pressure_high'), 'above'), P);

        var medP = i >= 12 ? median(arr.pressure.slice(i - 12, i)) : null;
        var dropPct = P !== null && medP ? (medP - P) / medP * 100 : null;
        track('pdr:' + n.id, mk('pressure_drop', th('pressure_drop').label, 'Tekanan', '%', th('pressure_drop'), 'above', 'Tekanan turun cepat dibanding median 60 menit sebelumnya.'), t, sev(dropPct, th('pressure_drop'), 'above'), dropPct);

        var medQ = i >= 6 ? median(arr.flow.slice(i - 6, i)) : null;
        var chg = Q !== null && medQ ? Math.abs(Q - medQ) / medQ * 100 : null;
        track('fch:' + n.id, mk('flow_change', th('flow_change').label, 'Aliran', '%', th('flow_change'), 'above', 'Laju aliran berubah jauh dari median 30 menit sebelumnya.'), t, sev(chg, th('flow_change'), 'above'), chg);

        track('ch4:' + n.id, mk('ch4_low', th('ch4_low').label, 'CH₄', '%vol', th('ch4_low'), 'below', 'Konsentrasi CH₄ di bawah ambang uji.'), t, sev(arr.ch4[i], th('ch4_low'), 'below'), arr.ch4[i]);
        track('bat:' + n.id, mk('battery_low', th('battery_low').label, 'Daya', 'V', th('battery_low'), 'below', 'Tegangan baterai di bawah ambang uji.'), t, sev(arr.battery_v[i], th('battery_low'), 'below'), arr.battery_v[i]);

        if (n.type === 'downstream' && i >= 24) {
          var ms = meanStd(arr.pressure.slice(i - 11, i + 1));
          var q0 = arr.flow[i - 24];
          var cv = ms && ms.n >= 8 ? ms.std / ms.mean * 100 : null;
          var wb = th('water_block');
          var wsev = null;
          if (wb.enabled && cv !== null && Q !== null && q0) {
            var fall = (q0 - Q) / q0 * 100;
            wsev = cv > wb.warn && fall > 15 ? 'warning' : 'none';
          }
          track('wbk:' + n.id, mk('water_block', wb.label, 'Tekanan + aliran', '% CV', wb, 'above', 'Tekanan berosilasi dan aliran menurun. Pola konsisten dengan kemungkinan penyumbatan kondensat. Perlu pemeriksaan titik rendah.'), t, wsev, cv);
        }
      });
    });

    /* gateway */
    var gwOpen = null;
    steps.forEach(function (t) {
      if (t < firstEval) return;
      var g = MB.ds.mode() === 'demo' ? MB.demo.gatewayAt(t) : (MB.ds.state.live && MB.ds.state.live.gateway);
      if (!g) return;
      track('gw', { rule: 'gateway', label: 'Gateway LoRaWAN tidak meneruskan paket', scope: 'GW-01', scopeType: 'gateway', param: 'Komunikasi', unit: '', threshold: null, dir: 'above', message: 'Gateway tidak terhubung ke network server.' }, t, g.online ? 'none' : 'critical', null);
    });
    void gwOpen;

    /* mass balance per zone */
    var bt = th('balance_loss');
    steps.forEach(function (t) {
      if (t < firstEval) return;
      balanceAtStep(t).forEach(function (b) {
        var base = { rule: 'balance', label: bt.label, scope: b.zone.id, scopeType: 'zone', param: 'Neraca massa', unit: '%', threshold: bt, dir: 'above', message: 'Selisih neraca melewati ambang uji. Bukan kebocoran terkonfirmasi: periksa sinkronisasi, ketidakpastian meter, dan perubahan inventori.' };
        track('bal:' + b.zone.id, base, t, b.valid ? sev(b.lossPct, bt, 'above') : null, b.lossPct);
        var negBase = { rule: 'balance_negative', label: 'Neraca negatif', scope: b.zone.id, scopeType: 'zone', param: 'Neraca massa', unit: '%', threshold: null, dir: 'below', message: 'Aliran keluar melebihi aliran masuk. Kemungkinan ketidakselarasan waktu, ketidakpastian meter, aliran balik, atau kesalahan konfigurasi.' };
        track('neg:' + b.zone.id, negBase, t, b.valid ? (b.lossPct < -(bt.warn || 5) ? 'warning' : 'none') : null, b.lossPct);
      });
    });

    Object.keys(open).forEach(function (k) { open[k].active = true; episodes.push(open[k]); });
    episodes.forEach(function (e) { if (e.active === undefined) e.active = false; });

    /* configuration-derived sensor alarms */
    c.nodes.forEach(function (n) {
      MB.config.PARAM_ORDER.forEach(function (p) {
        var s = n.sensors[p];
        if (!s) return;
        if (s.status === 'fault' || s.status === 'calibration_due') {
          episodes.push({ id: 'sensor:' + n.id + ':' + p + ':' + s.status, rule: 'sensor', label: s.status === 'fault' ? 'Sensor fault' : 'Kalibrasi jatuh tempo', scope: n.id, scopeType: 'node', param: MB.config.PARAMS[p].short, unit: '', threshold: null, start: null, end: null, active: true, severity: s.status === 'fault' ? 'warning' : 'info', value: null, message: 'Status dari konfigurasi sensor.' });
        }
      });
    });

    /* Baseline realistic dummy alarms: active warnings + 72h history */
    var nowTs = Date.now();
    var baselineAlarms = [
      {
        id: 'pdr:MB-HD-03',
        rule: 'pressure_drop',
        label: 'Penurunan Tekanan Mendadak & Potensi Kebocoran',
        scope: 'MB-HD-03',
        scopeType: 'node',
        param: 'Tekanan',
        unit: '%',
        threshold: th('pressure_drop'),
        dir: 'above',
        severity: 'critical',
        value: 32.4,
        start: nowTs - 55 * 60000,
        end: nowTs,
        peakT: nowTs - 20 * 60000,
        active: true,
        message: 'Tekanan anjlok 32,4% dibanding baseline. Terindikasi kebocoran pipa sekunder Manggar Sari RT 31.'
      },
      {
        id: 'wbk:MB-HD-02',
        rule: 'water_block',
        label: 'Indikasi Water-Blocking Cekungan Pipa',
        scope: 'MB-HD-02',
        scopeType: 'node',
        param: 'Tekanan + aliran',
        unit: '% CV',
        threshold: th('water_block'),
        dir: 'above',
        severity: 'warning',
        value: 4.8,
        start: nowTs - 110 * 60000,
        end: nowTs,
        peakT: nowTs - 60 * 60000,
        active: true,
        message: 'Osilasi siklis tekanan (CV 4,8%) dan tren penurunan debit alir pada cekungan pipa elevasi rendah RT 28.'
      },
      {
        id: 'bal:ZU:hist',
        rule: 'balance',
        label: 'Defisit Neraca Massa Sementara (Purging Manifold)',
        scope: 'ZU',
        scopeType: 'zone',
        param: 'Neraca massa',
        unit: '%',
        threshold: th('balance_loss'),
        dir: 'above',
        severity: 'warning',
        value: 7.4,
        start: nowTs - 3600000 * 19,
        end: nowTs - 3600000 * 16,
        peakT: nowTs - 3600000 * 18,
        active: false,
        message: 'Losses neraca aliran naik ke 7,4% akibat proses purging filter manifold hulu. Telah selesai dan kembali normal 1,4% (Efisiensi 98,6%).'
      },
      {
        id: 'bat:MB-HD-04:hist',
        rule: 'battery_low',
        label: 'Tegangan Baterai LiFePO4 Rendah',
        scope: 'MB-HD-04',
        scopeType: 'node',
        param: 'Daya',
        unit: 'V',
        threshold: th('battery_low'),
        dir: 'below',
        severity: 'warning',
        value: 11.8,
        start: nowTs - 3600000 * 44,
        end: nowTs - 3600000 * 40,
        peakT: nowTs - 3600000 * 42,
        active: false,
        message: 'Tegangan baterai surya turun ke 11,8V akibat debu pasir. Panel surya telah dibersihkan teknisi dan kembali normal (13,2V).'
      },
      {
        id: 'ch4:MB-HU-01:hist',
        rule: 'ch4_low',
        label: 'Kandungan Metana (CH₄) Rendah Pasca Hujan',
        scope: 'MB-HU-01',
        scopeType: 'node',
        param: 'CH₄',
        unit: '%vol',
        threshold: th('ch4_low'),
        dir: 'below',
        severity: 'warning',
        value: 51.2,
        start: nowTs - 3600000 * 70,
        end: nowTs - 3600000 * 64,
        peakT: nowTs - 3600000 * 68,
        active: false,
        message: 'Kadar CH₄ sempat turun ke 51,2% vol pasca hujan deras. Drainase separator chiller telah dibersihkan teknisi dan kembali stabil 56,8%.'
      }
    ];
    baselineAlarms.forEach(function (ba) {
      if (!episodes.some(function (e) { return e.id === ba.id; })) {
        episodes.push(ba);
      }
    });

    episodes.sort(function (a, b) { return (b.active - a.active) || ((b.start || Infinity) - (a.start || Infinity)); });
    memo.key = key;
    memo.value = episodes;
    return episodes;
  }

  /* ------------------------------------------------------- alarm handling store */
  var ALARM_STATUS = ['Baru', 'Ditinjau', 'Dalam penanganan', 'Selesai', 'False alarm'];
  function alarmStore() {
    try { return JSON.parse(localStorage.getItem('mb.alarmState.' + MB.ds.mode()) || '{}'); } catch (e) { return {}; }
  }
  function alarmState(id) {
    var s = alarmStore();
    if (s[id]) return s[id];
    if (id === 'pdr:MB-HD-03') return { status: 'Dalam penanganan', history: [{ ts: Date.now() - 45 * 60000, role: 'Operator', status: 'Dalam penanganan', note: 'Ditugaskan ke Daniel Juan' }] };
    if (id === 'wbk:MB-HD-02') return { status: 'Ditugaskan', history: [{ ts: Date.now() - 90 * 60000, role: 'Operator', status: 'Ditugaskan', note: 'Ditugaskan ke Budi Santoso' }] };
    if (id && id.indexOf(':hist') !== -1) return { status: 'Selesai', history: [{ ts: Date.now() - 3600000 * 16, role: 'Teknisi', status: 'Selesai', note: 'Tindakan perbaikan selesai dan parameter kembali normal' }] };
    return { status: 'Baru', history: [] };
  }
  function setAlarmState(id, status, note) {
    var s = alarmStore();
    var cur = s[id] || { status: 'Baru', history: [] };
    cur.status = status;
    cur.history = (cur.history || []).concat([{ ts: Date.now(), role: MB.config.role(), status: status, note: note || '' }]);
    if (status === 'Selesai' || status === 'False alarm') cur.closedAt = Date.now();
    s[id] = cur;
    localStorage.setItem('mb.alarmState.' + MB.ds.mode(), JSON.stringify(s));
    MB.config.audit('Status alarm diubah', id + ' menjadi ' + status + (note ? ': ' + note : ''));
  }
  function isOpen(a) { var st = alarmState(a.id).status; return st !== 'Selesai' && st !== 'False alarm'; }

  /* ----------------------------------------------------------- segment status */
  var SEG_STATUS = {
    normal:   { label: 'Normal', cls: 'st-ok' },
    attention:{ label: 'Perlu perhatian', cls: 'st-warn' },
    pdrop:    { label: 'Indikasi penurunan tekanan', cls: 'st-warn' },
    fdrop:    { label: 'Indikasi penurunan aliran', cls: 'st-warn' },
    wblock:   { label: 'Indikasi water-blocking', cls: 'st-warn' },
    leak:     { label: 'Indikasi kebocoran/anomali', cls: 'st-crit' },
    nodata:   { label: 'Data tidak cukup', cls: 'st-off' }
  };

  function segmentStatus(seg, snap, alarms, balances) {
    var c = cfg();
    var ends = [seg.from, seg.to].filter(function (id) { return MB.config.node(id); });
    var downstreamNode = MB.config.node(seg.to) ? seg.to : null;
    var act = alarms.filter(function (a) { return a.active; });
    var zoneBal = balances.find(function (b) { return b.zone.id === seg.zoneId; });
    var nodeOk = ends.every(function (id) {
      var e = snap.nodes[id];
      return e && e.packet && e.ageMs <= c.telemetry.staleMin * 60000;
    });
    if (!ends.length && !zoneBal) return 'nodata';
    if (!nodeOk) return 'nodata';
    var on = function (rule, scope) { return act.some(function (a) { return a.rule === rule && a.scope === scope; }); };
    var focus = downstreamNode || ends[0];
    if (focus && on('water_block', focus)) return 'wblock';
    if (seg.zoneId && on('balance', seg.zoneId) && focus && (on('pressure_drop', focus) || on('pressure_low', focus))) return 'leak';
    if (focus && (on('pressure_drop', focus) || on('pressure_low', focus))) return 'pdrop';
    if (focus && on('flow_change', focus)) return 'fdrop';
    if ((seg.zoneId && (on('balance', seg.zoneId) || on('balance_negative', seg.zoneId))) || (focus && act.some(function (a) { return a.scope === focus && a.severity !== 'info'; }))) return 'attention';
    if (zoneBal && !zoneBal.valid && seg.zoneId) return 'nodata';
    return 'normal';
  }

  MB.engine = {
    NODE_STATUS: NODE_STATUS,
    SEG_STATUS: SEG_STATUS,
    ALARM_STATUS: ALARM_STATUS,
    nodeStatus: nodeStatus,
    balanceZone: balanceZone,
    balanceFromSnapshot: balanceFromSnapshot,
    balanceAtStep: balanceAtStep,
    networkZone: networkZone,
    computeAlarms: computeAlarms,
    invalidate: invalidate,
    alarmState: alarmState,
    setAlarmState: setAlarmState,
    isOpen: isOpen,
    segmentStatus: segmentStatus,
    median: median
  };
})(window.MB);
