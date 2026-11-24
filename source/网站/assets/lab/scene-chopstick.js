/* ════ 生活情境：筷子插水（附加页「光的折射」F1，人教版八上 第四章 第4节）════
   画面：木桌上一只青花瓷碗，盛着水，一根筷子斜靠在碗沿上，下半截在水里；旁边筷架上放着另一根（直的，作对照）。
   从斜上方隔着平平的水面往下看（课本的看法）。碗是不透明的瓷碗，所以只能透过水面看水里的部分，
   不会出现“隔着圆玻璃杯侧面看”那种放大、错开的现象（那是另一回事）。
   物理（n = 1.33）：眼睛就是画面的相机位置 E。对水下每一点 Q（深 d），在 E、Q 所在的竖直面内，
     找水面上的折射点 P，使 n·sin i = sin r（二分法）；沿折射光线反向延长，和过 Q 的竖直线相交得像点 Q'，
     看起来的深度 d' = s·h / (D − s)（s：Q 到 P 的水平距离，D：Q 到 E 的水平距离，h：眼睛高出水面的高度）。
     Q' 在 E→P 这条直线上，所以画面上 Q' 正好出现在眼睛真正看到它的地方。
     筷子水下部分、碗内壁水下部分的每个顶点都这样换成像点再画出来 → 看到的筷子向上弯折、碗底也显得浅了。
     从正上方看时，各点的像都在正下方的竖直线上，画面上几乎看不出弯折。
   单位：1 = 1 cm。筷子长 24 cm，碗口直径约 17 cm，水深约 5 cm。 */
LabScene.register('chopstick', {
  done: true,
  no: 'F1', name: '筷子插水',
  build: function (ctx) {
    var T = ctx.T, scene = ctx.scene, N = 1.33, DEG = Math.PI / 180;
    var YT = 7.6, RIN = 8.25, YB = 1.1, PW = 2.2, ROUT = 8.6, YW = 6.9, LC = 24;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function V(x, y, z) { return new T.Vector3(x, y, z || 0); }
    function rng(seed) { var s = seed; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
    function rin(y) { var u = clamp((YT - y) / (YT - YB), 0, 1); return RIN * Math.pow(1 - Math.pow(u, PW), 1 / PW); }
    function yin(r) { var q = clamp(r / RIN, 0, 1); return YT - (YT - YB) * Math.pow(1 - Math.pow(q, PW), 1 / PW); }
    function tex(w, h, draw, rep) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
      if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }
    ctx.renderer.localClippingEnabled = true;

    /* ── 像点：水下一点 Q，眼睛 E → 看起来的位置 ── */
    function image(qx, qy, qz, E, out) {
      var d = YW - qy, h = E.y - YW, dx = E.x - qx, dz = E.z - qz, D = Math.sqrt(dx * dx + dz * dz);
      if (d <= 0) { out.set(qx, qy, qz); return 0; }
      if (D < 1e-6) { out.set(qx, YW - d / N, qz); return 0; }
      var lo = 0, hi = D;
      for (var k = 0; k < 44; k++) { var s = (lo + hi) / 2; if (N * s / Math.sqrt(s * s + d * d) < (D - s) / Math.sqrt((D - s) * (D - s) + h * h)) lo = s; else hi = s; }
      var s2 = (lo + hi) / 2, dd = s2 * h / (D - s2);
      out.set(qx, YW - dd, qz); return s2;
    }

    /* ── 桌子（木纹）、竹席 ── */
    var wood = tex(1024, 1024, function (g, w, h) {
      var r = rng(7); g.fillStyle = '#b98756'; g.fillRect(0, 0, w, h);
      var pl = 5, ph = h / pl;
      for (var j = 0; j < pl; j++) {
        var base = ['#b07a49', '#bd8856', '#a9733f', '#c08f5e', '#b3804f'][j];
        g.fillStyle = base; g.fillRect(0, j * ph, w, ph);
        for (var k = 0; k < 70; k++) {
          var y = j * ph + r() * ph, a = 0.05 + r() * 0.12, amp = 2 + r() * 6, f = 0.004 + r() * 0.01, ph0 = r() * 6;
          g.strokeStyle = 'rgba(' + (r() < 0.6 ? '90,50,20,' : '240,200,150,') + a + ')'; g.lineWidth = 0.6 + r() * 1.8; g.beginPath();
          for (var x = 0; x <= w; x += 8) { var yy = y + Math.sin(x * f + ph0) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
          g.stroke();
        }
        g.fillStyle = 'rgba(60,30,10,.45)'; g.fillRect(0, j * ph, w, 2);
      }
    }, [1, 1]);
    (function () {
      var s = new T.Shape(), w = 120, d = 76, r = 4;
      s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      var g = new T.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 4, curveSegments: 8 });
      g.rotateX(-Math.PI / 2); g.translate(0, -3.6, 0);
      var p = g.attributes.position, uv = g.attributes.uv;
      for (var i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getZ(i) + d / 2) / d);
      var m = new T.Mesh(g, new T.MeshStandardMaterial({ map: wood, roughness: 0.55 })); m.receiveShadow = true; m.position.set(4, 0, 4); scene.add(m);
      // 竹席
      var mat = tex(512, 512, function (gc, w2, h2) {
        for (var k = 0; k < 32; k++) { gc.fillStyle = k % 2 ? '#d9bf86' : '#e3cb93'; gc.fillRect(0, k * 16, w2, 16); gc.fillStyle = 'rgba(120,90,40,.35)'; gc.fillRect(0, k * 16 + 15, w2, 1); }
        gc.fillStyle = 'rgba(110,70,30,.55)'; [60, 200, 312, 452].forEach(function (x) { gc.fillRect(x, 0, 5, h2); });
      });
      var mg = new T.BoxGeometry(30, 0.25, 22); var mm = new T.Mesh(mg, new T.MeshStandardMaterial({ map: mat, roughness: 0.8 })); mm.position.set(0, 0.125, 0); mm.receiveShadow = true; scene.add(mm);
    })();
    var MAT_Y = 0.25;

    /* ── 碗：外壁 + 口沿（一个回转体）、内壁（另一个回转体，水下部分要换成像点） ── */
    var blue = '#2a4f9e', blueL = 'rgba(90,125,200,.55)';
    var outerTex = tex(2048, 512, function (g, w, h) {
      g.fillStyle = '#f6f7f3'; g.fillRect(0, 0, w, h);
      function vy(v) { return (1 - v) * h; }
      g.strokeStyle = blue; g.lineWidth = 5; [0.955, 0.925, 0.2, 0.17].forEach(function (v) { g.beginPath(); g.moveTo(0, vy(v)); g.lineTo(w, vy(v)); g.stroke(); });
      g.lineWidth = 2.5; [0.86].forEach(function (v) { g.beginPath(); g.moveTo(0, vy(v)); g.lineTo(w, vy(v)); g.stroke(); });
      var nm = 8, mw = w / nm;
      for (var k = 0; k < nm; k++) {   // 缠枝花
        var cx = k * mw + mw / 2, cy = vy(0.6);
        g.strokeStyle = blue; g.lineWidth = 4; g.beginPath(); g.moveTo(k * mw, cy + 10);
        g.bezierCurveTo(k * mw + mw * 0.25, cy - 60, k * mw + mw * 0.75, cy + 70, (k + 1) * mw, cy + 10); g.stroke();
        g.fillStyle = blueL; g.beginPath(); g.ellipse(cx, cy, 30, 24, 0, 0, 7); g.fill();
        g.fillStyle = blue; for (var p = 0; p < 6; p++) { var a = p / 6 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 20, cy + Math.sin(a) * 16, 12, 8, a, 0, 7); g.fill(); }
        g.fillStyle = '#f6f7f3'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        g.fillStyle = blue; g.beginPath(); g.ellipse(k * mw + mw * 0.2, cy - 30, 16, 7, -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(k * mw + mw * 0.82, cy + 34, 16, 7, -0.5, 0, 7); g.fill();
      }
      var np = 16, pw = w / np;   // 下面一圈莲瓣
      for (var j = 0; j < np; j++) {
        var x0 = j * pw; g.strokeStyle = blue; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x0 + 6, vy(0.24)); g.quadraticCurveTo(x0 + pw / 2, vy(0.44), x0 + pw - 6, vy(0.24)); g.stroke();
        g.fillStyle = blueL; g.beginPath(); g.moveTo(x0 + 18, vy(0.245)); g.quadraticCurveTo(x0 + pw / 2, vy(0.38), x0 + pw - 18, vy(0.245)); g.fill();
      }
    });
    var innerTex;   // 碗内：从上往下看的图案（碗心双鱼、内口沿一圈）
    var IN_PTS = [], IN_S = [];
    (function () {
      var n = 70, i;
      for (i = 0; i <= n; i++) { var u = i / n, uu = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, y = YT - uu * (YT - YB); IN_PTS.push(new T.Vector2(Math.max(1e-3, rin(y)), y)); }
      var s2 = 0, arr = new Array(n + 1); arr[n] = 0;   // 从碗心沿内壁量到每一点的弧长
      for (i = n - 1; i >= 0; i--) { s2 += IN_PTS[i].distanceTo(IN_PTS[i + 1]); arr[i] = s2; }
      IN_S = arr; IN_S.total = s2;
    })();
    var S_TOT = IN_S.total;
    function sAtR(r) { for (var j = IN_PTS.length - 1; j > 0; j--) if (IN_PTS[j - 1].x >= r) { var a = IN_PTS[j], b = IN_PTS[j - 1], t = (r - a.x) / (b.x - a.x); return IN_S[j] + (IN_S[j - 1] - IN_S[j]) * t; } return S_TOT; }
    innerTex = tex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#f7f8f4'; g.fillRect(0, 0, w, h);
      var c = w / 2, k = w / 2 / S_TOT;   // 弧长 → 像素
      function ring(s, lw) { g.lineWidth = lw; g.beginPath(); g.arc(c, c, s * k, 0, 7); g.stroke(); }
      g.strokeStyle = blue; ring(S_TOT - 0.35, 5); ring(S_TOT - 0.75, 2.5);
      // 内口沿的水波纹
      g.lineWidth = 3; for (var a = 0; a < 48; a++) { var an = a / 48 * Math.PI * 2, rr = (S_TOT - 1.35) * k; g.beginPath(); g.arc(c + Math.cos(an) * rr, c + Math.sin(an) * rr, 9, an + 0.4, an + Math.PI + 0.4); g.stroke(); }
      ring(S_TOT - 2.0, 2.5);
      var sb = sAtR(3.6); g.strokeStyle = blue; ring(sb, 5); ring(sb - 0.35, 2.5);
      // 双鱼
      function fishAt(ang, flip) {
        g.save(); g.translate(c + Math.cos(ang) * sb * k * 0.42, c + Math.sin(ang) * sb * k * 0.42); g.rotate(ang + Math.PI / 2 * flip); g.scale(sb * k / 210, sb * k / 210);
        g.fillStyle = blueL; g.strokeStyle = blue; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(-20, -48, 50, -8); g.lineTo(90, -40); g.lineTo(80, 0); g.lineTo(90, 40); g.lineTo(50, 8); g.quadraticCurveTo(-20, 48, -90, 0); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-30, -30); g.quadraticCurveTo(0, -70, 30, -22); g.stroke();
        g.fillStyle = blue; g.beginPath(); g.arc(-62, -6, 6, 0, 7); g.fill();
        g.lineWidth = 2.5; for (var q = 0; q < 4; q++) { g.beginPath(); g.arc(-30 + q * 20, 2, 12, -1.2, 1.2); g.stroke(); }
        g.restore();
      }
      fishAt(0.3, 1); fishAt(Math.PI + 0.3, 1);
    });
    var bowl = new T.Group(); scene.add(bowl);
    var glaze = function (map) { return new T.MeshPhysicalMaterial({ map: map, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.12, side: T.DoubleSide }); };
    (function () {
      var pts = [[0.001, 0.62], [2.9, 0.6], [3.05, 0.05], [3.5, 0.0], [3.6, 0.45], [3.45, 1.0]], u, y, k;
      for (k = 0; k <= 40; k++) { u = 0.94 * (1 - k / 40); y = YT - 0.05 - u * (YT - YB + 0.5); var r = ROUT * Math.pow(1 - Math.pow(u, PW), 1 / PW); if (r > 3.45) pts.push([r, y]); }
      pts.push([ROUT - 0.03, YT + 0.02], [ROUT - 0.14, YT + 0.14], [RIN + 0.08, YT + 0.12], [RIN, YT]);
      var g = new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), 96), p = g.attributes.position, uv = g.attributes.uv;
      for (var i = 0; i < p.count; i++) uv.setY(i, clamp(p.getY(i) / YT, 0, 1));
      var om = glaze(outerTex); om.side = T.FrontSide; var m = new T.Mesh(g, om); m.castShadow = true; m.receiveShadow = true; bowl.add(m);
    })();
    var inner = (function () {
      var g = new T.LatheGeometry(IN_PTS, 96), p = g.attributes.position, uv = g.attributes.uv, np = IN_PTS.length, col = new Float32Array(p.count * 3);
      for (var i = 0; i < p.count; i++) {
        var j = i % np, x = p.getX(i), z = p.getZ(i), rho = IN_S[j] / S_TOT * 0.5, a = Math.atan2(z, x);
        uv.setXY(i, 0.5 + rho * Math.cos(a), 0.5 - rho * Math.sin(a));
        var y = p.getY(i), wet = sstep(YW + 0.02, YW - 0.3, y), deep = sstep(YW, YB, y), c = new T.Color(0xffffff).lerp(new T.Color(0xcfe5ee), wet * (0.55 + 0.45 * deep));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      var mt = glaze(innerTex); mt.vertexColors = true;
      var m = new T.Mesh(g, mt); m.receiveShadow = true; bowl.add(m);
      return { mesh: m, base: new Float32Array(p.array) };
    })();
    /* 水面 */
    var water = new T.Mesh(new T.CircleGeometry(rin(YW) + 0.01, 96), new T.MeshPhysicalMaterial({ color: 0xa9d6ea, transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, depthWrite: false }));
    water.rotation.x = -Math.PI / 2; water.position.y = YW; water.renderOrder = 5; scene.add(water);
    var menis = new T.Mesh(new T.TorusGeometry(rin(YW) - 0.02, 0.05, 6, 96), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    menis.rotation.x = Math.PI / 2; menis.position.y = YW + 0.01; menis.renderOrder = 6; scene.add(menis);

    /* ── 筷子：上段方、漆红描金，下段圆、本色竹木 ── */
    var NR = 240, NA = 16;
    var stickTex = tex(64, 1024, function (g, w, h) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); var r = rng(3);
      for (var i = 0; i < 26; i++) { g.fillStyle = 'rgba(120,80,40,' + (0.05 + r() * 0.12) + ')'; g.fillRect(r() * w, 0, 1 + r() * 2, h); }
      g.fillStyle = 'rgba(230,190,90,.95)';   // 漆段上的金色回纹
      for (var y = 30; y < h * 0.3; y += 46) { g.fillRect(0, y, w, 3); g.fillRect(w * 0.2, y + 10, w * 0.6, 3); g.fillRect(w * 0.2, y + 10, 3, 16); }
    });
    function stickRadius(t) { return 0.17 + 0.2 * Math.pow(t, 0.9); }
    function buildStickLocal() {
      var rings = [], k;
      rings.push([-0.17, 0.02]); rings.push([-0.15, 0.45]); rings.push([-0.09, 0.8]);
      for (k = 0; k <= NR; k++) rings.push([k / NR * LC, 1]);
      rings.push([LC + 0.05, 0.85]); rings.push([LC + 0.08, 0.02]);
      var pos = [], uvs = [], col = [], idx = [], cWood = new T.Color(0xe6c793), cLac = new T.Color(0x7b1d18), cGold = new T.Color(0xd8a640), c = new T.Color();
      rings.forEach(function (rg, i) {
        var y = rg[0], t = clamp(y / LC, 0, 1), r = stickRadius(t) * rg[1], n = 2 + 2.6 * sstep(0.5, 0.72, t);
        c.copy(cWood); if (t > 0.68) c.copy(cLac); if ((t > 0.68 && t < 0.69) || (t > 0.955 && t < 0.965)) c.copy(cGold);
        for (var a = 0; a <= NA; a++) {
          var ph = a / NA * Math.PI * 2 + Math.PI / 4, cs = Math.cos(ph), sn = Math.sin(ph);
          pos.push(r * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n), y, r * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n));
          uvs.push(a / NA, t); col.push(c.r, c.g, c.b);
          if (i && a < NA) { var p0 = (i - 1) * (NA + 1) + a, p1 = i * (NA + 1) + a; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
        }
      });
      return { pos: new Float32Array(pos), uv: uvs, col: col, idx: idx };
    }
    var STICK = buildStickLocal();
    function stickGeo() {
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(STICK.pos), 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(STICK.uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(STICK.col, 3)); g.setIndex(STICK.idx); g.computeVertexNormals(); return g;
    }
    var stickMat = new T.MeshStandardMaterial({ map: stickTex, vertexColors: true, roughness: 0.38 });
    var stick = new T.Mesh(stickGeo(), stickMat); stick.castShadow = true; scene.add(stick);
    var ghostMat = new T.MeshBasicMaterial({ color: 0xe8590c, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false, vertexColors: true, clippingPlanes: [new T.Plane(V(0, -1, 0), YW)] });
    var ghost = new T.Mesh(stickGeo(), ghostMat); ghost.renderOrder = 3; scene.add(ghost);
    // “实际位置”在看到的像（连同抬高的碗底）下面，所以不做深度检测；只在透过水面能看到的地方画（视线穿过水面圆以内），被碗壁挡住的地方透明
    var ghostA = new Float32Array(ghost.geometry.attributes.position.count * 4); ghost.geometry.setAttribute('color', new T.BufferAttribute(ghostA, 4));
    var hit = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 1, 8), new T.MeshBasicMaterial({ visible: false })); scene.add(hit);
    // 桌上另一根（直的，作对照）和筷架
    (function () {
      var other = new T.Mesh(stickGeo(), stickMat); other.castShadow = true;
      other.rotation.set(0, 0.12, -Math.PI / 2 + 0.035); other.position.set(-6, 0.95 + 0.0, 14.5); scene.add(other);
      var porcelain = new T.MeshPhysicalMaterial({ color: 0xf2f4f0, roughness: 0.25, clearcoat: 0.8 });
      var rest = new T.Group(); rest.position.set(-3.6, 0, 14.2); rest.rotation.y = 0.12; scene.add(rest);
      var bar = new T.Mesh(new T.CapsuleGeometry(0.42, 2.0, 6, 16), porcelain); bar.rotation.x = Math.PI / 2; bar.position.y = 0.42; bar.castShadow = true; rest.add(bar);
      [-1, 1].forEach(function (s) { var e = new T.Mesh(new T.SphereGeometry(0.72, 20, 14), porcelain); e.scale.set(1, 0.85, 1); e.position.set(0, 0.6, s * 1.4); e.castShadow = true; rest.add(e); });
      var dot = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshStandardMaterial({ color: 0x2a4f9e })); dot.position.set(0, 1.18, 1.4); rest.add(dot);
    })();

    /* ── 状态与计算 ── */
    var st = { th: 46, show: { real: false, ray: true }, anim: null, lastCam: '', info: {} };
    var PSI = 32 * DEG, HD = V(Math.cos(PSI), 0, Math.sin(PSI)), SD = V(-HD.z, 0, HD.x);   // 筷子所在竖直面：朝右前方斜一点，筷子头不挡右上角的小窗
    var tip = V(), up = V(), perp = V(), C = HD.clone().multiplyScalar(ROUT - 0.15).setY(YT + 0.42), eye = V(), tmp = V(), tmp2 = V();
    function placeStick() {
      var th = st.th * DEG; up.copy(HD).multiplyScalar(Math.sin(th)).setY(Math.cos(th)); perp.copy(HD).multiplyScalar(Math.cos(th)).setY(-Math.sin(th));
      var t = 0;
      for (; t < 30; t += 0.01) {
        var x = C.x - up.x * t, z = C.z - up.z * t, y = C.y - up.y * t, rr = Math.hypot(x, z);
        if (rr >= RIN) continue;
        if (y - 0.17 <= yin(rr)) break;
      }
      tip.copy(C).addScaledVector(up, -t);
      var top = tip.clone().addScaledVector(up, LC), mid = C.clone().lerp(top, 0.5);
      hit.position.copy(mid); hit.quaternion.setFromUnitVectors(V(0, 1, 0), up); hit.scale.set(1, C.distanceTo(top), 1);
      // 实际位置（不换像点）
      var gp = ghost.geometry.attributes.position.array, P = STICK.pos;
      for (var i = 0; i < P.length; i += 3) { var lx = P[i], ly = P[i + 1], lz = P[i + 2]; gp[i] = tip.x + up.x * ly + perp.x * lx + SD.x * lz; gp[i + 1] = tip.y + up.y * ly + perp.y * lx; gp[i + 2] = tip.z + up.z * ly + perp.z * lx + SD.z * lz; }
      ghost.geometry.attributes.position.needsUpdate = true; ghost.geometry.computeVertexNormals(); ghost.geometry.computeBoundingSphere();
    }
    function remap() {
      eye.copy(ctx.camera.position);
      var sp = stick.geometry.attributes.position.array, gp = ghost.geometry.attributes.position.array;
      for (var i = 0; i < gp.length; i += 3) {
        if (gp[i + 1] < YW) { image(gp[i], gp[i + 1], gp[i + 2], eye, tmp); sp[i] = tmp.x; sp[i + 1] = tmp.y; sp[i + 2] = tmp.z; }
        else { sp[i] = gp[i]; sp[i + 1] = gp[i + 1]; sp[i + 2] = gp[i + 2]; }
      }
      stick.geometry.attributes.position.needsUpdate = true; stick.geometry.computeVertexNormals(); stick.geometry.computeBoundingSphere();
      var Rw = rin(YW) - 0.05;
      for (var q = 0, n = gp.length / 3; q < n; q++) {
        var gx = gp[q * 3], gy = gp[q * 3 + 1], gz = gp[q * 3 + 2], k = (eye.y - YW) / (eye.y - gy), ok = 1;
        if (gy < YW) { var sx = eye.x + (gx - eye.x) * k, sz = eye.z + (gz - eye.z) * k; ok = sstep(Rw, Rw - 0.25, Math.hypot(sx, sz)); }
        ghostA[q * 4] = ghostA[q * 4 + 1] = ghostA[q * 4 + 2] = 1; ghostA[q * 4 + 3] = ok;
      }
      ghost.geometry.attributes.color.needsUpdate = true;
      var ip = inner.mesh.geometry.attributes.position.array, b = inner.base;
      for (var j = 0; j < ip.length; j += 3) {
        if (b[j + 1] < YW) { image(b[j], b[j + 1], b[j + 2], eye, tmp); ip[j] = tmp.x; ip[j + 1] = tmp.y; ip[j + 2] = tmp.z; }
        else { ip[j] = b[j]; ip[j + 1] = b[j + 1]; ip[j + 2] = b[j + 2]; }
      }
      inner.mesh.geometry.attributes.position.needsUpdate = true; inner.mesh.geometry.computeVertexNormals(); inner.mesh.geometry.computeBoundingSphere();
      // 筷子尖的光路数据
      var s = image(tip.x, tip.y, tip.z, eye, tmp2), d = YW - tip.y, h = eye.y - YW, D = Math.hypot(eye.x - tip.x, eye.z - tip.z);
      var I = { d: d, dd: YW - tmp2.y, s: s, D: D, h: h, i: Math.atan2(s, d), r: Math.atan2(D - s, h), img: tmp2.clone() };
      I.check = N * Math.sin(I.i) - Math.sin(I.r);
      var tg = ctx.target, ch = Math.hypot(eye.x - tg.x, eye.z - tg.z); I.view = Math.atan2(ch, eye.y - tg.y) / DEG;
      st.info = I;
    }
    function update() { placeStick(); remap(); panelVals(); drawWin(); tags(); ctx.dirty(); }

    /* ── 标签 ── */
    function tags() {
      var I = st.info;
      // 看到的筷子：水下那段中点的像
      var mid = tip.clone().addScaledVector(up, (YW - tip.y) / up.y * 0.45), im = V(); image(mid.x, mid.y, mid.z, eye, im);
      // 不能挡：水下那段看到的筷子、水面处的“折断”点
      var cut = tip.clone().addScaledVector(up, (YW - tip.y) / up.y);
      ctx.keepClear('app', im, 46); ctx.keepClear('cut', cut, 34);
      ctx.tag('cs-app', '<i style="background:#d9a441"></i>看到的筷子', im, { side: 'above', gap: 50, small: true });
      ctx.tag('cs-real', '<i style="background:#e8590c"></i>实际的位置', st.show.real ? mid : null, { side: 'below', gap: 44, small: true });
      ctx.tag('cs-water', '水面', V(-rin(YW) + 1.2, YW + 0.3, -3.5), { side: 'above', gap: 8, small: true });
      ctx.spot('grip', st.hint === false ? null : tip.clone().addScaledVector(up, LC * 0.66));
      ctx.note(st.hint === false ? '' : '拖筷子露在水外、闪着的那段，改它的斜度');
    }
    /* ── 小窗：筷子尖的光路（在眼睛和筷子尖所在的竖直面里看） ── */
    ctx.host.insertAdjacentHTML('beforeend', '<div class="ls-win cs-win"><h3>筷子尖的光路 <small>侧着剖开看</small></h3><canvas width="680" height="420"></canvas><p class="cap">光从水斜射入空气，在水面处偏折</p></div>');
    var win = ctx.host.querySelector('.cs-win'), wc = win.querySelector('canvas'), g2 = wc.getContext('2d');
    function arrow(g, x0, y0, x1, y1, sz) { var a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - sz * Math.cos(a - 0.4), y1 - sz * Math.sin(a - 0.4)); g.lineTo(x1 - sz * Math.cos(a + 0.4), y1 - sz * Math.sin(a + 0.4)); g.closePath(); g.fill(); }
    function drawWin() {
      win.hidden = !st.show.ray; if (!st.show.ray) return;
      var I = st.info, g = g2, W = wc.width, Hh = wc.height, y0 = 150, k = 210 / Math.max(3, I.d), x0 = 220;
      if (x0 + I.s * k > W - 140) k = (W - 140 - x0) / Math.max(0.1, I.s);
      g.clearRect(0, 0, W, Hh);
      g.fillStyle = '#eaf5fb'; g.fillRect(0, y0, W, Hh - y0);
      g.strokeStyle = '#5b8fb5'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y0); g.lineTo(W, y0); g.stroke();
      g.font = '600 30px sans-serif'; g.fillStyle = '#56677D'; g.fillText('空气', 14, 38); g.fillText('水', 14, Hh - 16);
      var Tx = x0, Ty = y0 + I.d * k, Px = x0 + I.s * k, Ix = x0, Iy = y0 + I.dd * k;
      var ex = I.D - I.s, ey = I.h, el = Math.hypot(ex, ey), ux = ex / el, uy = -ey / el, L = Math.min((W - 30 - Px) / Math.max(ux, 1e-3), (y0 - 30) / Math.max(-uy, 1e-3));
      g.setLineDash([8, 7]); g.strokeStyle = '#3a4a5e'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(Px, y0 - 120); g.lineTo(Px, Math.min(Hh, y0 + 130)); g.stroke();
      g.strokeStyle = '#ff8a1f'; g.lineWidth = 3; g.beginPath(); g.moveTo(Px, y0); g.lineTo(Ix, Iy); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#ff8a1f'; g.fillStyle = '#ff8a1f'; g.lineWidth = 4.5;
      g.beginPath(); g.moveTo(Tx, Ty); g.lineTo(Px, y0); g.lineTo(Px + ux * L, y0 + uy * L); g.stroke();
      arrow(g, Tx, Ty, (Tx + Px) / 2, (Ty + y0) / 2, 18); arrow(g, Px, y0, Px + ux * L * 0.6, y0 + uy * L * 0.6, 18);
      g.lineWidth = 3; g.strokeStyle = '#1f6fd6'; g.beginPath(); g.arc(Px, y0, 46, Math.PI / 2, Math.PI / 2 + I.i, false); g.stroke();
      g.strokeStyle = '#d6336c'; g.beginPath(); g.arc(Px, y0, 46, -Math.PI / 2, -Math.PI / 2 + I.r, false); g.stroke();
      g.fillStyle = '#7b1d18'; g.beginPath(); g.arc(Tx, Ty, 9, 0, 7); g.fill();
      g.strokeStyle = '#2a4f9e'; g.lineWidth = 3.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(Ix, Iy, 9, 0, 7); g.fill(); g.stroke();
      g.font = '600 31px sans-serif'; g.textAlign = 'right';
      g.fillStyle = '#7b1d18'; g.fillText('筷子尖', Tx - 16, Ty + 8);
      g.fillStyle = '#2a4f9e'; g.fillText('看到的筷子尖', Ix - 16, Iy + 8);
      g.textAlign = 'left'; g.fillStyle = '#1f6fd6'; g.fillText('入射角 ' + Math.round(I.i / DEG) + '°', Px + 12, y0 + 82);
      g.textAlign = 'right'; g.fillStyle = '#d6336c'; g.fillText('折射角 ' + Math.round(I.r / DEG) + '°', Px - 12, y0 - 64); g.textAlign = 'left';
      g.fillStyle = '#3a4a5e'; g.fillText('到眼睛', Math.min(W - 100, Px + ux * L - 40), Math.max(28, y0 + uy * L + 30));
    }

    /* ── 右栏 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>筷子插水</b><p>筷子斜插在水里，从斜上方看，水里那段好像向上折了。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">从哪儿看</div>' +
      '<div class="ls-btns"><button data-v="side">从斜上方看</button><button data-v="low">再斜一点</button><button data-v="top">从正上方看</button></div>' +
      '<div class="ls-row"><span class="nm">离竖直方向</span><span class="vl" id="cs-view">-</span><span>°</span></div>' +
      '<p class="ls-tip">越斜着看，折得越厉害；从正上方看，几乎看不出折。拖画面空白处也能换着看。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">筷子斜放</div>' +
      '<div class="ls-row"><span class="nm">和竖直方向</span><span class="vl" id="cs-th">-</span><span>°</span></div>' +
      '<input class="rng" type="range" min="30" max="60" step="1" id="cs-rng">' +
      '<div class="ls-row"><span class="nm">筷子尖实际</span><span class="vl" id="cs-d">-</span><span>cm 深</span></div>' +
      '<div class="ls-row"><span class="nm">看起来</span><span class="vl" id="cs-dd">-</span><span>cm 深</span></div></div>' +
      '<div class="ls-blk"><div class="ls-h">显示</div><div class="ls-btns"><button data-t="real">显示真实位置</button><button data-t="ray">光路小窗</button></div></div>' +
      '<div class="ls-note">水中的筷子看起来<b>向上弯折</b>，是因为光从水斜射入空气时发生了<b>折射</b>。</div>' +
      '<p class="ls-tip">画面上水下那段是按光的折射算出来的样子。筷子并没有断：桌上那根就是直的。</p>'
    );
    function panelVals() {
      var I = st.info, s = function (id, v) { var e = ctx.$('#' + id); if (e) e.textContent = v; };
      s('cs-view', Math.round(I.view)); s('cs-th', Math.round(st.th)); s('cs-d', I.d.toFixed(1)); s('cs-dd', I.dd.toFixed(1));
      var r = ctx.$('#cs-rng'); if (r && document.activeElement !== r) r.value = st.th;
      ctx.$$('[data-t]').forEach(function (b) { b.classList.toggle('on', !!st.show[b.getAttribute('data-t')]); });
      ghost.visible = st.show.real;
    }
    var VIEWS = { side: { az: 0.1, el: 0.6, dist: 56, tg: [6.5, 7.5, 1.5] }, low: { az: 0.1, el: 0.36, dist: 56, tg: [6.5, 8, 1.5] }, top: { az: 0, el: 1.5, dist: 54, tg: [3, 3, 0] } };
    function go(name) { var v = VIEWS[name]; st.anim = { t: 0, t0: performance.now(), from: { az: ctx.orb.az, el: ctx.orb.el, dist: ctx.orb.dist, tg: ctx.target.toArray() }, to: v }; ctx.dirty(); }
    ctx.rail.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
      if (b.getAttribute('data-v')) go(b.getAttribute('data-v'));
      if (b.getAttribute('data-t')) { st.show[b.getAttribute('data-t')] = !st.show[b.getAttribute('data-t')]; update(); }
    });
    ctx.rail.addEventListener('input', function (ev) { if (ev.target.id === 'cs-rng') { st.th = +ev.target.value; st.hint = false; update(); } });

    /* ── 拖筷子 ── */
    var plane = new T.Plane(SD.clone(), 0), dragging = false;
    ctx.drag = {
      hit: function (ev) { return !!ctx.pick(ev, [hit]); },
      start: function (ev) { if (!ctx.pick(ev, [hit])) return false; dragging = true; st.hint = false; return true; },
      move: function (ev) { var p = ctx.onPlane(ev, plane); if (!p) return; st.th = clamp(Math.atan2(p.clone().sub(C).dot(HD), p.y - C.y) / DEG, 30, 60); update(); },
      end: function () { dragging = false; }
    };

    /* ── 取景 ── */
    var o = ctx.orb; o.az = VIEWS.side.az; o.el = VIEWS.side.el; o.dist = VIEWS.side.dist; o.minEl = 0.3; o.maxEl = 1.52; o.minAz = -1.0; o.maxAz = 1.0; o.minDist = 32; o.maxDist = 110;
    ctx.target.set(VIEWS.side.tg[0], VIEWS.side.tg[1], VIEWS.side.tg[2]);
    var sc = ctx.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.updateProjectionMatrix(); ctx.sun.shadow.radius = 5;
    ctx.view();
    update();
    ctx.host._api = { ctx: ctx, st: st, update: update, go: go, info: function () { return st.info; }, image: image, tip: tip, eye: eye };

    var handle = {
      frame: function (dt) {
        var moving = false;
        if (st.anim) {
          var a = st.anim; a.t = Math.min(1, (performance.now() - a.t0) / 700);   /* 按真实时间 0.7 秒转到位，和一秒画几帧无关 */ var k = a.t * a.t * (3 - 2 * a.t);
          o.az = a.from.az + (a.to.az - a.from.az) * k; o.el = a.from.el + (a.to.el - a.from.el) * k; o.dist = a.from.dist + (a.to.dist - a.from.dist) * k;
          ctx.target.set(a.from.tg[0] + (a.to.tg[0] - a.from.tg[0]) * k, a.from.tg[1] + (a.to.tg[1] - a.from.tg[1]) * k, a.from.tg[2] + (a.to.tg[2] - a.from.tg[2]) * k);
          ctx.view(); if (a.t >= 1) st.anim = null; moving = true;
        }
        var cp = ctx.camera.position, key = cp.x.toFixed(3) + ',' + cp.y.toFixed(3) + ',' + cp.z.toFixed(3);
        if (key !== st.lastCam) { st.lastCam = key; remap(); panelVals(); drawWin(); moving = true; }
        tags();
        return moving;
      },
      pause: function () { },
      resume: function () { st.lastCam = ''; update(); }
    };
    ctx.host._api.frame = handle.frame;
    return handle;
  }
});
