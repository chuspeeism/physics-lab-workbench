/* 21 探究通电螺线管外部磁场的方向（课本图 20.2-3、20.2-4）。
   装置：螺线管水平放置、轴线东西向，穿过一块水平透明塑料板（板面过轴线）；板上一圈 16 枚小磁针（N 极红色）；
   螺线管两端引线经开关接电池盒；另有铁棒（可插入螺线管）和铁屑（撒在塑料板上，轻敲后排列）。
   坐标：x 向东（画面右），z 向南（朝观众），北 = −z；y 向上。
   （绕法叫“一 / 二”，不用“甲 / 乙”：课本图 20.2-4 的甲、乙是同一绕法的两种电流方向，避免混淆。）
   模型：螺线管 = 30 个等距圆电流，用椭圆积分精确式算板面（过轴线的平面）内的磁场；插入铁棒磁场 ×3。
   极性：绕法一的导线从左端起绕向与右手绕 +x 轴的方向一致，电流从左端流入时右端是 N 极（安培定则）；
   绕法二或电流从右端流入，N、S 极对调。地磁场指北，约为磁针处螺线管磁场的 5%；断电时磁针只受地磁场作用。
   小磁针：有阻尼的转动（约 1.5～2 s 停稳），磁场越强转得越快；铁屑：轻敲后沿磁场方向排列（无 N、S 之分），磁场越弱排得越乱。
   记录：磁针停稳并显示观察结果后才能记录；同一开关状态、绕法、电流流入端只记一次。
   观察结果：第 1 问先点一枚小磁针拨一下，停稳后才显示“N 极都指向北”；通电时结果框只写磁针指向和引导，
   “左端 S 极、右端 N 极”这类结论等这种接法记录后才显示（顶栏同）。点小磁针（不拖）= 拨一下。第 3 问照课本不插铁棒。 */
(function () {
  var L = 24, A = 3.2, HB = 6, NT = 14, RC = 1.6, BX = 31, BZ = 14, NL = 30, IRON = 3, NF = 3600, SLOT = 13.8;
  var st = { q: 0, wait: false, on: false, rev: false, wind: 1, bar: false, fil: 0, lines: false, cur: false, cps: [], rows: [], justRec: 0, cpMoved: false };
  var K, V, T3, Be = 0.007, Bref = 0.26, RING = [], coilG, helixM, tubeM, barG, barMat, barAnim = null, kickNow = false, blade, bladeAng = 0, cpObjs = [], cpHits = [],
    filM, filD = [], filT = -1, lineG, arrowG, wires = {}, boardM, swHit, batHit, barHit, winEl, winKey = '', last = '', seed = 7;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function angd(a, b) { var d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
  function pol() { return st.wind * (st.rev ? -1 : 1); }          // +1：右端 N 极
  function poleL() { return pol() > 0 ? 'S' : 'N'; }
  function poleR() { return pol() > 0 ? 'N' : 'S'; }

  /* ── 磁场：圆电流叠加（Simpson 等 2001 的椭圆积分式；K、E 用 Abramowitz-Stegun 17.3.34/36 近似） ── */
  function ellKE(m1) {
    m1 = Math.max(m1, 1e-12); var l = Math.log(1 / m1), m2 = m1 * m1, m3 = m2 * m1, m4 = m3 * m1;
    return [1.38629436112 + 0.09666344259 * m1 + 0.03590092383 * m2 + 0.03742563713 * m3 + 0.01451196212 * m4 + (0.5 + 0.12498593597 * m1 + 0.06880248576 * m2 + 0.03328355346 * m3 + 0.00441787012 * m4) * l,
      1 + 0.44325141463 * m1 + 0.06260601220 * m2 + 0.04757383546 * m3 + 0.01736506451 * m4 + (0.24998368310 * m1 + 0.09200180037 * m2 + 0.04069697526 * m3 + 0.00526449639 * m4) * l];
  }
  function coilB(x, z) {   // 右端 N 极、无铁棒时板面上 (x, z) 处的磁场 [Bx, Bz]（相对单位）
    var bx = 0, bz = 0, r = Math.abs(z), sg = z < 0 ? -1 : 1;
    for (var i = 0; i < NL; i++) {
      var d = x - (-L / 2 + (i + 0.5) * L / NL), s = A * A + r * r + d * d, al = Math.max(1e-6, s - 2 * A * r), be2 = s + 2 * A * r, be = Math.sqrt(be2), ke = ellKE(al / be2);
      bx += ((A * A - r * r - d * d) * ke[1] + al * ke[0]) / (al * be);
      if (r > 1e-6) bz += sg * d * (s * ke[1] - al * ke[0]) / (al * be * r);
    }
    return [bx, bz];
  }
  function field(x, z) {   // 磁针处的合磁场（含地磁场，指北 = −z）
    if (!st.on) return [0, -Be];
    var b = coilB(x, z), f = pol() * (st.bar ? IRON : 1);
    return [b[0] * f, b[1] * f - Be];
  }
  function headOf(b) { return Math.atan2(-b[1], b[0]); }   // 物体绕 y 轴转 θ 后，局部 +x（N 极）指向 (cosθ, 0, −sinθ)

  function ringPts() {   // 椭圆上按弧长均匀分布的 16 个点（两端、两侧中点各有一枚）
    var Ae = 20, Bb = 9, N = 2000, cum = [0], out = [];
    for (var i = 1; i <= N; i++) { var t0 = 2 * Math.PI * (i - 1) / N, t1 = 2 * Math.PI * i / N; cum.push(cum[i - 1] + Math.hypot(Ae * (Math.cos(t1) - Math.cos(t0)), Bb * (Math.sin(t1) - Math.sin(t0)))); }
    for (var k = 0; k < 16; k++) { var s = cum[N] * k / 16, j = 0; while (cum[j] < s - 1e-9) j++; var t = 2 * Math.PI * j / N; out.push([Math.round(Ae * Math.cos(t) * 100) / 100, Math.round(Bb * Math.sin(t) * 100) / 100]); }
    return out;
  }

  /* ── 场景 ── */
  function std(c, o) { var m = new T3.MeshStandardMaterial({ color: c, roughness: 0.6 }); for (var k in (o || {})) m[k] = o[k]; return m; }
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function tube(pts, r, mat) { return new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts.map(function (p) { return new T3.Vector3(p[0], p[1], p[2]); })), 64, r, 8, false), mat); }
  function helixPt(t, rad) { var f = Math.PI + st.wind * 2 * Math.PI * NT * t; return new T3.Vector3(-L / 2 + L * t, HB + rad * Math.cos(f), rad * Math.sin(f)); }
  function buildCoil() {
    if (helixM) { coilG.remove(helixM); helixM.geometry.dispose(); }
    var pts = []; for (var k = 0; k <= NT * 40; k++) pts.push(helixPt(k / (NT * 40), A));
    helixM = new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), NT * 56, 0.24, 8, false), std(0xC0662A, { metalness: 0.55, roughness: 0.32 }));
    helixM.castShadow = true; coilG.add(helixM);
  }
  function build() {
    V = K.three({ target: [5, 2, 5], az: 0, el: 0.86, dist: 98, minDist: 60, maxDist: 150, minAz: -1.0, maxAz: 1.0, minEl: 0.25, maxEl: 1.35, fov: 32, sun: [-30, 110, 60] });
    T3 = V.T; var S = V.scene;
    // 透明塑料板（中间开槽让螺线管穿过），四脚支起，板面过螺线管轴线
    var sh = new T3.Shape(); sh.moveTo(-BX, -BZ); sh.lineTo(BX, -BZ); sh.lineTo(BX, BZ); sh.lineTo(-BX, BZ); sh.lineTo(-BX, -BZ);
    var hole = new T3.Path(); hole.moveTo(-SLOT, -A - 0.35); hole.lineTo(-SLOT, A + 0.35); hole.lineTo(SLOT, A + 0.35); hole.lineTo(SLOT, -A - 0.35); hole.lineTo(-SLOT, -A - 0.35); sh.holes.push(hole);
    boardM = new T3.Mesh(new T3.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }), new T3.MeshStandardMaterial({ color: 0xDCEAF5, transparent: true, opacity: 0.38, roughness: 0.15, depthWrite: false }));
    boardM.rotation.x = -Math.PI / 2; boardM.position.y = HB - 0.3; boardM.renderOrder = 1; S.add(boardM);
    var edgeM = new T3.LineBasicMaterial({ color: 0x9FB8CF });
    var eg = new T3.LineSegments(new T3.EdgesGeometry(boardM.geometry), edgeM); eg.rotation.x = -Math.PI / 2; eg.position.y = HB - 0.3; S.add(eg);
    var legM = std(0xB9C6D4, { metalness: 0.4, roughness: 0.4 });
    [[-BX + 1.2, -BZ + 1.2], [BX - 1.2, -BZ + 1.2], [-BX + 1.2, BZ - 1.2], [BX - 1.2, BZ - 1.2]].forEach(function (p) { var m = new T3.Mesh(new T3.CylinderGeometry(0.45, 0.6, HB - 0.3, 14), legM); m.position.set(p[0], (HB - 0.3) / 2, p[1]); m.castShadow = true; S.add(m); });
    // 螺线管：纸筒 + 铜线，两个木托
    coilG = new T3.Group(); S.add(coilG);
    tubeM = new T3.Mesh(new T3.CylinderGeometry(A - 0.25, A - 0.25, L + 0.8, 40, 1, true), std(0xE8DABB, { side: T3.DoubleSide, roughness: 0.85 }));
    tubeM.rotation.z = Math.PI / 2; tubeM.position.y = HB; coilG.add(tubeM);
    [-1, 1].forEach(function (s) { var r = new T3.Mesh(new T3.TorusGeometry(A - 0.1, 0.22, 10, 40), std(0xD9C9A3, { roughness: 0.8 })); r.rotation.y = Math.PI / 2; r.position.set(s * (L / 2 + 0.4), HB, 0); coilG.add(r); });
    buildCoil();
    [-8, 8].forEach(function (x) { var b = new T3.Mesh(new T3.BoxGeometry(2.2, HB - A - 0.3, 4.6), std(0xC9A77C, { roughness: 0.8 })); b.position.set(x, (HB - A - 0.3) / 2, 0); b.castShadow = true; S.add(b); });
    // 铁棒
    barG = new T3.Group(); S.add(barG);
    var bm = new T3.Mesh(new T3.CylinderGeometry(1.9, 1.9, L + 3, 32), barMat = std(0x9AA3AE, { metalness: 0.35, roughness: 0.42 })); bm.rotation.z = Math.PI / 2; bm.castShadow = true; barG.add(bm);
    barHit = new T3.Mesh(new T3.BoxGeometry(L + 3, 4.6, 4.6), new T3.MeshBasicMaterial({ visible: false })); barG.add(barHit);
    // 开关（闸刀）
    var swG = new T3.Group(); swG.position.set(-18, 0, 20); S.add(swG);
    var base = new T3.Mesh(new T3.BoxGeometry(8, 0.8, 3.2), std(0xF3F1EA, { roughness: 0.5 })); base.position.y = 0.4; base.castShadow = true; swG.add(base);
    var brass = std(0xC9A24A, { metalness: 0.7, roughness: 0.3 });
    [[-3.3], [3.3]].forEach(function (p) { var post = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 1, 16), brass); post.position.set(p[0], 1.3, 0); swG.add(post); });
    var clip = new T3.Mesh(new T3.BoxGeometry(0.5, 1.3, 1.1), brass); clip.position.set(-1.9, 1.45, 0); swG.add(clip);
    var hinge = new T3.Mesh(new T3.BoxGeometry(0.6, 1.4, 1.1), brass); hinge.position.set(2.3, 1.5, 0); swG.add(hinge);
    blade = new T3.Group(); blade.position.set(2.3, 1.9, 0); swG.add(blade);
    var bl = new T3.Mesh(new T3.BoxGeometry(5.2, 0.22, 0.7), std(0xD08A3E, { metalness: 0.7, roughness: 0.3 })); bl.position.x = -2.6; bl.castShadow = true; blade.add(bl);
    var hd = new T3.Mesh(new T3.CylinderGeometry(0.45, 0.45, 1.6, 16), std(0x2B2F36, { roughness: 0.5 })); hd.position.set(-5.4, 0.5, 0); blade.add(hd);
    swHit = new T3.Mesh(new T3.BoxGeometry(9, 5, 4.6), new T3.MeshBasicMaterial({ visible: false })); swHit.position.y = 2; swG.add(swHit);
    // 电池盒（左 + 右 −）
    var batG = new T3.Group(); batG.position.set(0, 0, 20); S.add(batG);
    var box = new T3.Mesh(new T3.BoxGeometry(11, 2.4, 3.6), [std(0x37414F), std(0x37414F), new T3.MeshStandardMaterial({ map: canvasTex(660, 216, function (g, w, h) {
      g.fillStyle = '#37414F'; g.fillRect(0, 0, w, h); g.fillStyle = '#E7ECF2'; g.font = 'bold 110px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#FF6A55'; g.fillText('+', 120, h / 2 + 4); g.fillStyle = '#E7ECF2'; g.fillText('−', w - 120, h / 2 + 2);
    }), roughness: 0.6 }), std(0x37414F), std(0x3E4958), std(0x37414F)]);
    box.position.y = 1.2; box.castShadow = true; batG.add(box);
    [[-2.6], [2.6]].forEach(function (p) { var c = new T3.Mesh(new T3.CylinderGeometry(1.15, 1.15, 4.6, 24), std(0x4B78C2, { roughness: 0.45 })); c.rotation.z = Math.PI / 2; c.position.set(p[0], 2.2, 0); batG.add(c); });
    [[-4.4, 0xD93A2B], [4.4, 0x2B2F36]].forEach(function (p) { var t = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 1.1, 16), std(p[1], { roughness: 0.4 })); t.position.set(p[0], 2.9, 0); batG.add(t); });
    batHit = new T3.Mesh(new T3.BoxGeometry(12, 4.4, 4.6), new T3.MeshBasicMaterial({ visible: false })); batHit.position.y = 1.9; batG.add(batHit);
    // 小磁针
    RING = ringPts();
    RING.forEach(function (p, i) { var o = makeCompass(); S.add(o.g); cpObjs.push(o); cpHits.push(o.hit); o.hit.userData.i = i; st.cps.push({ x: p[0], z: p[1], th: Math.PI / 2, w: 0, tg: Math.PI / 2 }); });
    // 铁屑（实例化的小铁丝）
    filM = new T3.InstancedMesh(new T3.BoxGeometry(0.62, 0.06, 0.09), std(0x3B4048, { metalness: 0.5, roughness: 0.5 }), NF);
    filM.visible = false; S.add(filM);
    lineG = new T3.Group(); S.add(lineG); arrowG = new T3.Group(); S.add(arrowG);
    V.tag('sw', '开关'); V.tag('bat', '电源'); V.tag('bar', '铁棒');
    var bs = Math.abs(coilB(0, 9)[0]); Be = 0.05 * bs;
    setupDrag();
    V.frame = tick;
  }
  function makeCompass() {
    var g = new T3.Group(), nd = new T3.Group();
    var rim = new T3.Mesh(new T3.CylinderGeometry(RC, RC + 0.05, 0.55, 32), std(0xAFBCCB, { metalness: 0.55, roughness: 0.35 })); rim.position.y = 0.275; rim.castShadow = true; g.add(rim);
    var face = new T3.Mesh(new T3.CylinderGeometry(RC - 0.18, RC - 0.18, 0.04, 32), std(0xFBFCFD, { roughness: 0.7 })); face.position.y = 0.57; g.add(face);
    var tri = function (sgn) { var s = new T3.Shape(); s.moveTo(0, 0.3); s.lineTo(sgn * 1.32, 0); s.lineTo(0, -0.3); s.lineTo(0, 0.3); var m = new T3.ShapeGeometry(s); m.rotateX(-Math.PI / 2); return m; };
    var nM = new T3.Mesh(tri(1), new T3.MeshStandardMaterial({ color: 0xE0352B, emissive: 0x6A0F0A, emissiveIntensity: 0.25, roughness: 0.45, side: T3.DoubleSide })), sM = new T3.Mesh(tri(-1), new T3.MeshStandardMaterial({ color: 0x2C3846, roughness: 0.45, side: T3.DoubleSide }));
    nd.add(nM); nd.add(sM);
    var pin = new T3.Mesh(new T3.CylinderGeometry(0.13, 0.13, 0.12, 12), std(0xC9A24A, { metalness: 0.8, roughness: 0.3 })); pin.position.y = 0.04; nd.add(pin);
    nd.position.y = 0.72; g.add(nd);
    var glass = new T3.Mesh(new T3.CylinderGeometry(RC - 0.05, RC - 0.05, 0.05, 32), new T3.MeshPhongMaterial({ color: 0xEAF4FB, transparent: true, opacity: 0.16, shininess: 120, specular: 0xffffff, depthWrite: false }));
    glass.position.y = 0.92; g.add(glass);
    var hit = new T3.Mesh(new T3.CylinderGeometry(RC + 0.35, RC + 0.35, 2, 12), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = 0.6; g.add(hit);
    return { g: g, nd: nd, hit: hit };
  }
  function buildWires() {
    ['w1', 'w2', 'w3'].forEach(function (k) { if (wires[k]) { V.scene.remove(wires[k]); wires[k].geometry.dispose(); } });
    var red = std(0xD8392B, { roughness: 0.45 }), blk = std(0x27303B, { roughness: 0.45 });
    var plus = [-4.4, 3.45, 20], minus = [4.4, 3.45, 20], X = st.rev ? minus : plus, Y = st.rev ? plus : minus;
    wires.w1 = tube([[-L / 2, HB - A, 0], [-L / 2 - 0.8, 1.2, 0.6], [-16, 0.3, 5], [-20.5, 0.3, 13], [-21.4, 0.6, 18.4], [-21.3, 1.85, 20]], 0.2, red);
    wires.w2 = tube([[-14.7, 1.85, 20], [-14, 0.6, 21.8], [-10, 0.3, 23], [X[0] - 2, 0.4, 23.2], [X[0], 1.6, 21.6], X], 0.2, red);
    wires.w3 = tube([[L / 2, HB - A, 0], [L / 2 + 0.8, 1.2, 0.6], [13, 0.3, 6], [10, 0.3, 15], [Y[0] + 2.5, 0.4, 23.5], [Y[0], 1.6, 21.8], Y], 0.2, blk);
    ['w1', 'w2', 'w3'].forEach(function (k) { wires[k].castShadow = true; V.scene.add(wires[k]); });
  }
  /* 磁感线（板面内、螺线管外部）：从 N 端端面出发沿磁场追踪；未闭合的线按左右对称补齐 */
  function trace(x, z) {
    var pts = [[x, z]], h = 0.32;
    for (var k = 0; k < 700; k++) {
      var b = coilB(x, z), n = Math.hypot(b[0], b[1]) || 1, mx = x + b[0] / n * h / 2, mz = z + b[1] / n * h / 2, b2 = coilB(mx, mz), n2 = Math.hypot(b2[0], b2[1]) || 1;
      x += b2[0] / n2 * h; z += b2[1] / n2 * h;
      if (Math.abs(x) > BX - 0.6 || Math.abs(z) > BZ - 0.6) return { p: pts, closed: false };
      if (Math.abs(x) < L / 2 + 0.3 && Math.abs(z) < A + 0.3) { pts.push([x, z]); return { p: pts, closed: true }; }
      pts.push([x, z]);
    }
    return { p: pts, closed: false };
  }
  var lineSet = null;
  function buildLines() {
    while (lineG.children.length) { var c = lineG.children.pop(); c.geometry.dispose(); }
    while (arrowG.children.length) { var a = arrowG.children.pop(); a.geometry.dispose(); }
    lineG.visible = arrowG.visible = st.lines && st.on;
    if (!lineG.visible) return;
    if (!lineSet) {
      lineSet = [];
      [0.5, 1.4, 2.2, 2.85].forEach(function (z0) { [-1, 1].forEach(function (s) {
        var r = trace(L / 2 + 0.35, s * z0);
        lineSet.push(r.p);
        if (!r.closed) lineSet.push(r.p.map(function (q) { return [-q[0], q[1]]; }));
      }); });
    }
    var lm = new T3.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.75 }), am = new T3.MeshBasicMaterial({ color: 0x2563EB });
    var cone = new T3.ConeGeometry(0.42, 1.2, 12);
    lineSet.forEach(function (p) {
      if (p.length < 4) return;
      var m = tube(p.filter(function (q, i) { return i % 2 === 0 || i === p.length - 1; }).map(function (q) { return [q[0], HB + 0.06, q[1]]; }), 0.07, lm); lineG.add(m);
      for (var i = 14; i < p.length - 6; i += 30) {   // 箭头：沿磁场方向（N 极出、S 极进）
        var b = coilB(p[i][0], p[i][1]), s = pol(), d = new T3.Vector3(b[0] * s, 0, b[1] * s).normalize();
        var c = new T3.Mesh(cone, am); c.position.set(p[i][0], HB + 0.1, p[i][1]); c.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), d); arrowG.add(c);
      }
    });
  }
  /* 电流方向箭头：线圈前侧每隔一匝一个，顺着电流 */
  var curG = null;
  function buildCur() {
    if (curG) { V.scene.remove(curG); curG = null; }
    if (!(st.cur && st.on)) return;
    curG = new T3.Group(); var m = new T3.MeshBasicMaterial({ color: 0xFE752D }), g = new T3.ConeGeometry(0.42, 1.15, 12), sgn = st.rev ? -1 : 1;
    for (var k = 0; k < NT; k += 2) {   // 前侧（z 最大）处 φ ≡ π/2
      var t = (k + (st.wind > 0 ? 0.75 : 0.25)) / NT;
      var p = helixPt(t, A + 0.32), d = helixPt(t + 0.002, A + 0.32).sub(helixPt(t - 0.002, A + 0.32)).normalize().multiplyScalar(sgn);
      var c = new T3.Mesh(g, m); c.position.copy(p); c.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), d); curG.add(c);
    }
    V.scene.add(curG);
  }
  /* 铁屑 */
  var dummy = null;
  /* 板面上间距大致均匀的磁感线（只用于铁屑成链：轻敲时铁屑向附近的线靠拢） */
  var SLG = null, DS = 1.05, CELL = 0.5;
  function streamlines() {
    if (SLG) return SLG;
    var nx = Math.ceil(2 * BX / CELL), nz = Math.ceil(2 * BZ / CELL), grid = new Array(nx * nz), id = 0;
    function out(x, z) { return Math.abs(x) > BX - 0.3 || Math.abs(z) > BZ - 0.3 || (Math.abs(x) < SLOT + 0.2 && Math.abs(z) < A + 0.45); }
    function near(x, z, d) {
      var r = Math.ceil(d / CELL), i0 = Math.floor((x + BX) / CELL), j0 = Math.floor((z + BZ) / CELL);
      for (var j = j0 - r; j <= j0 + r; j++) for (var i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || j < 0 || i >= nx || j >= nz || !grid[j * nx + i]) continue;
        var c = grid[j * nx + i]; for (var k = 0; k < c.length; k++) if ((c[k][0] - x) * (c[k][0] - x) + (c[k][1] - z) * (c[k][1] - z) < d * d) return true;
      }
      return false;
    }
    function grow(x0, z0) {
      var line = [[x0, z0]];
      [1, -1].forEach(function (dir) {
        var x = x0, z = z0, seg = [];
        for (var k = 0; k < 500; k++) {
          var b = coilB(x, z), n = Math.hypot(b[0], b[1]) || 1, h = 0.3, b2 = coilB(x + dir * b[0] / n * h / 2, z + dir * b[1] / n * h / 2), n2 = Math.hypot(b2[0], b2[1]) || 1;
          x += dir * b2[0] / n2 * h; z += dir * b2[1] / n2 * h;
          if (out(x, z) || near(x, z, DS * 0.5)) break;
          seg.push([x, z]);
        }
        line = dir > 0 ? line.concat(seg) : seg.reverse().concat(line);
      });
      line.forEach(function (p) { var i = Math.floor((p[0] + BX) / CELL), j = Math.floor((p[1] + BZ) / CELL), c = j * nx + i; (grid[c] || (grid[c] = [])).push(p); });
      id++;
    }
    for (var z = -BZ + 0.6; z < BZ - 0.3; z += DS * 0.75) for (var x = -BX + 0.6; x < BX - 0.3; x += DS * 0.75) if (!out(x, z) && !near(x, z, DS)) grow(x, z);
    SLG = { grid: grid, nx: nx, nz: nz, n: id };
    return SLG;
  }
  function nearestLine(x, z) {
    var g = streamlines(), i0 = Math.floor((x + BX) / CELL), j0 = Math.floor((z + BZ) / CELL), best = null, bd = 1e9;
    for (var j = j0 - 2; j <= j0 + 2; j++) for (var i = i0 - 2; i <= i0 + 2; i++) {
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz || !g.grid[j * g.nx + i]) continue;
      g.grid[j * g.nx + i].forEach(function (p) { var d = (p[0] - x) * (p[0] - x) + (p[1] - z) * (p[1] - z); if (d < bd) { bd = d; best = p; } });
    }
    return best;
  }
  function scatter() {
    seed = 11; filD = [];
    var i = 0, guard = 0;
    while (i < NF && guard++ < NF * 4) {
      var x = (rnd() * 2 - 1) * (BX - 0.6), z = (rnd() * 2 - 1) * (BZ - 0.6);
      if (Math.abs(x) < SLOT + 0.3 && Math.abs(z) < A + 0.6) continue;
      if (st.cps.some(function (c) { return Math.hypot(c.x - x, c.z - z) < RC + 0.2; })) continue;
      var a = rnd() * Math.PI; filD.push({ x: x, z: z, x0: x, z0: z, x1: x, z1: z, a: a, a0: a, a1: a }); i++;
    }
    filM.count = filD.length; filT = -1; setFil(0);
  }
  function setFil(p) {
    if (!dummy) dummy = new T3.Object3D();
    var hop = Math.sin(Math.PI * p) * 0.35;
    filD.forEach(function (f, i) { f.a = f.a0 + (f.a1 - f.a0) * p; f.x = f.x0 + (f.x1 - f.x0) * p; f.z = f.z0 + (f.z1 - f.z0) * p; dummy.position.set(f.x, HB + 0.05 + hop * (0.6 + (i % 5) * 0.1), f.z); dummy.rotation.set(0, f.a, 0); dummy.updateMatrix(); filM.setMatrixAt(i, dummy.matrix); });
    filM.instanceMatrix.needsUpdate = true;
  }
  function tap() {   // 轻敲：铁屑被磁化，沿磁场方向排列；磁场越弱越乱；没有磁场只是抖一抖
    if (!st.fil) return;
    seed = 29 + st.rows.length;
    filD.forEach(function (f) {
      f.a0 = f.a; f.x0 = f.x1 = f.x; f.z0 = f.z1 = f.z;
      if (!st.on) { f.a1 = f.a + (rnd() - 0.5) * 0.3; return; }
      var b = coilB(f.x, f.z), m = Math.hypot(b[0], b[1]) * (st.bar ? IRON : 1), tg = Math.atan2(-b[1], b[0]), d = angd(tg, f.a);
      if (d > Math.PI / 2) d -= Math.PI; if (d < -Math.PI / 2) d += Math.PI;   // 铁屑没有 N、S：转到最近的那个方向
      var q = clamp(m / (Bref * 0.55), 0, 1);
      f.a1 = f.a + d * (0.55 + 0.45 * q) * (0.85 + 0.15 * rnd()) + (rnd() - 0.5) * (1 - q) * 1.2;
      var p = nearestLine(f.x, f.z);   // 磁化的铁屑互相吸引、连成链：向附近的磁感线靠拢（磁场越强靠得越拢）
      if (p) {
        var k = q * (0.7 + 0.25 * rnd()), nx = f.x + (p[0] - f.x) * k, nz = f.z + (p[1] - f.z) * k;
        if (!st.cps.some(function (c) { return Math.hypot(c.x - nx, c.z - nz) < RC + 0.2; })) { f.x1 = nx; f.z1 = nz; }
      }
    });
    filT = 0; st.fil = 2; st.justRec = 0; last = '';
  }

  /* ── 拖动与点按 ── */
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function setupDrag() {
    var grab = null, plane = new T3.Plane(new T3.Vector3(0, 1, 0), 0);
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, cpHits.concat([swHit, batHit, barHit])) || (st.fil > 0 && !!V.pick(ev, [boardM])); },
      start: function (ev) {
        var p0 = stagePt(ev), h = V.pick(ev, cpHits);
        if (h) {
          var i = h.object.userData.i, c = st.cps[i];
          plane.constant = -h.point.y; var p = V.onPlane(ev, plane); if (!p) return false;
          grab = { k: 'cp', i: i, dx: p.x - c.x, dz: p.z - c.z, s: p0, moved: false }; return true;
        }
        var o = V.pick(ev, [swHit, batHit, barHit]);
        if (o) { grab = { k: o.object === swHit ? 'sw' : o.object === batHit ? 'bat' : 'bar', s: p0, l: p0, moved: false }; return true; }
        if (st.fil > 0 && V.pick(ev, [boardM])) { grab = { k: 'board', s: p0, l: p0, moved: false }; return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var p0 = stagePt(ev);
        if (!grab.moved && Math.hypot(p0.x - grab.s.x, p0.y - grab.s.y) > 5) grab.moved = true;
        if (!grab.moved) return;
        if (grab.k === 'cp') { var p = V.onPlane(ev, plane); if (p) moveCp(grab.i, p.x - grab.dx, p.z - grab.dz); return; }
        // 其余器材：按住拖动 = 转视角（和拖空白处一样）
        var o = V.orb; o.az = clamp(o.az - (p0.x - grab.l.x) * 0.005, o.minAz, o.maxAz); o.el = clamp(o.el + (p0.y - grab.l.y) * 0.004, o.minEl, o.maxEl); grab.l = p0; V.view();
      },
      end: function () {
        if (grab && !grab.moved) {
          if (grab.k === 'cp') flick(grab.i);
          else if (grab.k === 'sw') setOn(!st.on);
          else if (grab.k === 'bat') swap();
          else if (grab.k === 'bar') setBar(!st.bar);
          else if (grab.k === 'board') tap();
        }
        grab = null;
      }
    };
  }
  function moveCp(i, x, z) {   // 留在板上，不压螺线管（含伸出的铁棒），不和别的磁针重叠
    var c = st.cps[i], hx = SLOT + RC + 0.2, hz = A + 0.35 + RC + 0.1;
    for (var it = 0; it < 4; it++) {
      x = clamp(x, -BX + RC + 0.4, BX - RC - 0.4); z = clamp(z, -BZ + RC + 0.4, BZ - RC - 0.4);
      if (Math.abs(x) < hx && Math.abs(z) < hz) { if (hx - Math.abs(x) < hz - Math.abs(z)) x = (x < 0 ? -1 : 1) * hx; else z = (z < 0 ? -1 : 1) * hz; }
      st.cps.forEach(function (o, j) {
        if (j === i) return; var dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), m = 2 * RC + 0.15;
        if (d < m) { if (d < 1e-3) { dx = 1; dz = 0; d = 1; } x = o.x + dx / d * m; z = o.z + dz / d * m; }
      });
    }
    c.x = Math.round(x * 100) / 100; c.z = Math.round(z * 100) / 100; st.justRec = 0; st.cpMoved = true; st.wait = false; last = '';
  }
  function flick(i) { var c = st.cps[i]; c.w += (c.w >= 0 ? 1 : -1) * 12; st.wait = false; st.justRec = 0; last = ''; }   // 点一下小磁针：拨一下，它摆几下再停回磁场方向

  /* ── 操作 ── */
  function kick() { kickNow = true; }   // 场一变，磁针轻轻一抖（免得停在不稳定的反向位置）
  function changed() { K.invalidate(); st.justRec = 0; last = ''; winKey = ''; }
  function setOn(v) { if (st.on === v) return; st.on = v; st.wait = false; kick(); changed(); buildLines(); buildCur(); }
  function swap() { st.rev = !st.rev; kick(); buildWires(); changed(); buildLines(); buildCur(); }
  function setWind(w) { if (st.wind === w) return; st.wind = w; buildCoil(); kick(); changed(); buildLines(); buildCur(); }
  function setBar(v) { if (st.bar === v || barAnim) return; barAnim = { t: 0, to: v }; }
  /* 铁棒插入 / 取出：在桌上拿起并淡出，再在螺线管里淡入并推到位（不穿过磁针和塑料板） */
  function barPose(p, ins) {   // 返回 [位置, 不透明度]；p：0→1
    var rest = new T3.Vector3(22, 1.9, 20), cut = 0.45, a, q;
    if (!ins) p = 1 - p;
    if (p < cut) { a = p / cut; return [rest.clone().add(new T3.Vector3(0, 1.6 * a, 0)), 1 - a]; }
    q = (p - cut) / (1 - cut); return [new T3.Vector3(0.25 * (1 - q), HB, 0), q];
  }

  /* ── 每帧 ── */
  function tick(dt) {
    // 开关闸刀
    var ta = st.on ? 0 : -0.95; bladeAng += (ta - bladeAng) * Math.min(1, dt * 12); blade.rotation.z = bladeAng;
    // 铁棒
    if (barAnim && dt) {
      barAnim.t += dt / 1.1;
      if (barAnim.t >= 1) { st.bar = barAnim.to; barAnim = null; kick(); changed(); buildLines(); }
    }
    var bp = barAnim ? barPose(barAnim.t, barAnim.to) : [st.bar ? new T3.Vector3(0, HB, 0) : new T3.Vector3(22, 1.9, 20), 1];
    barG.position.copy(bp[0]); barMat.transparent = bp[1] < 1; barMat.opacity = bp[1]; barG.visible = bp[1] > 0.02;
    // 磁针：阻尼转动，角频率随磁场强弱
    var sub = 4, h = (dt || 0) / sub;
    st.cps.forEach(function (c, i) {
      var b = field(c.x, c.z), m = Math.hypot(b[0], b[1]); c.tg = headOf(b);
      if (kickNow && h > 0) c.w += Math.abs(angd(c.th, c.tg)) > 2.5 ? (i % 2 ? 2.4 : -2.4) : ((i * 37) % 7 - 3) * 0.1;   // 场一变轻轻一抖；正好反向的磁针推一下，免得停在不稳定的反向位置
      if (h > 0) {
        var w2 = 46 * clamp(m / Bref, 0.9, 2.5), damp = 2 * 0.8 * Math.sqrt(w2);
        for (var s = 0; s < sub; s++) { c.w += (-w2 * Math.sin(c.th - c.tg) - damp * c.w) * h; c.th += c.w * h; }
        c.th = c.tg + angd(c.th, c.tg);
      }
      var o = cpObjs[i]; o.g.position.set(c.x, HB, c.z); o.nd.rotation.y = c.th;
    });
    if (h > 0) kickNow = false;
    if (filT >= 0 && dt) { filT = Math.min(1, filT + dt / 0.45); setFil(filT); if (filT >= 1) filT = -1; }
    filM.visible = st.fil > 0;
    V.placeTag('sw', new T3.Vector3(-18, 4.6, 20));
    V.placeTag('bat', new T3.Vector3(0, 5.4, 20));
    V.placeTag('bar', barG.position.clone().add(new T3.Vector3(0, 3.6, 0))); V.tag('bar').style.display = st.bar || barAnim ? 'none' : V.tag('bar').style.display;
    drawWin(); ui();
  }
  function stable() { return !barAnim && st.cps.every(function (c) { return Math.abs(c.w) < 0.1 && Math.abs(angd(c.th, c.tg)) < 0.05; }); }
  function settleAll() { st.cps.forEach(function (c) { c.tg = headOf(field(c.x, c.z)); c.th = c.tg; c.w = 0; }); }

  /* ── 观察窗：俯视的磁针（北在上） ── */
  function drawWin() {
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:350px"><h3><span>俯视：小磁针</span><small>N 极涂红，北在上</small></h3><svg viewBox="0 0 330 150"></svg></div>');
    var key = st.cps.map(function (c) { return Math.round(c.th * 60) + ',' + c.x + ',' + c.z; }).join('|') + st.wind + st.bar;
    if (key === winKey) return; winKey = key;
    var s = 6.4, cx = 165, cz = 75, X = function (x) { return (cx + x * s).toFixed(1); }, Z = function (z) { return (cz + z * s).toFixed(1); }, out = '';
    out += '<rect x="1" y="1" width="328" height="148" rx="6" fill="#F3F8FC" stroke="#C3CEDC" stroke-width="1.5"/>';
    if (st.bar) out += '<rect x="' + X(-(L + 3) / 2) + '" y="' + Z(-1.9) + '" width="' + ((L + 3) * s) + '" height="' + (3.8 * s) + '" fill="#8A929C"/>';
    out += '<rect x="' + X(-L / 2 - 0.4) + '" y="' + Z(-A) + '" width="' + ((L + 0.8) * s) + '" height="' + (2 * A * s) + '" fill="#EBDDBF" stroke="#B89B6A" stroke-width="1"/>';
    var pts = [], seg = '';
    for (var k = 0; k <= NT * 40; k++) {   // 从上往下看只看到上半圈的导线
      var t = k / (NT * 40), f = Math.PI + st.wind * 2 * Math.PI * NT * t;
      if (Math.cos(f) > 0) pts.push(X(-L / 2 + L * t) + ',' + Z(A * Math.sin(f)));
      else if (pts.length) { seg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#B5612A" stroke-width="2.4" stroke-linecap="round"/>'; pts = []; }
    }
    if (pts.length) seg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#B5612A" stroke-width="2.4" stroke-linecap="round"/>';
    out += seg;
    st.cps.forEach(function (c) {
      var deg = (-c.th * 180 / Math.PI).toFixed(1), r = RC * s;
      out += '<g transform="translate(' + X(c.x) + ' ' + Z(c.z) + ')"><circle r="' + r.toFixed(1) + '" fill="#fff" stroke="#8EA0B5" stroke-width="1.4"/>' +
        '<g transform="rotate(' + deg + ')"><polygon points="0,-2.6 ' + (r - 1.2).toFixed(1) + ',0 0,2.6" fill="#E0352B"/><polygon points="0,-2.6 ' + (-(r - 1.2)).toFixed(1) + ',0 0,2.6" fill="#2C3846"/></g><circle r="1.4" fill="#C9A24A"/></g>';
    });
    out += '<g transform="translate(316 8)"><path d="M0 0 L5 10 L0 7 L-5 10 Z" fill="#1E3A5F"/><text x="0" y="24" text-anchor="middle" font-size="12" fill="#1E3A5F">北</text></g>';
    winEl.querySelector('svg').innerHTML = out;
  }

  /* ── 检查与记录 ── */
  function row() { return { sw: st.on ? '闭合' : '断开', wind: st.wind > 0 ? '绕法一' : '绕法二', inEnd: st.on ? (st.rev ? '右端' : '左端') : '无', L: st.on ? poleL() : '未通电', R: st.on ? poleR() : '未通电' }; }
  function dup() { var r = row(); return st.rows.some(function (x) { return x.sw === r.sw && x.wind === r.wind && x.inEnd === r.inEnd; }); }
  function canRec() { return stable() && K.revealed() && !dup() && st.rows.length < 6; }
  function nextStep() {
    var r = st.rows[st.rows.length - 1];
    if (r.sw === '断开') return '闭合开关，再看磁针。';
    var has = function (w, e) { return st.rows.some(function (x) { return x.sw === '闭合' && x.wind === w && x.inEnd === e; }); };
    if (!has(r.wind, r.inEnd === '左端' ? '右端' : '左端')) return '交换电源正负极，再看磁针。';
    if (!has(r.wind === '绕法一' ? '绕法二' : '绕法一', r.inEnd)) return '换成' + (r.wind === '绕法一' ? '绕法二' : '绕法一') + '，电源接法不变。';
    return '到「数据」比较各组。';
  }
  function ui() {
    var sb = stable(), wait = st.wait && !st.on, rec = dup(), ok = canRec(), hint, tone = '';
    var checks = (st.on ? [{ label: '开关闭合', ok: true }] : []).concat([{ label: '磁针停稳', ok: sb && !wait ? true : null }]);   // 断开是第 1 问的对照条件，不当成待办
    if (barAnim) hint = st.bar ? '正在取出铁棒。' : '正在插入铁棒。';
    else if (wait) hint = '先点一枚小磁针拨一下，停稳后看 N 极指向。';   // 第 1 问：老师先做一步，再出观察结果
    else if (!sb) hint = '磁针还在转动，等它停稳。';
    else if (st.fil === 1 && st.on) hint = '点塑料板轻敲（或「轻敲塑料板」）。';
    else if (st.q === 5 && st.on && !st.cpMoved) hint = '把一枚小磁针拖到螺线管旁另一个位置，看它怎样指。';   // 提示跟随本问任务
    else if (st.q === 1 && !st.on) hint = '闭合开关，看小磁针怎样转。';
    else if (st.justRec) { hint = '已记第 ' + st.justRec + ' 组。下一步：' + nextStep(); tone = 'good'; }
    else if (st.fil === 2 && st.on && (!K.revealed() || rec)) hint = '看铁屑排成的图样，和条形磁体周围的比一比。';
    else if (st.cpMoved && st.on) hint = st.lines ? '这枚磁针和这一点的磁感线比一比：哪一端顺着磁感线的方向？' : '看这枚磁针怎样指，再打开「磁感线」，和这一点磁感线的方向比一比。';   // 第 6 问问的就是看哪一端，提示不直接说出答案
    else if (!K.revealed()) hint = st.on ? '看两端磁针 N 极的指向，判断螺线管的极性。' : '还没通电：看磁针 N 极都指向哪里。';
    else if (rec) hint = !st.on ? '断开时的指向已经记过了。闭合开关，看小磁针怎样转。' : st.q === 3 ? '这种接法已经记过了。点「交换正负极」再看。' : st.q === 4 ? '这种接法已经记过了。在「螺线管」一行改选' + (st.wind > 0 ? '「绕法二」' : '「绕法一」') + '。' : '这种接法已经记过了。交换正负极或换绕法再试。';
    else if (st.rows.length >= 6) hint = '断开、闭合，两种绕法、两种接法的 6 种情况都记了，可以到「数据」比较。';
    else { hint = st.on ? '看两端磁针，判断哪一端是 N 极，再记录。' : '可以记录。'; tone = 'good'; }
    // 观察结果自动显示；通电时先只写磁针指向（提示里引导判断），两端极性等这种接法记录后再写出来；结果框一行写完，展开任务、答案时右栏不溢出
    var result = !st.on ? '未通电：小磁针 N 极都指向<b>北</b>' + (rec ? '（地磁场的作用）' : '') :
      rec ? '左端 <b>' + poleL() + '</b> 极，右端 <b>' + poleR() + '</b> 极' :
      '磁针偏转了：两端磁针 N 极都指向<b>' + (pol() > 0 ? '右' : '左') + '</b>';
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: sb && !wait, btn: ['显示观察结果'], result: result });
    var key = [ok, rec, st.on, st.rev, st.wind, st.bar, st.fil, st.lines, st.cur, st.rows.length, K.revealed(), !!barAnim].join('|');
    if (key === last) return; last = key;
    K.setReading('L', st.on ? (K.revealed() && rec ? poleL() + ' 极' : null) : '未通电');
    K.setReading('R', st.on ? (K.revealed() && rec ? poleR() + ' 极' : null) : '未通电');
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 组' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 组');
    K.ctrlTag(st.on ? '电流从' + (st.rev ? '右端' : '左端') + '流入' : '');
    syncCtrls();
  }

  /* ── 控件 ── */
  /* 面板（2026-11-21 按规范重排）：螺线管（绕法、铁棒，选择）→ 电源、铁屑（动作）→ 电路开关 → 显示；电流从哪端流入写在本块标题右侧 */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('螺线管', '<div style="display:flex;gap:8px">' + K.seg('w', [['1', '绕法一'], ['-1', '绕法二']]).replace('class="seg"', 'class="seg" style="flex:1"') +
        K.seg('bar', [['out', '无铁棒'], ['in', '插入铁棒']]).replace('class="seg"', 'class="seg" style="flex:1.1"') + '</div>') +   // 同一个螺线管的两项设定（绕法、铁棒），都是“选择”，并排省一行
      K.grp('电源', K.acts([['c-swap', '⇄', '交换正负极']])) +
      K.grp('铁屑', K.acts([['c-fil', '∴', '撒铁屑'], ['c-tap', '⊙', '轻敲塑料板']])) +
      K.grp('电路', '<div class="acts">' + K.sw('c-sw', '开关', '闭合', '断开', st.on) + '</div>') +
      K.grp('显示', '<div class="acts">' + K.sw('c-lines', '磁感线', '显示', '隐藏', st.lines) + K.sw('c-cur', '电流方向', '显示', '隐藏', st.cur) + '</div>');
    var $ = function (id) { return document.getElementById(id); };
    $('c-sw').onclick = function () { setOn(!st.on); };
    $('c-swap').onclick = swap;
    document.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { setWind(+b.getAttribute('data-w')); }; });
    document.querySelectorAll('[data-bar]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-bar') === 'in'; if (v !== st.bar && !barAnim) setBar(v); }; });
    $('c-fil').onclick = function () { if (st.fil) { st.fil = 0; filT = -1; } else { scatter(); st.fil = 1; } st.justRec = 0; last = ''; };
    $('c-tap').onclick = tap;
    $('c-lines').onclick = function () { if (!st.on) return; st.lines = !st.lines; buildLines(); st.justRec = 0; last = ''; };
    $('c-cur').onclick = function () { if (!st.on) return; st.cur = !st.cur; buildCur(); st.justRec = 0; last = ''; };
  }
  function syncCtrls() {
    var $ = function (id) { return document.getElementById(id); };
    K.setSw('c-sw', st.on);
    document.querySelectorAll('[data-w]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-w') === st.wind); });
    var barTo = barAnim ? barAnim.to : st.bar;
    document.querySelectorAll('[data-bar]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-bar') === 'in') === barTo); b.disabled = !!barAnim; });
    $('c-fil').innerHTML = st.fil ? '<i>✕</i>清除铁屑' : '<i>∴</i>撒铁屑';
    $('c-tap').disabled = !st.fil;
    K.setSw('c-lines', st.lines); $('c-lines').disabled = !st.on;
    K.setSw('c-cur', st.cur); $('c-cur').disabled = !st.on;
  }

  function preset(i) {
    // [开关, 铁棒, 铁屑]：第 3 问通电、铁屑已撒未敲（照课本不插铁棒）；其余绕法一、电源正接、无铁棒；第 1 问要先拨一下磁针
    var P = [[false, false, 0], [false, false, 0], [true, false, 1], [true, false, 0], [true, false, 0], [true, false, 0]][i];
    st.q = i; st.wait = i === 0; st.on = P[0]; st.bar = P[1]; barAnim = null; st.rev = false; st.lines = false; st.cur = false; st.cpMoved = false;
    if (st.wind !== 1) { st.wind = 1; buildCoil(); }
    RING.forEach(function (p, k) { st.cps[k].x = p[0]; st.cps[k].z = p[1]; });
    if (P[2]) { scatter(); st.fil = 1; } else { st.fil = 0; filT = -1; }
    buildWires(); buildLines(); buildCur(); settleAll(); bladeAng = st.on ? 0 : -0.95;
    changed();
    tick(0); V.scene.updateMatrixWorld();   // 器材立刻就位，马上点选也准确
  }

  window.__exp = {
    st: st, V: function () { return V; }, field: field, coilB: coilB, pol: pol, stable: stable, Be: function () { return Be; },
    helixPt: function (t) { return helixPt(t, A); }, HB: HB, cp: function (i) { return cpObjs[i]; }, ring: function () { return RING; }, filD: function () { return filD; }
  };
  LabKit.run({
    readings: [{ id: 'L', name: '左端', unit: '' }, { id: 'R', name: '右端', unit: '' }],
    init: function (k) { K = k; ctrls(); build(); document.querySelectorAll('.lk-rd .vl').forEach(function (e) { e.style.minWidth = '0'; e.style.textAlign = 'left'; }); K.el('<p class="lk-note">点开关通断，点电源交换正负极，点铁棒插入或取出；点小磁针拨一下，拖小磁针换位置；撒铁屑后点塑料板轻敲；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; st.rows.push(row()); st.justRec = st.rows.length; last = ''; },
    clear: function () { st.rows = []; st.justRec = 0; last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:1100px"><thead><tr><th style="width:80px">次数</th><th>开关状态</th><th>绕线方式</th><th>电流从哪端流入</th><th>左端极性</th><th>右端极性</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + '</td><td>' + r.sw + '</td><td>' + r.wind + '</td><td>' + r.inEnd + '</td><td>' + (r.L === '未通电' ? r.L : r.L + ' 极') + '</td><td>' + (r.R === '未通电' ? r.R : r.R + ' 极') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table>';
    }
  });
})();
