/**
 * METHABALANCE Mobile Admin - Application Controller
 * UPTD TPAS Manggar × Dinas Lingkungan Hidup Kota Balikpapan
 */

(function () {
  'use strict';

  const D = MB_ADMIN.data;

  // State Management
  const state = {
    activeTab: 'ringkasan',
    customerFilter: 'all',
    searchQuery: '',
    selectedCustomerId: null,
    selectedNodeId: null,
    selectedTicketId: null,
    nodesState: JSON.parse(JSON.stringify(D.getScadaNodes())),
    ticketsState: JSON.parse(JSON.stringify(D.getTickets()))
  };

  // DOM Elements cache
  const el = {};

  function initElements() {
    // Tabs & Nav
    el.tabButtons = document.querySelectorAll('.bottom-nav-item');
    el.tabContents = document.querySelectorAll('.tab-content-panel');

    // Tab 1: Ringkasan
    el.kpiTotalCustomers = document.getElementById('kpiTotalCustomers');
    el.kpiMonthlyUsage = document.getElementById('kpiMonthlyUsage');
    el.kpiSavings = document.getElementById('kpiSavings');
    el.kpiEfficiency = document.getElementById('kpiEfficiency');
    el.dualBarChartWrap = document.getElementById('dualBarChartWrap');

    // Tab 2: Pelanggan
    el.customerSearchInput = document.getElementById('customerSearchInput');
    el.customerFilterChips = document.querySelectorAll('.filter-chip');
    el.customerListContainer = document.getElementById('customerListContainer');
    el.customerCountBadge = document.getElementById('customerCountBadge');

    // Tab 3: Pipa & Katup
    el.nodesListContainer = document.getElementById('nodesListContainer');
    el.btnQuickEmergencyValve = document.getElementById('btnQuickEmergencyValve');

    // Tab 4: Tiket Lapangan
    el.ticketListContainer = document.getElementById('ticketListContainer');

    // Tab 5: AI Assistant
    el.btnHeaderAi = document.getElementById('btnHeaderAi');
    el.btnResetAdminAiChat = document.getElementById('btnResetAdminAiChat');
    el.adminAiChipsBar = document.getElementById('adminAiChipsBar');
    el.adminAiChatStream = document.getElementById('adminAiChatStream');
    el.adminAiChatForm = document.getElementById('adminAiChatForm');
    el.adminAiInput = document.getElementById('adminAiInput');

    // Modals
    el.customerModal = document.getElementById('customerModal');
    el.valveModal = document.getElementById('valveModal');
    el.ticketModal = document.getElementById('ticketModal');
    el.toast = document.getElementById('adminToast');
    el.toastText = document.getElementById('adminToastText');
  }

  function showToast(message) {
    if (!el.toast) return;
    if (el.toastText) el.toastText.textContent = message;
    el.toast.classList.add('visible');
    setTimeout(() => {
      el.toast.classList.remove('visible');
    }, 3200);
  }

  /* ==========================================================================
     TAB NAVIGATION
     ========================================================================== */
  function setupNavigation() {
    el.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    if (adminLeafletMap) {
      setTimeout(() => {
        adminLeafletMap.invalidateSize();
      }, 250);
    }
    state.activeTab = tabId;
    el.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    el.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === 'tab-' + tabId);
    });

    // Re-render specifics if needed
    if (tabId === 'pelanggan') {
      renderCustomerList();
    } else if (tabId === 'pipa') {
      renderNodesList();
    } else if (tabId === 'tiket') {
      renderTicketList();
    } else if (tabId === 'ai') {
      if (el.adminAiChatStream) {
        el.adminAiChatStream.scrollTop = el.adminAiChatStream.scrollHeight;
      }
    }
  }

  /* ==========================================================================
     TAB 1: RINGKASAN & ANALYTICS CHARTS
     ========================================================================== */
  function renderRingkasan() {
    const kpi = D.getKpi();
    if (el.kpiTotalCustomers) el.kpiTotalCustomers.textContent = kpi.totalCustomers;
    if (el.kpiMonthlyUsage) el.kpiMonthlyUsage.textContent = D.formatNumber(kpi.monthlyConsumption, 1);
    if (el.kpiSavings) el.kpiSavings.textContent = D.formatRupiah(kpi.monthlySavings);
    if (el.kpiEfficiency) el.kpiEfficiency.textContent = kpi.methaneDestructionRate + '%';

    renderDualBarChart();
  }

  function renderDualBarChart() {
    if (!el.dualBarChartWrap) return;
    const data = D.getMonthlyEmission();
    const maxVal = 6000;
    const chartH = 130;
    const chartBaseY = 145;
    const chartW = 340;
    const groupW = chartW / data.length;

    let barsSvg = '';
    data.forEach((d, i) => {
      const xCenter = 12 + (i * groupW) + (groupW / 2);
      const barW = 10;
      const gap = 3;
      const x1 = xCenter - barW - (gap / 2);
      const x2 = xCenter + (gap / 2);

      const h1 = (d.pembakaranBersih / maxVal) * chartH;
      const y1 = chartBaseY - h1;

      const h2 = (d.flaringTerbuka / maxVal) * chartH;
      const y2 = chartBaseY - h2;

      barsSvg += `
        <g class="chart-group">
          <rect x="${x1.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h1.toFixed(1)}" rx="2" ry="2" fill="#059669"></rect>
          <rect x="${x2.toFixed(1)}" y="${y2.toFixed(1)}" width="${barW}" height="${h2.toFixed(1)}" rx="2" ry="2" fill="#94a3b8"></rect>
          <text x="${xCenter.toFixed(1)}" y="162" text-anchor="middle" font-size="9" fill="#64748b" font-family="'Inter', sans-serif">${d.bulan}</text>
        </g>
      `;
    });

    el.dualBarChartWrap.innerHTML = `
      <svg viewBox="0 0 360 170" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <line x1="12" y1="${chartBaseY}" x2="350" y2="${chartBaseY}" stroke="#e2e8f0" stroke-width="1"></line>
        <line x1="12" y1="${chartBaseY - (chartH * 0.5)}" x2="350" y2="${chartBaseY - (chartH * 0.5)}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="2 3"></line>
        ${barsSvg}
      </svg>
    `;
  }

  /* ==========================================================================
     TAB 2: PELANGGAN (SEARCH, FILTER & LIST)
     ========================================================================== */
  function setupCustomerControls() {
    if (el.customerSearchInput) {
      el.customerSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderCustomerList();
      });
    }

    el.customerFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        el.customerFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.customerFilter = chip.getAttribute('data-filter');
        renderCustomerList();
      });
    });
  }

  function renderCustomerList() {
    if (!el.customerListContainer) return;
    const customers = D.getCustomers();

    const filtered = customers.filter(c => {
      // Filter category
      let matchCat = true;
      if (state.customerFilter === 'RT 21') matchCat = c.rt === 'RT 21';
      else if (state.customerFilter === 'RT 22') matchCat = c.rt === 'RT 22';
      else if (state.customerFilter === 'RT 23') matchCat = c.rt === 'RT 23';
      else if (state.customerFilter === 'RT 24') matchCat = c.rt === 'RT 24';
      else if (state.customerFilter === 'umkm') matchCat = c.type === 'Pelaku Usaha';

      if (!matchCat) return false;

      // Filter search
      if (!state.searchQuery) return true;
      const q = state.searchQuery;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.node.toLowerCase().includes(q)
      );
    });

    if (el.customerCountBadge) {
      el.customerCountBadge.textContent = filtered.length + ' Akun';
    }

    if (filtered.length === 0) {
      el.customerListContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="36" height="36" style="color:var(--text-muted);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div style="font-weight:600;margin-top:6px;color:var(--text-secondary);">Tidak ada data pelanggan</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Coba ubah kata kunci pencarian atau filter RT</div>
        </div>
      `;
      return;
    }

    el.customerListContainer.innerHTML = filtered.map(c => `
      <div class="customer-item-card" data-customer-id="${c.id}">
        <div class="customer-card-head">
          <div>
            <div class="customer-name-row">
              <span class="customer-name">${c.name}</span>
              <span class="type-pill ${c.type === 'Pelaku Usaha' ? 'pill-umkm' : ''}">${c.type === 'Pelaku Usaha' ? 'UMKM' : c.rt}</span>
            </div>
            <div class="customer-id-sub">${c.id} &bull; ${c.node}</div>
          </div>
          <div class="customer-meter-val">
            <span class="num">${c.meter.toFixed(1).replace('.', ',')}</span>
            <span class="unit">m³</span>
          </div>
        </div>

        <div class="customer-card-divider"></div>

        <div class="customer-card-footer">
          <div class="cust-foot-col">
            <span class="foot-label">Iuran Bulanan</span>
            <span class="foot-status-text text-ok">&bull; Lunas (${D.formatRupiah(c.tariff)})</span>
          </div>
          <div class="cust-foot-col right">
            <span class="foot-label">Penghematan LPG</span>
            <span class="foot-val-text text-ok">${D.formatRupiah(c.savings)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Attach click for details
    el.customerListContainer.querySelectorAll('.customer-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const custId = card.getAttribute('data-customer-id');
        openCustomerModal(custId);
      });
    });
  }

  function openCustomerModal(custId) {
    const cust = D.getCustomers().find(c => c.id === custId);
    if (!cust || !el.customerModal) return;

    document.getElementById('modalCustName').textContent = cust.name;
    document.getElementById('modalCustId').textContent = cust.id + ' • ' + cust.rt;
    document.getElementById('modalCustAddress').textContent = cust.address;
    document.getElementById('modalCustNode').textContent = cust.node;
    document.getElementById('modalCustMeter').textContent = cust.meter.toFixed(1).replace('.', ',') + ' m³';
    document.getElementById('modalCustSavings').textContent = D.formatRupiah(cust.savings);
    document.getElementById('modalCustTariff').textContent = D.formatRupiah(cust.tariff) + ' / Bulan';
    document.getElementById('modalCustBattery').textContent = cust.battery + '% Normal';

    el.customerModal.classList.add('active');
  }

  /* ==========================================================================
     TAB 3: PIPA & KATUP SCADA
     ========================================================================== */
  
  let adminLeafletMap = null;
  const adminNodeMarkers = {};

  function initAdminGisMap() {
    const mapEl = document.getElementById('adminLeafletMap');
    if (!mapEl || typeof L === 'undefined') return;

    if (adminLeafletMap) {
      adminLeafletMap.remove();
      adminLeafletMap = null;
    }

    try {
      adminLeafletMap = L.map('adminLeafletMap', {
        center: [-1.2105, 116.9405],
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12
      }).addTo(adminLeafletMap);

      const bounds = [];
      const topology = D.getPipelineTopology ? D.getPipelineTopology() : null;

      if (topology && topology.trunkCoords) {
        topology.trunkCoords.forEach(pt => bounds.push(pt));
        L.polyline(topology.trunkCoords, {
          color: '#059669',
          weight: 4.8,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(adminLeafletMap).bindTooltip('Jalur Pipa Induk Transmisi Utama (DN80) DLH Manggar', { sticky: true });

        L.polyline(topology.trunkCoords, {
          color: '#34d399',
          weight: 2,
          opacity: 0.9,
          dashArray: '6, 12'
        }).addTo(adminLeafletMap);
      }

      if (topology && topology.branches) {
        topology.branches.forEach(b => {
          b.coords.forEach(pt => bounds.push(pt));
          L.polyline(b.coords, {
            color: '#059669',
            weight: 3.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(adminLeafletMap).bindTooltip(b.name || 'Cabang Distribusi', { sticky: true });

          L.polyline(b.coords, {
            color: '#34d399',
            weight: 1.6,
            opacity: 0.85,
            dashArray: '5, 10'
          }).addTo(adminLeafletMap);
        });
      }

      // Add markers for the 5 nodes
      state.nodesState.forEach(node => {
        if (!node.lat || !node.lng) return;
        bounds.push([node.lat, node.lng]);

        const isClosed = node.valve === 'CLOSED';
        const numLabel = node.id.replace('Node-0', '').replace('Node-', '');

        const icon = L.divIcon({
          className: 'valve-div-marker-wrapper',
          html: `<div class="valve-marker ${isClosed ? 'closed' : 'open'}" data-node-id="${node.id}" title="${node.name} (${node.valve})">
                   <span>${numLabel}</span>
                 </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([node.lat, node.lng], { icon }).addTo(adminLeafletMap);
        marker.bindTooltip(`<strong>${node.id} | ${node.name}</strong><br>Status: <span style="color:${isClosed ? '#ef4444' : '#10b981'};font-weight:700;">${node.valve}</span> | Tekanan: ${node.pressure} kPa<br><small style="color:#059669;font-weight:600;">Klik untuk Tutup/Buka Katup (Akses Teknisi)</small>`, {
          direction: 'top',
          offset: [0, -10]
        });

        marker.on('click', () => {
          openValveConfirmModal(node.id);
        });

        adminNodeMarkers[node.id] = marker;
      });

      if (bounds.length > 0) {
        adminLeafletMap.fitBounds(bounds, { padding: [20, 20] });
      }

      updateAdminMapCounts();

      // Multi-interval invalidateSize agar garis langsung tampil utuh
      [60, 150, 350, 700].forEach(ms => {
        setTimeout(() => {
          if (adminLeafletMap) {
            adminLeafletMap.invalidateSize();
            if (ms === 150 && bounds.length > 0) {
              adminLeafletMap.fitBounds(bounds, { padding: [20, 20] });
            }
          }
        }, ms);
      });

    } catch (err) {
      console.error('Error initializing admin GIS map:', err);
    }
  }

  function updateAdminMapCounts() {
    const openCount = state.nodesState.filter(n => n.valve === 'OPEN').length;
    const closedCount = state.nodesState.filter(n => n.valve === 'CLOSED').length;
    const openEl = document.getElementById('adminMapOpenCount');
    const closedEl = document.getElementById('adminMapClosedCount');
    if (openEl) openEl.textContent = openCount;
    if (closedEl) closedEl.textContent = closedCount;
  }

  function renderNodesList() {
    if (!el.nodesListContainer) return;

    el.nodesListContainer.innerHTML = state.nodesState.map(n => `
      <div class="node-item-card ${n.valve === 'CLOSED' ? 'node-isolated' : ''}">
        <div class="node-card-head">
          <div>
            <div class="node-id-tag ${n.type === 'upstream' ? 'tag-hulu' : ''}">${n.id}</div>
            <div class="node-name-text">${n.name}</div>
          </div>
          <span style="font-size:0.75rem;font-weight:700;color:${n.valve === 'OPEN' ? '#059669' : '#dc2626'};">
            ${n.valve === 'OPEN' ? 'Terbuka' : 'Tertutup'}
          </span>
        </div>

        <div class="node-metric-grid">
          <div class="node-metric-box">
            <span class="box-label">Tekanan Pipa</span>
            <span class="box-val num">${n.pressure.toFixed(1).replace('.', ',')} <small>kPa</small></span>
          </div>
          <div class="node-metric-box">
            <span class="box-label">Kemurnian CH₄</span>
            <span class="box-val num">${n.ch4.toFixed(1).replace('.', ',')}%</span>
          </div>
          <div class="node-metric-box">
            <span class="box-label">Oksigen (O₂)</span>
            <span class="box-val num">${n.o2.toFixed(1).replace('.', ',')}%</span>
          </div>
          <div class="node-metric-box">
            <span class="box-label">Kadar H₂S</span>
            <span class="box-val num">${n.h2s} <small>ppm</small></span>
          </div>
        </div>

        ${n.motorized ? `
          <div class="node-action-bar">
            <span class="motorized-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              Motorized Actuator SS304 (&lt; 5 detik)
            </span>
            <button class="btn-toggle-valve ${n.valve === 'OPEN' ? 'btn-shut' : 'btn-reopen'}" data-node-id="${n.id}">
              ${n.valve === 'OPEN' ? 'Isolasi Aliran' : 'Buka Aliran'}
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Attach valve toggle listeners
    el.nodesListContainer.querySelectorAll('.btn-toggle-valve').forEach(btn => {
      btn.addEventListener('click', () => {
        const nodeId = btn.getAttribute('data-node-id');
        openValveConfirmModal(nodeId);
      });
    });
  }

  function openValveConfirmModal(nodeId) {
    const node = state.nodesState.find(n => n.id === nodeId);
    if (!node || !el.valveModal) return;

    state.selectedNodeId = nodeId;
    const isCurrentlyOpen = node.valve === 'OPEN';

    document.getElementById('valveModalTargetName').textContent = node.id + ' — ' + node.name;
    document.getElementById('valveModalActionDesc').textContent = isCurrentlyOpen
      ? 'Tindakan ini akan mengaktifkan aktuator listrik motorik SS304 untuk MENUTUP pasokan biogas ke sektor ini dalam waktu kurang dari 5 detik demi mitigasi darurat.'
      : 'Tindakan ini akan MEMBUKA kembali aliran gas metana ke pipa distribusi warga setelah verifikasi keselamatan lapangan.';

    const confirmBtn = document.getElementById('btnConfirmValveModal');
    confirmBtn.textContent = isCurrentlyOpen ? 'Ya, Tutup Katup Sekarang' : 'Ya, Buka Kembali Katup';
    confirmBtn.className = isCurrentlyOpen ? 'btn-danger' : 'btn-emerald';

    el.valveModal.classList.add('active');
  }

  function executeValveToggle() {
    if (!state.selectedNodeId) return;
    const node = state.nodesState.find(n => n.id === state.selectedNodeId);
    if (!node) return;

    const newStatus = node.valve === 'OPEN' ? 'CLOSED' : 'OPEN';
    node.valve = newStatus;
    node.pressure = newStatus === 'CLOSED' ? 0.0 : (node.id === 'Node-01' ? 4.8 : 4.5);
    node.flow = newStatus === 'CLOSED' ? 0.0 : (node.id === 'Node-01' ? 124.5 : 32.0);

    // Update GIS Map Marker immediately
    const marker = adminNodeMarkers[node.id];
    if (marker && typeof L !== 'undefined') {
      const isClosed = newStatus === 'CLOSED';
      const numLabel = node.id.replace('Node-0', '').replace('Node-', '');
      const icon = L.divIcon({
        className: 'valve-div-marker-wrapper',
        html: `<div class="valve-marker ${isClosed ? 'closed' : 'open'}" data-node-id="${node.id}" title="${node.name} (${node.valve})">
                 <span>${numLabel}</span>
               </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      marker.setIcon(icon);
      marker.bindTooltip(`<strong>${node.id} &bull; ${node.name}</strong><br>Status: <span style="color:${isClosed ? '#ef4444' : '#10b981'};font-weight:700;">${node.valve}</span> &bull; Tekanan: ${node.pressure} kPa<br><small style="color:#059669;font-weight:600;">Klik untuk Tutup/Buka Katup (Akses Teknisi)</small>`, {
        direction: 'top',
        offset: [0, -10]
      });
    }

    updateAdminMapCounts();
    renderNodesList();
    el.valveModal.classList.remove('active');

    const actionText = newStatus === 'CLOSED' ? 'DITUTUP (ISOLASI ALIRAN DARURAT)' : 'DIBUKA KEMBALI (ALIRAN NORMAL)';
    showToast(`Perintah Sukses: Katup ${node.id} berhasil ${actionText} oleh Teknisi Lapangan.`);
  }

  /* ==========================================================================
     TAB 4: TIKET LAPANGAN & LAPORAN WARGA
     ========================================================================== */
  function renderTicketList() {
    if (!el.ticketListContainer) return;

    el.ticketListContainer.innerHTML = state.ticketsState.map(t => `
      <div class="ticket-item-card" data-ticket-id="${t.id}">
        <div class="ticket-card-head">
          <span class="ticket-id-badge">${t.id}</span>
          <span class="ticket-status-pill ${t.status === 'In Progress' ? 'status-progress' : 'status-resolved'}">
            &bull; ${t.status}
          </span>
        </div>

        <div class="ticket-category-title">${t.category}</div>
        <div class="ticket-customer-sub">Pelapor: <strong>${t.customerName}</strong> (${t.customerId})</div>
        <div class="ticket-loc-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${t.location}
        </div>

        <div class="ticket-card-footer">
          <span class="ticket-time-text">${t.time}</span>
          <span class="ticket-assigned-text">${t.assignedTo}</span>
        </div>
      </div>
    `).join('');

    el.ticketListContainer.querySelectorAll('.ticket-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const tId = card.getAttribute('data-ticket-id');
        openTicketModal(tId);
      });
    });
  }

  function openTicketModal(tId) {
    const ticket = state.ticketsState.find(t => t.id === tId);
    if (!ticket || !el.ticketModal) return;

    state.selectedTicketId = tId;
    document.getElementById('modalTicketId').textContent = ticket.id;
    document.getElementById('modalTicketCategory').textContent = ticket.category;
    document.getElementById('modalTicketCustomer').textContent = ticket.customerName + ' (' + ticket.customerId + ')';
    document.getElementById('modalTicketLocation').textContent = ticket.location;
    document.getElementById('modalTicketCoords').textContent = ticket.coordinates;
    document.getElementById('modalTicketTime').textContent = ticket.time;
    document.getElementById('modalTicketAssigned').textContent = ticket.assignedTo;
    document.getElementById('modalTicketNotes').textContent = ticket.notes;

    el.ticketModal.classList.add('active');
  }

  /* ==========================================================================
     MODAL CONTROLS & EVENT LISTENERS
     ========================================================================== */
  function setupModals() {
    // Close buttons
    document.querySelectorAll('.modal-close-btn, .btn-modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
      });
    });

    // Backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('active');
      });
    });

    // Confirm Valve
    const confirmValveBtn = document.getElementById('btnConfirmValveModal');
    if (confirmValveBtn) {
      confirmValveBtn.addEventListener('click', executeValveToggle);
    }

    // Quick Emergency Button in Pipa Tab
    if (el.btnQuickEmergencyValve) {
      el.btnQuickEmergencyValve.addEventListener('click', () => {
        openValveConfirmModal('Node-06');
      });
    }

    // Resolve Ticket Button
    const resolveTicketBtn = document.getElementById('btnResolveTicket');
    if (resolveTicketBtn) {
      resolveTicketBtn.addEventListener('click', () => {
        if (!state.selectedTicketId) return;
        const ticket = state.ticketsState.find(t => t.id === state.selectedTicketId);
        if (ticket) {
          ticket.status = 'Resolved';
          ticket.notes += ' • Diselesaikan oleh Admin DLH via Mobile Portal.';
          renderTicketList();
          el.ticketModal.classList.remove('active');
          showToast(`Tiket ${ticket.id} telah ditandai Selesai / Resolved.`);
        }
      });
    }
  }

  
  /* ==========================================================================
     TAB 5: AI ASSISTANT LOGIC & REASONING ENGINE
     ========================================================================== */
  function initAiAssistant() {
    if (el.btnHeaderAi) {
      el.btnHeaderAi.addEventListener('click', () => {
        switchTab('ringkasan');
      });
    }

    if (el.btnResetAdminAiChat) {
      el.btnResetAdminAiChat.addEventListener('click', () => {
        resetAdminAiChat();
        showToast('Percakapan AI Assistant telah dibersihkan.');
      });
    }

    if (el.adminAiChipsBar) {
      el.adminAiChipsBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.ai-chip-btn');
        if (!chip) return;
        const q = chip.getAttribute('data-query');
        if (q) handleAiSubmit(q);
      });
    }

    if (el.adminAiChatForm) {
      el.adminAiChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!el.adminAiInput) return;
        const q = el.adminAiInput.value.trim();
        if (q) {
          handleAiSubmit(q);
          el.adminAiInput.value = '';
        }
      });
    }

    // Populate initial welcome message
    resetAdminAiChat();
  }

  function resetAdminAiChat() {
    if (!el.adminAiChatStream) return;
    el.adminAiChatStream.innerHTML = '';
    appendAiMessage({
      sender: 'assistant',
      title: 'Halo Administrator TPAS Manggar',
      time: 'Live SCADA',
      contentHtml: `
        Saya asisten cerdas operasional jaringan biogas TPAS Manggar & DLH Balikpapan. Saya terhubung langsung ke telemetri neraca massa pipa, sensor gas CH₄, katup motorik GIS, SOP teknis kuras siphon, serta data penagihan iuran.
        <ul>
          <li><strong>Neraca Massa:</strong> Inflow 142,6 Nm³/h, Outflow 135,2 Nm³/h (Delta 5,18%)</li>
          <li><strong>Katup GIS:</strong> 5 Unit Motorized Ball Valve (3 Buka, 2 Siaga)</li>
          <li><strong>Kualitas Gas:</strong> CH₄ 56,4% Vol (Api Biru pembakaran optimal)</li>
          <li><strong>Iuran Bulanan:</strong> RT Rp 10.000 / bln, UMKM Rp 25.000 / bln (25k)</li>
        </ul>
        Pilih topik cepat di atas atau ajukan pertanyaan spesifik di bawah.
      `
    });
  }

  function handleAiSubmit(query) {
    if (!el.adminAiChatStream) return;

    // 1. Append user message
    appendAiMessage({
      sender: 'user',
      text: query
    });

    // 2. Generate response based on domain data
    const response = evaluateAdminAiQuery(query);

    // 3. Append bot response after minor realistic latency
    setTimeout(() => {
      appendAiMessage({
        sender: 'assistant',
        title: response.title,
        time: 'Baru saja',
        contentHtml: response.contentHtml,
        actionLabel: response.actionLabel,
        actionTab: response.actionTab
      });
    }, 250);
  }

  function appendAiMessage(data) {
    if (!el.adminAiChatStream) return;

    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ' + (data.sender === 'user' ? 'user' : 'assistant');

    if (data.sender === 'user') {
      wrap.innerHTML = `<div class="ai-bubble-user">${escapeHtml(data.text)}</div>`;
    } else {
      let actionHtml = '';
      if (data.actionLabel && data.actionTab) {
        actionHtml = `
          <div class="ai-bot-action-box">
            <button type="button" class="ai-action-btn" data-action-tab="${data.actionTab}">
              ${data.actionLabel}
            </button>
          </div>
        `;
      }

      wrap.innerHTML = `
        <div class="ai-bubble-bot">
          <div class="ai-bot-header">
            <span class="ai-bot-avatar">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3c0 4.5-3.5 8-8 8 4.5 0 8 3.5 8 8 0-4.5 3.5-8 8-8-4.5 0-8-3.5-8-8z"/>
              </svg>
            </span>
            <span class="ai-bot-name">AI Assistant METHABALANCE</span>
            <span class="ai-bot-time">${data.time || 'Live'}</span>
          </div>
          ${data.title ? `<div class="ai-bot-title">${data.title}</div>` : ''}
          <div class="ai-bot-content">${data.contentHtml}</div>
          ${actionHtml}
        </div>
      `;

      // Attach action button listener
      const actionBtn = wrap.querySelector('.ai-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          const targetTab = actionBtn.getAttribute('data-action-tab');
          if (targetTab) switchTab(targetTab);
        });
      }
    }

    el.adminAiChatStream.appendChild(wrap);
    el.adminAiChatStream.scrollTop = el.adminAiChatStream.scrollHeight;
  }

  function evaluateAdminAiQuery(query) {
    const q = query.toLowerCase();

    // 1. Neraca Massa / Mass Balance / Debit / Rugi / Aliran
    if (q.includes('neraca') || q.includes('massa') || q.includes('balance') || q.includes('loss') || q.includes('rugi') || q.includes('debit') || q.includes('inflow') || q.includes('outflow')) {
      return {
        title: 'Analisis Neraca Massa Gas (Mass Balance)',
        contentHtml: `
          Status distribusi biogas saat ini berada dalam kondisi <strong>SEIMBANG & STABIL</strong>:
          <ul>
            <li><strong>Debit Pasokan Hulu (TPAS Manggar):</strong> 142,6 Nm³/h (Tekanan 4,5 kPa)</li>
            <li><strong>Total Konsumsi Hilir (Warga & UMKM):</strong> 135,2 Nm³/h</li>
            <li><strong>Delta Deviasi Rugi-Rugi:</strong> 7,4 Nm³/h (5,18%)</li>
            <li><strong>Ambang Toleransi Pipa PVC:</strong> Maksimum 8,0% (Normal Operasional)</li>
            <li><strong>Efisiensi Transmisi Jaringan:</strong> 94,8%</li>
          </ul>
          Rugi-rugi teknis berada dalam rentang wajar jaringan 8,3 km tanpa kebocoran pipa utama.
        `,
        actionLabel: 'Buka Tab Beranda',
        actionTab: 'ringkasan'
      };
    }

    // 2. Katup / Valve / GIS / Pipa / Node / Aktuator / Spasial
    if (q.includes('katup') || q.includes('valve') || q.includes('node') || q.includes('tutup') || q.includes('gis') || q.includes('spasial') || q.includes('aktuator')) {
      const closedNodes = state.nodesState.filter(n => n.status !== 'open').map(n => n.name).join(', ') || 'Semua Node Buka';
      return {
        title: 'Status Katup Motorik GIS (5 Node Distribusi)',
        contentHtml: `
          Status 5 Katup Motorik (Motorized Ball Valve SS304 NC) pada peta spasial GIS:
          <ul>
            <li><strong>3 Katup Normal BUKA:</strong> Node-01 (TPAS Hulu), Node-04 (RT 25), Node-05 (RT 22) dengan tekanan 2,5 – 6,0 kPa.</li>
            <li><strong>Katup TUTUP / SIAGA:</strong> ${closedNodes} diisolasi untuk pemeliharaan jaringan terjadwal.</li>
            <li><strong>Waktu Respon Solenoid:</strong> 3,8 detik respon darurat.</li>
            <li><strong>Kontrol Cepat:</strong> Anda dapat membuka/menutup katup darurat langsung di tab Pipa & Katup.</li>
          </ul>
        `,
        actionLabel: 'Buka Tab Pipa & Katup',
        actionTab: 'pipa'
      };
    }

    // 3. Siphon / Kondensat / Kuras / SOP / Air / Water Blocking
    if (q.includes('siphon') || q.includes('kuras') || q.includes('kondensat') || q.includes('sop') || q.includes('blocking') || q.includes('air') || q.includes('sumbat')) {
      return {
        title: 'SOP Kuras Siphon Kondensat Gravitasi U-Bend',
        contentHtml: `
          Prosedur Standar Operasional (SOP) Pembersihan Air Kondensat Pipa:
          <ul>
            <li><strong>1. Akses Titik Kuras:</strong> Buka penutup box manifold U-bend pada Node-07 cekungan RT 23.</li>
            <li><strong>2. Putar Drain Cock:</strong> Buka perlahan katup pembuangan air gravitasi (drain cock).</li>
            <li><strong>3. Purging Air:</strong> Tampung butiran kondensat hingga uap biogas murni beraroma khas keluar.</li>
            <li><strong>4. Penguncian & Verifikasi:</strong> Kunci kembali katup drain dan pantau kenaikan tekanan pipa hilir ke 4,2 kPa.</li>
          </ul>
          Catatan: Teknisi DLH Budi Santoso sedang menangani tiket INC-2026-088 di lokasi ini.
        `,
        actionLabel: 'Buka Tab Tiket',
        actionTab: 'tiket'
      };
    }

    // 4. Iuran / Retribusi / Warga / UMKM / Tarif / Pelanggan / LPG / Karbon
    if (q.includes('iuran') || q.includes('tarif') || q.includes('biaya') || q.includes('umkm') || q.includes('warga') || q.includes('pelanggan') || q.includes('retribusi') || q.includes('lpg') || q.includes('karbon')) {
      return {
        title: 'Rekap Iuran Pelanggan & Substitusi LPG WASTECO',
        contentHtml: `
          Struktur tarif retribusi dan dampak ekonomi program biogas TPAS Manggar:
          <ul>
            <li><strong>Rumah Tangga (SR):</strong> Rp 10.000 / bulan (380 Sambungan Rumah aktif).</li>
            <li><strong>UMKM Kuliner & Usaha Tahu:</strong> Rp 25.000 / bulan (29 UMKM aktif).</li>
            <li><strong>Total Pelanggan Terdaftar:</strong> 409 pelanggan (Koperasi WASTECO).</li>
            <li><strong>Penghematan Pengeluaran:</strong> Substitusi setara 1.140 tabung LPG 3kg (~Rp 23,9 juta per bulan).</li>
            <li><strong>Reduksi Emisi GRK:</strong> Menurunkan 14,8 Ton CO₂e setiap bulan.</li>
          </ul>
        `,
        actionLabel: 'Buka Tab Pelanggan',
        actionTab: 'pelanggan'
      };
    }

    // 5. Tiket / Gangguan / Komplain / Aduan / Teknisi
    if (q.includes('tiket') || q.includes('gangguan') || q.includes('aduan') || q.includes('keluhan') || q.includes('insiden') || q.includes('teknisi')) {
      const openCount = state.ticketsState.filter(t => t.status !== 'Resolved').length;
      return {
        title: 'Status Tiket Aduan & Penanganan Lapangan',
        contentHtml: `
          Terdapat <strong>${openCount} tiket aktif</strong> dalam pemantauan UPTD DLH:
          <ul>
            <li><strong>INC-2026-088:</strong> Hambatan air kondensat cekungan pipa Node-07 (RT 23) - Ditangani teknisi Budi Santoso.</li>
            <li><strong>INC-2026-087:</strong> Pembersihan burner kompor biogas tersumbat - Ditangani teknisi Budi Santoso.</li>
            <li><strong>INC-2026-086:</strong> Penggantian seal karet meter gas - Selesai.</li>
          </ul>
          Status tiket dapat diperbarui langsung ke status Resolved melalui panel Tiket.
        `,
        actionLabel: 'Buka Tab Tiket',
        actionTab: 'tiket'
      };
    }

    // 6. Kualitas Gas / Metana / CH4 / Api Biru
    if (q.includes('ch4') || q.includes('metana') || q.includes('kualitas') || q.includes('api') || q.includes('biru')) {
      return {
        title: 'Kualitas Biogas & Kemurnian Metana',
        contentHtml: `
          Hasil uji sensor optical NDIR Dynament terkini:
          <ul>
            <li><strong>Kemurnian Metana (CH₄):</strong> <strong>56,4% Vol</strong> (Standar aman api biru > 50,0%).</li>
            <li><strong>Suhu Transmisi Pipa:</strong> 29,2°C | Dew Point: 24,1°C.</li>
            <li><strong>Status Pembakaran:</strong> Api biru bersih tanpa jelaga pada kompor warga binaan.</li>
          </ul>
        `,
        actionLabel: 'Buka Tab Beranda',
        actionTab: 'ringkasan'
      };
    }

    // Fallback General
    return {
      title: 'Panduan Operasional SCADA TPAS Manggar',
      contentHtml: `
        Informasi operasional siap dianalisis:
        <ul>
          <li>Ketik <strong>"neraca massa"</strong> untuk debit inflow hulu & rugi transmisi.</li>
          <li>Ketik <strong>"katup"</strong> untuk cek status 5 unit motorized ball valve GIS.</li>
          <li>Ketik <strong>"sop siphon"</strong> untuk langkah kuras air kondensat pipa.</li>
          <li>Ketik <strong>"iuran"</strong> untuk rincian iuran RT (Rp 10.000) dan UMKM (Rp 25.000).</li>
          <li>Ketik <strong>"tiket"</strong> untuk daftar keluhan dan penanganan teknisi.</li>
        </ul>
      `,
      actionLabel: 'Buka Tab Beranda',
      actionTab: 'ringkasan'
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  // Init Application
  document.addEventListener('DOMContentLoaded', () => {
    initElements();
    setupNavigation();
    setupCustomerControls();
    setupModals();
    renderRingkasan();
    initAdminGisMap();
    initAiAssistant();

    const adminRefreshBtn = document.getElementById('btnAdminHeaderRefresh');
    if (adminRefreshBtn) {
      adminRefreshBtn.addEventListener('click', () => {
        renderRingkasan();
        showToast('Data telemetri SCADA berhasil disegarkan.');
      });
    }

    const berandaAiCard = document.getElementById('berandaAiCard');
    if (berandaAiCard) {
      berandaAiCard.addEventListener('click', () => {
        switchTab('ai');
      });
    }

    function checkUrlHash() {
      const hash = (window.location.hash || '').replace('#', '');
      if (['ringkasan', 'pelanggan', 'pipa', 'tiket', 'ai'].includes(hash)) {
        switchTab(hash);
      }
    }
    window.addEventListener('hashchange', checkUrlHash);
    checkUrlHash();

  });

})();
