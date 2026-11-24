/* ════ 生活情境：叉鱼（附加页「光的折射」F1，人教版八上 第四章 第4节）════
   画面：池塘的竖直剖面（像课本插图那样把岸和水切开），岸上的渔夫拿着鱼叉，水里一条鱼。
   物理（水的折射率 n = 1.33）：眼睛 E、鱼 F 都在剖面 z = 0 上，水面 y = 0。
     在水面上找折射点 P，使 n·sin i = sin r（i：水里那段光线和法线的夹角＝入射角；r：空气里那段＝折射角），二分法求。
     看到的鱼（虚像）A：沿折射光线反向延长，和过 F 的竖直线相交（课本作图法），A 在 F 正上方：
       看到的深度 h' = |F.x − P.x| · E.y / |E.x − P.x| = |F.x − P.x| / tan r，真实深度 h = |F.x − P.x| / tan i，h'/h = tan i / tan r < 1。
     鱼叉沿直线走（叉不折射）；叉中：叉的直线穿过真实鱼身（椭圆，半长 2.6、半高 1.0；鱼画成约 55 cm 长，示意）。
   单位：1 = 1 dm（10 cm），右栏读数换成 m。人、鱼大小按实际比例的示意，水深 1 m 多。 */
LabScene.register('fish', {
  done: true,
  no: 'F1', name: '叉鱼',
  build: function (ctx) {
    var T = ctx.T, scene = ctx.scene, N = 1.33, DEG = Math.PI / 180;
    var ZF = 5, TOP = 3, BOT = -13, BASE = -15.5, X0 = -36, X1 = 62, Z0 = -42;
    var Y = new T.Vector3(0, 1, 0);
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function smax(a, b, k) { return 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k)); }
    function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
    function V(x, y, z) { return new T.Vector3(x, y, z || 0); }

    /* ── 地形：左岸（平顶 + 斜坡）、右岸、后岸围成池塘 ── */
    function edge(z) { var w = sstep(3, 14, Math.abs(z)); return -6 + w * (1.6 * Math.sin(z * 0.21) + 1.0 * Math.sin(z * 0.53 + 1.3)); }
    function H(x, z) {
      var e = edge(z);
      var L = TOP - (TOP - BOT) * sstep(e, e + 16, x);
      var Rr = BOT + (TOP - BOT) * sstep(47, 60, x);
      var B = BOT + (TOP - BOT) * sstep(-24, -40, z);
      var y = smax(smax(L, Rr, 1.5), B, 1.5);
      var under = sstep(-1, -5, y);
      return y + under * (0.3 * Math.sin(x * 0.37 + z * 0.21) + 0.22 * Math.sin(x * 0.13 - z * 0.41 + 2)) + (1 - under) * 0.05 * Math.sin(x * 1.7 + z * 1.3);
    }

    /* ── 贴图 ── */
    function tex(w, h, draw, rep) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
      if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }
    function noiseTex(seed, lo, rep) {
      return tex(256, 256, function (g, w, h) {
        var r = rng(seed), im = g.createImageData(w, h), d = im.data;
        for (var i = 0; i < w * h; i++) { var v = lo + (255 - lo) * (0.55 + 0.45 * r()) ; d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
        g.putImageData(im, 0, 0);
        for (var k = 0; k < 500; k++) { g.fillStyle = 'rgba(' + (r() < .5 ? '0,0,0,' : '255,255,255,') + (0.05 + r() * 0.08) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.fill(); }
      }, rep);
    }
    var causticTex = (function () {
      var S = 256, r = rng(31), pts = [];
      for (var i = 0; i < 22; i++) pts.push([r() * S, r() * S]);
      var c = document.createElement('canvas'); c.width = c.height = S; var g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data;
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var f1 = 1e9, f2 = 1e9;
        for (var k = 0; k < pts.length; k++) {
          var dx = Math.abs(x - pts[k][0]), dy = Math.abs(y - pts[k][1]); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy;
          var dd = Math.sqrt(dx * dx + dy * dy); if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
        var v = Math.exp(-(f2 - f1) * 0.32) * 255, o = (y * S + x) * 4;
        d[o] = v; d[o + 1] = v * 0.98; d[o + 2] = v * 0.86; d[o + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(7, 5); return t;
    })();

    /* ── 地面 ── */
    var ground = new T.Group(); scene.add(ground);
    (function () {
      var g = new T.PlaneGeometry(X1 - X0, ZF - Z0, 196, 94); g.rotateX(-Math.PI / 2); g.translate((X0 + X1) / 2, 0, (Z0 + ZF) / 2);
      var p = g.attributes.position, i;
      for (i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
      g.computeVertexNormals();
      var nrm = g.attributes.normal, col = new Float32Array(p.count * 3), c = new T.Color(), r = rng(5);
      var cG1 = new T.Color(0x5f8f32), cG2 = new T.Color(0x93b552), cMud = new T.Color(0x8b6b45), cWet = new T.Color(0x5e4630), cSand = new T.Color(0xdcc89a), cSand2 = new T.Color(0xb9a77a), cAlg = new T.Color(0x9a9a68);
      for (i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), slope = 1 - nrm.getY(i);
        var n = 0.5 + 0.5 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(x * 0.4 - z * 1.1);
        c.copy(cSand).lerp(cSand2, clamp(0.3 + 0.5 * n + 0.2 * r(), 0, 1)).lerp(cAlg, 0.25 * sstep(-6, -12, y) * n);
        c.lerp(cWet, sstep(-1.6, -0.2, y));
        c.lerp(cMud, sstep(-0.2, 1.0, y));
        var gr = sstep(1.7, 2.6, y) * (1 - sstep(0.35, 0.6, slope));
        var gc = cG1.clone().lerp(cG2, clamp(n * 0.8 + r() * 0.3, 0, 1));
        c.lerp(gc, gr);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      var m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map: noiseTex(11, 170, [40, 20]), roughness: 0.95 }));
      m.receiveShadow = true; ground.add(m);

      /* 正面剖面：土层 */
      var PX = 2048, PY = 512, yTop = TOP + 2;
      function cx(x) { return (x - X0) / (X1 - X0) * PX; } function cy(y) { return (yTop - y) / (yTop - BASE) * PY; }
      var soilTex = tex(PX, PY, function (gc, w, h) {
        var im = gc.createImageData(w, h), d = im.data, rr = rng(9), cols = [];
        for (var px = 0; px < w; px++) cols.push(H(X0 + px / w * (X1 - X0), ZF));
        for (var py = 0; py < h; py++) {
          var yy = yTop - py / h * (yTop - BASE);
          for (var px2 = 0; px2 < w; px2++) {
            var top = cols[px2], dep = top - yy, o = (py * w + px2) * 4, xx = X0 + px2 / w * (X1 - X0), R0, G0, B0;
            if (dep < 0) { d[o + 3] = 0; continue; }
            var wav = 0.35 * Math.sin(xx * 0.45) + 0.2 * Math.sin(xx * 1.3 + 1);
            if (top > 1.2) {
              if (dep < 0.22) { R0 = 88; G0 = 128; B0 = 52; }
              else if (dep < 1.6 + wav) { R0 = 86; G0 = 62; B0 = 44; }
              else if (dep < 5.5 + wav) { R0 = 122; G0 = 90; B0 = 60; }
              else { R0 = 150; G0 = 122; B0 = 88; }
            } else {
              if (dep < 0.6 + wav * 0.4) { R0 = 214; G0 = 192; B0 = 146; }
              else if (dep < 2.0 + wav) { R0 = 150; G0 = 128; B0 = 94; }
              else { R0 = 140; G0 = 116; B0 = 84; }
            }
            var k = 1 - 0.18 * sstep(0, 14, dep) + (rr() - 0.5) * 0.12 + 0.05 * Math.sin(yy * 9 + Math.sin(xx * 0.7) * 2);
            d[o] = R0 * k; d[o + 1] = G0 * k; d[o + 2] = B0 * k; d[o + 3] = 255;
          }
        }
        gc.putImageData(im, 0, 0);
        gc.globalCompositeOperation = 'source-atop';
        for (var q = 0; q < 260; q++) {   // 小石子
          var qx = X0 + rr() * (X1 - X0), qt = H(qx, ZF), qy = qt - 1.2 - rr() * (qt - BASE - 1.5);
          var s = 2 + rr() * 6, gv = 120 + rr() * 70;
          gc.fillStyle = 'rgb(' + gv + ',' + (gv - 8) + ',' + (gv - 20) + ')';
          gc.beginPath(); gc.ellipse(cx(qx), cy(qy), s * 1.3, s * 0.8, rr() * 3, 0, 7); gc.fill();
          gc.fillStyle = 'rgba(255,255,255,.25)'; gc.beginPath(); gc.ellipse(cx(qx) - s * 0.3, cy(qy) - s * 0.25, s * 0.5, s * 0.3, 0, 0, 7); gc.fill();
        }
        gc.strokeStyle = 'rgba(60,40,25,.35)'; gc.lineWidth = 1.5;   // 草根
        for (var q2 = 0; q2 < 400; q2++) {
          var rx = X0 + rr() * 34, rt = H(rx, ZF); if (rt < 2) continue;
          gc.beginPath(); gc.moveTo(cx(rx), cy(rt - 0.2)); gc.quadraticCurveTo(cx(rx + (rr() - .5) * 0.6), cy(rt - 0.8), cx(rx + (rr() - .5) * 0.8), cy(rt - 0.6 - rr() * 1.2)); gc.stroke();
        }
      });
      var sh = new T.Shape(); sh.moveTo(X0, BASE);
      for (var x = X0; x <= X1 + 1e-6; x += 0.35) sh.lineTo(x, H(x, ZF));
      sh.lineTo(X1, BASE); sh.lineTo(X0, BASE);
      var sg = new T.ShapeGeometry(sh), sp = sg.attributes.position, uv = sg.attributes.uv;
      for (i = 0; i < sp.count; i++) uv.setXY(i, (sp.getX(i) - X0) / (X1 - X0), (sp.getY(i) - BASE) / (yTop - BASE));
      sg.translate(0, 0, ZF);
      var soil = new T.Mesh(sg, new T.MeshStandardMaterial({ map: soilTex, roughness: 1, transparent: true, alphaTest: 0.5 }));
      soil.receiveShadow = true; ground.add(soil);
      /* 左右两头的剖面 */
      function skirt(pts, flip) {
        var pos = [], idx = [];
        pts.forEach(function (q, k) { pos.push(q.x, q.y, q.z, q.x, BASE, q.z); if (k) { var a = (k - 1) * 2; if (flip) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
        var gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
        ground.add(new T.Mesh(gg, new T.MeshStandardMaterial({ color: 0x7b5b3e, roughness: 1 })));
      }
      var pl = [], pr = [];
      for (var z = Z0; z <= ZF + 1e-6; z += 0.5) { pl.push(V(X0, H(X0, z), z)); pr.push(V(X1, H(X1, z), z)); }
      skirt(pl, false); skirt(pr, true);
    })();

    /* ── 水：水面（轻轻起伏）+ 正面剖面（越深越蓝）+ 水底光斑 ── */
    function crossing(x, dir) { while (H(x, ZF) < 0) x += dir * 0.05; return x; }
    var xL = crossing(5, -1), xR = crossing(40, 1);
    var waterGeo = new T.PlaneGeometry(xR - xL + 4, ZF + 36, 110, 70); waterGeo.rotateX(-Math.PI / 2); waterGeo.translate((xL + xR) / 2, 0, (ZF - 36) / 2);
    var wPos = waterGeo.attributes.position, wBase = new Float32Array(wPos.array);
    var water = new T.Mesh(waterGeo, new T.MeshPhysicalMaterial({ color: 0x78bcd6, transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0, clearcoat: 0.6, depthWrite: false }));
    water.renderOrder = 5; scene.add(water);
    (function () {
      var sh = new T.Shape(); sh.moveTo(xL, 0);
      for (var x = xL; x <= xR; x += 0.3) sh.lineTo(x, Math.min(0, H(x, ZF)));
      sh.lineTo(xR, 0); sh.lineTo(xL, 0);
      var g = new T.ShapeGeometry(sh), p = g.attributes.position, uv = g.attributes.uv;
      for (var i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - xL) / (xR - xL), 1 + p.getY(i) / 14);
      g.translate(0, 0, ZF + 0.01);
      var t = tex(512, 512, function (gc, w, h) {
        var gr = gc.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(150,212,232,0.30)'); gr.addColorStop(0.35, 'rgba(92,170,200,0.42)'); gr.addColorStop(1, 'rgba(30,96,128,0.66)');
        gc.fillStyle = gr; gc.fillRect(0, 0, w, h);
        for (var k = 0; k < 9; k++) {   // 斜射下来的光
          var x0 = 40 + k * 58 + Math.sin(k * 7) * 20, wd = 14 + (k % 3) * 10;
          var lg = gc.createLinearGradient(0, 0, 0, h * 0.8); lg.addColorStop(0, 'rgba(255,255,240,0.16)'); lg.addColorStop(1, 'rgba(255,255,240,0)');
          gc.fillStyle = lg; gc.beginPath(); gc.moveTo(x0, 0); gc.lineTo(x0 + wd, 0); gc.lineTo(x0 + wd + 90, h * 0.8); gc.lineTo(x0 + 80, h * 0.8); gc.fill();
        }
      });
      var face = new T.Mesh(g, new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      face.renderOrder = 4; scene.add(face);
      var hl = new T.Mesh(new T.PlaneGeometry(xR - xL, 0.14), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
      hl.position.set((xL + xR) / 2, -0.07, ZF + 0.02); hl.renderOrder = 6; scene.add(hl);
    })();
    var caust = [];
    (function () {
      var g = new T.PlaneGeometry(xR - xL + 2, ZF + 34, 90, 60); g.rotateX(-Math.PI / 2); g.translate((xL + xR) / 2, 0, (ZF - 34) / 2);
      var p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (var i = 0; i < p.count; i++) {
        var y = H(p.getX(i), p.getZ(i)); p.setY(i, y + 0.05);
        var k = sstep(-0.3, -2.5, y) * (1 - 0.45 * sstep(-4, -12, y)); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      [0.2, 0.12].forEach(function (op, j) {
        var t = causticTex.clone(); t.needsUpdate = true; t.repeat.set(j ? 15 : 11, j ? 10 : 7.5);
        var m = new T.Mesh(g, new T.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
        m.renderOrder = 1; scene.add(m); caust.push(t);
      });
    })();

    /* ── 石头、卵石 ── */
    function stoneGeo(seed) {
      var g = new T.SphereGeometry(1, 36, 24), p = g.attributes.position, r = rng(seed), a = [r() * 6, r() * 6, r() * 6, r() * 6], v = new T.Vector3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); var n = v.clone().normalize();
        var k = 1 + 0.16 * Math.sin(n.x * 3 + a[0]) * Math.cos(n.z * 2.6 + a[1]) + 0.07 * Math.sin(n.y * 6 + a[2]) + 0.04 * Math.sin(n.x * 9 + n.z * 7 + a[3]);
        p.setXYZ(i, n.x * k, n.y * k, n.z * k);
      }
      g.computeVertexNormals(); return g;
    }
    var stoneMap = noiseTex(21, 150, [2, 2]);
    var stoneGeos = [stoneGeo(3), stoneGeo(17), stoneGeo(29), stoneGeo(41)];
    [[-5.4, 3.3, 0.9, 0x8d8a80], [-3.6, 3.9, 0.55, 0x9b9184], [-6.8, -3.2, 1.1, 0x7f7b72], [-4.2, -6, 0.8, 0x8f8576], [1.8, 3.2, 0.8, 0x7c776a],
     [9, -6, 1.2, 0x8a8677], [18, 3.3, 0.9, 0x837d6f], [26, -3, 1.4, 0x8e8a7c], [33, 3.6, 0.7, 0x7d7a70], [38, -10, 1.6, 0x86826f], [13, 3.9, 0.5, 0x908a7a], [44, 2, 1.0, 0x8a8576], [-8.5, 4.0, 0.6, 0x958e80]
    ].forEach(function (s, i) {
      var m = new T.Mesh(stoneGeos[i % 4], new T.MeshStandardMaterial({ color: s[3], map: stoneMap, roughness: 0.9 }));
      m.scale.set(s[2] * 1.2, s[2] * 0.6, s[2]); m.rotation.y = i * 1.7;
      m.position.set(s[0], H(s[0], s[1]) + s[2] * 0.12, s[1]); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    });
    (function () {
      var r = rng(77), n = 260, im = new T.InstancedMesh(stoneGeos[1], new T.MeshStandardMaterial({ roughness: 0.85, map: stoneMap }), n), M = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), k = 0;
      while (k < n) {
        var x = xL - 1 + r() * (xR - xL + 2), z = -30 + r() * (ZF + 29.5), y = H(x, z); if (y > -0.5) continue;
        var s = 0.1 + r() * 0.28; q.setFromAxisAngle(Y, r() * 6);
        M.compose(V(x, y + s * 0.2, z), q, V(s * 1.3, s * 0.55, s)); im.setMatrixAt(k, M);
        var gv = 0.45 + r() * 0.35; im.setColorAt(k, c.setRGB(gv, gv * 0.95, gv * 0.85)); k++;
      }
      im.receiveShadow = true; scene.add(im);
    })();

    /* ── 草 ── */
    (function () {
      var g = new T.PlaneGeometry(0.14, 1, 1, 4); g.translate(0, 0.5, 0);
      var p = g.attributes.position;
      for (var i = 0; i < p.count; i++) { var y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.3); }
      g.computeVertexNormals();
      var n = 5200, im = new T.InstancedMesh(g, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.8 }), n), M = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), r = rng(13), k = 0, tries = 0;
      var cA = new T.Color(0x5b8c2c), cB = new T.Color(0x9fbf55), cC = new T.Color(0xb7b060);
      while (k < n && tries < 60000) {
        tries++;
        var x = X0 + r() * (X1 - X0), z = Z0 + r() * (ZF - Z0);
        if (r() < 0.55) z = -12 + r() * (ZF + 12);
        var y = H(x, z); if (y < 2.0) continue;
        if (Math.abs(z) < 1.2 && x > -25 && x < -5 && r() < 0.6) continue;
        var s = 0.6 + r() * 0.9; q.setFromAxisAngle(Y, r() * 6.3);
        M.compose(V(x, y - 0.05, Math.min(z, ZF - 0.05)), q, V(1, s, 1)); im.setMatrixAt(k, M);
        im.setColorAt(k, c.copy(cA).lerp(cB, r()).lerp(cC, r() * 0.3)); k++;
      }
      im.count = k; im.receiveShadow = true; scene.add(im);
      // 小野花
      var fl = new T.InstancedMesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshStandardMaterial({ roughness: 0.6 }), 90); k = 0;
      while (k < 90) {
        var fx = X0 + r() * (X1 - X0), fz = -30 + r() * (ZF + 30), fy = H(fx, fz); if (fy < 2.4) continue;
        M.compose(V(fx, fy + 0.7 + r() * 0.4, Math.min(fz, ZF - 0.2)), q, V(1, 0.7, 1)); fl.setMatrixAt(k, M);
        fl.setColorAt(k, c.set([0xffe066, 0xffffff, 0xf2a7c9, 0xffd23f][k % 4])); k++;
      }
      scene.add(fl);
    })();

    /* ── 芦苇（会轻轻摆） ── */
    var reeds = [];
    var stalkMat = new T.MeshStandardMaterial({ color: 0x7f9348, roughness: 0.7 }), leafMat = new T.MeshStandardMaterial({ color: 0x8ea24f, roughness: 0.75, side: T.DoubleSide }), headMat = new T.MeshStandardMaterial({ color: 0x6b4022, roughness: 0.9 }), plumeMat = new T.MeshStandardMaterial({ color: 0xd8c9a3, roughness: 1 });
    function leafGeo(L, w0, dirAng, rise, seed) {
      var r = rng(seed), n = 12, pos = [], idx = [], d = V(Math.cos(dirAng), 0, Math.sin(dirAng)), side = V(-d.z, 0, d.x), tw = (r() - 0.5) * 0.8;
      for (var k = 0; k <= n; k++) {
        var t = k / n, c = d.clone().multiplyScalar(L * t * 0.75).add(V(0, L * (rise * t - (rise + 0.25) * t * t * 0.9), 0));
        var w = w0 * Math.pow(1 - t, 0.6) + 0.01, s = side.clone().applyAxisAngle(d, tw * t).multiplyScalar(w / 2);
        pos.push(c.x - s.x, c.y - s.y, c.z - s.z, c.x + s.x, c.y + s.y, c.z + s.z);
        if (k) { var a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    }
    function reed(x, z, hgt, seed) {
      var r = rng(seed), grp = new T.Group(), bend = (r() - 0.5) * 2.2, pts = [];
      for (var k = 0; k <= 6; k++) { var t = k / 6; pts.push(V(bend * t * t, t * hgt, 0)); }
      var st = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 18, 0.06, 6), stalkMat); st.castShadow = true; grp.add(st);
      var nl = 2 + Math.floor(r() * 3);
      for (var j = 0; j < nl; j++) {
        var hb = hgt * (0.12 + j * 0.16 + r() * 0.08), lf = new T.Mesh(leafGeo(3 + r() * 3, 0.26, r() * 6.3, 0.9 + r() * 0.6, seed * 7 + j), leafMat);
        lf.position.set(bend * (hb / hgt) * (hb / hgt), hb, 0); lf.castShadow = true; grp.add(lf);
      }
      var top = pts[6];
      if (r() < 0.5) {
        var hd = new T.Mesh(new T.CapsuleGeometry(0.17, 1.1, 4, 10), headMat); hd.position.set(top.x, top.y - 0.9, 0); grp.add(hd);
        var sp = new T.Mesh(new T.CylinderGeometry(0.02, 0.04, 0.9, 5), stalkMat); sp.position.set(top.x, top.y + 0.1, 0); grp.add(sp);
      } else {
        var pl = new T.Mesh(new T.ConeGeometry(0.35, 2.0, 8, 1, true), plumeMat); pl.position.set(top.x + 0.2, top.y - 0.3, 0); pl.rotation.z = -0.35; pl.rotation.x = Math.PI; grp.add(pl);
      }
      grp.position.set(x, H(x, z) - 0.2, z); scene.add(grp);
      reeds.push({ g: grp, a: 0.025 + r() * 0.03, f: 0.9 + r() * 0.7, p: r() * 6, b: 0.015 + r() * 0.02 });
    }
    (function () {
      var r = rng(101), s = 1;
      for (var i = 0; i < 8; i++) reed(-5 + r() * 9, -23 - r() * 3, 10 + r() * 5, s++);
      for (var j = 0; j < 7; j++) reed(46 + r() * 5, -1 - r() * 14, 9 + r() * 5, s++);
      for (var k = 0; k < 8; k++) reed(4 + r() * 40, -24 - r() * 4, 9 + r() * 6, s++);
      reed(49, 3.2, 11, s++); reed(50.5, 2.2, 13, s++);
    })();

    /* ── 远处的树 ── */
    (function () {
      var blobGeo = new T.SphereGeometry(1, 40, 28); (function () { var p = blobGeo.attributes.position, v = new T.Vector3(); for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var k = 1 + 0.08 * Math.sin(v.x * 2.1 + 1) * Math.sin(v.z * 1.7) + 0.05 * Math.sin(v.y * 3.3); p.setXYZ(i, v.x * k, v.y * k, v.z * k); } blobGeo.computeVertexNormals(); })();
      var leafM = [new T.MeshStandardMaterial({ color: 0x5d8a3a, roughness: 0.9 }), new T.MeshStandardMaterial({ color: 0x6f9c45, roughness: 0.9 })], bark = new T.MeshStandardMaterial({ color: 0x6b4f37, roughness: 0.95 });
      [[20, -39, 1.05], [52, -33, 0.95], [-2, -41, 0.75]].forEach(function (t, i) {
        var g = new T.Group(), r = rng(300 + i), s = t[2];
        var trunk = new T.Mesh(new T.CylinderGeometry(0.45 * s, 0.75 * s, 12 * s, 10), bark); trunk.position.y = 6 * s; trunk.castShadow = true; g.add(trunk);
        for (var k = 0; k < 13; k++) {
          var b = new T.Mesh(blobGeo, leafM[k % 2]), rr = (2.4 + r() * 1.8) * s;
          b.scale.set(rr, rr * 0.85, rr); b.position.set((r() - 0.5) * 6 * s, (12 + r() * 5) * s, (r() - 0.5) * 5 * s); b.castShadow = true; g.add(b);
        }
        g.position.set(t[0], H(t[0], t[1]) - 0.3, t[1]); scene.add(g);
      });
    })();

    /* ── 荷叶 ── */
    (function () {
      var t = tex(256, 256, function (gc, w, h) {
        gc.fillStyle = '#5f8f3a'; gc.fillRect(0, 0, w, h);
        var gr = gc.createRadialGradient(128, 128, 5, 128, 128, 128); gr.addColorStop(0, 'rgba(190,220,120,.5)'); gr.addColorStop(1, 'rgba(40,80,30,.3)'); gc.fillStyle = gr; gc.fillRect(0, 0, w, h);
        gc.strokeStyle = 'rgba(200,230,150,.55)'; gc.lineWidth = 2;
        for (var k = 0; k < 18; k++) { var a = k / 18 * Math.PI * 2; gc.beginPath(); gc.moveTo(128, 128); gc.lineTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128); gc.stroke(); }
      });
      var mat = new T.MeshStandardMaterial({ map: t, roughness: 0.55, side: T.DoubleSide });
      [[30, -9, 1.5], [34, -13, 1.9], [38, -7, 1.2], [41, -16, 1.7], [27, -15, 1.1]].forEach(function (p, i) {
        var g = new T.CircleGeometry(p[2], 32, 0.25, Math.PI * 2 - 0.5); g.rotateX(-Math.PI / 2);
        var m = new T.Mesh(g, mat); m.position.set(p[0], 0.05, p[1]); m.rotation.y = i * 1.9; m.receiveShadow = true; scene.add(m);
      });
    })();

    /* ── 水草（会飘） ── */
    var weeds = [];
    (function () {
      var r = rng(55), mat = new T.MeshStandardMaterial({ color: 0x4f7f3a, roughness: 0.8, side: T.DoubleSide });
      for (var i = 0; i < 14; i++) {
        var x = 18 + r() * 26, z = -4 - r() * 16, y0 = H(x, z), L = 3 + r() * 4, n = 14;
        var g = new T.BufferGeometry(), pos = new Float32Array((n + 1) * 2 * 3), idx = [];
        for (var k = 0; k < n; k++) { var a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx);
        var m = new T.Mesh(g, mat); scene.add(m);
        weeds.push({ g: g, x: x, y: y0, z: z, L: L, n: n, p: r() * 6, w: 0.22 + r() * 0.12 });
      }
    })();
    function waveWeeds(t) {
      weeds.forEach(function (w) {
        var p = w.g.attributes.position.array;
        for (var k = 0; k <= w.n; k++) {
          var s = k / w.n, off = 0.9 * Math.sin(t * 1.1 + w.p + s * 2.2) * Math.pow(s, 1.4), wd = w.w * (1 - s * 0.7);
          var x = w.x + off, y = w.y + s * w.L, z = w.z + 0.4 * Math.sin(t * 0.8 + w.p + s * 1.5) * s, o = k * 6;
          p[o] = x - wd; p[o + 1] = y; p[o + 2] = z; p[o + 3] = x + wd; p[o + 4] = y; p[o + 5] = z;
        }
        w.g.attributes.position.needsUpdate = true; w.g.computeVertexNormals();
      });
    }

    /* ── 鱼：回转体鱼身 + 鳞片贴图 + 鳍 ── */
    var FISH_PROF = [[0.0, -1.66], [0.12, -1.62], [0.17, -1.5], [0.24, -1.3], [0.42, -0.95], [0.62, -0.5], [0.78, 0.0], [0.82, 0.35], [0.78, 0.8], [0.66, 1.2], [0.5, 1.55], [0.3, 1.85], [0.12, 2.0], [0.0, 2.04]];
    var fishCurve = new T.SplineCurve(FISH_PROF.map(function (p) { return new T.Vector2(p[0], p[1]); }));
    var FZ = 0.58;   // 鱼身左右扁一些
    function fishR(xx) { // 鱼身某处（x 向左为头）的半径
      var y = -xx, best = 0;
      for (var k = 0; k <= 60; k++) { var p = fishCurve.getPoint(k / 60); if (Math.abs(p.y - y) < 0.06) best = Math.max(best, p.x); }
      return best;
    }
    var scaleTex = tex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      var rows = 30, cols = 32, sw = w / cols, shh = h / rows;
      for (var j = 0; j < rows; j++) {
        var vv = j / rows; if (vv < 0.1) continue;            // 画布下方是鱼尾，上方 v 大是鱼头
        var yy = h - (j + 1) * shh; if (1 - vv < 0.28) continue; // 鱼头没有鳞
        for (var i = 0; i <= cols; i++) {
          var x = (i + (j % 2) * 0.5) * sw;
          var gr = g.createRadialGradient(x, yy + shh * 0.2, 1, x, yy + shh * 0.2, sw * 0.7);
          gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); gr.addColorStop(0.9, 'rgba(60,45,20,0.5)'); gr.addColorStop(1, 'rgba(60,45,20,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, yy + shh * 0.2, sw * 0.7, Math.PI, 0); g.fill();
        }
      }
      g.fillStyle = 'rgba(60,50,35,.45)';   // 侧线（u = 0 和 0.5 是两侧）
      for (var k = 0; k < 50; k++) { var vy = h * (0.3 + k / 50 * 0.42); [0, 0.5, 1].forEach(function (u) { g.beginPath(); g.arc(u * w, vy, 3, 0, 7); g.fill(); }); }
      g.strokeStyle = 'rgba(70,50,30,.55)'; g.lineWidth = 6;   // 鳃盖
      g.beginPath(); g.moveTo(-10, h * 0.26); g.quadraticCurveTo(w * 0.12, h * 0.31, w * 0.22, h * 0.25); g.stroke();
      g.beginPath(); g.moveTo(w * 0.28, h * 0.25); g.quadraticCurveTo(w * 0.38, h * 0.31, w * 0.5, h * 0.26); g.quadraticCurveTo(w * 0.62, h * 0.31, w * 0.72, h * 0.25); g.stroke();
      g.beginPath(); g.moveTo(w * 0.78, h * 0.25); g.quadraticCurveTo(w * 0.88, h * 0.31, w + 10, h * 0.26); g.stroke();
    });
    var finTex = tex(256, 256, function (g, w, h) {
      var gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(206,98,48,0.97)'); gr.addColorStop(1, 'rgba(238,128,70,0.72)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,60,30,.55)'; g.lineWidth = 2;
      for (var k = 0; k < 22; k++) { g.beginPath(); g.moveTo(w * 0.5, h); g.lineTo(k / 21 * w, 0); g.stroke(); }
    });
    var bodyGeo = (function () {
      var g = new T.LatheGeometry(fishCurve.getPoints(48), 40); g.rotateZ(Math.PI / 2); g.scale(1, 1, FZ);
      var p = g.attributes.position, col = new Float32Array(p.count * 3), cT = new T.Color(0x4a4a28), cS = new T.Color(0xdca43c), cB = new T.Color(0xf4ecd4), c = new T.Color();
      for (var i = 0; i < p.count; i++) {
        var rr = Math.max(0.05, fishR(p.getX(i))), k = clamp(p.getY(i) / rr, -1, 1);
        if (k > 0) c.copy(cS).lerp(cT, Math.pow(k, 0.8)); else c.copy(cS).lerp(cB, Math.pow(-k, 0.7));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
    })();
    function finShape(pts) { var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); return s; }
    function finGeo(pts) {
      var g = new T.ShapeGeometry(finShape(pts)), p = g.attributes.position, uv = g.attributes.uv, b = new T.Box3().setFromBufferAttribute(p);
      for (var i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x + 1e-6), (p.getY(i) - b.min.y) / (b.max.y - b.min.y + 1e-6));
      return g;
    }
    var GEO = {
      dorsal: finGeo([[-0.45, 0], [-0.25, 0.62], [0.05, 0.55], [0.6, 0.28], [1.0, 0.05], [1.0, -0.1], [-0.45, -0.1]]),
      tail: finGeo([[0, 0.14], [0.55, 0.55], [1.05, 0.95], [1.12, 0.8], [0.78, 0.12], [0.78, -0.12], [1.12, -0.8], [1.05, -0.95], [0.55, -0.55], [0, -0.14]]),
      pect: finGeo([[0, 0.06], [0.45, 0.12], [0.8, -0.05], [0.55, -0.22], [0, -0.06]]),
      anal: finGeo([[0, 0.1], [0.2, -0.38], [0.55, -0.32], [0.62, 0.1]]),
      eye: new T.SphereGeometry(0.15, 16, 12), pupil: new T.SphereGeometry(0.085, 12, 10),
      hit: new T.SphereGeometry(1, 16, 10)
    };
    function makeFish(ghost) {
      var root = new T.Group(), sway = new T.Group(); root.add(sway);
      var body = new T.MeshStandardMaterial({ vertexColors: true, map: scaleTex, roughness: 0.42, metalness: 0.15 });
      var fin = new T.MeshStandardMaterial({ map: finTex, transparent: true, side: T.DoubleSide, roughness: 0.6, depthWrite: !ghost });
      var eyeM = new T.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 0.3 }), pupM = new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
      var mats = [body, fin, eyeM, pupM];
      if (ghost) mats.forEach(function (m) { m.transparent = true; m.opacity = m === fin ? 0.5 : 0.62; m.emissive = new T.Color(0x203860); m.emissiveIntensity = 0.35; });
      var b = new T.Mesh(bodyGeo, body); b.castShadow = !ghost; sway.add(b);
      var d = new T.Mesh(GEO.dorsal, fin); d.position.set(-0.15, 0.62, 0); sway.add(d);
      var a = new T.Mesh(GEO.anal, fin); a.position.set(0.7, -0.4, 0); sway.add(a);
      var tail = new T.Group(); tail.position.set(1.5, 0, 0); sway.add(tail);
      var tf = new T.Mesh(GEO.tail, fin); tf.position.x = 0.02; tail.add(tf);
      var pects = [];
      [-1, 1].forEach(function (s) {
        var pf = new T.Group(); pf.position.set(-0.85, -0.36, s * 0.36); sway.add(pf);
        var pm = new T.Mesh(GEO.pect, fin); pm.rotation.set(s * 0.5, 0, -0.35); pf.add(pm); pects.push(pf);
        var vf = new T.Mesh(GEO.pect, fin); vf.scale.set(0.8, 0.8, 0.8); vf.position.set(0.15, -0.66, s * 0.2); vf.rotation.set(s * 0.6, 0, -0.5); sway.add(vf);
        var ex = -1.42, er = fishR(ex), ez = Math.sqrt(Math.max(0, er * er - 0.2 * 0.2)) * FZ;
        var e = new T.Mesh(GEO.eye, eyeM); e.position.set(ex, 0.2, s * (ez - 0.02)); sway.add(e);
        var pu = new T.Mesh(GEO.pupil, pupM); pu.position.set(ex - 0.02, 0.2, s * (ez + 0.07)); sway.add(pu);
      });
      var hit = new T.Mesh(GEO.hit, new T.MeshBasicMaterial({ visible: false })); hit.scale.set(2.3, 1.0, 0.8); hit.position.x = 0.2; root.add(hit);
      root.userData = { sway: sway, tail: tail, pects: pects, hit: hit };
      return root;
    }
    var FS = 1.35;   // 鱼画大一些（示意）
    var fish = makeFish(false), ghost = makeFish(true);
    fish.scale.setScalar(FS); ghost.scale.setScalar(FS);
    (function () {   // 看到的鱼：外面一圈浅蓝的光边，像课本里画虚像那样淡淡的
      var sh = new T.Mesh(bodyGeo, new T.MeshBasicMaterial({ color: 0xd4ecff, transparent: true, opacity: 0.4, side: T.BackSide, depthWrite: false }));
      sh.scale.set(1.04, 1.07, 1.1); ghost.userData.sway.add(sh);
    })();
    ghost.traverse(function (o) { if (o.isMesh) o.renderOrder = 3; });
    scene.add(fish); scene.add(ghost);

    /* ── 渔夫：比例接近真人（身高 1.7 m），草帽、鱼篓，双手握叉 ── */
    function taper(r0, r1, len, seg, bulge) {
      var pts = [], n = 6, k;
      for (k = 0; k <= n; k++) { var a = -Math.PI / 2 + k / n * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a))); }
      for (k = 1; k < 10; k++) { var t = k / 10; pts.push(new T.Vector2(r0 + (r1 - r0) * t + (bulge || 0) * Math.sin(t * Math.PI), len * t)); }
      for (k = 0; k <= n; k++) { var b = k / n * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, r1 * Math.cos(b)), len + r1 * Math.sin(b))); }
      return new T.LatheGeometry(pts, seg || 18);
    }
    function place(m, a, b) { var d = b.clone().sub(a); m.position.copy(a); m.quaternion.setFromUnitVectors(Y, d.normalize()); }
    function ik(S, Ht, a, b, pole) {
      var d = Ht.clone().sub(S), L = clamp(d.length(), Math.abs(a - b) + 0.01, a + b - 0.01), dir = d.normalize();
      var x = (a * a - b * b + L * L) / (2 * L), y = Math.sqrt(Math.max(0, a * a - x * x));
      var pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      return { mid: S.clone().add(dir.clone().multiplyScalar(x)).add(pp.multiplyScalar(y)), end: S.clone().add(dir.clone().multiplyScalar(L)) };
    }
    var fabric = function (base, seed, placket) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        var r = rng(seed);
        for (var k = 0; k < 2600; k++) { g.fillStyle = 'rgba(' + (r() < .5 ? '255,255,255,' : '0,0,0,') + (0.03 + r() * 0.05) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
        for (var y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.035)'; g.fillRect(0, y, w, 1); }
        if (placket) {
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(w * 0.25 - 2, 0, 4, h * 0.85);
          g.fillStyle = '#e8e2d0'; for (var b = 0; b < 4; b++) { g.beginPath(); g.arc(w * 0.25 + 8, h * 0.12 + b * h * 0.11, 6, 0, 7); g.fill(); }
          g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h * 0.05, w, 6);
        }
      });
    };
    var M = {
      skin: new T.MeshStandardMaterial({ color: 0xd59f74, roughness: 0.62 }),
      shirt: new T.MeshStandardMaterial({ map: fabric('#6d95bd', 3, true), roughness: 0.85 }),
      sleeve: new T.MeshStandardMaterial({ map: fabric('#6d95bd', 4, false), roughness: 0.85 }),
      pants: new T.MeshStandardMaterial({ map: fabric('#3f4a59', 5, false), roughness: 0.9 }),
      shoe: new T.MeshStandardMaterial({ color: 0x2c2926, roughness: 0.8 }),
      sole: new T.MeshStandardMaterial({ color: 0xd8cdb4, roughness: 0.9 }),
      hair: new T.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.7 }),
      dark: new T.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.4 }),
      sash: new T.MeshStandardMaterial({ color: 0x8a5532, roughness: 0.8 }),
      ribbon: new T.MeshStandardMaterial({ color: 0x8b2e25, roughness: 0.6 }),
      straw: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.85, map: tex(1024, 512, function (g, w, h) {
        g.fillStyle = '#dcb86c'; g.fillRect(0, 0, w, h);
        var rows = 34, rh = h / rows;
        for (var j = 0; j < rows; j++) {
          g.fillStyle = j % 2 ? 'rgba(160,115,50,.20)' : 'rgba(255,240,190,.18)'; g.fillRect(0, j * rh, w, rh);
          g.strokeStyle = 'rgba(140,95,40,.55)'; g.lineWidth = 1.6;
          for (var i = 0; i < 90; i++) { var x = i * w / 90 + (j % 2) * 5; g.beginPath(); g.moveTo(x, j * rh + 1); g.lineTo(x + 6, j * rh + rh / 2); g.lineTo(x, j * rh + rh - 1); g.stroke(); }
        }
      }) }),
      basket: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.9, map: tex(256, 256, function (g, w, h) {
        g.fillStyle = '#b48a4e'; g.fillRect(0, 0, w, h);
        for (var j = 0; j < 16; j++) for (var i = 0; i < 16; i++) { g.fillStyle = (i + j) % 2 ? 'rgba(90,60,25,.35)' : 'rgba(255,230,170,.25)'; g.fillRect(i * 16, j * 16, 16, 15); }
      }) })
    };
    var person = (function () {
      var root = new T.Group(); scene.add(root);
      var parts = {};
      function mesh(geo, mat, parent) { var m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; (parent || root).add(m); return m; }
      // 躯干（上衣回转体，前后扁）
      var torso = new T.Group(); root.add(torso); parts.torso = torso;
      var shirtPts = [[1.30, -0.95], [1.36, -0.3], [1.28, 0.6], [1.30, 1.6], [1.44, 2.8], [1.60, 3.9], [1.64, 4.6], [1.56, 5.1], [1.28, 5.5], [0.9, 5.78], [0.5, 5.92], [0.001, 5.98]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      var sg = new T.LatheGeometry(new T.SplineCurve(shirtPts).getPoints(40), 36); sg.scale(0.66, 1, 1);
      mesh(sg, M.shirt, torso);
      var sash = mesh(new T.TorusGeometry(1.33, 0.17, 10, 40), M.sash, torso); sash.rotation.x = Math.PI / 2; sash.scale.set(0.67, 1, 1); sash.position.y = 0.05;
      var knot = mesh(new T.SphereGeometry(0.24, 12, 8), M.sash, torso); knot.position.set(0.9, 0.0, 0.25);
      var collar = mesh(new T.TorusGeometry(0.52, 0.12, 8, 24), M.shirt, torso); collar.rotation.x = Math.PI / 2; collar.position.y = 5.82; collar.scale.set(0.9, 1, 1);
      [-1, 1].forEach(function (s) { var sh = mesh(new T.SphereGeometry(0.66, 16, 12), M.sleeve, torso); sh.position.set(0, 5.15, s * 1.72); });
      var seat = mesh(new T.SphereGeometry(1.25, 20, 14), M.pants); seat.scale.set(0.82, 0.72, 1.12); parts.seat = seat;
      // 腿
      parts.legs = [-1, 1].map(function (s) {
        return {
          s: s,
          thigh: mesh(taper(0.84, 0.6, 3.95, 18, 0.06), M.pants),
          shinC: mesh(taper(0.6, 0.55, 2.1, 16), M.pants),
          cuff: mesh(new T.TorusGeometry(0.56, 0.1, 8, 20), M.pants),
          calf: mesh(taper(0.43, 0.32, 1.95, 16, 0.05), M.skin),
          shoe: mesh(new T.SphereGeometry(1, 20, 12), M.shoe),
          sole: mesh(new T.SphereGeometry(1, 20, 8), M.sole)
        };
      });
      // 手臂
      parts.arms = [-1, 1].map(function (s) {
        return {
          s: s,
          up: mesh(taper(0.56, 0.47, 3.0, 16), M.sleeve),
          cuff: mesh(new T.TorusGeometry(0.47, 0.1, 8, 18), M.sleeve),
          fore: mesh(taper(0.4, 0.31, 2.6, 16), M.skin),
          hand: mesh(new T.SphereGeometry(1, 16, 12), M.skin)
        };
      });
      // 脖子、头
      parts.neck = mesh(new T.CylinderGeometry(0.42, 0.46, 1, 14), M.skin);
      var head = new T.Group(); root.add(head); parts.head = head;
      var skull = mesh(new T.SphereGeometry(1, 32, 24), M.skin, head); skull.scale.set(1.0, 1.15, 0.9);
      var jaw = mesh(new T.SphereGeometry(1, 20, 14), M.skin, head); jaw.scale.set(0.66, 0.5, 0.68); jaw.position.set(0.3, -0.55, 0);
      var nose = mesh(new T.SphereGeometry(1, 12, 10), M.skin, head); nose.scale.set(0.26, 0.3, 0.18); nose.position.set(0.98, -0.08, 0);
      [-1, 1].forEach(function (s) {
        var ear = mesh(new T.SphereGeometry(1, 12, 10), M.skin, head); ear.scale.set(0.18, 0.32, 0.12); ear.position.set(0.02, -0.05, s * 0.9);
        var eye = mesh(new T.SphereGeometry(0.085, 10, 8), M.dark, head); eye.position.set(0.9, 0.16, s * 0.33);
        var brow = mesh(new T.CapsuleGeometry(0.04, 0.28, 3, 6), M.hair, head); brow.rotation.x = Math.PI / 2; brow.rotation.y = s * 0.15; brow.position.set(0.9, 0.36, s * 0.33);
      });
      var mouth = mesh(new T.CapsuleGeometry(0.03, 0.24, 3, 6), M.dark, head); mouth.rotation.x = Math.PI / 2; mouth.position.set(0.9, -0.5, 0);
      var hair = mesh(new T.SphereGeometry(1.05, 24, 16, -Math.PI / 2 - 0.35, Math.PI + 0.7, 0, Math.PI * 0.62), M.hair, head); hair.position.set(-0.08, 0.1, 0); hair.scale.set(1, 1.1, 0.92);
      // 草帽
      var hat = new T.Group(); hat.position.set(-0.05, 0.78, 0); hat.rotation.z = 0.12; head.add(hat);
      var hatPts = [[2.78, -0.16], [2.6, -0.04], [2.1, 0.05], [1.5, 0.1], [1.2, 0.17], [1.13, 0.4], [1.1, 0.8], [1.02, 1.02], [0.78, 1.15], [0.3, 1.21], [0.001, 1.22]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      mesh(new T.LatheGeometry(new T.SplineCurve(hatPts).getPoints(36), 48), M.straw, hat);
      var rim = mesh(new T.TorusGeometry(2.77, 0.05, 6, 64), M.straw, hat); rim.rotation.x = Math.PI / 2; rim.position.y = -0.16;
      var band = mesh(new T.TorusGeometry(1.15, 0.12, 8, 40), M.ribbon, hat); band.rotation.x = Math.PI / 2; band.position.y = 0.3; band.scale.set(1, 1, 1.4);
      // 鱼篓
      var bk = new T.Group(); root.add(bk); parts.basket = bk;
      var bkPts = [[0.001, 0], [0.55, 0.02], [0.85, 0.35], [0.9, 0.8], [0.72, 1.3], [0.45, 1.55], [0.5, 1.72], [0.48, 1.82]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      mesh(new T.LatheGeometry(new T.SplineCurve(bkPts).getPoints(24), 24), M.basket, bk);
      var bkRim = mesh(new T.TorusGeometry(0.49, 0.06, 6, 20), M.sash, bk); bkRim.rotation.x = Math.PI / 2; bkRim.position.y = 1.82;
      parts.cord = mesh(new T.CylinderGeometry(0.035, 0.035, 1, 5), M.sash);
      // 拖动用的看不见的“包围体”
      var hit = new T.Mesh(new T.CapsuleGeometry(2.2, 12, 4, 8), new T.MeshBasicMaterial({ visible: false })); root.add(hit); parts.hit = hit;
      return { root: root, parts: parts };
    })();

    /* ── 鱼叉：竹竿 + 三股钢叉 ── */
    var TIP = 11.35, HAND_R = -3.1, HAND_L = 1.2;
    var spear = new T.Group(); scene.add(spear);
    (function () {
      var bamboo = new T.MeshStandardMaterial({ roughness: 0.55, map: tex(64, 1024, function (g, w, h) {
        g.fillStyle = '#c9a463'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(' + (i % 2 ? '120,85,40,' : '240,215,160,') + '0.18)'; g.fillRect(i * w / 40, 0, 1, h); }
      }) });
      var metal = new T.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.85, roughness: 0.3 }), cord = new T.MeshStandardMaterial({ color: 0x4a3522, roughness: 0.9 });
      function along(geo, mat, x0, x1) { var m = new T.Mesh(geo, mat); m.rotation.z = -Math.PI / 2; m.position.x = (x0 + x1) / 2; m.castShadow = true; spear.add(m); return m; }
      along(new T.CylinderGeometry(0.13, 0.15, 18.3, 12), bamboo, -9, 9.3);
      for (var x = -8.2; x < 9; x += 2.7) { var nd = new T.Mesh(new T.TorusGeometry(0.145, 0.035, 6, 16), new T.MeshStandardMaterial({ color: 0x9c7a44, roughness: 0.6 })); nd.rotation.y = Math.PI / 2; nd.position.x = x; spear.add(nd); }
      along(new T.CylinderGeometry(0.11, 0.16, 0.8, 12), metal, 9.3, 10.1);
      for (var k = 0; k < 4; k++) { var c = new T.Mesh(new T.TorusGeometry(0.15, 0.035, 6, 14), cord); c.rotation.y = Math.PI / 2; c.position.x = 9.0 - k * 0.12; spear.add(c); }
      var bar = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.0, 8), metal); bar.position.x = 10.1; spear.add(bar);
      [-0.45, 0, 0.45].forEach(function (yy) {
        var len = yy ? 0.95 : 1.0;
        var pr = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, len, 8), metal); pr.rotation.z = -Math.PI / 2; pr.position.set(10.1 + len / 2, yy, 0); pr.castShadow = true; spear.add(pr);
        var tp = new T.Mesh(new T.ConeGeometry(0.075, 0.3, 8), metal); tp.rotation.z = -Math.PI / 2; tp.position.set(10.1 + len + 0.15, yy, 0); spear.add(tp);
        if (yy) { var bb = new T.Mesh(new T.ConeGeometry(0.05, 0.22, 6), metal); bb.rotation.z = Math.PI / 2 + (yy > 0 ? -0.6 : 0.6); bb.position.set(10.85, yy - Math.sign(yy) * 0.09, 0); spear.add(bb); }
      });
      var hit = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 20, 8), new T.MeshBasicMaterial({ visible: false })); hit.rotation.z = -Math.PI / 2; hit.position.x = 1; spear.add(hit); spear.userData.hit = hit;
    })();
    var splash = [];
    for (var si = 0; si < 2; si++) { var sm = new T.Mesh(new T.RingGeometry(0.5, 0.62, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })); sm.rotation.x = -Math.PI / 2; sm.renderOrder = 7; scene.add(sm); splash.push(sm); }

    /* ── 光路：光线、法线、角 ── */
    var optics = new T.Group(); scene.add(optics);
    var rayMat = new T.MeshBasicMaterial({ color: 0xff8a1f }), backMat = new T.MeshBasicMaterial({ color: 0xffa94d }), nMat = new T.MeshBasicMaterial({ color: 0x3a4a5e }), aimMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var iMat = new T.MeshBasicMaterial({ color: 0x1f6fd6 }), rMat = new T.MeshBasicMaterial({ color: 0xd6336c });
    var unitCyl = new T.CylinderGeometry(1, 1, 1, 8);
    function seg(mat, r, parent) { var m = new T.Mesh(unitCyl, mat); m.userData.r = r; (parent || optics).add(m); return m; }
    function setSeg(m, a, b) { var d = b.clone().sub(a), L = d.length(); m.visible = L > 1e-4; if (!m.visible) return; m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, d.divideScalar(L)); m.scale.set(m.userData.r, L, m.userData.r); }
    function dashes(mat, r, n, parent) { var a = []; for (var i = 0; i < n; i++) a.push(seg(mat, r, parent)); return a; }
    function setDash(arr, a, b, on, off) {
      var d = b.clone().sub(a), L = d.length(), u = d.clone().divideScalar(L || 1), s = 0, i = 0;
      for (; i < arr.length; i++) {
        if (s >= L) { arr[i].visible = false; continue; }
        setSeg(arr[i], a.clone().addScaledVector(u, s), a.clone().addScaledVector(u, Math.min(L, s + on))); s += on + off;
      }
    }
    var rayIn = seg(rayMat, 0.09), rayOut = seg(rayMat, 0.09), cone = new T.ConeGeometry(0.32, 0.9, 12);
    var arrIn = new T.Mesh(cone, rayMat), arrOut = new T.Mesh(cone, rayMat); optics.add(arrIn); optics.add(arrOut);
    var backD = dashes(backMat, 0.07, 30), normD = dashes(nMat, 0.05, 30);
    var arcI = new T.Mesh(new T.BufferGeometry(), iMat), arcR = new T.Mesh(new T.BufferGeometry(), rMat); optics.add(arcI); optics.add(arcR);
    var pDot = new T.Mesh(new T.SphereGeometry(0.2, 12, 10), nMat); optics.add(pDot);
    var aimGrp = new T.Group(); scene.add(aimGrp); var aimD = dashes(aimMat, 0.045, 60, aimGrp);
    function arcGeo(c, r, a0, a1) {
      var pts = [], n = 24; for (var k = 0; k <= n; k++) { var a = a0 + (a1 - a0) * k / n; pts.push(V(c.x + r * Math.cos(a), c.y + r * Math.sin(a), 0.02)); }
      return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.09, 6);
    }
    function setArrow(m, a, b) { var d = b.clone().sub(a).normalize(); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(Y, d); }

    /* ── 状态 ── */
    var st = {
      px: -12, pose: 0, poseT: 0, fx: 14, fd: 7, aim: 45, show: { ray: false, real: false },
      thrown: false, u: 0, uStop: 0, back: false, vel: 0, result: null, splashT: -1, entry: null, hint: true, t: 0
    };
    var G = V(), E = V(), DIR = V(1, 0, 0), OPT = {};
    function poseParams(k) {   // 0 站着，1 蹲下
      function mix(a, b) { return a + (b - a) * k; }
      return { hip: mix(8.0, 4.3), lean: mix(17, 34) * DEG, fFoot: mix(2.5, 2.1), rFoot: mix(-2.7, -1.6), gF: mix(2.3, 2.4), gU: mix(3.4, 3.1) };
    }
    function groundAt(x, z) { return H(x, z); }

    /* 折射点：n·sin i = sin r（二分法） */
    function solve(E, F) {
      var d = -F.y, h = E.y;
      function f(px) { var a = Math.abs(px - F.x), b = Math.abs(E.x - px); return N * a / Math.hypot(a, d) - b / Math.hypot(b, h); }
      var lo = F.x, hi = E.x;
      for (var k = 0; k < 80; k++) { var m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
      var px = (lo + hi) / 2, a = Math.abs(F.x - px), b = Math.abs(E.x - px);
      var i = Math.atan2(a, d), r = Math.atan2(b, h), dApp = b > 1e-6 ? a * h / b : d / N;
      if (a < 1e-6) dApp = d / N;
      return { P: V(px, 0, 0), i: i, r: r, dApp: dApp, check: N * Math.sin(i) - Math.sin(r) };
    }
    function maxDepth(x) { return -H(x, 0) - 1.0; }
    function clampFish() { st.fx = clamp(st.fx, 2, 42); st.fd = clamp(st.fd, 1.4, Math.max(1.4, maxDepth(st.fx))); }

    function layoutPerson() {
      var pp = poseParams(st.poseT), rx = st.px, gy = groundAt(rx, 0), P = person.parts;
      var pel = V(rx, gy + pp.hip, 0), U = V(Math.sin(pp.lean), Math.cos(pp.lean), 0), F = V(Math.cos(pp.lean), -Math.sin(pp.lean), 0), Z = V(0, 0, 1);
      P.torso.position.copy(pel); P.torso.rotation.z = -pp.lean;
      P.seat.position.copy(pel).add(V(-0.1, -0.15, 0));
      // 腿
      P.legs.forEach(function (L) {
        var hip = pel.clone().add(V(0, -0.45, L.s * 0.8)), fx = rx + (L.s < 0 ? pp.fFoot : pp.rFoot), fz = L.s * 0.8, fy = groundAt(fx, fz);
        var ankle = V(fx - 0.35, fy + 0.75, fz), j = ik(hip, ankle, 3.95, 4.15, V(1, 0, 0));
        place(L.thigh, hip, j.mid);
        var sd = j.end.clone().sub(j.mid).normalize();
        place(L.shinC, j.mid, j.end);
        var cuffP = j.mid.clone().addScaledVector(sd, 2.2); L.cuff.position.copy(cuffP); L.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), sd);
        place(L.calf, cuffP, j.end);
        L.shoe.position.set(fx + 0.25, fy + 0.4, fz); L.shoe.scale.set(1.2, 0.42, 0.5);
        L.sole.position.set(fx + 0.25, fy + 0.12, fz); L.sole.scale.set(1.28, 0.16, 0.55);
      });
      // 握叉点、手
      G.copy(pel).addScaledVector(U, pp.gU).addScaledVector(F, pp.gF);
      DIR.set(Math.cos(st.aim * DEG), -Math.sin(st.aim * DEG), 0);
      P.arms.forEach(function (A) {
        var sh = pel.clone().addScaledVector(U, 5.15).add(V(0, 0, A.s * 1.72));
        var hand = G.clone().addScaledVector(DIR, A.s > 0 ? HAND_R : HAND_L).add(V(0, 0, A.s * 0.28));
        var pole = A.s > 0 ? V(-0.4, -0.7, 1) : V(0.2, -0.8, -1);
        var j = ik(sh, hand, 3.0, 2.75, pole);
        place(A.up, sh, j.mid); place(A.fore, j.mid, j.end);
        var fd = j.end.clone().sub(j.mid).normalize();
        A.cuff.position.copy(j.mid).addScaledVector(fd, 0.25); A.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), fd);
        A.hand.position.copy(j.end).addScaledVector(fd, 0.2); A.hand.quaternion.setFromUnitVectors(Y, fd); A.hand.scale.set(0.36, 0.48, 0.3);
      });
      // 头：看向看到的鱼
      var neckB = pel.clone().addScaledVector(U, 5.8), hc0 = neckB.clone().addScaledVector(U, 0.9).add(V(0.25, 0.5, 0));
      var look = OPT.A ? OPT.A.clone().sub(hc0) : V(1, -1, 0), pitch = clamp(Math.atan2(-look.y, look.x), 15 * DEG, 60 * DEG);
      var Uh = V(Math.sin(pitch * 0.85), Math.cos(pitch * 0.85), 0), hc = neckB.clone().addScaledVector(Uh, 1.35);
      P.head.position.copy(hc); P.head.rotation.z = -pitch;
      var nb = neckB.clone().addScaledVector(U, -0.2), nt = hc.clone().addScaledVector(Uh, -0.6);
      place(P.neck, nb, nt); P.neck.position.copy(nb).lerp(nt, 0.5); P.neck.scale.set(1, nb.distanceTo(nt) + 0.3, 1);
      E.set(hc.x + Math.cos(pitch) * 0.9 + Math.sin(pitch) * 0.16, hc.y - Math.sin(pitch) * 0.9 + Math.cos(pitch) * 0.16, 0);
      // 鱼篓
      P.basket.position.set(rx - 0.4, pel.y - 2.4, 1.95); P.basket.rotation.z = 0.08;
      var c0 = pel.clone().add(V(-0.3, -0.1, 1.35)), c1 = V(rx - 0.4, pel.y - 0.6, 1.95);
      place(P.cord, c0, c1); P.cord.position.copy(c0).lerp(c1, 0.5); P.cord.scale.set(1, c0.distanceTo(c1), 1);
      P.hit.position.copy(pel).add(V(0.5, 0.5, 0));
    }

    function aimOK(a) { var d = V(Math.cos(a * DEG), -Math.sin(a * DEG), 0), tip = G.clone().addScaledVector(d, TIP); return tip.y > groundAt(tip.x, 0) + 0.4; }
    function setAim(a) {
      a = clamp(a, 20, 76);
      var old = st.aim; st.aim = a; layoutPerson();
      if (!aimOK(a)) { while (st.aim > 20 && !aimOK(st.aim)) st.aim -= 0.5; layoutPerson(); }
      if (Math.abs(st.aim - old) > 0.01) st.result = null;
    }
    function aimAt(p) { setAim(Math.atan2(G.y - p.y, p.x - G.x) / DEG); }

    function lineGround(g0, d) { for (var s = TIP; s < 90; s += 0.05) { var q = g0.clone().addScaledVector(d, s); if (q.y < groundAt(q.x, 0) || q.x > 58) return s; } return 90; }
    function hitTest(g0, d) {   // 叉的直线和真实鱼身（椭圆）
      var A = 1.95 * FS, B = 0.75 * FS, ox = g0.x - st.fx, oy = g0.y + st.fd;
      var a = (d.x * d.x) / (A * A) + (d.y * d.y) / (B * B), b = 2 * (ox * d.x / (A * A) + oy * d.y / (B * B)), c = ox * ox / (A * A) + oy * oy / (B * B) - 1, D = b * b - 4 * a * c;
      var yAt = d.x > 1e-6 ? g0.y + (st.fx - g0.x) / d.x * d.y : null;
      if (D < 0) return { hit: false, yAt: yAt };
      var s1 = (-b - Math.sqrt(D)) / (2 * a), s2 = (-b + Math.sqrt(D)) / (2 * a);
      return { hit: s2 > TIP, s: (s1 + s2) / 2, yAt: yAt };
    }

    function update() {
      clampFish();
      layoutPerson();
      var F = V(st.fx, -st.fd, 0), o = solve(E, F);
      OPT = o; OPT.F = F; OPT.A = V(st.fx, -o.dApp, 0);
      layoutPerson();   // 头已转向新的位置，眼睛位置再算一次
      o = solve(E, F); OPT = o; OPT.F = F; OPT.A = V(st.fx, -o.dApp, 0); OPT.E = E.clone();
      fish.position.copy(F); ghost.position.copy(OPT.A);
      fish.visible = st.show.real || st.result === 'hit';
      // 鱼叉
      if (!st.thrown) { spear.position.copy(G); spear.rotation.z = -st.aim * DEG; }
      // 光路
      optics.visible = st.show.ray;
      if (st.show.ray) {
        setSeg(rayIn, F, o.P); setSeg(rayOut, o.P, E);
        setArrow(arrIn, F, o.P); setArrow(arrOut, o.P, E);
        setDash(backD, o.P, OPT.A, 0.55, 0.38);
        setDash(normD, V(o.P.x, 5.5, 0), V(o.P.x, -5.5, 0), 0.45, 0.3);
        pDot.position.copy(o.P);
        var dl = Math.atan2(F.y, F.x - o.P.x), ul = Math.atan2(E.y, E.x - o.P.x);
        arcI.geometry.dispose(); arcI.geometry = arcGeo(o.P, 2.8, -Math.PI / 2, dl);
        arcR.geometry.dispose(); arcR.geometry = arcGeo(o.P, 2.8, Math.PI / 2, ul);
      }
      // 瞄准线
      aimGrp.visible = !st.thrown;
      if (!st.thrown) { var tip = G.clone().addScaledVector(DIR, TIP + 0.3), sEnd = lineGround(G, DIR); setDash(aimD, tip, G.clone().addScaledVector(DIR, sEnd), 0.4, 0.4); }
      tags(); readouts();
      ctx.dirty();
    }

    /* ── 标签 ── */
    function tags() {
      var o = OPT;
      // 不能挡：看到的鱼、真实的鱼、折射点
      ctx.keepClear('app', V(st.fx, -o.dApp, 0), 58);
      ctx.keepClear('real', fish.visible ? V(st.fx, -st.fd, 0) : null, 58);
      ctx.keepClear('P', st.show.ray ? o.P : null, 18);
      ctx.tag('app', '<i style="background:#7aa7e6"></i>看到的鱼', V(st.fx + 2.6 * FS, -o.dApp, 0), { side: 'right', gap: 30, small: true });
      ctx.tag('real', '<i style="background:#c98a4b"></i>真实的鱼', fish.visible ? V(st.fx + 2.6 * FS, -st.fd, 0) : null, { side: 'right', gap: 30, small: true });
      ctx.spot('spear', st.hint && !st.thrown ? G.clone().addScaledVector(DIR, 6.5) : null);
      ctx.note(st.hint && !st.thrown ? '拖闪着的鱼叉瞄准（或按 ← →），再点右边的「出叉」' : '');
      var on = st.show.ray;
      var ti = ctx.tag('ang-i', '入射角 ' + Math.round(o.i / DEG) + '°', on ? V(o.P.x - 3.4, -3.4, 0) : null, { side: 'above', gap: 0, small: true });
      var tr = ctx.tag('ang-r', '折射角 ' + Math.round(o.r / DEG) + '°', on ? V(o.P.x + 3.6, 0.9, 0) : null, { side: 'above', gap: 0, small: true });
      ti.style.color = '#1f6fd6'; tr.style.color = '#d6336c';
      ctx.tag('nrm', '法线', on ? V(o.P.x, 5.7, 0) : null, { side: 'above', gap: 0, small: true });
      var rt = null, txt = '';
      if (st.result && !st.back) { rt = spear.position.clone().addScaledVector(DIR, TIP).add(V(-5.5, 0.6, 0)); txt = st.result === 'hit' ? '叉中了！' : '叉空了'; }
      var el = ctx.tag('res', txt, rt, { side: 'above', gap: 0 });
      if (el) { el.style.color = st.result === 'hit' ? '#15803d' : '#c2410c'; }
    }
    function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
    function readouts() {
      var o = OPT, s = function (id, v) { var e = ctx.$('#' + id); if (e) e.textContent = v; };
      s('fs-app', f2(o.dApp / 10)); s('fs-real', f2(st.fd / 10));
      s('fs-i', Math.round(o.i / DEG)); s('fs-r', Math.round(o.r / DEG));
      s('fs-ratio', Math.round(o.dApp / st.fd * 100));
      ctx.$$('[data-t]').forEach(function (b) { b.classList.toggle('on', !!st.show[b.getAttribute('data-t')]); });
      ctx.$$('[data-p]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-p') === st.pose); });
      var th = ctx.$('[data-a="throw"]'), bk = ctx.$('[data-a="back"]');
      if (th) th.disabled = st.thrown; if (bk) bk.disabled = !st.thrown;
      ctx.$$('[data-a^="aim"]').forEach(function (b) { b.disabled = st.thrown; });
      var r = ctx.$('#fs-res');
      if (r) {
        var html = '';
        if (st.result === 'hit') html = '<b>叉中了！</b>叉对着看到的鱼的下方，正好扎到真实的鱼。';
        else if (st.result === 'over') html = '<b>叉空了：</b>叉从真鱼的<b>上方</b>穿过去了。看到的鱼比真实的鱼浅，对着看到的鱼叉就叉高了，要往看到的鱼的<b>下方</b>叉。';
        else if (st.result === 'under') html = '<b>叉空了：</b>叉从真鱼的<b>下方</b>过去了，叉得太深了，往上一点。';
        else if (st.thrown) html = '叉沿直线飞下去……';
        else html = '先瞄准，再点「出叉」。叉在水里不会拐弯，是沿直线走的。';
        if (r._h !== html) { r.innerHTML = html; r._h = html; }
      }
    }

    /* ── 右栏 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>叉鱼</b><p>站在岸上看水里的鱼，鱼看起来比实际的浅。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">鱼有多深</div>' +
      '<div class="ls-row"><span class="nm">看到的深度</span><span class="vl" id="fs-app">-</span><span>m</span></div>' +
      '<div class="ls-row"><span class="nm">真实深度</span><span class="vl" id="fs-real">-</span><span>m</span></div>' +
      '<div class="ls-row"><span class="nm">入射角</span><span class="vl" id="fs-i">-</span><span>°（水里）</span></div>' +
      '<div class="ls-row"><span class="nm">折射角</span><span class="vl" id="fs-r">-</span><span>°（空气里）</span></div>' +
      '<p class="ls-tip">看到的深度只有真实的 <b id="fs-ratio">-</b>%。人离得越远、蹲得越低（斜着看得越厉害），鱼看起来越浅。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">叉鱼</div>' +
      '<div class="ls-btns"><button data-a="aimApp">对准看到的鱼</button><button data-a="aimLow">对准它的下方</button></div>' +
      '<div class="ls-btns" style="margin-top:8px"><button class="main" data-a="throw">出叉</button><button data-a="back">收回鱼叉</button></div>' +
      '<p class="ls-tip" id="fs-res" style="margin-top:8px;color:var(--ink)"></p></div>' +
      '<div class="ls-blk"><div class="ls-h">显示</div>' +
      '<div class="ls-btns"><button data-t="ray">光路</button><button data-t="real">真实位置</button></div>' +
      '<div class="ls-btns" style="margin-top:8px"><button data-p="0">站着看</button><button data-p="1">蹲下看</button></div></div>' +
      '<div class="ls-note">看到的鱼是光的折射形成的<b>虚像</b>，比实际的<b>浅</b>，叉鱼要对着看到的鱼的<b>下方</b>叉。</div>' +
      '<p class="ls-tip">拖鱼叉（或按 ← →）瞄准；拖鱼换地方、换深浅；拖人沿岸边走。人和鱼的大小只是示意。</p>'
    );
    ctx.rail.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null; if (!b || b.disabled) return;
      var a = b.getAttribute('data-a'), t = b.getAttribute('data-t'), p = b.getAttribute('data-p');
      if (a === 'aimApp') { aimAt(OPT.A); st.hint = false; }
      else if (a === 'aimLow') { aimAt(OPT.F); st.hint = false; }
      else if (a === 'throw') doThrow();
      else if (a === 'back') { if (st.thrown) st.back = true; }
      else if (t) st.show[t] = !st.show[t];
      else if (p != null) st.pose = +p;
      update();
    });

    function doThrow() {
      if (st.thrown) return;
      var g0 = G.clone(), h = hitTest(g0, DIR);
      st.throwG = g0; st.thrown = true; st.back = false; st.u = 0; st.vel = 18; st.result = null; st.pending = h;
      st.uStop = h.hit ? h.s + 0.6 - TIP : lineGround(g0, DIR) + 0.6 - TIP;
      st.entry = DIR.y < 0 ? g0.clone().addScaledVector(DIR, g0.y / -DIR.y) : null; st.splashT = -1;
    }
    function stepThrow(dt) {
      if (!st.thrown) return;
      var g0 = st.throwG;
      if (st.back) {
        st.u -= 70 * dt;
        if (st.u <= 0) { st.u = 0; st.thrown = false; st.back = false; st.result = null; update(); return; }
      } else if (st.u < st.uStop) {
        st.vel += 70 * dt; st.u = Math.min(st.uStop, st.u + st.vel * dt);
        var tipS = TIP + st.u;
        if (st.entry && st.splashT < 0 && g0.y + tipS * DIR.y <= 0) { st.splashT = 0; splash.forEach(function (m) { m.position.set(st.entry.x, 0.08, 0); }); }
        if (st.u >= st.uStop) {
          var h = st.pending; st.result = h.hit ? 'hit' : (h.yAt != null && h.yAt > -st.fd ? 'over' : 'under'); st.hint = false; update();
        }
      }
      spear.position.copy(g0).addScaledVector(DIR, st.u); spear.rotation.z = -st.aim * DEG;
      tags();
    }

    /* ── 拖动 ── */
    var drag = null, plane = new T.Plane(V(0, 0, 1), 0);
    ctx.drag = {
      hit: function (ev) { return !!pickWhat(ev); },
      start: function (ev) {
        var w = pickWhat(ev); if (!w) return false;
        var p = ctx.onPlane(ev, plane); drag = { w: w, dx: p ? p.x - st.px : 0 };
        if (w === 'spear') st.hint = false;
        return true;
      },
      move: function (ev) {
        if (!drag) return; var p = ctx.onPlane(ev, plane); if (!p) return;
        if (drag.w === 'spear') setAim(Math.atan2(G.y - p.y, p.x - G.x) / DEG);
        else if (drag.w === 'fish') { st.fx = p.x; st.fd = -p.y; }
        else if (drag.w === 'ghost') {   // 拖看到的鱼：反过来求真实的鱼该在哪
          st.fx = clamp(p.x, 2, 42); var want = clamp(-p.y, 0.6, 20), lo = 1.4, hi = Math.max(1.4, maxDepth(st.fx));
          for (var k = 0; k < 40; k++) { var m = (lo + hi) / 2; if (solve(E, V(st.fx, -m, 0)).dApp < want) lo = m; else hi = m; }
          st.fd = (lo + hi) / 2;
        }
        else if (drag.w === 'person') st.px = clamp(p.x - drag.dx, -24, -8.5);
        if (drag.w !== 'spear') st.result = null;
        update();
      },
      end: function () { drag = null; }
    };
    function pickWhat(ev) {
      if (!st.thrown) { var h = ctx.pick(ev, [spear.userData.hit]); if (h) return 'spear'; }
      if (fish.visible && !st.thrown && ctx.pick(ev, [fish.userData.hit])) return 'fish';
      if (!st.thrown && ctx.pick(ev, [ghost.userData.hit])) return 'ghost';
      if (!st.thrown && ctx.pick(ev, [person.parts.hit])) return 'person';
      return null;
    }
    var active = false;
    function onKey(ev) {
      if (!active || st.thrown) return;
      var tg = ev.target && ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      if (ev.key === 'ArrowLeft') { setAim(st.aim + 1); st.hint = false; update(); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { setAim(st.aim - 1); st.hint = false; update(); ev.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);

    /* ── 取景 ── */
    ctx.target.set(7, 2.4, 0);
    var o = ctx.orb; o.az = 0.2; o.el = 0.1; o.dist = 68; o.minEl = 0.03; o.maxEl = 0.7; o.minAz = -0.75; o.maxAz = 0.75; o.minDist = 38; o.maxDist = 120;
    var sc = ctx.sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.updateProjectionMatrix();

    setAim(45); update();
    ctx.host._api = { ctx: ctx, fish: fish, ghost: ghost, scene: scene, st: st, OPT: function () { return OPT; }, E: E, G: G, update: update, setAim: setAim, aimAt: aimAt, doThrow: doThrow, solve: solve, H: H };

    /* ── 动画 ── */
    function animFish(f, t, ph, fast) {
      var u = f.userData, k = fast ? 3.2 : 1;
      u.tail.rotation.y = Math.sin(t * 5.2 * k + ph) * 0.32;
      u.sway.rotation.y = Math.sin(t * 5.2 * k + ph - 1.2) * 0.05;
      u.sway.position.y = Math.sin(t * 1.3 + ph) * 0.04;
      u.pects.forEach(function (p, i) { p.rotation.y = Math.sin(t * 3 + i) * 0.25; });
    }
    var handle = {
      frame: function (dt) {
        st.t += dt; var t = st.t;
        for (var i = 0; i < wPos.count; i++) {
          var x = wBase[i * 3], z = wBase[i * 3 + 2], fade = sstep(ZF, ZF - 3, z);
          wPos.setY(i, fade * (0.06 * Math.sin(0.55 * x + 1.3 * t) * Math.cos(0.4 * z + 0.9 * t) + 0.035 * Math.sin(0.9 * x - 0.7 * z + 2.1 * t)));
        }
        wPos.needsUpdate = true; waterGeo.computeVertexNormals();
        caust[0].offset.set(0.02 * t, 0.012 * Math.sin(t * 0.3)); caust[1].offset.set(-0.015 * t, 0.017 * t);
        reeds.forEach(function (r) { r.g.rotation.z = r.a * Math.sin(t * r.f + r.p); r.g.rotation.x = r.b * Math.sin(t * r.f * 0.8 + r.p * 1.7); });
        waveWeeds(t);
        animFish(fish, t, 0, st.result === 'hit'); animFish(ghost, t, 0, false);
        if (Math.abs(st.poseT - st.pose) > 1e-3) { st.poseT += clamp(st.pose - st.poseT, -dt * 2.5, dt * 2.5); if (!st.thrown) update(); }
        stepThrow(dt);
        if (st.splashT >= 0) {
          st.splashT += dt;
          splash.forEach(function (m, j) { var s = Math.max(0, st.splashT - j * 0.18), k = 1 + s * 7; m.scale.set(k, k, 1); m.material.opacity = Math.max(0, 0.85 - s * 1.1); });
          if (st.splashT > 1.2) st.splashT = -1;
        }
        tags();
        return true;
      },
      pause: function () { active = false; },
      resume: function () { active = true; update(); }
    };
    ctx.host._api.frame = handle.frame;
    return handle;
  }
});
