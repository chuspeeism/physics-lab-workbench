/* 电学器材库 circuit.js（15–20 共用，在 lab.js 之后、expNN.js 之前加载）。
   外观照 src/experiments/_parts/electric.js：白色工程塑料表壳、黑色电木底座、黄铜 / 红 / 黑接线柱、同样的表盘画法。
   单位 cm；实验板上表面 y = Circuit.TOP；部件正面朝 +z（朝观察者），at 为部件底面中心。

   var C = Circuit.setup(V)                    V = K.three(...) 的返回值；之后用 C 建器材
   C.board(w, d)                               浅色实验板
   C.post(parent, [x,y,z], 'brass'|'red'|'black') → 接点 Object3D（接线柱顶端；.userData.hit 是拾取用的透明柱）
   C.meter(parent, {letter:'A'|'V', ranges:[0.6,3], at, rotY})   → 电表 m
       m.posts['-'|'0.6'|'3']  m.set(value, range)（range = 当前接线的量程，null = 没接入）  m.update(dt)
       m.frac()（指针位置，满偏 = 1，含挡钉抖动）  m.over / m.reversed  m.group
   C.battery(parent, {cells, at, plusLeft, mid})  电池盒 → posts['+','-'(,'m' 两节之间)]
   C.knife(parent, {at, rotY})                 闸刀开关 → posts L/R，.set(closed)、.update(dt)，.hit（点按区）
   C.bulb(parent, {at, rotY})                  小灯泡 → posts L/R，.setPower(实际功率 / 参考功率)，.setStyle('bulb'|'led')（外观：普通小灯泡 / LED 小灯，只换样子）
   C.resistor(parent, {at, ohms, rotY})        定值电阻（色环 + 阻值牌）→ posts L/R，.setOhms(R)
   C.rheostat(parent, {at, Rmax, length})      滑动变阻器（A 下左、D 上右）→ posts A/D，.set(p)（0 左端 … 1 右端，接入 p·Rmax），.slider，.hit
       .dragTo(V, 屏幕点)：把滑片放到屏幕上离该点最近的位置（跟手拖动用）
   C.clip(parent, color)                       鳄鱼夹 → .group .hit，.place(Vector3 夹口位置)，.top()（导线接到夹子上端）
   C.print(parent, text, at, {size, color, w, h})   平铺在实验板上的印字（测点字母、灯泡名称等）
   C.ring(parent, at, color)                   测点小圆圈
   C.wires(scene)                              导线 W：W.set([{id, a:接点|Vector3, b, color:'red'|'black'|'blue'|'green', via:[[x,y,z]], up, arc, I}])
       只重建端点变了的导线；I（安培，>0 由 a 流向 b）驱动电流方向光点；W.flow(on)；W.update(dt)
   Circuit.net()                               电路求解（节点电压法）：n.R(a,b,R)  n.cell(neg,pos,E,r)  n.wire(a,b)  n.ground(k)
       n.solve() → s.v(k) 节点电压，s.i(id) 元件电流（由 a 流向 b）
   Circuit.dialSVG({letter, ranges, range, frac, w, h, terms})   读数放大窗里的表盘（SVG 字符串）
   Circuit.quant(v, step)                      按分度值读数
   C.screenFit(fn, target, lo, hi)             找参数 t 使 fn(t) 的屏幕位置离 target 最近（约束拖动跟手）
   Circuit.opts(id, label, items) / Circuit.mark(id, value, disabled)   右侧面板的紧凑选项行
   Circuit.slideRow / slideBind / slideSync    右侧面板「调电压」行：滑片滑杆 + ← → 微调（19、20 用） */
(function () {
  var T, M, V;
  var TOP = 1.2;
  var WIRE_HEX = { red: 0xC0392B, black: 0x2B2F33, blue: 0x2F5FD0, green: 0x2F9E44, gray: 0x8D96A0 };
  var FONT_NUM = 'Bahnschrift, "DIN Alternate", Arial, sans-serif', FONT_CN = '"Microsoft YaHei", "PingFang SC", sans-serif', FONT_SERIF = '"Times New Roman", serif';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function std(hex, o) { o = o || {}; return new T.MeshStandardMaterial({ color: hex, roughness: o.r != null ? o.r : 0.5, metalness: o.m || 0, transparent: !!o.tr, opacity: o.op != null ? o.op : 1, depthWrite: o.dw !== false }); }
  function mats() {
    M = {
      bakelite: std(0x262B2F, { r: 0.42 }), body: std(0xF1F2F0, { r: 0.5 }), brass: std(0xB08D57, { r: 0.4, m: 0.5 }),
      red: std(0xC62828, { r: 0.45 }), black: std(0x26292C, { r: 0.45 }), metal: std(0xC9CED3, { r: 0.3, m: 0.6 }),
      steel: std(0xA7AEB6, { r: 0.35, m: 0.7 }), needle: std(0x1A1A1A, { r: 0.5 }), rod: std(0xB4BAC0, { r: 0.3, m: 0.6 }),
      board: std(0xE8EDF3, { r: 0.92 }), boardEdge: std(0xCBD4DF, { r: 0.9 }), cream: std(0xE8E4D8, { r: 0.8 }),
      hit: new T.MeshBasicMaterial({ visible: false }), wire: {}
    };
    for (var k in WIRE_HEX) M.wire[k] = std(WIRE_HEX[k], { r: 0.5 });
  }
  function place(o, opt) {
    if (!opt) return o;
    if (opt.at) o.position.fromArray(opt.at);
    if (opt.rot) o.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
    if (opt.parent) opt.parent.add(o);
    return o;
  }
  function mesh(geo, mat, opt) { var m = new T.Mesh(geo, mat); m.castShadow = !(opt && opt.cast === false); m.receiveShadow = true; return place(m, opt); }
  function box(w, h, d, mat, opt) { return mesh(new T.BoxGeometry(w, h, d), mat, opt); }
  function cyl(r, h, mat, opt) {
    opt = opt || {};
    var g = new T.CylinderGeometry(opt.r2 != null ? opt.r2 : r, r, h, opt.seg || 24);
    if (opt.axis === 'x') g.rotateZ(Math.PI / 2); else if (opt.axis === 'z') g.rotateX(Math.PI / 2);
    return mesh(g, mat, opt);
  }
  /* 圆角方块：xy 面圆角 r，沿 z 挤出 d */
  function rbox(w, h, d, r, mat, opt) {
    var b = Math.min(0.15, d / 4, w / 6, h / 6); w -= 2 * b; h -= 2 * b; r = Math.max(0.01, Math.min(r - b, w / 2, h / 2));   // 倒角会向外长 b，先缩进去
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return mesh(g, mat, opt);
  }
  function group(parent, at, rotY) { var g = new T.Group(); if (at) g.position.fromArray(at); if (rotY) g.rotation.y = rotY; if (parent) parent.add(g); return g; }
  function lathe(pts, mat, opt) { return mesh(new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), opt && opt.seg || 32), mat, opt); }
  /* 画布贴图平面：draw(ctx, w, h, ppc)；.userData.redraw() 重画 */
  function decal(w, h, draw, opt) {
    opt = opt || {};
    var res = opt.res || 40, c = document.createElement('canvas'); c.width = Math.round(w * res); c.height = Math.round(h * res);
    var ctx = c.getContext('2d'), tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    var mat = new T.MeshBasicMaterial({ map: tex, transparent: !!opt.transparent, color: opt.tint != null ? opt.tint : 0xF2F2F2, depthWrite: !opt.transparent });
    var m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.receiveShadow = false;
    m.userData.redraw = function () { ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height, res); tex.needsUpdate = true; };
    m.userData.redraw();
    return place(m, opt);
  }
  /* ── 障碍物（导线绕开 / 提起的夹子越过）：{x, z, r} 圆或 {x, z, hx, hz} 矩形，top = 顶部高度 ── */
  var OBS = [];
  function obstacle(obj, shape, top, off) {
    var tmp = new T.Vector3();
    OBS.push({ obj: obj, f: function () { obj.updateWorldMatrix(true, false); tmp.set(off ? off[0] : 0, 0, off ? off[1] : 0); obj.localToWorld(tmp); var o = { x: tmp.x, z: tmp.z, top: top }; for (var k in shape) o[k] = shape[k]; return o; } });
  }
  function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
  function inside(o, x, z, m) { return o.r != null ? Math.hypot(x - o.x, z - o.z) < o.r + m : Math.abs(x - o.x) < o.hx + m && Math.abs(z - o.z) < o.hz + m; }
  /* 某处地面上方有多高的器材（提起夹子用） */
  function heightAt(x, z, m) { var h = 0; OBS.forEach(function (ob) { if (!shown(ob.obj)) return; var o = ob.f(); if (inside(o, x, z, m || 0.8)) h = Math.max(h, o.top); }); return h; }
  function hitBox(w, h, d, parent, at) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), M.hit); if (at) m.position.fromArray(at); parent.add(m); return m; }

  /* ── 接线柱 ── */
  function post(parent, at, color) {
    var x = at[0], y = at[1], z = at[2];
    cyl(0.62, 0.3, M.metal, { at: [x, y + 0.15, z], parent: parent });
    cyl(0.42, 0.95, color === 'red' ? M.red : color === 'black' ? M.black : M.brass, { at: [x, y + 0.78, z], parent: parent, seg: 16 });
    var a = new T.Object3D(); a.position.set(x, y + 1.25, z); parent.add(a);
    var h = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 2.4, 10), M.hit); h.position.set(x, y + 0.9, z); parent.add(h);
    a.userData.hit = h;
    return a;
  }
  function wpos(o, out) { o.updateWorldMatrix(true, false); return o.getWorldPosition(out || new T.Vector3()); }

  /* ── 电表：电木底座 + 斜放的白色表壳 + 双排刻度表盘 ── */
  function fmtN(v) { return String(Math.round(v * 100) / 100); }
  function drawDial(ctx, w, h, ppc, letter, ranges) {
    ctx.fillStyle = '#FBFAF4'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2B3035'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    var cx = w / 2, cy = h / 2 + 2.7 * ppc, R = 4.4 * ppc, i, th, s, c, len;
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 - 0.85, -Math.PI / 2 + 0.85); ctx.stroke();
    for (i = 0; i <= 30; i++) {
      th = -0.85 + 1.7 * i / 30; s = Math.sin(th); c = Math.cos(th);
      len = i % 10 === 0 ? 0.5 * ppc : i % 5 === 0 ? 0.34 * ppc : 0.2 * ppc;
      ctx.lineWidth = i % 5 === 0 ? 2.6 : 1.5;
      ctx.beginPath(); ctx.moveTo(cx + R * s, cy - R * c); ctx.lineTo(cx + (R - len) * s, cy - (R - len) * c); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2B3035';
    for (i = 0; i <= 3; i++) {
      th = -0.85 + 1.7 * i / 3; s = Math.sin(th); c = Math.cos(th);
      ctx.font = 'bold ' + (0.56 * ppc) + 'px ' + FONT_NUM; ctx.fillText(fmtN(ranges[1] * i / 3), cx + (R + 0.45 * ppc) * s, cy - (R + 0.45 * ppc) * c);
      ctx.font = (0.5 * ppc) + 'px ' + FONT_NUM; ctx.fillText(fmtN(ranges[0] * i / 3), cx + (R - 0.95 * ppc) * s, cy - (R - 0.95 * ppc) * c);
    }
    ctx.font = 'bold ' + (1.3 * ppc) + 'px ' + FONT_SERIF; ctx.fillText(letter, cx, cy - R * 0.42);
  }
  function meter(parent, o) {
    var ranges = o.ranges, letter = o.letter, order = ['-', ranges[0], ranges[1]];
    var g = group(parent, o.at, o.rotY);
    rbox(11, 2.4, 9, 0.6, M.bakelite, { at: [0, 1.2, 0], parent: g });
    var face = group(g, [0, 2.4, -1.0]); face.rotation.x = -0.62;
    rbox(11, 8.2, 1.1, 0.8, M.body, { at: [0, 4.1, -0.55], parent: face });
    decal(10, 6.6, function (ctx, w, h, ppc) { drawDial(ctx, w, h, ppc, letter, ranges); }, { at: [0, 4.3, 0.02], parent: face, res: 48, tint: 0xFFFFFF });
    var needle = group(face, [0, 1.6, 0.12]);
    box(0.14, 4.5, 0.05, M.needle, { at: [0, 2.25, 0], parent: needle, cast: false });
    cyl(0.32, 0.18, M.needle, { axis: 'z', parent: needle, cast: false });
    // 玻璃罩（很淡）
    box(10.2, 6.8, 0.05, std(0xFFFFFF, { r: 0.05, tr: true, op: 0.08, dw: false }), { at: [0, 4.3, 0.5], parent: face, cast: false });
    var m = { group: g, face: face, letter: letter, ranges: ranges, posts: {}, value: 0, range: null, ang: 0.85, t: 0 };
    order.forEach(function (k, i) { var p = post(g, [-3.2 + i * 3.2, 2.4, 3.0], k === '-' ? 'black' : 'red'); m.posts[String(k)] = p; p.userData.term = String(k); });
    decal(10.4, 1.3, function (ctx, w, h, ppc) {
      ctx.fillStyle = '#E8E4D8'; ctx.fillRect(0, 0, w, h);
      ctx.font = 'bold ' + (0.8 * ppc) + 'px ' + FONT_NUM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      order.forEach(function (k, i) { ctx.fillStyle = k === '-' ? '#26292C' : '#C62828'; ctx.fillText(k === '-' ? '−' : String(k), (5.2 - 3.2 + i * 3.2) * ppc, h / 2 + 1); });
    }, { at: [0, 2.41, 4.35], rot: [-Math.PI / 2, 0, 0], parent: g, res: 44, tint: 0xFFFFFF });
    m.set = function (v, r) { m.value = v; m.range = r; return m; };
    /* 指针位置（满偏 = 1）：超量程打到右边挡钉并抖动；反接打到左边挡钉并抖动 */
    m.target = function () {
      if (m.range == null) return 0;
      var R = m.range, v = m.value;
      if (v > R * 1.02) return 1.07 + Math.sin(m.t * 47) * 0.012;
      if (v < -R * 0.07) return -0.07 + Math.sin(m.t * 47) * 0.012;
      return clamp(v / R, -0.07, 1.07);
    };
    m.frac = function () { return (0.85 - m.ang) / 1.7; };
    m.update = function (dt) {
      m.t += dt;
      var tg = 0.85 - 1.7 * m.target();
      m.ang += (tg - m.ang) * Math.min(1, dt * 9);
      if (Math.abs(tg - m.ang) < 1e-4) m.ang = tg;
      needle.rotation.z = m.ang;
      return m;
    };
    m.snap = function () { m.ang = 0.85 - 1.7 * m.target(); needle.rotation.z = m.ang; };
    Object.defineProperty(m, 'over', { get: function () { return m.range != null && m.value > m.range * 1.02; } });
    Object.defineProperty(m, 'reversed', { get: function () { return m.range != null && m.value < -m.range * 0.02; } });
    m.hit = hitBox(11, 11, 10, g, [0, 5, 0]);
    obstacle(g, { hx: 5.6, hz: 3.25 }, TOP + 10, [0, -1.25]);
    return m;
  }

  /* ── 电池盒（1 号干电池串联）── */
  var cellMat = null;
  function cellTex() {
    if (cellMat) return cellMat;
    var ppc = 24, W = Math.round(2 * Math.PI * 1.7 * ppc), H = Math.round(5.8 * ppc), c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2E6FB7'); gr.addColorStop(0.5, '#3D86D1'); gr.addColorStop(1, '#2E6FB7');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,30,60,.55)'; g.fillRect(0, 0, W, 0.2 * ppc); g.fillRect(0, H - 0.2 * ppc, W, 0.2 * ppc);
    g.fillStyle = '#F5F7FA'; g.fillRect(0, H * 0.42, W, H * 0.16);
    g.save(); g.translate(W / 2, H * 0.5); g.rotate(-Math.PI / 2); g.fillStyle = '#1E3A5F'; g.font = 'bold ' + (0.62 * ppc) + 'px ' + FONT_NUM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1.5V', 0, 0); g.restore();
    var cx = W / 2, cy = H - 0.9 * ppc, r = 0.42 * ppc;
    g.strokeStyle = '#fff'; g.lineWidth = 0.12 * ppc; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
    var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    cellMat = new T.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.2 });
    return cellMat;
  }
  function battery(parent, o) {
    var cells = o.cells || 2, s = o.plusLeft ? -1 : 1, g = group(parent, o.at, o.rotY);
    var CB = 5.8, CR = 1.7, PITCH = 6.26, END = 1.8, W = 4.2, H0 = 0.5, Lc = cells * PITCH + 0.24, px = Lc / 2 + END / 2;
    box(Lc + 2 * END, H0, W, M.bakelite, { at: [0, H0 / 2, 0], parent: g });
    box(Lc, 2.0, 0.3, M.bakelite, { at: [0, H0 + 1.0, -W / 2 + 0.15], parent: g });
    box(Lc, 0.9, 0.3, M.bakelite, { at: [0, H0 + 0.45, W / 2 - 0.15], parent: g });
    [-1, 1].forEach(function (k) { rbox(END, 4.4, W, 0.3, M.bakelite, { at: [k * px, 2.2, 0], parent: g }); });
    var mat = cellTex(), cy = H0 + CR + 0.02;
    for (var i = 0; i < cells; i++) {
      var x = -Lc / 2 + 0.24 + CB / 2 + i * PITCH, cg = group(g, [x, cy, 0]);
      if (s < 0) cg.rotation.y = Math.PI;
      var b = cyl(CR, CB, mat, { axis: 'x', parent: cg, seg: 40 }); b.rotation.x = Math.PI;
      cyl(CR * 0.94, 0.12, M.metal, { axis: 'x', at: [-(CB / 2 + 0.06), 0, 0], parent: cg, cast: false });
      cyl(CR * 0.94, 0.12, M.metal, { axis: 'x', at: [CB / 2 + 0.06, 0, 0], parent: cg, cast: false });
      cyl(0.5, 0.22, M.steel, { axis: 'x', at: [CB / 2 + 0.23, 0, 0], parent: cg, cast: false });
    }
    var bx = { group: g, posts: {}, length: Lc + 2 * END };
    bx.posts['+'] = post(g, [s * px, 4.4, 0.5], 'red');
    bx.posts['-'] = post(g, [-s * px, 4.4, 0.5], 'black');
    if (o.mid && cells === 2) {   // 两节之间的抽头：前壁中间的小凸台
      rbox(1.8, 1.6, 1.6, 0.25, M.bakelite, { at: [0, 0.8, W / 2 + 0.7], parent: g });
      bx.posts.m = post(g, [0, 1.6, W / 2 + 0.7], 'brass');
    }
    [[s, '+', '#C62828'], [-s, '−', '#26292C']].forEach(function (q) {
      decal(1.2, 1.2, function (ctx, w, h, ppc) {
        ctx.fillStyle = '#E8E4D8'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 1, 0, 7); ctx.fill();
        ctx.fillStyle = q[2]; ctx.font = 'bold ' + (1.0 * ppc) + 'px ' + FONT_NUM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q[1], w / 2, h / 2 + 2);
      }, { at: [q[0] * px, 2.4, W / 2 + 0.01], parent: g, res: 60, transparent: true, tint: 0xFFFFFF });
    });
    bx.hit = hitBox(Lc + 2 * END, 4.6, W, g, [0, 2.3, 0]);
    obstacle(g, { hx: Lc / 2 - 0.3, hz: W / 2 }, TOP + 4.6);
    return bx;
  }

  /* ── 闸刀开关 ── */
  function knife(parent, o) {
    var g = group(parent, o.at, o.rotY);
    rbox(11, 0.9, 4.4, 0.4, M.bakelite, { at: [0, 0.45, 0], parent: g });
    [3.4, -3.6].forEach(function (x) { [-0.36, 0.36].forEach(function (dz) { box(0.9, 1.9, 0.16, M.metal, { at: [x, 1.8, -0.5 + dz], parent: g }); }); });
    var blade = group(g, [3.4, 2.05, -0.5]);
    box(7.6, 0.22, 0.55, M.metal, { at: [-3.8, 0, 0], parent: blade });
    cyl(0.48, 2.2, std(0x2B2F33, { r: 0.45 }), { at: [-7.3, 1.1, 0], parent: blade });
    var OPEN = -1.0, sw = { group: g, blade: blade, closed: false, ang: OPEN, posts: {} };
    blade.rotation.z = OPEN;
    sw.posts.L = post(g, [-3.6, 0.9, 1.35], 'brass'); sw.posts.R = post(g, [3.4, 0.9, 1.35], 'brass');
    sw.set = function (v, instant) { sw.closed = !!v; if (instant) { sw.ang = sw.closed ? 0 : OPEN; blade.rotation.z = sw.ang; } return sw; };
    sw.update = function (dt) { var tg = sw.closed ? 0 : OPEN; if (Math.abs(sw.ang - tg) > 1e-4) { sw.ang += (tg - sw.ang) * Math.min(1, dt * 14); blade.rotation.z = sw.ang; } return sw; };
    sw.hit = hitBox(11, 6.5, 4.4, g, [0, 3, -0.3]);
    return sw;
  }

  /* ── 小灯泡（螺口灯座 + 电木底座 + 两个接线柱）── */
  var glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    [[0, 'rgba(255,255,236,1)'], [0.12, 'rgba(255,240,180,.95)'], [0.3, 'rgba(255,205,90,.65)'], [0.55, 'rgba(255,170,50,.25)'], [0.8, 'rgba(255,150,30,.07)'], [1, 'rgba(255,140,20,0)']].forEach(function (q) { r.addColorStop(q[0], q[1]); });
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    glowTex = new T.CanvasTexture(c); glowTex.colorSpace = T.SRGBColorSpace;
    return glowTex;
  }
  var coolTex = null;
  function coolTexture() {   // LED 的冷白光晕
    if (coolTex) return coolTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    [[0, 'rgba(255,255,255,1)'], [0.14, 'rgba(240,248,255,.95)'], [0.32, 'rgba(205,228,255,.6)'], [0.58, 'rgba(170,205,255,.22)'], [0.82, 'rgba(150,190,255,.06)'], [1, 'rgba(140,180,255,0)']].forEach(function (q) { r.addColorStop(q[0], q[1]); });
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    coolTex = new T.CanvasTexture(c); coolTex.colorSpace = T.SRGBColorSpace;
    return coolTex;
  }
  function bulb(parent, o) {
    var S = o.scale || 2, g = group(parent, o.at, o.rotY);
    rbox(8.4, 0.9, 4, 0.4, M.bakelite, { at: [0, 0.45, 0], parent: g });
    var sock = group(g, [0, 0.9, -0.3]); sock.scale.setScalar(S);
    lathe([[0, 0], [1.25, 0], [1.25, 0.32], [1.0, 0.45], [1.0, 1.3], [0.78, 1.42], [0.78, 1.55], [0, 1.55]], M.body, { parent: sock, seg: 40 });
    var lamp = group(sock, [0, 1.55, 0]), screw = [[0, -0.05], [0.42, -0.05]];
    for (var i = 0; i < 8; i++) screw.push([i % 2 ? 0.47 : 0.53, 0.05 + i * 0.1]);
    screw.push([0.46, 0.82], [0.46, 0.9], [0, 0.9]);
    lathe(screw, std(0xC4C9CE, { r: 0.3, m: 0.85 }), { parent: lamp, seg: 32 });
    var glassMat = new T.MeshStandardMaterial({ color: 0xF4F8FC, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false });
    var inc = group(lamp);   // 普通小灯泡：玻璃泡 + 支架 + 钨丝
    var glass = lathe([[0.4, 0.82], [0.44, 1.0], [0.6, 1.22], [0.85, 1.5], [0.97, 1.86], [0.95, 2.18], [0.83, 2.48], [0.6, 2.7], [0.3, 2.83], [0, 2.86]], glassMat, { parent: inc, seg: 40, cast: false });
    glass.renderOrder = 2;
    var fy = 1.95, sup = std(0x9AA3AA, { r: 0.3, m: 0.7 });
    [-0.3, 0.3].forEach(function (x) { cyl(0.025, fy - 0.9, sup, { at: [x, (fy + 0.9) / 2, 0], parent: inc, cast: false, seg: 6 }); });
    var hel = [];
    for (i = 0; i <= 64; i++) { var k = i / 64, a = k * Math.PI * 14; hel.push(new T.Vector3(-0.3 + 0.6 * k, fy + Math.sin(a) * 0.06, Math.cos(a) * 0.06)); }
    var hc = new T.CatmullRomCurve3(hel);
    mesh(new T.TubeGeometry(hc, 120, 0.024, 6), std(0x4A4038, { r: 0.6 }), { parent: inc, cast: false });
    var hot = new T.MeshBasicMaterial({ color: 0xFFD27A, toneMapped: false }), hotM = new T.Mesh(new T.TubeGeometry(hc, 120, 0.045, 6), hot);
    inc.add(hotM);
    /* LED 小灯（外观）：白色塑料灯座 + 乳白灯罩，里面一圈黄色芯片；发光时灯罩整体亮白 */
    var led = group(lamp); led.visible = false;
    var collar = [[0, 0.8], [0.48, 0.8]];   // 白色散热座：一圈一圈的筋
    for (var c2 = 0; c2 < 5; c2++) collar.push([0.6 + 0.04 * c2, 0.9 + c2 * 0.15], [0.54 + 0.04 * c2, 0.97 + c2 * 0.15]);
    collar.push([0.8, 1.68], [0, 1.68]);
    lathe(collar, std(0xF4F5F2, { r: 0.45 }), { parent: led, seg: 32 });
    box(1.1, 0.04, 0.5, std(0xE6C34A, { r: 0.4 }), { at: [0, 1.7, 0], parent: led, cast: false });   // 灯珠板（黄色芯片）
    var domeMat = new T.MeshStandardMaterial({ color: 0xF2F6FB, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.78, emissive: 0xFFFFFF, emissiveIntensity: 0, depthWrite: false });
    var dome = lathe([[0.8, 1.66], [0.8, 1.8], [0.74, 2.02], [0.6, 2.2], [0.4, 2.32], [0, 2.38]], domeMat, { parent: led, seg: 40, cast: false });
    dome.renderOrder = 2;
    var innerMat = new T.MeshBasicMaterial({ color: 0xFFD25A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var inner = new T.Mesh(new T.SphereGeometry(0.84, 24, 16), innerMat); inner.position.set(0, 1.86, 0); inner.renderOrder = 3; lamp.add(inner);
    var halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: 0xFFD27A, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    halo.position.set(0, fy, 0); halo.renderOrder = 4; lamp.add(halo);
    var L = { group: g, lamp: lamp, power: 0, posts: {}, style: 'bulb' };
    L.posts.L = post(g, [-3.1, 0.9, 1.0], 'brass'); L.posts.R = post(g, [3.1, 0.9, 1.0], 'brass');
    var FIL = [new T.Color(0xFF3A0A), new T.Color(0xFF9A2E), new T.Color(0xFFF6DC)], TINT = [new T.Color(0xFF6A2A), new T.Color(0xFFB060), new T.Color(0xFFE9A0)], col = new T.Color();
    function ramp(cs, k) { return k < 0.45 ? col.copy(cs[0]).lerp(cs[1], k / 0.45) : col.copy(cs[1]).lerp(cs[2], Math.min(1, (k - 0.45) / 0.55)); }
    /* f = 实际功率 / 参考功率（1 = 正常发光，>1 更亮）；不到 2% 看不出发光 */
    var LEDC = [new T.Color(0xE8F0FF), new T.Color(0xF4F8FF), new T.Color(0xFFFFFF)];
    L.setStyle = function (st) {
      L.style = st === 'led' ? 'led' : 'bulb'; inc.visible = L.style === 'bulb'; led.visible = L.style === 'led';
      halo.material.map = L.style === 'led' ? coolTexture() : glowTexture(); halo.material.needsUpdate = true;
      halo.position.y = L.style === 'led' ? 2.05 : fy;
      return L.setPower(L.power);
    };
    L.setPower = function (f) {
      L.power = Math.max(0, f || 0);
      var k = clamp((L.power - 0.02) / 0.98, 0, 1.5), on = k > 0;
      hotM.visible = inner.visible = halo.visible = on;
      domeMat.emissiveIntensity = 0;
      if (on && L.style === 'led') {   // LED：灯罩自身发白光，光晕偏冷白
        inner.visible = false; hotM.visible = false;
        domeMat.emissiveIntensity = Math.min(1.1, 0.35 + 0.6 * k);
        halo.material.color.copy(ramp(LEDC, k));
        halo.material.opacity = Math.min(1, 0.3 + 0.7 * Math.pow(k, 0.6));
        var s2 = 1.4 + 2.2 * Math.min(1.25, k); halo.scale.set(s2, s2, 1);
        return L;
      }
      if (!on) return L;
      hot.color.copy(ramp(FIL, k));
      var tint = ramp(TINT, k);
      halo.material.color.copy(tint); innerMat.color.copy(tint);
      innerMat.opacity = Math.min(0.8, 0.7 * Math.pow(k, 0.7));
      halo.material.opacity = Math.min(1, 0.25 + 0.75 * Math.pow(k, 0.6));
      var s = 1.3 + 2.2 * Math.min(1.25, k); halo.scale.set(s, s, 1);
      return L;
    };
    /* 按实际功率（W）发光：亮度感觉近似按对数变化，功率差 1.6 倍也看得出一亮一暗 */
    L.setWatts = function (P) { return L.setPower(P < 0.004 ? 0 : Math.max(0, 0.05 + 0.62 * (1 + Math.log2(P / 0.25)))); };
    L.setPower(0);
    L.hit = hitBox(8.4, 6.2, 4, g, [0, 3, 0]);
    obstacle(g, { r: 2.6 }, TOP + 10, [0, -0.3]);
    return L;
  }

  /* ── 定值电阻（色环 + 阻值牌）── */
  var BAND = { black: 0x1C1C1C, brown: 0x7A4A24, red: 0xC92A2A, orange: 0xE8590C, yellow: 0xF2C230, green: 0x2B8A3E, blue: 0x1C5BD6, violet: 0x7B3FB5, gray: 0x868E96, white: 0xEEF0F2, gold: 0xC9A227 };
  var DIGIT = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray', 'white'];
  function bands(ohms) {
    var e = Math.floor(Math.log10(ohms)) - 1, v = Math.round(ohms / Math.pow(10, e));
    if (v >= 100) { v = 10; e += 1; }
    return [DIGIT[Math.floor(v / 10)], DIGIT[v % 10], e === -1 ? 'gold' : DIGIT[clamp(e, 0, 9)], 'gold'];
  }
  function resistor(parent, o) {
    var g = group(parent, o.at, o.rotY);
    rbox(11, 1.0, 4.2, 0.4, M.bakelite, { at: [0, 0.5, 0], parent: g });
    [-4, 4].forEach(function (x) { box(0.9, 2.2, 0.9, M.metal, { at: [x, 2.1, -0.7], parent: g }); });
    var body = group(g, [0, 2.9, -0.7]);
    cyl(0.08, 8.0, std(0xB4BAC0, { r: 0.38, m: 0.55 }), { axis: 'x', parent: body, cast: false });
    cyl(0.9, 4.6, std(0xD8C7A0, { r: 0.6 }), { axis: 'x', parent: body });
    var bm = [0, 1, 2, 3].map(function () { return std(0x000000, { r: 0.5 }); });
    [-1.5, -0.8, -0.1, 1.4].forEach(function (x, i) { cyl(0.93, 0.32, bm[i], { axis: 'x', at: [x, 0, 0], parent: body, cast: false }); });
    var r = { group: g, ohms: o.ohms, label: o.label, posts: {} };
    var plate = decal(3.4, 1.5, function (ctx, w, h, ppc) {
      ctx.fillStyle = '#F3EFE4'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#2B3035'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = '#1E3A5F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (r.label) { ctx.font = 'italic bold ' + (1.05 * ppc) + 'px ' + FONT_SERIF; ctx.fillText('R', w / 2 - 0.2 * ppc, h / 2); ctx.font = 'italic bold ' + (0.65 * ppc) + 'px ' + FONT_SERIF; ctx.fillText('x', w / 2 + 0.38 * ppc, h / 2 + 0.3 * ppc); }
      else { ctx.font = 'bold ' + (1.0 * ppc) + 'px ' + FONT_NUM; ctx.fillText(r.ohms + ' Ω', w / 2, h / 2 + 1); }
    }, { at: [0, 1.01, 1.0], rot: [-Math.PI / 2, 0, 0], parent: g, res: 48, tint: 0xFFFFFF });
    r.setOhms = function (R) { r.ohms = R; bands(R).forEach(function (c, i) { bm[i].color.setHex(BAND[c]); }); plate.userData.redraw(); return r; };
    r.setOhms(o.ohms);
    if (!o.noPosts) { r.posts.L = post(g, [-4.7, 1.0, 1.1], 'brass'); r.posts.R = post(g, [4.7, 1.0, 1.1], 'brass'); }
    r.hit = hitBox(11, 4, 4.2, g, [0, 2, 0]);
    if (!o.noPosts) obstacle(g, { hx: 3.2, hz: 1.4 }, TOP + 4, [0, -0.7]);
    return r;
  }

  /* ── 滑动变阻器（A：线圈左端，下；D：金属杆右端，上）── */
  var coilTex0 = null;
  function rheostat(parent, o) {
    var L = o.length || 24, ex = L / 2 + 1.3, g = group(parent, o.at, o.rotY);
    [-ex, ex].forEach(function (x) { rbox(2.6, 5.2, 4, 0.3, M.bakelite, { at: [x, 2.6, 0], parent: g }); });
    if (!coilTex0) {
      var cc = document.createElement('canvas'); cc.width = 64; cc.height = 8; var cg = cc.getContext('2d');
      cg.fillStyle = '#B87333'; cg.fillRect(0, 0, 64, 8); cg.fillStyle = '#6E3B17'; cg.fillRect(0, 6, 64, 2); cg.fillStyle = 'rgba(255,230,190,.35)'; cg.fillRect(0, 1, 64, 2);
      coilTex0 = new T.CanvasTexture(cc); coilTex0.colorSpace = T.SRGBColorSpace;
    }
    var tex = coilTex0.clone(); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 80 * L / 24); tex.needsUpdate = true;
    cyl(1.8, L, new T.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.35 }), { axis: 'x', at: [0, 2.6, 0], parent: g, seg: 32 });
    // 接入电路的那段电阻丝：橙色高亮（随滑片变长变短）
    var hlMat = new T.MeshBasicMaterial({ color: 0xFE752D, transparent: true, opacity: 0.38, depthWrite: false });
    var hl = new T.Mesh(new T.CylinderGeometry(1.86, 1.86, 1, 32, 1, true).rotateZ(Math.PI / 2), hlMat); hl.position.y = 2.6; hl.renderOrder = 2; g.add(hl);
    cyl(0.34, L + 3.4, M.rod, { axis: 'x', at: [0, 5.75, 0], parent: g });
    var slider = group(g), sm = std(0x1E3A5F, { r: 0.45 }), grip = std(0xFE752D, { r: 0.5 });
    rbox(2.3, 1.6, 2.6, 0.3, sm, { at: [0, 5.75, 0], parent: slider });
    box(0.6, 1.9, 1.1, sm, { at: [0, 4.3, 0], parent: slider });
    box(0.8, 0.12, 0.9, M.metal, { at: [0, 3.35, 0], parent: slider, cast: false });
    cyl(0.6, 1.2, grip, { at: [0, 7.1, 0], parent: slider });
    var rh = { group: g, slider: slider, length: L, Rmax: o.Rmax || 20, p: 1, posts: {} };
    rh.set = function (p) { rh.p = clamp(p, 0, 1); slider.position.x = -L / 2 + rh.p * L; var len = Math.max(0.001, rh.p * L); hl.scale.x = len; hl.position.x = -L / 2 + len / 2; hl.visible = rh.p > 0.004; return rh; };
    rh.R = function () { return rh.p * rh.Rmax; };
    rh.posts.A = post(g, [-ex, 0, 3.0], 'brass');
    rh.posts.D = post(g, [ex, 5.2, 1.2], 'brass');
    decal(2.4, 2.2, function (ctx, w, h, ppc) {
      ctx.fillStyle = '#F3EFE4'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#2B3035'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = '#2B3035'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (0.7 * ppc) + 'px ' + FONT_NUM; ctx.fillText(rh.Rmax + 'Ω', w / 2, h * 0.36); ctx.font = (0.55 * ppc) + 'px ' + FONT_NUM; ctx.fillText('2A', w / 2, h * 0.72);
    }, { at: [-ex, 2.9, 2.02], parent: g, res: 50, tint: 0xFFFFFF });
    rh.hit = hitBox(3.4, 4.6, 3.6, slider, [0, 5.4, 0]);
    obstacle(g, { hx: L / 2, hz: 1.9 }, TOP + 7.8);
    rh.set(o.p != null ? o.p : 1);
    var tmp = new T.Vector3();
    /* 跟手拖动：找滑片位置 p，使滑片（含按下点的偏移）在屏幕上离目标点最近 */
    rh.screenAt = function (Vw, p, off) { tmp.set(-L / 2 + p * L, 0, 0).add(off || new T.Vector3()); return Vw.toScreen(g.localToWorld(tmp.clone())); };
    rh.fit = function (Vw, target, off) { return fit(function (p) { return rh.screenAt(Vw, p, off); }, target, 0, 1); };
    return rh;
  }
  function fit(fn, target, lo, hi) {
    var best = lo, bd = 1e18, n = 120, i, t, s, d;
    for (i = 0; i <= n; i++) { t = lo + (hi - lo) * i / n; s = fn(t); d = (s.x - target.x) * (s.x - target.x) + (s.y - target.y) * (s.y - target.y); if (d < bd) { bd = d; best = t; } }
    var step = (hi - lo) / n;
    for (var k = 0; k < 3; k++) {
      var a = Math.max(lo, best - step), b = Math.min(hi, best + step);
      for (i = 0; i <= 20; i++) { t = a + (b - a) * i / 20; s = fn(t); d = (s.x - target.x) * (s.x - target.x) + (s.y - target.y) * (s.y - target.y); if (d < bd) { bd = d; best = t; } }
      step = (b - a) / 20;
    }
    return best;
  }

  /* ── 鳄鱼夹（竖直夹在接线柱上，导线从上端引出）── */
  function clip(parent, color) {
    var g = group(parent), cm = color === 'red' ? M.red : M.black; g.scale.setScalar(1.35);
    var sleeve = lathe([[0, 0], [0.5, 0], [0.62, 0.8], [0.6, 2.1], [0.36, 2.6], [0.3, 3.0], [0, 3.0]], cm, { parent: g, seg: 20 });
    sleeve.position.y = 0.9;
    box(0.9, 1.1, 0.22, M.steel, { at: [0, 0.55, 0.16], parent: g });
    box(0.9, 1.1, 0.22, M.steel, { at: [0, 0.55, -0.16], parent: g });
    var c = { group: g, color: color };
    c.hit = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 4.6, 10), M.hit); c.hit.position.y = 2; g.add(c.hit);
    c.place = function (v) { g.position.copy(v); return c; };
    c.top = function () { return g.position.clone().add(new T.Vector3(0, 3.8 * 1.35, 0)); };
    return c;
  }

  /* ── 电压表的两根表线（红、黑鳄鱼夹）：拖夹子，松手吸到最近的接线柱 ──
     o = {meter, P: 接点表, targets(): 可夹的接点名, range(): '3'|'15'}；st = {red: 接点名, black: 接点名}
     L.specs() → 两根表线的导线描述（交给 W.set）；L.place() 摆好夹子；L.hits；L.start(ev, hit) / move(ev) / end() → 'snap'|'back'|null */
  function leads(o) {
    var red = clip(V.scene, 'red'), black = clip(V.scene, 'black'), st = { red: null, black: null }, g = null, tmp = new T.Vector3();
    red.hit.userData.act = 'clip:red'; black.hit.userData.act = 'clip:black';
    function at(key) { return wpos(o.P[key]).add(new T.Vector3(0, -0.7, 0.55)); }
    var L = {
      st: st, red: red, black: black, hits: [red.hit, black.hit],
      place: function () { if (!g || g.c !== 'red') red.place(at(st.red)); if (!g || g.c !== 'black') black.place(at(st.black)); },
      specs: function () {
        return [{ id: 'vR', a: o.meter.posts[o.range()], b: red.top(), color: 'red', upB: 0.6, arc: 0.08 }, { id: 'vB', a: o.meter.posts['-'], b: black.top(), color: 'black', upB: 0.6, arc: 0.08 }];
      },
      dragging: function () { return g ? g.c : null; },
      start: function (ev, hit) {
        var c = CC_actC(hit); if (!c) return false;
        var obj = c === 'red' ? red : black;
        g = { c: c, obj: obj, y: hit.point.y, off: obj.group.position.clone().sub(hit.point), x: ev.clientX, yy: ev.clientY, moved: false, from: st[c] };
        return true;
      },
      move: function (ev) {
        if (!g) return;
        if (!g.moved && Math.hypot(ev.clientX - g.x, ev.clientY - g.yy) < 4) return;   // 没动就不改
        g.moved = true;
        var p = V.onPlane(ev, new T.Plane(new T.Vector3(0, 1, 0), -g.y)); if (!p) return;
        p.add(g.off); p.y = Math.max(p.y, heightAt(p.x, p.z, 0.5) + 0.4);   // 越过器材时把夹子提起来
        g.obj.group.position.copy(p);
      },
      end: function () {
        var me = g; g = null; if (!me) return null;
        if (!me.moved) { L.place(); return null; }
        var pos = me.obj.group.position, best = null, bd = 25, other = st[me.c === 'red' ? 'black' : 'red'];
        o.targets().forEach(function (k) { var a = at(k), d = (a.x - pos.x) * (a.x - pos.x) + (a.z - pos.z) * (a.z - pos.z); if (d < bd) { bd = d; best = k; } });
        if (best && best === other) { L.place(); return 'busy'; }
        if (best) { st[me.c] = best; L.place(); return best === me.from ? null : 'snap'; }
        L.place(); return 'back';
      }
    };
    function CC_actC(hit) { var a = actOf(hit); return a === 'clip:red' ? 'red' : a === 'clip:black' ? 'black' : null; }
    return L;
  }

  /* ── 实验板与印字 ── */
  function board(w, d) {
    var g = group(V.scene);
    rbox(w, d, TOP, 1.2, M.board, { parent: g, rot: [-Math.PI / 2, 0, 0], at: [0, TOP / 2, 0] });
    return g;
  }
  function printOn(parent, text, at, o) {
    o = o || {};
    var size = o.size || 2.2, w = o.w || Math.max(size * 1.2, String(text).replace('_', '').split('').reduce(function (n, ch) { return n + (ch.charCodeAt(0) > 0x2E80 ? 1.1 : 0.66); }, 0) * size + size * 0.8), h = o.h || size * 1.35;
    return decal(w, h, function (ctx, W, H, ppc) {
      ctx.fillStyle = o.color || '#1E3A5F'; ctx.textBaseline = 'middle';
      var pre = (o.italic ? 'italic ' : '') + (o.bold === false ? '' : 'bold '), f = pre + (size * ppc) + 'px ' + (o.font || FONT_CN), parts = String(text).split('_');
      if (parts.length === 2) {   // “R_x”：x 画成下标
        var fs = pre + (size * ppc * 0.6) + 'px ' + (o.font || FONT_CN);
        ctx.font = f; var w1 = ctx.measureText(parts[0]).width; ctx.font = fs; var w2 = ctx.measureText(parts[1]).width, x0 = W / 2 - (w1 + w2) / 2;
        ctx.textAlign = 'left'; ctx.font = f; ctx.fillText(parts[0], x0, H / 2); ctx.font = fs; ctx.fillText(parts[1], x0 + w1, H / 2 + size * ppc * 0.3);
        return;
      }
      ctx.font = f; ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, H / 2 + size * ppc * 0.06);
    }, { at: [at[0], at[1] != null ? at[1] : TOP + 0.02, at[2]], rot: o.rot || [-Math.PI / 2, 0, 0], parent: parent, res: o.res || 40, transparent: true, tint: 0xFFFFFF });
  }
  function ring(parent, at, color) {
    var m = new T.Mesh(new T.RingGeometry(0.85, 1.25, 32), new T.MeshBasicMaterial({ color: color || 0x1E3A5F, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(at[0], at[1] != null ? at[1] : TOP + 0.03, at[2]); parent.add(m);
    return m;
  }

  /* ── 浮动标签（HTML，不会被导线挡住；每页最多 5 个）：测点圆圈字母、灯泡名称 ── */
  function markTag(id, letter) {
    var t = V.tag(id, letter);
    t.style.cssText += ';width:40px;height:40px;padding:0;border-radius:50%;text-align:center;line-height:36px;transform:translate(-50%,-50%);font:italic 600 26px "Times New Roman",serif';
    return t;
  }
  function nameTag(id) { var t = V.tag(id, ''); t.style.transform = 'translate(-50%, 6px)'; return t; }   // 名称牌挂在锚点下方
  function showTag(id, pos, on) { if (on && pos) V.placeTag(id, pos); else V.tag(id).style.display = 'none'; }

  /* ── 导线 ── */
  function wires(scene) {
    var grp = group(scene), dots = group(scene), map = {}, flowOn = false;
    var dotGeo = new T.SphereGeometry(0.42, 12, 8), dotMat = new T.MeshBasicMaterial({ color: 0xFE752D });
    function P(e) { if (!e) return null; if (e.isVector3) return e.clone(); if (e.isObject3D) return wpos(e); return new T.Vector3().fromArray(e); }
    /* 走线：两端先竖直抬起，中间拱起；路上有高的器材（灯泡、电表、变阻器）就从旁边绕过去，矮的（电池盒、电阻）就从上面跨过去 */
    function blocks(a, b, tall) {
      var best = null, bt = 2;
      OBS.forEach(function (ob) {
        if (!shown(ob.obj)) return;
        var o = ob.f(); if ((o.top > TOP + 6.5) !== tall) return;
        for (var i = 1; i < 30; i++) { var t = i / 30, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (inside(o, x, z, 0.5)) { if (t < bt) { bt = t; best = o; } break; } }
      });
      return best;
    }
    function detour(a, b, depth) {
      var o = blocks(a, b, true); if (!o || depth > 3) return [];
      var dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
      var side = (o.x - a.x) * nx + (o.z - a.z) * nz >= 0 ? -1 : 1;
      var cl = (o.r != null ? o.r : Math.abs(o.hx * nx) + Math.abs(o.hz * nz)) + 1.6;
      var v = new T.Vector3(o.x + side * nx * cl, 0, o.z + side * nz * cl);
      return detour(a, v, depth + 1).concat([v], detour(v, b, depth + 1));
    }
    function lowTop(pts) { var h = 0; for (var i = 0; i < pts.length - 1; i++) { var o = blocks(pts[i], pts[i + 1], false); if (o) h = Math.max(h, o.top + 1.4); } return h; }
    function route(a, b, w) {
      var up = w.up != null ? w.up : 2.2, la = a.clone(), lb = b.clone(); la.y += up; lb.y += (w.upB != null ? w.upB : up);
      if (w.via) return [a, la].concat(w.via.map(function (p) { return new T.Vector3().fromArray(p); }), [lb, b]);
      var vs = detour(a, b, 0), hl = lowTop([a].concat(vs, [b]));
      if (vs.length) {
        var y = Math.max(TOP + 3, Math.min(la.y, lb.y), hl);
        return [a, la].concat(vs.map(function (v) { return v.setY(y); }), [lb, b]);
      }
      var mid = a.clone().lerp(b, 0.5); mid.y = Math.max(Math.max(a.y, b.y) + up + a.distanceTo(b) * (w.arc != null ? w.arc : 0.12), hl);
      return [a, la, mid, lb, b];
    }
    var api = {
      set: function (list) {
        var seen = {}, ok = OBS.map(function (ob) { if (!shown(ob.obj)) return ''; var o = ob.f(); return o.x.toFixed(1) + ',' + o.z.toFixed(1); }).join(';');
        list.forEach(function (s) {
          var w = map[s.id]; if (!w) { w = map[s.id] = { id: s.id, I: 0, ph: 0, dots: [] }; }
          seen[s.id] = 1;
          var a = P(s.a), b = P(s.b), key = [a.x, a.y, a.z, b.x, b.y, b.z].map(function (n) { return n.toFixed(2); }).join(',') + '|' + (s.color || 'red') + '|' + JSON.stringify(s.via || 0) + (s.up || '') + (s.arc || '') + '|' + ok;
          w.I = s.I || 0;
          if (key === w.key) return;
          w.key = key;
          if (w.mesh) { grp.remove(w.mesh); w.mesh.geometry.dispose(); }
          var pts = route(a, b, s);
          w.curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.35); w.len = w.curve.getLength();
          w.mesh = mesh(new T.TubeGeometry(w.curve, Math.max(24, Math.round(w.len * 1.5)), 0.24, 8), M.wire[s.color || 'red'] || M.wire.red, { parent: grp });
        });
        Object.keys(map).forEach(function (id) {
          if (seen[id]) return;
          var w = map[id]; if (w.mesh) { grp.remove(w.mesh); w.mesh.geometry.dispose(); }
          w.dots.forEach(function (d) { dots.remove(d); });
          delete map[id];
        });
      },
      flow: function (on) { flowOn = !!on; },
      update: function (dt) {
        Object.keys(map).forEach(function (id) {
          var w = map[id], on = flowOn && Math.abs(w.I) > 0.004, n = Math.max(2, Math.round(w.len / 5));
          while (w.dots.length < n) { var d = new T.Mesh(dotGeo, dotMat); dots.add(d); w.dots.push(d); }
          w.dots.forEach(function (d, i) { d.visible = on && i < n; });
          if (!on) return;
          w.ph += dt * Math.min(30, 8 + 40 * Math.abs(w.I)) * Math.sign(w.I);
          for (var i = 0; i < n; i++) { var u = ((w.ph / w.len + i / n) % 1 + 1) % 1; w.dots[i].position.copy(w.curve.getPointAt(u)); }
        });
      },
      get: function (id) { return map[id]; }
    };
    return api;
  }

  /* ── 电路求解（节点电压法，导线 1 mΩ，所有节点对地 1 nS 漏电导防止悬空）── */
  function net() {
    var nodes = {}, list = [], els = [], gnd = null;
    function n(k) { if (!(k in nodes)) { nodes[k] = list.length; list.push(k); } return nodes[k]; }
    var api = {
      R: function (a, b, R, id) { els.push({ a: n(a), b: n(b), g: 1 / R, E: 0, id: id }); return api; },
      cell: function (neg, pos, E, r, id) { els.push({ a: n(neg), b: n(pos), g: 1 / r, E: E, id: id }); return api; },
      wire: function (a, b, id) { return api.R(a, b, 1e-3, id); },
      ground: function (k) { gnd = n(k); return api; },
      solve: function () {
        var N = list.length, G = [], I = [], i, j, k;
        for (i = 0; i < N; i++) { G.push(new Float64Array(N)); I.push(0); G[i][i] = 1e-9; }
        els.forEach(function (e) { G[e.a][e.a] += e.g; G[e.b][e.b] += e.g; G[e.a][e.b] -= e.g; G[e.b][e.a] -= e.g; if (e.E) { I[e.a] -= e.g * e.E; I[e.b] += e.g * e.E; } });
        if (gnd != null) { for (j = 0; j < N; j++) G[gnd][j] = 0; G[gnd][gnd] = 1; I[gnd] = 0; }
        for (k = 0; k < N; k++) {   // 高斯消元（列主元）
          var p = k; for (i = k + 1; i < N; i++) if (Math.abs(G[i][k]) > Math.abs(G[p][k])) p = i;
          if (p !== k) { var t = G[k]; G[k] = G[p]; G[p] = t; var u = I[k]; I[k] = I[p]; I[p] = u; }
          var piv = G[k][k]; if (Math.abs(piv) < 1e-30) continue;
          for (i = k + 1; i < N; i++) { var f = G[i][k] / piv; if (!f) continue; for (j = k; j < N; j++) G[i][j] -= f * G[k][j]; I[i] -= f * I[k]; }
        }
        var x = new Float64Array(N);
        for (i = N - 1; i >= 0; i--) { var s = I[i]; for (j = i + 1; j < N; j++) s -= G[i][j] * x[j]; x[i] = Math.abs(G[i][i]) < 1e-30 ? 0 : s / G[i][i]; }
        var byId = {}; els.forEach(function (e) { if (e.id) byId[e.id] = e; });
        return {
          v: function (k) { return k in nodes ? x[nodes[k]] : 0; },
          i: function (id) { var e = byId[id]; return e ? e.g * (x[e.a] - x[e.b] + e.E) : 0; },
          has: function (id) { return !!byId[id]; }
        };
      }
    };
    return api;
  }

  /* ── 读数放大窗里的表盘（SVG）── */
  function dialSVG(o) {
    var w = o.w || 360, h = o.h || 196, cx = w / 2, cy = h - 22, R = Math.min(w * 0.42, h - 46), s = '', i, th, sn, cs;
    var r0 = o.ranges[0], r1 = o.ranges[1];
    s += '<path d="M' + (cx - (R + 26) * Math.sin(0.95)) + ' ' + (cy - (R + 26) * Math.cos(0.95)) + 'A' + (R + 26) + ' ' + (R + 26) + ' 0 0 1 ' + (cx + (R + 26) * Math.sin(0.95)) + ' ' + (cy - (R + 26) * Math.cos(0.95)) + '" fill="none" stroke="#EEF1F5" stroke-width="0"/>';
    s += '<path d="M' + (cx - R * Math.sin(0.85)) + ' ' + (cy - R * Math.cos(0.85)) + 'A' + R + ' ' + R + ' 0 0 1 ' + (cx + R * Math.sin(0.85)) + ' ' + (cy - R * Math.cos(0.85)) + '" fill="none" stroke="#1E3A5F" stroke-width="2"/>';
    for (i = 0; i <= 30; i++) {
      th = -0.85 + 1.7 * i / 30; sn = Math.sin(th); cs = Math.cos(th);
      var l = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
      s += '<line x1="' + (cx + R * sn).toFixed(1) + '" y1="' + (cy - R * cs).toFixed(1) + '" x2="' + (cx + (R - l) * sn).toFixed(1) + '" y2="' + (cy - (R - l) * cs).toFixed(1) + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.2 : 2.2) + '"/>';
    }
    for (i = 0; i <= 3; i++) {
      th = -0.85 + 1.7 * i / 3; sn = Math.sin(th); cs = Math.cos(th);
      var act = o.range != null, u1 = act && o.range === r1, u0 = act && o.range === r0;   // 正在用的那一排刻度数字大而粗，另一排小而淡
      s += '<text x="' + (cx + (R + 16) * sn).toFixed(1) + '" y="' + (cy - (R + 16) * cs + 7).toFixed(1) + '" text-anchor="middle" font-size="' + (u1 ? 25 : act ? 16 : 19) + '" font-weight="' + (u1 || !act ? 700 : 400) + '" font-family="Bahnschrift,Arial" fill="' + (u0 ? '#8A99AD' : '#1E3A5F') + '">' + fmtN(r1 * i / 3) + '</text>';
      s += '<text x="' + (cx + (R - 37) * sn).toFixed(1) + '" y="' + (cy - (R - 37) * cs + 7).toFixed(1) + '" text-anchor="middle" font-size="' + (u0 ? 25 : act ? 16 : 19) + '" font-weight="' + (u0 || !act ? 700 : 400) + '" font-family="Bahnschrift,Arial" fill="' + (u1 ? '#8A99AD' : '#1E3A5F') + '">' + fmtN(r0 * i / 3) + '</text>';
    }
    s += '<text x="' + cx + '" y="' + (cy - R * 0.36) + '" text-anchor="middle" font-size="30" font-style="italic" font-family="Times New Roman,serif" fill="#1E3A5F">' + o.letter + '</text>';
    var a = -0.85 + 1.7 * o.frac, ln = R + 4;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + ln * Math.sin(a)).toFixed(1) + '" y2="' + (cy - ln * Math.cos(a)).toFixed(1) + '" stroke="#FE752D" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#1E3A5F"/>';
    return s;
  }
  /* 接线柱一排：terms = [{k:'-',on:true}, …]，on = 接了导线 */
  function termsSVG(o, y, w) {
    var keys = ['-', String(o.ranges[0]), String(o.ranges[1])], s = '', x0 = w / 2 - 90;
    keys.forEach(function (k, i) {
      var x = x0 + i * 90, on = o.wired && o.wired[k];
      s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + (k === '-' ? '#26292C' : '#C62828') + '" stroke="' + (on ? '#FE752D' : 'none') + '" stroke-width="4"/>';
      s += '<text x="' + (x + 18) + '" y="' + (y + 7) + '" font-size="19" font-weight="700" font-family="Bahnschrift,Arial" fill="' + (k === '-' ? '#26292C' : '#C62828') + '">' + (k === '-' ? '−' : k) + '</text>';
    });
    return s;
  }

  /* ── 读数放大窗（.lk-win）：dials = [{m: 电表, name, terms: true}]，上下排列 ── */
  function win(K, title, dials, width) {
    var W = 360, one = function (d) { return d.terms ? 240 : 206; }, H = dials.reduce(function (s, d) { return s + one(d); }, 0) + (dials.length - 1) * 8;
    var el = K.el('<div class="lk-win" style="width:' + (width || 380) + 'px"><h3><span>' + title + '</span><small></small></h3><svg viewBox="0 0 ' + W + ' ' + H + '"></svg></div>');
    var svg = el.querySelector('svg'), key = '';
    return {
      el: el,
      update: function () {
        var k = dials.map(function (d) { return Math.round(d.m.frac() * 600) + '|' + d.m.range + '|' + JSON.stringify(d.wired ? d.wired() : 0) + '|' + (d.name ? d.name() : ''); }).join('/');
        if (k === key) return; key = k;
        var y = 0, s = '';
        dials.forEach(function (d, i) {
          var h = one(d);
          if (i) s += '<line x1="0" y1="' + (y - 4) + '" x2="' + W + '" y2="' + (y - 4) + '" stroke="#C3CEDC" stroke-width="1.5"/>';
          s += '<g transform="translate(0 ' + y + ')">' + dialSVG({ letter: d.m.letter, ranges: d.m.ranges, range: d.m.range, frac: d.m.frac(), w: W, h: 200 });
          if (d.name) s += '<text x="8" y="196" font-size="18" fill="#56677D" font-family="Microsoft YaHei,sans-serif">' + d.name() + '</text>';
          if (d.terms) s += termsSVG({ ranges: d.m.ranges, wired: d.wired ? d.wired() : null }, 220, W);
          s += '</g>'; y += h + 8;
        });
        svg.innerHTML = s;
      },
      small: function (t) { var sm = el.querySelector('small'); if (sm.textContent !== t) sm.textContent = t; }
    };
  }

  /* ── 开关操作：点一下 = 闭合 / 断开；按住不放 = 试触（松手就断开）── */
  function switchCtl(o) {   // o: {get(): {closed, trial}, set(closed), trial(on), allowTrial}
    var g = null;
    return {
      down: function () { var me = g = { t: Date.now(), moved: false, trial: false }; if (o.allowTrial !== false) setTimeout(function () { if (g === me && !me.moved && !o.get().closed) { me.trial = true; o.trial(true); } }, 300); },
      move: function (moved) { if (g && moved) g.moved = true; },
      up: function () { var me = g; g = null; if (!me) return; if (me.trial) o.trial(false); else if (!me.moved) o.set(!o.get().closed); },
      active: function () { return !!g; }
    };
  }

  /* ── 数据页图像（SVG）：只画记录点；line 'origin' = 过原点的直线（最小二乘斜率），'smooth' = 过各点、不过冲的平滑曲线 ──
     o = {w, h, xName, yName, xMax, yMax, xMajor, yMajor, xMinor, yMinor, series: [{name, color, pts: [[x, y]], line}]} */
  function plot(o) {
    var W = o.w || 620, H = o.h || 420, x0 = 74, y0 = H - 54, x1 = W - 24, y1 = 30, s = '';
    var X = function (v) { return x0 + v / o.xMax * (x1 - x0); }, Y = function (v) { return y0 - v / o.yMax * (y0 - y1); };
    function grid(max, minor, major, isX) {
      for (var i = 0; i <= Math.round(max / minor); i++) {
        var v = i * minor, mj = Math.abs(v / major - Math.round(v / major)) < 1e-6, p = isX ? X(v) : Y(v);
        s += isX ? '<line x1="' + p + '" y1="' + y1 + '" x2="' + p + '" y2="' + y0 + '" stroke="' + (mj ? '#D3DBE6' : '#EEF2F7') + '"/>' : '<line x1="' + x0 + '" y1="' + p + '" x2="' + x1 + '" y2="' + p + '" stroke="' + (mj ? '#D3DBE6' : '#EEF2F7') + '"/>';
        if (mj) s += isX ? '<text x="' + p + '" y="' + (y0 + 26) + '" text-anchor="middle" font-size="18" font-family="Bahnschrift,Arial" fill="#1E3A5F">' + fmtN(v) + '</text>' : '<text x="' + (x0 - 10) + '" y="' + (p + 6) + '" text-anchor="end" font-size="18" font-family="Bahnschrift,Arial" fill="#1E3A5F">' + fmtN(v) + '</text>';
      }
    }
    grid(o.xMax, o.xMinor, o.xMajor, true); grid(o.yMax, o.yMinor, o.yMajor, false);
    s += '<path d="M' + x0 + ' ' + y1 + 'V' + y0 + 'H' + x1 + '" fill="none" stroke="#1E3A5F" stroke-width="2.5"/>';
    s += '<text x="' + (x0 - 8) + '" y="' + (y1 - 10) + '" font-size="18" fill="#1E3A5F">' + o.yName + '</text><text x="' + x1 + '" y="' + (y0 + 48) + '" text-anchor="end" font-size="18" fill="#1E3A5F">' + o.xName + '</text>';
    var lg = '';
    o.series.forEach(function (sr, si) {
      var P = sr.pts.slice().sort(function (a, b) { return a[0] - b[0]; });
      if (sr.line === 'origin' && P.length >= 2) {
        var sxy = 0, sxx = 0; P.forEach(function (p) { sxy += p[0] * p[1]; sxx += p[0] * p[0]; });
        var k = sxx ? sxy / sxx : 0, xe = Math.min(o.xMax, P[P.length - 1][0] * 1.08), ye = k * xe;
        if (ye > o.yMax) { xe = o.yMax / k; ye = o.yMax; }
        s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(xe) + '" y2="' + Y(ye) + '" stroke="' + sr.color + '" stroke-width="2.5"/>';
      } else if (sr.line === 'smooth' && P.length >= 2) s += '<path d="' + smooth(P.map(function (p) { return [X(p[0]), Y(p[1])]; })) + '" fill="none" stroke="' + sr.color + '" stroke-width="2.5"/>';
      P.forEach(function (p) { s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="6" fill="#fff" stroke="' + sr.color + '" stroke-width="3"/>'; });
      if (sr.name) lg += '<g transform="translate(' + (x1 - 150 * (o.series.length - si) + 14) + ' ' + (y1 + 14) + ')"><circle cx="0" cy="0" r="6" fill="#fff" stroke="' + sr.color + '" stroke-width="3"/><text x="12" y="6" font-size="17" fill="#1E3A5F">' + sr.name + '</text></g>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;display:block;border:2px solid #C3CEDC;border-radius:12px;background:#fff">' + s + lg + '</svg>';
  }
  /* 单调三次插值（Fritsch–Carlson）：点按 x 递增，曲线不过冲 */
  function smooth(P) {
    var n = P.length, d = [], m = [], i;
    for (i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / ((P[i + 1][0] - P[i][0]) || 1e-9));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) {   // 加权调和平均：相邻斜率异号取 0，保证不过冲
      var h0 = P[i][0] - P[i - 1][0], h1 = P[i + 1][0] - P[i][0];
      m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]);
    }
    var s = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) {
      var h = P[i + 1][0] - P[i][0];
      s += 'C' + (P[i][0] + h / 3).toFixed(1) + ' ' + (P[i][1] + m[i] * h / 3).toFixed(1) + ' ' + (P[i + 1][0] - h / 3).toFixed(1) + ' ' + (P[i + 1][1] - m[i + 1] * h / 3).toFixed(1) + ' ' + P[i + 1][0].toFixed(1) + ' ' + P[i + 1][1].toFixed(1);
    }
    return s;
  }
  function stagePt(K, ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function quant(v, step) { return Math.round(v / step + 1e-9) * step; }
  /* 指针正好停在两小格正中（±5% 格）时读半格，其余按分度值读 */
  function readHalf(v, step) { var f = v / step, h = Math.floor(f) + 0.5; return Math.abs(f - h) < 0.05 ? h * step : quant(v, step); }
  function fixedOf(step) { return step >= 1 ? 0 : step >= 0.1 ? 1 : 2; }

  /* ── 面板：紧凑选项行 ── */
  function opts(id, label, items) {   // 面板规范：左侧标签 + 几选一（.seg）
    return '<div class="grp"><span class="gl">' + label + '</span><div class="gc"><div class="seg" id="' + id + '">' +
      items.map(function (it) { return '<button data-v="' + it[0] + '">' + it[1] + '</button>'; }).join('') + '</div></div></div>';
  }
  function mark(id, v, dis) {
    var el = document.getElementById(id); if (!el) return;
    [].forEach.call(el.querySelectorAll('button'), function (b) { var k = b.getAttribute('data-v'); b.classList.toggle('on', k === String(v)); b.disabled = !!(dis && dis(k)); });
  }
  function bind(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) fn(b.getAttribute('data-v')); }); }

  /* 面板最后一行：开关（与左侧闸刀同步）、按住试触、电流方向 */
  function swRow(o) {   // 开关用拨动开关（与左侧闸刀同步）；按住试触是动作；电流方向是“显示”开关，单独一行
    return '<div class="grp"><span class="gl">开关</span><div class="gc"><div class="acts"><button class="sw" id="b-sw" style="flex:none"></button>' +
      (o.trial ? '<button id="b-tr" style="touch-action:none"><i>☝</i>按住试触</button>' : '') + '</div></div></div>' +
      (o.flow ? '<div class="grp"><span class="gl">显示</span><div class="gc"><div class="acts"><button class="sw" id="b-fl" style="flex:none">电流方向</button></div></div></div>' : '');
  }
  function swBind(o) {   // o: {toggle(), trial(on), closed(), flow()}
    document.getElementById('b-sw').onclick = o.toggle;
    var tr = document.getElementById('b-tr'), fl = document.getElementById('b-fl');
    if (tr) {
      tr.addEventListener('pointerdown', function (e) { if (o.closed()) return; try { tr.setPointerCapture(e.pointerId); } catch (er) { } o.trial(true); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { tr.addEventListener(t, function () { o.trial(false); }); });
    }
    if (fl) fl.onclick = o.flow;
  }
  function swSync(closed, trial, flow) {
    var b = document.getElementById('b-sw'); b.textContent = closed ? '已闭合' : '已断开'; b.title = closed ? '点一下断开' : '点一下闭合'; b.classList.toggle('on', closed);
    var t = document.getElementById('b-tr'); if (t) { t.disabled = closed; t.classList.toggle('on', !!trial); }
    var f = document.getElementById('b-fl'); if (f) { f.classList.toggle('on', !!flow); f.textContent = '电流方向：' + (flow ? '显示' : '隐藏'); }
  }

  /* 面板「调电压」行（19、20 用，2026-11-21 新增；15–18 不用）：滑动变阻器滑片 P 的滑杆 + ← → 微调按钮（按住连续移动），与 3D 滑片同步。
     接法照 19、20：A 接左下，滑片左移接入电阻变小，被测元件两端电压升高。
     slideRow({label, name, hint})   slideBind({K, get(), set(p), end(), step, nudge(d)})   step 为每点一下滑片移动的比例（0～1）；给了 nudge 就由实验自己决定走多少
     slideSync(p, Rmax) */
  function slideRow(o) {
    o = o || {};
    return '<div class="grp"><span class="gl">' + (o.label || '调电压') + '</span><div class="gc">' +
      '<div class="row"><span class="nm">' + (o.name || '滑片 P') + '</span><span class="vl" id="v-p" style="font-size:22px"></span><span class="un" id="u-p"></span></div>' +
      '<input class="rng" type="range" id="s-p" min="0" max="1" step="0.0025">' +
      '<div class="acts"><button id="p-l"><i>←</i>左移 · 电压升高</button><button id="p-r"><i>→</i>右移 · 电压降低</button></div>' +
      (o.hint ? '<p class="hint2">' + o.hint + '</p>' : '') + '</div></div>';
  }
  function slideBind(o) {
    var sp = document.getElementById('s-p'), st = o.step || 0.025;
    o.K.rng(sp);
    sp.addEventListener('pointerdown', function () { sp._hold = true; });
    ['pointerup', 'pointercancel', 'blur'].forEach(function (t) { sp.addEventListener(t, function () { sp._hold = false; }); });
    sp.addEventListener('input', function () { o.set(+sp.value); });
    sp.addEventListener('change', function () { sp._hold = false; if (o.end) o.end(); });
    function nudge(d) { if (o.nudge) return o.nudge(d); var n = Math.round((o.get() + d * st) / st + 1e-6) * st; o.set(clamp(n, 0, 1)); }   // 默认对齐到步长格点；实验也可自定（o.nudge(d)，d = −1 左移、+1 右移）
    [['p-l', -1], ['p-r', 1]].forEach(function (a) {
      var b = document.getElementById(a[0]), t1 = null, t2 = null, rep = false;
      function stop() { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; b.classList.remove('on'); }
      b.addEventListener('pointerdown', function () { rep = false; stop(); t1 = setTimeout(function () { rep = true; b.classList.add('on'); t2 = setInterval(function () { if (b.disabled) return stop(); nudge(a[1]); }, 70); }, 420); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { b.addEventListener(t, stop); });
      b.addEventListener('click', function () { if (rep) { rep = false; return; } nudge(a[1]); });   // 点一下走一步；按住不放连续走（松手后的 click 不再多走）
    });
  }
  function slideSync(p, Rmax) {
    var sp = document.getElementById('s-p'); if (!sp) return;
    if (!sp._hold) sp.value = p;
    sp.style.setProperty('--p', p * 100 + '%');
    document.getElementById('v-p').textContent = 'R′ ' + (p * Rmax).toFixed(1);
    document.getElementById('u-p').textContent = 'Ω' + (p >= 0.999 ? '（最大）' : p <= 0.001 ? '（最小）' : '');
    document.getElementById('p-l').disabled = p <= 0.001; document.getElementById('p-r').disabled = p >= 0.999;
  }

  /* 找出被点中的器材：对象链上第一个带 userData.act 的 */
  function actOf(hit) { for (var o = hit && hit.object; o; o = o.parent) if (o.userData && o.userData.act) return o.userData.act; return null; }

  window.Circuit = {
    TOP: TOP, cam: function () { return { target: [4, 0, -5], az: 0, el: 0.98, dist: 114, minDist: 60, maxDist: 140, minAz: -0.6, maxAz: 0.6, minEl: 0.55, maxEl: 1.35, fov: 30, sun: [-30, 110, 60] }; }, net: net, dialSVG: dialSVG, termsSVG: termsSVG, win: win, switchCtl: switchCtl, stagePt: stagePt, plot: plot, quant: quant, readHalf: readHalf, fixedOf: fixedOf, opts: opts, mark: mark, bind: bind, actOf: actOf, swRow: swRow, swBind: swBind, swSync: swSync, slideRow: slideRow, slideBind: slideBind, slideSync: slideSync, clamp: clamp, fit: fit,
    setup: function (v) {
      V = v; T = v.T; if (!M) mats();
      return {
        T: T, M: M, board: board, post: post, meter: meter, battery: battery, knife: knife, bulb: bulb, resistor: resistor, rheostat: rheostat, clip: clip, leads: leads,
        print: printOn, ring: ring, markTag: markTag, nameTag: nameTag, showTag: showTag, heightAt: heightAt, wires: wires, group: group, box: box, cyl: cyl, rbox: rbox, decal: decal, wpos: wpos, screenFit: fit
      };
    }
  };
})();
