/* 02 测量物体运动的速度：斜面（木板 + 垫木）、刻度尺 0～100 cm、小车、可移动金属片、电子秒表（0.01 s）。
   参数：坡度约 3° 时 a≈0.25 m/s²，0.80 m 用时约 2.53 s、0.40 m 约 1.79 s；坡度越大时间越短；
   每次完整测量加一次 −0.02～+0.01 s 的计时偏差（3° 全程算出的速度总是约 0.32 m/s）；慢放只改播放速度，记录的仍是物理时间。
   记录：金属片在 0.80 m → 全程 s₁；在 0.40 m → 上半段 s₂；从中点静止释放到 0.80 m 单独标记“释放位置：中部”。
     主表用第一次记录时的坡度（不一定是 3°）；之后换了坡度再测，才记到表格下方单独一行（标明坡度）。
   操作：右侧一键选路段（全程 / 上半段 / 下半段·中点放车）；也可直接拖金属片、上下拖垫木改坡度；点小车释放。 */
(function () {
  var MU = 0.02683, BOARD = 120, X0 = 18, CZ = -1.6;   // 木板长 cm；起点线（尺 0 刻度）在板上 X0 处；小车中线 z
  var st = { deg: 3, plate: 80, start: 0, run: false, done: false, pos: 0, v: 0, t: 0, bias: 0, slow: false, sim: 0, rows: { s1: null, s2: null, mid: null }, other: [] };
  var SEG = { s1: { start: 0, plate: 80, name: '全程' }, s2: { start: 0, plate: 40, name: '上半段' }, mid: { start: 40, plate: 80, name: '下半段·中点放车' } };
  var K, V, T3, board, cart, wheels = [], plate, plateHit, block, winEl, winKey = '', last = '';

  function acc(deg) { var th = deg * Math.PI / 180; return Math.max(0.02, 9.8 * (Math.sin(th) - MU * Math.cos(th))); }   // m/s²
  function dist() { return (st.plate - st.start) / 100; }   // m
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function tShow() { return st.done ? st.t + st.bias : st.t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ── 场景 ── */
  function rulerTex() {
    var c = document.createElement('canvas'); c.width = 4096; c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, 4096, 256);
    var px = 4096 / 104;
    g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.textAlign = 'center'; g.font = 'bold 64px Bahnschrift, Arial';
    for (var cm = 0; cm <= 100; cm++) {
      var x = (cm + 2) * px, l = cm % 10 === 0 ? 120 : cm % 5 === 0 ? 86 : 52;
      g.lineWidth = cm % 10 === 0 ? 6 : 3.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, l); g.stroke();
      if (cm % 10 === 0) g.fillText(String(cm), x, 196);
    }
    var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t;
  }
  function woodTex(base, dark) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 128; var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 1024, 128);
    for (var i = 0; i < 26; i++) { g.strokeStyle = dark; g.globalAlpha = 0.08 + Math.random() * 0.1; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * 128; g.moveTo(0, y); g.bezierCurveTo(300, y + (Math.random() - .5) * 20, 700, y + (Math.random() - .5) * 20, 1024, y + (Math.random() - .5) * 10); g.stroke(); }
    var t = new T3.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function roundRect(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  /* 实验室小车：车头（橙色缓冲块）在局部 x = 0，车身向 −x */
  function makeCart() {
    var g = new T3.Group();
    var blue = new T3.MeshStandardMaterial({ color: 0x2F5FC4, roughness: .38, metalness: .1 });
    var body = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(9.4, 2.0, 0.7), { depth: 5.0, bevelEnabled: true, bevelSize: 0.28, bevelThickness: 0.28, bevelSegments: 3, curveSegments: 8 }), blue);
    body.geometry.translate(0, 0, -2.5); body.position.set(-5.1, 2.55, CZ); body.castShadow = true; g.add(body);
    var deck = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(7.4, 4.0, 0.5), { depth: 0.18, bevelEnabled: false }), new T3.MeshStandardMaterial({ color: 0xDDE5EF, roughness: .6 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(-5.1, 3.84, CZ); g.add(deck);
    var stripe = new T3.Mesh(new T3.BoxGeometry(9.2, 0.35, 5.62), new T3.MeshStandardMaterial({ color: 0xF4F7FB, roughness: .5 })); stripe.position.set(-5.1, 2.1, CZ); g.add(stripe);
    var bump = new T3.Mesh(new T3.ExtrudeGeometry(roundRect(4.6, 1.5, 0.45), { depth: 0.7, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2 }), new T3.MeshStandardMaterial({ color: 0xFE752D, roughness: .5 }));
    bump.rotation.y = Math.PI / 2; bump.position.set(-0.85, 2.55, CZ); bump.castShadow = true; g.add(bump);
    var axleM = new T3.MeshStandardMaterial({ color: 0x8C99AA, metalness: .7, roughness: .3 });
    var tireM = new T3.MeshStandardMaterial({ color: 0x27303D, roughness: .85 }), hubM = new T3.MeshStandardMaterial({ color: 0xCBD4DF, metalness: .5, roughness: .35 }), spokeM = new T3.MeshStandardMaterial({ color: 0xFE752D, roughness: .5 });
    [-8.0, -2.2].forEach(function (x) {
      var ax = new T3.Mesh(new T3.CylinderGeometry(0.14, 0.14, 7.2, 10), axleM); ax.rotation.x = Math.PI / 2; ax.position.set(x, 1.05, CZ); g.add(ax);
      [-1, 1].forEach(function (sd) {
        var w = new T3.Group(); w.position.set(x, 1.05, CZ + sd * 3.15);
        var tire = new T3.Mesh(new T3.TorusGeometry(0.78, 0.28, 12, 28), tireM); tire.castShadow = true; w.add(tire);
        var hub = new T3.Mesh(new T3.CylinderGeometry(0.6, 0.6, 0.5, 24), hubM); hub.rotation.x = Math.PI / 2; w.add(hub);
        for (var k = 0; k < 3; k++) { var sp = new T3.Mesh(new T3.BoxGeometry(0.16, 1.0, 0.54), spokeM); sp.rotation.z = k * Math.PI / 3; w.add(sp); }
        wheels.push(w); g.add(w);
      });
    });
    var hit = new T3.Mesh(new T3.BoxGeometry(11, 5, 8), new T3.MeshBasicMaterial({ visible: false })); hit.position.set(-5, 2.4, CZ); g.add(hit);
    g.scale.setScalar(1.45); return g;   // 约 14 cm 长的实验小车
  }
  function build() {
    V = K.three({ target: [64, 6, 0], az: 0.42, el: 0.3, dist: 160, minDist: 80, maxDist: 220, minAz: -0.2, maxAz: 1.1, minEl: 0.08, maxEl: 1.0, fov: 30, sun: [-30, 120, 80] });
    T3 = V.T;
    board = new T3.Group(); V.scene.add(board);   // 局部 x：沿斜面向下；原点 = 木板高端
    var top = new T3.MeshStandardMaterial({ map: woodTex('#E9D6B2', '#8A6A3E'), roughness: .8 }), side = new T3.MeshStandardMaterial({ color: 0xCDB088, roughness: .85 });
    var plank = new T3.Mesh(new T3.BoxGeometry(BOARD, 1.6, 14), [side, side, top, side, side, side]); plank.position.set(BOARD / 2, -0.8, 0); plank.castShadow = true; plank.receiveShadow = true; board.add(plank);
    var rulerM = new T3.Mesh(new T3.PlaneGeometry(104, 2.6), new T3.MeshStandardMaterial({ map: rulerTex(), roughness: .5 }));
    rulerM.rotation.x = -Math.PI / 2; rulerM.position.set(X0 + 50, 0.02, 5.6); board.add(rulerM);
    var startLine = new T3.Mesh(new T3.PlaneGeometry(0.4, 9), new T3.MeshBasicMaterial({ color: 0x1E3A5F })); startLine.rotation.x = -Math.PI / 2; startLine.position.set(X0, 0.03, -1.6); board.add(startLine);
    cart = makeCart(); board.add(cart);
    // 金属片：底座夹在木板上，竖立的挡片
    plate = new T3.Group();
    var steel = new T3.MeshStandardMaterial({ color: 0xBAC5D3, metalness: .65, roughness: .28 });
    var pm = new T3.Mesh(new T3.BoxGeometry(0.4, 6.5, 12), steel); pm.position.set(0.2, 3.25, -0.6); pm.castShadow = true; plate.add(pm);
    var foot = new T3.Mesh(new T3.BoxGeometry(2.6, 0.9, 13), new T3.MeshStandardMaterial({ color: 0x44546A, roughness: .5 })); foot.position.set(1.3, 0.45, -0.3); foot.castShadow = true; plate.add(foot);
    var mark = new T3.Mesh(new T3.BoxGeometry(0.42, 0.4, 2.2), new T3.MeshBasicMaterial({ color: 0x1E3A5F })); mark.position.set(0, 0.06, 5.6); plate.add(mark);
    plateHit = new T3.Mesh(new T3.BoxGeometry(6, 9, 16), new T3.MeshBasicMaterial({ visible: false })); plateHit.position.y = 4; plate.add(plateHit);
    board.add(plate);
    block = new T3.Mesh(new T3.BoxGeometry(8, 1, 10), new T3.MeshStandardMaterial({ map: woodTex('#C9A97A', '#6E5232'), roughness: .8 })); block.castShadow = true; block.receiveShadow = true; V.scene.add(block);
    pose();
    var grab = null, vplane = new T3.Plane(new T3.Vector3(0, 0, 1), -7);
    V.drag = {
      hit: function (ev) { return !st.run && !!V.pick(ev, [plateHit, block, cart]); },
      start: function (ev) {
        if (st.run) return false;
        if (V.pick(ev, [plateHit])) {   // 拖动平面贴着倾斜的板面，金属片跟手
          var th = st.deg * Math.PI / 180;
          grab = { k: 'plate', pl: new T3.Plane().setFromNormalAndCoplanarPoint(new T3.Vector3(Math.sin(th), Math.cos(th), 0), board.position.clone()) };
          var p0 = V.onPlane(ev, grab.pl);   // 记住手和金属片的相对位置，按下时金属片不动
          grab.off = p0 ? board.worldToLocal(p0.clone()).x - (X0 + st.plate) : 0;
          return true;
        }
        if (V.pick(ev, [block])) { var p = V.onPlane(ev, vplane); grab = { k: 'block', y0: p ? p.y : 0, d0: st.deg }; return true; }
        if (V.pick(ev, [cart])) { if (st.done) resetCart(true); else release(); return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        if (grab.k === 'plate') {
          var p = V.onPlane(ev, grab.pl); if (!p) return;
          var local = board.worldToLocal(p.clone());
          st.plate = clamp(Math.round((local.x - X0 - grab.off) * 10) / 10, st.start + 15, 98);
          if (st.done) resetCart(true); changed();
        } else {
          var q = V.onPlane(ev, vplane); if (!q) return;
          st.deg = clamp(Math.round((grab.d0 + (q.y - grab.y0) * 0.6) * 10) / 10, 2, 10);
          if (st.done) resetCart(true); last = '';
        }
      },
      end: function () {   // 金属片松手时，离整 10 cm 不到 1 cm 就吸过去
        if (grab && grab.k === 'plate') { var r = Math.round(st.plate / 10) * 10; if (Math.abs(st.plate - r) < 1 && r >= st.start + 15) { st.plate = r; changed(); } }
        grab = null;
      }
    };
    V.frame = tick;
  }
  function pose() {
    var th = st.deg * Math.PI / 180, h = BOARD * Math.sin(th);
    board.position.set(0, h + 1.6, 0); board.rotation.set(0, 0, -th);
    var x = X0 + st.pos * 100;
    cart.position.set(x, 0, 0);
    wheels.forEach(function (w) { w.rotation.z = -(x - X0) / 1.06; });
    plate.position.set(X0 + st.plate, 0, 0);
    var bh = Math.max(0.5, h + 0.8); block.scale.y = bh; block.position.set(8, bh / 2, 0);
  }

  /* ── 运动 ── */
  function release() {
    if (st.run || st.done) return;
    st.run = true; st.runId = (st.runId || 0) + 1; st.t = 0; st.v = 0; st.bias = Math.round((Math.random() * 0.03 - 0.02) * 100) / 100; last = '';
  }
  function resetCart(keep) { st.run = false; st.done = false; st.t = 0; st.v = 0; st.pos = st.start / 100; if (keep) last = ''; else changed(); }
  function tick(dt) {
    st.sim += dt;
    if (st.run) {
      var step = dt * (st.slow ? 0.25 : 1), a = acc(st.deg), endPos = st.plate / 100;
      st.v += a * step; st.pos += st.v * step; st.t += step;
      if (st.pos >= endPos) { var s = endPos - st.start / 100; st.t = Math.sqrt(2 * s / a); st.pos = endPos; st.run = false; st.done = true; st.v = 0; last = ''; }
    }
    pose(); drawWin(); ui();
  }

  /* ── 观察窗：刻度尺两处放大 + 电子秒表（只在变化时重画） ── */
  function mag(x0, cx, label, mark) {
    var px = 16, w = 168, s = '<g transform="translate(' + x0 + ' 0)"><rect x="0" y="0" width="' + w + '" height="96" rx="6" fill="#FBFCFD" stroke="#9FB0C6"/>';
    for (var cm = Math.floor(cx - 6); cm <= Math.ceil(cx + 6); cm++) {
      if (cm < 0 || cm > 100) continue;
      var X = w / 2 + (cm - cx) * px, l = cm % 10 === 0 ? 34 : cm % 5 === 0 ? 24 : 14;
      if (X < 2 || X > w - 2) continue;
      s += '<line x1="' + X + '" y1="96" x2="' + X + '" y2="' + (96 - l) + '" stroke="#1E3A5F" stroke-width="' + (cm % 5 ? 1.4 : 2.4) + '"/>';
      if (cm % 5 === 0 && X > 16 && X < w - 16) s += '<text x="' + X + '" y="' + (cm % 10 === 0 ? 30 : 46) + '" text-anchor="middle" font-size="' + (cm % 10 === 0 ? 20 : 14) + '" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + cm + '</text>';
    }
    s += '<line x1="' + w / 2 + '" y1="40" x2="' + w / 2 + '" y2="96" stroke="' + mark + '" stroke-width="3"/>';
    s += '<text x="' + w / 2 + '" y="122" text-anchor="middle" font-size="16" fill="#56677D">' + label + '</text></g>';
    return s;
  }
  function drawWin() {
    var t = tShow(), key = [t.toFixed(2), st.start, st.plate, st.run, st.done].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win"><h3><span>读数放大</span><small>刻度尺 · 秒表</small></h3><svg viewBox="0 0 360 250"></svg></div>');
    var s = mag(0, st.start, st.start ? '车头（中点处）' : '车头起点', '#FE752D') + mag(192, st.plate, '金属片', '#1E3A5F');
    s += '<rect x="20" y="140" width="320" height="100" rx="14" fill="#1E3A5F"/><rect x="34" y="152" width="292" height="76" rx="8" fill="#DCE8D2"/>';
    s += '<text x="300" y="210" text-anchor="end" font-size="54" font-family="Bahnschrift" font-weight="700" fill="#1E3A5F">' + t.toFixed(2) + '</text><text x="312" y="210" font-size="20" fill="#1E3A5F">s</text>';
    s += '<text x="46" y="174" font-size="14" fill="#56677D">' + (st.run ? '计时中' : st.done ? '已停止' : '已复位') + '</text>';
    winEl.querySelector('svg').innerHTML = s;
  }

  /* ── 检查与读数：① 读路程 ② 释放小车 ③ 撞到金属片（读时间） ── */
  function rowKey() {
    var near = function (a, b) { return Math.abs(a - b) <= 0.5; };
    if (st.start === 0 && near(st.plate, 80)) return 's1';
    if (st.start === 0 && near(st.plate, 40)) return 's2';
    if (st.start === 40 && near(st.plate, 80)) return 'mid';
    return null;
  }
  /* 主表（全程、上半段）用第一次记录时的坡度，不管是不是 3°；之后换了坡度再测，才单独记到下面一行，免得主表空着 */
  function mainDeg() { var k = ['s1', 's2', 'mid'].filter(function (x) { return st.rows[x]; })[0]; return k ? st.rows[k].deg : null; }
  function std() { var d = mainDeg(); return d == null || Math.abs(st.deg - d) < 0.05; }
  function rowName(rk, deg) { var n = { s1: '全程 s₁', s2: '上半段 s₂', mid: '下半段（中点放车测）' }[rk]; return deg == null ? n : n + '（坡度 ' + K.fmt(deg, 1) + '°）'; }
  function changed() { if (K.revealed()) K.invalidate(); last = ''; }
  function nextSeg() {
    if (!st.rows.s1) return '接着点「全程」测全程。';
    if (!st.rows.s2) return '接着点「上半段」测上半段。';
    return '两组都测完了，到「数据」算各段的平均速度。';
  }
  function ui() {
    var rk = rowKey(), rv = K.revealed(), hint, tone = '';
    // ① 是状态检查（金属片在 80 cm 或 40 cm 处，路程就定了、自动显示），不是“读过了”的动作，免得没操作就打勾
    var checks = [{ label: '① 金属片到位', ok: st.run ? (rk ? true : null) : !!rk }, { label: '② 释放小车', ok: st.run || st.done ? true : null }, { label: '③ 读时间', ok: st.done ? true : null }];
    if (st.run) hint = '小车加速下滑，撞到金属片时秒表停止。';
    else if (st.done && !rk) { hint = '金属片要放在 80 cm（全程）或 40 cm（上半段）才能记入表格。'; tone = 'warn'; }
    else if (st.done && !rv) hint = '秒表已停。再读出路程就可以记录。';
    else if (st.done && st.recRun === st.runId) { hint = st.lastMain ? '已记入表格。' + nextSeg() : '坡度和表中前两行不同，已单独记一行（坡度 ' + K.fmt(st.deg, 1) + '°），和前面的时间比一比。'; tone = 'good'; }
    else if (st.done) { hint = '路程和时间都读好了，可以记录。'; tone = 'good'; }
    else if (K.S.q === 5) hint = st.rows.s1 && st.rows.s2 ? '打开「数据」，先自己算三段的平均速度，再点「显示计算」。' : '先在同一坡度下测出全程和上半段，再到「数据」比较三段的平均速度。';   // 第 6 问：比较数据
    else if (!rv) hint = '先读路程：车头对着的刻度到金属片的刻度。';
    else if (!rk) { hint = '金属片放在 80 cm（全程）或 40 cm（上半段）处，测出的数据才能记入表格。'; tone = 'warn'; }
    else if (K.S.q === 0) hint = '先在读数放大窗里读出路程（车头起点到金属片），再点小车或「释放小车」。';
    else hint = '点小车或「释放小车」，让它从静止开始下滑。';
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: !st.run, result: '路程 <span class="m">s</span> = ' + (st.start ? f1(st.plate) + ' cm − ' + f1(st.start) + ' cm' : f1(st.plate) + ' cm') + ' = <b>' + dist().toFixed(3) + '</b> m' });
    var ok = st.done && !!rk && st.recRun !== st.runId;
    var key = [ok, rv, st.done, st.run, st.recRun, st.slow, st.deg, st.start, st.plate, K.S.mode, Object.keys(st.rows).map(function (k) { return st.rows[k] ? 1 : 0; }).join('')].join('|');
    if (key === last) return; last = key;
    K.setReading('s', rv ? dist().toFixed(3) : null);
    K.setReading('t', st.done ? tShow().toFixed(2) : null);
    var rec = ok && rv;
    K.setRecord(rec, rec ? '记入「' + rowName(rk, std() ? null : st.deg) + '」一行' + (std() ? '' : '（单独一行，不覆盖 3° 的数据）') : '', rec ? 'good' : '');
    K.setCount((st.rows.s1 ? 1 : 0) + (st.rows.s2 ? 1 : 0) + ' / 2 组');
    syncCtrls();
  }

  /* ── 控件：路段（选择）→ 坡度（滑杆）→ 小车（释放 / 复位）→ 显示（慢放开关） ── */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('路段', K.seg('seg', Object.keys(SEG).map(function (k) { return [k, SEG[k].name]; }))) +
      K.grp('斜面', '<div class="row"><span class="nm">坡度</span><input class="rng" type="range" id="s-deg" min="2" max="10" step="0.1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-deg"></span><span class="un">°</span></div>') +
      K.grp('小车', K.acts([['go', '▶', '释放小车', 'main']])) +
      K.grp('播放', '<div class="acts">' + K.sw('slow', '慢放', '开', '关', st.slow) + '</div>');
    document.querySelectorAll('[data-seg]').forEach(function (b) { b.onclick = function () { if (st.run) return; var s = SEG[b.getAttribute('data-seg')]; st.start = s.start; st.plate = s.plate; resetCart(); }; });
    document.querySelector('[data-seg="mid"]').style.flex = '2.4';   // “下半段·中点放车”字多，给宽一点，不被截断
    var dg = document.getElementById('s-deg'); K.rng(dg);
    dg.addEventListener('input', function () { st.deg = parseFloat(dg.value); if (st.done) resetCart(true); last = ''; });
    document.getElementById('go').onclick = function () { if (st.run) return; if (st.done) resetCart(true); else release(); };
    document.getElementById('slow').onclick = function () { st.slow = !st.slow; last = ''; };
  }
  function syncCtrls() {
    var dg = document.getElementById('s-deg'), rk = rowKey();
    if (document.activeElement !== dg) dg.value = st.deg;
    dg.disabled = st.run; dg.style.setProperty('--p', ((dg.value - dg.min) / (dg.max - dg.min) * 100) + '%');
    document.getElementById('v-deg').textContent = K.fmt(st.deg, 1);
    document.querySelectorAll('[data-seg]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-seg') === rk); b.disabled = st.run; });
    var go = document.getElementById('go'); go.innerHTML = st.run ? '<i>■</i>运动中……' : st.done ? '<i>↺</i>小车复位' : '<i>▶</i>释放小车'; go.disabled = st.run; go.classList.toggle('main', !st.done);
    K.setSw('slow', st.slow);
  }

  function preset(i) {
    var P = ['s1', 's1', 's2', 'mid', 's1', 's1'][i], s = SEG[P];
    st.deg = 3; st.plate = s.plate; st.start = s.start; st.slow = false; resetCart();   // 第 5 问也从 3° 起，由学生加大坡度
  }

  window.__exp = { st: st, V: function () { return V; }, cart: function () { return cart; }, plate: function () { return plate; }, board: function () { return board; } };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 's', name: '路程 <span class="m">s</span>', unit: 'm' }, { id: 't', name: '时间 <span class="m">t</span>', unit: 's' }],
    calc: { teach: '显示计算' },
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">点小车释放；可拖金属片改终点、上下拖垫木改坡度；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function () { last = ''; },
    record: function () {
      var rk = rowKey(); if (!rk) return;
      var r = { s: dist(), t: Math.round(tShow() * 100) / 100, deg: st.deg, rk: rk };
      st.lastMain = std();
      if (st.lastMain) st.rows[rk] = r;
      else { st.other = st.other.filter(function (x) { return !(x.rk === rk && Math.abs(x.deg - st.deg) < 0.05); }); st.other.push(r); }   // 同一路段、同一坡度只留最新一次
      st.recRun = st.runId; last = '';
    },
    clear: function () { st.rows = { s1: null, s2: null, mid: null }; st.other = []; last = ''; },
    renderData: function (K) {
      var r = st.rows, c = K.calcShown();
      var sameDeg = !(r.s1 && r.s2) || Math.abs(r.s1.deg - r.s2.deg) < 0.05;
      var s3 = r.s1 && r.s2 && sameDeg ? { s: r.s1.s - r.s2.s, t: Math.round((r.s1.t - r.s2.t) * 100) / 100 } : null;
      function v(x) { return x ? (x.s / x.t).toFixed(2) : null; }
      function row(name, x, derived) {
        var vv = v(x);
        if (derived && !x) return '<tr><td>' + name + '</td><td colspan="4" class="dim" style="text-align:center">测出全程和上半段后，相减得出</td></tr>';
        return '<tr><td>' + name + '</td><td class="n' + (x ? '' : ' dim') + '">' + (x ? K.fmt(x.deg != null ? x.deg : r.s1.deg, 1) : '—') + '</td><td class="n' + (x ? (derived ? ' calc' : '') : ' dim') + '">' + (x ? (derived && !c ? '?' : x.s.toFixed(3)) : '—') + '</td>' +
          '<td class="n' + (x ? (derived ? ' calc' : '') : ' dim') + '">' + (x ? (derived && !c ? '?' : x.t.toFixed(2)) : '—') + '</td>' +
          '<td class="n ' + (x && c ? 'calc' : 'dim') + '">' + (x ? (c ? vv : '?') : '—') + '</td></tr>';
      }
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec"><thead><tr><th style="width:30%">路段</th><th>坡度/°</th><th>路程 <span class="m">s</span>/m</th><th>运动时间 <span class="m">t</span>/s</th><th>平均速度 <span class="m">v</span>/(m·s⁻¹)</th></tr></thead><tbody>' +
        row('全程 <span class="m">s</span>₁', r.s1) + row('上半段 <span class="m">s</span>₂', r.s2) + row('下半段 <span class="m">s</span>₃ = <span class="m">s</span>₁ − <span class="m">s</span>₂', s3, true) +
        (r.mid ? row('下半段（中点放车测）', r.mid) : '') + st.other.map(function (x) { return row(rowName(x.rk) + '（换坡度）', x); }).join('') + '</tbody></table>' +
        (sameDeg ? '' : '<p class="tip warn">全程（' + K.fmt(r.s1.deg, 1) + '°）和上半段（' + K.fmt(r.s2.deg, 1) + '°）的坡度不同，不能相减求下半段。请在同一坡度下重测其中一组。</p>') +
        (r.mid && s3 ? '<p class="tip">比一比两种“下半段”：中点放车时小车从静止出发，用时比 <span class="m">t</span>₁ − <span class="m">t</span>₂ 长，所以下半段要用相减的方法求。</p>' : '') +
        '<p class="tip">坡度不限于 3°，但全程和上半段要在同一坡度下测。<span class="m">t</span>₃ = <span class="m">t</span>₁ − <span class="m">t</span>₂。' +
        (c ? '' : '先自己算出各段平均速度，再点右侧「显示计算」。') + '</p>';
    }
  });
})();
