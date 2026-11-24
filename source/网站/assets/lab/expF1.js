/* 附加 F1 探究光折射时的特点（八上 4.4，课本图 4.4-2、4.4-3）。
   装置：透明玻璃水槽装水（水里滴了几滴牛奶，水面上方有少量烟雾，光的径迹看得见）；水槽中竖直立着圆形光屏，圆心 O 在水面上，
   光屏上画着法线 NN′（过 O 点、垂直于水面）和从法线量起的角度刻度（分度值 1°）；右半块可绕 NN′ 向后 / 向前折转。
   激光笔贴着光屏射向 O 点：「空气→水」时在水面上方，「水→空气」时放进水里（防水激光笔）。
   物理：折射定律 sin i = n·sin r（光从空气射入水），n = 1.33；面板只显示整数度。
     空气→水 入射角 0°–80°；水→空气 入射角 0°–48°（再斜，光就射不出水面，高中再学，这里不做）。
     水面同时有一束很弱的反射光（反射角 = 入射角），亮度按菲涅耳公式粗略取（斜射越厉害越亮），只是示意。
   「逆着折射光射回去」：激光笔挪到原来折射光那一侧，沿原折射光反向射向 O，入射角取原折射角的精确值；
     原来的光路留在光屏上（橙色淡线），可以看到射出的光与它重合——光路可逆。
   操作：沿弧线拖激光笔改入射角，点激光笔开 / 关；左右拖右半块光屏折转（接近展平时松手吸平）；拖空白处转视角。 */
(function () {
  var N_W = 1.33;                       // 水的折射率
  var R = 16;                           // 光屏半径
  var HW = 28, HD = 9, GB = 1.6, WY = 25.5, TOP = 46;   // 水槽内半宽、内半深、槽底玻璃上表面、水面（O 点高度）、槽口高度
  var PEN_A = 19, PEN_W = 16.4;           // 激光笔笔尖到 O 点的距离（空气中 / 水中）
  var MAX = { aw: 80, wa: 48 };
  var st = { dir: 'aw', s: -1, i: 45, on: false, fold: 0, ghost: null, rows: [] };
  var K, V, T3, O, rightG, pen, penHit, rHit, beams = {}, faint = [], ghostM = [], motes, winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function flat() { return Math.abs(st.fold) < 0.5; }
  function up1() { return st.dir === 'aw' ? 1 : -1; }   // 入射光所在的一边：+1 空气（上），-1 水（下）
  /* 折射角（精确值）；水→空气且入射角太大时为 null（这里入射角最大 48°，不会出现） */
  function refr(dir, i) { var x = dir === 'aw' ? Math.sin(rad(i)) / N_W : Math.sin(rad(i)) * N_W; return x >= 1 ? null : deg(Math.asin(x)); }
  function rNow() { return refr(st.dir, st.i); }
  function iInt() { return Math.round(st.i); }
  function rInt() { var r = rNow(); return r == null ? null : Math.round(r); }
  /* 水面反射掉的那一份（菲涅耳公式，自然光取两种偏振的平均），只用来定反射光和折射光的亮度 */
  function refl() {
    var n1 = st.dir === 'aw' ? 1 : N_W, n2 = st.dir === 'aw' ? N_W : 1, ci = Math.cos(rad(st.i)), r = rNow(); if (r == null) return 1;
    var ct = Math.cos(rad(r)), rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
    return (rs * rs + rp * rp) / 2;
  }
  // 从 O 点出发的方向：side 左 -1 / 右 +1，ang 与法线的夹角，up +1 向上（空气）/ -1 向下（水）
  function dirOf(side, ang, up) { var a = rad(ang); return new T3.Vector3(side * Math.sin(a), up * Math.cos(a), 0); }
  function onBoard(side) { return side < 0 || flat(); }   // 左半块始终在原平面；右半块展平时才在
  function inVis() { return st.on && onBoard(st.s); }
  function outVis() { return st.on && onBoard(-st.s); }

  /* ── 器材 ── */
  function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace; return t; }
  function boardTex() {   // 整块圆形光屏的正面：上半空气、下半水；法线 NN′、水面线、四个象限从法线量起的刻度
    var px = 48, S = 2 * R * px;
    return tex(S, S, function (g) {
      var c = S / 2, Rp = R * px;
      g.fillStyle = '#FDFDFB'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#F1F6FA'; g.fillRect(0, c, S, c);
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F';
      g.lineWidth = 4; g.beginPath(); g.arc(c, c, Rp - 6, 0, Math.PI * 2); g.stroke();
      for (var q = 0; q < 4; q++) {
        var sx = q % 2 ? 1 : -1, sy = q < 2 ? -1 : 1;
        for (var a = 0; a <= 90; a++) {
          var t = rad(a), l = a % 10 === 0 ? 50 : a % 5 === 0 ? 34 : 18, ux = sx * Math.sin(t), uy = sy * Math.cos(t), r0 = Rp - 6;
          g.lineWidth = a % 5 === 0 ? 4 : 2.2; g.beginPath(); g.moveTo(c + ux * r0, c + uy * r0); g.lineTo(c + ux * (r0 - l), c + uy * (r0 - l)); g.stroke();
          if (a % 10 === 0 && a > 0 && a < 90) { g.font = 'bold 38px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(a), c + ux * (r0 - 84), c + uy * (r0 - 84)); }
        }
      }
      g.lineWidth = 5; g.beginPath(); g.moveTo(c - Rp + 6, c); g.lineTo(c + Rp - 6, c); g.stroke();                  // 水面
      g.setLineDash([24, 16]); g.lineWidth = 4; g.beginPath(); g.moveTo(c, 40); g.lineTo(c, S - 40); g.stroke(); g.setLineDash([]);   // 法线
      g.font = 'bold 56px Bahnschrift, Arial'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('N', c + 14, 52);
      g.textBaseline = 'bottom'; g.fillText('N′', c + 14, S - 52);
      g.font = 'bold 48px Bahnschrift, Arial'; g.textBaseline = 'top'; g.fillText('O', c + 12, c + 8);
      g.font = 'bold 44px "Microsoft YaHei", sans-serif'; g.textAlign = 'left';
      g.textBaseline = 'bottom'; g.fillText('空气', c - Rp + 140, c - 10);
      g.textBaseline = 'top'; g.fillStyle = '#2D6A96'; g.fillText('水', c - Rp + 150, c + 12);
    });
  }
  function makeRay(color, w, op) {   // 贴在光屏上的光迹：沿局部 x 方向的细长平面
    var m = new T3.Mesh(new T3.PlaneGeometry(1, w), new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: op, depthWrite: false }));
    m.renderOrder = 1;
    m.userData.set = function (from, dir, len, z) { m.scale.x = Math.max(0.001, len); m.position.set(from.x + dir.x * len / 2, from.y + dir.y * len / 2, z); m.rotation.set(0, 0, Math.atan2(dir.y, dir.x)); };
    return m;
  }
  function makeBeam() {   // 空间里的光束：细亮芯 + 外面一层淡光晕（水里有牛奶、空气里有烟，才看得见）
    var g = new T3.Group(), core = new T3.Mesh(new T3.CylinderGeometry(0.09, 0.09, 1, 8, 1, true), new T3.MeshBasicMaterial({ color: 0xFF3B22, transparent: true, opacity: .9, depthWrite: false, blending: T3.AdditiveBlending }));
    var halo = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 1, 12, 1, true), new T3.MeshBasicMaterial({ color: 0xFF5A3A, transparent: true, opacity: .2, depthWrite: false, blending: T3.AdditiveBlending }));
    core.renderOrder = halo.renderOrder = 2; g.add(core); g.add(halo);
    g.userData.set = function (from, dir, len, a) {
      g.visible = len > 0.01 && a > 0.01; if (!g.visible) return;
      g.position.copy(from).addScaledVector(dir, len / 2); g.scale.set(1, len, 1);
      g.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), dir);
      core.material.opacity = 0.95 * a; halo.material.opacity = 0.24 * a;
    };
    return g;
  }
  function halfBoard(side, face, back, rim) {   // side -1 左半块（x<0），+1 右半块
    var g = new T3.Group(), t0 = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    var f = new T3.Mesh(new T3.CircleGeometry(R, 96, t0, Math.PI), face); f.position.z = 0.15; g.add(f);
    var b = new T3.Mesh(new T3.CircleGeometry(R, 48, t0, Math.PI), back); b.position.z = -0.15; g.add(b);
    var r = new T3.Mesh(new T3.CylinderGeometry(R, R, 0.3, 64, 1, true, side < 0 ? Math.PI : 0, Math.PI), rim); r.rotation.x = Math.PI / 2; g.add(r);
    f.castShadow = true;
    return g;
  }
  function build() {
    V = K.three({ target: [9, 24, 0], az: 0.24, el: 0.14, dist: 134, minDist: 70, maxDist: 175, minAz: -0.95, maxAz: 0.95, minEl: 0.02, maxEl: 0.95, fov: 30, sun: [-30, 110, 80] });
    T3 = V.T; var S = V.scene;
    O = new T3.Vector3(0, WY, 0);
    var glass = new T3.MeshPhongMaterial({ color: 0xEAF4F7, transparent: true, opacity: .16, shininess: 120, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var gEdge = new T3.MeshPhongMaterial({ color: 0x9FC7BF, transparent: true, opacity: .55, shininess: 90, depthWrite: false });
    var frame = new T3.MeshStandardMaterial({ color: 0x2F3640, roughness: .45, metalness: .25 });
    // 水槽：前后左右四块玻璃 + 底玻璃；上下两圈黑色塑料框；竖直的四条棱看起来略带绿色（玻璃侧边）
    function pane(w, h, d, x, y, z) { var m = new T3.Mesh(new T3.BoxGeometry(w, h, d), glass); m.position.set(x, y, z); m.renderOrder = 4; S.add(m); return m; }
    var GT = 0.5, H = TOP - GB;
    pane(2 * HW + 2 * GT, H, GT, 0, GB + H / 2, HD + GT / 2); pane(2 * HW + 2 * GT, H, GT, 0, GB + H / 2, -HD - GT / 2);
    pane(GT, H, 2 * HD, -HW - GT / 2, GB + H / 2, 0); pane(GT, H, 2 * HD, HW + GT / 2, GB + H / 2, 0);
    pane(2 * HW + 2 * GT, GT, 2 * HD + 2 * GT, 0, GB - GT / 2, 0);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (p) { var e = new T3.Mesh(new T3.BoxGeometry(GT + 0.05, H, GT + 0.05), gEdge); e.position.set(p[0] * (HW + GT / 2), GB + H / 2, p[1] * (HD + GT / 2)); e.renderOrder = 4; S.add(e); });
    function rimRing(y, h, w, sh) {
      var L = 2 * HW + 2 * GT + 2 * w, D = 2 * HD + 2 * GT + 2 * w;
      [[L, w, 0, D / 2 - w / 2], [L, w, 0, -D / 2 + w / 2]].forEach(function (a) { var m = new T3.Mesh(new T3.BoxGeometry(a[0], h, a[1]), frame); m.position.set(a[2], y, a[3]); m.castShadow = sh; m.receiveShadow = true; S.add(m); });
      [[-1], [1]].forEach(function (a) { var m = new T3.Mesh(new T3.BoxGeometry(w, h, D - 2 * w), frame); m.position.set(a[0] * (L / 2 - w / 2), y, 0); m.castShadow = sh; S.add(m); });
    }
    rimRing(GB - GT - 0.6, 1.6, 1.1, true); rimRing(TOP + 0.35, 0.9, 0.9, false);   // 上框不投影，免得地面上多出一个空心方框
    var foot = new T3.Mesh(new T3.BoxGeometry(2 * HW + 4.2, 0.4, 2 * HD + 4.2), frame); foot.position.y = 0.2; foot.receiveShadow = true; foot.castShadow = true; S.add(foot);
    // 水：略带乳白（滴了牛奶），水面在 O 点；前后玻璃上画一条水面线
    var waterM = new T3.MeshPhongMaterial({ color: 0xBFDDEE, transparent: true, opacity: .36, shininess: 60, specular: 0x99bbcc, depthWrite: false });
    var water = new T3.Mesh(new T3.BoxGeometry(2 * HW, WY - GB, 2 * HD), waterM); water.position.y = (GB + WY) / 2; water.renderOrder = 3; S.add(water);
    var surf = new T3.Mesh(new T3.PlaneGeometry(2 * HW, 2 * HD), new T3.MeshPhongMaterial({ color: 0xE3F1F8, transparent: true, opacity: .32, shininess: 140, specular: 0xffffff, depthWrite: false })); surf.rotation.x = -Math.PI / 2; surf.position.y = WY + 0.01; surf.renderOrder = 3; S.add(surf);
    [HD + 0.02, -HD - 0.02].forEach(function (z) { var l = new T3.Mesh(new T3.PlaneGeometry(2 * HW, 0.18), new T3.MeshBasicMaterial({ color: 0x7FA9C4, transparent: true, opacity: .75, depthWrite: false, side: T3.DoubleSide })); l.position.set(0, WY, z); l.renderOrder = 3; S.add(l); });
    // 水里悬着的细小牛奶微粒（慢慢飘，让画面活一点；不影响光路）
    var n = 260, pos = new Float32Array(n * 3);
    for (var k = 0; k < n; k++) { pos[k * 3] = (Math.random() * 2 - 1) * (HW - 1); pos[k * 3 + 1] = GB + 0.5 + Math.random() * (WY - GB - 1); pos[k * 3 + 2] = (Math.random() * 2 - 1) * (HD - 1); }
    var pg = new T3.BufferGeometry(); pg.setAttribute('position', new T3.BufferAttribute(pos, 3));
    motes = new T3.Points(pg, new T3.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: .55, depthWrite: false })); motes.renderOrder = 3; S.add(motes);
    // 光屏：左右两个半圆，右半块绕法线折转；光屏立在槽底的底座上
    var face = new T3.MeshStandardMaterial({ map: boardTex(), roughness: .85, emissive: 0xffffff, emissiveIntensity: .0 });
    face.emissiveMap = face.map; face.emissiveIntensity = .3;
    var back = new T3.MeshStandardMaterial({ color: 0xE9ECEF, roughness: .9, side: T3.BackSide }), rim = new T3.MeshStandardMaterial({ color: 0xCBD3DC, roughness: .6 });
    var leftH = halfBoard(-1, face, back, rim); leftH.position.copy(O); S.add(leftH);
    rightG = new T3.Group(); rightG.position.copy(O); S.add(rightG);
    rightG.add(halfBoard(1, face, back, rim));
    var hinge = new T3.Mesh(new T3.CylinderGeometry(0.2, 0.2, 2 * R, 12), new T3.MeshStandardMaterial({ color: 0x9FB3CC, metalness: .4, roughness: .35 })); hinge.position.set(0, WY, 0.18); S.add(hinge);
    var grey = new T3.MeshStandardMaterial({ color: 0x5B6573, roughness: .5, metalness: .3 });
    var base = new T3.Mesh(new T3.BoxGeometry(9, 1.4, 5), grey); base.position.set(0, GB + 0.7, -0.6); base.castShadow = true; S.add(base);
    var postH = WY - R + 1 - (GB + 1.4), post = new T3.Mesh(new T3.CylinderGeometry(0.45, 0.45, postH, 16), grey); post.position.set(0, GB + 1.4 + postH / 2, -0.6); S.add(post);
    var clip = new T3.Mesh(new T3.BoxGeometry(2.4, 2.2, 1.1), grey); clip.position.set(0, WY - R + 0.6, -0.1); S.add(clip);
    // 光屏上的光迹：入射 / 折射 / 反射，各分左右两半（右半块的随光屏折转）
    ['in', 'out', 'rf'].forEach(function (k) {
      beams[k + 'L'] = makeRay(0xFF2A1A, 0.16, .95); beams[k + 'Lg'] = makeRay(0xFF6A50, 0.7, .28); S.add(beams[k + 'L']); S.add(beams[k + 'Lg']);
      beams[k + 'R'] = makeRay(0xFF2A1A, 0.16, .95); beams[k + 'Rg'] = makeRay(0xFF6A50, 0.7, .28); rightG.add(beams[k + 'R']); rightG.add(beams[k + 'Rg']);
    });
    // 空间中的光束（水里、烟里看得见）
    beams.vIn = makeBeam(); beams.vOut = makeBeam(); beams.vRf = makeBeam(); S.add(beams.vIn); S.add(beams.vOut); S.add(beams.vRf);
    var spotM = new T3.MeshBasicMaterial({ color: 0xFF5A3A, transparent: true, opacity: .85, depthWrite: false, blending: T3.AdditiveBlending });
    beams.spot = new T3.Mesh(new T3.CircleGeometry(0.5, 24), spotM); beams.spot.position.set(0, WY, 0.2); beams.spot.renderOrder = 2; S.add(beams.spot);
    beams.sSurf = new T3.Mesh(new T3.CircleGeometry(0.9, 24), spotM); beams.sSurf.rotation.x = -Math.PI / 2; beams.sSurf.position.set(0, WY + 0.03, 0.4); beams.sSurf.renderOrder = 2; S.add(beams.sSurf);
    beams.sEnd = new T3.Mesh(new T3.CircleGeometry(0.8, 24), spotM); beams.sEnd.renderOrder = 2; S.add(beams.sEnd);
    // 激光笔（水里用的是同一支防水激光笔，略小）
    pen = new T3.Group();
    var dark = new T3.MeshStandardMaterial({ color: 0x2B3442, roughness: .38, metalness: .35 }), metal = new T3.MeshStandardMaterial({ color: 0xC5CDD7, metalness: .75, roughness: .22 });
    var body = new T3.Mesh(new T3.CylinderGeometry(0.55, 0.55, 7.2, 24), dark); body.position.y = -4.6; pen.add(body);
    var nose = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.55, 1, 24), metal); nose.position.y = -0.5; pen.add(nose);
    var lens = new T3.Mesh(new T3.CircleGeometry(0.24, 16), new T3.MeshBasicMaterial({ color: 0xFF6A50 })); lens.rotation.x = -Math.PI / 2; lens.position.y = 0.01; pen.add(lens);
    var ring = new T3.Mesh(new T3.CylinderGeometry(0.6, 0.6, 0.35, 24), metal); ring.position.y = -1.4; pen.add(ring);
    var cap = new T3.Mesh(new T3.CylinderGeometry(0.58, 0.5, 0.6, 24), metal); cap.position.y = -8.5; pen.add(cap);
    var clipP = new T3.Mesh(new T3.BoxGeometry(0.22, 3.2, 0.3), metal); clipP.position.set(0, -6.4, -0.62); pen.add(clipP);
    var btn = new T3.Mesh(new T3.BoxGeometry(0.5, 1.1, 0.3), new T3.MeshStandardMaterial({ color: 0xFE752D, roughness: .5 })); btn.position.set(0, -3.2, 0.55); pen.add(btn);
    penHit = new T3.Mesh(new T3.CylinderGeometry(1.7, 1.7, 10, 8), new T3.MeshBasicMaterial({ visible: false })); penHit.position.y = -4.5; pen.add(penHit);
    body.castShadow = true; S.add(pen);
    rHit = new T3.Mesh(new T3.BoxGeometry(R - 3, 2 * R, 2), new T3.MeshBasicMaterial({ visible: false })); rHit.position.set(R / 2 + 1.5, 0, 0); rightG.add(rHit);
    V.tag('pen', ''); V.tag('fold', '');
    // 拖动：激光笔沿以 O 为圆心的弧线移动（不动就是开 / 关）；右半块光屏绕法线折转
    var grab = null, pplane = new T3.Plane(new T3.Vector3(0, 0, 1), -0.6);
    function penAng(p) { return deg(Math.atan2(st.s * (p.x - O.x), up1() * (p.y - O.y))); }
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [penHit, rHit]); },
      start: function (ev) {
        var p;
        if (V.pick(ev, [penHit])) { p = V.onPlane(ev, pplane); grab = { k: 'pen', a0: p ? penAng(p) : 0, i0: Math.round(st.i), x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        var hh = V.pick(ev, [rHit]);
        if (hh) { var lp = rightG.worldToLocal(hh.point.clone()), sp = V.toScreen(hh.point), mp = stagePt(ev); grab = { k: 'fold', lp: lp, ox: mp.x - sp.x, oy: mp.y - sp.y }; return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        if (grab.k === 'pen') {
          if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) grab.moved = true;
          if (!grab.moved) return;
          var p = V.onPlane(ev, pplane); if (p) setI(grab.i0 + (penAng(p) - grab.a0));
        } else {   // 找一个折转角，让按住的那一点在屏幕上离手指最近
          var mp2 = stagePt(ev), tx = mp2.x - grab.ox, ty = mp2.y - grab.oy, best = st.fold, bd = 1e9;
          for (var f = -60; f <= 60; f++) { var w = grab.lp.clone().applyAxisAngle(new T3.Vector3(0, 1, 0), rad(f)).add(O), sc = V.toScreen(w), d = Math.hypot(sc.x - tx, sc.y - ty); if (d < bd) { bd = d; best = f; } }
          setFold(best);
        }
      },
      end: function () {
        if (grab && grab.k === 'pen' && !grab.moved) { st.on = !st.on; changed(); }
        if (grab && grab.k === 'fold' && Math.abs(st.fold) < 3) setFold(0);
        grab = null;
      }
    };
    V.frame = tick;
    var h0 = V.home; V.home = function () { h0(); shiftNow = 0; };   // 「重置实验」回默认视角后，下一帧再按样子挪画面
  }
  /* 沉浸舞台：观察窗挪到左上角，把画面往右挪一点，免得窗子压住水槽 */
  var shiftNow = 0;
  function styleShift() {
    var want = document.body.classList.contains('dz-style-stage') ? -20 : 0;
    if (want === shiftNow) return;
    V.target.x += want - shiftNow; shiftNow = want; V.view();
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function setI(v) { st.i = clamp(Math.round(v), 0, MAX[st.dir]); changed(); }
  function setFold(v) { st.fold = clamp(Math.round(v), -60, 60); changed(); }
  function setDir(d) { if (st.dir === d && st.s < 0) return; st.dir = d; st.s = -1; st.i = clamp(Math.round(st.i), 0, MAX[d]); st.ghost = null; changed(); }
  /* 逆着折射光射回去：激光笔挪到折射光那一侧、换到另一种物质里，入射角 = 原来的折射角（精确值） */
  function reverse() {
    var r = rNow(); if (r == null) return;
    st.ghost = { dir: st.dir, s: st.s, i: st.i };
    st.dir = st.dir === 'aw' ? 'wa' : 'aw'; st.s = -st.s; st.i = r; st.on = true; changed();
  }

  // 一条光线从 from 沿 dir 走，碰到水槽内壁 / 槽底 / 水面为止（mediumUp：在空气里就最多走 lim）
  function runLen(from, dir, inWater, lim) {
    var t = lim;
    if (dir.x > 1e-6) t = Math.min(t, (HW - from.x) / dir.x); if (dir.x < -1e-6) t = Math.min(t, (-HW - from.x) / dir.x);
    if (inWater && dir.y < -1e-6) {
      t = Math.min(t, (GB - from.y) / dir.y);
      var tb = (GB + 1.4 - from.y) / dir.y; if (Math.abs(from.x + dir.x * tb) < 4.5) t = Math.min(t, tb);   // 光屏底座挡住
    }
    return Math.max(0, t);
  }
  function tick(dt) {
    var s = st.s, u = up1(), r = rNow(), Rf = refl();
    var din = dirOf(s, st.i, u), drf = dirOf(-s, st.i, u), dout = r == null ? null : dirOf(-s, r, -u), z = 0.17;
    styleShift();
    rightG.rotation.y = rad(st.fold);
    // 激光笔：笔尖朝 O
    var pd = u > 0 ? PEN_A : PEN_W, tipP = O.clone().addScaledVector(din, pd);
    pen.position.set(tipP.x, tipP.y, 0.6); pen.scale.setScalar(u > 0 ? 1 : 0.78);
    pen.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), din.clone().negate());
    // 光屏上的光迹
    var Lb = R - 0.4, zero = new T3.Vector3();
    function trace(k, side, d, show, a) {
      var on = show && (side < 0 || flat()), L = beams[k + 'L'], Lg = beams[k + 'Lg'], Rr = beams[k + 'R'], Rg = beams[k + 'Rg'];
      L.visible = Lg.visible = on && side < 0; Rr.visible = Rg.visible = on && side > 0;
      if (!on || !d) return;
      if (side < 0) { L.userData.set(O, d, Lb, z); Lg.userData.set(O, d, Lb, z - 0.005); L.material.opacity = .95 * a; Lg.material.opacity = .28 * a; }
      else { Rr.userData.set(zero, d, Lb, z); Rg.userData.set(zero, d, Lb, z - 0.005); Rr.material.opacity = .95 * a; Rg.material.opacity = .28 * a; }
    }
    var aRf = clamp(0.22 + 1.1 * Math.sqrt(Rf), 0.25, 0.8), aOut = clamp(1 - Rf, 0.3, 1);
    trace('in', s, din, st.on, 1);
    trace('out', -s, dout, st.on && !!dout, aOut);
    trace('rf', -s, drf, st.on && st.i > 0.5, aRf);   // 垂直入射时反射光沿原路返回，和入射光重合
    // 空间里的光束（在光屏前面一点）
    var off = new T3.Vector3(0, 0, 0.42), Oz = O.clone().add(off);
    var inW = u < 0;   // 入射光在水里
    beams.vIn.userData.set(Oz, din, pd, st.on ? (inW ? 1 : .55) : 0);
    var outLen = dout ? runLen(Oz, dout, !inW, inW ? 30 : 60) : 0;
    beams.vOut.userData.set(Oz, dout || din, outLen, st.on && dout ? (inW ? .55 : 1) * aOut : 0);
    var rfLen = runLen(Oz, drf, inW, inW ? 60 : 22);
    beams.vRf.userData.set(Oz, drf, rfLen, st.on && st.i > 0.5 ? aRf * (inW ? .8 : .5) : 0);
    beams.spot.visible = beams.sSurf.visible = st.on;
    // 折射光（或水里的反射光）打到槽底 / 侧壁的光斑
    var endD = inW ? drf : dout, endL = inW ? rfLen : outLen;
    beams.sEnd.visible = st.on && !!endD && endL > 0.5 && (!inW || st.i > 0.5);
    if (beams.sEnd.visible) {
      var ep = Oz.clone().addScaledVector(endD, endL);
      if (endD.y < 0 && (Math.abs(ep.y - GB) < 0.05 || Math.abs(ep.y - GB - 1.4) < 0.05)) { beams.sEnd.position.set(ep.x, ep.y + 0.03, ep.z); beams.sEnd.rotation.set(-Math.PI / 2, 0, 0); }
      else { beams.sEnd.position.set(ep.x - Math.sign(endD.x) * 0.03, ep.y, ep.z); beams.sEnd.rotation.set(0, -Math.sign(endD.x) * Math.PI / 2, 0); }
    }
    // 原来的光路（逆着射回去之前），光屏上淡橙色
    ghostM.forEach(function (m) { m.visible = false; });
    if (st.ghost) {
      var gu = st.ghost.dir === 'aw' ? 1 : -1, gr = refr(st.ghost.dir, st.ghost.i);
      [[st.ghost.s, dirOf(st.ghost.s, st.ghost.i, gu)], [-st.ghost.s, gr == null ? null : dirOf(-st.ghost.s, gr, -gu)]].forEach(function (b, k) {
        if (!b[1]) return;
        if (!ghostM[k]) { ghostM[k] = makeRay(0xFF9A3C, 0.5, .5); }
        var m = ghostM[k], par = b[0] > 0 ? rightG : V.scene; if (m.parent !== par) par.add(m);
        m.visible = b[0] < 0 || flat(); m.userData.set(b[0] > 0 ? zero : O, b[1], Lb, 0.163);
      });
    }
    // 微粒慢慢飘
    if (dt && motes) { var p = motes.geometry.attributes.position, tt = performance.now() / 1000; for (var k = 0; k < p.count; k += 1) { var y = p.getY(k) + dt * (0.12 + 0.05 * Math.sin(k)); if (y > WY - 0.4) y = GB + 0.5; p.setY(k, y); p.setX(k, p.getX(k) + dt * 0.08 * Math.sin(tt * 0.4 + k)); } p.needsUpdate = true; }
    // 标签
    var pt = V.tag('pen'); pt.textContent = '点激光笔打开';
    V.placeTag('pen', O.clone().addScaledVector(din, pd + (u > 0 ? 10.5 : 8))); if (st.on) pt.style.display = 'none';
    var ft = V.tag('fold'); ft.textContent = flat() ? '拖右半块可折转' : (st.fold > 0 ? '向后折 ' : '向前折 ') + Math.abs(st.fold) + '°';
    var fp = new T3.Vector3(R + 0.4, R * 0.55, 0.2); rightG.localToWorld(fp); V.placeTag('fold', fp); ft.style.transform = 'translate(10px, -50%)';
    if (st.on && flat()) ft.style.display = 'none';   // 激光开着、光屏展平时不显示，免得压住光路
    drawWin(); ui();
  }

  /* ── 观察窗：光屏 O 点附近的光路和角度 ── */
  function drawWin() {
    var key = [st.dir, st.s, st.i.toFixed(3), st.on, flat(), K.revealed(), st.ghost ? st.ghost.dir + st.ghost.s + st.ghost.i : ''].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:330px"><h3><span>光屏上的光路</span><small>角度从法线量起</small></h3><svg viewBox="0 0 360 300"></svg></div>');
    var cx = 180, cy = 150, RR = 132, s = '', u = up1(), r = rNow();
    function P(side, ang, up, len) { var a = rad(ang); return [cx + side * Math.sin(a) * len, cy - up * Math.cos(a) * len]; }
    s += '<path d="M' + (cx - RR) + ' ' + cy + 'A' + RR + ' ' + RR + ' 0 0 0 ' + (cx + RR) + ' ' + cy + 'Z" fill="#E4F0F8"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + RR + '" fill="none" stroke="#1E3A5F" stroke-width="2"/>';
    for (var q = 0; q < 4; q++) for (var a = 0; a <= 90; a += 2) {
      var sx = q % 2 ? 1 : -1, sy = q < 2 ? 1 : -1, l = a % 10 === 0 ? 12 : 5, p1 = P(sx, a, sy, RR), p2 = P(sx, a, sy, RR - l);
      s += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#1E3A5F" stroke-width="' + (a % 10 ? 1 : 1.6) + '"/>';
      if (a % 30 === 0 && a > 0 && a < 90) { var pt = P(sx, a, sy, RR - 26); s += '<text x="' + pt[0] + '" y="' + (pt[1] + 5) + '" text-anchor="middle" font-size="14" font-family="Bahnschrift" fill="#56677D">' + a + '</text>'; }
    }
    s += '<line x1="' + (cx - RR - 12) + '" y1="' + cy + '" x2="' + (cx + RR + 12) + '" y2="' + cy + '" stroke="#2D6A96" stroke-width="3"/>';
    s += '<line x1="' + cx + '" y1="' + (cy - RR - 4) + '" x2="' + cx + '" y2="' + (cy + RR + 4) + '" stroke="#1E3A5F" stroke-width="1.8" stroke-dasharray="6 5"/>';
    s += '<text x="' + (cx + 7) + '" y="' + (cy - RR + 22) + '" font-size="16" font-weight="700" fill="#1E3A5F">N</text><text x="' + (cx + 7) + '" y="' + (cy + RR - 10) + '" font-size="16" font-weight="700" fill="#1E3A5F">N′</text>';
    s += '<text x="12" y="' + (cy - 10) + '" font-size="16" fill="#56677D">空气</text><text x="16" y="' + (cy + 24) + '" font-size="16" fill="#2D6A96">水</text>';
    // 原来的光路（虚线）
    if (st.ghost) {
      var gu = st.ghost.dir === 'aw' ? 1 : -1, gr = refr(st.ghost.dir, st.ghost.i), g1 = P(st.ghost.s, st.ghost.i, gu, RR - 4);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + g1[0] + '" y2="' + g1[1] + '" stroke="#F59E0B" stroke-width="7" stroke-opacity=".45" stroke-linecap="round"/>';
      if (gr != null) { var g2 = P(-st.ghost.s, gr, -gu, RR - 4); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + g2[0] + '" y2="' + g2[1] + '" stroke="#F59E0B" stroke-width="7" stroke-opacity=".45" stroke-linecap="round"/>'; }
    }
    function arrow(x1, y1, x2, y2, col) {   // 线段中点画一个箭头，表示光的传播方向
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1), L = 11, W = 6;
      return '<path d="M' + (mx + Math.cos(a) * L / 2) + ' ' + (my + Math.sin(a) * L / 2) + 'L' + (mx - Math.cos(a) * L / 2 - Math.sin(a) * W) + ' ' + (my - Math.sin(a) * L / 2 + Math.cos(a) * W) + 'L' + (mx - Math.cos(a) * L / 2 + Math.sin(a) * W) + ' ' + (my - Math.sin(a) * L / 2 - Math.cos(a) * W) + 'Z" fill="' + col + '"/>';
    }
    var vIn = inVis(), vOut = outVis() && r != null;
    if (vIn) {
      var a1 = P(st.s, st.i, u, RR - 4);
      s += '<line x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + cx + '" y2="' + cy + '" stroke="#E5341F" stroke-width="3.5"/>' + arrow(a1[0], a1[1], cx, cy, '#E5341F');
      if (st.i > 0.5) { var a3 = P(-st.s, st.i, u, RR - 4); if (outVis()) s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + a3[0] + '" y2="' + a3[1] + '" stroke="#E5341F" stroke-width="2" stroke-opacity=".35"/>'; }
    }
    if (vOut) { var a2 = P(-st.s, r, -u, RR - 4); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + a2[0] + '" y2="' + a2[1] + '" stroke="#E5341F" stroke-width="3.5"/>' + arrow(cx, cy, a2[0], a2[1], '#E5341F'); }
    function arc(side, ang, up, rr, col, lab) {   // 从法线量到光线的角
      if (ang < 0.5) return '';
      var p0 = P(side, 0, up, rr), p1 = P(side, ang, up, rr), sw = (side > 0) === (up > 0) ? 1 : 0, m = P(side, ang / 2, up, rr + 20);
      return '<path d="M' + p0[0] + ' ' + p0[1] + 'A' + rr + ' ' + rr + ' 0 0 ' + sw + ' ' + p1[0] + ' ' + p1[1] + '" fill="none" stroke="' + col + '" stroke-width="2.2"/>' +
        '<text x="' + m[0] + '" y="' + (m[1] + 6) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + col + '" stroke="#fff" stroke-width="5" paint-order="stroke">' + lab + '</text>';
    }
    if (vIn) s += arc(st.s, st.i, u, 44, '#C2410C', 'i');
    if (vOut && K.revealed()) s += arc(-st.s, r, -u, 54, '#1D4ED8', 'r');
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#1E3A5F"/><text x="' + (cx + 8) + '" y="' + (cy + 18) + '" font-size="15" fill="#1E3A5F">O</text>';
    if (!st.on) s += '<text x="' + cx + '" y="' + (cy - 62) + '" text-anchor="middle" font-size="16" fill="#56677D" stroke="#fff" stroke-width="6" paint-order="stroke">激光还没打开</text>';
    else if (!flat()) s += '<text x="' + (cx + (st.s < 0 ? 1 : -1) * 78) + '" y="' + (cy + (u > 0 ? 40 : -30)) + '" text-anchor="middle" font-size="15" fill="#C1361A" stroke="#fff" stroke-width="5" paint-order="stroke">光屏上没有' + (st.s < 0 ? '折射光' : '入射光') + '</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function changed() { if (K.revealed()) K.invalidate(); last = ''; }
  function dirTxt(d) { return d === 'aw' ? '空气 → 水' : '水 → 空气'; }
  function dup() { return st.rows.some(function (x) { return x.dir === st.dir && x.i === iInt(); }); }
  function canRec() { return st.on && flat() && rNow() != null && !dup() && st.rows.length < 10 && K.revealed(); }
  function ui() {
    var ok, hint, tone = '', q = K.S.q, rI = rInt();
    var checks = [{ label: '激光打开', ok: st.on }, { label: '光屏展平', ok: flat() }];
    if (!st.on) hint = st.dir === 'aw' ? '打开激光，让光斜着射到水面上的 O 点。' : '打开激光，让光从水中射向 O 点。';
    else if (!flat()) { hint = '右半块光屏折过去了，光屏上看不到' + (st.s < 0 ? '折射光' : '入射光') + '。水里的光还在原来的平面里。'; tone = 'warn'; }
    else if (q === 0 && st.dir === 'aw') { hint = '看光进入水中以后，是不是还沿原来的方向走？'; }
    else if (q === 2 && iInt() > 0) hint = '把激光笔一步步拖向法线，一直拖到 0°。';
    else if (iInt() === 0) { hint = '光垂直射入，传播方向不变，入射角、折射角都是 0°。'; tone = 'good'; }
    else if (q === 3 && !st.ghost) hint = '点「逆着折射光射回去」，让光从水中沿原来的折射光射向 O 点。';
    else if (q === 3) { hint = '射出的光和原来的入射光（橙色淡线）重合：光路可逆。'; tone = 'good'; }
    else if (q === 4 && st.dir === 'aw') hint = '先在「光从」里选「水→空气」，把激光笔放进水里。';
    else if (q === 1 && !dup() && st.rows.length < 10) { hint = '记下这一组，再把入射角调大一些。'; tone = 'good'; }
    else if (st.dir === 'wa' && st.i >= MAX.wa - 0.5 && !dup()) { hint = '光从水中射出时，入射角最大调到 48°；再斜，光就射不出水面了。'; tone = 'good'; }
    else if (dup()) hint = '这个入射角已经记过了，拖激光笔换一个角度。';
    else if (st.rows.length >= 10) hint = '已记满 10 组，可以到「数据」比较。';
    else { hint = '比较入射角和折射角，再记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: st.on && flat() && rI != null,
      result: '入射角 <b>' + iInt() + '</b>°，折射角 <b>' + rI + '</b>°' + (iInt() === 0 ? '，方向不变' : '') });
    ok = canRec();   // K.state 之后再算：读数刚自动显示出来，这一帧就能记
    var key = [ok, st.i, st.dir, st.s, st.on, st.fold, st.ghost ? 1 : 0, st.rows.length, K.revealed()].join('|');
    if (key === last) return; last = key;
    K.setReading('i', inVis() ? iInt() + '' : null);
    K.setReading('r', outVis() && K.revealed() && rI != null ? rI + '' : null);
    var why = !st.on ? '打开激光后才能记录。' : !flat() ? '光屏展平、入射光和折射光都在光屏上时才能记录。' : dup() ? '这一组（' + dirTxt(st.dir) + '，入射角 ' + iInt() + '°）前面已经记过了，不重复记；拖激光笔换个角度可以再记。' : st.rows.length >= 10 ? '已记满 10 组。' : '';
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次，并在光屏上描下光迹' : why, ok ? 'good' : '');
    K.setCount(st.rows.length + ' 组');
    syncCtrls();
  }
  function addFaint(row) {   // 光屏上留下的淡色光迹（随光屏一起折转）
    var u = row.dir === 'aw' ? 1 : -1, zero = new T3.Vector3();
    [[row.s, dirOf(row.s, row.ie, u)], [-row.s, dirOf(-row.s, row.re, -u)]].forEach(function (b) {
      var m = makeRay(0xE5341F, 0.12, .3); m.userData.set(b[0] > 0 ? zero : O, b[1], R - 0.6, 0.165);
      (b[0] > 0 ? rightG : V.scene).add(m); faint.push(m);
    });
  }

  /* ── 控件：激光（开关）→ 光从（几选一）→ 角度（两条滑杆）→ 光路（动作） ── */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('激光', '<div class="acts">' + K.sw('pw', '激光笔', '打开', '关闭', st.on) + '</div>') +
      K.grp('光从', K.seg('dir', [['aw', '空气 → 水'], ['wa', '水 → 空气']])) +
      K.grp('角度', '<div class="row"><span class="nm">入射角</span><input class="rng" type="range" id="s-i" min="0" max="80" step="1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-i"></span><span class="un">°</span></div>' +
        '<div class="row"><span class="nm">折转</span><input class="rng" type="range" id="s-f" min="-60" max="60" step="1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-f" style="font-size:20px;min-width:92px"></span></div>') +
      K.grp('光路', '<div class="acts"><button id="rev"><i>⇄</i>逆着折射光射回去</button></div>');
    var si = document.getElementById('s-i'), sf = document.getElementById('s-f');
    K.rng(si); K.rng(sf);
    si.addEventListener('input', function () { setI(+si.value); });
    sf.addEventListener('input', function () { setFold(+sf.value); });
    sf.addEventListener('change', function () { if (Math.abs(st.fold) < 3) setFold(0); });
    document.getElementById('pw').onclick = function () { st.on = !st.on; changed(); };
    document.getElementById('rev').onclick = reverse;
    [].forEach.call(K.ctrl.querySelectorAll('[data-dir]'), function (b) { b.onclick = function () { setDir(b.getAttribute('data-dir')); }; });
  }
  function syncCtrls() {
    var si = document.getElementById('s-i'), sf = document.getElementById('s-f');
    si.max = Math.max(MAX[st.dir], Math.ceil(st.i));
    if (document.activeElement !== si) si.value = Math.round(st.i); if (document.activeElement !== sf) sf.value = st.fold;
    [si, sf].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-i').textContent = iInt();
    document.getElementById('v-f').textContent = flat() ? '展平' : (st.fold > 0 ? '向后 ' : '向前 ') + Math.abs(st.fold) + '°';
    K.setSw('pw', st.on);
    [].forEach.call(K.ctrl.querySelectorAll('[data-dir]'), function (b) { b.classList.toggle('on', b.getAttribute('data-dir') === st.dir); });
  }

  function preset(i) {
    var P = [['aw', 45, false], ['aw', 20, true], ['aw', 30, true], ['aw', 45, true], ['wa', 30, true]][i] || ['aw', 45, false];
    st.dir = P[0]; st.s = -1; st.i = P[1]; st.on = P[2]; st.fold = 0; st.ghost = null; winKey = ''; changed();
  }

  window.__exp = { st: st, V: function () { return V; }, pen: function () { return pen; }, right: function () { return rightG; }, refr: refr, reverse: reverse, setDir: setDir };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'i', name: '入射角 ∠<span class="m">i</span>', unit: '°' }, { id: 'r', name: '折射角 ∠<span class="m">r</span>', unit: '°' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">沿弧线拖激光笔改变入射角，点一下激光笔开 / 关；左右拖右半块光屏折转；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function () { last = ''; winKey = ''; },
    record: function () { if (!canRec()) return; var row = { dir: st.dir, s: st.s, i: iInt(), r: rInt(), ie: st.i, re: rNow() }; st.rows.push(row); addFaint(row); last = ''; },
    clear: function () { st.rows = []; faint.forEach(function (m) { m.parent.remove(m); }); faint = []; last = ''; },
    renderData: renderData
  });

  /* ── 数据页：记录表 + 入射角—折射角 的点（虚线是“折射角 = 入射角”） ── */
  function renderData() {
    var rows = st.rows;
    var tb = '<table class="rec"><thead><tr><th style="width:80px">次数</th><th>光从哪里射到哪里</th><th>入射角 ∠<span class="m">i</span>/(°)</th><th>折射角 ∠<span class="m">r</span>/(°)</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (x, k) { return '<tr><td>' + (k + 1) + '</td><td>' + dirTxt(x.dir) + '</td><td class="n">' + x.i + '</td><td class="n">' + x.r + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="dim" style="text-align:center">还没有记录</td></tr>') + '</tbody></table>';
    var W = 560, H = 520, L = 70, B = 60, Tp = 20, Rt = 20, pw = W - L - Rt, ph = H - B - Tp;
    function X(v) { return L + v / 90 * pw; } function Y(v) { return Tp + ph - v / 90 * ph; }
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:600px;display:block">';
    for (var v = 0; v <= 90; v += 10) {
      g += '<line x1="' + X(v) + '" y1="' + Y(0) + '" x2="' + X(v) + '" y2="' + Y(90) + '" stroke="#E3E9F1"/><line x1="' + X(0) + '" y1="' + Y(v) + '" x2="' + X(90) + '" y2="' + Y(v) + '" stroke="#E3E9F1"/>';
      if (v % 30 === 0) g += '<text x="' + X(v) + '" y="' + (Y(0) + 26) + '" text-anchor="middle" font-size="18" fill="#56677D">' + v + '</text><text x="' + (X(0) - 10) + '" y="' + (Y(v) + 6) + '" text-anchor="end" font-size="18" fill="#56677D">' + v + '</text>';
    }
    g += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(90) + '" y2="' + Y(0) + '" stroke="#1E3A5F" stroke-width="2"/><line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(0) + '" y2="' + Y(90) + '" stroke="#1E3A5F" stroke-width="2"/>';
    g += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(90) + '" y2="' + Y(90) + '" stroke="#8A99AD" stroke-width="2" stroke-dasharray="8 6"/><text x="' + (X(62) - 6) + '" y="' + (Y(66) - 4) + '" text-anchor="end" font-size="17" fill="#56677D">折射角 = 入射角</text>';
    g += '<text x="' + X(45) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="19" fill="#1E3A5F">入射角 ∠i/(°)</text><text x="18" y="' + Y(45) + '" text-anchor="middle" font-size="19" fill="#1E3A5F" transform="rotate(-90 18 ' + Y(45) + ')">折射角 ∠r/(°)</text>';
    [['aw', '#2563EB'], ['wa', '#C2410C']].forEach(function (d) {
      var pts = rows.filter(function (x) { return x.dir === d[0]; }).sort(function (a, b) { return a.i - b.i; });
      if (pts.length > 1) g += '<polyline points="' + pts.map(function (x) { return X(x.i) + ',' + Y(x.r); }).join(' ') + '" fill="none" stroke="' + d[1] + '" stroke-width="2" stroke-opacity=".5"/>';
      pts.forEach(function (x) { g += d[0] === 'aw' ? '<circle cx="' + X(x.i) + '" cy="' + Y(x.r) + '" r="7" fill="' + d[1] + '"/>' : '<rect x="' + (X(x.i) - 6.5) + '" y="' + (Y(x.r) - 6.5) + '" width="13" height="13" fill="' + d[1] + '"/>'; });
    });
    g += '</svg>';
    var hasA = rows.some(function (x) { return x.dir === 'aw' && x.i > 0; }), hasW = rows.some(function (x) { return x.dir === 'wa' && x.i > 0; });
    var leg = '<p class="tip" style="font-size:18px"><span style="color:#2563EB">● 空气 → 水</span>　<span style="color:#C2410C">■ 水 → 空气</span></p>' +
      (hasA ? '<p class="tip" style="font-size:18px">空气 → 水 的点都在虚线下面：折射角比入射角小。</p>' : '') +
      (hasW ? '<p class="tip" style="font-size:18px">水 → 空气 的点都在虚线上面：折射角比入射角大。</p>' : '') +
      (!rows.length ? '<p class="tip" style="font-size:18px">记录以后在这里描点。</p>' : '');
    return '<div class="dvh"><h2>记录表与描点</h2><span>角度都从法线量起，取整数度</span></div>' +
      '<div style="display:flex;gap:28px;align-items:flex-start"><div style="flex:0 0 46%;max-height:780px;overflow:auto">' + tb +
      '<p class="tip">角度按光在空气和水之间折射的规律算出，取整数度。光从水中射出时，入射角最大取 48°。</p></div>' +
      '<div style="flex:1;min-width:0">' + g + leg + '</div></div>';
  }
})();
