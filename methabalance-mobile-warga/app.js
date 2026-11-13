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
    billingAllocationText: document.getElementById('billingAllocationText'),
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
        switchTab(targetId);
      });
    });

    if (el.btnQuickReport) {
      el.btnQuickReport.addEventListener('click', () => {
        switchTab('tab-lapor');
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
      el.billingStatusText.innerHTML = (account.billingStatus || 'Lunas') + ' &bull; ' + (account.billingPeriod || 'Nov 2026');
    }
    if (el.billingAllocationText) {
      el.billingAllocationText.textContent = account.billingAllocation || 'Alokasi: Honor teknisi lokal & pengurasan water-trap';
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
      el.telemetryNodeSub.textContent = isWarga ? 'Pipa PVC 3 Inci Class AW • RT 23 Manggar' : 'Pipa PVC 3 Inci Class AW • Klaster UMKM RT 22';
    }

    // Tab 3: Geotag Form Coordinates
    if (el.formGeotagCoord) {
      el.formGeotagCoord.textContent = account.coordinates + ' • ' + (isWarga ? 'RT 23 Manggar' : 'Klaster UMKM RT 22');
    }
    if (el.reportLocationInput) {
      el.reportLocationInput.value = account.address;
    }

    // Tab 4: Profile Details
    if (el.profCustomerName) el.profCustomerName.textContent = account.customerName;
    if (el.profCustomerId) el.profCustomerId.textContent = account.id;
    if (el.profCustomerRole) {
      el.profCustomerRole.innerHTML = account.type + ' &bull; ID Pelanggan: <strong class="tabular-nums">' + account.id + '</strong>';
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
      el.telemPressureBar.textContent = isNormal ? '0,042 Bar • Normal' : '0,004 Bar • Terisolasi Dari Pusat';
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
        showToast('Tanda Terima Iuran: ' + active.id + ' • ' + (active.billingPeriod || 'Nov 2026') + ' ' + MBM.data.formatRupiah(active.monthlyBilling || 10000) + ' dinyatakan LUNAS.');
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
          <span class="badge ${r.status === 'Selesai' ? 'badge-success' : 'badge-warning'}">
            ${r.status}
          </span>
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
     APP INITIALIZATION
     ========================================================================== */
  function init() {
    initTabNavigation();
    initAccountSwitcher();
    initGridModal();
    initValveControls();
    initReportForm();
    initPreferences();

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
