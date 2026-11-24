/* ════ 生活情境：照相机（07「探究凸透镜成像的规律」，人教版八上 第五章 第3节）════
   画面：一张长木桌，桌上一台老式木制座机（风箱照相机），镜头对着桌上一盆花。相机朝我们这一侧（+x）剖开：
     镜头筒、镜头板、风箱只做了远侧一半（近侧一半画成很淡的透明壳），能看到镜头里的凸透镜、风箱里的光线、后面的毛玻璃（底片的位置）。
   物理（薄透镜）：焦距 f = 15 cm（座机常用的 150 mm 镜头），1/u + 1/v = 1/f。
     u：花（花茎所在的竖直面）到镜头光心的距离；v：毛玻璃到光心的距离（转调焦旋钮，后框带着毛玻璃沿导轨前后移，u 不变）。
     清楚的像在 vi = u·f/(u − f) 处。毛玻璃不在 vi 时，一个物点穿过光圈（直径 D = 3 cm）的光在毛玻璃上是一个光斑，
     光斑直径 c = D·|v − vi| / vi（相似三角形）；小窗按这个大小把像弄模糊，c ≤ 0.02 cm 算“清楚”。
     毛玻璃上像的大小按过光心的光线：像高 = 物高 × v/u（对准时 v = vi，像高/物高 = vi/u = f/(u − f)）。
     风箱最长拉到 v = 28 cm，最近只能对准 u = 28×15/13 ≈ 32.3 cm；u ≤ 2f = 30 cm 时像不再缩小（等大或放大），这台相机也对不清。
   小窗：在光心放一个“虚拟相机”朝花看，视场按毛玻璃大小（12.7 × 10.16 cm，4×5 英寸）和 v 算，拍下来转 180°
     （从相机后面看毛玻璃：上下、左右都颠倒），再按 c 模糊；3D 里的毛玻璃也贴这张图。
   单位：1 = 1 cm。桌面 y = 0；光轴 y = YA、x = 0；光心 z = 0；花在 z = −u；毛玻璃在 z = +v。
   测试用：ctx.host._api（setU / setV / focus / st / info）。 */
LabScene.register('camera', {
  done: true,
  no: '07', name: '照相机',
  build: function (ctx) {
    var T = ctx.T, scene = ctx.scene;
    var F = 15, D = 3, YA = 16, VMIN = 15, VMAX = 28, UMIN = 22, UMAX = 250, GW = 12.7, GH = 10.16, SHARP = 0.02;
    var st = { u: 75, v: 18.75, vGoal: null, rays: false, t: 0, filmDirty: true, winDirty: true, lastFilm: -1, sway: 0 };
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function V(x, y, z) { return new T.Vector3(x, y, z); }
    function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
    function vImg(u) { return u * F / (u - F); }
    function blurC(u, v) { var vi = vImg(u); return D * Math.abs(v - vi) / vi; }

    /* ── 小工具 ── */
    function tex(w, h, draw, rep) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c); if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
      if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }
    function add(m, parent, cast, recv) { m.castShadow = cast !== false; m.receiveShadow = recv !== false; (parent || scene).add(m); return m; }
    function std(o) { return new T.MeshStandardMaterial(o); }
    function rrect(w, h, r, cx, cy) {   // 圆角矩形 Shape（中心 cx, cy）
      var s = new T.Shape(), x = (cx || 0) - w / 2, y = (cy || 0) - h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    function rpath(w, h, r, cx, cy) { var p = new T.Path(), s = rrect(w, h, r, cx, cy); p.curves = s.curves; return p; }
    function slab(shape, depth, bev, mat, parent) {   // shape 在 x-y 平面，沿 +z 挤出 depth（含倒角），中心在 z = 0
      var g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 16 });
      g.translate(0, 0, -depth / 2 + bev);
      return add(new T.Mesh(g, mat), parent);
    }
    function bar(w, h, d, mat, parent, x, y, z) { var m = add(new T.Mesh(new T.BoxGeometry(w, h, d), mat), parent); m.position.set(x || 0, y || 0, z || 0); return m; }
    function cyl(r1, r2, h, mat, parent, seg) { return add(new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg || 32), mat), parent); }
    // 沿 z 轴的回转体（剖开）：prof = [[r, z], …]（闭合的截面轮廓），只做 x ≤ 0 的一半 + 剖面；ghost 给近侧一半的透明壳
    function halfLathe(prof, mat, cutMat, ghostMat, parent) {
      var g = new T.Group(); (parent || scene).add(g);
      var pts = prof.map(function (p) { return new T.Vector2(p[0], p[1]); });
      function lathe(a0, m) {
        var geo = new T.LatheGeometry(pts, 40, a0, Math.PI);   // 绕 y 轴：(r sinφ, y, r cosφ)
        geo.rotateX(Math.PI / 2);                               // y → z：轴线变成 z 轴；(r sinφ, ·, r cosφ) → x = r sinφ, y = −r cosφ
        return add(new T.Mesh(geo, m), g, m !== ghostMat, m !== ghostMat);
      }
      lathe(Math.PI, mat);                 // φ ∈ [π, 2π]：x = r sinφ ≤ 0，远侧一半
      if (ghostMat) lathe(0, ghostMat);    // 近侧一半：透明壳
      if (cutMat) {                        // 剖面：轮廓放在 x = 0 平面上，上下两片
        [1, -1].forEach(function (sg) {
          var s = new T.Shape(); prof.forEach(function (p, i) { if (i) s.lineTo(p[1], sg * p[0]); else s.moveTo(p[1], sg * p[0]); });
          var sg2 = new T.ShapeGeometry(s); sg2.rotateY(-Math.PI / 2);   // 形状的 (x, y) = (z, y)；绕 y 转 −90°：x → z
          var m = add(new T.Mesh(sg2, cutMat), g, false, true); m.position.x = 0.01;
        });
      }
      return g;
    }

    /* ── 3D 标签的样式：07 手写页没有加载 lab.css（.lk-tag 在那里），这里按 lab.css 补一份，只管本场景 ── */
    (function () {
      if (document.getElementById('cm-tag-css')) return;
      var P = '.ls-layer[data-s="camera"] ', css = document.createElement('style'); css.id = 'cm-tag-css';
      css.textContent = P + '.lk-tags{position:absolute;inset:0;pointer-events:none}' +
        P + '.lk-tag{position:absolute;transform:translate(-50%,-100%);padding:3px 11px;border:2px solid var(--text-1,var(--ink,#1E3A5F));border-radius:10px;background:rgba(255,255,255,.95);color:var(--text-1,var(--ink,#1E3A5F));font:600 19px var(--font-num,var(--num,sans-serif));white-space:nowrap}' +
        P + '.lk-tag i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:1px}' +
        P + '.lk-tag.cm-hint{border-style:dashed;font-weight:500;color:var(--text-2,#56677D)}' +
        '.dz-style-stage ' + P + '.lk-tag{border-width:0;border-radius:20px;box-shadow:0 4px 14px rgba(30,40,70,.16)}' +
        '.dz-style-hand ' + P + '.lk-tag{border:2px solid #2B2B2B;border-radius:10px 6px 11px 7px/7px 11px 6px 10px;font-family:"PingFang SC","Microsoft YaHei","Source Han Sans SC","Noto Sans SC",sans-serif}' +
        'body.dz-tags-hide ' + P + '.lk-tags{display:none}';
      document.head.appendChild(css);
    })();

    /* ── 贴图 ── */
    var woodTex = tex(512, 512, function (g, w, h) {   // 桌面木纹（沿 z 方向的纹理）
      var r = rng(7); g.fillStyle = '#B98A5A'; g.fillRect(0, 0, w, h);
      for (var b = 0; b < 6; b++) { g.fillStyle = 'rgba(' + (b % 2 ? '120,78,40,' : '214,170,118,') + (0.10 + r() * 0.08) + ')'; g.fillRect(0, b * h / 6, w, h / 6 - 2); g.fillStyle = 'rgba(70,44,22,.25)'; g.fillRect(0, (b + 1) * h / 6 - 2, w, 2); }
      for (var i = 0; i < 260; i++) {
        var y0 = r() * h, a = 1 + r() * 5, ph = r() * 6, fr = 0.004 + r() * 0.012;
        g.strokeStyle = 'rgba(' + (r() < 0.6 ? '96,58,26,' : '230,190,140,') + (0.05 + r() * 0.12) + ')'; g.lineWidth = 0.6 + r() * 1.6; g.beginPath();
        for (var x = 0; x <= w; x += 8) { var y = y0 + a * Math.sin(x * fr * 6.283 + ph) + 2 * Math.sin(x * 0.03 + ph * 2); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      for (var k = 0; k < 3; k++) { var cx = r() * w, cy = r() * h; for (var q = 0; q < 7; q++) { g.strokeStyle = 'rgba(90,52,22,' + (0.16 - q * 0.02) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(cx, cy, 6 + q * 6, 2 + q * 2.4, 0, 0, 7); g.stroke(); } }
    });
    woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping; woodTex.rotation = Math.PI / 2; woodTex.repeat.set(3.2, 0.9);
    var darkWoodTex = tex(256, 256, function (g, w, h) {   // 相机木框：深色胡桃木
      var r = rng(11); g.fillStyle = '#7A4A26'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 120; i++) { var y0 = r() * h; g.strokeStyle = 'rgba(' + (r() < 0.6 ? '50,26,10,' : '170,110,60,') + (0.08 + r() * 0.15) + ')'; g.lineWidth = 0.5 + r() * 1.4; g.beginPath(); for (var x = 0; x <= w; x += 6) { var y = y0 + 2 * Math.sin(x * 0.04 + i); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    }, [1, 1]);
    var leatherTex = tex(128, 128, function (g, w, h) {   // 风箱皮革的细纹
      var r = rng(3), im = g.createImageData(w, h), d = im.data;
      for (var i = 0; i < w * h; i++) { var v = 200 + r() * 55; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, [6, 6]);
    var plasterTex = tex(256, 256, function (g, w, h) {
      var r = rng(19), im = g.createImageData(w, h), d = im.data;
      for (var i = 0; i < w * h; i++) { var v = 236 + r() * 19; d[i * 4] = v; d[i * 4 + 1] = v - 3; d[i * 4 + 2] = v - 10; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, [6, 3]);
    var floorTex = tex(512, 512, function (g, w, h) {   // 地板：木条
      var r = rng(23); g.fillStyle = '#C9A57B'; g.fillRect(0, 0, w, h);
      for (var b = 0; b < 8; b++) {
        var c = 0.85 + r() * 0.25; g.fillStyle = 'rgb(' + Math.round(201 * c) + ',' + Math.round(165 * c) + ',' + Math.round(123 * c) + ')'; g.fillRect(b * w / 8, 0, w / 8 - 3, h);
        for (var i = 0; i < 18; i++) { var x0 = b * w / 8 + r() * w / 8; g.strokeStyle = 'rgba(110,70,35,' + (0.08 + r() * 0.12) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + 6, h * 0.3, x0 - 6, h * 0.7, x0 + 2, h); g.stroke(); }
        g.fillStyle = 'rgba(70,40,20,.5)'; g.fillRect(b * w / 8 + w / 8 - 3, 0, 3, h);
      }
    }, [6, 6]);
    // 导轨上的刻度（贴在导轨朝我们的一面，0 在光心正下方，单位 cm）
    var RAIL0 = -9, RAIL1 = 35;
    var railTex = tex(2048, 64, function (g, w, h) {
      g.fillStyle = '#D9DDE2'; g.fillRect(0, 0, w, h);
      var k = w / (RAIL1 - RAIL0); g.fillStyle = '#26303C'; g.font = '600 30px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      for (var mm = 0; mm <= (RAIL1 - 1) * 10; mm += 5) {
        var x = (mm / 10 - RAIL0) * k, L = mm % 100 === 0 ? 30 : mm % 50 === 0 ? 22 : mm % 10 === 0 ? 15 : 8;
        g.fillRect(x - (mm % 10 ? 0.8 : 1.4), 0, mm % 10 ? 1.6 : 2.8, L);
        if (mm % 50 === 0 && mm) g.fillText(String(mm / 10), x, h - 2);
      }
      g.fillText('0', (0 - RAIL0) * k, h - 2);
    });
    var tapeTex = tex(1024, 64, function (g, w, h) {   // 卷尺：一格 10 cm，黄底黑字
      g.fillStyle = '#F2C230'; g.fillRect(0, 0, w, h); var k = w / 10;
      g.fillStyle = '#1D1D1D'; g.font = '700 26px Bahnschrift, Arial'; g.textBaseline = 'middle';
      for (var mm = 0; mm < 100; mm += 1) { var x = mm * k / 10, L = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 20 : 11; g.fillRect(x, 0, mm % 10 ? 1.4 : 3, L); }
      g.fillStyle = '#C4261D'; g.fillText('●', 4 * k + 2, h - 18);
    });
    tapeTex.wrapS = T.RepeatWrapping;
    var knurlTex = tex(256, 32, function (g, w, h) { g.fillStyle = '#4A4F57'; g.fillRect(0, 0, w, h); for (var x = 0; x < w; x += 8) { g.fillStyle = '#9AA1AA'; g.fillRect(x, 0, 3, h); g.fillStyle = '#2A2E33'; g.fillRect(x + 5, 0, 2, h); } });
    var shutterTex = tex(1024, 64, function (g, w, h) {   // 快门圈上的光圈数字
      g.fillStyle = '#16181B'; g.fillRect(0, 0, w, h); g.fillStyle = '#E8E8E8'; g.font = '600 30px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      ['5.6', '8', '11', '16', '22', '32', 'B', '1', '2', '4', '8', '15', '30', '60', '125'].forEach(function (s, i) { g.fillStyle = i < 6 ? '#E8E8E8' : (i === 6 ? '#E0B84A' : '#9FD1FF'); g.fillText(s, (i + 0.5) * w / 15, h / 2); });
    });
    var ringTex = tex(1024, 64, function (g, w, h) {   // 镜头前圈的字
      g.fillStyle = '#121416'; g.fillRect(0, 0, w, h); g.fillStyle = '#F0F0F0'; g.font = '500 28px Bahnschrift, Arial'; g.textBaseline = 'middle';
      g.fillText('LENS  1:5.6   f = 150 mm   No. 0715', 20, h / 2);
      g.fillStyle = '#D84B3A'; g.fillText('●', w * 0.72, h / 2);
    });

    /* ── 材质 ── */
    var M = {
      table: std({ map: woodTex, roughness: 0.55, metalness: 0 }),
      tableEdge: std({ color: 0x8E6238, roughness: 0.6 }),
      wall: std({ map: plasterTex, color: 0xF3EEE4, roughness: 0.95 }),
      skirt: std({ color: 0xE9E3D7, roughness: 0.7 }),
      floor: std({ map: floorTex, roughness: 0.7 }),
      wood: std({ map: darkWoodTex, roughness: 0.45, metalness: 0 }),
      leather: std({ color: 0x23201E, map: leatherTex, roughness: 0.75, side: T.DoubleSide }),
      leatherIn: std({ color: 0x141312, roughness: 0.9, side: T.BackSide }),
      black: std({ color: 0x17191C, roughness: 0.38, metalness: 0.3 }),
      cut: std({ color: 0xD9743A, roughness: 0.6, side: T.DoubleSide }),             // 剖面：橙色（像课本的剖面图）
      chrome: std({ color: 0xD8DCE2, roughness: 0.22, metalness: 0.9 }),
      alu: std({ color: 0xB8BEC6, roughness: 0.35, metalness: 0.75 }),
      brass: std({ color: 0xC9A24A, roughness: 0.3, metalness: 0.85 }),
      knurl: std({ map: knurlTex, roughness: 0.4, metalness: 0.6 }),
      rail: std({ map: railTex, roughness: 0.35, metalness: 0.5 }),
      shutter: std({ map: shutterTex, roughness: 0.35, metalness: 0.3 }),
      ring: std({ map: ringTex, roughness: 0.35, metalness: 0.3 }),
      glass: new T.MeshPhysicalMaterial({ color: 0xCFE8F5, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: T.DoubleSide }),
      ghost: new T.MeshStandardMaterial({ color: 0xA9B8C8, roughness: 0.3, transparent: true, opacity: 0.13, depthWrite: false, side: T.DoubleSide }),
      tape: std({ map: tapeTex, roughness: 0.4, metalness: 0.2 }),
      tapeCase: std({ color: 0xD83A2C, roughness: 0.4 }),
      rubber: std({ color: 0x2B2D30, roughness: 0.85 })
    };
    M.chrome.envMapIntensity = 1.2; M.glass.envMapIntensity = 1.5;
    M.tapeMat = M.tape;

    /* ── 环境光反射（金属、玻璃有高光）── */
    (function () {
      try {
        var pm = new T.PMREMGenerator(ctx.renderer), es = new T.Scene();
        var sky = tex(16, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, '#EEF0F2'); gr.addColorStop(0.55, '#B8A58C'); gr.addColorStop(1, '#5E4F40'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), new T.MeshBasicMaterial({ map: sky, side: T.BackSide })));
        var pmat = new T.MeshBasicMaterial({ color: 0xffffff }); pmat.color.setScalar(2.4);
        var p1 = new T.Mesh(new T.PlaneGeometry(90, 40), pmat); p1.position.set(-30, 70, 30); p1.lookAt(0, 0, 0); es.add(p1);
        var p2 = new T.Mesh(new T.PlaneGeometry(40, 60), pmat); p2.position.set(80, 30, -30); p2.lookAt(0, 0, 0); es.add(p2);
        scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
      } catch (e) { /* 没有也能看 */ }
    })();
    [M.wall, M.floor, M.table, M.skirt, M.leather].forEach(function (m) { m.envMapIntensity = 0.45; });


    /* ════ 房间：长木桌、地板、后墙（墙上一扇窗、一幅画——小窗里的像也能看出左右颠倒）════ */
    var TZ0 = 45, TZ1 = -275, TW = 90;
    (function () {
      var top = slab(rrect(TW, TZ0 - TZ1, 2.5, 0, -(TZ0 + TZ1) / 2), 4, 0.6, [M.table, M.tableEdge]);
      top.geometry.rotateX(-Math.PI / 2); top.position.y = -2;
      woodTex.repeat.set(1 / 115, 1 / 92);
      var LEG = 72;
      [[-39, 38], [39, 38], [-39, -268], [39, -268]].forEach(function (p) {
        bar(5.5, LEG, 5.5, M.tableEdge, null, p[0], -4 - LEG / 2, p[1]);
        var ft = cyl(2.6, 2.9, 1.2, M.rubber); ft.position.set(p[0], -4 - LEG + 0.6, p[1]);
      });
      bar(TW - 12, 8, 2, M.tableEdge, null, 0, -8, 38.5); bar(2, 8, TZ0 - TZ1 - 18, M.tableEdge, null, 39.5, -8, (TZ0 + TZ1) / 2); bar(2, 8, TZ0 - TZ1 - 18, M.tableEdge, null, -39.5, -8, (TZ0 + TZ1) / 2);
      var fl = add(new T.Mesh(new T.PlaneGeometry(700, 700), M.floor), null, false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -76, -60);
      var WZ = -300, wall = add(new T.Mesh(new T.PlaneGeometry(700, 440), M.wall), null, false, true); wall.position.set(0, 144, WZ);
      var lw = add(new T.Mesh(new T.PlaneGeometry(520, 440), M.wall), null, false, true); lw.rotation.y = Math.PI / 2; lw.position.set(-175, 144, -40);
      bar(1.6, 10, 520, M.skirt, null, -174.2, -71, -40);
      bar(700, 10, 1.6, M.skirt, null, 0, -71, WZ + 0.8);
      // 窗（右边，按相机看过去）：白窗框 + 天空和远树（自己发光，不受阴影影响）
      var sky = tex(256, 256, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8EC5F0'); gr.addColorStop(0.7, '#D6ECFA'); gr.addColorStop(1, '#E8F3FB'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        var r = rng(41); g.fillStyle = '#6FA35A';
        for (var i = 0; i < 26; i++) { var x = r() * w, y = h * (0.72 + r() * 0.1), s = 14 + r() * 26; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
        g.fillStyle = '#5B8B49'; g.fillRect(0, h * 0.86, w, h * 0.14);
        g.fillStyle = 'rgba(255,255,255,.9)'; [[60, 50, 22], [84, 44, 16], [180, 70, 18], [198, 64, 13]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 7); g.fill(); });
      });
      var win = new T.Group(); win.position.set(80, 70, WZ + 0.2); scene.add(win);
      win.add(new T.Mesh(new T.PlaneGeometry(76, 84), new T.MeshBasicMaterial({ map: sky })));
      var wf = new T.Shape(); wf.moveTo(-41, -46); wf.lineTo(41, -46); wf.lineTo(41, 46); wf.lineTo(-41, 46); wf.lineTo(-41, -46);
      wf.holes.push(rpath(76, 84, 0.5));
      slab(wf, 5, 0.8, M.skirt, win).position.z = 2;
      bar(3, 84, 3, M.skirt, win, 0, 0, 1.5); bar(76, 3, 3, M.skirt, win, 0, 8, 1.5);
      bar(90, 3, 9, M.skirt, win, 0, -47.5, 4);   // 窗台
      // 画（左边）：田野、太阳、小房子（左右不对称，小窗里能看出左右颠倒）
      var art = tex(256, 192, function (g, w, h) {
        g.fillStyle = '#F4E9D2'; g.fillRect(0, 0, w, h); g.fillStyle = '#9CC3E4'; g.fillRect(0, 0, w, h * 0.62);
        g.fillStyle = '#E8B83A'; g.beginPath(); g.arc(w * 0.24, h * 0.26, 22, 0, 7); g.fill();
        g.fillStyle = '#6E9F4A'; g.beginPath(); g.moveTo(0, h * 0.62); g.quadraticCurveTo(w * 0.5, h * 0.42, w, h * 0.66); g.lineTo(w, h); g.lineTo(0, h); g.fill();
        g.fillStyle = '#B5482F'; g.fillRect(w * 0.62, h * 0.38, 54, 40); g.fillStyle = '#7A2E22'; g.beginPath(); g.moveTo(w * 0.62 - 8, h * 0.38); g.lineTo(w * 0.62 + 27, h * 0.38 - 26); g.lineTo(w * 0.62 + 62, h * 0.38); g.fill();
      });
      var pic = new T.Group(); pic.position.set(-70, 88, WZ + 0.2); scene.add(pic);
      add(new T.Mesh(new T.PlaneGeometry(56, 42), std({ map: art, roughness: 0.8 })), pic, false, true).position.z = 1.3;
      var pf = new T.Shape(); pf.moveTo(-31, -24); pf.lineTo(31, -24); pf.lineTo(31, 24); pf.lineTo(-31, 24); pf.lineTo(-31, -24); pf.holes.push(rpath(56, 42, 0.3));
      slab(pf, 2.4, 0.5, M.tableEdge, pic).position.z = 1.2;
    })();

    /* ════ 相机：小三脚架 + 导轨 ════ */
    var cam = new T.Group(); scene.add(cam);
    var RY = 5.8;                                  // 导轨中心高度（导轨 2.4 cm 见方，顶面 y = 7）
    (function () {
      var hub = new T.Vector3(0, 3.4, 8);
      for (var i = 0; i < 3; i++) {
        var a = Math.PI / 2 + i * Math.PI * 2 / 3 + 0.35, foot = V(hub.x + 10.5 * Math.cos(a), 0.7, hub.z + 10.5 * Math.sin(a));
        var mid = hub.clone().lerp(foot, 0.5).add(V(0, 0.9, 0));
        add(new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(hub.clone(), mid, foot), 16, 0.42, 12), M.alu), cam);
        var f = add(new T.Mesh(new T.SphereGeometry(0.85, 16, 12), M.rubber), cam); f.position.copy(foot); f.scale.y = 0.8;
      }
      var h = cyl(1.3, 1.6, 1.6, M.black, cam); h.position.set(hub.x, hub.y + 0.2, hub.z);
      var ball = add(new T.Mesh(new T.SphereGeometry(1.25, 24, 16), M.chrome), cam); ball.position.set(hub.x, hub.y + 1.5, hub.z);
      var plate = slab(rrect(3.4, 6, 0.5), 0.8, 0.15, M.black, cam); plate.geometry.rotateX(-Math.PI / 2); plate.position.set(hub.x, RY - 1.6, hub.z);
      var kn = cyl(0.7, 0.7, 1.2, M.brass, cam, 20); kn.rotation.z = Math.PI / 2; kn.position.set(hub.x + 1.9, hub.y + 1.5, hub.z);
      // 导轨：圆角方管 + 朝我们一面的刻度条 + 两头的堵头
      var rl = slab(rrect(2.4, 2.4, 0.35), RAIL1 - RAIL0, 0.12, M.alu, cam); rl.position.set(0, RY, (RAIL0 + RAIL1) / 2);
      var sc = add(new T.Mesh(new T.PlaneGeometry(RAIL1 - RAIL0, 1.7), M.rail), cam, false, true);
      sc.geometry.rotateY(Math.PI / 2); sc.position.set(1.215, RY, (RAIL0 + RAIL1) / 2);
      railTex.wrapS = T.RepeatWrapping; railTex.repeat.x = -1; railTex.offset.x = 1;
      [RAIL0 - 0.3, RAIL1 + 0.3].forEach(function (z) { var c = slab(rrect(2.7, 2.7, 0.4), 0.6, 0.1, M.black, cam); c.position.set(0, RY, z); });
    })();
    function clampBlock(parent) {                  // 标准架夹在导轨上的那一块 + 远侧的锁紧钮
      var b = slab(rrect(5.2, 1.7, 0.4), 3.8, 0.2, M.black, parent); b.position.set(0, RY + 2.05, 0);       // 骑在导轨上面
      slab(rrect(0.8, 3.2, 0.25), 3.8, 0.1, M.black, parent).position.set(-1.7, RY + 0.2, 0);              // 远侧的夹板
      var bk = cyl(0.9, 0.9, 1.2, M.knurl, parent, 24); bk.rotation.z = Math.PI / 2; bk.position.set(-2.6, RY, 0);   // 锁紧钮
      bar(0.06, 1.1, 0.14, new T.MeshBasicMaterial({ color: 0xE0362A }), parent, 1.25, RY + 0.65, 0);   // 读刻度的红线
      bar(0.3, 0.3, 0.6, M.black, parent, 1.36, RY + 1.3, 0);
      return b;
    }
    var CB = RY + 3.5;                             // 标准架横梁的高度
    function uFrame(parent, hw, top) {             // 标准架：一根横梁 + 两根立柱（铝）+ 铜锁钮
      bar(2 * hw + 1.6, 1.2, 1.4, M.alu, parent, 0, CB, 0);
      [-1, 1].forEach(function (s) {
        bar(1.1, top - CB, 1.4, M.alu, parent, s * hw, (top + CB) / 2, 0);
        var k = cyl(0.75, 0.75, 0.9, M.brass, parent, 20); k.rotation.z = Math.PI / 2; k.position.set(s * (hw + 0.95), YA, 0);
        var k2 = cyl(0.42, 0.42, 0.6, M.brass, parent, 16); k2.rotation.z = Math.PI / 2; k2.position.set(s * (hw + 0.95), CB, 0);
      });
    }

    /* ════ 前架：镜头板 + 镜头（剖开，里面是一片凸透镜）════ */
    var front = new T.Group(); cam.add(front);
    clampBlock(front); uFrame(front, 6.4, YA + 5.2);
    var lensParts = new T.Group(); lensParts.position.y = YA; front.add(lensParts);
    (function () {
      // 镜头板（木）：远侧一半实心 + 近侧一半透明壳，中间开 r = 3 的圆孔
      var s = new T.Shape(); s.moveTo(0, 5.5); s.lineTo(-5.5, 5.5); s.lineTo(-5.5, -5.5); s.lineTo(0, -5.5); s.lineTo(0, -3); s.absarc(0, 0, 3, -Math.PI / 2, Math.PI / 2, true); s.lineTo(0, 5.5);
      var bd = slab(s, 0.8, 0, M.wood, lensParts);
      var gh = new T.Mesh(bd.geometry, M.ghost); gh.scale.x = -1; lensParts.add(gh);
      // 镜头筒（黑）：板后的后筒、板前的快门、最前面的前筒；都只剖一半
      halfLathe([[2.75, 0.4], [3.3, 0.4], [3.3, 2.2], [2.75, 2.2]], M.black, M.cut, M.ghost, lensParts);
      halfLathe([[2.75, -0.4], [4.3, -0.4], [4.3, -2.8], [2.75, -2.8]], M.black, M.cut, M.ghost, lensParts);
      halfLathe([[2.8, -2.8], [3.45, -2.8], [3.45, -4.75], [3.6, -4.95], [3.6, -5.25], [2.65, -5.25], [2.65, -4.95], [2.8, -4.75]], M.black, M.cut, M.ghost, lensParts);
      // 光圈（直径 D = 3 cm 的孔）
      halfLathe([[D / 2, -1.5], [2.75, -1.5], [2.75, -1.35], [D / 2, -1.35]], M.black, M.cut, M.ghost, lensParts);
      // 快门圈、前圈上的字（半个圆柱面）
      function band(r, z0, z1, mat) {
        var g = new T.CylinderGeometry(r, r, Math.abs(z1 - z0), 48, 1, true, Math.PI, Math.PI); g.rotateX(Math.PI / 2);
        var m = add(new T.Mesh(g, mat), lensParts, false, false); m.position.z = (z0 + z1) / 2; return m;
      }
      band(4.32, -1.0, -2.3, M.shutter); band(3.47, -3.2, -4.4, M.ring);
      var lv = bar(0.5, 1.6, 0.5, M.chrome, lensParts, -1.2, 4.9, -1.6); lv.rotation.z = 0.5;   // 快门拨杆
      // 凸透镜：双凸玻璃，整片（透明的，不用剖）
      var R = 2.6, pts = [], n = 16, sag = 0.58, i;
      for (i = 0; i <= n; i++) { var r = R * i / n; pts.push(new T.Vector2(r, -(0.1 + sag * (1 - (r / R) * (r / R))))); }
      for (i = n; i >= 0; i--) { var r2 = R * i / n; pts.push(new T.Vector2(r2, 0.1 + sag * (1 - (r2 / R) * (r2 / R)))); }
      var lg = new T.LatheGeometry(pts, 48); lg.rotateX(Math.PI / 2);
      var lens = new T.Mesh(lg, M.glass); lens.renderOrder = 2; lensParts.add(lens);
      var rim = new T.Mesh(new T.TorusGeometry(R, 0.08, 8, 48), new T.MeshBasicMaterial({ color: 0x8FC3E0, transparent: true, opacity: 0.8 })); lensParts.add(rim);
      lensParts.userData.lens = lens;
    })();

    /* ════ 风箱：折叠的皮腔（远侧一半 + 近侧透明壳），长度跟着 v 伸缩 ════ */
    var bellows = new T.Group(); bellows.position.set(0, YA, 0.4); cam.add(bellows);
    (function () {
      var N = 12, K = 2 * N, rows = [], i, k;
      function perim(hw, hh, rc) {                 // 半圈轮廓：从顶上 (0, hh) 经过 x < 0 一侧到底下 (0, −hh)，带外法线
        var p = [], a;
        for (i = 0; i <= 3; i++) p.push([-(hw - rc) * i / 3, hh, 0, 1]);
        for (i = 1; i <= 5; i++) { a = Math.PI / 2 + i / 5 * Math.PI / 2; p.push([-(hw - rc) + rc * Math.cos(a), hh - rc + rc * Math.sin(a), Math.cos(a), Math.sin(a)]); }
        for (i = 1; i <= 6; i++) p.push([-hw, hh - rc - (2 * hh - 2 * rc) * i / 6, -1, 0]);
        for (i = 1; i <= 5; i++) { a = Math.PI + i / 5 * Math.PI / 2; p.push([-(hw - rc) + rc * Math.cos(a), -(hh - rc) + rc * Math.sin(a), Math.cos(a), Math.sin(a)]); }
        for (i = 1; i <= 3; i++) p.push([-(hw - rc) * (1 - i / 3), -hh, 0, -1]);
        return p;
      }
      var pos = [], uv = [], idx = [], P = 0;
      for (k = 0; k <= K; k++) {
        var t = k / K, o = (k % 2 && k < K) ? 0.6 : 0, row = perim(4.4 + 2.2 * t, 4.4 + 1.0 * t, 1.1);
        P = row.length;
        row.forEach(function (q, j) { pos.push(q[0] + q[2] * o, q[1] + q[3] * o, t); uv.push(j / (P - 1), t * N); });
      }
      for (k = 0; k < K; k++) for (i = 0; i < P - 1; i++) { var a0 = k * P + i, b0 = a0 + P; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      add(new T.Mesh(g, M.leather), bellows);
      var gh = new T.Mesh(g, M.ghost); gh.scale.x = -1; bellows.add(gh);
    })();

    /* ════ 后架：木框里的毛玻璃（底片的位置）+ 调焦旋钮，沿导轨前后移，z = v ════ */
    var rear = new T.Group(); cam.add(rear);
    clampBlock(rear); uFrame(rear, 8.7, YA + 6.4);
    var knob = new T.Group(); knob.position.set(3.6, RY + 2.05, 0); rear.add(knob);
    (function () {
      var kb = cyl(1.75, 1.75, 1.3, M.knurl, knob, 40); kb.rotation.z = Math.PI / 2; kb.position.x = 0.35;
      var cp = cyl(1.5, 1.2, 0.35, M.chrome, knob, 32); cp.rotation.z = Math.PI / 2; cp.position.x = 1.15;
      var ax = cyl(0.45, 0.45, 1.4, M.chrome, knob, 16); ax.rotation.z = Math.PI / 2; ax.position.x = -0.9;
      var mk = bar(0.1, 0.9, 0.3, new T.MeshBasicMaterial({ color: 0xF2F2F2 }), knob, 1.33, 0.7, 0); void mk;   // 旋钮上的白点，看得出转了多少
      // 木框（中间是毛玻璃）+ 四角的铜包角 + 风箱接口的黑框
      var fr = new T.Shape(); fr.curves = rrect(16.6, 13.6, 0.7).curves; fr.holes.push(rpath(GW + 0.4, GH + 0.4, 0.2));
      slab(fr, 1.8, 0.25, M.wood, rear).position.y = YA;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { bar(1.6, 1.6, 1.9, M.brass, rear, c[0] * 7.6, YA + c[1] * 6.1, 0); });
      var bf = new T.Shape(); bf.curves = rrect(14.6, 12.4, 0.6).curves; bf.holes.push(rpath(12.6, 10.4, 0.5));
      slab(bf, 0.8, 0.1, M.black, rear).position.set(0, YA, -1.3);
    })();
    var glassMat = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide });
    var ground = new T.Mesh(new T.PlaneGeometry(GW, GH), glassMat); ground.position.set(0, YA, 0.05); rear.add(ground);
    var sheen = new T.Mesh(new T.PlaneGeometry(GW, GH), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.15, clearcoat: 1, depthWrite: false }));
    sheen.position.set(0, YA, 0.4); rear.add(sheen);
    var rearHit = new T.Mesh(new T.BoxGeometry(18, 16, 4), new T.MeshBasicMaterial({ visible: false })); rearHit.position.set(0, YA, 0); rear.add(rearHit);
    var knobHit = new T.Mesh(new T.SphereGeometry(3, 12, 8), new T.MeshBasicMaterial({ visible: false })); knob.add(knobHit);

    /* ════ 被拍的东西：一盆花（花头偏左上、花苞和大叶子在右，倒过来一眼能认出）════ */
    var pot = new T.Group(); scene.add(pot);
    var plant = new T.Group(); plant.position.y = 10.6; pot.add(plant);
    (function () {
      var clay = std({ color: 0xC4673E, roughness: 0.85 }), clayDark = std({ color: 0xA9542F, roughness: 0.9 });
      var lv = function (pts) { return pts.map(function (p) { return new T.Vector2(p[0], p[1]); }); };
      add(new T.Mesh(new T.LatheGeometry(lv([[0, 0], [5.4, 0], [6.3, 0.95], [6.05, 1.05], [5.3, 0.35], [0, 0.35]]), 48), clayDark), pot);
      add(new T.Mesh(new T.LatheGeometry(lv([[0, 0.35], [4.2, 0.35], [4.45, 0.7], [5.45, 9.3], [6.15, 9.45], [6.3, 11.4], [6.05, 11.75], [5.55, 11.7], [5.35, 9.9], [4.8, 3.2], [0, 3.0]]), 64), clay), pot);
      // 腰上一圈奶白色的花边
      var band = tex(512, 64, function (g, w, h) {
        g.fillStyle = '#F1E6CF'; g.fillRect(0, 0, w, h); g.fillStyle = '#3C7FB8';
        for (var i = 0; i < 16; i++) { var x = (i + 0.5) * w / 16; g.beginPath(); g.arc(x, h / 2, 9, 0, 7); g.fill(); g.fillStyle = '#E2A93B'; g.beginPath(); g.arc(x, h / 2, 3.5, 0, 7); g.fill(); g.fillStyle = '#3C7FB8'; }
      });
      var bg = new T.CylinderGeometry(5.98, 5.62, 1.8, 64, 1, true); var bm = add(new T.Mesh(bg, std({ map: band, roughness: 0.7 })), pot); bm.position.y = 7.4;
      var soil = add(new T.Mesh(new T.CircleGeometry(5.4, 40), std({ color: 0x4A3324, roughness: 1 })), pot); soil.rotation.x = -Math.PI / 2; soil.position.y = 10.5;
      var r = rng(57);
      for (var i = 0; i < 9; i++) { var s = add(new T.Mesh(new T.SphereGeometry(0.35 + r() * 0.3, 8, 6), std({ color: 0x8A7A6A, roughness: 0.9 })), pot); var a = r() * 6.28, rr = 1.5 + r() * 3.4; s.position.set(rr * Math.cos(a), 10.55, rr * Math.sin(a)); s.scale.y = 0.5; }

      var stemM = std({ color: 0x4F8A36, roughness: 0.6 });
      function stem(pts, rad) { return add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, rad, 10), stemM), plant); }
      // 叶子：披针形，沿中脉对折一点、叶尖下垂；canvas 画叶脉
      var leafTex = tex(128, 256, function (g, w, h) {
        g.fillStyle = '#4C8E36'; g.fillRect(0, 0, w, h);
        var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(20,60,10,.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(20,60,10,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(205,235,160,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
        g.lineWidth = 1.4; g.strokeStyle = 'rgba(190,225,140,.55)';
        for (var y = h - 20; y > 10; y -= 22) { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w * 0.3, y - 8, 4, y - 24); g.moveTo(w / 2, y); g.quadraticCurveTo(w * 0.7, y - 8, w - 4, y - 24); g.stroke(); }
      });
      var leafM = std({ map: leafTex, roughness: 0.55, side: T.DoubleSide });
      function leaf(L, W, at, yaw, elev, droop) {
        var s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(W * 0.7, L * 0.15, W * 0.55, L * 0.7, 0, L); s.bezierCurveTo(-W * 0.55, L * 0.7, -W * 0.7, L * 0.15, 0, 0);
        var g = new T.ShapeGeometry(s, 24), p = g.attributes.position, uvA = g.attributes.uv;
        for (var j = 0; j < p.count; j++) {
          var x = p.getX(j), y = p.getY(j);
          p.setZ(j, droop * L * (y / L) * (y / L) - 0.35 * Math.abs(x));
          uvA.setXY(j, x / W + 0.5, y / L);
        }
        g.computeVertexNormals();
        var o = new T.Group(); o.position.copy(at); o.rotation.y = yaw; plant.add(o);
        var m = add(new T.Mesh(g, leafM), o); m.rotation.x = Math.PI / 2 - elev; return o;
      }
      // 主茎：从土里长出，向左上弯，顶着大花
      var head = V(-4.2, 16.4, 1.4);
      stem([V(0, -0.2, 0), V(-0.4, 4, 0.2), V(-1.8, 9.5, 0.6), V(-3.4, 14, 1.1), head.clone().add(V(0, -0.6, -0.4))], 0.34);
      // 花苞的茎：向右
      var bud = V(4.6, 9.8, 0.8);
      stem([V(0.2, -0.2, 0), V(0.8, 3.5, 0.1), V(2.8, 7.2, 0.4), bud.clone().add(V(-0.3, -0.8, 0))], 0.22);
      var bd = add(new T.Mesh(new T.SphereGeometry(1, 20, 14), std({ color: 0xD8483A, roughness: 0.55 })), plant); bd.position.copy(bud); bd.scale.set(0.85, 1.45, 0.85); bd.rotation.z = -0.35;
      var bs = add(new T.Mesh(new T.ConeGeometry(0.95, 1.4, 12), stemM), plant); bs.position.copy(bud).add(V(-0.25, -0.95, 0)); bs.rotation.z = Math.PI - 0.35;
      leaf(11, 3.6, V(0.4, 0.4, 0.2), Math.PI / 2 - 0.15, 0.55, 0.32);    // 右边的大叶子
      leaf(7.5, 2.6, V(-0.4, 0.5, 0), -Math.PI / 2 + 0.3, 0.75, 0.3);      // 左边的小叶子
      leaf(9, 3, V(0, 0.4, -0.3), Math.PI + 0.3, 0.7, 0.3);                 // 后面的叶子
      leaf(6.5, 2.4, V(0.2, 0.4, 0.4), 0.4, 0.45, 0.35);                    // 前面的小叶子
      // 花头：两圈花瓣（橙红）+ 深色花心 + 一圈黄花粉，朝着相机稍微仰起
      var hd = new T.Group(); hd.position.copy(head); plant.add(hd); hd.quaternion.setFromUnitVectors(V(0, 0, 1), V(-0.35, 0.45, 1).normalize());
      function petals(n, L, W, col, z, tilt, ph) {
        var s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(W * 0.8, L * 0.2, W * 0.6, L * 0.85, 0, L); s.bezierCurveTo(-W * 0.6, L * 0.85, -W * 0.8, L * 0.2, 0, 0);
        var g = new T.ShapeGeometry(s, 12), p = g.attributes.position;
        for (var j = 0; j < p.count; j++) { var x = p.getX(j), y = p.getY(j); p.setZ(j, 0.18 * (y / L) * (y / L) * L * tilt - 0.25 * x * x / W); }
        g.computeVertexNormals();
        var m = std({ color: col, roughness: 0.6, side: T.DoubleSide });
        for (var q = 0; q < n; q++) { var o = new T.Group(); o.rotation.z = (q + ph) / n * Math.PI * 2; o.position.z = z; hd.add(o); var pm = add(new T.Mesh(g, m), o, true, true); pm.position.y = 0.9; pm.rotation.x = -0.12 * tilt; }
      }
      petals(18, 3.9, 1.05, 0xE2412A, 0, 1, 0);
      petals(14, 2.9, 0.9, 0xF0633A, 0.25, 0.6, 0.5);
      var cd = add(new T.Mesh(new T.SphereGeometry(1.25, 24, 16), std({ color: 0x3A2414, roughness: 0.9 })), hd); cd.scale.z = 0.55; cd.position.z = 0.35;
      var ring = add(new T.Mesh(new T.TorusGeometry(1.35, 0.26, 10, 32), std({ color: 0xF1C232, roughness: 0.7 })), hd); ring.position.z = 0.4;
      var sep = add(new T.Mesh(new T.ConeGeometry(1.3, 1.4, 16), stemM), hd); sep.rotation.x = -Math.PI / 2; sep.position.z = -0.75;
    })();
    var potHit = new T.Mesh(new T.CylinderGeometry(8, 8, 30, 12), new T.MeshBasicMaterial({ visible: false })); potHit.position.y = 15; pot.add(potHit);
    var FLOWER_TOP = V(-4.2, 10.6 + 16.4, 1.4);   // 花心（相对花盆）：光线从这里画
    var POT_BASE = V(0, 0.4, 5.4);                 // 花盆底的前沿

    /* ════ 卷尺：从光心正下方（0 刻度）拉到花盆中心，量物距 u ════ */
    var TX = 14.5;
    var tapeCase = new T.Group(); tapeCase.position.set(TX, 0, 0); scene.add(tapeCase);
    (function () {
      var c = slab(rrect(6.6, 6.6, 2.2), 3.0, 0.5, M.tapeCase, tapeCase); c.geometry.rotateY(Math.PI / 2); c.position.set(0, 3.35, 3.6);
      var w = cyl(1.4, 1.4, 3.1, M.black, tapeCase, 24); w.rotation.z = Math.PI / 2; w.position.set(0, 3.35, 3.6);
      bar(2.4, 0.7, 1.0, M.black, tapeCase, 0, 0.6, 0.4);
      var clip = bar(0.25, 2.6, 4, M.chrome, tapeCase, 1.62, 3.6, 3.6); void clip;
    })();
    var tapeGeo = new T.PlaneGeometry(1, 1.9); tapeGeo.rotateX(-Math.PI / 2); tapeGeo.rotateY(Math.PI / 2); tapeGeo.translate(0, 0, -0.5);   // 长 1，沿 −z
    var tapeM = std({ map: tapeTex, roughness: 0.45, metalness: 0.15 });
    var tape = add(new T.Mesh(tapeGeo, tapeM), null, false, true); tape.position.set(TX, 0.06, 0);
    var hook = bar(2.1, 1.0, 0.18, M.chrome, null, TX, 0.5, 0);

    /* ════ 光线：花心、花盆底各发出 3 条（经过光圈上沿、光心、光圈下沿），在 vi 处会聚，画到毛玻璃为止 ════ */
    var rays = new T.Group(); rays.visible = false; scene.add(rays);
    var rayGeo = new T.CylinderGeometry(1, 1, 1, 8, 1, true); rayGeo.translate(0, 0.5, 0);
    var RAYC = [0xFF5A2E, 0x1E7BFF], rayMs = RAYC.map(function (c) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92 }); });
    var raySeg = [], dots = [];
    for (var ri = 0; ri < 12; ri++) { var rm = new T.Mesh(rayGeo, rayMs[ri < 6 ? 0 : 1]); rm.renderOrder = 3; rays.add(rm); raySeg.push(rm); }
    for (ri = 0; ri < 2; ri++) { var dm = new T.Mesh(new T.SphereGeometry(0.32, 16, 10), rayMs[ri]); rays.add(dm); dots.push(dm); }
    var UPV = V(0, 1, 0), tv = V(0, 0, 0);
    function seg(m, a, b, r) {
      tv.subVectors(b, a); var L = tv.length(); if (L < 1e-4) { m.visible = false; return; }
      m.visible = true; m.position.copy(a); m.quaternion.setFromUnitVectors(UPV, tv.divideScalar(L)); m.scale.set(r, L, r);
    }
    function placeRays() {
      var C = V(0, YA, 0), pts = [FLOWER_TOP.clone().add(pot.position), POT_BASE.clone().add(pot.position)];
      pts.forEach(function (P, n) {
        var uP = -P.z, vi = vImg(uP), Q = C.clone().add(P.clone().sub(C).multiplyScalar(-vi / uP)); Q.z = vi;
        [D / 2 * 0.92, 0, -D / 2 * 0.92].forEach(function (dy, j) {
          var A = V(0, YA + dy, 0), G = A.clone().add(Q.clone().sub(A).multiplyScalar(st.v / vi));   // 沿 A→Q 走到 z = v（毛玻璃）
          seg(raySeg[n * 6 + j * 2], P, A, 0.13); seg(raySeg[n * 6 + j * 2 + 1], A, G, 0.09);
        });
        dots[n].visible = vi <= st.v + 0.05; dots[n].position.copy(Q);
      });
    }

    /* ════ 底片上的像：光心处放一个“虚拟相机”拍下来，转 180°，按光斑大小弄模糊 ════ */
    var FW = 640, FH = 512;
    var fcam = new T.PerspectiveCamera(30, GW / GH, 5.5, 2000); fcam.position.set(0, YA, 0); fcam.lookAt(0, YA, -100);
    var raw = document.createElement('canvas'); raw.width = FW; raw.height = FH; var rg = raw.getContext('2d');
    var win = document.createElement('div'); win.className = 'ls-win cm-win';
    win.innerHTML = '<h3><span>毛玻璃上的像</span><small>从相机后面看</small></h3><canvas width="' + FW + '" height="' + FH + '"></canvas><p class="cap" data-w="cap"></p>';
    ctx.host.appendChild(win);
    var wcv = win.querySelector('canvas'), gs = wcv.getContext('2d'), wCap = win.querySelector('[data-w="cap"]');
    var glassTex = new T.CanvasTexture(wcv); if (T.SRGBColorSpace) glassTex.colorSpace = T.SRGBColorSpace; glassMat.map = glassTex; glassMat.needsUpdate = true;
    var hasFilter = typeof gs.filter === 'string';
    function captureFilm() {
      var r = ctx.renderer, el = r.domElement;
      var h = Math.min(FH, el.height, Math.floor(el.width * GH / GW)), w = Math.round(h * GW / GH);
      if (h < 32) return false;
      fcam.fov = 2 * Math.atan(GH / 2 / st.v) * 180 / Math.PI; fcam.updateProjectionMatrix();
      var pr = r.getPixelRatio(), rv = rays.visible; rays.visible = false;
      r.setScissorTest(true); r.setViewport(0, 0, w / pr, h / pr); r.setScissor(0, 0, w / pr, h / pr);
      r.render(scene, fcam);
      rg.clearRect(0, 0, FW, FH); rg.drawImage(el, 0, el.height - h, w, h, 0, 0, FW, FH);
      r.setScissorTest(false); r.setViewport(0, 0, el.width / pr, el.height / pr);
      rays.visible = rv; return true;
    }
    function drawWin() {
      var c = blurC(st.u, st.v), px = c * FW / GW, sig = c <= SHARP ? 0 : px * 0.33;   // 光斑直径换成像素，再换成高斯模糊的半径
      gs.fillStyle = '#16181B'; gs.fillRect(0, 0, FW, FH);
      gs.save(); gs.translate(FW, FH); gs.rotate(Math.PI);   // 转 180°：上下、左右都颠倒
      if (sig < 0.4) gs.drawImage(raw, 0, 0);
      else if (hasFilter) { gs.filter = 'blur(' + sig.toFixed(2) + 'px)'; gs.drawImage(raw, 0, 0); gs.filter = 'none'; }
      else { gs.globalAlpha = 1 / 8; for (var k = 0; k < 8; k++) gs.drawImage(raw, sig * 1.4 * Math.cos(k * 0.785), sig * 1.4 * Math.sin(k * 0.785)); gs.globalAlpha = 1; }
      gs.restore();
      // 毛玻璃的样子：四周暗一点，细细的对焦格线和中心十字
      var vg = gs.createRadialGradient(FW / 2, FH / 2, FH * 0.3, FW / 2, FH / 2, FW * 0.64); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
      gs.fillStyle = vg; gs.fillRect(0, 0, FW, FH);
      gs.fillStyle = 'rgba(255,255,255,.06)'; gs.fillRect(0, 0, FW, FH);
      gs.strokeStyle = 'rgba(255,255,255,.28)'; gs.lineWidth = 1.5; gs.beginPath();
      [1, 2].forEach(function (q) { gs.moveTo(FW * q / 3, 0); gs.lineTo(FW * q / 3, FH); gs.moveTo(0, FH * q / 3); gs.lineTo(FW, FH * q / 3); });
      gs.stroke(); gs.strokeStyle = 'rgba(255,255,255,.5)'; gs.beginPath(); gs.moveTo(FW / 2 - 14, FH / 2); gs.lineTo(FW / 2 + 14, FH / 2); gs.moveTo(FW / 2, FH / 2 - 14); gs.lineTo(FW / 2, FH / 2 + 14); gs.stroke();
      glassTex.needsUpdate = true;
    }

    /* ════ 摆放：花在 z = −u，后架在 z = v，风箱跟着伸缩，旋钮跟着转 ════ */
    function place() {
      pot.position.z = -st.u; rear.position.z = st.v;
      bellows.scale.z = Math.max(1, st.v - 1.75 - 0.4);
      knob.rotation.x = -(st.v - VMIN) / 0.6;
      tape.scale.z = st.u; hook.position.z = -st.u + 0.1; tapeTex.repeat.x = st.u / 10;
      placeRays();
    }
    function tags() {
      // 不能挡：花、毛玻璃上的像、镜头
      ctx.keepClear('flower', pot.localToWorld(V(0, 16, 0)), 80);
      ctx.keepClear('glass', rear.localToWorld(V(0, YA, 0)), 70);
      ctx.keepClear('lens', V(0, YA, -8), 40);
      ctx.tag('lens', '<i style="background:#7FC4EA"></i>凸透镜（镜头）', V(0, YA + 5.5, -8), { side: 'above', gap: 26, small: true });
      ctx.tag('glass', '<i style="background:#E7E3D8"></i>毛玻璃（底片的位置）', V(0, YA + 8.6, st.v), { side: 'above', gap: 26, small: true });
      ctx.tag('u', '物距 u = ' + fmtU(st.u) + ' cm', V(TX + 1, 1, -st.u / 2), { side: 'right', gap: 22, small: true });
      ctx.tag('v', '毛玻璃离镜头 ' + st.v.toFixed(1) + ' cm', V(1.5, RY - 3.2, st.v / 2 + 1), { side: 'below', gap: 18, small: true });
      // 能拖的地方：小圆点 + 左下角一行提示（拖过一次就收起）
      ctx.spot('knob', st.hint ? knob.localToWorld(V(0, 0, 0)) : null);
      ctx.spot('pot', st.hint ? pot.localToWorld(V(0, 4, 0)) : null);
      ctx.note(st.hint ? '拖花盆改远近，拖相机后面闪着的旋钮调焦' : '');
    }
    function fmtU(u) { return u < 100 ? u.toFixed(1) : String(Math.round(u)); }

    /* ════ 右栏 ════ */
    var LOGU = Math.log(UMAX / UMIN);
    function u2s(u) { return Math.round(Math.log(u / UMIN) / LOGU * 1000); }
    function s2u(s) { return UMIN * Math.exp(s / 1000 * LOGU); }
    // 注意：07 手写页把 .main 当版面类（沉浸舞台里是 position:absolute），所以主按钮不用 class="main"，用 "on"（样子一样）
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>照相机</b><p>照相机的镜头相当于一个凸透镜，来自物体的光经过镜头，在底片上成像。</p></div>' +
      '<div class="ls-blk"><div class="ls-h">现在的距离</div>' +
      '<div class="ls-row"><span class="nm">物距 u</span><span class="vl" id="cm-u">-</span><span>cm</span><span class="ls-tip" id="cm-u2" style="margin-left:auto"></span></div>' +
      '<div class="ls-row"><span class="nm">像距 v</span><span class="vl" id="cm-vi">-</span><span>cm</span><span class="ls-tip" style="margin-left:auto">清楚的像离镜头</span></div>' +
      '<div class="ls-row"><span class="nm">毛玻璃位置</span><span class="vl" id="cm-v">-</span><span>cm</span><span class="ls-tip" id="cm-v2" style="margin-left:auto"></span></div>' +
      '<div class="ls-row"><span class="nm">焦距 f</span><span class="vl">15</span><span>cm</span><span class="ls-tip" style="margin-left:auto">镜头上写着 150 mm</span></div>' +
      '<div class="ls-row"><span class="nm">像是物体的</span><span class="vl" id="cm-m">-</span><span class="ls-tip" id="cm-m2"></span></div>' +
      '<div class="ls-note" id="cm-st" style="margin-top:6px"></div></div>' +
      '<div class="ls-blk"><div class="ls-h">调焦：毛玻璃前后移</div>' +
      '<input class="rng" type="range" id="cm-rv" min="' + VMIN + '" max="' + VMAX + '" step="0.01">' +
      '<div class="ls-btns" style="margin-top:8px"><button class="on" data-a="focus">一键对焦</button><button data-a="rays">看光线</button></div>' +
      '<div class="ls-h" style="margin-top:12px">花放多远</div>' +
      '<input class="rng" type="range" id="cm-ru" min="0" max="1000" step="1">' +
      '<div class="ls-btns" style="margin-top:8px"><button data-u="200">2 米</button><button data-u="90">90 厘米</button><button data-u="40">40 厘米</button><button data-u="25">25 厘米</button></div></div>' +
      '<div class="ls-note">物距大于二倍焦距时，成<b>倒立、缩小的实像</b>，照相机就是利用这个规律制成的。</div>' +
      '<p class="ls-tip">拖花盆改物距，拖调焦旋钮（或毛玻璃木框）调焦。镜头当成一片凸透镜来画（真镜头由几片透镜组成）；桌上的距离按实际大小画。</p>'
    );
    var $vi = ctx.$('#cm-vi'), $u = ctx.$('#cm-u'), $u2 = ctx.$('#cm-u2'), $v = ctx.$('#cm-v'), $v2 = ctx.$('#cm-v2'), $m = ctx.$('#cm-m'), $m2 = ctx.$('#cm-m2'), $st = ctx.$('#cm-st');
    var rv = ctx.$('#cm-rv'), ru = ctx.$('#cm-ru'), bRays = ctx.$('[data-a="rays"]');
    function setH(el, h) { if (el && el._h !== h) { el.innerHTML = h; el._h = h; } }
    function info() {
      var vi = vImg(st.u), c = blurC(st.u, st.v), m = vi / st.u;
      var s = { vi: vi, c: c, m: m, sharp: c <= SHARP, near2f: st.u <= 2 * F, tooFar: vi > VMAX, over: 16 * vi / st.u > GH / 2 || 13.5 * vi / st.u > GH / 2 };
      s.state = s.near2f ? 'near2f' : s.tooFar ? 'cant' : s.sharp ? 'sharp' : (st.v < vi ? 'back' : 'fwd');
      return s;
    }
    function ui() {
      var I = info();
      setH($u, fmtU(st.u)); setH($v, st.v.toFixed(1));
      setH($u2, I.near2f ? '<b style="color:#C2410C">不大于 2f（30 cm）</b>' : '大于 2f（30 cm）');
      setH($vi, I.vi.toFixed(1));
      var dv = I.vi - st.v;
      setH($v2, I.sharp ? '正好在像上' : (I.tooFar ? (st.v >= VMAX - 0.01 ? '拉到头了，还差 ' + (I.vi - VMAX).toFixed(1) + ' cm' : '要拉到 ' + I.vi.toFixed(1) + ' cm，最多 ' + VMAX + ' cm') : (dv > 0 ? '还差 ' + dv.toFixed(1) + ' cm，往后' : '多了 ' + (-dv).toFixed(1) + ' cm，往前')));
      setH($m, I.m < 0.98 ? '1/' + (1 / I.m).toFixed(1) : I.m <= 1.02 ? '1 倍' : I.m.toFixed(1) + ' 倍');
      setH($m2, I.m < 0.98 ? '（像比物小）' : I.m <= 1.02 ? '（和物一样大）' : '（像比物大）');
      var h, cap;
      if (I.state === 'near2f') { h = '<b style="color:#C2410C">花太近了：</b>物距不大于二倍焦距，像不再比花小（和花一样大甚至更大），底片装不下；清楚的像在 ' + I.vi.toFixed(1) + ' cm 处，风箱最长只能拉到 ' + VMAX + ' cm，对不清。照相机拍不出缩小的像了——把花放远一点。'; cap = '花太近：像变大，超出底片，也对不清'; }
      else if (I.state === 'cant') { h = '<b style="color:#C2410C">对不清：</b>清楚的像在 ' + I.vi.toFixed(1) + ' cm 处，可风箱最长只能拉到 ' + VMAX + ' cm。把花放远一点。'; cap = '风箱拉到头了，还是模糊'; }
      else if (I.state === 'sharp') { h = '<b>像清楚了！</b>毛玻璃上是<b>倒立、缩小</b>的实像' + (I.over ? '。像比毛玻璃还大，只装下一部分，花再远一点就能全拍进来。' : '：花头朝下，原来在左边的花跑到了右边。'); cap = '<b style="color:#15803D">● 像清楚</b>　倒立、缩小（上下、左右都颠倒）'; }
      else { h = '<b style="color:#B45309">还模糊：</b>把毛玻璃往' + (I.state === 'back' ? '<b>后</b>拉（离镜头远一点）' : '<b>前</b>推（离镜头近一点）') + '，或点「一键对焦」。'; cap = '<b style="color:#B45309">● 还模糊</b>　往' + (I.state === 'back' ? '后拉' : '前推') + '一点'; }
      setH($st, h); setH(wCap, cap);
      if (document.activeElement !== rv) rv.value = st.v.toFixed(2);
      if (document.activeElement !== ru) ru.value = u2s(st.u);
      bRays.classList.toggle('on', st.rays);
      document.body.setAttribute('data-cam-state', I.state);
      return I;
    }
    function update() { place(); st.filmDirty = true; ui(); ctx.dirty(); }
    function setU(u) { st.u = clamp(u, UMIN, UMAX); update(); }
    function setV(v) { st.v = clamp(v, VMIN, VMAX); st.vGoal = null; update(); }
    function focus() { st.vGoal = clamp(vImg(st.u), VMIN, VMAX); }
    rv.addEventListener('input', function () { st.hint = false; setV(+rv.value); });
    ru.addEventListener('input', function () { st.hint = false; setU(s2u(+ru.value)); });
    ctx.rail.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
      var a = b.getAttribute('data-a'), u = b.getAttribute('data-u');
      if (a === 'focus') focus();
      else if (a === 'rays') { st.rays = !st.rays; rays.visible = st.rays; update(); }
      else if (u) { st.vGoal = null; setU(+u); }
    });

    /* ════ 拖动：花盆（改 u）、旋钮或毛玻璃木框（改 v）——都只沿光轴方向走 ════ */
    var drag = null, cp = V(0, 0, 0);
    function alongZ(ev, y0) {   // 过 (0, y0, z) 这条线、朝着视点的竖直/斜平面上取点，返回 z
      cp.set(ctx.camera.position.x, ctx.camera.position.y - y0, 0); if (cp.lengthSq() < 1e-6) cp.set(1, 0, 0);
      var p = ctx.onPlane(ev, new T.Plane().setFromNormalAndCoplanarPoint(cp.normalize(), V(0, y0, 0)));
      return p ? p.z : null;
    }
    function pickWhat(ev) {
      if (ctx.pick(ev, [knobHit, rearHit])) return 'v';
      if (ctx.pick(ev, [potHit])) return 'u';
      return null;
    }
    ctx.drag = {
      hit: function (ev) { return !!pickWhat(ev); },
      start: function (ev) {
        var w = pickWhat(ev); if (!w) return false;
        var y0 = w === 'u' ? 8 : YA, z = alongZ(ev, y0); if (z == null) return false;
        drag = { w: w, y0: y0, dz: (w === 'u' ? -st.u : st.v) - z }; st.vGoal = null; st.hint = false; return true;
      },
      move: function (ev) {
        if (!drag) return; var z = alongZ(ev, drag.y0); if (z == null) return;
        if (drag.w === 'u') setU(-(z + drag.dz)); else setV(z + drag.dz);
      },
      end: function () { drag = null; }
    };

    /* ════ 取景、灯光 ════ */
    ctx.target.set(8, 8, -32);
    var o = ctx.orb; o.az = 0.5; o.el = 0.45; o.dist = 150; o.minEl = 0.04; o.maxEl = 0.95; o.minAz = -0.35; o.maxAz = 1.55; o.minDist = 45; o.maxDist = 330;
    var sun = ctx.sun; sun.position.set(-110, 260, 90); sun.target.position.set(0, 0, -100); scene.add(sun.target);
    var sc = sun.shadow.camera; sc.left = -200; sc.right = 200; sc.top = 200; sc.bottom = -200; sc.near = 10; sc.far = 900; sc.updateProjectionMatrix(); sun.shadow.normalBias = 0.03;
    st.hint = true;
    update();
    ctx.host._api = { ctx: ctx, st: st, info: info, setU: setU, setV: setV, focus: focus, vImg: vImg, blurC: blurC, rays: rays, win: wcv, ui: ui, pot: pot, knob: knob, rear: rear };

    /* ════ 每一帧：一键对焦的动画、花轻轻摇、需要时重拍底片 ════ */
    var active = false;
    return {
      frame: function (dt) {
        st.t += dt; var t = st.t;
        if (st.vGoal != null) {
          var d = st.vGoal - st.v, stp = Math.max(Math.abs(d) * Math.min(1, dt * 5), dt * 0.6);
          if (Math.abs(d) <= stp) { st.v = st.vGoal; st.vGoal = null; } else st.v += Math.sign(d) * stp;
          update();
        }
        plant.rotation.z = 0.007 * Math.sin(t * 0.8); plant.rotation.x = 0.005 * Math.sin(t * 0.63 + 1);
        if (t - st.lastFilm > 0.15) st.filmDirty = true;
        if (st.filmDirty && active) { if (captureFilm()) { drawWin(); st.lastFilm = t; st.filmDirty = false; } }
        tags();
        return true;
      },
      pause: function () { active = false; },
      resume: function () { active = true; st.filmDirty = true; update(); }
    };
  }
});
