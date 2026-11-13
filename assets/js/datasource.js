/* Data source layer. Three modes, never mixed:
   - demo: simulated values from MB.demo (labelled MODE DEMO everywhere)
   - live: backend API (contract in docs/API.md)
   - historical: backend API for a chosen date range
   After refresh() resolves, every read below is synchronous. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var STEP = 5 * 60 * 1000;
  var MODE_KEY = 'mb.mode';
  var mode = localStorage.getItem(MODE_KEY);
  if (['demo', 'live', 'historical'].indexOf(mode) < 0) mode = 'demo';

  var state = {
    ready: false,
    loading: false,
    error: null,          /* { title, detail } */
    refreshedAt: null,
    histRange: null,      /* { from, to } for historical mode */
    live: null            /* cache filled from the backend */
  };

  function cfg() { return MB.config.get(); }
  function floorStep(t) { return Math.floor(t / STEP) * STEP; }
  function nowRef() {
    if (mode === 'historical' && state.histRange) return state.histRange.to;
    return Date.now();
  }

  /* ---------------------------------------------------------------- live adapter */
  function apiBase() { return (cfg().integration.apiBase || '/api/v1').replace(/\/$/, ''); }

  function fetchJson(path) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
    return fetch(apiBase() + path, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            var err = new Error(body.error || ('HTTP ' + res.status));
            err.status = res.status;
            err.path = path;
            throw err;
          });
        }
        return res.json();
      }, function (e) {
        clearTimeout(timer);
        var err = new Error(e.name === 'AbortError' ? 'Permintaan melewati batas waktu 10 detik' : 'Server tidak dapat dihubungi');
        err.status = 0;
        err.path = path;
        throw err;
      });
  }

  function toMs(v) { if (v === null || v === undefined) return null; var t = typeof v === 'number' ? v : Date.parse(v); return isFinite(t) ? t : null; }

  function loadLive(from, to) {
    var cache = { values: {}, packets: {}, offtakes: {}, units: {}, comm: {}, gateway: null, from: from, to: to };
    return fetchJson('/overview').then(function (ov) {
      (ov.nodes || []).forEach(function (n) {
        cache.comm[n.id] = n.comm || null;
        cache.packets[n.id] = new Map();
        cache.values[n.id] = {};
        if (n.last_packet) {
          var mt = toMs(n.last_packet.measured_at), rt = toMs(n.last_packet.received_at);
          if (mt) cache.packets[n.id].set(floorStep(mt), { measuredAt: mt, receivedAt: rt || mt });
        }
      });
      cache.gateway = ov.gateway ? { online: !!ov.gateway.online, lastSeen: toMs(ov.gateway.last_seen) } : null;
      var jobs = [];
      cfg().nodes.forEach(function (node) {
        MB.config.PARAM_ORDER.forEach(function (p) {
          if (!MB.config.sensorInstalled(node.id, p)) return;
          var q = '/nodes/' + encodeURIComponent(node.id) + '/telemetry?parameter=' + p + '&from=' + new Date(from).toISOString() + '&to=' + new Date(to).toISOString();
          jobs.push(fetchJson(q).then(function (body) {
            var m = new Map();
            (body.readings || []).forEach(function (r) {
              var mt = toMs(r.measured_at);
              if (!mt || r.value === null || r.value === undefined) return;
              var rt = toMs(r.received_at) || mt;
              m.set(floorStep(mt), { v: Number(r.value), unit: r.unit, measuredAt: mt, receivedAt: rt, quality: r.quality_status || 'ok' });
              if (!cache.packets[node.id]) cache.packets[node.id] = new Map();
              if (!cache.packets[node.id].has(floorStep(mt))) cache.packets[node.id].set(floorStep(mt), { measuredAt: mt, receivedAt: rt });
              if (p === 'flow' && r.unit) cache.units[node.id] = r.unit;
            });
            if (!cache.values[node.id]) cache.values[node.id] = {};
            cache.values[node.id][p] = m;
          }));
        });
      });
      jobs.push(fetchJson('/mass-balance?from=' + new Date(from).toISOString() + '&to=' + new Date(to).toISOString()).then(function (body) {
        (body.offtakes || []).forEach(function (o) {
          if (!cache.offtakes[o.zone_id]) cache.offtakes[o.zone_id] = new Map();
          var mt = toMs(o.measured_at);
          if (mt) cache.offtakes[o.zone_id].set(floorStep(mt), Number(o.value));
        });
      }));
      return Promise.all(jobs).then(function () { return cache; });
    });
  }

  /* -------------------------------------------------------- generic step access */
  function packetAtStep(nodeId, t) {
    t = floorStep(t);
    var now = nowRef();
    if (mode === 'demo') {
      var p = MB.demo.packetAt(nodeId, t);
      if (!p || p.receivedAt > now) return null;
      return p;
    }
    if (!state.live || !state.live.packets[nodeId]) return null;
    var lp = state.live.packets[nodeId].get(t);
    return lp && lp.receivedAt <= now ? lp : null;
  }

  function valueAtStep(nodeId, param, t) {
    if (!MB.config.sensorInstalled(nodeId, param)) return null;
    var node = MB.config.node(nodeId);
    if (node.sensors[param].status === 'fault') return null;
    if (!packetAtStep(nodeId, t)) return null;
    if (mode === 'demo') {
      var v = MB.demo.valueAt(nodeId, param, floorStep(t));
      return v === null || v === undefined ? null : v;
    }
    var m = state.live && state.live.values[nodeId] && state.live.values[nodeId][param];
    var r = m ? m.get(floorStep(t)) : null;
    return r ? r.v : null;
  }

  function offtakeAtStep(zoneId, t) {
    t = floorStep(t);
    if (t > nowRef()) return null;
    if (mode === 'demo') return MB.demo.offtakeAt(zoneId, t);
    var m = state.live && state.live.offtakes[zoneId];
    var v = m ? m.get(t) : undefined;
    return v === undefined ? null : v;
  }

  function flowUnit(nodeId) {
    var u = cfg().flow.unit;
    if (mode === 'demo') return MB.demo.flowUnitOf(nodeId, u);
    return (state.live && state.live.units[nodeId]) || u;
  }

  function unitOf(nodeId, param) { return param === 'flow' ? flowUnit(nodeId) : MB.config.PARAMS[param].unit; }

  /* last packet at or before t, searching back up to 'maxSteps' */
  function lastPacket(nodeId, t, maxSteps) {
    var s = floorStep(t);
    for (var i = 0; i <= (maxSteps || 600); i++) {
      var p = packetAtStep(nodeId, s - i * STEP);
      if (p && p.receivedAt <= t) return { step: s - i * STEP, measuredAt: p.measuredAt, receivedAt: p.receivedAt };
    }
    return null;
  }

  function snapshotAt(t) {
    var c = cfg();
    var snap = { at: t, nodes: {}, gateway: null, offtake: {} };
    c.nodes.forEach(function (n) {
      var lp = lastPacket(n.id, t);
      var entry = { packet: lp, ageMs: lp ? t - lp.receivedAt : null, values: {}, comm: null };
      MB.config.PARAM_ORDER.forEach(function (p) {
        var s = n.sensors[p];
        if (!s || s.status === 'not_installed') { entry.values[p] = { installed: false }; return; }
        if (s.status === 'fault') { entry.values[p] = { installed: true, value: null, quality: 'fault', unit: unitOf(n.id, p) }; return; }
        var v = lp ? valueAtStep(n.id, p, lp.step) : null;
        entry.values[p] = {
          installed: true,
          value: v,
          unit: unitOf(n.id, p),
          measuredAt: lp ? lp.measuredAt : null,
          receivedAt: lp ? lp.receivedAt : null,
          quality: v === null ? 'no_data' : (s.status === 'installed' ? 'ok' : s.status)
        };
      });
      if (lp) {
        entry.comm = mode === 'demo' ? MB.demo.commAt(n.id, lp.step) : (state.live && state.live.comm[n.id]) || null;
      }
      snap.nodes[n.id] = entry;
    });
    snap.gateway = mode === 'demo' ? MB.demo.gatewayAt(t) : (state.live ? state.live.gateway : null);
    c.zones.forEach(function (z) {
      var v = offtakeAtStep(z.id, t);
      if (v === null) v = offtakeAtStep(z.id, t - STEP);
      snap.offtake[z.id] = v;
    });
    return snap;
  }

  function series(nodeId, param, from, to) {
    var out = [];
    var end = Math.min(to, nowRef());
    for (var t = Math.ceil(from / STEP) * STEP; t <= end; t += STEP) {
      out.push({ t: t, v: valueAtStep(nodeId, param, t) });
    }
    return out;
  }

  function aggregate(points, minutes) {
    if (!minutes || minutes <= 5) return points;
    var size = minutes * 60000, out = [], bucket = null, sum = 0, n = 0;
    points.forEach(function (p) {
      var b = Math.floor(p.t / size) * size;
      if (bucket !== null && b !== bucket) { out.push({ t: bucket, v: n ? sum / n : null }); sum = 0; n = 0; }
      bucket = b;
      if (p.v !== null && p.v !== undefined) { sum += p.v; n++; }
    });
    if (bucket !== null) out.push({ t: bucket, v: n ? sum / n : null });
    return out;
  }

  function earliest() {
    if (mode === 'demo') return MB.demo.firstTime();
    return state.live ? state.live.from : nowRef();
  }

  function refresh() {
    state.loading = true;
    state.error = null;
    if (mode === 'demo') {
      state.ready = true;
      state.loading = false;
      state.refreshedAt = Date.now();
      return Promise.resolve();
    }
    var to = mode === 'historical' && state.histRange ? state.histRange.to : Date.now();
    var from = mode === 'historical' && state.histRange ? state.histRange.from : to - 24 * 3600e3;
    if (mode === 'historical' && !state.histRange) {
      state.loading = false;
      state.ready = false;
      state.error = { title: 'Rentang tanggal belum dipilih', detail: 'Pilih tanggal awal dan akhir pada bilah status, lalu tekan Muat data historis.' };
      return Promise.resolve();
    }
    return loadLive(from, to).then(function (cache) {
      state.live = cache;
      state.ready = true;
      state.loading = false;
      state.refreshedAt = Date.now();
    }, function (err) {
      state.live = null;
      state.ready = false;
      state.loading = false;
      var where = (err.path || '').split('?')[0];
      state.error = err.status === 501
        ? { title: 'Backend belum tersedia', detail: 'Server membalas HTTP 501 untuk ' + apiBase() + where + ': endpoint belum diimplementasikan. Data live dan historis membutuhkan backend yang menerima telemetri dari LoRaWAN Network Server.' }
        : err.status
          ? { title: 'Backend membalas error', detail: 'HTTP ' + err.status + ' untuk ' + apiBase() + where + '. ' + err.message }
          : { title: 'Server tidak dapat dihubungi', detail: err.message + '. Jika halaman dibuka langsung dari file, jalankan "node server.js" lalu buka http://localhost:8080.' };
    });
  }

  MB.ds = {
    STEP: STEP,
    state: state,
    mode: function () { return mode; },
    setMode: function (m) {
      if (['demo', 'live', 'historical'].indexOf(m) < 0) return;
      mode = m;
      localStorage.setItem(MODE_KEY, m);
      state.live = null;
      state.ready = false;
    },
    setHistRange: function (from, to) { state.histRange = { from: from, to: to }; },
    now: nowRef,
    refresh: refresh,
    floorStep: floorStep,
    packetAtStep: packetAtStep,
    valueAtStep: valueAtStep,
    offtakeAtStep: offtakeAtStep,
    flowUnit: flowUnit,
    unitOf: unitOf,
    lastPacket: lastPacket,
    snapshotAt: snapshotAt,
    series: series,
    aggregate: aggregate,
    earliest: earliest
  };
})(window.MB);
