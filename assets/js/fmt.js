/* Formatting helpers: Indonesian number format, WITA time, HTML escaping. */
window.MB = window.MB || {};
(function (MB) {
  'use strict';
  var TZ = 'Asia/Makassar';
  var numCache = {};

  function num(v, dec) {
    if (v === null || v === undefined || !isFinite(v)) return null;
    dec = dec === undefined ? 1 : dec;
    if (!numCache[dec]) {
      numCache[dec] = new Intl.NumberFormat('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    return numCache[dec].format(v);
  }

  var dtFull = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  var dtShort = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  var tOnly = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  var tSec = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var dOnly = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });

  function ok(ts) { return ts !== null && ts !== undefined && isFinite(ts); }

  MB.fmt = {
    TZ: TZ,
    num: num,
    dateTime: function (ts) { return ok(ts) ? dtFull.format(ts) + ' WITA' : null; },
    dateTimeShort: function (ts) { return ok(ts) ? dtShort.format(ts) : null; },
    time: function (ts) { return ok(ts) ? tOnly.format(ts) : null; },
    hourMinute: function (ts) { return ok(ts) ? tOnly.format(ts) : null; },
    timeSec: function (ts) { return ok(ts) ? tSec.format(ts) + ' WITA' : null; },
    date: function (ts) { return ok(ts) ? dOnly.format(ts) : null; },
    ago: function (ts, now) {
      if (!ok(ts)) return null;
      var s = Math.max(0, Math.round(((now || Date.now()) - ts) / 1000));
      if (s < 60) return s + ' detik lalu';
      var m = Math.round(s / 60);
      if (m < 60) return m + ' menit lalu';
      var h = Math.floor(m / 60);
      if (h < 48) return h + ' jam ' + (m % 60) + ' menit lalu';
      return Math.floor(h / 24) + ' hari lalu';
    },
    /* WITA wall-clock hour (0..24) for a UTC timestamp */
    hourWITA: function (ts) { return (((ts / 3600000) + 8) % 24 + 24) % 24; },
    /* value for <input type="datetime-local"> in WITA */
    toLocalInput: function (ts) {
      var d = new Date(ts + 8 * 3600000);
      return d.toISOString().slice(0, 16);
    },
    fromLocalInput: function (s) {
      if (!s) return null;
      var t = Date.parse(s + ':00Z');
      return isFinite(t) ? t - 8 * 3600000 : null;
    },
    esc: function (s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    rupiah: function (v) {
      if (!ok(v)) return null;
      return 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v);
    }
  };
})(window.MB);
