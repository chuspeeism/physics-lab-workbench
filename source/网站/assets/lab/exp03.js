/* 03 用常见温度计测量温度：三杯水 + 实验室温度计（测量范围 −20～110 ℃，分度值 1 ℃，课本图 3.1-3）。
   参数：冷水 12 ℃、温水 38 ℃、热水 76 ℃（每分钟降约 0.5 ℃），室温 22 ℃；
   插入后约 8 s 稳定；碰底 / 碰壁示数偏向室温 3 ℃；俯视偏大、仰视偏小。
   操作：直接拖温度计——可以提起、移到任一杯上方、放进水里、碰底碰壁；点烧杯或右侧杯名一键放进该杯。 */
(function () {
  var CUPS = { cold: { name: '冷水', x: -24, t0: 12, water: 0x8EC2F2, tag: '#3F6FD1' }, warm: { name: '温水', x: 0, t0: 38, water: 0xA9D8DE, tag: '#3A9188' }, hot: { name: '热水', x: 24, t0: 76, water: 0xF2B796, tag: '#D2604F' } };
  var ROOM = 22, SURF = 10.2, BOTTOM = 0.45, RIM = 15, R_IN = 5.4, BR = 0.55, LEN = 21, COL0 = 1.8, COLL = 16;
  var st = { table: true, x: 0, y: 20, view: 'level', T: ROOM, sim: 0, prep: 0, stableFor: 0, wasIn: false, rows: { cold: {}, warm: {}, hot: {} } };   // 每杯水按视线分三栏：level 平视 / down 俯视 / up 仰视
  var K, V, T3, therm, col, cupsMesh = {}, steam = [], winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cupAt(x) { var best = null; Object.keys(CUPS).forEach(function (k) { if (Math.abs(x - CUPS[k].x) < 8) best = k; }); return best; }
  var WALL_OUT = 6 + BR + 0.05;   // 玻璃泡中心离杯心小于它就会碰到杯壁外侧
  function cupIn(x) { var best = null; Object.keys(CUPS).forEach(function (k) { if (Math.abs(x - CUPS[k].x) <= R_IN - BR + 0.01) best = k; }); return best; }   // 玻璃泡在这只杯的杯口正上方 / 杯内
  function waterT(c) { return c === 'hot' ? CUPS.hot.t0 - 0.5 * (st.sim - st.prep) / 60 : CUPS[c].t0; }
  function geom() {
    if (st.table) return { w: 'table' };
    var c = cupIn(st.x), bot = st.y, top = bot + 2.4 * BR;
    if (!c || bot >= SURF - 0.05) return { w: 'air', c: c || cupAt(st.x) };
    if (top > SURF - 0.25) return { w: 'partial', c: c };
    if (bot <= BOTTOM + 0.08) return { w: 'bottom', c: c };
    if (Math.abs(st.x - CUPS[c].x) >= R_IN - BR - 0.06) return { w: 'wall', c: c };
    return { w: 'ok', c: c };
  }
  function target() {
    var g = geom(), w;
    if (g.w === 'table' || g.w === 'air') return ROOM;
    w = waterT(g.c);
    if (g.w === 'partial') return w * 0.55 + ROOM * 0.45;
    if (g.w === 'bottom' || g.w === 'wall') return w + (ROOM > w ? 3 : -3);
    return w;
  }
  function recSig() { var g = geom(); return g.c + '|' + st.view + '|' + viewVal(); }
  function done(k) { return st.rows[k] && st.rows[k].level != null; }   // 这杯水的平视（正确）读数记过了
  var VN = { level: '平视', down: '俯视', up: '仰视' };
  function stable() { return st.stableFor >= 1; }
  function viewVal() { return readVal() + (st.view === 'down' ? 2 : st.view === 'up' ? -2 : 0); }   // 俯视偏大、仰视偏小
  function readVal() { return Math.round(st.T); }

  /* ── 场景 ── */
  function tickTexture() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 2048;
    var g = c.getContext('2d'); g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 128, 2048);
    g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 34px Bahnschrift, Arial'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (var t = -20; t <= 110; t++) {
      var y = 2048 - 40 - (t + 20) / 130 * (2048 - 80), len = t % 10 === 0 ? 46 : t % 5 === 0 ? 34 : 20;
      g.lineWidth = t % 5 === 0 ? 4 : 2.5; g.beginPath(); g.moveTo(0, y); g.lineTo(len, y); g.stroke();
      if (t % 20 === 0) g.fillText(String(t), 124, y);
    }
    var tex = new T3.CanvasTexture(c); tex.anisotropy = 8; return tex;
  }
  function build() {
    V = K.three({ target: [11, 12, 4], az: 0, el: 0.2, dist: 106, minDist: 60, maxDist: 160, minAz: -0.7, maxAz: 0.7, minEl: 0.05, maxEl: 0.9 });
    T3 = V.T; var S = V.scene;
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .2, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var rim = new T3.MeshStandardMaterial({ color: 0x9FB3CC, roughness: .4 });
    Object.keys(CUPS).forEach(function (k) {
      var c = CUPS[k], g = new T3.Group(); g.position.x = c.x;
      var wall = new T3.Mesh(new T3.CylinderGeometry(6, 6, RIM, 48, 1, true), glass); wall.position.y = RIM / 2; g.add(wall);
      var base = new T3.Mesh(new T3.CylinderGeometry(6, 6, 0.4, 48), glass); base.position.y = 0.2; g.add(base);
      var lip = new T3.Mesh(new T3.TorusGeometry(6, 0.18, 8, 48), rim); lip.rotation.x = Math.PI / 2; lip.position.y = RIM; g.add(lip);
      var water = new T3.Mesh(new T3.CylinderGeometry(5.75, 5.75, SURF - 0.4, 48), new T3.MeshPhongMaterial({ color: c.water, transparent: true, opacity: .62, shininess: 60, emissive: c.water, emissiveIntensity: .18, depthWrite: false }));
      water.position.y = 0.4 + (SURF - 0.4) / 2; g.add(water);
      var surf = new T3.Mesh(new T3.CircleGeometry(5.75, 48), new T3.MeshPhongMaterial({ color: c.water, transparent: true, opacity: .7, shininess: 120, depthWrite: false }));
      surf.rotation.x = -Math.PI / 2; surf.position.y = SURF; g.add(surf);
      for (var i = 1; i <= 5; i++) { var m = new T3.Mesh(new T3.BoxGeometry(1.6, 0.12, 0.05), rim); m.position.set(-2.5, i * 2.4, 5.98); g.add(m); }
      var hit = new T3.Mesh(new T3.CylinderGeometry(6.5, 6.5, RIM + 1, 16), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = RIM / 2; hit.userData.cup = k; g.add(hit);
      var sc = new T3.Mesh(new T3.CylinderGeometry(6, 6, RIM, 24), new T3.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); sc.position.y = RIM / 2; sc.castShadow = true; g.add(sc);
      cupsMesh[k] = hit; S.add(g);
      V.tag('cup-' + k, '<i style="background:' + c.tag + '"></i>' + c.name);
    });
    for (var s = 0; s < 7; s++) {
      var p = new T3.Mesh(new T3.SphereGeometry(1.2 + Math.random(), 12, 10), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      p.userData = { ph: s / 7, dx: (Math.random() - .5) * 6, dz: (Math.random() - .5) * 4 }; S.add(p); steam.push(p);
    }
    // 温度计：局部原点 = 玻璃泡底部，总长 21 cm（与 15 cm 高的烧杯成比例）
    therm = new T3.Group();
    var tubeM = new T3.MeshPhongMaterial({ color: 0xF4F8FC, transparent: true, opacity: .5, shininess: 100, depthWrite: false });
    var tube = new T3.Mesh(new T3.CylinderGeometry(0.36, 0.36, LEN - 1, 20), tubeM); tube.position.y = 1 + (LEN - 1) / 2; therm.add(tube);
    var cap = new T3.Mesh(new T3.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), tubeM); cap.position.y = LEN; therm.add(cap);
    var back = new T3.Mesh(new T3.PlaneGeometry(0.66, COLL + 1.2), new T3.MeshBasicMaterial({ map: tickTexture() }));
    back.position.set(0, COL0 + COLL / 2, -0.17); therm.add(back);
    var red = new T3.MeshStandardMaterial({ color: 0xD8322A, roughness: .35 });
    var bulb = new T3.Mesh(new T3.SphereGeometry(BR, 24, 16), red); bulb.scale.y = 1.2; bulb.position.y = BR * 1.2; bulb.castShadow = true; therm.add(bulb);
    col = new T3.Mesh(new T3.CylinderGeometry(0.14, 0.14, 1, 12), red); col.position.z = 0.06; therm.add(col);
    var hit = new T3.Mesh(new T3.CylinderGeometry(2, 2, LEN + 2, 8), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = LEN / 2; therm.add(hit);
    S.add(therm);
    // 拖动：温度计可任意提起、移动、放入
    var plane = new T3.Plane(new T3.Vector3(0, 0, 1), 0), grab = null;
    V.drag = {
      hit: function (ev) { return !!(V.pick(ev, [hit]) || V.pick(ev, Object.keys(cupsMesh).map(function (k) { return cupsMesh[k]; }))); },
      start: function (ev) {
        if (V.pick(ev, [hit])) {
          var p = V.onPlane(ev, plane);
          // 从桌上拿起：手捏在温度计中部（玻璃泡上方 10 cm），先提到杯口以上
          // 从桌上拿起：就地立起来（玻璃泡落在桌面，避开烧杯），按下点与温度计的相对位置之后保持不变——拖动跟手，竖直方向直接对应深度
          if (st.table) {
            var x0 = p ? clamp(p.x, -36, 31) : -14;
            Object.keys(CUPS).forEach(function (k) { var d = x0 - CUPS[k].x; if (Math.abs(d) < WALL_OUT) x0 = CUPS[k].x + (d < 0 ? -WALL_OUT : WALL_OUT); });
            // 手就捏在玻璃泡处（dx = 0）：光标低于桌面时温度计先停在桌面上，光标一抬高就跟着走；正对烧杯时被杯壁挡在杯旁
            st.table = false; st.x = x0; st.y = 0; grab = { dy: BR * 1.2, dx: 0 }; changed(); return true;
          }
          grab = p ? { dy: p.y - st.y, dx: p.x - st.x } : { dy: 8, dx: 0 };
          return true;
        }
        var c = V.pick(ev, Object.keys(cupsMesh).map(function (k) { return cupsMesh[k]; }));
        if (c && c.object.userData.cup) { putIn(c.object.userData.cup); return true; }
        return false;
      },
      move: function (ev) { if (!grab) return; var p = V.onPlane(ev, plane); if (!p) return; moveTo(p.x - grab.dx, p.y - grab.dy); },
      end: function () { grab = null; }
    };
    V.frame = tick;
  }
  /* 移动约束：温度计可以在杯外上下左右自由移动（最低到桌面），但不能穿过杯壁、杯底；只能从杯口上方放进杯里 */
  function moveTo(x, y) {
    x = clamp(x, -36, 31); y = clamp(y, 0, RIM + 6);
    var inC = !st.table && st.y < RIM + 0.3 ? cupIn(st.x) : null, above = st.table || st.y >= RIM + 0.3;
    if (y < RIM + 0.3) {
      if (inC) { x = clamp(x, CUPS[inC].x - (R_IN - BR), CUPS[inC].x + (R_IN - BR)); y = Math.max(BOTTOM, y); }
      else if (above) {   // 从杯口上方往下放：正对杯口就进杯，压在杯沿上就停在杯沿上方
        var c = cupAt(x);
        if (c && Math.abs(x - CUPS[c].x) <= R_IN - BR) y = Math.max(BOTTOM, y);
        else if (c && Math.abs(x - CUPS[c].x) < WALL_OUT) y = RIM + 0.3;
      } else {   // 在杯外、杯沿以下横着移：被杯壁挡住
        Object.keys(CUPS).forEach(function (k) {
          var cx = CUPS[k].x;
          if (st.x <= cx - WALL_OUT + 1e-6 && x > cx - WALL_OUT) x = cx - WALL_OUT;
          if (st.x >= cx + WALL_OUT - 1e-6 && x < cx + WALL_OUT) x = cx + WALL_OUT;
        });
      }
    }
    st.x = x; st.y = y; changed();
  }
  function putIn(k) { st.table = false; st.x = CUPS[k].x; st.y = 4.5; changed(); }

  /* ── 每帧 ── */
  function tick(dt) {
    st.sim += dt;
    // 液柱指数趋近目标温度；差到 0.25 ℃ 以内就停在目标上（示数不再跳），再保持 1 s 算稳定（插入后约 8 s）
    var tg = target();
    st.T += (tg - st.T) * (1 - Math.exp(-dt / 1.3));
    if (Math.abs(st.T - tg) < 0.25) { st.T = tg; st.stableFor += dt; } else st.stableFor = 0;
    var g = geom();
    // 示数变了就收起读数；取出后例外：结果框跟着液柱实时变化，演示“离开水后示数马上变”
    if (K.revealed() && K._revealedAt != null && Math.abs(readVal() - K._revealedAt) >= 1 && g.w !== 'air') K.invalidate(); if (g.w === 'ok' || g.w === 'bottom' || g.w === 'wall' || g.w === 'partial') st.wasIn = true;
    if (st.table) { therm.position.set(-11, 0.75, 15); therm.rotation.set(0, 0, -Math.PI / 2); }
    else { therm.position.set(st.x, st.y, 0); therm.rotation.set(0, 0, 0); }
    var h = Math.max(0.05, (st.T + 20) / 130 * COLL + (COL0 - 1.2));
    col.scale.y = h; col.position.y = 1.2 + h / 2;
    steam.forEach(function (p) {
      var u = p.userData; u.ph = (u.ph + dt / 3.2) % 1;
      p.position.set(CUPS.hot.x + u.dx * (0.6 + u.ph), SURF + 1 + u.ph * 14, u.dz);
      p.material.opacity = 0.5 * Math.sin(u.ph * Math.PI); p.scale.setScalar(0.8 + u.ph * 1.6);
    });
    Object.keys(CUPS).forEach(function (k) {   // 温度计在哪只杯上，就先藏起那只杯的名字标签，免得挡住温度计
      V.placeTag('cup-' + k, new T3.Vector3(CUPS[k].x, 17.6, 0));
      if (!st.table && Math.abs(st.x - CUPS[k].x) < 7) V.tag('cup-' + k).style.display = 'none';
    });
    drawWin(); ui();
  }

  /* ── 观察窗（只在读数或视线变化时重画） ── */
  function drawWin() {
    var T = st.T, key = [Math.round(T * 20), st.view, st.table].join('|');
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win"><h3><span></span><small></small></h3><svg viewBox="0 0 360 230"></svg><p class="cap"></p></div>');
    var svg = '', t1, t2, cap;
    if (st.table) {
      var x0 = 24, x1 = 336, px = function (t) { return x0 + (t + 20) / 130 * (x1 - x0); };
      // 上：整支温度计的刻度（每 10 ℃ 标数，两端是最低、最高刻度）；下：20～30 ℃ 局部放大，一小格数得清。不直接写出测量范围和分度值，留给学生读
      svg += '<rect x="14" y="40" width="332" height="58" rx="8" fill="#FBFCFD" stroke="#1E3A5F" stroke-width="2"/>';
      for (var t = -20; t <= 110; t++) { var X = px(t), l = t % 10 === 0 ? 22 : t % 5 === 0 ? 15 : 9; svg += '<line x1="' + X + '" y1="44" x2="' + X + '" y2="' + (44 + l) + '" stroke="#1E3A5F" stroke-width="' + (t % 5 ? 1 : 1.8) + '"/>'; if (t % 10 === 0) svg += '<text x="' + X + '" y="32" text-anchor="middle" font-size="13" font-family="Bahnschrift" fill="#1E3A5F">' + t + '</text>'; }
      svg += '<rect x="' + x0 + '" y="82" width="' + (px(T) - x0) + '" height="7" rx="3" fill="#D8322A"/><circle cx="' + (x0 - 4) + '" cy="85.5" r="8" fill="#D8322A"/>';
      var zx = function (tt) { return 40 + (tt - 20) * 28; };
      svg += '<text x="14" y="124" font-size="14" fill="#56677D">局部放大（20～30 ℃）</text><rect x="14" y="132" width="332" height="70" rx="8" fill="#FBFCFD" stroke="#9FB3CC" stroke-width="2"/>';
      for (var z = 20; z <= 30; z++) { var ZX = zx(z), zl = z % 10 === 0 ? 30 : z % 5 === 0 ? 22 : 14; svg += '<line x1="' + ZX + '" y1="136" x2="' + ZX + '" y2="' + (136 + zl) + '" stroke="#1E3A5F" stroke-width="' + (z % 5 ? 1.6 : 2.6) + '"/>'; if (z % 5 === 0) svg += '<text x="' + ZX + '" y="197" text-anchor="middle" font-size="16" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + z + '</text>'; }
      svg += '<rect x="14" y="170" width="' + (clamp(zx(T), 14, 346) - 14) + '" height="6" rx="3" fill="#D8322A"/>';
      t1 = '温度计刻度'; t2 = '看测量范围和分度值'; cap = '拖动温度计，放进一杯水里';
    } else {
      // 示意：玻璃管（液柱）在左，刻度在液柱和眼睛之间，视线从眼睛经过液柱顶端，与刻度相交处就是“读到的刻度”
      var mid = 115, k = 10, colX = 68, sx = 118, ex = 300, y = function (tt) { return mid - (tt - T) * k; };
      svg += '<rect x="' + (colX - 8) + '" y="0" width="16" height="230" rx="8" fill="#EEF4FA" stroke="#9FB3CC"/><rect x="' + (colX - 5) + '" y="' + mid + '" width="10" height="' + (230 - mid) + '" fill="#D8322A"/><rect x="' + (colX - 5) + '" y="' + (mid - 3) + '" width="10" height="6" rx="3" fill="#D8322A"/>';
      svg += '<rect x="' + sx + '" y="0" width="74" height="230" fill="#FBFCFD" stroke="#C3CEDC"/>';
      for (var t2i = Math.floor(T - 12); t2i <= Math.ceil(T + 12); t2i++) {
        var Y = y(t2i); if (Y < -2 || Y > 232) continue;
        var ln = t2i % 10 === 0 ? 24 : t2i % 5 === 0 ? 18 : 10;
        svg += '<line x1="' + sx + '" y1="' + Y + '" x2="' + (sx + ln) + '" y2="' + Y + '" stroke="#1E3A5F" stroke-width="' + (t2i % 5 ? 1.3 : 2.4) + '"/>';
        if (t2i % 5 === 0) svg += '<text x="' + (sx + 30) + '" y="' + (Y + 6) + '" font-size="18" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + t2i + '</text>';
      }
      var off = viewVal() - readVal(), frac = (sx - colX) / (ex - colX), ey = mid - off * k / frac, hitY = mid - off * k;
      svg += '<line x1="' + ex + '" y1="' + ey + '" x2="' + colX + '" y2="' + mid + '" stroke="#FE752D" stroke-width="2.5" stroke-dasharray="7 6"/>';
      svg += '<circle cx="' + sx + '" cy="' + hitY + '" r="5" fill="#FE752D"/>';
      svg += '<g transform="translate(' + ex + ' ' + ey + ')"><path d="M-16 0q16-13 32 0q-16 13-32 0z" fill="#fff" stroke="#1E3A5F" stroke-width="2"/><circle cx="-2" cy="0" r="5" fill="#1E3A5F"/></g>';
      t1 = '液柱顶端放大'; t2 = { level: '平视', down: '俯视', up: '仰视' }[st.view];
      cap = st.view === 'level' ? '视线与液柱上表面相平，橙点就是读数' : (st.view === 'down' ? '俯视：视线经过液柱顶端，对着的刻度偏大' : '仰视：视线经过液柱顶端，对着的刻度偏小');
    }
    winEl.querySelector('h3 span').textContent = t1; winEl.querySelector('h3 small').textContent = t2;
    winEl.querySelector('svg').innerHTML = svg; winEl.querySelector('.cap').textContent = cap;
  }

  /* ── 检查清单、读数、记录 ── */
  function changed() { if (K.revealed()) K.invalidate(); last = ''; }
  function ui() {
    var g = geom(), stab = stable(), immersed = ['ok', 'bottom', 'wall'].indexOf(g.w) >= 0;
    var checks = [
      { label: '浸没', ok: immersed ? true : (g.w === 'partial' || (g.w === 'air' && st.wasIn) ? false : null) },
      { label: '不碰杯底杯壁', ok: immersed ? g.w === 'ok' : null },
      { label: '稳定', ok: immersed ? (stab ? true : null) : null },
      { label: '平视', ok: st.view === 'level' }
    ];
    var hint, tone = '';
    var qStep = ['', '', '', '再点「取出」，看液柱怎样变化。', '再切换俯视、仰视，比较读数。', '再把温度计往下拖到杯底，比较示数。'][K.S.q] || '';   // 第 4～6 问接着提示本问的操作
    if (g.w === 'table') hint = K.S.q === 1 ? '先看右上方的刻度放大图：最低、最高刻度各是多少？相邻两条刻度线之间是几摄氏度？' : '点一杯水或直接拖动温度计，把玻璃泡放进水里。';
    else if (g.w === 'air') { hint = st.wasIn ? '温度计离开了水，液柱正向室温变化。读数时要留在水中。' : '把玻璃泡放进水里。'; tone = st.wasIn ? 'warn' : ''; }
    else if (g.w === 'partial') { hint = '玻璃泡只浸了一部分，再往下放一些。'; tone = 'warn'; }
    else if (g.w === 'bottom') { hint = '碰到杯底了，示数会偏离水温。往上提一点。'; tone = 'warn'; }
    else if (g.w === 'wall') { hint = '碰到杯壁了，示数会偏离水温。移回中间。'; tone = 'warn'; }
    else if (!stab) hint = '液柱还在变化，等它停下来。';
    else if (st.recSig === recSig() && st.view !== 'level') { hint = '已记入「' + CUPS[g.c].name + '·' + VN[st.view] + '」一栏。换成平视再读一次，比一比。'; tone = 'good'; }
    else if (st.view !== 'level') { hint = (st.view === 'down' ? '俯视读数偏大' : '仰视读数偏小') + '。可以记到表格的「' + VN[st.view] + '」一栏，和平视读数对比。'; tone = 'warn'; }
    else if (st.recSig === recSig()) { var left = Object.keys(CUPS).filter(function (k) { return !done(k); }); hint = '已记入「' + CUPS[g.c].name + '」。' + (qStep || (left.length ? '把温度计放进' + CUPS[left[0]].name + '。' : '三杯都测完了，到「数据」查看。')); tone = 'good'; }
    else { hint = '可以读数了。' + (qStep ? qStep.replace(/^再点/, '读完再点') : ''); tone = 'good'; }
    var allOk = g.w === 'ok' && stab && st.recSig !== recSig();   // 俯视、仰视也能记（记到各自一栏做对比）；碰杯底、离开水不能记
    var out = g.w === 'air' && st.wasIn;   // 从水里取出后也能读，用来演示读数不准
    var ready = (stab && g.w !== 'air' && g.w !== 'table') || out;   // 俯视、仰视、碰杯底也能读，用来看偏差；只有规范时才能记录
    var seen = viewVal(), why = out ? '已离开水' : { bottom: '碰到杯底', wall: '碰到杯壁', partial: '玻璃泡没浸没' }[g.w] || (st.view === 'down' ? '俯视' : st.view === 'up' ? '仰视' : '');
    if (why && st.view !== 'level' && !out && g.w !== 'ok') why += '、' + (st.view === 'down' ? '俯视' : '仰视');
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: ready, bad: !!why,
      result: !why ? '温度计示数 <b>' + seen + '</b> ℃' : why + '读到 <b>' + seen + '</b> ℃' + (out ? (stab ? '' : '（还在变）') + '，读数不准' : '') + (g.w === 'ok' && st.view !== 'level' ? '，读数' + (st.view === 'down' ? '偏大' : '偏小') + '（可记入「' + VN[st.view] + '」一栏对比）' : '，不能记录') });
    K.setReading('t', K.revealed() ? String(seen) : null);
    var key = [allOk, K.revealed(), g.c, st.view, JSON.stringify(st.rows)].join('|');
    if (key === last) return; last = key;
    var rec = allOk && K.revealed();
    K.setRecord(rec, rec ? '记入「' + CUPS[g.c].name + '·' + VN[st.view] + '」一栏' : '', rec ? 'good' : '');
    K.setCount(Object.keys(st.rows).filter(done).length + ' / 3 杯');
    syncCtrls();
  }

  /* ── 控件：哪杯水（选择，一键放进）→ 视线（选择）→ 插入深度（滑杆）→ 温度计（取出 / 放回桌上） ── */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('哪杯水', K.seg('cup', Object.keys(CUPS).map(function (k) { return [k, CUPS[k].name]; }))) +
      K.grp('视线', K.seg('view', [['down', '俯视'], ['level', '平视'], ['up', '仰视']])) +
      K.grp('深度', '<div class="row"><span class="nm">玻璃泡</span><input class="rng" type="range" id="s-d" min="0" max="100" step="0.5" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-d" style="font-size:20px;min-width:92px"></span></div>') +
      K.grp('温度计', K.acts([['take', '↑', '取出'], ['back', '↓', '放回桌上']]));
    document.querySelectorAll('[data-cup]').forEach(function (b) { b.onclick = function () { putIn(b.getAttribute('data-cup')); }; });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { st.view = b.getAttribute('data-view'); changed(); }; });
    var sd = document.getElementById('s-d'); K.rng(sd);
    // 滑杆 0 = 杯口上方，100 = 杯底
    sd.addEventListener('input', function () { var c = cupIn(st.x); if (st.table || !c) return; var v = sd.value / 100; moveTo(st.x, (RIM + 1) - v * (RIM + 1 - BOTTOM)); });
    document.getElementById('take').onclick = function () { if (!st.table) moveTo(st.x, RIM + 3); };
    document.getElementById('back').onclick = function () { st.table = true; st.wasIn = false; changed(); };
  }
  function syncCtrls() {
    var g = geom(), c = st.table ? null : cupIn(st.x);
    document.querySelectorAll('[data-cup]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cup') === c && st.y < RIM); });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === st.view); });
    var sd = document.getElementById('s-d'); sd.disabled = !c;
    if (document.activeElement !== sd) sd.value = c ? Math.max(0, Math.min(100, ((RIM + 1) - st.y) / (RIM + 1 - BOTTOM) * 100)) : 0;
    sd.style.setProperty('--p', sd.value + '%');
    document.getElementById('v-d').textContent = !c ? '—' : { air: '水面上方', partial: '未浸没', bottom: '碰到杯底', wall: '碰到杯壁', ok: '已浸没' }[g.w] || '—';
    document.getElementById('take').disabled = st.table || st.y >= RIM;
    document.getElementById('back').disabled = st.table;
  }

  function preset(i) {
    var P = [{ table: true }, { table: true }, { cup: 'warm', y: 12, T: ROOM }, { cup: 'hot', y: 4.5, T: 'w' }, { cup: 'hot', y: 4.5, T: 'w' }, { cup: 'cold', y: 4.5, T: 'w' }][i];   // 第 6 问：先正确浸入，学生再往下拖到杯底比较
    st.view = 'level'; st.wasIn = false;
    if (P.table) { st.table = true; st.T = ROOM; st.stableFor = 0; }
    else { st.table = false; st.x = CUPS[P.cup].x; st.y = P.y; st.T = P.T === 'w' ? waterT(P.cup) : ROOM; st.stableFor = P.T === 'w' ? 3 : 0; st.wasIn = P.T === 'w'; }
    changed(); syncCtrls();
  }

  window.__exp = { st: st, V: function () { return V; }, therm: function () { return therm; } };
  LabKit.run({
    readings: [{ id: 't', name: '温度计示数', unit: '℃' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖动温度计：提起、移到另一杯、放进水里；点烧杯可直接放入。拖动空白处转动视角</p>'); },
    preset: preset,
    reset: function () { st.prep = st.sim; preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function (on) { K._revealedAt = on ? readVal() : null; last = ''; },
    record: function () { var g = geom(); st.rows[g.c][st.view] = viewVal(); st.recSig = recSig(); last = ''; },
    clear: function () { st.rows = { cold: {}, warm: {}, hot: {} }; st.recSig = null; last = ''; },
    renderData: function () {
      function td(v, main) { return '<td class="n' + (v == null ? ' dim' : '') + '"' + (main ? ' style="font-weight:600"' : '') + '>' + (v == null ? '—' : v) + '</td>'; }
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:860px"><thead><tr><th>烧杯</th><th>俯视读数/℃</th><th>平视读数/℃<br><span style="font-weight:400;font-size:15px">（正确读数）</span></th><th>仰视读数/℃</th></tr></thead><tbody>' +
        Object.keys(CUPS).map(function (k) { var r = st.rows[k] || {}; return '<tr><td>' + CUPS[k].name + '</td>' + td(r.down) + td(r.level, true) + td(r.up) + '</tr>'; }).join('') +
        '</tbody></table><p class="tip">读数时温度计留在水中，示数稳定、视线与液柱上表面相平。比一比：俯视读数偏大，仰视读数偏小，平视才是正确读数。热水会慢慢变凉，后测的数值可能低一点。</p>';
    }
  });
})();
