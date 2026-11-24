/* 05 探究光的反射定律（课本图 4.2-3、4.2-4）。
   装置：平面镜平放在桌面上，镜上竖直立着纸板 ENF（ON 垂直于镜面，O 在镜面上），右半块 NOF 可绕 ON 向前 / 向后折转；
   纸板印有以 ON 为 0° 的角度刻度（分度值 1°）；激光笔贴着纸板射向 O 点。
   规则：按反射定律算反射光，面板只显示纸板刻度读到的整数度数；右半块折转后纸板上看不到反射光
   （打开“空气中的光路”才看到它仍在原来的平面里）；记录时在纸板上留一组淡色光迹；“反向入射”验证光路可逆。
   操作：沿弧线拖激光笔改入射角，点激光笔开 / 关；左右拖右半块纸板折转（接近展平时松手吸平）。 */
(function () {
  var BW = 22, BH = 24, R_SCALE = 18, PEN_D = 20;
  var st = { i: 40, on: false, fold: 0, air: false, rev: false, rows: [] };
  var K, V, T3, rightG, leftB, pen, beams = {}, faint = [], winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function flat() { return Math.abs(st.fold) < 0.5; }
  // 入射光在哪一侧：正常在左（E 侧），反向入射在右（F 侧）
  function inSide() { return st.rev ? 1 : -1; }
  function dirOf(side, deg) { var a = deg * Math.PI / 180; return new T3.Vector3(side * Math.sin(a), Math.cos(a), 0); }
  // 纸板上能否看到某一侧的光迹：左半块始终在原平面；右半块只有展平时才在
  function onBoard(side) { return side < 0 || flat(); }
  /* 第 3 问问的就是“哪个角是入射角”：顶栏、观察窗、结果框都不出现“入射角 ∠i / 反射角 ∠r”，改为中性的“光线与 ON / 镜面的夹角” */
  function neutral() { return K && K.S.q === 2; }
  var RD_NAME = { i: ['入射角 ∠<span class="m">i</span>', '入射光与 ON 夹角'], r: ['反射角 ∠<span class="m">r</span>', '入射光与镜面夹角'] };
  function setNames() { ['i', 'r'].forEach(function (id) { var el = document.querySelector('[data-r="' + id + '"] .nm'); if (el) el.innerHTML = RD_NAME[id][neutral() ? 1 : 0]; }); var ni = document.getElementById('n-i'); if (ni) ni.textContent = neutral() ? '激光笔' : '入射角'; }
  function rVisible() { return st.on && onBoard(-inSide()); }
  function iVisible() { return st.on && onBoard(inSide()); }

  /* ── 场景 ── */
  function halfTex(side) {   // side = -1 左半块（O 在右下角），+1 右半块（O 在左下角）
    var px = 50, c = document.createElement('canvas'); c.width = BW * px; c.height = BH * px; var g = c.getContext('2d');
    g.fillStyle = '#FDFDFB'; g.fillRect(0, 0, c.width, c.height);
    var ox = side < 0 ? c.width : 0, oy = c.height, R = R_SCALE * px;
    g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F';
    g.lineWidth = 3; g.beginPath(); g.arc(ox, oy, R, side < 0 ? Math.PI : -Math.PI / 2, side < 0 ? 1.5 * Math.PI : 0); g.stroke();
    for (var a = 0; a <= 90; a++) {
      var t = a * Math.PI / 180, l = a % 10 === 0 ? 46 : a % 5 === 0 ? 32 : 18, sx = side * Math.sin(t), sy = -Math.cos(t);
      g.lineWidth = a % 5 === 0 ? 4 : 2.2; g.beginPath(); g.moveTo(ox + sx * R, oy + sy * R); g.lineTo(ox + sx * (R - l), oy + sy * (R - l)); g.stroke();
      if (a % 10 === 0 && a < 90) { g.font = 'bold 40px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(a), ox + sx * (R - 80), oy + sy * (R - 80)); }
    }
    g.setLineDash([22, 16]); g.lineWidth = 4; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, 40); g.stroke(); g.setLineDash([]);
    g.font = 'bold 60px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'top';
    if (side < 0) { g.fillText('E', 60, 30); g.fillText('N', c.width - 44, 46); g.textBaseline = 'bottom'; g.fillText('O', c.width - 40, c.height - 10); }
    else g.fillText('F', c.width - 60, 30);
    var tex = new T3.CanvasTexture(c); tex.anisotropy = 8; return tex;
  }
  function faceMat(side) { var t = halfTex(side); return new T3.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .32, roughness: .9 }); }
  function makeRay(color, w, op) {   // 贴在纸板上的光迹：沿局部 x 方向的细长平面
    var m = new T3.Mesh(new T3.PlaneGeometry(1, w), new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: op, depthWrite: false }));
    m.userData.set = function (from, dir, len, z) { m.scale.x = len; m.position.set(from.x + dir.x * len / 2, from.y + dir.y * len / 2, z); m.rotation.set(0, 0, Math.atan2(dir.y, dir.x)); };
    return m;
  }
  function build() {
    V = K.three({ target: [9, 9, 0], az: 0.32, el: 0.26, dist: 80, minDist: 40, maxDist: 130, minAz: -1.1, maxAz: 1.1, minEl: 0.05, maxEl: 1.1, fov: 32, sun: [-30, 90, 80] });
    T3 = V.T; var S = V.scene;
    var mirror = new T3.Mesh(new T3.BoxGeometry(48, 0.5, 22), [0, 1, 2, 3, 4, 5].map(function (k) { return new T3.MeshStandardMaterial({ color: k === 2 ? 0xC6D6E6 : 0xA9B4C2, metalness: .15, roughness: k === 2 ? .15 : .5 }); }));
    mirror.position.set(0, -0.25, 0); mirror.receiveShadow = true; S.add(mirror);
    var sheen = new T3.Mesh(new T3.PlaneGeometry(46, 20), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18, depthWrite: false })); sheen.rotation.x = -Math.PI / 2; sheen.position.y = 0.01; S.add(sheen);
    var edge = new T3.MeshStandardMaterial({ color: 0xE6E2D8, roughness: .9 });
    leftB = new T3.Mesh(new T3.BoxGeometry(BW, BH, 0.3), [edge, edge, edge, edge, faceMat(-1), edge]);
    leftB.position.set(-BW / 2, BH / 2, 0); leftB.castShadow = true; S.add(leftB);
    rightG = new T3.Group(); S.add(rightG);
    var rb = new T3.Mesh(new T3.BoxGeometry(BW, BH, 0.3), [edge, edge, edge, edge, faceMat(1), edge]);
    rb.position.set(BW / 2, BH / 2, 0); rb.castShadow = true; rightG.add(rb);
    var hinge = new T3.Mesh(new T3.CylinderGeometry(0.18, 0.18, BH, 10), new T3.MeshStandardMaterial({ color: 0x9FB3CC })); hinge.position.set(0, BH / 2, 0.16); S.add(hinge);
    // 光迹：入射（左半块，或反向时右半块）与反射；空气中的光路；激光笔
    beams.inL = makeRay(0xFF2A1A, 0.16, 0.95); beams.inLg = makeRay(0xFF6A50, 0.7, 0.28); S.add(beams.inL); S.add(beams.inLg);
    beams.inR = makeRay(0xFF2A1A, 0.16, 0.95); beams.inRg = makeRay(0xFF6A50, 0.7, 0.28); rightG.add(beams.inR); rightG.add(beams.inRg);
    beams.outL = makeRay(0xFF2A1A, 0.16, 0.95); beams.outLg = makeRay(0xFF6A50, 0.7, 0.28); S.add(beams.outL); S.add(beams.outLg);
    beams.outR = makeRay(0xFF2A1A, 0.16, 0.95); beams.outRg = makeRay(0xFF6A50, 0.7, 0.28); rightG.add(beams.outR); rightG.add(beams.outRg);
    beams.air = new T3.Mesh(new T3.CylinderGeometry(0.07, 0.07, 1, 8), new T3.MeshBasicMaterial({ color: 0xFF2A1A, transparent: true, opacity: .75 })); S.add(beams.air);
    var spot = new T3.Mesh(new T3.CircleGeometry(0.45, 20), new T3.MeshBasicMaterial({ color: 0xFF4A30, transparent: true, opacity: .8, depthWrite: false })); spot.position.set(0, 0.3, 0.18); S.add(spot); beams.spot = spot;
    pen = new T3.Group();
    var body = new T3.Mesh(new T3.CylinderGeometry(0.55, 0.55, 9, 20), new T3.MeshStandardMaterial({ color: 0x2B3442, roughness: .4, metalness: .3 })); body.position.y = -4.5; pen.add(body);
    var tip = new T3.Mesh(new T3.CylinderGeometry(0.3, 0.55, 1, 20), new T3.MeshStandardMaterial({ color: 0xC5CDD7, metalness: .7, roughness: .25 })); tip.position.y = 0.5; pen.add(tip);
    var btn = new T3.Mesh(new T3.BoxGeometry(0.5, 1.2, 0.3), new T3.MeshStandardMaterial({ color: 0xFE752D })); btn.position.set(0, -3, 0.55); pen.add(btn);
    var penHit = new T3.Mesh(new T3.CylinderGeometry(1.6, 1.6, 11, 8), new T3.MeshBasicMaterial({ visible: false })); penHit.position.y = -4.5; pen.add(penHit);
    body.castShadow = true; S.add(pen);
    var rHit = new T3.Mesh(new T3.BoxGeometry(BW - 3, BH, 2), new T3.MeshBasicMaterial({ visible: false })); rHit.position.set(BW / 2 + 1.5, BH / 2, 0); rightG.add(rHit);
    V.tag('pen', ''); V.tag('fold', '');
    // 拖动：激光笔沿以 O 为圆心的弧线移动（不动就是开 / 关）；右半块纸板绕 ON 折转
    var grab = null, pplane = new T3.Plane(new T3.Vector3(0, 0, 1), -0.7);
    function penAng(p) { return Math.atan2(-inSide() * -p.x, p.y) * 180 / Math.PI; }
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [penHit, rHit]); },
      start: function (ev) {
        var p;
        if (V.pick(ev, [penHit])) { p = V.onPlane(ev, pplane); grab = { k: 'pen', a0: p ? penAng(p) : 0, i0: st.i, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        var rh = V.pick(ev, [rHit]);
        if (rh) {   // 记住按在右半块上的那一点（局部坐标）和手指相对它的屏幕偏移
          var lp = rightG.worldToLocal(rh.point.clone()), sp = V.toScreen(rh.point), mp = stagePt(ev);
          grab = { k: 'fold', lp: lp, ox: mp.x - sp.x, oy: mp.y - sp.y }; return true;
        }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var p;
        if (grab.k === 'pen') {
          if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) grab.moved = true;
          if (!grab.moved) return;
          p = V.onPlane(ev, pplane); if (p) setI(grab.i0 + (penAng(p) - grab.a0));
        } else {   // 找一个折转角，让按住的那一点在屏幕上离手指最近（跟着手指走）
          var mp2 = stagePt(ev), tx = mp2.x - grab.ox, ty = mp2.y - grab.oy, best = st.fold, bd = 1e9;
          for (var f = -60; f <= 60; f++) { var w = V.toScreen(grab.lp.clone().applyAxisAngle(new T3.Vector3(0, 1, 0), f * Math.PI / 180)), d = Math.hypot(w.x - tx, w.y - ty); if (d < bd) { bd = d; best = f; } }
          setFold(best);
        }
      },
      end: function () {
        if (grab && grab.k === 'pen' && !grab.moved) { st.on = !st.on; changed(); }
        if (grab && grab.k === 'fold' && Math.abs(st.fold) < 3) setFold(0);   // 接近展平松手吸平
        grab = null;
      }
    };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function setI(v) { st.i = clamp(Math.round(v), 0, 85); changed(); }
  function setFold(v) { st.fold = clamp(Math.round(v), -60, 60); changed(); }

  function tick() {
    var O = new T3.Vector3(0, 0, 0), s = inSide(), din = dirOf(s, st.i), dout = dirOf(-s, st.i), z = 0.17;
    rightG.rotation.y = st.fold * Math.PI / 180;
    // 激光笔：笔尖朝 O，离 O 点 PEN_D
    var tipP = din.clone().multiplyScalar(PEN_D);
    pen.position.set(tipP.x, tipP.y, 0.7);
    pen.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), din.clone().negate());
    // 光迹
    var inLeft = s < 0;
    beams.inL.visible = beams.inLg.visible = st.on && inLeft;
    beams.inR.visible = beams.inRg.visible = st.on && !inLeft && flat();
    beams.outR.visible = beams.outRg.visible = st.on && inLeft && flat();
    beams.outL.visible = beams.outLg.visible = st.on && !inLeft;
    [['inL', din], ['inLg', din], ['inR', din], ['inRg', din], ['outL', dout], ['outLg', dout], ['outR', dout], ['outRg', dout]].forEach(function (b) { beams[b[0]].userData.set(O, b[1], PEN_D - 0.5, z + (b[0].slice(-1) === 'g' ? -0.005 : 0)); });
    beams.spot.visible = st.on;
    var showAir = st.on && st.air;
    beams.air.visible = showAir;
    if (showAir) { beams.air.scale.y = PEN_D; beams.air.position.copy(dout.clone().multiplyScalar(PEN_D / 2)).setZ(0.4); beams.air.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), dout); }
    var pw = new T3.Vector3(); pen.getWorldPosition(pw);
    V.tag('pen').textContent = '点激光笔打开';
    V.placeTag('pen', din.clone().multiplyScalar(PEN_D + 11)); if (st.on) V.tag('pen').style.display = 'none';   // 标签放在笔尾外侧，不压纸板刻度
    var ft = V.tag('fold'); ft.textContent = flat() ? '拖右半块可折转' : (st.fold > 0 ? '向后折 ' : '向前折 ') + Math.abs(st.fold) + '°';
    var fp = new T3.Vector3(BW + 0.4, BH * 0.45, 0.2); rightG.localToWorld(fp); V.placeTag('fold', fp); ft.style.transform = 'translate(10px, -50%)';   // 放在右半块外侧边缘，不压刻度和反射光迹
    drawWin(); ui();
  }

  /* ── 观察窗：纸板上 O 点附近的角度刻度 ── */
  function drawWin() {
    var key = [st.i, st.on, rVisible(), iVisible(), st.rev, neutral()].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:330px"><h3><span>纸板角度刻度</span><small>从 ON 量起</small></h3><svg viewBox="0 0 360 214"></svg></div>');
    var cx = 180, cy = 200, R = 168, s = '';
    s += '<line x1="6" y1="' + cy + '" x2="354" y2="' + cy + '" stroke="#9FB3CC" stroke-width="4"/>';
    s += '<path d="M' + (cx - R) + ' ' + cy + 'A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy + '" fill="none" stroke="#1E3A5F" stroke-width="2"/>';
    for (var a = -90; a <= 90; a++) {
      var t = a * Math.PI / 180, l = a % 10 === 0 ? 16 : a % 5 === 0 ? 11 : 6, sx = Math.sin(t), sy = -Math.cos(t);
      s += '<line x1="' + (cx + sx * R) + '" y1="' + (cy + sy * R) + '" x2="' + (cx + sx * (R - l)) + '" y2="' + (cy + sy * (R - l)) + '" stroke="#1E3A5F" stroke-width="' + (a % 5 ? 1 : 1.8) + '"/>';
      if (a % 30 === 0 && Math.abs(a) < 90) s += '<text x="' + (cx + sx * (R - 30)) + '" y="' + (cy + sy * (R - 30) + 6) + '" text-anchor="middle" font-size="16" font-family="Bahnschrift" fill="#1E3A5F">' + Math.abs(a) + '</text>';
    }
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - R - 6) + '" stroke="#1E3A5F" stroke-width="2" stroke-dasharray="6 5"/><text x="' + (cx + 8) + '" y="' + (cy - R + 14) + '" font-size="16" font-weight="700" fill="#1E3A5F">N</text>';
    var ray = function (side, vis, lab) {
      if (!vis) return '';
      var t = st.i * Math.PI / 180, ex = cx + side * Math.sin(t) * R, ey = cy - Math.cos(t) * R, ar = 46, mx = cx + side * Math.sin(t / 2) * (ar + 14), my = cy - Math.cos(t / 2) * (ar + 14);
      var arc = st.i > 0 ? '<path d="M' + cx + ' ' + (cy - ar) + 'A' + ar + ' ' + ar + ' 0 0 ' + (side > 0 ? 1 : 0) + ' ' + (cx + side * Math.sin(t) * ar) + ' ' + (cy - Math.cos(t) * ar) + '" fill="none" stroke="#FE752D" stroke-width="2"/>' : '';
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + ex + '" y2="' + ey + '" stroke="#E5341F" stroke-width="3.5"/>' + arc + (st.i > 3 ? '<text x="' + mx + '" y="' + (my + 6) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#C2410C">' + lab + '</text>' : '');
    };
    if (neutral()) {   // 第 3 问：入射光与 ON、与镜面的两个夹角都标出度数，不标名称
      s += ray(inSide(), iVisible(), st.i + '°') + ray(-inSide(), rVisible(), '');
      if (iVisible() && st.i < 87) {
        var sd = inSide(), t3 = st.i * Math.PI / 180, ar2 = 78, mA = (Math.PI / 2 + t3) / 2;   // 从镜面量到入射光的弧（蓝色）
        s += '<path d="M' + (cx + sd * ar2) + ' ' + cy + 'A' + ar2 + ' ' + ar2 + ' 0 0 ' + (sd > 0 ? 0 : 1) + ' ' + (cx + sd * Math.sin(t3) * ar2) + ' ' + (cy - Math.cos(t3) * ar2) + '" fill="none" stroke="#2563EB" stroke-width="2"/>';
        s += '<text x="' + (cx + sd * Math.sin(mA) * (ar2 + 18)) + '" y="' + (cy - Math.cos(mA) * (ar2 + 18) + 6) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#1D4ED8" stroke="#fff" stroke-width="5" paint-order="stroke">' + (90 - st.i) + '°</text>';
      }
    } else s += ray(inSide(), iVisible(), '∠i') + ray(-inSide(), rVisible(), '∠r');
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#1E3A5F"/><text x="' + (cx + 8) + '" y="' + (cy - 6) + '" font-size="15" fill="#1E3A5F">O</text>';
    if (!st.on) s += '<text x="' + cx + '" y="' + (cy - 58) + '" text-anchor="middle" font-size="16" fill="#56677D" stroke="#fff" stroke-width="6" paint-order="stroke">激光还没打开</text>';
    else if (!rVisible() || !iVisible()) s += '<text x="' + (cx + (rVisible() ? inSide() : -inSide()) * 88) + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="15" fill="#C1361A">纸板上没有' + (rVisible() ? '入射光' : '反射光') + '</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function changed() { if (K.revealed()) K.invalidate(); last = ''; }
  function dup() { return st.rows.some(function (r) { return r.i === st.i && r.rev === st.rev; }); }
  function canRec() { return st.on && flat() && !dup() && st.rows.length < 8 && K.revealed(); }   // 纸板展平时入射光、反射光都在纸板上
  function ui() {
    var ok = canRec(), hint, tone = '', q = K.S.q;
    var checks = [{ label: '激光打开', ok: st.on }, { label: '纸板展平', ok: flat() }];
    if (!st.on) hint = '打开激光，让光贴着纸板射向 O 点。';
    else if (!flat()) { var miss = st.rev ? '入射光' : '反射光'; hint = '右半块纸板折转了，纸板上看不到' + miss + '。' + (st.rev ? '' : (st.air ? '反射光仍在原来的平面里。' : '可打开「空气中的光路」看看。')); tone = 'warn'; }
    // 提示跟着本问的任务走（第 3、4、5、6 问不是“换角度记录”）
    else if (q === 2) hint = '入射光和法线 ON 的夹角、和镜面的夹角，哪个是入射角？';   // 第 3 问不在提示里说出答案
    else if (q === 3) hint = '把右半块纸板向后（或向前）折，看纸板上还有没有反射光。';
    else if (q === 5 && !st.rev) hint = '点「反向入射」，让光逆着原来的反射光射向 O 点。';
    else if (q === 5 && !K.revealed()) hint = '反射光会从哪一侧射出？先猜一猜。';
    else if (q === 5) { hint = '反射光沿原来的入射光方向射出：光路可逆。'; tone = 'good'; }
    else if (st.i === 0 && !K.revealed()) hint = '垂直入射：还有反射光吗？先猜一猜。';   // 先猜后读，不提前说出答案
    else if (st.i === 0) { hint = '反射光沿原路返回，和入射光重合，∠r = 0°。'; tone = 'good'; }
    else if (q === 4) hint = '把激光笔一步步拖向法线 ON，看反射光怎样变，一直拖到 0°。';
    else if (dup()) hint = '这个入射角已经记过了，拖激光笔换一个角度。';
    else if (st.rows.length >= 8) hint = '已记满 8 组，可以到「数据」比较。';
    else if (!K.revealed()) hint = '先猜 ∠r 是多少。';
    else { hint = '比较 ∠i 和 ∠r，再记录。'; tone = 'good'; }
    // 先猜再读：∠i 直接显示；∠r 要点「显示读数」后才出现
    var nt = neutral();
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: st.on && rVisible() && iVisible(), result: nt ? '入射光与 ON 的夹角 <b>' + st.i + '</b>°，与镜面的夹角 <b>' + (90 - st.i) + '</b>°'
      : '∠i = <b>' + st.i + '</b>°，∠r = <b>' + st.i + '</b>°' + (st.i === 0 ? '，反射光沿原路返回' : '') });
    var key = [ok, st.i, st.on, st.fold, st.air, st.rev, st.rows.length, K.revealed(), nt].join('|');
    if (key === last) return; last = key;
    setNames();
    K.setReading('i', iVisible() ? st.i + '' : null);
    K.setReading('r', nt ? (iVisible() ? (90 - st.i) + '' : null) : rVisible() && K.revealed() ? st.i + '' : null);
    // 记录键灰着时写明原因（如本问的入射角前面已经记过）
    var why = !st.on ? '打开激光后才能记录。' : !flat() ? '纸板展平、入射光和反射光都在纸板上时才能记录。' : dup() ? (nt ? '这个角度前面已经记过了，不重复记。' : '这一组（' + (st.rev ? '反向入射，' : '') + '∠i = ' + st.i + '°）前面已经记过了，不重复记；拖激光笔换个角度可以再记。') : st.rows.length >= 8 ? '已记满 8 组。' : '';
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次，并在纸板上描下光迹' : why, ok ? 'good' : '');
    K.setCount(st.rows.length + ' 组');
    syncCtrls();
  }
  function addFaint(r) {   // 纸板上留下的淡色光迹（随纸板一起折转）
    var s = r.rev ? 1 : -1, O = new T3.Vector3(0, 0, 0);
    [[s, r.i], [-s, r.i]].forEach(function (b) {
      var m = makeRay(0xE5341F, 0.12, 0.3); m.userData.set(O, dirOf(b[0], b[1]), R_SCALE - 0.6, 0.165);
      (b[0] > 0 ? rightG : V.scene).add(m); faint.push(m);
    });
  }

  /* ── 控件：激光（开关）→ 角度（两条滑杆）→ 光路（反向入射：动作；空气中的光路：显示开关） ── */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('激光', '<div class="acts">' + K.sw('pw', '激光笔', '打开', '关闭', st.on) + '</div>') +
      K.grp('角度', '<div class="row"><span class="nm" id="n-i">入射角</span><input class="rng" type="range" id="s-i" min="0" max="85" step="1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-i"></span><span class="un">°</span></div>' +
        '<div class="row"><span class="nm">折转</span><input class="rng" type="range" id="s-f" min="-60" max="60" step="1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-f" style="font-size:20px;min-width:92px"></span></div>') +
      K.grp('光路', '<div class="acts"><button id="rev"><i>←</i>反向入射</button>' + K.sw('air', '空气中的光路', '显示', '隐藏', st.air) + '</div>');
    var si = document.getElementById('s-i'), sf = document.getElementById('s-f');
    K.rng(si); K.rng(sf);
    si.addEventListener('input', function () { setI(+si.value); });
    sf.addEventListener('input', function () { setFold(+sf.value); });
    sf.addEventListener('change', function () { if (Math.abs(st.fold) < 3) setFold(0); });
    document.getElementById('pw').onclick = function () { st.on = !st.on; changed(); };
    document.getElementById('air').onclick = function () { st.air = !st.air; changed(); };
    document.getElementById('rev').onclick = function () { st.rev = !st.rev; changed(); };
  }
  function syncCtrls() {
    var si = document.getElementById('s-i'), sf = document.getElementById('s-f');
    if (document.activeElement !== si) si.value = st.i; if (document.activeElement !== sf) sf.value = st.fold;
    [si, sf].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-i').textContent = st.i;
    document.getElementById('v-f').textContent = flat() ? '展平' : (st.fold > 0 ? '向后 ' : '向前 ') + Math.abs(st.fold) + '°';
    K.setSw('pw', st.on);
    K.setSw('air', st.air);
    document.getElementById('rev').innerHTML = st.rev ? '<i>↺</i>恢复原方向' : '<i>←</i>反向入射';
  }

  function preset(i) {
    var P = [[40, false], [30, false], [60, true], [45, true], [70, true], [45, true]][i];   // 第 2 问激光先关：读数自动显示，开着就没法“先猜”
    st.i = P[0]; st.on = P[1]; st.fold = 0; st.air = false; st.rev = false; winKey = ''; changed();
  }

  window.__exp = { st: st, V: function () { return V; }, pen: function () { return pen; }, right: function () { return rightG; } };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'i', name: '入射角 ∠<span class="m">i</span>', unit: '°' }, { id: 'r', name: '反射角 ∠<span class="m">r</span>', unit: '°' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">沿弧线拖激光笔改变入射角，点一下激光笔开 / 关；左右拖右半块纸板折转；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; var r = { i: st.i, r: st.i, rev: st.rev }; st.rows.push(r); addFaint(r); last = ''; },
    clear: function () { st.rows = []; faint.forEach(function (m) { m.parent.remove(m); }); faint = []; last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:760px"><thead><tr><th>次数</th><th>入射角 ∠<span class="m">i</span>/(°)</th><th>反射角 ∠<span class="m">r</span>/(°)</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + (r.rev ? '（反向入射）' : '') + '</td><td class="n">' + r.i + '</td><td class="n">' + r.r + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table><p class="tip">入射角、反射角都从法线 ON 量起。比较每一组的 ∠i 和 ∠r。</p>';
    }
  });
})();
