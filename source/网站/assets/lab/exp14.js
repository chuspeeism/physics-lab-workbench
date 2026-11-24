/* 14 探究杠杆的平衡条件（课本图 12.1-3）。
   装置：铁架台上的杠杆（支点在中央，两侧各 6 个挂孔，相邻两孔相距 5 cm = 0.05 m），两端各有平衡螺母（两只一起移动）；
   钩码每个 0.5 N（盒里共 10 个，每侧最多挂 6 个）；弹簧测力计 0～5 N，分度值 0.1 N（弹簧 2 cm / N）。
   模型：按力矩计算杠杆转动（有阻尼，±20° 碰到限位）；支点略高于杠杆重心，有很小的回正力矩，所以没配平时会停在倾斜位置。
   初始平衡螺母偏左，空载时左端下沉。测力计：手拿拉环，拉力 = 弹簧伸长 × k，沿测力计轴线；力矩 = 支点到拉力作用线的距离 × 拉力。
   规则：挂钩码前先空载调平；挂上钩码后动了平衡螺母，这组数据作废（取下全部钩码、重新空载调平才恢复）；
   杠杆在水平位置静止才能记录；斜拉时要显示力臂，从辅助线读 l₁（= 挂点到支点距离 × cos 拉向角）。
   动力 F₁：右侧钩码（或测力计）；阻力 F₂：左侧钩码。 */
(function () {
  var PY = 30, HOLE = 5, NB = 0.9, NUT0 = -1.6, WN2 = 0.6, KAP = 0.15, HW = 0.5, NMAX = 6, NTOT = 10, LIM = 20, SC_K = 0.5;
  var SC_BODY = 17, SC_Z0 = 3.2, SC_PER = 2, SC_R0 = 1.2, SC_HK = 1.6, SC_RING = 1.0, SC_L0 = SC_RING + SC_BODY + SC_R0 + SC_HK, RHO_MIN = SC_L0 - 1, RHO_MAX = SC_L0 + 10.4;
  var st = { sel: 'R', nut: NUT0, L: { hole: 3, n: 0 }, R: { hole: 2, n: 0 }, mode: 'hook', S: { hole: 3, ang: 0, rho: SC_L0 + 2 }, th: -LIM, w: 0, still: 0, taint: false, arm: false, rows: [], justRec: null };
  var K, V, T3, beam, needle, nutL, nutR, stacks = {}, scale, ring, armG = {}, tray, winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function fL(v) { return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? f2(v) : (Math.round(v * 1000) / 1000).toFixed(3); }   // 力臂：整厘米写两位小数，0.125 m 这类写三位
  function rad(d) { return d * Math.PI / 180; }
  function nutBal() { return Math.abs(st.nut - NB) < 0.02; }
  function loaded() { return st.L.n > 0 || st.R.n > 0 || st.mode === 'scale'; }
  function level() { return Math.abs(st.th) < 0.5; }
  function balanced() { return level() && st.still >= 0.4; }
  function oblique() { return st.mode === 'scale' && Math.abs(st.S.ang) >= 0.5; }
  function F2() { return st.L.n * HW; }
  function l2() { return st.L.hole * HOLE / 100; }
  function l1() { return st.mode === 'scale' ? st.S.hole * HOLE * Math.cos(rad(st.S.ang)) / 100 : st.R.hole * HOLE / 100; }
  /* 测力计：拉环在世界中的位置（以支点为原点，cm）；挂钩在杠杆上的挂点随杠杆转动 */
  function ringPos() { var d = st.S.hole * HOLE, a = rad(st.S.ang); return { x: d + st.S.rho * Math.sin(a), y: -st.S.rho * Math.cos(a) }; }
  function hookPt(th) { var d = st.S.hole * HOLE, t = rad(th); return { x: d * Math.cos(t), y: -d * Math.sin(t) }; }
  function scaleF(th) { var R = ringPos(), P = hookPt(th), len = Math.hypot(R.x - P.x, R.y - P.y); return Math.max(0, (len - SC_L0) * SC_K); }
  function readF1() { return st.mode === 'scale' ? Math.round(scaleF(st.th) * 10) / 10 : st.R.n * HW; }
  /* 顺时针（右端向下）为正的力矩，N·m */
  function torque(th) {
    var c = Math.cos(rad(th)), t = c * ((st.mode === 'hook' ? st.R.n * HW * st.R.hole * HOLE : 0) - st.L.n * HW * st.L.hole * HOLE + WN2 * (st.nut - NB)) / 100 - KAP * Math.sin(rad(th));
    if (st.mode === 'scale') {
      var R = ringPos(), P = hookPt(th), sx = R.x - P.x, sy = R.y - P.y, len = Math.hypot(sx, sy), F = Math.max(0, (len - SC_L0) * SC_K);
      if (len > 0) t += -(P.x * (F * sy / len) - P.y * (F * sx / len)) / 100;
    }
    return t;
  }
  function inertia() { var I = 0.008, m = function (n) { return n * HW / 10; }; I += m(st.L.n) * Math.pow(st.L.hole * HOLE / 100, 2); if (st.mode === 'hook') I += m(st.R.n) * Math.pow(st.R.hole * HOLE / 100, 2); return I; }
  function stiff() { return KAP + (st.mode === 'scale' ? 50 * Math.pow(l1(), 2) : 0); }

  /* ── 纹理与小工具 ── */
  function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function rr(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function rbox(w, h, d, r, mat) {
    var g = new T3.ExtrudeGeometry(rr(w - 2 * r, h - 2 * r, r * 0.6), { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2); var m = new T3.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function cyl(r, h, mat, seg) { var m = new T3.Mesh(new T3.CylinderGeometry(r, r, h, seg || 24), mat); m.castShadow = true; return m; }
  function scaleFace() {
    return tex(200, 1600, function (g, w, h) {
      var px = h / (SC_BODY - 1.2);
      g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, w, h); g.fillStyle = '#DCE4EE'; g.fillRect(w / 2 - 9, 0, 18, h);
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 50px Bahnschrift, Arial';
      for (var i = 0; i <= 50; i++) {
        var y = (SC_Z0 + SC_PER * i / 10 - 0.6) * px, l = i % 10 === 0 ? 46 : i % 5 === 0 ? 34 : 22;
        g.lineWidth = i % 5 === 0 ? 5 : 3; g.beginPath(); g.moveTo(w / 2 + 12, y); g.lineTo(w / 2 + 12 + l, y); g.stroke(); g.beginPath(); g.moveTo(w / 2 - 12, y); g.lineTo(w / 2 - 12 - l * 0.6, y); g.stroke();
        if (i % 10 === 0) { g.save(); g.translate(30, y); g.rotate(Math.PI); g.fillText(String(i / 10), 0, 0); g.restore(); }   // 测力计倒挂（拉环在下）：数字转正
      }
    });
  }
  function makeScale() {
    var g = new T3.Group(), steel = new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .6, roughness: .3 });
    var ringM = new T3.Mesh(new T3.TorusGeometry(0.85, 0.16, 10, 32), steel); ringM.position.y = SC_RING; g.add(ringM);
    var neck = cyl(0.16, 0.6, steel, 10); neck.position.y = 0.05; g.add(neck);
    var body = rbox(3.3, SC_BODY, 1.2, 0.3, new T3.MeshStandardMaterial({ color: 0x3E6FB8, roughness: .45, metalness: .15 })); body.position.y = -SC_BODY / 2; g.add(body);
    var face = new T3.Mesh(new T3.PlaneGeometry(2.4, SC_BODY - 1.2), new T3.MeshStandardMaterial({ map: scaleFace(), roughness: .6, emissive: 0xffffff, emissiveIntensity: .12 })); face.position.set(0, -SC_BODY / 2, 0.61); g.add(face);
    var ptr = new T3.Mesh(new T3.BoxGeometry(1.5, 0.16, 0.06), new T3.MeshBasicMaterial({ color: 0xFE752D })); ptr.position.z = 0.64; g.add(ptr);
    var rod = cyl(0.13, 1, steel, 10); g.add(rod);
    var hook = new T3.Group(), hk = new T3.Mesh(new T3.TorusGeometry(0.5, 0.12, 8, 20, Math.PI * 1.35), steel); hk.rotation.z = Math.PI * 0.82; hk.position.y = -0.5; hook.add(hk); g.add(hook);
    var hit = new T3.Mesh(new T3.BoxGeometry(5, SC_BODY + 6, 4), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = -SC_BODY / 2 + 1; g.add(hit);
    g.userData = { hit: hit, set: function (F) { var e = SC_PER * clamp(F, 0, 5.2); ptr.position.y = -(SC_Z0 + e); var len = SC_R0 + e; rod.scale.y = len; rod.position.y = -SC_BODY - len / 2 + 0.3; hook.position.y = -SC_BODY - len + 0.3; } };
    return g;
  }
  function makeWeight(mat, hookM) {
    var g = new T3.Group();
    var pts = [[0, 0], [1.15, 0], [1.3, 0.14], [1.3, 2.06], [1.15, 2.2], [0.24, 2.2], [0.24, 2.5], [0, 2.5]].map(function (p) { return new T3.Vector2(p[0], p[1]); });
    var b = new T3.Mesh(new T3.LatheGeometry(pts, 28), mat); b.castShadow = true; b.position.y = -2.85; g.add(b);
    var hk = new T3.Mesh(new T3.TorusGeometry(0.36, 0.08, 6, 14, Math.PI * 1.5), hookM); hk.position.y = -0.32; hk.rotation.z = -Math.PI * 0.25; g.add(hk);
    return g;   // 局部原点 = 顶上挂钩；钩码向下 2.9 cm
  }
  function band(color, dashed) {
    var m = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: dashed ? .85 : 1, depthTest: false }));
    if (dashed) { var t = tex(64, 8, function (g, w, h) { g.fillStyle = '#fff'; g.fillRect(0, 0, 36, h); }); t.wrapS = T3.RepeatWrapping; m.material.map = t; m.material.alphaMap = t; }
    m.renderOrder = 5; m.userData.dashed = dashed;
    m.userData.set = function (a, b, w) {   // a、b 为世界坐标（z 取两者平均）
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      m.visible = len > 0.05; m.scale.set(Math.max(len, 0.01), w, 1); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.rotation.set(0, 0, Math.atan2(dy, dx));
      if (dashed) m.material.map.repeat.set(len / 1.4, 1);
    };
    V.scene.add(m); return m;
  }

  /* ── 场景 ── */
  function build() {
    V = K.three({ target: [0, 28.5, 0], az: 0.1, el: 0.1, dist: 150, minDist: 80, maxDist: 200, minAz: -0.6, maxAz: 0.6, minEl: 0.0, maxEl: 0.7, fov: 30, sun: [-30, 110, 90] });
    T3 = V.T; var S = V.scene;
    var iron = new T3.MeshStandardMaterial({ color: 0x6B7685, roughness: .5, metalness: .35 });
    var alu = new T3.MeshStandardMaterial({ color: 0xD7DEE6, roughness: .38, metalness: .25 });
    var steel = new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .55, roughness: .3 });
    var brass = new T3.MeshStandardMaterial({ color: 0xC9A65E, metalness: .45, roughness: .32 });
    // 铁架台
    var base = rbox(30, 1.6, 14, 0.4, iron); base.position.set(0, 0.8, -3); S.add(base);
    var rod = cyl(0.7, PY - 1.6, iron, 18); rod.position.set(0, (PY + 1.6) / 2 - 1.6, -2.2); S.add(rod);
    var fork = rbox(3.2, 3.4, 1.0, 0.25, iron); fork.position.set(0, PY - 0.6, -1.4); S.add(fork);
    var axle = cyl(0.42, 3.4, steel, 16); axle.rotation.x = Math.PI / 2; axle.position.set(0, PY, -0.4); S.add(axle);
    // 指针下方的小刻度板（看杠杆是否水平）
    var arcT = tex(512, 160, function (g, w, h) {
      g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 30px Bahnschrift'; g.textAlign = 'center';
      for (var d = -20; d <= 20; d++) { var x = w / 2 + d * 11.5, l = d % 10 === 0 ? 60 : d % 5 === 0 ? 44 : 26; g.lineWidth = d % 5 ? 2 : 4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, l); g.stroke(); }
      g.fillStyle = '#FE752D'; g.fillRect(w / 2 - 3, 0, 6, 70);
    });
    var plate = new T3.Mesh(new T3.PlaneGeometry(6, 1.9), new T3.MeshStandardMaterial({ map: arcT, roughness: .6 })); plate.position.set(0, PY - 9.6, -0.88); S.add(plate);
    // 杠杆：带 13 个孔的铝板 + 刻度 + 两端螺杆与螺母
    beam = new T3.Group(); beam.position.set(0, PY, 0); S.add(beam);
    var shp = rr(68, 2.8, 1.2);
    for (var k = -6; k <= 6; k++) { var hp = new T3.Path(); hp.absarc(k * HOLE, 0, k === 0 ? 0.5 : 0.36, 0, Math.PI * 2, true); shp.holes.push(hp); }
    var bg = new T3.ExtrudeGeometry(shp, { depth: 0.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2, curveSegments: 12 }); bg.translate(0, 0, -0.3);
    var bm = new T3.Mesh(bg, alu); bm.castShadow = true; beam.add(bm);
    var mk = tex(2048, 96, function (g, w, h) {
      var px = w / 68; g.fillStyle = '#1E3A5F'; g.strokeStyle = '#1E3A5F'; g.font = 'bold 40px Bahnschrift'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (var c = -30; c <= 30; c++) { var x = w / 2 + c * px; g.lineWidth = c % 5 ? 2 : 4; g.beginPath(); g.moveTo(x, h); g.lineTo(x, h - (c % 5 ? 14 : 24)); g.stroke(); }
      for (var k2 = 1; k2 <= 6; k2++) { g.fillText(String(k2), w / 2 + k2 * HOLE * px, 26); g.fillText(String(k2), w / 2 - k2 * HOLE * px, 26); }
    });
    var mkM = new T3.Mesh(new T3.PlaneGeometry(68, 3.2), new T3.MeshBasicMaterial({ map: mk, transparent: true })); mkM.position.set(0, 0, 0.44); beam.add(mkM);
    [-1, 1].forEach(function (s) { var t = cyl(0.3, 6.5, steel, 10); t.rotation.z = Math.PI / 2; t.position.set(s * 36.6, 0, 0); beam.add(t); });
    nutL = new T3.Mesh(new T3.CylinderGeometry(0.95, 0.95, 1.3, 6), brass); nutL.rotation.z = Math.PI / 2; nutL.castShadow = true; beam.add(nutL);
    nutR = nutL.clone(); beam.add(nutR);
    [nutL, nutR].forEach(function (n) { var h = new T3.Mesh(new T3.BoxGeometry(3.2, 3.6, 3), new T3.MeshBasicMaterial({ visible: false })); n.add(h); n.userData.hit = h; h.rotation.z = -Math.PI / 2; });
    needle = new T3.Group(); var nd = new T3.Mesh(new T3.BoxGeometry(0.22, 8.4, 0.1), new T3.MeshStandardMaterial({ color: 0xFE752D, roughness: .5 })); nd.position.set(0, -4.9, -0.8); needle.add(nd); beam.add(needle);
    // 钩码（左右两串）与测力计
    var wM = new T3.MeshStandardMaterial({ color: 0xC4CCD6, metalness: .35, roughness: .3 });
    ['L', 'R'].forEach(function (s) {
      var g = new T3.Group(), thr = cyl(0.05, 1, new T3.MeshBasicMaterial({ color: 0x56677D }), 6); thr.castShadow = false; g.add(thr);
      var loop = new T3.Mesh(new T3.TorusGeometry(0.42, 0.07, 6, 16), steel); g.add(loop);
      var ws = []; for (var i = 0; i < NMAX; i++) { var w = makeWeight(wM, steel); g.add(w); ws.push(w); }
      var hit = new T3.Mesh(new T3.BoxGeometry(3.6, 1, 3), new T3.MeshBasicMaterial({ visible: false })); g.add(hit);
      g.userData = { thr: thr, loop: loop, ws: ws, hit: hit }; S.add(g); stacks[s] = g;
    });
    tray = new T3.Group(); tray.position.set(24, 0, 9); S.add(tray);
    var trayHit = new T3.Mesh(new T3.BoxGeometry(15, 7, 6), new T3.MeshBasicMaterial({ visible: false })); trayHit.position.y = 3; tray.add(trayHit); tray.userData.hit = trayHit;
    var tb = rbox(14, 1.2, 5, 0.25, new T3.MeshStandardMaterial({ color: 0x5C6B7E, roughness: .6 })); tb.position.y = 0.6; tray.add(tb);
    tray.userData.ws = [];
    for (var j = 0; j < NTOT; j++) { var tw = makeWeight(wM, steel); tw.position.set(-5.6 + (j % 5) * 2.8, 4.1, j < 5 ? -1 : 1.4); tray.add(tw); tray.userData.ws.push(tw); }
    scale = makeScale(); S.add(scale);
    armG.L = band(0xFE752D, false); armG.R = band(0xFE752D, false); armG.lineL = band(0x1E3A5F, true); armG.lineR = band(0x1E3A5F, true);
    V.tag('l1', ''); V.tag('l2', '');
    // 拖动：螺母沿杠杆移动；钩码串沿杠杆换挂孔；测力计拉环在竖直平面内任意拉
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, hitList()); },
      start: function (ev) {
        var h = V.pick(ev, hitList()); if (!h) return false;
        var o = h.object, s = V.toScreen(h.point), m = stagePt(ev);
        grab = { p0: h.point.clone(), ox: m.x - s.x, oy: m.y - s.y, x: ev.clientX, y: ev.clientY, moved: false };
        var dir = new T3.Vector3(Math.cos(rad(st.th)), -Math.sin(rad(st.th)), 0);
        if (o === nutL.userData.hit || o === nutR.userData.hit) { grab.k = 'nut'; grab.u0 = st.nut; grab.dir = dir; }
        else if (o === tray.userData.hit) grab.k = 'tray';
        else if (o === stacks.L.userData.hit) { grab.k = 'L'; grab.u0 = -st.L.hole * HOLE; grab.dir = dir; }
        else if (o === stacks.R.userData.hit) { grab.k = 'R'; grab.u0 = st.R.hole * HOLE; grab.dir = dir; }
        else {   // 记住按下点在测力计轴线坐标里的位置（沿轴 s、垂直轴 q）；拖动时测力计绕挂钩摆，按下点始终在手下
          grab.k = 'ring'; var R = ringPos(), P = hookPt(st.th), ax = P.x - R.x, ay = P.y - R.y, al = Math.hypot(ax, ay); ax /= al; ay /= al;
          grab.pl = new T3.Plane(new T3.Vector3(0, 0, 1), -h.point.z); var p = V.onPlane(ev, grab.pl);
          var gx = (p ? p.x : h.point.x) - R.x, gy = (p ? p.y : h.point.y) - PY - R.y; grab.s = gx * ax + gy * ay; grab.q = -gx * ay + gy * ax;
        }
        return true;
      },
      move: function (ev) {
        if (!grab) return;
        if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) { grab.moved = true; if (grab.k !== 'ring' && grab.k !== 'tray') st.hold = true; }   // 拖螺母、钩码时手扶着杠杆，松手后再转
        if (!grab.moved || grab.k === 'tray') return;
        if (grab.k === 'ring') {
          var p = V.onPlane(ev, grab.pl); if (!p) return;
          var P = hookPt(st.th), R = ringPos(), tx = p.x, ty = p.y - PY;
          for (var it = 0; it < 8; it++) { var ax = P.x - R.x, ay = P.y - R.y, al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al; R = { x: tx - ax * grab.s + ay * grab.q, y: ty - ay * grab.s - ax * grab.q }; }
          var d = st.S.hole * HOLE, vx = R.x - d, vy = R.y;
          st.S.ang = Math.round(clamp(Math.atan2(vx, -vy) * 180 / Math.PI, -60, 60) * 10) / 10; st.S.rho = clamp(Math.hypot(vx, vy), RHO_MIN, RHO_MAX); changed(); return;
        }
        var u = lineSolve(ev, grab, grab.k === 'nut' ? -2.5 : grab.k === 'L' ? -32 : 2, grab.k === 'nut' ? 2.5 : grab.k === 'L' ? -2 : 32);
        if (grab.k === 'nut') setNut(u);
        else { st.sel = grab.k; st.dragX = { side: grab.k, x: clamp(Math.abs(u), HOLE, 6 * HOLE) }; last = ''; }   // 钩码串连续滑动，松手再落到最近的挂孔
      },
      end: function () {
        if (grab && grab.moved) {
          if (grab.k === 'nut') snapNut();
          if (grab.k === 'ring') { snapAng(); snapRing(); }
          if (st.dragX) { var side = st.dragX.side, hole = clamp(Math.round(st.dragX.x / HOLE), 1, 6); st.dragX = null; st[side].hole = hole; moved(); }
        }
        if (grab && !grab.moved) {   // 点一下：点钩码盒给最近操作的一侧加一个，点挂着的钩码取下一个
          if (grab.k === 'tray') { var sd = st.mode === 'scale' ? 'L' : st.sel; setN(sd, st[sd].n + 1); st.sel = sd; }
          else if (grab.k === 'L' || grab.k === 'R') { st.sel = grab.k; setN(grab.k, st[grab.k].n - 1); }
        }
        st.hold = false; st.dragX = null; grab = null;
      }
    };
    V.frame = tick;
  }
  function hitList() { var a = [nutL.userData.hit, nutR.userData.hit, tray.userData.hit]; if (st.L.n) a.push(stacks.L.userData.hit); if (st.mode === 'hook' && st.R.n) a.push(stacks.R.userData.hit); if (st.mode === 'scale') a.push(scale.userData.hit); return a; }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function lineSolve(ev, g, lo, hi) {   // 沿 g.dir 移动：找参数 u，使按下的那一点在屏幕上离手指最近
    var m = stagePt(ev), tx = m.x - g.ox, ty = m.y - g.oy, best = g.u0, bd = 1e9, step = (hi - lo) / 40;
    for (var pass = 0; pass < 3; pass++) {
      for (var u = lo; u <= hi + 1e-9; u += step) { var s = V.toScreen(g.p0.clone().addScaledVector(g.dir, u - g.u0)), d = Math.hypot(s.x - tx, s.y - ty); if (d < bd) { bd = d; best = u; } }
      lo = best - step; hi = best + step; step /= 10;
    }
    return best;
  }
  function moved() { st.still = 0; changed(); }
  function setNut(v) {
    v = Math.round(clamp(v, -2.5, 2.5) * 100) / 100; if (v === st.nut) return;
    st.nut = v; if (loaded()) st.taint = true; moved();
  }
  function snapNut() { if (Math.abs(st.nut - NB) < 0.8 && st.nut !== NB) { st.nut = NB; if (loaded()) st.taint = true; moved(); } }
  /* 拉环松手：杠杆接近水平时，把拉环放到恰好平衡的位置（不改变拉向角） */
  function eqRho() {
    var c = Math.cos(rad(st.S.ang)), d = st.S.hole * HOLE, tOther = (-st.L.n * HW * st.L.hole * HOLE + WN2 * (st.nut - NB)) / 100;
    var F = -tOther / (d * c / 100); return F > 0 ? SC_L0 + F / SC_K : null;
  }
  /* 斜拉的角度吸附：只停在“力臂是 0.5 cm 的整数倍、平衡时拉力是 0.1 N 的整数倍”的角度上，
     这样按分度读出的 F₁ 和力臂辅助线读出的 l₁ 相乘，正好等于 F₂l₂（如左 3 格 2 个、拉第 3 格时：0°、约 34°、约 48°、60°） */
  function cands() {
    var d = st.S.hole * HOLE, tau = st.L.n * HW * st.L.hole * HOLE - WN2 * (st.nut - NB), out = [0];
    if (tau <= 0) return out;
    for (var k = 1; k * 0.5 < d - 1e-9; k++) { var l = k * 0.5, F = tau / l, a = Math.acos(l / d) * 180 / Math.PI; if (a <= 60.0001 && F <= 5 && Math.abs(F * 10 - Math.round(F * 10)) < 1e-6) { out.push(a); out.push(-a); } }
    return out;
  }
  function snapAng() {
    if (Math.abs(st.S.ang) < 0.5) { if (st.S.ang) { st.S.ang = 0; moved(); } return; }
    var c = cands(), best = st.S.ang, bd = 1e9; c.forEach(function (a) { var dd = Math.abs(a - st.S.ang); if (dd < bd) { bd = dd; best = a; } });
    if (bd < 12 && best !== st.S.ang) { st.S.ang = best; moved(); }
  }
  function snapRing() { var r = eqRho(); if (r != null && Math.abs(st.th) < 2.5 && Math.abs(r - st.S.rho) < 0.8) { st.S.rho = r; moved(); } }
  function setMode(m) { if (m === st.mode) return; st.mode = m; if (m === 'scale') { st.S.hole = st.R.hole; st.R.n = 0; var r = eqRho(); st.S.rho = r != null ? clamp(r, RHO_MIN, RHO_MAX) : SC_L0 + 2; } moved(); }
  function setN(side, n) { var other = side === 'L' ? st.R.n : st.L.n; n = clamp(n, 0, Math.min(NMAX, NTOT - other)); if (n === st[side].n) return; st[side].n = n; unloadCheck(); moved(); }
  function unloadCheck() { if (!loaded() && nutBal()) st.taint = false; }

  /* ── 每帧：转动 ── */
  function tick(dt) {
    if (st.hold) { st.w = 0; st.still = 0; pose(); drawWin(); ui(); return; }
    var n = Math.max(1, Math.ceil(dt / 0.002)), sdt = dt / n, I = inertia(), c = 2 * 0.9 * Math.sqrt(stiff() * I);
    for (var i = 0; i < n; i++) {
      var a = (torque(st.th) - c * rad(st.w)) / I;   // rad/s²
      st.w += a * 180 / Math.PI * sdt; st.th += st.w * sdt;
      if (st.th > LIM) { st.th = LIM; if (st.w > 0) st.w = 0; } if (st.th < -LIM) { st.th = -LIM; if (st.w < 0) st.w = 0; }
    }
    if (Math.abs(st.w) < 0.3) st.still += dt; else st.still = 0;
    unloadCheck();
    pose(); drawWin(); ui();
  }
  function settle() { for (var i = 0; i < 300; i++) tick0(0.02); }
  function tick0(dt) { var n = 10, sdt = dt / n, I = inertia(), c = 2 * 0.9 * Math.sqrt(stiff() * I); for (var i = 0; i < n; i++) { var a = (torque(st.th) - c * rad(st.w)) / I; st.w += a * 180 / Math.PI * sdt; st.th += st.w * sdt; if (st.th > LIM) { st.th = LIM; st.w = Math.min(0, st.w); } if (st.th < -LIM) { st.th = -LIM; st.w = Math.max(0, st.w); } } }
  function pose() {
    var t = rad(st.th);
    beam.rotation.z = -t;
    nutL.position.set(-36 + st.nut, 0, 0); nutR.position.set(36 + st.nut, 0, 0);
    beam.updateMatrixWorld(true);
    ['L', 'R'].forEach(function (s) {
      var g = stacks[s], u = g.userData, side = s === 'L' ? st.L : st.R, n = s === 'R' && st.mode === 'scale' ? 0 : side.n;
      g.visible = n > 0;
      var hx = st.dragX && st.dragX.side === s ? st.dragX.x : side.hole * HOLE, hp = beam.localToWorld(new T3.Vector3((s === 'L' ? -1 : 1) * hx, 0, 0));
      g.position.set(hp.x, hp.y, 0.5);
      u.loop.position.set(0, -0.3, 0); u.thr.scale.y = 2.4; u.thr.position.set(0, -1.7, 0);
      u.ws.forEach(function (w, i) { w.visible = i < n; w.position.set(0, -2.9 - i * 2.9, 0); });
      u.hit.scale.y = 3 + n * 2.9; u.hit.position.y = -(3 + n * 2.9) / 2;
    });
    var used = st.L.n + (st.mode === 'hook' ? st.R.n : 0);
    tray.userData.ws.forEach(function (w, i) { w.visible = i < NTOT - used; });
    // 测力计
    scale.visible = st.mode === 'scale';
    var F1 = 0;
    if (st.mode === 'scale') {
      var R = ringPos(), P = hookPt(st.th), dir = new T3.Vector3(P.x - R.x, P.y - R.y, 0).normalize();
      F1 = scaleF(st.th);
      scale.position.set(R.x, PY + R.y, 1.4); scale.quaternion.setFromUnitVectors(new T3.Vector3(0, -1, 0), dir); scale.userData.set(F1);
    }
    // 力臂：力的作用线（虚线）+ 支点到作用线的垂线段（橙色）
    var O = new T3.Vector3(0, PY, 0.9), showL = st.L.n > 0, showR = st.mode === 'hook' ? st.R.n > 0 : true;
    function vert(side) { var hp = beam.localToWorld(new T3.Vector3(side * (side < 0 ? st.L.hole : st.R.hole) * HOLE, 0, 0.9)); return hp; }
    if (showL) { var a = vert(-1); armG.lineL.userData.set(new T3.Vector3(a.x, a.y + 4, 0.9), new T3.Vector3(a.x, a.y - 14, 0.9), 0.14); armG.L.userData.set(O, new T3.Vector3(a.x, PY, 0.9), 0.32); }
    if (st.mode === 'hook') { if (showR) { var b = vert(1); armG.lineR.userData.set(new T3.Vector3(b.x, b.y + 4, 0.9), new T3.Vector3(b.x, b.y - 14, 0.9), 0.14); armG.R.userData.set(O, new T3.Vector3(b.x, PY, 0.9), 0.32); } }
    else {
      var Rr = ringPos(), Pp = hookPt(st.th), ux = Pp.x - Rr.x, uy = Pp.y - Rr.y, ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
      var tFoot = -(Pp.x * ux + Pp.y * uy), foot = new T3.Vector3(Pp.x + ux * tFoot, PY + Pp.y + uy * tFoot, 1.6);
      var e0 = Math.min(tFoot, 0) - 3, e1 = Math.max(tFoot, 0) + 3;
      armG.lineR.userData.set(new T3.Vector3(Pp.x + ux * e0 - ux * 22, PY + Pp.y + uy * e0 - uy * 22, 1.6), new T3.Vector3(Pp.x + ux * e1, PY + Pp.y + uy * e1, 1.6), 0.14);
      armG.R.userData.set(new T3.Vector3(0, PY, 1.6), foot, 0.32);
      st._foot = foot;
    }
    var on = st.arm;
    armG.L.visible = armG.L.visible && on && showL; armG.lineL.visible = armG.lineL.visible && on && showL;
    armG.R.visible = armG.R.visible && on && showR; armG.lineR.visible = armG.lineR.visible && on && showR;
    // 力臂标注：水平平衡时从杠杆刻度直接读；斜拉时要打开「显示」行的「力臂」开关
    var t1 = V.tag('l1'), t2 = V.tag('l2');
    t2.innerHTML = '<span class="m">l</span>₂ = ' + f2(l2()) + ' m'; V.placeTag('l2', new T3.Vector3(-st.L.hole * HOLE / 2, PY + 4.6, 0)); t2.style.display = showL && level() ? t2.style.display : 'none';
    t1.innerHTML = '<span class="m">l</span>₁ = ' + fL(l1()) + ' m';
    if (oblique()) { V.placeTag('l1', st._foot.clone().multiplyScalar(0.5).setY((PY + st._foot.y) / 2 + 3.5)); if (!on) t1.style.display = 'none'; }
    else { V.placeTag('l1', new T3.Vector3((st.mode === 'scale' ? st.S.hole : st.R.hole) * HOLE / 2, PY + 4.6, 0)); if (!(showR && level())) t1.style.display = 'none'; }
  }

  /* ── 观察窗：上格 = 杠杆中部与水平参考线；下格（用测力计时）= 测力计刻度 ── */
  function drawWin() {
    var sc = st.mode === 'scale', F = sc ? scaleF(st.th) : 0, key = [Math.round(st.th * 20), sc, Math.round(F * 200)].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:330px"><h3><span>杠杆是否水平</span><small>指针刻度放大</small></h3><svg class="w1" viewBox="0 0 330 118"></svg><div class="w2"><h3 style="margin-top:6px"><span>测力计放大</span><small>分度值 0.1 N</small></h3><svg viewBox="0 0 330 160"></svg></div><p class="cap"></p></div>');
    var cx = 165, s = '', px = 6.5;
    s += '<line x1="20" y1="26" x2="310" y2="26" stroke="#8A99AD" stroke-width="2" stroke-dasharray="7 6"/>';
    s += '<g transform="rotate(' + st.th + ' ' + cx + ' 26)"><rect x="45" y="19" width="240" height="14" rx="6" fill="#D7DEE6" stroke="#8A99AD"/>';
    for (var k = -3; k <= 3; k++) if (k) s += '<circle cx="' + (cx + k * 36) + '" cy="26" r="3.5" fill="#fff" stroke="#8A99AD"/>';
    s += '</g><circle cx="' + cx + '" cy="26" r="5" fill="#56677D"/><text x="22" y="54" font-size="18" fill="#56677D">左</text><text x="308" y="54" text-anchor="end" font-size="18" fill="#56677D">右</text>';
    s += '<rect x="22" y="62" width="286" height="50" rx="6" fill="#FBFCFD" stroke="#C3CEDC"/>';
    for (var d = -20; d <= 20; d++) { var x = cx - d * px, l = d % 10 === 0 ? 20 : d % 5 === 0 ? 14 : 8; s += '<line x1="' + x + '" y1="62" x2="' + x + '" y2="' + (62 + l) + '" stroke="' + (d ? '#1E3A5F' : '#1B7A50') + '" stroke-width="' + (d % 5 ? 1.3 : 2.6) + '"/>'; if (d % 10 === 0) s += '<text x="' + x + '" y="105" text-anchor="middle" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + Math.abs(d) + '°</text>'; }
    var nx = cx - st.th * px; s += '<line x1="' + nx + '" y1="56" x2="' + nx + '" y2="92" stroke="#FE752D" stroke-width="3.5"/><path d="M' + (nx - 7) + ' 52 L' + (nx + 7) + ' 52 L' + nx + ' 60 Z" fill="#FE752D"/>';
    winEl.querySelector('.w1').innerHTML = s;
    var w2 = winEl.querySelector('.w2'); w2.style.display = sc ? '' : 'none';
    if (sc) {   // 测力计倒挂：示数向挂钩一侧（向上）增大
      var cy = 80, kk = 110, Y = function (v) { return cy - (v - F) * kk; }, o = '<rect x="105" y="2" width="120" height="156" rx="8" fill="#FBFCFD" stroke="#C3CEDC"/><rect x="159" y="2" width="12" height="156" fill="#DCE4EE"/>';
      for (var i = Math.floor((F - 0.8) * 10); i <= Math.ceil((F + 0.8) * 10); i++) {
        if (i < 0 || i > 50) continue; var y = Y(i / 10); if (y < 6 || y > 154) continue;
        var l2 = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 13;
        o += '<line x1="171" y1="' + y + '" x2="' + (171 + l2) + '" y2="' + y + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.6 : 2.8) + '"/><line x1="159" y1="' + y + '" x2="' + (159 - l2 * 0.5) + '" y2="' + y + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.3 : 2.2) + '"/>';
        if (i % 5 === 0 && y > 12 && y < 150) o += '<text x="98" y="' + (y + 7) + '" text-anchor="end" font-size="' + (i % 10 ? 18 : 22) + '" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + (i / 10) + '</text>';
      }
      o += '<rect x="148" y="' + (cy - 2) + '" width="34" height="4" fill="#FE752D"/><path d="M138 ' + (cy - 9) + ' L138 ' + (cy + 9) + ' L150 ' + cy + ' Z" fill="#FE752D"/><text x="240" y="24" font-size="18" fill="#56677D">N</text>';
      w2.querySelector('svg').innerHTML = o;
    }
    winEl.querySelector('.cap').textContent = level() ? '水平' : (st.th < 0 ? '左端下沉' : '右端下沉');
  }

  /* ── 检查与记录 ── */
  function changed() { st.justRec = null; st.ver = (st.ver || 0) + 1; last = ''; }
  function recKey() { return [st.L.hole, st.L.n, st.mode, st.mode === 'scale' ? st.S.hole + '@' + Math.round(st.S.ang) : st.R.hole + 'x' + st.R.n].join('|'); }
  function dup() { return st.recVer === st.ver; }   // 只拦“什么都没变又点一次”
  function rightOn() { return st.mode === 'scale' ? scaleF(st.th) > 0.05 : st.R.n > 0; }
  function valid() { return nutBal() && !st.taint && st.L.n > 0 && rightOn() && balanced() && (!oblique() || st.arm); }
  function ui() {
    var hint, tone = '', zeroOk = nutBal() && !st.taint, lv = balanced();
    var checks = [{ label: '空载调平', ok: zeroOk ? true : loaded() ? false : null }, { label: '水平平衡', ok: loaded() ? (lv ? true : level() ? null : false) : null }];
    if (st.taint) { hint = '挂上钩码后动了平衡螺母，这组数据作废。取下钩码，重新空载调平。'; tone = 'warn'; }
    else if (!loaded() && !nutBal()) hint = level() ? '再微调一点平衡螺母，让指针对准中线。' : '调节平衡螺母，让指针对准中线。';
    else if (!nutBal()) { hint = '还没空载调平就挂了钩码。先取下钩码，调平再挂。'; tone = 'warn'; }
    else if (!loaded()) hint = st.justRec != null ? '已记入第 ' + st.justRec + ' 次。' : '已调平。在左右两侧挂上钩码。';
    else if (!st.L.n || !rightOn()) hint = st.mode === 'scale' ? '向下拉测力计的拉环。' : '两侧都挂上钩码，再找平衡。';
    else if (!level()) hint = st.mode === 'scale' ? '移动拉环，让指针对准中线。' : '改变钩码的个数或挂孔，让指针对准中线。';
    else if (!lv) hint = '等杠杆停稳。';
    else if (oblique() && !st.arm) hint = '斜拉时力臂不在杠杆上。把「显示」行的「力臂」打开，从辅助线读 l₁。';
    else if (st.justRec != null) { hint = '已记入第 ' + st.justRec + ' 次。换一种挂法再测。'; tone = 'good'; }
    else if (dup()) hint = '这种挂法已经记过了。换一种挂法。';
    else { hint = '读出两侧的力和力臂，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: false });
    var ok = valid() && !dup(), F1 = readF1();
    var key = [ok, f1(F1), F2(), st.L.hole, st.R.hole, st.R.n, st.mode, st.S.hole, Math.round(st.S.ang), Math.round(st.S.rho * 10), st.nut, st.taint, st.arm, st.rows.length, st.justRec, level(), loaded() || nutBal()].join('|');
    if (key === last) return; last = key;
    K.setReading('F1', rightOn() ? f1(F1) : '0.0'); K.setReading('F2', f1(F2()));
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次：F₁ = ' + f1(F1) + ' N，l₁ = ' + fL(l1()) + ' m' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    syncCtrls();
  }

  /* ── 控件 ── */
  /* 面板（器材调节面板规范）：螺母 → 右侧用（钩码/测力计）→ 左右挂孔 → 测力计的拉向角、拉环（两根滑杆）→ 钩码个数（左右两侧一行）→ 显示力臂
     挂钩码以后才用到的行带 data-hk，空载调平前隐藏；只在用测力计时出现的行带 data-sc；右侧钩码个数只在右侧挂钩码时出现（data-hook） */
  function G(label, inner, at) { return K.grp(label, inner).replace('<div class="grp"', '<div class="grp"' + (at || '')); }
  function holeSeg(side) { var a = []; for (var k = 1; k <= 6; k++) a.push([side + k, k]); return K.seg('h', a); }
  function stepper(side, at) {   // 一侧的钩码个数：− 个数 +
    var nm = side === 'L' ? '左' : '右';
    return '<span style="flex:0 0 calc(50% - 7px);min-width:0;display:flex;align-items:center;gap:6px"' + (at || '') + '><span style="flex:none;font-size:16px;color:#56677D">' + nm + '侧</span>' +
      '<button data-m="' + side + '" title="' + nm + '侧取下一个钩码"><i>−</i></button>' +
      '<span style="flex:none;min-width:44px;text-align:center;font-size:16px;color:#56677D"><b id="n-' + side + '" style="font:600 22px/1 var(--num);color:var(--ink)"></b> 个</span>' +
      '<button data-p="' + side + '" title="' + nm + '侧挂上一个钩码"><i>+</i></button></span>';
  }
  function ctrls() {
    K.ctrl.innerHTML =
      G('螺母', '<div class="row"><input class="rng" type="range" id="s-nut" min="-2.5" max="2.5" step="0.05" style="flex:1;min-width:0"><span class="vl" id="v-nut" style="font-size:18px;min-width:112px;text-align:right"></span></div>') +
      G('右侧用', K.seg('mode', [['hook', '钩码'], ['scale', '测力计']]), ' data-hk') +
      G('左挂孔', holeSeg('L'), ' data-hk') +
      G('右挂孔', holeSeg('R'), ' data-hk') +
      G('测力计', '<div class="row" style="gap:6px"><span class="nm" style="width:auto;font-size:16px">方向</span><input class="rng" type="range" id="s-ang" min="-60" max="60" step="1" style="flex:1;min-width:0"><span class="vl" style="font-size:18px;min-width:40px"><span id="v-ang"></span>°</span>' +
        '<span class="nm" style="width:auto;font-size:16px;margin-left:8px">拉环</span><input class="rng" type="range" id="s-rho" min="' + RHO_MIN + '" max="' + RHO_MAX + '" step="0.05" style="flex:1;min-width:0"></div>', ' data-hk data-sc') +
      G('钩码', '<div class="acts" style="flex-wrap:nowrap;gap:14px">' + stepper('L') + stepper('R', ' data-hook') + '</div>', ' data-hk') +
      G('显示', '<div class="acts">' + K.sw('arm', '力臂', '显示', '隐藏', st.arm) + '</div>', ' data-hk');
    var sn = document.getElementById('s-nut'); K.rng(sn);
    sn.addEventListener('input', function () { setNut(+sn.value); }); sn.addEventListener('change', snapNut);
    document.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-h'), s = v[0], k = +v.slice(1); if (s === 'R' && st.mode === 'scale') st.S.hole = k; else { st[s].hole = k; st.sel = s; } moved(); }; });
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-m'); st.sel = s; setN(s, st[s].n - 1); }; });
    document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-p'); st.sel = s; setN(s, st[s].n + 1); }; });
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-mode')); }; });
    var sa = document.getElementById('s-ang'), sr = document.getElementById('s-rho'); K.rng(sa); K.rng(sr);
    sa.addEventListener('input', function () { st.S.ang = +sa.value; moved(); }); sa.addEventListener('change', snapAng);
    sr.addEventListener('input', function () { st.S.rho = +sr.value; moved(); }); sr.addEventListener('change', snapRing);
    document.getElementById('arm').onclick = function () { st.arm = !st.arm; last = ''; };
  }
  function syncCtrls() {
    var sn = document.getElementById('s-nut'), sa = document.getElementById('s-ang'), sr = document.getElementById('s-rho'), sc = st.mode === 'scale', hk = loaded() || nutBal();
    if (document.activeElement !== sn) sn.value = st.nut; if (document.activeElement !== sa) sa.value = st.S.ang; if (document.activeElement !== sr) sr.value = st.S.rho;
    [sn, sa, sr].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-nut').textContent = nutBal() ? '已调平' : st.nut === 0 ? '居中' : (st.nut < 0 ? '偏左 ' : '偏右 ') + Math.abs(st.nut).toFixed(2) + ' cm';
    document.querySelectorAll('[data-hk]').forEach(function (g) { g.style.display = hk && !(g.hasAttribute('data-sc') && !sc) ? '' : 'none'; });
    document.querySelectorAll('[data-hook]').forEach(function (g) { g.style.display = sc ? 'none' : 'flex'; });
    ['L', 'R'].forEach(function (s) {
      document.getElementById('n-' + s).textContent = st[s].n;
      var other = s === 'L' ? st.R.n : st.L.n;
      document.querySelector('[data-m="' + s + '"]').disabled = st[s].n <= 0;
      document.querySelector('[data-p="' + s + '"]').disabled = st[s].n >= Math.min(NMAX, NTOT - other);
    });
    document.querySelectorAll('[data-h]').forEach(function (b) { var v = b.getAttribute('data-h'), s = v[0], k = +v.slice(1); b.classList.toggle('on', s === 'R' && sc ? st.S.hole === k : st[s].hole === k); });
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === st.mode); });
    document.getElementById('v-ang').textContent = Math.round(st.S.ang);
    K.setSw('arm', st.arm);
  }

  function preset(i) {
    st.mode = 'hook'; st.taint = false; st.arm = false; st.w = 0;
    st.S = { hole: 3, ang: 0, rho: SC_L0 + 2 };
    if (i === 0) { st.nut = NUT0; st.L = { hole: 3, n: 0 }; st.R = { hole: 2, n: 0 }; }
    else {
      st.nut = NB; st.L = { hole: 3, n: 2 };
      st.R = [null, { hole: 2, n: 0 }, { hole: 6, n: 1 }, { hole: 2, n: 0 }, { hole: 3, n: 1 }, { hole: 3, n: 0 }][i];
      if (i === 5) { st.mode = 'scale'; st.S.rho = eqRho(); }
    }
    st.th = 0; settle(); st.w = 0; st.still = 1; changed();
    var k = recKey(); if (st.rows.some(function (r) { return r.key === k; })) st.recVer = st.ver;   // 本问起始挂法和已记过的某一组相同：不改动就不能再记（改过再回来可以）
  }

  window.__exp = { st: st, V: function () { return V; }, beam: function () { return beam; }, nutR: function () { return nutR; }, stacks: function () { return stacks; }, scale: function () { return scale; }, torque: torque, scaleF: function () { return scaleF(st.th); }, eqRho: eqRho };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'F1', name: '动力 <span class="m">F</span>₁（右）', unit: 'N' }, { id: 'F2', name: '阻力 <span class="m">F</span>₂（左）', unit: 'N' }],
    calc: { teach: '显示计算' },
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖螺母调平；沿杠杆拖钩码换挂孔，点钩码取下一个，点钩码盒给刚操作的一侧加一个；用测力计时拖拉环；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    record: function () {
      if (!valid() || dup()) return;
      st.rows.push({ F1: readF1(), l1: Math.round(l1() * 1000) / 1000, F2: F2(), l2: l2(), sc: st.mode === 'scale', ang: Math.round(st.S.ang), key: recKey() });
      st.recVer = st.ver; st.justRec = st.rows.length; last = '';
    },
    clear: function () { st.rows = []; st.justRec = null; last = ''; },
    renderData: function (K) {
      var c = K.calcShown();
      function cc(v) { return '<td class="n ' + (c ? 'calc' : 'dim') + '">' + (c ? (Math.round(v * 1000) / 1000).toFixed(3) : '?') + '</td>'; }
      return '<div class="dvh"><h2>记录表</h2></div><div style="max-height:700px;overflow:auto">' +
        '<table class="rec"><thead><tr><th style="width:15%">次数</th><th>动力 <span class="m">F</span>₁/N</th><th>动力臂 <span class="m">l</span>₁/m</th><th>阻力 <span class="m">F</span>₂/N</th><th>阻力臂 <span class="m">l</span>₂/m</th><th><span class="m">F</span>₁<span class="m">l</span>₁/(N·m)</th><th><span class="m">F</span>₂<span class="m">l</span>₂/(N·m)</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + (r.sc ? '<small style="color:#56677D">（' + (r.ang ? '斜拉约 ' + Math.abs(r.ang) + '°' : '竖直拉') + '）</small>' : '') + '</td><td class="n">' + f1(r.F1) + '</td><td class="n">' + fL(r.l1) + '</td><td class="n">' + f1(r.F2) + '</td><td class="n">' + f2(r.l2) + '</td>' + cc(r.F1 * r.l1) + cc(r.F2 * r.l2) + '</tr>'; }).join('')
          : '<tr><td colspan="7" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table></div><p class="tip">右侧的力记为动力 <span class="m">F</span>₁，左侧的力记为阻力 <span class="m">F</span>₂；至少记录 6 次。' + (c ? '' : '先自己算出 <span class="m">F</span>₁<span class="m">l</span>₁ 和 <span class="m">F</span>₂<span class="m">l</span>₂，再点右侧「显示计算」。') + '</p>';
    }
  });
})();
