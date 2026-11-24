/* 12 探究液体压强与哪些因素有关（课本图 9.2-2、9.2-3）。
   装置：U 形管压强计（红色水，两管之间贴毫米刻度尺），探头 = 蒙橡皮膜的金属盒，经软管接 U 形管左管；
   透明容器（粗 / 细两种），容器壁贴从液面向下量的深度刻度；探头夹在铁架台横杆上，可上下移动、转动朝向。
   参数：液体密度 水 1.0、盐水 1.2、酒精 0.8 g/cm³；Δh =（ρ液 ÷ ρ水）× h；初始 U 形管两侧液面差 1.5 cm，
   拆下软管再装上（探头在空气中）才相平；按压橡皮膜时液面差明显变化 → 不漏气。容器粗细、液体多少不影响 Δh。
   软管在探头浸入液体时装上，会把当时的压强“封”进去（液面差不再从零算起），所以装管要在空气中进行。
   记录有效：液面已调平、已检查不漏气、探头浸没并静止、液面差稳定。
   操作：上下拖探头改深度；点探头转朝向；探头在空气中时按住橡皮膜不动＝按压；点 U 形管左上方的接头拆 / 装软管。 */
(function () {
  var LIQ = { water: { name: '水', rho: 1.0, c: 0x9CCBEA, op: .46 }, salt: { name: '盐水', rho: 1.2, c: 0xA8CFC8, op: .55 }, alc: { name: '酒精', rho: 0.8, c: 0xDDEBF5, op: .38 } };
  var ORI = { up: '朝上', side: '朝侧面', down: '朝下' }, ORI_K = ['up', 'side', 'down'];
  var CONT = { wide: { name: '粗容器', r: 7, H: 18, surf: 13.4 }, thin: { name: '细容器', r: 3.6, H: 22, surf: 17.4 } };
  var UX = -26, UL = 2.6, UZ = 1.6, UB = 5, UTOP = 31, BASE = 18, RUL0 = 8, CX = 10, STEM = 16, OFF0 = 1.5, PRESS = 4, HMIN = -7, HMAX = 12;
  var st = { liq: 'water', ori: 'up', cont: 'wide', h: HMIN, att: true, off: OFF0, air: false, press: false, dh: OFF0, still: 0, rows: [], justRec: null };
  var K, V, T3, probe, box, membrane, stemG, hose, hoseEnd, conn, connHit, probeHit, liqMesh = {}, contG = {}, rodClamp, colL, colR, winEl, winKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function C() { return CONT[st.cont]; }
  /* 深度 h = 液面到橡皮膜中心的竖直距离。金属盒厚 1 cm、半径 1.5 cm：膜朝上时膜在盒顶，朝下时在盒底，朝侧面时与盒心等高 */
  function boxY() { return C().surf - st.h - (st.ori === 'up' ? 0.5 : st.ori === 'down' ? -0.5 : 0); }
  function span() { return st.ori === 'up' ? [st.h, st.h + 1] : st.ori === 'down' ? [st.h - 1, st.h] : [st.h - 1.5, st.h + 1.5]; }   // 金属盒上沿、下沿的深度
  function immersed() { return span()[0] >= 0.05; }
  function wet() { return span()[1] > 0; }
  function leveled() { return Math.abs(st.off) < 0.05; }
  function checked() { return leveled() && st.air; }
  function target() {
    if (!st.att) return 0;
    return st.off + (st.press ? PRESS : 0) + LIQ[st.liq].rho * Math.max(0, st.h);
  }
  function stable() { return st.still >= 0.5 && Math.abs(st.dh - target()) < 0.03; }
  function dhRead() { return Math.round(Math.abs(st.dh) * 10) / 10; }

  /* ── 纹理与小工具 ── */
  function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T3.CanvasTexture(c); t.anisotropy = 8; return t; }
  function woodTex() {
    return tex(256, 1024, function (g, w, h) {
      g.fillStyle = '#E3CDA6'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 26; i++) { g.strokeStyle = '#8A6A3E'; g.globalAlpha = 0.06 + Math.random() * 0.1; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var x = Math.random() * w; g.moveTo(x, 0); g.bezierCurveTo(x + (Math.random() - .5) * 20, 300, x + (Math.random() - .5) * 20, 700, x, h); g.stroke(); }
      g.globalAlpha = 1;
    });
  }
  function rulerTex() {   // U 形管中间的刻度尺：0～22 cm，毫米刻度
    var cm0 = 0, cm1 = 22;
    return tex(160, 2200, function (g, w, h) {
      var px = h / (cm1 - cm0);
      g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 40px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (var mm = 0; mm <= (cm1 - cm0) * 10; mm++) {
        var y = h - mm / 10 * px, l = mm % 10 === 0 ? 40 : mm % 5 === 0 ? 28 : 16;
        g.lineWidth = mm % 10 === 0 ? 4 : 2; g.beginPath(); g.moveTo(0, y); g.lineTo(l, y); g.moveTo(w, y); g.lineTo(w - l, y); g.stroke();
        if (mm % 10 === 0 && mm > 0 && mm < (cm1 - cm0) * 10) g.fillText(String(mm / 10), w / 2, y);
      }
    });
  }
  function depthTex(len) {   // 容器壁上的深度刻度：0 在液面，向下增大
    return tex(96, Math.round(len * 64), function (g, w, h) {
      var px = h / len;
      g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 30px Bahnschrift, Arial'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (var mm = 0; mm <= len * 10; mm++) {
        var y = mm / 10 * px, l = mm % 10 === 0 ? 34 : mm % 5 === 0 ? 24 : 12;
        g.lineWidth = mm % 10 === 0 ? 3.5 : 1.8; g.beginPath(); g.moveTo(0, y); g.lineTo(l, y); g.stroke();
        if (mm % 10 === 0 && mm > 0) g.fillText(String(mm / 10), w - 6, y);
      }
    });
  }
  function rr(w, h, r) {
    var s = new T3.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;
  }
  function rbox(w, h, d, r, mat) {
    var g = new T3.ExtrudeGeometry(rr(w - 2 * r, h - 2 * r, r * 0.6), { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2); var m = new T3.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function cyl(r, h, mat, seg) { var m = new T3.Mesh(new T3.CylinderGeometry(r, r, h, seg || 24), mat); m.castShadow = true; return m; }

  /* ── 场景 ── */
  function build() {
    V = K.three({ target: [-6, 18, 0], az: 0.14, el: 0.16, dist: 100, minDist: 60, maxDist: 160, minAz: -0.9, maxAz: 0.9, minEl: 0.02, maxEl: 0.9, fov: 30, sun: [-30, 110, 80] });
    T3 = V.T; var S = V.scene;
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .2, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var iron = new T3.MeshStandardMaterial({ color: 0x6B7685, roughness: .5, metalness: .4 });
    var steel = new T3.MeshStandardMaterial({ color: 0xB8C3D0, metalness: .7, roughness: .28 });
    var red = new T3.MeshStandardMaterial({ color: 0xD8322A, roughness: .3 });
    // U 形管压强计：底座 + 竖直木板 + 刻度尺 + 玻璃 U 形管
    var foot = rbox(18, 1.6, 9, 0.4, iron); foot.position.set(UX, 0.8, 0); S.add(foot);
    var board = rbox(12, 32, 1.2, 0.3, new T3.MeshStandardMaterial({ map: woodTex(), roughness: .8 })); board.position.set(UX, 17.6, 0); S.add(board);
    var ruler = new T3.Mesh(new T3.PlaneGeometry(3.2, 22), new T3.MeshStandardMaterial({ map: rulerTex(), roughness: .6, emissive: 0xffffff, emissiveIntensity: .15 }));
    ruler.position.set(UX, RUL0 + 11, 0.65); S.add(ruler);
    var tubeM = new T3.MeshPhongMaterial({ color: 0xF4F8FC, transparent: true, opacity: .32, shininess: 120, specular: 0xffffff, depthWrite: false });
    [-1, 1].forEach(function (s) { var t = cyl(0.5, UTOP - UB, tubeM, 20); t.castShadow = false; t.position.set(UX + s * UL, (UTOP + UB) / 2, UZ); S.add(t); });
    var bend = new T3.Mesh(new T3.TorusGeometry(UL, 0.5, 12, 32, Math.PI), tubeM); bend.rotation.z = Math.PI; bend.position.set(UX, UB, UZ); S.add(bend);
    var bendL = new T3.Mesh(new T3.TorusGeometry(UL, 0.34, 10, 32, Math.PI), red); bendL.rotation.z = Math.PI; bendL.position.set(UX, UB, UZ); S.add(bendL);
    colL = cyl(0.34, 1, red, 16); colR = cyl(0.34, 1, red, 16); S.add(colL); S.add(colR);
    [-1, 1].forEach(function (s) { [9, 27].forEach(function (y) { var c = new T3.Mesh(new T3.BoxGeometry(1.6, 0.7, 0.6), steel); c.position.set(UX + s * UL, y, 0.9); S.add(c); }); });
    conn = cyl(0.62, 1.2, new T3.MeshStandardMaterial({ color: 0x3A3F47, roughness: .6 }), 16); conn.position.set(UX - UL, UTOP + 0.6, UZ); S.add(conn);
    connHit = new T3.Mesh(new T3.SphereGeometry(2.4, 10, 8), new T3.MeshBasicMaterial({ visible: false })); connHit.position.set(UX - UL, UTOP + 1, UZ); S.add(connHit);
    // 两个容器（同一位置，按选择显示）
    Object.keys(CONT).forEach(function (k) {
      var c = CONT[k], g = new T3.Group(); g.position.set(CX, 0, 0);
      var wall = new T3.Mesh(new T3.CylinderGeometry(c.r, c.r, c.H, 48, 1, true), glass); wall.position.y = c.H / 2; g.add(wall);
      var bot = new T3.Mesh(new T3.CylinderGeometry(c.r, c.r, 0.4, 48), glass); bot.position.y = 0.2; g.add(bot);
      var lip = new T3.Mesh(new T3.TorusGeometry(c.r, 0.16, 8, 48), new T3.MeshStandardMaterial({ color: 0x9FB3CC, roughness: .4 })); lip.rotation.x = Math.PI / 2; lip.position.y = c.H; g.add(lip);
      var lm = new T3.MeshPhongMaterial({ color: LIQ.water.c, transparent: true, opacity: .46, shininess: 70, depthWrite: false });
      var liq = new T3.Mesh(new T3.CylinderGeometry(c.r - 0.15, c.r - 0.15, c.surf - 0.4, 48), lm); liq.position.y = (c.surf + 0.4) / 2; g.add(liq);
      var top = new T3.Mesh(new T3.CircleGeometry(c.r - 0.15, 48), new T3.MeshPhongMaterial({ color: LIQ.water.c, transparent: true, opacity: .55, shininess: 120, depthWrite: false })); top.rotation.x = -Math.PI / 2; top.position.y = c.surf; g.add(top);
      var len = Math.floor(c.surf - 0.6), tape = new T3.Mesh(new T3.PlaneGeometry(1.5, len), new T3.MeshBasicMaterial({ map: depthTex(len), transparent: true }));
      var a = -0.42; tape.position.set(Math.sin(a) * (c.r + 0.03), c.surf - len / 2, Math.cos(a) * (c.r + 0.03)); tape.rotation.y = a; g.add(tape);
      var zero = new T3.Mesh(new T3.PlaneGeometry(2.2, 0.12), new T3.MeshBasicMaterial({ color: 0xFE752D })); zero.position.set(Math.sin(a) * (c.r + 0.05), c.surf, Math.cos(a) * (c.r + 0.05)); zero.rotation.y = a; g.add(zero);
      var sc = new T3.Mesh(new T3.CylinderGeometry(c.r, c.r, c.H, 24), new T3.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); sc.position.y = c.H / 2; sc.castShadow = true; g.add(sc);
      liqMesh[k] = [liq.material, top.material]; contG[k] = g; S.add(g);
    });
    // 铁架台：探头夹在横杆上
    var sb = rbox(16, 1.4, 10, 0.35, iron); sb.position.set(-5, 0.7, -12.2); S.add(sb);
    var rod = cyl(0.5, 44, iron, 16); rod.position.set(-6, 22, -11); S.add(rod);
    rodClamp = new T3.Group(); S.add(rodClamp);
    var cb = new T3.Mesh(new T3.BoxGeometry(1.8, 1.8, 1.8), iron); cb.position.set(-6, 0, -11); rodClamp.add(cb);
    var arm = cyl(0.32, 0, iron, 10); rodClamp.add(arm); rodClamp.userData.arm = arm;
    // 探头：竖直金属管 + 弯头 + 金属盒（橡皮膜一面），盒可绕弯头轴（x 轴）转动
    probe = new T3.Group(); S.add(probe);
    stemG = cyl(0.3, STEM, steel, 12); stemG.position.set(-2.2, STEM / 2, 0); probe.add(stemG);
    var elbow = cyl(0.3, 2.0, steel, 12); elbow.rotation.z = Math.PI / 2; elbow.position.set(-1.2, 0, 0); probe.add(elbow);
    var knee = new T3.Mesh(new T3.SphereGeometry(0.36, 12, 10), steel); knee.position.set(-2.2, 0, 0); probe.add(knee);
    var clampP = new T3.Mesh(new T3.BoxGeometry(1.4, 1.6, 1.4), iron); clampP.position.set(-2.2, STEM - 1.2, 0); probe.add(clampP);
    box = new T3.Group(); probe.add(box);
    var shell = cyl(1.5, 1.0, steel, 32); box.add(shell);
    var rim = new T3.Mesh(new T3.TorusGeometry(1.5, 0.1, 8, 32), steel); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; box.add(rim);
    membrane = new T3.Mesh(new T3.SphereGeometry(3.56, 32, 6, 0, Math.PI * 2, 0, 0.42), new T3.MeshStandardMaterial({ color: 0xE9B44C, roughness: .55 }));
    membrane.position.y = 0.5; membrane.geometry.translate(0, -3.56 * Math.cos(0.42), 0); box.add(membrane);   // 微微鼓起的橡皮膜（底边在盒口）
    probeHit = new T3.Mesh(new T3.BoxGeometry(6, STEM + 4, 5), new T3.MeshBasicMaterial({ visible: false })); probeHit.position.set(-1, STEM / 2 - 1, 0); probe.add(probeHit);
    hose = new T3.Mesh(new T3.BufferGeometry(), new T3.MeshStandardMaterial({ color: 0x8E3B32, roughness: .6 })); hose.castShadow = true; S.add(hose);
    hoseEnd = cyl(0.55, 1.4, new T3.MeshStandardMaterial({ color: 0x7A322A, roughness: .6 }), 16); S.add(hoseEnd);
    V.tag('probe', ''); V.tag('conn', '软管接头'); V.tag('liq', '');
    // 拖动：探头上下（点一下转朝向；在空气中按住不动＝按压橡皮膜）；点接头拆 / 装软管
    var grab = null;
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [probeHit, connHit]); },
      start: function (ev) {
        var h;
        if (V.pick(ev, [connHit])) { grab = { k: 'conn', x: ev.clientX, y: ev.clientY, moved: false }; return true; }
        if ((h = V.pick(ev, [probeHit]))) { var s = V.toScreen(h.point), m = stagePt(ev); grab = { k: 'probe', p0: h.point.clone(), h0: st.h, ox: m.x - s.x, oy: m.y - s.y, x: ev.clientX, y: ev.clientY, moved: false, t: 0 }; return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) { grab.moved = true; if (st.press) { st.press = false; changed(); } }
        if (!grab.moved || grab.k !== 'probe') return;
        var m = stagePt(ev), tx = m.x - grab.ox, ty = m.y - grab.oy, best = st.h, bd = 1e9, lo = HMIN, hi = hTop(), step = 0.5;
        for (var pass = 0; pass < 3; pass++) {
          for (var hh = lo; hh <= hi + 1e-9; hh += step) { var s = V.toScreen(grab.p0.clone().setY(grab.p0.y - (hh - grab.h0))), d = Math.hypot(s.x - tx, s.y - ty); if (d < bd) { bd = d; best = hh; } }
          lo = Math.max(HMIN, best - step); hi = Math.min(hTop(), best + step); step /= 10;
        }
        setH(best);
      },
      end: function () {
        if (!grab) return;
        if (grab.k === 'conn' && !grab.moved) toggleHose();
        if (grab.k === 'probe') {
          if (st.press) { st.press = false; changed(); }
          else if (!grab.moved) setOri(ORI_K[(ORI_K.indexOf(st.ori) + 1) % 3]);
          else snapH();
        }
        grab = null;
      }
    };
    V.__grab = function () { return grab; };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  /* 最深能放到哪：金属盒底不能低于容器底（内底 0.4 cm）。朝侧面时盒子竖着、半径 1.5 cm 伸到膜心下方；朝上时盒底在膜下 1 cm；朝下时膜就在盒底 */
  function hTop() { var low = st.ori === 'side' ? 1.5 : st.ori === 'up' ? 1 : 0; return Math.min(HMAX, Math.floor((C().surf - 0.4 - low) * 2) / 2); }
  function setH(h) { st.h = Math.round(clamp(h, HMIN, hTop()) * 100) / 100; st.still = 0; changed(); }
  function snapH() { var r = Math.round(st.h); if (Math.abs(st.h - r) < 0.3) setH(r); }
  function setOri(o) { if (o === st.ori) return; st.ori = o; setH(st.h); }   // 换朝向后深度超出就提到最深处
  function setLiq(l) { if (l === st.liq) return; st.liq = l; st.still = 0; changed(); }
  function setCont(c) { if (c === st.cont) return; st.cont = c; setH(st.h); }
  function toggleHose() {
    if (st.att) st.att = false;   // 拆下：两管都通大气，液面回到相平
    else { st.att = true; st.off = -(LIQ[st.liq].rho * Math.max(0, st.h) + (st.press ? PRESS : 0)); st.off = Math.round(st.off * 100) / 100; st.wetAtt = !leveled(); }   // 装上：以此刻为零点（在液体里装上，零点就不对了）
    st.still = 0; changed();
  }
  function setPress(on) {
    if (on === st.press) return;
    st.press = on; st.still = 0;
    changed();
  }

  /* ── 每帧 ── */
  function tick(dt) {
    var g = V.__grab();
    if (g && g.k === 'probe' && !g.moved) { g.t += dt; if (g.t > 0.3 && !wet() && !st.press) setPress(true); }
    var tg = target();
    st.dh += (tg - st.dh) * (1 - Math.exp(-dt / 0.3));
    if (Math.abs(st.dh - tg) < 0.004) st.dh = tg;
    if (st.att && st.press && Math.abs(st.dh - (tg - PRESS)) > 1) st.air = true;   // 按压时液面差明显变化：不漏气
    st.still += dt;
    pose(); drawWin(); ui();
  }
  function pose() {
    var c = C(), y = boxY();
    Object.keys(contG).forEach(function (k) { contG[k].visible = k === st.cont; liqMesh[k].forEach(function (m, i) { m.color.setHex(LIQ[st.liq].c); m.opacity = LIQ[st.liq].op + (i ? 0.08 : 0); }); });
    probe.position.set(CX, y, 0);
    box.rotation.x = st.ori === 'up' ? 0 : st.ori === 'side' ? Math.PI / 2 : Math.PI;
    membrane.scale.set(1, st.press ? -0.6 : 0.6, 1);   // 按压时膜被压进去
    var top = y + STEM - 1.2;
    // U 形管液柱：右管高出 Δh/2，左管低 Δh/2
    var yl = BASE - st.dh / 2, yr = BASE + st.dh / 2;
    colL.scale.y = yl - UB; colL.position.set(UX - UL, (yl + UB) / 2, UZ);
    colR.scale.y = yr - UB; colR.position.set(UX + UL, (yr + UB) / 2, UZ);
    var hk = [y, st.att].join('|'); if (hk === st._hk) return poseTags(y, c); st._hk = hk;
    rodClamp.position.y = top; var arm = rodClamp.userData.arm, ax0 = -6, ax1 = CX - 2.2, az0 = -11, az1 = 0, len = Math.hypot(ax1 - ax0, az1 - az0);
    arm.geometry.dispose(); arm.geometry = new T3.CylinderGeometry(0.32, 0.32, len, 10);
    arm.position.set((ax0 + ax1) / 2, 0, (az0 + az1) / 2); arm.rotation.set(0, -Math.atan2(az1 - az0, ax1 - ax0), Math.PI / 2);
    // 软管
    var a = st.att ? new T3.Vector3(UX - UL, UTOP + 1.2, UZ) : new T3.Vector3(UX - UL - 3.2, UTOP + 3.4, UZ + 2.5), b = new T3.Vector3(CX - 2.2, top + 1.4, 0);
    var mid = new T3.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + 4, (a.z + b.z) / 2 + 1);
    var curve = new T3.CatmullRomCurve3([a, a.clone().add(new T3.Vector3(0, 3, 0)), mid, b.clone().add(new T3.Vector3(0, 3, 0)), b]);
    hose.geometry.dispose(); hose.geometry = new T3.TubeGeometry(curve, 60, 0.42, 10, false);
    hoseEnd.position.copy(a).add(new T3.Vector3(0, 0.3, 0)); hoseEnd.rotation.z = st.att ? 0 : 0.5;
    poseTags(y, c);
  }
  function poseTags(y, c) {
    var pt = V.tag('probe'); pt.textContent = '探头' + ORI[st.ori];
    V.placeTag('probe', new T3.Vector3(CX + 4.5, y + 1.5, 0)); pt.style.transform = 'translate(0,-50%)';
    V.tag('conn').style.display = checked() ? 'none' : ''; if (!checked()) V.placeTag('conn', new T3.Vector3(UX - UL, UTOP + 5.2, UZ));
    // 液体名称平时标在杯底附近；探头放得较深（探头标签落到下半杯）时改标在液面下方，两个标签不重叠
    V.tag('liq').textContent = LIQ[st.liq].name; V.placeTag('liq', new T3.Vector3(CX + c.r * 0.55, y < c.surf / 2 ? c.surf - 1.8 : 2.6, c.r + 1));
  }

  /* ── 观察窗：左右两管液面附近的刻度（毫米刻度） ── */
  function drawWin() {
    var key = Math.round(st.dh * 100);
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win" style="width:360px"><h3><span>U 形管液面放大</span><small>分度值 1 mm</small></h3><svg viewBox="0 0 360 212"></svg><p class="cap" style="font-size:18px"></p></div>');
    var rl = BASE - RUL0 - st.dh / 2, rr2 = BASE - RUL0 + st.dh / 2, s = '';
    function pane(x0, v, lab) {
      var cy = 100, k = 30, Y = function (t) { return cy - (t - v) * k; }, o = '<g transform="translate(' + x0 + ' 0)"><rect x="0" y="6" width="168" height="190" rx="8" fill="#FBFCFD" stroke="#C3CEDC"/>';
      for (var mm = Math.floor((v - 3.4) * 10); mm <= Math.ceil((v + 3.4) * 10); mm++) {
        var y = Y(mm / 10); if (y < 10 || y > 192) continue;
        var l = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 21 : 12;
        o += '<line x1="96" y1="' + y + '" x2="' + (96 + l) + '" y2="' + y + '" stroke="#1E3A5F" stroke-width="' + (mm % 10 ? 1.3 : 2.4) + '"/>';
        if (mm % 10 === 0 && y > 18 && y < 186) o += '<text x="160" y="' + (y + 7) + '" text-anchor="end" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + (mm / 10) + '</text>';
      }
      o += '<rect x="36" y="6" width="34" height="190" fill="#EEF4FA" stroke="#9FB3CC"/><path d="M40 ' + (cy + 4) + 'Q53 ' + (cy - 3) + ' 66 ' + (cy + 4) + 'V196H40Z" fill="#D8322A"/>';
      o += '<line x1="70" y1="' + cy + '" x2="96" y2="' + cy + '" stroke="#FE752D" stroke-width="2.5" stroke-dasharray="5 4"/>';
      o += '<text x="10" y="30" font-size="18" fill="#56677D">' + lab + '</text></g>';
      return o;
    }
    s = pane(4, rl, '左管') + pane(188, rr2, '右管');
    winEl.querySelector('svg').innerHTML = s;
    winEl.querySelector('.cap').textContent = '两管液面所对刻度之差就是 Δh';
  }

  /* ── 检查与记录 ── */
  function changed() { st.justRec = null; st.ver = (st.ver || 0) + 1; last = ''; }
  function recKey() { return [st.liq, f1(st.h), st.ori, st.cont].join('|'); }
  function dup() { return st.recVer === st.ver; }   // 只拦“什么都没变又点一次”
  function valid() { return checked() && st.att && immersed() && stable(); }
  function ui() {
    var hint, tone = '', imm = immersed();
    var checks = [!st.att ? { label: '液面相平', ok: true } : st.wetAtt && !leveled() ? { label: '在空气中装管', ok: false } : { label: '液面相平', ok: leveled() }, { label: '不漏气', ok: st.air ? true : null }, { label: '探头浸没', ok: imm ? true : wet() ? false : null }, { label: '静止', ok: imm ? (stable() ? true : null) : null }];
    if (!st.att) hint = '软管已拆下，两管液面回到相平。在空气中把软管装回。';
    else if (!leveled() && (wet() || st.wetAtt)) { hint = '软管是在液体里装上的，零点不对。把探头提到空气中，重新拆装软管。'; tone = 'warn'; }
    else if (!leveled()) { hint = 'U 形管两侧液面不相平。先检查装置。'; tone = 'warn'; }
    else if (!st.air) hint = st.press ? '按住了橡皮膜：看液面差有没有变化。' : '液面已相平。再按一按橡皮膜，检查是否漏气。';
    else if (!wet()) hint = st.justRec != null ? '已记入第 ' + st.justRec + ' 次。' : '装置正常。把探头放进液体中。';
    else if (!imm) { hint = '探头还没有全部浸入液体，再往下放一点。'; tone = 'warn'; }
    else if (!stable()) hint = '液面还在移动，等它稳定。';
    else if (st.justRec != null) { hint = '已记入第 ' + st.justRec + ' 次。改变深度、朝向或液体再测。'; tone = 'good'; }
    else if (dup()) hint = '这一组已经记过了。改变深度、朝向或液体再测。';
    else { hint = '读出深度和液面差，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: false });
    var ok = valid() && !dup();
    var key = [ok, f1(st.h), dhRead(), st.liq, st.ori, st.cont, st.att, st.air, leveled(), st.press, st.rows.length, st.justRec, K.S.q].join('|');
    if (key === last) return; last = key;
    K.setReading('h', wet() ? f1(Math.max(0, st.h)) : '—'); K.setReading('dh', f1(dhRead()));
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次：' + LIQ[st.liq].name + '，' + f1(st.h) + ' cm，' + ORI[st.ori] : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    syncCtrls();
  }

  /* ── 控件 ──（2026-11-21 按「器材调节面板规范」重排）
     液体、容器、探头朝向（几选一）→ 探头深度（滑杆）→ 检查压强计：拆 / 装软管、按住按压橡皮膜（动作，检查通过后这一行隐藏）。 */
  function gid(id, html) { return html.replace('<div class="grp"', '<div class="grp" id="' + id + '"'); }
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('液体', K.seg('l', Object.keys(LIQ).map(function (k) { return [k, LIQ[k].name]; }))) +
      gid('r-c', K.grp('容器', K.seg('c', Object.keys(CONT).map(function (k) { return [k, CONT[k].name]; })))) +
      K.grp('朝向', K.seg('o', ORI_K.map(function (k) { return [k, ORI[k]]; }))) +
      K.grp('探头', '<div class="row"><span class="vl" id="v-h" style="font-size:19px;text-align:left;flex:none;width:118px;min-width:0;white-space:nowrap"></span><input class="rng" type="range" id="s-h" min="' + HMIN + '" max="' + HMAX + '" step="0.1" style="flex:1;width:auto"></div>') +
      gid('chk', K.grp('检查', K.acts([['hose', '', '拆下软管'], ['press', '●', '按住：按压橡皮膜']])));
    var sh = document.getElementById('s-h'); K.rng(sh);
    sh.addEventListener('input', function () { setH(+sh.value); });
    sh.addEventListener('change', snapH);
    document.getElementById('hose').onclick = toggleHose;
    var pb = document.getElementById('press');
    pb.addEventListener('pointerdown', function (e) { if (!wet()) setPress(true); pb.setPointerCapture(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { pb.addEventListener(t, function () { setPress(false); }); });
    document.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { setOri(b.getAttribute('data-o')); }; });
    document.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { setLiq(b.getAttribute('data-l')); }; });
    document.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { setCont(b.getAttribute('data-c')); }; });
  }
  function syncCtrls() {
    var sh = document.getElementById('s-h');
    if (document.activeElement !== sh) sh.value = st.h;
    sh.style.setProperty('--p', ((sh.value - HMIN) / (HMAX - HMIN) * 100) + '%');
    document.getElementById('v-h').textContent = wet() ? '深 ' + f1(Math.max(0, st.h)) + ' cm' : '液面上方';
    document.getElementById('chk').style.display = checked() ? 'none' : '';
    var hb = document.getElementById('hose'); hb.innerHTML = st.att ? '<i>↑</i>拆下软管' : '<i>↓</i>装上软管'; hb.classList.toggle('on', !st.att);
    var pb = document.getElementById('press'); pb.disabled = wet(); pb.classList.toggle('on', st.press);
    document.querySelectorAll('[data-o]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-o') === st.ori); });
    document.querySelectorAll('[data-l]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-l') === st.liq); });
    document.querySelectorAll('[data-c]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c') === st.cont); });
    document.getElementById('r-c').style.display = K.S.q === 4 || st.cont !== 'wide' ? '' : 'none';
  }

  function preset(i) {
    var H0 = [HMIN, HMIN, 6, 1, 6, 6][i];
    st.liq = 'water'; st.ori = 'up'; st.cont = 'wide'; st.press = false; st.att = true; st.wetAtt = false;
    if (i === 0) { st.off = OFF0; st.air = false; st.dh = OFF0; } else { st.off = 0; st.air = true; st.dh = LIQ.water.rho * Math.max(0, H0); }
    st.h = H0; st.still = 1; changed();
  }

  window.__exp = { st: st, V: function () { return V; }, probe: function () { return probe; }, conn: function () { return conn; }, target: target, stable: stable };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'h', name: '探头深度 <span class="m">h</span>', unit: 'cm' }, { id: 'dh', name: '液面高度差 Δ<span class="m">h</span>', unit: 'cm' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">上下拖探头改变深度，点探头换朝向；探头在空气中时按住它不动＝按压橡皮膜；点接头拆装软管；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    record: function () {
      if (!valid() || dup()) return;
      st.rows.push({ liq: st.liq, h: Math.round(st.h * 10) / 10, ori: st.ori, cont: st.cont, dh: dhRead(), key: recKey() });
      st.recVer = st.ver; st.justRec = st.rows.length; last = '';
    },
    clear: function () { st.rows = []; st.justRec = null; last = ''; },
    renderData: function () {
      var thin = st.rows.some(function (r) { return r.cont === 'thin'; });
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<div style="max-height:720px;overflow:auto"><table class="rec"><thead><tr><th style="width:16%">次数</th><th>液体</th><th>探头深度 <span class="m">h</span>/cm</th><th>橡皮膜朝向</th><th>高度差 Δ<span class="m">h</span>/cm</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + (thin ? '<small style="color:#56677D">（' + CONT[r.cont].name + '）</small>' : '') + '</td><td>' + LIQ[r.liq].name + '</td><td class="n">' + f1(r.h) + '</td><td>' + ORI[r.ori] + '</td><td class="n">' + f1(r.dh) + '</td></tr>'; }).join('')
          : '<tr><td colspan="5" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table></div><p class="tip">深度从液面向下量到橡皮膜中心。比较时只让一个条件不同。</p>';
    }
  });
})();
