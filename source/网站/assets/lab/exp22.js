/* 22 探究导体在磁场中运动时产生感应电流的条件（课本图 20.6-2、20.6-3）。
   装置：蹄形磁体侧放在桌上，开口朝右、N 极在上、S 极在下，两极间磁场竖直向下；导线 ab 沿前后方向水平穿过两极之间，
   a、b 两端用软导线接电流表（灵敏电流计，零刻度在中央；页面上按课本叫“电流表”），电路中串一个开关。
   坐标：x 向右，y 向上，z 朝观众；导线 ab 沿 z（a 在后、b 在前）。
   模型：感应电动势 e = B·L·v⊥，v⊥ 只取导线相对磁体的左右速度（既垂直于导线、又垂直于竖直的磁感线）；
   上下运动（顺着磁感线）、沿导线自身方向运动都不切割磁感线，e = 0。导线移出两极之外，B 按边缘场衰减。
   方向：N 极在上时导线向右运动，电流从 b 流向 a，电流计指针向右偏；反向运动或翻转磁体，指针反向。开关断开时没有电流。
   电流计：二阶阻尼（约 1.6 Hz、阻尼比 0.68），偏转 = 0.16 格/(单位速度)，±3.5 格处碰到挡钉；松手后指针回零。
   速度：拖动时导线 / 磁体跟着手走，速度由真实时间里的位移算出（约 60 ms 平滑）。
   观察快照：一次运动从开始拖动起，到下一次运动开始为止，记下运动方向、往返次数和指针的最大偏转；
   松手后指针回零也不影响这次结果。改变开关、磁体方向或强弱后，快照换成“静止”对照。
   「左右往返」按钮：导线（或磁体）在中间位置左右往返 3 次，指针左右来回摆。
   面板（2026-11-21 重排）：磁极｜磁性｜谁运动（导线 ab / 磁体；选中的器材微亮并挂“正在操作”标签）｜运动方向（作用于选中的器材）｜电路开关（默认断开）｜显示磁感线。 */
(function () {
  var MXL = -7, MXR = 8, G = 3.5, T = 2.4,   // MXL/MXR：磁体左右移动范围（不碰引线和电流计）
     XB = -5, XE = 10, W = 5.6, YC = G + T, WL = 6, GRIP = 2, GAIN = 0.16, PIN = 3.5;
  var st = { sw: false, flip: false, strong: false, lines: false, mover: 'w', xw: 2.5, yw: YC, zw: 0, xm: 0, rows: [], justRec: 0 };
  var K, V, T3, magG, magBody, magMs = [], magStrong, lineG, wireG, wHit, gHits = [], swHit, blade, bladeAng = 0, galNeedle, leads = {}, leadKey = '',
    lastGrab = null, selMats = { w: [], m: [] }, hlT = 9, nd = { th: 0, w: 0 }, vel = { w: 0, m: 0 }, prev = null, mot = null, anim = null, dragging = false, winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function xr() { return st.xw - st.xm; }
  function bProfile(x) {   // 两极之间 B = 1；移出开口端后按边缘场衰减
    var e = XE - 0.8; if (x <= e) return 1;
    var u = (x - e) / 1.6; return Math.pow(1 + u * u, -1.5);
  }
  function By() { return (st.flip ? 1 : -1) * (st.strong ? 1.8 : 1); }   // 竖直分量：N 极在上为向下（负）
  function emfDiv(vRelX) { return -GAIN * vRelX * By() * bProfile(xr()); }   // 正 = 指针向右偏
  function lims() { return { xr0: XB + 0.6, xr1: XE + 6, y0: YC - G + 0.6, y1: YC + G - 0.6, z0: -3, z1: 3 }; }

  /* ── 场景 ── */
  function std(c, o) { var m = new T3.MeshStandardMaterial({ color: c, roughness: 0.55 }); for (var k in (o || {})) m[k] = o[k]; return m; }
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function tube(pts, r, mat) { return new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts.map(function (p) { return new T3.Vector3(p[0], p[1], p[2]); })), 60, r, 8, false), mat); }
  function halfShape(up) {   // 蹄形磁体的上半（或下半）：直臂 + 四分之一圆弯头；原点在两极间隙中心线
    var s = up ? 1 : -1, sh = new T3.Shape(), Ro = G + T, n = 24, k, a;
    sh.moveTo(XE, s * G); sh.lineTo(XE, s * Ro); sh.lineTo(XB, s * Ro);
    for (k = 1; k <= n; k++) { a = Math.PI / 2 + k / n * Math.PI / 2; sh.lineTo(XB + Ro * Math.cos(a), s * Ro * Math.sin(a)); }
    sh.lineTo(XB - G, 0);
    for (k = n - 1; k >= 0; k--) { a = Math.PI / 2 + k / n * Math.PI / 2; sh.lineTo(XB + G * Math.cos(a), s * G * Math.sin(a)); }
    sh.lineTo(XE, s * G);
    return sh;
  }
  function letter(ch, bg) {
    return new T3.MeshBasicMaterial({ map: canvasTex(128, 128, function (g) { g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = '#FFFFFF'; g.font = 'bold 104px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); }) });
  }
  function buildMagnet() {
    magG = new T3.Group(); V.scene.add(magG);
    magBody = new T3.Group(); magG.add(magBody);
    var red = std(0xD63A2F, { roughness: 0.42, metalness: 0.15 }), blue = std(0x2F5FB8, { roughness: 0.42, metalness: 0.15 });
    selMats.m = [red, blue];
    [[true, red, 'N', '#D63A2F'], [false, blue, 'S', '#2F5FB8']].forEach(function (h) {
      var m = new T3.Mesh(new T3.ExtrudeGeometry(halfShape(h[0]), { depth: W, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2, curveSegments: 6 }), h[1]);
      m.position.z = -W / 2; m.castShadow = true; m.receiveShadow = true; magBody.add(m); magMs.push(m);
      var yy = (h[0] ? 1 : -1) * (G + T / 2);
      [1, -1].forEach(function (f) {   // 前后两面都印字母（翻转后仍看得见）
        var d = new T3.Mesh(new T3.PlaneGeometry(1.9, 1.9), letter(h[2], h[3])); d.position.set(XE - 1.5, yy, f * (W / 2 + 0.14)); if (f < 0) d.rotation.y = Math.PI; magBody.add(d);
      });
      var pole = new T3.Mesh(new T3.PlaneGeometry(1.9, 1.9), letter(h[2], h[3])); pole.position.set(XE + 0.14, yy, 0); pole.rotation.y = Math.PI / 2; magBody.add(pole);
    });
    // 磁感线：两极之间竖直的几根（随磁体一起翻转）
    lineG = new T3.Group(); magG.add(lineG);
    var lm = new T3.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.8 }), cone = new T3.ConeGeometry(0.32, 0.9, 12);
    [-2, 1.5, 5, 8.5].forEach(function (x) { [-1.6, 1.6].forEach(function (z) {
      var c = new T3.Mesh(new T3.CylinderGeometry(0.06, 0.06, 2 * G - 0.2, 8), lm); c.position.set(x, 0, z); lineG.add(c);
      var a = new T3.Mesh(cone, lm); a.position.set(x, -0.6, z); a.rotation.x = Math.PI; lineG.add(a);   // N（上）→ S（下）
    }); });
  }
  function buildWire() {
    wireG = new T3.Group(); V.scene.add(wireG);
    var cu = new T3.Mesh(new T3.CylinderGeometry(0.3, 0.3, 2 * WL, 20), std(0xC8742F, { metalness: 0.65, roughness: 0.3 })); cu.rotation.x = Math.PI / 2; cu.castShadow = true; wireG.add(cu);
    var gm = std(0x2A2F37, { roughness: 0.5 });
    selMats.w = [cu.material, gm];
    [-1, 1].forEach(function (s) {
      var g = new T3.Mesh(new T3.CylinderGeometry(0.5, 0.5, GRIP, 18), gm); g.rotation.x = Math.PI / 2; g.position.z = s * (WL + GRIP / 2); g.castShadow = true; wireG.add(g);
      var h = new T3.Mesh(new T3.CylinderGeometry(1.3, 1.3, GRIP + 0.8, 10), new T3.MeshBasicMaterial({ visible: false })); h.rotation.x = Math.PI / 2; h.position.z = s * (WL + GRIP / 2 + 0.2); wireG.add(h); gHits.push(h);
    });
    wHit = new T3.Mesh(new T3.CylinderGeometry(1.1, 1.1, 2 * WL - 0.4, 10), new T3.MeshBasicMaterial({ visible: false })); wHit.rotation.x = Math.PI / 2; wireG.add(wHit);
  }
  function buildGalv() {
    var g = new T3.Group(); g.position.set(-19, 0, 9); g.rotation.y = 0.62; V.scene.add(g);
    var face = canvasTex(720, 560, function (c, w, h) {
      c.fillStyle = '#F7F4EA'; c.fillRect(0, 0, w, h);
      var px = 360, py = 470, R = 330; c.strokeStyle = '#1E3A5F'; c.fillStyle = '#1E3A5F';
      c.lineWidth = 4; c.beginPath(); c.arc(px, py, R, -Math.PI / 2 - Math.PI / 4, -Math.PI / 2 + Math.PI / 4); c.stroke();
      for (var d = -30; d <= 30; d++) {
        var a = d / 10 * 15 * Math.PI / 180, l = d % 10 === 0 ? 44 : d % 5 === 0 ? 30 : 18, sx = Math.sin(a), sy = -Math.cos(a);
        c.lineWidth = d % 10 === 0 ? 5 : 2.6; c.beginPath(); c.moveTo(px + sx * R, py + sy * R); c.lineTo(px + sx * (R - l), py + sy * (R - l)); c.stroke();
        if (d % 10 === 0) { c.font = 'bold 44px Bahnschrift, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.abs(d / 10)), px + sx * (R + 32), py + sy * (R + 32)); }
      }
      c.font = 'bold 64px Times New Roman, serif'; c.fillText('G', px, py - 120);
    });
    var box = new T3.Mesh(new T3.BoxGeometry(10, 8, 3.4), [std(0x2E3744), std(0x2E3744), std(0x37414F), std(0x2E3744), std(0x2E3744), std(0x2E3744)]); box.position.y = 4; box.castShadow = true; g.add(box);
    var fm = new T3.Mesh(new T3.PlaneGeometry(9, 7), new T3.MeshStandardMaterial({ map: face, roughness: 0.6, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.25 })); fm.position.set(0, 4.1, 1.71); g.add(fm);
    var glass = new T3.Mesh(new T3.PlaneGeometry(9, 7), new T3.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, shininess: 120, depthWrite: false })); glass.position.set(0, 4.1, 1.95); g.add(glass);
    galNeedle = new T3.Group(); galNeedle.position.set(0, 4.1 - 3.5 + 7 * (90 / 560), 1.78); g.add(galNeedle);
    var nm = new T3.Mesh(new T3.BoxGeometry(0.09, 4.0, 0.04), new T3.MeshBasicMaterial({ color: 0xE2551C })); nm.position.y = 2.0; galNeedle.add(nm);
    var hub = new T3.Mesh(new T3.CircleGeometry(0.28, 20), new T3.MeshBasicMaterial({ color: 0x1E3A5F })); hub.position.z = 0.03; galNeedle.add(hub);
    [[-3, 0xD93A2B], [3, 0x2B2F36]].forEach(function (p) { var t = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 1, 16), std(p[1])); t.position.set(p[0], 8.5, 0.4); g.add(t); });
    g.updateMatrixWorld(true);
    var w = function (x, y, z) { return g.localToWorld(new T3.Vector3(x, y, z)).toArray(); };
    leads.gA = w(-3, 8.9, 0.4); leads.gB = w(3, 8.9, 0.4);
    leads.gA1 = w(-3.2, 8.2, -1.4); leads.gB1 = w(5.5, 7.4, 0.5); leads.gB2 = w(5.7, 0.4, 0.9);   // a 线从电流计后面、b 线沿右侧面接上去，不挡表盘
  }
  function buildSwitch() {
    var swG = new T3.Group(); swG.position.set(2, 0, 17); swG.rotation.y = 0.62; V.scene.add(swG);
    var base = new T3.Mesh(new T3.BoxGeometry(8, 0.8, 3.2), std(0xF3F1EA, { roughness: 0.5 })); base.position.y = 0.4; base.castShadow = true; swG.add(base);
    var brass = std(0xC9A24A, { metalness: 0.7, roughness: 0.3 });
    [-3.3, 3.3].forEach(function (x) { var post = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 1, 16), brass); post.position.set(x, 1.3, 0); swG.add(post); });
    var clip = new T3.Mesh(new T3.BoxGeometry(0.5, 1.3, 1.1), brass); clip.position.set(-1.9, 1.45, 0); swG.add(clip);
    var hinge = new T3.Mesh(new T3.BoxGeometry(0.6, 1.4, 1.1), brass); hinge.position.set(2.3, 1.5, 0); swG.add(hinge);
    blade = new T3.Group(); blade.position.set(2.3, 1.9, 0); swG.add(blade);
    var bl = new T3.Mesh(new T3.BoxGeometry(5.2, 0.22, 0.7), std(0xD08A3E, { metalness: 0.7, roughness: 0.3 })); bl.position.x = -2.6; bl.castShadow = true; blade.add(bl);
    var hd = new T3.Mesh(new T3.CylinderGeometry(0.45, 0.45, 1.6, 16), std(0x2B2F36)); hd.position.set(-5.4, 0.5, 0); blade.add(hd);
    swHit = new T3.Mesh(new T3.BoxGeometry(9, 5, 4.6), new T3.MeshBasicMaterial({ visible: false })); swHit.position.y = 2; swG.add(swHit);
    swG.updateMatrixWorld(true); leads.sA = swG.localToWorld(new T3.Vector3(3.3, 1.85, 0)).toArray(); leads.sB = swG.localToWorld(new T3.Vector3(-3.3, 1.85, 0)).toArray();
  }
  function buildLeads() {
    var key = [st.xw, st.yw, st.zw].map(function (v) { return v.toFixed(2); }).join(',');
    if (key === leadKey) return; leadKey = key;
    ['a', 'b', 'c'].forEach(function (k) { if (leads[k]) { V.scene.remove(leads[k]); leads[k].geometry.dispose(); } });
    var red = std(0xD8392B, { roughness: 0.45 }), blk = std(0x27303B, { roughness: 0.45 });
    var x = st.xw, y = st.yw, z = st.zw, ea = z - WL - GRIP, eb = z + WL + GRIP, A = leads.gA, B = leads.gB;
    var top = YC + G + T + 0.8;   // a 端引线从磁体后上方绕过去，不从两极之间穿过
    leads.a = tube([[x, y, ea], [x + 0.2, y + 0.8, ea - 1.6], [x - 1, top, ea - 2.4], [Math.min(x - 8, -5), top - 0.2, -8.5], [-23, top, -6], leads.gA1, A], 0.17, blk);
    var SA = leads.sA, SB = leads.sB;
    leads.b = tube([[x, y, eb], [x + 0.3, y - 0.6, eb + 1.6], [SA[0], 1.2, SA[2] - 2.2], [SA[0], SA[1] + 0.6, SA[2] - 0.6], SA], 0.17, red);
    leads.c = tube([SB, [SB[0] - 0.8, 0.6, SB[2] - 0.4], [SB[0] - 5, 0.3, SB[2] - 2.5], leads.gB2, leads.gB1, B], 0.17, red);
    ['a', 'b', 'c'].forEach(function (k) { leads[k].castShadow = true; V.scene.add(leads[k]); });
  }
  var labA, labB;
  function endLabel(ch) {   // 导线两端的字母 a、b（始终画在最上层，不被磁体挡住）
    var sp = new T3.Sprite(new T3.SpriteMaterial({ map: canvasTex(128, 128, function (g) { g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#1E3A5F'; g.stroke(); g.fillStyle = '#1E3A5F'; g.font = 'italic bold 78px Times New Roman, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 58); }), depthTest: false }));
    sp.scale.set(1.7, 1.7, 1); sp.renderOrder = 5; return sp;
  }
  function build() {
    V = K.three({ target: [-3, 5, 4], az: 0.62, el: 0.3, dist: 66, minDist: 45, maxDist: 120, minAz: -1.0, maxAz: 1.2, minEl: 0.1, maxEl: 1.2, fov: 32, sun: [-30, 100, 70] });
    T3 = V.T;
    buildMagnet(); buildWire(); buildGalv(); buildSwitch();
    V.tag('sw', '开关'); V.tag('who', '');
    labA = endLabel('a'); labB = endLabel('b'); wireG.add(labA); wireG.add(labB); labA.position.set(0, 0, -WL - GRIP - 1.1); labB.position.set(0, 0, WL + GRIP + 1.1);
    staticSnap(); setupDrag();
    V.frame = tick;
  }

  /* ── 运动记录（快照） ── */
  function newMotion(mover, axis) {
    mot = { mover: mover, axis: axis, path: 0, net: 0, ext: 0, sgn: 0, rev: 0, pkR: 0, pkL: 0, sw: st.sw, active: true, n: { th: 0, w: 0 } };
    st.justRec = 0; K.invalidate(); last = '';
  }
  function staticSnap() { mot = { mover: null, axis: null, path: 0, net: 0, rev: 0, pkR: 0, pkL: 0, sw: st.sw, active: false, still: true }; }
  function track(d) {   // d：本次位移（沿锁定的方向）
    if (!mot || !mot.active || !d) return;
    mot.path += Math.abs(d); mot.net += d;
    var s = d > 0 ? 1 : -1;
    if (!mot.sgn) { mot.sgn = s; mot.ext = mot.net; return; }
    if (s === mot.sgn) { if ((s > 0 && mot.net > mot.ext) || (s < 0 && mot.net < mot.ext)) mot.ext = mot.net; }
    else if (Math.abs(mot.net - mot.ext) > 1.2) { mot.rev++; mot.sgn = s; mot.ext = mot.net; }
  }
  function motText(m) {
    if (!m || m.still) return '导线静止';
    var back = m.rev >= 1;
    if (m.mover === 'm') return back ? '磁体左右往返（导线不动）' : '磁体向' + (m.net > 0 ? '右' : '左') + '运动（导线不动）';
    if (m.axis === 'z') return '导线沿自身方向运动';
    if (m.axis === 'y') return back ? '导线上下往返' : '导线向' + (m.net > 0 ? '上' : '下') + '运动';
    return back ? '导线左右往返' : '导线向' + (m.net > 0 ? '右' : '左') + '运动';
  }
  function deflText(m) {   // 单向运动停下时指针会略微回摆，只按主要偏转判断；往返运动两边都明显偏才算来回摆
    var t = 0.15, R = m.pkR, L = -m.pkL, big = Math.max(R, L);
    if (big < t) return '不偏转';
    if (m.rev >= 1 && Math.min(R, L) > Math.max(t, 0.3 * big)) return '左右来回摆';
    return R >= L ? '向右偏' : '向左偏';
  }
  function tiny() { return mot && !mot.still && mot.path < 1; }
  function moving() { return dragging || !!anim; }
  function snapReady() { return mot && !moving() && !tiny() && (!mot.still || Math.abs(nd.th) < 0.05); }

  /* ── 位置设定（都经过约束） ── */
  function setW(axis, v) {
    var l = lims(), o;
    if (axis === 'x') { o = st.xw; st.xw = clamp(v, st.xm + l.xr0, st.xm + l.xr1); track(st.xw - o); }
    else if (axis === 'y') { o = st.yw; st.yw = clamp(v, l.y0, l.y1); track(st.yw - o); }
    else { o = st.zw; st.zw = clamp(v, l.z0, l.z1); track(st.zw - o); }
  }
  function setM(v) { var l = lims(), o = st.xm; st.xm = clamp(v, Math.max(MXL, st.xw - l.xr1), Math.min(MXR, st.xw - l.xr0)); track(st.xm - o); }

  /* ── 拖动：导线左右 / 上下（按开始拖的方向锁定），绝缘柄沿导线方向，磁体左右；不动就是点按 ── */
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function axisVec(a) { return new T3.Vector3(a === 'x' ? 1 : 0, a === 'y' ? 1 : 0, a === 'z' ? 1 : 0); }
  function setupDrag() {
    var grab = null;
    function lock(ax) {
      var a = axisVec(ax), cd = V.camera.position.clone().sub(grab.p), n = cd.sub(a.clone().multiplyScalar(cd.dot(a))).normalize();
      grab.ax = ax; grab.plane = new T3.Plane().setFromNormalAndCoplanarPoint(n, grab.p);
      grab.v0 = grab.k === 'm' ? st.xm : ax === 'x' ? st.xw : ax === 'y' ? st.yw : st.zw;
      anim = null; dragging = true; newMotion(grab.k === 'm' ? 'm' : 'w', ax);
      var mv = grab.k === 'm' ? 'm' : 'w'; if (st.mover !== mv) { st.mover = mv; hlT = 0; last = ''; }   // 直接拖谁，「谁运动」就跟着选谁
    }
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, gHits.concat([wHit, swHit], magMs)); },
      start: function (ev) {
        var h = V.pick(ev, gHits.concat([wHit], magMs)), k = null;   // 取最近的：磁体挡在前面就拖磁体
        if (h) k = magMs.indexOf(h.object) >= 0 ? 'm' : gHits.indexOf(h.object) >= 0 ? 'grip' : 'w';
        else { h = V.pick(ev, [swHit]); if (h) k = 'sw'; }
        if (!k) return false;
        grab = { k: k, p: h.point.clone(), s: stagePt(ev), moved: false, ax: null };
        lastGrab = k;
        return true;
      },
      move: function (ev) {
        if (!grab) return;
        var s = stagePt(ev), dx = s.x - grab.s.x, dy = s.y - grab.s.y;
        if (!grab.moved) { if (Math.hypot(dx, dy) < 6) return; grab.moved = true; }
        if (grab.k === 'sw') return;
        if (!grab.ax) {
          if (grab.k === 'grip') lock('z');
          else if (grab.k === 'm') lock('x');
          else {   // 导线：比较按下点处 x、y 方向在屏幕上的投影，取和手的移动最一致的那个
            var p0 = V.toScreen(grab.p), best = 'x', bc = -1;
            ['x', 'y'].forEach(function (ax) { var p1 = V.toScreen(grab.p.clone().add(axisVec(ax))), ux = p1.x - p0.x, uy = p1.y - p0.y, c = Math.abs(ux * dx + uy * dy) / (Math.hypot(ux, uy) * Math.hypot(dx, dy) || 1); if (c > bc) { bc = c; best = ax; } });
            lock(best);
          }
        }
        var p = V.onPlane(ev, grab.plane); if (!p) return;
        var d = p.clone().sub(grab.p).dot(axisVec(grab.ax));
        if (grab.k === 'm') setM(grab.v0 + d); else setW(grab.ax, grab.v0 + d);
      },
      end: function () {
        if (grab && !grab.moved && grab.k === 'sw') setSw(!st.sw);
        if (grab && grab.ax) { dragging = false; if (mot) mot.active = false; last = ''; }
        grab = null;
      }
    };
  }

  /* ── 按钮：按标准方式动一次（真实时间推进，和拖动用同一个模型） ── */
  var MID = (XB + XE) / 2, OSC_A = 3.5, OSC_N = 3, OSC_P = 1.3;   // 往返：以两极正中为中心，振幅 3.5，往返 3 次，每次约 1.3 s
  function go(dir) {
    if (dragging) return;
    var l = lims(), m = st.mover, ax, from, to;
    if (dir === 'O') {   // 左右往返
      if (m === 'm') anim = { osc: true, m: 'm', ax: 'x', from: st.xm, to: st.xw - MID, t: 0, T: OSC_N * OSC_P };
      else anim = { osc: true, m: 'w', ax: 'x', from: st.xw, to: st.xm + MID, t: 0, T: OSC_N * OSC_P };
      newMotion(m, 'x'); return;
    }
    // 左右运动每次都从两极正中出发（先 0.4 s 摆回中间，不产生感应电流），偏转格数才前后一致
    if ((dir === 'L' || dir === 'R') && (Math.abs(st.xm) > 0.3 || Math.abs(xr() - MID) > 0.3)) {
      anim = { home: true, t: 0, T: 0.4, x0: [st.xw, st.yw, st.zw, st.xm], x1: [MID, st.yw, st.zw, 0], then: function () { go(dir); } };
      return;
    }
    if (m === 'm') { if (dir !== 'L' && dir !== 'R') return; ax = 'x'; from = st.xm; to = clamp(from + (dir === 'R' ? 6 : -6), Math.max(MXL, st.xw - l.xr1), Math.min(MXR, st.xw - l.xr0)); }
    else if (dir === 'L' || dir === 'R') { ax = 'x'; from = st.xw; to = clamp(from + (dir === 'R' ? 6 : -6), st.xm + l.xr0, st.xm + l.xr1); }
    else if (dir === 'U' || dir === 'D') { ax = 'y'; from = st.yw; to = dir === 'U' ? l.y1 : l.y0; }
    else { ax = 'z'; from = st.zw; to = from <= 0 ? l.z1 : l.z0; }
    if (Math.abs(to - from) < 0.8) { K.warn('这个方向已经到头了，先往反方向移一些'); setTimeout(function () { K.warn(''); }, 1600); return; }
    anim = { m: m, ax: ax, from: from, to: to, t: 0, T: 0.55 + Math.abs(to - from) * 0.02 };
    newMotion(m, ax);
  }

  /* ── 每帧 ── */
  function tick(dt) {
    if (anim && anim.home && dt) {
      anim.t = Math.min(1, anim.t + dt / anim.T);
      var e = (1 - Math.cos(Math.PI * anim.t)) / 2, a0 = anim.x0, a1 = anim.x1;
      st.xw = a0[0] + (a1[0] - a0[0]) * e; st.yw = a0[1] + (a1[1] - a0[1]) * e; st.zw = a0[2] + (a1[2] - a0[2]) * e; st.xm = a0[3] + (a1[3] - a0[3]) * e;
      if (prev) { prev.xw = st.xw; prev.xm = st.xm; }   // 摆回中间不产生感应电流
      if (anim.t >= 1) { var then = anim.then; anim = null; staticSnap(); K.invalidate(); st.justRec = 0; last = ''; if (then) then(); }
    } else if (anim && dt) {
      anim.t = Math.min(1, anim.t + dt / anim.T);
      var v = anim.osc ? anim.from + (anim.to - anim.from) * Math.min(1, anim.t * OSC_N) * (2 - Math.min(1, anim.t * OSC_N)) + OSC_A * Math.sin(2 * Math.PI * OSC_N * anim.t) * (anim.m === 'm' ? -1 : 1)
        : anim.from + (anim.to - anim.from) * (1 - Math.cos(Math.PI * anim.t)) / 2;
      if (anim.m === 'm') setM(v); else setW(anim.ax, v);
      if (anim.t >= 1) { anim = null; if (mot) mot.active = false; last = ''; }
    }
    if (dt) {
      if (!prev) prev = { xw: st.xw, xm: st.xm };
      var k = Math.min(1, dt / 0.06);
      vel.w += ((st.xw - prev.xw) / dt - vel.w) * k; vel.m += ((st.xm - prev.xm) / dt - vel.m) * k;
      prev.xw = st.xw; prev.xm = st.xm;
      var tgt = st.sw ? clamp(emfDiv(vel.w - vel.m), -PIN - 0.3, PIN + 0.3) : 0, w0 = 2 * Math.PI * 1.6, sub = 4, h = dt / sub;
      var step = function (n) { for (var i = 0; i < sub; i++) { n.w += (w0 * w0 * (tgt - n.th) - 2 * 0.68 * w0 * n.w) * h; n.th += n.w * h; if (Math.abs(n.th) > PIN) { n.th = PIN * Math.sign(n.th); n.w = -0.2 * n.w; } } if (Math.abs(n.th) < 1e-4 && Math.abs(n.w) < 1e-3) { n.th = 0; n.w = 0; } };
      step(nd);
      // 这次运动自己引起的偏转：同样的指针从静止开始受同一电流（上一次运动残留的摆动不算进来）
      if (mot && !mot.still) { step(mot.n); mot.pkR = Math.max(mot.pkR, mot.n.th); mot.pkL = Math.min(mot.pkL, mot.n.th); }
    }
    bladeAng += ((st.sw ? 0 : -0.95) - bladeAng) * (dt ? Math.min(1, dt * 12) : 0); blade.rotation.z = bladeAng;
    magG.position.set(st.xm, YC, 0);
    var fr = st.flip ? Math.PI : 0; magG.rotation.x += (fr - magG.rotation.x) * (dt ? Math.min(1, dt * 7) : 0); if (Math.abs(fr - magG.rotation.x) < 0.002) magG.rotation.x = fr;
    magBody.scale.z = st.strong ? 1.35 : 1;
    lineG.visible = st.lines;
    highlight(dt);
    wireG.position.set(st.xw, st.yw, st.zw);
    galNeedle.rotation.z = -nd.th * 15 * Math.PI / 180;
    buildLeads();
    V.placeTag('sw', new T3.Vector3(2, 4.4, 17));
    drawWin(); ui();
  }

  /* ── 观察窗：电流计表盘 ── */
  function drawWin() {
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:340px"><h3><span>电流表</span><small>灵敏电流计，零刻度在中央</small></h3><svg viewBox="0 0 320 178"></svg></div>');
    var key = Math.round(nd.th * 200) + '|' + st.sw;
    if (key === winKey) return; winKey = key;
    var px = 160, py = 168, R = 138, s = '<rect x="1" y="1" width="318" height="176" rx="8" fill="#FBF9F2" stroke="#C3CEDC" stroke-width="1.5"/>';
    s += '<path d="M' + (px - R * Math.sin(Math.PI / 4)) + ' ' + (py - R * Math.cos(Math.PI / 4)) + ' A' + R + ' ' + R + ' 0 0 1 ' + (px + R * Math.sin(Math.PI / 4)) + ' ' + (py - R * Math.cos(Math.PI / 4)) + '" fill="none" stroke="#1E3A5F" stroke-width="2"/>';
    for (var d = -30; d <= 30; d++) {
      var a = d * 1.5 * Math.PI / 180, l = d % 10 === 0 ? 16 : d % 5 === 0 ? 11 : 6, sx = Math.sin(a), sy = -Math.cos(a);
      s += '<line x1="' + (px + sx * R).toFixed(1) + '" y1="' + (py + sy * R).toFixed(1) + '" x2="' + (px + sx * (R - l)).toFixed(1) + '" y2="' + (py + sy * (R - l)).toFixed(1) + '" stroke="#1E3A5F" stroke-width="' + (d % 5 ? 1 : 1.8) + '"/>';
      if (d % 10 === 0) s += '<text x="' + (px + sx * (R + 13)).toFixed(1) + '" y="' + (py + sy * (R + 13) + 5).toFixed(1) + '" text-anchor="middle" font-size="16" font-family="Bahnschrift" fill="#1E3A5F">' + Math.abs(d / 10) + '</text>';
    }
    s += '<text x="' + px + '" y="' + (py - 52) + '" text-anchor="middle" font-size="26" font-style="italic" font-family="Times New Roman" fill="#1E3A5F">G</text>';
    s += '<text x="' + (px - 92) + '" y="' + (py - 6) + '" text-anchor="middle" font-size="14" fill="#56677D">← 向左偏</text><text x="' + (px + 92) + '" y="' + (py - 6) + '" text-anchor="middle" font-size="14" fill="#56677D">向右偏 →</text>';
    var na = nd.th * 15 * Math.PI / 180;
    s += '<line x1="' + px + '" y1="' + py + '" x2="' + (px + Math.sin(na) * (R - 4)).toFixed(1) + '" y2="' + (py - Math.cos(na) * (R - 4)).toFixed(1) + '" stroke="#FE752D" stroke-width="3.5" stroke-linecap="round"/><circle cx="' + px + '" cy="' + py + '" r="6" fill="#1E3A5F"/>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function row() { return { sw: mot && !mot.still ? (mot.sw ? '闭合' : '断开') : (st.sw ? '闭合' : '断开'), field: st.flip ? '竖直向上' : '竖直向下', mag: st.strong ? '强' : '弱', mot: motText(mot), defl: deflText(mot) }; }
  function dup() { var r = row(); return st.rows.some(function (x) { return x.sw === r.sw && x.field === r.field && x.mag === r.mag && x.mot === r.mot && x.defl === r.defl; }); }
  function canRec() { return snapReady() && K.revealed() && !dup() && st.rows.length < 16; }
  function nextStep() {
    var has = function (f) { return st.rows.some(f); };
    var L = [
      [function (r) { return r.sw === '闭合' && r.mot === '导线向右运动'; }, '点「向右」，导线向右运动。'],
      [function (r) { return r.sw === '闭合' && r.mot === '导线向左运动'; }, '再点「向左」。'],
      [function (r) { return r.sw === '闭合' && /导线向[上下]/.test(r.mot); }, '点「向上」或「向下」。'],
      [function (r) { return r.sw === '闭合' && /沿自身/.test(r.mot); }, '点「沿导线」。'],
      [function (r) { return r.sw === '断开' && /导线向[左右]/.test(r.mot); }, '断开开关，再左右运动。'],
      [function (r) { return r.sw === '闭合' && /磁体/.test(r.mot); }, '「谁运动」选磁体，再左右移动。'],
      [function (r) { return r.field === '竖直向上' && /导线向[左右]/.test(r.mot); }, '换成 N 极在下，再左右运动。'],
      [function (r) { return /往返/.test(r.mot); }, '点「左右往返」。']
    ];
    for (var i = 0; i < L.length; i++) if (!has(L[i][0])) {
      var t = L[i][1];
      if (!st.sw && !/^断开开关/.test(t)) t = '闭合开关，' + t.replace(/^再/, '');   // 开关默认断开   // 开关断开时，下一步先说闭合开关
      return t;
    }
    return '到「数据」比较各组。';
  }
  function ui() {
    var rd = snapReady(), ok = canRec(), hint, tone = '';
    var checks = [];   // 开关状态看面板「电路」一行，运动状态看下面的提示；不再列检查项，右栏一屏放得下（展开「当前任务」时记录按钮也看得见）
    if (moving()) hint = '看指针往哪边偏、偏多大。';
    else if (tiny()) { hint = '运动太小，再拖远一些。'; tone = 'warn'; }
    else if (!rd) hint = '等指针停稳。';
    else if (st.justRec) { hint = '已记下。下一步：' + nextStep(); tone = 'good'; }
    else if (mot.still && !st.sw && K.S.q !== 3) hint = '开关断开着，先闭合开关，再让' + (st.mover === 'm' ? '磁体' : '导线') + '运动。';
    else if (!K.revealed()) hint = mot.still ? '导线静止，看指针。' : '刚才' + motText(mot) + (mot.sw ? '' : '（开关断开）') + '，指针怎样偏？';
    else if (dup()) hint = '这种情况记过了，换一种运动再试。';
    else if (!mot.still && !mot.sw && mot.mover === 'm') hint = '开关断开，指针不偏。闭合后再移动磁体。';
    else if (st.rows.length >= 16) hint = '已记满 16 组，可以到「数据」比较。';
    else { hint = '可以记录。'; tone = 'good'; }
    var r = row(), big = Math.max(Math.abs(mot.pkR), Math.abs(mot.pkL));
    // 结果框尽量一行写完（展开任务、答案时右栏不溢出）：“磁体向左运动（导线不动）”写成“磁体向左（导线不动）”，“最大约”写成“约”
    var result = r.mot.replace('运动（导线不动）', '（导线不动）') + (r.sw === '断开' ? '（开关断开）' : '') + '：指针<b>' + r.defl + '</b>' + (r.defl === '不偏转' ? '' : (r.defl === '左右来回摆' ? '，约 <b>' : '约 <b>') + big.toFixed(1) + '</b> 格');
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: rd, btn: ['显示观察结果'], result: result });
    var key = [ok, rd, st.sw, st.flip, st.strong, st.lines, st.mover, st.rows.length, K.revealed(), moving(), r.mot, r.defl].join('|');
    if (key === last) return; last = key;
    K.setReading('g', rd && K.revealed() ? r.defl : null);
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 组' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 组');
    K.ctrlTag('磁场方向' + (st.flip ? '竖直向上' : '竖直向下'));
    syncCtrls();
  }

  /* ── 控件 ── */
  /* 换「谁运动」（导线 / 磁体）时，导线不在两极正中就先把导线、磁体轻轻摆回中间（不算一次运动，指针不受影响），左右都能移够距离；
     选中的器材闪一下并保持微亮，旁边挂“正在操作”标签；方向按钮上方写明“让导线 / 让磁体”运动 */
  function setMover(m) {
    if (moving()) return;
    st.mover = m; hlT = 0; last = '';
    if (Math.abs(st.xm) > 0.3 || Math.abs(xr() - MID) > 0.3 || Math.abs(st.yw - YC) > 0.3 || Math.abs(st.zw) > 0.3) {
      anim = { home: true, t: 0, T: 0.5, x0: [st.xw, st.yw, st.zw, st.xm], x1: [MID, YC, 0, 0] };
    }
  }
  function highlight(dt) {
    hlT += dt || 0;
    var pulse = hlT < 1.6 ? 0.3 * (0.5 + 0.5 * Math.cos(hlT * 11)) * (1 - hlT / 1.6) : 0;
    ['w', 'm'].forEach(function (k) { selMats[k].forEach(function (m) { if (!m.userData.em) { m.emissive.setHex(0xFFF1C2); m.userData.em = 1; } m.emissiveIntensity = st.mover === k ? (k === 'w' ? 0.14 : 0.06) + pulse : 0; }); });
    var tg = V.tag('who'), tx = '<i></i>正在操作：' + (st.mover === 'm' ? '磁体' : '导线 ab');
    if (tg.innerHTML !== tx) tg.innerHTML = tx;
    V.placeTag('who', st.mover === 'm' ? new T3.Vector3(st.xm + XB + 1, YC + G + T + 0.8, -W / 2) : new T3.Vector3(st.xw - 7, st.yw + 0.3, st.zw + WL + GRIP + 1.1));   // 导线：标签挂在 b 端左边，不挡导线
  }
  function setSw(v) { st.sw = v; staticSnap(); K.invalidate(); st.justRec = 0; last = ''; }
  function magSet(k, v) { if (moving() || st[k] === v) return; st[k] = v; staticSnap(); K.invalidate(); st.justRec = 0; last = ''; }
  /* 面板：先选磁体状态和“谁运动”，再点运动方向，最后是电路开关和显示 */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('磁体', '<div style="display:flex;gap:8px">' + K.seg('pole', [['n', 'N 极在上'], ['s', 'N 极在下']]).replace('class="seg"', 'class="seg" style="flex:1.3"') +
        K.seg('mag', [['weak', '弱磁体'], ['strong', '强磁体']]).replace('class="seg"', 'class="seg" style="flex:1"') + '</div>') +   // 同一个磁体的两项设定（磁极朝向、强弱），都是“选择”，并排省一行
      K.grp('谁运动', K.seg('m', [['w', '导线 ab'], ['m', '磁体']])) +
      K.grp('<b id="dir-who" style="color:var(--blue)">让导线</b><br>往哪动', K.acts([['d-L', '←', '向左'], ['d-R', '→', '向右'], ['d-O', '⇄', '左右往返']]) + K.acts([['d-U', '↑', '向上'], ['d-D', '↓', '向下'], ['d-Z', '↙', '沿导线']])) +
      K.grp('电路', '<div class="acts">' + K.sw('c-sw', '开关', '闭合', '断开', st.sw) + '</div>') +
      K.grp('显示', '<div class="acts">' + K.sw('c-lines', '磁感线', '显示', '隐藏', st.lines) + '</div>');
    var $ = function (id) { return document.getElementById(id); };
    document.querySelectorAll('[data-pole]').forEach(function (b) { b.onclick = function () { magSet('flip', b.getAttribute('data-pole') === 's'); }; });
    document.querySelectorAll('[data-mag]').forEach(function (b) { b.onclick = function () { magSet('strong', b.getAttribute('data-mag') === 'strong'); }; });
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { setMover(b.getAttribute('data-m')); }; });
    ['L', 'R', 'O', 'U', 'D', 'Z'].forEach(function (d) { $('d-' + d).onclick = function () { go(d); }; });
    $('c-sw').onclick = function () { setSw(!st.sw); };
    $('c-lines').onclick = function () { st.lines = !st.lines; last = ''; };
  }
  function syncCtrls() {
    var $ = function (id) { return document.getElementById(id); };
    document.querySelectorAll('[data-pole]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-pole') === 's') === st.flip); });
    document.querySelectorAll('[data-mag]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-mag') === 'strong') === st.strong); });
    document.querySelectorAll('[data-m]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === st.mover); });
    ['U', 'D', 'Z'].forEach(function (d) { $('d-' + d).disabled = st.mover === 'm'; });
    var who = st.mover === 'm' ? '让磁体' : '让导线'; if ($('dir-who').textContent !== who) $('dir-who').textContent = who;   // 方向按钮作用于「谁运动」选中的器材；磁体只能左右移动
    K.setSw('c-sw', st.sw); K.setSw('c-lines', st.lines);
  }

  function preset(i) {
    // 全部：N 极在上，导线和磁体在中间且静止，开关断开（默认断开，需要闭合的问由老师自己闭合）；第 5 问「谁运动」选磁体
    st.sw = false; st.flip = false; st.strong = false; st.lines = false; st.mover = i === 4 ? 'm' : 'w';
    st.xm = 0; st.xw = (XB + XE) / 2; st.yw = YC; st.zw = 0; hlT = 9;
    anim = null; dragging = false; nd.th = 0; nd.w = 0; vel.w = vel.m = 0; prev = null; bladeAng = st.sw ? 0 : -0.95;
    if (magG) magG.rotation.x = 0;
    staticSnap(); K.invalidate(); st.justRec = 0; last = '';
    tick(0); V.scene.updateMatrixWorld();   // 器材立刻就位，马上点选也准确
  }

  window.__exp = {
    st: st, V: function () { return V; }, nd: nd, mot: function () { return mot; }, vel: vel, emfDiv: emfDiv, YC: YC, WL: WL, GRIP: GRIP,
    wire: function () { return wireG; }, mag: function () { return magG; }, ready: snapReady, moving: moving, leads: function () { return leads; }, magMs: function () { return magMs; }, XB: XB, XE: XE, G: G, T: T, W: W, lastGrab: function () { return lastGrab; }
  };
  LabKit.run({
    readings: [{ id: 'g', name: '指针', unit: '' }],
    init: function (k) { K = k; ctrls(); build(); document.querySelectorAll('.lk-rd .vl').forEach(function (e) { e.style.minWidth = '0'; e.style.textAlign = 'left'; }); K.el('<p class="lk-note">拖导线 ab 左右、上下运动，拖两端的绝缘柄沿导线方向推拉；拖磁体左右移动；点开关通断（默认断开）；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; st.rows.push(row()); st.justRec = st.rows.length; last = ''; },
    clear: function () { st.rows = []; st.justRec = 0; last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:1100px"><thead><tr><th style="width:80px">次数</th><th style="width:120px">开关</th><th style="width:150px">磁场方向</th><th style="width:110px">磁体强弱</th><th>导体运动情况</th><th style="width:200px">指针偏转情况</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + '</td><td>' + r.sw + '</td><td>' + r.field + '</td><td>' + (r.mag === '强' ? '较强' : '较弱') + '</td><td>' + r.mot + '</td><td>' + r.defl + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table>';
    }
  });
})();
