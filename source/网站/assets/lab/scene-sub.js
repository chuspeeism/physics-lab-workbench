/* 13 生活情境：潜水艇（人教版八下 第十章 第 3 节「物体的浮沉条件及应用」）
   画面：一段剖开的海（水面有波浪、越深越暗、海底有沙和石头、小鱼、海草），一艘潜水艇（回转体艇身、指挥塔、尾舵、螺旋桨），
         前、后两个水舱剖开，能看见舱里的水有多少。
   操作：按住「注水」「排水」（点一下 = 10 吨），或拖滑杆；「调到悬浮」把舱内水调到 500 吨、让艇停在水中间（约 2.4 秒）；「显示受力」开关两个力的箭头。
   物理（简化，按课本）：
     艇的体积 V = 2000 m³ 不变（含水舱），空艇质量 m艇 = 1500 吨，水舱最多装 700 吨水；ρ水 = 1.0×10³ kg/m³（海水也按这个算），g = 10 N/kg。
     重力 G = (m艇 + m水) g：1.50×10⁷ N（空舱）～ 2.20×10⁷ N（装满）。
     浮力 F浮 = ρ水 g V排：全部浸没时 V排 = V，F浮 = 2.00×10⁷ N，不随深度变；
       露出水面时 V排 = 水面以下那部分的体积（按画出来的艇身、指挥塔逐段算出来），漂浮时 F浮 = G，自动找到吃水深度。
     舱内水 = 500 吨时 G = F浮，浸没后可以悬浮；少于 500 吨上浮、最后漂浮；多于 500 吨下沉、最后沉到海底（海底的支持力 = G − F浮）。
     运动：合力 (F浮 − G) 推着艇上下动，水的阻力让它平稳地加速、减速（速度、时间是示意，不按真实比例）。
   受力箭头：两个力都画在艇的中间，长度 ∝ 力的大小（1×10⁷ N 画 4.5 个单位）。 */
LabScene.register('sub', {
  done: true,
  no: '13', name: '潜水艇',
  build: function (ctx) {
    var T = ctx.T, scene = ctx.scene;
    /* ── 物理数据 ── */
    var RHO = 1.0e3, GK = 10, VOL = 2000, M0 = 1500, WMAX = 700, WHOV = 500, PUMP = 120;   // 质量、舱内水单位：吨；水泵每秒 120 吨（示意）
    var FFULL = RHO * GK * VOL;                                                            // 全部浸没时的浮力 2.0×10⁷ N
    function Gof(w) { return (M0 + w) * 1000 * GK; }
    /* ── 尺寸（场景单位，示意，不按比例） ── */
    var R = 4.6, XN = 25, XB = 15, XS = -12, XE = -25;             // 艇身：x 从艇尾 −25 到艇首 25，中段是半径 4.6 的圆柱
    var TA = [-11.5, -3.5], TF = [7.5, 14.8];                       // 后水舱、前水舱（剖开）
    var SX0 = -1.0, SX1 = 6.0, SH = 3.8;                            // 指挥塔：前后范围、高出艇背
    var FX = -2.25;                                                 // 受力箭头画在这里（艇的中间）
    var HX = 65, HZ = 16, BED = -36, BOT = -54;                     // 海：左右 ±65、前后 ±16、海底平均 −36
    var SUBX = -2, RI = R - 0.22, YBOT = BED + R + 0.1;             // 艇的位置；舱内壁半径；沉底时艇心高度
    var FS = 4.5 / 1e7;                                             // 箭头：每 1×10⁷ N 画 4.5
    var D2R = Math.PI / 180;

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function sst(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    var seed = 20261121;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function tex(w, h, draw, rep) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c); t.anisotropy = 8; if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
      if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; }
      return t;
    }
    function std(o) { return new T.MeshStandardMaterial(o); }
    function mesh(g, m, sh) { var x = new T.Mesh(g, m); if (sh !== false) { x.castShadow = true; x.receiveShadow = true; } return x; }
    function tube(pts, r, m, seg) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg || Math.max(8, pts.length * 3), r, 8, false), m); }

    /* ════ 艇身外形与「水下体积」表 ════ */
    function hullR(x) {
      if (x >= XN) return 0;
      if (x > XB) { var t = (x - XB) / (XN - XB); return R * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5); }
      if (x >= XS) return R;
      var u = Math.min(1, (XS - x) / (XS - XE)); return 0.6 + (R - 0.6) * Math.pow(Math.max(0, 1 - u * u), 0.85);
    }
    // 指挥塔平面：后面尖、前面圆
    var SL = SX1 - SX0, SW = 1.15;
    function sailShape() {
      var s = new T.Shape(); s.moveTo(SX0, 0);
      s.quadraticCurveTo(SX0 + SL * 0.35, SW, SX0 + SL * 0.7, SW); s.quadraticCurveTo(SX1, SW, SX1, 0);
      s.quadraticCurveTo(SX1, -SW, SX0 + SL * 0.7, -SW); s.quadraticCurveTo(SX0 + SL * 0.35, -SW, SX0, 0); return s;
    }
    var SAILA = Math.abs(T.ShapeUtils.area(sailShape().getPoints(24)));
    function segA(r, s) { if (s <= 0) return 0; if (s >= 2 * r) return Math.PI * r * r; var d = r - s; return r * r * Math.acos(d / r) - d * Math.sqrt(r * r - d * d); }
    function subVol(yc) {   // 艇心在 yc 时，水面（y = 0）以下的体积
      var v = 0, dx = 0.1;
      for (var x = XE + dx / 2; x < XN; x += dx) { var r = hullR(x); v += segA(r, r - yc) * dx; }
      return v + SAILA * clamp(-(yc + R), 0, SH);
    }
    var VM = subVol(-100), YT0 = -(R + SH), YT1 = R, TSTEP = 0.05, FR = [];
    for (var yy = YT0; yy <= YT1 + 1e-9; yy += TSTEP) FR.push(subVol(yy) / VM);
    function frac(y) {   // 排开水的体积占全部体积的几分之几
      if (y <= YT0) return 1; if (y >= YT1) return 0;
      var k = (y - YT0) / TSTEP, i = Math.floor(k), f = k - i; return FR[i] + (FR[Math.min(FR.length - 1, i + 1)] - FR[i]) * f;
    }
    function yFloat(G) {  // 漂浮时 F浮 = G 的位置（G ≥ 浸没浮力时返回 null）
      var need = G / FFULL; if (need >= 1) return null;
      var a = YT0, b = YT1; for (var i = 0; i < 40; i++) { var m = (a + b) / 2; if (frac(m) > need) a = m; else b = m; } return (a + b) / 2;
    }

    /* ════ 海：背景、水体、海底 ════ */
    function wv(x, z, t) { return 0.22 * Math.sin(0.18 * x + 1.1 * t) + 0.12 * Math.sin(0.37 * x - 0.23 * z + 1.7 * t) + 0.07 * Math.sin(0.11 * z + 0.9 * t + 0.05 * x); }
    var world = new T.Group(); scene.add(world);
    // 天空（远处有一线海岸和几朵云）
    var skyTex = tex(1024, 400, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8FC6EC'); gr.addColorStop(0.75, '#CBE6F7'); gr.addColorStop(1, '#E4F2FB');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      function cloud(cx, cy, s) { g.fillStyle = 'rgba(255,255,255,.85)'; [[0, 0, 1], [-.9, .25, .7], [.9, .3, .75], [-.4, -.35, .7], [.45, -.3, .65]].forEach(function (p) { g.beginPath(); g.ellipse(cx + p[0] * 40 * s, cy + p[1] * 26 * s, 46 * s * p[2], 30 * s * p[2], 0, 0, 7); g.fill(); }); }
      cloud(170, 120, 1.1); cloud(560, 80, 0.8); cloud(860, 150, 1.0);
      g.fillStyle = '#9DBFD2'; g.beginPath(); g.moveTo(600, h); g.quadraticCurveTo(680, h - 34, 760, h - 22); g.quadraticCurveTo(840, h - 40, 960, h - 10); g.lineTo(960, h); g.fill();
    });
    var sky = mesh(new T.PlaneGeometry(2 * HX, 40), new T.MeshBasicMaterial({ map: skyTex, fog: false }), false); sky.position.set(0, 20, -HZ - 0.4); world.add(sky);
    // 后壁：越深越暗
    var deepTex = tex(8, 512, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#73BCE4'); gr.addColorStop(0.25, '#3E8DC4'); gr.addColorStop(0.7, '#1B5A93'); gr.addColorStop(1, '#0F3A68'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var back = mesh(new T.PlaneGeometry(2 * HX, 0.35 - BOT), new T.MeshBasicMaterial({ map: deepTex }), false); back.position.set(0, (0.35 + BOT) / 2, -HZ); world.add(back);
    // 光线（从水面斜照下来，轻轻闪动）
    var rayTex = tex(64, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; var gx = g.createLinearGradient(0, 0, w, 0); g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(.5, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect(0, 0, w, h); });
    var rays = [];
    [[-44, -13, 7, .22], [-18, -12, 5, .3], [20, -13, 8, .2], [46, -11, 5, .26]].forEach(function (p, i) {
      var m = mesh(new T.PlaneGeometry(p[2], 34), new T.MeshBasicMaterial({ map: rayTex, color: 0xCDEBFF, transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false }), false);
      m.position.set(p[0], -17, p[1]); m.rotation.z = p[3]; m.renderOrder = 1; m.userData.ph = i * 1.7; world.add(m); rays.push(m);
    });
    // 海底：沙地起伏，艇下方平一些
    function bedY(x, z) {
      var d = 0.9 * Math.sin(x * 0.11 + 0.6) + 0.55 * Math.sin(x * 0.27 + z * 0.18 + 1.3) + 0.35 * Math.sin(z * 0.35 - x * 0.05) + 0.12 * Math.sin(x * 1.3 + z * 0.7);
      var k = (1 - sst(26, 36, Math.abs(x - SUBX))) * (1 - sst(7, 13, Math.abs(z)));
      return BED + d * (1 - k) + k * 0.06 * Math.sin(x * 1.1 + z * 0.4) + 2.6 * sst(42, 66, Math.abs(x)) + 1.2 * sst(4, 16, -z);
    }
    var sandTex = tex(512, 512, function (g, w, h) {
      g.fillStyle = '#D8C59C'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { var c = 150 + rnd() * 90 | 0; g.fillStyle = 'rgba(' + c + ',' + (c - 18) + ',' + (c - 55) + ',' + (.25 + rnd() * .35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      g.strokeStyle = 'rgba(160,135,90,.28)'; g.lineWidth = 3;
      for (var j = 0; j < 14; j++) { g.beginPath(); var y0 = j * h / 14 + rnd() * 8; g.moveTo(0, y0); for (var x = 0; x <= w; x += 16) g.lineTo(x, y0 + 6 * Math.sin(x * 0.03 + j)); g.stroke(); }
    }, true); sandTex.repeat.set(7, 2);
    var bedG = new T.PlaneGeometry(2 * HX, 2 * HZ, 130, 32); bedG.rotateX(-Math.PI / 2);
    (function () { var p = bedG.attributes.position; for (var i = 0; i < p.count; i++) p.setY(i, bedY(p.getX(i), p.getZ(i))); bedG.computeVertexNormals(); })();
    var bed = mesh(bedG, std({ map: sandTex, roughness: .95, metalness: 0 })); bed.castShadow = false; world.add(bed);
    // 海底的剖面（前面、左右两侧）：一层一层的沙和泥
    var strataTex = tex(256, 256, function (g, w, h) {
      var cols = ['#CDB78C', '#B9A178', '#C8B288', '#A88F67', '#BCA57D', '#9C8460'];
      for (var i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect(0, i * h / 6, w, h / 6 + 1); }
      for (var q = 0; q < 30; q++) { g.fillStyle = 'rgba(' + (110 + rnd() * 40 | 0) + ',100,88,.5)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 5, 2 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
    }, true); strataTex.repeat.set(1 / 22, 1 / 13);
    var strataM = std({ map: strataTex, roughness: 1 });
    function cutFace(n, fx) {   // fx(i) → [横坐标, 海底高度]
      var s = new T.Shape(), a = fx(0); s.moveTo(a[0], BOT); for (var i = 0; i <= n; i++) { var p = fx(i); s.lineTo(p[0], p[1]); } s.lineTo(fx(n)[0], BOT); s.lineTo(a[0], BOT);
      return mesh(new T.ShapeGeometry(s), strataM, false);
    }
    var cf = cutFace(130, function (i) { var x = -HX + i; return [x, bedY(x, HZ)]; }); cf.position.z = HZ + 0.02; world.add(cf);
    var cl = cutFace(32, function (i) { var z = -HZ + i; return [z, bedY(-HX, z)]; }); cl.rotation.y = -Math.PI / 2; cl.position.x = -HX - 0.02; world.add(cl);
    var cr = cutFace(32, function (i) { var z = HZ - i; return [-z, bedY(HX, z)]; }); cr.rotation.y = Math.PI / 2; cr.position.x = HX + 0.02; world.add(cr);
    // 水面（波浪）与前、左右三面“玻璃”上的水色
    var topG = new T.PlaneGeometry(2 * HX, 2 * HZ, 96, 20); topG.rotateX(-Math.PI / 2);
    var topM = std({ color: 0x86CBEE, transparent: true, opacity: .5, roughness: .1, metalness: .1, side: T.DoubleSide, depthWrite: false });
    var top = mesh(topG, topM, false); top.renderOrder = 3; world.add(top);
    var faceTex = tex(8, 512, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,195,235,.20)'); gr.addColorStop(.5, 'rgba(40,110,175,.34)'); gr.addColorStop(1, 'rgba(10,45,95,.52)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var faceM = new T.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false });
    function waterFace(len, n) { var g = new T.PlaneGeometry(len, -BOT, n, 1); g.translate(0, BOT / 2, 0); var m = mesh(g, faceM, false); m.renderOrder = 4; world.add(m); return m; }
    var fFront = waterFace(2 * HX, 96); fFront.position.z = HZ;
    var fLeft = waterFace(2 * HZ, 20); fLeft.rotation.y = -Math.PI / 2; fLeft.position.x = -HX;
    var fRight = waterFace(2 * HZ, 20); fRight.rotation.y = Math.PI / 2; fRight.position.x = HX;
    var lineG = new T.BufferGeometry(); lineG.setAttribute('position', new T.BufferAttribute(new Float32Array(97 * 3), 3));
    var surfLine = new T.Line(lineG, new T.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: .85 })); surfLine.renderOrder = 5; world.add(surfLine);
    function waves(t) {
      var p = topG.attributes.position; for (var i = 0; i < p.count; i++) p.setY(i, wv(p.getX(i), p.getZ(i), t)); p.needsUpdate = true; topG.computeVertexNormals();
      [[fFront, function (x) { return [x, HZ]; }], [fLeft, function (x) { return [-HX, -x]; }], [fRight, function (x) { return [HX, x]; }]].forEach(function (f) {
        var q = f[0].geometry.attributes.position, n = q.count / 2;
        for (var j = 0; j < n; j++) { var c = f[1](q.getX(j)); q.setY(j, wv(c[0], c[1], t)); } q.needsUpdate = true;
      });
      var l = lineG.attributes.position; for (var k = 0; k <= 96; k++) { var x = -HX + k * 2 * HX / 96; l.setXYZ(k, x, wv(x, HZ, t) + 0.02, HZ + 0.03); } l.needsUpdate = true;
    }
    // 水深尺（贴在前面左边）
    var rulerTex = tex(160, 1024, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(56, 0, 10, h);
      g.font = 'bold 34px Bahnschrift, Arial'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (var d = 0; d <= 30; d += 1) { var y = 8 + d / 30 * (h - 16), big = d % 10 === 0; g.fillRect(66, y - (big ? 3 : 1.5), big ? 38 : d % 5 === 0 ? 26 : 14, big ? 6 : 3); if (big && d) { g.fillText(d + ' m', 156, y + 22); } }
    });
    var ruler = mesh(new T.PlaneGeometry(4.2, 30 * 1024 / 1008), new T.MeshBasicMaterial({ map: rulerTex, transparent: true, depthWrite: false }), false);
    ruler.position.set(-52, -15, HZ + 0.06); ruler.renderOrder = 6; world.add(ruler);

    /* ── 石头、海草、海星 ── */
    function rock(r, col) {
      var g = new T.IcosahedronGeometry(r, 2), p = g.attributes.position, v = new T.Vector3(), o = [rnd() * 9, rnd() * 9, rnd() * 9];
      for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var n = 1 + 0.18 * Math.sin(v.x * 1.7 / r + o[0]) * Math.sin(v.y * 2.1 / r + o[1]) + 0.1 * Math.sin(v.z * 3.3 / r + o[2]); v.multiplyScalar(n); v.y *= 0.62; p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals(); return mesh(g, std({ color: col, roughness: .9, metalness: .02 }));
    }
    [[-50, -8, 3.2], [-44, 6, 1.6], [-38, -11, 2.2], [36, -9, 2.8], [41, 4, 1.4], [52, -3, 3.6], [-58, 3, 2.0], [57, 9, 1.5], [30, -12, 1.2]].forEach(function (p, i) {
      var m = rock(p[2], [0x8A8378, 0x6F7672, 0x9A8F80, 0x777068][i % 4]); m.position.set(p[0], bedY(p[0], p[1]) + p[2] * 0.25, p[1]); m.rotation.y = rnd() * 6; world.add(m);
    });
    var weeds = [];
    [[-54, -4, 9], [-52, -1, 7], [-47, -6, 11], [-41, -9, 8], [-35, -3, 6], [-28, -12, 9], [33, -6, 10], [38, -1, 7], [44, -8, 12], [49, 2, 8], [55, -6, 9], [26, -13, 7], [-60, -10, 8], [60, -11, 10]].forEach(function (p, i) {
      var g = new T.PlaneGeometry(0.7, p[2], 1, 14); g.translate(0, p[2] / 2, 0);
      var m = mesh(g, std({ color: [0x3E8E4F, 0x2F7A45, 0x5A9E3F, 0x6B8E2F][i % 4], roughness: .7, side: T.DoubleSide }), false); m.castShadow = true;
      m.position.set(p[0], bedY(p[0], p[1]) - 0.2, p[1]); m.rotation.y = rnd() * 3; m.userData = { h: p[2], ph: rnd() * 6, base: g.attributes.position.array.slice() }; world.add(m); weeds.push(m);
    });
    function starfish(x, z, col) {
      var s = new T.Shape(); for (var i = 0; i <= 10; i++) { var a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.42 : 1.05; if (i) s.lineTo(r * Math.cos(a), r * Math.sin(a)); else s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
      var g = new T.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.16, bevelSegments: 3 }); g.rotateX(-Math.PI / 2);
      var m = mesh(g, std({ color: col, roughness: .8 })); m.position.set(x, bedY(x, z) + 0.12, z); m.rotation.y = rnd() * 6; world.add(m);
    }
    starfish(-31, 5, 0xE76F51); starfish(29, 6, 0xF4A261);

    /* ── 小鱼 ── */
    var fishes = [];
    function makeFish(col, s) {
      var gp = new T.Group(), pts = [];
      for (var i = 0; i <= 16; i++) { var u = i / 16; pts.push(new T.Vector2(0.42 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.9) + 0.001, (u - 0.5) * 2.4)); }
      var bodyG = new T.LatheGeometry(pts, 18); bodyG.rotateZ(-Math.PI / 2); bodyG.scale(1, 1, 0.55);
      var stripe = tex(128, 64, function (g, w, h) { g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = 'rgba(30,30,40,.3)'; [0.38, 0.6].forEach(function (v) { g.fillRect(v * w, 0, 7, h * .55); }); });
      var bm = std({ color: 0xffffff, map: stripe, roughness: .45, metalness: .15 });
      var body = mesh(bodyG, bm); gp.add(body);
      var ts = new T.Shape(); ts.moveTo(0, 0); ts.quadraticCurveTo(-0.5, 0.55, -0.85, 0.7); ts.quadraticCurveTo(-0.6, 0, -0.85, -0.7); ts.quadraticCurveTo(-0.5, -0.55, 0, 0);
      var tail = new T.Group(), tm = mesh(new T.ShapeGeometry(ts), std({ color: col, roughness: .6, side: T.DoubleSide })); tail.add(tm); tail.position.x = -1.1; gp.add(tail);
      var ds = new T.Shape(); ds.moveTo(-0.5, 0); ds.quadraticCurveTo(-0.1, 0.55, 0.35, 0); ds.lineTo(-0.5, 0);
      var dorsal = mesh(new T.ShapeGeometry(ds), tm.material); dorsal.position.y = 0.36; gp.add(dorsal);
      [-1, 1].forEach(function (k) { var e = mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshBasicMaterial({ color: 0x111111 }), false); e.position.set(0.82, 0.08, k * 0.17); gp.add(e); });
      gp.scale.setScalar(s); gp.userData = { tail: tail }; return gp;
    }
    [[0xF4A261, -30, -20, -9, 1, 1.0], [0xE9C46A, -26, -21.5, -10.5, 1, 0.9], [0xF4A261, -33, -22.5, -11, 1, 0.95], [0x8FB8D6, 22, -27, -8, -1, 1.2], [0xE76F51, 40, -12, -12, -1, 0.85], [0x9BC7A3, -10, -29, -12.5, 1, 1.0], [0xE9C46A, 10, -8.5, -13, -1, 0.8]].forEach(function (p, i) {
      var f = makeFish(p[0], p[5] * 1.5); f.position.set(p[1], p[2], p[3]); f.userData.dir = p[4]; f.userData.hd = p[4] > 0 ? 0 : Math.PI; f.rotation.y = f.userData.hd; f.userData.sp = 2.2 + rnd() * 1.2; f.userData.ph = rnd() * 6; f.userData.y0 = p[2]; world.add(f); fishes.push(f);
    });

    /* ════ 潜水艇 ════ */
    var sub = new T.Group(); sub.position.x = SUBX; scene.add(sub);
    var axis = new T.Group(); axis.rotation.z = -Math.PI / 2; sub.add(axis);   // 回转体的轴从 y 转到 x
    var tileTex = tex(256, 256, function (g, w, h) {
      g.fillStyle = '#3A4550'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 600; i++) { g.fillStyle = 'rgba(255,255,255,' + rnd() * .05 + ')'; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
      g.fillStyle = 'rgba(15,20,26,.55)'; for (var k = 0; k < 4; k++) { g.fillRect(0, k * h / 4, w, 3); g.fillRect(k * w / 4 + (k % 2) * 0, 0, 3, h); }
    }, true);
    function hullMat(rx, ry) { var t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return std({ color: 0xffffff, map: t, roughness: .62, metalness: .22 }); }
    var innerM = std({ color: 0xD6DEE6, roughness: .8, metalness: .05, side: T.BackSide });
    var cutM = std({ color: 0xE4572E, roughness: .5 });
    function prof(a, b, n, rf, bow) {
      var pts = [];
      if (a === XE) pts.push(new T.Vector2(0.001, XE));
      for (var i = 0; i <= n; i++) { var u = i / n, x = bow ? a + (b - a) * Math.sin(u * Math.PI / 2) : a + (b - a) * u; pts.push(new T.Vector2(Math.max(0.001, rf(x)), x)); }
      return pts;
    }
    function hullPiece(a, b, n, cut) {
      var bow = b === XN, ps = cut ? 75 * D2R : 0, pl = cut ? 215 * D2R : Math.PI * 2, seg = cut ? 44 : 64;
      var m = mesh(new T.LatheGeometry(prof(a, b, n, hullR, bow), seg, ps, pl), hullMat(pl / (Math.PI * 2) * 9, (b - a) / 3.2)); axis.add(m);
      if (cut) axis.add(mesh(new T.LatheGeometry(prof(a, b, 2, function () { return RI; }), seg, ps, pl), innerM, false));
    }
    hullPiece(XE, TA[0], 30, false); hullPiece(TA[0], TA[1], 2, true); hullPiece(TA[1], TF[0], 4, false); hullPiece(TF[0], TF[1], 2, true); hullPiece(TF[1], XN, 34, false);
    function P(x, phi, r) { return new T.Vector3(x, -r * Math.sin(phi), r * Math.cos(phi)); }
    var tanks = [];
    [TA, TF].forEach(function (tk) {
      var a = tk[0], b = tk[1], pa = 75 * D2R, pb = -70 * D2R, i;
      // 剖切面（橙红色的边）
      [pa, pb].forEach(function (ph) { sub.add(tube([P(a, ph, R - 0.11), P(b, ph, R - 0.11)], 0.13, cutM, 4)); });
      [a, b].forEach(function (x) { var pts = []; for (i = 0; i <= 24; i++) pts.push(P(x, pb + (pa - pb) * i / 24, R - 0.11)); sub.add(tube(pts, 0.13, cutM, 48)); });
      // 两头的隔板（带人孔圈）、舱里的肋骨
      [a + 0.04, b - 0.04].forEach(function (x, k) {
        var d = mesh(new T.CircleGeometry(RI, 48), std({ color: 0xBCC8D4, roughness: .7, side: T.DoubleSide }), false); d.rotation.y = Math.PI / 2; d.position.x = x; sub.add(d);
        var ring = mesh(new T.TorusGeometry(1.1, 0.12, 8, 28), std({ color: 0x8C99A8, metalness: .5, roughness: .4 }), false); ring.rotation.y = Math.PI / 2; ring.position.set(x + (k ? -0.08 : 0.08), -0.6, -1.2); sub.add(ring);
      });
      var ribM = std({ color: 0xAEBAC6, roughness: .6, metalness: .2 });
      for (var x = a + 1.6; x < b - 0.8; x += 1.6) { var pts = []; for (i = 0; i <= 30; i++) pts.push(P(x, pa + (360 * D2R - pa + pb) * i / 30, RI - 0.04)); sub.add(tube(pts, 0.07, ribM, 60)); }
      // 高压空气管（铜色）伸进舱里
      var cu = std({ color: 0xC07A45, metalness: .75, roughness: .32 });
      var px = tk === TA ? b - 0.04 : a + 0.04, dir = tk === TA ? -1 : 1, pipe = [P(px, -125 * D2R, RI - 0.45), P(px + dir * 2.2, -125 * D2R, RI - 0.45), P(px + dir * 2.9, -112 * D2R, RI - 0.9), P(px + dir * 3.1, -100 * D2R, RI - 1.6)];
      sub.add(tube(pipe, 0.14, cu, 24));
      var nz = mesh(new T.CylinderGeometry(0.22, 0.3, 0.4, 12), cu); nz.position.copy(pipe[3]); nz.position.y -= 0.15; sub.add(nz);
      // 艇背上的通气阀、艇底的进水口
      var vm = std({ color: 0x1E252C, roughness: .5, metalness: .4 });
      var vent = mesh(new T.CylinderGeometry(0.28, 0.34, 0.5, 12), vm); vent.position.set((a + b) / 2, R + 0.05, 0.9); sub.add(vent);
      var holes = []; for (var h = 0; h < 4; h++) { var hx = a + (b - a) * (h + 0.5) / 4; var hm = mesh(new T.BoxGeometry(0.9, 0.12, 0.5), vm, false); hm.position.set(hx, -R + 0.03, 0.6); sub.add(hm); holes.push(new T.Vector3(hx, -R - 0.1, 0.6)); }
      var wm = std({ color: 0x2E86D4, transparent: true, opacity: .82, roughness: .15, metalness: .05, emissive: 0x0B3A66, emissiveIntensity: .35, depthWrite: false });
      var water = new T.Mesh(new T.BufferGeometry(), wm); water.rotation.y = Math.PI / 2; water.position.x = a + 0.1; water.renderOrder = 1; sub.add(water);
      tanks.push({ a: a, b: b, water: water, level: -9, vent: new T.Vector3((a + b) / 2, R + 0.35, 0.9), holes: holes });
    });
    function tankLevel(f) {   // 舱里装了几分之几 → 水面离舱心的高度
      if (f <= 0) return -RI; if (f >= 1) return RI;
      var lo = -RI, hi = RI; for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (segA(RI, m + RI) / (Math.PI * RI * RI) < f) lo = m; else hi = m; } return (lo + hi) / 2;
    }
    function setTankWater(f) {
      var hl = tankLevel(f);
      tanks.forEach(function (tk) {
        if (Math.abs(hl - tk.level) < 0.004) return; tk.level = hl; tk.water.geometry.dispose();
        if (f <= 0.001) { tk.water.geometry = new T.BufferGeometry(); return; }
        var r = RI - 0.03, s = new T.Shape(), n = 40, i;
        if (f >= 0.999) { s.absarc(0, 0, r, 0, Math.PI * 2, false); }
        else { var al = Math.asin(clamp(hl / r, -1, 1)); s.moveTo(r * Math.cos(al), hl); for (i = 1; i <= n; i++) { var an = al - (Math.PI + 2 * al) * i / n; s.lineTo(r * Math.cos(an), r * Math.sin(an)); } s.lineTo(r * Math.cos(al), hl); }
        tk.water.geometry = new T.ExtrudeGeometry(s, { depth: tk.b - tk.a - 0.2, bevelEnabled: false, curveSegments: 36 });
      });
    }
    // 甲板、指挥塔、桅杆
    var deckM = std({ color: 0x46525E, roughness: .8, metalness: .15 });
    (function () {
      var s = new T.Shape(), x0 = -11, x1 = 15, w = 1.25; s.moveTo(x0, -w * .5); s.lineTo(x0 + 2, -w); s.lineTo(x1 - 2.5, -w); s.quadraticCurveTo(x1, -w, x1, 0); s.quadraticCurveTo(x1, w, x1 - 2.5, w); s.lineTo(x0 + 2, w); s.lineTo(x0, w * .5); s.lineTo(x0, -w * .5);
      var g = new T.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, R - 0.18, 0); sub.add(mesh(g, deckM));
    })();
    var sailM = std({ color: 0xffffff, map: (function () { var t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(0.35, 0.35); return t; })(), roughness: .6, metalness: .22 });
    var sg = new T.ExtrudeGeometry(sailShape(), { depth: SH + 0.5, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.2, bevelSegments: 4, curveSegments: 20 });
    sg.rotateX(-Math.PI / 2); sg.translate(0, R - 0.7, 0); sub.add(mesh(sg, sailM));
    var winM = new T.MeshStandardMaterial({ color: 0x0E1620, roughness: .2, metalness: .6 });
    [-0.45, 0, 0.45].forEach(function (z) { var wn = mesh(new T.BoxGeometry(0.34, 0.26, 0.3), winM, false); wn.position.set(SX1 - 0.55 - Math.abs(z) * 0.5, R + SH - 0.25, z); wn.rotation.y = z * 0.9; sub.add(wn); });
    var mastM = std({ color: 0x59636E, roughness: .5, metalness: .5 });
    [[SX0 + SL * 0.52, 0.12, 2.1], [SX0 + SL * 0.38, 0.17, 1.5], [SX0 + SL * 0.25, 0.05, 2.7]].forEach(function (p) { var c = mesh(new T.CylinderGeometry(p[1], p[1] * 1.15, p[2], 12), mastM); c.position.set(p[0], R + SH + p[2] / 2 - 0.1, 0); sub.add(c); });
    var pHead = mesh(new T.BoxGeometry(0.5, 0.32, 0.26), mastM); pHead.position.set(SX0 + SL * 0.52 + 0.1, R + SH + 2.0, 0); sub.add(pHead);
    // 舵和水平翼
    function foil(c0, c1, span, sweep, th) {
      var s = new T.Shape(); s.moveTo(0, 0); s.lineTo(c0, 0); s.lineTo(sweep + c1, span); s.quadraticCurveTo(sweep + c1 * 0.5, span + 0.18, sweep, span); s.lineTo(0, 0);
      var g = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: th * 0.5, bevelSize: th * 0.45, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -th / 2); return g;
    }
    var finM = std({ color: 0x323C46, roughness: .55, metalness: .3 });
    for (var k = 0; k < 4; k++) { var fg = new T.Group(); fg.rotation.x = k * Math.PI / 2; var fm = mesh(foil(4.6, 2.3, k === 2 ? 4.5 : 6.0, 1.3, 0.22), finM);   /* 下舵短一些，坐底时不插进沙里 */ fm.position.x = -23.4; fg.add(fm); sub.add(fg); }
    [-1, 1].forEach(function (s) { var g = new T.Group(); g.rotation.x = s * Math.PI / 2; var m = mesh(foil(1.9, 1.2, 3.3, 0.35, 0.16), finM); m.position.set(SX0 + SL * 0.48, 0, 0); g.add(m); g.position.y = R + SH * 0.55; sub.add(g); });
    // 螺旋桨（七叶，弯刀形）
    var prop = new T.Group(); prop.position.x = -25.9; sub.add(prop);
    var brass = std({ color: 0xC9A04A, metalness: .85, roughness: .28 });
    var shaft = mesh(new T.CylinderGeometry(0.35, 0.45, 1.4, 16), finM); shaft.rotation.z = Math.PI / 2; shaft.position.x = -25.3; sub.add(shaft);
    var hubPts = []; for (var hi = 0; hi <= 10; hi++) { var hu = hi / 10; hubPts.push(new T.Vector2(0.001 + 0.72 * Math.sqrt(1 - hu * hu), -hu * 1.3)); }
    var hubG = new T.LatheGeometry(hubPts.reverse(), 20); hubG.rotateZ(Math.PI / 2); prop.add(mesh(hubG, brass));
    var bs = new T.Shape(); bs.moveTo(-0.28, 0.4); bs.bezierCurveTo(-0.75, 1.2, -0.55, 2.1, 0.1, 2.55); bs.bezierCurveTo(0.55, 2.3, 0.62, 1.4, 0.3, 0.4); bs.lineTo(-0.28, 0.4);
    var bg = new T.ExtrudeGeometry(bs, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 14 });
    for (var bi = 0; bi < 7; bi++) { var piv = new T.Group(); piv.rotation.x = bi * Math.PI * 2 / 7; var bl = mesh(bg, brass); bl.rotation.y = 1.0; piv.add(bl); prop.add(piv); }

    /* ── 受力箭头 ── */
    function arrow(col) {
      var gp = new T.Group(), m = new T.MeshBasicMaterial({ color: col, depthTest: false, transparent: true }), o = new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
      var sh = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 1, 16), m), hd = new T.Mesh(new T.ConeGeometry(0.85, 1, 24), m);
      var sho = new T.Mesh(new T.CylinderGeometry(0.46, 0.46, 1, 16), o), hdo = new T.Mesh(new T.ConeGeometry(1.08, 1, 24), o);
      [sho, hdo].forEach(function (x) { x.renderOrder = 20; gp.add(x); }); [sh, hd].forEach(function (x) { x.renderOrder = 21; gp.add(x); });
      gp.userData.set = function (L) {
        gp.visible = L > 0.05; if (!gp.visible) return;
        var h = Math.min(1.8, L * 0.6), s = L - h;
        sh.scale.y = sho.scale.y = Math.max(0.001, s); sh.position.y = sho.position.y = s / 2;
        hd.scale.set(h / 1.8, h, h / 1.8); hdo.scale.set(h / 1.8, h * 1.12, h / 1.8); hd.position.y = s + h / 2; hdo.position.y = s + h / 2 - 0.04;
      };
      return gp;
    }
    var CB = '#F5B700', CG = '#E5484D', CN = '#8B5CF6';
    var aB = arrow(0xF5B700), aG = arrow(0xE5484D), aN = arrow(0x8B5CF6); aG.rotation.z = Math.PI;
    var dot = new T.Mesh(new T.SphereGeometry(0.5, 16, 12), new T.MeshBasicMaterial({ color: 0x1E3A5F, depthTest: false })); dot.renderOrder = 22;
    var forceG = new T.Group(); forceG.position.set(FX, 0, R + 1.2); forceG.add(aB, aG, dot); sub.add(forceG);
    aN.position.set(FX + 2.4, -R - 0.05, R + 1.2); sub.add(aN);

    /* ── 气泡 ── */
    var bubG = new T.SphereGeometry(1, 10, 8), bubM = std({ color: 0xF2FAFF, transparent: true, opacity: .6, roughness: .05, metalness: .1, depthWrite: false }), bubs = [];
    for (var q = 0; q < 140; q++) { var bm = new T.Mesh(bubG, bubM); bm.visible = false; bm.renderOrder = 2; scene.add(bm); bubs.push({ m: bm, v: new T.Vector3(), on: false, ph: 0 }); }
    var lastB = null;
    function emit(p, vy, sz, spread) {
      lastB = null;
      for (var i = 0; i < bubs.length; i++) { var b = bubs[i]; if (b.on) continue;
        b.on = true; b.m.visible = true; lastB = b; b.m.position.set(p.x + (rnd() - .5) * (spread || 0.6), p.y, p.z + (rnd() - .5) * 0.6); b.v.set((rnd() - .5) * 0.8, vy, (rnd() - .5) * 0.5); b.m.scale.setScalar(sz * (0.6 + rnd() * 0.8)); b.ph = rnd() * 6; return; }
    }

    /* ════ 状态 ════ */
    var st = { w: 0, tgt: 0, pump: 0, pt0: 0, pd: false, glide: null, y: 0, v: 0, t: 0, forces: true, hist: [], hT: 0, uiT: 0, eAcc: 0, slide: false, w0: 0, dw: 0 };
    function reset() { st.w = 0; st.tgt = 0; st.pump = 0; st.glide = null; st.y = yFloat(Gof(0)); st.v = 0; st.hist = []; setTankWater(0); }
    function now() { return performance.now() / 1000; }
    reset();
    function phys(dt) {
      // 水泵
      // 按住时按真实时间算该有多少水（每秒 PUMP 吨），和一秒画几帧无关
      if (st.pump) st.tgt = clamp(st.w0 + st.pump * PUMP * (now() - st.pt0), 0, WMAX);
      var w0 = st.w; if (st.w < st.tgt) st.w = Math.min(st.tgt, st.w + PUMP * dt); else if (st.w > st.tgt) st.w = Math.max(st.tgt, st.w - PUMP * dt);
      st.dw = (st.w - w0) / Math.max(dt, 1e-6);
      var fr = frac(st.y), net = (FFULL * fr - Gof(st.w)) / FFULL, part = fr > 0.005 && fr < 0.995 ? 1 : 0;
      var a = 120 * net - (1.2 + 3.0 * part) * st.v - 0.16 * st.v * Math.abs(st.v);
      st.v += a * dt; st.y += st.v * dt;
      if (st.y <= YBOT) { st.y = YBOT; if (st.v < 0) st.v = 0; }
    }
    /* 「调到悬浮」：按真实时间约 2.4 秒做完。像真潜艇那样先多（少）装一点水让艇下沉（上浮），
       到了水中间再把水调回 500 吨，停住；全程浮力、重力的大小关系和艇的运动方向一致。 */
    var YH = -17;
    function startGlide() {
      st.pump = 0; st.slide = false;
      var fr = frac(st.y), inMid = fr >= 0.99999 && st.y > YBOT + 0.5;
      var y1 = inMid ? st.y : YH, down = y1 < st.y - 0.3, up = y1 > st.y + 0.3;
      st.glide = { t: 0, D: inMid ? 0.8 : 2.4, y0: st.y, y1: y1, w0: st.w, wT: down ? 520 : up ? 480 : WHOV };
    }
    function glide(dt) {
      var g = st.glide; g.t = Math.min(g.D, g.t + dt); var D = g.D, t = g.t, yPrev = st.y, wPrev = st.w;
      var kw = sst(0, 0.3 * D, t), kc = sst(0.85 * D, D, t), ky = sst(0.2 * D, 0.9 * D, t);
      st.w = g.w0 + (g.wT - g.w0) * kw + (WHOV - g.wT) * kc;
      st.y = g.y0 + (g.y1 - g.y0) * ky; st.v = dt > 0 ? (st.y - yPrev) / dt : 0;
      st.dw = dt > 0 ? (st.w - wPrev) / dt : 0; st.tgt = st.w;
      if (t >= D) { st.glide = null; st.w = st.tgt = WHOV; st.y = g.y1; st.v = 0; }
    }
    function info() {
      var fr = frac(st.y), Fb = FFULL * fr, G = Gof(st.w), net = Fb - G, full = fr >= 0.99999, yf = yFloat(G), bot = st.y <= YBOT + 1e-6 && net < 0;
      var s, why;
      if (bot) { s = '沉到海底'; why = '浮力 &lt; 重力，海底托着它（浮力 + 支持力 = 重力）'; }
      else if (!full && yf !== null && Math.abs(st.y - yf) < 0.6) {
        s = '漂浮';
        why = Math.abs(net) < 0.003 * FFULL ? '浮力 = 重力，一部分露出水面' : net < 0 ? '重力略大于浮力，艇往下沉一点，露出水面的部分变少' : '浮力略大于重力，艇往上浮一点，露出水面的部分变多';
      }
      else if (full && Math.abs(net) < 1) { s = '悬浮'; why = Math.abs(st.v) > 0.08 ? '浮力 = 重力，正慢慢停住' : '浮力 = 重力，停在水中'; }
      else if (net > 0) { s = '上浮'; why = '浮力 &gt; 重力'; }
      else { s = '下沉'; why = '浮力 &lt; 重力'; }
      return { fr: fr, Fb: Fb, G: G, N: bot ? G - Fb : 0, full: full, s: s, why: why };
    }
    function f7(F) { return (F / 1e7).toFixed(2) + '×10⁷ N'; }

    /* ── 右栏 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>潜水艇</b><p>潜水艇怎样上浮、下沉？给水舱注水、排水，看浮力和重力怎么变。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">水舱里的水</div>' +
        '<div class="ls-btns"><button data-a="in" class="main">按住 注水</button><button data-a="out" class="main">按住 排水</button></div>' +
        '<div class="ls-row"><input class="rng" type="range" min="0" max="' + WMAX + '" step="10" value="0"><span class="vl" data-v="w" style="min-width:96px">0 吨</span></div>' +
        '<div class="ls-btns"><button data-a="hover">调到悬浮</button><button data-a="force" class="on">显示受力</button><button data-a="reset">重新开始</button></div>' +
        '<p class="ls-tip" style="margin-top:6px">点一下注水 / 排水 = 10 吨；按住不放水泵一直工作。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">现在：<span data-v="s" style="color:var(--blue)">漂浮</span></div>' +
        '<p class="ls-tip" data-v="why" style="color:var(--ink);font-size:17px"></p>' +
        '<div class="ls-row"><span class="nm"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + CB + ';margin-right:6px"></i>浮力 F浮</span><span class="vl" data-v="fb" style="min-width:150px"></span></div>' +
        '<div class="ls-row"><span class="nm"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + CG + ';margin-right:6px"></i>重力 G</span><span class="vl" data-v="g" style="min-width:150px"></span></div>' +
        '<div class="ls-row"><span class="nm">排开水</span><span class="vl" data-v="vp" style="min-width:150px"></span></div>' +
        '<p class="ls-tip" data-v="sub" style="font-weight:600;color:var(--blue)"></p></div>' +
      '<div class="ls-note">浸没在水中的潜水艇，排开水的体积不变，所受的<b>浮力不变</b>；潜水艇靠水舱充水、排水来<b>改变自身的重力</b>，从而实现上浮和下沉。</div>' +
      '<p class="ls-tip">怎么算：F浮 = ρ水 g V排，G = (m艇 + m水) g。艇的体积 2000 m³，空艇 1500 吨，水舱最多装 700 吨水；ρ水 取 1.0×10³ kg/m³，g 取 10 N/kg。示意图，大小、快慢不按比例。</p>'
    );
    var $ = ctx.$, rng = $('input.rng'), V = {};
    ['w', 's', 'why', 'fb', 'g', 'vp', 'sub'].forEach(function (k) { V[k] = $('[data-v="' + k + '"]'); });
    function setTxt(el, h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }
    function stopPump() {   // 松手：水量停在整 10 吨上；只点一下就正好 10 吨
      if (!st.pump) return; var w0 = Math.round(st.w0 / 10) * 10;
      var tap = now() - st.pt0 < 0.3;   // 按下不到 0.3 秒算“点一下”
      st.tgt = st.pump > 0 ? Math.min(WMAX, tap ? w0 + 10 : Math.ceil(st.w / 10 - 1e-6) * 10) : Math.max(0, tap ? w0 - 10 : Math.floor(st.w / 10 + 1e-6) * 10); st.pump = 0;
    }
    ['in', 'out'].forEach(function (a) {
      var b = $('[data-a="' + a + '"]');
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); st.glide = null; st.w0 = st.w; st.pt0 = now(); st.pump = a === 'in' ? 1 : -1; st.pd = true; });
      // 没有经过按下（键盘回车、空格，或别的方式触发的点击）：也按“点一下 = 10 吨”
      b.addEventListener('click', function () {
        if (st.pd) { st.pd = false; return; }
        st.glide = null; st.pump = 0; var w1 = Math.round(Math.max(st.w, st.tgt) / 10) * 10, w2 = Math.round(Math.min(st.w, st.tgt) / 10) * 10;
        st.tgt = a === 'in' ? Math.min(WMAX, w1 + 10) : Math.max(0, w2 - 10);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { b.addEventListener(n, stopPump); });
    });
    window.addEventListener('pointerup', stopPump);
    $('[data-a="hover"]').addEventListener('click', function () { startGlide(); });
    $('[data-a="reset"]').addEventListener('click', function () { reset(); });
    $('[data-a="force"]').addEventListener('click', function () { st.forces = !st.forces; this.classList.toggle('on', st.forces); });
    rng.addEventListener('input', function () { st.glide = null; st.pump = 0; st.tgt = +rng.value; st.slide = true; });
    rng.addEventListener('change', function () { st.slide = false; });

    /* ── 舞台上的小窗：两个力随时间的变化 ── */
    var win = document.createElement('div'); win.className = 'ls-win';
    win.innerHTML = '<h3><span>现在：<b data-w="s">漂浮</b></span><small data-w="why"></small></h3><canvas width="680" height="250"></canvas><p class="cap"><b style="color:#C99400">━ 浮力</b>　<b style="color:' + CG + '">━ 重力</b>　（最近 30 秒）</p>';
    ctx.host.appendChild(win);
    var wS = win.querySelector('[data-w="s"]'), wWhy = win.querySelector('[data-w="why"]'), cv = win.querySelector('canvas'), gx = cv.getContext('2d');
    function chart() {
      var w = cv.width, h = cv.height, L = 56, Rr = 12, Tt = 14, B = 34, lo = 1.4, hi = 2.3;
      gx.clearRect(0, 0, w, h); gx.fillStyle = '#F7FAFD'; gx.fillRect(L, Tt, w - L - Rr, h - Tt - B);
      gx.font = '22px Bahnschrift, Arial'; gx.fillStyle = '#56677D'; gx.textAlign = 'right'; gx.textBaseline = 'middle';
      function Y(v) { return Tt + (hi - v) / (hi - lo) * (h - Tt - B); }
      [1.5, 2.0].forEach(function (v) { gx.strokeStyle = v === 2.0 ? '#C3CEDC' : '#E3E8EF'; gx.lineWidth = 2; gx.beginPath(); gx.moveTo(L, Y(v)); gx.lineTo(w - Rr, Y(v)); gx.stroke(); gx.fillText(v.toFixed(1), L - 8, Y(v)); });
      gx.textAlign = 'left'; gx.fillText('×10⁷ N', 4, h - 14); gx.textAlign = 'right'; gx.fillText('时间 →', w - Rr, h - 14);
      var n = st.hist.length, dx = (w - L - Rr) / 300;
      [['fb', '#E0A800', 8], ['g', CG, 3.5]].forEach(function (c) {
        gx.strokeStyle = c[1]; gx.lineWidth = c[2]; gx.lineJoin = 'round'; gx.beginPath();
        for (var i = 0; i < n; i++) { var x = w - Rr - (n - 1 - i) * dx, y = Y(clamp(st.hist[i][c[0]] / 1e7, lo, hi)); if (i) gx.lineTo(x, y); else gx.moveTo(x, y); }
        gx.stroke();
      });
    }

    function ui(I) {
      setTxt(V.w, Math.round(st.w) + ' 吨'); if (!st.slide) rng.value = Math.round(st.w / 10) * 10;
      setTxt(V.s, I.s); setTxt(V.why, I.why); setTxt(V.fb, f7(I.Fb)); setTxt(V.g, f7(I.G));
      setTxt(V.vp, Math.round(VOL * I.fr) + ' m³' + (I.full ? '' : ''));
      setTxt(V.sub, I.full ? '已经全部浸没：排开水的体积 = 艇的体积，再往深处走浮力也不变。' : '有一部分露在水面上：沉得越深，排开的水越多，浮力越大。');
      setTxt(wS, I.s); setTxt(wWhy, I.why.replace(/（.*）/, ''));
      document.body.setAttribute('data-sub-state', I.s);
    }

    /* ════ 每一帧 ════ */
    var tmp = new T.Vector3();
    function frame(dt) {
      st.t += dt; var t = st.t, n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      if (st.glide) glide(dt); else for (var i = 0; i < n; i++) phys(h);
      var I = info();
      // 艇：在水面时随波轻轻起伏（只是外观）
      var bob = (1 - sst(0.85, 1, I.fr)) * (I.fr > 0 ? 1 : 0);
      sub.position.y = st.y + bob * 0.6 * wv(SUBX, 0, t); sub.rotation.x = bob * 0.012 * Math.sin(t * 1.3); sub.rotation.z = bob * 0.006 * Math.sin(t * 0.9);
      prop.rotation.x += dt * clamp(Math.abs(st.v) * 2.2, 0, 9);
      setTankWater(st.w / WMAX);
      // 气泡：注水时空气从艇背的通气阀冒出，排水时水从艇底被压出去
      st.eAcc += dt;
      var filling = st.dw > 1, drain = st.dw < -1;
      while (st.eAcc > 0.03) {
        st.eAcc -= 0.03;
        tanks.forEach(function (tk) {
          if (filling) { tmp.copy(tk.vent).add(sub.position); if (tmp.y < wv(tmp.x, tmp.z, t) - 0.3) emit(tmp, 2.5, 0.22, 0.4); }
          if (drain) { var hp = tk.holes[(rnd() * 4) | 0]; tmp.copy(hp).add(sub.position); if (tmp.y < -0.3) { emit(tmp, -2.6, 0.17, 0.8); if (lastB) lastB.v.z = 2 + rnd() * 2.5; } }
        });
        if (rnd() < 0.07) emit(new T.Vector3(51.5, bedY(52, -3) + 1.2, -3), 0.5, 0.12, 0.3);
      }
      bubs.forEach(function (b) {
        if (!b.on) return; b.v.y += (6 - 1.6 * b.v.y) * dt; b.v.x *= 1 - dt; b.v.z *= 1 - 1.5 * dt; b.m.position.addScaledVector(b.v, dt); b.m.position.x += Math.sin(t * 6 + b.ph) * 0.01;
        var ly = b.m.position.y - sub.position.y, lz = b.m.position.z, lx = b.m.position.x - SUBX, inHull = lx > XE && lx < XN && ly * ly + lz * lz < Math.pow(hullR(lx) + 0.1, 2) && b.v.y > 0;
        if (inHull || b.m.position.y > wv(b.m.position.x, b.m.position.z, t) - 0.1 || b.m.position.y < BED - 2) { b.on = false; b.m.visible = false; }
      });
      // 环境
      waves(t);
      rays.forEach(function (r) { r.material.opacity = 0.11 + 0.07 * Math.sin(t * 0.7 + r.userData.ph); r.rotation.z += Math.sin(t * 0.4 + r.userData.ph) * 0.0004; });
      weeds.forEach(function (m) {
        var p = m.geometry.attributes.position, b = m.userData.base;
        for (var j = 0; j < p.count; j++) { var yy = b[j * 3 + 1], k = yy / m.userData.h; p.setX(j, b[j * 3] + Math.sin(t * 1.1 + m.userData.ph + yy * 0.35) * 0.55 * k * k); }
        p.needsUpdate = true;
      });
      fishes.forEach(function (f) {
        var u = f.userData; if (f.position.x > 54) u.dir = -1; if (f.position.x < -54) u.dir = 1;
        var hd = u.dir > 0 ? 0 : Math.PI; f.rotation.y += (hd - f.rotation.y) * Math.min(1, dt * 1.5);
        f.position.x += Math.cos(f.rotation.y) * u.sp * dt; f.position.z += -Math.sin(f.rotation.y) * u.sp * dt * 0.2; f.position.z = clamp(f.position.z, -14, -7.5);
        f.position.y = u.y0 + 0.6 * Math.sin(t * 0.5 + u.ph);
        u.tail.rotation.y = Math.sin(t * 9 + u.ph) * 0.45;
      });
      // 受力
      forceG.visible = st.forces; aB.userData.set(I.Fb * FS); aG.userData.set(I.G * FS);
      aN.visible = st.forces && I.N > 0; aN.userData.set(I.N * FS);
      var c = new T.Vector3(); sub.localToWorld(c.set(FX, 0, R + 1.2));
      if (st.forces) {
        var tb = ctx.tag('fb', '<i style="background:' + CB + '"></i>浮力 ' + f7(I.Fb), c.clone().add(tmp.set(0, I.Fb * FS - 0.6, 0)), { side: 'left', gap: 16 });
        var tg = ctx.tag('g', '<i style="background:' + CG + '"></i>重力 ' + f7(I.G), c.clone().add(tmp.set(0, -I.G * FS + 0.6, 0)), { side: 'left', gap: 16 });
        var tn = ctx.tag('n', '<i style="background:' + CN + '"></i>海底的支持力 ' + f7(I.N), I.N > 0 ? new T.Vector3(SUBX + FX + 3.6, sub.position.y - R + 0.6, R + 1.2) : null, { side: 'right', gap: 8 });
      } else { ctx.tag('fb', null, null); ctx.tag('g', null, null); ctx.tag('n', null, null); }
      var tt = ctx.tag('tank', '水舱（剖开）', sub.localToWorld(new T.Vector3((TF[0] + TF[1]) / 2 + 1, R, 0)), { side: 'above', gap: 22, small: true });
      // 记录、右栏
      st.hT += dt; if (st.hT >= 0.1) { st.hT = 0; st.hist.push({ fb: I.Fb, g: I.G }); if (st.hist.length > 300) st.hist.shift(); chart(); }
      st.uiT += dt; if (st.uiT >= 0.08) { st.uiT = 0; ui(I); }
      return true;
    }

    ctx.orb.az = 0.14; ctx.orb.el = 0.15; ctx.orb.dist = 118;
    ctx.orb.minAz = -0.55; ctx.orb.maxAz = 0.55; ctx.orb.minEl = 0.08; ctx.orb.maxEl = 0.6; ctx.orb.minDist = 70; ctx.orb.maxDist = 210;
    ctx.target.set(0, -15.5, 0);
    frame(0.016); ui(info()); chart();
    return {
      frame: frame,
      pause: function () { stopPump(); },
      resume: function () { ctx.dirty(); }
    };
  }
});
