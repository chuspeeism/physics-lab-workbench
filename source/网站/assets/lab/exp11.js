/* 11 探究滑动摩擦力大小与哪些因素有关（课本图 8.3-4）。
   装置：水平桌面上的长木板（光滑 / 粗糙两块），可铺棉布、毛巾；长方体木块 10 cm × 6 cm × 4 cm（平放大面朝下，侧放小侧面朝下），
   木块上可叠放钩码（每个 1.0 N，共 4 个）；弹簧测力计 0～5 N，分度值 0.1 N，水平拉木块（弹簧 2 cm / N）。
   参数：木块重 2.0 N；动摩擦因数 光滑木板 0.20、粗糙木板 0.40、棉布 0.50、毛巾 0.60；最大静摩擦力比滑动摩擦力大 15%。
   模型：手拉着测力计（拉环），弹簧伸长决定示数 F；木块静止时 F 超过最大静摩擦力才开始滑动；滑动时 m·a = F − f（另有测力计内部阻尼，
   只让木块速度平稳跟上手），所以加速时示数大于 f，减速时小于 f，匀速时 F = f。滑动摩擦力与速度、接触面积无关。
   匀速：木块滑动满 1 s 后，最近 1 s 分 5 段的平均速度都和总平均相差不超过 10%（判定后放宽到 15%）；这时才能记录。
   操作：沿木板拖测力计（或用滑杆、「慢拉 / 快拉」匀速拉）；拖木块放回左端；点钩码盒加钩码，点木块上的钩码取下。 */
(function () {
  var MU = { smooth: 0.2, rough: 0.4, cotton: 0.5, towel: 0.6 }, SURF = { smooth: '长木板', rough: '粗糙长木板', cotton: '棉布', towel: '毛巾' };
  var BX0 = -30, BX1 = 16, BT = 1.6, BW = 12, HALF = 5, XB_MIN = -23, XB_MAX = 9, EYE = 0.9;
  var SC_BODY = 17, SC_Z0 = 3.2, SC_PER = 2, SC_R0 = 1.2, SC_HK = 1.6, SC_RING = 1.0, L0 = SC_RING + SC_BODY + SC_R0 + SC_HK;   // 拉环中心到挂钩的长度（示数为 0 时）
  var NMAX = 4, SLOW = 3, FAST = 8;
  var st = { acc: 0, surf: 'smooth', side: false, n: 0, xb: XB_MIN, vb: 0, slide: false, hand: 0, handT: 0, hPrev: 0, F: 0, auto: 0, peak: 0, moved: false, atEnd: false, hist: [], samp: [], dtEv: 0.03, t: 0, uni: false, rows: [], justRec: null, graph: false };
  var K, V, T3, block, blockMesh, eye, scale, scaleHit, blockHit, tray, trayHit, hooks = [], spare = [], layers = {}, boardTop, boardMats, winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function H() { return st.side ? 6 : 4; }   // 木块高度（cm）
  function layerT() { return st.surf === 'cotton' ? 0.12 : st.surf === 'towel' ? 0.45 : 0; }
  function base() { return BT + layerT(); }
  function N() { return 2 + st.n; }
  function fk() { return MU[st.surf] * N(); }
  function mass() { return N() / 10; }
  function hookX() { return st.xb + HALF + EYE; }
  function handMin() { return hookX() + L0 - 0.8; }   // 往回推：挂钩只能松开一点，不会插进木块
  function handMax() { return XB_MAX + HALF + EYE + L0; }
  function readF() { return Math.round(st.F * 10) / 10; }
  function atMax() { return st.hand >= handMax() - 0.05 && st.handT >= handMax() - 0.05; }   // 手（测力计）已拉到最右端，再也拉不动
  var END_TIP = '测力计拉到头了，拉不动。点「放回左端」（或把木块拖回左端）再拉。';

  /* ── 纹理 ── */
  function tex(w, h, draw, rep) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
  function wood(base, dark, rough) {
    return tex(1024, 192, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 30; i++) { g.strokeStyle = dark; g.globalAlpha = 0.07 + Math.random() * 0.1; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(300, y + (Math.random() - .5) * 24, 700, y + (Math.random() - .5) * 24, w, y + (Math.random() - .5) * 12); g.stroke(); }
      if (rough) for (var k = 0; k < 9000; k++) { g.globalAlpha = 0.1 + Math.random() * 0.22; g.fillStyle = Math.random() < .5 ? dark : '#FFFFFF'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4); }
      g.globalAlpha = 1;
    });
  }
  function clothTex() {
    return tex(256, 256, function (g, w, h) {
      g.fillStyle = '#EEF1F4'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < w; i += 4) { g.fillStyle = 'rgba(120,135,155,.13)'; g.fillRect(i, 0, 1.5, h); g.fillRect(0, i, w, 1.5); }
    }, [10, 2]);
  }
  function towelTex() {
    return tex(256, 256, function (g, w, h) {
      g.fillStyle = '#B9D8EA'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 6) for (var x = (y / 6) % 2 * 3; x < w; x += 6) { g.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.3) + ')'; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); g.fillStyle = 'rgba(40,80,110,.16)'; g.beginPath(); g.arc(x + 1.4, y + 1.6, 1.2, 0, 7); g.fill(); }
    }, [12, 2]);
  }
  function roundRect(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function rbox(w, h, d, r, mat) {   // 圆角长方体（中心在原点）
    var g = new T3.ExtrudeGeometry(roundRect(w - 2 * r, h - 2 * r, r * 0.6), { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2); var m = new T3.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }

  /* ── 弹簧测力计：局部原点 = 拉环中心，轴线沿 −y；示数 F 时挂钩在 y = −(L0 + 2F) ── */
  function scaleFace() {
    return tex(200, 1600, function (g, w, h) {
      var px = h / (SC_BODY - 1.2);   // 面板覆盖 y = −0.6 … −(BODY − 0.6)
      g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#DCE4EE'; g.fillRect(w / 2 - 9, 0, 18, h);   // 指针槽
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 50px Bahnschrift, Arial';
      for (var i = 0; i <= 50; i++) {
        var y = (SC_Z0 + SC_PER * i / 10 - 0.6) * px, l = i % 10 === 0 ? 46 : i % 5 === 0 ? 34 : 22;
        g.lineWidth = i % 5 === 0 ? 5 : 3; g.beginPath(); g.moveTo(w / 2 + 12, y); g.lineTo(w / 2 + 12 + l, y); g.stroke();
        g.beginPath(); g.moveTo(w / 2 - 12, y); g.lineTo(w / 2 - 12 - l * 0.6, y); g.stroke();
        if (i % 10 === 0) { g.save(); g.translate(34, y); g.rotate(-Math.PI / 2); g.fillText(String(i / 10), 0, 0); g.restore(); }   // 测力计横放：数字转正
      }
      g.font = 'bold 44px Bahnschrift, Arial'; g.save(); g.translate(w - 34, 0.9 * px); g.rotate(-Math.PI / 2); g.fillText('N', 0, 0); g.restore();
    });
  }
  function makeScale() {
    var g = new T3.Group(), steel = new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .28 });
    var ring = new T3.Mesh(new T3.TorusGeometry(0.85, 0.16, 10, 32), steel); ring.position.y = SC_RING; g.add(ring);
    var neck = new T3.Mesh(new T3.CylinderGeometry(0.16, 0.16, 0.6, 10), steel); neck.position.y = 0.05; g.add(neck);
    var body = rbox(3.3, SC_BODY, 1.2, 0.3, new T3.MeshStandardMaterial({ color: 0x3E6FB8, roughness: .45, metalness: .15 })); body.position.y = -SC_BODY / 2; g.add(body);
    var face = new T3.Mesh(new T3.PlaneGeometry(2.4, SC_BODY - 1.2), new T3.MeshStandardMaterial({ map: scaleFace(), roughness: .6, emissive: 0xffffff, emissiveIntensity: .12 }));
    face.position.set(0, -SC_BODY / 2, 0.61); g.add(face);
    var cover = new T3.Mesh(new T3.PlaneGeometry(2.6, SC_BODY - 0.9), new T3.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .12, shininess: 120, depthWrite: false })); cover.position.set(0, -SC_BODY / 2, 0.66); g.add(cover);
    var ptr = new T3.Mesh(new T3.BoxGeometry(1.5, 0.16, 0.06), new T3.MeshBasicMaterial({ color: 0xFE752D })); ptr.position.z = 0.64; g.add(ptr);
    var rod = new T3.Mesh(new T3.CylinderGeometry(0.13, 0.13, 1, 10), steel); g.add(rod);
    var hook = new T3.Group();
    var hk = new T3.Mesh(new T3.TorusGeometry(0.5, 0.12, 8, 20, Math.PI * 1.35), steel); hk.rotation.z = Math.PI * 0.82; hk.position.y = -0.5; hook.add(hk);
    g.add(hook);
    var hit = new T3.Mesh(new T3.BoxGeometry(5, SC_BODY + 4, 4), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = -SC_BODY / 2 + 0.5; g.add(hit);
    g.userData = {
      hit: hit,
      set: function (F) {
        var e = SC_PER * clamp(F, 0, 5.2);
        ptr.position.y = -(SC_Z0 + e);
        var len = SC_R0 + e; rod.scale.y = len; rod.position.y = -SC_BODY - len / 2 + 0.3;
        hook.position.y = -SC_BODY - len + 0.3;
      }
    };
    return g;
  }
  function makeWeight() {
    var g = new T3.Group();
    var pts = [[0, 0], [1.25, 0], [1.4, 0.15], [1.4, 2.05], [1.25, 2.2], [0.3, 2.2], [0.3, 2.5], [0, 2.5]].map(function (p) { return new T3.Vector2(p[0], p[1]); });
    var body = new T3.Mesh(new T3.LatheGeometry(pts, 32), new T3.MeshStandardMaterial({ color: 0xC9A65E, metalness: .6, roughness: .32 })); body.castShadow = true; g.add(body);
    var groove = new T3.Mesh(new T3.TorusGeometry(1.41, 0.05, 6, 32), new T3.MeshStandardMaterial({ color: 0x8C6E35, metalness: .5, roughness: .4 })); groove.rotation.x = Math.PI / 2; groove.position.y = 1.1; g.add(groove);
    var hk = new T3.Mesh(new T3.TorusGeometry(0.42, 0.1, 8, 18, Math.PI * 1.4), new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .3 })); hk.position.y = 2.95; hk.rotation.z = -Math.PI * 0.2; g.add(hk);
    g.userData.hk = hk;
    return g;
  }

  /* ── 场景 ── */
  function build() {
    V = K.three({ target: [4.5, 7, 3], az: 0, el: 0.36, dist: 92, minDist: 60, maxDist: 170, minAz: -0.9, maxAz: 0.9, minEl: 0.1, maxEl: 1.1, fov: 30, sun: [-30, 110, 70] });
    T3 = V.T; var S = V.scene;
    boardMats = { smooth: new T3.MeshStandardMaterial({ map: wood('#EAD7B4', '#8A6A3E'), roughness: .75 }), rough: new T3.MeshStandardMaterial({ map: wood('#CFAF80', '#5E4424', true), roughness: 1 }) };
    var side = new T3.MeshStandardMaterial({ color: 0xCDB088, roughness: .85 });
    boardTop = new T3.Mesh(new T3.BoxGeometry(BX1 - BX0, BT, BW), [side, side, boardMats.smooth, side, side, side]);
    boardTop.position.set((BX0 + BX1) / 2, BT / 2, 0); boardTop.castShadow = true; boardTop.receiveShadow = true; S.add(boardTop);
    layers.cotton = new T3.Mesh(new T3.BoxGeometry(BX1 - BX0 - 1, 0.12, BW - 0.6), new T3.MeshStandardMaterial({ map: clothTex(), roughness: 1 }));
    layers.cotton.position.set((BX0 + BX1) / 2, BT + 0.06, 0);
    layers.towel = new T3.Mesh(new T3.BoxGeometry(BX1 - BX0 - 1, 0.45, BW - 0.4), new T3.MeshStandardMaterial({ map: towelTex(), roughness: 1 }));
    layers.towel.position.set((BX0 + BX1) / 2, BT + 0.225, 0);
    [layers.cotton, layers.towel].forEach(function (m) { m.receiveShadow = true; S.add(m); });
    // 木块：平放时 10 × 4 × 6（x × y × z）；侧放时绕 x 轴转 90°
    block = new T3.Group(); S.add(block);
    var bw = wood('#E3C79A', '#7A5530'); bw.wrapS = bw.wrapT = T3.RepeatWrapping; bw.repeat.set(0.1, 0.25);
    blockMesh = rbox(10, 4, 6, 0.18, new T3.MeshStandardMaterial({ map: bw, roughness: .7 })); block.add(blockMesh);
    eye = new T3.Mesh(new T3.TorusGeometry(0.42, 0.1, 8, 20), new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .3 })); eye.position.x = HALF + 0.45; block.add(eye);
    blockHit = new T3.Mesh(new T3.BoxGeometry(11, 7, 7), new T3.MeshBasicMaterial({ visible: false })); block.add(blockHit);
    for (var i = 0; i < NMAX; i++) { var w = makeWeight(); S.add(w); hooks.push(w); }
    // 钩码盒（木板后方）
    tray = new T3.Group(); tray.position.set(-20, 0, 14); S.add(tray);
    var trayB = rbox(15, 1.2, 5, 0.25, new T3.MeshStandardMaterial({ color: 0x5C6B7E, roughness: .6 })); trayB.position.y = 0.6; tray.add(trayB);
    var trayIn = new T3.Mesh(new T3.BoxGeometry(14, 0.1, 4), new T3.MeshStandardMaterial({ color: 0x2D3846, roughness: .9 })); trayIn.position.y = 1.22; tray.add(trayIn);
    for (var j = 0; j < NMAX; j++) { var s2 = makeWeight(); s2.position.set(-5.1 + j * 3.4, 1.25, 0); tray.add(s2); spare.push(s2); }
    trayHit = new T3.Mesh(new T3.BoxGeometry(16, 6, 6), new T3.MeshBasicMaterial({ visible: false })); trayHit.position.y = 2.5; tray.add(trayHit);
    scale = makeScale(); scale.rotation.z = -Math.PI / 2; S.add(scale); scaleHit = scale.userData.hit;
    V.tag('blk', ''); V.tag('tray', '钩码盒');
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [scaleHit, blockHit, trayHit].concat(hooks.filter(function (h) { return h.visible; }))); },
      start: function (ev) {
        var top = st.n ? hooks[st.n - 1] : null, h;
        if (top && V.pick(ev, [top])) { grab = { k: 'take', x: ev.clientX, y: ev.clientY }; return true; }
        if (V.pick(ev, [trayHit])) { grab = { k: 'add', x: ev.clientX, y: ev.clientY }; return true; }
        if ((h = V.pick(ev, [scaleHit]))) { st.auto = 0; grab = lineGrab(ev, h.point, st.handT, 'sc'); return true; }
        if ((h = V.pick(ev, [blockHit]))) { st.auto = 0; grab = lineGrab(ev, h.point, st.xb, 'blk'); return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) grab.moved = true;
        if (!grab.moved || !grab.p0) return;
        var u = lineSolve(ev, grab);
        if (grab.k === 'sc') handInput(u);
        else setBlock(u);
      },
      end: function () {
        if (grab && !grab.moved) { if (grab.k === 'take') setN(st.n - 1); else if (grab.k === 'add') setN(st.n + 1); }
        grab = null;
      }
    };
    V.frame = tick;
  }
  /* 沿 x 方向移动的器材：记住按下的那一点和手指的屏幕偏移；移动时找一个位置，让那一点在屏幕上离手指最近 */
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function lineGrab(ev, p, u0, k) { var s = V.toScreen(p), m = stagePt(ev); return { k: k, p0: p.clone(), u0: u0, ox: m.x - s.x, oy: m.y - s.y, x: ev.clientX, y: ev.clientY, moved: false }; }
  function lineSolve(ev, g) {
    var m = stagePt(ev), tx = m.x - g.ox, ty = m.y - g.oy, best = g.u0, bd = 1e9, lo = -60, hi = 70, step = 1;
    for (var pass = 0; pass < 3; pass++) {
      for (var u = lo; u <= hi + 1e-9; u += step) { var s = V.toScreen(g.p0.clone().setX(g.p0.x + u - g.u0)), d = Math.hypot(s.x - tx, s.y - ty); if (d < bd) { bd = d; best = u; } }
      lo = best - step; hi = best + step; step /= 10;
    }
    return best;
  }
  /* 手的输入（拖测力计或滑杆）：按时间记样本；模拟用略早一点（约一个事件间隔）的插值位置，鼠标事件的疏密不会变成速度抖动 */
  function now() { return performance.now() / 1000; }
  function handInput(x) {
    x = clamp(x, handMin(), handMax()); var t = now(), S = st.samp, lastS = S[S.length - 1];
    st.auto = 0;
    if (!lastS || t - lastS.t > 0.2) { S.length = 0; S.push({ t: t - 0.02, x: st.hand }); }
    else st.dtEv += (Math.min(0.1, t - lastS.t) - st.dtEv) * 0.3;
    S.push({ t: t, x: x }); while (S.length > 2 && S[1].t < t - 1) S.shift();
    st.handT = x;
  }
  function handAt(t) {
    var S = st.samp; if (!S.length) return st.handT;
    if (t <= S[0].t) return S[0].x;
    for (var i = 1; i < S.length; i++) if (t <= S[i].t) { var a = S[i - 1], b = S[i]; return a.x + (b.x - a.x) * (t - a.t) / Math.max(1e-6, b.t - a.t); }
    return S[S.length - 1].x;
  }
  function stopMotion() { st.vb = 0; st.slide = false; st.hist = []; st.uni = false; }
  function setBlock(x) {   // 拿着木块放到某处：测力计跟着走，弹簧不受力
    st.xb = clamp(x, XB_MIN, XB_MAX); stopMotion();
    st.hand = st.handT = st.hPrev = hookX() + L0; st.samp = []; st.F = 0; st.peak = 0; st.moved = false; st.atEnd = false; st.nag = 0; changed();
  }
  function setN(n) { n = clamp(n, 0, NMAX); if (n === st.n) return; st.n = n; resetPull(); }
  function setSurf(s) { if (s === st.surf) return; st.surf = s; resetPull(); }
  function setSide(b) { if (b === st.side) return; st.side = b; resetPull(); }
  function resetPull() { st.auto = 0; setBlock(st.xb); }   // 换条件：木块停在原处，重新开始拉

  /* ── 模拟：手 → 弹簧 → 木块 ── */
  function tick(dt) {
    if (!dt) { pose(); drawWin(); ui(); return; }   // 框架在拖动事件里会以 dt = 0 调用：只重画，不推进模拟（否则手的位置被“吃掉”，速度出现锯齿）
    st.t += dt; if (st.nag > 0) st.nag -= dt;
    var h0 = st.hand, h1;
    if (st.auto) { st.samp = []; st.handT = h1 = Math.min(handMax(), st.hand + st.auto * dt); if (h1 >= handMax()) st.auto = 0; }   // 匀速拉：手按固定速度前进
    else { h1 = clamp(handAt(now() - clamp(st.dtEv * 1.15, 0.02, 0.07)), handMin(), handMax()); }   // 跟手：比最新样本晚约一个事件间隔，按样本线性插值
    var n = Math.max(1, Math.ceil(dt / 0.002)), sdt = dt / n, vh = dt > 0 ? (h1 - h0) / dt : 0, m = mass(), f = fk(), fs = f * 1.15, C = 2 * Math.sqrt(50 * m), F = 0;
    for (var i = 0; i < n; i++) {
      if (st.slide) { st.xb += st.vb * sdt; st.moved = true; if (st.xb >= XB_MAX) { st.xb = XB_MAX; st.vb = 0; st.slide = false; st.atEnd = true; } }
      var xh = h0 + (h1 - h0) * (i + 1) / n, e = xh - hookX() - L0;
      F = e > 0 ? e / SC_PER : 0;
      if (!st.slide && F > fs && st.xb < XB_MAX) st.slide = true;
      if (st.slide) {
        var a = (F + (e > 0 ? C * (vh - st.vb) / 100 : 0) - f) / m;
        st.vb += a * 100 * sdt;
        if (st.vb <= 0) { st.vb = 0; if (F <= fs) st.slide = false; }
      }
    }
    st._vh = vh; st.hand = h1; if (dt > 0) st.acc += ((st.vb - (st.vPrev || 0)) / dt - st.acc) * 0.25; st.vPrev = st.vb;
    var eNow = st.hand - hookX() - L0; st.F = eNow > 0 ? eNow / SC_PER : 0;
    if (st.F > st.peak) st.peak = st.F;
        if (st.slide) { st.hist.push({ t: st.t, v: st.vb }); while (st.hist.length && st.hist[0].t < st.t - 1.0) st.hist.shift(); }
    else st.hist = [];
    // 匀速判定：滑动满 1 s 后，把最近 1 s 分成 5 段求平均速度，各段与总平均相差都不超过 10%（已判匀速后放宽到 15%，免得来回跳）
    var uni = false; st.trend = 0;
    if (st.slide && st.hist.length > 10 && st.t - (st.slideT0 || st.t) >= 1.0) {
      var bins = [0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0];
      st.hist.forEach(function (x) { var k = clamp(Math.floor((x.t - (st.t - 1.0)) / 0.2), 0, 4); bins[k] += x.v; cnt[k]++; });
      var bm = bins.map(function (b, k) { return cnt[k] ? b / cnt[k] : null; }).filter(function (v) { return v != null; });
      var mean = bm.reduce(function (s, v) { return s + v; }, 0) / bm.length, tol = st.uni ? 0.15 : 0.10;
      uni = mean >= 0.8 && bm.length >= 4 && bm.every(function (v) { return Math.abs(v - mean) <= tol * mean; });
      st.vMean = mean;
      var d = (bm[bm.length - 1] - bm[0]) / mean; st.trend = d > 0.1 ? 1 : d < -0.1 ? -1 : 0;
    }
    if (st.slide && !st.wasSlide) st.slideT0 = st.t;
    st.wasSlide = st.slide; st.uni = uni;
    pose(); drawWin(); ui();
  }
  function pose() {
    var y0 = base();
    block.position.set(st.xb, y0 + H() / 2, 0); block.rotation.x = st.side ? Math.PI / 2 : 0;
    eye.rotation.set(st.side ? -Math.PI / 2 : 0, 0, 0);   // 圆环始终竖直，伸出端面
    var top = y0 + H();
    hooks.forEach(function (w, i) { w.visible = i < st.n; w.position.set(st.xb, top + i * 2.25, 0); w.userData.hk.visible = i === st.n - 1; });
    spare.forEach(function (w, i) { w.visible = i >= st.n; });
    boardTop.material[2] = st.surf === 'rough' ? boardMats.rough : boardMats.smooth;
    layers.cotton.visible = st.surf === 'cotton'; layers.towel.visible = st.surf === 'towel';
    scale.position.set(st.hand, y0 + H() / 2, 0.2); scale.userData.set(st.F);
    V.tag('blk').innerHTML = '<span class="m">v</span> = ' + f1(st.slide ? st.vb : 0) + ' cm/s';
    V.placeTag('blk', new T3.Vector3(st.xb, top + st.n * 2.25 + 1.6, 0));
    V.placeTag('tray', new T3.Vector3(-26, 3.2, 14));
    V.tag('tray').style.display = st.n >= NMAX ? 'none' : V.tag('tray').style.display;
  }

  /* ── 观察窗：测力计刻度放大（刻度从拉环一侧向挂钩一侧增大） ── */
  function drawWin() {
    var F = st.F, key = [Math.round(F * 200), Math.round(st.peak * 50), st.moved].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:360px"><h3><span>测力计放大</span><small>分度值 0.1 N</small></h3><svg viewBox="0 0 360 132"></svg><p class="cap" style="font-size:18px"></p></div>');
    var cx = 180, px = 160, X = function (v) { return cx - (v - F) * px; }, s = '';   // 示数大的一侧在左
    s += '<rect x="0" y="22" width="360" height="104" rx="8" fill="#FBFCFD" stroke="#C3CEDC"/>';
    s += '<rect x="0" y="66" width="360" height="12" fill="#DCE4EE"/>';
    for (var i = Math.floor((F - 1.2) * 10); i <= Math.ceil((F + 1.2) * 10); i++) {
      if (i < 0 || i > 50) continue;
      var x = X(i / 10); if (x < 2 || x > 358) continue;
      var l = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 13;
      s += '<line x1="' + x + '" y1="66" x2="' + x + '" y2="' + (66 - l) + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.6 : 2.8) + '"/>';
      s += '<line x1="' + x + '" y1="78" x2="' + x + '" y2="' + (78 + l * 0.5) + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.3 : 2.2) + '"/>';
      if (i % 5 === 0) s += '<text x="' + x + '" y="118" text-anchor="middle" font-size="' + (i % 10 ? 18 : 22) + '" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + (i / 10) + '</text>';
    }
    if (st.moved && st.peak > F + 0.04) { var xp = X(st.peak); if (xp > 4 && xp < 356) s += '<line x1="' + xp + '" y1="28" x2="' + xp + '" y2="96" stroke="#8A99AD" stroke-width="2.5" stroke-dasharray="5 4"/><text x="' + xp + '" y="16" text-anchor="middle" font-size="18" fill="#56677D">刚拉动时</text>'; }
    s += '<rect x="' + (cx - 2) + '" y="56" width="4" height="32" fill="#FE752D"/><path d="M' + (cx - 9) + ' 50 L' + (cx + 9) + ' 50 L' + cx + ' 61 Z" fill="#FE752D"/>';
    s += '<text x="352" y="44" text-anchor="end" font-size="18" fill="#56677D">N</text>';
    winEl.querySelector('svg').innerHTML = s;
    winEl.querySelector('.cap').textContent = '示数越大，指针越靠左（挂钩一侧）';
  }

  /* ── 检查与记录 ── */
  function changed() { st.justRec = null; st.recSpd = null; st.ver = (st.ver || 0) + 1; last = ''; }
  function spdCls(v) { return v >= 5 ? '快' : '慢'; }
  function recKey() { return [st.surf, st.side, st.n, spdCls(st.vMean || st.vb)].join('|'); }
  function recSig() { return st.ver + '|' + spdCls(st.vMean || st.vb); }   // 同一次拉动、同一速度档只能记一次；放回重拉或改条件就是新的一次测量
  function dup() { return st.recSig === recSig(); }
  function canRec() { return st.uni && !dup(); }
  function ui() {
    var moving = st.slide, hint, tone = '';
    var checks = [{ label: '拉动木块', ok: moving || st.moved ? true : null }, { label: '匀速', ok: st.uni ? true : moving ? false : null }];
    var toFast = st.recSpd === '慢' && K.S.q === 5;   // 第 6 问：先慢拉记一次，再换快拉
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (st.justRec != null && toFast && moving && !st.uni) hint = '换快拉，等速度稳定。';
    else if (st.justRec != null && dup()) { hint = '已记入第 ' + st.justRec + ' 次。' + (toFast && moving ? '换快拉，等速度稳定。' : '点「放回左端」，改一个条件再测。'); tone = 'good'; }
    else if (st.uni && dup()) hint = '这次拉动已经记过了。点「放回左端」再测。';
    else if (st.uni) { hint = '此时示数等于滑动摩擦力，可以记录。'; tone = 'good'; }
    else if (atMax()) { hint = END_TIP; tone = 'warn'; }
    else if (moving) {
      if (st.t - (st.slideT0 || 0) < 1.0 && st.peak > fk() * 1.05) hint = '刚拉动时示数最大，之后回落。继续匀速拉。';
      else if (st.trend > 0 && st.F > fk() + 0.05) hint = '木块在加速，示数大于摩擦力。拉得稳一点。';
      else if (st.trend < 0 && st.F < fk() - 0.05) hint = '木块在减速，示数小于摩擦力。拉得稳一点。';   // 速度只是在微调、示数已等于摩擦力时不这样说
      else hint = '保持匀速拉动，等速度稳定 1 s。';
    }
    else if (st.atEnd) { hint = '木块到头了。点「放回左端」再拉。'; tone = 'warn'; }
    else if (st.moved) hint = '木块停下了。继续拉，或点「放回左端」换条件。';
    else if (st.F > 0.02) hint = '木块还没动，示数在变大。继续拉。';
    else hint = '让木块在木板上做匀速直线运动。';
    K.state({ checks: checks, hint: hint, tone: tone, read: false });
    var ok = canRec();
    var key = [ok, readF(), st.n, st.surf, st.side, st.rows.length, st.auto, Math.round(st.handT), Math.round(st.hand), st.justRec].join('|');
    if (key === last) return; last = key;
    K.setReading('F', f1(st.F)); K.setReading('N', f1(N()));
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次：' + SURF[st.surf] + '，' + (st.side ? '侧放' : '平放') + '，' + f1(N()) + ' N' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    syncCtrls();
  }

  /* ── 控件 ──（2026-11-21 按「器材调节面板规范」重排）
     接触面、放置方式、钩码个数（都是几选一）→ 测力计（滑杆）→ 慢拉 / 快拉（动作，拉动中变成「停止拉动」）。
     钩码原来是 − / + 两个小按钮，改成 0～4 个直接选（data-n）。 */
  function ctrls() {
    var ns = []; for (var i = 0; i <= NMAX; i++) ns.push([i, i + ' 个']);
    K.ctrl.innerHTML =
      K.grp('接触面', K.seg('s', Object.keys(SURF).map(function (k) { return [k, SURF[k]]; }))) +
      K.grp('放置', K.seg('side', [['0', '平放'], ['1', '侧放']])) +
      K.grp('钩码', K.seg('n', ns)) +
      K.grp('测力计', '<div class="row"><span class="vl" id="v-x" style="font-size:19px;text-align:left;flex:none;width:118px;min-width:0;white-space:nowrap"></span><input class="rng" type="range" id="s-x" step="0.1" style="flex:1;width:auto"></div>') +
      K.grp('匀速拉', K.acts([['slow', '▶', '慢拉（匀速）'], ['fast', '▶', '快拉（匀速）'], ['back', '↺', '放回左端']]));
    document.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { setSurf(b.getAttribute('data-s')); }; });
    document.querySelectorAll('[data-side]').forEach(function (b) { b.onclick = function () { setSide(b.getAttribute('data-side') === '1'); }; });
    document.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { setN(+b.getAttribute('data-n')); }; });
    var sx = document.getElementById('s-x'); K.rng(sx);
    sx.addEventListener('input', function () { handInput(+sx.value); });
    document.getElementById('slow').onclick = function () { autoPull(SLOW); };
    document.getElementById('fast').onclick = function () { autoPull(FAST); };
    document.getElementById('back').onclick = function () { st.auto = 0; setBlock(XB_MIN); };   // 与 10 的「放回起点」一样：只把木块放回左端，钩码、接触面不变
  }
  function autoPull(v) {   // 慢拉 / 快拉；测力计已经拉到头时不动，给出提示
    if (st.auto === v) { st.auto = 0; last = ''; return; }
    if (atMax()) { st.auto = 0; st.nag = 2.5; st.nagMsg = END_TIP; last = ''; return; }
    st.auto = v; st.nag = 0; last = '';
  }
  function syncCtrls() {
    document.querySelectorAll('[data-s]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-s') === st.surf); });
    document.querySelectorAll('[data-side]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-side') === '1') === st.side); });
    document.querySelectorAll('[data-n]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-n') === st.n); });
    var sx = document.getElementById('s-x'), lo = XB_MIN + HALF + EYE + L0 - 0.8, hi = handMax();
    sx.min = lo; sx.max = hi; if (document.activeElement !== sx) sx.value = st.handT;
    sx.style.setProperty('--p', ((sx.value - lo) / (hi - lo) * 100) + '%');
    document.getElementById('v-x').textContent = '移动 ' + Math.max(0, Math.round(st.hand - lo - 0.8)) + ' cm';   // 从木块在左端、弹簧不受力的位置算起
    var sl = document.getElementById('slow'), fa = document.getElementById('fast');
    sl.classList.toggle('on', st.auto === SLOW); fa.classList.toggle('on', st.auto === FAST);
    document.getElementById('back').disabled = st.xb <= XB_MIN + 0.05 && !st.slide && st.F < 0.02;
    sl.innerHTML = st.auto === SLOW ? '<i>■</i>停止拉动' : '<i>▶</i>慢拉（匀速）'; fa.innerHTML = st.auto === FAST ? '<i>■</i>停止拉动' : '<i>▶</i>快拉（匀速）';
  }
  function preset(i) {
    var P = [['smooth', 0], ['smooth', 0], ['smooth', 1], ['rough', 1], ['smooth', 0], ['smooth', 0]][i];   // 第 4 问照课本：换表面粗糙的长木板
    st.surf = P[0]; st.n = P[1]; st.side = false; st.auto = 0; setBlock(XB_MIN);
  }

  /* ── 数据页 ── */
  var COLORS = { smooth: '#2563EB', rough: '#FE752D', cotton: '#B478FF', towel: '#1B7A50' };
  function graph() {
    var W = 560, Hh = 430, x0 = 64, y0 = 370, x1 = 540, y1 = 30, X = function (v) { return x0 + v / 6 * (x1 - x0); }, Y = function (v) { return y0 - v / 4 * (y0 - y1); }, g = '';
    for (var a = 0; a <= 6; a += 0.5) { var xx = X(a); g += '<line x1="' + xx + '" y1="' + y1 + '" x2="' + xx + '" y2="' + y0 + '" stroke="' + (a % 1 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (a % 1 === 0) g += '<text x="' + xx + '" y="' + (y0 + 24) + '" text-anchor="middle" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + a + '</text>'; }
    for (var b = 0; b <= 4; b += 0.5) { var yy = Y(b); g += '<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="' + (b % 1 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (b % 1 === 0) g += '<text x="' + (x0 - 10) + '" y="' + (yy + 6) + '" text-anchor="end" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + b + '</text>'; }
    g += '<path d="M' + x0 + ' ' + y1 + 'V' + y0 + 'H' + x1 + '" fill="none" stroke="#1E3A5F" stroke-width="2.5"/>';
    g += '<text x="' + (x0 - 4) + '" y="' + (y1 - 10) + '" font-size="18" fill="#1E3A5F">f/N</text><text x="' + x1 + '" y="' + (y0 + 46) + '" text-anchor="end" font-size="18" fill="#1E3A5F">F压/N</text>';
    var lg = 0;
    Object.keys(SURF).forEach(function (k) {
      var R = st.rows.filter(function (r) { return r.surf === k; }); if (!R.length) return;
      var sxy = R.reduce(function (s, r) { return s + r.N * r.f; }, 0), sxx = R.reduce(function (s, r) { return s + r.N * r.N; }, 0), kk = sxy / sxx, xe = Math.min(6, 4 / kk);
      if (R.length > 1) g += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(xe) + '" y2="' + Y(kk * xe) + '" stroke="' + COLORS[k] + '" stroke-width="2.5"/>';
      R.forEach(function (r) { g += '<circle cx="' + X(r.N) + '" cy="' + Y(r.f) + '" r="6" fill="#fff" stroke="' + COLORS[k] + '" stroke-width="3"/>'; });
      g += '<circle cx="' + (x0 + 24 + lg * 118) + '" cy="' + (y1 + 4) + '" r="6" fill="#fff" stroke="' + COLORS[k] + '" stroke-width="3"/><text x="' + (x0 + 36 + lg * 118) + '" y="' + (y1 + 10) + '" font-size="18" fill="#1E3A5F">' + SURF[k] + '</text>'; lg++;
    });
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" style="flex:1;max-height:560px;border:2px solid #C3CEDC;border-radius:12px;background:#fff">' + g + '</svg>';
  }
  function renderData() {
    var both = {};
    st.rows.forEach(function (r) { var c = [r.surf, r.side, r.n].join('|'); both[c] = (both[c] || {}); both[c][r.spd] = 1; });
    var tb = '<table class="rec"><thead><tr><th style="width:19%">次数</th><th>接触面</th><th>木块放置方式</th><th>压力 <span style="white-space:nowrap"><span class="m">F</span>压/N</span></th><th>滑动摩擦力 <span class="m">f</span>/N</th></tr></thead><tbody>' +
      (st.rows.length ? st.rows.map(function (r, k) { var c = both[[r.surf, r.side, r.n].join('|')]; return '<tr><td style="white-space:nowrap">' + (k + 1) + (c['快'] && c['慢'] ? '<small style="color:#56677D">（' + (r.spd === '快' ? '较快' : '较慢') + '）</small>' : '') + '</td><td>' + SURF[r.surf] + '</td><td>' + (r.side ? '侧放' : '平放') + '</td><td class="n">' + f1(r.N) + '</td><td class="n">' + f1(r.f) + '</td></tr>'; }).join('')
        : '<tr><td colspan="5" class="dim" style="text-align:center">还没有记录</td></tr>') + '</tbody></table>';
    return '<div class="dvh"><h2>记录表</h2><button class="act2" id="g-tg" style="font-size:17px">' + (st.graph ? '收起图像' : '展开图像拓展') + '</button></div>' +
      (st.graph ? '<div style="display:flex;gap:20px;align-items:flex-start"><div style="flex:0 0 44%;max-height:620px;overflow:auto">' + tb + '</div>' + graph() + '</div>' : '<div style="max-height:700px;overflow:auto">' + tb + '</div>') +
      '<p class="tip">比较时只看一个条件不同的两次：压力、接触面、放置方式、拉动快慢。</p>';
  }

  window.__exp = { st: st, V: function () { return V; }, scale: function () { return scale; }, block: function () { return block; }, hooks: function () { return hooks; }, tray: function () { return tray; }, fk: fk };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'F', name: '测力计示数 <span class="m">F</span>', unit: 'N' }, { id: 'N', name: '压力 <span class="m">F</span>压', unit: 'N' }],
    init: function (k) {
      K = k; ctrls(); build();
      K.el('<p class="lk-note">拖测力计拉木块，拖木块可放回左端；点钩码盒加钩码，点木块上的钩码取下；拖空白处转视角</p>');
      document.addEventListener('click', function (e) { if (e.target && e.target.id === 'g-tg') { st.graph = !st.graph; K.refreshData(); } });
    },
    preset: preset,
    reset: function () { preset(0); },
    record: function () {
      if (!canRec()) return;
      var v = st.vMean || st.vb;
      st.rows.push({ surf: st.surf, side: st.side, n: st.n, N: N(), f: readF(), v: v, spd: spdCls(v), key: recKey() });
      st.recSig = recSig(); st.recSpd = spdCls(v); st.justRec = st.rows.length; last = '';
    },
    clear: function () { st.rows = []; st.justRec = null; st.recSig = null; st.recSpd = null; last = ''; },
    renderData: renderData
  });
})();
