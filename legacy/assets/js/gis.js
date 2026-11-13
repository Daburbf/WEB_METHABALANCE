/* ==========================================================================
   METHABALANCE — Web GIS engine
   Canvas 2D, no external map library. Two renderers:
   - 3D helicopter view: perspective low-poly terrain + extruded landfill zones
   - Hybrid 2D: orthographic satellite-style basemap with contours
   ========================================================================== */
(function () {
  'use strict';

  var D = window.METHA_DATA;
  var S = window.METHA;
  var EXAG = 1.7;
  var BG = '#07130e';

  var stage, canvas, ctx, W = 0, H = 0, DPR = 1;
  var mode = '3d';
  var mesh = null, meshStep = 0;
  var routePts = {};
  var roadSegs = [];
  var zoneData = [];
  var leakPoint = null;
  var profileAnchors = [], profilePts = [], profileTotal = 0;

  var cam = { tx: 300, tz: -260, dist: 3000, yaw: 10 * Math.PI / 180, pitch: 55 * Math.PI / 180, fov: 50 * Math.PI / 180 };
  var DEFAULT_CAM = { tx: 300, tz: -260, dist: 3000, yaw: 10 * Math.PI / 180, pitch: 55 * Math.PI / 180 };
  var hView = { x: 105, z: -185, scale: 0.32 };
  var tween = null, hTween = null, orbitUntil = 0;

  var needsRender = true, lastDraw = 0, visible = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bgGrad = null;
  var colorCache = {};

  var SUN = norm3(-0.45, 0.78, 0.44);
  var BANDS = ['#0c2017', '#0f271b', '#132e20', '#173626', '#1b3f2b', '#204831', '#255237', '#2b5a3c', '#326344'];

  var BM = null, BM_CONTOUR = null, BM_READY = false, BM_BUILDING = false;
  var BC = { x: 100, z: -250, size: 3000, px: 1500 };
  var BSCALE = BC.px / BC.size;

  /* ------------------------------------------------------------------ utils */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function norm3(x, y, z) {
    var l = Math.sqrt(x * x + y * y + z * z) || 1;
    return { x: x / l, y: y / l, z: z / l };
  }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      v = Math.round(clamp(v, 0, 255));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function scaleHex(h, m) {
    var c = hexToRgb(h);
    return rgbToHex(c[0] * m, c[1] * m, c[2] * m);
  }
  function mixHex(a, b, t) {
    var c1 = hexToRgb(a), c2 = hexToRgb(b);
    return rgbToHex(lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t));
  }

  function fmt(v, dec) {
    return v.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function nodeById(id) {
    for (var i = 0; i < D.nodes.length; i++) if (D.nodes[i].id === id) return D.nodes[i];
    return null;
  }
  var N = {};
  D.nodes.forEach(function (n) { N[n.id] = n; });

  /* ------------------------------------------------------------------ data prep */
  function terrainY(x, z) { return D.terrainHeight(x, z) * EXAG; }

  function buildMesh() {
    var half = 2000;
    var step = W < 700 ? 150 : 100;
    if (mesh && mesh.step === step) return;
    meshStep = step;
    var n = Math.round((half * 2) / step);
    var verts = [];
    var i, j;
    for (j = 0; j <= n; j++) {
      var row = [];
      for (i = 0; i <= n; i++) {
        var x = -half + i * step;
        var z = -half + j * step;
        row.push({ x: x, z: z, y: D.terrainHeight(x, z) * EXAG });
      }
      verts.push(row);
    }
    var quads = [];
    for (j = 0; j < n; j++) {
      for (i = 0; i < n; i++) {
        var a = verts[j][i], b = verts[j][i + 1], c = verts[j + 1][i + 1], d = verts[j + 1][i];
        var dhx = (b.y - a.y) / step;
        var dhz = (c.y - a.y) / step;
        var nx = -dhx, ny = 1, nz = -dhz;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        var dot = (nx * SUN.x + ny * SUN.y + nz * SUN.z) / nl;
        var shade = clamp(0.58 + 0.42 * Math.max(0, dot), 0.5, 1.12);
        var avgY = (a.y + b.y + c.y + d.y) * 0.25;
        var band = clamp(Math.floor(avgY / (EXAG * 9)), 0, BANDS.length - 1);
        quads.push({ a: a, b: b, c: c, d: d, shade: shade, band: band });
      }
    }
    mesh = { verts: verts, quads: quads, step: step };
  }

  function sampleRoute(route, step) {
    var out = [];
    var pts = route.pts;
    var carry = 0;
    out.push({ x: pts[0].x, z: pts[0].z, d: 0, y: terrainY(pts[0].x, pts[0].z) + 1.4 });
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var len = Math.hypot(b.x - a.x, b.z - a.z);
      var n = Math.max(1, Math.ceil(len / step));
      for (var k = 1; k <= n; k++) {
        var t = k / n;
        var x = lerp(a.x, b.x, t);
        var z = lerp(a.z, b.z, t);
        out.push({ x: x, z: z, d: carry + len * t, y: terrainY(x, z) + 1.4 });
      }
      carry += len;
    }
    return out;
  }

  function prepare() {
    routePts.trunk = sampleRoute(D.routes.trunk, 28);
    routePts.a = sampleRoute(D.routes.a, 30);
    routePts.b = sampleRoute(D.routes.b, 28);
    routePts.c = sampleRoute(D.routes.c, 30);

    roadSegs = [];
    D.roads.forEach(function (r) {
      for (var i = 1; i < r.pts.length; i++) {
        var a = r.pts[i - 1], b = r.pts[i];
        roadSegs.push({
          a: { x: a[0], z: a[1], y: terrainY(a[0], a[1]) + 0.8 },
          b: { x: b[0], z: b[1], y: terrainY(b[0], b[1]) + 0.8 },
          kind: r.kind
        });
      }
    });

    zoneData = D.zones.map(function (z) {
      return {
        ref: z,
        base: z.base * EXAG,
        cap: (z.base + z.cap) * EXAG,
        poly: z.poly.map(function (p) { return { x: p[0], z: p[1] }; })
      };
    });

    var n5 = N['N05'], n6 = N['N06'];
    leakPoint = {
      x: lerp(n5.x, n6.x, 0.72),
      z: lerp(n5.z, n6.z, 0.72)
    };
    leakPoint.y = terrainY(leakPoint.x, leakPoint.z) + 2;

    // Hydraulic gradient profile — continuous mainline (trunk + branch B).
    var mainIds = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08'];
    var trunkLen = D.routes.trunk.total;
    profileAnchors = mainIds.map(function (id) {
      var n = N[id];
      return { id: id, d: (n.route === 'trunk') ? n.dist : trunkLen + n.dist, node: n };
    });
    var combined = routePts.trunk.concat(routePts.b);
    var accum = 0;
    profilePts = combined.map(function (p, i) {
      if (i > 0) accum += Math.hypot(p.x - combined[i - 1].x, p.z - combined[i - 1].z);
      return { d: accum, elev: p.y / EXAG };
    });
    profileTotal = accum;

    // 2D basemap is deferred until the hybrid view is opened for the first time.
  }

  /* ------------------------------------------------------------------ camera */
  function getView() {
    var ty = D.terrainHeight(cam.tx, cam.tz) * EXAG;
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var pos = {
      x: cam.tx - Math.sin(cam.yaw) * cp * cam.dist,
      y: ty + sp * cam.dist,
      z: cam.tz - Math.cos(cam.yaw) * cp * cam.dist
    };
    var fwd = { x: Math.sin(cam.yaw) * cp, y: -sp, z: Math.cos(cam.yaw) * cp };
    var right = { x: Math.cos(cam.yaw), y: 0, z: -Math.sin(cam.yaw) };
    var up = {
      x: fwd.y * right.z - fwd.z * right.y,
      y: fwd.z * right.x - fwd.x * right.z,
      z: fwd.x * right.y - fwd.y * right.x
    };
    var focal = (H / 2) / Math.tan(cam.fov / 2);
    return { pos: pos, fwd: fwd, right: right, up: up, focal: focal };
  }

  function project(p, v) {
    var dx = p.x - v.pos.x, dy = p.y - v.pos.y, dz = p.z - v.pos.z;
    var zc = dx * v.fwd.x + dy * v.fwd.y + dz * v.fwd.z;
    if (zc < 6) return null;
    var xc = dx * v.right.x + dz * v.right.z;
    var yc = dx * v.up.x + dy * v.up.y + dz * v.up.z;
    var s = v.focal / zc;
    return { x: W * 0.5 + xc * s, y: H * 0.5 - yc * s, z: zc };
  }

  function mapX(x) { return W * 0.5 + (x - hView.x) * hView.scale; }
  function mapY(z) { return H * 0.5 - (z - hView.z) * hView.scale; }

  /* ------------------------------------------------------------------ colour */
  function terrainColor(band, shade, depth) {
    var si = clamp(Math.round((shade - 0.5) / 0.075), 0, 8);
    var fi = clamp(Math.floor((depth - 1900) / 620), 0, 5);
    var key = band + '|' + si + '|' + fi;
    if (colorCache[key]) return colorCache[key];
    var c = scaleHex(BANDS[band], 0.56 + si * 0.068);
    c = mixHex(c, BG, fi * 0.1);
    colorCache[key] = c;
    return c;
  }

  var ZONE_COLORS = {
    closed: { top: '#33513e', side: '#22382a', line: '#6c8b77' },
    filling: { top: '#5b4a28', side: '#382c17', line: '#a08a4f' },
    active: { top: '#6f5925', side: '#443416', line: '#e0b45f' }
  };

  /* ------------------------------------------------------------------ 3D draw */
  function draw3D(now) {
    var v = getView();
    var prims = [];
    var i;

    if (!bgGrad) {
      bgGrad = ctx.createRadialGradient(W * 0.55, H * 0.32, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
      bgGrad.addColorStop(0, '#0d2117');
      bgGrad.addColorStop(0.55, BG);
      bgGrad.addColorStop(1, '#040d09');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    /* terrain */
    for (i = 0; i < mesh.quads.length; i++) {
      var q = mesh.quads[i];
      var p1 = project(q.a, v), p2 = project(q.b, v), p3 = project(q.c, v), p4 = project(q.d, v);
      if (!p1 || !p2 || !p3 || !p4) continue;
      var minX = Math.min(p1.x, p2.x, p3.x, p4.x);
      var maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
      if (maxX < -20 || minX > W + 20) continue;
      var minY = Math.min(p1.y, p2.y, p3.y, p4.y);
      var maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
      if (maxY < -20 || minY > H + 20) continue;
      var depth = (p1.z + p2.z + p3.z + p4.z) * 0.25;
      prims.push({
        t: 0, d: depth,
        pts: [p1, p2, p3, p4],
        c: terrainColor(q.band, q.shade, depth)
      });
    }

    /* roads */
    for (i = 0; i < roadSegs.length; i++) {
      var rs = roadSegs[i];
      var ra = project(rs.a, v), rb = project(rs.b, v);
      if (!ra || !rb) continue;
      if ((ra.x < -40 && rb.x < -40) || (ra.x > W + 40 && rb.x > W + 40)) continue;
      prims.push({
        t: 1, d: (ra.z + rb.z) * 0.5 - 22,
        x1: ra.x, y1: ra.y, x2: rb.x, y2: rb.y,
        w: rs.kind === 'primary' ? 2.6 : rs.kind === 'haul' ? 1.9 : 1.2,
        c: rs.kind === 'primary' ? '#7c8f7f' : '#4c6153',
        a: rs.kind === 'primary' ? 0.55 : 0.4
      });
    }

    /* zones: sides then top */
    for (i = 0; i < zoneData.length; i++) {
      var zd = zoneData[i];
      var zc = ZONE_COLORS[zd.ref.status];
      var poly = zd.poly;
      var j;
      for (j = 0; j < poly.length; j++) {
        var a = poly[j], b = poly[(j + 1) % poly.length];
        var sx1 = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        var nrm = { x: (b.z - a.z) / sx1, z: -(b.x - a.x) / sx1 };
        var lit = 0.7 + 0.3 * Math.max(0, nrm.x * SUN.x + nrm.z * SUN.z);
        var f1 = project({ x: a.x, y: zd.base, z: a.z }, v);
        var f2 = project({ x: b.x, y: zd.base, z: b.z }, v);
        var f3 = project({ x: b.x, y: zd.cap, z: b.z }, v);
        var f4 = project({ x: a.x, y: zd.cap, z: a.z }, v);
        if (!f1 || !f2 || !f3 || !f4) continue;
        prims.push({
          t: 0, d: (f1.z + f2.z + f3.z + f4.z) * 0.25 - 1.5,
          pts: [f1, f2, f3, f4],
          c: scaleHex(zc.side, lit)
        });
      }
      var topPts = [], tz = 0, ok = true, minXZ = 1e9, maxXZ = -1e9;
      for (j = 0; j < poly.length; j++) {
        var tp = project({ x: poly[j].x, y: zd.cap, z: poly[j].z }, v);
        if (!tp) { ok = false; break; }
        topPts.push(tp); tz += tp.z;
        minXZ = Math.min(minXZ, tp.x); maxXZ = Math.max(maxXZ, tp.x);
      }
      if (ok && maxXZ > -30 && minXZ < W + 30) {
        prims.push({
          t: 0, d: tz / poly.length - 2,
          pts: topPts, c: zc.top, stroke: zc.line
        });
      }
    }

    /* pipeline */
    var routeKeys = ['trunk', 'a', 'b', 'c'];
    for (var rk = 0; rk < routeKeys.length; rk++) {
      var key = routeKeys[rk];
      var pts = routePts[key];
      for (i = 0; i < pts.length - 1; i++) {
        var A = pts[i], B = pts[i + 1];
        var midD = (A.d + B.d) * 0.5;
        var st = pipeState(key, midD);
        if (st === 'off' && S.state.scenario === 'leak') {
          // still rendered, dimmed, to keep the network legible
        }
        var pa = project({ x: A.x, y: A.y, z: A.z }, v);
        var pb = project({ x: B.x, y: B.y, z: B.z }, v);
        if (!pa || !pb) continue;
        if ((pa.x < -60 && pb.x < -60) || (pa.x > W + 60 && pb.x > W + 60)) continue;
        var depthP = (pa.z + pb.z) * 0.5;
        var w = clamp(3.4 * (1500 / depthP), 1.5, 5.2);
        prims.push({
          t: 2, d: depthP - 45,
          x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
          w: w, st: st
        });
      }
    }

    prims.sort(function (a, b) { return b.d - a.d; });

    for (i = 0; i < prims.length; i++) {
      var pr = prims[i];
      if (pr.t === 0) {
        ctx.beginPath();
        ctx.moveTo(pr.pts[0].x, pr.pts[0].y);
        for (var k = 1; k < pr.pts.length; k++) ctx.lineTo(pr.pts[k].x, pr.pts[k].y);
        ctx.closePath();
        ctx.fillStyle = pr.c;
        ctx.fill();
        ctx.strokeStyle = pr.stroke || pr.c;
        ctx.lineWidth = pr.stroke ? 1.2 : 1;
        ctx.stroke();
      } else if (pr.t === 1) {
        ctx.beginPath();
        ctx.moveTo(pr.x1, pr.y1);
        ctx.lineTo(pr.x2, pr.y2);
        ctx.strokeStyle = pr.c;
        ctx.globalAlpha = pr.a;
        ctx.lineWidth = pr.w;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        strokePipe(pr.x1, pr.y1, pr.x2, pr.y2, pr.w, pr.st);
      }
    }

    drawServiceArea(v);
    drawRadioLinks(v);
    drawFlows(v, now);
    drawLeakMarker(v, now);
    drawZoneLabels(v);
    drawNodes(v, now);
  }

  function pipeState(key, d) {
    var sc = (S.state && (S.state.opStateKey || S.state.scenario)) || 'normal';
    var ph = (S.state && S.state.phase) || 0;
    if (sc === 'leak') {
      var n5 = N['N05'], n6 = N['N06'];
      if (key === 'b') {
        if (d >= n5.dist - 1 && d <= n6.dist + 1) return 'crit';
        if (d > n6.dist) return 'off';
      }
      return 'normal';
    }
    if (sc === 'condensate') {
      var a6 = N['N06'], a7 = N['N07'];
      if (key === 'b' && d >= a6.dist && d <= a7.dist) return 'warn';
    }
    if (sc === 'corrosion') {
      var c1 = N['N01'], c3 = N['N03'];
      if (key === 'trunk' && d >= c1.dist - 1 && d <= c3.dist + 1) return 'corrode';
    }
    return 'normal';
  }

  function strokePipe(x1, y1, x2, y2, w, st) {
    var col = st === 'crit' ? '#ef4444' : st === 'warn' ? '#f59e0b' : st === 'corrode' ? '#a855f7' : st === 'off' ? '#5b6f62' : '#10b981';
    if (st === 'off') {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(120, 144, 128, .45)';
      ctx.lineWidth = Math.max(1, w * 0.55);
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col;
    ctx.lineWidth = w + 4.5;
    ctx.globalAlpha = st === 'normal' ? 0.1 : 0.18;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawServiceArea(v) {
    if (cam.dist < 2050) return;
    var area = [[-1040, -120], [-260, -40], [520, -170], [1240, -430], [1240, -1010], [-1040, -1250]];
    ctx.beginPath();
    for (var i = 0; i < area.length; i++) {
      var p = project({ x: area[i][0], y: terrainY(area[i][0], area[i][1]) + 2, z: area[i][1] }, v);
      if (!p) return;
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, .035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, .22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    var lp = project({ x: 640, y: terrainY(640, -1030) + 2, z: -1030 }, v);
    if (lp) {
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(167, 192, 176, .55)';
      ctx.textBaseline = 'middle';
      ctx.fillText('AREA LAYAN · 380 SR + 29 UMKM', lp.x - 60, lp.y);
    }
  }

  function drawRadioLinks(v) {
    var g = N['N15'];
    if (!g) return;
    var p0 = project({ x: g.x, y: g.y * EXAG + 6, z: g.z }, v);
    if (!p0) return;
    ['N08', 'N11', 'N14'].forEach(function (id) {
      var n = N[id];
      var p = project({ x: n.x, y: n.y * EXAG + 6, z: n.z }, v);
      if (!p) return;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(46, 91, 255, .38)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function drawFlows(v, now) {
    if (reduced) return;
    var t = now / 1000;
    var keys = ['trunk', 'a', 'b', 'c'];
    for (var r = 0; r < keys.length; r++) {
      var key = keys[r];
      var pts = routePts[key];
      if (!pts || pts.length < 3) continue;
      var total = pts[pts.length - 1].d;
      for (var i = 0; i < 9; i++) {
        var d = (t * 55 + r * 120 + i * (total / 9)) % total;
        var p = sampleAt(pts, d);
        if (!p) continue;
        if (pipeState(key, d) !== 'normal') continue;
        var sp = project({ x: p.x, y: p.y + 2, z: p.z }, v);
        if (!sp) continue;
        var alpha = 0.55 + 0.35 * Math.sin(t * 3 + i);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(209, 250, 229, ' + alpha.toFixed(2) + ')';
        ctx.fill();
      }
    }
  }

  function sampleAt(pts, d) {
    if (d <= 0) return pts[0];
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].d >= d) {
        var a = pts[i - 1], b = pts[i];
        var t = (d - a.d) / ((b.d - a.d) || 1);
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
      }
    }
    return pts[pts.length - 1];
  }

  function nodeVisual(id) {
    var sc = S.state.scenario, ph = S.state.phase;
    if (sc === 'leak') {
      if (id === 'N06') return ph >= 1 ? 'crit' : 'normal';
      if (id === 'N07' || id === 'N08') return ph >= 4 ? 'off' : 'crit';
      if (id === 'N05') return ph >= 2 ? 'warn' : 'normal';
    }
    if (sc === 'condensate' && (id === 'N07' || id === 'N06')) return 'warn';
    if (sc === 'corrosion') {
      if (id === 'N01') return ph >= 1 ? 'corrode' : 'normal';
      if (id === 'N02' || id === 'N03') return ph >= 2 ? 'corrode' : 'normal';
    }
    return 'normal';
  }

  function nodeColor(st) {
    return st === 'crit' ? '#ef4444' : st === 'warn' ? '#f59e0b' : st === 'corrode' ? '#a855f7' : st === 'off' ? '#6b8073' : '#10b981';
  }

  function drawNodes(v, now) {
    var t = now / 1000;
    var selected = S.state.selected;
    for (var i = 0; i < D.nodes.length; i++) {
      var n = D.nodes[i];
      var p = project({ x: n.x, y: n.y * EXAG + 3, z: n.z }, v);
      if (!p) continue;
      var st = nodeVisual(n.id);
      var col = nodeColor(st);
      var isSel = n.id === selected;
      var hot = st === 'crit' || st === 'corrode';
      var pulse = (hot && !reduced) ? (0.5 + 0.5 * Math.sin(t * 4)) : 0;

      if (hot && !reduced) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9 + pulse * 9, 0, Math.PI * 2);
        ctx.strokeStyle = st === 'corrode'
          ? 'rgba(168, 85, 247, ' + (0.5 - pulse * 0.35).toFixed(2) + ')'
          : 'rgba(239, 68, 68, ' + (0.5 - pulse * 0.35).toFixed(2) + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (isSel) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 168, 83, .9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 168, 83, .25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, n.kind === 'gateway' ? 3.6 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(7, 19, 14, .9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      var show = isSel || cam.dist < (W < 620 ? 900 : 2300) || ['N01', 'N05', 'N06', 'N07', 'N08', 'N11', 'N14', 'N15'].indexOf(n.id) >= 0;
      if (!show) continue;
      var label = isSel ? n.id + ' · ' + n.name : n.id;
      var cx = p.x + 10, cy = Math.max(26, p.y - 17);
      var colText = isSel ? '#f6e3b8' : (st === 'crit' ? '#fecaca' : st === 'corrode' ? '#e9d5ff' : st === 'warn' ? '#fde68a' : '#cfe3d7');
      chip(cx, cy, label, colText, st, isSel);
      if (isSel) {
        ctx.beginPath();
        ctx.moveTo(p.x + 4, p.y - 4);
        ctx.lineTo(cx, cy + 11);
        ctx.strokeStyle = 'rgba(212, 168, 83, .35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function chip(x, y, text, color, tone, strong) {
    ctx.font = (strong ? '600 ' : '500 ') + '10px "JetBrains Mono", ui-monospace, monospace';
    var w = ctx.measureText(text).width;
    var padX = 5;
    var h = 15;
    var bx = x, by = Math.max(6, y - h);
    if (bx + w + padX * 2 > W - 6) bx = Math.max(6, x - w - padX * 2 - 26);
    ctx.beginPath();
    roundRectPath(bx, by, w + padX * 2, h, 3.5);
    ctx.fillStyle = 'rgba(6, 18, 12, .82)';
    ctx.fill();
    ctx.strokeStyle = tone === 'crit' ? 'rgba(239,68,68,.4)' : tone === 'corrode' ? 'rgba(168,85,247,.42)' : tone === 'warn' ? 'rgba(245,158,11,.4)' : 'rgba(160, 200, 175, .22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + padX, by + h / 2 + 0.5);
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawLeakMarker(v, now) {
    if (S.state.scenario !== 'leak' || S.state.phase < 2) return;
    var p = project(leakPoint, v);
    if (!p) return;
    var t = now / 1000;
    var pulse = reduced ? 1 : (0.5 + 0.5 * Math.sin(t * 4));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, ' + (0.55 - pulse * 0.4).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(254, 202, 202, .9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    chip(p.x - 98, p.y + 26, S.state.phase >= 5 ? 'ISOLATED' : 'LEAK ΔQ', '#fecaca', 'crit', true);
  }

  function drawZoneLabels(v) {
    if (W < 620) return;
    for (var i = 0; i < D.zones.length; i++) {
      var z = D.zones[i];
      if (cam.dist > 2450 && z.id !== 'Z6' && z.id !== 'Z7') continue;
      var p = project({ x: z.cx, y: (z.base + z.cap) * EXAG + 2, z: z.cz }, v);
      if (!p) continue;
      if (p.z > 5200) continue;
      var active = z.status === 'active';
      var text = z.id + (active ? ' · aktif' : z.status === 'filling' ? ' · 90%' : '');
      if (active) { p.x -= 26; p.y += 14; }
      ctx.font = (active ? '600 ' : '500 ') + '9px "JetBrains Mono", monospace';
      var w = ctx.measureText(text).width;
      ctx.beginPath();
      roundRectPath(p.x - w / 2 - 5, p.y - 8, w + 10, 15, 3.5);
      ctx.fillStyle = active ? 'rgba(56, 43, 15, .88)' : 'rgba(10, 25, 17, .8)';
      ctx.fill();
      ctx.strokeStyle = active ? 'rgba(212,168,83,.65)' : 'rgba(160,200,175,.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = active ? '#f0d59b' : '#9fb6a7';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, p.x - w / 2, p.y);
    }
  }

  function drawLandmarkLabels(v) {
    if (cam.dist > 3600) return;
    var p = project({ x: -150, y: 70 * EXAG, z: 420 }, v);
    if (p) {
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(167, 192, 176, .55)';
      ctx.textBaseline = 'middle';
      ctx.fillText('SANITARY LANDFILL', p.x, p.y - 26);
    }
  }

  /* ------------------------------------------------------------------ 2D basemap */
  function bmX(x) { return (x - (BC.x - BC.size / 2)) * BSCALE; }
  function bmY(z) { return ((BC.z + BC.size / 2) - z) * BSCALE; }

  function makeBasemap() {
    if (BM_BUILDING) return;
    BM_BUILDING = true;
    try {
      BM = buildTerrainImage();
      BM_CONTOUR = buildContourImage();
      BM_READY = true;
    } catch (e) {
      BM_READY = false;
    }
    BM_BUILDING = false;
    needsRender = true;
  }

  function buildTerrainImage() {
    var c = document.createElement('canvas');
    c.width = BC.px; c.height = BC.px;
    var g = c.getContext('2d');
    var stepM = 20;
    var px = stepM * BSCALE;
    var cols = Math.ceil(BC.size / stepM);
    var bands = ['#45543c', '#4c5b41', '#546346', '#5c6b4b', '#667350', '#6f7a55', '#797f5c', '#828565', '#8b8a6e'];
    var x0 = BC.x - BC.size / 2;
    var z0 = BC.z - BC.size / 2;

    g.fillStyle = '#3d4a37';
    g.fillRect(0, 0, BC.px, BC.px);

    for (var j = 0; j < cols; j++) {
      for (var i = 0; i < cols; i++) {
        var x = x0 + i * stepM;
        var z = z0 + j * stepM;
        var h = D.terrainHeight(x, z);
        var hx = D.terrainHeight(x + stepM, z) - h;
        var hz = D.terrainHeight(x, z + stepM) - h;
        var nx = -hx / stepM, nz = -hz / stepM;
        var nl = Math.sqrt(nx * nx + 1 + nz * nz);
        var dot = (nx * SUN.x + SUN.y + nz * SUN.z) / nl;
        var sh = 0.7 + 0.4 * Math.max(0, dot);
        var bi = clamp(Math.floor(h / 10), 0, bands.length - 1);
        var base = hexToRgb(bands[bi]);
        var noise = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
        var nv = 1 + (noise - 0.5) * 0.03;
        g.fillStyle = rgbToHex(base[0] * sh * nv, base[1] * sh * nv, base[2] * sh * nv);
        g.fillRect(i * px, j * px, px + 0.5, px + 0.5);
      }
    }

    /* soften the analytical shading into a photographic grain */
    var soft = document.createElement('canvas');
    soft.width = BC.px; soft.height = BC.px;
    var sg = soft.getContext('2d');
    sg.filter = 'blur(2px)';
    sg.drawImage(c, 0, 0);
    sg.filter = 'none';
    c = soft;
    g = sg;

    var rnd = seeded(90210);

    /* forest mass to the west and north */
    for (var f = 0; f < 34; f++) {
      var fx = -1400 + rnd() * 1900;
      var fz = -400 + rnd() * 1900;
      if (D.terrainHeight(fx, fz) < 26) continue;
      g.fillStyle = 'rgba(34, 53, 35, ' + (0.12 + rnd() * 0.16).toFixed(2) + ')';
      g.beginPath();
      g.ellipse(bmX(fx), bmY(fz), 18 + rnd() * 52, 12 + rnd() * 34, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }

    /* settlement clusters around the village streets */
    var clusters = [[-540, -980], [60, -760], [600, -620], [980, -950], [-280, -1160], [760, -1120], [-820, -520]];
    clusters.forEach(function (cl) {
      for (var b = 0; b < 24; b++) {
        var bx = cl[0] + (rnd() - 0.5) * 330;
        var bz = cl[1] + (rnd() - 0.5) * 240;
        if (D.terrainHeight(bx, bz) > 27) continue;
        g.fillStyle = 'rgba(183, 171, 141, ' + (0.2 + rnd() * 0.22).toFixed(2) + ')';
        var bw = 2 + rnd() * 4.2;
        g.fillRect(bmX(bx), bmY(bz), bw, bw * (0.5 + rnd() * 0.9));
        g.fillStyle = 'rgba(92, 81, 58, .25)';
        g.fillRect(bmX(bx) + bw + 1, bmY(bz), bw * 0.5, bw * 0.4);
      }
    });

    /* roads */
    D.roads.forEach(function (r) {
      var pts = r.pts;
      g.beginPath();
      g.moveTo(bmX(pts[0][0]), bmY(pts[0][1]));
      for (var q = 1; q < pts.length; q++) g.lineTo(bmX(pts[q][0]), bmY(pts[q][1]));
      g.strokeStyle = r.kind === 'primary' ? 'rgba(82, 71, 48, .95)' : 'rgba(72, 64, 44, .8)';
      g.lineWidth = r.kind === 'primary' ? 5.6 : r.kind === 'haul' ? 3.4 : 2.2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
      g.strokeStyle = r.kind === 'primary' ? 'rgba(211, 200, 170, .92)' : 'rgba(178, 166, 134, .55)';
      g.lineWidth = r.kind === 'primary' ? 3 : r.kind === 'haul' ? 1.4 : 0.9;
      g.stroke();
    });

    /* landfill rings */
    D.zones.forEach(function (z) {
      g.beginPath();
      z.poly.forEach(function (p, idx) {
        if (idx === 0) g.moveTo(bmX(p[0]), bmY(p[1]));
        else g.lineTo(bmX(p[0]), bmY(p[1]));
      });
      g.closePath();
      g.fillStyle = z.status === 'active' ? 'rgba(168, 142, 78, .32)' : z.status === 'filling' ? 'rgba(130, 112, 70, .28)' : 'rgba(93, 112, 88, .28)';
      g.fill();
      g.strokeStyle = 'rgba(226, 212, 170, .38)';
      g.lineWidth = 1.2;
      g.stroke();
    });

    /* grain + vegetation */
    for (var s2 = 0; s2 < 2200; s2++) {
      var spx = rnd() * BC.px;
      var spy = rnd() * BC.px;
      g.fillStyle = rnd() > 0.5 ? 'rgba(28, 46, 31, ' + (0.12 + rnd() * 0.24).toFixed(2) + ')' : 'rgba(210, 198, 168, ' + (0.05 + rnd() * 0.1).toFixed(2) + ')';
      g.beginPath();
      g.arc(spx, spy, 0.5 + rnd() * 1.5, 0, Math.PI * 2);
      g.fill();
    }

    var grad = g.createRadialGradient(BC.px * 0.5, BC.px * 0.5, BC.px * 0.2, BC.px * 0.5, BC.px * 0.5, BC.px * 0.62);
    grad.addColorStop(0, 'rgba(63,76,58,0)');
    grad.addColorStop(1, 'rgba(52,64,48,.6)');
    g.fillStyle = grad;
    g.fillRect(0, 0, BC.px, BC.px);
    return c;
  }

  function buildContourImage() {
    var c = document.createElement('canvas');
    c.width = BC.px; c.height = BC.px;
    var g = c.getContext('2d');
    var stepM = 40;
    var cols = Math.ceil(BC.size / stepM);
    var x0 = BC.x - BC.size / 2;
    var z0 = BC.z - BC.size / 2;
    g.strokeStyle = 'rgba(236, 226, 196, .34)';
    g.lineWidth = 1.1;
    for (var level = 10; level <= 90; level += 10) {
      g.beginPath();
      for (var j = 0; j < cols; j++) {
        for (var i = 0; i < cols; i++) {
          var x = x0 + i * stepM, z = z0 + j * stepM;
          var h00 = D.terrainHeight(x, z);
          var h10 = D.terrainHeight(x + stepM, z);
          var h11 = D.terrainHeight(x + stepM, z + stepM);
          var h01 = D.terrainHeight(x, z + stepM);
          var pts = [];
          if ((h00 - level) * (h10 - level) < 0) pts.push([x + stepM * (level - h00) / (h10 - h00), z]);
          if ((h10 - level) * (h11 - level) < 0) pts.push([x + stepM, z + stepM * (level - h10) / (h11 - h10)]);
          if ((h01 - level) * (h11 - level) < 0) pts.push([x + stepM * (level - h01) / (h11 - h01), z + stepM]);
          if ((h00 - level) * (h01 - level) < 0) pts.push([x, z + stepM * (level - h00) / (h01 - h00)]);
          if (pts.length >= 2) {
            g.moveTo(bmX(pts[0][0]), bmY(pts[0][1]));
            g.lineTo(bmX(pts[1][0]), bmY(pts[1][1]));
            if (pts.length === 4) {
              g.moveTo(bmX(pts[2][0]), bmY(pts[2][1]));
              g.lineTo(bmX(pts[3][0]), bmY(pts[3][1]));
            }
          }
        }
      }
      g.stroke();
    }
    return c;
  }

  function seeded(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function fitHybrid() {
    var bounds = { x0: -1000, x1: 1220, z0: -1200, z1: 800 };
    var s = Math.min((W - 90) / (bounds.x1 - bounds.x0), (H - 80) / (bounds.z1 - bounds.z0));
    hView.scale = clamp(s, 0.12, 1.1);
    hView.x = (bounds.x0 + bounds.x1) / 2;
    hView.z = (bounds.z0 + bounds.z1) / 2;
  }

  function drawHybrid(now) {
    if (!BM_READY) {
      ctx.fillStyle = '#0a1712';
      ctx.fillRect(0, 0, W, H);
      if (!BM_BUILDING) makeBasemap();
      ctx.fillStyle = 'rgba(207, 227, 215, .6)';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Menyiapkan basemap hybrid…', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }
    ctx.fillStyle = '#0a1712';
    ctx.fillRect(0, 0, W, H);

    var sizePx = BC.size * hView.scale;
    var left = mapX(BC.x - BC.size / 2);
    var top = mapY(BC.z + BC.size / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(BM, left, top, sizePx, sizePx);
    if (BM_CONTOUR) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(BM_CONTOUR, left, top, sizePx, sizePx);
      ctx.globalAlpha = 1;
    }

    /* soft edge fade */
    var edge = ctx.createLinearGradient(0, 0, 0, 90);
    edge.addColorStop(0, 'rgba(7,19,14,.8)');
    edge.addColorStop(1, 'rgba(7,19,14,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, 90);

    /* grid */
    ctx.strokeStyle = 'rgba(207, 227, 215, .07)';
    ctx.lineWidth = 1;
    for (var gx = -1000; gx <= 1500; gx += 500) {
      ctx.beginPath(); ctx.moveTo(mapX(gx), 0); ctx.lineTo(mapX(gx), H); ctx.stroke();
    }
    for (var gz = -1500; gz <= 1000; gz += 500) {
      ctx.beginPath(); ctx.moveTo(0, mapY(gz)); ctx.lineTo(W, mapY(gz)); ctx.stroke();
    }

    /* zones */
    for (var zi = 0; zi < D.zones.length; zi++) {
      var z = D.zones[zi];
      ctx.beginPath();
      for (var q = 0; q < z.poly.length; q++) {
        var px = mapX(z.poly[q][0]), py = mapY(z.poly[q][1]);
        if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = z.status === 'active' ? 'rgba(212, 168, 83, .2)' : z.status === 'filling' ? 'rgba(160, 120, 60, .17)' : 'rgba(120, 160, 135, .12)';
      ctx.fill();
      ctx.strokeStyle = z.status === 'active' ? 'rgba(212, 168, 83, .85)' : 'rgba(190, 215, 198, .35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = z.status === 'active' ? 'rgba(212, 168, 83, .15)' : 'rgba(220, 235, 225, .07)';
      ctx.lineWidth = 1;
      for (var hx = -W; hx < W * 2; hx += 13) {
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx + H, H);
        ctx.stroke();
      }
      ctx.restore();

      var zx = mapX(z.cx), zy = mapY(z.cz);
      if (zx > -40 && zx < W + 40 && zy > -20 && zy < H + 20) {
        ctx.font = '600 9px "JetBrains Mono", monospace';
        var ztxt = z.id + (z.status === 'active' ? ' · aktif' : '');
        var zw = ctx.measureText(ztxt).width;
        ctx.fillStyle = 'rgba(7,19,14,.68)';
        ctx.fillRect(zx - zw / 2 - 4, zy - 7, zw + 8, 14);
        ctx.fillStyle = z.status === 'active' ? '#f0d59b' : '#b9cfc0';
        ctx.textAlign = 'center';
        ctx.fillText(ztxt, zx, zy + 3);
        ctx.textAlign = 'left';
      }
    }

    /* pipeline */
    var keys = ['trunk', 'a', 'b', 'c'];
    for (var r = 0; r < keys.length; r++) {
      var pts = routePts[keys[r]];
      for (var i = 0; i < pts.length - 1; i++) {
        var A = pts[i], B = pts[i + 1];
        var st = pipeState(keys[r], (A.d + B.d) * 0.5);
        var x1 = mapX(A.x), y1 = mapY(A.z), x2 = mapX(B.x), y2 = mapY(B.z);
        if ((x1 < -40 && x2 < -40) || (x1 > W + 40 && x2 > W + 40)) continue;
        if (st === 'off') {
          ctx.beginPath();
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(120,144,128,.45)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          continue;
        }
        var col = st === 'crit' ? '#ef4444' : st === 'warn' ? '#f59e0b' : st === 'corrode' ? '#a855f7' : '#10b981';
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = col;
        ctx.lineWidth = st === 'normal' ? 2.2 : 3;
        ctx.globalAlpha = 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineWidth = st === 'normal' ? 1.3 : 2;
        ctx.stroke();
      }
    }

    /* flows */
    if (!reduced) {
      var t = now / 1000;
      for (var rr = 0; rr < keys.length; rr++) {
        var rpts = routePts[keys[rr]];
        var tot = rpts[rpts.length - 1].d;
        for (var f = 0; f < 8; f++) {
          var dd = (t * 55 + rr * 120 + f * (tot / 8)) % tot;
          var sp = sampleAt(rpts, dd);
          if (pipeState(keys[rr], dd) !== 'normal') continue;
          ctx.beginPath();
          ctx.arc(mapX(sp.x), mapY(sp.z), 1.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(209,250,229,.8)';
          ctx.fill();
        }
      }
    }

    /* nodes */
    for (var ni = 0; ni < D.nodes.length; ni++) {
      var n = D.nodes[ni];
      var nx = mapX(n.x), ny = mapY(n.z);
      if (nx < -20 || nx > W + 20 || ny < -20 || ny > H + 20) continue;
      var stn = nodeVisual(n.id);
      var col = nodeColor(stn);
      var sel = n.id === S.state.selected;
      if (sel) {
        ctx.beginPath();
        ctx.arc(nx, ny, 8.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,168,83,.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(nx, ny, stn === 'normal' ? 3 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nx, ny, 5.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(7,19,14,.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      var label = sel ? n.id + ' · ' + n.name : n.id;
      chip(nx + 9, ny - 9, label, stn === 'crit' ? '#fecaca' : stn === 'corrode' ? '#e9d5ff' : stn === 'warn' ? '#fde68a' : '#cfe3d7', stn, sel);
    }

    /* hybrid scale grid */
    drawLeakMarkerHybrid(now);
  }

  function drawLeakMarkerHybrid(now) {
    if (S.state.scenario !== 'leak' || S.state.phase < 2) return;
    var x = mapX(leakPoint.x), y = mapY(leakPoint.z);
    var t = now / 1000;
    var pulse = reduced ? 1 : (0.5 + 0.5 * Math.sin(t * 4));
    ctx.beginPath();
    ctx.arc(x, y, 8 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239,68,68,' + (0.6 - pulse * 0.4).toFixed(2) + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    chip(x + 10, y - 8, 'LEAK', '#fecaca', 'crit', true);
  }

  /* ------------------------------------------------------------------ profile */
  function profilePressure(d) {
    var a = profileAnchors;
    if (!a.length) return 0;
    if (d <= a[0].d) return M.telemetry(a[0].id).p;
    for (var i = 1; i < a.length; i++) {
      if (d <= a[i].d) {
        var t = (d - a[i - 1].d) / ((a[i].d - a[i - 1].d) || 1);
        return lerp(M.telemetry(a[i - 1].id).p, M.telemetry(a[i].id).p, t);
      }
    }
    return M.telemetry(a[a.length - 1].id).p;
  }

  function drawProfile(now) {
    var padL = 46, padR = 50, padT = 40, padB = 32;
    var plotW = Math.max(20, W - padL - padR);
    var plotH = Math.max(20, H - padT - padB);
    var i, px, py;

    var eMin = 1e9, eMax = -1e9;
    for (i = 0; i < profilePts.length; i++) {
      if (profilePts[i].elev < eMin) eMin = profilePts[i].elev;
      if (profilePts[i].elev > eMax) eMax = profilePts[i].elev;
    }
    var espan = (eMax - eMin) || 1;
    eMin -= espan * 0.1; eMax += espan * 0.1; espan = eMax - eMin;
    var pMax = 6;

    function xAt(d) { return padL + (d / profileTotal) * plotW; }
    function yElev(e) { return padT + (1 - (e - eMin) / espan) * plotH; }
    function yPres(p) { return padT + (1 - Math.min(pMax, Math.max(0, p)) / pMax) * plotH; }

    ctx.fillStyle = '#07130e';
    ctx.fillRect(0, 0, W, H);

    // grid + axis labels
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(167,192,176,.5)';
    ctx.textBaseline = 'middle';
    for (var g = 0; g <= 4; g++) {
      var e = eMin + espan * g / 4;
      var gy = yElev(e);
      ctx.strokeStyle = 'rgba(207,227,215,.06)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + plotW, gy); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(e) + ' m', padL - 6, gy);
    }
    ctx.textAlign = 'right';
    for (var pp = 0; pp <= 6; pp++) {
      var py2 = yPres(pp);
      ctx.fillStyle = 'rgba(46,91,255,.5)';
      ctx.fillText(pp + ' kPa', W - padR + 42, py2);
    }

    // elevation area
    var path = '';
    for (i = 0; i < profilePts.length; i++) {
      px = xAt(profilePts[i].d); py = yElev(profilePts[i].elev);
      path += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
    }
    var base = padT + plotH;
    var area = path + 'L' + xAt(profileTotal).toFixed(1) + ' ' + base + ' L' + padL + ' ' + base + ' Z';
    var eg = ctx.createLinearGradient(0, padT, 0, base);
    eg.addColorStop(0, 'rgba(19,111,70,.5)');
    eg.addColorStop(1, 'rgba(19,111,70,.05)');
    ctx.beginPath();
    ctx.moveTo(padL, base);
    var first = true;
    for (i = 0; i < profilePts.length; i++) {
      px = xAt(profilePts[i].d); py = yElev(profilePts[i].elev);
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
    ctx.lineTo(xAt(profileTotal), base);
    ctx.closePath();
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.strokeStyle = '#2b8a5f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    first = true;
    for (i = 0; i < profilePts.length; i++) {
      px = xAt(profilePts[i].d); py = yElev(profilePts[i].elev);
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // pressure polyline
    ctx.beginPath();
    var firstP = true;
    for (i = 0; i < profilePts.length; i++) {
      var ppv = profilePressure(profilePts[i].d);
      px = xAt(profilePts[i].d); py = yPres(ppv);
      if (firstP) { ctx.moveTo(px, py); firstP = false; } else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#2e5bff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // anchor ticks + labels
    for (i = 0; i < profileAnchors.length; i++) {
      var an = profileAnchors[i];
      var ax = xAt(an.d);
      var tele = M.telemetry(an.id);
      var stn = nodeVisual(an.id);
      var anchorColor = nodeColor(stn);
      ctx.beginPath();
      ctx.moveTo(ax, yElev(an.node.y) - 4);
      ctx.lineTo(ax, yElev(an.node.y) + 4);
      ctx.strokeStyle = 'rgba(212,168,83,.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, yPres(tele.p), 3, 0, Math.PI * 2);
      ctx.fillStyle = anchorColor;
      ctx.fill();
      ctx.font = '600 8px "JetBrains Mono", monospace';
      ctx.fillStyle = stn === 'crit' ? '#fecaca' : stn === 'corrode' ? '#e9d5ff' : stn === 'warn' ? '#fde68a' : '#cfe3d7';
      ctx.textAlign = 'center';
      ctx.fillText(an.id, ax, padT + plotH + 14);
      ctx.textAlign = 'left';
    }

    // condensation trap callout at N07
    var n7 = N['N07'];
    var x7 = xAt(profileAnchors[6].d);
    var y7 = yElev(n7.y);
    ctx.beginPath();
    ctx.arc(x7, y7 - 10, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.fillText('WATER TRAP N07', x7, y7 - 20);
    ctx.textAlign = 'left';

    // live title legend
    ctx.font = '600 10px "Host Grotesk", sans-serif';
    ctx.fillStyle = '#e2efe6';
    ctx.textAlign = 'left';
    ctx.fillText('Profil hidraulik jalur utama (trunk + cabang B)', padL, 14);
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(167,192,176,.55)';
    ctx.fillText(Math.round(profileTotal) + ' m lintasan · elevasi masl vs tekanan kPa', padL, 27);
  }

  /* ------------------------------------------------------------------ frame */
  function render(now) {
    if (!W || !H || !visible) return;
    if (mode === '3d') draw3D(now);
    else if (mode === 'hybrid') drawHybrid(now);
    else drawProfile(now);
    updateHud();
  }

  function updateHud() {
    var elScale = document.getElementById('geoScale');
    var elCoords = document.getElementById('geoCoords');
    var scaleEl = document.querySelector('.geo-scalebar i');
    var mPerPx, cx, cz;
    if (mode === 'profile') {
      if (elScale) elScale.textContent = 'profil';
      if (scaleEl) scaleEl.style.display = 'none';
      if (elCoords) elCoords.textContent = 'jalur trunk + cabang B';
      return;
    }
    if (scaleEl) scaleEl.style.display = '';
    if (mode === '3d') {
      var v = getView();
      mPerPx = cam.dist / v.focal;
      cx = cam.tx; cz = cam.tz;
    } else {
      mPerPx = 1 / hView.scale;
      cx = hView.x; cz = hView.z;
    }
    var target = 62 * mPerPx;
    var steps = [25, 50, 100, 200, 250, 500, 750, 1000, 1500, 2000, 3000, 4000];
    var best = steps[0];
    for (var i = 1; i < steps.length; i++) {
      if (Math.abs(steps[i] - target) < Math.abs(best - target)) best = steps[i];
    }
    if (elScale) elScale.textContent = fmt(best, 0) + ' m';
    if (scaleEl) scaleEl.style.width = Math.round(best / mPerPx) + 'px';
    if (elCoords) {
      var lat = D.site.lat + cz / D.site.mPerDegLat;
      var lon = D.site.lon + cx / D.site.mPerDegLon;
      elCoords.textContent = lat.toFixed(5).replace('.', ',') + ' / ' + lon.toFixed(5).replace('.', ',');
    }
  }

  function loop(now) {
    if (!visible) { requestAnimationFrame(loop); return; }
    var animating = false;
    if (tween) {
      var t = clamp((now - tween.t0) / tween.dur, 0, 1);
      var e = easeInOut(t);
      cam.tx = lerp(tween.from.tx, tween.to.tx, e);
      cam.tz = lerp(tween.from.tz, tween.to.tz, e);
      cam.dist = lerp(tween.from.dist, tween.to.dist, e);
      cam.yaw = lerpAngle(tween.from.yaw, tween.to.yaw, e);
      cam.pitch = lerp(tween.from.pitch, tween.to.pitch, e);
      needsRender = true; animating = true;
      if (t >= 1) tween = null;
    }
    if (hTween) {
      var ht = clamp((now - hTween.t0) / hTween.dur, 0, 1);
      var he = easeInOut(ht);
      hView.x = lerp(hTween.from.x, hTween.to.x, he);
      hView.z = lerp(hTween.from.z, hTween.to.z, he);
      hView.scale = lerp(hTween.from.scale, hTween.to.scale, he);
      needsRender = true; animating = true;
      if (ht >= 1) hTween = null;
    }
    if (orbitUntil && now < orbitUntil) {
      cam.yaw += 0.00028 * 16;
      needsRender = true; animating = true;
    } else if (orbitUntil && now >= orbitUntil) {
      orbitUntil = 0;
      var btn = document.querySelector('[data-cam="orbit"]');
      if (btn) btn.classList.remove('is-on');
    }
    var flow = !reduced && mode === '3d';
    if (needsRender || (flow && now - lastDraw > 33) || (mode === '3d' && S.state.phase > 0 && now - lastDraw > 60)) {
      render(now);
      needsRender = false;
      lastDraw = now;
    } else if (mode === 'hybrid' && !reduced && now - lastDraw > 40) {
      render(now);
      lastDraw = now;
    }
    requestAnimationFrame(loop);
  }

  function lerpAngle(a, b, t) {
    var d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }

  /* ------------------------------------------------------------------ camera actions */
  function flyTo(to, dur) {
    orbitUntil = 0;
    if (reduced) { cam.tx = to.tx !== undefined ? to.tx : cam.tx; cam.tz = to.tz !== undefined ? to.tz : cam.tz; cam.dist = to.dist !== undefined ? to.dist : cam.dist; cam.yaw = to.yaw !== undefined ? to.yaw : cam.yaw; cam.pitch = to.pitch !== undefined ? to.pitch : cam.pitch; needsRender = true; return; }
    tween = {
      from: { tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: cam.yaw, pitch: cam.pitch },
      to: {
        tx: to.tx !== undefined ? to.tx : cam.tx,
        tz: to.tz !== undefined ? to.tz : cam.tz,
        dist: to.dist !== undefined ? to.dist : cam.dist,
        yaw: to.yaw !== undefined ? to.yaw : cam.yaw,
        pitch: to.pitch !== undefined ? to.pitch : cam.pitch
      },
      t0: performance.now(),
      dur: dur || 1300
    };
    needsRender = true;
  }

  function flyHybrid(to, dur) {
    hTween = {
      from: { x: hView.x, z: hView.z, scale: hView.scale },
      to: { x: to.x, z: to.z, scale: to.scale !== undefined ? to.scale : hView.scale },
      t0: performance.now(),
      dur: dur || 1100
    };
    needsRender = true;
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    document.querySelectorAll('[data-view]').forEach(function (btn) {
      var on = btn.getAttribute('data-view') === m;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var exag = document.querySelector('.geo-exag');
    if (exag) exag.hidden = m !== '3d';
    var hint = document.getElementById('geoHint');
    if (hint) {
      hint.textContent = m === 'hybrid' ? 'Seret untuk menggeser · scroll untuk zoom'
        : m === 'profile' ? 'Profil statis · pilih 3D untuk interaksi'
        : 'Seret untuk memutar · scroll untuk zoom';
    }
    if (m === 'hybrid') {
      if (!BM_READY && !BM_BUILDING) makeBasemap();
      fitHybrid();
    }
    needsRender = true;
  }

  function resetCam() {
    flyTo({
      tx: DEFAULT_CAM.tx, tz: DEFAULT_CAM.tz,
      dist: DEFAULT_CAM.dist,
      yaw: DEFAULT_CAM.yaw,
      pitch: DEFAULT_CAM.pitch
    }, 1000);
  }

  function cameraAction(action) {
    if (mode === 'profile') setMode('3d');
    if (action === 'orbit') {
      if (mode !== '3d') setMode('3d');
      orbitUntil = performance.now() + 20000;
      flyTo({ dist: 2600, pitch: 58 * Math.PI / 180 }, 900);
      var btn = document.querySelector('[data-cam="orbit"]');
      if (btn) btn.classList.add('is-on');
      return;
    }
    if (mode === 'hybrid') {
      if (action === 'wellhead') flyHybrid({ x: N['N01'].x, z: N['N01'].z, scale: 1.05 }, 1000);
      else if (action === 'manifold') flyHybrid({ x: N['N04'].x, z: N['N04'].z, scale: 1.1 }, 1000);
      else if (action === 'branchb') flyHybrid({ x: N['N06'].x, z: N['N06'].z, scale: 1.15 }, 1000);
      else if (action === 'trap') flyHybrid({ x: N['N07'].x, z: N['N07'].z, scale: 1.05 }, 1000);
      else if (action === 'umkm') flyHybrid({ x: N['N10'].x, z: N['N10'].z, scale: 1.1 }, 1000);
      else if (action === 'reset') { fitHybrid(); needsRender = true; }
      return;
    }
    if (action === 'wellhead') {
      flyTo({ tx: N['N01'].x, tz: N['N01'].z, dist: 900, pitch: 42 * Math.PI / 180, yaw: -24 * Math.PI / 180 }, 1400);
    } else if (action === 'manifold') {
      flyTo({ tx: N['N04'].x, tz: N['N04'].z, dist: 1050, pitch: 48 * Math.PI / 180, yaw: 15 * Math.PI / 180 }, 1400);
    } else if (action === 'branchb') {
      flyTo({ tx: N['N06'].x, tz: N['N06'].z, dist: 850, pitch: 44 * Math.PI / 180, yaw: 22 * Math.PI / 180 }, 1400);
    } else if (action === 'trap') {
      flyTo({ tx: N['N07'].x, tz: N['N07'].z, dist: 760, pitch: 38 * Math.PI / 180, yaw: 18 * Math.PI / 180 }, 1400);
    } else if (action === 'umkm') {
      flyTo({ tx: N['N10'].x, tz: N['N10'].z, dist: 950, pitch: 45 * Math.PI / 180, yaw: -10 * Math.PI / 180 }, 1400);
    } else if (action === 'reset') {
      resetCam();
    }
  }

  /* ------------------------------------------------------------------ interaction */
  var pointers = new Map();
  var drag = null, pinch = null, moved = false;

  function localPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitNode(mx, my) {
    var best = null, bestD = 18;
    if (mode === '3d') {
      var v = getView();
      for (var i = 0; i < D.nodes.length; i++) {
        var n = D.nodes[i];
        var p = project({ x: n.x, y: n.y * EXAG + 3, z: n.z }, v);
        if (!p) continue;
        var d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) { bestD = d; best = n.id; }
      }
    } else {
      for (var j = 0; j < D.nodes.length; j++) {
        var m = D.nodes[j];
        var d2 = Math.hypot(mapX(m.x) - mx, mapY(m.z) - my);
        if (d2 < bestD) { bestD = d2; best = m.id; }
      }
    }
    return best;
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (mode === 'profile') return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    var p = localPos(e);
    pointers.set(e.pointerId, p);
    moved = false;
    if (pointers.size === 1) {
      drag = mode === '3d'
        ? { sx: p.x, sy: p.y, yaw: cam.yaw, pitch: cam.pitch }
        : { sx: p.x, sy: p.y, vx: hView.x, vz: hView.z };
      canvas.classList.add('is-dragging');
      stage.classList.add('is-touched');
    } else if (pointers.size === 2) {
      var arr = Array.from(pointers.values());
      pinch = {
        d: Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y),
        dist: cam.dist,
        scale: hView.scale,
        moved: false
      };
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) {
      var hp = localPos(e);
      var hover = hitNode(hp.x, hp.y);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
      return;
    }
    var p = localPos(e);
    var prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2 && pinch) {
      var arr = Array.from(pointers.values());
      var nd = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      var ratio = nd / (pinch.d || 1);
      if (Math.abs(ratio - 1) > 0.01) {
        pinch.moved = true;
        if (mode === '3d') cam.dist = clamp(pinch.dist / ratio, 550, 3600);
        else hView.scale = clamp(pinch.scale * ratio, 0.12, 1.2);
        needsRender = true;
      }
      return;
    }
    if (!drag) return;
    if (!moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 3) moved = true;
    if (!moved) return;
    orbitUntil = 0;
    if (mode === '3d') {
      cam.yaw = drag.yaw - (p.x - drag.sx) * 0.005;
      cam.pitch = clamp(drag.pitch - (p.y - drag.sy) * 0.0035, 34 * Math.PI / 180, 82 * Math.PI / 180);
    } else {
      hView.x = drag.vx - (p.x - drag.sx) / hView.scale;
      hView.z = drag.vz + (p.y - drag.sy) / hView.scale;
    }
    needsRender = true;
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) return;
    var p = localPos(e);
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      canvas.classList.remove('is-dragging');
      if (!moved && !(pinch && pinch.moved)) {
        var id = hitNode(p.x, p.y);
        if (id) S.set({ selected: id, selectedNodeId: id });
      }
      drag = null;
      pinch = null;
    } else if (pointers.size === 1) {
      pinch = null;
      var rem = Array.from(pointers.values())[0];
      drag = mode === '3d'
        ? { sx: rem.x, sy: rem.y, yaw: cam.yaw, pitch: cam.pitch }
        : { sx: rem.x, sy: rem.y, vx: hView.x, vz: hView.z };
    }
  }

  function onWheel(e) {
    e.preventDefault();
    if (mode === 'profile') return;
    stage.classList.add('is-touched');
    var p = localPos(e);
    if (mode === '3d') {
      cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 550, 3600);
    } else {
      var wx = hView.x + (p.x - W / 2) / hView.scale;
      var wz = hView.z - (p.y - H / 2) / hView.scale;
      var ns = clamp(hView.scale * Math.exp(-e.deltaY * 0.0015), 0.12, 1.2);
      hView.scale = ns;
      hView.x = wx - (p.x - W / 2) / ns;
      hView.z = wz + (p.y - H / 2) / ns;
    }
    needsRender = true;
  }

  function onKey(e) {
    var step = 0.08;
    var handled = true;
    if (mode === 'profile') { handled = false; }
    else if (e.key === 'ArrowLeft') { if (mode === '3d') cam.yaw += step; else hView.x -= 120 / hView.scale; }
    else if (e.key === 'ArrowRight') { if (mode === '3d') cam.yaw -= step; else hView.x += 120 / hView.scale; }
    else if (e.key === 'ArrowUp') { if (mode === '3d') cam.pitch = clamp(cam.pitch + 0.05, 0.59, 1.43); else hView.z += 120 / hView.scale; }
    else if (e.key === 'ArrowDown') { if (mode === '3d') cam.pitch = clamp(cam.pitch - 0.05, 0.59, 1.43); else hView.z -= 120 / hView.scale; }
    else if (e.key === '+' || e.key === '=') { if (mode === '3d') cam.dist = clamp(cam.dist * 0.85, 550, 3600); else hView.scale = clamp(hView.scale * 1.15, 0.12, 1.2); }
    else if (e.key === '-' || e.key === '_') { if (mode === '3d') cam.dist = clamp(cam.dist * 1.15, 550, 3600); else hView.scale = clamp(hView.scale / 1.15, 0.12, 1.2); }
    else if (e.key === 'Home') { resetCam(); }
    else handled = false;
    if (handled) {
      e.preventDefault();
      needsRender = true;
    }
  }

  function onDblClick() {
    if (mode === 'profile') return;
    if (mode === '3d') resetCam(); else { fitHybrid(); needsRender = true; }
  }

  /* ------------------------------------------------------------------ resize */
  function resize() {
    var rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bgGrad = null;
    buildMesh();
    needsRender = true;
  }

  /* ------------------------------------------------------------------ state sync */
  var lastPhase = -1, lastScenario = 'normal';

  function syncState(state) {
    needsRender = true;
    if (state.scenario === 'leak' && state.phase === 3 && (lastPhase < 3 || lastScenario !== 'leak')) {
      flyTo({ tx: leakPoint.x, tz: leakPoint.z, dist: 1550, yaw: 15 * Math.PI / 180, pitch: 47 * Math.PI / 180 }, 1500);
    }
    if (state.scenario === 'condensate' && state.phase === 3 && (lastPhase < 3 || lastScenario !== 'condensate')) {
      flyTo({ tx: N['N07'].x, tz: N['N07'].z, dist: 1400, yaw: 12 * Math.PI / 180, pitch: 46 * Math.PI / 180 }, 1500);
    }
    if (state.scenario === 'corrosion' && state.phase === 2 && (lastPhase < 2 || lastScenario !== 'corrosion')) {
      flyTo({ tx: N['N01'].x, tz: N['N01'].z, dist: 900, pitch: 42 * Math.PI / 180, yaw: -24 * Math.PI / 180 }, 1400);
    }
    lastPhase = state.phase;
    lastScenario = state.scenario;
  }

  /* ------------------------------------------------------------------ init */
  function bindUI() {
    document.querySelectorAll('[data-cam]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cameraAction(btn.getAttribute('data-cam'));
      });
    });
    document.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-view'));
      });
    });
    var fs = document.querySelector('[data-fullscreen]');
    if (fs) {
      fs.addEventListener('click', function () {
        if (document.fullscreenElement) {
          document.exitFullscreen && document.exitFullscreen();
        } else if (stage.requestFullscreen) {
          stage.requestFullscreen();
        }
      });
    }
    document.addEventListener('fullscreenchange', function () {
      setTimeout(resize, 60);
    });
  }

  function init() {
    stage = document.getElementById('geoStage');
    canvas = document.getElementById('geoCanvas');
    if (!stage || !canvas) return;
    ctx = canvas.getContext('2d');
    prepare();
    resize();
    if (W < 620) {
      cam.tx = 250; cam.tz = -250; cam.dist = 3400;
      cam.pitch = 58 * Math.PI / 180; cam.yaw = 8 * Math.PI / 180;
    }
    bindUI();
    var ro = new ResizeObserver(function () { resize(); });
    ro.observe(stage);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    S.on(syncState);
    syncState(S.state);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) needsRender = true;
      }, { threshold: 0.02 }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) needsRender = true;
    });

    requestAnimationFrame(loop);
    setTimeout(function () { needsRender = true; }, 250);
  }

  window.METHAGIS = {
    init: init,
    resize: function () { resize(); },
    setScenario: function () { needsRender = true; },
    cameraAction: function (action) { cameraAction(action); },
    flyToNode: function (nodeId) {
      var n = N[nodeId];
      if (!n) return;
      if (mode === 'hybrid') {
        flyHybrid({ x: n.x, z: n.z, scale: 1.15 }, 1000);
      } else {
        flyTo({ tx: n.x, tz: n.z, dist: 850, pitch: 45 * Math.PI / 180, yaw: 15 * Math.PI / 180 }, 1200);
      }
    }
  };
})();
