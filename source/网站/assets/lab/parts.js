/* ════ 零件库 LabParts（生活情境 3D 场景用，2026-11-23）════
   从网站自带的几个情境（叉鱼、筷子插水、潜水艇、照相机、手摇发电机）里拆出来的通用件，拼起来就能搭新情境。
   页面里在 scenes.js 后面加载。所有零件都返回 THREE 物体（多数是 Group），自己 add 到 ctx.scene，再设位置、转向。
   尺寸单位跟着场景定，推荐 1 个单位 = 1 厘米（人默认 170 高、桌子 75 高）。
   零件都起了中文名字（物体的 .name），「检查画面」报告里会用到；地面、桌面、水面、树这类背景件带 userData.bg = true，标签压在上面不算问题。

   ── 场景整体 ──
   LabParts.studio(ctx, { kind })        环境反光（金属、玻璃、水有高光）。kind: 'room'（默认）| 'outdoor' | 'sea'
   LabParts.frame(ctx, 物体或物体数组, { az, el, pad, turn })  自动取景：镜头对准、距离刚好装下、限制转动范围、调好阴影
   LabParts.fitShadow(ctx, 中心, 半径)   阴影范围（frame 已经调过，一般不用单独调）

   ── 材质 LabParts.mat ──
   wood({ color, dark })  metal({ color, rough })  plastic(颜色)  rubber(颜色)  paint(颜色)  ceramic({ color, pattern: 'blue' })
   glass({ tint, opacity })  water({ color, opacity })  fabric(颜色)  skin(颜色)  paper(颜色)  ground('grass' | 'sand' | 'soil')

   ── 造型工具（自己做特殊物体用）──
   lathe([[半径, 高度], …], 材质, { seg, smooth, axis: 'y' | 'x' | 'z', name })   回转体：瓶子、杯子、碗、鱼身、船帆的杆……
   roundBox(宽, 高, 深, 圆角, 材质, { name })     带圆角的方块：木块、手机、箱子
   extrude([[x, y], …], 厚度, 材质, { bevel, name })   平面图形挤出来：板、支架、侧面轮廓
   tube([Vector3, …], 半径, 材质, { closed, name })     沿曲线的管子：导线、绳子、水管
   rod(a, b, 半径, 材质, { name }) / setRod(物体, a, b)  两点之间的圆棒（杆、腿、光线），setRod 可以每帧改两端
   tex(宽, 高, function (g, w, h) { 用 canvas 画 }, [重复x, 重复y])   画贴图（花纹、刻度、文字）
   rng(种子)  可重复的随机数

   ── 背景 ──
   table({ w, d, h, color })        桌子（桌面高 h，物体放在 y = h 上）
   surface({ w, d, kind: 'desk' | 'wood' })   边缘淡出的台面（实验桌上的小场景，不出现生硬的桌边）
   floor({ w, d, kind: 'wood' | 'tile' })      地板
   ground({ w, d, kind: 'grass' | 'sand' | 'soil', grass: 棵数 })   一块地（草地带一根根草）
   tree({ h })  rock({ r, seed, color })  reed({ h, seed })  weed({ h, seed })（水草，.sway(t) 会飘）
   backdrop({ kind, r, h, angle })   远景背景：一块弧形的画（边缘淡出，不会出现生硬的边），放在场景后面，免得背景空荡荡。
       kind: 'outdoor'（天空、远山、草地）| 'sea'（天空、海平线）| 'room'（墙、窗户）| 'classroom'（黑板、窗户）| 'kitchen'（瓷砖、橱柜）| 'lab'（实验室墙、柜子）
       弧的圆心在物体原点，半径 r，朝 +z 一侧敞开（挡在 −z 后面），底边在 y = 0（底边和两边都淡出）。
       用法：bd.position.set(场景中心 x, 地面或水面的高度, 场景中心 z)；r 取场景宽度的 1.5～2 倍，h 取 r 的一半左右

   ── 水和容器 ──
   water({ w, d, depth, cut: true, soil, bottom: 'sand' | 'mud' | 'none', color })
       一块剖开的水：水面在 y = 0，水底在 y = −depth，x 方向宽 w、z 方向深 d，朝 +z 的一面剖开（镜头放在 +z 一侧看）。
       越深越蓝、水底有光斑；soil: 厚度 → 水底下再剖出一层土。.update(t) 让水面起伏。userData.part = 'water'
   tank({ w, d, h, level })          玻璃水槽（鱼缸），水面高 level
   cup({ r, h, level })  beaker({ r, h, level, marks })  bowl({ r, h, level })   玻璃杯、烧杯（带刻度）、碗；.setLevel(高度) 改水位
       容器的底在 y = 0。水的物体是 .water（换颜色：.water.material.color.set(…)）

   ── 人和动物 ──
   person({ height, shirt, pants, skin, hat: 'straw' | 'cap' | null, crouch, look, handL, handR })
       一个人：脚底在 y = 0，面朝 +x。p.set({ crouch: 0~1 蹲下, look: 看向的点, handL / handR: 手要放到的点（世界坐标）, lean: 前倾角度 })
       p.eye() 眼睛的位置（光路从这里画）；p.handPos('L' | 'R') 手的位置。p.root 才是要 add 的物体。
   hand({ skin, sleeve, size, hold })   一截手臂和手（只露出手的画面用：提着提纽、拿着杯子、按开关）。.set(手肘, 手腕) 摆位置；
       hold: true 是握拳（拿东西），false 是张开；.grip() 是手心的位置（把要拿的东西放这里）
   fish({ len, color: 'gold' | 'gray' | 'red', ghost })   鱼：头朝 −x；ghost: true 是半透明的“看到的像”。.swim(t) 摆尾

   ── 物体 ──
   boat({ len, beam, depth, color, cabin })   船（船头朝 +x）：船身在 y = 0（甲板）到 y = −depth（船底）之间。
       .floatAt(水面高度, 吃水深度) 摆到吃水这么深的位置；.cargo(箱数) 甲板上摆几箱货（最多 .slots 个）
   crate({ w, h, d, color, kind: 'container' | 'wood' })   货箱 / 木箱（底在 y = 0）
   block({ w, h, d, mat })  ball({ r, color })  egg({ r })

   ── 物理标记 ──
   arrow({ color, r, onTop, on })   力的箭头：.set(起点, 力的向量)；.tip() 箭头尖的位置（标签挂这里）。
       on: 受力的物体（写上它，「检查画面」能查“静止的物体受力是否平衡”；不写就按箭头起点在哪个物体里推断）
   ray({ color, r, arrow, dashed })   光线：.set(a, b)；dashed: true 是虚线（反向延长线、法线）
   arc({ color, r })            角的圆弧：.set(圆心, 半径, 起始方向向量, 终止方向向量)
   常用颜色：LabParts.C = { force: 浮力/拉力 '#F0A020'，gravity: 重力 '#D9363E'，ray: 光线 '#FF8A1F'，normal: 法线 '#3A4A5E' } */
var LabParts = (function () {
  var T = window.THREE; if (!T) return null;
  var P = {}, cache = {}, Y = new T.Vector3(0, 1, 0);
  function V(x, y, z) { return new T.Vector3(x || 0, y || 0, z || 0); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) { var s = (seed || 1) % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function tex(w, h, draw, rep, srgb) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.anisotropy = 8; if (srgb !== false && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  function once(key, make) { return cache[key] || (cache[key] = make()); }
  function std(o) { return new T.MeshStandardMaterial(o); }
  function mesh(geo, mat, o) {
    var m = new T.Mesh(geo, mat); o = o || {};
    m.castShadow = o.shadow !== false; m.receiveShadow = true;
    if (o.name) m.name = o.name; if (o.bg) m.userData.bg = true; if (o.parent) o.parent.add(m);
    return m;
  }
  function group(name, bg) { var g = new T.Group(); if (name) g.name = name; if (bg) g.userData.bg = true; return g; }
  P.V = V; P.rng = rng; P.tex = tex; P.clamp = clamp;
  P.C = { force: '#F0A020', gravity: '#D9363E', support: '#2F9E6B', ray: '#FF8A1F', back: '#FFA94D', normal: '#3A4A5E', water: '#5FB3D6' };

  /* ════ 材质 ════ */
  function grain(base, dark, seed, w, h) {
    return tex(w || 1024, h || 256, function (g, W, H) {
      var r = rng(seed || 7); g.fillStyle = base; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 120; i++) {
        var y0 = r() * H, amp = 1.5 + r() * 5, fr = 0.002 + r() * 0.006, ph = r() * 6.28;
        g.strokeStyle = dark; g.globalAlpha = 0.04 + r() * 0.12; g.lineWidth = 0.6 + r() * 2.4;
        g.beginPath(); for (var x = 0; x <= W; x += 8) { var y = y0 + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 3.3 + ph * 2) * amp * 0.35; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      }
      g.globalAlpha = 1;
    });
  }
  function noise(base, seed, amt, rep) {
    return tex(256, 256, function (g, w, h) {
      var r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var k = 0; k < 2600; k++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0,' : '255,255,255,') + (amt || 0.06) * (0.4 + r()) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    }, rep || [1, 1]);
  }
  function blotch(base, seed, rep) {   // 地面、沙、土：一块块柔和的深浅斑（不会出现细条纹）
    return tex(512, 512, function (g, w, h) {
      var r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var k = 0; k < 700; k++) {
        var x = r() * w, y = r() * h, rr = 4 + r() * 26, dark = r() < 0.5, gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, dark ? 'rgba(0,0,0,' + (0.04 + r() * 0.06) + ')' : 'rgba(255,255,255,' + (0.04 + r() * 0.07) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      for (var q = 0; q < 160; q++) { var gv = r() < 0.5 ? 'rgba(80,60,40,.25)' : 'rgba(255,250,235,.3)'; g.fillStyle = gv; g.beginPath(); g.ellipse(r() * w, r() * h, 1.5 + r() * 2.5, 1 + r() * 1.5, r() * 3, 0, 7); g.fill(); }
    }, rep || [1, 1]);
  }
  P.mat = {
    wood: function (o) { o = o || {}; return std({ map: grain(o.color || '#C99A63', o.dark || '#6B4423', o.seed || 3), roughness: 0.6 }); },
    metal: function (o) { o = o || {}; return std({ color: o.color || 0xC3C9D0, metalness: 0.85, roughness: o.rough == null ? 0.3 : o.rough, envMapIntensity: 1 }); },
    plastic: function (c) { return std({ color: c || 0x2F6FD6, roughness: 0.42, metalness: 0.02 }); },
    rubber: function (c) { return std({ color: c || 0x2A2A2A, roughness: 0.85 }); },
    paint: function (c) { return std({ color: c || 0x2F5FB8, roughness: 0.48, metalness: 0.12 }); },
    ceramic: function (o) {
      o = o || {};
      if (o.pattern !== 'blue') return std({ color: o.color || 0xF6F3EC, roughness: 0.22, metalness: 0 });
      return std({ roughness: 0.22, map: once('cer-blue', function () {
        return tex(1024, 256, function (g, w, h) {
          g.fillStyle = '#F6F3EC'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2E4F9E'; g.fillStyle = '#2E4F9E';
          g.lineWidth = 6; [0.12, 0.2, 0.86].forEach(function (y) { g.beginPath(); g.moveTo(0, y * h); g.lineTo(w, y * h); g.stroke(); });
          g.lineWidth = 3; for (var i = 0; i < 24; i++) { var x = i * w / 24 + 20; g.beginPath(); g.arc(x, h * 0.52, 18, Math.PI * 0.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(x + 21, h * 0.52, 7, 0, 7); g.fill(); }
        });
      }) });
    },
    glass: function (o) { o = o || {}; return new T.MeshPhysicalMaterial({ color: o.tint || 0xF2FAFF, transparent: true, opacity: o.opacity || 0.22, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side: T.DoubleSide, envMapIntensity: 1.2 }); },
    water: function (o) { o = o || {}; return new T.MeshPhysicalMaterial({ color: o.color || 0x5FB3D6, transparent: true, opacity: o.opacity || 0.45, roughness: 0.1, metalness: 0, clearcoat: 0.6, depthWrite: false, side: T.DoubleSide }); },
    fabric: function (c) { return std({ map: noise(c || '#6D95BD', 3, 0.05), roughness: 0.88 }); },
    skin: function (c) { return std({ color: c || 0xD59F74, roughness: 0.62 }); },
    paper: function (c) { return std({ color: c || 0xFBFAF6, roughness: 0.9 }); },
    ground: function (kind, rep) {
      var c = kind === 'sand' ? '#DCC89A' : kind === 'soil' ? '#7B5B3E' : '#7FA044';
      return std({ map: blotch(c, kind === 'sand' ? 21 : 11, rep || [2, 2]), roughness: 0.95 });
    }
  };

  /* ════ 造型工具 ════ */
  P.lathe = function (prof, mat, o) {
    o = o || {};
    var pts = prof.map(function (p) { return new T.Vector2(Math.max(1e-4, p[0]), p[1]); });
    if (o.smooth) pts = new T.SplineCurve(pts).getPoints(o.smooth === true ? pts.length * 4 : o.smooth);
    var g = new T.LatheGeometry(pts, o.seg || 48);
    if (o.axis === 'x') g.rotateZ(-Math.PI / 2); else if (o.axis === 'z') g.rotateX(Math.PI / 2);
    return mesh(g, mat, o);
  };
  P.rrect = function (w, h, r, cx, cy) {
    var s = new T.Shape(), x0 = (cx || 0) - w / 2, y0 = (cy || 0) - h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
    s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  };
  P.roundBox = function (w, h, d, r, mat, o) {
    r = Math.max(0.001, Math.min(r == null ? Math.min(w, h, d) * 0.08 : r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
    var g = new T.ExtrudeGeometry(P.rrect(w - 2 * r, h - 2 * r, r * 0.4), { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return mesh(g, mat, o);
  };
  P.extrude = function (pts, depth, mat, o) {
    o = o || {}; var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    var b = o.bevel || 0, g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, depth - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -(depth - 2 * b) / 2);
    return mesh(g, mat, o);
  };
  P.tube = function (pts, r, mat, o) {
    o = o || {}; var cv = new T.CatmullRomCurve3(pts, !!o.closed, 'centripetal');
    return mesh(new T.TubeGeometry(cv, o.seg || Math.max(16, pts.length * 12), r, o.radial || 10, !!o.closed), mat, o);
  };
  P.setRod = function (m, a, b) {
    var d = b.clone().sub(a), L = d.length(); m.visible = L > 1e-6; if (!m.visible) return m;
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Y, d.divideScalar(L)); m.scale.set(1, L, 1); return m;
  };
  P.rod = function (a, b, r, mat, o) { var m = mesh(new T.CylinderGeometry(r, r, 1, (o && o.seg) || 16), mat, o); return P.setRod(m, a, b); };

  /* ════ 场景整体：环境反光、取景、阴影 ════ */
  P.studio = function (ctx, o) {
    o = o || {};
    var C = { room: ['#FFFFFF', '#E4EAF1', '#B9AE9C', '#6E665C'], outdoor: ['#CFE6FF', '#EAF4FF', '#9DB27A', '#5E6B44'], sea: ['#D6ECFF', '#EEF6FF', '#6FA9C4', '#2D5D78'] }[o.kind || 'room'];
    try {
      var pm = new T.PMREMGenerator(ctx.renderer), es = new T.Scene();
      var sky = tex(16, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, C[0]); gr.addColorStop(0.45, C[1]); gr.addColorStop(0.55, C[2]); gr.addColorStop(1, C[3]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), new T.MeshBasicMaterial({ map: sky, side: T.BackSide })));
      var pmat = new T.MeshBasicMaterial({ color: 0xffffff }); pmat.color.setScalar(2.2);
      var p1 = new T.Mesh(new T.PlaneGeometry(90, 40), pmat); p1.position.set(-20, 70, 40); p1.lookAt(0, 0, 0); es.add(p1);
      var p2 = new T.Mesh(new T.PlaneGeometry(40, 60), pmat); p2.position.set(80, 30, 30); p2.lookAt(0, 0, 0); es.add(p2);
      ctx.scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
    } catch (e) { /* 没有也能看 */ }
  };
  P.fitShadow = function (ctx, c, r) {
    var s = ctx.sun, sc = s.shadow.camera;
    s.position.copy(c).add(V(-0.35, 1, 0.5).normalize().multiplyScalar(r * 3));
    s.target.position.copy(c); if (!s.target.parent) ctx.scene.add(s.target);
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = r * 0.3; sc.far = r * 7; sc.updateProjectionMatrix();
    s.shadow.bias = -0.0004; if (ctx.dirty) ctx.dirty();
  };
  P.frame = function (ctx, what, o) {
    o = o || {};
    var box = new T.Box3(), list = Array.isArray(what) ? what : [what];
    list.forEach(function (x) { if (x && x.isBox3) box.union(x); else if (x) { x.updateMatrixWorld(true); box.union(new T.Box3().setFromObject(x)); } });
    if (box.isEmpty()) return null;
    var sp = box.getBoundingSphere(new T.Sphere()), cam = ctx.camera, orb = ctx.orb;
    var vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * (cam.aspect || 1.6));
    var dist = sp.radius * (o.pad || 1.1) / Math.sin(Math.min(vf, hf));
    ctx.target.copy(sp.center); if (o.shift) ctx.target.add(o.shift);
    if (o.az != null) orb.az = o.az; if (o.el != null) orb.el = o.el; orb.dist = dist;
    if (o.limits !== false) {
      var tw = o.turn == null ? 0.7 : o.turn;
      orb.minDist = dist * 0.5; orb.maxDist = dist * 1.8; orb.minAz = orb.az - tw; orb.maxAz = orb.az + tw;
      orb.minEl = Math.max(0.02, orb.el - 0.4); orb.maxEl = Math.min(1.35, orb.el + 0.5);
    }
    if (o.shadow !== false) P.fitShadow(ctx, sp.center, sp.radius * 1.5);
    ctx.view(); return { center: sp.center, radius: sp.radius };
  };

  /* ════ 背景 ════ */
  P.table = function (o) {
    o = o || {}; var w = o.w || 120, d = o.d || 70, h = o.h || 75, th = o.top || 4;
    var g = group(o.name || '桌子', true), wood = P.mat.wood({ color: o.color || '#B98552', dark: '#5E3A1E' });
    var top = P.roundBox(w, th, d, Math.min(1.2, th / 3), wood, { name: '桌面', bg: true }); top.position.y = h - th / 2; g.add(top);
    var lm = P.mat.wood({ color: '#8A5A34', dark: '#3A2312', seed: 9 }), lw = Math.max(3, w * 0.04);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
      var l = P.roundBox(lw, h - th, lw, lw * 0.12, lm, { name: '桌腿', bg: true }); l.position.set(s[0] * (w / 2 - lw), (h - th) / 2, s[1] * (d / 2 - lw)); g.add(l);
    });
    var apron = P.roundBox(w - lw * 3, h * 0.08, d - lw * 3, 0.4, lm, { name: '桌子', bg: true }); apron.position.y = h - th - h * 0.04; g.add(apron);
    g.userData.top = h; return g;
  };
  P.surface = function (o) {
    o = o || {}; var w = o.w || 120, d = o.d || 100;
    var base = o.kind === 'wood' ? grain('#C99A63', '#6B4423', 5, 512, 512) : tex(512, 512, function (g, W, H) {
      var r = rng(4); g.fillStyle = '#ECE7DD'; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,105,85,0.06)' : 'rgba(255,255,255,0.10)'; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    });
    base.wrapS = base.wrapT = T.RepeatWrapping; base.repeat.set(w / (o.kind === 'wood' ? 60 : 30), d / (o.kind === 'wood' ? 60 : 30));
    var am = once('fade', function () {
      return tex(256, 256, function (g, W, H) {
        var im = g.createImageData(W, H);
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var u = Math.abs(x - W / 2) / (W / 2), v = Math.abs(y - H / 2) / (H / 2), a = 1 - Math.max(sstep(0.6, 1, u), sstep(0.55, 1, v)), q = (y * W + x) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.round(255 * a); im.data[q + 3] = 255; }
        g.putImageData(im, 0, 0);
      }, null, false);
    });
    var m = mesh(new T.PlaneGeometry(w, d), std({ map: base, alphaMap: am, transparent: true, depthWrite: false, roughness: 0.82 }), { name: o.name || '台面', bg: true, shadow: false });
    m.rotation.x = -Math.PI / 2; m.renderOrder = -1; return m;
  };
  P.floor = function (o) {
    o = o || {}; var w = o.w || 600, d = o.d || 600, t;
    if (o.kind === 'tile') t = tex(256, 256, function (g, W, H) { g.fillStyle = '#E9E6DF'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,110,95,.35)'; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2); }, [w / 60, d / 60]);
    else { t = grain('#B58B5E', '#6B4A2C', 12, 1024, 256); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / 240, d / 30); }
    var m = mesh(new T.PlaneGeometry(w, d), std({ map: t, roughness: 0.7 }), { name: o.name || '地面', bg: true, shadow: false });
    m.rotation.x = -Math.PI / 2; return m;
  };
  P.ground = function (o) {
    o = o || {}; var w = o.w || 400, d = o.d || 300, kind = o.kind || 'grass', g = group(o.name || '地面', true);
    var pg = new T.PlaneGeometry(w, d, 60, 45); pg.rotateX(-Math.PI / 2);
    var p = pg.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color(), r = rng(5);
    var A = kind === 'sand' ? [0xDCC89A, 0xB9A77A] : kind === 'soil' ? [0x8B6B45, 0x5E4630] : [0x5F8F32, 0x93B552];
    var cA = new T.Color(A[0]), cB = new T.Color(A[1]);
    for (var i = 0; i < p.count; i++) { var x = p.getX(i), z = p.getZ(i), n = 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.03) * Math.sin(x * 0.017 - z * 0.045); c.copy(cA).lerp(cB, clamp(n * 0.8 + r() * 0.25, 0, 1)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    pg.setAttribute('color', new T.BufferAttribute(col, 3));
    var m = mesh(pg, std({ vertexColors: true, map: blotch('#ffffff', 11, [Math.max(1, w / 120), Math.max(1, d / 120)]), roughness: 0.95 }), { name: '地面', bg: true, shadow: false });
    g.add(m);
    if (kind === 'grass' && o.grass !== 0) g.add(P.grass({ w: w, d: d, count: o.grass || Math.min(6000, Math.round(w * d / 30)), h: o.grassH }));
    return g;
  };
  P.grass = function (o) {
    o = o || {}; var w = o.w || 200, d = o.d || 200, n = o.count || 2000, hh = o.h || 6;
    var gg = new T.PlaneGeometry(hh * 0.025, hh, 1, 4); gg.translate(0, hh / 2, 0);
    var p = gg.attributes.position; for (var i = 0; i < p.count; i++) { var yy = p.getY(i) / hh; p.setX(i, p.getX(i) * (1 - yy * 0.9)); p.setZ(i, yy * yy * hh * 0.05); }
    gg.computeVertexNormals();
    var im = new T.InstancedMesh(gg, std({ side: T.DoubleSide, roughness: 0.8 }), n), M = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), r = rng(o.seed || 13);
    var cA = new T.Color(0x5B8C2C), cB = new T.Color(0x9FBF55), cC = new T.Color(0xB7B060);
    for (var k = 0; k < n; k++) {
      var x = (r() - 0.5) * w, z = (r() - 0.5) * d, s = 0.6 + r() * 0.9; q.setFromAxisAngle(Y, r() * 6.3);
      M.compose(V(x, 0, z), q, V(1, s, 1)); im.setMatrixAt(k, M); im.setColorAt(k, c.copy(cA).lerp(cB, r()).lerp(cC, r() * 0.3));
    }
    im.receiveShadow = true; im.name = '草'; im.userData.bg = true; return im;
  };
  var blobGeo = null;
  P.tree = function (o) {
    o = o || {}; var s = (o.h || 500) / 19, r = rng(o.seed || 300), g = group(o.name || '树', true);
    if (!blobGeo) { blobGeo = new T.SphereGeometry(1, 40, 28); var bp = blobGeo.attributes.position, v = V(); for (var i = 0; i < bp.count; i++) { v.fromBufferAttribute(bp, i); var k = 1 + 0.08 * Math.sin(v.x * 2.1 + 1) * Math.sin(v.z * 1.7) + 0.05 * Math.sin(v.y * 3.3); bp.setXYZ(i, v.x * k, v.y * k, v.z * k); } blobGeo.computeVertexNormals(); }
    var leafM = [std({ color: 0x5D8A3A, roughness: 0.9 }), std({ color: 0x6F9C45, roughness: 0.9 })], bark = std({ color: 0x6B4F37, roughness: 0.95 });
    var trunk = mesh(new T.CylinderGeometry(0.45 * s, 0.75 * s, 12 * s, 10), bark, { name: '树', bg: true }); trunk.position.y = 6 * s; g.add(trunk);
    for (var k2 = 0; k2 < 13; k2++) { var b = mesh(blobGeo, leafM[k2 % 2], { name: '树', bg: true }), rr = (2.4 + r() * 1.8) * s; b.scale.set(rr, rr * 0.85, rr); b.position.set((r() - 0.5) * 6 * s, (12 + r() * 5) * s, (r() - 0.5) * 5 * s); g.add(b); }
    return g;
  };
  var stoneGeos = {};
  P.rock = function (o) {
    o = o || {}; var seed = o.seed || 3, r = o.r || 10;
    var geo = stoneGeos[seed] || (stoneGeos[seed] = (function () {
      var g = new T.SphereGeometry(1, 36, 24), p = g.attributes.position, rr = rng(seed), a = [rr() * 6, rr() * 6, rr() * 6, rr() * 6], v = V();
      for (var i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); var n = v.clone().normalize(), k = 1 + 0.16 * Math.sin(n.x * 3 + a[0]) * Math.cos(n.z * 2.6 + a[1]) + 0.07 * Math.sin(n.y * 6 + a[2]) + 0.04 * Math.sin(n.x * 9 + n.z * 7 + a[3]); p.setXYZ(i, n.x * k, n.y * k, n.z * k); }
      g.computeVertexNormals(); return g;
    })());
    var m = mesh(geo, std({ color: o.color || 0x8D8A80, map: noise('#ffffff', 21, 0.12, [2, 2]), roughness: 0.9 }), { name: o.name || '石头' });
    m.scale.set(r * 1.2, r * 0.6, r); m.rotation.y = seed; return m;
  };
  function leafGeo(L, w0, ang, rise, seed) {
    var r = rng(seed), n = 12, pos = [], idx = [], d = V(Math.cos(ang), 0, Math.sin(ang)), side = V(-d.z, 0, d.x), tw = (r() - 0.5) * 0.8;
    for (var k = 0; k <= n; k++) {
      var t = k / n, c = d.clone().multiplyScalar(L * t * 0.75).add(V(0, L * (rise * t - (rise + 0.25) * t * t * 0.9), 0));
      var w = w0 * Math.pow(1 - t, 0.6) + 0.01, s = side.clone().applyAxisAngle(d, tw * t).multiplyScalar(w / 2);
      pos.push(c.x - s.x, c.y - s.y, c.z - s.z, c.x + s.x, c.y + s.y, c.z + s.z);
      if (k) { var a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  P.reed = function (o) {
    o = o || {}; var hgt = o.h || 120, s = hgt / 12, r = rng(o.seed || 5), g = group(o.name || '芦苇', true), bend = (r() - 0.5) * 2.2, pts = [];
    var stalk = std({ color: 0x7F9348, roughness: 0.7 }), leaf = std({ color: 0x8EA24F, roughness: 0.75, side: T.DoubleSide });
    for (var k = 0; k <= 6; k++) { var t = k / 6; pts.push(V(bend * t * t * s, t * hgt, 0)); }
    g.add(P.tube(pts, 0.06 * s, stalk, { seg: 18, radial: 6, name: '芦苇', bg: true }));
    for (var j = 0; j < 3; j++) { var hb = hgt * (0.12 + j * 0.16), lf = mesh(leafGeo((3 + r() * 3) * s, 0.26 * s, r() * 6.3, 0.9 + r() * 0.6, (o.seed || 5) * 7 + j), leaf, { name: '芦苇', bg: true }); lf.position.set(bend * s * (hb / hgt) * (hb / hgt), hb, 0); g.add(lf); }
    var hd = mesh(new T.CapsuleGeometry(0.17 * s, 1.1 * s, 4, 10), std({ color: 0x6B4022, roughness: 0.9 }), { name: '芦苇', bg: true }); hd.position.set(pts[6].x, pts[6].y - 0.9 * s, 0); g.add(hd);
    return g;
  };
  P.weed = function (o) {
    o = o || {}; var L = o.h || 40, n = 14, r = rng(o.seed || 55), ph = r() * 6, wd = (o.w || L * 0.06);
    var geo = new T.BufferGeometry(), pos = new Float32Array((n + 1) * 6), idx = [];
    for (var k = 0; k < n; k++) { var a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
    var m = mesh(geo, std({ color: o.color || 0x4F7F3A, roughness: 0.8, side: T.DoubleSide }), { name: o.name || '水草', bg: true, shadow: false });
    m.sway = function (t) {
      for (var k2 = 0; k2 <= n; k2++) {
        var s = k2 / n, off = L * 0.22 * Math.sin(t * 1.1 + ph + s * 2.2) * Math.pow(s, 1.4), w2 = wd * (1 - s * 0.7), z = L * 0.1 * Math.sin(t * 0.8 + ph + s * 1.5) * s, q = k2 * 6;
        pos[q] = off - w2; pos[q + 1] = s * L; pos[q + 2] = z; pos[q + 3] = off + w2; pos[q + 4] = s * L; pos[q + 5] = z;
      }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    };
    m.sway(0); return m;
  };

  /* ════ 远景背景：弧形的画，边缘淡出 ════ */
  function backTex(kind) {
    return tex(2048, 768, function (g, W, H) {
      var r = rng(kind.length * 7 + 3), gr, i;
      function band(y0, y1, c0, c1) { var q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q; g.fillRect(0, y0, W, y1 - y0); }
      function win(x, y, w, h) {
        g.fillStyle = '#EEF4FA'; g.fillRect(x - 10, y - 10, w + 20, h + 20);
        gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#BFDDF5'); gr.addColorStop(1, '#E8F3FB'); g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(140,175,120,.55)'; for (var k = 0; k < 6; k++) { g.beginPath(); g.arc(x + w * (0.1 + k * 0.17), y + h * 0.95, h * (0.18 + r() * 0.12), Math.PI, 0); g.fill(); }
        g.strokeStyle = '#D9E2EC'; g.lineWidth = 8; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
      }
      if (kind === 'outdoor' || kind === 'sea') {
        band(0, H * 0.62, '#9CC8EE', '#E4F1FB');
        for (i = 0; i < 9; i++) { var cx = r() * W, cy = H * (0.1 + r() * 0.3), cw = 80 + r() * 160; g.fillStyle = 'rgba(255,255,255,.75)'; for (var k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + (k - 2) * cw * 0.28, cy + Math.sin(k * 2) * 6, cw * 0.32, cw * 0.14, 0, 0, 7); g.fill(); } }
        if (kind === 'outdoor') {
          [[0.5, '#A9C0A8', 0.08], [0.56, '#8EAF86', 0.1], [0.6, '#7FA06A', 0.07]].forEach(function (m, j) {
            g.fillStyle = m[1]; g.beginPath(); g.moveTo(0, H);
            for (var x = 0; x <= W; x += 16) g.lineTo(x, H * m[0] - H * m[2] * (0.6 + 0.4 * Math.sin(x * 0.004 + j * 2) * Math.sin(x * 0.0017 + j)));
            g.lineTo(W, H); g.fill();
          });
          band(H * 0.62, H, '#86A85A', '#9DBA62');
          g.fillStyle = 'rgba(70,100,50,.55)'; for (i = 0; i < 26; i++) { var tx = r() * W, ty = H * (0.55 + r() * 0.05), ts = 10 + r() * 14; g.beginPath(); g.ellipse(tx, ty, ts, ts * 1.3, 0, 0, 7); g.fill(); }
        } else {
          band(H * 0.62, H, '#5A9DBD', '#3E7FA3'); g.fillStyle = 'rgba(255,255,255,.35)'; for (i = 0; i < 140; i++) g.fillRect(r() * W, H * (0.63 + r() * 0.35), 20 + r() * 60, 2);
          g.fillStyle = '#7E95A6'; g.fillRect(W * 0.72, H * 0.585, 120, 22); g.fillRect(W * 0.74, H * 0.56, 40, 24);
        }
      } else {
        var wall = { room: ['#F3EFE7', '#E8E1D4'], classroom: ['#EEF2EC', '#E1E8DE'], kitchen: ['#F4F1EA', '#EAE4D8'], lab: ['#EEF2F6', '#E0E7EE'] }[kind] || ['#F3EFE7', '#E8E1D4'];
        band(0, H * 0.82, wall[0], wall[1]);
        band(H * 0.82, H, '#C9A57A', '#B68F62'); g.fillStyle = '#9C7650'; g.fillRect(0, H * 0.82, W, 10);
        if (kind === 'classroom') {
          g.fillStyle = '#5B4632'; g.fillRect(W * 0.3 - 14, H * 0.18 - 14, W * 0.4 + 28, H * 0.38 + 28);
          g.fillStyle = '#2F4A3C'; g.fillRect(W * 0.3, H * 0.18, W * 0.4, H * 0.38);
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.34, H * 0.3); g.quadraticCurveTo(W * 0.42, H * 0.24, W * 0.5, H * 0.32); g.stroke();
          win(W * 0.06, H * 0.16, W * 0.14, H * 0.42); win(W * 0.8, H * 0.16, W * 0.14, H * 0.42);
        } else if (kind === 'kitchen') {
          g.strokeStyle = 'rgba(160,150,135,.35)'; g.lineWidth = 2; for (var y = H * 0.35; y < H * 0.82; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (var x = 0; x < W; x += 46) { g.beginPath(); g.moveTo(x, H * 0.35); g.lineTo(x, H * 0.82); g.stroke(); }
          g.fillStyle = '#C9B79A'; for (i = 0; i < 6; i++) { g.fillRect(W * (0.05 + i * 0.15), H * 0.04, W * 0.13, H * 0.26); g.fillStyle = '#B9A687'; g.fillRect(W * (0.05 + i * 0.15) + W * 0.11, H * 0.15, 6, 26); g.fillStyle = '#C9B79A'; }
          win(W * 0.42, H * 0.38, W * 0.16, H * 0.3);
        } else if (kind === 'lab') {
          g.fillStyle = '#D6DEE6'; g.fillRect(W * 0.05, H * 0.12, W * 0.3, H * 0.5); g.fillStyle = '#C3CEDA'; for (i = 0; i < 3; i++) g.fillRect(W * 0.05, H * (0.12 + i * 0.17), W * 0.3, 8);
          g.fillStyle = 'rgba(120,170,210,.6)'; for (i = 0; i < 12; i++) { var bx = W * (0.07 + (i % 6) * 0.045), by = H * (0.2 + Math.floor(i / 6) * 0.17); g.fillRect(bx, by, 30, 50); }
          win(W * 0.62, H * 0.14, W * 0.18, H * 0.4);
        } else { win(W * 0.38, H * 0.14, W * 0.24, H * 0.46); g.fillStyle = '#E2D9C8'; g.fillRect(0, H * 0.78, W, 14); }
      }
    });
  }
  var backAlpha = null;
  P.backdrop = function (o) {
    o = o || {}; var kind = o.kind || 'outdoor', R0 = o.r || 600, Hh = o.h || R0 * 0.5, ang = (o.angle || 110) * Math.PI / 180;
    var geo = new T.CylinderGeometry(R0, R0, Hh, 64, 1, true, Math.PI - ang / 2, ang); geo.translate(0, Hh / 2, 0);
    if (!backAlpha) backAlpha = tex(256, 128, function (g, W, H) {
      var im = g.createImageData(W, H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var u = Math.abs(x - W / 2) / (W / 2), v = 1 - y / H, a = (1 - sstep(0.72, 1, u)) * (1 - sstep(0.78, 1, v)) * sstep(0.0, 0.22, v), q = (y * W + x) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.round(255 * a); im.data[q + 3] = 255; }
      g.putImageData(im, 0, 0);
    }, null, false);
    var m = mesh(geo, new T.MeshBasicMaterial({ map: backTex(kind), alphaMap: backAlpha, transparent: true, depthWrite: false, side: T.BackSide }), { name: o.name || '背景', bg: true, shadow: false });
    m.renderOrder = -2; return m;
  };

  /* ════ 水：剖开的一块水 ════ */
  var causticTex = null;
  function caustics() {
    if (causticTex) return causticTex;
    var S = 256, r = rng(31), pts = [], c = document.createElement('canvas'); c.width = c.height = S;
    for (var i = 0; i < 22; i++) pts.push([r() * S, r() * S]);
    var g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data;
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var f1 = 1e9, f2 = 1e9;
      for (var k = 0; k < pts.length; k++) { var dx = Math.abs(x - pts[k][0]), dy = Math.abs(y - pts[k][1]); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; var dd = Math.sqrt(dx * dx + dy * dy); if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd; }
      var v = Math.exp(-(f2 - f1) * 0.32) * 255, o = (y * S + x) * 4; d[o] = v; d[o + 1] = v * 0.98; d[o + 2] = v * 0.86; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    causticTex = new T.CanvasTexture(c); if (T.SRGBColorSpace) causticTex.colorSpace = T.SRGBColorSpace; causticTex.wrapS = causticTex.wrapT = T.RepeatWrapping; return causticTex;
  }
  function faceTex(deep, shafts) {
    return tex(512, 512, function (gc, w, h) {
      var gr = gc.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(150,212,232,0.30)'); gr.addColorStop(0.35, 'rgba(92,170,200,0.42)'); gr.addColorStop(1, deep ? 'rgba(20,70,110,0.78)' : 'rgba(30,96,128,0.62)');
      gc.fillStyle = gr; gc.fillRect(0, 0, w, h);
      if (shafts) for (var k = 0; k < 9; k++) {
        var x0 = 40 + k * 58 + Math.sin(k * 7) * 20, wd = 14 + (k % 3) * 10, lg = gc.createLinearGradient(0, 0, 0, h * 0.8);
        lg.addColorStop(0, 'rgba(255,255,240,0.16)'); lg.addColorStop(1, 'rgba(255,255,240,0)');
        gc.fillStyle = lg; gc.beginPath(); gc.moveTo(x0, 0); gc.lineTo(x0 + wd, 0); gc.lineTo(x0 + wd + 90, h * 0.8); gc.lineTo(x0 + 80, h * 0.8); gc.fill();
      }
    });
  }
  P.water = function (o) {
    o = o || {}; var w = o.w || 200, d = o.d || 100, D = o.depth || 80, cut = o.cut !== false, g = group(o.name || '水');
    g.userData.part = 'water'; g.userData.surfaceY = 0; g.userData.depth = D;
    var A = o.wave == null ? Math.min(D, w) * 0.004 : o.wave;
    // 水面：轻轻起伏
    var sg = new T.PlaneGeometry(w, d, Math.min(96, Math.max(8, Math.round(w / 6))), Math.min(64, Math.max(4, Math.round(d / 6)))); sg.rotateX(-Math.PI / 2);
    var sp = sg.attributes.position, base = new Float32Array(sp.array);
    var surf = mesh(sg, P.mat.water({ color: o.color, opacity: o.opacity }), { name: '水面', bg: true, shadow: false }); surf.renderOrder = 5; g.add(surf);
    // 剖面（朝 +z）：越深越蓝 + 斜射下来的光；剖面顶上一条亮线就是水面
    if (cut) {
      var fm = new T.MeshBasicMaterial({ map: faceTex(D > w * 0.5, true), transparent: true, depthWrite: false, side: T.DoubleSide });
      var face = mesh(new T.PlaneGeometry(w, D), fm, { name: '水', bg: true, shadow: false }); face.position.set(0, -D / 2, d / 2); face.renderOrder = 4; g.add(face);
      var hl = mesh(new T.PlaneGeometry(w, Math.max(0.1, D * 0.008)), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }), { name: '水面', bg: true, shadow: false });
      hl.position.set(0, -D * 0.004, d / 2 + 0.02); hl.renderOrder = 6; g.add(hl);
      // 左右两侧、后面淡一些，看得出是一整块水
      var sm = new T.MeshBasicMaterial({ map: faceTex(false, false), transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide });
      [-1, 1].forEach(function (s) { var f = mesh(new T.PlaneGeometry(d, D), sm, { name: '水', bg: true, shadow: false }); f.rotation.y = Math.PI / 2; f.position.set(s * w / 2, -D / 2, 0); f.renderOrder = 3; g.add(f); });
      var back = mesh(new T.PlaneGeometry(w, D), new T.MeshBasicMaterial({ color: 0x2E7FA6, transparent: true, opacity: 0.35, depthWrite: false }), { name: '水', bg: true, shadow: false });
      back.position.set(0, -D / 2, -d / 2); back.renderOrder = 2; g.add(back);
    }
    // 水底：沙 / 泥 + 光斑
    var caust = null;
    if (o.bottom !== 'none') {
      var bm = P.mat.ground(o.bottom === 'mud' ? 'soil' : 'sand', [Math.max(1, w / 120), Math.max(1, d / 120)]), bot = mesh(new T.PlaneGeometry(w, d), bm, { name: '水底', bg: true, shadow: false });
      bot.rotation.x = -Math.PI / 2; bot.position.y = -D; g.add(bot);
      caust = caustics().clone(); caust.needsUpdate = true; caust.repeat.set(w / 40, d / 40);
      var cm = mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: caust, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false }), { name: '水底', bg: true, shadow: false });
      cm.rotation.x = -Math.PI / 2; cm.position.y = -D + Math.max(0.02, D * 0.002); cm.renderOrder = 1; g.add(cm);
    }
    // 水底下剖开的一层土
    if (o.soil) {
      var S = o.soil, st = tex(1024, 256, function (gc, W, H) {
        var r = rng(9); gc.fillStyle = '#8A6A48'; gc.fillRect(0, 0, W, H);
        gc.fillStyle = '#D6C092'; gc.fillRect(0, 0, W, H * 0.14);
        for (var q = 0; q < 300; q++) { var s2 = 2 + r() * 6, gv = 120 + r() * 70; gc.fillStyle = 'rgb(' + gv + ',' + (gv - 8) + ',' + (gv - 20) + ')'; gc.beginPath(); gc.ellipse(r() * W, H * 0.2 + r() * H * 0.78, s2 * 1.3, s2 * 0.8, r() * 3, 0, 7); gc.fill(); }
      });
      var sf = mesh(new T.PlaneGeometry(w, S), std({ map: st, roughness: 1 }), { name: '泥土', bg: true, shadow: false }); sf.position.set(0, -D - S / 2, d / 2); g.add(sf);
      var sb = mesh(new T.BoxGeometry(w, S, d), std({ color: 0x7B5B3E, roughness: 1 }), { name: '泥土', bg: true, shadow: false }); sb.position.set(0, -D - S / 2 - 0.05, -0.05); g.add(sb);
    }
    g.update = function (t) {
      if (A > 0) {
        for (var i = 0; i < sp.count; i++) { var x = base[i * 3], z = base[i * 3 + 2]; sp.setY(i, A * (Math.sin(x * 0.06 + t * 1.3) + 0.6 * Math.sin(z * 0.09 - t * 1.7 + x * 0.02))); }
        sp.needsUpdate = true; sg.computeVertexNormals();
      }
      if (caust) caust.offset.set(t * 0.02, t * 0.013);
    };
    g.surface = surf; return g;
  };
  P.tank = function (o) {
    o = o || {}; var w = o.w || 60, d = o.d || 30, h = o.h || 36, lv = o.level == null ? h * 0.8 : o.level, g = group(o.name || '水槽');
    var gl = P.mat.glass(), fr = P.mat.metal({ color: 0x2B2F36, rough: 0.5 }), t = Math.max(0.3, w * 0.006);
    [[w, h, t, 0, h / 2, -d / 2], [t, h, d, -w / 2, h / 2, 0], [t, h, d, w / 2, h / 2, 0], [w, t, d, 0, t / 2, 0], [w, h, t, 0, h / 2, d / 2]].forEach(function (b) {
      var m = mesh(new T.BoxGeometry(b[0], b[1], b[2]), gl, { name: '玻璃', shadow: false }); m.position.set(b[3], b[4], b[5]); m.renderOrder = 7; g.add(m);
    });
    var e = t * 1.6;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { var m = mesh(new T.BoxGeometry(e, h, e), fr, { name: '水槽' }); m.position.set(s[0] * w / 2, h / 2, s[1] * d / 2); g.add(m); });
    [0, h].forEach(function (y) { [-1, 1].forEach(function (s) { var a = mesh(new T.BoxGeometry(w + e, e, e), fr, { name: '水槽' }); a.position.set(0, y, s * d / 2); g.add(a); var b = mesh(new T.BoxGeometry(e, e, d + e), fr, { name: '水槽' }); b.position.set(s * w / 2, y, 0); g.add(b); }); });
    var wat = P.water({ w: w - t * 2, d: d - t * 2, depth: Math.max(0.1, lv - t), bottom: o.bottom || 'sand', wave: 0 }); wat.position.y = lv; g.add(wat);
    g.water = wat; g.userData.level = lv;
    g.setLevel = function (y) { g.remove(wat); wat = P.water({ w: w - t * 2, d: d - t * 2, depth: Math.max(0.1, y - t), bottom: o.bottom || 'sand', wave: 0 }); wat.position.y = y; g.add(wat); g.water = wat; g.userData.level = y; };
    return g;
  };
  // 回转体容器：外壁 + 口沿 + 内壁，水是内壁围出来的一块
  function vessel(name, outer, inner, mat, o) {
    o = o || {}; var g = group(o.name || name), prof = outer.concat(inner.slice().reverse());
    g.userData.bottom = inner[0][1];   // 杯里面的底在多高（放东西、算水量用）
    var body = P.lathe(prof, mat, { seg: 64, name: o.name || name, shadow: !mat.transparent }); if (mat.transparent) body.renderOrder = 7; g.add(body);
    var wm = P.mat.water({ color: o.waterColor, opacity: 0.55 }), water = null;
    g.setLevel = function (lv) {
      if (water) { g.remove(water); water.geometry.dispose(); water = null; }
      if (!(lv > inner[0][1])) { g.water = null; return; }
      var pts = [[0.001, inner[0][1]]];
      for (var i = 0; i < inner.length; i++) {
        if (inner[i][1] >= lv) { var a = inner[i - 1] || inner[i], b = inner[i], tt = b[1] === a[1] ? 0 : (lv - a[1]) / (b[1] - a[1]); pts.push([a[0] + (b[0] - a[0]) * tt, lv]); break; }
        pts.push(inner[i]); if (i === inner.length - 1) { pts.push([inner[i][0], lv]); }
      }
      pts.push([0.001, lv]);
      water = P.lathe(pts.map(function (p) { return [p[0] * 0.995, p[1]]; }), wm, { seg: 64, name: '水', shadow: false, bg: true }); water.renderOrder = 6; water.userData.part = 'water'; g.add(water);
      g.water = water; g.userData.level = lv;
    };
    if (o.level != null) g.setLevel(o.level);
    return g;
  }
  P.cup = function (o) {
    o = o || {}; var r = o.r || 4, h = o.h || 12, rb = r * 0.82, t = Math.max(0.15, r * 0.05), bt = t * 2.5;
    var outer = [[0.001, 0], [rb - t, 0], [rb, t], [r, h - t * 0.5], [r - t * 0.3, h]], inner = [[0.001, bt], [rb - t, bt], [r - t, h - t * 0.2]];
    return vessel('玻璃杯', outer, inner, P.mat.glass(), o);
  };
  P.beaker = function (o) {
    o = o || {}; var r = o.r || 4.5, h = o.h || 11, t = Math.max(0.15, r * 0.04);
    var g = vessel('烧杯', [[0.001, 0], [r - t, 0], [r, t], [r, h], [r * 1.06, h + t]], [[0.001, t * 2], [r - t, t * 2], [r - t, h]], P.mat.glass(), o);
    if (o.marks !== false) {   // 刻度按真实体积画：内半径 ri，高 y 处的体积 = π ri² (y − 杯底厚)
      var ri = r - t, cap = Math.PI * ri * ri * (h - t * 2), step = o.step || (cap > 400 ? 100 : cap > 150 ? 50 : cap > 60 ? 20 : 10);
      var mk = tex(256, 512, function (gc, W, H) {
        gc.clearRect(0, 0, W, H); gc.strokeStyle = 'rgba(255,255,255,.95)'; gc.fillStyle = 'rgba(255,255,255,.95)'; gc.lineWidth = 3; gc.font = '600 26px sans-serif'; gc.textBaseline = 'middle';
        for (var ml = step; ml <= cap * 0.92; ml += step) { var y = t * 2 + ml / (Math.PI * ri * ri), py = H * (1 - y / h); gc.beginPath(); gc.moveTo(20, py); gc.lineTo(80, py); gc.stroke(); gc.fillText(String(ml), 88, py); }
        for (var m2 = step / 2; m2 <= cap * 0.92; m2 += step) { var y2 = t * 2 + m2 / (Math.PI * ri * ri), py2 = H * (1 - y2 / h); gc.beginPath(); gc.moveTo(20, py2); gc.lineTo(50, py2); gc.stroke(); }
        gc.font = '600 22px sans-serif'; gc.fillText('mL', 30, H * 0.05);
      });
      var band = mesh(new T.CylinderGeometry(r * 1.004, r * 1.004, h, 48, 1, true, -0.45, 0.9), new T.MeshBasicMaterial({ map: mk, transparent: true, depthWrite: false, side: T.DoubleSide }), { name: '刻度', shadow: false, bg: true });
      band.position.y = h / 2; band.renderOrder = 8; g.add(band);
      g.mlAt = function (y) { return Math.max(0, Math.PI * ri * ri * (y - t * 2)); };   // 水面高 y 时是多少毫升
      g.levelFor = function (ml) { return t * 2 + ml / (Math.PI * ri * ri); };         // 装 ml 毫升时水面多高
      g.userData.bottom = t * 2;
    }
    return g;
  };
  P.bowl = function (o) {
    o = o || {}; var r = o.r || 10, h = o.h || 6.5, t = Math.max(0.25, r * 0.035);
    var outer = [], inner = [], n = 14, k;
    for (k = 0; k <= n; k++) { var u = k / n, rr = r * Math.pow(Math.sin(u * Math.PI / 2), 0.75), yy = h * (1 - Math.cos(u * Math.PI / 2)); outer.push([Math.max(0.001, k === 0 ? 0.001 : Math.max(rr, r * 0.38)), k === 0 ? 0 : yy]); }
    outer.splice(1, 0, [r * 0.36, 0], [r * 0.38, h * 0.08]);
    for (k = 0; k <= n; k++) { var u2 = k / n; inner.push([Math.max(0.001, (r - t) * Math.pow(Math.sin(u2 * Math.PI / 2), 0.75)), h * 0.12 + (h * 0.88) * (1 - Math.cos(u2 * Math.PI / 2))]); }
    outer.push([r + t * 0.3, h + t * 0.2]);
    return vessel('碗', outer, inner, P.mat.ceramic({ pattern: o.pattern, color: o.color }), o);
  };

  /* ════ 人 ════ */
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
  P.person = function (o) {
    o = o || {};
    var K = (o.height || 170) / 17.2, root = group(o.name || '人'), body = group(); body.scale.setScalar(K); root.add(body);
    var M = {
      skin: P.mat.skin(o.skin), shirt: P.mat.fabric(o.shirt || '#6D95BD'), pants: P.mat.fabric(o.pants || '#3F4A59'),
      shoe: std({ color: 0x2C2926, roughness: 0.8 }), sole: std({ color: 0xD8CDB4, roughness: 0.9 }), hair: std({ color: o.hair || 0x2A211C, roughness: 0.7 }),
      dark: std({ color: 0x1D1A18, roughness: 0.4 }), belt: std({ color: 0x5A4030, roughness: 0.8 })
    };
    var nm = o.name || '人';
    function m(geo, mat, parent) { return mesh(geo, mat, { name: nm, parent: parent || body }); }
    var torso = group(); body.add(torso);
    var shirtPts = [[1.30, -0.95], [1.36, -0.3], [1.28, 0.6], [1.30, 1.6], [1.44, 2.8], [1.60, 3.9], [1.64, 4.6], [1.56, 5.1], [1.28, 5.5], [0.9, 5.78], [0.5, 5.92], [0.001, 5.98]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var sg = new T.LatheGeometry(new T.SplineCurve(shirtPts).getPoints(40), 36); sg.scale(0.66, 1, 1); m(sg, M.shirt, torso);
    var belt = m(new T.TorusGeometry(1.33, 0.14, 10, 40), M.belt, torso); belt.rotation.x = Math.PI / 2; belt.scale.set(0.67, 1, 1); belt.position.y = 0.05;
    var collar = m(new T.TorusGeometry(0.52, 0.12, 8, 24), M.shirt, torso); collar.rotation.x = Math.PI / 2; collar.position.y = 5.82; collar.scale.set(0.9, 1, 1);
    [-1, 1].forEach(function (s) { var sh = m(new T.SphereGeometry(0.66, 16, 12), M.shirt, torso); sh.position.set(0, 5.15, s * 1.72); });
    var seat = m(new T.SphereGeometry(1.25, 20, 14), M.pants); seat.scale.set(0.82, 0.72, 1.12);
    var legs = [-1, 1].map(function (s) { return { s: s, thigh: m(taper(0.84, 0.6, 3.95, 18, 0.06), M.pants), shin: m(taper(0.6, 0.5, 4.2, 16), M.pants), shoe: m(new T.SphereGeometry(1, 20, 12), M.shoe), sole: m(new T.SphereGeometry(1, 20, 8), M.sole) }; });
    var arms = [-1, 1].map(function (s) { return { s: s, up: m(taper(0.56, 0.47, 3.0, 16), M.shirt), cuff: m(new T.TorusGeometry(0.47, 0.1, 8, 18), M.shirt), fore: m(taper(0.4, 0.31, 2.6, 16), M.skin), hand: m(new T.SphereGeometry(1, 16, 12), M.skin) }; });
    var neck = m(new T.CylinderGeometry(0.42, 0.46, 1, 14), M.skin);
    var head = group(); body.add(head);
    var skull = m(new T.SphereGeometry(1, 32, 24), M.skin, head); skull.scale.set(1.0, 1.15, 0.9);
    var jaw = m(new T.SphereGeometry(1, 20, 14), M.skin, head); jaw.scale.set(0.66, 0.5, 0.68); jaw.position.set(0.3, -0.55, 0);
    var nose = m(new T.SphereGeometry(1, 12, 10), M.skin, head); nose.scale.set(0.26, 0.3, 0.18); nose.position.set(0.98, -0.08, 0);
    [-1, 1].forEach(function (s) {
      var ear = m(new T.SphereGeometry(1, 12, 10), M.skin, head); ear.scale.set(0.18, 0.32, 0.12); ear.position.set(0.02, -0.05, s * 0.9);
      var eye = m(new T.SphereGeometry(0.085, 10, 8), M.dark, head); eye.position.set(0.9, 0.16, s * 0.33);
      var brow = m(new T.CapsuleGeometry(0.04, 0.28, 3, 6), M.hair, head); brow.rotation.x = Math.PI / 2; brow.rotation.y = s * 0.15; brow.position.set(0.9, 0.36, s * 0.33);
    });
    var mouth = m(new T.CapsuleGeometry(0.03, 0.24, 3, 6), M.dark, head); mouth.rotation.x = Math.PI / 2; mouth.position.set(0.9, -0.5, 0);
    var hair = m(new T.SphereGeometry(1.05, 24, 16, -Math.PI / 2 - 0.35, Math.PI + 0.7, 0, Math.PI * 0.62), M.hair, head); hair.position.set(-0.08, 0.1, 0); hair.scale.set(1, 1.1, 0.92);
    if (o.hat === 'straw') {
      var straw = std({ side: T.DoubleSide, roughness: 0.85, map: once('straw', function () { return tex(1024, 512, function (g, w, h) { g.fillStyle = '#DCB86C'; g.fillRect(0, 0, w, h); var rows = 34, rh = h / rows; for (var j = 0; j < rows; j++) { g.fillStyle = j % 2 ? 'rgba(160,115,50,.20)' : 'rgba(255,240,190,.18)'; g.fillRect(0, j * rh, w, rh); g.strokeStyle = 'rgba(140,95,40,.55)'; g.lineWidth = 1.6; for (var i = 0; i < 90; i++) { var x = i * w / 90 + (j % 2) * 5; g.beginPath(); g.moveTo(x, j * rh + 1); g.lineTo(x + 6, j * rh + rh / 2); g.lineTo(x, j * rh + rh - 1); g.stroke(); } } }); }) });
      var hat = group(); hat.position.set(-0.05, 0.78, 0); hat.rotation.z = 0.12; head.add(hat);
      var hp = [[2.78, -0.16], [2.6, -0.04], [2.1, 0.05], [1.5, 0.1], [1.2, 0.17], [1.13, 0.4], [1.1, 0.8], [1.02, 1.02], [0.78, 1.15], [0.3, 1.21], [0.001, 1.22]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      m(new T.LatheGeometry(new T.SplineCurve(hp).getPoints(36), 48), straw, hat);
      var band = m(new T.TorusGeometry(1.15, 0.12, 8, 40), std({ color: 0x8B2E25, roughness: 0.6 }), hat); band.rotation.x = Math.PI / 2; band.position.y = 0.3; band.scale.set(1, 1, 1.4);
    } else if (o.hat === 'cap') {
      var capM = P.mat.fabric(o.capColor || '#C8372C'), cap = group(); cap.position.set(-0.05, 0.35, 0); head.add(cap);
      var dome = m(new T.SphereGeometry(1.08, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), capM, cap); dome.scale.set(1.02, 0.9, 0.95);
      var brim = m(new T.CylinderGeometry(0.95, 0.95, 0.08, 24, 1, false, -Math.PI / 2, Math.PI), capM, cap); brim.scale.set(1.25, 1, 0.9); brim.position.set(0.55, 0.05, 0); brim.rotation.z = -0.1;
    }
    var st = { crouch: o.crouch || 0, lean: null, look: o.look || null, L: o.handL || null, R: o.handR || null }, E = V(), HP = { L: V(), R: V() };
    function toLocal(v) { root.updateMatrixWorld(true); return body.worldToLocal(v.clone()); }
    function layout() {
      var k = st.crouch, hasHand = !!(st.L || st.R);
      var hip = 8.0 + (4.3 - 8.0) * k, lean = (st.lean != null ? st.lean : (hasHand ? 12 : 3) + 22 * k) * Math.PI / 180;
      var fF = 2.0 + 0.1 * k, rF = -1.2 - 0.4 * k;
      var pel = V(0, hip, 0), U = V(Math.sin(lean), Math.cos(lean), 0);
      torso.position.copy(pel); torso.rotation.z = -lean; seat.position.copy(pel).add(V(-0.1, -0.15, 0));
      legs.forEach(function (L) {
        var hp = pel.clone().add(V(0, -0.45, L.s * 0.8)), fx = L.s < 0 ? fF : rF, fz = L.s * 0.8;
        var ankle = V(fx - 0.35, 0.75, fz), j = ik(hp, ankle, 3.95, 4.15, V(1, 0, 0));
        place(L.thigh, hp, j.mid); place(L.shin, j.mid, j.end);
        L.shoe.position.set(fx + 0.25, 0.4, fz); L.shoe.scale.set(1.2, 0.42, 0.5);
        L.sole.position.set(fx + 0.25, 0.12, fz); L.sole.scale.set(1.28, 0.16, 0.55);
      });
      arms.forEach(function (A) {
        var side = A.s > 0 ? 'R' : 'L', sh = pel.clone().addScaledVector(U, 5.15).add(V(0, 0, A.s * 1.72)), tgt = st[side];
        var hand = tgt ? toLocal(tgt) : sh.clone().add(V(0.25, -5.6, A.s * 0.5));
        var pole = tgt ? V(-0.4, -0.7, A.s) : V(-1, 0, A.s * 0.3), j = ik(sh, hand, 3.0, 2.75, pole);
        place(A.up, sh, j.mid); place(A.fore, j.mid, j.end);
        var fd = j.end.clone().sub(j.mid).normalize();
        A.cuff.position.copy(j.mid).addScaledVector(fd, 0.25); A.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), fd);
        A.hand.position.copy(j.end).addScaledVector(fd, 0.2); A.hand.quaternion.setFromUnitVectors(Y, fd); A.hand.scale.set(0.36, 0.48, 0.3);
        HP[side].copy(A.hand.position);
      });
      var nb = pel.clone().addScaledVector(U, 5.8), hc0 = nb.clone().addScaledVector(U, 0.9).add(V(0.25, 0.5, 0));
      var look = st.look ? toLocal(st.look).sub(hc0) : V(1, -0.15, 0);
      var pitch = clamp(Math.atan2(-look.y, Math.hypot(look.x, look.z)), -25 * Math.PI / 180, 60 * Math.PI / 180), yaw = clamp(Math.atan2(-look.z, look.x), -1, 1);
      var Uh = V(Math.sin(pitch * 0.85), Math.cos(pitch * 0.85), 0), hc = nb.clone().addScaledVector(Uh, 1.35);
      head.position.copy(hc); head.rotation.set(0, yaw, -pitch, 'YXZ');
      var nt = hc.clone().addScaledVector(Uh, -0.6), nb2 = nb.clone().addScaledVector(U, -0.2);
      place(neck, nb2, nt); neck.position.copy(nb2).lerp(nt, 0.5); neck.scale.set(1, nb2.distanceTo(nt) + 0.3, 1);
      E.set(0.9, 0.16, 0).applyEuler(head.rotation).add(hc);
    }
    var api = {
      root: root, object: root,
      set: function (p) { p = p || {}; ['crouch', 'lean', 'look'].forEach(function (k) { if (k in p) st[k] = p[k]; }); if ('handL' in p) st.L = p.handL; if ('handR' in p) st.R = p.handR; layout(); return api; },
      eye: function () { root.updateMatrixWorld(true); return body.localToWorld(E.clone()); },
      handPos: function (side) { root.updateMatrixWorld(true); return body.localToWorld(HP[side === 'L' ? 'L' : 'R'].clone()); }
    };
    root.userData.person = api; layout();
    return api;
  };

  /* ════ 手（一截手臂 + 手）════ */
  P.hand = function (o) {
    o = o || {}; var k = o.size || 1, g = group(o.name || '手'), nm = o.name || '手';
    var skin = P.mat.skin(o.skin), cloth = P.mat.fabric(o.sleeve || '#6D95BD');
    function unitCyl(rTop, rBot) { var c = new T.CylinderGeometry(rTop, rBot, 1, 20); c.translate(0, 0.5, 0); return c; }   // 底在 0、顶在 1，set 时按两点拉长
    var fore = mesh(unitCyl(2.9 * k, 3.6 * k), skin, { name: nm }); g.add(fore);
    var sleeve = mesh(unitCyl(4.4 * k, 4.7 * k), cloth, { name: nm }); g.add(sleeve);
    var cuff = mesh(new T.TorusGeometry(4.4 * k, 0.6 * k, 8, 20), cloth, { name: nm }); g.add(cuff);
    var palm = new T.Group(); g.add(palm);
    var fist = mesh(new T.SphereGeometry(1, 20, 14), skin, { name: nm, parent: palm }); fist.scale.set(4.2 * k, 5 * k, 3.4 * k); fist.position.y = 4 * k;
    var thumb = mesh(new T.CapsuleGeometry(1.1 * k, 3.2 * k, 4, 8), skin, { name: nm, parent: palm }); thumb.position.set(2.6 * k, 4.2 * k, 2.2 * k); thumb.rotation.set(0.5, 0, o.hold === false ? -0.9 : -0.3);
    for (var f = 0; f < 4; f++) { var fg = mesh(new T.CapsuleGeometry(0.95 * k, o.hold === false ? 4.8 * k : 2.4 * k, 4, 8), skin, { name: nm, parent: palm }); fg.position.set((-1.9 + f * 1.25) * k, (o.hold === false ? 10 : 8.2) * k, o.hold === false ? 0 : 1.6 * k); fg.rotation.x = o.hold === false ? 0 : 1.2; }
    var E = V(0, 30 * k, 0), W = V(0, 0, 0), gripP = V();
    g.set = function (elbow, wrist) {
      E.copy(elbow); W.copy(wrist); var d = W.clone().sub(E), L = d.length(), u = d.clone().divideScalar(L || 1);
      place(fore, E, W); fore.scale.set(1, L, 1);
      var s0 = E.clone().addScaledVector(u, -L * 0.6); place(sleeve, s0, E.clone().addScaledVector(u, L * 0.25)); sleeve.scale.set(1, L * 0.85, 1);
      cuff.position.copy(E).addScaledVector(u, L * 0.25); cuff.quaternion.setFromUnitVectors(V(0, 0, 1), u);
      palm.position.copy(W); palm.quaternion.setFromUnitVectors(Y, u);
      gripP.copy(W).addScaledVector(u, 4.5 * k); return g;
    };
    g.grip = function () { return gripP.clone(); };
    g.set(E, W); return g;
  };

  /* ════ 鱼 ════ */
  var FISH = null;
  function fishKit() {
    if (FISH) return FISH;
    var prof = [[0.0, -1.66], [0.12, -1.62], [0.17, -1.5], [0.24, -1.3], [0.42, -0.95], [0.62, -0.5], [0.78, 0.0], [0.82, 0.35], [0.78, 0.8], [0.66, 1.2], [0.5, 1.55], [0.3, 1.85], [0.12, 2.0], [0.0, 2.04]];
    var curve = new T.SplineCurve(prof.map(function (p) { return new T.Vector2(p[0], p[1]); })), FZ = 0.58;
    function R(xx) { var y = -xx, best = 0; for (var k = 0; k <= 60; k++) { var p = curve.getPoint(k / 60); if (Math.abs(p.y - y) < 0.06) best = Math.max(best, p.x); } return best; }
    var scaleTex = tex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      var rows = 30, cols = 32, sw = w / cols, shh = h / rows;
      for (var j = 0; j < rows; j++) {
        var vv = j / rows; if (vv < 0.1 || 1 - vv < 0.28) continue; var yy = h - (j + 1) * shh;
        for (var i = 0; i <= cols; i++) { var x = (i + (j % 2) * 0.5) * sw, gr = g.createRadialGradient(x, yy + shh * 0.2, 1, x, yy + shh * 0.2, sw * 0.7); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); gr.addColorStop(0.9, 'rgba(60,45,20,0.5)'); gr.addColorStop(1, 'rgba(60,45,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, yy + shh * 0.2, sw * 0.7, Math.PI, 0); g.fill(); }
      }
      g.fillStyle = 'rgba(60,50,35,.45)'; for (var k = 0; k < 50; k++) { var vy = h * (0.3 + k / 50 * 0.42); [0, 0.5, 1].forEach(function (u) { g.beginPath(); g.arc(u * w, vy, 3, 0, 7); g.fill(); }); }
      g.strokeStyle = 'rgba(70,50,30,.55)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(-10, h * 0.26); g.quadraticCurveTo(w * 0.12, h * 0.31, w * 0.22, h * 0.25); g.stroke();
      g.beginPath(); g.moveTo(w * 0.28, h * 0.25); g.quadraticCurveTo(w * 0.38, h * 0.31, w * 0.5, h * 0.26); g.quadraticCurveTo(w * 0.62, h * 0.31, w * 0.72, h * 0.25); g.stroke();
      g.beginPath(); g.moveTo(w * 0.78, h * 0.25); g.quadraticCurveTo(w * 0.88, h * 0.31, w + 10, h * 0.26); g.stroke();
    });
    function finGeo(pts) {
      var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
      var g = new T.ShapeGeometry(s), p = g.attributes.position, uv = g.attributes.uv, b = new T.Box3().setFromBufferAttribute(p);
      for (var k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) - b.min.x) / (b.max.x - b.min.x + 1e-6), (p.getY(k) - b.min.y) / (b.max.y - b.min.y + 1e-6));
      return g;
    }
    FISH = { curve: curve, FZ: FZ, R: R, scaleTex: scaleTex, bodies: {},
      dorsal: finGeo([[-0.45, 0], [-0.25, 0.62], [0.05, 0.55], [0.6, 0.28], [1.0, 0.05], [1.0, -0.1], [-0.45, -0.1]]),
      tail: finGeo([[0, 0.14], [0.55, 0.55], [1.05, 0.95], [1.12, 0.8], [0.78, 0.12], [0.78, -0.12], [1.12, -0.8], [1.05, -0.95], [0.55, -0.55], [0, -0.14]]),
      pect: finGeo([[0, 0.06], [0.45, 0.12], [0.8, -0.05], [0.55, -0.22], [0, -0.06]]),
      anal: finGeo([[0, 0.1], [0.2, -0.38], [0.55, -0.32], [0.62, 0.1]]),
      eye: new T.SphereGeometry(0.15, 16, 12), pupil: new T.SphereGeometry(0.085, 12, 10) };
    return FISH;
  }
  var FISHCOL = { gold: [0x4A4A28, 0xDCA43C, 0xF4ECD4, ['rgba(206,98,48,0.97)', 'rgba(238,128,70,0.72)']], gray: [0x34413A, 0x8E9A86, 0xE8EADC, ['rgba(110,120,104,0.95)', 'rgba(160,168,150,0.7)']], red: [0xA02818, 0xE8573A, 0xFFF0E0, ['rgba(220,80,50,0.97)', 'rgba(250,140,100,0.72)']] };
  P.fish = function (o) {
    o = o || {}; var F = fishKit(), C = FISHCOL[o.color] || FISHCOL.gold, key = o.color || 'gold';
    var bodyGeo = F.bodies[key] || (F.bodies[key] = (function () {
      var g = new T.LatheGeometry(F.curve.getPoints(48), 40); g.rotateZ(Math.PI / 2); g.scale(1, 1, F.FZ);
      var p = g.attributes.position, col = new Float32Array(p.count * 3), cT = new T.Color(C[0]), cS = new T.Color(C[1]), cB = new T.Color(C[2]), c = new T.Color();
      for (var i = 0; i < p.count; i++) { var rr = Math.max(0.05, F.R(p.getX(i))), k = clamp(p.getY(i) / rr, -1, 1); if (k > 0) c.copy(cS).lerp(cT, Math.pow(k, 0.8)); else c.copy(cS).lerp(cB, Math.pow(-k, 0.7)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
    })());
    var finTex = once('fin-' + key, function () { return tex(256, 256, function (g, w, h) { var gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, C[3][0]); gr.addColorStop(1, C[3][1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,50,30,.45)'; g.lineWidth = 2; for (var k = 0; k < 22; k++) { g.beginPath(); g.moveTo(w * 0.5, h); g.lineTo(k / 21 * w, 0); g.stroke(); } }); });
    var ghost = !!o.ghost, nm = o.name || (ghost ? '看到的鱼' : '鱼');
    var root = group(nm), sway = group(); root.add(sway);
    var bodyM = std({ vertexColors: true, map: F.scaleTex, roughness: 0.42, metalness: 0.15 }), finM = std({ map: finTex, transparent: true, side: T.DoubleSide, roughness: 0.6, depthWrite: !ghost });
    var eyeM = std({ color: 0xE8D9A0, roughness: 0.3 }), pupM = std({ color: 0x111111, roughness: 0.2 });
    if (ghost) [bodyM, finM, eyeM, pupM].forEach(function (mm) { mm.transparent = true; mm.opacity = mm === finM ? 0.5 : 0.62; mm.emissive = new T.Color(0x203860); mm.emissiveIntensity = 0.35; });
    function m(geo, mat, par) { var x = mesh(geo, mat, { name: nm, parent: par || sway, shadow: !ghost }); if (ghost) x.renderOrder = 3; return x; }
    m(bodyGeo, bodyM);
    var d = m(F.dorsal, finM); d.position.set(-0.15, 0.62, 0);
    var a = m(F.anal, finM); a.position.set(0.7, -0.4, 0);
    var tail = group(); tail.position.set(1.5, 0, 0); sway.add(tail); var tf = m(F.tail, finM, tail); tf.position.x = 0.02;
    var pects = [];
    [-1, 1].forEach(function (s) {
      var pf = group(); pf.position.set(-0.85, -0.36, s * 0.36); sway.add(pf); var pm = m(F.pect, finM, pf); pm.rotation.set(s * 0.5, 0, -0.35); pects.push(pf);
      var vf = m(F.pect, finM); vf.scale.set(0.8, 0.8, 0.8); vf.position.set(0.15, -0.66, s * 0.2); vf.rotation.set(s * 0.6, 0, -0.5);
      var ex = -1.42, er = F.R(ex), ez = Math.sqrt(Math.max(0, er * er - 0.04)) * F.FZ;
      var e = m(F.eye, eyeM); e.position.set(ex, 0.2, s * (ez - 0.02)); var pu = m(F.pupil, pupM); pu.position.set(ex - 0.02, 0.2, s * (ez + 0.07));
    });
    if (ghost) { var sh = mesh(bodyGeo, new T.MeshBasicMaterial({ color: 0xD4ECFF, transparent: true, opacity: 0.4, side: T.BackSide, depthWrite: false }), { name: nm, parent: sway, shadow: false }); sh.scale.set(1.04, 1.07, 1.1); sh.renderOrder = 3; }
    root.scale.setScalar((o.len || 30) / 4.9);
    root.swim = function (t) { tail.rotation.y = 0.35 * Math.sin(t * 5); sway.rotation.y = -0.06 * Math.sin(t * 5); pects.forEach(function (p, i) { p.rotation.y = 0.3 * Math.sin(t * 4 + i * 3); }); };
    return root;
  };

  /* ════ 船、箱子、简单物体 ════ */
  P.crate = function (o) {
    o = o || {}; var w = o.w || 20, h = o.h || (o.w ? o.w * 0.8 : 16), d = o.d || (o.w ? o.w * 0.8 : 16), kind = o.kind || 'container';
    var c = o.color || (kind === 'wood' ? '#B88A52' : ['#C8372C', '#2F6FD6', '#E0A526', '#2E8B57'][(o.seed || 0) % 4]);
    var t = once('crate-' + kind + c, function () {
      return tex(256, 256, function (g, W, H) {
        g.fillStyle = c; g.fillRect(0, 0, W, H);
        if (kind === 'wood') { g.strokeStyle = 'rgba(70,40,15,.5)'; g.lineWidth = 4; for (var i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * H / 5); g.lineTo(W, i * H / 5); g.stroke(); } g.strokeStyle = 'rgba(60,35,12,.8)'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14); g.beginPath(); g.moveTo(10, 10); g.lineTo(W - 10, H - 10); g.stroke(); }
        else { for (var x = 0; x < W; x += 16) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, 0, 5, H); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 6, 0, 3, H); } g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); }
      });
    });
    var m = P.roundBox(w, h, d, Math.min(w, h, d) * 0.04, std({ map: t, roughness: 0.55, metalness: kind === 'wood' ? 0 : 0.25 }), { name: o.name || (kind === 'wood' ? '木箱' : '货箱') });
    m.geometry.translate(0, h / 2, 0); return m;
  };
  P.block = function (o) { o = o || {}; var w = o.w || 6, h = o.h || 4, d = o.d || 4, m = P.roundBox(w, h, d, Math.min(w, h, d) * 0.06, o.mat || P.mat.metal({ color: 0x9AA3AD }), { name: o.name || '物块' }); m.geometry.translate(0, h / 2, 0); return m; };
  P.ball = function (o) { o = o || {}; var r = o.r || 3, m = mesh(new T.SphereGeometry(r, 40, 28), o.mat || P.mat.plastic(o.color || 0xE85D3A), { name: o.name || '小球' }); m.geometry.translate(0, r, 0); return m; };
  P.egg = function (o) {
    o = o || {}; var r = o.r || 2.2, pts = [];
    for (var k = 0; k <= 24; k++) { var a = k / 24 * Math.PI, y = -Math.cos(a), rr = Math.sin(a) * (1 - 0.12 * y); pts.push([rr * r, (y + 1) * r * 1.3]); }
    return P.lathe(pts, std({ color: o.color || 0xE2B48A, roughness: 0.55 }), { seg: 40, name: o.name || '鸡蛋' });
  };
  P.boat = function (o) {
    o = o || {}; var L = o.len || 200, B = o.beam || L * 0.22, Hh = o.depth || B * 0.6, g = group(o.name || '船'), nm = o.name || '船';
    var NX = 56, NU = 28, pos = [], col = [], idx = [], deck = [], c = new T.Color();
    var cTop = new T.Color(o.color || 0x22374F), cRed = new T.Color(o.bottom || 0xA8322A), cWhite = new T.Color(0xF2F2EE), wl = -Hh * (o.design == null ? 0.55 : o.design);
    function wOf(t) { var wb = t > 0.6 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.6) / 0.4, 2))) : (t < 0.06 ? 0.88 + 0.12 * (t / 0.06) : 1); return B / 2 * Math.max(wb, 0.015); }
    function keelOf(t) { return -Hh * (t > 0.78 ? 1 - 0.5 * Math.pow((t - 0.78) / 0.22, 2) : 1); }
    function sheerOf(t) { return t > 0.72 ? 0.16 * Hh * Math.pow((t - 0.72) / 0.28, 2) : 0.02 * Hh * (1 - t / 0.72); }
    for (var i = 0; i <= NX; i++) {
      var t = i / NX, x = -L / 2 + t * L, w = wOf(t), kl = keelOf(t), sh = sheerOf(t);
      for (var j = 0; j <= NU; j++) {
        var u = -1 + 2 * j / NU, yy = kl * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), 1 / 2.6), y = sh + yy * (1 + sh / Hh * 0), z = w * u;
        pos.push(x, y, z);
        if (y < wl) c.copy(cRed); else if (y < wl + Hh * 0.06) c.copy(cWhite); else c.copy(cTop);
        col.push(c.r, c.g, c.b);
      }
      deck.push([x, sh, w]);
    }
    for (i = 0; i < NX; i++) for (var j2 = 0; j2 < NU; j2++) { var a = i * (NU + 1) + j2, b = a + NU + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    var hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new T.Float32BufferAttribute(col, 3)); hg.setIndex(idx); hg.computeVertexNormals();
    var hullM = std({ vertexColors: true, roughness: 0.5, metalness: 0.2, side: T.DoubleSide, map: noise('#ffffff', 41, 0.04) });
    g.add(mesh(hg, hullM, { name: nm }));
    // 船尾板
    var tp = [], ti = [];
    for (var j3 = 0; j3 <= NU; j3++) tp.push(pos[j3 * 3], pos[j3 * 3 + 1], pos[j3 * 3 + 2]);
    tp.push(-L / 2, deck[0][1], 0); var ci = NU + 1; for (j3 = 0; j3 < NU; j3++) ti.push(ci, j3 + 1, j3);
    var tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(tp, 3)); tg.setIndex(ti); tg.computeVertexNormals();
    g.add(mesh(tg, std({ color: o.color || 0x22374F, roughness: 0.5, side: T.DoubleSide }), { name: nm }));
    // 甲板
    var ds = new T.Shape(); ds.moveTo(deck[0][0], -deck[0][2]); deck.forEach(function (p) { ds.lineTo(p[0], -p[2]); }); for (var k = deck.length - 1; k >= 0; k--) ds.lineTo(deck[k][0], deck[k][2]);
    var dg = new T.ShapeGeometry(ds, 2); dg.rotateX(-Math.PI / 2);
    var dp = dg.attributes.position; for (k = 0; k < dp.count; k++) { var tt = (dp.getX(k) + L / 2) / L; dp.setY(k, sheerOf(clamp(tt, 0, 1)) - Hh * 0.01); }
    dg.computeVertexNormals();
    var deckTex = grain('#B48C5A', '#6A4A2A', 17, 1024, 256); deckTex.wrapS = deckTex.wrapT = T.RepeatWrapping; deckTex.repeat.set(L / 120, B / 30);
    g.add(mesh(dg, std({ map: deckTex, roughness: 0.75, side: T.DoubleSide }), { name: '甲板' }));
    // 栏杆
    var rail = P.mat.metal({ color: 0xE8ECEF, rough: 0.4 }), rh = Hh * 0.22;
    [-1, 1].forEach(function (s) {
      var top = [], n = 0;
      for (var q = 1; q < deck.length - 2; q += 2) { var p = deck[q], pz = s * p[2] * 0.97; top.push(V(p[0], p[1] + rh, pz)); if (n++ % 2 === 0) g.add(P.rod(V(p[0], p[1], pz), V(p[0], p[1] + rh, pz), Hh * 0.012, rail, { name: '栏杆', seg: 6 })); }
      g.add(P.tube(top, Hh * 0.015, rail, { name: '栏杆', radial: 6 }));
    });
    // 驾驶楼、烟囱、桅杆
    var cab = group();
    if (o.cabin !== false) {
      var cx = -L / 2 + L * 0.14, white = std({ color: 0xF4F4F0, roughness: 0.5 }), glassD = std({ color: 0x23384F, roughness: 0.15, metalness: 0.4 });
      var c1 = P.roundBox(L * 0.16, Hh * 0.75, B * 0.78, Hh * 0.04, white, { name: '驾驶楼' }); c1.position.set(cx, Hh * 0.375 + 0.02 * Hh, 0); cab.add(c1);
      var c2 = P.roundBox(L * 0.11, Hh * 0.5, B * 0.68, Hh * 0.04, white, { name: '驾驶楼' }); c2.position.set(cx + L * 0.01, Hh * 1.0, 0); cab.add(c2);
      for (var wv = 0; wv < 4; wv++) [-1, 1].forEach(function (s) { var wdw = mesh(new T.BoxGeometry(L * 0.018, Hh * 0.12, 0.2), glassD, { name: '驾驶楼' }); wdw.position.set(cx - L * 0.05 + wv * L * 0.03, Hh * 1.03, s * B * 0.341); cab.add(wdw); });
      var fw = mesh(new T.BoxGeometry(0.2, Hh * 0.13, B * 0.5), glassD, { name: '驾驶楼' }); fw.position.set(cx + L * 0.066, Hh * 1.05, 0); cab.add(fw);
      var fun = P.lathe([[0.001, 0], [B * 0.1, 0], [B * 0.11, Hh * 0.5], [B * 0.1, Hh * 0.55], [0.001, Hh * 0.55]], std({ color: 0xC8372C, roughness: 0.5 }), { name: '烟囱', seg: 24 }); fun.position.set(cx - L * 0.045, Hh * 1.25, 0); cab.add(fun);
      var ft = mesh(new T.CylinderGeometry(B * 0.105, B * 0.105, Hh * 0.08, 24), std({ color: 0x222222 }), { name: '烟囱' }); ft.position.set(cx - L * 0.045, Hh * 1.76, 0); cab.add(ft);
      cab.add(P.rod(V(cx + L * 0.02, Hh * 1.25, 0), V(cx + L * 0.02, Hh * 1.9, 0), Hh * 0.015, rail, { name: '桅杆' }));
      g.add(cab);
    }
    // 货位：甲板中段，两排，最多两层
    var x0 = -L / 2 + L * 0.27, x1 = L / 2 - L * 0.26, cw = Math.min((x1 - x0) / 5, B * 0.38), cols = Math.max(1, Math.floor((x1 - x0) / (cw * 1.08))), slots = [];
    for (var lay = 0; lay < 2; lay++) for (var cI = 0; cI < cols; cI++) for (var row = 0; row < 2; row++) slots.push(V(x0 + (cI + 0.5) * (x1 - x0) / cols, lay * cw * 0.82, (row - 0.5) * cw * 1.04));
    var crates = [], cargoG = group(); g.add(cargoG);
    g.slots = slots.length;
    g.cargo = function (n) {
      n = clamp(Math.round(n), 0, slots.length);
      while (crates.length < n) { var cr = P.crate({ w: cw, h: cw * 0.8, d: cw * 0.96, seed: crates.length }); cr.position.copy(slots[crates.length]); cargoG.add(cr); crates.push(cr); }
      crates.forEach(function (cr, k2) { cr.visible = k2 < n; });
      return n;
    };
    g.floatAt = function (waterY, draft) { g.position.y = waterY - draft + Hh; return g; };
    g.userData.depth = Hh; g.userData.len = L; g.userData.beam = B;
    if (o.cargo) g.cargo(o.cargo);
    return g;
  };

  /* ════ 物理标记：力的箭头、光线、角 ════ */
  P.arrow = function (o) {
    o = o || {}; var r = o.r || 0.6, col = o.color || P.C.force, onTop = o.onTop !== false, g = group(o.name || '箭头');
    var mat = new T.MeshBasicMaterial({ color: col, depthTest: !onTop, transparent: onTop });
    g.userData.arrow = { on: o.on || null, from: V(), vec: V(), name: o.name || '' };
    var shaft = mesh(new T.CylinderGeometry(r, r, 1, 16), mat, { name: g.name, shadow: false }), head = mesh(new T.ConeGeometry(r * 2.6, 1, 20), mat, { name: g.name, shadow: false });
    shaft.renderOrder = head.renderOrder = 9; g.add(shaft); g.add(head);
    var A = V(), B = V();
    g.set = function (from, vec) {
      var L = vec.length(); g.visible = L > 1e-6; if (!g.visible) return g;
      var hl = Math.min(r * 6, L * 0.4), d = vec.clone().divideScalar(L);
      A.copy(from); B.copy(from).add(vec); g.userData.arrow.from.copy(from); g.userData.arrow.vec.copy(vec);
      P.setRod(shaft, A, B.clone().addScaledVector(d, -hl));
      head.position.copy(B).addScaledVector(d, -hl / 2); head.quaternion.setFromUnitVectors(Y, d); head.scale.set(1, hl, 1);
      return g;
    };
    g.tip = function () { return B.clone(); }; g.from = function () { return A.clone(); };
    return g;
  };
  P.ray = function (o) {
    o = o || {}; var r = o.r || 0.15, col = o.color || P.C.ray, g = group(o.name || '光线'), mat = new T.MeshBasicMaterial({ color: col });
    var unit = new T.CylinderGeometry(1, 1, 1, 8), segs = [], head = null;
    if (o.arrow !== false && !o.dashed) { head = mesh(new T.ConeGeometry(r * 3.2, r * 9, 12), mat, { name: g.name, shadow: false }); g.add(head); }
    function seg() { var m = mesh(unit, mat, { name: g.name, shadow: false }); m.scale.set(r, 1, r); g.add(m); segs.push(m); return m; }
    g.set = function (a, b) {
      var d = b.clone().sub(a), L = d.length(); g.visible = L > 1e-6; if (!g.visible) return g; var u = d.clone().divideScalar(L);
      if (!o.dashed) { if (!segs.length) seg(); P.setRod(segs[0], a, b); segs[0].scale.x = segs[0].scale.z = r; if (head) { head.position.copy(a).addScaledVector(d, 0.55); head.quaternion.setFromUnitVectors(Y, u); } return g; }
      var on = o.on || r * 8, off = o.off || r * 6, s = 0, i = 0;
      while (s < L) { var m = segs[i] || seg(); m.visible = true; P.setRod(m, a.clone().addScaledVector(u, s), a.clone().addScaledVector(u, Math.min(L, s + on))); m.scale.x = m.scale.z = r; s += on + off; i++; }
      for (; i < segs.length; i++) segs[i].visible = false;
      return g;
    };
    return g;
  };
  P.arc = function (o) {
    o = o || {}; var r0 = o.r || 0.12, g = group(o.name || '角'), mat = new T.MeshBasicMaterial({ color: o.color || P.C.normal }), m = null;
    g.set = function (c, R, d0, d1) {
      if (m) { g.remove(m); m.geometry.dispose(); }
      var a = d0.clone().normalize(), b = d1.clone().normalize(), ang = a.angleTo(b), ax = a.clone().cross(b); if (ax.lengthSq() < 1e-10) ax.set(0, 0, 1); ax.normalize();
      var pts = []; for (var k = 0; k <= 24; k++) pts.push(c.clone().add(a.clone().applyAxisAngle(ax, ang * k / 24).multiplyScalar(R)));
      m = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, r0, 6), mat, { name: g.name, shadow: false }); g.add(m); return g;
    };
    return g;
  };
  return P;
})();
