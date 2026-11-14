/**
 * METHABALANCE Mobile - Application Controller (Vanilla JS)
 * Portal Warga & UMKM Penerima Manfaat Biogas WASTECO
 * UPTD TPAS Manggar × Dinas Lingkungan Hidup Kota Balikpapan
 */

(function () {
  'use strict';

  const MBM = window.MBM;
  if (!MBM || !MBM.data) {
    console.error('METHABALANCE Data module missing.');
    return;
  }

  /* ==========================================================================
     DOM ELEMENTS REPOSITORY
     ========================================================================== */
  const el = {
    // Navigation
    navBtns: document.querySelectorAll('.nav-tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // Header & Account Switcher
    hdrAccountRole: document.getElementById('hdrAccountRole'),
    hdrAccountId: document.getElementById('hdrAccountId'),
    btnOpenAccountModal: document.getElementById('btnOpenAccountModal'),
    accountModal: document.getElementById('accountModal'),
    btnCloseAccountModal: document.getElementById('btnCloseAccountModal'),
    btnSelectWarga: document.getElementById('btnSelectWarga'),
    btnSelectUmkm: document.getElementById('btnSelectUmkm'),

    // Grid State Controls
    btnToggleGridModal: document.getElementById('btnToggleGridModal'),
    gridModal: document.getElementById('gridModal'),
    btnCloseGridModal: document.getElementById('btnCloseGridModal'),
    headerGridPulse: document.getElementById('headerGridPulse'),
    headerGridLabel: document.getElementById('headerGridLabel'),
    btnSetGridNormal: document.getElementById('btnSetGridNormal'),
    btnSetGridIsolated: document.getElementById('btnSetGridIsolated'),

    // Tab 1: Beranda
    mainStatusBanner: document.getElementById('mainStatusBanner'),
    statusShieldIcon: document.getElementById('statusShieldIcon'),
    bannerTitle: document.getElementById('bannerTitle'),
    bannerDesc: document.getElementById('bannerDesc'),
    bannerPills: document.getElementById('bannerPills'),
    stoveStatusBadge: document.getElementById('stoveStatusBadge'),
    stoveStatusText: document.getElementById('stoveStatusText'),
    meterNumber: document.getElementById('meterNumber'),
    prevMonthUsage: document.getElementById('prevMonthUsage'),
    avgDailyUsage: document.getElementById('avgDailyUsage'),
    weeklySvgChart: document.getElementById('weeklySvgChart'),
    billingBadge: document.getElementById('billingBadge'),
    billingStatusText: document.getElementById('billingStatusText'),
    billingAmountText: document.getElementById('billingAmountText'),
    btnViewReceipt: document.getElementById('btnViewReceipt'),
    miniSavingsAmount: document.getElementById('miniSavingsAmount'),
    miniSavingsTubes: document.getElementById('miniSavingsTubes'),
    carbonOffsetHead: document.getElementById('carbonOffsetHead'),
    btnEmergencyShutoff: document.getElementById('btnEmergencyShutoff'),
    valveActionText: document.getElementById('valveActionText'),
    btnQuickReport: document.getElementById('btnQuickReport'),

    // Tab 2: Telemetri
    telemetryNodeTitle: document.getElementById('telemetryNodeTitle'),
    telemetryNodeSub: document.getElementById('telemetryNodeSub'),
    telemPressureVal: document.getElementById('telemPressureVal'),
    telemPressureBar: document.getElementById('telemPressureBar'),
    telemCh4Val: document.getElementById('telemCh4Val'),
    svgPressureCurve: document.getElementById('svgPressureCurve'),

    // Tab 3: Lapor
    btnOpenReportModal: document.getElementById('btnOpenReportModal'),
    reportModal: document.getElementById('reportModal'),
    btnCloseReportModal: document.getElementById('btnCloseReportModal'),
    incidentReportForm: document.getElementById('incidentReportForm'),
    formGeotagCoord: document.getElementById('formGeotagCoord'),
    reportCategorySelect: document.getElementById('reportCategorySelect'),
    reportLocationInput: document.getElementById('reportLocationInput'),
    reportDescTextarea: document.getElementById('reportDescTextarea'),
    reportsHistoryContainer: document.getElementById('reportsHistoryContainer'),

    // Tab 4: Profil
    profAvatarInitials: document.getElementById('profAvatarInitials'),
    profCustomerName: document.getElementById('profCustomerName'),
    profCustomerRole: document.getElementById('profCustomerRole'),
    profCustomerId: document.getElementById('profCustomerId'),
    profAddress: document.getElementById('profAddress'),
    profNodeSegment: document.getElementById('profNodeSegment'),
    profMeterSerial: document.getElementById('profMeterSerial'),
    profValveStatus: document.getElementById('profValveStatus'),
    prefNotifyCutoff: document.getElementById('prefNotifyCutoff'),
    prefNotifyDrain: document.getElementById('prefNotifyDrain'),
    prefNotifySavings: document.getElementById('prefNotifySavings'),

    // Valve Modal
    valveModal: document.getElementById('valveModal'),
    btnCloseValveModal: document.getElementById('btnCloseValveModal'),
    btnCancelValveAction: document.getElementById('btnCancelValveAction'),
    btnConfirmValveAction: document.getElementById('btnConfirmValveAction'),
    valveModalHeadText: document.getElementById('valveModalHeadText'),
    valveModalBodyText: document.getElementById('valveModalBodyText'),

    // Weather Header & Modal
    hdrWeatherTemp: document.getElementById('hdrWeatherTemp'),
    hdrWeatherCond: document.getElementById('hdrWeatherCond'),
    hdrWeatherHum: document.getElementById('hdrWeatherHum'),
    hdrWeatherTrap: document.getElementById('hdrWeatherTrap'),
    btnOpenWeatherModal: document.getElementById('btnOpenWeatherModal'),
    weatherModal: document.getElementById('weatherModal'),
    btnCloseWeatherModal: document.getElementById('btnCloseWeatherModal'),
    modalWeatherTemp: document.getElementById('modalWeatherTemp'),
    modalWeatherCond: document.getElementById('modalWeatherCond'),
    modalWeatherHum: document.getElementById('modalWeatherHum'),
    modalWeatherDew: document.getElementById('modalWeatherDew'),
    modalWeatherBaro: document.getElementById('modalWeatherBaro'),
    modalWeatherImpact: document.getElementById('modalWeatherImpact'),
    modalWeatherUpdated: document.getElementById('modalWeatherUpdated'),

    // Quick Helpdesk button on Beranda
    btnGoToHelpdesk: document.getElementById('btnGoToHelpdesk'),
    btnGoToGis: document.getElementById('btnGoToGis'),

    // Tab GIS & Valve Monitor Elements
    btnGisSegMap: document.getElementById('btnGisSegMap'),
    btnGisSegList: document.getElementById('btnGisSegList'),
    gisMapViewContainer: document.getElementById('gisMapViewContainer'),
    gisListViewContainer: document.getElementById('gisListViewContainer'),
    gisMapLeaflet: document.getElementById('gisMapLeaflet'),
    gisClosedAlertCard: document.getElementById('gisClosedAlertCard'),
    gisAlertTitle: document.getElementById('gisAlertTitle'),
    gisAlertDesc: document.getElementById('gisAlertDesc'),
    btnFilterAllNodes: document.getElementById('btnFilterAllNodes'),
    btnFilterOpenNodes: document.getElementById('btnFilterOpenNodes'),
    btnFilterClosedNodes: document.getElementById('btnFilterClosedNodes'),
    countOpenValves: document.getElementById('countOpenValves'),
    countClosedValves: document.getElementById('countClosedValves'),
    btnToggleSimulateValve: document.getElementById('btnToggleSimulateValve'),
    txtSimulateValve: document.getElementById('txtSimulateValve'),
    nodesCardsList: document.getElementById('nodesCardsList'),
    nodeDetailModal: document.getElementById('nodeDetailModal'),
    nodeDetailTitle: document.getElementById('nodeDetailTitle'),
    btnCloseNodeModal: document.getElementById('btnCloseNodeModal'),
    nodeModalStatusBox: document.getElementById('nodeModalStatusBox'),
    nodeModalValveBadge: document.getElementById('nodeModalValveBadge'),
    nodeModalNodeName: document.getElementById('nodeModalNodeName'),
    nodeModalSector: document.getElementById('nodeModalSector'),
    nodeModalPressure: document.getElementById('nodeModalPressure'),
    nodeModalFlow: document.getElementById('nodeModalFlow'),
    nodeModalCode: document.getElementById('nodeModalCode'),
    nodeModalValveType: document.getElementById('nodeModalValveType'),
    nodeModalElevation: document.getElementById('nodeModalElevation'),
    nodeModalBeneficiaries: document.getElementById('nodeModalBeneficiaries'),
    btnNodeAskHelpDesk: document.getElementById('btnNodeAskHelpDesk'),
    btnNodeReportIssue: document.getElementById('btnNodeReportIssue'),

    // Tab Helpdesk & Segment Controls
    btnSegChat: document.getElementById('btnSegChat'),
    btnSegInfo: document.getElementById('btnSegInfo'),
    helpdeskChatView: document.getElementById('helpdeskChatView'),
    helpdeskInfoView: document.getElementById('helpdeskInfoView'),

    // Chatbot Elements
    chatStream: document.getElementById('chatStream'),
    chatChipsWrapper: document.getElementById('chatChipsWrapper'),
    chatInputForm: document.getElementById('chatInputForm'),
    chatInputField: document.getElementById('chatInputField'),
    chatWelcomeBody: document.getElementById('chatWelcomeBody'),
    chatInitTime: document.getElementById('chatInitTime'),

    // Helpdesk Info Elements
    staffCardsContainer: document.getElementById('staffCardsContainer'),
    helpTicketForm: document.getElementById('helpTicketForm'),
    ticketCategorySelect: document.getElementById('ticketCategorySelect'),
    ticketScheduleSelect: document.getElementById('ticketScheduleSelect'),
    ticketNotesInput: document.getElementById('ticketNotesInput'),
    helpTicketsList: document.getElementById('helpTicketsList'),
    sopAccordionList: document.getElementById('sopAccordionList'),

    // Toast
    appToast: document.getElementById('appToast'),
    toastMessage: document.getElementById('toastMessage')
  };

  /* ==========================================================================
     TOAST NOTIFICATION HELPER
     ========================================================================== */
  let toastTimer = null;
  function showToast(msg) {
    if (!el.appToast || !el.toastMessage) return;
    el.toastMessage.textContent = msg;
    el.appToast.classList.add('active');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.appToast.classList.remove('active');
    }, 3200);
  }

  /* ==========================================================================
     TAB NAVIGATION SYSTEM
     ========================================================================== */
  function initTabNavigation() {
    el.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        if (targetId === 'tab-gis') {
          // Peta GIS langsung muncul di Beranda: scroll mulus ke bagian peta
          switchTab('tab-beranda');
          const mapSection = document.getElementById('berandaGisSection');
          if (mapSection) {
            mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (leafletMap) {
            setTimeout(() => {
              leafletMap.invalidateSize();
              if (gisBounds && gisBounds.length > 0) {
                leafletMap.fitBounds(gisBounds, { padding: [25, 25] });
              }
            }, 150);
          }
          return;
        }
        switchTab(targetId);
      });
    });

    if (el.btnQuickReport) {
      el.btnQuickReport.addEventListener('click', () => {
        switchTab('tab-lapor');
      });
    }

    if (el.btnGoToHelpdesk) {
      el.btnGoToHelpdesk.addEventListener('click', () => {
        switchTab('tab-helpdesk');
      });
    }

    const btnGisBackToHome = document.getElementById('btnGisBackToHome');
    if (btnGisBackToHome) {
      btnGisBackToHome.addEventListener('click', () => {
        switchTab('tab-beranda');
      });
    }
  }

  function switchTab(tabId) {
    el.navBtns.forEach(b => {
      const isTarget = b.getAttribute('data-tab') === tabId;
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    el.tabPanes.forEach(pane => {
      const isTarget = pane.id === tabId;
      pane.classList.toggle('active', isTarget);
      pane.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
    });

    if (leafletMap) {
      setTimeout(() => {
        leafletMap.invalidateSize();
        if (gisBounds && gisBounds.length > 0) {
          leafletMap.fitBounds(gisBounds, { padding: [25, 25] });
        }
      }, 150);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==========================================================================
     ACCOUNT & PROFILE MANAGEMENT
     ========================================================================== */
  function updateAccountUI() {
    const account = MBM.data.getActiveAccount();
    const isWarga = account.key === 'warga';

    // Header Account Bar
    if (el.hdrAccountRole) el.hdrAccountRole.textContent = account.roleBadge;
    if (el.hdrAccountId) el.hdrAccountId.textContent = account.id;

    // Modal Selection Highlight
    if (el.btnSelectWarga) {
      el.btnSelectWarga.style.border = isWarga ? '2px solid var(--primary)' : '1px solid var(--border)';
      el.btnSelectWarga.style.background = isWarga ? 'var(--primary-light)' : 'var(--surface)';
      const badge = el.btnSelectWarga.querySelector('.badge');
      if (badge) {
        badge.className = isWarga ? 'badge badge-success' : 'badge';
        badge.textContent = isWarga ? 'Aktif' : 'Beralih';
      }
    }
    if (el.btnSelectUmkm) {
      el.btnSelectUmkm.style.border = !isWarga ? '2px solid var(--primary)' : '1px solid var(--border)';
      el.btnSelectUmkm.style.background = !isWarga ? 'var(--primary-light)' : 'var(--surface)';
      const badge = el.btnSelectUmkm.querySelector('.badge');
      if (badge) {
        badge.className = !isWarga ? 'badge badge-success' : 'badge';
        badge.textContent = !isWarga ? 'Aktif' : 'Beralih';
      }
    }

    // Tab 1: Meter Numbers
    if (el.meterNumber) el.meterNumber.textContent = account.currentMonthUsage.toFixed(1).replace('.', ',');
    if (el.prevMonthUsage) el.prevMonthUsage.textContent = account.previousMonthUsage.toFixed(1).replace('.', ',') + ' m³';

    // Average daily calculation
    const totalWeekly = account.weeklyUsage.reduce((s, d) => s + d.val, 0);
    const avgDaily = (totalWeekly / account.weeklyUsage.length).toFixed(1).replace('.', ',');
    if (el.avgDailyUsage) el.avgDailyUsage.textContent = avgDaily + ' m³/hari';

    // Tab 1: Billing & Retribution Info (Tagihan Iuran Warga & Mini Savings Note)
    if (el.billingAmountText) {
      el.billingAmountText.innerHTML = MBM.data.formatRupiah(account.monthlyBilling || 10000) + ' <span class="billing-unit">/ Bulan</span>';
    }
    if (el.billingStatusText) {
      el.billingStatusText.innerHTML = (account.billingStatus || 'Lunas') + ' | ' + (account.billingPeriod || 'Nov 2026');
    }
    if (el.miniSavingsAmount) {
      el.miniSavingsAmount.textContent = MBM.data.formatRupiah(account.monthlyLpgSavings);
    }
    if (el.miniSavingsTubes) {
      el.miniSavingsTubes.textContent = 'setara ' + account.lpgTubesEquivalent + ' tabung 3kg';
    }

    // Tab 1: Carbon Offset
    if (el.carbonOffsetHead) {
      el.carbonOffsetHead.textContent = 'Dapur Anda telah mengurangi ' + account.carbonOffsetKg.toFixed(1).replace('.', ',') + ' kg CO₂e';
    }

    // Tab 2: Telemetry Node Header
    if (el.telemetryNodeTitle) {
      el.telemetryNodeTitle.textContent = 'Titik Pantau: ' + account.nodeSegment;
    }
    if (el.telemetryNodeSub) {
      el.telemetryNodeSub.textContent = isWarga ? 'Pipa PVC 3 Inci Class AW | RT 23 Manggar' : 'Pipa PVC 3 Inci Class AW | Klaster UMKM RT 22';
    }

    // Tab 3: Geotag Form Coordinates
    if (el.formGeotagCoord) {
      el.formGeotagCoord.textContent = account.coordinates + ' | ' + (isWarga ? 'RT 23 Manggar' : 'Klaster UMKM RT 22');
    }
    if (el.reportLocationInput) {
      el.reportLocationInput.value = account.address;
    }

    // Tab 4: Profile Details
    if (el.profCustomerName) el.profCustomerName.textContent = account.customerName;
    if (el.profCustomerId) el.profCustomerId.textContent = account.id;
    if (el.profCustomerRole) {
      el.profCustomerRole.innerHTML = account.type + ' | ID Pelanggan: <strong class="tabular-nums">' + account.id + '</strong>';
    }
    if (el.profAddress) el.profAddress.textContent = account.address;
    if (el.profNodeSegment) el.profNodeSegment.textContent = account.nodeSegment;
    if (el.profMeterSerial) el.profMeterSerial.textContent = account.meterSerial;

    // Initials
    if (el.profAvatarInitials) {
      const parts = account.customerName.replace(/Ibu|Bpk\./g, '').trim().split(' ');
      const initials = (parts[0] ? parts[0][0] : 'S') + (parts[1] ? parts[1][0] : 'A');
      el.profAvatarInitials.textContent = initials.toUpperCase();
    }

    // Tab 3 (Helpdesk): Update Welcome Chat Greeting for active account
    if (el.chatWelcomeBody) {
      el.chatWelcomeBody.textContent = `Selamat siang ${account.customerName} (${account.id}, ${account.roleBadge}). Data sensor ${account.nodeId} menunjukkan tekanan pipa di sektor tempat Anda stabil pada 4,2 kPa. Ada kendala teknis pasokan gas atau butuh bantuan lapangan hari ini?`;
    }

    // Render Weekly SVG Chart
    renderWeeklyChart(account.weeklyUsage);
  }

  function initAccountSwitcher() {
    if (el.btnOpenAccountModal) {
      el.btnOpenAccountModal.addEventListener('click', () => {
        el.accountModal.classList.add('active');
      });
    }

    if (el.btnCloseAccountModal) {
      el.btnCloseAccountModal.addEventListener('click', () => {
        el.accountModal.classList.remove('active');
      });
    }

    if (el.btnSelectWarga) {
      el.btnSelectWarga.addEventListener('click', () => {
        MBM.data.setActiveAccountKey('warga');
        updateAccountUI();
        el.accountModal.classList.remove('active');
        showToast('Beralih ke profil Rumah Tangga (Ibu Siti Aminah).');
      });
    }

    if (el.btnSelectUmkm) {
      el.btnSelectUmkm.addEventListener('click', () => {
        MBM.data.setActiveAccountKey('umkm');
        updateAccountUI();
        el.accountModal.classList.remove('active');
        showToast('Beralih ke profil Pelaku Usaha (Tahu & Tempe Manggar).');
      });
    }

    // Close on backdrop click
    if (el.accountModal) {
      el.accountModal.addEventListener('click', (e) => {
        if (e.target === el.accountModal) el.accountModal.classList.remove('active');
      });
    }
  }

  /* ==========================================================================
     OPERATIONAL GRID STATE CONTROLLER (NORMAL vs ISOLASI DARURAT)
     ========================================================================== */
  function updateGridUI() {
    const gridState = MBM.data.getGridState();
    const isNormal = gridState === 'NORMAL';
    const isUserValveClosed = MBM.data.isUserValveClosed();

    // Header Controls
    if (el.headerGridPulse) {
      el.headerGridPulse.style.color = isNormal ? '#22c55e' : '#ef4444';
    }
    if (el.headerGridLabel) {
      el.headerGridLabel.textContent = isNormal ? 'Normal' : 'Terisolasi';
    }

    // Main Safety Status Banner
    if (el.mainStatusBanner) {
      el.mainStatusBanner.className = isNormal ? 'status-banner normal' : 'status-banner isolated';
    }

    if (el.statusShieldIcon) {
      if (isNormal) {
        el.statusShieldIcon.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        `;
      } else {
        el.statusShieldIcon.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        `;
      }
    }

    if (el.bannerTitle) {
      el.bannerTitle.textContent = isNormal
        ? 'JARINGAN GAS RUMAH ANDA: AMAN & NORMAL'
        : 'PERHATIAN: PASOKAN GAS DIMATIKAN SEMENTARA DARI PUSAT';
    }

    if (el.bannerDesc) {
      el.bannerDesc.textContent = isNormal
        ? 'Pasokan gas metana dari TPAS Manggar mengalir lancar & stabil ke kompor Anda.'
        : 'Katup pengaman otomatis telah menutup aliran di Cabang B. Jangan nyalakan kompor atau sumber api. Pipa sedang dalam penanganan teknisi DLH Balikpapan.';
    }

    if (el.bannerPills) {
      if (isNormal) {
        el.bannerPills.innerHTML = `
          <span class="status-pill"><span class="pulse-dot" style="color:var(--success);"></span> Tekanan Stabil (4,2 kPa)</span>
          <span class="status-pill">CH₄ 56,4% Vol</span>
          <span class="status-pill">Api Biru Optimal</span>
        `;
      } else {
        el.bannerPills.innerHTML = `
          <span class="status-pill"><span class="pulse-dot" style="color:var(--danger);"></span> Perbaikan Diperkirakan 2 Jam</span>
          <span class="status-pill">Katup SS304 NC Tertutup (&lt; 5 Detik)</span>
          <span class="status-pill">Pemeriksaan Lapangan Aktif</span>
        `;
      }
    }

    // Stove Status on Meter Card (Plain Text, No Badge Box)
    if (el.stoveStatusBadge && el.stoveStatusText) {
      if (!isNormal) {
        el.stoveStatusBadge.className = 'status-text-plain text-danger';
        el.stoveStatusText.textContent = 'Aliran Terisolasi Pusat';
      } else if (isUserValveClosed) {
        el.stoveStatusBadge.className = 'status-text-plain text-warning';
        el.stoveStatusText.textContent = 'Katup Mandiri Terkunci';
      } else {
        el.stoveStatusBadge.className = 'status-text-plain text-ok';
        el.stoveStatusText.textContent = 'Kompor Aktif';
      }
    }

    // Telemetry Numbers update based on grid state
    if (el.telemPressureVal) {
      el.telemPressureVal.textContent = isNormal ? '4,2' : '0,4';
    }
    if (el.telemPressureBar) {
      el.telemPressureBar.textContent = isNormal ? '0,042 Bar | Normal' : '0,004 Bar | Terisolasi Dari Pusat';
    }

    // Tab 4: Valve status
    if (el.profValveStatus) {
      if (!isNormal) {
        el.profValveStatus.textContent = 'Terisolasi (Katup Motorik Pusat Node-06 Tertutup)';
        el.profValveStatus.style.color = 'var(--danger)';
      } else if (isUserValveClosed) {
        el.profValveStatus.textContent = 'Terkunci Manual (Oleh Penghuni Rumah)';
        el.profValveStatus.style.color = 'var(--warning)';
      } else {
        el.profValveStatus.textContent = 'Terbuka (Aliran Normal)';
        el.profValveStatus.style.color = 'var(--success)';
      }
    }

    // Emergency Shutoff Button State
    if (el.btnEmergencyShutoff && el.valveActionText) {
      if (isUserValveClosed) {
        el.btnEmergencyShutoff.className = 'control-btn control-btn-reopen';
        el.valveActionText.innerHTML = 'Buka Kembali Katup<br>(Alirkan Biogas)';
      } else {
        el.btnEmergencyShutoff.className = 'control-btn control-btn-danger';
        el.valveActionText.innerHTML = 'Tutup Katup Mandiri<br>(Emergency Shut-Off)';
      }
    }

    // Synchronize GIS UI with SCADA grid state
    if (typeof updateGisUI === 'function') {
      updateGisUI();
    }
  }

  function initGridModal() {
    if (el.btnToggleGridModal) {
      el.btnToggleGridModal.addEventListener('click', () => {
        el.gridModal.classList.add('active');
      });
    }

    if (el.btnCloseGridModal) {
      el.btnCloseGridModal.addEventListener('click', () => {
        el.gridModal.classList.remove('active');
      });
    }

    if (el.btnSetGridNormal) {
      el.btnSetGridNormal.addEventListener('click', () => {
        MBM.data.setGridState('NORMAL');
        updateGridUI();
        el.gridModal.classList.remove('active');
        showToast('Kondisi Jaringan: NORMAL (Pasokan gas mengalir stabil).');
      });
    }

    if (el.btnSetGridIsolated) {
      el.btnSetGridIsolated.addEventListener('click', () => {
        MBM.data.setGridState('ISOLASI_DARURAT');
        updateGridUI();
        el.gridModal.classList.remove('active');
        showToast('Kondisi Jaringan: ISOLASI DARURAT diaktifkan dari pusat.');
      });
    }

    if (el.gridModal) {
      el.gridModal.addEventListener('click', (e) => {
        if (e.target === el.gridModal) el.gridModal.classList.remove('active');
      });
    }
  }

  /* ==========================================================================
     EMERGENCY SHUT-OFF LOCAL VALVE CONTROL
     ========================================================================== */
  function initValveControls() {
    if (el.btnEmergencyShutoff) {
      el.btnEmergencyShutoff.addEventListener('click', () => {
        const isClosed = MBM.data.isUserValveClosed();
        if (isClosed) {
          // Confirm Re-open
          el.valveModalHeadText.textContent = 'Konfirmasi Buka Kembali Katup';
          el.valveModalHeadText.style.color = 'var(--success)';
          el.valveModalBodyText.innerHTML = 'Apakah Anda yakin ingin <strong>membuka kembali katup gas biogas</strong> ke kompor rumah? Pastikan kompor dalam keadaan mati sebelum membuka.';
          el.btnConfirmValveAction.textContent = 'Ya, Buka Katup';
          el.btnConfirmValveAction.style.backgroundColor = 'var(--success)';
        } else {
          // Confirm Shutoff
          el.valveModalHeadText.textContent = 'Konfirmasi Tutup Katup Mandiri';
          el.valveModalHeadText.style.color = 'var(--danger)';
          el.valveModalBodyText.innerHTML = 'Tindakan ini akan <strong>mengunci aliran gas biogas ke kompor rumah Anda</strong>. Gunakan fitur ini jika Anda mencium bau gas, hendak bepergian, atau saat kondisi darurat.';
          el.btnConfirmValveAction.textContent = 'Ya, Tutup Katup';
          el.btnConfirmValveAction.style.backgroundColor = 'var(--danger)';
        }
        el.valveModal.classList.add('active');
      });
    }

    if (el.btnCloseValveModal) {
      el.btnCloseValveModal.addEventListener('click', () => {
        el.valveModal.classList.remove('active');
      });
    }

    if (el.btnCancelValveAction) {
      el.btnCancelValveAction.addEventListener('click', () => {
        el.valveModal.classList.remove('active');
      });
    }

    if (el.btnConfirmValveAction) {
      el.btnConfirmValveAction.addEventListener('click', () => {
        const isClosed = MBM.data.isUserValveClosed();
        const newState = !isClosed;
        MBM.data.setUserValveClosed(newState);
        updateGridUI();
        el.valveModal.classList.remove('active');
        if (newState) {
          showToast('Katup gas mandiri Anda berhasil DITUTUP.');
        } else {
          showToast('Katup gas mandiri Anda berhasil DIBUKA KEMBALI.');
        }
      });
    }

    if (el.valveModal) {
      el.valveModal.addEventListener('click', (e) => {
        if (e.target === el.valveModal) el.valveModal.classList.remove('active');
      });
    }

    if (el.btnViewReceipt) {
      el.btnViewReceipt.addEventListener('click', () => {
        const active = MBM.data.getActiveAccount();
        showToast('Tanda Terima Iuran: ' + active.id + ' | ' + (active.billingPeriod || 'Nov 2026') + ' ' + MBM.data.formatRupiah(active.monthlyBilling || 10000) + ' dinyatakan LUNAS.');
      });
    }
  }

  /* ==========================================================================
     DYNAMIC SVG TRADING LINE CHART (SMOOTH AREA & TRADING CURVE)
     ========================================================================== */
  function renderWeeklyChart(weeklyData) {
    if (!el.weeklySvgChart || !Array.isArray(weeklyData) || weeklyData.length === 0) return;

    const svgWidth = 340;
    const svgHeight = 100;
    const padTop = 16;
    const padBottom = 22;
    const padLeft = 18;
    const padRight = 36;
    const usableW = svgWidth - padLeft - padRight;
    const usableH = svgHeight - padTop - padBottom;

    const values = weeklyData.map(d => d.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = (maxVal - minVal) || 1;
    const yBaselineMin = Math.max(0, minVal - range * 0.15);
    const yBaselineMax = maxVal + range * 0.15;
    const yRange = yBaselineMax - yBaselineMin;

    const points = weeklyData.map((d, i) => {
      const x = padLeft + (i / (weeklyData.length - 1)) * usableW;
      const y = padTop + usableH - ((d.val - yBaselineMin) / yRange) * usableH;
      return { x, y, data: d, isMax: d.val === maxVal, isMin: d.val === minVal };
    });

    // Build smooth bezier path
    let pathD = '';
    let areaD = '';

    points.forEach((p, i) => {
      if (i === 0) {
        pathD += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      } else {
        const prev = points[i - 1];
        const cp1x = (prev.x + (p.x - prev.x) / 2).toFixed(1);
        const cp1y = prev.y.toFixed(1);
        const cp2x = (prev.x + (p.x - prev.x) / 2).toFixed(1);
        const cp2y = p.y.toFixed(1);
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
    });

    // Close area path for trading gradient fill
    const firstP = points[0];
    const lastP = points[points.length - 1];
    areaD = `${pathD} L ${lastP.x.toFixed(1)} ${(svgHeight - padBottom).toFixed(1)} L ${firstP.x.toFixed(1)} ${(svgHeight - padBottom).toFixed(1)} Z`;

    const midY = (padTop + usableH * 0.5).toFixed(1);
    const bottomY = (svgHeight - padBottom).toFixed(1);

    let svgContent = `
      <defs>
        <linearGradient id="tradingAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.32"/>
          <stop offset="85%" stop-color="#10b981" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
        </linearGradient>
        <filter id="tradingGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#10b981" flood-opacity="0.35"/>
        </filter>
      </defs>

      <!-- Trading Gridlines (Horizontal) -->
      <line x1="${padLeft}" y1="${padTop}" x2="${svgWidth - padRight}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="2 3"/>
      <line x1="${padLeft}" y1="${midY}" x2="${svgWidth - padRight}" y2="${midY}" stroke="#e2e8f0" stroke-dasharray="2 3"/>
      <line x1="${padLeft}" y1="${bottomY}" x2="${svgWidth - padRight}" y2="${bottomY}" stroke="#cbd5e1" stroke-width="1"/>

      <!-- Trading Area Fill -->
      <path d="${areaD}" fill="url(#tradingAreaGrad)"/>

      <!-- Trading Curve Line (Glowing Line) -->
      <path d="${pathD}" fill="none" stroke="#059669" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#tradingGlow)"/>

      <!-- Live Reference Price Line on Latest Point -->
      <line x1="${padLeft}" y1="${lastP.y.toFixed(1)}" x2="${svgWidth - 6}" y2="${lastP.y.toFixed(1)}" stroke="#10b981" stroke-dasharray="2 2" stroke-width="1.2" opacity="0.8"/>
      
      <!-- Right Axis Live Value Tag -->
      <rect x="${svgWidth - 32}" y="${(lastP.y - 7).toFixed(1)}" width="28" height="14" rx="3" fill="#059669"/>
      <text x="${svgWidth - 18}" y="${(lastP.y + 3).toFixed(1)}" text-anchor="middle" font-size="8" font-family="var(--font-sans)" font-weight="700" fill="#ffffff">
        ${lastP.data.val.toFixed(1)}
      </text>
    `;

    // Data points & X axis day labels
    points.forEach((p, i) => {
      const isLatest = i === points.length - 1;

      // Circle Point
      if (isLatest) {
        svgContent += `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#10b981" opacity="0.35" class="pulse-dot"/>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#ffffff" stroke="#059669" stroke-width="2.2">
            <title>${p.data.day} (${p.data.date}): ${p.data.val} m³ (TERKINI)</title>
          </circle>
        `;
      } else {
        svgContent += `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#ffffff" stroke="#059669" stroke-width="1.8">
            <title>${p.data.day} (${p.data.date}): ${p.data.val} m³</title>
          </circle>
        `;
      }

      // High / Low Peak Badge
      if (p.isMax && !isLatest) {
        svgContent += `
          <text x="${p.x.toFixed(1)}" y="${(p.y - 6).toFixed(1)}" text-anchor="middle" font-size="8" font-family="var(--font-sans)" font-weight="700" fill="#047857">
            ▲ ${p.data.val.toFixed(1)}
          </text>
        `;
      } else if (p.isMin && !isLatest) {
        svgContent += `
          <text x="${p.x.toFixed(1)}" y="${(p.y + 11).toFixed(1)}" text-anchor="middle" font-size="8" font-family="var(--font-sans)" font-weight="700" fill="#64748b">
            ▼ ${p.data.val.toFixed(1)}
          </text>
        `;
      }

      // X Day Label
      svgContent += `
        <text x="${p.x.toFixed(1)}" y="${svgHeight - 6}" text-anchor="middle" font-size="8.5" font-family="var(--font-sans)" font-weight="${isLatest ? '700' : '500'}" fill="${isLatest ? '#0f172a' : '#64748b'}">
          ${p.data.day}
        </text>
      `;
    });

    el.weeklySvgChart.innerHTML = svgContent;
  }

  /* ==========================================================================
     DYNAMIC SVG PRESSURE CURVE (24-HOUR WITA)
     ========================================================================== */
  function renderPressureCurve() {
    if (!el.svgPressureCurve) return;

    const curveData = MBM.data.PRESSURE_HOURLY_CURVE;
    const svgWidth = 360;
    const svgHeight = 120;
    const padX = 28;
    const padYTop = 16;
    const padYBottom = 24;
    const plotW = svgWidth - padX * 2;
    const plotH = svgHeight - padYTop - padYBottom;

    // Safe pressure range: 2.0 to 5.5 kPa
    const minP = 2.0;
    const maxP = 5.5;

    function getX(index) {
      return padX + (index / (curveData.length - 1)) * plotW;
    }

    function getY(pVal) {
      const norm = (pVal - minP) / (maxP - minP);
      return padYTop + (1 - norm) * plotH;
    }

    // Build shaded peak cooking zone rectangles (05:00-08:00 and 16:00-19:30)
    let svgContent = '';

    // Zone 1: Morning cooking peak (approx index 3 to 5)
    const xMorningStart = getX(3);
    const xMorningEnd = getX(5);
    svgContent += `
      <rect x="${xMorningStart}" y="${padYTop}" width="${xMorningEnd - xMorningStart}" height="${plotH}" fill="#fed7aa" opacity="0.45"/>
    `;

    // Zone 2: Evening cooking peak (approx index 9 to 11)
    const xEveningStart = getX(9);
    const xEveningEnd = getX(11);
    svgContent += `
      <rect x="${xEveningStart}" y="${padYTop}" width="${xEveningEnd - xEveningStart}" height="${plotH}" fill="#fed7aa" opacity="0.45"/>
    `;

    // Nominal 4.2 kPa guideline dotted line
    const yNominal = getY(4.2);
    svgContent += `
      <line x1="${padX}" y1="${yNominal}" x2="${svgWidth - padX}" y2="${yNominal}" stroke="#136f46" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>
      <text x="${padX + 2}" y="${yNominal - 3}" font-size="7.5" font-family="var(--font-sans)" fill="#136f46" font-weight="600">Nominal 4,2 kPa</text>
    `;

    // Safe lower limit guideline 2.5 kPa
    const ySafeMin = getY(2.5);
    svgContent += `
      <line x1="${padX}" y1="${ySafeMin}" x2="${svgWidth - padX}" y2="${ySafeMin}" stroke="#dc2626" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.5"/>
      <text x="${svgWidth - padX - 2}" y="${ySafeMin - 3}" text-anchor="end" font-size="7" font-family="var(--font-sans)" fill="#dc2626">Batas Min 2,5 kPa</text>
    `;

    // Build curve path using smooth bezier
    let pathD = `M ${getX(0)} ${getY(curveData[0].pressure)}`;
    for (let i = 0; i < curveData.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(curveData[i].pressure);
      const x1 = getX(i + 1);
      const y1 = getY(curveData[i + 1].pressure);
      const cx = (x0 + x1) / 2;
      pathD += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }

    // Gradient Area under curve
    svgContent += `
      <defs>
        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#136f46" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#136f46" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${pathD} L ${getX(curveData.length - 1)} ${svgHeight - padYBottom} L ${getX(0)} ${svgHeight - padYBottom} Z" fill="url(#curveGradient)"/>
      <path d="${pathD}" fill="none" stroke="#136f46" stroke-width="2.4" stroke-linecap="round"/>
    `;

    // Data points & Hour labels
    curveData.forEach((pt, idx) => {
      const cx = getX(idx);
      const cy = getY(pt.pressure);
      const isKeyHour = idx === 0 || idx === 4 || idx === 6 || idx === 10 || idx === 13;

      // Circle dot
      svgContent += `
        <circle cx="${cx}" cy="${cy}" r="3.2" fill="#ffffff" stroke="#136f46" stroke-width="2">
          <title>${pt.hour}: ${pt.pressure} kPa</title>
        </circle>
      `;

      // Value label on cooking peak
      if (idx === 4 || idx === 10) {
        svgContent += `
          <text x="${cx}" y="${cy - 7}" text-anchor="middle" font-size="8" font-family="var(--font-sans)" font-weight="700" fill="#047857">
            ${pt.pressure} kPa
          </text>
        `;
      }

      // X-axis label
      if (isKeyHour) {
        svgContent += `
          <text x="${cx}" y="${svgHeight - 8}" text-anchor="middle" font-size="7.5" font-family="var(--font-sans)" fill="#59665e">
            ${pt.hour}
          </text>
        `;
      }
    });

    el.svgPressureCurve.innerHTML = svgContent;
  }

  /* ==========================================================================
     INCIDENT REPORTS (GEOTAGGED FORM & HISTORY)
     ========================================================================== */
  function renderReportsHistory() {
    if (!el.reportsHistoryContainer) return;
    const reports = MBM.data.getReports();

    if (!reports.length) {
      el.reportsHistoryContainer.innerHTML = `
        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.8rem;">
          Belum ada riwayat laporan yang dikirimkan.
        </div>
      `;
      return;
    }

    el.reportsHistoryContainer.innerHTML = reports.map(r => `
      <div class="report-ticket-card">
        <div class="ticket-header-row">
          <span class="ticket-id">${r.ticketId}</span>
          ${r.status === 'Selesai' ? '' : `<span class="badge badge-warning">${r.status}</span>`}
        </div>
        <div class="ticket-cat">${r.category}</div>
        <div class="ticket-desc">${r.desc}</div>
        <div class="ticket-meta-footer">
          <span>${r.createdAt}</span>
          <span>Petugas: <strong>${r.technician || 'Tim DLH'}</strong></span>
        </div>
      </div>
    `).join('');
  }

  function initReportForm() {
    if (el.btnOpenReportModal) {
      el.btnOpenReportModal.addEventListener('click', () => {
        el.reportModal.classList.add('active');
      });
    }

    if (el.btnCloseReportModal) {
      el.btnCloseReportModal.addEventListener('click', () => {
        el.reportModal.classList.remove('active');
      });
    }

    if (el.incidentReportForm) {
      el.incidentReportForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const account = MBM.data.getActiveAccount();
        const category = el.reportCategorySelect ? el.reportCategorySelect.value : 'Bau Gas';
        const location = el.reportLocationInput ? el.reportLocationInput.value : account.address;
        const desc = el.reportDescTextarea ? el.reportDescTextarea.value.trim() : '';

        if (!desc) {
          alert('Mohon isi deskripsi atau tanda-tanda kondisi di lapangan.');
          return;
        }

        const newReport = MBM.data.addReport({
          category: category,
          location: location,
          coordinates: account.coordinates,
          desc: desc
        });

        el.reportDescTextarea.value = '';
        el.reportModal.classList.remove('active');
        renderReportsHistory();
        showToast(`Laporan resmi ${newReport.ticketId} berhasil dikirim ke posko DLH.`);
      });
    }

    if (el.reportModal) {
      el.reportModal.addEventListener('click', (e) => {
        if (e.target === el.reportModal) el.reportModal.classList.remove('active');
      });
    }
  }

  /* ==========================================================================
     WEATHER TELEMETRY (HEADER & MODAL)
     ========================================================================== */
  function initWeather() {
    const w = MBM.data.getWeather();
    if (!w) return;

    if (el.hdrWeatherTemp) el.hdrWeatherTemp.textContent = w.temp.toLocaleString('id-ID') + w.tempUnit;
    if (el.hdrWeatherCond) el.hdrWeatherCond.textContent = w.condition;
    if (el.hdrWeatherHum) el.hdrWeatherHum.textContent = w.humidity + w.humidityUnit;
    if (el.hdrWeatherTrap) el.hdrWeatherTrap.textContent = 'Normal';

    // Modal elements
    if (el.modalWeatherTemp) el.modalWeatherTemp.textContent = w.temp.toLocaleString('id-ID') + w.tempUnit;
    if (el.modalWeatherCond) el.modalWeatherCond.textContent = w.condition;
    if (el.modalWeatherHum) el.modalWeatherHum.textContent = w.humidity + w.humidityUnit;
    if (el.modalWeatherDew) el.modalWeatherDew.textContent = w.dewPoint.toLocaleString('id-ID') + w.dewPointUnit;
    if (el.modalWeatherBaro) el.modalWeatherBaro.textContent = w.barometricPressure + ' ' + w.pressureUnit;
    if (el.modalWeatherImpact) el.modalWeatherImpact.textContent = w.pipelineImpact;
    if (el.modalWeatherUpdated) el.modalWeatherUpdated.textContent = w.lastUpdated;

    if (el.btnOpenWeatherModal && el.weatherModal) {
      el.btnOpenWeatherModal.addEventListener('click', () => {
        el.weatherModal.classList.add('active');
      });
    }

    if (el.btnCloseWeatherModal && el.weatherModal) {
      el.btnCloseWeatherModal.addEventListener('click', () => {
        el.weatherModal.classList.remove('active');
      });
    }

    if (el.weatherModal) {
      el.weatherModal.addEventListener('click', (e) => {
        if (e.target === el.weatherModal) el.weatherModal.classList.remove('active');
      });
    }
  }

  /* ==========================================================================
     HELPDESK MANAGEMENT (STAFF, TICKETS & PRACTICAL SOPS)
     ========================================================================== */
  function initHelpdesk() {
    // Segment controller
    if (el.btnSegChat && el.btnSegInfo) {
      el.btnSegChat.addEventListener('click', () => {
        el.btnSegChat.classList.add('active');
        el.btnSegChat.setAttribute('aria-selected', 'true');
        el.btnSegInfo.classList.remove('active');
        el.btnSegInfo.setAttribute('aria-selected', 'false');

        if (el.helpdeskChatView) el.helpdeskChatView.classList.add('active');
        if (el.helpdeskInfoView) el.helpdeskInfoView.classList.remove('active');
      });

      el.btnSegInfo.addEventListener('click', () => {
        el.btnSegInfo.classList.add('active');
        el.btnSegInfo.setAttribute('aria-selected', 'true');
        el.btnSegChat.classList.remove('active');
        el.btnSegChat.setAttribute('aria-selected', 'false');

        if (el.helpdeskInfoView) el.helpdeskInfoView.classList.add('active');
        if (el.helpdeskChatView) el.helpdeskChatView.classList.remove('active');
      });
    }

    renderStaffCards();
    renderHelpTickets();
    renderSopGuides();
    initHelpTicketForm();
  }

  function renderStaffCards() {
    if (!el.staffCardsContainer) return;
    const staff = MBM.data.getHelpStaff();
    if (!staff || !staff.length) return;

    el.staffCardsContainer.innerHTML = staff.map(st => `
      <div class="staff-card">
        <div class="staff-card-left">
          <div class="staff-avatar">${st.name.replace('Bpk. ', '').split(' ').map(p => p[0]).slice(0, 2).join('')}</div>
          <div class="staff-info">
            <div class="staff-name">${st.name}</div>
            <div class="staff-role">${st.role}</div>
            <div class="staff-sector">${st.sector} | <span style="color:#059669;font-weight:600;">${st.status}</span></div>
          </div>
        </div>
        <div class="staff-card-actions">
          <a href="tel:${st.phone.replace(/[^0-9]/g, '')}" class="staff-btn" title="Telepon Langsung ${st.name}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
          <a href="https://wa.me/${st.whatsapp}" target="_blank" rel="noopener noreferrer" class="staff-btn wa" title="WhatsApp Resmi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </a>
        </div>
      </div>
    `).join('');
  }

  function renderHelpTickets() {
    if (!el.helpTicketsList) return;
    const tickets = MBM.data.getHelpTickets();

    if (!tickets || !tickets.length) {
      el.helpTicketsList.innerHTML = `
        <div style="font-size:0.76rem;color:var(--text-muted);text-align:center;padding:12px;background:#f8fafc;border-radius:6px;">
          Belum ada tiket bantuan aktif.
        </div>
      `;
      return;
    }

    el.helpTicketsList.innerHTML = tickets.map(t => `
      <div class="ticket-item-card">
        <div class="ticket-item-head">
          <span class="ticket-id">${t.ticketId}</span>
          ${t.status === 'Selesai' ? '' : `<span class="badge badge-warning">${t.status}</span>`}
        </div>
        <div class="ticket-category">${t.category}</div>
        <div class="ticket-meta">
          Dibuat: <strong>${t.createdAt}</strong> | Jadwal: <strong>${t.scheduledAt}</strong><br>
          Petugas: <strong>${t.technician}</strong>
        </div>
        ${t.notes ? `<div class="ticket-notes">${t.notes}</div>` : ''}
      </div>
    `).join('');
  }

  function initHelpTicketForm() {
    if (!el.helpTicketForm) return;

    el.helpTicketForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const category = el.ticketCategorySelect ? el.ticketCategorySelect.value : 'Pengecekan Kompor';
      const scheduledAt = el.ticketScheduleSelect ? el.ticketScheduleSelect.value : 'Hari ini (Segera)';
      const notes = el.ticketNotesInput ? el.ticketNotesInput.value.trim() : '';

      if (!notes) {
        alert('Mohon isi keterangan keluhan atau gejala di rumah.');
        return;
      }

      const account = MBM.data.getActiveAccount();
      const newTicket = MBM.data.addHelpTicket({
        category: category,
        scheduledAt: scheduledAt,
        notes: notes,
        location: account.address
      });

      if (el.ticketNotesInput) el.ticketNotesInput.value = '';
      renderHelpTickets();
      showToast(`Tiket kunjungan ${newTicket.ticketId} berhasil diterbitkan.`);
    });
  }

  function renderSopGuides() {
    if (!el.sopAccordionList) return;
    const sops = MBM.data.getSopGuides();
    if (!sops || !sops.length) return;

    el.sopAccordionList.innerHTML = sops.map((sop, idx) => `
      <div class="sop-card ${idx === 0 ? 'open' : ''}" id="${sop.id}">
        <div class="sop-header" onclick="this.parentElement.classList.toggle('open')">
          <div>
            <div class="sop-title">${sop.title}</div>
            <div class="sop-summary">${sop.summary}</div>
          </div>
          <svg class="sop-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="sop-body">
          <ol>
            ${sop.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      </div>
    `).join('');
  }

  /* ==========================================================================
     CHATBOT INTERACTION ENGINE (LAYANAN TANGGAP OPERASIONAL WARGA)
     ========================================================================== */
  function initChatbot() {
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WITA';
    if (el.chatInitTime) el.chatInitTime.textContent = timeStr;

    // Quick Action Suggestion Chips
    if (el.chatChipsWrapper) {
      const chips = el.chatChipsWrapper.querySelectorAll('.chip-btn');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          const query = chip.getAttribute('data-query');
          if (query) handleUserChatMessage(query);
        });
      });
    }

    // Chat Form Submit
    if (el.chatInputForm) {
      el.chatInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!el.chatInputField) return;
        const query = el.chatInputField.value.trim();
        if (!query) return;
        el.chatInputField.value = '';
        handleUserChatMessage(query);
      });
    }
  }

  function handleUserChatMessage(queryText) {
    appendChatMessage('user', queryText);

    // Get answer from operational facts engine
    const reply = MBM.data.answerChatQuery(queryText);

    // Immediate realistic operational response
    setTimeout(() => {
      appendChatMessage('bot', reply.text, reply);
    }, 280);
  }

  function appendChatMessage(role, text, meta) {
    if (!el.chatStream) return;

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WITA';
    const isBot = role === 'bot';

    const row = document.createElement('div');
    row.className = `chat-bubble-row ${isBot ? 'bot' : 'user'}`;

    const senderName = isBot ? 'Asisten Biogas' : 'Anda (' + MBM.data.getActiveAccount().id + ')';

    let actionButtonHtml = '';
    if (isBot && meta && meta.actionLabel) {
      actionButtonHtml = `<button class="chat-action-btn" type="button" data-action="${meta.actionType || ''}" data-target="${meta.actionTarget || ''}" data-sop="${meta.sopId || ''}" data-cat="${meta.defaultCategory || ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span>${meta.actionLabel}</span>
      </button>`;
    }

    row.innerHTML = `
      <div class="chat-bubble ${isBot ? 'bot' : 'user'}">
        <div class="chat-sender-meta">
          <strong class="chat-sender-name">${senderName}</strong>
          <span class="chat-time">${timeStr}</span>
        </div>
        <div class="chat-bubble-body">${escapeHtml(text)}</div>
        ${actionButtonHtml}
      </div>
    `;

    el.chatStream.appendChild(row);
    el.chatStream.scrollTop = el.chatStream.scrollHeight;

    // Attach handler for action button if present
    const btnAction = row.querySelector('.chat-action-btn');
    if (btnAction) {
      btnAction.addEventListener('click', () => {
        handleChatAction(meta);
      });
    }
  }

  function handleChatAction(meta) {
    if (!meta) return;

    if (meta.actionType === 'create-emergency-ticket') {
      const account = MBM.data.getActiveAccount();
      const ticket = MBM.data.addHelpTicket({
        category: 'Layanan Darurat Bau Gas / Kebocoran',
        scheduledAt: 'Hari ini (Segera / Darurat < 30 Menit)',
        notes: 'Diterbitkan langsung melalui Chat Siaga Darurat. Alamat: ' + account.address
      });
      renderHelpTickets();
      showToast(`Tiket Darurat ${ticket.ticketId} diterbitkan! Teknisi segera meluncur.`);

      // Switch to Posko view to see ticket
      if (el.btnSegInfo) el.btnSegInfo.click();
    } else if (meta.actionType === 'open-sop') {
      if (el.btnSegInfo) el.btnSegInfo.click();
      if (meta.sopId) {
        const sopCard = document.getElementById(meta.sopId);
        if (sopCard) {
          sopCard.classList.add('open');
          sopCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else if (meta.actionType === 'create-ticket') {
      if (el.btnSegInfo) el.btnSegInfo.click();
      if (el.ticketCategorySelect && meta.defaultCategory) {
        el.ticketCategorySelect.value = meta.defaultCategory;
      }
      if (el.ticketNotesInput) {
        el.ticketNotesInput.focus();
      }
    } else if (meta.actionType === 'open-helpdesk-form' || meta.actionType === 'open-helpdesk-info') {
      if (el.btnSegInfo) el.btnSegInfo.click();
    } else if (meta.actionType === 'open-weather-modal') {
      if (el.weatherModal) el.weatherModal.classList.add('active');
    } else if (meta.actionTarget) {
      switchTab(meta.actionTarget);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     NOTIFICATION PREFERENCES TOGGLES
     ========================================================================== */
  function initPreferences() {
    const prefs = MBM.data.getPrefs();

    if (el.prefNotifyCutoff) {
      el.prefNotifyCutoff.checked = prefs.notifyCutoff;
      el.prefNotifyCutoff.addEventListener('change', () => {
        MBM.data.setPref('notifyCutoff', el.prefNotifyCutoff.checked);
        showToast('Pengaturan notifikasi pemutusan otomatis diperbarui.');
      });
    }

    if (el.prefNotifyDrain) {
      el.prefNotifyDrain.checked = prefs.notifyDrain;
      el.prefNotifyDrain.addEventListener('change', () => {
        MBM.data.setPref('notifyDrain', el.prefNotifyDrain.checked);
        showToast('Pengaturan notifikasi jadwal kuras water-trap diperbarui.');
      });
    }

    if (el.prefNotifySavings) {
      el.prefNotifySavings.checked = prefs.notifySavings;
      el.prefNotifySavings.addEventListener('change', () => {
        MBM.data.setPref('notifySavings', el.prefNotifySavings.checked);
        showToast('Pengaturan rekap bulanan penghematan LPG diperbarui.');
      });
    }
  }

  /* ==========================================================================
     TAB GIS & MOTORIZED BALL VALVE SCADA MONITORING
     Antislop: DLH Balikpapan × WASTECO Industrial GIS Interface
     ========================================================================== */
  let leafletMap = null;
  const nodeMarkers = {};
  let currentGisFilter = 'all';
  let activeInspectedNode = null;
  let gisBounds = null;

  function initGis() {
    if (!el.gisMapLeaflet) return;

    // Subview Switching: Peta Spasial vs Skema List 15 Node
    if (el.btnGisSegMap && el.btnGisSegList) {
      el.btnGisSegMap.addEventListener('click', () => {
        el.btnGisSegMap.classList.add('active');
        el.btnGisSegMap.setAttribute('aria-selected', 'true');
        el.btnGisSegList.classList.remove('active');
        el.btnGisSegList.setAttribute('aria-selected', 'false');
        if (el.gisMapViewContainer) el.gisMapViewContainer.classList.add('active');
        if (el.gisListViewContainer) el.gisListViewContainer.classList.remove('active');
        if (leafletMap) {
          setTimeout(() => leafletMap.invalidateSize(), 150);
        }
      });

      el.btnGisSegList.addEventListener('click', () => {
        el.btnGisSegList.classList.add('active');
        el.btnGisSegList.setAttribute('aria-selected', 'true');
        el.btnGisSegMap.classList.remove('active');
        el.btnGisSegMap.setAttribute('aria-selected', 'false');
        if (el.gisListViewContainer) el.gisListViewContainer.classList.add('active');
        if (el.gisMapViewContainer) el.gisMapViewContainer.classList.remove('active');
      });
    }

    // Filter Chips: Semua (15), Buka, Tutup
    if (el.btnFilterAllNodes) {
      el.btnFilterAllNodes.addEventListener('click', () => {
        setGisFilter('all');
      });
    }
    if (el.btnFilterOpenNodes) {
      el.btnFilterOpenNodes.addEventListener('click', () => {
        setGisFilter('open');
      });
    }
    if (el.btnFilterClosedNodes) {
      el.btnFilterClosedNodes.addEventListener('click', () => {
        setGisFilter('closed');
      });
    }

    // Modal Close
    if (el.btnCloseNodeModal) {
      el.btnCloseNodeModal.addEventListener('click', () => {
        closeNodeDetailModal();
      });
    }
    if (el.nodeDetailModal) {
      el.nodeDetailModal.addEventListener('click', (e) => {
        if (e.target === el.nodeDetailModal) {
          closeNodeDetailModal();
        }
      });
    }

    // Modal Actions: Chatbot or Report
    if (el.btnNodeAskHelpDesk) {
      el.btnNodeAskHelpDesk.addEventListener('click', () => {
        const targetNode = activeInspectedNode;
        closeNodeDetailModal();
        switchTab('tab-helpdesk');
        if (targetNode && el.chatInputField) {
          el.chatInputField.value = `Bagaimana status katup di ${targetNode.name} (${targetNode.id}) saat ini?`;
          if (el.btnSegChat) el.btnSegChat.click();
          if (el.chatInputForm) {
            el.chatInputForm.dispatchEvent(new Event('submit'));
          }
        }
      });
    }

    if (el.btnNodeReportIssue) {
      el.btnNodeReportIssue.addEventListener('click', () => {
        const targetNode = activeInspectedNode;
        closeNodeDetailModal();
        switchTab('tab-lapor');
        if (targetNode && el.reportLocationInput && el.reportDescTextarea) {
          el.reportLocationInput.value = `${targetNode.name} (${targetNode.zone})`;
          el.reportDescTextarea.value = `Indikasi kendala pada katup motorik ${targetNode.id} (${targetNode.valveModel}). Mohon pengecekan oleh teknisi DLH.`;
        }
      });
    }

    // Initialize Leaflet Map
    initLeafletMap();

    // Render Initial UI
    updateGisUI();
  }

  function initLeafletMap() {
    if (typeof L === 'undefined' || !el.gisMapLeaflet) {
      console.warn('Leaflet library is not available.');
      return;
    }

    try {
      // Center around TPAS Manggar & distribution corridor
      leafletMap = L.map('gisMapLeaflet', {
        zoomControl: true,
        attributionControl: false
      }).setView([-1.2105, 116.9405], 15);

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12
      }).addTo(leafletMap);

      const bounds = [];
      const topology = (MBM.data.getPipelineTopology && MBM.data.getPipelineTopology()) || null;

      // 1. Trunk Pipeline Polyline - DN80 Transmisi Utama TPAS Manggar ke Jl. Proklamasi
      if (topology && topology.trunkCoords && topology.trunkCoords.length > 0) {
        const trunkCoords = topology.trunkCoords;
        trunkCoords.forEach(pt => bounds.push(pt));

        // Base Solid Line (Emerald DLH Green)
        const trunkPipe = L.polyline(trunkCoords, {
          color: '#059669',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(leafletMap);
        trunkPipe.bindTooltip('Jalur Pipa Induk Transmisi Utama (DN80) | Koridor TPAS Manggar - Jl. Proklamasi', { sticky: true });

        // Directional Gas Flow Dashed Overlay
        L.polyline(trunkCoords, {
          color: '#34d399',
          weight: 2.2,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '6, 12'
        }).addTo(leafletMap);
      }

      // 2. 4 Branch Polylines - Jalur Pipa Distribusi Zona (Semua Hijau Bersih DLH - Bebas Oren/Biru)
      if (topology && topology.branches) {
        topology.branches.forEach((b) => {
          b.coords.forEach(pt => bounds.push(pt));

          const branchLine = L.polyline(b.coords, {
            color: '#059669',
            weight: 3.8,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(leafletMap);
          branchLine.bindTooltip(b.name, { sticky: true });

          // Directional Gas Flow Overlay (Hijau Metana Terarah)
          L.polyline(b.coords, {
            color: '#34d399',
            weight: 1.8,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '5, 10'
          }).addTo(leafletMap);
        });
      }

      // 3. Render 15 Node Telemetry & Valve Markers
      const nodes = MBM.data.getNodesGis();
      nodes.forEach(node => {
        bounds.push([node.lat, node.lng]);
        const isClosed = node.valveStatus === 'CLOSED';
        const numLabel = node.code.replace('Node-', '');
        
        const markerIcon = L.divIcon({
          className: 'valve-div-marker-wrapper',
          html: `<div class="valve-marker ${isClosed ? 'closed' : 'open'}" data-node-id="${node.id}" title="${node.name} (${node.valveStatus})">
                   <span>${numLabel}</span>
                 </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([node.lat, node.lng], { icon: markerIcon }).addTo(leafletMap);
        
        marker.bindTooltip(`<strong>${node.code} | ${node.name}</strong><br>Status: <span style="color:${isClosed ? '#ef4444' : '#10b981'};font-weight:700;">${node.valveStatus}</span> | Tekanan: ${node.pressure} kPa`, {
          direction: 'top',
          offset: [0, -10]
        });

        marker.on('click', () => {
          openNodeDetailModal(node.id);
        });

        nodeMarkers[node.id] = marker;
      });

      if (bounds.length > 0) {
        gisBounds = bounds;
        leafletMap.fitBounds(bounds, { padding: [25, 25] });
      }

      setTimeout(() => {
        if (leafletMap) {
          leafletMap.invalidateSize();
          if (gisBounds && gisBounds.length > 0) {
            leafletMap.fitBounds(gisBounds, { padding: [25, 25] });
          }
        }
      }, 250);

    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }
  }

  function updateGisUI() {
    const nodes = MBM.data.getNodesGis();
    const closedNodes = nodes.filter(n => n.valveStatus === 'CLOSED');
    const openNodes = nodes.filter(n => n.valveStatus === 'OPEN');

    // Update Counts in Filter Chips
    if (el.btnFilterAllNodes) el.btnFilterAllNodes.textContent = `Semua (${nodes.length})`;
    if (el.countOpenValves) el.countOpenValves.textContent = openNodes.length;
    if (el.countClosedValves) el.countClosedValves.textContent = closedNodes.length;

    // Update Alert Banner
    if (el.gisClosedAlertCard) {
      if (closedNodes.length > 0) {
        el.gisClosedAlertCard.style.display = 'block';
        if (el.gisAlertTitle) {
          el.gisAlertTitle.textContent = `PERHATIAN: ${closedNodes.length} Katup Sedang TERTUTUP`;
        }
        if (el.gisAlertDesc) {
          const names = closedNodes.map(n => `${n.name} (${n.zone})`).join(', ');
          el.gisAlertDesc.textContent = `Katup motorik di ${names} dalam status isolasi darurat/pemeliharaan. Aliran gas dihentikan sementara demi keselamatan warga.`;
        }
      } else {
        el.gisClosedAlertCard.style.display = 'none';
      }
    }

    // Refresh Map Markers Icons
    nodes.forEach(node => {
      const marker = nodeMarkers[node.id];
      if (marker && typeof L !== 'undefined' && leafletMap) {
        const isClosed = node.valveStatus === 'CLOSED';
        const numLabel = node.code.replace('Node-', '');
        
        // Check filter visibility
        let visible = true;
        if (currentGisFilter === 'open' && isClosed) visible = false;
        if (currentGisFilter === 'closed' && !isClosed) visible = false;

        if (!visible) {
          if (leafletMap.hasLayer(marker)) leafletMap.removeLayer(marker);
        } else {
          if (!leafletMap.hasLayer(marker)) leafletMap.addLayer(marker);
          const icon = L.divIcon({
            className: 'valve-div-marker-wrapper',
            html: `<div class="valve-marker ${isClosed ? 'closed' : 'open'}" data-node-id="${node.id}" title="${node.name} (${node.valveStatus})">
                     <span>${numLabel}</span>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          marker.setIcon(icon);
        }
      }
    });

    // Render Node List Cards
    renderGisNodesList();
  }

  function setGisFilter(filter) {
    currentGisFilter = filter;
    if (el.btnFilterAllNodes) el.btnFilterAllNodes.classList.toggle('active', filter === 'all');
    if (el.btnFilterOpenNodes) el.btnFilterOpenNodes.classList.toggle('active', filter === 'open');
    if (el.btnFilterClosedNodes) el.btnFilterClosedNodes.classList.toggle('active', filter === 'closed');
    updateGisUI();
  }

  function renderGisNodesList() {
    if (!el.nodesCardsList) return;
    const nodes = MBM.data.getNodesGis();
    
    let filtered = nodes;
    if (currentGisFilter === 'open') {
      filtered = nodes.filter(n => n.valveStatus === 'OPEN');
    } else if (currentGisFilter === 'closed') {
      filtered = nodes.filter(n => n.valveStatus === 'CLOSED');
    }

    if (filtered.length === 0) {
      el.nodesCardsList.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8rem;">
          Tidak ada node katup dengan filter terpilih.
        </div>`;
      return;
    }

    el.nodesCardsList.innerHTML = filtered.map(node => {
      const isClosed = node.valveStatus === 'CLOSED';
      return `
        <div class="node-card-item ${isClosed ? 'is-closed' : ''}" data-node-id="${node.id}">
          <div class="node-item-top">
            <div>
              <span class="node-code">${node.id} | ${node.code}</span>
              <h3 class="node-name">${node.name}</h3>
              <div class="node-sub">${node.zone} | Elevasi ${node.elevation} m DPL</div>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:${isClosed ? 'var(--danger,#dc2626)' : 'var(--color-emerald-deep,#059669)'};">
              ${isClosed ? 'Tertutup' : 'Terbuka'}
            </span>
          </div>

          <div class="node-metrics-row">
            <div>Tekanan: <span class="node-metric-val tabular-nums">${node.pressure.toFixed(1).replace('.', ',')} kPa</span></div>
            <div>Debit: <span class="node-metric-val tabular-nums">${node.flow.toFixed(1).replace('.', ',')} Nm³/h</span></div>
            <div>Kemurnian: <span class="node-metric-val tabular-nums">${node.ch4.toFixed(1).replace('.', ',')}%</span></div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
            <span style="font-size:0.7rem;color:var(--text-muted);">${node.affectedSectors}</span>
            <button class="node-action-btn" type="button" onclick="window.MBM_openNodeModal('${node.id}')">
              Detail
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openNodeDetailModal(nodeId) {
    const nodes = MBM.data.getNodesGis();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !el.nodeDetailModal) return;

    activeInspectedNode = node;
    const isClosed = node.valveStatus === 'CLOSED';

    if (el.nodeDetailTitle) el.nodeDetailTitle.textContent = `${node.name} (${node.code})`;
    if (el.nodeModalNodeName) el.nodeModalNodeName.textContent = node.name;
    if (el.nodeModalSector) el.nodeModalSector.textContent = `${node.zone} | Koordinat: ${node.lat.toFixed(5)}, ${node.lng.toFixed(5)}`;
    
    if (el.nodeModalValveBadge) {
      el.nodeModalValveBadge.className = '';
      el.nodeModalValveBadge.style.display = 'inline';
      el.nodeModalValveBadge.style.background = 'transparent';
      el.nodeModalValveBadge.style.border = 'none';
      el.nodeModalValveBadge.style.padding = '0';
      el.nodeModalValveBadge.style.fontWeight = '700';
      el.nodeModalValveBadge.style.fontSize = '0.82rem';
      el.nodeModalValveBadge.style.color = isClosed ? '#dc2626' : '#059669';
      el.nodeModalValveBadge.textContent = isClosed ? 'Tertutup (Isolasi Darurat)' : 'Terbuka (Normal)';
    }

    if (el.nodeModalPressure) el.nodeModalPressure.textContent = node.pressure.toFixed(1).replace('.', ',');
    if (el.nodeModalFlow) el.nodeModalFlow.textContent = node.flow.toFixed(1).replace('.', ',');
    if (el.nodeModalCode) el.nodeModalCode.textContent = `${node.id} (${node.code})`;
    if (el.nodeModalValveType) el.nodeModalValveType.textContent = node.valveModel;
    if (el.nodeModalElevation) el.nodeModalElevation.textContent = `${node.elevation} m DPL`;
    if (el.nodeModalBeneficiaries) el.nodeModalBeneficiaries.textContent = node.affectedSectors;

    el.nodeDetailModal.classList.add('active');
  }

  function closeNodeDetailModal() {
    if (el.nodeDetailModal) {
      el.nodeDetailModal.classList.remove('active');
    }
  }

  // Expose helper to global window for inline card onclick
  window.MBM_openNodeModal = function(nodeId) {
    openNodeDetailModal(nodeId);
  };

  /* ==========================================================================
     APP INITIALIZATION
     ========================================================================== */
  function init() {
    initTabNavigation();
    initAccountSwitcher();

    const wargaRefreshBtn = document.getElementById('btnWargaHeaderRefresh');
    if (wargaRefreshBtn) {
      wargaRefreshBtn.addEventListener('click', () => {
        if (typeof renderAll === 'function') renderAll();
        if (typeof showToast === 'function') showToast('Data telemetri warga berhasil disegarkan.');
      });
    }
    initGridModal();
    initValveControls();
    initReportForm();
    initPreferences();
    initWeather();
    initHelpdesk();
    initChatbot();
    initGis();

    // Render initial state
    updateAccountUI();
    updateGridUI();
    renderPressureCurve();
    renderReportsHistory();

    console.log('METHABALANCE Mobile warga application initialized successfully.');
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
