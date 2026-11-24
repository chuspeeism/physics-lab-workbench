/* 22 生活情境：手摇发电机（scene-generator.js，配 scenes.js）
   课本（人教版九年级第二十章「磁生电」）：线圈在磁场中转动，线圈的两条边切割磁感线，产生感应电流；
   线圈每转一圈，电流方向改变两次（交流电）。
   器材（示意，大小不按比例）：木底板；U 形磁体平放在木垫块上，开口朝前，左臂 N 极（红）、右臂 S 极（蓝），两臂前端装弧形极靴；
     两极之间是矩形线圈（漆包线绕成），转轴朝前后方向；轴的前段有两个铜环（滑环），下面两片铜电刷压着铜环，接到底板上的两个接线柱；
     轴最前端是小皮带轮，皮带连到右边的大轮，大轮上有摇把。大轮转 1 圈，线圈转 4 圈（R2 / R1 = 8.6 / 2.15）。
     接线柱 → 小灯泡 → 灵敏电流计（零刻度在中央）→ 回到另一个接线柱，串联成一个电路。
   坐标：x 向右，y 向上，z 朝观众；转轴在 (0, YS) 沿 z。磁场在两极之间沿 +x（N → S）。
   物理：θ 为线圈平面离开竖直位置（中性面）的角度。线圈平面竖直时两条边上下排列、左右运动，顺着磁感线走，不切割，e = 0；
     线圈平面水平时两条边在两极旁上下运动，切割最快，e 最大。e = Em·sinθ，Em = K·ω（K = N·B·S = 0.067 V·s，ω 为线圈角速度）。
     线圈每秒 10 圈时 Em ≈ 4.2 V。电路总电阻 R = 线圈 2 Ω + 灯 8 Ω = 10 Ω（当作不变），i = e / R，最大约 0.042·n 安（n = 每秒圈数）。
     灯的平均功率 P = (Im² / 2)·8 Ω ≈ 0.0071·n² 瓦；额定约 0.75 W（2.5 V 0.3 A 小灯泡），n = 10 时接近正常发光。灯丝温度按 0.08 s 滞后跟随瞬时功率
     （转得慢时一闪一闪，转得快时稳定发光）。
     电流计：二阶阻尼指针（固有约 1.0 Hz、阻尼比 0.7），静态 100 格/A，±3.4 格处有挡钉。转得慢（每秒 0.25～1 圈）指针跟着电流左右摆 1～3 格；
     转得快（每秒 4 圈以上）电流方向变得太快，指针来不及摆，只在 0 附近小幅抖动——这是真实现象，右栏提示“看灯泡”。
   操作：拖摇把（或大轮）转圈；按钮「摇慢一点 / 摇快一点 / 停」、滑杆调快慢。松手后大轮带着线圈慢慢停下（约 0.7 s 衰减）。 */
(function () {
  if (!window.LabScene) return;

  var BT = 2.4, YS = 10.5, RC = 3.6, LC = 4.2, RCW = 0.46,          // 底板厚、转轴高、线圈半宽、线圈半长、线圈线束半径
    ZR1 = 8.6, ZR2 = 10.4, ZFB = 6.3, ZRB = -7.5, ZP = 13.6,          // 铜环、前后轴承、皮带轮所在的 z
    XW = 25, YW = 14, R1 = 2.15, R2 = 8.6, RATIO = R2 / R1,           // 大轮位置；皮带中心线半径（小轮 / 大轮）
    KE = 0.067, RT = 10, RL = 8, P0 = 0.75,                           // Em = KE·ω；总电阻；灯电阻；灯额定功率
    GAIN = 100, F0 = 1.0, ZETA = 0.7, PIN = 3.4,                      // 电流计
    LEVELS = [0, 0.25, 0.5, 1, 2, 4, 6, 8, 10], DIR = -1;             // 按钮的几挡（线圈每秒圈数）；摇把顺时针（从前面看）

  LabScene.register('generator', { no: '22', name: '手摇发电机', done: true, build: build });

  function build(ctx) {
    var T = ctx.T, scene = ctx.scene;
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    /* ── 小工具 ── */
    function std(c, o) { var m = new T.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0, envMapIntensity: 0.45 }); for (var k in (o || {})) m[k] = o[k]; return m; }
    function tex(w, h, draw, srgb) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.anisotropy = 8; if (srgb !== false && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t; }
    function add(o, parent, cast) { o.castShadow = cast !== false; o.receiveShadow = true; (parent || scene).add(o); return o; }
    function mesh(g, m, pos, parent, cast) { var o = new T.Mesh(g, m); if (pos) o.position.set(pos[0], pos[1], pos[2]); return add(o, parent, cast); }
    function group(parent, pos, rotY) { var g = new T.Group(); if (pos) g.position.set(pos[0], pos[1], pos[2]); if (rotY) g.rotation.y = rotY; (parent || scene).add(g); return g; }
    function V3(a) { return new T.Vector3(a[0], a[1], a[2]); }
    function lathe(pts, mat, seg, axisZ) {   // 回转体：pts = [[半径, 高度]…]；axisZ 时轴沿 z
      var g = new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 40);
      if (axisZ) g.rotateX(Math.PI / 2);
      return new T.Mesh(g, mat);
    }
    function tube(pts, r, mat, seg, closed) {
      var cv = new T.CatmullRomCurve3(pts.map(function (p) { return p.isVector3 ? p : V3(p); }), !!closed, 'centripetal');
      return new T.Mesh(new T.TubeGeometry(cv, seg || 80, r, 10, !!closed), mat);
    }
    function rrect(w, h, r, cx, cy) {   // 圆角矩形（中心 cx, cy）
      var s = new T.Shape(), x0 = (cx || 0) - w / 2, y0 = (cy || 0) - h / 2;
      s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
      s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
      return s;
    }
    function slab(shape, h, bev, mat, y0, parent) {   // 平放的板：shape 在 x-z 平面（shape 的 y 就是世界 z），厚 h，底面在 y0
      var g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.01, h - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
      g.rotateX(Math.PI / 2); g.translate(0, y0 + h - bev, 0);
      return add(new T.Mesh(g, mat), parent);
    }
    function plate(shape, d, bev, mat, z0, parent) {   // 竖立的板：shape 在 x-y 平面，沿 z 厚 d，后面在 z0
      var g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.01, d - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 24 });
      g.translate(0, 0, z0 + bev);
      return add(new T.Mesh(g, mat), parent);
    }

    /* ── 环境光反射（金属、玻璃有高光）：一个渐变天空 + 两块柔光板 ── */
    (function () {
      try {
        var pm = new T.PMREMGenerator(ctx.renderer), es = new T.Scene();
        var sky = tex(16, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, '#E4EAF1'); gr.addColorStop(0.55, '#B9AE9C'); gr.addColorStop(1, '#6E665C'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), new T.MeshBasicMaterial({ map: sky, side: T.BackSide })));
        var pmat = new T.MeshBasicMaterial({ color: 0xffffff }); pmat.color.setScalar(2.2);
        var p1 = new T.Mesh(new T.PlaneGeometry(90, 40), pmat); p1.position.set(-20, 70, 40); p1.lookAt(0, 0, 0); es.add(p1);
        var p2 = new T.Mesh(new T.PlaneGeometry(40, 60), pmat); p2.position.set(80, 30, 30); p2.lookAt(0, 0, 0); es.add(p2);
        scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
      } catch (e) { /* 没有也能看 */ }
    })();

    /* ── 材质 ── */
    function woodTex(base, dark, n, w, h) {
      return tex(w || 1024, h || 256, function (g, W, H) {
        g.fillStyle = base; g.fillRect(0, 0, W, H);
        for (var i = 0; i < n; i++) {
          var y0 = rnd() * H, amp = 1.5 + rnd() * 5, fr = 0.002 + rnd() * 0.006, ph = rnd() * 6.28;
          g.strokeStyle = dark; g.globalAlpha = 0.04 + rnd() * 0.12; g.lineWidth = 0.6 + rnd() * 2.4;
          g.beginPath(); for (var x = 0; x <= W; x += 8) { var y = y0 + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 3.3 + ph * 2) * amp * 0.35; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
        }
        g.globalAlpha = 1;
      });
    }
    var tBase = woodTex('#C99A63', '#6B4423', 110); tBase.wrapS = tBase.wrapT = T.RepeatWrapping; tBase.repeat.set(1 / 56, 1 / 14);
    var tRiser = woodTex('#8A5A34', '#3A2312', 80); tRiser.wrapS = tRiser.wrapT = T.RepeatWrapping; tRiser.repeat.set(1 / 24, 1 / 6);
    var tDesk = tex(512, 512, function (g, w, h) {
      g.fillStyle = '#ECE7DD'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(120,105,85,0.06)' : 'rgba(255,255,255,0.10)'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
    });
    tDesk.wrapS = tDesk.wrapT = T.RepeatWrapping; tDesk.repeat.set(1 / 30, 1 / 30);
    var M = {
      base: std(0xffffff, { map: tBase, roughness: 0.55 }), riser: std(0xffffff, { map: tRiser, roughness: 0.6 }),
      red: std(0xD63A2F, { roughness: 0.4, metalness: 0.12 }), blue: std(0x2F5FB8, { roughness: 0.4, metalness: 0.12 }),
      iron: std(0x3B424C, { roughness: 0.42, metalness: 0.55, envMapIntensity: 0.8 }), steel: std(0xC3C9D0, { roughness: 0.25, metalness: 0.9, envMapIntensity: 1.0 }),
      alu: std(0xD7DBE0, { roughness: 0.32, metalness: 0.8, envMapIntensity: 1.0 }), brass: std(0xC9A04A, { roughness: 0.28, metalness: 0.85, envMapIntensity: 1.0 }),
      copper: std(0xD27A3E, { roughness: 0.3, metalness: 0.8, envMapIntensity: 1.0 }), bake: std(0x22272D, { roughness: 0.38 }),
      wheel: std(0x3D5266, { roughness: 0.4, metalness: 0.45, envMapIntensity: 0.8 }), grip: null, rubber: null,
      wRed: std(0xC8372C, { roughness: 0.42 }), wBlk: std(0x262B31, { roughness: 0.42 }), hit: new T.MeshBasicMaterial({ visible: false })
    };
    M.grip = std(0xffffff, { map: woodTex('#9A4E28', '#4A1E0C', 40, 256, 256), roughness: 0.38 });
    var tBelt = tex(256, 16, function (g, w, h) { g.fillStyle = '#2A2320'; g.fillRect(0, 0, w, h); g.fillStyle = '#5A4C44'; for (var i = 0; i < 8; i++) g.fillRect(i * 32, 0, 6, h); });
    tBelt.wrapS = tBelt.wrapT = T.RepeatWrapping;
    M.rubber = std(0xffffff, { map: tBelt, roughness: 0.7 });

    /* ── 桌面：边缘渐渐淡出（三种样子的背景上都不出现生硬的桌边） ── */
    var deskA = tex(256, 256, function (g, w, h) {
      var im = g.createImageData(w, h), sm = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var u = Math.abs(x - w / 2) / (w / 2), v = Math.abs(y - h / 2) / (h / 2), a = 1 - Math.max(sm(0.6, 1, u), sm(0.55, 1, v)), o = (y * w + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.round(255 * a); im.data[o + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, false);
    tDesk.repeat.set(116 / 30, 100 / 30);
    var desk = new T.Mesh(new T.PlaneGeometry(116, 100), std(0xffffff, { map: tDesk, alphaMap: deskA, transparent: true, depthWrite: false, roughness: 0.82 }));
    desk.rotation.x = -Math.PI / 2; desk.position.set(-6, 0, 2); desk.renderOrder = -1; desk.receiveShadow = true; scene.add(desk);
    /* ── 木底板（四个橡胶脚）＋铭牌 ── */
    var BX0 = -15.5, BX1 = 37, BZ0 = -19, BZ1 = 17.5;
    slab(rrect(BX1 - BX0, BZ1 - BZ0, 1.6, (BX0 + BX1) / 2, (BZ0 + BZ1) / 2), BT - 0.4, 0.3, M.base, 0.4);
    [[BX0 + 2.5, BZ0 + 2.5], [BX1 - 2.5, BZ0 + 2.5], [BX0 + 2.5, BZ1 - 2.5], [BX1 - 2.5, BZ1 - 2.5]].forEach(function (p) { mesh(new T.CylinderGeometry(1.1, 1.2, 0.42, 20), M.bake, [p[0], 0.21, p[1]]); });
    var plateTex = tex(512, 64, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#E9D28F'); gr.addColorStop(0.5, '#C9A24A'); gr.addColorStop(1, '#A9832F'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(90,60,10,.55)'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#4A3410'; g.font = 'bold 36px "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('手 摇 发 电 机', w / 2, h / 2 + 2);
      g.fillStyle = 'rgba(90,60,10,.7)'; [[16, h / 2], [w - 16, h / 2]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill(); });
    });
    mesh(new T.PlaneGeometry(14, 1.75), new T.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.5, envMapIntensity: 0.9 }), [6, 1.42, BZ1 + 0.31], null, false);
    function screw(parent, p, r, up) {   // 一字螺钉头
      var s = mesh(new T.SphereGeometry(r || 0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.steel, p, parent, false); s.scale.y = 0.45;
      var sl = mesh(new T.BoxGeometry((r || 0.35) * 1.8, 0.08, 0.09), M.bake, [p[0], p[1] + (r || 0.35) * 0.42, p[2]], parent, false); sl.rotation.y = up || 0.7;
      return s;
    }

    /* ── U 形磁体（平放，开口朝前；左 N 红、右 S 蓝）＋弧形极靴＋木垫块 ── */
    var AI = 6.2, AO = 10.4, ZF = 4.6, ZB = -6, MH = 6, SH = 3.3, SR = 4.7;
    function halfU(left) {   // 半个 U（俯视，shape 的 y 是世界 z）
      var s = new T.Shape(), k = left ? -1 : 1, n = 28, i, a;
      s.moveTo(k * AO, ZF); s.lineTo(k * AO, ZB);
      for (i = 1; i <= n; i++) { a = i / n * Math.PI / 2; s.lineTo(k * AO * Math.cos(a), ZB - AO * Math.sin(a)); }
      s.lineTo(0, ZB - AI);
      for (i = n - 1; i >= 0; i--) { a = i / n * Math.PI / 2; s.lineTo(k * AI * Math.cos(a), ZB - AI * Math.sin(a)); }
      s.lineTo(k * AI, ZF);
      return s;
    }
    var magG = group();
    slab(halfU(true), MH, 0.16, M.red, YS - MH / 2, magG); slab(halfU(false), MH, 0.16, M.blue, YS - MH / 2, magG);
    slab(halfU(true), YS - MH / 2 - BT, 0.12, M.riser, BT, magG); slab(halfU(false), YS - MH / 2 - BT, 0.12, M.riser, BT, magG);
    function shoe(left) {   // 极靴截面（x-y），内侧是以转轴为圆心、半径 SR 的圆弧
      var s = new T.Shape(), xt = Math.sqrt(SR * SR - SH * SH), a0 = Math.asin(SH / SR);
      if (left) { s.moveTo(-AI - 0.25, -SH); s.lineTo(-AI - 0.25, SH); s.lineTo(-xt, SH); s.absarc(0, 0, SR, Math.PI - a0, Math.PI + a0, false); s.lineTo(-AI - 0.25, -SH); }
      else { s.moveTo(AI + 0.25, SH); s.lineTo(AI + 0.25, -SH); s.lineTo(xt, -SH); s.absarc(0, 0, SR, -a0, a0, false); s.lineTo(AI + 0.25, SH); }
      return s;
    }
    [true, false].forEach(function (left) { var m = plate(shoe(left), 2 * ZF - 0.2, 0.1, left ? M.red : M.blue, -ZF + 0.1, magG); m.position.y = YS; });
    function letterMat(ch, bg) {
      return new T.MeshStandardMaterial({ roughness: 0.45, transparent: true, map: tex(128, 128, function (g) { g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = '#FFFFFF'; g.font = 'bold 100px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); }) });
    }
    [[-1, 'N', '#D63A2F'], [1, 'S', '#2F5FB8']].forEach(function (q) {
      var lm = letterMat(q[1], q[2]), xc = q[0] * (AI + AO) / 2;
      var top = mesh(new T.PlaneGeometry(2.6, 2.6), lm, [xc, YS + MH / 2 + 0.17, -1.5], magG, false); top.rotation.x = -Math.PI / 2;
      mesh(new T.PlaneGeometry(2.6, 2.6), lm, [xc, YS, ZF + 0.17], magG, false);
      var side = mesh(new T.PlaneGeometry(2.6, 2.6), lm, [q[0] * (AO + 0.17), YS, -1.5], magG, false); side.rotation.y = q[0] * Math.PI / 2;
    });
    // 压住磁体弯头的铜压条
    (function () {
      mesh(new T.BoxGeometry(3.2, 0.35, 1.4), M.brass, [0, YS + MH / 2 + 0.3, ZB - AO + 2.2], magG);
      [-1.3, 1.3].forEach(function (x) { screw(magG, [x, YS + MH / 2 + 0.48, ZB - AO + 2.2], 0.32); });
    })();

    /* ── 磁感线（两极之间，N → S） ── */
    var lineG = group(magG), lineMat = new T.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.55, depthWrite: false }), coneG = new T.ConeGeometry(0.3, 0.9, 12);
    [-2.4, -1.2, 0, 1.2, 2.4].forEach(function (y) { [-3.1, 0, 3.1].forEach(function (z) {
      var xe = Math.sqrt(SR * SR - y * y) - 0.05;
      var c = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2 * xe, 8), lineMat); c.rotation.z = Math.PI / 2; c.position.set(0, YS + y, z); lineG.add(c);
      var a = new T.Mesh(coneG, lineMat); a.rotation.z = -Math.PI / 2; a.position.set(xe - 0.9, YS + y, z); lineG.add(a);
    }); });

    /* ── 轴承座（前、后） ── */
    function bearing(z) {
      var s = new T.Shape(); s.moveTo(-2.7, BT); s.lineTo(2.7, BT); s.lineTo(1.45, YS - 0.4); s.absarc(0, YS, 1.5, -0.27, Math.PI + 0.27, false); s.lineTo(-2.7, BT);
      var h = new T.Path(); h.absarc(0, YS, 0.48, 0, Math.PI * 2, true); s.holes.push(h);
      plate(s, 0.9, 0.12, M.iron, z - 0.45);
      mesh(new T.BoxGeometry(6.4, 0.5, 2.6), M.iron, [0, BT + 0.25, z]);
      [-2.4, 2.4].forEach(function (x) { screw(null, [x, BT + 0.5, z + 0.75], 0.3); });
      var bush = lathe([[0.44, -0.62], [0.95, -0.62], [0.95, 0.62], [0.44, 0.62]], M.brass, 32, true); bush.position.set(0, YS, z); add(bush);
    }
    bearing(ZRB); bearing(ZFB);

    /* ── 转子：轴、线圈、铜环、小皮带轮（整体绕 z 轴转） ── */
    var rotor = group(null, [0, YS, 0]);
    mesh(new T.CylinderGeometry(0.42, 0.42, 23.4, 24).rotateX(Math.PI / 2), M.steel, [0, 0, 3.25], rotor);
    // 线圈：圆角矩形线束（竖直平面 y-z 内），表面画出一股股漆包线
    var tWind = tex(16, 256, function (g, w, h) { for (var i = 0; i < 16; i++) { var y = i * h / 16; var gr = g.createLinearGradient(0, y, 0, y + h / 16); gr.addColorStop(0, '#7A3A14'); gr.addColorStop(0.5, '#F0A46A'); gr.addColorStop(1, '#7A3A14'); g.fillStyle = gr; g.fillRect(0, y, w, h / 16); } });
    tWind.wrapS = tWind.wrapT = T.RepeatWrapping; tWind.repeat.set(1, 1);
    var coilMat = std(0xffffff, { map: tWind, roughness: 0.3, metalness: 0.55, envMapIntensity: 0.9 });
    var coilPts = (function () {
      var p = [], cr = 0.95, n = 10, cs = [[RC - cr, LC - cr, 0], [-(RC - cr), LC - cr, Math.PI / 2], [-(RC - cr), -(LC - cr), Math.PI], [RC - cr, -(LC - cr), Math.PI * 1.5]];
      cs.forEach(function (c) { for (var i = 0; i <= n; i++) { var a = c[2] + i / n * Math.PI / 2; p.push(new T.Vector3(0, c[0] + cr * Math.cos(a), c[1] + cr * Math.sin(a))); } });
      return p;
    })();
    var coilGeo = new T.TubeGeometry(new T.CatmullRomCurve3(coilPts, true, 'centripetal'), 220, RCW, 14, true);
    var coil = add(new T.Mesh(coilGeo, coilMat), rotor);
    coil.scale.x = 1.45;   // 线束截面压扁一点（沿轴的方向更厚），像绕了很多圈的线圈
    // 线圈两端和轴之间的电木夹块
    [-LC, LC].forEach(function (z) { var b = mesh(new T.BoxGeometry(1.9, 1.7, 1.25), M.bake, [0, 0, z], rotor); });
    // 切割磁感线时两条长边发亮
    var glowMat = new T.MeshBasicMaterial({ color: 0xFFB54A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var glowSides = [1, -1].map(function (s) { var g = new T.Mesh(new T.CylinderGeometry(RCW * 1.5, RCW * 1.5, 2 * LC - 1.7, 16, 1, true).rotateX(Math.PI / 2), glowMat); g.scale.x = 1.15; g.position.set(0, s * RC, 0); g.renderOrder = 3; rotor.add(g); return g; });
    // 电流方向小箭头（转得慢时显示）
    var arrowMat = new T.MeshBasicMaterial({ color: 0xFE752D, toneMapped: false });
    var arrows = [1, -1].map(function (s) {
      var a = new T.Group(); a.position.set(0, s * (RC + 1.35), 0); rotor.add(a);
      var shaft = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 2.6, 10).rotateX(Math.PI / 2), arrowMat); shaft.position.z = -0.5; a.add(shaft);
      var head = new T.Mesh(new T.ConeGeometry(0.42, 1.1, 14).rotateX(Math.PI / 2), arrowMat); head.position.z = 1.2; a.add(head);
      a.visible = false; return a;
    });
    // 运动模糊：转得快时线圈留下淡淡的影子
    var ghostMat = coilMat.clone(); ghostMat.transparent = true; ghostMat.opacity = 0.16; ghostMat.depthWrite = false;
    var ghosts = [1, 2, 3, 4, 5].map(function () { var g = new T.Group(); rotor.parent.add(g); g.position.copy(rotor.position); var m = new T.Mesh(coilGeo, ghostMat); m.scale.x = 1.45; g.add(m); g.visible = false; return g; });
    // 线圈两头的引线沿轴接到两个铜环
    rotor.add(tube([[0, 0.75, LC + 0.5], [0, 0.95, LC + 1.6], [0, 1.02, ZFB - 0.9], [0, 0.98, ZFB + 0.9], [0, 1.0, ZR1 - 0.5]], 0.1, M.copper, 40));
    rotor.add(tube([[0, -0.75, LC + 0.5], [0, -0.95, LC + 1.6], [0, -1.02, ZFB - 0.9], [0, -0.98, ZFB + 0.9], [0, -0.98, ZR1 + 0.9], [0, -1.0, ZR2 - 0.5]], 0.1, M.copper, 40));
    // 绝缘套筒、两个铜环、中间的隔片
    add(lathe([[0.42, 7.5], [0.95, 7.5], [0.95, 11.5], [0.42, 11.5]], M.bake, 32, true), rotor);
    [ZR1, ZR2].forEach(function (z) { var r = add(lathe([[0.95, -0.42], [1.3, -0.42], [1.38, -0.34], [1.38, 0.34], [1.3, 0.42], [0.95, 0.42]], M.brass, 48, true), rotor); r.position.z = z; });
    var sep = add(lathe([[0.95, -0.12], [1.62, -0.12], [1.62, 0.12], [0.95, 0.12]], M.bake, 40, true), rotor); sep.position.z = (ZR1 + ZR2) / 2;
    // 小皮带轮（前面有一条红色记号，看得出在转）
    var sp = add(lathe([[0.42, -0.72], [2.5, -0.72], [2.5, -0.46], [1.98, -0.14], [1.86, 0], [1.98, 0.14], [2.5, 0.46], [2.5, 0.72], [0.9, 0.72], [0.9, 1.3], [0.42, 1.3]], M.alu, 48, true), rotor); sp.position.z = ZP;
    mesh(new T.BoxGeometry(0.34, 1.5, 0.06), new T.MeshBasicMaterial({ color: 0xE8452B }), [0, 1.65, ZP + 0.75], rotor, false);

    /* ── 电刷（两片铜片从下面压在铜环上）和电木座 ── */
    (function () {
      var blk = slab(rrect(3.2, 4.2, 0.4, -4.9, (ZR1 + ZR2) / 2), 2.9, 0.18, M.bake, BT);
      [ZR1, ZR2].forEach(function (z) {
        var ca = -Math.PI * 0.68, cx = 1.38 * Math.cos(ca), cy = YS + 1.38 * Math.sin(ca);
        var path = new T.CatmullRomCurve3([V3([-4.4, BT + 2.9, 0]), V3([-4.25, BT + 4.6, 0]), V3([-3.4, cy - 1.15, 0]), V3([-2.0, cy - 0.35, 0]), V3([cx + 0.05, cy + 0.02, 0])]);
        var P = path.getPoints(30), sh = new T.Shape(), th = 0.13, i, L = [], R = [];
        for (i = 0; i < P.length; i++) { var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy); L.push([P[i].x - dy / l * th, P[i].y + dx / l * th]); R.push([P[i].x, P[i].y]); }
        sh.moveTo(R[0][0], R[0][1]); R.forEach(function (p) { sh.lineTo(p[0], p[1]); }); for (i = L.length - 1; i >= 0; i--) sh.lineTo(L[i][0], L[i][1]);
        plate(sh, 0.72, 0, M.copper, z - 0.36);
        screw(null, [-4.9, BT + 2.92, z], 0.34);
      });
    })();

    /* ── 大轮（带摇把）＋支架＋皮带 ── */
    (function () {
      var s = new T.Shape(); s.moveTo(XW - 5.8, BT); s.lineTo(XW + 5.8, BT); s.lineTo(XW + 1.5, YW - 0.6); s.absarc(XW, YW, 1.6, -0.36, Math.PI + 0.36, false); s.lineTo(XW - 5.8, BT);
      var h = new T.Path(); h.moveTo(XW - 3.3, BT + 1.4); h.lineTo(XW, YW - 3.2); h.lineTo(XW + 3.3, BT + 1.4); h.lineTo(XW - 3.3, BT + 1.4); s.holes.push(h);
      plate(s, 1.2, 0.15, M.iron, ZP - 2.75);
      mesh(new T.BoxGeometry(13, 0.5, 3), M.iron, [XW, BT + 0.25, ZP - 2.15]);
      [-5.4, 5.4].forEach(function (x) { screw(null, [XW + x, BT + 0.5, ZP - 1.05], 0.3); });
      var pin = lathe([[0, -1.9], [0.5, -1.9], [0.5, 1.4], [0.75, 1.4], [0.75, 1.75], [0, 1.75]], M.steel, 24, true); pin.position.set(XW, YW, ZP - 0.6); add(pin);
    })();
    var wheel = group(null, [XW, YW, ZP]);
    add(lathe([[7.5, -0.8], [9.0, -0.8], [9.0, -0.56], [8.45, -0.2], [8.3, 0], [8.45, 0.2], [9.0, 0.56], [9.0, 0.8], [7.5, 0.8], [7.4, 0.5], [7.4, -0.5], [7.5, -0.8]], M.wheel, 64, true), wheel);
    add(lathe([[0.5, -1.5], [1.5, -1.5], [1.7, -1.2], [1.7, 1.0], [1.4, 1.3], [0.5, 1.3]], M.wheel, 32, true), wheel);
    for (var si = 0; si < 5; si++) {
      var sk = new T.Mesh(new T.CylinderGeometry(0.42, 0.62, 6.1, 12), M.wheel); sk.scale.z = 0.6;
      var sa = si / 5 * Math.PI * 2 + 0.3; sk.position.set(Math.cos(sa) * 4.5, Math.sin(sa) * 4.5, 0); sk.rotation.z = sa - Math.PI / 2; add(sk, wheel);
    }
    var HA = Math.PI / 2 + 0.3, HR = 7.0;   // 摇把在大轮上的角度、半径
    (function () {
      var arm = new T.Shape(), w0 = 1.15, w1 = 0.7;
      arm.moveTo(0, -w0); arm.lineTo(HR, -w1); arm.absarc(HR, 0, w1, -Math.PI / 2, Math.PI / 2, false); arm.lineTo(0, w0); arm.absarc(0, 0, w0, Math.PI / 2, Math.PI * 1.5, false);
      var am = plate(arm, 0.55, 0.1, M.wheel, 1.35, wheel); am.rotation.z = HA;
      var hx = Math.cos(HA) * HR, hy = Math.sin(HA) * HR;
      var hp = lathe([[0, 1.8], [0.3, 1.8], [0.3, 6.6], [0.55, 6.6], [0.55, 6.9], [0, 6.9]], M.steel, 20, true); hp.position.set(hx, hy, 0); add(hp, wheel);
      var gr = lathe([[0.32, 2.1], [0.78, 2.15], [0.92, 2.6], [0.82, 3.6], [0.95, 4.9], [1.0, 5.7], [0.85, 6.3], [0.32, 6.45]], M.grip, 32, true); gr.position.set(hx, hy, 0); add(gr, wheel);
    })();
    // 拖动用的看不见的拾取体：摇把把手 + 整个大轮
    var hitKnob = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 7, 12).rotateX(Math.PI / 2), M.hit); hitKnob.position.set(Math.cos(HA) * HR, Math.sin(HA) * HR, 4.2); wheel.add(hitKnob);
    var hitWheel = new T.Mesh(new T.CylinderGeometry(9.6, 9.6, 2.2, 32).rotateX(Math.PI / 2), M.hit); wheel.add(hitWheel);
    // 皮带：两段圆弧 + 两条外公切线
    var belt = (function () {
      var c1 = new T.Vector2(0, YS), c2 = new T.Vector2(XW, YW), d = c2.clone().sub(c1), D = d.length(), al = Math.atan2(d.y, d.x), g = Math.acos((R1 - R2) / D);
      var pts = [], i, n1 = 30, n2 = 60, a, A1 = al + g, A2 = al - g + Math.PI * 2;   // 小轮上：从 al+g 绕到 al-g（经过远离大轮的一侧）
      for (i = 0; i <= n1; i++) { a = A1 + (A2 - A1) * i / n1; pts.push(new T.Vector3(c1.x + R1 * Math.cos(a), c1.y + R1 * Math.sin(a), ZP)); }
      var B1 = al - g, B2 = al + g;   // 大轮上：从 al-g 绕到 al+g（经过远离小轮的一侧）
      var e1 = new T.Vector3(c1.x + R1 * Math.cos(A2), c1.y + R1 * Math.sin(A2), ZP), s2 = new T.Vector3(c2.x + R2 * Math.cos(B1), c2.y + R2 * Math.sin(B1), ZP);
      for (i = 1; i < 8; i++) pts.push(e1.clone().lerp(s2, i / 8));
      for (i = 0; i <= n2; i++) { a = B1 + (B2 - B1) * i / n2; pts.push(new T.Vector3(c2.x + R2 * Math.cos(a), c2.y + R2 * Math.sin(a), ZP)); }
      var e2 = new T.Vector3(c2.x + R2 * Math.cos(B2), c2.y + R2 * Math.sin(B2), ZP), s1 = pts[0].clone();
      for (i = 1; i < 8; i++) pts.push(e2.clone().lerp(s1, i / 8));
      var len = R1 * (A2 - A1) + R2 * (B2 - B1) + 2 * e1.distanceTo(s2);
      var m = add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true, 'catmullrom', 0.2), 360, 0.3, 10, true), M.rubber));
      tBelt.repeat.set(len / 3.2, 1);
      return { mesh: m, len: len, low: e1.clone().lerp(s2, 0.62) };
    })();

    /* ── 接线柱（底板左边）和底板上的短线 ── */
    function terminal(parent, p, cap) {
      var g = group(parent, p);
      add(lathe([[0, 0], [0.95, 0], [0.95, 0.18], [0.5, 0.3], [0.5, 1.3], [0, 1.3]], M.brass, 24), g);
      add(lathe([[0, 1.0], [0.82, 1.0], [0.88, 1.15], [0.88, 2.0], [0.7, 2.25], [0, 2.3]], cap, 24), g);
      for (var i = 0; i < 12; i++) { var r = new T.Mesh(new T.BoxGeometry(0.08, 0.9, 0.1), cap); var a = i / 12 * Math.PI * 2; r.position.set(Math.cos(a) * 0.88, 1.58, Math.sin(a) * 0.88); r.rotation.y = -a; g.add(r); }
      return g;
    }
    var tA = terminal(null, [-11.8, BT, 7.0], M.wRed), tB = terminal(null, [-11.8, BT, 12.6], M.wBlk);
    add(tube([[-4.9, BT + 3.1, ZR1], [-6.3, BT + 2.2, ZR1 - 0.4], [-9.2, BT + 0.35, 7.4], [-11.1, BT + 0.9, 7.0]], 0.14, M.wRed, 40));
    add(tube([[-4.9, BT + 3.1, ZR2], [-6.4, BT + 2.2, ZR2 + 0.6], [-9.2, BT + 0.35, 12.2], [-11.1, BT + 0.9, 12.6]], 0.14, M.wBlk, 40));

    /* ── 小灯泡（灯座在桌上） ── */
    var bulbG = group(null, [-24.5, 0, 12.5], 0.42), S = 2.7;
    slab(rrect(9.6, 5.2, 0.8, 0, 0), 1.1, 0.25, M.bake, 0, bulbG);
    var sock = group(bulbG, [0, 1.1, -0.3]); sock.scale.setScalar(S);
    add(lathe([[0, 0], [1.25, 0], [1.25, 0.32], [1.0, 0.45], [1.0, 1.3], [0.78, 1.42], [0.78, 1.55], [0, 1.55]], std(0xF1F0EC, { roughness: 0.35 }), 40), sock);
    var lamp = group(sock, [0, 1.55, 0]), scr = [[0, -0.05], [0.42, -0.05]], i;
    for (i = 0; i < 8; i++) scr.push([i % 2 ? 0.47 : 0.53, 0.05 + i * 0.1]);
    scr.push([0.46, 0.82], [0.46, 0.9], [0, 0.9]);
    add(lathe(scr, M.steel, 32), lamp);
    var glass = lathe([[0.4, 0.82], [0.44, 1.0], [0.6, 1.22], [0.85, 1.5], [0.97, 1.86], [0.95, 2.18], [0.83, 2.48], [0.6, 2.7], [0.3, 2.83], [0, 2.86]], new T.MeshStandardMaterial({ color: 0xF4F8FC, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, envMapIntensity: 1.4 }), 48);
    glass.renderOrder = 2; lamp.add(glass);
    var FY = 1.95;
    [-0.3, 0.3].forEach(function (x) { var c = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, FY - 0.9, 6), M.steel); c.position.set(x, (FY + 0.9) / 2, 0); lamp.add(c); });
    var hel = []; for (i = 0; i <= 64; i++) { var hk = i / 64, ha = hk * Math.PI * 14; hel.push(new T.Vector3(-0.3 + 0.6 * hk, FY + Math.sin(ha) * 0.06, Math.cos(ha) * 0.06)); }
    var hc = new T.CatmullRomCurve3(hel);
    lamp.add(new T.Mesh(new T.TubeGeometry(hc, 120, 0.024, 6), std(0x4A4038, { roughness: 0.6 })));
    var hotMat = new T.MeshBasicMaterial({ color: 0xFFD27A, toneMapped: false }), hotM = new T.Mesh(new T.TubeGeometry(hc, 120, 0.045, 6), hotMat); lamp.add(hotM);
    var innerMat = new T.MeshBasicMaterial({ color: 0xFFD25A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var inner = new T.Mesh(new T.SphereGeometry(0.84, 24, 16), innerMat); inner.position.set(0, 1.86, 0); inner.renderOrder = 3; lamp.add(inner);
    var glowTex = tex(128, 128, function (g) { var r = g.createRadialGradient(64, 64, 0, 64, 64, 64); [[0, 'rgba(255,255,236,1)'], [0.12, 'rgba(255,240,180,.95)'], [0.3, 'rgba(255,205,90,.65)'], [0.55, 'rgba(255,170,50,.25)'], [0.8, 'rgba(255,150,30,.07)'], [1, 'rgba(255,140,20,0)']].forEach(function (q) { r.addColorStop(q[0], q[1]); }); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    var halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xFFD27A, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    halo.position.set(0, FY, 0); halo.renderOrder = 4; lamp.add(halo);
    var lampLight = new T.PointLight(0xFFB860, 0, 0, 2); lampLight.position.set(0, FY, 0); lamp.add(lampLight);
    var bA = terminal(bulbG, [-3.3, 1.1, 1.3], M.brass), bB = terminal(bulbG, [3.3, 1.1, 1.3], M.brass);
    var FIL = [new T.Color(0xFF3A0A), new T.Color(0xFF9A2E), new T.Color(0xFFF6DC)], TINT = [new T.Color(0xFF6A2A), new T.Color(0xFFB060), new T.Color(0xFFE9A0)], col = new T.Color();
    function ramp(cs, k) { return k < 0.45 ? col.copy(cs[0]).lerp(cs[1], k / 0.45) : col.copy(cs[1]).lerp(cs[2], Math.min(1, (k - 0.45) / 0.55)); }
    function setLamp(f) {   // f = 灯丝此刻的功率 / 额定功率
      var k = clamp((f - 0.02) / 0.98, 0, 1.4), on = k > 0;
      hotM.visible = inner.visible = halo.visible = on; lampLight.intensity = on ? 900 * Math.min(1.3, k) : 0;
      if (!on) return;
      hotMat.color.copy(ramp(FIL, Math.min(1, k)));
      var tint = ramp(TINT, Math.min(1, k)); halo.material.color.copy(tint); innerMat.color.copy(tint); lampLight.color.copy(tint);
      innerMat.opacity = Math.min(0.8, 0.7 * Math.pow(k, 0.7));
      halo.material.opacity = Math.min(1, 0.25 + 0.75 * Math.pow(k, 0.6));
      var s = 1.4 + 2.4 * Math.min(1.3, k); halo.scale.set(s, s, 1);
    }

    /* ── 灵敏电流计（零刻度在中央，样子同实验页） ── */
    var galG = group(null, [-38, 0, -0.5], 0.5), GW = 12.4, GH = 10.6, GD = 4.6;
    plate(rrect(GW, GH, 1.2, 0, GH / 2 + 0.5), GD, 0.35, std(0x2E3744, { roughness: 0.45 }), -GD / 2, galG);
    [-GW / 2 + 1.6, GW / 2 - 1.6].forEach(function (x) { mesh(new T.BoxGeometry(1.6, 0.5, GD + 0.6), M.bake, [x, 0.25, 0], galG); });
    var face = tex(720, 560, function (c, w, h) {
      c.fillStyle = '#F7F4EA'; c.fillRect(0, 0, w, h);
      var px = 360, py = 470, R = 330; c.strokeStyle = '#1E3A5F'; c.fillStyle = '#1E3A5F';
      c.lineWidth = 4; c.beginPath(); c.arc(px, py, R, -Math.PI / 2 - Math.PI / 4, -Math.PI / 2 + Math.PI / 4); c.stroke();
      for (var d = -30; d <= 30; d++) {
        var a = d / 10 * 15 * Math.PI / 180, l = d % 10 === 0 ? 44 : d % 5 === 0 ? 30 : 18, sx = Math.sin(a), sy = -Math.cos(a);
        c.lineWidth = d % 10 === 0 ? 5 : 2.6; c.beginPath(); c.moveTo(px + sx * R, py + sy * R); c.lineTo(px + sx * (R - l), py + sy * (R - l)); c.stroke();
        if (d % 10 === 0) { c.font = 'bold 44px Bahnschrift, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.abs(d / 10)), px + sx * (R + 32), py + sy * (R + 32)); }
      }
      c.font = 'italic bold 64px "Times New Roman", serif'; c.fillText('G', px, py - 120);
      c.strokeStyle = '#B8B2A0'; c.lineWidth = 3; c.strokeRect(10, 10, w - 20, h - 20);
    });
    var FW = 10.2, FH = 7.9, FYc = GH / 2 + 1.3, FZ = GD / 2 + 0.36;
    mesh(new T.PlaneGeometry(FW, FH), new T.MeshStandardMaterial({ map: face, roughness: 0.6, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.25 }), [0, FYc, FZ + 0.01], galG, false);
    var gl2 = mesh(new T.PlaneGeometry(FW, FH), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.03, metalness: 0, envMapIntensity: 1.6, depthWrite: false }), [0, FYc, FZ + 0.2], galG, false); gl2.renderOrder = 2;
    var galNeedle = group(galG, [0, FYc - FH / 2 + FH * (90 / 560), FZ + 0.08]);
    var nl = FW * 300 / 720;
    mesh(new T.BoxGeometry(0.1, nl, 0.04), new T.MeshBasicMaterial({ color: 0xE2551C }), [0, nl / 2, 0], galNeedle, false);
    mesh(new T.CircleGeometry(0.32, 24), new T.MeshBasicMaterial({ color: 0x1E3A5F }), [0, 0, 0.03], galNeedle, false);
    var zs = add(lathe([[0, 0], [0.5, 0], [0.5, 0.25], [0, 0.3]], M.bake, 24, true), galG); zs.position.set(0, 1.6, GD / 2 + 0.3);   // 调零螺丝
    var gA = terminal(galG, [-3.6, GH + 0.5, 0], M.wRed), gB = terminal(galG, [3.6, GH + 0.5, 0], M.wBlk);

    /* ── 外接导线：接线柱 A → 灯 → 电流计 → 接线柱 B（光滑软线，垂到桌面上） ── */
    scene.updateMatrixWorld(true);
    function top(g) { return g.localToWorld(new T.Vector3(0, 2.0, 0)); }
    function lift(p, dy) { return new T.Vector3(p.x, p.y + dy, p.z); }
    var A0 = top(tA), B0 = top(tB), LA = top(bA), LB = top(bB), GA = top(gA), GB = top(gB);
    add(tube([A0, lift(A0, 1.6), new T.Vector3(-14.5, 1.0, 6.2), new T.Vector3(-19, 0.32, 8.5), new T.Vector3(-25, 0.32, 9.2), lift(LA, 2.4).add(new T.Vector3(-0.6, 0, -1.2)), lift(LA, 0.8), LA], 0.22, M.wRed, 120));
    add(tube([LB, lift(LB, 1.2), new T.Vector3(LB.x + 1.6, 1.2, LB.z + 2.4), new T.Vector3(-23, 0.32, 19.5), new T.Vector3(-33, 0.32, 17), new T.Vector3(-41, 0.32, 9), new T.Vector3(-43.5, 2.0, 1.2), new T.Vector3(GA.x - 2.0, GA.y + 2.4, GA.z - 0.6), lift(GA, 0.7), GA], 0.22, M.wRed, 160));
    add(tube([GB, lift(GB, 0.7), new T.Vector3(GB.x + 1.6, GB.y + 2.6, GB.z - 1.2), new T.Vector3(-30, 6.5, -6.5), new T.Vector3(-26, 0.32, -6.5), new T.Vector3(-17.5, 0.32, -3.5), new T.Vector3(-16.2, 1.2, 4.5), new T.Vector3(-14.5, 3.6, 12.8), lift(B0, 1.4), B0], 0.22, M.wBlk, 160));

    /* ── 状态与物理 ── */
    var st = { mode: 'hand', target: 0, w: 0, phi: 1.0 / RATIO, lines: true, names: true };   // 开始时线圈斜着停，看得清是个线框
    var nd = { th: 0, v: 0 }, fil = 0, wave = [], waveT = 0, hand = { a: 0, phi: 0, last: 0 }, idle = 0;
    function theta() { return st.phi * RATIO; }
    function nNow() { return Math.abs(st.w) / (2 * Math.PI); }
    function avgFrac(w) { var Im = KE * Math.abs(w) / RT; return Im * Im / 2 * RL / P0; }

    function step(dt) {
      var th0 = theta();
      if (st.mode === 'drag') {
        var dphi = hand.phi - st.phi; st.phi = hand.phi;
        var wi = dt > 0 ? dphi * RATIO / dt : 0; wi = clamp(wi, -2 * Math.PI * 14, 2 * Math.PI * 14);
        st.w += (wi - st.w) * Math.min(1, dt / 0.09);
      } else {
        var wT = st.mode === 'coast' ? 0 : DIR * 2 * Math.PI * st.target, tau = st.mode === 'coast' ? 0.7 : (Math.abs(wT) < Math.abs(st.w) ? 0.3 : 0.45);
        st.w += (wT - st.w) * (1 - Math.exp(-dt / tau));
        if (wT === 0 && Math.abs(st.w) < 0.03) { st.w = 0; if (st.mode === 'coast') st.mode = 'hand'; }
        st.phi += st.w / RATIO * dt;
      }
      var th1 = theta(), N = Math.max(1, Math.ceil(dt / 0.002)), h = dt / N, w0 = 2 * Math.PI * F0;
      for (var k = 0; k < N; k++) {
        var th = th0 + (th1 - th0) * (k + 0.5) / N, e = KE * st.w * Math.sin(th), cur = e / RT;
        var tgt = GAIN * cur;
        nd.v += (w0 * w0 * (tgt - nd.th) - 2 * ZETA * w0 * nd.v) * h; nd.th += nd.v * h;
        if (Math.abs(nd.th) > PIN) { nd.th = PIN * Math.sign(nd.th); nd.v = -0.25 * nd.v; }
        fil += (cur * cur * RL / P0 - fil) * Math.min(1, h / 0.08);
        waveT += h; if (waveT >= 0.01) { waveT -= 0.01; wave.push(cur); if (wave.length > 300) wave.shift(); }
      }
      if (Math.abs(nd.th) < 1e-4 && Math.abs(nd.v) < 1e-3 && st.w === 0) { nd.th = 0; nd.v = 0; }
      if (fil < 1e-5) fil = 0;
    }

    /* ── 拖摇把 ── */
    var crankPlane = new T.Plane(new T.Vector3(0, 0, 1), -(ZP + 3));
    function handAngle(ev) { var p = ctx.onPlane(ev, crankPlane); return p ? Math.atan2(p.y - YW, p.x - XW) : null; }
    ctx.drag = {
      hit: function (ev) { return !!ctx.pick(ev, [hitKnob, hitWheel]); },
      start: function (ev) {
        if (!ctx.pick(ev, [hitKnob, hitWheel])) return false;
        var a = handAngle(ev); if (a == null) return false;
        hand.a = a; hand.phi = st.phi; st.mode = 'drag'; st.target = 0; uiKey = ''; return true;
      },
      move: function (ev) {
        var a = handAngle(ev); if (a == null) return;
        var d = a - hand.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        hand.a = a; hand.phi += d;
      },
      end: function () { if (st.mode === 'drag') st.mode = 'coast'; uiKey = ''; }
    };

    /* ── 观察小窗：电流计表盘放大 + 电流随时间变化 ── */
    var win = document.createElement('div'); win.className = 'ls-win'; win.style.width = '330px';
    var dial = '<svg viewBox="0 0 320 150" style="background:#FBF9F2;border:1.5px solid #C3CEDC">', px = 160, py = 142, RR = 118;
    dial += '<path d="M' + (px - RR * Math.SQRT1_2).toFixed(1) + ' ' + (py - RR * Math.SQRT1_2).toFixed(1) + ' A' + RR + ' ' + RR + ' 0 0 1 ' + (px + RR * Math.SQRT1_2).toFixed(1) + ' ' + (py - RR * Math.SQRT1_2).toFixed(1) + '" fill="none" stroke="#1E3A5F" stroke-width="2"/>';
    for (var dd = -30; dd <= 30; dd++) {
      var da = dd * 1.5 * Math.PI / 180, dl = dd % 10 === 0 ? 14 : dd % 5 === 0 ? 10 : 5, dx = Math.sin(da), dy = -Math.cos(da);
      dial += '<line x1="' + (px + dx * RR).toFixed(1) + '" y1="' + (py + dy * RR).toFixed(1) + '" x2="' + (px + dx * (RR - dl)).toFixed(1) + '" y2="' + (py + dy * (RR - dl)).toFixed(1) + '" stroke="#1E3A5F" stroke-width="' + (dd % 5 ? 1 : 1.8) + '"/>';
      if (dd % 10 === 0) dial += '<text x="' + (px + dx * (RR + 12)).toFixed(1) + '" y="' + (py + dy * (RR + 12) + 5).toFixed(1) + '" text-anchor="middle" font-size="15" font-family="Bahnschrift, Arial" fill="#1E3A5F">' + Math.abs(dd / 10) + '</text>';
    }
    dial += '<text x="' + px + '" y="' + (py - 46) + '" text-anchor="middle" font-size="24" font-style="italic" font-family="Times New Roman" fill="#1E3A5F">G</text>';
    dial += '<text x="' + (px - 96) + '" y="' + (py - 4) + '" text-anchor="middle" font-size="14" fill="#56677D">← 向左偏</text><text x="' + (px + 96) + '" y="' + (py - 4) + '" text-anchor="middle" font-size="14" fill="#56677D">向右偏 →</text>';
    dial += '<line id="gn" x1="' + px + '" y1="' + py + '" x2="' + px + '" y2="' + (py - RR + 4) + '" stroke="#FE752D" stroke-width="3.5" stroke-linecap="round"/><circle cx="' + px + '" cy="' + py + '" r="6" fill="#1E3A5F"/></svg>';
    win.innerHTML = '<h3><span>电流计</span><small>零刻度在中央</small></h3>' + dial +
      '<div style="display:flex;justify-content:space-between;margin:6px 2px 2px;font-size:15px;color:var(--t2,#56677D)"><span>电流的变化（最近 3 秒）</span><span>上 = 指针向右</span></div>' +
      '<canvas width="680" height="190" style="border:1.5px solid #C3CEDC;background:#fff"></canvas><p class="cap"></p>';
    ctx.host.appendChild(win);
    var gn = win.querySelector('#gn'), wc = win.querySelector('canvas'), wg = wc.getContext('2d'), cap = win.querySelector('.cap');
    function drawWin() {
      var na = nd.th * 15 * Math.PI / 180;
      gn.setAttribute('x2', (px + Math.sin(na) * (RR - 4)).toFixed(1)); gn.setAttribute('y2', (py - Math.cos(na) * (RR - 4)).toFixed(1));
      var W = wc.width, H = wc.height, mid = H / 2;
      wg.clearRect(0, 0, W, H);
      wg.strokeStyle = '#E3E8EF'; wg.lineWidth = 1; for (var x = 0; x <= W; x += 68) { wg.beginPath(); wg.moveTo(x, 0); wg.lineTo(x, H); wg.stroke(); }
      wg.strokeStyle = '#9AA8B9'; wg.lineWidth = 1.5; wg.beginPath(); wg.moveTo(0, mid); wg.lineTo(W, mid); wg.stroke();
      var mx = 0; for (var j = 0; j < wave.length; j++) mx = Math.max(mx, Math.abs(wave[j]));
      var full = mx <= 0.03 ? 0.03 : mx <= 0.1 ? 0.1 : mx <= 0.3 ? 0.3 : 0.5, sc = (mid - 10) / full;   // 纵轴按电流大小分几挡，顶上标出这一挡是多少安
      wg.strokeStyle = '#2563EB'; wg.lineWidth = 3; wg.lineJoin = 'round'; wg.beginPath();
      var n0 = 300 - wave.length;
      for (var i = 0; i < wave.length; i++) { var xx = (n0 + i) / 299 * W, yy = mid - clamp(wave[i], -0.47, 0.47) * sc; if (i) wg.lineTo(xx, yy); else wg.moveTo(xx, yy); }
      wg.stroke();
      wg.font = '24px "Microsoft YaHei", sans-serif';
      [['0', mid + 9], [full + ' 安', 26]].forEach(function (L) { var tw = wg.measureText(L[0]).width; wg.fillStyle = 'rgba(255,255,255,.88)'; wg.fillRect(4, L[1] - 22, tw + 10, 28); wg.fillStyle = '#56677D'; wg.fillText(L[0], 9, L[1]); });
      wg.strokeStyle = '#C3CEDC'; wg.setLineDash([6, 6]); wg.beginPath(); wg.moveTo(0, 10); wg.lineTo(W, 10); wg.moveTo(0, H - 10); wg.lineTo(W, H - 10); wg.stroke(); wg.setLineDash([]);
    }

    /* ── 右栏 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>手摇发电机</b><p>用鼠标按住摇把拖着转圈，或点下面的按钮。线圈在磁体两极之间转动，电路里就有了电流。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">摇把</div>' +
        '<div class="ls-btns"><button data-a="slow">摇慢一点</button><button data-a="fast" class="main">摇快一点</button><button data-a="stop">停</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span class="ls-tip" style="flex:none">停</span><input class="rng" type="range" min="0" max="100" value="0" style="flex:1"><span class="ls-tip" style="flex:none">快</span></div>' +
        '</div>' +
      '<div class="ls-blk"><div class="ls-h">看到了什么</div>' +
        '<div class="ls-row"><span class="nm" style="width:136px">线圈每秒转几圈</span><span class="vl" data-v="n" style="min-width:0">0</span><span class="ls-tip" data-v="nc"></span></div>' +
        '<div class="ls-row"><span class="nm" style="width:136px">电流（指针读数）</span><span class="vl" data-v="g" style="min-width:0;font-size:22px">0</span></div>' +
        '<div class="ls-row"><span class="nm" style="width:136px">电流最大约</span><span class="vl" data-v="im" style="min-width:0">0</span><span class="ls-tip">安</span></div>' +
        '<div class="ls-row"><span class="nm" style="width:136px">灯的亮度</span><span class="vl" data-v="lamp" style="min-width:0;font-size:22px">不亮</span></div>' +
        '<p class="ls-tip" data-v="note" style="margin-top:4px;min-height:46px"></p></div>' +
      '<div class="ls-blk"><div class="ls-h">结论</div><div class="ls-note" style="padding:8px 12px">' +
        '<div data-c="cut">① 线圈转动、切割磁感线，就产生感应电流。</div>' +
        '<div data-c="fast">② 转得越快，电流越大，灯越亮。</div>' +
        '<div data-c="ac">③ 电流方向在不断改变，是交流电。</div>' +
        '<div data-c="stop">④ 不转就没有电流。</div></div></div>' +
      '<div class="ls-btns"><button data-t="lines">显示磁感线</button><button data-t="names">零件名称</button></div>' +
      '<p class="ls-tip">示意图，大小不按比例。线圈每秒转 10 圈左右，小灯泡正常发光。</p>'
    );
    var slider = ctx.$('input.rng');
    function setTarget(n) { if (st.mode === 'drag') return; st.mode = 'hand'; st.target = n; slider.value = Math.round(Math.sqrt(n / 10) * 100); uiKey = ''; }
    function levelOf() { var n = st.mode === 'hand' ? st.target : nNow(), i = 0; for (var k = 0; k < LEVELS.length; k++) if (LEVELS[k] <= n + 1e-6) i = k; return { i: i, exact: Math.abs(LEVELS[i] - n) < 1e-3 }; }
    ctx.$$('[data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-a'), L = levelOf();
        if (st.mode === 'coast') st.mode = 'hand';
        if (a === 'stop') setTarget(0);
        else if (a === 'fast') setTarget(LEVELS[Math.min(LEVELS.length - 1, L.i + 1)]);
        else setTarget(LEVELS[L.i === 0 ? 1 : Math.max(1, L.exact ? L.i - 1 : L.i)]);
      };
    });
    slider.oninput = function () { var s = slider.value / 100; setTarget(+(10 * s * s).toFixed(2)); };
    ctx.$$('[data-t]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-t'); st[k] = !st[k]; uiKey = ''; }; });

    var uiKey = '', uiT = 0;
    function setText(sel, t) { var e = ctx.$(sel); if (e && e.innerHTML !== t) e.innerHTML = t; }
    function ui(dt) {
      uiT += dt; if (uiT < 0.12 && uiKey) return; uiT = 0;
      var n = nNow(), fa = avgFrac(st.w), moving = n > 0.02, fast = n >= 3;
      var key = [n.toFixed(2), nd.th.toFixed(1), fa.toFixed(3), st.lines, st.names, st.mode, st.target].join('|'); if (key === uiKey) return; uiKey = key;
      setText('[data-v="n"]', moving ? (n < 1 ? n.toFixed(2) : n.toFixed(1)) : '0');
      setText('[data-v="nc"]', moving ? '圈（摇把 ' + (n / RATIO).toFixed(2) + ' 圈）' : '圈（摇把 0 圈）');
      var g = nd.th, gt = fast && moving ? '在 0 附近抖' : Math.abs(g) < 0.05 ? '0' : (g > 0 ? '偏右 ' : '偏左 ') + Math.abs(g).toFixed(1) + ' 格';
      setText('[data-v="g"]', gt);
      setText('[data-v="im"]', moving ? (KE * 2 * Math.PI * n / RT).toFixed(n < 1 ? 3 : 2) : '0');
      var lw = fa < 0.02 ? '不亮' : fa < 0.07 ? '灯丝微微发红' : fa < 0.25 ? '发暗光' : fa < 0.6 ? '比较亮' : '很亮';
      if (fa >= 0.02 && n < 3.2) lw += '，一闪一闪';
      setText('[data-v="lamp"]', lw);
      var note = !moving ? '不转：线圈不切割磁感线，没有电流。指针停在 0，灯不亮。'
        : st.mode === 'coast' ? '松手了，线圈越转越慢，电流越来越小，最后停下。'
        : n < 1.5 ? '摇得慢：电流小，灯不亮；看电流计——指针跟着线圈左一下、右一下。'
        : n < 3 ? '再快一些，指针就摆不过来了；灯丝开始发红。'
        : '摇快了，电流方向变得太快，指针来不及摆，只在 0 附近抖——这时看灯泡：转得越快灯越亮。';
      setText('[data-v="note"]', note);
      var on = !moving ? { stop: 1 } : n < 1.5 ? { cut: 1, ac: 1 } : { cut: 1, fast: 1 };
      ctx.$$('[data-c]').forEach(function (e) { var y = !!on[e.getAttribute('data-c')]; e.style.color = y ? 'var(--blue,#2563EB)' : 'var(--t2,#56677D)'; e.style.fontWeight = y ? '700' : '400'; });
      ctx.$$('[data-t]').forEach(function (b) { b.classList.toggle('on', !!st[b.getAttribute('data-t')]); });
      ctx.$$('[data-a]').forEach(function (b) { var a = b.getAttribute('data-a'); b.classList.toggle('on', a === 'stop' && !moving && st.target === 0); });
      if (document.activeElement !== slider && st.mode !== 'hand') slider.value = Math.round(Math.sqrt(Math.min(10, n) / 10) * 100);
      var s = Math.abs(Math.sin(theta()));
      cap.innerHTML = !moving ? '不转：没有电流' : n < 1.2 ? (s > 0.7 ? '线圈两边<b>正在切割磁感线</b>，产生电流' : s < 0.3 ? '线圈两边顺着磁感线走，不切割，电流几乎为 0' : '线圈两边斜着切割磁感线，电流较小') : '电流方向每秒改变约 <b>' + Math.round(2 * n) + '</b> 次';
    }

    /* ── 3D 标签 ── */
    var tagKey = '';
    function tags() {
      var c = ctx.camera.position, k = [c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2), st.names, ctx.host.clientWidth, ctx.host.clientHeight].join(',');
      if (k === tagKey) return; tagKey = k;
      var on = st.names;
      ctx.keepClear('coil', new T.Vector3(0, YS, 0), 62);
      ctx.tag('mag', '磁体', on ? new T.Vector3(-AO + 1, YS + MH / 2, -12) : null, { side: 'above', gap: 20, small: true });
      ctx.tag('coil', '线圈', on ? new T.Vector3(1.5, YS + 1, -3.5) : null, { side: 'above', gap: 40, small: true });
      ctx.tag('ring', '铜环和电刷', on ? new T.Vector3(-10.5, BT + 3.2, BZ1 + 1) : null, { side: 'below', gap: 30, small: true });
      ctx.tag('belt', '皮带', on ? belt.low.clone() : null, { side: 'below', gap: 18, small: true });
      ctx.tag('crank', '摇把', on ? new T.Vector3(XW + 4, YW + 10.4, ZP) : null, { side: 'above', gap: 16, small: true });
    }

    /* ── 每帧 ── */
    var lastTh = null;
    function frame(dt) {
      dt = dt || 0;
      var th = theta(), n = nNow();
      rotor.rotation.z = th; wheel.rotation.z = st.phi;
      tBelt.offset.x = (-st.phi * R2 / belt.len * tBelt.repeat.x) % 1;
      // 影子：本帧转过的角度分成几份
      var sweep = lastTh == null ? 0 : th - lastTh; lastTh = th;
      var gOn = n > 2.2;
      ghosts.forEach(function (g, i) { g.visible = gOn; if (gOn) g.rotation.z = th - sweep * (i + 1) / 6; });
      ghostMat.opacity = gOn ? Math.min(0.22, 0.06 + n * 0.015) : 0;
      // 切割磁感线：两条长边发亮（转得慢时随角度变化；转得快时看起来一直亮）
      var s = Math.sin(th), cutK = n < 0.02 ? 0 : n < 1.5 ? Math.abs(s) : 0.55;
      glowMat.opacity = 0.55 * cutK * Math.min(1, n / 0.15);
      // 电流方向箭头：边 1（rotor 局部 +y）电流沿 +z 当 ω·sinθ > 0
      var ar = n > 0.02 && n < 1.5 && Math.abs(s) > 0.25, sg = st.w * s > 0 ? 1 : -1;
      arrows[0].visible = arrows[1].visible = ar;
      if (ar) { arrows[0].rotation.y = sg > 0 ? 0 : Math.PI; arrows[1].rotation.y = sg > 0 ? Math.PI : 0; arrows.forEach(function (a) { a.scale.setScalar(0.6 + 0.4 * Math.abs(s)); }); }
      lineG.visible = st.lines;
      galNeedle.rotation.z = -nd.th * 15 * Math.PI / 180;
      setLamp(fil);
      tags();
      var busy = st.mode === 'drag' || st.w !== 0 || Math.abs(nd.th) > 1e-4 || Math.abs(nd.v) > 1e-3 || fil > 0;
      if (busy) idle = 0; else idle += dt;
      return busy || idle < 0.3;
    }

    // 默认视角：从右前方稍高处看，整套器材一眼看全
    ctx.target.set(-2, 13, 3);
    var o = ctx.orb; o.az = 0.12; o.el = 0.55; o.dist = 108; o.minAz = -0.85; o.maxAz = 1.0; o.minEl = 0.12; o.maxEl = 1.15; o.minDist = 55; o.maxDist = 190;
    ctx.sun.position.set(-35, 110, 70);

    /* 物理用定时器推进（和实验页 lab.js 一样：动画帧被浏览器放慢时也照常走），画面在 frame 里更新 */
    var timer = null, tPrev = 0, winT = 1, quiet = 0;
    function tick() {
      var t = performance.now(), dt = Math.min(1, (t - tPrev) / 1000); tPrev = t;   // 按真实时间走（机器慢时也不变慢）
      if (dt > 0) step(dt);
      var busy = st.mode === 'drag' || st.w !== 0 || nd.th !== 0 || fil > 0;
      quiet = busy ? 0 : quiet + dt;
      winT += dt; if (winT > 0.03 && quiet < 3.2) { winT = 0; drawWin(); }   // 停下 3 秒后曲线已经走平，不再重画
      ui(dt);
      if (busy) ctx.dirty();
    }
    window.__gen = { st: st, nd: nd, fil: function () { return fil; }, wave: wave, theta: theta, n: nNow, avgFrac: avgFrac, setTarget: setTarget, ctx: ctx, frame: frame };
    frame(0);
    return {
      frame: frame,
      pause: function () { if (st.mode === 'drag') st.mode = 'coast'; clearInterval(timer); timer = null; },
      resume: function () { uiKey = ''; tagKey = ''; quiet = 0; if (!timer) { tPrev = performance.now(); timer = setInterval(tick, 16); } ctx.dirty(); }
    };
  }
})();
