/* 13 探究浮力大小与哪些因素有关（课本图 10.1-5）。
   装置：铁架台横杆上挂弹簧测力计（0～5 N，分度值 0.1 N，弹簧 2 cm / N），下面用细线挂长方体金属块
   （底面 2.5 cm × 4 cm，高 10 cm，体积 100 cm³，侧面每 2 cm 一条刻线）；下方大烧杯（内半径 7 cm，水深 14 cm）。
   参数：A 重 4.0 N，B 重 2.7 N；液体密度 水 1.0、盐水 1.2、酒精 0.8 g/cm³，g 取 10 N/kg。
   F浮 = ρ液 g V排；在水中每多浸入 1 cm，浮力增大 0.1 N，示数正好落在 0.1 N 刻度上；浸入时液面上升（烧杯截面积 154 cm²）；碰到杯底后杯底有支持力，示数变小。
   读数训练：顶栏示数先显示「?」，看放大窗读出后点「显示读数」；记录前要先显示。
   记录有效：金属块静止、不碰杯底；每个金属块先在空气中测 G（G 记录后作为该金属块的基准）。
   操作：上下拖金属块（或测力计）升降；右侧滑杆同步。 */

/* ════ 参数区：老师 DIY / 交给 AI 助手修改，只改这一段 ════
   每一项后面是中文说明和可选值；改完保存、刷新页面即可。
   页面顶栏「定制」里点选的结果会覆盖这里的默认值（点「改回原样」回到这里的值）。
   这里只管外观和生活情境：物体的体积、重力、测力计读数、题目和答案都不受影响。 */
var CFG = {
  shape: 'metal',   // 金属块形状：'metal' 长方体 | 'stone' 不规则形状 | 'clay' 圆角形（体积、重力都相同，只是形状不同）
  liquid: 'blue',   // 液体颜色：'clear' 清水 | 'blue' 淡蓝 | 'green' 淡绿（盐水、酒精仍各有区分）
  scene: 'none'     // 情境小卡片：'none' 不显示 | 'ship' 轮船 | 'balloon' 热气球（潜水艇已做成 3D 场景，在舞台左上角切换）
};
/* ════ 参数区结束（下面是实验程序，不用改）════ */

(function () {
  var LIQ = { water: { name: '水', rho: 1.0, c: 0x9CCBEA, op: .45 }, salt: { name: '盐水', rho: 1.2, c: 0xA8CFC8, op: .52 }, alc: { name: '酒精', rho: 0.8, c: 0xDDEBF5, op: .38 } };
  var BLK = { A: { name: '金属块 A', G: 4.0, c: 0x6A7788, m: .3 }, B: { name: '金属块 B', G: 2.7, c: 0xD5DDE6, m: .2 } };
  /* ── 定制（只换外观）：金属块形状、液体配色、生活情境 ── */
  var SHAPE = {
    metal: { name: '金属块', gl: '金属块', A: 0x6A7788, B: 0xD5DDE6 },
    stone: { name: '金属块', gl: '金属块', A: 0x6A7788, B: 0xD5DDE6 },   // 不规则形状的金属块（不换成石块、橡皮泥：同样 100 cm³ 重 4 N 不符合它们的密度）
    clay: { name: '金属块', gl: '金属块', A: 0x6A7788, B: 0xD5DDE6 }     // 圆角形金属块
  };
  var TINT = {   // 每种配色里，水 / 盐水 / 酒精 仍有深浅、色相区分
    clear: { water: [0xD2E6F2, .30], salt: [0xD6E5E1, .42], alc: [0xEAF1F6, .22] },
    blue: { water: [0x9CCBEA, .45], salt: [0xA8CFC8, .52], alc: [0xDDEBF5, .38] },
    green: { water: [0xA6DBB6, .45], salt: [0x8FCB9F, .56], alc: [0xD3EEDA, .34] }
  };
  var DIY = { shape: SHAPE[CFG.shape] ? CFG.shape : 'metal', liquid: TINT[CFG.liquid] ? CFG.liquid : 'blue', scene: CFG.scene || 'none' };
  function NM() { return SHAPE[DIY.shape].name; }
  function setNames() { ['A', 'B'].forEach(function (k) { BLK[k].name = SHAPE[DIY.shape].name + ' ' + k; }); }
  function setTint() { Object.keys(LIQ).forEach(function (k) { LIQ[k].c = TINT[DIY.liquid][k][0]; LIQ[k].op = TINT[DIY.liquid][k][1]; }); }
  setNames(); setTint();
  var R_IN = 7, AREA = Math.PI * R_IN * R_IN, BOT = 0.4, L0 = 14.4, RIM = 19, BA = 10, BH = 10, BXW = 4, BZW = 2.5, THREAD = 5.5, U_MIN = BOT - 2.4, U_MAX = 19, U_AIR = 17;   // 细线 5.5 cm：金属块沉到杯底时，测力计挂钩仍在水面上方约 3 cm
  var SC_BODY = 17, SC_Z0 = 3.2, SC_PER = 2, SC_R0 = 1.2, SC_HK = 1.6, SC_RING = 1.0, SC_L0 = SC_RING + SC_BODY + SC_R0 + SC_HK;
  var st = { blk: 'A', liq: 'water', u: U_AIR, Fd: 4, vd: 0, still: 0, G: { A: null, B: null }, rows: [], justRec: null, graph: false };
  var K, V, T3, blocks = {}, thread, scale, scaleHit, holder, arm, liqM = [], winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function yb() { return Math.max(BOT, st.u); }   // 金属块下表面高度
  function touching() { return st.u <= BOT + 0.005; }
  /* 液面与浸入深度：浸入体积使液面上升 */
  function geo(y) {
    var k = BA / AREA, sub, L;
    if (y >= L0) { sub = 0; L = L0; }
    else { sub = (L0 - y) / (1 - k); if (sub > BH) sub = BH; L = L0 + k * sub; }
    return { sub: sub, L: L, h: Math.max(0, L - y) };
  }
  function g() { return geo(yb()); }
  function Fb() { return LIQ[st.liq].rho * BA * g().sub / 100; }   // N
  function Ftrue() { var F = BLK[st.blk].G - Fb(); if (touching()) F -= (BOT - st.u) / SC_PER; return Math.max(0, F); }
  function settled() { return st.still >= 0.3; }
  function readF() { return Math.round(st.Fd * 10 + 1e-4) / 10; }   // 四舍五入（加一点余量，避免 3.75 因浮点误差变成 3.7）
  function hRead() { return Math.round(g().h * 10 + 1e-4) / 10; }
  function inAir() { return g().sub <= 0; }
  function uForH(h) { var k = BA / AREA, sub = Math.min(h, BH), L = L0 + k * sub; return L - h; }

  /* ── 纹理与小工具 ── */
  function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function rr(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function rbox(w, h, d, r, mat) {
    var gg = new T3.ExtrudeGeometry(rr(w - 2 * r, h - 2 * r, r * 0.6), { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
    gg.translate(0, 0, -(d - 2 * r) / 2); var m = new T3.Mesh(gg, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function cyl(r, h, mat, seg) { var m = new T3.Mesh(new T3.CylinderGeometry(r, r, h, seg || 24), mat); m.castShadow = true; return m; }
  function scaleFace() {
    return tex(200, 1600, function (gc, w, h) {
      var px = h / (SC_BODY - 1.2);
      gc.fillStyle = '#FBFCFD'; gc.fillRect(0, 0, w, h);
      gc.fillStyle = '#DCE4EE'; gc.fillRect(w / 2 - 9, 0, 18, h);
      gc.strokeStyle = '#1E3A5F'; gc.fillStyle = '#1E3A5F'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.font = 'bold 50px Bahnschrift, Arial';
      for (var i = 0; i <= 50; i++) {
        var y = (SC_Z0 + SC_PER * i / 10 - 0.6) * px, l = i % 10 === 0 ? 46 : i % 5 === 0 ? 34 : 22;
        gc.lineWidth = i % 5 === 0 ? 5 : 3; gc.beginPath(); gc.moveTo(w / 2 + 12, y); gc.lineTo(w / 2 + 12 + l, y); gc.stroke();
        gc.beginPath(); gc.moveTo(w / 2 - 12, y); gc.lineTo(w / 2 - 12 - l * 0.6, y); gc.stroke();
        if (i % 10 === 0) gc.fillText(String(i / 10), 30, y);
      }
      gc.font = 'bold 44px Bahnschrift, Arial'; gc.fillText('N', w - 30, 0.9 * px);
    });
  }
  function makeScale() {
    var gp = new T3.Group(), steel = new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .28 });
    var ring = new T3.Mesh(new T3.TorusGeometry(0.85, 0.16, 10, 32), steel); ring.position.y = SC_RING; gp.add(ring);
    var neck = cyl(0.16, 0.6, steel, 10); neck.position.y = 0.05; gp.add(neck);
    var body = rbox(3.3, SC_BODY, 1.2, 0.3, new T3.MeshStandardMaterial({ color: 0x3E6FB8, roughness: .45, metalness: .15 })); body.position.y = -SC_BODY / 2; gp.add(body);
    var face = new T3.Mesh(new T3.PlaneGeometry(2.4, SC_BODY - 1.2), new T3.MeshStandardMaterial({ map: scaleFace(), roughness: .6, emissive: 0xffffff, emissiveIntensity: .12 })); face.position.set(0, -SC_BODY / 2, 0.61); gp.add(face);
    var ptr = new T3.Mesh(new T3.BoxGeometry(1.5, 0.16, 0.06), new T3.MeshBasicMaterial({ color: 0xFE752D })); ptr.position.z = 0.64; gp.add(ptr);
    var rod = cyl(0.13, 1, steel, 10); gp.add(rod);
    var hook = new T3.Group(), hk = new T3.Mesh(new T3.TorusGeometry(0.5, 0.12, 8, 20, Math.PI * 1.35), steel); hk.rotation.z = Math.PI * 0.82; hk.position.y = -0.5; hook.add(hk); gp.add(hook);
    var hit = new T3.Mesh(new T3.BoxGeometry(5, SC_BODY + 4, 4), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = -SC_BODY / 2 + 0.5; gp.add(hit);
    gp.userData = { hit: hit, set: function (F) { var e = SC_PER * clamp(F, 0, 5.2); ptr.position.y = -(SC_Z0 + e); var len = SC_R0 + e; rod.scale.y = len; rod.position.y = -SC_BODY - len / 2 + 0.3; hook.position.y = -SC_BODY - len + 0.3; } };
    return gp;
  }
  /* 不规则、圆角形金属块：细分的长方体先倒圆角，不规则的再加起伏（按位置算，接缝不裂开）；贴图上照样画每 2 cm 一条刻线和字母 */
  function softBody(k, sh) {
    var gg = new T3.BoxGeometry(BXW, BH, BZW, 10, 24, 6), p = gg.attributes.position, nm = gg.attributes.normal, v = new T3.Vector3(), c = new T3.Vector3(), n = new T3.Vector3();
    var stone = sh === 'stone', r = stone ? 0.7 : 0.95, hx = BXW / 2 - r, hy = BH / 2 - r, hz = BZW / 2 - r;
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); n.copy(v).sub(c).normalize();
      v.copy(c).addScaledVector(n, r);
      var y = v.y + BH / 2, f = stone
        ? 0.3 * Math.sin(1.1 * v.x + 0.5 * y + 0.4) + 0.24 * Math.sin(1.6 * v.z - 0.33 * y + 1.3) + 0.16 * Math.sin(0.6 * y + 1.9 * v.x * v.z + 2) + 0.07 * Math.sin(2.3 * v.x - 1.4 * v.z + 0.9 * y)
        : 0.05 * Math.sin(2.4 * v.x + 1.7 * y) + 0.04 * Math.sin(3.3 * v.z + 2.2 * y);
      if (stone) { v.x *= 1 + 0.13 * Math.sin(0.3 * y + 0.8); v.z *= 1 + 0.16 * Math.cos(0.34 * y + 0.5); v.x += 0.25 * Math.sin(0.28 * y); }
      v.addScaledVector(n, f);
      v.y = clamp(v.y, -BH / 2, BH / 2);
      p.setXYZ(i, v.x, v.y, v.z); nm.setXYZ(i, n.x, n.y, n.z);
    }
    gg.translate(0, BH / 2, 0);
    if (stone) gg.computeVertexNormals();
    var col = '#' + new T3.Color(SHAPE[sh][k]).getHexString(), dark = k === 'A';
    function face(letter) {
      var t = tex(256, 640, function (gc, w, h) {
        gc.fillStyle = col; gc.fillRect(0, 0, w, h);
        var seed = k === 'A' ? 7 : 13;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        gc.strokeStyle = 'rgba(255,255,255,.10)'; gc.lineWidth = 2;   // 金属拉丝纹
        for (var m = 0; m < 40; m++) { var yy = rnd() * h; gc.beginPath(); gc.moveTo(0, yy); gc.lineTo(w, yy + 4 * (rnd() - .5)); gc.stroke(); }
        gc.fillStyle = dark ? 'rgba(240,244,248,.9)' : 'rgba(30,58,95,.85)';   // 刻线：每 2 cm 一条（与金属块相同）
        [2, 4, 6, 8].forEach(function (yc) { gc.fillRect(0, h - yc / BH * h - 3, w, 6); });
        if (letter) { gc.font = 'bold 120px Bahnschrift, Arial'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(k, w / 2, h - 9 / BH * h); }
      });
      t.colorSpace = T3.SRGBColorSpace; return t;
    }
    var mat = function (map) { return new T3.MeshStandardMaterial({ color: 0xffffff, map: map, roughness: .45, metalness: .3, flatShading: stone }); };
    var side = mat(face(false)), front = mat(face(true)), cap = new T3.MeshStandardMaterial({ color: SHAPE[sh][k], roughness: .45, metalness: .3, flatShading: stone });
    var m = new T3.Mesh(gg, [side, side, cap, cap, front, side]); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function makeBlock(k) {
    var gp = new T3.Group(), b = BLK[k];
    if (DIY.shape !== 'metal') { gp.add(softBody(k, DIY.shape)); return finishBlock(gp, k); }
    var body = rbox(BXW, BH, BZW, 0.12, new T3.MeshStandardMaterial({ color: b.c, metalness: b.m, roughness: .42 })); body.position.y = BH / 2; gp.add(body);
    var lineM = new T3.MeshBasicMaterial({ color: k === 'A' ? 0xDCE4EE : 0x1E3A5F });
    [2, 4, 6, 8].forEach(function (y) { var l = new T3.Mesh(new T3.BoxGeometry(BXW + 0.04, 0.08, BZW + 0.04), lineM); l.position.y = y; gp.add(l); });
    var eye = new T3.Mesh(new T3.TorusGeometry(0.42, 0.1, 8, 18), new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .3 })); eye.position.y = BH + 0.5; gp.add(eye);
    var lab = tex(128, 128, function (gc, w, h) { gc.fillStyle = 'rgba(0,0,0,0)'; gc.fillRect(0, 0, w, h); gc.fillStyle = k === 'A' ? '#FFFFFF' : '#1E3A5F'; gc.font = 'bold 96px Bahnschrift, Arial'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(k, w / 2, h / 2); });
    var lm = new T3.Mesh(new T3.PlaneGeometry(1.6, 1.6), new T3.MeshBasicMaterial({ map: lab, transparent: true })); lm.position.set(0, 9, BZW / 2 + 0.02); gp.add(lm);
    return finishBlock(gp, k);
  }
  function finishBlock(gp, k) {   // 挂环 + 拾取盒（各种外形共用）
    if (DIY.shape !== 'metal') { var eye = new T3.Mesh(new T3.TorusGeometry(0.42, 0.1, 8, 18), new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .3 })); eye.position.y = BH + 0.5; gp.add(eye); }
    var hit = new T3.Mesh(new T3.BoxGeometry(5, BH + 3, 7), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = BH / 2 + 1; gp.add(hit);
    gp.userData.hit = hit;
    return gp;
  }

  /* ── 场景 ── */
  function build() {
    V = K.three({ target: [0, 32, 0], az: 0.22, el: 0.12, dist: 136, minDist: 70, maxDist: 190, minAz: -0.9, maxAz: 0.9, minEl: 0.02, maxEl: 0.9, fov: 30, sun: [-30, 110, 80] });
    T3 = V.T; var S = V.scene;
    var iron = new T3.MeshStandardMaterial({ color: 0x6B7685, roughness: .5, metalness: .4 });
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .2, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var base = rbox(24, 1.4, 14, 0.35, iron); base.position.set(-20, 0.7, -6); S.add(base);
    var rod = cyl(0.55, 67, iron, 16); rod.position.set(-17, 33.5, -9); S.add(rod);   // 金属块高 10 cm、细线较长，挂得更高，立杆加长
    holder = new T3.Group(); S.add(holder);
    var cb = new T3.Mesh(new T3.BoxGeometry(2, 2, 2), iron); cb.position.set(-17, 0, -9); holder.add(cb);
    var len = Math.hypot(17, 9); arm = cyl(0.34, len, iron, 10); arm.position.set(-8.5, 0, -4.5); arm.rotation.set(0, -Math.atan2(9, 17), Math.PI / 2); holder.add(arm);
    var hk = new T3.Mesh(new T3.TorusGeometry(0.6, 0.12, 8, 18, Math.PI * 1.3), iron); hk.position.set(0, -0.6, 0); hk.rotation.z = Math.PI * 0.85; holder.add(hk);
    // 烧杯与液体
    var wall = new T3.Mesh(new T3.CylinderGeometry(R_IN + 0.2, R_IN + 0.2, RIM, 48, 1, true), glass); wall.position.y = RIM / 2; S.add(wall);
    var bt = new T3.Mesh(new T3.CylinderGeometry(R_IN + 0.2, R_IN + 0.2, BOT, 48), glass); bt.position.y = BOT / 2; S.add(bt);
    var lip = new T3.Mesh(new T3.TorusGeometry(R_IN + 0.2, 0.16, 8, 48), new T3.MeshStandardMaterial({ color: 0x9FB3CC, roughness: .4 })); lip.rotation.x = Math.PI / 2; lip.position.y = RIM; S.add(lip);
    var ticks = tex(64, 1216, function (gc, w, h) { var px = h / 19; gc.strokeStyle = '#1E3A5F'; gc.fillStyle = '#1E3A5F'; gc.font = 'bold 26px Bahnschrift, Arial'; gc.textAlign = 'right'; gc.textBaseline = 'middle'; for (var mm = 0; mm <= 180; mm += 5) { var y = h - (mm / 10 + BOT) * px, l = mm % 10 === 0 ? 26 : 14; gc.lineWidth = mm % 10 ? 2 : 3.2; gc.beginPath(); gc.moveTo(0, y); gc.lineTo(l, y); gc.stroke(); if (mm % 20 === 0 && mm > 0) gc.fillText(String(mm / 10), w - 2, y); } });
    var tk = new T3.Mesh(new T3.PlaneGeometry(1.2, RIM), new T3.MeshBasicMaterial({ map: ticks, transparent: true, depthWrite: false })); var a = -0.55; tk.position.set(Math.sin(a) * (R_IN + 0.25), RIM / 2, Math.cos(a) * (R_IN + 0.25)); tk.rotation.y = a; S.add(tk);
    var lm = new T3.MeshPhongMaterial({ color: LIQ.water.c, transparent: true, opacity: .45, shininess: 70, depthWrite: false }), lt = new T3.MeshPhongMaterial({ color: LIQ.water.c, transparent: true, opacity: .55, shininess: 120, depthWrite: false });
    var lq = new T3.Mesh(new T3.CylinderGeometry(R_IN, R_IN, 1, 48), lm); S.add(lq);
    var top = new T3.Mesh(new T3.CircleGeometry(R_IN, 48), lt); top.rotation.x = -Math.PI / 2; S.add(top);
    liqM = [lm, lt]; st._lq = lq; st._top = top;
    var sc = new T3.Mesh(new T3.CylinderGeometry(R_IN, R_IN, RIM, 24), new T3.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); sc.position.y = RIM / 2; sc.castShadow = true; S.add(sc);
    blocks.A = makeBlock('A'); blocks.B = makeBlock('B'); S.add(blocks.A); S.add(blocks.B);
    // 没挂的那块放在桌上
    thread = cyl(0.05, 1, new T3.MeshBasicMaterial({ color: 0x56677D }), 6); thread.castShadow = false; S.add(thread);
    scale = makeScale(); S.add(scale); scaleHit = scale.userData.hit;
    V.tag('blk', '');
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [scaleHit, blocks[st.blk].userData.hit]); },
      start: function (ev) {
        var h = V.pick(ev, [scaleHit, blocks[st.blk].userData.hit]); if (!h) return false;
        var s = V.toScreen(h.point), m = stagePt(ev);
        grab = { p0: h.point.clone(), u0: st.u, ox: m.x - s.x, oy: m.y - s.y, x: ev.clientX, y: ev.clientY, moved: false, onBlock: h.object === blocks[st.blk].userData.hit };
        st._holdBlock = grab.onBlock; return true;
      },
      move: function (ev) {
        if (!grab) return;
        if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) grab.moved = true;
        if (!grab.moved) return;
        var m = stagePt(ev), tx = m.x - grab.ox, ty = m.y - grab.oy, best = st.u, bd = 1e9, lo = U_MIN, hi = U_MAX, step = 0.5;
        for (var pass = 0; pass < 3; pass++) {
          for (var u = lo; u <= hi + 1e-9; u += step) { var dy = grab.onBlock ? yAt(u) - yAt(grab.u0) : ringAt(u) - ringAt(grab.u0), s = V.toScreen(grab.p0.clone().setY(grab.p0.y + dy)), d = Math.hypot(s.x - tx, s.y - ty); if (d < bd) { bd = d; best = u; } }
          lo = Math.max(U_MIN, best - step); hi = Math.min(U_MAX, best + step); step /= 10;
        }
        setQ(best);
      },
      end: function () { if (grab && grab.moved) snapU(); grab = null; st._holdBlock = false; }
    };
    V.frame = tick;
  }
  /* 拖动时：按在金属块上 → 金属块跟手；按在测力计上 → 测力计跟手（浸入后弹簧缩短，测力计比金属块少走一点） */
  function yAt(u) { return Math.max(BOT, u); }
  function ringAt(u) { var s = st.u; st.u = u; var r = yb() + SC_PER * Ftrue(); st.u = s; return r; }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function setU(u, exact) { u = clamp(u, U_MIN, U_MAX); st.u = exact ? u : Math.round(u * 100) / 100; st.still = 0; changed(); }
  /* 拖动和滑杆都吸附：浸在液体里时浸入深度只停在整厘米（在水里每 1 cm 对应 0.1 N，示数正好落在刻度线上）；
     刚碰到液面的半厘米以内吸到液面上方；再往下就碰底，按 0.2 cm 一档往下压（示数每档小 0.1 N）；在空气中不吸附 */
  function quantU(u) {
    u = clamp(u, U_MIN, U_MAX);
    if (u <= BOT + 0.02) return Math.max(U_MIN, BOT - Math.max(1, Math.round((BOT - u) / 0.2)) * 0.2);
    var h = geo(u).h; if (h <= 0) return u;
    var r = Math.round(h); if (r <= 0) return L0;
    while (r > 0 && uForH(r) <= BOT + 0.05) r--;   // 再深就碰底了：停在不碰底的最深整厘米
    if (r > 0 && h > r + 0.5) return BOT - 0.2;
    return uForH(r);
  }
  function setQ(u) { var q = quantU(u); if (Math.abs(q - st.u) < 1e-9) return; setU(q, true); }
  function snapU() {   // 松手时浸入深度接近整厘米就吸过去（不碰底时）
    if (touching() || inAir()) return;
    var h = g().h, r = Math.round(h);
    if (Math.abs(h - r) < 0.3 && r > 0 && uForH(r) > BOT + 0.05) setU(uForH(r), true);   // 吸到整厘米（不再取整，免得 h = 2 cm 时示数 3.75 N 变成 3.7 N）
  }

  /* ── 每帧：测力计弹簧带一点阻尼振动 ── */
  function tick(dt) {
    var Ft = Ftrue(), n = Math.max(1, Math.ceil(dt / 0.004)), sdt = dt / n, w = 11, z = 0.5;
    for (var i = 0; i < n; i++) { var a = w * w * (Ft - st.Fd) - 2 * z * w * st.vd; st.vd += a * sdt; st.Fd += st.vd * sdt; }
    if (Math.abs(st.Fd - Ft) < 0.008 && Math.abs(st.vd) < 0.04) { st.Fd = Ft; st.vd = 0; st.still += dt; } else st.still = 0;
    if (K.revealed() && st.revAt && (Math.abs(readF() - st.revAt.F) > 0.04 || Math.abs(hRead() - st.revAt.h) > 0.04 || st.revAt.k !== st.blk + st.liq)) K.invalidate();
    pose(); drawWin(); ui();
  }
  function pose() {
    var gg = g(), y = yb(), Ft = clamp(Ftrue(), 0, 5.2), Fd = clamp(st.Fd, 0, 5.2);
    // 弹簧振动：平时测力计挂在铁架台上不动，金属块上下颤动；手拿着金属块拖时，金属块跟手、测力计颤动
    var yv = st._holdBlock ? y : Math.max(BOT, y + SC_PER * (Ft - Fd)), ringY = (st._holdBlock ? y + SC_PER * Fd : y + SC_PER * Ft) + BH + 0.5 + THREAD + SC_L0;
    Object.keys(blocks).forEach(function (k) {
      var b = blocks[k];
      if (k === st.blk) b.position.set(0, yv, 0);
      else b.position.set(15, 0, 4);   // 另一块放在桌上
    });
    var tLo = yv + BH + 0.5, tHi = ringY - (SC_BODY + SC_R0 + 0.7) - SC_PER * Fd;   // 细线：金属块挂环 → 测力计挂钩钩底
    thread.scale.y = Math.max(0.1, tHi - tLo); thread.position.set(0, (tLo + tHi) / 2, 0);
    scale.position.set(0, ringY, 0); scale.userData.set(st.Fd);
    holder.position.set(0, ringY + SC_RING + 0.2, 0);
    var L = gg.L; st._lq.scale.y = L - BOT; st._lq.position.y = (L + BOT) / 2; st._top.position.y = L;
    liqM.forEach(function (m, i) { m.color.setHex(LIQ[st.liq].c); m.opacity = LIQ[st.liq].op + (i ? 0.08 : 0); });
    V.tag('blk').textContent = LIQ[st.liq].name; V.placeTag('blk', new T3.Vector3(R_IN * 0.7, 3, R_IN + 1));
  }

  /* ── 观察窗：测力计指针附近的刻度（竖直） ── */
  function drawWin() {
    var F = st.Fd, key = Math.round(F * 200);
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:300px"><h3><span>测力计放大</span><small>分度值 0.1 N</small></h3><svg viewBox="0 0 300 250"></svg></div>');
    var cy = 125, k = 120, Y = function (v) { return cy + (v - F) * k; }, s = '';   // 示数增大，指针向下
    s += '<rect x="70" y="2" width="150" height="246" rx="8" fill="#FBFCFD" stroke="#C3CEDC"/><rect x="139" y="2" width="12" height="246" fill="#DCE4EE"/>';
    for (var i = Math.floor((F - 1.1) * 10); i <= Math.ceil((F + 1.1) * 10); i++) {
      if (i < 0 || i > 50) continue;
      var y = Y(i / 10); if (y < 6 || y > 244) continue;
      var l = i % 10 === 0 ? 34 : i % 5 === 0 ? 25 : 15;
      s += '<line x1="151" y1="' + y + '" x2="' + (151 + l) + '" y2="' + y + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.6 : 2.8) + '"/>';
      s += '<line x1="139" y1="' + y + '" x2="' + (139 - l * 0.6) + '" y2="' + y + '" stroke="#1E3A5F" stroke-width="' + (i % 5 ? 1.3 : 2.2) + '"/>';
      if (i % 5 === 0 && y > 14 && y < 238) s += '<text x="64" y="' + (y + 7) + '" text-anchor="end" font-size="' + (i % 10 ? 18 : 22) + '" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + (i / 10) + '</text>';
    }
    s += '<rect x="128" y="' + (cy - 2) + '" width="34" height="4" fill="#FE752D"/><path d="M118 ' + (cy - 9) + ' L118 ' + (cy + 9) + ' L130 ' + cy + ' Z" fill="#FE752D"/>';
    s += '<text x="236" y="26" font-size="18" fill="#56677D">N</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与记录 ── */
  function changed() { st.justRec = null; st.ver = (st.ver || 0) + 1; last = ''; }
  function recKey() { return inAir() ? st.blk + '|air' : [st.blk, st.liq, f1(hRead())].join('|'); }
  function dup() { return st.recVer === st.ver; }   // 只拦“什么都没变又点一次”；改过器材再回来就是新的一次测量
  function needG() { return st.G[st.blk] == null; }
  function valid() { return settled() && !touching() && !(needG() && !inAir()) && !(!needG() && inAir()); }
  function ui() {
    var air = inAir(), hint, tone = '', rv = K.revealed(), nm = BLK[st.blk].name;
    var checks = [{ label: '已测 G', ok: needG() ? (air ? null : false) : true }, { label: '静止', ok: settled() ? true : null }, { label: '不碰杯底', ok: touching() ? false : air ? null : true }];
    if (touching()) { hint = NM() + '碰到杯底，杯底在托着它，示数偏小。往上提，离开杯底。'; tone = 'warn'; }
    else if (!settled()) hint = '弹簧还在振动，等指针停稳。';
    else if (needG() && !air) { hint = '先把' + nm + ' 提到空气中，测出它的重力 G。'; tone = 'warn'; }
    else if (st.justRec != null) { hint = '已记入第 ' + st.justRec + ' 次。' + (air ? '把' + NM() + '慢慢浸入液体。' : '改变浸入深度或液体再测。'); tone = 'good'; }
    else if (!needG() && air) hint = nm + ' 的重力已测（G = ' + f1(st.G[st.blk]) + ' N）。把它浸入液体。';
    else if (dup()) hint = '这一组已经记过了。改变浸入深度或液体再测。';
    else if (!rv) hint = '先从放大窗读出示数。';
    else { hint = air ? '读出了 G，可以记录。' : '可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: settled(), bad: touching(), result: (air ? '重力 <span class="m">G</span> = ' : '示数 <span class="m">F</span> = ') + '<b>' + f1(readF()) + '</b> N' + (touching() ? '（碰到杯底，偏小）' : '') });
    var ok = valid() && !dup() && rv;
    var key = [ok, rv, readF(), hRead(), st.blk, st.liq, touching(), st.rows.length, st.justRec, st.G.A, st.G.B, Math.round(st.u * 10)].join('|');
    if (key === last) return; last = key;
    K.setReading('F', rv ? f1(readF()) : null); K.setReading('h', f1(hRead()));
    K.setRecord(ok, ok ? (air ? '记入第 ' + (st.rows.length + 1) + ' 次：' + nm + ' 在空气中，作为它的 G' : '记入第 ' + (st.rows.length + 1) + ' 次：' + LIQ[st.liq].name + '，h = ' + f1(hRead()) + ' cm') : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    syncCtrls();
  }

  /* ── 控件 ── */
  function ctrls() {
    K.ctrl.innerHTML =   // 面板规范：选金属块 → 选液体 → 调浸入深度（滑杆）
      K.grp(SHAPE[DIY.shape].gl, K.seg('b', Object.keys(BLK).map(function (k) { return [k, k]; }))) +
      K.grp('液体', K.seg('l', Object.keys(LIQ).map(function (k) { return [k, LIQ[k].name]; }))) +
      K.grp('深度', '<div class="row"><span class="vl" id="v-u" style="font-size:22px;min-width:0;text-align:left"></span><span class="un" id="u-u"></span></div><input class="rng" type="range" id="s-u" min="' + U_MIN + '" max="' + U_MAX + '" step="0.05">');
    document.querySelectorAll('[data-b]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-b'); if (k === st.blk) return; st.blk = k; st.u = U_AIR; st.Fd = BLK[k].G; st.vd = 0; st.still = 0; changed(); }; });
    document.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-l'); if (k === st.liq) return; st.liq = k; st.still = 0; changed(); }; });
    var su = document.getElementById('s-u'); K.rng(su);
    su.addEventListener('input', function () { setQ(+su.value); });
    su.addEventListener('change', snapU);
  }
  function syncCtrls() {
    var su = document.getElementById('s-u');
    if (document.activeElement !== su) su.value = st.u;
    su.style.setProperty('--p', ((su.value - U_MIN) / (U_MAX - U_MIN) * 100) + '%');
    document.getElementById('v-u').textContent = touching() ? '到杯底' : inAir() ? '在空气中' : '浸入 ' + f1(hRead());
    document.getElementById('u-u').textContent = touching() || inAir() ? '' : 'cm';
    document.querySelectorAll('[data-b]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-b') === st.blk); });
    document.querySelectorAll('[data-l]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-l') === st.liq); });
  }

  function preset(i) {
    var P = [['A', U_AIR, 0], ['A', L0 + 1, 1], ['A', uForH(BH), 1], ['A', U_AIR, 1], ['B', U_AIR, 2], ['A', uForH(12), 1]][i];   // 第 3 问刚浸没（下表面深 10 cm），第 6 问浸没在 12 cm 深处
    st.blk = P[0]; st.liq = 'water'; st.u = P[1];
    if (P[2] === 1 && st.G.A == null) { st.G.A = BLK.A.G; st.Gp = true; }   // 本问起始：A 的重力已测
    if (i === 0 && st.Gp) { st.G.A = null; st.Gp = false; }   // 第 1 问：A 的重力要自己测（除非已经记录过）
    if (P[2] === 2) st.G.B = null;                          // 第 5 问：B 的重力还没测
    if (P[2] === 2 && st.G.B == null) { var gB = st.rows.filter(function (r) { return r.air && r.blk === 'B'; })[0]; if (gB) st.G.B = gB.F; }   // 已经记过 B 的重力，就不用再测一次
    st.Fd = Ftrue(); st.vd = 0; st.still = 1; changed();
    var k = recKey(); if (st.rows.some(function (r) { return r.key === k; })) st.recVer = st.ver;   // 本问起始器材和已记过的某一组相同：不改动就不能再记（改过再回来可以）
    if (K.revealed()) K.invalidate();
  }

  /* ── 数据页 ── */
  var COLS = ['#2563EB', '#FE752D', '#B478FF', '#1B7A50', '#56677D', '#C1361A'];
  function graph() {
    var W = 560, Hh = 430, x0 = 64, y0 = 370, x1 = 540, y1 = 30, X = function (v) { return x0 + v / 14 * (x1 - x0); }, Y = function (v) { return y0 - v / 5 * (y0 - y1); }, gs = '';
    for (var a = 0; a <= 14; a++) { var xx = X(a); gs += '<line x1="' + xx + '" y1="' + y1 + '" x2="' + xx + '" y2="' + y0 + '" stroke="' + (a % 2 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (a % 2 === 0) gs += '<text x="' + xx + '" y="' + (y0 + 24) + '" text-anchor="middle" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + a + '</text>'; }
    for (var b = 0; b <= 5; b += 0.5) { var yy = Y(b); gs += '<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="' + (b % 1 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (b % 1 === 0) gs += '<text x="' + (x0 - 10) + '" y="' + (yy + 6) + '" text-anchor="end" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + b + '</text>'; }
    gs += '<path d="M' + x0 + ' ' + y1 + 'V' + y0 + 'H' + x1 + '" fill="none" stroke="#1E3A5F" stroke-width="2.5"/>';
    gs += '<text x="' + (x0 - 4) + '" y="' + (y1 - 10) + '" font-size="18" fill="#1E3A5F">F/N</text><text x="' + x1 + '" y="' + (y0 + 46) + '" text-anchor="end" font-size="18" fill="#1E3A5F">h/cm</text>';
    var series = {}, ci = 0;
    st.rows.forEach(function (r) { if (r.air) return; var k = r.blk + '|' + r.liq; (series[k] = series[k] || []).push(r); });
    Object.keys(series).forEach(function (k) {
      var R = series[k].slice(), blk = k.split('|')[0], col = COLS[ci % COLS.length];
      var gRow = st.rows.filter(function (r) { return r.air && r.blk === blk; })[0];
      if (gRow) R.push({ h: 0, F: gRow.F });
      R.sort(function (p, q) { return p.h - q.h; });
      if (R.length > 1) gs += '<polyline points="' + R.map(function (r) { return X(r.h) + ',' + Y(r.F); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.5"/>';
      R.forEach(function (r) { gs += '<circle cx="' + X(r.h) + '" cy="' + Y(r.F) + '" r="6" fill="#fff" stroke="' + col + '" stroke-width="3"/>'; });
      gs += '<circle cx="' + (x0 + 24 + ci * 150) + '" cy="' + (y0 - 18) + '" r="6" fill="#fff" stroke="' + col + '" stroke-width="3"/><text x="' + (x0 + 36 + ci * 150) + '" y="' + (y0 - 12) + '" font-size="18" fill="#1E3A5F">' + BLK[blk].name + '·' + LIQ[k.split('|')[1]].name + '</text>';
      ci++;
    });
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" style="flex:1;max-height:560px;border:2px solid #C3CEDC;border-radius:12px;background:#fff">' + gs + '</svg>';
  }
  function renderData(K) {
    var c = K.calcShown();
    var tb = '<table class="rec"><thead><tr><th style="width:15%">次数</th><th>液体</th><th>' + NM() + '</th><th>浸入深度 <span class="m">h</span>/cm</th><th>测力计示数 <span class="m">F</span>/N</th><th>浮力 <span style="white-space:nowrap"><span class="m">F</span>浮/N</span></th></tr></thead><tbody>' +
      (st.rows.length ? st.rows.map(function (r, k) {
        var fb = r.air ? '—' : (r.G == null ? '—' : c ? f1(r.G - r.F) : '?');
        return '<tr><td>' + (k + 1) + (r.air ? '<br><small style="color:#56677D">测 G</small>' : '') + '</td><td>' + (r.air ? '空气' : LIQ[r.liq].name) + '</td><td>' + r.blk + '</td><td class="n">' + f1(r.h) + '</td><td class="n">' + f1(r.F) + '</td><td class="n' + (!r.air && r.G != null ? (c ? ' calc' : '') : ' dim') + '">' + fb + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="dim" style="text-align:center">还没有记录</td></tr>') + '</tbody></table>';
    var gl = Object.keys(BLK).map(function (k) { return BLK[k].name + '：<span class="m">G</span> = ' + (st.G[k] == null ? '未测' : f1(st.G[k]) + ' N'); }).join('；');
    return '<div class="dvh"><h2>记录表</h2><button class="act2" id="g-tg" style="font-size:17px">' + (st.graph ? '收起图像' : '展开图像拓展') + '</button></div>' +
      (st.graph ? '<div style="display:flex;gap:20px;align-items:flex-start"><div style="flex:0 0 46%;max-height:620px;overflow:auto">' + tb + '</div>' + graph() + '</div>' : '<div style="max-height:700px;overflow:auto">' + tb + '</div>') +
      '<p class="tip">' + gl + '。<span class="m">F</span>浮 = <span class="m">G</span> − <span class="m">F</span>' + (c ? '' : '：先自己算，再点右侧「显示计算」') + '。</p>';
  }

  /* ── 定制：生活情境卡（简图 + 一句说明，联系浮力）── */
  var AR = function (x, y1, y2, c, t, tx) {   // 竖直箭头 + 文字
    var up = y2 < y1, hd = up ? 'M' + (x - 6) + ' ' + (y2 + 9) + ' L' + x + ' ' + y2 + ' L' + (x + 6) + ' ' + (y2 + 9) : 'M' + (x - 6) + ' ' + (y2 - 9) + ' L' + x + ' ' + y2 + ' L' + (x + 6) + ' ' + (y2 - 9);
    return '<path d="M' + x + ' ' + y1 + ' L' + x + ' ' + y2 + ' ' + hd + '" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="' + (x + (tx || 9)) + '" y="' + ((y1 + y2) / 2 + 5) + '" font-size="15" font-weight="700" fill="' + c + '">' + t + '</text>';
  };
  var INK = '#1E3A5F', ACC = '#2563EB', WAT = '#CFE6F7';
  var SCENES = {
    ship: { title: '轮船', text: '钢铁做成空心的船体，浸在水里的体积很大，受到的浮力足以托起整艘船——浮力与浸在液体中的体积有关。',
      svg: '<svg viewBox="0 0 300 116"><rect x="0" y="66" width="300" height="50" fill="' + WAT + '"/><path d="M0 66 Q20 61 40 66 T80 66 T120 66 T160 66 T200 66 T240 66 T280 66 T320 66" fill="none" stroke="' + ACC + '" stroke-width="2"/>' +
        '<path d="M46 52 L246 52 L226 86 L66 86 Z" fill="#fff" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M58 66 L234 66" stroke="' + INK + '" stroke-width="1.5" stroke-dasharray="5 4"/>' +
        '<rect x="92" y="30" width="78" height="22" rx="3" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><rect x="180" y="16" width="16" height="36" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><path d="M104 36 h12 M126 36 h12 M148 36 h12" stroke="' + ACC + '" stroke-width="4"/>' +
        AR(146, 114, 89, ACC, 'F浮') + AR(262, 30, 62, INK, 'G') + '</svg>' },
    sub: { title: '潜水艇', text: '潜水艇浸没在水下航行，下潜得更深时浮力变不变？它靠水舱进水、排水改变自身重力来上浮和下沉。',
      svg: '<svg viewBox="0 0 300 116"><rect x="0" y="8" width="300" height="108" fill="' + WAT + '"/><path d="M0 8 Q20 3 40 8 T80 8 T120 8 T160 8 T200 8 T240 8 T280 8 T320 8" fill="none" stroke="' + ACC + '" stroke-width="2"/>' +
        '<ellipse cx="150" cy="66" rx="92" ry="20" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><rect x="128" y="34" width="34" height="14" rx="4" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><path d="M152 34 V22 H164" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M96 70 h108" stroke="' + INK + '" stroke-width="1.5"/><rect x="100" y="71" width="100" height="11" fill="' + ACC + '" opacity=".35"/><text x="150" y="98" text-anchor="middle" font-size="13" fill="' + INK + '">水舱（进水下沉、排水上浮）</text>' +
        '<path d="M242 66 l14 -10 v20 z" fill="#fff" stroke="' + INK + '" stroke-width="2"/>' + AR(34, 88, 44, ACC, 'F浮', -30) + AR(282, 44, 88, INK, 'G', -18) + '</svg>' },
    balloon: { title: '热气球', text: '空气也会对浸在其中的物体产生浮力。球内空气加热后变轻，浮力大于总重力时，热气球就升空。',
      svg: '<svg viewBox="0 0 300 116"><path d="M150 6 C112 6 98 34 104 54 C110 72 132 80 138 88 L162 88 C168 80 190 72 196 54 C202 34 188 6 150 6 Z" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M150 6 C136 20 132 60 142 88 M150 6 C164 20 168 60 158 88" fill="none" stroke="' + ACC + '" stroke-width="2"/><path d="M140 88 L136 100 M160 88 L164 100" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="132" y="100" width="36" height="14" rx="2" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><path d="M150 96 c-5 -6 0 -10 0 -14 c0 4 5 8 0 14 z" fill="#FE752D"/>' +
        '<path d="M30 30 q14 -8 28 0 q10 -10 22 0" fill="none" stroke="#9DB8E8" stroke-width="2"/><path d="M224 20 q12 -7 24 0 q9 -8 18 0" fill="none" stroke="#9DB8E8" stroke-width="2"/>' +
        AR(78, 96, 46, ACC, 'F浮') + AR(222, 60, 104, INK, 'G') + '</svg>' }
  };
  function showCard() { var c = SCENES[DIY.scene]; K.card(c ? { id: DIY.scene, title: c.title, svg: c.svg, text: c.text } : null); }
  function noteText() { if (st._note) st._note.textContent = '上下拖' + NM() + '或测力计，改变浸入深度；拖空白处转视角'; }
  /* 换外形：重建两块被测物体，名称（面板、提示、记录表、题目措辞）跟着换；体积、重力、读数不变 */
  function setShape(v) {
    if (!SHAPE[v] || v === DIY.shape && blocks.A) return;
    DIY.shape = v; setNames();
    ['A', 'B'].forEach(function (k) { if (blocks[k]) V.scene.remove(blocks[k]); blocks[k] = makeBlock(k); V.scene.add(blocks[k]); });
    ctrls(); noteText(); last = ''; pose(); K.refreshQ(); K.refreshData();
  }
  var DIY_ITEMS = [
    { id: 'shape', label: '金属块形状', type: 'seg', options: [['metal', '长方体'], ['stone', '不规则'], ['clay', '圆角形']], def: CFG.shape, apply: setShape, tip: '体积、重力都相同，只是形状不同：可以顺带讨论“浮力与物体形状无关”' },
    { id: 'liquid', label: '液体颜色', type: 'seg', options: [['clear', '清水'], ['blue', '淡蓝'], ['green', '淡绿']], def: CFG.liquid, apply: function (v) { if (TINT[v]) { DIY.liquid = v; setTint(); } } },
    { id: 'scene', label: '情境小卡片', type: 'seg', options: [['none', '无'], ['ship', '轮船'], ['balloon', '热气球']], def: CFG.scene, apply: function (v) { DIY.scene = v; showCard(); } }
  ];

  window.__exp = { st: st, V: function () { return V; }, block: function () { return blocks[st.blk]; }, scale: function () { return scale; }, Ftrue: Ftrue, geo: g };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'F', name: '测力计示数 <span class="m">F</span>', unit: 'N' }, { id: 'h', name: '浸入深度 <span class="m">h</span>', unit: 'cm' }],
    calc: { teach: '显示计算' },
    diy: DIY_ITEMS,
    qText: function (t) { return t; },   // 换形状后仍叫“金属块”，题目不变
    init: function (k) {
      K = k; ctrls(); build();
      st._note = K.el('<p class="lk-note"></p>'); noteText();
      document.addEventListener('click', function (e) { if (e.target && e.target.id === 'g-tg') { st.graph = !st.graph; K.refreshData(); } });
    },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function (on) { st.revAt = on ? { F: readF(), h: hRead(), k: st.blk + st.liq } : null; last = ''; },
    record: function () {
      if (!(valid() && !dup() && K.revealed())) return;
      var air = inAir(), F = readF();
      if (air) { st.G[st.blk] = F; if (st.blk === 'A') st.Gp = false; }
      st.rows.push({ air: air, blk: st.blk, liq: st.liq, h: air ? 0 : hRead(), F: F, G: air ? null : st.G[st.blk], key: recKey() });
      st.recVer = st.ver; st.justRec = st.rows.length; last = '';
    },
    clear: function () { st.rows = []; st.G = { A: null, B: null }; st.Gp = false; st.justRec = null; last = ''; },
    renderData: renderData
  });
})();
