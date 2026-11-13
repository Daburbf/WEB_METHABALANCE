/* ==========================================================================
   METHABALANCE / METHASENSE — Production SCADA & SDSS Controller
   UPTD TPAS Manggar × DLH Kota Balikpapan × Koperasi WASTECO
   Clean, responsive, real-time industrial SCADA platform
   ========================================================================== */
(function () {
  'use strict';

  var D = window.METHA_DATA;
  var M = window.METHA;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function fmt(v, dec) {
    return Number(v).toLocaleString('id-ID', {
      minimumFractionDigits: dec !== undefined ? dec : 1,
      maximumFractionDigits: dec !== undefined ? dec : 1
    });
  }

  /* ----------------------------------------------------------------------
     Live Real-Time Clock
     ---------------------------------------------------------------------- */
  function updateLiveClock() {
    var now = new Date();
    var tStr = String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0') + ' WITA';

    var clockEl = $('#liveClock');
    if (clockEl) clockEl.textContent = tStr;
  }

  /* ----------------------------------------------------------------------
     Navigation & Tab Switching (Overview, Sensor, Topology, Analytics)
     ---------------------------------------------------------------------- */
  function switchTab(tabId) {
    if (!tabId) tabId = 'overview';
    M.set({ activeTab: tabId });

    $$('.nav-link-btn').forEach(function (btn) {
      var target = btn.getAttribute('data-target-tab');
      if (target === tabId) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    $$('.tab-pane').forEach(function (pane) {
      if (pane.id === 'tab-' + tabId) {
        pane.classList.add('is-active');
      } else {
        pane.classList.remove('is-active');
      }
    });

    if (tabId === 'overview' && leafletMap) {
      setTimeout(function () { leafletMap.invalidateSize(); }, 60);
    }
    if (tabId === 'topology' && window.METHAGIS) {
      setTimeout(function () { window.METHAGIS.resize(); }, 60);
    }
  }

  function initNavigation() {
    $$('.nav-link-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-target-tab');
        window.location.hash = tab;
        switchTab(tab);
        var sidebar = $('.app-sidebar');
        if (sidebar && sidebar.classList.contains('is-open')) {
          sidebar.classList.remove('is-open');
        }
      });
    });

    var toggleBtn = $('#mobileSidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var sidebar = $('.app-sidebar');
        if (sidebar) sidebar.classList.toggle('is-open');
      });
    }

    var hash = window.location.hash.replace('#', '');
    if (hash && $('#tab-' + hash)) {
      switchTab(hash);
    } else {
      switchTab('overview');
    }

    window.addEventListener('hashchange', function () {
      var h = window.location.hash.replace('#', '');
      if (h && $('#tab-' + h)) switchTab(h);
    });
  }

  /* ----------------------------------------------------------------------
     Leaflet Voyager Map Integration (CartoDB Tiles)
     ---------------------------------------------------------------------- */
  var leafletMap = null;
  var leafletMarkers = {};
  var leafletPolylines = {};

  function routeToLatLngs(route) {
    return route.pts.map(function (p) {
      return [
        D.site.lat + (p.z / D.site.mPerDegLat),
        D.site.lon + (p.x / D.site.mPerDegLon)
      ];
    });
  }

  function initLeafletMap() {
    var container = $('#leafletMap');
    if (!container || typeof L === 'undefined' || leafletMap) return;

    leafletMap = L.map('leafletMap', {
      center: [D.site.lat, D.site.lon],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(leafletMap);

    var trunkLatLngs = routeToLatLngs(D.routes.trunk);
    var aLatLngs = routeToLatLngs(D.routes.a);
    var bLatLngs = routeToLatLngs(D.routes.b);
    var cLatLngs = routeToLatLngs(D.routes.c);

    leafletPolylines.trunk = L.polyline(trunkLatLngs, { color: '#10b981', weight: 4.5, opacity: 0.9 }).addTo(leafletMap);
    leafletPolylines.a = L.polyline(aLatLngs, { color: '#3b82f6', weight: 3.5, opacity: 0.85 }).addTo(leafletMap);
    leafletPolylines.b = L.polyline(bLatLngs, { color: '#f59e0b', weight: 3.5, opacity: 0.85 }).addTo(leafletMap);
    leafletPolylines.c = L.polyline(cLatLngs, { color: '#8b5cf6', weight: 3.5, opacity: 0.85 }).addTo(leafletMap);

    D.nodes.forEach(function (n) {
      var markerHtml =
        '<div class="ms-marker" style="width:24px;height:24px;">' +
        '<span class="ms-marker-ring" style="background:#10b981;"></span>' +
        '<div class="ms-marker-pin" style="background:#0F3B2F;">' + n.id.replace('N', '') + '</div>' +
        '</div>';

      var icon = L.divIcon({
        className: 'custom-ms-icon',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      var marker = L.marker([n.lat, n.lon], { icon: icon }).addTo(leafletMap);
      marker.bindTooltip('<strong>' + n.id + '</strong> · ' + n.name + '<br>' + fmt(n.base.p, 2) + ' kPa', { offset: [0, -10] });

      marker.on('click', function () {
        M.set({ selectedNodeId: n.id });
        switchTab('sensor');
      });

      leafletMarkers[n.id] = marker;
    });

    var btnVoyager = $('#btnToggleLeaflet');
    var btn3D = $('#btnToggle3D');
    var el3D = $('#geoStage');

    if (btnVoyager && btn3D && el3D) {
      btnVoyager.addEventListener('click', function () {
        btnVoyager.classList.add('is-active');
        btn3D.classList.remove('is-active');
        container.style.display = 'block';
        el3D.classList.remove('is-active');
        setTimeout(function () { leafletMap.invalidateSize(); }, 50);
      });

      btn3D.addEventListener('click', function () {
        btn3D.classList.add('is-active');
        btnVoyager.classList.remove('is-active');
        container.style.display = 'none';
        el3D.classList.add('is-active');
        if (window.METHAGIS) {
          setTimeout(function () { window.METHAGIS.resize(); }, 50);
        }
      });
    }
  }

  /* ----------------------------------------------------------------------
     Global Search Bar (Ctrl + K)
     ---------------------------------------------------------------------- */
  function initSearch() {
    var input = $('#globalSearchInput');
    if (!input) return;

    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    input.addEventListener('input', function () {
      var query = input.value.trim().toUpperCase();
      if (!query) return;
      var found = D.nodes.filter(function (n) {
        return n.id.includes(query) || n.name.toUpperCase().includes(query) || n.area.toUpperCase().includes(query);
      })[0];
      if (found) {
        M.set({ selectedNodeId: found.id });
        renderSelectedNodeDetails(found.id);
        if (leafletMap && leafletMarkers[found.id]) {
          leafletMap.setView([found.lat, found.lon], 16);
          leafletMarkers[found.id].openTooltip();
        }
      }
    });
  }

  /* ----------------------------------------------------------------------
     SCADA Operational State Machine
     ---------------------------------------------------------------------- */
  function applyOperationalState(stateKey) {
    var stateDef = D.operationalStates[stateKey];
    if (!stateDef) return;

    M.set({
      opStateKey: stateKey,
      valveN06State: stateDef.valveN06State
    });

    var badgeEl = $('#scadaStateBadge');
    if (badgeEl) {
      badgeEl.className = 'badge badge-' + (stateDef.tone === 'crit' ? 'rose' : stateDef.tone === 'warn' ? 'amber' : 'emerald');
      badgeEl.innerHTML = '<span class="sidebar-live-dot" style="display:inline-block;width:6px;height:6px;margin-right:4px;"></span>' + (stateKey === 'normal' ? 'OPTIMAL' : stateKey === 'leak' ? 'ISOLASI' : 'KONDENSAT');
    }

    var m = stateDef.metrics;
    $('#kpiTotalGasVal') && ($('#kpiTotalGasVal').textContent = fmt(m.qHulu, 1));
    $('#kpiEfficiencyVal') && ($('#kpiEfficiencyVal').textContent = fmt(m.efficiencyPct, 1) + '%');
    $('#kpiSavingsVal') && ($('#kpiSavingsVal').textContent = 'Rp ' + fmt(m.dailySavings / 1000, 0) + '.000');
    $('#kpiCarbonVal') && ($('#kpiCarbonVal').textContent = fmt(m.dailyCarbon, 1));
    $('#kpiNodesVal') && ($('#kpiNodesVal').textContent = m.activeNodes + '/' + m.totalNodes + ' Node Aktif');

    $('#balanceQHulu') && ($('#balanceQHulu').textContent = fmt(m.qHulu, 1) + ' m³');
    $('#balanceQHilir') && ($('#balanceQHilir').textContent = fmt(m.qHilir, 1) + ' m³');
    $('#balanceDeltaQ') && ($('#balanceDeltaQ').textContent = fmt(m.dq, 1) + ' m³ (' + fmt(m.dqPct, 2) + '%)');
    $('#balanceDeltaQPct') && ($('#balanceDeltaQPct').textContent = fmt(m.dqPct, 2) + '% (Normal < 2,62%)');

    var fillBar = $('#meterFillBar');
    if (fillBar) {
      var pctWidth = Math.min(100, (m.dqPct / 5.0) * 100);
      fillBar.style.width = pctWidth + '%';
      fillBar.style.background = m.dqPct > D.site.leakPracticalThresholdPct ? '#ef4444' : '#10b981';
    }

    var balanceStatusBadge = $('#balanceStatusBadge');
    if (balanceStatusBadge) {
      if (m.dqPct > D.site.leakPracticalThresholdPct) {
        balanceStatusBadge.className = 'badge badge-rose';
        balanceStatusBadge.textContent = 'DEVIAIS KRITIS';
      } else {
        balanceStatusBadge.className = 'badge badge-emerald';
        balanceStatusBadge.textContent = 'SEIMBANG';
      }
    }

    // Stove banner in resident view
    var stoveBanner = $('#stoveStatusBanner');
    if (stoveBanner) {
      stoveBanner.style.background = stateDef.tone === 'crit' ? '#fef2f2' : stateDef.tone === 'warn' ? '#fffbeb' : '#ecfdf5';
      stoveBanner.style.borderColor = stateDef.tone === 'crit' ? '#fecaca' : stateDef.tone === 'warn' ? '#fde68a' : '#a7f3d0';
      var titleEl = stoveBanner.querySelector('.stove-title');
      var msgEl = stoveBanner.querySelector('.stove-desc');
      if (titleEl) {
        titleEl.textContent = stateDef.stoveStatus;
        titleEl.style.color = stateDef.tone === 'crit' ? '#991b1b' : stateDef.tone === 'warn' ? '#92400e' : '#065f46';
      }
      if (msgEl) msgEl.textContent = stateDef.stoveMessage;
    }

    // Triangulation parameters
    var isLeak = (stateKey === 'leak');
    $('#triangCoord') && ($('#triangCoord').textContent = isLeak ? '-1.2185° S, 116.9382° E (RT 23)' : 'Tidak Ada Anomali');
    $('#triangFailSafe') && ($('#triangFailSafe').textContent = isLeak ? '3,8 Detik (Katup NC Tertutup)' : 'Siap Siaga (< 5 Detik)');

    updateTelemetryTables(stateKey);
    updateOverviewChartForState(stateKey);
    updateStationCardsData();

    if (window.METHAGIS) {
      window.METHAGIS.setScenario();
    }
  }

  function initSCADAStatePicker() {
    var select = $('#scadaStateSelect');
    if (select) {
      select.addEventListener('change', function () {
        applyOperationalState(select.value);
      });
    }

    $$('[data-op-trigger]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-op-trigger');
        if (select) select.value = key;
        applyOperationalState(key);
      });
    });
  }

  /* ----------------------------------------------------------------------
     Telemetry Data Tables & Fleet Management
     ---------------------------------------------------------------------- */
  function updateTelemetryTables(stateKey) {
    var st = D.operationalStates[stateKey] || D.operationalStates.normal;
    var overrides = st.overrides || {};

    var tbodyOverview = $('#overviewNodeTableBody');
    if (tbodyOverview) {
      tbodyOverview.innerHTML = '';
      D.nodes.forEach(function (n) {
        var tr = document.createElement('tr');
        var data = Object.assign({}, n.base, overrides[n.id] || {});
        var isCrit = (stateKey === 'leak' && (n.id === 'N06' || n.id === 'N07'));
        var isWarn = (stateKey === 'condensate' && n.id === 'N07');

        tr.innerHTML =
          '<td><strong>' + n.id + '</strong></td>' +
          '<td>' + n.name + '<br><small style="color:var(--text-muted)">' + n.area + '</small></td>' +
          '<td><span style="font-family:var(--font-mono);font-weight:600">' + fmt(data.p, 2) + ' kPa</span></td>' +
          '<td><span style="font-family:var(--font-mono)">' + fmt(data.q, 1) + ' m³/h</span></td>' +
          '<td><span style="font-family:var(--font-mono)">' + fmt(data.ch4, 1) + '%</span></td>' +
          '<td><span style="font-family:var(--font-mono)">' + fmt(data.o2, 2) + '%</span></td>' +
          '<td><span class="badge ' + (isCrit ? 'badge-rose' : isWarn ? 'badge-amber' : 'badge-emerald') + '">' +
          (isCrit ? 'TERISOLASI' : isWarn ? 'PERINGATAN' : 'NORMAL') + '</span></td>' +
          '<td><button class="btn-outline" style="padding:3px 8px;font-size:0.7rem;" data-select-node="' + n.id + '">Buka Node</button></td>';
        tbodyOverview.appendChild(tr);
      });

      $$('[data-select-node]', tbodyOverview).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-select-node');
          M.set({ selectedNodeId: id });
          switchTab('sensor');
        });
      });
    }

    renderFleetView();
  }

  function renderFleetView() {
    var sel = $('#fleetNodeSelect');
    if (!sel) return;
    var currId = M.state.selectedNodeId || 'N01';

    if (sel.options.length === 0) {
      D.nodes.forEach(function (n) {
        var opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.id + ' — ' + n.name + ' (' + n.area + ')';
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () {
        M.set({ selectedNodeId: sel.value });
        renderSelectedNodeDetails(sel.value);
      });
    }

    sel.value = currId;
    renderSelectedNodeDetails(currId);
  }

  function renderSelectedNodeDetails(nodeId) {
    var node = null;
    for (var i = 0; i < D.nodes.length; i++) {
      if (D.nodes[i].id === nodeId) { node = D.nodes[i]; break; }
    }
    if (!node) return;

    var st = D.operationalStates[M.state.opStateKey] || D.operationalStates.normal;
    var overrides = st.overrides || {};
    var telemetry = Object.assign({}, node.base, overrides[node.id] || {});

    $('#fleetDetailName') && ($('#fleetDetailName').textContent = node.id + ' — ' + node.name);
    $('#fleetDetailArea') && ($('#fleetDetailArea').textContent = node.area + ' · ' + node.install);
    $('#fleetDetailCoord') && ($('#fleetDetailCoord').textContent = node.wgsStr + ' (Elevasi: ' + fmt(node.y, 1) + ' mdpl)');

    $('#sensorPressure') && ($('#sensorPressure').textContent = fmt(telemetry.p, 2) + ' kPa');
    $('#sensorFlow') && ($('#sensorFlow').textContent = fmt(telemetry.q, 1) + ' m³/h');
    $('#sensorCH4') && ($('#sensorCH4').textContent = fmt(telemetry.ch4, 1) + ' %Vol');
    $('#sensorH2S') && ($('#sensorH2S').textContent = fmt(telemetry.h2s, 1) + ' ppm');
    $('#sensorO2') && ($('#sensorO2').textContent = fmt(telemetry.o2, 2) + ' %Vol');
    $('#sensorTempRH') && ($('#sensorTempRH').textContent = fmt(telemetry.t, 1) + '°C / ' + fmt(telemetry.rh, 1) + '%');

    $('#sensorCPU') && ($('#sensorCPU').textContent = fmt(node.hw.cpu, 1) + '°C');
    $('#sensorWear') && ($('#sensorWear').textContent = fmt(node.hw.wear, 1) + '% (Baik)');
    $('#sensorPower') && ($('#sensorPower').textContent = fmt(node.hw.solar, 1) + 'V / ' + node.hw.battHours + ' Jam LiFePO₄');

    var valveSwitch = $('#valveControlSwitch');
    var isN06Closed = (node.id === 'N06' && M.state.valveN06State === 'closed');
    if (valveSwitch) {
      valveSwitch.checked = !isN06Closed;
      var valveLabel = $('#valveControlStatusLabel');
      if (valveLabel) {
        if (isN06Closed) {
          valveLabel.textContent = 'TERISOLASI (FAIL-SAFE)';
          valveLabel.className = 'badge badge-rose';
        } else {
          valveLabel.textContent = 'TERBUKA • NORMAL';
          valveLabel.className = 'badge badge-emerald';
        }
      }
    }

    updateNodeHistoryChart(nodeId);
    highlightStationCard(nodeId);
  }

  /* ----------------------------------------------------------------------
     Admin Authentication Module
     ---------------------------------------------------------------------- */
  function openAdminModal() {
    var modal = $('#adminLoginModal');
    if (modal) modal.classList.add('is-active');
  }

  function closeAdminModal() {
    var modal = $('#adminLoginModal');
    if (modal) modal.classList.remove('is-active');
  }

  function loginAdmin(email) {
    var user = {
      name: 'Admin DLH Balikpapan',
      email: email || 'budi.santoso@balikpapan.go.id',
      role: 'Operations Manager'
    };
    M.set({ adminUser: user });
    closeAdminModal();

    var btnOpen = $('#btnOpenAdminLogin');
    if (btnOpen) {
      btnOpen.innerHTML = '<span style="color:#059669;margin-right:4px;">●</span><span>Admin (DLH)</span>';
      btnOpen.onclick = function () {
        if (confirm('Keluar dari sesi admin?')) {
          logoutAdmin();
        }
      };
    }
    alert('Login Berhasil: Selamat datang, ' + user.name + '.');
  }

  function logoutAdmin() {
    M.set({ adminUser: null });
    var btnOpen = $('#btnOpenAdminLogin');
    if (btnOpen) {
      btnOpen.innerHTML = '<span>Login Admin</span>';
      btnOpen.onclick = openAdminModal;
    }
  }

  function checkAdminAuth(actionDesc) {
    if (M.state && M.state.adminUser) return true;
    alert('Akses Terbatas: Silakan login sebagai Admin/Petugas DLH terlebih dahulu untuk ' + (actionDesc || 'aksi ini') + '.');
    openAdminModal();
    return false;
  }

  function initAdminModule() {
    var btnOpen = $('#btnOpenAdminLogin');
    if (btnOpen) btnOpen.addEventListener('click', openAdminModal);

    var btnProfile = $('#btnSidebarProfile');
    if (btnProfile) btnProfile.addEventListener('click', openAdminModal);

    var btnClose = $('#btnCloseAdminModal');
    if (btnClose) btnClose.addEventListener('click', closeAdminModal);

    var modal = $('#adminLoginModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeAdminModal();
      });
    }

    var form = $('#adminLoginForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        loginAdmin($('#adminEmail') ? $('#adminEmail').value : '');
      });
    }

    var btnQuick = $('#btnQuickLoginAdmin');
    if (btnQuick) {
      btnQuick.addEventListener('click', function () {
        loginAdmin('budi.santoso@balikpapan.go.id');
      });
    }
  }

  function initValveControls() {
    var valveSwitch = $('#valveControlSwitch');
    if (valveSwitch) {
      valveSwitch.addEventListener('change', function () {
        if (!checkAdminAuth('mengubah sakelar katup')) {
          valveSwitch.checked = !valveSwitch.checked;
          return;
        }
        var nodeId = M.state.selectedNodeId || 'N01';
        var nextState = valveSwitch.checked ? 'open' : 'closed';
        if (nodeId === 'N06') M.set({ valveN06State: nextState });
        renderSelectedNodeDetails(nodeId);
        if (window.METHAGIS) window.METHAGIS.setScenario();
      });
    }

    var btnTestOpen = $('#btnTestOpenValve');
    if (btnTestOpen) {
      btnTestOpen.addEventListener('click', function () {
        if (!checkAdminAuth('membuka katup gas')) return;
        var nodeId = M.state.selectedNodeId || 'N01';
        btnTestOpen.disabled = true;
        btnTestOpen.textContent = 'Mengirim Perintah...';
        setTimeout(function () {
          if (nodeId === 'N06') M.set({ valveN06State: 'open' });
          btnTestOpen.disabled = false;
          btnTestOpen.textContent = 'Aktuasi Buka Katup Gas';
          renderSelectedNodeDetails(nodeId);
          alert('SUKSES: Katup pada ' + nodeId + ' dibuka.');
        }, 1000);
      });
    }

    var btnDiag = $('#btnSelfDiagnostic');
    if (btnDiag) {
      btnDiag.addEventListener('click', function () {
        if (!checkAdminAuth('menjalankan diagnostik')) return;
        alert('DIAGNOSTIK: Semua sensor (NDIR CH4, SS316L, SHT30) dan transmisi LoRaWAN SX1262 beroperasi normal.');
      });
    }

    var btnCalib = $('#btnCalibrateZero');
    if (btnCalib) {
      btnCalib.addEventListener('click', function () {
        if (!checkAdminAuth('menjadwalkan kalibrasi')) return;
        alert('Jadwal kalibrasi sensor telah dicatat dalam log pemeliharaan.');
      });
    }
  }

  /* ----------------------------------------------------------------------
     Modern SCADA Telemetry Charts (Chart.js Engine)
     ---------------------------------------------------------------------- */
  var overviewChart = null;
  var nodeChart = null;
  var chartActiveParam = 'all';
  var chartActiveRange = '1h';

  function generateTelemetryTimeSeries(rangeKey, stateKey) {
    var count = rangeKey === '1h' ? 15 : rangeKey === '6h' ? 18 : rangeKey === '24h' ? 24 : 14;
    var stepMin = rangeKey === '1h' ? 3 : rangeKey === '6h' ? 15 : rangeKey === '24h' ? 60 : 360;
    var labels = [];
    var pressureData = [];
    var flowData = [];
    var ch4Data = [];
    var h2sData = [];
    var o2Data = [];

    var now = new Date();
    var isLeak = (stateKey === 'leak');
    var isCondensate = (stateKey === 'condensate');

    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * stepMin * 60 * 1000);
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      labels.push(rangeKey === '7d' ? (d.getDate() + '/' + (d.getMonth() + 1)) : (hh + ':' + mm));

      var tIdx = count - 1 - i;
      var isRecentIncident = isLeak && (tIdx >= count - 4);

      // Pressure baseline ~3.92 kPa
      var p = 3.90 + Math.sin(tIdx * 0.4) * 0.12 + (Math.random() * 0.05 - 0.025);
      // Flow baseline ~1245 m3/h
      var q = 1240 + Math.sin(tIdx * 0.3) * 14 + (Math.random() * 8 - 4);
      // CH4 baseline ~58.4%
      var ch4 = 58.2 + Math.cos(tIdx * 0.25) * 0.35 + (Math.random() * 0.15 - 0.07);
      // H2S baseline ~34 ppm
      var h2s = 34.0 + Math.sin(tIdx * 0.5) * 1.8 + (Math.random() * 0.8 - 0.4);
      // O2 baseline ~0.65%
      var o2 = 0.65 + Math.sin(tIdx * 0.3) * 0.08 + (Math.random() * 0.04 - 0.02);

      if (isRecentIncident) {
        p = Math.max(1.15, p - (tIdx - (count - 5)) * 0.7);
        q = Math.max(810, q - (tIdx - (count - 5)) * 105);
        o2 = Math.min(1.85, o2 + (tIdx - (count - 5)) * 0.28);
      } else if (isCondensate) {
        p += Math.sin(tIdx * 1.2) * 0.28; // Ripple akibat siphon
      }

      pressureData.push(Number(p.toFixed(2)));
      flowData.push(Number(q.toFixed(1)));
      ch4Data.push(Number(ch4.toFixed(1)));
      h2sData.push(Number(h2s.toFixed(1)));
      o2Data.push(Number(o2.toFixed(2)));
    }

    return {
      labels: labels,
      pressure: pressureData,
      flow: flowData,
      ch4: ch4Data,
      h2s: h2sData,
      o2: o2Data
    };
  }

  function initOverviewTelemetryChart() {
    var canvas = $('#overviewTelemetryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    var ctx = canvas.getContext('2d');
    var ts = generateTelemetryTimeSeries(chartActiveRange, M.state.opStateKey || 'normal');

    // Create subtle gradient fills
    var gradSky = ctx.createLinearGradient(0, 0, 0, 260);
    gradSky.addColorStop(0, 'rgba(2, 132, 199, 0.22)');
    gradSky.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    var gradAmber = ctx.createLinearGradient(0, 0, 0, 260);
    gradAmber.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
    gradAmber.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    var gradEmerald = ctx.createLinearGradient(0, 0, 0, 260);
    gradEmerald.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    gradEmerald.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    overviewChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ts.labels,
        datasets: [
          {
            label: 'Tekanan Gas (kPa)',
            data: ts.pressure,
            borderColor: '#0284c7',
            backgroundColor: gradSky,
            borderWidth: 2.2,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0284c7',
            fill: true,
            tension: 0.35,
            yAxisID: 'yPressure'
          },
          {
            label: 'Laju Alir (m³/h)',
            data: ts.flow,
            borderColor: '#f59e0b',
            backgroundColor: gradAmber,
            borderWidth: 2.2,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f59e0b',
            fill: true,
            tension: 0.35,
            yAxisID: 'yFlow'
          },
          {
            label: 'Kadar CH₄ (%Vol)',
            data: ts.ch4,
            borderColor: '#10b981',
            backgroundColor: gradEmerald,
            borderWidth: 2.2,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981',
            fill: true,
            tension: 0.35,
            yAxisID: 'yPct'
          },
          {
            label: 'Asam H₂S (ppm)',
            data: ts.h2s,
            borderColor: '#9333ea',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointRadius: 1.5,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: 'yDanger'
          },
          {
            label: 'Infiltrasi O₂ (%Vol)',
            data: ts.o2,
            borderColor: '#ef4444',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointRadius: 1.5,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: 'yDanger'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
            bodyFont: { family: 'JetBrains Mono', size: 11 },
            padding: 10,
            cornerRadius: 8,
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 }
            }
          },
          yPressure: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 6,
            title: { display: true, text: 'Tekanan (kPa)', color: '#0284c7', font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { color: '#0284c7', font: { family: 'JetBrains Mono', size: 10 } }
          },
          yFlow: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 1600,
            title: { display: true, text: 'Laju Alir (m³/h)', color: '#f59e0b', font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 10 } }
          },
          yPct: {
            display: false,
            min: 0,
            max: 100
          },
          yDanger: {
            display: false,
            min: 0,
            max: 80
          }
        }
      }
    });

    // Wire up Param Filters
    $$('#chartParamFilter button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#chartParamFilter button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        applyChartParamFilter(btn.getAttribute('data-param'));
      });
    });

    // Wire up Time Filters
    $$('#chartTimeFilter button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#chartTimeFilter button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        chartActiveRange = btn.getAttribute('data-range');
        updateOverviewChartForState(M.state.opStateKey || 'normal');
      });
    });

    // Live Streaming Telemetry Ticker (every 3.5s)
    setInterval(streamLiveTelemetryTick, 3500);
  }

  function applyChartParamFilter(paramKey) {
    if (!overviewChart) return;
    chartActiveParam = paramKey;

    var sets = overviewChart.data.datasets;
    if (paramKey === 'all') {
      sets.forEach(function (ds) { ds.hidden = false; });
      overviewChart.options.scales.yPressure.display = true;
      overviewChart.options.scales.yFlow.display = true;
    } else if (paramKey === 'pressure') {
      sets.forEach(function (ds, idx) { ds.hidden = (idx !== 0); });
      overviewChart.options.scales.yPressure.display = true;
      overviewChart.options.scales.yFlow.display = false;
    } else if (paramKey === 'flow') {
      sets.forEach(function (ds, idx) { ds.hidden = (idx !== 1); });
      overviewChart.options.scales.yPressure.display = false;
      overviewChart.options.scales.yFlow.display = true;
    } else if (paramKey === 'ch4') {
      sets.forEach(function (ds, idx) { ds.hidden = (idx !== 2); });
      overviewChart.options.scales.yPressure.display = false;
      overviewChart.options.scales.yFlow.display = false;
    } else if (paramKey === 'danger') {
      sets.forEach(function (ds, idx) { ds.hidden = (idx !== 3 && idx !== 4); });
      overviewChart.options.scales.yPressure.display = false;
      overviewChart.options.scales.yFlow.display = false;
    }
    overviewChart.update();
  }

  function updateOverviewChartForState(stateKey) {
    if (!overviewChart) return;
    var ts = generateTelemetryTimeSeries(chartActiveRange, stateKey);
    overviewChart.data.labels = ts.labels;
    overviewChart.data.datasets[0].data = ts.pressure;
    overviewChart.data.datasets[1].data = ts.flow;
    overviewChart.data.datasets[2].data = ts.ch4;
    overviewChart.data.datasets[3].data = ts.h2s;
    overviewChart.data.datasets[4].data = ts.o2;
    overviewChart.update();

    var lastIdx = ts.labels.length - 1;
    $('#legendPressureVal') && ($('#legendPressureVal').textContent = fmt(ts.pressure[lastIdx], 2) + ' kPa');
    $('#legendFlowVal') && ($('#legendFlowVal').textContent = fmt(ts.flow[lastIdx], 1) + ' m³/h');
    $('#legendCH4Val') && ($('#legendCH4Val').textContent = fmt(ts.ch4[lastIdx], 1) + ' %Vol');
    $('#legendH2SVal') && ($('#legendH2SVal').textContent = fmt(ts.h2s[lastIdx], 1) + ' ppm');
    $('#legendO2Val') && ($('#legendO2Val').textContent = fmt(ts.o2[lastIdx], 2) + ' %Vol (< 5% LEL)');
  }

  function streamLiveTelemetryTick() {
    if (!overviewChart) return;
    var stateKey = M.state.opStateKey || 'normal';
    var isLeak = (stateKey === 'leak');
    var isCondensate = (stateKey === 'condensate');

    var p = (isLeak ? 1.25 : 3.92) + (Math.random() * 0.08 - 0.04);
    var q = (isLeak ? 840.0 : 1245.8) + (Math.random() * 6 - 3);
    var ch4 = (isLeak ? 54.8 : 58.4) + (Math.random() * 0.2 - 0.1);
    var h2s = 34.2 + (Math.random() * 0.4 - 0.2);
    var o2 = (isLeak ? 1.42 : 0.68) + (Math.random() * 0.04 - 0.02);

    if (isCondensate) {
      p += Math.sin(Date.now() / 2000) * 0.22;
    }

    var ds = overviewChart.data.datasets;
    var labels = overviewChart.data.labels;

    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var ss = String(now.getSeconds()).padStart(2, '0');
    var timeStr = hh + ':' + mm + ':' + ss;

    labels.shift();
    labels.push(timeStr);

    ds[0].data.shift(); ds[0].data.push(Number(p.toFixed(2)));
    ds[1].data.shift(); ds[1].data.push(Number(q.toFixed(1)));
    ds[2].data.shift(); ds[2].data.push(Number(ch4.toFixed(1)));
    ds[3].data.shift(); ds[3].data.push(Number(h2s.toFixed(1)));
    ds[4].data.shift(); ds[4].data.push(Number(o2.toFixed(2)));

    overviewChart.update('none'); // Update without full redraw animation for smoothness

    $('#legendPressureVal') && ($('#legendPressureVal').textContent = fmt(p, 2) + ' kPa');
    $('#legendFlowVal') && ($('#legendFlowVal').textContent = fmt(q, 1) + ' m³/h');
    $('#legendCH4Val') && ($('#legendCH4Val').textContent = fmt(ch4, 1) + ' %Vol');
    $('#legendH2SVal') && ($('#legendH2SVal').textContent = fmt(h2s, 1) + ' ppm');
    $('#legendO2Val') && ($('#legendO2Val').textContent = fmt(o2, 2) + ' %Vol (< 5% LEL)');
  }

  /* ----------------------------------------------------------------------
     Node Specific History Trend Chart
     ---------------------------------------------------------------------- */
  function initNodeHistoryChart() {
    var canvas = $('#nodeHistoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    var ctx = canvas.getContext('2d');
    var labels = [];
    var pData = [];
    var qData = [];
    var ch4Data = [];

    for (var i = 11; i >= 0; i--) {
      labels.push(i === 0 ? 'Sekarang' : '-' + (i * 2) + ' mnt');
      pData.push(4.80 + (Math.random() * 0.08 - 0.04));
      qData.push(1245 + (Math.random() * 6 - 3));
      ch4Data.push(58.4 + (Math.random() * 0.2 - 0.1));
    }

    var gradSky = ctx.createLinearGradient(0, 0, 0, 200);
    gradSky.addColorStop(0, 'rgba(2, 132, 199, 0.2)');
    gradSky.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    nodeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tekanan (kPa)',
            data: pData,
            borderColor: '#0284c7',
            backgroundColor: gradSky,
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.35,
            yAxisID: 'yP'
          },
          {
            label: 'Laju Alir (m³/h)',
            data: qData,
            borderColor: '#f59e0b',
            borderWidth: 1.8,
            pointRadius: 2,
            tension: 0.35,
            yAxisID: 'yQ'
          },
          {
            label: 'CH₄ (%Vol)',
            data: ch4Data,
            borderColor: '#10b981',
            borderWidth: 1.8,
            pointRadius: 2,
            tension: 0.35,
            yAxisID: 'yCH4'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Plus Jakarta Sans', size: 11 },
            bodyFont: { family: 'JetBrains Mono', size: 10 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(226, 232, 240, 0.5)' },
            ticks: { font: { family: 'JetBrains Mono', size: 9 }, color: '#64748b' }
          },
          yP: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'kPa', color: '#0284c7', font: { size: 9 } },
            ticks: { color: '#0284c7', font: { family: 'JetBrains Mono', size: 9 } }
          },
          yQ: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'm³/h', color: '#f59e0b', font: { size: 9 } },
            ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 9 } }
          },
          yCH4: { display: false, min: 0, max: 100 }
        }
      }
    });

    updateNodeHistoryChart(M.state.selectedNodeId || 'N01');
  }

  function updateNodeHistoryChart(nodeId) {
    if (!nodeChart) return;
    var node = null;
    for (var i = 0; i < D.nodes.length; i++) {
      if (D.nodes[i].id === nodeId) { node = D.nodes[i]; break; }
    }
    if (!node) return;

    var titleEl = $('#nodeHistoryChartTitle');
    if (titleEl) {
      titleEl.textContent = 'Grafik Riwayat Telemetri: ' + node.id + ' — ' + node.name;
    }

    var st = D.operationalStates[M.state.opStateKey] || D.operationalStates.normal;
    var overrides = st.overrides || {};
    var telemetry = Object.assign({}, node.base, overrides[node.id] || {});

    var count = 12;
    var pData = [];
    var qData = [];
    var ch4Data = [];

    for (var j = 0; j < count; j++) {
      var jitterP = (Math.random() * 0.06 - 0.03);
      var jitterQ = (Math.random() * 4 - 2);
      var jitterCH4 = (Math.random() * 0.2 - 0.1);
      pData.push(Number((telemetry.p + jitterP).toFixed(2)));
      qData.push(Number((telemetry.q + jitterQ).toFixed(1)));
      ch4Data.push(Number((telemetry.ch4 + jitterCH4).toFixed(1)));
    }

    nodeChart.data.datasets[0].data = pData;
    nodeChart.data.datasets[1].data = qData;
    nodeChart.data.datasets[2].data = ch4Data;
    nodeChart.update();
  }

  /* ----------------------------------------------------------------------
     4 Titik Stasiun Monitoring Alat Jaringan Pipa
     ---------------------------------------------------------------------- */
  function initStationMonitoring() {
    // Select Station button
    $$('[data-select-station]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nodeId = btn.getAttribute('data-select-station');
        selectMonitoringStation(nodeId);
      });
    });

    // Focus on Map button
    $$('[data-focus-station]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nodeId = btn.getAttribute('data-focus-station');
        focusStationOnMap(nodeId);
      });
    });

    // Whole card click
    $$('.station-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var nodeId = card.getAttribute('data-station-node');
        if (nodeId) selectMonitoringStation(nodeId);
      });
    });

    updateStationCardsData();
  }

  function selectMonitoringStation(nodeId) {
    M.set({ selectedNodeId: nodeId });

    var sel = $('#fleetNodeSelect');
    if (sel) sel.value = nodeId;

    renderSelectedNodeDetails(nodeId);
    highlightStationCard(nodeId);

    // Scroll smoothly to detail card if below
    var detailCard = $('#fleetDetailName');
    if (detailCard) {
      detailCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function focusStationOnMap(nodeId) {
    // Switch to topology tab
    var topoNavBtn = $('[data-target-tab="topology"]');
    if (topoNavBtn) topoNavBtn.click();

    // Map fly to or camera focus
    if (window.METHAGIS && typeof window.METHAGIS.focusCameraOnNode === 'function') {
      window.METHAGIS.focusCameraOnNode(nodeId);
    } else {
      for (var i = 0; i < D.nodes.length; i++) {
        if (D.nodes[i].id === nodeId) {
          if (window.__leafletMapInstance) {
            window.__leafletMapInstance.setView([D.nodes[i].lat, D.nodes[i].lon], 16, { animate: true });
          }
          break;
        }
      }
    }
  }

  function highlightStationCard(nodeId) {
    $$('.station-card').forEach(function (card) {
      var stId = card.getAttribute('data-station-node');
      if (stId === nodeId) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
  }

  function updateStationCardsData() {
    var stateKey = M.state.opStateKey || 'normal';
    var st = D.operationalStates[stateKey] || D.operationalStates.normal;
    var ov = st.overrides || {};

    var n01 = Object.assign({}, D.nodes[0].base, ov['N01'] || {});
    var n04 = Object.assign({}, D.nodes[3].base, ov['N04'] || {});
    var n07 = Object.assign({}, D.nodes[6].base, ov['N07'] || {});
    var n11 = Object.assign({}, D.nodes[10].base, ov['N11'] || {});

    // Station 1 (N01)
    $('#st1Pressure') && ($('#st1Pressure').textContent = fmt(n01.p, 2) + ' kPa');
    $('#st1Flow') && ($('#st1Flow').textContent = fmt(n01.q, 1) + ' m³/h');
    $('#st1CH4') && ($('#st1CH4').textContent = fmt(n01.ch4, 1) + ' %Vol');
    $('#st1O2H2S') && ($('#st1O2H2S').textContent = fmt(n01.o2, 2) + '% / ' + fmt(n01.h2s, 0) + ' ppm');

    // Station 2 (N04)
    $('#st2Pressure') && ($('#st2Pressure').textContent = fmt(n04.p, 2) + ' kPa');
    $('#st2Flow') && ($('#st2Flow').textContent = fmt(n04.q, 1) + ' m³/h');
    $('#st2CH4') && ($('#st2CH4').textContent = fmt(n04.ch4, 1) + ' %Vol');
    $('#st2O2H2S') && ($('#st2O2H2S').textContent = fmt(n04.o2, 2) + '% / ' + fmt(n04.h2s, 0) + ' ppm');

    // Station 3 (N07)
    $('#st3Pressure') && ($('#st3Pressure').textContent = fmt(n07.p, 2) + ' kPa');
    $('#st3Flow') && ($('#st3Flow').textContent = fmt(n07.q, 1) + ' m³/h');
    $('#st3RH') && ($('#st3RH').textContent = fmt(n07.rh, 1) + ' %RH');
    $('#st3Dew') && ($('#st3Dew').textContent = fmt(n07.t - 1.7, 1) + '°C');

    // Station 4 (N11)
    $('#st4Pressure') && ($('#st4Pressure').textContent = fmt(n11.p, 2) + ' kPa');
    $('#st4Flow') && ($('#st4Flow').textContent = fmt(n11.q, 1) + ' m³/h');
    $('#st4CH4') && ($('#st4CH4').textContent = fmt(n11.ch4, 1) + ' %Vol');

    // Station warning indicators based on state
    var cardTrap = document.querySelector('.station-card[data-station-node="N07"]');
    if (cardTrap) {
      var dotTrap = cardTrap.querySelector('.station-live-dot');
      if (stateKey === 'condensate') {
        cardTrap.className = 'station-card has-warning is-active';
        if (dotTrap) { dotTrap.className = 'station-live-dot warn'; dotTrap.title = 'Peringatan Hambatan Kondensat Kritis'; }
      } else {
        cardTrap.className = 'station-card' + (M.state.selectedNodeId === 'N07' ? ' is-active' : '');
        if (dotTrap) { dotTrap.className = 'station-live-dot'; dotTrap.title = 'Koneksi Normal'; }
      }
    }
  }

  /* ----------------------------------------------------------------------
     Citizen & FieldOps Portal
     ---------------------------------------------------------------------- */
  function initPortalModule() {
    var roleTabs = $$('[data-role-tab]');
    roleTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var role = tab.getAttribute('data-role-tab');
        roleTabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        if (role === 'warga') {
          $('#portalWargaView') && ($('#portalWargaView').style.display = 'block');
          $('#portalTeknisiView') && ($('#portalTeknisiView').style.display = 'none');
        } else {
          $('#portalWargaView') && ($('#portalWargaView').style.display = 'none');
          $('#portalTeknisiView') && ($('#portalTeknisiView').style.display = 'block');
        }
      });
    });

    var incidentForm = $('#citizenIncidentForm');
    if (incidentForm) {
      incidentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        alert('Laporan warga berhasil diteruskan ke Pos Pemantau DLH TPAS Manggar.');
        incidentForm.reset();
      });
    }

    var canvas = $('#bapSignatureCanvas');
    if (canvas) {
      var ctx = canvas.getContext('2d');
      var drawing = false;
      canvas.addEventListener('mousedown', function (e) {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
      });
      canvas.addEventListener('mousemove', function (e) {
        if (!drawing) return;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      window.addEventListener('mouseup', function () { drawing = false; });

      var btnClear = $('#btnClearSignature');
      if (btnClear) btnClear.addEventListener('click', function () { ctx.clearRect(0, 0, canvas.width, canvas.height); });

      var btnPrintBAP = $('#btnPrintBAP');
      if (btnPrintBAP) btnPrintBAP.addEventListener('click', function () { window.print(); });
    }
  }

  /* ----------------------------------------------------------------------
     Carbon Credit Ledger Table
     ---------------------------------------------------------------------- */
  function initCarbonModule() {
    var tbody = $('#carbonLedgerTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      D.carbonLedger.forEach(function (c) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td><strong>' + c.bulan + '</strong></td>' +
          '<td>' + fmt(c.lfgM3, 0) + ' m³</td>' +
          '<td>' + fmt(c.ch4Avg, 1) + '%</td>' +
          '<td><strong style="color:var(--color-emerald)">' + fmt(c.co2eTon, 1) + ' Ton</strong></td>' +
          '<td>Rp ' + fmt(c.valutaRp / 1000000, 2) + ' Juta</td>' +
          '<td><span class="badge badge-emerald">' + c.compliance + '</span></td>';
        tbody.appendChild(tr);
      });
    }

    var btnExportAudit = $('#btnExportAudit');
    if (btnExportAudit) {
      btnExportAudit.addEventListener('click', function () {
        var csvContent = 'data:text/csv;charset=utf-8,Bulan,Volume LFG (m3),CH4 (%),Reduksi CO2e (Ton),Nilai (Rp)\n';
        D.carbonLedger.forEach(function (r) {
          csvContent += [r.bulan, r.lfgM3, r.ch4Avg, r.co2eTon, r.valutaRp].join(',') + '\n';
        });
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'Laporan_Dekarbonisasi_Manggar.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  }

  /* ----------------------------------------------------------------------
     Hydraulic Profile SVG
     ---------------------------------------------------------------------- */
  function drawHydraulicProfile() {
    var svg = $('#hydraulicProfileSvg');
    if (!svg) return;
    var w = 800, h = 180;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';

    var groundPts = [[40, 50], [140, 65], [260, 75], [380, 85], [480, 95], [580, 100], [660, 135], [760, 125]];
    var pressPts = [[40, 40], [140, 52], [260, 65], [380, 78], [480, 90], [580, 102], [660, 118], [760, 130]];

    var groundD = 'M ' + groundPts[0][0] + ' ' + groundPts[0][1];
    for (var i = 1; i < groundPts.length; i++) groundD += ' L ' + groundPts[i][0] + ' ' + groundPts[i][1];
    groundD += ' L 760 170 L 40 170 Z';

    var pathGround = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathGround.setAttribute('d', groundD);
    pathGround.setAttribute('fill', '#f1f5f9');
    pathGround.setAttribute('stroke', '#cbd5e1');
    pathGround.setAttribute('stroke-width', '1.5');
    svg.appendChild(pathGround);

    var pressD = 'M ' + pressPts[0][0] + ' ' + pressPts[0][1];
    for (var j = 1; j < pressPts.length; j++) pressD += ' L ' + pressPts[j][0] + ' ' + pressPts[j][1];

    var pathPress = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathPress.setAttribute('d', pressD);
    pathPress.setAttribute('fill', 'none');
    pathPress.setAttribute('stroke', '#10b981');
    pathPress.setAttribute('stroke-width', '2.5');
    svg.appendChild(pathPress);

    var circleTrap = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleTrap.setAttribute('cx', '660');
    circleTrap.setAttribute('cy', '135');
    circleTrap.setAttribute('r', '7');
    circleTrap.setAttribute('fill', '#f59e0b');
    circleTrap.setAttribute('stroke', '#ffffff');
    circleTrap.setAttribute('stroke-width', '2');
    svg.appendChild(circleTrap);

    var textTrap = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textTrap.setAttribute('x', '660');
    textTrap.setAttribute('y', '158');
    textTrap.setAttribute('text-anchor', 'middle');
    textTrap.setAttribute('fill', '#d97706');
    textTrap.setAttribute('font-size', '10');
    textTrap.setAttribute('font-family', 'JetBrains Mono');
    textTrap.textContent = 'N07 Water Trap';
    svg.appendChild(textTrap);
  }

  /* ----------------------------------------------------------------------
     Bootstrap App
     ---------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    initNavigation();
    initSearch();
    initSCADAStatePicker();
    initAdminModule();
    initValveControls();
    initOverviewTelemetryChart();
    initNodeHistoryChart();
    initStationMonitoring();
    initPortalModule();
    initCarbonModule();
    drawHydraulicProfile();

    setTimeout(function () {
      initLeafletMap();
      if (window.METHAGIS) window.METHAGIS.init();
    }, 100);

    applyOperationalState('normal');
  });

})();
