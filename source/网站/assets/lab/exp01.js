/* 01 用刻度尺测量长度、用表测量时间。
   长度：课本 26.02×18.48×0.86 cm、作业本 20.45×14.82×0.32 cm；30 cm 直尺（分度值 1 mm，0 刻度在尺端）。
     直接拖直尺平移 / 靠拢被测边；拖尺尾的橙色旋钮转动。松手时接近正确的位置自动吸附（转角 <1.5° 吸正、空隙 <0.3 cm 贴紧、
     离整厘米刻度 <0.3 cm 对准），故意放偏也能保持。量厚度时直尺立在课本右端，上下拖抬起 / 放下，左右拖靠拢。
   计时：机械秒表（大表盘 30 s 一圈、分度 0.1 s；小表盘 15 min）＋约 72 次/min 的脉搏；
     按下开始时脉搏同时跳第一下（计 0），数到第 10 次停表；程序按开始、停止之间实际经过的跳动次数判断。 */
(function () {
  var OBJ = { book: { name: '课本', L: 26.02, W: 18.48, H: 0.86, cover: 0x3F6FD1 }, note: { name: '作业本', L: 20.45, W: 14.82, H: 0.32, cover: 0x6FB58C } };
  var DIM = { L: '长', W: '宽', H: '厚' }, RL = 32.6, ZR = -1.6, PERIOD = 60 / 72;
  var st = {
    mode: 'len', obj: 'book', dim: 'L', p: -1.2, gap: 0.6, rot: 3, lift: 0, view: 'mid',
    sw: { run: false, t: 0, t0: 0, fromReset: true, start: null, stop: null }, sim: 0, phase: 0.3,
    rows: { note: { L: null, W: null, H: null }, book: { L: null, W: null, H: null } }, times: []
  };
  var K, V, T3, G, book, ruler, knob, svgStage, sv = {}, wins = [], winKey = '', last = '';

  function o() { return OBJ[st.obj]; }
  function vertical() { return st.dim === 'H'; }
  function edgeLen() { return o()[st.dim]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  /* 读数几何：start = 物体一端对着的刻度，end = 另一端对着的刻度 */
  function geo() {
    var L = edgeLen(), th = st.rot * Math.PI / 180;
    if (vertical()) {
      return { start: -st.lift, end: (L - st.lift) / Math.cos(th), ok: { par: Math.abs(st.rot) < 1, tight: st.gap < 0.08, align: st.lift < 0.02, inRange: true } };
    }
    var dir = [Math.cos(th), -Math.sin(th)], Q = [-L / 2, st.gap], O = [Q[0] - st.p * dir[0], Q[1] - st.p * dir[1]], B = [L / 2, 0];
    var t = (B[0] - O[0]) * dir[0] + (B[1] - O[1]) * dir[1];
    var al = Math.abs(st.p - Math.round(st.p)) < 0.02 && st.p > (st.worn ? 1.99 : -0.01);   // 磨坏的 0～2 cm 不能作起点
    return { start: st.p, end: t, ok: { par: Math.abs(st.rot) < 1, tight: st.gap < 0.08, align: al, inRange: t <= 30.0 && st.p > -0.01 } };
  }
  /* 记录后同一状态不能重复记：长度按“对象+边+两端读数”判断，计时要复位重测 */
  function lenSig() { return [st.obj, st.dim, f2(readStart()), f2(readEnd())].join('|'); }
  function nextLen() {
    var order = [['book', 'L'], ['book', 'W'], ['book', 'H'], ['note', 'L'], ['note', 'W'], ['note', 'H']];
    for (var i = 0; i < order.length; i++) if (st.rows[order[i][0]][order[i][1]] == null) return '接着测' + OBJ[order[i][0]].name + '的' + DIM[order[i][1]] + '度。';
    return '表一已填满，可以到「数据」查看。';
  }
  function readStart() { return vertical() ? 0 : Math.round(geo().start * 10) / 10; }
  function readEndV() { return readEnd() + (st.view === 'mid' ? 0 : (st.view === 'left' ? 1 : -1) * (vertical() ? 0.1 : 0.15)); }   // 视线不正时读到的终点
  function readEnd() { return Math.round(geo().end * 100) / 100; }

  /* ── 3D 场景 ── */
  /* worn = 第 2 问“开头那一截磨坏了”：0～2 cm 一段发灰、刻度模糊残缺，0、1 两个数字看不清 */
  function rulerTex(worn) {
    var c = document.createElement('canvas'); c.width = 4096; c.height = 384; var g = c.getContext('2d');
    g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, 4096, 384);
    var px = 4096 / RL, W2 = 1.93 * px, rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    if (worn) { g.fillStyle = '#D9D3C6'; g.fillRect(0, 0, W2, 384); }
    g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.font = 'bold 52px Bahnschrift, Arial';
    for (var mm = 0; mm <= 300; mm++) {
      var x = mm / 10 * px + 2, l = mm % 10 === 0 ? 116 : mm % 5 === 0 ? 82 : 50, bad = worn && mm < 20;
      g.save(); if (bad) { g.globalAlpha = 0.18 + rnd() * 0.22; g.filter = 'blur(3px)'; l *= 0.35 + rnd() * 0.5; }
      g.lineWidth = mm % 10 === 0 ? 5 : 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, l); g.stroke();
      if (mm % 10 === 0 && !bad) g.fillText(String(mm / 10), Math.max(30, x), 180);
      g.restore();
    }
    if (worn) {   // 磨痕、缺口
      g.strokeStyle = 'rgba(120,110,95,.45)'; g.lineWidth = 4;
      for (var k = 0; k < 26; k++) { var x0 = rnd() * W2 * 0.95, y0 = rnd() * 384; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 30 + rnd() * 120, y0 + (rnd() - 0.5) * 60); g.stroke(); }
      g.fillStyle = '#C9C1B1'; g.beginPath(); g.moveTo(0, 0); g.lineTo(70, 0); g.lineTo(26, 60); g.lineTo(0, 44); g.closePath(); g.fill();
    }
    g.font = '40px Bahnschrift, Arial'; g.fillStyle = '#8A99AD'; g.textAlign = 'left'; g.fillText('cm', (worn ? 2.4 : 0.5) * px, 300);
    var tx = new T3.CanvasTexture(c); tx.anisotropy = 8; return tx;
  }
  var rTex = {};
  function setWorn(w) {   // 换直尺刻度面贴图
    if (!rTex[w]) rTex[w] = rulerTex(w);
    var m = ruler.children[0].material[2]; if (m.map !== rTex[w]) { m.map = rTex[w]; m.needsUpdate = true; }
  }
  function knobTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#FE752D'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 64, 34, -2.6, 1.9); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64 + 34 * Math.cos(1.9) - 18, 64 + 34 * Math.sin(1.9) - 2); g.lineTo(64 + 34 * Math.cos(1.9) + 14, 64 + 34 * Math.sin(1.9) - 16); g.lineTo(64 + 34 * Math.cos(1.9) + 6, 64 + 34 * Math.sin(1.9) + 18); g.closePath(); g.fill();
    return new T3.CanvasTexture(c);
  }
  function makeRuler() {
    var mats = [0, 1, 2, 3, 4, 5].map(function () { return new T3.MeshStandardMaterial({ color: 0xE9EEF5, roughness: .5 }); });
    mats[2] = new T3.MeshStandardMaterial({ map: (rTex[false] = rulerTex(false)), roughness: .45 });
    var mesh = new T3.Mesh(new T3.BoxGeometry(RL, 0.15, 3), mats);
    mesh.position.set(RL / 2, 0.075, 1.5); mesh.castShadow = true; mesh.receiveShadow = true;
    var g = new T3.Group(); g.add(mesh);
    knob = new T3.Group();
    var disc = new T3.Mesh(new T3.CylinderGeometry(0.88, 0.88, 0.22, 32), new T3.MeshStandardMaterial({ color: 0xE8641F, roughness: .5 }));
    var face = new T3.Mesh(new T3.CircleGeometry(0.88, 32), new T3.MeshBasicMaterial({ map: knobTex() })); face.rotation.x = -Math.PI / 2; face.position.y = 0.115;
    var hit = new T3.Mesh(new T3.CylinderGeometry(1.6, 1.6, 0.8, 12), new T3.MeshBasicMaterial({ visible: false }));
    knob.add(disc); knob.add(face); knob.add(hit); knob.userData.knob = true;
    g.add(knob); return g;     // 组原点 = 0 刻度、测量边；+x 沿尺长，+z 沿尺宽
  }
  /* 封面：课本画书名和简单图案，作业本画标签框（自绘，不用真实封面图） */
  var covCache = {};
  function coverTex(x, rot) {
    var key = x.name + rot; if (covCache[key]) return covCache[key];
    var c = document.createElement('canvas'), pw = 1040, ph = Math.round(1040 * x.W / x.L), g;
    c.width = rot ? ph : pw; c.height = rot ? pw : ph; g = c.getContext('2d');
    if (rot) { g.translate(c.width, 0); g.rotate(Math.PI / 2); }   // 测宽时书在模型里转了 90°，封面跟着转回来
    var hex = '#' + ('00000' + x.cover.toString(16)).slice(-6);
    g.fillStyle = hex; g.fillRect(0, 0, pw, ph);
    if (x === OBJ.book) {
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, ph * 0.70, pw, ph * 0.30);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6;   // 原子轨道式的简单图案
      for (var k = 0; k < 3; k++) { g.save(); g.translate(pw * 0.73, ph * 0.40); g.rotate(k * Math.PI / 3); g.beginPath(); g.ellipse(0, 0, ph * 0.26, ph * 0.09, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      g.fillStyle = '#FFD25A'; g.beginPath(); g.arc(pw * 0.73, ph * 0.40, ph * 0.035, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold ' + Math.round(ph * 0.20) + 'px "Microsoft YaHei", sans-serif'; g.fillText('物理', pw * 0.08, ph * 0.36);
      g.font = Math.round(ph * 0.075) + 'px "Microsoft YaHei", sans-serif'; g.fillText('八年级  上册', pw * 0.08, ph * 0.52);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.font = Math.round(ph * 0.05) + 'px "Microsoft YaHei", sans-serif'; g.fillText('义务教育教科书', pw * 0.08, ph * 0.86);
    } else {
      g.fillStyle = 'rgba(255,255,255,.18)'; for (var i = 0; i < 6; i++) g.fillRect(0, ph * (0.1 + i * 0.16), pw, ph * 0.035);
      var bx = pw * 0.30, by = ph * 0.22, bw = pw * 0.40, bh = ph * 0.56;
      g.fillStyle = '#fff'; g.fillRect(bx, by, bw, bh); g.strokeStyle = '#2E6B4A'; g.lineWidth = 6; g.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);
      g.fillStyle = '#2E6B4A'; g.font = 'bold ' + Math.round(bh * 0.20) + 'px "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.fillText('作业本', bx + bw / 2, by + bh * 0.36);
      g.font = Math.round(bh * 0.10) + 'px "Microsoft YaHei", sans-serif'; g.textAlign = 'left';
      ['班级', '姓名'].forEach(function (t, j) { var yy = by + bh * (0.60 + j * 0.20); g.fillText(t, bx + bw * 0.12, yy); g.fillRect(bx + bw * 0.36, yy + 6, bw * 0.50, 3); });
    }
    var t = new T3.CanvasTexture(c); t.anisotropy = 8; if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
    return (covCache[key] = t);
  }
  function makeBook() {
    var x = o(), W = st.dim === 'W' ? x.L : x.W, L = st.dim === 'W' ? x.W : x.L;
    if (book) G.remove(book);
    var page = new T3.MeshStandardMaterial({ color: 0xF6F2E6, roughness: .9 }), cov = new T3.MeshStandardMaterial({ color: x.cover, roughness: .7 }), top = new T3.MeshStandardMaterial({ map: coverTex(x, st.dim === 'W'), roughness: .7 });
    book = new T3.Mesh(new T3.BoxGeometry(L, x.H, W), [page, page, top, cov, page, page]);
    book.position.set(0, x.H / 2, -W / 2); book.castShadow = true; book.receiveShadow = true;
    G.add(book);
    // 测宽：模型里把书转了 90°（宽边对着直尺），再把整组转回去，画面上书不动、直尺转到书的右侧宽边
    var x0 = o();
    if (st.dim === 'W') { G.rotation.y = Math.PI / 2; G.position.set(x0.L / 2, 0, -x0.W / 2); } else { G.rotation.y = 0; G.position.set(0, 0, 0); }
    G.updateMatrixWorld(true);
  }
  /* 旋钮相对转轴的方位角：水平时转轴 = 物体左端对着的那一点；立着时转轴 = 直尺底端 */
  function knobAngle(p) {
    return vertical() ? Math.atan2(-(p.x - (o().L / 2 + st.gap)), p.y - st.lift) : Math.atan2(-(p.z - st.gap), p.x + edgeLen() / 2);
  }
  function loc(p) { return p ? G.worldToLocal(p.clone()) : null; }   // 拖动点换算到组内坐标（测宽时组转了 90°）
  function isKnob(h) { for (var n = h && h.object; n; n = n.parent) if (n.userData && n.userData.knob) return true; return false; }
  function build() {
    V = K.three({ target: [7, 1, -2], az: 0, el: 0.9, dist: 58, minDist: 16, maxDist: 90, minAz: -0.8, maxAz: 0.8, minEl: 0.05, maxEl: 1.35, fov: 30, sun: [-30, 90, 60] });
    T3 = V.T;
    G = new T3.Group(); V.scene.add(G);
    ruler = makeRuler(); G.add(ruler);
    makeBook();
    V.tag('knob', '拖橙色旋钮转动');
    var hplane = new T3.Plane(new T3.Vector3(0, 1, 0), -0.1), grab = null;
    function vplane() { return new T3.Plane(new T3.Vector3(0, 0, 1), -(ZR + 0.15)); }
    V.drag = {
      hit: function (ev) { return st.mode === 'len' && !!V.pick(ev, [ruler]); },
      start: function (ev) {
        if (st.mode !== 'len') return false;
        var h = V.pick(ev, [ruler]); if (!h) return false;
        var pl = vertical() ? vplane() : hplane, p = loc(V.onPlane(ev, pl)); if (!p) return false;
        grab = { knob: isKnob(h), pl: pl, p: p, s: { p: st.p, gap: st.gap, lift: st.lift, rot: st.rot }, a0: knobAngle(p) };
        return true;
      },
      move: function (ev) {
        if (!grab) return;
        var p = loc(V.onPlane(ev, grab.pl)); if (!p) return;
        var L = edgeLen(), th = st.rot * Math.PI / 180;
        if (grab.knob) {   // 绕物体一端（或直尺底端）转动；接近 0° 时轻微吸正
          // 只按手转过的角度增量转动（记住按下时的角度），旋钮始终留在手下
          var raw = grab.s.rot + (knobAngle(p) - grab.a0) * 180 / Math.PI;
          if (!vertical() && Math.abs(raw) > 40) { grab = null; st.rot = 0; setDim(st.dim === 'W' ? 'L' : 'W'); return; }   // 转到另一条边：长 ↔ 宽
          var d = clamp(raw, -10, 10); st.rot = Math.abs(d) < 0.4 ? 0 : d;
        } else if (vertical()) {
          st.lift = clamp(grab.s.lift + (p.y - grab.p.y), 0, 4); st.gap = clamp(grab.s.gap + (p.x - grab.p.x), 0, 6);
          if (st.gap < 0.12) st.gap = 0; if (st.lift < 0.08) st.lift = 0;
        } else {
          var dx = p.x - grab.p.x, dz = p.z - grab.p.z;
          st.p = clamp(grab.s.p - (dx * Math.cos(th) - dz * Math.sin(th)), -5, 8);
          st.gap = clamp(grab.s.gap + dz, 0, 6); if (st.gap < 0.12) st.gap = 0;
        }
        changed();
      },
      end: function () { if (!grab) return; grab = null; snap(); }
    };
    V.frame = tick;
  }
  /* 松手吸附：接近正确就吸到正确位置，偏得多就保持原样（方便演示错误） */
  function snap() {
    if (Math.abs(st.rot) < 1.5) st.rot = 0;
    if (st.gap < 0.3) st.gap = 0;
    if (vertical()) { if (st.lift < 0.3) st.lift = 0; }
    else { var r = Math.round(st.p); if (Math.abs(st.p - r) < 0.3 && r >= 0) st.p = r; }
    changed();
  }
  function poseRuler() {
    var th = st.rot * Math.PI / 180, L = edgeLen();
    if (vertical()) {
      var qb = new T3.Quaternion().setFromRotationMatrix(new T3.Matrix4().makeBasis(new T3.Vector3(0, 1, 0), new T3.Vector3(0, 0, 1), new T3.Vector3(1, 0, 0)));
      ruler.quaternion.copy(new T3.Quaternion().setFromAxisAngle(new T3.Vector3(0, 0, 1), th).multiply(qb));
      ruler.position.set(o().L / 2 + st.gap, st.lift, ZR);   // 立在课本右端旁
      knob.position.set(7, 0.16, 1.5); knob.scale.setScalar(0.62);   // 离转轴远一些，转起来不那么灵敏
    } else {
      ruler.rotation.set(0, th, 0);
      var dir = [Math.cos(th), -Math.sin(th)];
      ruler.position.set(-L / 2 - st.p * dir[0], 0, st.gap - st.p * dir[1]);
      knob.position.set(31.6, 0.16, 1.5); knob.scale.setScalar(1);   // 在 30 刻度外，不挡刻度
    }
    var show = st.mode === 'len' && Math.abs(st.rot) >= 1;
    var w = new T3.Vector3(); knob.getWorldPosition(w);   // 标签放在旋钮右侧，不挡旋钮
    V.placeTag('knob', w); var tg = V.tag('knob'); tg.style.transform = 'translate(34px, -50%)'; if (!show) tg.style.display = 'none';
  }

  /* ── 计时：秒表表盘只画一次，之后只更新指针和脉搏 ── */
  /* 脉搏跳动时刻：平均间隔 st.per（每次从复位开始时在约 69～76 次/min 之间取一个，且让 10 下的预计用时和已记录的几次至少差 0.2 s），
     每一下再随机抖动约 ±10%（真实脉搏并不完全等间隔，几次测量结果通常各不相同） */
  function pickPer() {
    for (var k = 0, per; k < 40; k++) {
      per = PERIOD * (0.95 + Math.random() * 0.1);
      if (st.times.every(function (t) { return Math.abs(t - per * 10) >= 0.2; })) break;
    }
    return per;
  }
  var beats = [];
  function idxGE(t) {   // 第一个不早于 t 的跳动序号（按需往后生成跳动时刻）
    while (!beats.length || beats[beats.length - 1] < t) beats.push(beats.length ? beats[beats.length - 1] + (st.per || PERIOD) * (1 + (Math.random() - 0.5) * 0.2) : st.phase);
    var lo = 0, hi = beats.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (beats[m] >= t) hi = m; else lo = m + 1; }
    return lo;
  }
  function beatsIn(a, b) { return Math.max(0, idxGE(b + 1e-9) - idxGE(a)); }
  function lastBeat(t) { var k = idxGE(t + 1e-9) - 1; return k >= 0 ? beats[k] : -1e9; }
  function swElapsed() { var s = st.sw; return s.run ? s.t + (st.sim - s.t0) : s.t; }
  function swRead() { return Math.round(swElapsed() * 10) / 10; }
  function beatCount() { var s = st.sw; return s.start != null ? beatsIn(s.start - 0.25, s.run ? st.sim : s.stop) - 1 : -1; }
  var CX = 860, CY = 440, R = 300, SX = 860, SY = 560, SR = 74;
  function buildTiming() {
    var s = '';
    // 脉搏
    s += '<text x="210" y="150" text-anchor="middle" font-size="28" font-weight="700" fill="#1E3A5F">脉搏</text><text x="210" y="186" text-anchor="middle" font-size="20" fill="#56677D">约 72 次 / min</text>';
    s += '<circle id="p-ring" cx="210" cy="330" r="70" fill="none" stroke="#FE752D" stroke-width="4"/><circle id="p-dot" cx="210" cy="330" r="46" fill="#FE752D"/>';
    s += '<text x="210" y="510" text-anchor="middle" font-size="20" fill="#56677D">秒表和脉搏一起开始，数到第 10 下停</text>';
    for (var i = 0; i <= 10; i++) {
      var x = 50 + (i % 6) * 64, y = 560 + Math.floor(i / 6) * 64;
      s += '<g id="pc' + i + '"><circle cx="' + x + '" cy="' + y + '" r="24" stroke-width="3"/><text x="' + x + '" y="' + (y + 8) + '" text-anchor="middle" font-size="22" font-family="Bahnschrift">' + i + '</text></g>';
    }
    s += '<text id="p-warn" x="210" y="720" text-anchor="middle" font-size="20" fill="#C1361A"></text>';
    // 秒表外壳与表盘
    var w = '<circle cx="' + CX + '" cy="' + (CY - R - 34) + '" r="26" fill="#C3CEDC" stroke="#1E3A5F" stroke-width="4"/><rect x="' + (CX - 18) + '" y="' + (CY - R - 30) + '" width="36" height="34" fill="#C3CEDC" stroke="#1E3A5F" stroke-width="4"/>';
    w += '<circle cx="' + CX + '" cy="' + CY + '" r="' + (R + 18) + '" fill="#E3E8EF" stroke="#1E3A5F" stroke-width="5"/><circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="#fff" stroke="#9FB0C6" stroke-width="2"/>';
    var tk = '', bn = '';   // bn：大表盘数字，画在指针上面（带白色描边），指针停在 0 时也看得清“30”“60"
    for (var j = 0; j < 300; j++) {
      var a = j / 300 * Math.PI * 2, l = j % 10 === 0 ? 30 : j % 5 === 0 ? 20 : 11;
      tk += 'M' + (CX + Math.sin(a) * (R - 6)).toFixed(1) + ' ' + (CY - Math.cos(a) * (R - 6)).toFixed(1) + 'L' + (CX + Math.sin(a) * (R - 6 - l)).toFixed(1) + ' ' + (CY - Math.cos(a) * (R - 6 - l)).toFixed(1);
      // 照课本图 1.1-7：黑字每 2 s 标一次、顶端是 30；里圈红字 31～60（分针过半格后读红字）
      if (j % 20 === 0) { var n = j / 10, bk = n === 0 ? 30 : n; bn += '<text x="' + (CX + Math.sin(a) * (R - 58)) + '" y="' + (CY - Math.cos(a) * (R - 58) + 12) + '" text-anchor="middle" font-size="' + (bk % 10 === 0 ? 34 : 28) + '" font-weight="' + (bk % 10 === 0 ? 700 : 500) + '" font-family="Bahnschrift" fill="#1E3A5F" stroke="#fff" stroke-width="6" paint-order="stroke">' + bk + '</text>' +
        '<text x="' + (CX + Math.sin(a) * (R - 100)) + '" y="' + (CY - Math.cos(a) * (R - 100) + 8) + '" text-anchor="middle" font-size="20" font-family="Bahnschrift" fill="#C1361A" stroke="#fff" stroke-width="5" paint-order="stroke">' + (bk + 30) + '</text>'; }
    }
    w += '<path d="' + tk + '" stroke="#1E3A5F" stroke-width="1.8"/>';
    w += '<circle cx="' + SX + '" cy="' + SY + '" r="' + SR + '" fill="#F7F9FC" stroke="#1E3A5F" stroke-width="2.5"/>';
    var sn = '';
    for (var m = 0; m < 30; m++) { var b = m / 30 * Math.PI * 2, ll = m % 2 === 0 ? 12 : 7; w += '<line x1="' + (SX + Math.sin(b) * (SR - 4)) + '" y1="' + (SY - Math.cos(b) * (SR - 4)) + '" x2="' + (SX + Math.sin(b) * (SR - 4 - ll)) + '" y2="' + (SY - Math.cos(b) * (SR - 4 - ll)) + '" stroke="#1E3A5F" stroke-width="' + (m % 2 ? 1.4 : 2.4) + '"/>'; if (m % 6 === 0) sn += '<text x="' + (SX + Math.sin(b) * (SR - 30)) + '" y="' + (SY - Math.cos(b) * (SR - 30) + 7) + '" text-anchor="middle" font-size="18" font-family="Bahnschrift" fill="#1E3A5F" stroke="#F7F9FC" stroke-width="5" paint-order="stroke">' + (m / 2) + '</text>'; }
    w += '<text x="' + SX + '" y="' + (SY + 34) + '" text-anchor="middle" font-size="14" fill="#56677D">min</text>';
    bn += '<text x="' + CX + '" y="' + (CY - 120) + '" text-anchor="middle" font-size="20" fill="#56677D" stroke="#fff" stroke-width="5" paint-order="stroke">s</text>';
    // 小表盘指针画细一些，数字压在指针上面（带底色描边），指针指着 0 时也看得清“0”
    w += '<line id="h-s" x1="' + SX + '" y1="' + SY + '" stroke="#1E3A5F" stroke-width="3" stroke-linecap="round"/>' + sn + '<circle cx="' + SX + '" cy="' + SY + '" r="6" fill="#1E3A5F"/>';
    w += '<line id="h-b" stroke="#FE752D" stroke-width="5" stroke-linecap="round"/>' + bn + '<circle cx="' + CX + '" cy="' + CY + '" r="11" fill="#FE752D"/>';
    var rx = CX + R * 0.72, ry = CY - R * 0.92;
    // 复位钮：画大一点，外面再套一圈透明的点击区，点起来不落空
    var rs = '<g id="sw-reset" style="cursor:pointer"><circle cx="' + (rx + 40) + '" cy="' + (ry + 10) + '" r="62" fill="transparent"/><rect x="' + rx + '" y="' + ry + '" width="56" height="38" rx="9" transform="rotate(45 ' + (rx + 28) + ' ' + (ry + 19) + ')" fill="#C3CEDC" stroke="#1E3A5F" stroke-width="3"/><text x="' + (rx + 78) + '" y="' + (ry + 10) + '" font-size="24" font-weight="600" fill="#1E3A5F">复位</text></g>';
    svgStage = K.el('<svg class="lk-gl" viewBox="0 0 1330 880" style="background:transparent">' + s + '<g id="sw-crown" style="cursor:pointer">' + w + '</g>' + rs + '</svg>');
    svgStage.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest ? ev.target : null; if (!t) return;
      if (t.closest('#sw-reset')) swReset(); else if (t.closest('#sw-crown')) swToggle();
    });
    ['p-ring', 'p-dot', 'p-warn', 'h-s', 'h-b'].forEach(function (id) { sv[id] = svgStage.querySelector('#' + id); });
    sv.pc = []; for (var q = 0; q <= 10; q++) sv.pc.push(svgStage.querySelector('#pc' + q));
    sv.cnt = null;
  }
  function drawTiming() {
    if (!svgStage) buildTiming();
    var e = swElapsed(), big = (e % 30) / 30 * Math.PI * 2, small = (e / 60) / 15 * Math.PI * 2;
    sv['h-b'].setAttribute('x1', CX - Math.sin(big) * 40); sv['h-b'].setAttribute('y1', CY + Math.cos(big) * 40);
    sv['h-b'].setAttribute('x2', CX + Math.sin(big) * (R - 18)); sv['h-b'].setAttribute('y2', CY - Math.cos(big) * (R - 18));
    sv['h-s'].setAttribute('x2', SX + Math.sin(small) * (SR - 18)); sv['h-s'].setAttribute('y2', SY - Math.cos(small) * (SR - 18));
    var ph = st.sim - lastBeat(st.sim), pulse = Math.max(0, 1 - ph / 0.35);
    sv['p-ring'].setAttribute('r', 70 + 50 * (1 - pulse)); sv['p-ring'].setAttribute('opacity', pulse * 0.8);
    sv['p-dot'].setAttribute('r', 46 + 16 * pulse); sv['p-dot'].setAttribute('opacity', 0.55 + 0.45 * pulse);
    var cnt = beatCount();
    var fr = st.sw.fromReset, ck = cnt + '|' + fr;
    if (ck !== sv.cnt) {   // 没复位就接着计时：不再数圈，只提示先复位（免得和“数满 10 次”的提示同时出现）
      sv.cnt = ck;
      sv.pc.forEach(function (g, i) { var on = fr && i <= cnt, c = g.firstChild; c.setAttribute('fill', on ? '#FE752D' : '#fff'); c.setAttribute('stroke', on ? '#FE752D' : '#C3CEDC'); g.lastChild.setAttribute('fill', on ? '#fff' : '#8A99AD'); });
      sv['p-warn'].textContent = !fr ? '没有复位，先复位再重新数' : cnt > 10 ? '已经数过了 10，应在第 10 次跳动时停表' : '';
    }
  }
  function swToggle() {
    var s = st.sw;
    if (s.run) { s.t = swElapsed(); s.run = false; s.stop = st.sim; }
    else {
      if (s.t === 0) { s.fromReset = true; s.start = st.sim; s.stop = null; st.per = pickPer(); beats = [st.sim]; }   // 从零开始时，脉搏和秒表同时起步：按下的那一下就是第 0 次
      else s.fromReset = false;
      s.run = true; s.t0 = st.sim;
    }
    changed();
  }
  function swReset() { st.sw = { run: false, t: 0, t0: 0, fromReset: true, start: null, stop: null }; changed(); }   // 走着时按复位也直接停下归零

  /* ── 观察窗：起点、终点两处刻度放大（只在变化时重画） ── */
  function scaleWin(center, objSide) {
    var px = 64, w = 360, h = 150, mid = w / 2, s = '', r0 = center - mid / px;
    var x = function (v) { return mid + (v - center) * px; };
    var edge = x(center), gap = Math.min(30, st.gap * 40);
    s += '<rect x="' + (objSide > 0 ? edge : 0) + '" y="' + (78 + gap) + '" width="' + (objSide > 0 ? w - edge : edge) + '" height="' + (h - 78 - gap) + '" fill="' + (st.obj === 'book' ? '#C9D7F3' : '#CFE8D8') + '" stroke="#1E3A5F" stroke-width="2"/>';
    s += '<rect x="0" y="0" width="' + w + '" height="76" fill="#FBFCFD" stroke="#9FB0C6"/>';
    if (st.worn && x(1.93) > 0) s += '<rect x="' + Math.max(0, x(0)) + '" y="0.5" width="' + (x(1.93) - Math.max(0, x(0))) + '" height="75" fill="#DDD7CB"/><text x="' + Math.max(40, (Math.max(0, x(0)) + x(1.93)) / 2) + '" y="22" text-anchor="middle" font-size="15" fill="#8C8270">磨损</text>';
    for (var mm = Math.floor(r0 * 10) - 1; mm <= Math.ceil((r0 + w / px) * 10) + 1; mm++) {
      if (mm < 0 || mm > 300) continue;
      var X = x(mm / 10), l = mm % 10 === 0 ? 46 : mm % 5 === 0 ? 34 : 22, bad = st.worn && mm < 20;
      if (bad) { l *= [0.3, 0.7, 0.45, 0.9, 0.2, 0.6][mm % 6]; s += '<line x1="' + X + '" y1="76" x2="' + X + '" y2="' + (76 - l) + '" stroke="#A9A190" stroke-width="1.5" opacity=".55"/>'; continue; }
      s += '<line x1="' + X + '" y1="76" x2="' + X + '" y2="' + (76 - l) + '" stroke="#1E3A5F" stroke-width="' + (mm % 10 ? 1.5 : 2.6) + '"/>';
      if (mm % 10 === 0 && X > 12 && X < w - 12) s += '<text x="' + X + '" y="22" text-anchor="middle" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + mm / 10 + '</text>';
    }
    s += '<line x1="' + edge + '" y1="20" x2="' + edge + '" y2="' + h + '" stroke="#FE752D" stroke-width="2.5"/>';
    if (st.view !== 'mid') s += '<line x1="' + (edge + (st.view === 'left' ? -60 : 60)) + '" y1="' + h + '" x2="' + (edge + (st.view === 'left' ? 30 : -30)) + '" y2="20" stroke="#FE752D" stroke-width="2" stroke-dasharray="6 5"/>';
    return s;
  }
  // 立起来测厚度：侧面示意。作业本在左，直尺（故意画厚）贴着它，刻度在朝向眼睛的一面；视线经过本子上沿，与刻度面相交处就是读到的刻度
  function scaleWinV() {
    var px = 300, y = function (v) { return 270 - v * px; }, bx = 160, rx = 230, ex = 336, s = '';
    var lift = st.lift || 0, yr = function (v) { return y(v + lift); }, yT = y(edgeLen()), yHit = yr(readEndV());   // 直尺抬起时 0 刻度离开桌面
    s += '<line x1="0" y1="' + y(0) + '" x2="360" y2="' + y(0) + '" stroke="#56677D" stroke-width="3"/><text x="8" y="292" font-size="15" fill="#56677D">桌面</text>';
    s += '<rect x="30" y="' + yT + '" width="' + (bx - 30) + '" height="' + (y(0) - yT) + '" fill="#CFE8D8" stroke="#1E3A5F" stroke-width="2"/><text x="95" y="' + Math.min(y(0) - 8, yT + 26) + '" text-anchor="middle" font-size="15" fill="#1E3A5F">作业本</text>';
    s += '<rect x="' + bx + '" y="0" width="' + (rx - bx) + '" height="' + yr(0) + '" fill="#FBFCFD" stroke="#9FB0C6"/>';
    for (var mm = 0; mm <= 9; mm++) {
      var Y = yr(mm / 10); if (Y < 2) continue;
      var l = mm % 10 === 0 ? 34 : mm % 5 === 0 ? 24 : 15;
      s += '<line x1="' + rx + '" y1="' + Y + '" x2="' + (rx + l) + '" y2="' + Y + '" stroke="#1E3A5F" stroke-width="' + (mm % 5 ? 1.5 : 2.6) + '"/>';
      if (mm === 0) s += '<text x="' + (rx + 40) + '" y="' + (Y + 6) + '" font-size="18" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">0</text>';
    }
    var frac = (rx - bx) / (ex - bx), ey = yT + (yHit - yT) / frac;
    s += '<line x1="' + ex + '" y1="' + ey + '" x2="' + bx + '" y2="' + yT + '" stroke="#FE752D" stroke-width="2.5" stroke-dasharray="7 6"/><circle cx="' + rx + '" cy="' + yHit + '" r="5" fill="#FE752D"/>';
    s += '<g transform="translate(' + ex + ' ' + ey + ')"><path d="M-14 0q14-12 28 0q-14 12-28 0z" fill="#fff" stroke="#1E3A5F" stroke-width="2"/><circle cx="-2" cy="0" r="4.5" fill="#1E3A5F"/></g>';
    return s;
  }
  function drawWins() {
    if (!wins.length) wins = [0, 1].map(function (i) { return K.el('<div class="lk-win" style="top:' + (14 + i * 214) + 'px"><h3><span>' + (i ? '终点' : '起点') + '处放大</span><small></small></h3><svg viewBox="0 0 360 150"></svg></div>'); });
    var show = st.mode === 'len', g = geo();
    var key = [show, f2(g.start), f2(g.end), Math.round(st.gap * 50), st.view, st.obj, st.dim, f2(st.lift || 0), !!st.worn].join('|');
    if (key === winKey) return; winKey = key;
    wins.forEach(function (w) { w.style.display = show ? '' : 'none'; });
    if (!show) return;
    var V2 = vertical();
    wins[0].style.display = V2 ? 'none' : '';
    wins[1].querySelector('h3 span').textContent = V2 ? '本子上沿处放大（侧面看）' : '终点处放大';
    wins[1].style.top = (V2 ? 14 : 228) + 'px';
    wins[1].querySelector('svg').setAttribute('viewBox', V2 ? '0 0 360 300' : '0 0 360 150');
    [V2 ? '' : scaleWin(g.start, 1), V2 ? scaleWinV() : scaleWin(g.end, -1)].forEach(function (svg, i) {
      wins[i].querySelector('h3 small').textContent = (vertical() ? { left: '俯视', mid: '平视', right: '仰视' } : { left: '视线偏左', mid: '视线正对', right: '视线偏右' })[st.view];
      wins[i].querySelector('svg').innerHTML = svg;
    });
  }

  /* ── 每帧 ── */
  function tick(dt) {
    st.sim += dt;
    var len = st.mode === 'len';
    V.renderer.domElement.style.display = len ? '' : 'none';
    if (svgStage) svgStage.style.display = len ? 'none' : '';
    if (len) poseRuler(); else { drawTiming(); V.tag('knob').style.display = 'none'; }
    drawWins(); ui();
  }
  function changed() { if (K.revealed()) K.invalidate(); last = ''; }

  function ui() {
    var hint, tone = '', ok = false, checks, result, ready, recTip, bad = false;
    if (st.mode === 'len') {
      var g = geo(), k = g.ok;
      checks = [{ label: '放正', ok: k.par }, { label: '贴紧', ok: k.tight }, { label: '对准', ok: k.align }, { label: vertical() ? '平视' : '正对', ok: st.view === 'mid' }];
      if (!k.par) hint = vertical() ? '直尺歪了，拖橙色旋钮立直。' : '直尺斜了，拖橙色旋钮转正。';
      else if (!k.tight) hint = vertical() ? '直尺离' + o().name + '还有空隙，向左拖靠拢。' : '直尺离被测边还有空隙，向被测边拖近。';
      else if (!k.align) hint = vertical() ? '直尺抬起来了，向下拖，让 0 刻度线落在桌面。' : st.worn && st.p < 1.99 ? '尺子开头 0～2 cm 磨坏了，看不清刻度。点「从 2 cm 起量」，或左右拖直尺，让 2 cm 刻度线对准课本一端。' : '物体左端没有对准整刻度线。左右拖动直尺，对准 0 或某一整厘米。';
      else if (!k.inRange) hint = '终点超出了 30 cm，换一个小一点的起点刻度。';
      else if (st.view !== 'mid') hint = vertical() ? '俯视、仰视都会读错，读数时要平视。' : '斜着看，读数会偏' + (st.view === 'left' ? '大' : '小') + '。读数时视线要正对刻度线。';
      else if (st.recSig === lenSig()) { hint = '已记入表一。' + nextLen(); tone = 'good'; }
      else { hint = '可以读数了，估读到分度值的下一位。'; tone = 'good'; ok = true; }
      if (!ok && tone !== 'good') tone = 'warn';
      var a = readStart(), b = readEndV(), side = st.view !== 'mid';
      ready = k.par && k.tight && k.align && k.inRange;   // 斜着看也能读，用来看偏差；只有正对才能记录
      bad = side;   // 斜视、俯视仰视读到的数用警示色
      result = side ? (vertical() ? (st.view === 'left' ? '俯视' : '仰视') : (st.view === 'left' ? '视线偏左' : '视线偏右')) + '读到 <b>' + f2(b) + '</b> cm，不能记录'
        : '起点 <b>' + f2(a) + '</b> cm，终点 <b>' + f2(b) + '</b> cm<br>' + o().name + '的' + DIM[st.dim] + '度 = ' + f2(b) + ' − ' + f2(a) + ' = <b>' + f2(b - a) + '</b> cm';
      recTip = ok && K.revealed() ? '记入表一：' + o().name + '的' + DIM[st.dim] + '度' : '';
    } else {
      var s = st.sw, cnt = beatCount(), stopped = !s.run && s.t > 0;
      // 没复位就接着计时时只判“从复位开始”一项，“数满 10 次”不再判，免得两个 ✗ 同时出现
      checks = [{ label: '从复位开始', ok: s.start == null && s.t === 0 ? null : s.fromReset }, { label: '数满 10 次', ok: stopped && s.fromReset ? cnt === 10 : null }, { label: '已停表', ok: stopped ? true : null }];
      if (s.run && !s.fromReset) { hint = '没有复位就接着计时了，示数里还带着上一次的时间。停表后点「复位」重测。'; tone = 'warn'; }
      else if (s.run) hint = '计时中……跟着脉搏数，数到 10 时停表。';
      else if (s.t === 0) hint = '点「开始」：秒表和脉搏一起起步，这一下记作 0。';
      else if (!s.fromReset) { hint = '这次没有从复位开始，先复位再测。'; tone = 'warn'; }
      else if (cnt !== 10) { hint = '数到了 ' + Math.max(0, cnt) + ' 次，应数满 10 次再停。复位后重测。'; tone = 'warn'; }
      else if (s.recorded) { hint = st.times.length >= 3 ? '三次已测完，到「数据」求平均值。' : '已记入第 ' + st.times.length + ' 次。点「复位」，再测一次。'; tone = 'good'; }
      else { hint = '先读小表盘的分，再读大表盘的秒。'; tone = 'good'; ok = true; }
      ready = stopped;
      bad = stopped && (!s.fromReset || cnt !== 10);
      result = !bad ? '秒表示数 <b>' + swRead().toFixed(1) + '</b> s'
        : (!s.fromReset ? '没有复位' : '数了 ' + Math.max(0, cnt) + ' 次') + '读到 <b>' + swRead().toFixed(1) + '</b> s，不能记录';
      recTip = ok && K.revealed() && st.times.length < 3 ? '记入表二第 ' + (st.times.length + 1) + ' 次' : '';
      ok = ok && st.times.length < 3;
    }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: ready, result: result, bad: !!bad });
    var key = [st.mode, ok, K.revealed(), recTip, st.times.length, st.obj, st.dim, st.view, K.S.mode, st.recSig].join('|');
    if (key === last) return; last = key;
    if (st.mode === 'len') { K.setReading('a', K.revealed() ? f2(readStart()) : null); K.setReading('b', K.revealed() ? f2(readEndV()) : null); }
    else K.setReading('s', K.revealed() ? swRead().toFixed(1) : null);
    var rec = ok && K.revealed();
    K.setRecord(rec, recTip, rec ? 'good' : '');
    if (st.mode === 'len') { var n = 0; ['note', 'book'].forEach(function (x) { ['L', 'W', 'H'].forEach(function (d) { if (st.rows[x][d] != null) n++; }); }); K.setCount('表一 ' + n + ' / 6'); }
    else K.setCount('表二 ' + st.times.length + ' / 3');
    syncCtrls();
  }

  /* ── 控件：测什么 + 视线；计时只有开始/停止、复位 ── */
  function ctrls() {
    var len = st.mode === 'len';
    var V2 = vertical();
    K.ctrl.innerHTML = K.grp('测什么', K.seg('md', [['len', '测长度'], ['time', '测时间']])) + (len ?
      K.grp('物体', K.seg('ob', [['book', '课本'], ['note', '作业本']])) +
      K.grp('哪条边', K.seg('dm', [['L', '长'], ['W', '宽'], ['H', '厚（立起来）']])) +
      K.grp('视线', K.seg('vw', V2 ? [['left', '俯视'], ['mid', '平视'], ['right', '仰视']] : [['left', '偏左看'], ['mid', '正对'], ['right', '偏右看']])) +
      K.grp('快捷', K.acts([['auto', '✓', '一键摆好']].concat(V2 ? [] : [['from2', '→', '从 2 cm 起量']])))
      : K.grp('秒表', K.acts([['sw-go', '', '开始', 'main'], ['sw-rs', '↺', '复位']]) + '<p class="hint2">点「开始」时脉搏同时跳第一下，数到第 10 下点「停止」</p>'));
    document.querySelectorAll('[data-md]').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-md')); }; });
    if (len) {
      document.querySelectorAll('[data-ob]').forEach(function (b) { b.onclick = function () { st.obj = b.getAttribute('data-ob'); makeBook(); camFor(); changed(); }; });
      document.querySelectorAll('[data-dm]').forEach(function (b) { b.onclick = function () { setDim(b.getAttribute('data-dm')); }; });
      document.querySelectorAll('[data-vw]').forEach(function (b) { b.onclick = function () { st.view = b.getAttribute('data-vw'); changed(); }; });
      document.getElementById('auto').onclick = function () { st.p = st.worn && !vertical() ? 2 : 0; st.gap = 0; st.rot = 0; st.lift = 0; st.view = 'mid'; changed(); };
      var f2b = document.getElementById('from2'); if (f2b) f2b.onclick = function () { st.p = 2; st.gap = 0; st.rot = 0; changed(); };
    } else {
      document.getElementById('sw-go').onclick = swToggle;
      document.getElementById('sw-rs').onclick = swReset;
    }
    syncCtrls();
  }
  function syncCtrls() {
    document.querySelectorAll('[data-md]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-md') === st.mode); });
    if (st.mode === 'len') {
      document.querySelectorAll('[data-ob]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-ob') === st.obj); });
      document.querySelectorAll('[data-dm]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dm') === st.dim); });
      document.querySelectorAll('[data-vw]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-vw') === st.view); });
    } else {
      var go = document.getElementById('sw-go'); if (go) go.innerHTML = st.sw.run ? '<i>■</i>停止' : '<i>▶</i>开始';

    }
  }
  function setMode(m) {
    st.mode = m; K.showReading('a', m === 'len'); K.showReading('b', m === 'len'); K.showReading('s', m !== 'len');
    var nt = document.getElementById('note1'); if (nt) nt.textContent = noteText();
    ctrls(); changed();
  }
  function noteText() {
    if (st.mode !== 'len') return '点表盘开始 / 停止，右上角小钮复位';
    return vertical() ? '上下拖直尺抬起 / 放下，左右拖靠拢；橙色旋钮立直；拖空白处转视角' : '拖直尺平移、靠拢；拖橙色旋钮转动（多转一些可换到另一条边）；拖空白处转视角';
  }
  function camFor() {
    if (vertical()) { V.orb.el = 0.15; V.orb.az = 0.15; V.orb.dist = 30; V.target.set(o().L / 2 + 5, 2.6, -1); }
    else if (st.dim === 'W') { V.orb.el = 0.95; V.orb.az = 0; V.orb.dist = 69; V.target.set(10, 1, -12); }   // 直尺沿右侧宽边伸向后方
    else { V.orb.el = 0.9; V.orb.az = 0; V.orb.dist = 58; V.target.set(7, 1, -2); }
    V.view();
  }
  function setDim(d) { st.dim = d; makeBook(); camFor(); ctrls(); var nt = document.getElementById('note1'); if (nt) nt.textContent = noteText(); changed(); }

  function preset(i) {
    var P = [
      { mode: 'len', obj: 'book', dim: 'L', p: -1.2, gap: 0.6, rot: 3 },
      { mode: 'len', obj: 'book', dim: 'W', p: 0.6, gap: 0, rot: 0, worn: true },   // 第 2 问：尺头磨坏，磨坏的一段对着课本一端，老师先“从 2 cm 起量”才出读数
      { mode: 'len', obj: 'note', dim: 'H', lift: 0.6, gap: 1.0, rot: 3 },
      { mode: 'len', obj: 'book', dim: 'L', p: 0, gap: 0, rot: 0 },   // 第 4 问：尺已正确放置，只切换视线
      { mode: 'time' }, { mode: 'time' }
    ][i];
    st.view = 'mid'; st.worn = !!P.worn; setWorn(st.worn);
    if (P.mode === 'len') { st.obj = P.obj; st.dim = P.dim; st.p = P.p || 0; st.gap = P.gap; st.rot = P.rot; st.lift = P.lift || 0; makeBook(); camFor(); }
    else swReset();
    setMode(P.mode);
  }

  window.__exp = { st: st, V: function () { return V; }, ruler: function () { return ruler; }, knob: function () { return knob; }, beats: function () { return beats; } };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'a', name: '起点刻度', unit: 'cm' }, { id: 'b', name: '终点刻度', unit: 'cm' }, { id: 's', name: '秒表示数', unit: 's' }],
    calc: { teach: '显示计算' },
    init: function (k) { K = k; build(); ctrls(); K.el('<p class="lk-note" id="note1">' + noteText() + '</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function () { last = ''; },
    record: function () {
      if (st.mode === 'len') { st.rows[st.obj][st.dim] = f2(readEnd() - readStart()); st.recSig = lenSig(); }
      else { st.times.push(swRead()); st.sw.recorded = true; }
      last = '';
    },
    clear: function () { st.rows = { note: { L: null, W: null, H: null }, book: { L: null, W: null, H: null } }; st.times = []; st.recSig = null; st.sw.recorded = false; last = ''; },
    renderData: function (K) {
      var t1 = '<div class="dvh"><h2>表一　长度测量</h2></div><table class="rec"><thead><tr><th>测量对象</th><th>长度/cm</th><th>宽度/cm</th><th>厚度/cm</th></tr></thead><tbody>' +
        ['book', 'note'].map(function (a) { return '<tr><td>' + OBJ[a].name + '</td>' + ['L', 'W', 'H'].map(function (d) { var v = st.rows[a][d]; return '<td class="n' + (v == null ? ' dim' : '') + '">' + (v == null ? '—' : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      var tm = st.times, avg = tm.length ? tm.reduce(function (a, b) { return a + b; }, 0) / tm.length : null;
      var t2 = '<div class="dvh"><h2>表二　时间测量</h2><span>脉搏跳动 10 次所用的时间</span></div><table class="rec"><thead><tr><th style="width:30%">测量内容</th><th>第1次 <span class="m">t</span>/s</th><th>第2次 <span class="m">t</span>/s</th><th>第3次 <span class="m">t</span>/s</th><th>平均值 <span class="m">t</span>/s</th></tr></thead><tbody><tr><td>脉搏跳动 10 次</td>' +
        [0, 1, 2].map(function (i) { return '<td class="n' + (tm[i] == null ? ' dim' : '') + '">' + (tm[i] == null ? '—' : tm[i].toFixed(1)) + '</td>'; }).join('') +
        '<td class="n ' + (K.calcShown() && tm.length === 3 ? 'calc' : 'dim') + '">' + (K.calcShown() && tm.length === 3 ? avg.toFixed(1) : (tm.length === 3 ? '?' : '—')) + '</td></tr></tbody></table>' +
        '<p class="tip">多次测量求平均值可以减小误差，但不能消除误差；放尺不规范、读错属于错误，应先纠正。' + (tm.length === 3 && !K.calcShown() ? '先自己算平均值，再点右侧「显示计算」。' : '') + '</p>';
      return t1 + t2;
    }
  });
})();
