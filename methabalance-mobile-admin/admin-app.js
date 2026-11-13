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
  function renderNodesList() {
    if (!el.nodesListContainer) return;

    el.nodesListContainer.innerHTML = state.nodesState.map(n => `
      <div class="node-item-card ${n.valve === 'CLOSED' ? 'node-isolated' : ''}">
        <div class="node-card-head">
          <div>
            <div class="node-id-tag ${n.type === 'upstream' ? 'tag-hulu' : ''}">${n.id}</div>
            <div class="node-name-text">${n.name}</div>
          </div>
          <div class="node-valve-badge ${n.valve === 'OPEN' ? 'valve-open' : 'valve-closed'}">
            ${n.valve === 'OPEN' ? 'KATUP BUKA' : 'KATUP TERTUTUP'}
          </div>
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
    node.pressure = newStatus === 'CLOSED' ? 0.2 : (node.id === 'Node-06' ? 4.2 : 4.5);

    renderNodesList();
    el.valveModal.classList.remove('active');

    showToast(`Perintah katup ${node.id} berhasil dieksekusi: Status kini ${newStatus}`);
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

  // Init Application
  document.addEventListener('DOMContentLoaded', () => {
    initElements();
    setupNavigation();
    setupCustomerControls();
    setupModals();
    renderRingkasan();
  });

})();
