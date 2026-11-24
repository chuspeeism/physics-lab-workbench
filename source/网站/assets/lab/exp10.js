/* 10 用弹簧测力计测量力（课本图 7.2-2）。
   装置：铁架台横杆上用夹子竖直固定一个板式弹簧测力计（量程 0～5 N，分度值 0.2 N，刻度 2 cm/N，顶部调零螺丝）；文具袋 2.6 N；
   水平模式：测力计水平，挂钩用细线连文具袋，文具袋放在长木板上。
   参数：初始指针在零刻度线上方 0.2 N（竖直时读 −0.2 N）；水平放置时弹簧自重不再拉伸弹簧，零点比竖直时低 0.1 N，需按使用方向调零。
     竖直挂袋：弹簧—袋子振子（周期约 0.46 s，阻尼比 0.18），静止后 2.6 N。
     手拉挂钩：手的拉力 F 与弹簧轴线成 θ 角时，拉杆压向外壳产生摩擦（μ=0.2）：示数 = F(cosθ − μ sinθ)，3 N 斜拉 15°～20° 时读数偏小 0.26～0.39 N。
     水平拖动：最大静摩擦 1.4 N，滑动摩擦 1.2 N；弹簧与袋子之间有阻尼；袋速 1 s 内波动小于 8% 算匀速（示数≈1.2 N）。超过 5 N 指针顶到头。
   操作：转顶部调零螺丝；拖挂钩向下拉（松手手仍拉着，点一下挂钩松开）；拖文具袋挂到挂钩上；水平模式左右拖测力计。 */
(function () {
  var SX = 4, TZ = 14, TOPY = 50, Y0 = -6, KN = 2, ROD = 19.5, MU = 0.2, W = 2.6, M = W / 9.8, KSP = 50, ZETA = 0.18, FK = 1.2, FS = 1.4, BAG_L = 14, XB0 = -2, XB1 = 28, HY = 3.6;
  var st = { mode: 'v', z: -0.2, F: 0, th: 0, hang: false, Fs: -0, Fv: 0, still: 0, xb: XB0, vb: 0, hx: 0, hist: [], uni: false, targets: false, drag: null, rows: { F1: null, F2: null }, revR: null };
  var K, V, T3, scale, knob, pointerM, spring, rod, hook, bag, stand, board, arrow, hand, winEl, winKey = '', last = '', rc;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function zEff() { return st.mode === 'v' ? st.z : st.z - 0.1; }   // 当前放置方向下不受力时的读数
  function zeroed() { return Math.abs(zEff()) < 0.01; }
  function R() { return clamp(zEff() + st.Fs, -0.8, 5.4); }        // 指针读数（N）
  function shown() { return Math.round((st.mode === 'h' && st.uni ? zEff() + st.Fm : R()) * 10) / 10; }   // 匀速拖动时读稳定的平均值
  function over() { return zEff() + st.Fs > 5.02; }
  function eff() { var t = st.th * Math.PI / 180; return Math.cos(t) - MU * Math.sin(t); }
  function handOn() { return st.mode === 'v' && !st.hang && st.F > 0.005; }
  function hxRest() { return st.xb + BAG_L / 2 + 1 + 2 + 25.5 + KN * zEff(); }   // 细线刚拉直、弹簧不伸长时手（拉环）的位置

  /* ── 贴图与形状 ── */
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function roundRect(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function std(c, r, m) { return new T3.MeshStandardMaterial({ color: c, roughness: r == null ? .5 : r, metalness: m || 0 }); }
  function woodTex(base, dark) {
    return canvasTex(1024, 128, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 26; i++) { g.strokeStyle = dark; g.globalAlpha = 0.06 + Math.random() * 0.1; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(300, y + (Math.random() - .5) * 18, 700, y + (Math.random() - .5) * 18, w, y + (Math.random() - .5) * 8); g.stroke(); }
    });
  }
  /* 刻度板：宽 4.2 cm、高 20 cm（y 从 −3 到 −23），0 N 在 y=−6，每 N 2 cm；中间一道槽 */
  function faceTex() {
    return canvasTex(420, 2000, function (g, w, h) {
      var px = 100, Y = function (y) { return (-3 - y) * px; };
      g.fillStyle = '#F3F5F8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2B3442'; g.fillRect(w / 2 - 45, Y(-4.6), 90, (17.4 - 4.6) * px);
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textBaseline = 'middle'; g.font = 'bold 74px Bahnschrift, Arial';
      for (var i = 0; i <= 25; i++) {
        var y = Y(Y0 - KN * i * 0.2), l = i % 5 === 0 ? 92 : 56;
        g.lineWidth = i % 5 === 0 ? 9 : 6;
        g.beginPath(); g.moveTo(w / 2 - 52, y); g.lineTo(w / 2 - 52 - l, y); g.stroke();
        g.beginPath(); g.moveTo(w / 2 + 52, y); g.lineTo(w / 2 + 52 + l, y); g.stroke();
        if (i % 5 === 0) { g.textAlign = 'right'; g.fillText(String(i / 5), w / 2 - 52 - 100 + 12, y); g.textAlign = 'left'; g.fillText(String(i / 5), w / 2 + 52 + 100 - 12, y); }
      }
      g.font = 'bold 66px Bahnschrift, Arial'; g.textAlign = 'center'; g.fillText('N', w / 2, Y(-19.6));
      g.font = '46px Microsoft YaHei, sans-serif'; g.fillStyle = '#56677D'; g.fillText('0～5 N', w / 2, Y(-21.4));
    });
  }

  /* ── 器材 ── */
  function makeScale() {
    var g = new T3.Group();
    var shell = std(0xDCE3EC, .4, .2), steel = std(0xC8D0DA, .3, .4), dark = std(0x3A4658, .45, .2);
    var ring = new T3.Mesh(new T3.TorusGeometry(0.9, 0.16, 10, 28), steel); ring.position.y = -0.9; g.add(ring);
    var cap = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(4.2, 1.8, 0.5), { depth: 1.2, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 2 }), shell); cap.geometry.translate(0, -2.7, -0.6); g.add(cap);
    var body = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(4.2, 20, 0.6), { depth: 0.8, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }), [new T3.MeshStandardMaterial({ map: faceTex(), roughness: .5 }), shell]);
    // 正面用 UV 贴刻度：ExtrudeGeometry 的正面 UV 是形状坐标，改成 0～1
    var uv = body.geometry.attributes.uv, pos = body.geometry.attributes.position;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 2.1) / 4.2, (pos.getY(i) + 10) / 20);
    body.geometry.translate(0, -13, -0.4); body.castShadow = true; g.add(body);
    var glass = new T3.Mesh(new T3.PlaneGeometry(1.0, 13), new T3.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .12, shininess: 120 })); glass.position.set(0, -11, 0.56); g.add(glass);
    knob = new T3.Group(); knob.position.set(0, -2.7, 0.75); g.add(knob);
    var kb = new T3.Mesh(new T3.CylinderGeometry(0.62, 0.62, 0.45, 20), std(0xB8C2CE, .3, .45)); kb.rotation.x = Math.PI / 2; knob.add(kb);
    var slot = new T3.Mesh(new T3.BoxGeometry(0.9, 0.14, 0.1), dark); slot.position.z = 0.24; knob.add(slot);
    var kh = new T3.Mesh(new T3.CylinderGeometry(2.6, 2.6, 2.0, 12), new T3.MeshBasicMaterial({ visible: false })); kh.rotation.x = Math.PI / 2; knob.add(kh); knob.userData.hit = kh;
    // 弹簧（单位长度的螺旋线，按长度缩放）、指针、拉杆、挂钩
    var pts = []; for (var t = 0; t <= 1.0001; t += 1 / 360) pts.push(new T3.Vector3(0.32 * Math.cos(t * 18 * 2 * Math.PI), -t, 0.32 * Math.sin(t * 18 * 2 * Math.PI)));
    spring = new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), 720, 0.045, 6, false), std(0xA9B4C2, .3, .6)); spring.position.z = 0.1; g.add(spring);
    pointerM = new T3.Mesh(new T3.BoxGeometry(1.5, 0.16, 0.3), new T3.MeshBasicMaterial({ color: 0xFE752D })); pointerM.position.z = 0.55; g.add(pointerM);
    rod = new T3.Mesh(new T3.CylinderGeometry(0.11, 0.11, ROD, 10), steel); g.add(rod);
    hook = new T3.Group(); g.add(hook);
    var hc = new T3.Mesh(new T3.TorusGeometry(0.55, 0.11, 8, 20, Math.PI * 1.35), steel); hc.rotation.z = Math.PI * 0.95; hc.position.y = -0.55; hook.add(hc);
    var hh = new T3.Mesh(new T3.CylinderGeometry(1.6, 1.6, 3.2, 10), new T3.MeshBasicMaterial({ visible: false })); hh.position.y = -0.6; hook.add(hh); hook.userData.hit = hh;
    var bh = new T3.Mesh(new T3.BoxGeometry(5.2, 22, 2.4), new T3.MeshBasicMaterial({ visible: false })); bh.position.y = -13; g.add(bh); g.userData.hit = bh;
    return g;
  }
  function makeBag() {   // 拉链文具袋：长 16 cm 的圆角软袋，一端有提环
    var g = new T3.Group(), cloth = std(0x3D6FB6, .85), dark = std(0x26364A, .6);
    var b = new T3.Mesh(new T3.CapsuleGeometry(2.6, BAG_L - 5.2, 8, 20), cloth); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 1.45); b.position.y = 2.6; b.castShadow = true; g.add(b);
    var zip = new T3.Mesh(new T3.BoxGeometry(BAG_L - 3, 0.18, 0.5), dark); zip.position.set(0, 5.15, 0); g.add(zip);
    var pull = new T3.Mesh(new T3.BoxGeometry(0.4, 0.15, 1.1), std(0xC8D0DA, .3, .5)); pull.position.set(3.5, 5.25, 0.5); g.add(pull);
    var loop = new T3.Mesh(new T3.TorusGeometry(0.75, 0.16, 8, 20), dark); loop.position.set(BAG_L / 2 + 0.4, 2.6, 0); g.add(loop);
    var hit = new T3.Mesh(new T3.BoxGeometry(BAG_L + 2, 6.5, 5), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = 2.6; g.add(hit); g.userData.hit = hit;
    return g;
  }
  function makeStand(S) {
    stand = new T3.Group(); S.add(stand);
    var iron = std(0x5B6676, .5, .35);
    var base = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(26, 15, 1.5), { depth: 1.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 2 }), iron); base.geometry.rotateX(-Math.PI / 2); base.geometry.translate(0, 0.2, 0); base.position.set(-12, 0, -4); base.castShadow = true; base.receiveShadow = true; stand.add(base);
    var rodS = new T3.Mesh(new T3.CylinderGeometry(0.55, 0.55, 55, 16), iron); rodS.position.set(-16, 27.5, -8); rodS.castShadow = true; stand.add(rodS);
    var boss = new T3.Mesh(new T3.BoxGeometry(2.2, 2.2, 2.2), iron); boss.position.set(-16, TOPY + 2, -8); stand.add(boss);
    var len = Math.hypot(16 + SX, 8), arm = new T3.Mesh(new T3.CylinderGeometry(0.35, 0.35, len, 10), iron); arm.position.set((SX - 16) / 2, TOPY + 2, -4); arm.rotation.z = Math.PI / 2; arm.rotation.y = -Math.atan2(8, 16 + SX); arm.castShadow = true; stand.add(arm);
    var jaw = new T3.Mesh(new T3.BoxGeometry(2.4, 2.8, 2.0), iron); jaw.position.set(SX, TOPY + 1.2, 0); stand.add(jaw);
    var hookS = new T3.Mesh(new T3.TorusGeometry(0.5, 0.12, 8, 16, Math.PI * 1.3), iron); hookS.position.set(SX, TOPY - 0.2, 0); hookS.rotation.z = Math.PI * 1.2; stand.add(hookS);
  }
  function build() {
    V = K.three({ target: [2, 27, 0], az: 0.18, el: 0.16, dist: 114, minDist: 60, maxDist: 170, minAz: -0.9, maxAz: 0.9, minEl: 0.04, maxEl: 1.0, fov: 30, sun: [-40, 120, 80] });
    T3 = V.T; var S = V.scene; rc = new T3.Raycaster();
    makeStand(S);
    board = new T3.Mesh(new T3.BoxGeometry(96, 1, 16), [0, 1, 2, 3, 4, 5].map(function (k) { return k === 2 ? new T3.MeshStandardMaterial({ map: woodTex('#E7D3AE', '#8A6A3E'), roughness: .8 }) : std(0xCDB088, .85); }));
    board.position.set(34, 0.5, TZ); board.receiveShadow = true; board.castShadow = true; S.add(board);
    scale = makeScale(); S.add(scale);
    bag = makeBag(); S.add(bag);
    arrow = new T3.Group(); S.add(arrow);
    var am = new T3.MeshBasicMaterial({ color: 0xFE752D }), ash = new T3.Mesh(new T3.CylinderGeometry(0.16, 0.16, 5, 10), am); ash.position.y = -2.5; arrow.add(ash);
    var ahd = new T3.Mesh(new T3.ConeGeometry(0.55, 1.4, 14), am); ahd.position.y = -5.5; ahd.rotation.x = Math.PI; arrow.add(ahd);
    var line = new T3.Mesh(new T3.CylinderGeometry(0.035, 0.035, 1, 6), std(0xE9E4DA, .9)); S.add(line); bag.userData.line = line;
    V.tag('hand', '手拉');
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, st.mode === 'v' ? [knob.userData.hit, hook.userData.hit, bag.userData.hit] : [knob.userData.hit, scale.userData.hit]); },
      start: function (ev) {
        var mp = stagePt(ev), h;
        if ((h = V.pick(ev, [knob.userData.hit]))) { grab = { k: 'knob', m0: mp, z0: st.z, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        if (st.mode === 'v' && !st.hang && (h = V.pick(ev, [hook.userData.hit]))) { var sp = V.toScreen(h.point); grab = { k: 'hook', hp: h.point.clone(), r0: R(), ox: mp.x - sp.x, oy: mp.y - sp.y, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        if ((h = V.pick(ev, [bag.userData.hit])) && st.mode === 'v') { grab = { k: 'bag', o: h.point.clone().sub(bag.position), p0: h.point.clone(), x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        if (st.mode === 'h' && (h = V.pick(ev, [scale.userData.hit]))) { var s2 = V.toScreen(h.point); grab = { k: 'slide', hp: h.point.clone(), h0: st.hx, ox: mp.x - s2.x, oy: mp.y - s2.y, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var mp = stagePt(ev);
        if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) < 4) return;
        grab.moved = true;
        if (grab.k === 'knob') {   // 调零螺丝：向右或向下拖拧紧（指针下移），向左或向上拖拧松；每像素 0.004 N
          setZ(grab.z0 + ((mp.x - grab.m0.x) + (mp.y - grab.m0.y)) * 0.004, false);
        } else if (grab.k === 'hook') {   // 挂钩只沿弹簧轴线移动：取按住的点在屏幕上离手指最近的位置
          var tx = mp.x - grab.ox, ty = mp.y - grab.oy, best = 0, bd = 1e9;
          for (var r = -0.8; r <= 5.4001; r += 0.01) { var w = V.toScreen(grab.hp.clone().add(new T3.Vector3(0, -KN * (r - grab.r0), 0))), d = Math.hypot(w.x - tx, w.y - ty); if (d < bd) { bd = d; best = r; } }
          setPullR(best);
        } else if (grab.k === 'bag') {
          if (!st.drag) { st.drag = 'bag'; st.hang = false; changed(); }
          var p = carry(ev, grab); if (p) bag.position.copy(p);
        } else if (grab.k === 'slide') {   // 水平拖测力计：手（拉环）沿木板方向移动
          var tx2 = mp.x - grab.ox, ty2 = mp.y - grab.oy, b2 = st.hx, bd2 = 1e9;
          for (var u = -30; u <= 70; u += 0.05) { var w2 = V.toScreen(grab.hp.clone().add(new T3.Vector3(u - grab.h0, 0, 0))), d2 = Math.hypot(w2.x - tx2, w2.y - ty2); if (d2 < bd2) { bd2 = d2; b2 = u; } }
          setHand(b2);
        }
      },
      end: function () {
        if (!grab) return;
        if (grab.k === 'knob' && grab.moved) setZ(st.z, true);
        if (grab.k === 'hook' && !grab.moved) { st.F = 0; changed(); }   // 点一下挂钩：手松开
        if (grab.k === 'bag') {
          if (!grab.moved) { st.hang = !st.hang; if (st.hang) st.F = 0; changed(); }
          else {   // 袋子提环靠近挂钩（正面看，不计前后）就挂上
            st.drag = null; var hp = hookW(), lp = new T3.Vector3(BAG_L / 2 + 0.4, 2.6, 0).applyEuler(bag.rotation).add(bag.position);
            st.hang = Math.hypot(lp.x - hp.x, lp.y - hp.y) < 8 || Math.hypot(bag.position.x - hp.x, bag.position.y + 2.6 - (hp.y - 8)) < 8; if (st.hang) st.F = 0; changed();
          }
        }
        grab = null;
      }
    };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function hookW() { return hook.getWorldPosition(new T3.Vector3()).add(new T3.Vector3(0, -1.2, 0)); }
  /* 拿着文具袋：先找桌面 / 木板，碰到侧面时在按下点所在的竖直面里悬空移动 */
  function carry(ev, gr) {
    var p = stagePt(ev), Wd = K.stage.clientWidth, Hd = K.stage.clientHeight;
    rc.setFromCamera(new T3.Vector2(p.x / Wd * 2 - 1, -(p.y / Hd) * 2 + 1), V.camera);
    var n = V.camera.getWorldDirection(new T3.Vector3()).setY(0).normalize(), pl = new T3.Plane().setFromNormalAndCoplanarPoint(n, gr.p0), q = new T3.Vector3();
    if (!rc.ray.intersectPlane(pl, q)) return null;
    var b = q.sub(gr.o); b.x = clamp(b.x, -40, 50); b.y = clamp(b.y, groundAt(b.x, b.z), 50); return b;
  }
  function groundAt(x, z) { var g = 0; if (x > -25.5 && x < 1.5 && z > -11.5 && z < 3.5) g = Math.max(g, 1.6); return g; }
  function setZ(z, snap) {
    z = clamp(z, -0.6, 0.6);
    if (snap) { var tgt = st.mode === 'v' ? 0 : 0.1; if (Math.abs(z - tgt) < 0.05) z = tgt; }
    z = Math.round(z * 1000) / 1000;
    if (z === st.z) return;
    st.z = z; changed();
  }
  function setPullR(r) {   // 由指针（挂钩）位置反算手的拉力
    if (st.hang || st.mode !== 'v') return;
    var Fs = clamp(r - zEff(), 0, 5.4 - zEff());
    st.F = Fs < 0.005 ? 0 : Fs / eff(); st.Fs = Fs; changed();
  }
  function hxClamp(x) { return clamp(x, hxRest() - 4, XB1 + BAG_L / 2 + 3 + 25.5 + KN * (zEff() + 5.4)); }   // 细线最多松 4 cm；袋子到头后再拉就顶住
  function setHand(x) {   // 只定手要去的位置；手的实际位置在每帧里以有限速度跟过去（猛拉时也来得及看到加速过程）
    st.auto = 0;   // 手动拖就停掉「匀速拉动」
    st.hxT = hxClamp(x);
    last = '';
  }

  /* ── 每帧 ── */
  function tick(dt) {
    if (!dt) { pose(); return; }   // 拖动时的即时重画：只摆位置，物理按定时器的真实时间推进
    var n = 8, h = dt / n, i;
    if (st.mode === 'v') {
      var target = st.hang ? W : st.F * eff();
      if (st.hang && !st.drag) {
        for (i = 0; i < n; i++) { var a = (KSP / M) * (W - st.Fs) - 2 * ZETA * Math.sqrt(KSP / M) * st.Fv; st.Fv += a * h; st.Fs += st.Fv * h; }
        if (st.Fs > 5.4) { st.Fs = 5.4; st.Fv = 0; }
      } else { st.Fs += (Math.min(target, 5.4 - zEff()) - st.Fs) * (1 - Math.exp(-dt / 0.06)); st.Fv = 0; }
      var moving = Math.abs(st.Fv) > 0.05 || Math.abs(st.Fs - (st.hang ? W : target)) > 0.01;
      st.still = moving ? 0 : st.still + dt;
    } else {
      // 手的位置由拖动给出；袋子：静摩擦 ≤1.4 N，滑动摩擦 1.2 N；弹簧拉袋子（另加一点内阻尼消掉振荡，不改变平均拉力）；超过 5.4 N 指针顶住，袋子被硬拉
      var sumF = 0, HV = 28;   // 手最快 28 cm/s
      if (st.hxT == null) st.hxT = st.hx;
      // 「匀速拉动」：手以恒定速度 AUTO_V 往前走，文具袋拉到木板尽头或手到头就自动停
      if (st.auto) { st.hxT = hxClamp(st.hx + st.auto * dt); if (st.xb >= XB1 - 0.05 || st.hx >= hxMax() - 0.05) { st.auto = 0; st.hxT = st.hx; } }
      for (i = 0; i < n; i++) {
        st.hx = hxClamp(st.hx + clamp(st.hxT - st.hx, -HV * h, HV * h));
        var ext = st.hx - hxRest(), Fs = clamp(ext / KN, 0, 5.4);
        sumF += Fs / n;
        if (ext / KN > 5.4) { var nx = st.hx - (hxRest() - st.xb) - KN * 5.4; st.vb = Math.max(0, (nx - st.xb) / h); st.xb = nx; }
        else if (st.vb <= 0) { st.vb = 0; if (Fs > FS) st.vb = 0.01; }
        else { st.vb += ((Fs - FK) / M * 100 - 11 * (st.vb - (st.vs || 0))) * h; if (st.vb <= 0) st.vb = 0; st.xb += st.vb * h; }
        if (st.xb >= XB1) { st.xb = XB1; st.vb = 0; }
        st.Fs = Fs;
      }
      // 匀速：袋速（0.25 s 平滑）在最近 1 s 内的波动小于 8%；读数取这 1 s 内弹簧拉力的平均
      st.vs = st.vb > 0 ? (st.vs || 0) + (st.vb - (st.vs || 0)) * (1 - Math.exp(-dt / 0.25)) : 0;
      st.hist.push([st.vs, sumF]); while (st.hist.length > Math.round(1 / Math.max(dt, 0.01))) st.hist.shift();
      var nH = st.hist.length, mean = st.hist.reduce(function (s, v) { return s + v[0]; }, 0) / nH, dev = st.hist.reduce(function (s, v) { return Math.max(s, Math.abs(v[0] - mean)); }, 0);
      st.uni = nH >= 20 && st.vb > 0 && mean > 0.8 && dev / mean < 0.08 && st.xb < XB1;
      st.Fm = st.hist.reduce(function (s, v) { return s + v[1]; }, 0) / nH;
      st.still = st.vb > 0 ? 0 : st.still + dt;
      // 猛拉：袋子在加速时弹簧拉力明显大于滑动摩擦力（超过 2.0 N；慢拖、「匀速拉动」起步都到不了），示数偏大；
      // 记下这一下的峰值，在顶栏和结果框保持 1.5 s，来得及看清
      if (st.vb > 0 && sumF > FK + 0.8) { if (!(st.jerk > 0)) st.peak = 0; st.peak = Math.max(st.peak, zEff() + sumF); st.jerk = 1.5; }
      else st.jerk = Math.max(0, (st.jerk || 0) - dt);
    }
    var jk = jerkOn(); if (st.jh && !jk && K.revealed()) K.invalidate(); st.jh = jk;   // 峰值显示结束：重新取读数
    if (K.revealed() && st.revR != null && !jk && Math.abs((st.mode === 'h' && st.uni ? zEff() + st.Fm : R()) - st.revR) > 0.12) K.invalidate();
    pose(); drawWin(); ui();
  }
  function pose() {
    var r = R(), yp = Y0 - KN * r, anchor = -4.4 - KN * (zEff() - 0);
    pointerM.position.y = yp; spring.position.y = anchor; spring.scale.y = Math.max(0.5, anchor - yp);
    rod.position.y = yp - ROD / 2; hook.position.y = yp - ROD;
    knob.rotation.z = -st.z / 0.2 * 2 * Math.PI;
    var t = st.th * Math.PI / 180;
    board.visible = st.mode === 'h'; stand.visible = st.mode === 'v';   // 水平拖动时测力计已从铁架台上取下，铁架台移开
    if (st.mode === 'v') {
      scale.position.set(SX, TOPY, 0); scale.rotation.set(0, 0, 0);
      var hp = hookW();
      if (st.hang && st.drag !== 'bag') { bag.rotation.set(0, 0, Math.PI / 2); bag.position.set(hp.x + 2.6, hp.y - BAG_L / 2 - 0.7, 0); }
      else if (st.drag !== 'bag') { bag.rotation.set(0, 0.25, 0); bag.position.set(15, 0, -1); }
      else bag.rotation.set(0, 0.25, 0);
      bag.userData.line.visible = false;
      arrow.visible = handOn();
      if (arrow.visible) { arrow.position.copy(hp).add(new T3.Vector3(0, -0.4, 0)); arrow.rotation.set(0, 0, t); V.placeTag('hand', hp.clone().add(new T3.Vector3(Math.sin(t) * 7 + 3.2, -Math.cos(t) * 7 + 1.2, 0))); }
      V.tag('hand', st.th >= 0.5 ? '手的拉力 ' + f1(st.F) + ' N' : '手拉');   // 斜拉时标出手的拉力：拉力不变，示数却变小
      V.tag('hand').style.display = arrow.visible ? '' : 'none';
    } else {
      scale.rotation.set(0, 0, -Math.PI / 2); scale.position.set(st.hx, HY, TZ);
      bag.rotation.set(0, 0, 0); bag.position.set(st.xb, 1, TZ);
      var hk = hookW(), loopX = st.xb + BAG_L / 2 + 1.1, ln = bag.userData.line, hkx = hook.getWorldPosition(new T3.Vector3()).x - 0.6, L = Math.max(0.1, hkx - loopX);
      ln.visible = true; ln.scale.y = L; ln.position.set(loopX + L / 2, HY, TZ); ln.rotation.set(0, 0, Math.PI / 2);
      arrow.visible = true; arrow.position.set(st.hx + 1.6, HY, TZ); arrow.rotation.set(0, 0, Math.PI / 2);
      V.tag('hand', '手拉'); V.placeTag('hand', new T3.Vector3(st.hx + 5, HY + 2.2, TZ)); V.tag('hand').style.display = '';
    }
  }

  /* ── 观察窗：指针附近的刻度板（水平模式转 90°） ── */
  function drawWin() {
    var key = [Math.round(R() * 200), st.mode, st.targets].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win"><h3><span>刻度板放大</span><small>视线正对刻度</small></h3><svg></svg></div>');
    var hz = st.mode === 'h', k = 54, v0 = 34;
    // u：横跨刻度板（中心为 0），v：沿弹簧轴线（0 N 在 v0，向挂钩一侧增大）；水平模式整块转 90°，文字保持正立
    var P = function (u, v) { return hz ? [330 - v, 115 + u] : [115 + u, v]; }, Vv = function (f) { return v0 + f * k; };
    var ln = function (u1, v1, u2, v2, c, w, ex) { var a = P(u1, v1), b = P(u2, v2); return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + c + '" stroke-width="' + w + '"' + (ex || '') + '/>'; };
    var rc2 = function (u1, v1, u2, v2, fill, ex) { var a = P(u1, v1), b = P(u2, v2); return '<rect x="' + Math.min(a[0], b[0]) + '" y="' + Math.min(a[1], b[1]) + '" width="' + Math.abs(b[0] - a[0]) + '" height="' + Math.abs(b[1] - a[1]) + '" rx="4" fill="' + fill + '"' + (ex || '') + '/>'; };
    var tx = function (u, v, t, ex) { var a = P(u, v); return '<text x="' + a[0] + '" y="' + (a[1] + 7) + '" text-anchor="middle" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F"' + (ex || '') + '>' + t + '</text>'; };
    var s = rc2(hz ? -62 : -82, 4, hz ? 62 : 82, 326, '#F3F5F8', ' stroke="#C3CEDC"') + rc2(-10, Vv(-0.5), 10, Vv(5.4), '#2B3442');
    for (var i = 0; i <= 25; i++) {
      var v = Vv(i * 0.2), l = i % 5 === 0 ? 28 : 16, w = i % 5 ? 1.5 : 2.6;
      s += ln(-14, v, -14 - l, v, '#1E3A5F', w) + ln(14, v, 14 + l, v, '#1E3A5F', w);
      if (i % 5 === 0) s += tx(-60, v, i / 5) + (hz ? '' : tx(60, v, i / 5));
    }
    s += tx(60, Vv(5.45) + 14, 'N');
    if (st.targets) [1, 3, 5].forEach(function (f) { s += ln(-78, Vv(f), 78, Vv(f), '#2563EB', 2, ' stroke-dasharray="6 5"'); });
    s += rc2(-20, Vv(R()) - 3, 20, Vv(R()) + 3, '#FE752D');
    var svg = winEl.querySelector('svg');
    svg.setAttribute('viewBox', hz ? '0 34 330 150' : '0 0 230 330'); winEl.style.width = hz ? '340px' : '250px';
    svg.innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function changed() { st.ver = (st.ver || 0) + 1; if (K.revealed()) K.invalidate(); last = ''; }
  function done1() { return st.rows.F1 != null && st.rv1 === st.ver; }   // 这一次测量已经记过（器材动过以后算新的一次，可以再记）
  function done2() { return st.rows.F2 != null && st.rv2 === st.ver; }
  function jerkOn() { return st.mode === 'h' && st.jerk > 0 && st.peak > 0 && st.xb < XB1 && zeroed() && !over(); }
  function condF1() { return st.mode === 'v' && st.hang && !st.drag && zeroed() && st.still > 1.0; }
  function condF2() { return st.mode === 'h' && zeroed() && st.uni; }
  function canRec() { return K.revealed() && ((condF1() && !done1()) || (condF2() && !done2())); }
  function ui() {
    var hint, tone = '', checks, rv = K.revealed(), ready;
    if (st.mode === 'v') {
      var q1 = K.S.q === 0 && !st.hang && !handOn();   // 第 1 问：只认量程、分度值，调零留到第 2 问
      checks = q1 ? [] : [{ label: '已调零', ok: zeroed() }];
      if (handOn()) checks.push({ label: '沿轴线', ok: st.th < 0.5 });
      if (st.hang) checks.push({ label: '静止', ok: st.still > 1.0 ? true : null });
      if (st.drag) hint = '把文具袋挂到挂钩上。';
      else if (over()) { hint = '超过 5 N 了！超过量程会损坏测力计，松一点。'; tone = 'warn'; }
      else if (!zeroed() && (st.hang || handOn())) { hint = '先取下物体、松开挂钩，再调零。'; tone = 'warn'; }
      else if (q1) hint = '看刻度板：最大能测多少牛？相邻两条刻度线之间是多少牛？';
      else if (!zeroed()) hint = '指针没对准零刻度线，转顶端调零螺丝。';
      else if (st.hang && st.still <= 1.0) hint = '文具袋还在上下晃动，等它静止。';
      else if (st.hang && done1()) { hint = 'F₁ 已记录。换到「水平拖动」测 F₂。'; tone = 'good'; }
      else if (st.hang && !rv) hint = '文具袋静止了。读出示数。';
      else if (st.hang) { hint = '可以记录 F₁。'; tone = 'good'; }
      else if (handOn() && st.th >= 0.5) { hint = '拉力偏离弹簧轴线，读数偏小；沿轴线拉。'; tone = 'warn'; }
      else if (handOn() && !rv) hint = '读出示数。';
      else if (handOn()) hint = '拉到别的刻度再读一读；拉完点一下挂钩松手。';
      else hint = '向下拖挂钩拉一拉，或把文具袋挂到挂钩上。';
      ready = !st.drag && (st.hang ? st.still > 1.0 : true);
    } else {
      checks = [{ label: '已调零', ok: zeroed() }, { label: '匀速', ok: st.uni ? true : null }];
      var ext = st.hx - hxRest();
      if (!zeroed()) { hint = '水平放置时指针不在零刻度线，先调零。'; tone = st.vb > 0 || ext > 0 ? 'warn' : ''; }
      else if (over()) { hint = '猛地一拉，示数超过 5 N 了！拖得慢一点。'; tone = 'warn'; }
      else if (jerkOn()) { hint = st.vb > 0 ? '猛地一拉，文具袋在加速，示数偏大，不能读。要匀速拖动，示数稳定时再读。' : '刚才是猛拉，那一下的示数不能读。点「放回起点」，再点「匀速拉动」，示数稳定时再读。'; tone = 'warn'; }
      else if (st.xb >= XB1) hint = '文具袋拖到头了，点「放回起点」。';
      else if (st.vb <= 0 && ext <= 0) hint = '点「匀速拉动」，或向右拖测力计拉动文具袋。';
      else if (st.vb <= 0) hint = done2() ? 'F₂ 已记录。点「放回起点」可以再拖一次。' : st.auto ? '正在匀速拉动，拉力还不够大，文具袋还没动。' : '拉力还不够大，文具袋没动。继续向右拖。';
      else if (!st.uni) hint = st.auto ? '正在匀速拉动，文具袋刚起步，等示数稳定下来。' : '拖动时快时慢，示数也在变。保持匀速拖动，或点「匀速拉动」。';
      else if (done2()) { hint = 'F₂ 已记录。'; tone = 'good'; }
      else if (!rv) hint = '匀速了。读出示数。';
      else { hint = '可以记录 F₂。'; tone = 'good'; }
      ready = st.uni || st.vb <= 0 || jerkOn();
    }
    var note = '', loadOn = st.mode === 'h' || st.hang || handOn();
    if (!zeroed() && loadOn) note = '没调零，这个读数不准。';
    else if (st.mode === 'v' && handOn() && st.th >= 0.5) note = '斜着拉，示数比手的拉力小。';
    else if (st.mode === 'v' && st.hang && st.still <= 1.0) note = '文具袋还在晃，这个读数不能用。';
    else if (jerkOn()) note = '';
    else if (st.mode === 'h' && st.vb > 0 && !st.uni) note = '没有匀速拖动，示数不稳定。';
    var result = '<span class="m">F</span> = <b>' + f1(st.revR != null && rv ? st.revR : shown()) + '</b> N' + (note ? '<br>' + note : '');
    if (jerkOn()) result = st.vb > 0 ? '猛拉瞬间示数约 <b>' + f1(st.peak) + '</b> N，偏大，不能读。' : '刚才猛拉瞬间示数约 <b>' + f1(st.peak) + '</b> N，不能读；文具袋已停下。';   // 峰值保持 1.5 s；袋子停下后不再说“偏大”
    else if (st.mode === 'v' && !loadOn && !zeroed()) result = '指针在零刻度线' + (zEff() < 0 ? '上方 ' : '下方 ') + f1(Math.abs(zEff())) + ' N，没调零。';   // 不写成“F = −0.2 N”
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: ready, bad: !!note || jerkOn() || !zeroed(), result: result });
    var ok = canRec();
    var key = [ok, hint, rv, jerkOn() ? f1(st.peak) : '', st.auto, st.mode, st.hang, Math.round(st.z * 100), Math.round(st.F * 50), st.th, st.targets, st.rows.F1, st.rows.F2, st.ver, Math.round(st.hx * 2), Math.round(st.hxT * 2), st.xb >= XB1].join('|');
    if (key === last) return; last = key;
    K.setReading('F', jerkOn() ? f1(st.peak) : rv && st.revR != null ? (zeroed() ? f1(st.revR) : '未调零') : null);   // 没调零时顶栏写中文说明，不显示带误差的数字（结果框里写明偏多少）
    K.setRecord(ok, ok ? '记入「' + (st.mode === 'v' ? '静止悬挂时 F₁' : '水平匀速拖动时 F₂') + '」一行' : '', ok ? 'good' : '');
    K.setCount((st.rows.F1 ? 1 : 0) + (st.rows.F2 ? 1 : 0) + ' / 2');
    syncCtrls();
  }

  /* ── 控件 ──（2026-11-21 按「器材调节面板规范」重排）
     方式（几选一）→ 调零、挂钩、拉力方向 / 拉动测力计（滑杆）→ 挂上文具袋 / 放回起点（动作）；
     “目标刻度 1/3/5 N”是显示开关，第 3 问自动打开，平时收进标题栏的「更多」。data-mv 标出只在竖直 / 水平方式下出现的行。 */
  var VL = 'style="font-size:19px;text-align:left;flex:none;width:136px;min-width:0;white-space:nowrap"';
  function sld(id, vid, attrs) { return '<div class="row"><span class="vl" id="' + vid + '" ' + VL + '></span><input class="rng" type="range" id="' + id + '" ' + attrs + ' style="flex:1;width:auto"></div>'; }
  function only(m, html) { return html.replace('<div class="grp"', '<div class="grp" data-mv="' + m + '"'); }
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('方式', K.seg('m', [['v', '竖直悬挂'], ['h', '水平拖动']])) +
      K.grp('调零', sld('s-z', 'v-z', 'min="-0.6" max="0.6" step="0.005"')) +
      only('v', K.grp('挂钩', sld('s-p', 'v-p', 'min="0" max="11" step="0.02"'))) +
      only('v', K.grp('方向', sld('s-t', 'v-t', 'min="0" max="20" step="1"'))) +
      only('h', K.grp('拉动', sld('s-h', 'v-h', 'min="0" max="1" step="0.001"'))) +
      only('v', K.grp('文具袋', K.acts([['bagb', '↓', '挂上文具袋']]))) +
      only('h', K.grp('文具袋', K.acts([['auto', '▶', '匀速拉动', 'main'], ['back', '↺', '放回起点']]))) +
      '<div id="more" style="border-top:1px dashed #D5DEE9"' + (st.more ? '' : ' hidden') + '>' + K.grp('辅助线', K.sw('tg', '目标刻度 1/3/5 N', '显示', '隐藏', st.targets)) + '</div>';
    var sz = document.getElementById('s-z'), sp = document.getElementById('s-p'), stt = document.getElementById('s-t'), sh = document.getElementById('s-h');
    [sz, sp, stt, sh].forEach(K.rng);
    sz.addEventListener('input', function () { setZ(+sz.value, false); });
    sz.addEventListener('change', function () { setZ(+sz.value, true); });
    sp.addEventListener('input', function () { setPullR(zEff() + (+sp.value) / KN); });
    stt.addEventListener('input', function () { st.th = +stt.value; changed(); });
    sh.addEventListener('input', function () { setHand(hxMin() + (+sh.value) * (hxMax() - hxMin())); });
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-m')); }; });
    document.getElementById('bagb').onclick = function () { st.hang = !st.hang; if (st.hang) st.F = 0; changed(); };
    document.getElementById('tg').onclick = function () { st.targets = !st.targets; last = ''; };
    document.getElementById('back').onclick = function () { st.auto = 0; resetH(); changed(); };
    document.getElementById('auto').onclick = function () {   // 匀速拉动 / 停止
      if (st.auto) { st.auto = 0; st.hxT = st.hx; }
      else { if (st.xb >= XB1 - 0.05) resetH(); st.auto = AUTO_V; }
      last = '';
    };
  }
  var tagKey = '';
  function moreBtn() {   // 标题栏右侧「更多」（只有竖直悬挂时有内容）
    tagKey = st.mode + '|' + !!st.more;
    if (st.mode !== 'v') { K.ctrlTag(''); document.getElementById('more').hidden = true; return; }
    K.ctrlTag('<button class="mini" id="more-tg">' + (st.more ? '收起 ▴' : '更多 ▾') + '</button>');
    document.getElementById('more').hidden = !st.more;
    document.getElementById('more-tg').onclick = function () { st.more = !st.more; moreBtn(); };
  }
  function hxMin() { return XB0 + BAG_L / 2 + 3 + 25.5 - 4; }
  function hxMax() { return XB1 + BAG_L / 2 + 3 + 25.5 + KN * 5.4 + 2; }
  function syncCtrls() {
    var sz = document.getElementById('s-z'), sp = document.getElementById('s-p'), stt = document.getElementById('s-t'), sh = document.getElementById('s-h');
    document.querySelectorAll('[data-mv]').forEach(function (g) { g.style.display = g.getAttribute('data-mv') === st.mode ? '' : 'none'; });
    if (tagKey !== st.mode + '|' + !!st.more) moreBtn();
    if (document.activeElement !== sz) sz.value = st.z; if (document.activeElement !== sp) sp.value = handOn() ? KN * st.Fs : 0; if (document.activeElement !== stt) stt.value = st.th;
    if (document.activeElement !== sh) sh.value = (st.hx - hxMin()) / (hxMax() - hxMin());
    sp.disabled = st.hang;
    [sz, sp, stt, sh].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-z').textContent = zeroed() ? '对准零刻度线' : zEff() < 0 ? '在零刻度线上方' : '在零刻度线下方';
    document.getElementById('v-p').textContent = st.hang ? '挂着文具袋' : handOn() ? '手拉着' : '没拉';
    document.getElementById('bagb').innerHTML = st.hang ? '<i>↑</i>取下文具袋' : '<i>↓</i>挂上文具袋';
    document.getElementById('v-t').textContent = st.th < 0.5 ? '沿轴线' : '偏 ' + st.th + '°';
    K.setSw('tg', st.targets);
    document.getElementById('v-h').textContent = st.vb > 0 ? '拖动中' : '文具袋静止';
    var ab = document.getElementById('auto'); if (ab) { ab.innerHTML = st.auto ? '<i>■</i>停止' : '<i>▶</i>匀速拉动'; ab.classList.toggle('on', !!st.auto); }
    document.querySelectorAll('[data-m]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === st.mode); });
  }
  var AUTO_V = 4;   // 匀速拉动时手的速度 cm/s（约 7 s 拉完木板）
  function resetH() { st.auto = 0; st.xb = XB0; st.vb = 0; st.hist = []; st.uni = false; st.hx = hxRest() - 1.5; st.hxT = st.hx; st.Fs = 0; st.still = 0; st.jerk = 0; st.peak = 0; }
  function setMode(m) {
    if (m === st.mode) return;
    st.mode = m; st.hang = false; st.F = 0; st.th = 0; st.Fs = 0; st.Fv = 0; st.drag = null;
    if (m === 'h') resetH();
    view(); changed();
  }
  function view() {
    if (st.mode === 'v') { V.target.set(2, 27, 0); V.orb.dist = 114; V.orb.el = 0.16; V.orb.az = 0.18; }
    else { V.target.set(31, 4, TZ); V.orb.dist = 98; V.orb.el = 0.46; V.orb.az = 0.04; }
    V.view();
  }

  /* 第 i 问的起始器材 */
  function preset(i) {
    st.mode = i === 5 ? 'h' : 'v'; st.hang = false; st.F = 0; st.th = 0; st.Fs = 0; st.Fv = 0; st.still = 0; st.targets = i === 2; st.drag = null; st.revR = null;
    st.z = i <= 1 ? -0.2 : i === 5 ? 0.1 : 0;
    if (st.mode === 'h') resetH();
    if (V) view();
    changed();
  }

  window.__exp = { st: st, V: function () { return V; }, scale: function () { return scale; }, hook: function () { return hook; }, knob: function () { return knob; }, bag: function () { return bag; }, R: R, zeroed: zeroed, hookW: function () { return hookW(); }, hxRest: hxRest };
  LabKit.run({
    readings: [{ id: 'F', name: '测力计示数 <span class="m">F</span>', unit: 'N' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖调零螺丝调零；向下拖挂钩（点一下松手）；把文具袋拖到挂钩上（点一下也能挂上 / 取下）；水平时左右拖测力计；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onReveal: function (on) { st.revR = on ? shown() : null; last = ''; },
    record: function () {
      if (!canRec()) return;
      if (condF1() && !done1()) { st.rows.F1 = st.revR; st.rv1 = st.ver; } else if (condF2() && !done2()) { st.rows.F2 = st.revR; st.rv2 = st.ver; }
      last = '';
    },
    clear: function () { st.rows = { F1: null, F2: null }; last = ''; },
    renderData: function () {
      var r = st.rows, td = function (v) { return v == null ? '<td class="n dim">—</td>' : '<td class="n">' + f1(v) + '</td>'; };
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:820px"><thead><tr><th>测量内容</th><th>拉力 <span class="m">F</span>/N</th></tr></thead><tbody>' +
        '<tr><td>静止悬挂时 <span class="m">F</span>₁</td>' + td(r.F1) + '</tr><tr><td>水平匀速拖动时 <span class="m">F</span>₂</td>' + td(r.F2) + '</tr></tbody></table>' +
        '<p class="tip">同一个文具袋，挂着静止和水平匀速拖动时，拉力一样大吗？</p>';
    }
  });
})();
