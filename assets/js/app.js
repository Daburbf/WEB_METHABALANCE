/* Main Application Bootstrapper & Interaction Coordinator
   METHABALANCE SCADA & SDSS Monitoring Dashboard
   Initializes routing, theme toggle, data source modes, scenario picker, and live clock. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';

  function initTheme() {
    // Pure clean light mode
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('mb.theme');
  }

  function initModeControls() {
    var modeSelect = document.getElementById('dataSourceModeSelect');
    var demoBanner = document.getElementById('demoBanner');
    var scenarioField = document.getElementById('scenarioPickerWrapper');
    var scenarioSelect = document.getElementById('demoScenarioSelect');

    function syncModeUI() {
      var curMode = MB.ds.mode();
      if (modeSelect) modeSelect.value = curMode;
      if (demoBanner) {
        if (curMode === 'demo') {
          demoBanner.removeAttribute('hidden');
        } else {
          demoBanner.setAttribute('hidden', '');
        }
      }
      if (scenarioField) {
        scenarioField.style.display = curMode === 'demo' ? 'inline-flex' : 'none';
      }
    }

    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        var m = this.value;
        MB.ds.setMode(m);
        syncModeUI();
        MB.views.showToast('Mode data beralih ke: ' + m.toUpperCase());
        MB.ds.refresh().then(function () {
          MB.views.render();
        });
      });
    }

    if (scenarioSelect) {
      scenarioSelect.value = MB.demo.scenario().id;
      scenarioSelect.addEventListener('change', function () {
        MB.demo.setScenario(this.value);
        MB.engine.invalidate();
        MB.views.showToast('Skenario simulasi: ' + MB.demo.SCENARIOS[this.value].label);
        MB.views.render();
      });
    }

    syncModeUI();
  }

  function initClock() {
    var clockEl = document.getElementById('liveClockDisplay');
    function tick() {
      if (clockEl) {
        try {
          clockEl.textContent = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Makassar'
          }).format(new Date());
        } catch (e) {
          clockEl.textContent = MB.fmt.timeSec(Date.now());
        }
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  function initSidebarDrawer() {
    var sidebar = document.getElementById('appSidebar');
    var scrim = document.getElementById('appScrim');
    var menuBtn = document.getElementById('mobileMenuToggleBtn');

    function open() {
      if (sidebar) sidebar.classList.add('open');
      if (scrim) scrim.classList.add('open');
    }
    function close() {
      if (sidebar) sidebar.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', open);
    }
    if (scrim) {
      scrim.addEventListener('click', close);
    }

    var profBtn = document.getElementById('userProfileBtn');
    if (profBtn) {
      profBtn.addEventListener('click', function () {
        window.location.hash = '#settings';
      });
    }

    // Close drawer when clicking a nav item on mobile
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 1100) {
          close();
        }
      });
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
        close();
      }
    });
  }

  function initDialogs() {
    document.querySelectorAll('dialog').forEach(function (dlg) {
      dlg.querySelectorAll('.dlg-close').forEach(function (btn) {
        btn.addEventListener('click', function () {
          dlg.close();
        });
      });
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) {
          dlg.close();
        }
      });
    });

    // Create Incident Modal handler
    var form = document.getElementById('createIncidentForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var scope = document.getElementById('newIncScope').value;
        var priority = document.getElementById('newIncPriority').value;
        var title = document.getElementById('newIncTitle').value;
        var desc = document.getElementById('newIncDesc').value;

        var inc = MB.incidents.create({
          scope: scope,
          priority: priority,
          title: title,
          description: desc
        });

        MB.views.showToast('Insiden ' + inc.id + ' berhasil dicatat.');
        form.reset();
        document.getElementById('createIncidentDialog').close();
        MB.views.navigate('incidents');
      });
    }
  }

  function initRouting() {
    function route() {
      var hash = window.location.hash.replace('#', '') || 'overview';
      MB.views.navigate(hash);
    }
    window.addEventListener('hashchange', route);
    route();
  }

  function initApp() {
    initTheme();
    initModeControls();
    initClock();
    initSidebarDrawer();
    initDialogs();
    MB.views.updateHeaderUserMeta();

    var searchBtn = document.getElementById('topbarSearchBtn');
    var searchDlg = document.getElementById('quickSearchDialog');
    var searchInput = document.getElementById('quickSearchModalInput');
    var searchResults = document.getElementById('quickSearchResults');

    if (searchBtn && searchDlg) {
      searchBtn.addEventListener('click', function () {
        searchDlg.showModal();
        if (searchInput) {
          searchInput.value = '';
          setTimeout(function () { searchInput.focus(); }, 50);
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = this.value.trim().toLowerCase();
          if (!q) return;
          if (searchDlg) searchDlg.close();
          if (q.includes('node') || q.includes('mb') || q.includes('sensor')) {
            window.location.hash = '#nodes';
          } else if (q.includes('anomali') || q.includes('insiden') || q.includes('log') || q.includes('kritis')) {
            window.location.hash = '#incidents';
          } else if (q.includes('gas') || q.includes('ch4') || q.includes('o2') || q.includes('h2s')) {
            window.location.hash = '#gas-quality';
          } else if (q.includes('peta') || q.includes('gis') || q.includes('pipa')) {
            window.location.hash = '#gis';
          } else if (q.includes('neraca') || q.includes('mass') || q.includes('balance')) {
            window.location.hash = '#mass-balance';
          } else {
            MB.views.showToast('Mencari data sistem: ' + q);
          }
        }
      });
    }

    var refreshBtn = document.getElementById('topbarRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshBtn.disabled = true;
        MB.ds.refresh().then(function () {
          MB.views.render();
          MB.views.showToast('Data telemetri berhasil disinkronisasi.');
          setTimeout(function () { refreshBtn.disabled = false; }, 600);
        });
      });
    }

    // Initial data refresh
    MB.ds.refresh().then(function () {
      initRouting();
    });

    // Periodic live refresh every 30 seconds
    setInterval(function () {
      if (MB.ds.mode() === 'live') {
        MB.ds.refresh().then(function () {
          MB.views.render();
        });
      }
    }, 30000);
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(window.MB);
