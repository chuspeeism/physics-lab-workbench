/* 08 用托盘天平测量物体的质量（课本图 6.1-4）。
   装置：托盘天平（底座、立柱、横梁、标尺 0～5 g 分度值 0.2 g、游码、两端平衡螺母、指针、分度盘、左右托盘）；打开的砝码盒
   （100 g、50 g、20 g、20 g、10 g、5 g 各一个，镊子）；待测物：橡皮 21.6 g、铅笔 6.8 g、小木块 37.2 g、烧杯 52.4 g（加水后 101.6 g）。
   模型：横梁不平衡量 D = 右盘砝码 + 游码示数 + 螺母等效量 − 左盘（g）；分度盘在横梁上方，指针固定在横梁中间向上、随横梁一起转，所以偏向较重的一侧（左偏右调），
   每 0.2 g 约偏 1 小格，满偏约 10 格，有阻尼摆动；平衡看指针停的位置（摆动时看左右幅度是否相等，即平衡位置）。
   初始：游码 1.2 g，螺母等效 −2.0 g（指针偏左）。空盘、游码在 0、横梁平衡 → 已调好；称量中拧螺母 → 本次称量无效，需空盘重调。
   操作：拖物体、砝码放到托盘（松手时落在哪个盘就放进哪个盘），点一下放入 / 取回；沿横梁拖游码、拖平衡螺母。 */
(function () {
  var DA = 0.8, PIV = 13.2, PX = 12.5, PAN_Y = 19.6, PAN_R = 6.2, RX0 = -6, RX1 = 6, NUT_K = 3, BOX = { x: 27, z: 7 };
  var OBJ = {
    eraser: { name: '橡皮', m: 21.6, r: 2.4, h: 1.25, home: [-30, 10] },
    pencil: { name: '铅笔', m: 6.8, r: 1.2, h: 0.84, home: [-23.5, 6] },
    wood: { name: '小木块', m: 37.2, r: 2.5, h: 2.6, home: [-33, 1] },
    beaker: { name: '烧杯', m: 52.4, r: 2.9, h: 6.0, home: [-29, -8] }
  };
  var WATER = 49.2;
  var WTS = [{ id: 'w100', m: 100, r: 1.3, h: 3.6 }, { id: 'w50', m: 50, r: 1.05, h: 2.9 }, { id: 'w20a', m: 20, r: 0.8, h: 2.2 }, { id: 'w20b', m: 20, r: 0.8, h: 2.2 }, { id: 'w10', m: 10, r: 0.66, h: 1.8 }, { id: 'w5', m: 5, r: 0.52, h: 1.45 }];
  var WX = { w100: -4.9, w50: -2.2, w20a: 0.2, w20b: 2.2, w10: 4.0, w5: 5.5 };
  var SLOT = [0, 300, 60, 180, 240, 120];
  var st = { rider: 1.2, nut: -2.0, loc: {}, water: false, sel: 'eraser', wpan: 'R', cal: false, nutBad: false, s: -4, v: 0, drag: null, rows: [] };
  var K, V, T3, beam, rider, nuts = [], pans = {}, pointer, items = {}, tweezers, winEl, winKey = '', last = '', rc;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function isW(id) { return WX.hasOwnProperty(id); }
  function wDef(id) { return WTS.filter(function (w) { return w.id === id; })[0]; }
  function mOf(id) { return isW(id) ? wDef(id).m : OBJ[id].m + (id === 'beaker' && st.water ? WATER : 0); }
  function on(pan) { return Object.keys(st.loc).filter(function (k) { return st.loc[k] === pan; }); }
  function load(pan) { return on(pan).reduce(function (s, k) { return s + mOf(k); }, 0); }
  function D() { return load('R') + st.rider + st.nut - load('L'); }   // >0 右侧重
  function seq() { var x = D() / 0.2; return 10.5 * Math.tanh(x / 10.5); }   // 指针平衡位置（小格，右为正）
  function balanced() { return Math.abs(D()) < 0.05; }
  function loaded() { return on('L').length + on('R').length > 0; }
  function objOn(pan) { return on(pan).filter(function (k) { return !isW(k); }); }
  function wOn(pan) { return on(pan).filter(isW); }
  function wSum() { return on('L').concat(on('R')).filter(isW).reduce(function (s, k) { return s + mOf(k); }, 0); }
  function reversed() { return objOn('R').length > 0 || wOn('L').length > 0; }
  function curObj() { var o = objOn('L').concat(objOn('R')); return o.length === 1 ? o[0] : null; }
  function objName(id) { return id === 'beaker' ? (st.water ? '烧杯和水' : '空烧杯') : OBJ[id].name; }
  function riderR() { return Math.round(st.rider * 10) / 10; }

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
  /* 圆角块：footprint w×d，高 h，底面在 y=0 */
  function slab(w, d, h, r, mat, bevel) {
    var b = bevel == null ? Math.min(0.25, h / 4) : bevel;
    var geo = new T3.ExtrudeGeometry(roundRect(w - 2 * b, d - 2 * b, Math.max(0.05, r - b)), { depth: h - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0);
    var m = new T3.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function std(c, r, m) { return new T3.MeshStandardMaterial({ color: c, roughness: r == null ? .5 : r, metalness: m || 0 }); }
  function scaleTex() {   // 横梁上的标尺 0～5 g（分度值 0.2 g）；贴图宽 15 cm（−7.5～7.5）
    return canvasTex(2048, 256, function (g, w, h) {
      g.fillStyle = '#F7F8FA'; g.fillRect(0, 0, w, h);
      var px = w / 15, x0 = (RX0 + 7.5) * px, k = (RX1 - RX0) / 5 * px;
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.font = 'bold 84px Bahnschrift, Arial';
      for (var i = 0; i <= 25; i++) {
        var x = x0 + i * 0.2 * k, l = i % 5 === 0 ? 120 : 70;
        g.lineWidth = i % 5 === 0 ? 7 : 4.5; g.beginPath(); g.moveTo(x, h); g.lineTo(x, h - l); g.stroke();
        if (i % 5 === 0) g.fillText(String(i / 5), x, 96);
      }
      g.font = '56px Bahnschrift, Arial'; g.fillText('g', x0 + 5 * k + 70, 96);
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
      var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#33404F'; g.font = 'bold 54px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(m + 'g', w * 0.25, h / 2); g.fillText(m + 'g', w * 0.75, h / 2);
    });
  }

  /* ── 器材 ── */
  function makeBalance(S) {
    var paint = std(0x5E6E86, .5, .15), alu = std(0xDCE1E8, .35, .3), steel = std(0xC8D0DA, .3, .35), dark = std(0x2B3442, .4, .2);
    var base = slab(38, 12, 2.6, 2.2, paint); S.add(base);
    [[-17, -4.6], [17, -4.6], [-17, 4.6], [17, 4.6]].forEach(function (p) { var f = new T3.Mesh(new T3.CylinderGeometry(0.7, 0.8, 0.5, 16), dark); f.position.set(p[0], -0.05, p[1]); S.add(f); });
    var plate = slab(30, 8, 0.25, 1.6, std(0x63738B, .4, .25), 0.08); plate.position.y = 2.6; S.add(plate);
    // 底座上的水准泡和调平脚螺丝
    var lv = new T3.Mesh(new T3.CylinderGeometry(0.9, 0.95, 0.35, 28), steel); lv.position.set(-15.6, 2.75, 3.6); S.add(lv);
    var lg = new T3.Mesh(new T3.SphereGeometry(0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T3.MeshPhongMaterial({ color: 0xCFE8C8, transparent: true, opacity: .7, shininess: 120 })); lg.scale.y = 0.35; lg.position.set(-15.6, 2.9, 3.6); S.add(lg);
    var bub = new T3.Mesh(new T3.SphereGeometry(0.2, 12, 8), new T3.MeshBasicMaterial({ color: 0xffffff })); bub.scale.y = 0.4; bub.position.set(-15.6, 3.13, 3.6); S.add(bub);
    [[-17.2, 5.2], [17.2, 5.2]].forEach(function (p) { var sc = new T3.Mesh(new T3.CylinderGeometry(0.75, 0.75, 0.7, 18), dark); sc.position.set(p[0], 0.25, p[1]); S.add(sc); });
    var col = new T3.Mesh(new T3.CylinderGeometry(1.25, 1.7, 9.8, 24), paint); col.position.set(0, 2.6 + 4.9, -0.2); col.castShadow = true; S.add(col);
    var head = slab(3.2, 2.2, 1.2, 0.5, paint); head.position.set(0, 11.6, -0.2); S.add(head);
    // 分度盘装在横梁上方：立柱后面伸出一根细杆托着刻度板；指针固定在横梁中间、竖直向上，随横梁一起转
    var post = new T3.Mesh(new T3.BoxGeometry(0.5, 8.6, 0.4), paint); post.position.set(0, 16.5, -1.45); post.castShadow = true; S.add(post);
    var dial = new T3.Mesh(new T3.BoxGeometry(4.8, 2.8, 0.15), [paint, paint, paint, paint, new T3.MeshStandardMaterial({ map: dialTex(), roughness: .6 }), paint]); dial.position.set(0, PIV + 8.8, -1.25); S.add(dial);
    // 横梁（绕中间刀口转动）：标尺、游码、平衡螺母都装在横梁上
    beam = new T3.Group(); beam.position.set(0, PIV, 0); S.add(beam);
    var bm = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(31, 1.5, 0.5), { depth: 0.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), alu);
    bm.geometry.translate(0, 0, -0.35); bm.castShadow = true; beam.add(bm);
    var strip = new T3.Mesh(new T3.PlaneGeometry(15, 1.15), new T3.MeshStandardMaterial({ map: scaleTex(), roughness: .55 })); strip.position.set(0, 0, 0.44); beam.add(strip);
    var knife = new T3.Mesh(new T3.CylinderGeometry(0.35, 0.35, 1.4, 12), steel); knife.rotation.x = Math.PI / 2; beam.add(knife);
    // 游码：骑在横梁上的金属框，左边缘一道橙线（读数看左边缘）
    rider = new T3.Group(); beam.add(rider);
    var rf = new T3.Mesh(new T3.BoxGeometry(0.7, 1.9, 0.18), steel); rf.position.set(0.35, 0, 0.53); rider.add(rf);
    var rb = new T3.Mesh(new T3.BoxGeometry(0.7, 1.9, 0.18), steel); rb.position.set(0.35, 0, -0.53); rider.add(rb);
    var rt = new T3.Mesh(new T3.BoxGeometry(0.7, 0.18, 1.24), steel); rt.position.set(0.35, 0.86, 0); rider.add(rt);
    var win = new T3.Mesh(new T3.PlaneGeometry(0.42, 1.0), new T3.MeshBasicMaterial({ color: 0xF7F8FA })); win.position.set(0.35, -0.05, 0.625); rider.add(win);
    var edge = new T3.Mesh(new T3.BoxGeometry(0.07, 1.9, 0.05), new T3.MeshBasicMaterial({ color: 0xFE752D })); edge.position.set(0.035, 0, 0.64); rider.add(edge);
    var rHit = new T3.Mesh(new T3.BoxGeometry(2.2, 3, 2.4), new T3.MeshBasicMaterial({ visible: false })); rHit.position.set(0.35, 0, 0); rider.add(rHit); rider.userData.hit = rHit;
    // 平衡螺母：两端螺杆上的滚花螺母
    [-1, 1].forEach(function (sd) {
      var rod = new T3.Mesh(new T3.CylinderGeometry(0.17, 0.17, 3.3, 10), steel); rod.rotation.z = Math.PI / 2; rod.position.set(sd * 17.1, 0, 0); beam.add(rod);
      var nut = new T3.Group();
      var nb = new T3.Mesh(new T3.CylinderGeometry(0.62, 0.62, 0.9, 6), std(0xBCC6D2, .3, .4)); nb.rotation.z = Math.PI / 2; nb.castShadow = true; nut.add(nb);
      var nh = new T3.Mesh(new T3.CylinderGeometry(1.4, 1.4, 2.2, 10), new T3.MeshBasicMaterial({ visible: false })); nh.rotation.z = Math.PI / 2; nut.add(nh);
      nut.userData = { hit: nh, sd: sd }; beam.add(nut); nuts.push(nut);
    });
    // 托盘：托架随横梁两端上下
    ['L', 'R'].forEach(function (k) {
      var g = new T3.Group(); S.add(g);
      var stem = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.32, 5.2, 14), steel); stem.position.y = PIV + 0.7 + 2.6; g.add(stem);
      for (var a = 0; a < 3; a++) { var arm = new T3.Mesh(new T3.BoxGeometry(4.6, 0.22, 0.4), steel); arm.position.y = PAN_Y - 0.55; arm.rotation.y = a * Math.PI / 3 * 2; g.add(arm); }
      var dish = new T3.Mesh(new T3.LatheGeometry([[0, 0], [PAN_R - 0.7, 0], [PAN_R - 0.2, 0.18], [PAN_R, 0.62], [PAN_R + 0.12, 0.7], [PAN_R - 0.05, 0.62], [PAN_R - 0.25, 0.26], [PAN_R - 0.75, 0.1], [0, 0.1]].map(function (p) { return new T3.Vector2(p[0], p[1] - 0.1); }), 48), std(0xE4E9EF, .3, .3));
      dish.position.y = PAN_Y; dish.castShadow = true; dish.receiveShadow = true; g.add(dish);
      g.userData.x = k === 'L' ? -PX : PX; pans[k] = g;
    });
    // 指针：从横梁下方中间伸向分度盘，橙色针尖
    pointer = new T3.Group(); pointer.position.set(0, 0, -0.85); beam.add(pointer);
    var pin = new T3.Mesh(new T3.CylinderGeometry(0.05, 0.12, 8.8, 8), dark); pin.position.y = 4.4; pointer.add(pin);
    var ptip = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.05, 1.2, 8), new T3.MeshBasicMaterial({ color: 0xFE752D })); ptip.position.y = 9.4; pointer.add(ptip);
    var hub = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.32, 0.3, 16), dark); hub.rotation.x = Math.PI / 2; pointer.add(hub);
  }
  function makeBox(S) {
    var g = new T3.Group(); g.position.set(BOX.x, 0, BOX.z); S.add(g);
    var wood = new T3.MeshStandardMaterial({ map: woodTex('#B98F5E', '#6E4F2E'), roughness: .75 }), lining = std(0x4A6283, .95);
    var W = 14.6, Dp = 8, H = 3.2, t = 0.5;
    var bot = slab(W, Dp, 0.6, 0.6, wood, 0.12); g.add(bot);
    [[0, -(Dp - t) / 2, W, t], [0, (Dp - t) / 2, W, t], [-(W - t) / 2, 0, t, Dp], [(W - t) / 2, 0, t, Dp]].forEach(function (w) { var m = new T3.Mesh(new T3.BoxGeometry(w[2], H, w[3]), wood); m.position.set(w[0], H / 2, w[1]); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    var foam = new T3.Mesh(new T3.BoxGeometry(W - 2 * t, 0.6, Dp - 2 * t), lining); foam.position.y = 0.9; foam.receiveShadow = true; g.add(foam);
    WTS.forEach(function (w) { var hole = new T3.Mesh(new T3.CircleGeometry(w.r + 0.15, 24), std(0x22374F, 1)); hole.rotation.x = -Math.PI / 2; hole.position.set(WX[w.id], 1.21, -0.4); g.add(hole); });
    var lid = new T3.Group(); lid.position.set(0, H, -Dp / 2); lid.rotation.x = -1.92; g.add(lid);
    var lp = new T3.Mesh(new T3.BoxGeometry(W, 0.5, Dp), wood); lp.position.set(0, 0.25, Dp / 2); lp.castShadow = true; lid.add(lp);
    var ll = new T3.Mesh(new T3.BoxGeometry(W - 1, 0.1, Dp - 1), lining); ll.position.set(0, -0.02, Dp / 2); lid.add(ll);
    // 镊子
    tweezers = new T3.Group();
    var tm = std(0xC9D1DA, .3, .4);
    [-1, 1].forEach(function (sd) { var arm = new T3.Mesh(new T3.BoxGeometry(0.16, 0.12, 9), tm); arm.position.set(sd * 0.22, 0, 0); arm.rotation.y = -sd * 0.03; tweezers.add(arm); });
    var end = new T3.Mesh(new T3.BoxGeometry(0.62, 0.14, 0.8), tm); end.position.z = -4.3; tweezers.add(end);
    tweezers.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    S.add(tweezers);
  }
  function makeWeight(w) {
    var g = new T3.Group(), side = new T3.MeshStandardMaterial({ map: weightTex(w.m), roughness: .3, metalness: .3 }), cap = std(0xD5DCE4, .28, .35);
    var body = new T3.Mesh(new T3.CylinderGeometry(w.r, w.r, w.h * 0.72, 32), [side, cap, cap]); body.position.y = w.h * 0.36; body.castShadow = true; g.add(body);
    var bev = new T3.Mesh(new T3.CylinderGeometry(w.r * 0.86, w.r, w.h * 0.06, 32), cap); bev.position.y = w.h * 0.75; g.add(bev);
    var neck = new T3.Mesh(new T3.CylinderGeometry(w.r * 0.32, w.r * 0.36, w.h * 0.12, 20), cap); neck.position.y = w.h * 0.84; g.add(neck);
    var knob = new T3.Mesh(new T3.SphereGeometry(w.r * 0.5, 20, 14), cap); knob.scale.y = 0.62; knob.position.y = w.h * 0.92 + w.r * 0.1; knob.castShadow = true; g.add(knob);
    return g;
  }
  function makeObj(id) {
    var g = new T3.Group();
    if (id === 'eraser') {
      var e = slab(4.6, 2.0, 1.25, 0.35, std(0xF4F2EC, .85), 0.2); g.add(e);
      var sl = new T3.Mesh(new T3.BoxGeometry(2.6, 1.3, 2.06), std(0x2F6BD9, .6)); sl.position.set(0.5, 0.63, 0); g.add(sl);
      var sl2 = new T3.Mesh(new T3.BoxGeometry(0.4, 1.31, 2.07), std(0xF4F7FB, .6)); sl2.position.set(-0.4, 0.63, 0); g.add(sl2);
    } else if (id === 'pencil') {
      var p = new T3.Group();
      var body = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.42, 11.2, 6), std(0x2E7D57, .45)); body.position.y = 0.4; p.add(body);
      var cone = new T3.Mesh(new T3.CylinderGeometry(0.42, 0.12, 1.5, 6), std(0xE8CFA6, .8)); cone.position.y = 0.4 + 6.35; p.add(cone);
      var lead = new T3.Mesh(new T3.CylinderGeometry(0.12, 0.02, 0.4, 8), std(0x2B2B2B, .4)); lead.position.y = 0.4 + 7.3; p.add(lead);
      var band = new T3.Mesh(new T3.CylinderGeometry(0.44, 0.44, 0.8, 16), std(0xBFC6CF, .3, .7)); band.position.y = 0.4 - 6.0; p.add(band);
      var rub = new T3.Mesh(new T3.CylinderGeometry(0.4, 0.4, 0.7, 16), std(0xE88A8A, .9)); rub.position.y = 0.4 - 6.75; p.add(rub);
      p.rotation.x = Math.PI / 2; p.position.y = 0.42; p.traverse(function (m) { if (m.isMesh) m.castShadow = true; }); g.add(p);
      g.rotation.y = 0.12;
    } else if (id === 'wood') {
      var wd = slab(4.2, 3.2, 2.6, 0.25, new T3.MeshStandardMaterial({ map: woodTex('#D9B98A', '#8A6A3E'), roughness: .8 }), 0.12); g.add(wd);
    } else {
      var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .28, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
      var wall = new T3.Mesh(new T3.CylinderGeometry(2.75, 2.7, 6.0, 40, 1, true), glass); wall.position.y = 3.0; g.add(wall);
      var bt = new T3.Mesh(new T3.CylinderGeometry(2.7, 2.7, 0.25, 40), glass); bt.position.y = 0.12; g.add(bt);
      var lip = new T3.Mesh(new T3.TorusGeometry(2.75, 0.09, 8, 40), std(0xB9C8D8, .3)); lip.rotation.x = Math.PI / 2; lip.position.y = 6.0; g.add(lip);
      for (var i = 1; i <= 4; i++) { var tk = new T3.Mesh(new T3.BoxGeometry(i % 2 ? 0.5 : 0.9, 0.05, 0.02), std(0x7C8DA3, .6)); tk.position.set(0.9, 0.3 + i * 1.18, 2.72); g.add(tk); }
      var water = new T3.Mesh(new T3.CylinderGeometry(2.6, 2.6, 2.32, 40), new T3.MeshPhongMaterial({ color: 0x9DCDEB, transparent: true, opacity: .55, shininess: 80, depthWrite: false }));
      water.position.y = 0.25 + 1.16; g.add(water); g.userData.water = water;
      var sh = new T3.Mesh(new T3.CylinderGeometry(2.7, 2.7, 0.1, 30), new T3.ShadowMaterial({ opacity: 0 })); sh.castShadow = true; sh.position.y = 3; g.add(sh);
    }
    return g;
  }
  function addHit(g, r, h) { var m = new T3.Mesh(new T3.CylinderGeometry(r + 0.3, r + 0.3, h + 0.8, 12), new T3.MeshBasicMaterial({ visible: false })); m.position.y = h / 2; g.add(m); g.userData.hit = m; return m; }

  function build() {
    V = K.three({ target: [-1, 14.5, 2], az: 0.08, el: 0.3, dist: 100, minDist: 60, maxDist: 160, minAz: -0.9, maxAz: 0.9, minEl: 0.08, maxEl: 1.0, fov: 30, sun: [-40, 120, 80] });
    T3 = V.T; var S = V.scene; rc = new T3.Raycaster();
    makeBalance(S); makeBox(S);
    Object.keys(OBJ).forEach(function (id) {
      var g = makeObj(id);
      if (id === 'pencil') { var ph = new T3.Mesh(new T3.BoxGeometry(1.8, 1.8, 15), new T3.MeshBasicMaterial({ visible: false })); ph.position.y = 0.6; g.add(ph); g.userData.hit = ph; } else addHit(g, OBJ[id].r, OBJ[id].h);
      S.add(g); items[id] = { g: g, r: OBJ[id].r, h: OBJ[id].h }; });
    WTS.forEach(function (w) { var g = makeWeight(w); addHit(g, w.r, w.h); S.add(g); items[w.id] = { g: g, r: w.r, h: w.h }; });
    V.tag('L', '左盘'); V.tag('R', '右盘');
    var hits = function () { return Object.keys(items).map(function (k) { return items[k].g.userData.hit; }); };
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, hits().concat([rider.userData.hit, nuts[0].userData.hit, nuts[1].userData.hit])); },
      start: function (ev) {
        var h = V.pick(ev, hits()), mp = stagePt(ev);
        if (h) {
          var id = Object.keys(items).filter(function (k) { return items[k].g.userData.hit === h.object; })[0];
          var g = items[id].g;
          grab = { k: 'item', id: id, o: h.point.clone().sub(g.position), p0: h.point.clone(), x: ev.clientX, y: ev.clientY, moved: false };
          return true;
        }
        var rh = V.pick(ev, [rider.userData.hit]);
        if (rh) { var sp = V.toScreen(rh.point); grab = { k: 'rider', lp: beam.worldToLocal(rh.point.clone()), r0: st.rider, ox: mp.x - sp.x, oy: mp.y - sp.y, x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        var nh = V.pick(ev, [nuts[0].userData.hit, nuts[1].userData.hit]);
        if (nh) {   // 平衡螺母：顺着横梁方向拖，像拧螺母一样细调（每像素约 0.012 g）
          var a0 = V.toScreen(nh.point), a1 = V.toScreen(beam.localToWorld(beam.worldToLocal(nh.point.clone()).add(new T3.Vector3(1, 0, 0)))), L = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
          grab = { k: 'nut', n0: st.nut, m0: mp, ux: (a1.x - a0.x) / L, uy: (a1.y - a0.y) / L, x: ev.clientX, y: ev.clientY, moved: false }; return true;
        }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var mp = stagePt(ev);
        if (grab.k === 'item') {
          if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) < 5) return;
          if (!grab.moved) { grab.moved = true; grab.from = st.loc[grab.id]; st.loc[grab.id] = 'D'; st.drag = grab.id; changed(); }
          var p = carry(ev, grab, items[grab.id].r); if (p) items[grab.id].g.position.copy(p);
          return;
        }
        if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) < 3) return;
        grab.moved = true;
        var tx = mp.x - grab.ox, ty = mp.y - grab.oy, best = 0, bd = 1e9, i, w, d;
        if (grab.k === 'rider') {   // 游码只能沿横梁移动：找一个位置，让按住的那一点在屏幕上离手指最近
          for (i = 0; i <= 500; i++) { w = V.toScreen(beam.localToWorld(grab.lp.clone().add(new T3.Vector3((i / 100 - grab.r0) * (RX1 - RX0) / 5, 0, 0)))); d = Math.hypot(w.x - tx, w.y - ty); if (d < bd) { bd = d; best = i / 100; } }
          setRider(best, false);
        } else setNut(grab.n0 + ((mp.x - grab.m0.x) * grab.ux + (mp.y - grab.m0.y) * grab.uy) * 0.012, false);
      },
      end: function () {
        if (!grab) return;
        if (grab.k === 'item') {
          var id = grab.id;
          if (!grab.moved) clickItem(id);
          else { st.drag = null; drop(id, items[id].g.position, grab.over); }
        } else if (grab.moved) { if (grab.k === 'rider') setRider(st.rider, true); else setNut(st.nut, true); }   // 只碰一下不移动：什么都不变
        grab = null;
      }
    };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }

  /* ── 拖着走：按住的那一点始终在手指下，物体沿“桌面—天平—砝码盒”的表面移动，不穿过器材 ── */
  function supports(skip) {
    var s = [
      { x0: -19, x1: 19, z0: -6, z1: 6, top: 2.85 },
      { x0: -2, x1: 2, z0: -2, z1: 2, top: PIV + 1 }, { x0: -2.6, x1: 2.6, z0: -1.8, z1: -0.5, top: PIV + 10.4 }, { x0: -18.6, x1: 18.6, z0: -0.8, z1: 1.2, top: PIV + 1 },
      { c: 1, x: -PX, z: 0, R: PAN_R, top: PAN_Y, pan: 'L' }, { c: 1, x: PX, z: 0, R: PAN_R, top: PAN_Y, pan: 'R' },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z + 4, top: 1.2 },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z - 3.5, top: 3.2 }, { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z + 3.5, z1: BOX.z + 4, top: 3.2 },
      { x0: BOX.x - 7.3, x1: BOX.x - 6.8, z0: BOX.z - 4, z1: BOX.z + 4, top: 3.2 }, { x0: BOX.x + 6.8, x1: BOX.x + 7.3, z0: BOX.z - 4, z1: BOX.z + 4, top: 3.2 },
      { x0: BOX.x - 7.3, x1: BOX.x + 7.3, z0: BOX.z - 7, z1: BOX.z - 4, top: 9 }
    ];
    Object.keys(items).forEach(function (k) { if (k === skip) return; var p = items[k].g.position, l = st.loc[k]; s.push({ c: 1, x: p.x, z: p.z, R: items[k].r, top: p.y + items[k].h, pan: l === 'L' || l === 'R' ? l : null }); });
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
  /* 拿着走：只在指针射线上找位置，按住的那一点始终在手指下。
     射线先碰到的表面（桌面、托盘、砝码盒）正好托住物体时，物体放在那个表面上；
     碰到的是器材侧面时，物体悬在射线上、按下点所在的竖直面附近（不越过碰到的那一点，所以不会穿进器材）。 */
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
      var b1 = at(t1), y = surfH(S, b1.x, b1.z, r); gr.over = S.top && S.top.pan || null;
      if (Math.abs(y - b1.y) < 0.3) { b1.y = y; return b1; }
    }
    var n = V.camera.getWorldDirection(new T3.Vector3()).setY(0).normalize(), pl = new T3.Plane().setFromNormalAndCoplanarPoint(n, gr.p0), q = new T3.Vector3();
    var tp = rc.ray.intersectPlane(pl, q) ? q.distanceTo(C) : t0;
    return at(t1 > 0 ? Math.min(tp, t0) : tp);
  }
  /* 松手：手指指着托盘（或物体在托盘上方）就放进那个盘；砝码其余情况回盒；物体回桌面原处 */
  function drop(id, p, over) {
    var pan = over || (Math.hypot(p.x + PX, p.z) < PAN_R + 1.5 && p.y > 10 ? 'L' : Math.hypot(p.x - PX, p.z) < PAN_R + 1.5 && p.y > 10 ? 'R' : null);
    if (pan) place(id, pan); else place(id, isW(id) ? 'B' : 'T');
  }
  function place(id, where) {
    if (!isW(id) && (where === 'L' || where === 'R')) objOn(where).forEach(function (k) { if (k !== id) st.loc[k] = 'T'; });   // 一个盘只放一个被测物
    st.loc[id] = where; changed();
  }
  function clickItem(id) {
    var l = st.loc[id];
    if (isW(id)) place(id, l === 'B' ? st.wpan : 'B');
    else { st.sel = id; place(id, l === 'T' ? 'L' : 'T'); }
  }
  function setRider(v, snap) {
    v = clamp(v, 0, 5);
    var n = Math.round(v * 5) / 5;
    if (snap && Math.abs(v - n) < 0.07) v = n;
    v = Math.round(v * 50) / 50;
    if (v !== st.rider) { st.rider = v; changed(); }
  }
  function setNut(v, snap) {
    v = clamp(v, -3.6, 3.6);
    if (snap && !loaded()) { var dd = D() + (v - st.nut), need = v - dd; if (Math.abs(dd) < 0.5 && Math.abs(need) <= 3.6) v = Math.round(need * 100) / 100; }   // 空盘时松手离平衡不到 0.5 g 就调平
    v = Math.round(v * 100) / 100;
    if (v === st.nut) return;
    st.nut = v;
    if (Math.abs(v) >= 0.05) st.cal = false;
    if (loaded()) { st.cal = false; st.nutBad = true; }   // 称量过程中动了平衡螺母
    last = '';
  }

  /* ── 每帧：指针阻尼摆动，横梁、托盘、物体就位 ── */
  function tick(dt) {
    var se = seq(), w = 2 * Math.PI / 1.5, z = 0.1, n = 4, h = dt / n;
    for (var i = 0; i < n; i++) { st.v += (-w * w * (st.s - se) - 2 * z * w * st.v) * h; st.s += st.v * h; if (Math.abs(st.s) > 11.5) { st.s = Math.sign(st.s) * 11.5; st.v *= -0.3; } }
    if (!loaded() && !st.drag && st.rider < 0.005 && balanced()) { st.cal = true; st.nutBad = false; }   // 空盘、游码在零、横梁平衡 → 调好了
    pose(); drawWin(); ui();
  }
  function pose() {
    var a = -st.s * DA * Math.PI / 180;   // 右侧重（s>0）右端下沉；向上的指针随横梁转，偏向右
    beam.rotation.z = a;
    var dyR = PX * Math.sin(a), dyL = -dyR;
    pans.L.position.set(-PX, dyL, 0); pans.R.position.set(PX, dyR, 0);
    rider.position.set(RX0 + st.rider * (RX1 - RX0) / 5, 0, 0);
    var u = st.nut / NUT_K; nuts.forEach(function (n) { n.position.set(n.userData.sd * 17.05 + u, 0, 0); n.rotation.x = st.nut * 4; });
    var slotK = { L: 0, R: 0 };
    WTS.forEach(function (w) {
      var g = items[w.id].g, l = st.loc[w.id];
      if (l === 'B') g.position.set(BOX.x + WX[w.id], 1.2, BOX.z - 0.4);
      else if (l === 'L' || l === 'R') { var ag = SLOT[slotK[l]++] * Math.PI / 180; g.position.set((l === 'L' ? -PX : PX) + Math.cos(ag) * 4.2, PAN_Y + (l === 'L' ? dyL : dyR), -Math.sin(ag) * 4.2); }
    });
    Object.keys(OBJ).forEach(function (id) {
      var g = items[id].g, l = st.loc[id];
      if (l === 'T') g.position.set(OBJ[id].home[0], 0, OBJ[id].home[1]);
      else if (l === 'L' || l === 'R') g.position.set(l === 'L' ? -PX : PX, PAN_Y + (l === 'L' ? dyL : dyR), 0);
    });
    items.beaker.g.userData.water.visible = st.water;
    // 镊子：夹着正在拖的砝码，否则放在砝码盒前
    var dw = st.drag && isW(st.drag) ? items[st.drag] : null;
    var tip, hd;
    if (dw) { tip = dw.g.position.clone().add(new T3.Vector3(0, dw.h * 0.95, 0)); hd = tip.clone().add(new T3.Vector3(1.2, 4.2, 7.8)); }
    else { tip = new T3.Vector3(BOX.x + 3.5, 0.1, BOX.z + 6.6); hd = new T3.Vector3(BOX.x - 5.3, 0.1, BOX.z + 5.6); }
    tweezers.position.copy(tip).add(hd).multiplyScalar(0.5);
    tweezers.quaternion.setFromUnitVectors(new T3.Vector3(0, 0, 1), tip.clone().sub(hd).normalize());
    V.placeTag('L', new T3.Vector3(-PX - PAN_R - 2.8, PAN_Y + dyL - 1.4, 0)); V.placeTag('R', new T3.Vector3(PX + PAN_R + 2.8, PAN_Y + dyR - 1.4, 0));
  }

  /* ── 观察窗：分度盘（上）＋游码标尺（下） ── */
  function drawWin() {
    var key = [Math.round(st.s * 20), st.rider].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:360px"><h3><span>分度盘 · 游码标尺</span><small>放大</small></h3><svg viewBox="0 0 360 236"></svg></div>');
    var s = '', cx = 180, cy = 360, R = 320, A = 1.6;   // 转轴在下方，指针向上
    s += '<rect x="30" y="4" width="300" height="104" rx="8" fill="#FBFCFD" stroke="#C3CEDC"/>';
    for (var i = -10; i <= 10; i++) {
      var a = i * A * Math.PI / 180, l = i === 0 ? 34 : i % 5 === 0 ? 24 : 15;
      s += '<line x1="' + (cx + Math.sin(a) * R) + '" y1="' + (cy - Math.cos(a) * R) + '" x2="' + (cx + Math.sin(a) * (R - l)) + '" y2="' + (cy - Math.cos(a) * (R - l)) + '" stroke="' + (i === 0 ? '#C1361A' : '#1E3A5F') + '" stroke-width="' + (i === 0 ? 3.4 : i % 5 ? 1.6 : 2.4) + '"/>';
    }
    var pa = st.s * A * Math.PI / 180;
    s += '<line x1="' + (cx + Math.sin(pa) * 258) + '" y1="' + (cy - Math.cos(pa) * 258) + '" x2="' + (cx + Math.sin(pa) * (R + 2)) + '" y2="' + (cy - Math.cos(pa) * (R + 2)) + '" stroke="#FE752D" stroke-width="4" stroke-linecap="round"/>';
    s += '<text x="22" y="26" font-size="18" fill="#56677D">左</text><text x="338" y="26" text-anchor="end" font-size="18" fill="#56677D">右</text>';
    // 游码标尺
    var y0 = 124, X = function (g) { return 30 + g * 60; };
    s += '<rect x="8" y="' + y0 + '" width="344" height="76" rx="6" fill="#F7F8FA" stroke="#C3CEDC"/>';
    for (var k = 0; k <= 25; k++) {
      var x = X(k * 0.2), L = k % 5 === 0 ? 30 : 17;
      s += '<line x1="' + x + '" y1="' + (y0 + 76) + '" x2="' + x + '" y2="' + (y0 + 76 - L) + '" stroke="#1E3A5F" stroke-width="' + (k % 5 ? 1.4 : 2.4) + '"/>';
      if (k % 5 === 0) s += '<text x="' + x + '" y="' + (y0 + 26) + '" text-anchor="middle" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + k / 5 + '</text>';
    }
    s += '<text x="344" y="' + (y0 + 26) + '" text-anchor="end" font-size="18" fill="#56677D">g</text>';
    var rx = X(st.rider);
    s += '<rect x="' + rx + '" y="' + (y0 + 30) + '" width="22" height="50" rx="2" fill="rgba(160,172,188,.55)" stroke="#56677D" stroke-width="1.5"/><line x1="' + rx + '" y1="' + (y0 + 28) + '" x2="' + rx + '" y2="' + (y0 + 82) + '" stroke="#FE752D" stroke-width="3"/>';
    s += '<text x="180" y="230" text-anchor="middle" font-size="18" fill="#56677D">游码看左边缘（橙线）</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function changed() { st.ver = (st.ver || 0) + 1; if (K.revealed()) K.invalidate(); last = ''; }
  function dup() { return st.recVer === st.ver; }   // 记过以后器材没动过 = 同一次测量；重新放、换砝码、重新调平都算新的一次
  function canRec() { var o = curObj(); return st.cal && !st.drag && !!o && st.loc[o] === 'L' && !reversed() && balanced() && K.revealed() && !dup(); }
  function ui() {
    var ld = loaded(), bal = balanced(), o = curObj(), dd = D(), hint, tone = '';
    var hideRev = K.S.q === 3 && reversed() && !balanced();   // 第 4 问：先让学生按放反的样子调平读数，调平之前不点破“左物右码”
    var checks = [
      { label: '空载调平', ok: !!st.cal },
      { label: '左物右码', ok: (o || wOn('L').length) && !hideRev ? !reversed() && !!objOn('L').length : null },
      { label: '横梁平衡', ok: ld && o ? (bal ? true : null) : null }
    ];
    if (st.drag) hint = isW(st.drag) ? '用镊子把砝码放到右盘。' : '把物体放到左盘。';
    else if (!ld) {
      if (st.rider > 0.005) { hint = bal ? '横梁平衡了，可游码不在零刻度线。先把游码拨回零。' : K.S.q === 0 ? '先看看游码停在哪、指针指在哪。' : K.S.q === 1 ? '先拖平衡螺母，让指针指到分度盘中线。' : '先把游码拨到零刻度线。'; tone = bal ? 'warn' : ''; }   // 第 1、2 问不提前说出“先归零游码”
      else if (!bal) hint = dd < 0 ? '指针偏左，把平衡螺母向右调。' : '指针偏右，把平衡螺母向左调。';
      else { hint = '已调好。把被测物体放到左盘。'; tone = 'good'; }
    }
    else if (st.nutBad) { hint = '称量时动了平衡螺母，这次称量无效。取下物体和砝码，重新调平。'; tone = 'warn'; }
    else if (!st.cal) { hint = '天平还没调好就放了东西。先取下，空盘调平。'; tone = 'warn'; }
    else if (hideRev) hint = bal ? '横梁平衡了。读出游码示数。' : '移动游码，使横梁平衡。';
    else if (reversed()) { hint = '物码放反了：物体要放左盘，砝码放右盘。'; tone = 'warn'; }
    else if (!o) hint = '把被测物体放到左盘。';
    else if (!wOn('R').length && st.rider < 0.005 && dd < 0) hint = K.S.q === 2 ? '往右盘加砝码，使横梁平衡。' : '用镊子从大到小往右盘加砝码。';   // 第 3 问问的就是“先加大还是小、用什么夹”
    else if (!bal) hint = dd < 0 ? '指针偏左：再加砝码，或向右移游码。' : '指针偏右：换小一点的砝码，或向左移游码。';
    else if (dup()) { hint = o === 'beaker' && !st.water ? '已记下空烧杯。往烧杯里加水（待测物选「烧杯和水」），再称一次。' : '已记录。取下物体和砝码，换下一个物体。'; tone = 'good'; }
    else if (!K.revealed()) hint = '横梁平衡了。读出游码示数。';
    else { hint = '可以记录。'; tone = 'good'; }
    var res = o && ld ? '砝码 ' + wSum() + ' g + 游码 ' + f1(st.rider) + ' g = <b>' + f1(wSum() + st.rider) + '</b> g' : '游码示数 <b>' + f1(st.rider) + '</b> g', bad = false;
    if (o && ld && reversed() && !hideRev) {   // 课本：物码放反时，物体质量 = 砝码总质量 − 游码示数
      bad = true;
      res += '<br>物码放反，这不是' + objName(o) + '的质量。' + (bal && wOn('L').length && !wOn('R').length ? '放反时 ' + objName(o) + '质量 = 砝码 − 游码 = ' + wSum() + ' g − ' + f1(st.rider) + ' g = ' + f1(wSum() - st.rider) + ' g' : '');
    } else if (ld && st.nutBad) { bad = true; res += '<br>称量中动了平衡螺母，这个读数无效。'; }
    else if (ld && !st.cal) { bad = true; res += '<br>天平没有空载调平，这个读数不准。'; }
    else if (ld && o && !bal) { bad = true; res += '<br>横梁还没平衡，这不是物体的质量。'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: !st.drag, result: res, bad: bad });
    var ok = canRec();
    var key = [ok, st.rider, st.nut, JSON.stringify(st.loc), st.water, st.sel, st.wpan, st.rows.length, K.revealed(), st.cal, st.nutBad].join('|');
    if (key === last) return; last = key;
    K.setReading('w', String(wSum()));
    K.setReading('r', K.revealed() ? f1(st.rider) : null);
    var why = '';   // 记录键变灰时说明原因（第 4 问放反时最常见）
    if (!ok && o && ld && reversed()) why = hideRev ? '先移动游码使横梁平衡，读出示数。' : '物码放反，读数不是' + objName(o) + '的质量，不能记录。';
    else if (!ok && ld && st.nutBad) why = '称量中动了平衡螺母，这次不能记录。';
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 行：' + objName(o) : why, ok ? 'good' : why && !hideRev ? 'warn' : '');
    K.setCount(st.rows.length + ' 次');
    syncCtrls();
  }

  /* ── 控件 ── */
  /* 面板（2026-11-21 按「器材调节面板规范」重排）：选待测物 → 它放在哪 → 游码、螺母两根滑杆 → 加砝码（动作）；
     “加砝码放右盘 / 左盘”平时用不到，收进标题栏的「更多」。原来单独的「加水 / 倒掉水」并进待测物：选「烧杯和水」= 加水，选「空烧杯」= 倒掉水。 */
  var VL = 'style="font-size:19px;text-align:left;flex:none;width:106px;min-width:0;white-space:nowrap"';
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('待测物', K.seg('o', [['eraser', '橡皮'], ['pencil', '铅笔'], ['wood', '小木块'], ['beaker', '空烧杯'], ['beakerW', '烧杯和水']])) +
      K.grp('放在', K.seg('p', [['T', '桌面'], ['L', '左盘'], ['R', '右盘']])) +
      K.grp('游码', '<div class="row"><span class="vl" id="v-r" ' + VL + '></span><input class="rng" type="range" id="s-r" min="0" max="5" step="0.02" style="flex:1;width:auto"></div>') +
      K.grp('螺母', '<div class="row"><span class="vl" id="v-n" ' + VL + '></span><input class="rng" type="range" id="s-n" min="-3.6" max="3.6" step="0.02" style="flex:1;width:auto"></div>') +
      K.grp('砝码/g', '<div class="acts" id="wsel">' + WTS.map(function (w) { return '<button data-w="' + w.id + '" style="padding:0 2px" title="' + w.m + ' g 砝码：点一下放入托盘，再点取回">' + w.m + '</button>'; }).join('') +
        '<button id="wback" style="flex:none;padding:0 8px" title="把砝码全部收回砝码盒"><i>↺</i>收回</button></div>') +
      '<div id="more" style="border-top:1px dashed #D5DEE9"' + (st.more ? '' : ' hidden') + '>' + K.grp('加砝码', K.seg('wp', [['R', '放右盘'], ['L', '放左盘']])) + '</div>';
    moreBtn();
    var sr = document.getElementById('s-r'), sn = document.getElementById('s-n');
    K.rng(sr); K.rng(sn);
    sr.addEventListener('input', function () { setRider(+sr.value, false); });
    sr.addEventListener('change', function () { setRider(+sr.value, true); });
    sn.addEventListener('input', function () { setNut(+sn.value, false); });
    sn.addEventListener('change', function () { setNut(+sn.value, true); });
    document.querySelectorAll('[data-o]').forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-o');
        if (v === 'beakerW' || v === 'beaker') { st.sel = 'beaker'; var w = v === 'beakerW'; if (st.water !== w) { st.water = w; changed(); } }   // 烧杯和水 = 加水，空烧杯 = 倒掉水
        else st.sel = v;
        last = '';
      };
    });
    document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { place(st.sel, b.getAttribute('data-p')); }; });
    document.querySelectorAll('[data-wp]').forEach(function (b) { b.onclick = function () { st.wpan = b.getAttribute('data-wp'); last = ''; }; });
    document.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-w'); place(id, st.loc[id] === 'B' ? st.wpan : 'B'); }; });
    document.getElementById('wback').onclick = function () { WTS.forEach(function (w) { st.loc[w.id] = 'B'; }); changed(); };
  }
  function moreBtn() {   // 标题栏右侧「更多」：展开 / 收起不常用的一行
    K.ctrlTag('<button class="mini" id="more-tg">' + (st.more ? '收起 ▴' : '更多 ▾') + '</button>');
    document.getElementById('more-tg').onclick = function () { st.more = !st.more; document.getElementById('more').hidden = !st.more; moreBtn(); };
  }
  function syncCtrls() {
    var sr = document.getElementById('s-r'), sn = document.getElementById('s-n');
    if (document.activeElement !== sr) sr.value = st.rider; if (document.activeElement !== sn) sn.value = st.nut;
    [sr, sn].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-r').textContent = st.rider < 0.005 ? '在零刻度线' : K.revealed() ? f1(st.rider) + ' g' : '未读';
    document.getElementById('v-n').textContent = Math.abs(st.nut) < 0.3 ? '居中' : st.nut < 0 ? '偏左' : '偏右';
    var ov = st.sel === 'beaker' ? (st.water ? 'beakerW' : 'beaker') : st.sel;
    document.querySelectorAll('[data-o]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-o') === ov); });
    document.querySelectorAll('[data-p]').forEach(function (b) { b.classList.toggle('on', st.loc[st.sel] === b.getAttribute('data-p')); });
    document.querySelectorAll('[data-wp]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-wp') === st.wpan); });
    document.querySelectorAll('[data-w]').forEach(function (b) { var l = st.loc[b.getAttribute('data-w')]; b.classList.toggle('on', l === 'L' || l === 'R'); b.title = l === 'B' ? '在砝码盒里' : l === 'L' ? '在左盘' : '在右盘'; });
    document.getElementById('wback').disabled = !WTS.some(function (w) { return st.loc[w.id] !== 'B'; });
  }

  /* 第 i 问的起始器材 */
  function preset(i) {
    Object.keys(OBJ).forEach(function (k) { st.loc[k] = 'T'; });
    WTS.forEach(function (w) { st.loc[w.id] = 'B'; });
    st.water = false; st.wpan = 'R'; st.nutBad = false; st.drag = null;
    if (i <= 1) { st.rider = 1.2; st.nut = -2.0; st.cal = false; st.sel = 'eraser'; }
    else {
      st.rider = 0; st.nut = 0; st.cal = true;
      if (i === 2) { st.loc.eraser = 'L'; st.sel = 'eraser'; }
      if (i === 3) { st.loc.pencil = 'R'; st.loc.w10 = 'L'; st.sel = 'pencil'; }
      if (i === 4) { st.loc.wood = 'L'; st.loc.w20a = 'R'; st.loc.w10 = 'R'; st.loc.w5 = 'R'; st.sel = 'wood'; }
      if (i === 5) { st.loc.beaker = 'L'; st.sel = 'beaker'; }
    }
    st.s = seq(); st.v = 0;
    changed();
  }

  window.__exp = { st: st, V: function () { return V; }, items: function () { return items; }, rider: function () { return rider; }, nuts: function () { return nuts; }, beam: function () { return beam; }, D: D, balanced: balanced, seq: seq };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'w', name: '砝码总质量', unit: 'g' }, { id: 'r', name: '游码示数', unit: 'g' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖物体、砝码到托盘（点一下也能放入 / 取回）；沿横梁拖游码；左右拖平衡螺母细调；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; var o = curObj(); st.rows.push({ name: objName(o), w: wSum(), r: riderR(), m: Math.round((wSum() + riderR()) * 10) / 10 }); st.recVer = st.ver; last = ''; },
    clear: function () { st.rows = []; last = ''; },
    renderData: function () {
      var R = st.rows, e = R.filter(function (r) { return r.name === '空烧杯'; }).slice(-1)[0], f = R.filter(function (r) { return r.name === '烧杯和水'; }).slice(-1)[0];
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:980px"><thead><tr><th>被测物体</th><th>砝码总质量/g</th><th>游码示数/g</th><th>物体的质量 <span class="m">m</span>/g</th></tr></thead><tbody>' +
        (R.length ? R.map(function (r) { return '<tr><td>' + r.name + '</td><td class="n">' + r.w + '</td><td class="n">' + f1(r.r) + '</td><td class="n">' + f1(r.m) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table>' +
        (e && f ? '<p class="tip">水的质量：' + f1(f.m) + ' g − ' + f1(e.m) + ' g = <b>' + f1(f.m - e.m) + '</b> g</p>' : '<p class="tip">物体的质量 = 砝码总质量 + 游码示数。</p>');
    }
  });
})();
