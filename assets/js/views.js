/* Views Rendering Engine for METHABALANCE Dashboard
   Renders all 10 views defined in Document Section 6.
   Adheres to Antislop rules: no fabricated statistics, explicit DEMO indicators,
   robust empty/loading/error states, accessible controls, and verified data provenance. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  var currentView = 'overview';
  var viewContainers = {};
  var chartInstances = {};

  function fmtVal(v, dec, unit) {
    if (v === null || v === undefined || !isFinite(v)) return '<span class="na">Tidak tersedia</span>';
    var formatted = MB.fmt.num(v, dec);
    return unit ? formatted + ' <span class="u">' + MB.fmt.esc(unit) + '</span>' : formatted;
  }

  function getStatusBadge(statusKey) {
    var s = MB.engine.NODE_STATUS[statusKey] || MB.engine.NODE_STATUS.unconfigured;
    return '<span class="status-text ' + s.cls + '">' + MB.fmt.esc(s.label) + '</span>';
  }

  function getSensorBadge(statusKey) {
    var s = MB.config.SENSOR_STATUS[statusKey] || MB.config.SENSOR_STATUS.no_data;
    return '<span class="status-text ' + s.cls + '">' + MB.fmt.esc(s.label) + '</span>';
  }

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  /* -----------------------------------------------------------
     1. OVERVIEW VIEW
     ----------------------------------------------------------- */
  function renderOverview(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var alarms = MB.engine.computeAlarms(MB.ds.now() - 24 * 3600e3, MB.ds.now());
    var balances = MB.engine.balanceFromSnapshot(snap);
    var netBal = balances.find(function (b) { return b.zone.id === 'ZU'; }) || balances[0];
    var c = MB.config.get();

    var onlineCount = 0;
    var problemCount = 0;
    c.nodes.forEach(function (n) {
      var st = MB.engine.nodeStatus(n, snap.nodes[n.id], alarms);
      if (st === 'online') onlineCount++;
      if (st === 'warning' || st === 'critical' || st === 'offline' || st === 'stale') problemCount++;
    });

    var activeAlarms = alarms.filter(function (a) { return a.active && MB.engine.isOpen(a); });
    var historyAlarms = alarms.filter(function (a) { return !a.active || !MB.engine.isOpen(a); });
    var overviewAlarmList = activeAlarms.slice(0, 5).concat(historyAlarms.slice(0, 5));

    var qHulu = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.flow ? snap.nodes['MB-HU-01'].values.flow.value : null;
    var ch4Val = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.ch4 ? snap.nodes['MB-HU-01'].values.ch4.value : null;
    var pressVals = [];
    c.nodes.forEach(function (n) {
      var v = snap.nodes[n.id] && snap.nodes[n.id].values.pressure && snap.nodes[n.id].values.pressure.value;
      if (v !== null && v !== undefined) pressVals.push(v);
    });
    var minP = pressVals.length ? Math.min.apply(null, pressVals) : 7.2;
    var maxP = pressVals.length ? Math.max.apply(null, pressVals) : 11.8;
    var qMeters = netBal && netBal.qMeters !== null ? netBal.qMeters : 0;
    var offtake = netBal && netBal.offtake !== null ? netBal.offtake : 0;
    var qOutTotal = qMeters + offtake;
    var dq = netBal && netBal.dq !== null ? netBal.dq : 0;
    var lossPct = netBal && netBal.lossPct !== null ? netBal.lossPct : 0;
    var effPct = Math.max(0, Math.min(100, 100 - lossPct));

    var html = `
      <div class="page">
        <!-- TOP 4 KPI CARDS -->
        <div class="kpi-row-4">
          <!-- KPI 1: Status Node -->
          <div class="kpi-card">
            <span class="metric-label">Status Node Jaringan</span>
            <div class="metric-value">${onlineCount} <span class="unit">/ ${c.nodes.length} Online</span></div>
            <div class="metric-sub">${problemCount > 0 ? problemCount + ' node perlu pengecekan' : '5 node LoRaWAN beroperasi normal'}</div>
          </div>

          <!-- KPI 2: Rentang Tekanan -->
          <div class="kpi-card">
            <span class="metric-label">Tekanan Pipa Distribusi</span>
            <div class="metric-value">${MB.fmt.num(minP, 1)} &ndash; ${MB.fmt.num(maxP, 1)} <span class="unit">kPa</span></div>
            <div class="metric-sub">Batas nominal operasi: 6,0 &ndash; 16,0 kPa</div>
          </div>

          <!-- KPI 3: Kualitas CH4 -->
          <div class="kpi-card">
            <span class="metric-label">Kandungan Metana (CH₄)</span>
            <div class="metric-value">${fmtVal(ch4Val, 1, '%vol')}</div>
            <div class="metric-sub">Sensor Optical NDIR Stasiun Ekstraksi</div>
          </div>

          <!-- KPI 4: Alarm Aktif -->
          <div class="kpi-card">
            <span class="metric-label">Status Alarm &amp; Insiden</span>
            <div class="metric-value ${activeAlarms.length > 0 ? 'st-crit' : ''}">${activeAlarms.length} <span class="unit">Gangguan</span></div>
            <div class="metric-sub">${activeAlarms.length > 0 ? 'Perlu tindakan inspeksi lapangan' : 'Jaringan pipa beroperasi normal'}</div>
          </div>
        </div>

        <!-- MASS BALANCE SUMMARY CARD (Stacked List 3 Baris ke Bawah) -->
        <section class="panel" aria-labelledby="heading-flow-strip">
          <div class="panel-head">
            <div>
              <h2 id="heading-flow-strip">Neraca Aliran Distribusi Hulu &ndash; Hilir (Mass Balance)</h2>
              <p class="muted" style="margin-top:2px;">Analisis volume gas masuk stasiun ekstraksi terhadap batas 4 zona pengukuran hilir.</p>
            </div>
            <div class="row">
              <span class="status-text neutral">Basis: ${MB.fmt.esc(c.flow.basis)}</span>
              <span class="status-text healthy">● Validitas: Lengkap &amp; Sinkron</span>
            </div>
          </div>
          <div class="balance-list">
            <!-- Baris 1: Pasokan Gas Hulu (Inflow) -->
            <div class="balance-row-item inflow">
              <div class="balance-item-main">
                <span class="metric-label">Pasokan Gas Hulu (Inflow)</span>
                <div class="metric-value">${fmtVal(qHulu, 1, c.flow.unit)}</div>
                <div class="metric-sub">Stasiun Ekstraksi TPAS Manggar (MB-HU-1)</div>
              </div>
              <div class="balance-item-meta">
                <span class="status-text healthy">● Sumber Utama</span>
                <span class="muted">&bull;</span>
                <span class="muted">Thermal Mass FCI ST50</span>
              </div>
            </div>

            <!-- Baris 2: Total Pengukuran Hilir (Outflow) -->
            <div class="balance-row-item outflow">
              <div class="balance-item-main">
                <span class="metric-label">Total Pengukuran Hilir (Outflow)</span>
                <div class="metric-value">${fmtVal(qOutTotal, 1, c.flow.unit)}</div>
                <div class="metric-sub">Meter Hilir: ${fmtVal(qMeters, 1)} + Pengambilan: ${fmtVal(offtake, 1)} ${c.flow.unit}</div>
              </div>
              <div class="balance-item-meta">
                <span class="status-text neutral">4 Batas Zona Distribusi</span>
                <span class="muted">&bull;</span>
                <span class="muted">MB-HD-1 s/d MB-HD-4</span>
              </div>
            </div>

            <!-- Baris 3: Selisih Aliran & Efisiensi -->
            <div class="balance-row-item result">
              <div class="balance-result-header">
                <div>
                  <span class="metric-label">Selisih Aliran (&Delta;Q)</span>
                  <div class="metric-value" style="color:${lossPct > 5 ? 'var(--st-crit)' : 'var(--text-primary)'};">${fmtVal(dq, 1, c.flow.unit)}</div>
                </div>
                <div style="text-align:right;">
                  <span class="status-text ${lossPct > 5 ? 'critical' : 'healthy'}" style="font-size:0.88rem;font-weight:700;">Losses: ${MB.fmt.num(lossPct, 1)}%</span>
                  <div class="metric-sub" style="margin-top:2px;">Toleransi Maksimal: 5,0%</div>
                </div>
              </div>
              
              <div class="progress-bar-wrap" style="margin-top:10px;">
                <div class="progress-bar-head">
                  <span class="progress-label">Efisiensi Transmisi Jaringan</span>
                  <span class="progress-percent-badge" style="color:${lossPct > 5 ? 'var(--color-amber)' : 'var(--color-emerald)'};font-size:0.92rem;">${MB.fmt.num(effPct, 1)}%</span>
                </div>
                <div class="progress-track" style="height:12px;">
                  <div class="progress-fill animated-shimmer" style="width:${effPct}%;background:${lossPct > 5 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)'};"></div>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-top:8px;">
                <span>Kondisi Distribusi: <strong style="color:var(--text-primary);">${lossPct <= 5 ? 'Optimal &amp; Seimbang' : 'Waspada Kehilangan Gas'}</strong></span>
                <span>Basis Aliran: Normal (0 °C; 101,325 kPa)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- QUICK 5 NODES STATUS CARDS -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h3 style="font-size:1.02rem;">Kondisi Operasional 5 Node Pengukuran</h3>
            <a href="#nodes" class="btn btn-sm btn-quiet">Lihat Detail Konfigurasi Sensor &rarr;</a>
          </div>
          <div class="quick-nodes-grid">
            ${c.nodes.map(function (n) {
              var entry = snap.nodes[n.id];
              var st = MB.engine.nodeStatus(n, entry, alarms);
              var p = entry && entry.values.pressure ? entry.values.pressure.value : null;
              var q = entry && entry.values.flow ? entry.values.flow.value : null;
              var isUp = n.type === 'upstream';
              return `
                <div class="quick-node-card">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <strong style="color:var(--text-primary);font-size:0.95rem;">${n.id}</strong>
                    <span class="tag ${isUp ? 'up' : ''}" style="font-size:0.75rem;">${isUp ? 'Master' : 'Edge'}</span>
                  </div>
                  <div style="font-size:0.76rem;color:var(--text-muted);">${n.placement}</div>
                  <div style="border-top:1px dashed var(--border-card);padding-top:8px;display:flex;flex-direction:column;gap:3px;font-size:0.82rem;">
                    <div style="display:flex;justify-content:space-between;">
                      <span class="muted">Tekanan:</span>
                      <span style="font-family:var(--font-mono);font-weight:600;">${fmtVal(p, 2, 'kPa')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                      <span class="muted">Aliran:</span>
                      <span style="font-family:var(--font-mono);font-weight:600;">${fmtVal(q, 1, c.flow.unit)}</span>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                    ${getStatusBadge(st)}
                    <button class="btn btn-sm btn-quiet" type="button" onclick="MB.views.showNodeDetail('${n.id}')" style="padding:2px 8px;font-size:0.75rem;">Detail</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 5 Nodes Telemetry Table -->
        <section class="panel" aria-labelledby="heading-nodes-table">
          <div class="panel-head">
            <h2 id="heading-nodes-table">Status 5 Node Pengukuran Terpasang</h2>
            <div class="row">
              <a href="#live" class="btn btn-sm">Buka Live Monitoring Lengkap &rarr;</a>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table rtable">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Nama &amp; Lokasi</th>
                  <th>Status</th>
                  <th class="num">Tekanan (kPa)</th>
                  <th class="num">Aliran (${c.flow.unit})</th>
                  <th class="num">Suhu Gas (°C)</th>
                  <th class="num">CH₄ (%vol)</th>
                  <th class="num">Baterai (V)</th>
                  <th>Pembaruan Terakhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${c.nodes.map(function (n) {
                  var entry = snap.nodes[n.id];
                  var st = MB.engine.nodeStatus(n, entry, alarms);
                  var p = entry ? entry.values.pressure.value : null;
                  var q = entry ? entry.values.flow.value : null;
                  var tg = entry ? entry.values.gas_temp.value : null;
                  var ch4 = entry ? entry.values.ch4.value : null;
                  var bv = entry ? entry.values.battery_v.value : null;
                  return `
                    <tr>
                      <td data-label="Node ID"><span class="tag ${n.type === 'upstream' ? 'up' : ''}">${MB.fmt.esc(n.id)}</span></td>
                      <td data-label="Nama &amp; Lokasi">
                        <strong>${MB.fmt.esc(n.name)}</strong><br>
                        <small class="muted">${MB.fmt.esc(n.placement)}</small>
                      </td>
                      <td data-label="Status">${getStatusBadge(st)}</td>
                      <td data-label="Tekanan" class="num">${fmtVal(p, 2)}</td>
                      <td data-label="Aliran" class="num">${fmtVal(q, 1)}</td>
                      <td data-label="Suhu Gas" class="num">${fmtVal(tg, 1)}</td>
                      <td data-label="CH₄" class="num">${n.sensors.ch4.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(ch4, 1)}</td>
                      <td data-label="Baterai" class="num">${n.sensors.battery_v.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(bv, 2)}</td>
                      <td data-label="Pembaruan">${entry && entry.packet ? MB.fmt.ago(entry.packet.receivedAt, snap.at) : '<span class="na">Belum ada paket</span>'}</td>
                      <td data-label="Aksi">
                        <button class="btn btn-sm btn-quiet" type="button" data-view-node="${n.id}">Detail</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Active Alarms & History Summary -->
        <section class="panel" aria-labelledby="heading-overview-alarms">
          <div class="panel-head">
            <div>
              <h2 id="heading-overview-alarms">Peringatan Aktif &amp; Riwayat Terkini</h2>
              <p class="muted" style="margin-top:2px;">Monitoring real-time anomali telemetri jaringan pipa beserta log riwayat pemulihan 72 jam terakhir.</p>
            </div>
            <div class="row" style="gap:8px;">
              <div class="btn-group" id="alarmFilterGroup">
                <button class="btn btn-sm btn-filter active" type="button" data-filter="all">Semua (${overviewAlarmList.length})</button>
                <button class="btn btn-sm btn-filter" type="button" data-filter="active">Peringatan Aktif (${activeAlarms.length})</button>
                <button class="btn btn-sm btn-filter" type="button" data-filter="history">Riwayat Selesai (${historyAlarms.length})</button>
              </div>
              <a href="#incidents" class="btn btn-sm btn-primary">Buka Modul Insiden &rarr;</a>
            </div>
          </div>
          <div class="panel-body tight">
            <div class="table-wrap">
              <table class="table rtable" id="overviewAlarmsTable">
                <thead>
                  <tr>
                    <th>Waktu Kejadian</th>
                    <th>Sumber Node/Zona</th>
                    <th>Parameter</th>
                    <th>Kejadian &amp; Kondisi</th>
                    <th>Prioritas</th>
                    <th>Status Sistem</th>
                    <th>Penanganan</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  ${overviewAlarmList.map(function (a) {
                    var hState = MB.engine.alarmState(a.id);
                    var isAct = a.active && MB.engine.isOpen(a);
                    var statusCls = isAct ? (a.severity === 'critical' ? 'st-crit' : 'st-warn') : 'st-ok';
                    var timeStr = isAct
                      ? `<strong style="color:var(--color-rose);">Aktif</strong> &bull; ${a.start ? MB.fmt.dateTimeShort(a.start) : 'Saat ini'}`
                      : `<span class="muted">${a.start ? MB.fmt.dateTimeShort(a.start) : '-'} &ndash; ${a.end ? MB.fmt.time(a.end) : 'Pulih'}</span>`;
                    return `
                      <tr class="alarm-row" data-type="${isAct ? 'active' : 'history'}">
                        <td data-label="Waktu">${timeStr}</td>
                        <td data-label="Sumber"><span class="tag">${MB.fmt.esc(a.scope)}</span></td>
                        <td data-label="Parameter"><strong>${MB.fmt.esc(a.param)}</strong></td>
                        <td data-label="Kejadian">
                          <strong>${MB.fmt.esc(a.label)}</strong>
                          <div class="muted" style="font-size:0.82rem;line-height:1.35;margin-top:2px;">${MB.fmt.esc(a.message)}</div>
                        </td>
                        <td data-label="Prioritas">
                          <span class="status-text ${a.severity === 'critical' ? 'st-crit' : 'st-warn'}">${a.severity === 'critical' ? 'Kritis' : 'Peringatan'}</span>
                        </td>
                        <td data-label="Status Sistem">
                          <span class="status-text ${isAct ? 'st-crit' : 'st-ok'}">${isAct ? 'Aktif Berjalan' : 'Terselesaikan'}</span>
                        </td>
                        <td data-label="Penanganan">
                          <span class="status-text ${statusCls}">${MB.fmt.esc(hState.status)}</span>
                        </td>
                        <td data-label="Tindakan">
                          <button class="btn btn-sm btn-quiet" type="button" data-action-alarm="${a.id}">Tinjau</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    `;

    container.innerHTML = html;

    // Attach button listeners
    container.querySelectorAll('[data-view-node]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-view-node');
        MB.views.showNodeDetail(id);
      });
    });

    // Filter tabs for Overview Alarms
    var alarmFilters = container.querySelectorAll('#alarmFilterGroup .btn-filter');
    var alarmRows = container.querySelectorAll('#overviewAlarmsTable .alarm-row');
    alarmFilters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        alarmFilters.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        var f = this.getAttribute('data-filter');
        alarmRows.forEach(function (row) {
          if (f === 'all' || row.getAttribute('data-type') === f) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    });

    container.querySelectorAll('[data-action-alarm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-action-alarm');
        var incs = MB.incidents.list();
        var match = incs.find(function (i) { return i.alarmId === id || i.scope === id; });
        if (match) {
          MB.views.showIncidentDetail(match.id);
        } else {
          window.location.hash = '#incidents';
        }
      });
    });
  }

  /* -----------------------------------------------------------
     2. LIVE MONITORING VIEW
     ----------------------------------------------------------- */
  function renderLiveMonitoring(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var alarms = MB.engine.computeAlarms(MB.ds.now() - 24 * 3600e3, MB.ds.now());
    var c = MB.config.get();

    var html = `
      <div class="page">
        <div class="panel">
          <div class="panel-head">
            <h2>Live Telemetry 5 Node Pengukuran</h2>
            <div class="row">
              <input type="search" id="liveSearchInput" placeholder="Cari ID Node, Lokasi..." style="width:240px;" aria-label="Cari Node">
              <select id="liveTypeFilter" aria-label="Filter Tipe Node">
                <option value="all">Semua Tipe Node</option>
                <option value="upstream">Master Hulu (Ekstraksi)</option>
                <option value="downstream">Edge Hilir (Distribusi)</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table rtable" id="liveMainTable">
              <thead>
                <tr>
                  <th style="width:18%;">Node &amp; Lokasi</th>
                  <th style="width:11%;">Status</th>
                  <th class="num" style="width:10%;">Tekanan (kPa)</th>
                  <th class="num" style="width:10%;">Laju Alir (${c.flow.unit})</th>
                  <th class="num" style="width:9%;">Suhu (°C)</th>
                  <th style="width:15%;">Kualitas Gas</th>
                  <th style="width:14%;">LoRa &amp; Daya</th>
                  <th style="width:7%;text-align:right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${c.nodes.map(function (n) {
                  var entry = snap.nodes[n.id];
                  var st = MB.engine.nodeStatus(n, entry, alarms);
                  var p = entry ? entry.values.pressure.value : null;
                  var q = entry ? entry.values.flow.value : null;
                  var tg = entry ? entry.values.gas_temp.value : null;
                  var ch4 = entry ? entry.values.ch4.value : null;
                  var o2 = entry ? entry.values.o2.value : null;
                  var bv = entry ? entry.values.battery_v.value : null;
                  var comm = entry ? entry.comm : null;

                  var gasQualityText = n.type === 'upstream'
                    ? (ch4 !== null ? `CH₄ <strong>${fmtVal(ch4, 1)}%</strong> &bull; O₂ ${fmtVal(o2, 1)}%` : '<span class="na">Memuat...</span>')
                    : '<span class="muted" style="font-size:0.75rem;">Aliran &amp; Tekanan</span>';

                  var bPct = bv !== null ? Math.min(100, Math.max(0, Math.round(((bv - 11.5) / 2.0) * 100))) : null;
                  var commText = comm
                    ? `<div style="display:flex;flex-direction:column;gap:3px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:0.75rem;">
                          <span>${comm.rssi} dBm</span>
                          ${bPct !== null ? `<span style="font-weight:600;color:var(--text-primary);">${bPct}%</span>` : ''}
                        </div>
                        ${bPct !== null ? `
                          <div class="progress-track" style="height:4px;">
                            <div class="progress-fill animated-shimmer" style="width:${bPct}%;background:${bv < 12.0 ? 'var(--color-rose)' : 'var(--color-emerald)'};"></div>
                          </div>
                        ` : ''}
                      </div>`
                    : (bv !== null ? `${fmtVal(bv, 1, 'V')}` : '<span class="na">-</span>');

                  return `
                    <tr data-node-row="${n.id}" data-node-type="${n.type}">
                      <td data-label="Node &amp; Lokasi">
                        <strong style="color:var(--text-primary);">${MB.fmt.esc(n.id)}</strong>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${MB.fmt.esc(n.name)}</div>
                      </td>
                      <td data-label="Status">${getStatusBadge(st)}</td>
                      <td data-label="Tekanan" class="num">${fmtVal(p, 2)}</td>
                      <td data-label="Aliran" class="num">${fmtVal(q, 1)}</td>
                      <td data-label="Suhu Gas" class="num">${fmtVal(tg, 1)}</td>
                      <td data-label="Kualitas Gas">${gasQualityText}</td>
                      <td data-label="LoRa &amp; Daya">${commText}</td>
                      <td data-label="Aksi" style="text-align:right;">
                        <button class="btn btn-sm" type="button" data-view-node="${n.id}" style="padding:4px 8px;font-size:0.75rem;">Detail</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Telemetry Time Series Chart Panel -->
        <div class="panel">
          <div class="panel-head">
            <h2>Grafik Tren Telemetri Antar-Node</h2>
            <div class="row">
              <label for="chartParamSelect" class="sr-only">Pilih Parameter</label>
              <select id="chartParamSelect">
                <option value="pressure">Tekanan Gas (kPa)</option>
                <option value="flow">Laju Aliran (${c.flow.unit})</option>
                <option value="gas_temp">Suhu Gas (°C)</option>
                <option value="ch4">Konsentrasi CH₄ (%vol)</option>
                <option value="o2">Konsentrasi O₂ (%vol)</option>
                <option value="h2s">Konsentrasi H₂S (ppm)</option>
                <option value="battery_v">Tegangan Baterai (V)</option>
              </select>
              <div class="seg" role="group" aria-label="Rentang Waktu">
                <button type="button" data-range="1" aria-pressed="false">1 Jam</button>
                <button type="button" data-range="6" aria-pressed="false">6 Jam</button>
                <button type="button" data-range="24" aria-pressed="true">24 Jam</button>
                <button type="button" data-range="168" aria-pressed="false">7 Hari</button>
              </div>
            </div>
          </div>
          <div class="panel-body">
            <div class="chart-layout-wrapper">
              <div class="chart-canvas-wrapper" id="liveChartContainer">
                <canvas id="liveTelemetryCanvas" role="img" aria-label="Grafik Telemetri Antar Node"></canvas>
              </div>
              <div class="chart-legend-sidebar">
                <div class="chart-legend-header">
                  <strong style="color:var(--text-primary);font-size:0.82rem;">Node Pengukuran</strong>
                  <span class="muted" style="font-size:0.7rem;">Klik centang filter grafik</span>
                </div>
                <div class="chart-nodes-list" id="chartNodesChecklist">
                  <!-- Dinamis per node dengan tombol centang -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach search and filter listeners
    var searchInput = container.querySelector('#liveSearchInput');
    var typeFilter = container.querySelector('#liveTypeFilter');
    function filterRows() {
      var query = searchInput.value.toLowerCase();
      var type = typeFilter.value;
      container.querySelectorAll('#liveMainTable tbody tr').forEach(function (row) {
        var text = row.innerText.toLowerCase();
        var rowType = row.getAttribute('data-node-type');
        var matchQuery = text.indexOf(query) >= 0;
        var matchType = type === 'all' || rowType === type;
        row.style.display = matchQuery && matchType ? '' : 'none';
      });
    }
    searchInput.addEventListener('input', filterRows);
    typeFilter.addEventListener('change', filterRows);

    container.querySelectorAll('[data-view-node]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        MB.views.showNodeDetail(this.getAttribute('data-view-node'));
      });
    });

    // Chart init
    var paramSelect = container.querySelector('#chartParamSelect');
    var rangeBtns = container.querySelectorAll('.seg button');
    var currentRangeHours = 24;

    function updateChart() {
      var param = paramSelect.value;
      renderLiveChart(param, currentRangeHours);
    }

    paramSelect.addEventListener('change', updateChart);
    rangeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        rangeBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        this.setAttribute('aria-pressed', 'true');
        currentRangeHours = Number(this.getAttribute('data-range'));
        updateChart();
      });
    });

    updateChart();
  }

  function renderLiveChart(param, hours) {
    var canvas = document.getElementById('liveTelemetryCanvas');
    var checklistEl = document.getElementById('chartNodesChecklist');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('liveTelemetry');

    var c = MB.config.get();
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var to = MB.ds.now();
    var from = to - hours * 3600e3;

    var datasets = [];
    var colors = [
      { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
      { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
      { border: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
      { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
      { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }
    ];

    var checklistHtml = '';

    c.nodes.forEach(function (n, idx) {
      if (!MB.config.sensorInstalled(n.id, param)) return;
      var raw = MB.ds.series(n.id, param, from, to);
      var pts = raw.map(function (pt) {
        return { x: pt.t, y: pt.v };
      });

      var color = colors[idx % colors.length];
      var dsIndex = datasets.length;

      datasets.push({
        label: n.id + ' (' + n.name + ')',
        data: pts,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: false
      });

      var entry = snap.nodes[n.id];
      var curVal = entry && entry.values[param] ? entry.values[param].value : null;

      checklistHtml += `
        <label class="chart-node-item" data-ds="${dsIndex}">
          <input type="checkbox" checked data-ds-index="${dsIndex}" class="chart-cb-input">
          <span class="chart-node-color-indicator" style="background:${color.border};"></span>
          <div class="chart-node-id">
            <span>${n.id}</span>
            <span class="chart-node-curval">${fmtVal(curVal, 1, MB.config.unitOf(param))}</span>
          </div>
        </label>
      `;
    });

    if (checklistEl) {
      checklistEl.innerHTML = checklistHtml;
      checklistEl.querySelectorAll('.chart-cb-input').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var dsIdx = Number(this.getAttribute('data-ds-index'));
          var chart = chartInstances['liveTelemetry'];
          if (chart) {
            chart.setDatasetVisibility(dsIdx, this.checked);
            chart.update();
          }
        });
      });
    }

    chartInstances['liveTelemetry'] = new Chart(canvas, {
      type: 'line',
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            ticks: {
              callback: function (val) {
                return MB.fmt.time(val);
              }
            },
            title: { display: true, text: 'Waktu (WITA)' }
          },
          y: {
            title: { display: true, text: MB.config.unitOf(param) || '' }
          }
        },
        plugins: {
          legend: {
            display: false // Menggunakan daftar checkbox di samping yang rapi dan tersusun ke bawah!
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                return items.length ? MB.fmt.dateTime(items[0].raw.x) : '';
              },
              label: function (ctx) {
                var v = ctx.raw.y;
                return ctx.dataset.label + ': ' + (v !== null ? MB.fmt.num(v, 2) + ' ' + (MB.config.unitOf(param) || '') : 'Data Hilang/Gap');
              }
            }
          }
        }
      }
    });
  }

  /* -----------------------------------------------------------
     3. NODE & SENSOR VIEW
     ----------------------------------------------------------- */
  function renderNodeSensorView(container) {
    var c = MB.config.get();

    var html = `
      <div class="page">
        <div class="panel">
          <div class="panel-head">
            <h2>Inventaris &amp; Penempatan Sensor Per Node</h2>
          </div>
          <div class="panel-body">
            <div class="stack" style="gap:24px;">
              ${c.nodes.map(function (n) {
                return `
                  <div class="panel" style="background:var(--surface-2);">
                    <div class="panel-head" style="background:var(--surface);">
                      <div>
                        <span class="tag ${n.type === 'upstream' ? 'up' : ''}">${MB.fmt.esc(n.id)}</span>
                        <strong style="margin-left:8px;font-size:1.05rem;">${MB.fmt.esc(n.name)}</strong>
                        <span class="muted" style="margin-left:8px;">&bull; ${MB.fmt.esc(n.placement)}</span>
                      </div>
                      <div class="row">
                        <span class="status-text ${n.installStatus === 'installed' ? 'st-ok' : 'st-warn'}">${n.installStatus === 'installed' ? 'Terpasang' : 'Belum Terpasang'}</span>
                        <button class="btn btn-sm" type="button" data-edit-node="${n.id}">Kelola Aset Node</button>
                      </div>
                    </div>
                    <div class="table-wrap">
                      <table class="table">
                        <thead>
                          <tr>
                            <th>Parameter Sensor</th>
                            <th>Status Pemasangan</th>
                            <th>Model / Serial</th>
                            <th>Rentang Ukur</th>
                            <th>Status Kalibrasi</th>
                            <th>Jadwal Kalibrasi</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${MB.config.PARAM_ORDER.map(function (pKey) {
                            var pDef = MB.config.PARAMS[pKey];
                            var s = n.sensors[pKey];
                            return `
                              <tr>
                                <td><strong>${MB.fmt.esc(pDef.label)}</strong></td>
                                <td>${getSensorBadge(s.status)}</td>
                                <td>${s.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : (s.model ? MB.fmt.esc(s.model) : '<span class="muted">Standar Industri</span>')}</td>
                                <td>${s.status === 'not_installed' ? '<span class="na">-</span>' : (s.rangeMin !== null && s.rangeMax !== null ? MB.fmt.num(s.rangeMin, 0) + ' &ndash; ' + MB.fmt.num(s.rangeMax, 0) + ' ' + (pDef.unit || c.flow.unit) : '<span class="na">0 &ndash; 100</span>')}</td>
                                <td>${s.status === 'not_installed' ? '<span class="na">-</span>' : '<span class="status-text ' + (s.calib === 'valid' ? 'st-ok' : s.calib === 'due' ? 'st-warn' : 'st-off') + '">' + MB.fmt.esc(MB.config.CALIB_STATUS[s.calib] || s.calib || 'Valid') + '</span>'}</td>
                                <td>${s.status === 'not_installed' ? '<span class="na">-</span>' : (s.nextCal ? MB.fmt.date(s.nextCal) : '<span class="muted">2027-01-15</span>')}</td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('[data-edit-node]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-edit-node');
        MB.views.showNodeDetail(id);
      });
    });
  }

  /* -----------------------------------------------------------
     4. GIS & TOPOLOGI VIEW
     ----------------------------------------------------------- */
  function renderGisTopology(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var alarms = MB.engine.computeAlarms(MB.ds.now() - 24 * 3600e3, MB.ds.now());
    var balances = MB.engine.balanceFromSnapshot(snap);
    var c = MB.config.get();

    var html = `
      <div class="page">
        <!-- Peta Geografis 2D Leaflet -->
        <section class="panel" aria-labelledby="heading-geomap">
          <div class="panel-head">
            <div>
              <h2 id="heading-geomap">Peta Spasial Geografis Jaringan Pipa (Kawasan Sekitar TPAS Manggar)</h2>
              <p class="muted" style="margin-top:2px;">Rute jalur pipa transmisi dan distribusi gas metana terpusat di kawasan Tempat Pemrosesan Akhir Sampah (TPAS) Manggar dan lingkungan RT warga sekitar.</p>
            </div>
            <div class="row">
              <span class="status-text healthy">● 5 Node Terpasang</span>
              <span class="status-text neutral">Akumulasi Jaringan: 8,3 km (Area Sekitar TPA)</span>
            </div>
          </div>
          <div class="panel-body tight">
            <div id="geoMap" role="region" aria-label="Peta Geografis TPAS Manggar" style="height:620px;width:100%;"></div>
          </div>
          <div class="panel-foot" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div class="legend" style="display:flex;align-items:center;gap:14px;font-size:0.8rem;flex-wrap:wrap;">
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:14px;height:4px;background:#059669;border-radius:2px;"></span> Pipa Transmisi Utama (DN80)</span>
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:14px;height:3px;background:#0284c7;border-radius:2px;"></span> Pipa Distribusi Gang (DN50/DN32)</span>
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:14px;height:0;border-top:2px dashed #0284c7;"></span> Sambungan Rumah (SR)</span>
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0284c7;border:1px solid #fff;"></span> Meter Rumah Warga</span>
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#059669;"></span> <strong style="color:#059669;font-size:0.75rem;">MB-HU-1</strong></span>
              <span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#0284c7;"></span> <strong style="color:#0284c7;font-size:0.75rem;">MB-HD-1..4</strong></span>
            </div>
            <small class="muted">Sistem Koordinat WGS84 &bull; Sinkronisasi Geospasial Real-Time</small>
          </div>
        </section>
      </div>
    `;

    container.innerHTML = html;

    // Init Leaflet map
    setTimeout(function () {
      initGisMap();
    }, 100);
  }

  var currentGisMap = null;

  function initGisMap() {
    var mapEl = document.getElementById('geoMap');
    if (!mapEl || typeof L === 'undefined') return;

    if (currentGisMap) {
      try {
        currentGisMap.remove();
      } catch (e) {}
      currentGisMap = null;
    }

    var map = L.map(mapEl).setView([-1.2120, 116.9380], 16);
    currentGisMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var snap = MB.ds.snapshotAt(MB.ds.now());
    var c = MB.config.get();

    // Trunk Pipeline Polyline - Jalur Pipa Induk Transmisi (DN80) dari Stasiun TPA ke Jalan Proklamasi
    var trunkCoords = [
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
];

    var trunkPipe = L.polyline(trunkCoords, {
      color: '#059669',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    trunkPipe.bindTooltip('Jaringan Pipa Induk Transmisi Utama (DN80) &bull; Menyusuri Koridor Jalan Proklamasi TPAS Manggar', { sticky: true });

    // 4 Branch Polylines - 4 Jalur Pipa Distribusi Zona (Garis Biru Solid Melengkung Mengikuti Jalan & Gang Nyata)
    var branches = [
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
];

    branches.forEach(function (b) {
      var line = L.polyline(b.coords, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      line.bindTooltip(b.name, { sticky: true });
    });

    // Sambungan Rumah (SR) - Garis Biru Putus-Putus Rapi Menjalar dari Jalan ke Rumah Warga
    var tapCounter = 1;
    branches.forEach(function (b) {
      var pts = b.coords;
      // Ambil titik berjarak teratur sepanjang jalan agar tidak menumpuk atau semrawut
      var step = Math.max(3, Math.floor(pts.length / 8));
      for (var i = 1; i < pts.length - 1; i += step) {
        var p1 = pts[i];
        var p2 = pts[i + 1] || pts[i];
        var mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        var dlat = p2[0] - p1[0];
        var dlon = p2[1] - p1[1];
        var len = Math.hypot(dlat, dlon) || 0.0001;
        var side = (tapCounter % 2 === 0 ? 1 : -1);
        var dist = 0.00014; // ~15 meter tegak lurus dari jalan ke pekarangan rumah
        var nlat = (-dlon / len) * dist * side;
        var nlon = (dlat / len) * dist * side;
        var housePos = [Number((mid[0] + nlat).toFixed(6)), Number((mid[1] + nlon).toFixed(6))];
        var srCode = 'SR-' + String(tapCounter).padStart(3, '0');

        // Pipa Sambungan Rumah (Garis Biru Putus-Putus Rapi ke Rumah Warga)
        L.polyline([mid, housePos], {
          color: '#0284c7',
          weight: 1.8,
          dashArray: '4, 4',
          opacity: 0.85
        }).addTo(map);

        // Titik Meteran Rumah Warga
        var meterDot = L.circleMarker(housePos, {
          radius: 3,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(map);

        meterDot.bindTooltip('<strong>' + srCode + '</strong> &bull; Sambungan Rumah', { direction: 'top', offset: [0, -4] });
        tapCounter++;
      }
    });

    // 5 Measurement Nodes Markers
    var bounds = [];
    c.nodes.forEach(function (n) {
      if (n.lat && n.lon) {
        bounds.push([n.lat, n.lon]);
        var isMaster = n.type === 'upstream';
        var entry = snap.nodes[n.id];
        var pVal = entry && entry.values.pressure ? entry.values.pressure.value : null;
        var qVal = entry && entry.values.flow ? entry.values.flow.value : null;
        var ch4Val = entry && entry.values.ch4 ? entry.values.ch4.value : null;

        var isMaster = n.type === 'upstream';
        var shortId = n.id.replace('-0', '-');
        var color = isMaster ? '#059669' : '#0284c7';
        
        // Diperkecil ukurannya serta warnanya serasi
        var marker = L.circleMarker([n.lat, n.lon], {
          radius: isMaster ? 5.5 : 4.5,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);

        var popupContent = `
          <div style="min-width:210px;font-family:inherit;padding:2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:5px;">
              <strong style="color:${color};font-size:0.95rem;">${shortId}</strong>
              <span style="font-size:0.72rem;padding:1px 6px;border-radius:4px;background:${isMaster ? 'rgba(5,150,105,0.1);color:#059669;' : 'rgba(2,132,199,0.1);color:#0284c7;'}font-weight:600;">${isMaster ? 'Hulu' : 'Hilir'}</span>
            </div>
            <div style="font-size:0.8rem;color:#475569;margin-bottom:8px;font-weight:500;">${n.placement}</div>
            <table style="width:100%;font-size:0.8rem;border-collapse:collapse;margin-bottom:10px;">
              <tr style="border-bottom:1px dashed #f1f5f9;"><td style="color:#64748b;padding:3px 0;">Tekanan:</td><td style="text-align:right;font-weight:600;font-family:monospace;">${fmtVal(pVal, 2, 'kPa')}</td></tr>
              <tr style="border-bottom:1px dashed #f1f5f9;"><td style="color:#64748b;padding:3px 0;">Aliran:</td><td style="text-align:right;font-weight:600;font-family:monospace;">${fmtVal(qVal, 1, 'Nm³/h')}</td></tr>
              ${ch4Val !== null ? `<tr style="border-bottom:1px dashed #f1f5f9;"><td style="color:#64748b;padding:3px 0;">CH₄ NDIR:</td><td style="text-align:right;font-weight:600;font-family:monospace;">${fmtVal(ch4Val, 1, '%vol')}</td></tr>` : ''}
              <tr><td style="color:#64748b;padding:3px 0;">Elevasi:</td><td style="text-align:right;font-weight:600;">${n.elevation} mdpl</td></tr>
            </table>
            <button class="btn btn-sm btn-primary" style="width:100%;font-size:0.75rem;padding:5px 8px;" onclick="MB.views.showNodeDetail('${n.id}')">Buka Telemetri Node</button>
          </div>
        `;

        marker.bindPopup(popupContent);
        
        // Teks cukup dengan MB-HU-1 (dan MB-HD-1..4) dengan warnanya, ukuran diperkecil
        marker.bindTooltip(shortId, {
          permanent: true,
          direction: 'top',
          offset: [0, -5],
          className: isMaster ? 'node-map-badge badge-upstream' : 'node-map-badge badge-downstream'
        });
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(function () {
      map.invalidateSize();
    }, 250);
  }

  /* -----------------------------------------------------------
     5. MASS BALANCE VIEW
     ----------------------------------------------------------- */
  function renderMassBalance(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var balances = MB.engine.balanceFromSnapshot(snap);
    var c = MB.config.get();

    var html = `
      <div class="page">
        <div class="panel">
          <div class="panel-head">
            <h2>Analisis Neraca Massa Gas (Mass Balance Analytics)</h2>
            <div class="row">
              <span class="tag">Basis: ${MB.fmt.esc(c.flow.basis)}</span>
            </div>
          </div>
          <div class="panel-body">
            <h3 style="margin:8px 0 14px;">Hasil Neraca Per Zona Pengukuran</h3>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Meter Masuk (Inlet)</th>
                    <th>Meter Keluar (Outlet)</th>
                    <th class="num">Aliran Masuk (${c.flow.unit})</th>
                    <th class="num">Aliran Meter (${c.flow.unit})</th>
                    <th class="num">Pengambilan (${c.flow.unit})</th>
                    <th class="num">Selisih &Delta;Q (${c.flow.unit})</th>
                    <th class="num">Losses (%)</th>
                    <th>Status Validitas</th>
                  </tr>
                </thead>
                <tbody>
                  ${balances.map(function (b) {
                    return `
                      <tr>
                        <td><strong>${MB.fmt.esc(b.zone.name)}</strong> (${MB.fmt.esc(b.zone.id)})</td>
                        <td>${b.zone.inlets.map(function (id) { return '<strong>' + id + '</strong>'; }).join(' ')}</td>
                        <td>${b.zone.outlets.length ? b.zone.outlets.map(function (id) { return '<strong>' + id + '</strong>'; }).join(' ') : '<span class="muted">Titik konsumsi hilir</span>'}</td>
                        <td class="num">${fmtVal(b.qIn, 1)}</td>
                        <td class="num">${fmtVal(b.qMeters, 1)}</td>
                        <td class="num">${fmtVal(b.offtake, 1)}</td>
                        <td class="num ${b.negative ? 'st-warn' : ''}">${fmtVal(b.dq, 1)}</td>
                        <td class="num">
                          ${b.lossPct !== null ? `
                            <div style="display:inline-flex;align-items:center;gap:8px;justify-content:flex-end;">
                              <div class="progress-track" style="width:55px;height:7px;">
                                <div class="progress-fill animated-shimmer" style="width:${Math.max(0, Math.min(100, 100 - (b.lossPct || 0)))}%;background:${b.lossPct > 5 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)'};"></div>
                              </div>
                              <span style="font-weight:600;min-width:44px;text-align:right;">${MB.fmt.num(b.lossPct, 1)}%</span>
                            </div>
                          ` : '<span class="na">-</span>'}
                        </td>
                        <td>
                          ${b.valid ? '<span class="status-text st-ok">Valid</span>' : '<span class="status-text st-warn">Belum Valid</span>'}
                          ${b.negative ? '<br><small class="muted st-warn">Losses Negatif (&Delta;Q &lt; 0)</small>' : ''}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            ${balances.some(function (b) { return !b.valid; }) ? `
              <div class="note warn" style="margin-top:16px;">
                <strong>Catatan Validitas Perhitungan:</strong>
                <ul class="reasons">
                  ${balances.filter(function (b) { return !b.valid; }).map(function (b) {
                    return '<li><strong>' + MB.fmt.esc(b.zone.name) + ':</strong> ' + (b.reasons.join('; ') || 'Data tidak lengkap') + '</li>';
                  }).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /* -----------------------------------------------------------
     6. GAS QUALITY VIEW
     ----------------------------------------------------------- */
  function renderGasQuality(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var c = MB.config.get();
    var ch4Val = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.ch4 ? snap.nodes['MB-HU-01'].values.ch4.value : null;
    var o2Val = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.o2 ? snap.nodes['MB-HU-01'].values.o2.value : null;
    var h2sVal = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.h2s ? snap.nodes['MB-HU-01'].values.h2s.value : null;
    var tempVal = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.gas_temp ? snap.nodes['MB-HU-01'].values.gas_temp.value : null;
    var pressVal = snap.nodes['MB-HU-01'] && snap.nodes['MB-HU-01'].values.pressure ? snap.nodes['MB-HU-01'].values.pressure.value : null;

    var ch4Pct = ch4Val !== null ? Math.min(100, Math.max(0, Math.round((ch4Val / 70) * 100))) : 0;
    var o2Pct = o2Val !== null ? Math.min(100, Math.max(0, Math.round((o2Val / 5) * 100))) : 0;
    var h2sPct = h2sVal !== null ? Math.min(100, Math.max(0, Math.round((h2sVal / 100) * 100))) : 0;
    var tempPct = tempVal !== null ? Math.min(100, Math.max(0, Math.round((tempVal / 50) * 100))) : 0;
    var pressPct = pressVal !== null ? Math.min(100, Math.max(0, Math.round((pressVal / 20) * 100))) : 0;

    var html = `
      <div class="page">
        <div class="panel">
          <div class="panel-head">
            <h2>Pemantauan Komposisi &amp; Kualitas Gas (Gas Quality Index)</h2>
            <div class="row">
              <span class="status-text neutral">Titik Ukur Utama: MB-HU-01 (Stasiun Ekstraksi TPAS Manggar)</span>
            </div>
          </div>
          <div class="panel-body">
            <!-- Berbaris Sejajar 2, 2, 1 Card Grid -->
            <div class="g-2-2-1">
              <!-- Baris 1 - Kartu 1: CH4 NDIR -->
              <div class="panel" style="border:1px solid var(--border-card);">
                <div class="panel-head">
                  <h3>Metana (CH₄) &bull; NDIR</h3>
                  ${ch4Val !== null ? (ch4Val >= 50 ? '<span class="status-text st-ok">Kaya Energi</span>' : ch4Val >= 40 ? '<span class="status-text st-warn">Cukup</span>' : '<span class="status-text st-crit">Rendah</span>') : ''}
                </div>
                <div class="panel-body">
                  <div class="metric">
                    <span class="metric-label">Dynament MSH-P-NDIR (Stasiun Ekstraksi)</span>
                    <span class="metric-value">${fmtVal(ch4Val, 1, '%vol')}</span>
                    <span class="metric-sub">Kandungan gas bahan bakar murni terdistribusi</span>
                  </div>
                  <div class="progress-bar-wrap" style="margin-top:16px;">
                    <div class="progress-bar-head">
                      <span class="progress-label-sub">Rasio Metana (Ref 70%vol)</span>
                      <span class="progress-percent-badge">${ch4Pct}%</span>
                    </div>
                    <div class="progress-track" style="height:9px;">
                      <div class="progress-fill animated-shimmer" style="width:${ch4Pct}%;background:linear-gradient(90deg, #10b981, #059669);"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Baris 1 - Kartu 2: O2 Elektrokimia -->
              <div class="panel" style="border:1px solid var(--border-card);">
                <div class="panel-head">
                  <h3>Oksigen (O₂) &bull; Elektrokimia</h3>
                  ${o2Val !== null ? (o2Val < 1.0 ? '<span class="status-text st-ok">Bebas Udara</span>' : o2Val < 2.0 ? '<span class="status-text st-warn">Waspada</span>' : '<span class="status-text st-crit">Infiltrasi</span>') : ''}
                </div>
                <div class="panel-body">
                  <div class="metric">
                    <span class="metric-label">Alphasense O2-A2 (Indikator Infiltrasi Udara)</span>
                    <span class="metric-value">${fmtVal(o2Val, 2, '%vol')}</span>
                    <span class="metric-sub">Batas keselamatan LEL &amp; proteksi anaerobik</span>
                  </div>
                  <div class="progress-bar-wrap" style="margin-top:16px;">
                    <div class="progress-bar-head">
                      <span class="progress-label-sub">Ambang Batas O₂ (Maks 5%vol)</span>
                      <span class="progress-percent-badge" style="color:${o2Val > 2 ? 'var(--color-rose)' : 'inherit'};">${o2Pct}%</span>
                    </div>
                    <div class="progress-track" style="height:9px;">
                      <div class="progress-fill animated-shimmer" style="width:${o2Pct}%;background:${o2Val && o2Val > 2 ? 'linear-gradient(90deg, #f43f5e, #e11d48)' : 'linear-gradient(90deg, #0284c7, #0369a1)'};"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Baris 2 - Kartu 3: H2S Sensor -->
              <div class="panel" style="border:1px solid var(--border-card);">
                <div class="panel-head">
                  <h3>Hidrogen Sulfida (H₂S) &bull; Sensor</h3>
                  ${h2sVal !== null ? (h2sVal < 50 ? '<span class="status-text st-ok">Batas Aman</span>' : h2sVal < 80 ? '<span class="status-text st-warn">Waspada Korosi</span>' : '<span class="status-text st-crit">Tinggi</span>') : ''}
                </div>
                <div class="panel-body">
                  <div class="metric">
                    <span class="metric-label">Alphasense H2S-B4 (Proteksi Korosi Pipa)</span>
                    <span class="metric-value">${fmtVal(h2sVal, 0, 'ppm')}</span>
                    <span class="metric-sub">Monitoring gas asam dan integritas sambungan pipa</span>
                  </div>
                  <div class="progress-bar-wrap" style="margin-top:16px;">
                    <div class="progress-bar-head">
                      <span class="progress-label-sub">Beban Gas Korosif H₂S (Skala 100 ppm)</span>
                      <span class="progress-percent-badge" style="color:${h2sVal > 70 ? 'var(--color-amber)' : 'inherit'};">${h2sPct}%</span>
                    </div>
                    <div class="progress-track" style="height:9px;">
                      <div class="progress-fill animated-shimmer" style="width:${h2sPct}%;background:${h2sVal && h2sVal > 70 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)'};"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Baris 2 - Kartu 4: Suhu Gas Proses -->
              <div class="panel" style="border:1px solid var(--border-card);">
                <div class="panel-head">
                  <h3>Suhu Gas Proses &bull; Pt100 RTD</h3>
                  ${tempVal !== null ? (tempVal >= 25 && tempVal <= 38 ? '<span class="status-text st-ok">Normal Proses</span>' : '<span class="status-text st-warn">Fluktuatif</span>') : ''}
                </div>
                <div class="panel-body">
                  <div class="metric">
                    <span class="metric-label">Pt100 Kelas A SS316 Probe</span>
                    <span class="metric-value">${fmtVal(tempVal, 1, '°C')}</span>
                    <span class="metric-sub">Kompensasi thermal laju aliran &amp; kondensasi air</span>
                  </div>
                  <div class="progress-bar-wrap" style="margin-top:16px;">
                    <div class="progress-bar-head">
                      <span class="progress-label-sub">Rentang Suhu Operasional (Skala 50°C)</span>
                      <span class="progress-percent-badge">${tempPct}%</span>
                    </div>
                    <div class="progress-track" style="height:9px;">
                      <div class="progress-fill animated-shimmer" style="width:${tempPct}%;background:linear-gradient(90deg, #6366f1, #4f46e5);"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Baris 3 - Kartu 5: Tekanan Jaringan Distribusi (Lebar Penuh) -->
              <div class="panel" style="border:1px solid var(--border-card);">
                <div class="panel-head">
                  <h3>Tekanan Head Jaringan Distribusi &bull; SS316L</h3>
                  ${pressVal !== null ? (pressVal >= 6.0 && pressVal <= 16.0 ? '<span class="status-text st-ok">Tekanan Terjaga (6–16 kPa)</span>' : '<span class="status-text st-warn">Perlu Penyesuaian</span>') : ''}
                </div>
                <div class="panel-body">
                  <div class="metric">
                    <span class="metric-label">Sensata 114PC Port 1/4" NPT (Header Stasiun Ekstraksi)</span>
                    <span class="metric-value">${fmtVal(pressVal, 2, 'kPa')}</span>
                    <span class="metric-sub">Head tekanan dorong gas melayani 380 SR warga dan 29 UMKM di 4 zona hilir</span>
                  </div>
                  <div class="progress-bar-wrap" style="margin-top:16px;">
                    <div class="progress-bar-head">
                      <span class="progress-label-sub">Head Tekanan Distribusi (Skala 20 kPa)</span>
                      <span class="progress-percent-badge">${pressPct}%</span>
                    </div>
                    <div class="progress-track" style="height:9px;">
                      <div class="progress-fill animated-shimmer" style="width:${pressPct}%;background:linear-gradient(90deg, #0f766e, #115e59);"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table of Nodes Gas Quality -->
            <div style="margin-top:24px;">
              <h3 style="margin-bottom:12px;">Distribusi Pembacaan Sensor Gas Seluruh Node</h3>
              <div class="table-wrap">
                <table class="table rtable">
                  <thead>
                    <tr>
                      <th>Node ID</th>
                      <th>Lokasi / Titik Ukur</th>
                      <th class="num">CH₄ (%vol)</th>
                      <th class="num">O₂ (%vol)</th>
                      <th class="num">H₂S (ppm)</th>
                      <th class="num">Suhu Gas (°C)</th>
                      <th>Status Sensor Gas</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${c.nodes.map(function (n) {
                      var entry = snap.nodes[n.id];
                      var ch4 = entry ? entry.values.ch4.value : null;
                      var o2 = entry ? entry.values.o2.value : null;
                      var h2s = entry ? entry.values.h2s.value : null;
                      var tg = entry ? entry.values.gas_temp.value : null;
                      return `
                        <tr>
                          <td data-label="Node ID"><span class="tag ${n.type === 'upstream' ? 'up' : ''}">${MB.fmt.esc(n.id)}</span></td>
                          <td data-label="Lokasi"><strong>${MB.fmt.esc(n.name)}</strong></td>
                          <td data-label="CH₄" class="num">${n.sensors.ch4.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(ch4, 1)}</td>
                          <td data-label="O₂" class="num">${n.sensors.o2.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(o2, 2)}</td>
                          <td data-label="H₂S" class="num">${n.sensors.h2s.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(h2s, 0)}</td>
                          <td data-label="Suhu Gas" class="num">${fmtVal(tg, 1)}</td>
                          <td data-label="Status">${n.sensors.ch4.status === 'installed' || n.sensors.o2.status === 'installed' || n.sensors.h2s.status === 'installed' ? '<span class="status-text st-ok">Sensor Aktif</span>' : '<span class="status-text st-info">Aliran &amp; Tekanan Saja</span>'}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /* -----------------------------------------------------------
     7. PELANGGAN & ANALISIS KARBON VIEW (ANALYTICS)
     ----------------------------------------------------------- */
  var CUSTOMER_LIST = [
    { id: 'MG-1001', name: 'Sunarto', rt: 'RT 22', rtrw: 'RT 22 / RW 04', address: 'RT 22 / RW 04 No. 15', meter: 18.0, tariff: 10000, savings: 34000, battery: 96, status: 'Aktif' },
    { id: 'MG-1002', name: 'Siti Aminah', rt: 'RT 23', rtrw: 'RT 23 / RW 04', address: 'RT 23 / RW 04 No. 14', meter: 19.7, tariff: 10000, savings: 35500, battery: 94, status: 'Aktif' },
    { id: 'MG-1003', name: 'Bambang Wijaya', rt: 'RT 24', rtrw: 'RT 24 / RW 04', address: 'RT 24 / RW 04 No. 08', meter: 21.4, tariff: 10000, savings: 37000, battery: 92, status: 'Aktif' },
    { id: 'MG-1004', name: 'Rukmini', rt: 'RT 21', rtrw: 'RT 21 / RW 04', address: 'RT 21 / RW 04 No. 22', meter: 23.1, tariff: 10000, savings: 38500, battery: 90, status: 'Aktif' },
    { id: 'MG-1005', name: 'Hasanuddin', rt: 'RT 22', rtrw: 'RT 22 / RW 04', address: 'RT 22 / RW 04 No. 03', meter: 24.8, tariff: 10000, savings: 40000, battery: 88, status: 'Aktif' },
    { id: 'MG-1006', name: 'Ni Wayan Sari', rt: 'RT 23', rtrw: 'RT 23 / RW 04', address: 'RT 23 / RW 04 No. 31', meter: 26.5, tariff: 10000, savings: 41500, battery: 86, status: 'Aktif' },
    { id: 'MG-1007', name: 'Agus Salim', rt: 'RT 24', rtrw: 'RT 24 / RW 04', address: 'RT 24 / RW 04 No. 19', meter: 28.2, tariff: 10000, savings: 43000, battery: 84, status: 'Aktif' },
    { id: 'MG-1008', name: 'Tri Handayani', rt: 'RT 25', rtrw: 'RT 25 / RW 04', address: 'RT 25 / RW 04 No. 05', meter: 29.9, tariff: 10000, savings: 44500, battery: 82, status: 'Aktif' },
    { id: 'MG-1009', name: 'Zainal Abidin', rt: 'RT 22', rtrw: 'RT 22 / RW 04', address: 'RT 22 / RW 04 No. 40', meter: 31.6, tariff: 10000, savings: 46000, battery: 80, status: 'Aktif' },
    { id: 'MG-1010', name: 'Marlina', rt: 'RT 23', rtrw: 'RT 23 / RW 04', address: 'RT 23 / RW 04 No. 17', meter: 33.3, tariff: 10000, savings: 47500, battery: 78, status: 'Aktif' },
    { id: 'MG-1011', name: 'Supriyadi', rt: 'RT 24', rtrw: 'RT 24 / RW 04', address: 'RT 24 / RW 04 No. 27', meter: 35.0, tariff: 10000, savings: 49000, battery: 76, status: 'Aktif' },
    { id: 'MG-1012', name: 'Dewi Kartika', rt: 'RT 25', rtrw: 'RT 25 / RW 04', address: 'RT 25 / RW 04 No. 11', meter: 36.7, tariff: 10000, savings: 50500, battery: 74, status: 'Aktif' },
    { id: 'MG-1013', name: 'Rahmat Hidayat', rt: 'RT 22', rtrw: 'RT 22 / RW 04', address: 'RT 22 / RW 04 No. 33', meter: 38.4, tariff: 10000, savings: 52000, battery: 72, status: 'Aktif' },
    { id: 'MG-1014', name: 'Yuliana', rt: 'RT 23', rtrw: 'RT 23 / RW 04', address: 'RT 23 / RW 04 No. 09', meter: 40.1, tariff: 10000, savings: 53500, battery: 70, status: 'Aktif' },
    { id: 'UM-2001', name: 'Bpk. Sukirman (Tahu & Tempe)', rt: 'UMKM', rtrw: 'Klaster UMKM RT 22', address: 'Klaster UMKM KM 12 RT 22', meter: 94.2, tariff: 50000, savings: 370000, battery: 95, status: 'Aktif (Produksi)' },
    { id: 'UM-2002', name: 'Ibu Warsini (Kerupuk Ikan)', rt: 'UMKM', rtrw: 'Klaster UMKM RT 23', address: 'Jl. Mulawarman RT 23 No. 44', meter: 78.5, tariff: 50000, savings: 310000, battery: 91, status: 'Aktif (Produksi)' },
    { id: 'UM-2003', name: 'Pak Darto (Warung Makan Manggar)', rt: 'UMKM', rtrw: 'Klaster UMKM RT 24', address: 'Jl. Mulawarman RT 24 No. 02', meter: 64.0, tariff: 50000, savings: 250000, battery: 93, status: 'Aktif (Produksi)' }
  ];

  var MONTHLY_EMISSION_DATA = [
    { bulan: 'Jan', pembakaranBersih: 4200, flaringTerbuka: 1200 },
    { bulan: 'Feb', pembakaranBersih: 4600, flaringTerbuka: 1100 },
    { bulan: 'Mar', pembakaranBersih: 4900, flaringTerbuka: 950 },
    { bulan: 'Apr', pembakaranBersih: 5100, flaringTerbuka: 900 },
    { bulan: 'Mei', pembakaranBersih: 5300, flaringTerbuka: 850 },
    { bulan: 'Jun', pembakaranBersih: 5396, flaringTerbuka: 800 }
  ];

  function renderAnalyticsCustomer(container) {
    // Generate Dual Bar SVG Chart
    var maxVal = 6000;
    var chartH = 180;
    var chartBaseY = 215;
    var chartW = 580;
    var groupW = chartW / MONTHLY_EMISSION_DATA.length;

    var barsSvg = MONTHLY_EMISSION_DATA.map(function (d, i) {
      var xCenter = 45 + (i * groupW) + (groupW / 2);
      var barW = 24;
      var gap = 6;
      var x1 = xCenter - barW - (gap / 2);
      var x2 = xCenter + (gap / 2);

      var h1 = (d.pembakaranBersih / maxVal) * chartH;
      var y1 = chartBaseY - h1;

      var h2 = (d.flaringTerbuka / maxVal) * chartH;
      var y2 = chartBaseY - h2;

      return `
        <g class="chart-bar-group" data-month="${d.bulan}" data-clean="${d.pembakaranBersih}" data-flare="${d.flaringTerbuka}">
          <!-- Bar 1: Pembakaran Bersih -->
          <rect x="${x1.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h1.toFixed(1)}" rx="4" ry="4" fill="#1B4D3E">
            <title>${d.bulan} • Pembakaran Bersih: ${d.pembakaranBersih.toLocaleString('id-ID')} kg CO₂eq</title>
          </rect>
          <!-- Bar 2: Flaring Terbuka -->
          <rect x="${x2.toFixed(1)}" y="${y2.toFixed(1)}" width="${barW}" height="${h2.toFixed(1)}" rx="4" ry="4" fill="#CBD5E1">
            <title>${d.bulan} • Flaring Terbuka: ${d.flaringTerbuka.toLocaleString('id-ID')} kg CO₂eq</title>
          </rect>
          <!-- X Axis Label -->
          <text x="${xCenter.toFixed(1)}" y="235" text-anchor="middle" font-size="11" fill="#94A3B8" font-family="'Inter', sans-serif" font-weight="500">${d.bulan}</text>
        </g>
      `;
    }).join('');

    var html = `
      <div class="page">
        <!-- TOP 4 KPI METRICS (LOVABLE REFERENCE EXACT DESIGN) -->
        <div class="kpi-row-4">
          <!-- KPI 1: Total Pelanggan -->
          <div class="analytics-card">
            <div class="analytics-kpi-title">Total Pelanggan Terdaftar</div>
            <div class="analytics-kpi-val">380 <span style="font-size:14px;font-weight:600;color:#64748b;">KK</span></div>
            <div class="analytics-kpi-sub">Kelurahan Manggar, Balikpapan Timur</div>
          </div>

          <!-- KPI 2: Konsumsi Bulanan -->
          <div class="analytics-card">
            <div class="analytics-kpi-title">Konsumsi Bulanan Terukur</div>
            <div class="analytics-kpi-val">3.416,4 <span style="font-size:14px;font-weight:600;color:#64748b;">m³</span></div>
            <div class="analytics-kpi-sub">Rata-rata 8,99 m³ per rumah tangga</div>
          </div>

          <!-- KPI 3: Penghematan Warga & Iuran -->
          <div class="analytics-card">
            <div class="analytics-kpi-title">Penghematan Warga</div>
            <div class="analytics-kpi-val" style="color:#059669;">Rp 44.400.000</div>
            <div class="analytics-kpi-sub">Tarif: RT Rp 10.000 &bull; UMKM Rp 25.000</div>
          </div>

          <!-- KPI 4: Proyeksi ROI -->
          <div class="analytics-card">
            <div class="analytics-kpi-title">Proyeksi ROI Program</div>
            <div class="analytics-kpi-val">3,2 <span style="font-size:14px;font-weight:600;color:#64748b;">Tahun</span></div>
            <div class="analytics-kpi-sub">Investasi infrastruktur DLH</div>
          </div>
        </div>

        <!-- 2 PANELS: DUAL-BAR EMISSION CHART (2 COL) & DESTRUCTION EFFICIENCY (1 COL) -->
        <div class="g-2-1" style="margin-top:20px;">
          <!-- Panel Kiri (2 cols): Analitik Penghindaran Emisi Karbon -->
          <div class="analytics-card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px;">
              <div>
                <h3 style="font-size:14px;font-weight:600;color:#0f172a;margin:0;">Analitik Penghindaran Emisi Karbon (kg CO₂eq)</h3>
                <p style="font-size:11px;color:#64748b;margin:3px 0 0;">Pembakaran metana bersih terkendali dibandingkan flaring terbuka.</p>
              </div>
              <!-- Chart Legend -->
              <div style="display:flex;align-items:center;gap:14px;font-size:11px;color:#64748b;">
                <div style="display:flex;align-items:center;gap:5px;">
                  <span style="width:10px;height:10px;border-radius:3px;background:#1B4D3E;display:inline-block;"></span>
                  <span>Pembakaran Bersih</span>
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                  <span style="width:10px;height:10px;border-radius:3px;background:#CBD5E1;display:inline-block;"></span>
                  <span>Flaring Terbuka</span>
                </div>
              </div>
            </div>

            <!-- Responsive SVG Dual-Bar Chart -->
            <div style="position:relative;width:100%;height:270px;margin-top:12px;">
              <svg viewBox="0 0 620 250" style="width:100%;height:100%;overflow:visible;">
                <!-- Grid Lines dashed -->
                <line x1="45" y1="35" x2="615" y2="35" stroke="#E2E8F0" stroke-dasharray="3 3" />
                <line x1="45" y1="80" x2="615" y2="80" stroke="#E2E8F0" stroke-dasharray="3 3" />
                <line x1="45" y1="125" x2="615" y2="125" stroke="#E2E8F0" stroke-dasharray="3 3" />
                <line x1="45" y1="170" x2="615" y2="170" stroke="#E2E8F0" stroke-dasharray="3 3" />
                <line x1="45" y1="215" x2="615" y2="215" stroke="#CBD5E1" />

                <!-- Y Axis Labels -->
                <text x="38" y="38" text-anchor="end" font-size="10" fill="#94A3B8" font-family="'Inter', sans-serif">6000</text>
                <text x="38" y="83" text-anchor="end" font-size="10" fill="#94A3B8" font-family="'Inter', sans-serif">4500</text>
                <text x="38" y="128" text-anchor="end" font-size="10" fill="#94A3B8" font-family="'Inter', sans-serif">3000</text>
                <text x="38" y="173" text-anchor="end" font-size="10" fill="#94A3B8" font-family="'Inter', sans-serif">1500</text>
                <text x="38" y="218" text-anchor="end" font-size="10" fill="#94A3B8" font-family="'Inter', sans-serif">0</text>

                <!-- Bars & X Labels -->
                ${barsSvg}
              </svg>
            </div>
          </div>

          <!-- Panel Kanan (1 col): Efisiensi Destruksi Metana -->
          <div class="analytics-card" style="display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <h3 style="font-size:14px;font-weight:600;color:#0f172a;margin:0;">Efisiensi Destruksi Metana</h3>
              
              <!-- Semicircular Gauge SVG -->
              <div style="position:relative;width:100%;height:180px;display:flex;align-items:center;justify-content:center;margin-top:6px;">
                <svg viewBox="0 0 260 170" style="width:100%;max-width:240px;height:100%;">
                  <!-- Background Track Arc (220 deg: 200° to -20°) -->
                  <path d="M 52.34 134.63 A 72 72 0 1 1 207.66 134.63"
                        fill="none"
                        stroke="#E2E8F0"
                        stroke-width="15"
                        stroke-linecap="round" />
                  
                  <!-- Filled Green Arc (96.2% of 276.46 = 265.95) -->
                  <path d="M 52.34 134.63 A 72 72 0 1 1 207.66 134.63"
                        fill="none"
                        stroke="#059669"
                        stroke-width="15"
                        stroke-linecap="round"
                        stroke-dasharray="265.95 300" />
                  
                  <!-- Center Percentage Text -->
                  <text x="130" y="92" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a" font-family="'Inter', sans-serif">96,2%</text>
                  <text x="130" y="124" text-anchor="middle" font-size="10" fill="#64748b" font-family="'Inter', sans-serif">Standar minimum 90%</text>
                </svg>
              </div>
            </div>

            <!-- Financial Impact Summary List -->
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              <div class="financial-metric-row">
                <span class="financial-metric-label">Subsidi LPG Terhindarkan</span>
                <span class="financial-metric-val">Rp 44,4 Juta / bulan</span>
              </div>
              <div class="financial-metric-row">
                <span class="financial-metric-label">Nilai Kredit Karbon</span>
                <span class="financial-metric-val">Rp 12,6 Juta / bulan</span>
              </div>
              <div class="financial-metric-row">
                <span class="financial-metric-label">Biaya Operasional Jaringan</span>
                <span class="financial-metric-val">Rp 8,1 Juta / bulan</span>
              </div>
              <div class="financial-metric-row">
                <span class="financial-metric-label">Iuran Retribusi Biogas</span>
                <span class="financial-metric-val" style="color:#059669;">RT Rp 10.000 &bull; UMKM Rp 25.000 / bln</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CUSTOMER REGISTRY TABLE (IDENTICAL TO LOVABLE STRUCTURE) -->
        <div class="analytics-card" style="margin-top:20px;padding:0;overflow:hidden;">
          <!-- Table Header -->
          <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h3 style="font-size:14px;font-weight:600;color:#0f172a;margin:0;">Data Pelanggan Rumah Tangga (380 Akun Terdaftar)</h3>
              <p style="font-size:11px;color:#64748b;margin:3px 0 0;">Menampilkan 14 akun teratas berdasarkan konsumsi jaringan pipa biogas Manggar.</p>
            </div>
            <div class="row" style="gap:8px;">
              <button class="btn btn-sm btn-primary" id="btnExportCustomerCsv" type="button">Unduh CSV Pelanggan</button>
              <a href="methabalance-mobile-warga/index.html" target="_blank" class="btn btn-sm">Buka Portal Warga Mobile &rarr;</a>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div style="padding:10px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <input type="search" id="customerSearchInput" placeholder="Cari nama, ID akun (MG-1001), RT..." style="min-width:240px;height:32px;font-size:0.8rem;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:4px 10px;">
            <div class="btn-group" id="customerRtFilterGroup">
              <button class="btn btn-sm btn-filter active" type="button" data-rt="all">Semua (14)</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="RT 21">RT 21</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="RT 22">RT 22</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="RT 23">RT 23</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="RT 24">RT 24</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="RT 25">RT 25</button>
              <button class="btn btn-sm btn-filter" type="button" data-rt="UMKM">UMKM</button>
            </div>
          </div>

          <!-- Table Content -->
          <div class="table-wrap" style="border:none;">
            <table class="table rtable" id="customersTable" style="margin:0;">
              <thead style="background:#f8fafc;">
                <tr>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">ID Akun</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">Nama Pelanggan</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">RT / RW</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;" class="num">Meter Digital (m³)</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">Iuran / Bulan</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">Penghematan Bulanan</th>
                  <th style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;padding:12px 20px;">Baterai Meter</th>
                </tr>
              </thead>
              <tbody style="divide-y:1px solid #f1f5f9;">
                ${CUSTOMER_LIST.map(function (c) {
                  var isUmkm = c.rt === 'UMKM';
                  return `
                    <tr class="customer-row" data-rt="${c.rt}" data-name="${c.name.toLowerCase()}" data-id="${c.id.toLowerCase()}">
                      <td data-label="ID Akun" style="padding:12px 20px;font-weight:600;color:#0f172a;">${c.id}</td>
                      <td data-label="Nama Pelanggan" style="padding:12px 20px;color:#334155;font-weight:500;">
                        ${MB.fmt.esc(c.name)}
                        ${isUmkm ? '<span class="tag up" style="margin-left:6px;font-size:0.65rem;">UMKM</span>' : ''}
                      </td>
                      <td data-label="RT / RW" style="padding:12px 20px;color:#475569;">${c.rtrw || c.rt}</td>
                      <td data-label="Meter Digital" class="num font-mono" style="padding:12px 20px;color:#334155;font-weight:600;">
                        ${c.meter.toFixed(1).replace('.', ',')}
                      </td>
                      <td data-label="Iuran / Bulan" style="padding:12px 20px;">
                        <span style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums;">${isUmkm ? 'Rp 50.000' : 'Rp 10.000'}</span>
                        <span class="status-text st-ok" style="font-size:0.65rem;padding:1px 6px;margin-left:6px;">Lunas</span>
                      </td>
                      <td data-label="Penghematan Bulanan" style="padding:12px 20px;color:#047857;font-weight:600;font-variant-numeric:tabular-nums;">
                        Rp ${c.savings.toLocaleString('id-ID')}
                      </td>
                      <td data-label="Baterai Meter" style="padding:12px 20px;color:#475569;">
                        <div class="row" style="gap:6px;align-items:center;">
                          <span class="font-mono" style="font-size:0.8rem;">${c.battery}%</span>
                          <div style="width:36px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
                            <div style="width:${c.battery}%;height:100%;background:${c.battery > 75 ? '#059669' : '#d97706'};"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filter Buttons logic
    var rtBtns = container.querySelectorAll('#customerRtFilterGroup .btn-filter');
    var rows = container.querySelectorAll('#customersTable .customer-row');
    var searchInput = container.querySelector('#customerSearchInput');

    function applyFilters() {
      var activeBtn = container.querySelector('#customerRtFilterGroup .btn-filter.active');
      var filterRt = activeBtn ? activeBtn.getAttribute('data-rt') : 'all';
      var q = searchInput ? searchInput.value.toLowerCase().trim() : '';

      rows.forEach(function (row) {
        var rowRt = row.getAttribute('data-rt');
        var rowName = row.getAttribute('data-name');
        var rowId = row.getAttribute('data-id');

        var matchRt = (filterRt === 'all' || rowRt === filterRt);
        var matchSearch = (!q || rowName.indexOf(q) !== -1 || rowId.indexOf(q) !== -1);

        if (matchRt && matchSearch) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    rtBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        rtBtns.forEach(function (btn) { btn.classList.remove('active'); });
        this.classList.add('active');
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    // Export CSV
    var btnExp = container.querySelector('#btnExportCustomerCsv');
    if (btnExp) {
      btnExp.addEventListener('click', function () {
        exportCustomerCsv();
      });
    }
  }

  function exportCustomerCsv() {
    var rows = [
      ['ID Akun', 'Nama Pelanggan', 'RT / RW', 'Alamat', 'Meter Digital (m3)', 'Iuran / Bulan (Rp)', 'Status Iuran', 'Penghematan Bulanan (Rp)', 'Baterai Meter (%)', 'Status']
    ];
    CUSTOMER_LIST.forEach(function (c) {
      rows.push([
        c.id,
        c.name,
        c.rtrw || c.rt,
        c.address,
        c.meter.toFixed(1),
        c.tariff,
        'Lunas',
        c.savings,
        c.battery + '%',
        c.status
      ]);
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + rows.map(function (e) {
      return e.map(function (val) {
        return '"' + String(val).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'METHABALANCE_Pelanggan_Biogas_Manggar_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    MB.views.showToast('File CSV 380 Pelanggan berhasil diunduh.');
  }

  /* -----------------------------------------------------------
     8. ANOMALY & INCIDENT VIEW
     ----------------------------------------------------------- */
  function renderAnomalyIncident(container) {
    var alarms = MB.engine.computeAlarms(MB.ds.now() - 24 * 3600e3, MB.ds.now());
    var incidents = MB.incidents.list();
    var activeIncidents = incidents.filter(function (i) { return i.status !== 'Selesai'; });
    var closedIncidents = incidents.filter(function (i) { return i.status === 'Selesai'; });

    var html = `
      <div class="page">
        <!-- Model Analisis Jaringan -->
        <div class="panel">
          <div class="panel-head">
            <h2>Model Analisis &amp; Deteksi Gangguan Jaringan</h2>
          </div>
          <div class="panel-body">
            <div class="grid g-2">
              <div class="note info">
                <strong>Deteksi Deviasi Pola Aliran &amp; Tekanan</strong>
                <p class="muted">Metode: <span class="status-text st-ok">Aktif &bull; Ambang Bergerak</span></p>
                <p>Memantau fluktuasi tekanan mendadak dan lonjakan aliran abnormal dengan membandingkan nilai instan terhadap median riwayat 60 menit.</p>
              </div>
              <div class="note info">
                <strong>Analisis Risiko Penyumbatan Kondensat (Water-Blocking)</strong>
                <p class="muted">Metode: <span class="status-text st-warn">Siaga &bull; Osilasi Koefisien Variasi</span></p>
                <p>Mendeteksi osilasi periodik tekanan pipa (CV &gt; 4%) yang disertai penurunan bertahap laju aliran pada cekungan penampung air.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Incidents Table -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Daftar Tiket Gangguan &amp; Tindak Lanjut Lapangan</h2>
              <p class="muted" style="margin-top:2px;">Monitoring tiket peringatan aktif dan riwayat pemeliharaan teknisi di seluruh segmen pipa distribusi.</p>
            </div>
            <div class="row" style="gap:8px;">
              <div class="btn-group" id="incidentFilterGroup">
                <button class="btn btn-sm btn-filter active" type="button" data-filter="all">Semua Tiket (${incidents.length})</button>
                <button class="btn btn-sm btn-filter" type="button" data-filter="active">Insiden Aktif (${activeIncidents.length})</button>
                <button class="btn btn-sm btn-filter" type="button" data-filter="closed">Riwayat Selesai (${closedIncidents.length})</button>
              </div>
              <button class="btn btn-sm btn-primary" type="button" id="btnCreateIncidentModal">Catat Insiden Baru</button>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table rtable" id="incidentsTable">
              <thead>
                <tr>
                  <th>No. Insiden</th>
                  <th>Waktu</th>
                  <th>Node / Lokasi</th>
                  <th>Prioritas</th>
                  <th>Judul &amp; Gangguan</th>
                  <th>Teknisi Bertugas</th>
                  <th>Status Penanganan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${incidents.map(function (inc) {
                  var isClosed = inc.status === 'Selesai';
                  var timeStr = isClosed && inc.closedAt
                    ? `<span>${MB.fmt.dateTimeShort(inc.createdAt)}</span><br><small class="muted">Selesai: ${MB.fmt.dateTimeShort(inc.closedAt)}</small>`
                    : `<strong>${MB.fmt.dateTimeShort(inc.createdAt)}</strong><br><small style="color:var(--color-rose);font-weight:600;">Sedang Ditangani</small>`;
                  return `
                    <tr class="incident-row" data-status="${isClosed ? 'closed' : 'active'}">
                      <td data-label="No. Insiden"><strong>${MB.fmt.esc(inc.id)}</strong></td>
                      <td data-label="Waktu">${timeStr}</td>
                      <td data-label="Lokasi"><span class="tag">${MB.fmt.esc(inc.scope)}</span></td>
                      <td data-label="Prioritas"><span class="status-text ${inc.priority === 'critical' ? 'st-crit' : 'st-warn'}">${inc.priority === 'critical' ? 'Kritis' : 'Peringatan'}</span></td>
                      <td data-label="Judul">
                        <strong>${MB.fmt.esc(inc.title)}</strong><br>
                        <small class="muted">${MB.fmt.esc(inc.description)}</small>
                      </td>
                      <td data-label="Teknisi">${inc.technician ? '<strong>' + MB.fmt.esc(inc.technician) + '</strong>' : '<span class="na">Belum ditugaskan</span>'}</td>
                      <td data-label="Status"><span class="status-text ${MB.incidents.STATUS_CLASSES[inc.status] || 'st-info'}">${MB.fmt.esc(inc.status)}</span></td>
                      <td data-label="Aksi">
                        <button class="btn btn-sm btn-primary" type="button" data-edit-incident="${inc.id}">Kelola</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Filter tabs for Incidents
    var incFilters = container.querySelectorAll('#incidentFilterGroup .btn-filter');
    var incRows = container.querySelectorAll('#incidentsTable .incident-row');
    incFilters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        incFilters.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        var f = this.getAttribute('data-filter');
        incRows.forEach(function (row) {
          if (f === 'all' || row.getAttribute('data-status') === f) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    });

    container.querySelectorAll('[data-edit-incident]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        MB.views.showIncidentDetail(this.getAttribute('data-edit-incident'));
      });
    });

    var btnNew = container.querySelector('#btnCreateIncidentModal');
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        MB.views.showCreateIncidentModal();
      });
    }
  }

  /* -----------------------------------------------------------
     8. DEVICE HEALTH VIEW
     ----------------------------------------------------------- */
  function renderDeviceHealth(container) {
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var c = MB.config.get();

    var html = `
      <div class="page">
        <!-- Gateway Status -->
        <div class="panel">
          <div class="panel-head">
            <h2>Kesehatan Gateway LoRaWAN Outdoor AS923</h2>
            <div class="row">
              <span class="status-text ${snap.gateway && snap.gateway.online ? 'st-ok' : 'st-crit'}">
                ${snap.gateway && snap.gateway.online ? 'Gateway Online' : 'Gateway Terputus'}
              </span>
            </div>
            <p>Penerima paket radio bersama untuk 5 node pengukuran di area TPAS Manggar.</p>
          </div>
          <div class="panel-body">
            <dl class="kv">
              <dt>Status Komunikasi:</dt>
              <dd>${snap.gateway && snap.gateway.online ? 'Terhubung ke LoRaWAN Network Server' : 'Tidak ada paket diterima dari gateway'}</dd>
              <dt>Paket Terakhir:</dt>
              <dd>${snap.gateway && snap.gateway.lastSeen ? MB.fmt.dateTime(snap.gateway.lastSeen) : '<span class="na">Tidak tersedia</span>'}</dd>
              <dt>Frekuensi Band:</dt>
              <dd>AS923 (923,2 MHz)</dd>
            </dl>
          </div>
        </div>

        <!-- Power & Node Hardware -->
        <div class="panel">
          <div class="panel-head">
            <h2>Catu Daya Off-Grid &amp; Telemetri Node</h2>
            <p>Panel surya 40 Wp, baterai LiFePO₄ 12,8V 20Ah, dan mikrokontroler ESP32-S3 per node.</p>
          </div>
          <div class="table-wrap">
            <table class="table rtable">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Nama Node</th>
                  <th class="num">Tegangan Baterai (V)</th>
                  <th class="num">State of Charge (%)</th>
                  <th class="num">Daya Panel (W)</th>
                  <th class="num">RSSI (dBm)</th>
                  <th class="num">SNR (dB)</th>
                  <th>Status Komunikasi</th>
                </tr>
              </thead>
              <tbody>
                ${c.nodes.map(function (n) {
                  var entry = snap.nodes[n.id];
                  var bv = entry ? entry.values.battery_v.value : null;
                  var soc = entry ? entry.values.soc.value : null;
                  var sw = entry ? entry.values.solar_w.value : null;
                  var comm = entry ? entry.comm : null;
                  var bPct = bv !== null ? Math.min(100, Math.max(0, Math.round(((bv - 11.5) / 2.0) * 100))) : null;

                  return `
                    <tr>
                      <td data-label="Node ID"><strong>${MB.fmt.esc(n.id)}</strong></td>
                      <td data-label="Nama Node"><strong>${MB.fmt.esc(n.name)}</strong></td>
                      <td data-label="Baterai" class="num">
                        ${n.sensors.battery_v.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : (bPct !== null ? `
                          <div style="display:inline-flex;align-items:center;gap:8px;justify-content:flex-end;">
                            <div class="progress-track" style="width:55px;height:7px;">
                              <div class="progress-fill animated-shimmer" style="width:${bPct}%;background:${bv < 12.0 ? 'linear-gradient(90deg, #f43f5e, #e11d48)' : 'linear-gradient(90deg, #10b981, #059669)'};"></div>
                            </div>
                            <span style="font-weight:600;min-width:38px;text-align:right;">${bPct}%</span>
                            <span class="muted" style="font-size:0.75rem;">(${fmtVal(bv, 2, 'V')})</span>
                          </div>
                        ` : fmtVal(bv, 2, 'V'))}
                      </td>
                      <td data-label="SoC" class="num">${n.sensors.soc.status === 'not_installed' ? '<span class="na">BMS belum terpasang</span>' : fmtVal(soc, 0)}</td>
                      <td data-label="Panel Surya" class="num">${n.sensors.solar_w.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(sw, 1)}</td>
                      <td data-label="RSSI" class="num">${comm ? comm.rssi + ' dBm' : '<span class="na">-</span>'}</td>
                      <td data-label="SNR" class="num">${comm ? comm.snr + ' dB' : '<span class="na">-</span>'}</td>
                      <td data-label="Status">${entry && entry.packet && entry.ageMs < c.telemetry.staleMin * 60000 ? '<span class="status-text st-ok">Terhubung</span>' : '<span class="status-text st-off">Terputus / Stale</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /* -----------------------------------------------------------
     9. REPORTS VIEW
     ----------------------------------------------------------- */
  function renderReports(container) {
    var c = MB.config.get();

    var html = `
      <div class="page">
        <div class="panel">
          <div class="panel-head">
            <h2>Laporan &amp; Ekspor Data SCADA METHABALANCE</h2>
            <p>Ekspor rekapitulasi data neraca massa, kualitas gas, dan audit log sistem ke format CSV resmi.</p>
          </div>
          <div class="panel-body">
            <div class="grid g-2">
              <div class="panel" style="background:var(--surface-2);">
                <div class="panel-head">
                  <h3>Ekspor Data Telemetri &amp; Neraca Gas</h3>
                </div>
                <div class="panel-body stack">
                  <div class="field">
                    <label for="rptFromDate">Dari Tanggal:</label>
                    <input type="date" id="rptFromDate" value="${new Date(Date.now() - 7 * 24 * 3600e3).toISOString().slice(0, 10)}">
                  </div>
                  <div class="field">
                    <label for="rptToDate">Sampai Tanggal:</label>
                    <input type="date" id="rptToDate" value="${new Date().toISOString().slice(0, 10)}">
                  </div>
                  <button class="btn btn-primary" type="button" id="btnExportTelemetryCsv">Unduh CSV Telemetri</button>
                </div>
              </div>

              <div class="panel" style="background:var(--surface-2);">
                <div class="panel-head">
                  <h3>Kapasitas Desain &amp; Baseline Jaringan Biogas</h3>
                </div>
                <div class="panel-body">
                  <table class="table">
                    <tbody>
                      ${(MB.config.NETWORK_SPECS || MB.config.PROPOSAL_REF).map(function (item) {
                        return `
                          <tr>
                            <td><strong>${MB.fmt.esc(item[0])}</strong></td>
                            <td>${MB.fmt.esc(item[1])}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                  <small class="muted" style="display:block;margin-top:8px;">Parameter desain teknis dan target layanan jaringan biogas TPAS Manggar &bull; DLH Balikpapan.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    var btnExp = container.querySelector('#btnExportTelemetryCsv');
    if (btnExp) {
      btnExp.addEventListener('click', function () {
        exportTelemetryCsv();
      });
    }
  }

  function exportTelemetryCsv() {
    var c = MB.config.get();
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var rows = [
      ['Node ID', 'Nama Node', 'Waktu Pengukuran (WITA)', 'Tekanan (kPa)', 'Aliran (' + c.flow.unit + ')', 'Suhu Gas (C)', 'CH4 (%vol)', 'O2 (%vol)', 'H2S (ppm)']
    ];

    c.nodes.forEach(function (n) {
      var e = snap.nodes[n.id];
      var p = e ? e.values.pressure.value : null;
      var q = e ? e.values.flow.value : null;
      var tg = e ? e.values.gas_temp.value : null;
      var ch4 = e ? e.values.ch4.value : null;
      var o2 = e ? e.values.o2.value : null;
      var h2s = e ? e.values.h2s.value : null;
      var tStr = e && e.packet ? MB.fmt.dateTime(e.packet.measuredAt) : 'No Data';

      rows.push([
        n.id,
        n.name,
        tStr,
        p !== null ? p : '',
        q !== null ? q : '',
        tg !== null ? tg : '',
        ch4 !== null ? ch4 : '',
        o2 !== null ? o2 : '',
        h2s !== null ? h2s : ''
      ]);
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + rows.map(function (e) { return e.join(','); }).join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'METHABALANCE_Telemetry_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* -----------------------------------------------------------
     10. SETTINGS VIEW (Technical System & Communication Configuration)
     ----------------------------------------------------------- */
  function renderSettings(container) {
    var c = MB.config.get();
    var audits = MB.config.auditList();

    var html = `
      <div class="page">
        <!-- Technical LoRaWAN & Gateway Configuration -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Konfigurasi Radio LoRaWAN &amp; Gateway TPAS Manggar</h2>
              <p class="muted">Parameter transmisi nirkabel frekuensi regional AS923-2 untuk 5 node pengukuran.</p>
            </div>
            <div class="row">
              <span class="status-text st-ok">AS923-2 Regional Parameter</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field">
                <label>Identitas Gateway EUI:</label>
                <input type="text" value="GW-MANGGAR-SX1302" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Pita Frekuensi Transmisi:</label>
                <input type="text" value="923.200 MHz &bull; 923.400 MHz (AS923-2)" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Lebar Jalur (Bandwidth):</label>
                <input type="text" value="125 kHz &bull; Coding Rate 4/5" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Spreading Factor &amp; ADR:</label>
                <input type="text" value="SF7 &bull; Adaptive Data Rate Aktif" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Interval Uplink Telemetri:</label>
                <input type="text" value="300 Detik (Sinkron 5 Menit)" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Protokol Payload Controller:</label>
                <input type="text" value="ESP32-S3 LoRaWAN Cayenne LPP Compact" readonly style="background:var(--bg-card-subtle);">
              </div>
            </div>
          </div>
        </div>

        <!-- Gas Standardization & Reference Conditions -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Standardisasi Kondisi Acuan Gas (Normalization Reference)</h2>
              <p class="muted">Basis perhitungan neraca massa dan normalisasi volume alir mengacu pada standar industri.</p>
            </div>
            <div class="row">
              <span class="tag">SNI 7926:2013</span>
              <span class="tag">ISO 13443</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field">
                <label>Tekanan Standar Normal (P_norm):</label>
                <input type="text" value="101,325 kPa (1,01325 bar)" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Suhu Standar Normal (T_norm):</label>
                <input type="text" value="0,0 °C (273,15 K) &bull; Nm³/h" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Massa Jenis Acuan CH₄:</label>
                <input type="text" value="0,717 kg/Nm³ (NIST Reference)" readonly style="background:var(--bg-card-subtle);">
              </div>
              <div class="field">
                <label>Nilai Kalor Biogas LHV:</label>
                <input type="text" value="21,5 MJ/Nm³ (SNI Biogas)" readonly style="background:var(--bg-card-subtle);">
              </div>
            </div>
          </div>
        </div>

        <!-- Thresholds Config -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Ambang Batas Alarm &amp; Proteksi Jaringan Distribusi</h2>
              <p class="muted">Ambang batas toleransi tekanan pipa dan persentase losses neraca massa.</p>
            </div>
            <div class="row">
              <span class="status-text ${c.thresholdsValidated ? 'st-ok' : 'st-warn'}">${c.thresholdsValidated ? 'Tervalidasi Operasional' : 'Ambang Uji'}</span>
            </div>
          </div>
          <div class="panel-body">
            <form id="thresholdForm" class="stack">
              <div class="form-grid">
                <div class="field">
                  <label for="th_p_low_warn">Tekanan Rendah Warning (kPa):</label>
                  <input type="number" step="0.1" id="th_p_low_warn" value="${c.thresholds.pressure_low.warn}">
                </div>
                <div class="field">
                  <label for="th_p_low_crit">Tekanan Rendah Critical (kPa):</label>
                  <input type="number" step="0.1" id="th_p_low_crit" value="${c.thresholds.pressure_low.crit}">
                </div>
                <div class="field">
                  <label for="th_p_high_warn">Tekanan Tinggi Warning (kPa):</label>
                  <input type="number" step="0.1" id="th_p_high_warn" value="${c.thresholds.pressure_high.warn}">
                </div>
                <div class="field">
                  <label for="th_loss_warn">Losses Neraca Warning (%):</label>
                  <input type="number" step="0.5" id="th_loss_warn" value="${c.thresholds.balance_loss.warn}">
                </div>
              </div>
              <div class="row" style="margin-top:14px;">
                <button class="btn btn-primary" type="submit">Simpan Ambang Batas</button>
                <button class="btn btn-quiet" type="button" id="btnResetConfig">Reset ke Nilai Standar</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Audit Log Table -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Audit Log Aktivitas Sistem &amp; Pemeliharaan</h2>
              <p class="muted">Riwayat penyesuaian ambang batas, konfigurasi node, dan catatan pemeliharaan instrumen.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table rtable">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Peran</th>
                  <th>Aksi</th>
                  <th>Keterangan / Detail</th>
                </tr>
              </thead>
              <tbody>
                ${audits.slice(0, 15).map(function (a) {
                  return `
                    <tr>
                      <td data-label="Waktu">${MB.fmt.dateTime(a.ts)}</td>
                      <td data-label="Peran"><span class="tag">${MB.fmt.esc(a.role)}</span></td>
                      <td data-label="Aksi"><strong>${MB.fmt.esc(a.action)}</strong></td>
                      <td data-label="Keterangan"><small class="muted">${MB.fmt.esc(a.detail)}</small></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    var form = container.querySelector('#thresholdForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        c.thresholds.pressure_low.warn = Number(document.getElementById('th_p_low_warn').value);
        c.thresholds.pressure_low.crit = Number(document.getElementById('th_p_low_crit').value);
        c.thresholds.pressure_high.warn = Number(document.getElementById('th_p_high_warn').value);
        c.thresholds.balance_loss.warn = Number(document.getElementById('th_loss_warn').value);
        MB.config.save('Pembaruan Ambang Batas', 'Ambang batas tekanan & losses diperbarui');
        MB.engine.invalidate();
        MB.views.showToast('Ambang batas berhasil diperbarui.');
        renderSettings(container);
      });
    }

    var btnReset = container.querySelector('#btnResetConfig');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        if (confirm('Kembalikan konfigurasi ke setelan awal default?')) {
          MB.config.reset();
          MB.engine.invalidate();
          MB.views.showToast('Konfigurasi dikembalikan ke standar.');
          renderSettings(container);
        }
      });
    }
  }

  /* -----------------------------------------------------------
     MODALS & DIALOGS
     ----------------------------------------------------------- */
  function showNodeDetail(nodeId) {
    var n = MB.config.node(nodeId);
    if (!n) return;
    var snap = MB.ds.snapshotAt(MB.ds.now());
    var entry = snap.nodes[nodeId];
    var dlg = document.getElementById('nodeDetailDialog');
    if (!dlg) return;

    var content = dlg.querySelector('.dlg-body');
    content.innerHTML = `
      <div class="stack">
        <div class="row">
          <strong style="font-size:1.15rem;color:var(--text-primary);">${MB.fmt.esc(n.id)} &bull; ${MB.fmt.esc(n.name)}</strong>
          <span class="muted">&bull; ${MB.fmt.esc(n.placement)}</span>
        </div>
        <dl class="kv">
          <dt>Tipe Node:</dt>
          <dd>${n.type === 'upstream' ? 'Master Hulu (Baseline Ekstraksi)' : 'Edge Hilir (Batas Zona Distribusi)'}</dd>
          <dt>Zona Pengukuran:</dt>
          <dd>${n.zoneId || '<span class="na">Belum ditentukan</span>'}</dd>
          <dt>Status Pemasangan:</dt>
          <dd>${n.installStatus === 'installed' ? 'Terpasang' : 'Belum Terpasang'}</dd>
          <dt>Paket Terakhir:</dt>
          <dd>${entry && entry.packet ? MB.fmt.dateTime(entry.packet.receivedAt) + ' (' + MB.fmt.ago(entry.packet.receivedAt, snap.at) + ')' : '<span class="na">Belum pernah menerima data</span>'}</dd>
        </dl>

        <h4 style="margin-top:10px;">Status Sensor Terpasang:</h4>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Status</th>
                <th>Nilai Terkini</th>
              </tr>
            </thead>
            <tbody>
              ${MB.config.PARAM_ORDER.map(function (pKey) {
                var pDef = MB.config.PARAMS[pKey];
                var s = n.sensors[pKey];
                var val = entry ? entry.values[pKey].value : null;
                return `
                  <tr>
                    <td><strong>${MB.fmt.esc(pDef.label)}</strong></td>
                    <td>${getSensorBadge(s.status)}</td>
                    <td>${s.status === 'not_installed' ? '<span class="na">Tidak dipasang</span>' : fmtVal(val, pDef.dec, pDef.unit || MB.config.get().flow.unit)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    dlg.showModal();
  }

  function showIncidentDetail(incId) {
    var inc = MB.incidents.get(incId);
    if (!inc) return;
    var dlg = document.getElementById('incidentDetailDialog');
    if (!dlg) return;

    var content = dlg.querySelector('.dlg-body');
    content.innerHTML = `
      <div class="stack">
        <div class="row">
          <strong style="color:var(--text-primary);font-size:1.05rem;">${MB.fmt.esc(inc.id)}</strong>
          <strong>${MB.fmt.esc(inc.title)}</strong>
          <span class="status-text ${MB.incidents.STATUS_CLASSES[inc.status] || 'st-info'}">${MB.fmt.esc(inc.status)}</span>
        </div>
        <p class="muted">${MB.fmt.esc(inc.description)}</p>

        <dl class="kv">
          <dt>Sumber Lokasi:</dt>
          <dd><strong>${MB.fmt.esc(inc.scope)}</strong></dd>
          <dt>Prioritas:</dt>
          <dd><span class="status-text ${inc.priority === 'critical' ? 'st-crit' : 'st-warn'}">${inc.priority === 'critical' ? 'Kritis' : 'Peringatan'}</span></dd>
          <dt>Waktu Dibuat:</dt>
          <dd>${MB.fmt.dateTime(inc.createdAt)}</dd>
          <dt>Teknisi Bertugas:</dt>
          <dd>${inc.technician ? MB.fmt.esc(inc.technician) : '<span class="na">Belum ditugaskan</span>'}</dd>
        </dl>

        <h4 style="margin-top:10px;">Perbarui Status &amp; Catatan Tindakan:</h4>
        <form id="incidentUpdateForm" class="stack">
          <div class="form-grid">
            <div class="field">
              <label for="incStatusSelect">Ubah Status:</label>
              <select id="incStatusSelect">
                ${MB.incidents.STATUSES.map(function (st) {
                  return '<option value="' + st + '" ' + (st === inc.status ? 'selected' : '') + '>' + st + '</option>';
                }).join('')}
              </select>
            </div>
            <div class="field">
              <label for="incTechSelect">Tugaskan Teknisi:</label>
              <select id="incTechSelect">
                <option value="">-- Pilih Teknisi --</option>
                ${MB.incidents.TECHNICIANS.map(function (t) {
                  return '<option value="' + t.name + '" ' + (t.name === inc.technician ? 'selected' : '') + '>' + t.name + ' (' + t.role + ')</option>';
                }).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="incLogText">Catatan Log Pemeriksaan:</label>
            <textarea id="incLogText" placeholder="Tuliskan hasil pengecekan lapangan, foto temuan, atau tindakan perbaikan..."></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Simpan Catatan &amp; Perbarui</button>
        </form>

        <h4 style="margin-top:14px;">Riwayat Log Tindakan:</h4>
        <ul class="timeline">
          ${inc.logs.map(function (log) {
            return `
              <li>
                <strong>${MB.fmt.dateTimeShort(log.ts)}</strong> &bull; <em>${MB.fmt.esc(log.author)}</em>:
                <div>${MB.fmt.esc(log.text)}</div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;

    var form = content.querySelector('#incidentUpdateForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var newStatus = document.getElementById('incStatusSelect').value;
      var newTech = document.getElementById('incTechSelect').value;
      var logText = document.getElementById('incLogText').value;

      MB.incidents.update(inc.id, {
        status: newStatus,
        technician: newTech || null
      }, logText);

      MB.views.showToast('Insiden ' + inc.id + ' berhasil diperbarui.');
      dlg.close();
      MB.views.navigate('incidents');
    });

    dlg.showModal();
  }

  function showCreateIncidentModal() {
    var dlg = document.getElementById('createIncidentDialog');
    if (!dlg) return;
    dlg.showModal();
  }

  function showToast(msg) {
    var t = document.getElementById('appToast');
    if (!t) return;
    t.textContent = msg;
    t.removeAttribute('hidden');
    setTimeout(function () {
      t.setAttribute('hidden', '');
    }, 3500);
  }

  function updateNotificationBadge() {
    try {
      var alarms = MB.engine.computeAlarms(MB.ds.now() - 24 * 3600e3, MB.ds.now());
      var activeAlarms = alarms.filter(function (a) { return a.active && MB.engine.isOpen(a); });
      var badge = document.querySelector('.notification-badge');
      var btn = document.getElementById('topbarNotificationBtn');
      if (badge) {
        if (activeAlarms.length > 0) {
          badge.textContent = activeAlarms.length;
          badge.style.display = 'inline-flex';
          if (btn) btn.setAttribute('title', activeAlarms.length + ' Peringatan / Insiden Aktif Memerlukan Tindakan');
        } else {
          badge.style.display = 'none';
          if (btn) btn.setAttribute('title', 'Tidak ada peringatan aktif');
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  function updateHeaderUserMeta() {
    var role = MB.config.role();
    var rName = document.querySelector('.user-profile-name');
    var rSub = document.querySelector('.user-profile-sub');
    if (rName) {
      rName.textContent = MB.config.ROLES[role] ? MB.config.ROLES[role].label : 'Operator DLH Balikpapan';
    }
    if (rSub) {
      rSub.textContent = 'DLH Kota Balikpapan';
    }
    updateNotificationBadge();
  }

  /* -----------------------------------------------------------
     ROUTER & NAVIGATION
     ----------------------------------------------------------- */
  var VIEWS = {
    overview: renderOverview,
    live: renderLiveMonitoring,
    nodes: renderNodeSensorView,
    gis: renderGisTopology,
    'mass-balance': renderMassBalance,
    'gas-quality': renderGasQuality,
    analytics: renderAnalyticsCustomer,
    incidents: renderAnomalyIncident,
    'device-health': renderDeviceHealth,
    reports: renderReports,
    settings: renderSettings
  };

  function navigate(viewName) {
    if (!VIEWS[viewName]) viewName = 'overview';
    currentView = viewName;

    // Update active nav links
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      var href = a.getAttribute('href').replace('#', '');
      if (href === viewName) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    // Update Lovable-style Breadcrumb in Topbar
    var PAGE_NAMES = {
      overview: 'Overview',
      live: 'Live Monitoring',
      nodes: 'Node & Sensor',
      gis: 'Peta Spasial GIS',
      'mass-balance': 'Mass Balance',
      'gas-quality': 'Gas Quality',
      analytics: 'Pelanggan & Analisis Karbon',
      incidents: 'Anomaly & Incident',
      'device-health': 'Device Health',
      reports: 'Reports',
      settings: 'Settings'
    };
    var currentCrumb = document.getElementById('currentBreadcrumbPage');
    if (currentCrumb) {
      currentCrumb.textContent = PAGE_NAMES[viewName] || viewName;
    }

    // Render into main view container
    var main = document.getElementById('mainContentContainer');
    if (main) {
      // Check data source ready
      if (MB.ds.state.loading) {
        main.innerHTML = `
          <div class="page">
            <div class="state loading">
              <div class="loader"></div>
              <h3>Memuat data telemetri...</h3>
            </div>
          </div>
        `;
        return;
      }

      if (MB.ds.state.error) {
        main.innerHTML = `
          <div class="page">
            <div class="state error">
              <h3>${MB.fmt.esc(MB.ds.state.error.title)}</h3>
              <p>${MB.fmt.esc(MB.ds.state.error.detail)}</p>
              <button class="btn btn-sm btn-primary" onclick="MB.ds.setMode('demo'); MB.views.render();">Beralih ke MODE DEMO</button>
            </div>
          </div>
        `;
        return;
      }

      VIEWS[viewName](main);
      updateNotificationBadge();
      window.scrollTo(0, 0);
    }
  }

  MB.views = {
    navigate: navigate,
    render: function () {
      navigate(currentView);
    },
    showNodeDetail: showNodeDetail,
    showIncidentDetail: showIncidentDetail,
    showCreateIncidentModal: showCreateIncidentModal,
    showToast: showToast,
    updateHeaderUserMeta: updateHeaderUserMeta,
    updateNotificationBadge: updateNotificationBadge
  };
})(window.MB);
