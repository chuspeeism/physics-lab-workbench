/* 09 测量固体和液体的密度（课本图 6.3-2、6.3-3）。
   装置：已调好的托盘天平（标尺 0～5 g，分度值 0.2 g）和砝码盒；100 mL 量筒（分度值 1 mL）；装盐水的烧杯；细线系着的小石块；装清水的烧杯。
   参数：盐水 1.10 g/cm³；空烧杯 52.4 g，初始盐水 60.0 mL（66.0 g），总质量 118.4 g；倒空时烧杯内壁残留 2 mL。
     小石块 26.0 g、10 cm³（2.6 g/cm³），出水后沾水 0.6 g（量筒里的水相应少 0.6 mL）。俯视读数偏大 2 mL，仰视偏小 2 mL。
   倾倒：烧杯拿到量筒旁，绕杯嘴转动；按倾角算杯里还能留住多少液体（倾斜圆柱体积积分），多出的部分流进量筒；液体用水平剪裁面画出。
   记录：多个中间量逐步进入同一行：盐水 m₁ → V → m₂（或先称空杯的“全部倒出”做法）；石块 m → V₁ → V₂。密度在数据页「显示计算」。
   操作：拖烧杯、石块、砝码到托盘，点一下放入 / 取回；烧杯拖到量筒旁后转动倾倒；石块拖到量筒上方后上下拖放入；沿横梁拖游码。 */
(function () {
  var DA = 0.8, BX = -12, PIV = 13.2, PX = 12.5, PAN_Y = 19.6, PAN_R = 6.2, RX0 = -6, RX1 = 6, BOX = { x: -36, z: 9 };
  var CX = 13, CZ = 0, CYL_R = 1.45, CYL_A = Math.PI * 1.45 * 1.45, CYL_B = 1.3, CYL_TOP = 18.6, RHO = 1.1, CUP_M = 52.4, WCUP_M = 48.6;
  var BR = 2.6, BH = 5.75, BB = 0.25;
  var ST = { a: 1.2, b: 1.6, c: 10 / (4 / 3 * Math.PI * 1.2 * 1.6) }, STONE_M = 26.0, WET = 0.6;
  var WTS = [{ id: 'w100', m: 100, r: 1.3, h: 3.6 }, { id: 'w50', m: 50, r: 1.05, h: 2.9 }, { id: 'w20a', m: 20, r: 0.8, h: 2.2 }, { id: 'w20b', m: 20, r: 0.8, h: 2.2 }, { id: 'w10', m: 10, r: 0.66, h: 1.8 }, { id: 'w5', m: 5, r: 0.52, h: 1.45 }];
  var WX = { w100: -4.9, w50: -2.2, w20a: 0.2, w20b: 2.2, w10: 4.0, w5: 5.5 }, SLOT = [0, 300, 60, 180, 240, 120];
  var OBJ = {
    cup: { name: '烧杯', r: 2.95, h: 6.1, home: [21, 7] },
    wcup: { name: '水杯', r: 2.95, h: 6.1, home: [21, 7] },
    stone: { name: '小石块', r: 1.7, h: 2.5, home: [17, 13] }
  };
  var st = {
    mode: 'brine', rider: 0, loc: {}, s: 0, v: 0, drag: null,
    cupV: 60, cupPoured: false, bottle: 0, wcupV: 40, cylV: 0, tilt: 30, flow: 0, calm: 9, depth: 0, stoneWet: false, sight: 'flat',
    rows1: [], rows2: [], cur1: -1, cur2: -1
  };
  var K, V, T3, beam, rider, pointer, pans = {}, items = {}, tweezers, cyl, cylLiq, cylMen, stream, bottle, winEl, winKey = '', last = '', rc, clipCup, clipW, liqCup, liqW, lastSub = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function isW(id) { return WX.hasOwnProperty(id); }
  function wDef(id) { return WTS.filter(function (w) { return w.id === id; })[0]; }
  function stoneM() { return STONE_M + (st.stoneWet && sub() < 0.01 ? WET : 0); }
  function mOf(id) { return isW(id) ? wDef(id).m : id === 'cup' ? CUP_M + RHO * st.cupV : id === 'wcup' ? WCUP_M + st.wcupV : stoneM(); }
  function on(pan) { return Object.keys(st.loc).filter(function (k) { return st.loc[k] === pan; }); }
  function load(pan) { return on(pan).reduce(function (s, k) { return s + mOf(k); }, 0); }
  function D() { return load('R') + st.rider - load('L'); }
  function seq() { var x = D() / 0.2; return 10.5 * Math.tanh(x / 10.5); }
  function balanced() { return Math.abs(D()) < 0.105; }
  function objOn(pan) { return on(pan).filter(function (k) { return !isW(k); }); }
  function wOn(pan) { return on(pan).filter(isW); }
  function wSum() { return wOn('R').concat(wOn('L')).reduce(function (s, k) { return s + mOf(k); }, 0); }
  function loaded() { return on('L').length + on('R').length > 0; }
  function weighing() { var o = objOn('L'); return o.length === 1 && !objOn('R').length && !wOn('L').length ? o[0] : null; }
  function balRead() { return Math.round((wSum() + st.rider) * 10) / 10; }
  function pourer() { return st.loc.cup === 'P' ? 'cup' : st.loc.wcup === 'P' ? 'wcup' : null; }
  function liqName() { return st.mode === 'brine' ? '盐水' : '水'; }

  /* ── 石块浸入：椭球（竖直半轴 b）浸没部分的体积，液面按体积守恒迭代 ── */
  function stoneBottom() { return CYL_TOP + 1.0 - st.depth; }
  function capV(h) { h = clamp(h, 0, 2 * ST.b); return Math.PI * ST.a * ST.c * h * h * (3 * ST.b - h) / (3 * ST.b * ST.b); }
  function level() {   // 返回 {y: 液面高度 cm, sub: 浸没体积 mL}
    var Vw = st.cylV, sb = st.loc.stone === 'C' ? stoneBottom() : 1e9, y = CYL_B + Vw / CYL_A, s = 0;
    for (var i = 0; i < 30; i++) { s = capV(y - sb); y = CYL_B + (Vw + s) / CYL_A; }
    return { y: y, sub: s };
  }
  function sub() { return st.loc.stone === 'C' ? level().sub : 0; }
  function trueV() { return st.cylV + sub(); }
  function sightBias() { return st.sight === 'down' ? 2 : st.sight === 'up' ? -2 : 0; }
  function cylRead() { return Math.round(trueV() + sightBias()); }
  function cylStill() { return st.calm > 1.0 && !st.flow; }
  function fullSub() { return sub() > 10 - 0.05; }

  /* ── 烧杯倾倒：杯在局部坐标里绕 z 转 θ；世界“向上”在局部为 u=(sinθ, cosθ, 0)，液体占 u·p ≤ c 的部分 ── */
  var GRID = (function () { var g = [], n = 18; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { var x = (-1 + (i + 0.5) * 2 / n) * BR, z = (-1 + (j + 0.5) * 2 / n) * BR; if (x * x + z * z <= BR * BR) g.push(x); } return { xs: g, dA: Math.pow(2 * BR / n, 2) }; })();
  function volBelow(c, th) {
    var s = Math.sin(th), co = Math.cos(th), v = 0;
    for (var i = 0; i < GRID.xs.length; i++) {
      var x = GRID.xs[i], lo = 0, hi = BH;
      if (Math.abs(co) < 1e-6) { if (x * s > c) hi = lo; }
      else if (co > 0) hi = Math.min(BH, (c - x * s) / co);
      else lo = Math.max(0, (c - x * s) / co);
      if (hi > lo) v += hi - lo;
    }
    return v * GRID.dA * (Math.PI * BR * BR) / (GRID.xs.length * GRID.dA);   // 网格面积按真实圆面积校正
  }
  function cOf(V0, th) { var a = -20, b = 20; for (var k = 0; k < 40; k++) { var m = (a + b) / 2; if (volBelow(m, th) < V0) a = m; else b = m; } return (a + b) / 2; }
  function vmax(th) { return volBelow(-BR * Math.sin(th) + BH * Math.cos(th), th); }

  /* ── 贴图与形状 ── */
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function woodTex(base, dark) {
    return canvasTex(512, 256, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 30; i++) { g.strokeStyle = dark; g.globalAlpha = 0.06 + Math.random() * 0.1; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(170, y + (Math.random() - .5) * 18, 340, y + (Math.random() - .5) * 18, w, y + (Math.random() - .5) * 8); g.stroke(); }
    });
  }
  function roundRect(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function slab(w, d, h, r, mat, bevel) {
    var b = bevel == null ? Math.min(0.25, h / 4) : bevel;
    var geo = new T3.ExtrudeGeometry(roundRect(w - 2 * b, d - 2 * b, Math.max(0.05, r - b)), { depth: h - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0);
    var m = new T3.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function std(c, r, m) { return new T3.MeshStandardMaterial({ color: c, roughness: r == null ? .5 : r, metalness: m || 0 }); }
  function scaleTex() {
    return canvasTex(2048, 256, function (g, w, h) {
      g.fillStyle = '#F7F8FA'; g.fillRect(0, 0, w, h);
      var px = w / 15, x0 = (RX0 + 7.5) * px, k = (RX1 - RX0) / 5 * px;
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.font = 'bold 84px Bahnschrift, Arial';
      for (var i = 0; i <= 25; i++) { var x = x0 + i * 0.2 * k, l = i % 5 === 0 ? 120 : 70; g.lineWidth = i % 5 === 0 ? 7 : 4.5; g.beginPath(); g.moveTo(x, h); g.lineTo(x, h - l); g.stroke(); if (i % 5 === 0) g.fillText(String(i / 5), x, 96); }
    });
  }
  function dialTex() {   // 分度盘（横梁上方）：以横梁刀口为圆心、半径 9 cm 的弧形刻度，每小格对应横梁转 0.8°
    return canvasTex(1024, 600, function (g, w, h) {
      var k = w / 4.8, X = function (x) { return (x + 2.4) * k; }, Y = function (y) { return (10.2 - y) * k; };
      g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, w, h);
      for (var i = -10; i <= 10; i++) {
        var a = i * DA * Math.PI / 180, l = i === 0 ? 1.0 : i % 5 === 0 ? 0.75 : 0.5, R0 = 9.0;
        g.lineWidth = i === 0 ? 12 : i % 5 === 0 ? 8 : 5.5; g.strokeStyle = i === 0 ? '#C1361A' : '#1E3A5F';
        g.beginPath(); g.moveTo(X(Math.sin(a) * R0), Y(Math.cos(a) * R0)); g.lineTo(X(Math.sin(a) * (R0 - l)), Y(Math.cos(a) * (R0 - l))); g.stroke();
      }
    });
  }
  function weightTex(m) {
    return canvasTex(512, 128, function (g, w, h) {
      g.fillStyle = '#C9D1DA'; g.fillRect(0, 0, w, h);
      var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#33404F'; g.font = 'bold 54px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m + 'g', w * 0.25, h / 2); g.fillText(m + 'g', w * 0.75, h / 2);
    });
  }
  function cylTex() {   // 量筒刻度：0～100 mL，每 1 mL 一小格，每 10 mL 标数（透明底）
    var H = CYL_TOP - CYL_B;
    return canvasTex(512, 4096, function (g, w, h) {
      var px = h / H;
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 88px Bahnschrift, Arial'; g.textBaseline = 'middle';
      for (var mL = 0; mL <= 100; mL++) {
        var y = h - (mL / CYL_A) * px, l = mL % 10 === 0 ? 200 : mL % 5 === 0 ? 140 : 80;
        g.lineWidth = mL % 10 === 0 ? 9 : 6; g.beginPath(); g.moveTo(40, y); g.lineTo(40 + l, y); g.stroke();
        if (mL % 10 === 0 && mL > 0) g.fillText(String(mL), 260, y);
      }
      g.font = '70px Bahnschrift, Arial'; g.fillText('mL', 260, h - (106 / CYL_A) * px);
    });
  }

  /* ── 器材 ── */
  function makeBalance(S) {
    var root = new T3.Group(); root.position.x = BX; S.add(root);
    var paint = std(0x5E6E86, .5, .15), alu = std(0xDCE1E8, .35, .3), steel = std(0xC8D0DA, .3, .35), dark = std(0x2B3442, .4, .2);
    root.add(slab(38, 12, 2.6, 2.2, paint));
    [[-17, -4.6], [17, -4.6], [-17, 4.6], [17, 4.6]].forEach(function (p) { var f = new T3.Mesh(new T3.CylinderGeometry(0.7, 0.8, 0.5, 16), dark); f.position.set(p[0], -0.05, p[1]); root.add(f); });
    var plate = slab(30, 8, 0.25, 1.6, std(0x63738B, .4, .25), 0.08); plate.position.y = 2.6; root.add(plate);
    var lv = new T3.Mesh(new T3.CylinderGeometry(0.9, 0.95, 0.35, 28), steel); lv.position.set(-15.6, 2.75, 3.6); root.add(lv);
    var lg = new T3.Mesh(new T3.SphereGeometry(0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T3.MeshPhongMaterial({ color: 0xCFE8C8, transparent: true, opacity: .7, shininess: 120 })); lg.scale.y = 0.35; lg.position.set(-15.6, 2.9, 3.6); root.add(lg);
    var col = new T3.Mesh(new T3.CylinderGeometry(1.25, 1.7, 9.8, 24), paint); col.position.set(0, 7.5, -0.2); col.castShadow = true; root.add(col);
    var head = slab(3.2, 2.2, 1.2, 0.5, paint); head.position.set(0, 11.6, -0.2); root.add(head);
    // 分度盘装在横梁上方：立柱后面伸出一根细杆托着刻度板；指针固定在横梁中间、竖直向上，随横梁一起转
    var post = new T3.Mesh(new T3.BoxGeometry(0.5, 8.6, 0.4), paint); post.position.set(0, 16.5, -1.45); post.castShadow = true; root.add(post);
    var dial = new T3.Mesh(new T3.BoxGeometry(4.8, 2.8, 0.15), [paint, paint, paint, paint, new T3.MeshStandardMaterial({ map: dialTex(), roughness: .6 }), paint]); dial.position.set(0, PIV + 8.8, -1.25); root.add(dial);
    beam = new T3.Group(); beam.position.set(0, PIV, 0); root.add(beam);
    var bm = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(31, 1.5, 0.5), { depth: 0.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), alu); bm.geometry.translate(0, 0, -0.35); bm.castShadow = true; beam.add(bm);
    var strip = new T3.Mesh(new T3.PlaneGeometry(15, 1.15), new T3.MeshStandardMaterial({ map: scaleTex(), roughness: .55 })); strip.position.set(0, 0, 0.44); beam.add(strip);
    rider = new T3.Group(); beam.add(rider);
    [[0.35, 0, 0.53, 0.7, 1.9, 0.18], [0.35, 0, -0.53, 0.7, 1.9, 0.18], [0.35, 0.86, 0, 0.7, 0.18, 1.24]].forEach(function (b) { var m = new T3.Mesh(new T3.BoxGeometry(b[3], b[4], b[5]), steel); m.position.set(b[0], b[1], b[2]); rider.add(m); });
    var win = new T3.Mesh(new T3.PlaneGeometry(0.42, 1.0), new T3.MeshBasicMaterial({ color: 0xF7F8FA })); win.position.set(0.35, -0.05, 0.625); rider.add(win);
    var edge = new T3.Mesh(new T3.BoxGeometry(0.07, 1.9, 0.05), new T3.MeshBasicMaterial({ color: 0xFE752D })); edge.position.set(0.035, 0, 0.64); rider.add(edge);
    var rHit = new T3.Mesh(new T3.BoxGeometry(2.2, 3, 2.4), new T3.MeshBasicMaterial({ visible: false })); rHit.position.set(0.35, 0, 0); rider.add(rHit); rider.userData.hit = rHit;
    [-1, 1].forEach(function (sd) {   // 平衡螺母（本实验天平已调好，不再拧）
      var rod = new T3.Mesh(new T3.CylinderGeometry(0.17, 0.17, 3.3, 10), steel); rod.rotation.z = Math.PI / 2; rod.position.set(sd * 17.1, 0, 0); beam.add(rod);
      var nb = new T3.Mesh(new T3.CylinderGeometry(0.62, 0.62, 0.9, 6), std(0xBCC6D2, .3, .4)); nb.rotation.z = Math.PI / 2; nb.position.set(sd * 17.05, 0, 0); beam.add(nb);
    });
    ['L', 'R'].forEach(function (k) {
      var g = new T3.Group(); root.add(g);
      var stem = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.32, 5.2, 14), steel); stem.position.y = PIV + 3.3; g.add(stem);
      for (var a = 0; a < 3; a++) { var arm = new T3.Mesh(new T3.BoxGeometry(4.6, 0.22, 0.4), steel); arm.position.y = PAN_Y - 0.55; arm.rotation.y = a * Math.PI * 2 / 3; g.add(arm); }
      var dish = new T3.Mesh(new T3.LatheGeometry([[0, 0], [PAN_R - 0.7, 0], [PAN_R - 0.2, 0.18], [PAN_R, 0.62], [PAN_R + 0.12, 0.7], [PAN_R - 0.05, 0.62], [PAN_R - 0.25, 0.26], [PAN_R - 0.75, 0.1], [0, 0.1]].map(function (p) { return new T3.Vector2(p[0], p[1] - 0.1); }), 48), std(0xE4E9EF, .3, .3));
      dish.position.y = PAN_Y; dish.castShadow = true; dish.receiveShadow = true; g.add(dish); pans[k] = g;
    });
    pointer = new T3.Group(); pointer.position.set(0, 0, -0.85); beam.add(pointer);
    var pin = new T3.Mesh(new T3.CylinderGeometry(0.05, 0.12, 8.8, 8), dark); pin.position.y = 4.4; pointer.add(pin);
    var ptip = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.05, 1.2, 8), new T3.MeshBasicMaterial({ color: 0xFE752D })); ptip.position.y = 9.4; pointer.add(ptip);
    var hub = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.32, 0.3, 16), dark); hub.rotation.x = Math.PI / 2; pointer.add(hub);
  }
  function makeBox(S) {
    var g = new T3.Group(); g.position.set(BOX.x, 0, BOX.z); S.add(g);
    var wood = new T3.MeshStandardMaterial({ map: woodTex('#B98F5E', '#6E4F2E'), roughness: .75 }), lining = std(0x4A6283, .95);
    var W = 14.6, Dp = 8, H = 3.2, t = 0.5;
    g.add(slab(W, Dp, 0.6, 0.6, wood, 0.12));
    [[0, -(Dp - t) / 2, W, t], [0, (Dp - t) / 2, W, t], [-(W - t) / 2, 0, t, Dp], [(W - t) / 2, 0, t, Dp]].forEach(function (w) { var m = new T3.Mesh(new T3.BoxGeometry(w[2], H, w[3]), wood); m.position.set(w[0], H / 2, w[1]); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    var foam = new T3.Mesh(new T3.BoxGeometry(W - 2 * t, 0.6, Dp - 2 * t), lining); foam.position.y = 0.9; foam.receiveShadow = true; g.add(foam);
    WTS.forEach(function (w) { var hole = new T3.Mesh(new T3.CircleGeometry(w.r + 0.15, 24), std(0x22374F, 1)); hole.rotation.x = -Math.PI / 2; hole.position.set(WX[w.id], 1.21, -0.4); g.add(hole); });
    var lid = new T3.Group(); lid.position.set(0, H, -Dp / 2); lid.rotation.x = -1.92; g.add(lid);
    var lp = new T3.Mesh(new T3.BoxGeometry(W, 0.5, Dp), wood); lp.position.set(0, 0.25, Dp / 2); lp.castShadow = true; lid.add(lp);
    var ll = new T3.Mesh(new T3.BoxGeometry(W - 1, 0.1, Dp - 1), lining); ll.position.set(0, -0.02, Dp / 2); lid.add(ll);
    tweezers = new T3.Group(); var tm = std(0xC9D1DA, .3, .4);
    [-1, 1].forEach(function (sd) { var arm = new T3.Mesh(new T3.BoxGeometry(0.16, 0.12, 9), tm); arm.position.set(sd * 0.22, 0, 0); arm.rotation.y = -sd * 0.03; tweezers.add(arm); });
    var end = new T3.Mesh(new T3.BoxGeometry(0.62, 0.14, 0.8), tm); end.position.z = -4.3; tweezers.add(end); S.add(tweezers);
  }
  function makeWeight(w) {
    var g = new T3.Group(), side = new T3.MeshStandardMaterial({ map: weightTex(w.m), roughness: .3, metalness: .3 }), cap = std(0xD5DCE4, .28, .35);
    var body = new T3.Mesh(new T3.CylinderGeometry(w.r, w.r, w.h * 0.72, 32), [side, cap, cap]); body.position.y = w.h * 0.36; body.castShadow = true; g.add(body);
    var bev = new T3.Mesh(new T3.CylinderGeometry(w.r * 0.86, w.r, w.h * 0.06, 32), cap); bev.position.y = w.h * 0.75; g.add(bev);
    var neck = new T3.Mesh(new T3.CylinderGeometry(w.r * 0.32, w.r * 0.36, w.h * 0.12, 20), cap); neck.position.y = w.h * 0.84; g.add(neck);
    var knob = new T3.Mesh(new T3.SphereGeometry(w.r * 0.5, 20, 14), cap); knob.scale.y = 0.62; knob.position.y = w.h * 0.92 + w.r * 0.1; knob.castShadow = true; g.add(knob);
    return g;
  }
  /* 烧杯：组原点 = 杯底外侧中心；液体是一段整杯高的圆柱，用世界水平剪裁面切出液面 */
  function makeBeaker(color, label) {
    var g = new T3.Group();
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .26, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var wall = new T3.Mesh(new T3.CylinderGeometry(BR + 0.12, BR + 0.08, BB + BH, 40, 1, true), glass); wall.position.y = (BB + BH) / 2; g.add(wall);
    var bt = new T3.Mesh(new T3.CylinderGeometry(BR + 0.08, BR + 0.08, BB, 40), glass); bt.position.y = BB / 2; g.add(bt);
    var lip = new T3.Mesh(new T3.TorusGeometry(BR + 0.12, 0.09, 8, 40), std(0xB9C8D8, .3)); lip.rotation.x = Math.PI / 2; lip.position.y = BB + BH; g.add(lip);
    var spout = new T3.Mesh(new T3.TorusGeometry(0.45, 0.09, 6, 16, Math.PI), std(0xB9C8D8, .3)); spout.position.set(-BR - 0.1, BB + BH, 0); spout.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(spout);
    for (var i = 1; i <= 4; i++) { var tk = new T3.Mesh(new T3.BoxGeometry(i % 2 ? 0.5 : 0.9, 0.05, 0.02), std(0x7C8DA3, .6)); tk.position.set(0.9, BB + i * 1.15, BR + 0.1); g.add(tk); }
    var plane = new T3.Plane(new T3.Vector3(0, -1, 0), 0);
    var liq = new T3.Mesh(new T3.CylinderGeometry(BR - 0.02, BR - 0.02, BH, 40), new T3.MeshPhongMaterial({ color: color, transparent: true, opacity: .6, shininess: 80, depthWrite: false, side: T3.DoubleSide, clippingPlanes: [plane] }));
    liq.position.y = BB + BH / 2; g.add(liq);
    var sh = new T3.Mesh(new T3.CylinderGeometry(BR, BR, 0.1, 30), new T3.ShadowMaterial({ opacity: 0 })); sh.castShadow = true; sh.position.y = 2.5; g.add(sh);
    g.userData.plane = plane; g.userData.liq = liq;
    return g;
  }
  function makeStone() {
    var g = new T3.Group();
    var geo = new T3.SphereGeometry(1, 28, 20), p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.07 * Math.sin(x * 3.1 + y * 1.7) + 0.05 * Math.sin(z * 4.3 - x * 2.2) + 0.04 * Math.cos(y * 5.1 + z);
      p.setXYZ(i, x * ST.a * n, y * ST.b * n, z * ST.c * n);
    }
    geo.computeVertexNormals();
    var rock = new T3.Group(); rock.position.y = ST.b; g.add(rock);   // 组原点在石块最低点
    var m = new T3.Mesh(geo, std(0x8C8274, .92)); m.castShadow = true; rock.add(m); g.userData.body = m; g.userData.rock = rock;
    var knot = new T3.Mesh(new T3.TorusGeometry(0.35, 0.06, 6, 16), std(0xE9E4DA, .9)); knot.rotation.x = Math.PI / 2; knot.position.y = ST.b * 0.98; rock.add(knot);
    return g;
  }
  function makeCylinder(S) {
    cyl = new T3.Group(); cyl.position.set(CX, 0, CZ); S.add(cyl);
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .24, shininess: 120, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var foot = new T3.Mesh(new T3.CylinderGeometry(3.0, 3.2, 0.7, 6), new T3.MeshPhongMaterial({ color: 0xDCE9F3, transparent: true, opacity: .55, shininess: 90 })); foot.position.y = 0.35; foot.castShadow = true; cyl.add(foot);
    var bot = new T3.Mesh(new T3.CylinderGeometry(CYL_R + 0.25, CYL_R + 0.3, CYL_B - 0.7, 24), glass); bot.position.y = 0.7 + (CYL_B - 0.7) / 2; cyl.add(bot);
    var wall = new T3.Mesh(new T3.CylinderGeometry(CYL_R + 0.22, CYL_R + 0.22, CYL_TOP - 0.7, 40, 1, true), glass); wall.position.y = 0.7 + (CYL_TOP - 0.7) / 2; cyl.add(wall);
    var lip = new T3.Mesh(new T3.TorusGeometry(CYL_R + 0.24, 0.1, 8, 40), std(0xC8D6E4, .3)); lip.rotation.x = Math.PI / 2; lip.position.y = CYL_TOP; cyl.add(lip);
    var sc = new T3.Mesh(new T3.CylinderGeometry(CYL_R + 0.24, CYL_R + 0.24, CYL_TOP - CYL_B, 40, 1, true, -0.62, 1.24), new T3.MeshBasicMaterial({ map: cylTex(), transparent: true, depthWrite: false }));
    sc.position.y = CYL_B + (CYL_TOP - CYL_B) / 2; cyl.add(sc);
    cylLiq = new T3.Mesh(new T3.CylinderGeometry(CYL_R, CYL_R, 1, 32), new T3.MeshPhongMaterial({ color: 0xA9D3EE, transparent: true, opacity: .55, shininess: 80, depthWrite: false })); cyl.add(cylLiq);
    cylMen = new T3.Mesh(new T3.LatheGeometry([[0, -0.14], [0.6, -0.12], [1.1, -0.06], [1.35, 0.02], [CYL_R, 0.14]].map(function (p) { return new T3.Vector2(p[0], p[1]); }), 32), new T3.MeshPhongMaterial({ color: 0xBFE0F4, transparent: true, opacity: .7, shininess: 120, side: T3.DoubleSide, depthWrite: false })); cyl.add(cylMen);
    stream = new T3.Mesh(new T3.CylinderGeometry(0.14, 0.1, 1, 10), new T3.MeshPhongMaterial({ color: 0xA9D3EE, transparent: true, opacity: .7, shininess: 90, depthWrite: false })); S.add(stream);
  }
  function makeBottle(S) {   // 细口瓶（第 3 问装着 60 mL 盐水）
    bottle = new T3.Group(); bottle.position.set(27, 0, -2); S.add(bottle);
    var gl = new T3.MeshPhongMaterial({ color: 0xE6F0F7, transparent: true, opacity: .35, shininess: 110, depthWrite: false, side: T3.DoubleSide });
    var body = new T3.Mesh(new T3.LatheGeometry([[0, 0], [2.4, 0], [2.5, 0.3], [2.5, 6], [2.2, 7.2], [1.0, 8.0], [0.8, 8.4], [0.8, 9.6], [0, 9.6]].map(function (p) { return new T3.Vector2(p[0], p[1]); }), 32), gl); bottle.add(body);
    var liq = new T3.Mesh(new T3.CylinderGeometry(2.35, 2.35, 3.4, 32), new T3.MeshPhongMaterial({ color: 0xC7E3EE, transparent: true, opacity: .6, depthWrite: false })); liq.position.y = 1.9; bottle.add(liq); bottle.userData.liq = liq;
    var cap = new T3.Mesh(new T3.CylinderGeometry(0.9, 0.9, 1.0, 20), std(0x3A4A5E, .5)); cap.position.y = 10.0; bottle.add(cap);
    var lab = new T3.Mesh(new T3.PlaneGeometry(2.6, 1.6), new T3.MeshBasicMaterial({ map: canvasTex(256, 160, function (g, w, h) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1E3A5F'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#1E3A5F'; g.font = 'bold 64px Microsoft YaHei, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('盐水', w / 2, h / 2); }) }));
    lab.position.set(0, 4.6, 2.52); bottle.add(lab);
    var hit = new T3.Mesh(new T3.CylinderGeometry(3, 3, 11, 10), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = 5; bottle.add(hit); bottle.userData.hit = hit;
  }
  function addHit(g, r, h) { var m = new T3.Mesh(new T3.CylinderGeometry(r + 0.3, r + 0.3, h + 0.8, 12), new T3.MeshBasicMaterial({ visible: false })); m.position.y = h / 2; g.add(m); g.userData.hit = m; return m; }

  function build() {
    V = K.three({ target: [-2, 19, 2], az: 0.06, el: 0.28, dist: 112, minDist: 50, maxDist: 160, minAz: -0.9, maxAz: 0.9, minEl: 0.06, maxEl: 1.0, fov: 30, sun: [-40, 120, 80] });
    T3 = V.T; var S = V.scene; rc = new T3.Raycaster();
    V.renderer.localClippingEnabled = true;
    makeBalance(S); makeBox(S); makeCylinder(S); makeBottle(S);
    items.cup = { g: makeBeaker(0xC7E3EE), r: OBJ.cup.r, h: OBJ.cup.h }; items.wcup = { g: makeBeaker(0xA9D3EE), r: OBJ.wcup.r, h: OBJ.wcup.h };
    items.stone = { g: makeStone(), r: OBJ.stone.r, h: OBJ.stone.h };
    addHit(items.cup.g, BR, 6.1); addHit(items.wcup.g, BR, 6.1); addHit(items.stone.g, 1.6, 3.2);
    var str = new T3.Mesh(new T3.CylinderGeometry(0.04, 0.04, 1, 6), std(0xE9E4DA, .9)); S.add(str); items.stone.str = str;
    WTS.forEach(function (w) { var g = makeWeight(w); addHit(g, w.r, w.h); items[w.id] = { g: g, r: w.r, h: w.h }; });
    Object.keys(items).forEach(function (k) { S.add(items[k].g); });
    var hits = function () { return Object.keys(items).filter(function (k) { return items[k].g.visible; }).map(function (k) { return items[k].g.userData.hit; }); };
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, hits().concat([rider.userData.hit].concat(bottle.visible ? [bottle.userData.hit] : []))); },
      start: function (ev) {
        var h = V.pick(ev, hits()), mp = stagePt(ev);
        if (h) {
          var id = Object.keys(items).filter(function (k) { return items[k].g.userData.hit === h.object; })[0], g = items[id].g, l = st.loc[id];
          grab = { k: 'item', id: id, o: h.point.clone().sub(g.position), p0: h.point.clone(), x: ev.clientX, y: ev.clientY, moved: false, sp: mp };
          if (l === 'P') { grab.k = 'tilt'; var sc = V.toScreen(spoutW()); grab.c = sc; grab.a0 = Math.atan2(mp.y - sc.y, mp.x - sc.x); grab.t0 = st.tilt; }
          if (l === 'C') { grab.k = 'lower'; grab.d0 = st.depth; var sp = V.toScreen(h.point); grab.ox = mp.x - sp.x; grab.oy = mp.y - sp.y; grab.hp = h.point.clone(); }
          return true;
        }
        if (bottle.visible && V.pick(ev, [bottle.userData.hit])) { grab = { k: 'bottle', x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        var rh = V.pick(ev, [rider.userData.hit]);
        if (rh) { var s2 = V.toScreen(rh.point); grab = { k: 'rider', lp: beam.worldToLocal(rh.point.clone()), r0: st.rider, ox: mp.x - s2.x, oy: mp.y - s2.y, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var mp = stagePt(ev);
        if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) < 4) return;
        var first = !grab.moved; grab.moved = true;
        if (grab.k === 'item') {
          if (first) { grab.from = st.loc[grab.id]; st.loc[grab.id] = 'D'; st.drag = grab.id; changed(); }
          grab.lastEv = ev; var p = carry(ev, grab, items[grab.id].r); if (p) items[grab.id].g.position.copy(p);
        } else if (grab.k === 'tilt') {   // 绕杯嘴转：手指绕杯嘴转多少，杯子就倾斜多少
          var a = Math.atan2(mp.y - grab.c.y, mp.x - grab.c.x), da = a - grab.a0;
          while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          setTilt(grab.t0 - da * 180 / Math.PI);
        } else if (grab.k === 'lower') {   // 石块只沿量筒轴线上下：找按住的点在屏幕上离手指最近的深度
          var tx = mp.x - grab.ox, ty = mp.y - grab.oy, best = st.depth, bd = 1e9;
          for (var d = 0; d <= maxDepth() + 1e-6; d += 0.02) { var w = V.toScreen(grab.hp.clone().add(new T3.Vector3(0, grab.d0 - d, 0))), dd = Math.hypot(w.x - tx, w.y - ty); if (dd < bd) { bd = dd; best = d; } }
          setDepth(best);
        } else if (grab.k === 'rider') {
          var tx2 = mp.x - grab.ox, ty2 = mp.y - grab.oy, b2 = 0, bd2 = 1e9;
          for (var i = 0; i <= 500; i++) { var w2 = V.toScreen(beam.localToWorld(grab.lp.clone().add(new T3.Vector3((i / 100 - grab.r0) * (RX1 - RX0) / 5, 0, 0)))), d2 = Math.hypot(w2.x - tx2, w2.y - ty2); if (d2 < bd2) { bd2 = d2; b2 = i / 100; } }
          setRider(b2, false);
        }
      },
      end: function () {
        if (!grab) return;
        if (grab.k === 'item') { if (!grab.moved) clickItem(grab.id); else { st.drag = null; drop(grab.id, items[grab.id].g.position, grab, grab.lastEv); } }
        else if (grab.k === 'tilt' && !grab.moved && st.tilt <= 31) place(grab.id, 'T');
        else if (grab.k === 'lower' && !grab.moved && st.depth < 0.05) place('stone', 'T');
        else if (grab.k === 'bottle' && !grab.moved) pourBottle();
        else if (grab.k === 'rider' && grab.moved) setRider(st.rider, true);
        grab = null;
      }
    };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }

  /* ── 拖着走（同 08）：先找表面，碰到器材侧面时在按下点所在的竖直面里悬空移动 ── */
  function supports(skip) {
    var s = [
      { x0: BX - 19, x1: BX + 19, z0: -6, z1: 6, top: 2.85 }, { x0: BX - 2, x1: BX + 2, z0: -2, z1: 2, top: PIV + 1 }, { x0: BX - 2.6, x1: BX + 2.6, z0: -1.8, z1: -0.5, top: PIV + 10.4 }, { x0: BX - 18.6, x1: BX + 18.6, z0: -0.8, z1: 1.2, top: PIV + 1 },
      { c: 1, x: BX - PX, z: 0, R: PAN_R, top: PAN_Y, pan: 'L' }, { c: 1, x: BX + PX, z: 0, R: PAN_R, top: PAN_Y, pan: 'R' },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z + 4, top: 1.2 },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z - 3.5, top: 3.2 }, { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z + 3.5, z1: BOX.z + 4, top: 3.2 },
      { x0: BOX.x - 7.3, x1: BOX.x - 6.8, z0: BOX.z - 4, z1: BOX.z + 4, top: 3.2 }, { x0: BOX.x + 6.8, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z + 4, top: 3.2 },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 7, z1: BOX.z - 4, top: 9 },
      { c: 1, x: CX, z: CZ, R: 3.0, top: CYL_TOP + 0.2, cyl: 1 }
    ];
    if (bottle.visible) s.push({ c: 1, x: bottle.position.x, z: bottle.position.z, R: 2.6, top: 10.5 });
    Object.keys(items).forEach(function (k) { if (k === skip || !items[k].g.visible || st.loc[k] === 'P' || st.loc[k] === 'C') return; var p = items[k].g.position, l = st.loc[k]; s.push({ c: 1, x: p.x, z: p.z, R: items[k].r, top: p.y + items[k].h, pan: l === 'L' || l === 'R' ? l : null }); });
    return s;
  }
  function surfH(S, x, z, r) {   // 该处最高表面；S.top 记下是哪一个
    var h = 0; S.top = null;
    for (var i = 0; i < S.length; i++) {
      var s = S[i], over = s.c ? Math.hypot(x - s.x, z - s.z) < s.R + r : x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1;
      if (over && s.top > h) { h = s.top; S.top = s; }
    }
    return h;
  }
  /* 拿着走（同 08）：只在指针射线上找位置，按住的点始终在手指下；射线碰到的表面托得住就放在上面，
     碰到器材侧面就悬在射线上（不越过碰到的那一点） */
  function carry(ev, gr, r) {
    var p = stagePt(ev), W = K.stage.clientWidth, H = K.stage.clientHeight, o = gr.o;
    rc.setFromCamera(new T3.Vector2(p.x / W * 2 - 1, -(p.y / H) * 2 + 1), V.camera);
    var C = rc.ray.origin, d = rc.ray.direction, S = supports(gr.id), at = function (t) { return new T3.Vector3(C.x + t * d.x - o.x, C.y + t * d.y - o.y, C.z + t * d.z - o.z); };
    var f = function (t) { var b = at(t); return b.y - surfH(S, b.x, b.z, r); };
    var t0 = 1, t1 = -1;
    for (var t = 1; t < 600; t += 0.5) { if (f(t) <= 0) { t1 = t; break; } t0 = t; }
    gr.over = null;
    if (t1 > 0) {
      for (var k = 0; k < 18; k++) { var tm = (t0 + t1) / 2; if (f(tm) <= 0) t1 = tm; else t0 = tm; }
      var b1 = at(t1), y = surfH(S, b1.x, b1.z, r); gr.over = S.top ? (S.top.pan || (S.top.cyl ? 'cyl' : null)) : null;
      if (Math.abs(y - b1.y) < 0.3) { b1.y = y; return b1; }
    }
    var n = V.camera.getWorldDirection(new T3.Vector3()).setY(0).normalize(), pl = new T3.Plane().setFromNormalAndCoplanarPoint(n, gr.p0), q = new T3.Vector3();
    var tp = rc.ray.intersectPlane(pl, q) ? q.distanceTo(C) : t0;
    return at(t1 > 0 ? Math.min(tp, t0) : tp);
  }
  /* 手指是否在量筒附近（屏幕上：量筒轴线左右 90 px 内、从量筒口上方 260 px 到量筒底） */
  function nearCylScreen(ev) {
    if (!ev) return false;
    var m = stagePt(ev), a = V.toScreen(new T3.Vector3(CX, CYL_TOP, CZ)), b = V.toScreen(new T3.Vector3(CX, 0, CZ));
    return Math.abs(m.x - a.x) < 90 && m.y > a.y - 260 && m.y < b.y;
  }
  /* 松手：指着托盘 → 放进那个盘；指着量筒或在量筒附近 → 烧杯到量筒旁准备倾倒、石块挂到量筒口上方；其余 → 回原处 */
  function drop(id, p, gr, ev) {
    var over = gr && gr.over;
    var pan = over === 'L' || over === 'R' ? over : Math.hypot(p.x - BX + PX, p.z) < PAN_R + 1.5 && p.y > 10 ? 'L' : Math.hypot(p.x - BX - PX, p.z) < PAN_R + 1.5 && p.y > 10 ? 'R' : null;
    var nearCyl = !isW(id) && (over === 'cyl' || nearCylScreen(ev) || (Math.hypot(p.x - CX, p.z - CZ) < 6 && p.y > 8));
    if (nearCyl) place(id, id === 'stone' ? 'C' : 'P');
    else if (pan) place(id, pan);
    else place(id, isW(id) ? 'B' : 'T');
  }
  function place(id, where) {
    if (!isW(id) && (where === 'L' || where === 'R')) objOn(where).forEach(function (k) { if (k !== id) st.loc[k] = 'T'; });
    if (where === 'P') { ['cup', 'wcup'].forEach(function (k) { if (k !== id && st.loc[k] === 'P') st.loc[k] = 'T'; }); st.tilt = 30; }
    if (where === 'C') st.depth = 0;
    if (id === 'stone' && st.loc.stone === 'C' && where !== 'C') { if (sub() > 0.01) st.stoneWet = true; }
    st.loc[id] = where; changed();
  }
  function clickItem(id) {
    var l = st.loc[id];
    if (isW(id)) place(id, l === 'B' ? 'R' : 'B');
    else place(id, l === 'T' ? 'L' : 'T');
  }
  function pourBottle() {
    if (st.bottle <= 0 || st.mode !== 'brine' || st.loc.cup === 'D') return;
    st.cupV += st.bottle; st.bottle = 0; changed();
  }
  function setRider(v, snap) {
    v = clamp(v, 0, 5); var n = Math.round(v * 5) / 5;
    if (snap && Math.abs(v - n) < 0.07) v = n;
    v = Math.round(v * 50) / 50;
    if (v !== st.rider) { st.rider = v; changed(); }
  }
  function setTilt(t) { var p = pourer(); if (!p) return; st.tilt = clamp(Math.round(t), 30, 115); last = ''; }
  function maxDepth() { return CYL_TOP + 1.0 - CYL_B; }
  function setDepth(d) {
    d = clamp(Math.round(d * 50) / 50, 0, maxDepth());
    if (d === st.depth) return;
    var s0 = sub(); st.depth = d; var s1 = sub();
    if (s1 > 0.01) st.stoneWet = true;
    if (Math.abs(s1 - s0) > 1e-4) st.calm = 0;
    changed();
  }

  /* ── 每帧 ── */
  function spoutW() { return new T3.Vector3(CX + 1.2, CYL_TOP + 1.0, CZ); }
  function tick(dt) {
    var se = seq(), w = 2 * Math.PI / 1.5, z = 0.1, n = 4, h = dt / n;
    for (var i = 0; i < n; i++) { st.v += (-w * w * (st.s - se) - 2 * z * w * st.v) * h; st.s += st.v * h; if (Math.abs(st.s) > 11.5) { st.s = Math.sign(st.s) * 11.5; st.v *= -0.3; } }
    // 倾倒：杯里留得住的体积 vmax(θ)；内壁至少挂 2 mL
    var wasFlow = st.flow; st.flow = 0;
    var p = pourer();
    if (p) {
      var key = p === 'cup' ? 'cupV' : 'wcupV', V0 = st[key], floor = Math.min(V0, 2.0), keep = Math.max(floor, vmax(st.tilt * Math.PI / 180));
      if (V0 > keep + 1e-3) {
        var dV = Math.min(V0 - keep, (5 + 3 * (V0 - keep)) * dt, 105 - st.cylV);
        if (dV > 1e-4) { st[key] -= dV; st.cylV += dV; st.flow = dV / dt; if (p === 'cup') st.cupPoured = true; st.calm = 0; }
      }
    }
    if (wasFlow && !st.flow && p === 'cup') {   // 一次倾倒停下：量筒里的体积补齐到整毫升（从杯里再取不到 1 mL），读数取整后算出的密度稳定在 1.10
      var dv = Math.ceil(st.cylV - 1e-6) - st.cylV;
      if (dv > 1e-6 && st.cupV - dv >= 0) { st.cupV -= dv; st.cylV += dv; }
    }
    // 石块出水：表面带走 0.6 mL
    var sNow = sub();
    if (lastSub > 0.01 && sNow <= 0.01 && st.stoneWet && !st.filmOut) { st.cylV = Math.max(0, st.cylV - WET); st.filmOut = true; }
    if (sNow > 0.01 && st.filmOut) { st.cylV += WET; st.filmOut = false; }
    lastSub = sNow;
    st.calm += dt;
    if (K.revealed() && st.flow) K.invalidate();
    pose(); drawWin(); ui();
  }
  function poseBeaker(id) {
    var it = items[id], g = it.g, l = st.loc[id], vol = id === 'cup' ? st.cupV : st.wcupV, dyL = -PX * Math.sin(beam.rotation.z), dyR = -dyL;
    g.visible = id === 'cup' ? st.mode === 'brine' : st.mode === 'stone';
    var th = 0;
    if (l === 'T') g.position.set(OBJ[id].home[0], 0, OBJ[id].home[1]);
    else if (l === 'L' || l === 'R') g.position.set(BX + (l === 'L' ? -PX : PX), PAN_Y + (l === 'L' ? dyL : dyR), 0);
    else if (l === 'P') {
      th = st.tilt * Math.PI / 180;
      var sp = new T3.Vector3(-BR - 0.15, BB + BH, 0).applyAxisAngle(new T3.Vector3(0, 0, 1), th);
      g.position.copy(spoutW()).sub(sp);
    }
    g.rotation.set(0, 0, th);
    var c = vol > 0.01 ? cOf(vol, th) : -99, liq = g.userData.liq;
    liq.visible = vol > 0.01;
    // 局部液面 u·p = c（p 从杯内底量起）；组原点在杯底外侧、杯内底在 y=BB → 世界高度 = pos.y + c + BB·cosθ
    g.userData.plane.constant = g.position.y + c + BB * Math.cos(th);
  }
  function pose() {
    var a = -st.s * DA * Math.PI / 180;   // 右侧重（s>0）右端下沉；向上的指针随横梁转，偏向右
    beam.rotation.z = a;
    var dyR = PX * Math.sin(a), dyL = -dyR;
    pans.L.position.set(-PX, dyL, 0); pans.R.position.set(PX, dyR, 0);
    rider.position.set(RX0 + st.rider * (RX1 - RX0) / 5, 0, 0);
    var slotK = { L: 0, R: 0 };
    WTS.forEach(function (w) {
      var g = items[w.id].g, l = st.loc[w.id];
      if (l === 'B') g.position.set(BOX.x + WX[w.id], 1.2, BOX.z - 0.4);
      else if (l === 'L' || l === 'R') { var ag = SLOT[slotK[l]++] * Math.PI / 180; g.position.set(BX + (l === 'L' ? -PX : PX) + Math.cos(ag) * 4.2, PAN_Y + (l === 'L' ? dyL : dyR), -Math.sin(ag) * 4.2); }
    });
    if (st.loc.cup !== 'D') poseBeaker('cup'); else items.cup.g.userData.plane.constant = items.cup.g.position.y + cOf(Math.max(st.cupV, 0.01), 0) + BB;
    if (st.loc.wcup !== 'D') poseBeaker('wcup'); else items.wcup.g.userData.plane.constant = items.wcup.g.position.y + cOf(Math.max(st.wcupV, 0.01), 0) + BB;
    items.cup.g.visible = st.mode === 'brine'; items.wcup.g.visible = st.mode === 'stone';
    // 石块
    var sg = items.stone.g, sl = st.loc.stone; sg.visible = st.mode === 'stone';
    if (sl === 'T') sg.position.set(OBJ.stone.home[0], 0, OBJ.stone.home[1]);
    else if (sl === 'L' || sl === 'R') sg.position.set(BX + (sl === 'L' ? -PX : PX), PAN_Y + (sl === 'L' ? dyL : dyR), 0);
    else if (sl === 'C') sg.position.set(CX, stoneBottom(), CZ);
    sg.rotation.set(0, 0.4, 0);
    var rk = sg.userData.rock, ly = sl === 'C' || sl === 'D' ? 1 : 0.62;   // 放在桌面 / 盘上时扁的一面朝下；用线提着时竖直
    rk.scale.y = ly; rk.position.y = ST.b * ly;
    var str = items.stone.str; str.visible = sg.visible && (sl === 'C' || sl === 'D');
    if (str.visible) { var top = sg.position.y + 2 * ST.b * ly, len = 36 - top; str.scale.y = len; str.position.set(sg.position.x, top + len / 2, sg.position.z); }
    items.stone.g.userData.body.material.color.setHex(st.stoneWet && sub() < 0.01 ? 0x6F675C : 0x8C8274);
    // 量筒液体（凹液面最低处对准读数高度）
    var L = level(), hv = L.y - CYL_B;
    cylLiq.visible = cylMen.visible = st.cylV > 0.05;
    cylLiq.material.color.setHex(st.mode === 'brine' ? 0xC7E3EE : 0xA9D3EE);
    cylLiq.scale.y = Math.max(0.01, hv); cylLiq.position.y = CYL_B + hv / 2; cylMen.position.y = L.y + 0.14;
    // 倾倒的液流
    var p = pourer();
    stream.visible = !!st.flow;
    if (stream.visible) { var s0 = spoutW(), y1 = Math.max(L.y, CYL_B), len2 = s0.y - y1; stream.scale.set(clamp(st.flow / 12, 0.4, 1.2), len2, clamp(st.flow / 12, 0.4, 1.2)); stream.position.set(s0.x - 0.15, y1 + len2 / 2, s0.z); stream.material.color.setHex(p === 'cup' ? 0xC7E3EE : 0xA9D3EE); }
    // 细口瓶
    bottle.visible = st.mode === 'brine' && st.bottle > 0;
    var dw = st.drag && isW(st.drag) ? items[st.drag] : null, tip, hd;
    if (dw) { tip = dw.g.position.clone().add(new T3.Vector3(0, dw.h * 0.95, 0)); hd = tip.clone().add(new T3.Vector3(1.2, 4.2, 7.8)); }
    else { tip = new T3.Vector3(BOX.x + 3.5, 0.1, BOX.z + 6.6); hd = new T3.Vector3(BOX.x - 5.3, 0.1, BOX.z + 5.6); }
    tweezers.position.copy(tip).add(hd).multiplyScalar(0.5); tweezers.quaternion.setFromUnitVectors(new T3.Vector3(0, 0, 1), tip.clone().sub(hd).normalize());
  }

  /* ── 观察窗：量筒液面（上）＋游码标尺与指针（下） ── */
  function drawWin() {
    var L = level(), key = [trueV().toFixed(2), st.sight, st.rider, Math.round(st.s * 10), st.mode, st.cylV > 0.05].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:350px"><h3><span>量筒液面 · 天平</span><small>放大</small></h3><svg viewBox="0 0 350 306"></svg></div>');
    var tv = trueV(), k = 14, cy = 104, Y = function (v) { return cy - (v - tv) * k; }, x0 = 60, x1 = 170, xc = (x0 + x1) / 2, s = '';
    s += '<defs><clipPath id="cw9"><rect x="0" y="0" width="350" height="192"/></clipPath></defs><g clip-path="url(#cw9)">';
    s += '<rect x="' + x0 + '" y="-10" width="' + (x1 - x0) + '" height="220" fill="#F4F8FC" stroke="#9FB3CC" stroke-width="2"/>';
    if (st.cylV > 0.05) {
      var my = Y(tv);
      s += '<path d="M' + x0 + ' ' + (my - 9) + ' Q' + ((x0 + x1) / 2) + ' ' + (my + 9) + ' ' + x1 + ' ' + (my - 9) + ' L' + x1 + ' 210 L' + x0 + ' 210Z" fill="' + (st.mode === 'brine' ? '#C7E3EE' : '#A9D3EE') + '" opacity=".85"/>';
      s += '<path d="M' + x0 + ' ' + (my - 9) + ' Q' + ((x0 + x1) / 2) + ' ' + (my + 9) + ' ' + x1 + ' ' + (my - 9) + '" fill="none" stroke="#2F6FA8" stroke-width="2"/>';
    }
    for (var v = Math.floor(tv - 8); v <= Math.ceil(tv + 8); v++) {
      if (v < 0 || v > 100) continue; var yy = Y(v); if (yy < -2 || yy > 194) continue;
      var l = v % 10 === 0 ? 30 : v % 5 === 0 ? 22 : 13;
      s += '<line x1="' + (x1 - l) + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="#1E3A5F" stroke-width="' + (v % 5 ? 1.4 : 2.4) + '"/>';
      if (v % 5 === 0) s += '<text x="' + (x1 + 8) + '" y="' + (yy + 7) + '" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + v + '</text>';
    }
    s += '<text x="' + (x0 - 8) + '" y="22" text-anchor="end" font-size="18" fill="#56677D">mL</text>';
    if (st.cylV > 0.05) {   // 视线：经过凹液面最低处，与刻度所在的前壁相交处就是读到的刻度
      // 刻度在靠近眼睛的前壁上：视线穿过前壁的位置就是读到的刻度（俯视偏大、仰视偏小）
      var ex = 318, my = Y(tv), ry = Y(tv + sightBias()), f = (ex - x1) / (ex - xc), ey = (ry - f * my) / (1 - f);
      s += '<line x1="' + ex + '" y1="' + ey + '" x2="' + xc + '" y2="' + my + '" stroke="#FE752D" stroke-width="2.5" stroke-dasharray="7 6"/><circle cx="' + x1 + '" cy="' + ry + '" r="4.5" fill="#FE752D"/><circle cx="' + xc + '" cy="' + my + '" r="3.5" fill="#2F6FA8"/>';
      s += '<g transform="translate(' + ex + ' ' + ey + ')"><path d="M-16 0q16-13 32 0q-16 13-32 0z" fill="#fff" stroke="#1E3A5F" stroke-width="2"/><circle cx="-2" cy="0" r="5" fill="#1E3A5F"/></g>';
      s += '<text x="342" y="186" text-anchor="end" font-size="18" fill="#56677D">' + { flat: '平视', down: '俯视', up: '仰视' }[st.sight] + '</text>';
    } else s += '<text x="' + (x0 + 8) + '" y="150" font-size="18" fill="#56677D">量筒是空的</text>';
    s += '</g><line x1="0" y1="196" x2="350" y2="196" stroke="#C3CEDC"/>';
    // 游码标尺（左）与指针（右）
    var y0 = 206, X = function (gv) { return 16 + gv * 44; };
    s += '<rect x="6" y="' + y0 + '" width="244" height="72" rx="6" fill="#F7F8FA" stroke="#C3CEDC"/>';
    for (var i = 0; i <= 25; i++) { var x = X(i * 0.2), Lh = i % 5 === 0 ? 26 : 14; s += '<line x1="' + x + '" y1="' + (y0 + 72) + '" x2="' + x + '" y2="' + (y0 + 72 - Lh) + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.3 : 2.2) + '"/>'; if (i % 5 === 0) s += '<text x="' + x + '" y="' + (y0 + 24) + '" text-anchor="middle" font-size="18" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + i / 5 + '</text>'; }
    var rx2 = X(st.rider); s += '<rect x="' + rx2 + '" y="' + (y0 + 28) + '" width="16" height="46" rx="2" fill="rgba(160,172,188,.55)" stroke="#56677D" stroke-width="1.5"/><line x1="' + rx2 + '" y1="' + (y0 + 26) + '" x2="' + rx2 + '" y2="' + (y0 + 76) + '" stroke="#FE752D" stroke-width="3"/>';
    s += '<text x="12" y="300" font-size="18" fill="#56677D">游码看左边缘</text>';
    var cx = 301, pcy = y0 + 222, R = 205, A = 1.2;   // 转轴在下方，指针向上
    s += '<rect x="258" y="' + y0 + '" width="86" height="72" rx="6" fill="#FBFCFD" stroke="#C3CEDC"/>';
    for (var j = -10; j <= 10; j += 2) { var aa = j * A * Math.PI / 180, ll = j === 0 ? 18 : 10; s += '<line x1="' + (cx + Math.sin(aa) * R) + '" y1="' + (pcy - Math.cos(aa) * R) + '" x2="' + (cx + Math.sin(aa) * (R - ll)) + '" y2="' + (pcy - Math.cos(aa) * (R - ll)) + '" stroke="' + (j ? '#1E3A5F' : '#C1361A') + '" stroke-width="' + (j ? 1.5 : 3) + '"/>'; }
    var pa = st.s * A * Math.PI / 180; s += '<line x1="' + (cx + Math.sin(pa) * (R - 50)) + '" y1="' + (pcy - Math.cos(pa) * (R - 50)) + '" x2="' + (cx + Math.sin(pa) * (R + 2)) + '" y2="' + (pcy - Math.cos(pa) * (R + 2)) + '" stroke="#FE752D" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<text x="301" y="300" text-anchor="middle" font-size="18" fill="#56677D">指针</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 记录：同一行逐步填入 ── */
  function row1() { return st.cur1 >= 0 ? st.rows1[st.cur1] : null; }
  function row2() { return st.cur2 >= 0 ? st.rows2[st.cur2] : null; }
  function done1(r) { return r && r.m1 != null && r.V != null && (r.m2 != null || r.m0 != null); }   // m0：先称空烧杯的做法里空烧杯的质量（不进表一）
  function done2(r) { return r && r.m != null && r.V1 != null && r.V2 != null; }
  /* 当前能记录的量：{f: 字段, v: 数值, lab: 名称} 或 {why: 原因} */
  function skey() { return JSON.stringify([st.loc, st.rider, st.cupV.toFixed(2), st.cylV.toFixed(2), st.wcupV.toFixed(2), st.depth, st.sight, st.mode, st.bottle]); }
  function target() {
    var o = weighing(), r;
    if (st.drag || st.flow) return null;
    if (st.recKey && st.recKey === skey() && st.recVer === st.ver) return { why: st.recWhy };   // 刚记过、器材没动
    if (st.mode === 'brine') {
      r = row1(); if (done1(r)) r = null;
      if (o === 'cup' && balanced()) {
        var m = balRead();
        if (st.cupV < 0.01 && !st.cupPoured) return r && r.m0 != null ? { why: '空烧杯已记下。' + nextStep() } : { f: 'm0', v: m, lab: '空烧杯的质量 m₀', empty: true };
        if (!st.cupPoured && st.cylV < 0.01) return r && r.m1 != null ? { why: 'm₁ 已记下。' + nextStep() } : { f: 'm1', v: m, lab: '杯和盐水的质量 m₁' };
        if (st.cupPoured) { if (!r || r.m1 == null) return { why: '还没记杯和盐水的质量 m₁，这次称量不能当 m₂。' }; if (r.m0 != null) return { why: '先称空杯的做法不用再称，读出量筒中盐水的体积就行。' }; return r.m2 != null ? { why: 'm₂ 已记下。' + nextStep() } : { f: 'm2', v: m, lab: '杯和剩余盐水的质量 m₂' }; }
        return null;
      }
      if (!o && st.cylV > 0.05 && cylStill() && st.sight === 'flat') {
        if (!r || (r.m1 == null && r.m2 == null)) return { why: K.revealed() ? (K.S.q === 1 ? '本问只练读数，不记入表格。' : '倒之前没称 m₁，这次体积不记入表格。') : '读出量筒示数。', soft: 1 };
        return r.V != null ? { why: 'V 已记下。' + nextStep() } : { f: 'V', v: cylRead(), lab: 'V' };
      }
    } else {
      r = row2(); if (done2(r)) r = null;
      if (o === 'stone' && balanced()) return r && r.m != null ? { why: '石块的质量已记下。' + nextStep() } : { f: 'm', v: balRead(), lab: 'm' + (st.stoneWet ? '（沾水）' : ''), wet: st.stoneWet };
      if (!o && st.cylV > 0.05 && cylStill() && st.sight === 'flat') {
        var sv = sub();
        if (sv < 0.01) {
          if (r && r.V1 != null) return { why: 'V₁ 已记下。' + nextStep() };
          if (K.S.q !== 4 && (!r || r.m == null)) return { why: nextStep(), soft: 1 };   // 第 6 问按“先质量、后体积”：没称质量前不记 V₁（第 5 问问的就是先后顺序，允许先记体积）
          if (st.cylV + 10 > 100) return { why: '水太多：放入石块后会超过量程。', bad: 1 };
          if (st.cylV < 12) return { why: '水太少：石块浸不没。', bad: 1 };
          return { f: 'V1', v: cylRead(), lab: 'V₁' };
        }
        if (!fullSub()) return { why: '石块没有完全浸没。', bad: 1 };
        if (!r || r.V1 == null) return { why: '放入石块前没记 V₁，这次体积不能记入表格。' };
        return r.V2 != null ? { why: 'V₂ 已记下。' + nextStep() } : { f: 'V2', v: cylRead(), lab: 'V₂' };
      }
    }
    return null;
  }
  function canRec() { var t = target(); return !!(t && t.f && K.revealed()); }
  function nextStep() {
    if (st.mode === 'brine') {
      var r = row1(); if (done1(r)) return '这一组测完了，到「数据」算密度。';
      if (st.bottle > 0 && st.cupV < 0.01) return r && r.m0 != null ? '点盐水瓶（或「倒入盐水」），把盐水倒进烧杯。' : '先称空烧杯：把它放到左盘。';
      if (!r || r.m1 == null) return '把装盐水的烧杯放到左盘，称出杯和盐水的质量 m₁。';
      if (st.cylV < 0.05) return '把烧杯拿到量筒旁，倒' + (r.m0 != null ? '出全部' : '一部分') + '盐水。';
      if (r.V == null) return '读出量筒里盐水的体积 V。';
      return '把烧杯放回左盘，称出杯和剩余盐水的质量 m₂。';
    }
    var q = row2(); if (done2(q)) return '这一组测完了，到「数据」算密度。';
    if (!q || q.m == null) return '先把石块放到左盘，称出质量 m。';
    if (q.V1 == null) return st.loc.stone === 'L' || st.loc.stone === 'R' ? '把石块从左盘取下，读出 V₁。' : '读出量筒里水的体积 V₁。';
    return '把石块拖到量筒上方，慢慢放进水里。';
  }
  function changed() { st.ver = (st.ver || 0) + 1; if (K.revealed()) K.invalidate(); last = ''; }
  function ui() {
    var o = weighing(), t = target(), hint, tone = '', dd = D(), rv = K.revealed();
    var r1 = row1(), r2 = row2(); if (done1(r1)) r1 = null; if (done2(r2)) r2 = null;
    var checks = st.mode === 'brine'
      ? [{ label: 'm₁', ok: r1 && r1.m1 != null ? true : null }, { label: 'V', ok: r1 && r1.V != null ? true : null }, r1 && r1.m0 != null ? { label: '空杯', ok: true } : { label: 'm₂', ok: r1 && r1.m2 != null ? true : null }]
      : [{ label: 'm', ok: r2 && r2.m != null ? true : null }, { label: 'V₁', ok: r2 && r2.V1 != null ? true : null }, { label: 'V₂', ok: r2 && r2.V2 != null ? true : null }];
    if (st.cylV > 0.05 && !loaded()) checks.push({ label: '平视', ok: st.sight === 'flat' });
    if (st.drag) hint = isW(st.drag) ? '用镊子把砝码放到右盘。' : '放到左盘称质量，或拿到量筒处。';
    else if (st.flow) hint = '正在倒' + liqName() + '……把杯子转回来就停。';
    else if (loaded()) {
      if (objOn('R').length || wOn('L').length) { hint = '左物右码：物体放左盘，砝码放右盘。'; tone = 'warn'; }
      else if (!o) { if (t && t.f) { hint = rv ? '可以记录 ' + t.lab + '。' : '读出量筒示数。'; tone = rv ? 'good' : ''; } else hint = t && t.why ? t.why : '把要称的物体放到左盘。'; }   // 砝码还留在盘里时，提示跟着量筒这一步走
      else if (!wOn('R').length && st.rider < 0.005) hint = '用镊子从大到小往右盘加砝码。';
      else if (!balanced()) hint = dd < 0 ? '指针偏左：再加砝码，或向右移游码。' : '指针偏右：换小一点的砝码，或向左移游码。';
      else if (t && t.why) { hint = t.why; tone = t.bad ? 'warn' : ''; }
      else if (t && !rv) hint = '横梁平衡了。读出天平示数。';
      else if (t) { hint = '可以记录 ' + t.lab + '。'; tone = 'good'; }
      else hint = nextStep();
    }
    else if (pourer() && st.tilt >= 45) hint = '把杯子转回来就停止倾倒。';
    else if (pourer() && st.cylV < 0.05) hint = '拖烧杯绕杯嘴转动（或拖「倾倒」滑杆），把' + liqName() + '倒进量筒。';
    else if (st.cylV > 0.05 && !cylStill()) hint = '等液面静止。';
    else if (st.cylV > 0.05 && st.sight !== 'flat') { hint = '视线要与凹液面底部相平。'; tone = 'warn'; }
    else if (t && t.why) { hint = t.why; tone = t.bad ? 'warn' : ''; }
    else if (t && st.mode === 'stone' && t.f === 'V1' && K.S.q !== 4 && (!row2() || done2(row2()) || row2().m == null)) hint = nextStep();   // 先提示称质量（第 5 问问的就是先后顺序，不提前说）
    else if (t && !rv) hint = '读出量筒示数。';
    else if (t) { hint = '可以记录 ' + t.lab + '。'; tone = 'good'; }
    else if (st.mode === 'stone' && st.loc.stone === 'C' && !fullSub() && sub() > 0.01) { hint = '石块没有完全浸没。'; tone = 'warn'; }
    else hint = nextStep();
    var parts = [];
    if (o && balanced()) { var ws = wOn('R').map(function (k) { return wDef(k).m + ' g'; }); parts.push('天平：' + ws.concat([f1(st.rider) + ' g']).join(' + ') + ' = <b>' + f1(balRead()) + '</b> g'); }
    if (st.cylV > 0.05 && cylStill()) parts.push('量筒：' + (st.sight === 'flat' ? '<b>' + cylRead() + '</b> mL' : (st.sight === 'down' ? '俯视' : '仰视') + '读成 ' + cylRead() + ' mL，偏' + (st.sight === 'down' ? '大' : '小') + '；平视是 <b>' + Math.round(trueV()) + '</b> mL'));
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: parts.length > 0, result: parts.join('<br>') });
    var ok = canRec();
    var key = [ok, hint, st.rider, JSON.stringify(st.loc), st.mode, st.tilt, st.depth, st.sight, st.bottle, rv, st.rows1.length, st.rows2.length, Math.round(st.cylV * 10), parts.length].join('|');
    if (key === last) return; last = key;
    K.setReading('m', rv && o && balanced() ? f1(balRead()) : null);
    K.setReading('V', rv && st.cylV > 0.05 && cylStill() ? String(cylRead()) : null);
    K.setRecord(ok, ok ? '记入' + (st.mode === 'brine' ? (t.empty || (row1() && !done1(row1()) && row1().emptyFirst) ? '对比表' : '表一') : '表二') + '「' + t.lab + '」' : '', ok ? 'good' : '');
    K.setCount(st.mode === 'brine' ? '表一 ' + st.rows1.filter(done1).length + ' 组' : '表二 ' + st.rows2.filter(done2).length + ' 组');
    syncCtrls();
  }

  /* ── 控件 ──（2026-11-21 按「器材调节面板规范」重排）
     选位置（烧杯 / 石块在哪）→ 视线 → 游码、倾倒两根滑杆 → 加砝码、倒入盐水（动作）；
     测什么、清水杯、倒空量筒平时用不到（换问题时已自动设好），收进标题栏的「更多」。 */
  var VL = 'style="font-size:19px;text-align:left;flex:none;width:118px;min-width:0;white-space:nowrap"';
  function gid(id, html) { return html.replace('<div class="grp"', '<div class="grp" id="' + id + '"'); }
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('<span id="n-pl"></span>', '<div id="places"></div>') +
      K.grp('视线', K.seg('s', [['down', '俯视'], ['flat', '平视'], ['up', '仰视']])) +
      K.grp('游码', '<div class="row"><span class="vl" id="v-r" ' + VL + '></span><input class="rng" type="range" id="s-r" min="0" max="5" step="0.02" style="flex:1;width:auto"></div>') +
      K.grp('<span id="n-a"></span>', '<div class="row"><span class="vl" id="v-a" ' + VL + '></span><input class="rng" type="range" id="s-a" min="0" max="1" step="0.001" style="flex:1;width:auto"></div>') +
      K.grp('砝码/g', '<div class="acts" id="wsel">' + WTS.map(function (w) { return '<button data-w="' + w.id + '" style="padding:0 2px" title="' + w.m + ' g 砝码：点一下放入右盘，再点取回">' + w.m + '</button>'; }).join('') +
        '<button id="wback" style="flex:none;padding:0 8px" title="把砝码全部收回砝码盒"><i>↺</i>收回</button></div>') +
      gid('g-pb', K.grp('盐水瓶', K.acts([['pb', '↓', '倒入盐水', 'main']]))) +
      '<div id="more" style="border-top:1px dashed #D5DEE9"' + (st.more ? '' : ' hidden') + '>' +
        K.grp('测什么', K.seg('m', [['brine', '测盐水'], ['stone', '测小石块']])) +
        gid('g-wc', K.grp('清水杯', '<div id="places2"></div>')) +
        K.grp('量筒', K.acts([['empty', '↓', '倒空量筒']])) + '</div>';
    var sr = document.getElementById('s-r'), sa = document.getElementById('s-a');
    K.rng(sr); K.rng(sa);
    sr.addEventListener('input', function () { setRider(+sr.value, false); });
    sr.addEventListener('change', function () { setRider(+sr.value, true); });
    sa.addEventListener('input', function () { if (pourer()) setTilt(30 + (+sa.value) * 85); else if (st.loc.stone === 'C') setDepth(+sa.value * maxDepth()); });
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { var m = b.getAttribute('data-m'); if (m !== st.mode) preset(m === 'brine' ? 0 : 4); }; });
    document.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-w'); place(id, st.loc[id] === 'B' ? 'R' : 'B'); }; });
    document.getElementById('wback').onclick = function () { WTS.forEach(function (w) { st.loc[w.id] = 'B'; }); changed(); };
    document.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { st.sight = b.getAttribute('data-s'); changed(); }; });
    document.getElementById('empty').onclick = function () { if (st.loc.stone === 'C') st.loc.stone = 'T'; st.cylV = 0; st.filmOut = false; st.calm = 0; changed(); };
    K.ctrl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pl]'); if (b) { var a = b.getAttribute('data-pl').split(':'); place(a[0], a[1]); return; }
      if (e.target.closest('#pb')) pourBottle();
    });
  }
  var tagKey = '';
  function moreBtn() {   // 标题栏右侧：现在测什么 +「更多」展开 / 收起
    tagKey = st.mode + '|' + !!st.more;
    K.ctrlTag((st.mode === 'brine' ? '测盐水' : '测小石块') + '<button class="mini" id="more-tg" style="margin-left:8px">' + (st.more ? '收起 ▴' : '更多 ▾') + '</button>');
    document.getElementById('more-tg').onclick = function () { st.more = !st.more; document.getElementById('more').hidden = !st.more; moreBtn(); };
  }
  function placeSeg(id, opts) {   // 位置几选一：data-pl="物体:位置"，点击由 K.ctrl 上的委托处理
    return '<div class="seg">' + opts.map(function (o) { return '<button data-pl="' + id + ':' + o[0] + '"' + (st.loc[id] === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function syncCtrls() {
    var br = st.mode === 'brine';
    var html = br ? placeSeg('cup', [['T', '桌面'], ['L', '左盘'], ['P', '量筒旁']]) : placeSeg('stone', [['T', '桌面'], ['L', '左盘'], ['C', '量筒里']]);
    var pl = document.getElementById('places'); if (pl.innerHTML !== html) pl.innerHTML = html;
    var h2 = br ? '' : placeSeg('wcup', [['T', '桌面'], ['P', '量筒旁']]);
    var p2 = document.getElementById('places2'); if (p2.innerHTML !== h2) p2.innerHTML = h2;
    document.getElementById('n-pl').textContent = br ? '烧杯' : '石块';
    document.getElementById('g-wc').style.display = br ? 'none' : '';
    document.getElementById('g-pb').style.display = br && st.bottle > 0 ? '' : 'none';
    if (tagKey !== st.mode + '|' + !!st.more) moreBtn();
    var sr = document.getElementById('s-r'), sa = document.getElementById('s-a'), p = pourer(), c = st.loc.stone === 'C' && st.mode === 'stone';
    if (document.activeElement !== sr) sr.value = st.rider;
    sa.disabled = !p && !c;
    if (document.activeElement !== sa) sa.value = p ? (st.tilt - 30) / 85 : c ? st.depth / maxDepth() : 0;
    [sr, sa].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-r').textContent = st.rider < 0.005 ? '在零刻度线' : K.revealed() && weighing() && balanced() ? f1(st.rider) + ' g' : '读标尺';
    document.getElementById('n-a').textContent = c ? '浸入' : '倾倒';
    document.getElementById('v-a').textContent = p ? (st.flow ? '正在倒' : st.tilt <= 31 ? '杯口朝上' : '倾斜 ' + st.tilt + '°') : c ? (fullSub() ? '已浸没' : sub() > 0.01 ? '部分浸入' : '在水面上方') : '先到量筒旁';
    document.querySelectorAll('[data-m]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === st.mode); });
    document.querySelectorAll('[data-w]').forEach(function (b) { var l = st.loc[b.getAttribute('data-w')]; b.classList.toggle('on', l === 'R' || l === 'L'); });
    document.getElementById('wback').disabled = !WTS.some(function (w) { return st.loc[w.id] !== 'B'; });
    document.querySelectorAll('[data-s]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-s') === st.sight); });
    document.getElementById('empty').disabled = st.cylV < 0.05;
  }

  /* 第 i 问的起始器材 */
  function preset(i) {
    st.mode = i >= 4 ? 'stone' : 'brine';
    Object.keys(OBJ).forEach(function (k) { st.loc[k] = 'T'; });
    WTS.forEach(function (w) { st.loc[w.id] = 'B'; });
    st.recKey = null; st.rider = 0; st.drag = null; st.sight = 'flat'; st.tilt = 30; st.depth = 0; st.flow = 0; st.calm = 9; st.filmOut = false; lastSub = 0;
    st.cupV = 60; st.cupPoured = false; st.bottle = 0; st.cylV = 0; st.stoneWet = false; st.wcupV = 40;
    if (i === 1) { st.cupV = 20; st.cylV = 40; st.cupPoured = true; }
    if (i === 2) { st.cupV = 0; st.bottle = 60; }
    if (i >= 4) st.cylV = 50;
    st.rows1.concat(st.rows2).forEach(function (r) { if (!(done1(r) || done2(r))) r.cut = true; });   // 没测完的行保留，数据页标“未完成”；下一次记录从新的一行开始
    st.cur1 = st.cur2 = -1;
    st.s = seq(); st.v = 0;
    changed();
  }

  window.__exp = { st: st, V: function () { return V; }, items: function () { return items; }, rider: function () { return rider; }, beam: function () { return beam; }, D: D, balanced: balanced, level: level, sub: sub, vmax: vmax, trueV: trueV, cylRead: cylRead, target: target, spout: spoutW, bottle: function () { return bottle; } };
  LabKit.run({
    readings: [{ id: 'm', name: '天平示数', unit: 'g' }, { id: 'V', name: '量筒示数', unit: 'mL' }],
    calc: { teach: '显示计算' },
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖烧杯、石块、砝码；点一下放入 / 取回；烧杯到量筒旁后转动倾倒，石块在量筒上方上下拖；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onReveal: function () { last = ''; },
    record: function () {
      var t = target(); if (!t || !t.f || !K.revealed()) return;
      if (st.mode === 'brine') {
        var r = row1(); if (!r || done1(r)) { st.rows1.push({ m1: null, m2: null, m0: null, V: null, emptyFirst: false }); st.cur1 = st.rows1.length - 1; r = row1(); }
        r[t.f] = t.v; if (t.empty) r.emptyFirst = true;
      } else {
        var q = row2(); if (!q || done2(q)) { st.rows2.push({ m: null, V1: null, V2: null, wet: false }); st.cur2 = st.rows2.length - 1; q = row2(); }
        q[t.f] = t.v; if (t.f === 'm') q.wet = !!t.wet;
      }
      st.recKey = skey(); st.recVer = st.ver; st.recWhy = (st.mode === 'brine' ? done1(row1()) : done2(row2())) ? '这一组测完了，到「数据」算密度。' : t.lab.replace(/（.*）/, '').replace(/^.*(m[₀₁₂])$/, '$1') + ' 已记下。' + nextStep();
      K.invalidate(); last = '';
    },
    clear: function () { st.rows1 = []; st.rows2 = []; st.cur1 = st.cur2 = -1; last = ''; },
    renderData: function (K) {
      var c = K.calcShown(), d = function (v, n) { return v == null ? '<td class="n dim">—</td>' : '<td class="n">' + (n === 0 ? v : f1(v)) + '</td>'; };
      var cc = function (ok, v, cut) { return '<td class="n ' + (ok && c ? 'calc' : 'dim') + '">' + (ok ? (c ? v : '?') : cut ? '未完成' : '—') + '</td>'; };
      var t1 = st.rows1.filter(function (r) { return !r.emptyFirst; }).map(function (r) { var ok = done1(r); return '<tr>' + d(r.m1) + d(r.m2) + cc(ok, ok ? f1(r.m1 - r.m2) : '') + d(r.V, 0) + cc(ok, ok ? ((r.m1 - r.m2) / r.V).toFixed(2) : '', r.cut) + '</tr>'; }).join('');
      var t0 = st.rows1.filter(function (r) { return r.emptyFirst; }).map(function (r) { var ok = done1(r); return '<tr>' + d(r.m0) + d(r.m1) + d(r.V, 0) + cc(ok, ok ? ((r.m1 - r.m0) / r.V).toFixed(2) : '', r.cut) + '</tr>'; }).join('');
      var t2 = st.rows2.map(function (r) { var ok = done2(r); return '<tr>' + d(r.m) + d(r.V1, 0) + d(r.V2, 0) + cc(ok, ok ? (r.V2 - r.V1) : '') + cc(ok, ok ? (r.m / (r.V2 - r.V1)).toFixed(2) : '', r.cut) + '</tr>'; }).join('');
      var un = [st.rows1.some(function (r) { return !done1(r) && !r.cut && !r.emptyFirst; }) ? '表一' : '', st.rows1.some(function (r) { return !done1(r) && !r.cut && r.emptyFirst; }) ? '对比表' : '', st.rows2.some(function (r) { return !done2(r) && !r.cut; }) ? '表二' : ''].filter(Boolean);
      var cutN = st.rows1.filter(function (r) { return r.cut; }).length + st.rows2.filter(function (r) { return r.cut; }).length;
      var wt = st.rows2.map(function (r, i) { return r.wet ? i + 1 : 0; }).filter(Boolean);
      var empty = function (n) { return '<tr><td colspan="' + n + '" class="dim" style="text-align:center">还没有记录</td></tr>'; };
      return '<div class="dvh"><h2>表一　测盐水</h2></div>' +
        '<table class="rec"><thead><tr><th>杯和盐水的质量 <span class="m">m</span>₁/g</th><th>杯和剩余盐水的质量 <span class="m">m</span>₂/g</th><th>量筒中盐水的质量 <span class="m">m</span>（= <span class="m">m</span>₁ − <span class="m">m</span>₂）/g</th><th>量筒中盐水的体积 <span class="m">V</span>/cm³</th><th>盐水的密度 <span class="m">ρ</span>/(g·cm⁻³)</th></tr></thead><tbody>' + (t1 || empty(5)) + '</tbody></table>' +
        (t0 ? '<div class="dvh" style="margin-top:14px"><h2>对比　先称空烧杯，再装盐水全部倒进量筒</h2></div>' +
          '<table class="rec"><thead><tr><th>空烧杯的质量 <span class="m">m</span>₀/g</th><th>杯和盐水的质量 <span class="m">m</span>₁/g</th><th>量筒中盐水的体积/cm³</th><th>算出的密度/(g·cm⁻³)</th></tr></thead><tbody>' + t0 + '</tbody></table>' : '') +
        '<div class="dvh" style="margin-top:18px"><h2>表二　测小石块</h2></div>' +
        '<table class="rec"><thead><tr><th>石块的质量 <span class="m">m</span>/g</th><th>水的体积 <span class="m">V</span>₁/cm³</th><th>水和石块的总体积 <span class="m">V</span>₂/cm³</th><th>石块的体积 <span class="m">V</span>/cm³</th><th>石块的密度 <span class="m">ρ</span>/(g·cm⁻³)</th></tr></thead><tbody>' + (t2 || empty(5)) + '</tbody></table>' +
        (wt.length ? '<p class="tip">第 ' + wt.join('、') + ' 行的石块是从水里拿出来后称的（沾了水）。</p>' : '') +
        (un.length ? '<p class="tip">' + un.join('、') + '最后一行还在测，“—”是还没记的量。</p>' : '') +
        (cutN ? '<p class="tip">标“未完成”的行是换问题前没测完的，不能算密度；下一组从新的一行开始。</p>' : '') +
        '<p class="tip"><span class="m">m</span> = <span class="m">m</span>₁ − <span class="m">m</span>₂，<span class="m">V</span> = <span class="m">V</span>₂ − <span class="m">V</span>₁，<span class="m">ρ</span> = <span class="m">m</span>/<span class="m">V</span>；1 mL = 1 cm³。' + (c ? '' : '先自己算，再点右侧「显示计算」。') + '</p>';
    }
  });
})();
