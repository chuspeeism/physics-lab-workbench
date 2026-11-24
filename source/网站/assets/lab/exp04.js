/* 04 探究水在沸腾前后温度变化的特点（课本图 3.3-2）。
   装置：铁架台（底座、立杆、铁圈、横杆）、酒精灯、陶土网、烧杯、带孔纸板、挂在横杆上的温度计、电子计时器。
   参数：水初温 88 ℃（课本：接近 90 ℃ 时开始计时），沸点 98 ℃（气压略低于标准大气压）；盖纸板 88 ℃ 时升温约 4 ℃/min、不盖约 3 ℃/min，越接近沸点越慢，
     但到沸点前始终不低于 2 ℃/min（每 0.5 min 读数至少升 1 ℃，图像在沸腾前不出现假“平台”），到 98 ℃ 才变平；
   撤去酒精灯约 5 s 后停止沸腾，再降温（接近沸点时蒸发散热多，98 ℃ 时约 2 ℃/min，越接近室温越慢）；玻璃泡碰杯底示数比水温高 3 ℃。
   统一模拟时钟：正常 = 真实时间，快进 ×10；计时开始后每 0.5 min 拍一次温度快照，快照可记录到下一个采样时刻；
   快进时每到采样时刻自动暂停；打开「自动记录」则到采样时刻自动记入、不暂停。每个采样时刻只能记一次。
   酒精灯不在杯下时不能开始计时（给出提示）。第 6 问「显示观察结果」说明白气。 */
(function () {
  var BP = 98, ROOM = 22, BOT = 13.3, SURF = 20, B_R = 5, B_Y0 = 13, B_H = 11, LID_Y = 24.3, TX = 1.5, BAR_Y = 50, LEN = 21, BR = 0.5, COL0 = 1.6, COLL = 16;
  var st = { w: 88, th: ROOM, h: 26, lamp: 0, lid: false, speed: 1, timerOn: false, paused: false, t: 0, boil: false, offFor: 0, lastK: -1, samples: {}, pendK: null, rows: [], close: false, revealCls: null, auto: false };
  var K, V, T3, therm, col, thread, lamp, flame, lid, lidHit, waterM, bubbles = [], puffs = [], winEl, winKey = '', timerEl, timerKey = '', last = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function heating() { return st.lamp > 0.97; }
  function pos() {
    if (st.h >= SURF - 0.1) return 'air';
    if (st.h + 2.4 * BR > SURF - 0.2) return 'partial';
    if (st.h <= BOT + 0.05) return 'bottom';
    return 'ok';
  }
  function thTarget() {
    var p = pos();
    if (p === 'air') return ROOM;
    if (p === 'partial') return st.w * 0.55 + ROOM * 0.45;
    if (p === 'bottom') return st.w + (heating() ? 3 : 0.5);
    return st.w;
  }
  function settled() { return Math.abs(st.th - thTarget()) < 0.3; }   // 示数已跟上水温
  function reading() { return Math.round(st.th); }
  /* 气泡现象分类（“显示观察结果”用） */
  function bubbleCls() {
    if (st.boil) return heating() ? 'boil' : 'boil-off';
    if (heating()) return st.w >= 88 ? 'pre' : 'start';
    return st.w > 90 && st.offFor > 0 ? 'stopped' : 'none';
  }
  function holeName() { return st.lid ? '小孔' : '杯口'; }   // 纸板取下后白气从杯口冒出
  function steamTxt() { return '白气｜' + holeName() + '上方隔一小段才出现白气，紧贴' + holeName() + '处看不见。'; }   // 只写看到的现象；“白气是什么”是第 6 问的答案，不在这里提前说
  function coolRate() { return (st.lid ? 1 : 1.3) * (0.008 * (st.w - ROOM) + 0.15 * Math.max(0, st.w - 88)); }   // ℃/min：接近沸点时蒸发散热多，降得快
  function steamLvl() { return st.boil ? 1 : clamp((st.w - 92) / 6, 0, 1) * 0.45; }   // 白气浓淡：沸腾时最浓，快沸腾或刚停止沸腾时淡
  var BOIL_HINT = { 0: '水在沸腾。比较现在的气泡和沸腾前有什么不同。', 3: '水在沸腾。读出沸腾时的温度，想想为什么不是 100 ℃。', 4: '水在沸腾。把酒精灯拖离烧杯，看沸腾还会不会继续。' };   // 提示跟着本问任务；第 6 问见 ui()
  var CLS_TXT = {
    boil: '沸腾时：大量气泡上升，越来越大，到水面破裂。',
    'boil-off': '刚移走酒精灯：水还在沸腾，接着看。',   // 不提前说“几秒后停止”（第 5 问的答案）
    pre: '沸腾前：气泡较少，上升时越来越小。',
    start: '刚开始加热：杯底只有少量小气泡。',
    stopped: '停止加热后，沸腾停止，气泡消失，温度开始下降。',
    none: '水里几乎没有气泡。'
  };

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
    V = K.three({ target: [2, 25, 0], az: 0.38, el: 0.16, dist: 104, minDist: 26, maxDist: 150, minAz: -0.9, maxAz: 0.9, minEl: 0.02, maxEl: 0.9, fov: 32, sun: [-40, 110, 70] });
    T3 = V.T; var S = V.scene;
    var iron = new T3.MeshStandardMaterial({ color: 0x6B7685, roughness: .5, metalness: .4 });
    var base = new T3.Mesh(new T3.BoxGeometry(26, 1.4, 16), iron); base.position.set(-8, 0.7, -3); base.castShadow = true; base.receiveShadow = true; S.add(base);
    var rod = new T3.Mesh(new T3.CylinderGeometry(0.5, 0.5, 56, 16), iron); rod.position.set(-16, 28, -7); rod.castShadow = true; S.add(rod);
    function arm(y, x1, z1) {   // 从立杆伸出的横杆（带十字夹）
      var len = Math.hypot(x1 + 16, z1 + 7), a = new T3.Mesh(new T3.CylinderGeometry(0.32, 0.32, len, 10), iron);
      a.position.set((x1 - 16) / 2, y, (z1 - 7) / 2); a.rotation.z = Math.PI / 2; a.rotation.y = -Math.atan2(z1 + 7, x1 + 16); a.castShadow = true; S.add(a);
      var clampM = new T3.Mesh(new T3.BoxGeometry(1.8, 1.6, 1.8), iron); clampM.position.set(-16, y, -7); S.add(clampM);
    }
    arm(12.5, -6, -2.2);
    var ring = new T3.Mesh(new T3.TorusGeometry(6.2, 0.28, 8, 40), iron); ring.rotation.x = Math.PI / 2; ring.position.set(0, 12.5, 0); ring.castShadow = true; S.add(ring);
    var mesh = new T3.Mesh(new T3.BoxGeometry(14, 0.25, 14), new T3.MeshStandardMaterial({ color: 0x9AA3AE, roughness: .9 })); mesh.position.set(0, 12.85, 0); mesh.receiveShadow = true; mesh.castShadow = true; S.add(mesh);
    var pad = new T3.Mesh(new T3.CylinderGeometry(4.4, 4.4, 0.06, 32), new T3.MeshStandardMaterial({ color: 0xE9E4DA, roughness: 1 })); pad.position.set(0, 12.99, 0); S.add(pad);
    arm(BAR_Y, TX + 1.5, 0);
    // 烧杯与水
    var glass = new T3.MeshPhongMaterial({ color: 0xEEF5FC, transparent: true, opacity: .22, shininess: 110, specular: 0xffffff, side: T3.DoubleSide, depthWrite: false });
    var wall = new T3.Mesh(new T3.CylinderGeometry(B_R, B_R, B_H, 48, 1, true), glass); wall.position.set(0, B_Y0 + B_H / 2, 0); S.add(wall);
    var lip = new T3.Mesh(new T3.TorusGeometry(B_R, 0.16, 8, 48), new T3.MeshStandardMaterial({ color: 0x9FB3CC, roughness: .4 })); lip.rotation.x = Math.PI / 2; lip.position.set(0, B_Y0 + B_H, 0); S.add(lip);
    waterM = new T3.MeshPhongMaterial({ color: 0xA9D3EE, transparent: true, opacity: .5, shininess: 70, depthWrite: false });
    var water = new T3.Mesh(new T3.CylinderGeometry(B_R - 0.2, B_R - 0.2, SURF - B_Y0 - 0.2, 48), waterM); water.position.set(0, (SURF + B_Y0 + 0.2) / 2, 0); S.add(water);
    var surf = new T3.Mesh(new T3.CircleGeometry(B_R - 0.2, 48), new T3.MeshPhongMaterial({ color: 0xBFE0F4, transparent: true, opacity: .6, shininess: 120, depthWrite: false })); surf.rotation.x = -Math.PI / 2; surf.position.y = SURF; S.add(surf);
    // 气泡与白气
    var bm = new T3.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: .75, shininess: 120, depthWrite: false });
    for (var i = 0; i < 90; i++) { var b = new T3.Mesh(new T3.SphereGeometry(1, 10, 8), bm); b.visible = false; b.userData = { alive: false }; S.add(b); bubbles.push(b); }
    // 白气：柔边、淡白、半透明的小团（白底上略带一点灰才看得见），在小孔上方隔一小段才出现
    var sc = document.createElement('canvas'); sc.width = sc.height = 128; var sg = sc.getContext('2d'), gr = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
    var steamTex = new T3.CanvasTexture(sc);
    for (var j = 0; j < 22; j++) { var p = new T3.Sprite(new T3.SpriteMaterial({ map: steamTex, color: 0xD5DDE5, transparent: true, opacity: 0, depthWrite: false })); p.userData = { ph: j / 22, dx: (Math.random() - .5) * 1.6, dz: (Math.random() - .5) * 1.6, sw: Math.random() * 6.28, sz: 0.8 + Math.random() * 0.5 }; S.add(p); puffs.push(p); }
    // 纸板（带孔）：盖上时在杯口，取下时平放在桌上
    var card = new T3.Shape(); card.absarc(0, 0, B_R + 0.6, 0, Math.PI * 2, false);
    var hole = new T3.Path(); hole.absarc(TX, 0, 0.75, 0, Math.PI * 2, true); card.holes.push(hole);
    var hole2 = new T3.Path(); hole2.absarc(-2.2, 1.2, 0.45, 0, Math.PI * 2, true); card.holes.push(hole2);
    lid = new T3.Mesh(new T3.ExtrudeGeometry(card, { depth: 0.25, bevelEnabled: false, curveSegments: 32 }), new T3.MeshStandardMaterial({ color: 0xD9C4A0, roughness: .95 }));
    lid.geometry.rotateX(Math.PI / 2); lid.castShadow = true; S.add(lid);
    lidHit = new T3.Mesh(new T3.CylinderGeometry(B_R + 1, B_R + 1, 1.2, 16), new T3.MeshBasicMaterial({ visible: false })); S.add(lidHit);
    // 酒精灯
    lamp = new T3.Group();
    var lampGlass = new T3.Mesh(new T3.LatheGeometry([[0, 0], [3.4, 0], [3.8, 0.6], [3.9, 2.4], [3.3, 4.4], [1.6, 5.6], [1.1, 6.2], [0, 6.2]].map(function (p) { return new T3.Vector2(p[0], p[1]); }), 32),
      new T3.MeshPhongMaterial({ color: 0xDCEBF5, transparent: true, opacity: .55, shininess: 100, depthWrite: false }));
    lamp.add(lampGlass);
    var alc = new T3.Mesh(new T3.CylinderGeometry(3.5, 3.3, 2.4, 32), new T3.MeshPhongMaterial({ color: 0x9FD0EA, transparent: true, opacity: .45, depthWrite: false })); alc.position.y = 1.4; lamp.add(alc);
    var neck = new T3.Mesh(new T3.CylinderGeometry(1.0, 1.1, 0.9, 20), new T3.MeshStandardMaterial({ color: 0xBFC6CF, metalness: .6, roughness: .3 })); neck.position.y = 6.6; lamp.add(neck);
    var wick = new T3.Mesh(new T3.CylinderGeometry(0.22, 0.22, 0.9, 8), new T3.MeshStandardMaterial({ color: 0x3A3A3A })); wick.position.y = 7.4; lamp.add(wick);
    flame = new T3.Group();
    var fo = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: 0xFFB347, transparent: true, opacity: .55, depthWrite: false })); fo.scale.set(0.75, 2.4, 0.75); flame.add(fo);
    var fi = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: 0x6FA8FF, transparent: true, opacity: .6, depthWrite: false })); fi.scale.set(0.38, 1.1, 0.38); fi.position.y = -0.9; flame.add(fi);
    flame.position.y = 9.6; lamp.add(flame);
    var lampHit = new T3.Mesh(new T3.CylinderGeometry(4.5, 4.5, 11, 12), new T3.MeshBasicMaterial({ visible: false })); lampHit.position.y = 5; lamp.add(lampHit);
    lampGlass.castShadow = true; S.add(lamp);
    // 温度计：局部原点 = 玻璃泡底部
    therm = new T3.Group();
    var tubeM = new T3.MeshPhongMaterial({ color: 0xF4F8FC, transparent: true, opacity: .5, shininess: 100, depthWrite: false });
    var tube = new T3.Mesh(new T3.CylinderGeometry(0.34, 0.34, LEN - 1, 20), tubeM); tube.position.y = 1 + (LEN - 1) / 2; therm.add(tube);
    var back = new T3.Mesh(new T3.PlaneGeometry(0.62, COLL + 1.2), new T3.MeshBasicMaterial({ map: tickTexture() })); back.position.set(0, COL0 + COLL / 2, -0.16); therm.add(back);
    var red = new T3.MeshStandardMaterial({ color: 0xD8322A, roughness: .35 });
    var bulb = new T3.Mesh(new T3.SphereGeometry(BR, 20, 14), red); bulb.scale.y = 1.2; bulb.position.y = BR * 1.2; therm.add(bulb);
    col = new T3.Mesh(new T3.CylinderGeometry(0.13, 0.13, 1, 10), red); col.position.z = 0.06; therm.add(col);
    var loop = new T3.Mesh(new T3.TorusGeometry(0.5, 0.08, 6, 16), new T3.MeshStandardMaterial({ color: 0x8C99AA })); loop.position.y = LEN + 0.5; therm.add(loop);
    var tHit = new T3.Mesh(new T3.CylinderGeometry(1.8, 1.8, LEN + 2, 8), new T3.MeshBasicMaterial({ visible: false })); tHit.position.y = LEN / 2; therm.add(tHit);
    therm.position.x = TX; S.add(therm);
    thread = new T3.Mesh(new T3.CylinderGeometry(0.05, 0.05, 1, 6), new T3.MeshBasicMaterial({ color: 0x56677D })); S.add(thread);
    // 拖动：温度计上下；酒精灯左右；点纸板盖上 / 取下
    var grab = null, vplane = new T3.Plane(new T3.Vector3(0, 0, 1), 0), hplane = new T3.Plane(new T3.Vector3(0, 1, 0), -3);
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [tHit, lampHit, lidHit]); },
      start: function (ev) {
        var p;
        if (V.pick(ev, [tHit])) { p = V.onPlane(ev, vplane); grab = { k: 'th', dy: p ? p.y - st.h : 0 }; return true; }
        var lh = V.pick(ev, [lampHit]); if (lh) { var lp = lamp.worldToLocal(lh.point.clone()), sp = V.toScreen(lh.point), mp = stagePt(ev); grab = { k: 'lamp', lp: lp, ox: mp.x - sp.x, oy: mp.y - sp.y }; return true; }
        if (V.pick(ev, [lidHit])) { st.lid = !st.lid; changed(); return true; }
        return false;
      },
      move: function (ev) {
        if (!grab) return;
        var p;
        if (grab.k === 'th') { p = V.onPlane(ev, vplane); if (p) setH(p.y - grab.dy); }
        else {   // 酒精灯只能沿桌面左右移：找一个位置，让按住的那一点在屏幕上离手指最近
          var m = stagePt(ev), tx = m.x - grab.ox, ty = m.y - grab.oy, best = st.lamp, bd = 1e9;
          for (var u = 0; u <= 1.0001; u += 0.01) { var w = V.toScreen(grab.lp.clone().add(new T3.Vector3(22 * (1 - u), 0, 0))), d = Math.hypot(w.x - tx, w.y - ty); if (d < bd) { bd = d; best = u; } }
          setLamp(best);
        }
      },
      end: function () {   // 酒精灯松手：靠近烧杯就移到正下方，靠近原位就放回杯旁
        if (grab && grab.k === 'lamp') { if (st.lamp > 0.7) setLamp(1); else if (st.lamp < 0.2) setLamp(0); }
        grab = null;
      }
    };
    V.frame = tick;
  }
  function stagePt(ev) { var r = K.stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
  function lampX() { return 22 * (1 - st.lamp); }
  function setH(h) { st.h = clamp(h, BOT, 27); changed(); }
  function setLamp(u) { st.lamp = clamp(u, 0, 1); changed(); }

  /* ── 模拟 ── */
  function tick(dt) {
    var sdt = st.paused ? 0 : dt * st.speed, m = sdt / 60;
    if (sdt > 0) {
      if (heating()) {
        st.offFor = 0;
        if (!st.boil) {
          var f = clamp((BP - st.w) / 10, 0, 1), rate = st.lid ? 2.2 + 2 * f : 2.05 + 0.9 * f;   // ℃/min，见文件头说明
          st.w += rate * m; if (st.w >= BP - 0.02) { st.w = BP; st.boil = true; st.everBoil = true; }
        }
      } else if (st.boil) {
        st.offFor += sdt; if (st.offFor >= 5) st.boil = false;
      } else {
        st.w -= coolRate() * m;
        if (st.w > 90 && st.offFor > 0) st.offFor += sdt;
      }
      var tg = thTarget();
      st.th += (tg - st.th) * (1 - Math.exp(-sdt / 1.2));
      if (Math.abs(st.th - tg) < 0.2) st.th = tg;
      if (st.timerOn) {
        st.t += m;
        var k = Math.floor(st.t / 0.5 + 1e-9);
        if (k > st.lastK) snapshot(k);
      }
    }
    var cls = bubbleCls(); if (K.revealed() && cls !== st.revealCls) K.invalidate();
    pose(st.paused ? 0 : dt); drawWin(); drawTimer(); ui();
  }
  /* 采样时刻：保留温度快照（以及当时温度计放得对不对） */
  function snapshot(k) {
    st.lastK = k;
    st.samples[k] = { t: k * 0.5, T: reading(), ok: pos() === 'ok' && settled(), why: pos() !== 'ok' ? 'pos' : 'settle' };
    st.pendK = k;
    if (st.auto) { if (canRecord()) { addRow(); K.refreshData(); } }   // 自动记录：到采样时刻自动记入，不暂停
    else if (st.speed > 1 && k > 0) st.paused = true;   // 快进时每到采样时刻自动暂停，留出记录时间
    last = '';
  }
  function addRow() { var s = st.samples[st.pendK]; st.rows.push({ run: st.run, k: st.pendK, t: s.t, T: s.T }); st.rows.sort(function (a, b) { return a.t - b.t; }); }
  function stopHint() { return '已停止加热：沸腾停止了，温度开始下降。' + (st.speed === 1 ? '点「快进 ×10」看得更明显。' : ''); }
  function runRows() { return st.rows.filter(function (r) { return r.run === st.run; }); }   // 只用同一次加热过程的数据
  function canRecord() {
    var s = st.pendK != null ? st.samples[st.pendK] : null;
    return !!(s && s.ok && !runRows().some(function (r) { return r.k === st.pendK; }));
  }

  function pose(dt) {
    therm.position.y = st.h;
    var hh = Math.max(0.05, (st.th + 20) / 130 * COLL + (COL0 - 1.2)); col.scale.y = hh; col.position.y = 1.2 + hh / 2;
    var top = st.h + LEN + 1, len = BAR_Y - top; thread.scale.y = Math.max(0.1, len); thread.position.set(TX, top + len / 2, 0);
    lamp.position.set(lampX(), 0, 0);
    var fl = 1 + Math.sin(st.sim = (st.sim || 0) + dt * 9) * 0.06; flame.scale.set(1, fl, 1);
    if (st.lid) { lid.position.set(0, LID_Y, 0); lid.rotation.set(0, 0, 0); } else { lid.position.set(-12, 1.6, 12); lid.rotation.set(0, 0.4, 0); }
    lidHit.position.copy(lid.position);
    waterM.color.setHex(st.w > 95 ? 0xB4D9EF : 0xA9D3EE);
    // 气泡：沸腾前少、上升变小；沸腾时多、上升变大、到水面破裂
    var cls = bubbleCls(), rate = { boil: 30, 'boil-off': 18, pre: 3, start: 0.8, stopped: 0, none: 0 }[cls];
    st._acc = (st._acc || 0) + rate * dt;
    while (st._acc >= 1) { st._acc -= 1; spawn(cls === 'boil' || cls === 'boil-off'); }
    bubbles.forEach(function (b) {
      var u = b.userData; if (!u.alive) return;
      u.y += u.v * dt; u.r += (u.grow ? 0.22 : -0.09) * dt;
      if (u.r < 0.06 || u.y > SURF - u.r * 0.5) { u.alive = false; b.visible = false; return; }
      b.position.set(u.x + Math.sin(u.y * 3) * 0.08, u.y, u.z); b.scale.setScalar(u.r);
    });
    // 白气：在纸板小孔（或杯口）上方隔一小段（约 2 cm）才出现，边上升边散开、变淡
    var y0 = st.lid ? LID_Y + 2 : B_Y0 + B_H + 2, hx = st.lid ? -2.2 : 0, hz = st.lid ? 1.2 : 0, spread = st.lid ? 1 : 2.2, lvl = steamLvl();
    puffs.forEach(function (p) {
      var u = p.userData; u.ph = (u.ph + dt / 3.2) % 1;
      var sway = Math.sin(u.sw + u.ph * 4) * 0.5 * u.ph;
      p.position.set(hx + u.dx * spread * (0.5 + u.ph * 2.2) + sway + u.ph * 1.2, y0 + u.ph * 9, hz + u.dz * spread * (0.5 + u.ph * 2.2));
      p.scale.setScalar((1 + u.ph * 2.8) * u.sz);
      p.material.opacity = lvl * 0.75 * Math.min(1, u.ph / 0.18) * (1 - u.ph);   // 下端淡入（离小孔一小段才看得见），上端散开消失
    });
  }
  function spawn(boil) {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i], u = b.userData; if (u.alive) continue;
      var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (B_R - 1);
      u.alive = true; u.x = Math.cos(a) * rr; u.z = Math.sin(a) * rr; u.y = B_Y0 + 0.4; u.grow = boil;
      u.r = boil ? 0.15 + Math.random() * 0.1 : 0.28 + Math.random() * 0.12; u.v = boil ? 5 + Math.random() * 3 : 2.4 + Math.random();
      b.visible = true; b.scale.setScalar(u.r); b.position.set(u.x, u.y, u.z); return;
    }
  }

  /* ── 观察窗：液柱顶端放大；计时器 ── */
  function drawWin() {
    var T = st.th, key = Math.round(T * 20);
    if (key === winKey) return; winKey = key;
    if (!winEl) winEl = K.el('<div class="lk-win"><h3><span>温度计液柱放大</span><small>平视</small></h3><svg viewBox="0 0 360 200"></svg></div>');
    var cx = 160, mid = 100, k = 12, y = function (tt) { return mid - (tt - T) * k; }, s = '';
    s += '<rect x="' + (cx - 34) + '" y="0" width="68" height="200" fill="#FBFCFD" stroke="#C3CEDC"/>';
    for (var t = Math.floor(T - 9); t <= Math.ceil(T + 9); t++) {
      var Y = y(t); if (Y < -2 || Y > 202) continue;
      var ln = t % 10 === 0 ? 30 : t % 5 === 0 ? 22 : 13;
      s += '<line x1="' + (cx - 34) + '" y1="' + Y + '" x2="' + (cx - 34 + ln) + '" y2="' + Y + '" stroke="#1E3A5F" stroke-width="' + (t % 5 ? 1.5 : 2.6) + '"/>';
      if (t % 5 === 0 && Y > 14 && Y < 190) s += '<text x="' + (cx - 44) + '" y="' + (Y + 6) + '" text-anchor="end" font-size="20" font-weight="600" font-family="Bahnschrift" fill="#1E3A5F">' + t + '</text>';
    }
    s += '<rect x="' + (cx + 6) + '" y="0" width="16" height="200" rx="8" fill="#EEF4FA" stroke="#9FB3CC"/><rect x="' + (cx + 9) + '" y="' + mid + '" width="10" height="' + (200 - mid) + '" fill="#D8322A"/><rect x="' + (cx + 9) + '" y="' + (mid - 3) + '" width="10" height="6" rx="3" fill="#D8322A"/>';
    s += '<line x1="330" y1="' + mid + '" x2="' + (cx + 26) + '" y2="' + mid + '" stroke="#FE752D" stroke-width="2.5" stroke-dasharray="7 6"/><g transform="translate(330 ' + mid + ')"><path d="M-16 0q16-13 32 0q-16 13-32 0z" fill="#fff" stroke="#1E3A5F" stroke-width="2"/><circle cx="-2" cy="0" r="5" fill="#1E3A5F"/></g>';
    winEl.querySelector('svg').innerHTML = s;
  }
  function drawTimer() {
    var key = [st.t.toFixed(2), st.timerOn, st.paused, st.speed].join('|');
    if (key === timerKey) return; timerKey = key;
    if (!timerEl) {
      timerEl = K.el('<div style="position:absolute;left:18px;bottom:58px;width:250px;border:2px solid #1E3A5F;border-radius:12px;background:#1E3A5F;padding:8px;cursor:pointer" title="点击：开始 / 暂停计时"><div style="background:#DCE8D2;border-radius:8px;padding:4px 12px;display:flex;align-items:baseline;justify-content:space-between"><small style="font-size:14px;color:#56677D" data-k="st"></small><span><b data-k="t" style="font:700 46px Bahnschrift,Arial;color:#1E3A5F"></b> <small style="font-size:18px;color:#1E3A5F">min</small></span></div></div>');
      timerEl.onclick = timerBtn;
    }
    timerEl.querySelector('[data-k=t]').textContent = st.t.toFixed(1);
    timerEl.querySelector('[data-k=st]').textContent = (!st.timerOn ? '计时器' : st.paused ? '已暂停' : '计时中') + (st.speed > 1 ? ' ×10' : '');
  }

  /* ── 检查与提示 ── */
  function changed() { last = ''; }
  function ui() {
    var p = pos(), heat = heating(), pend = st.pendK != null ? st.samples[st.pendK] : null, rec = canRecord(), hint, tone = '';
    var checks = [{ label: '浸没', ok: p === 'air' ? null : p !== 'partial' }, { label: '不碰杯底', ok: p === 'air' || p === 'partial' ? null : p !== 'bottom' }, { label: '加热', ok: heat ? true : (st.timerOn || st.noHeat ? false : null) }, { label: '计时', ok: st.timerOn ? true : null }];
    if (st.noHeat && !heat && !st.timerOn) { hint = '酒精灯不在烧杯正下方，水没有被加热，先别计时。把酒精灯拖到杯下再点「开始计时」。'; tone = 'warn'; }
    else if (p === 'air') { hint = '先把温度计放进水里：向下拖温度计，或拖右侧「温度计」滑杆。'; tone = st.timerOn ? 'warn' : ''; }
    else if (p === 'partial') { hint = '玻璃泡要全部浸没，再往下放一点。'; tone = 'warn'; }
    else if (p === 'bottom') { hint = '玻璃泡碰到杯底了，示数偏高。往上提一点。'; tone = 'warn'; }
    else if (!settled() && !st.timerOn) hint = '温度计示数还在变化，等它稳定。';
    else if (!heat && st.everBoil && !st.boil && !rec) hint = stopHint();
    else if (K.S.q === 2 && !heat && !st.timerOn) hint = st.rows.length ? '打开「数据」，比较图像上升的一段和水平的一段。' : '先在第 2 问加热、计时并记录，再到「数据」看图像。';
    else if (!heat && !st.boil && !st.timerOn) hint = K.S.q === 0 ? '把酒精灯拖到烧杯正下方加热，观察水中的气泡。' : '把酒精灯拖到烧杯正下方加热，再点「开始计时」，或直接点「一键摆好并开始计时」。';
    else if (!st.timerOn && st.boil && !heat) hint = '酒精灯移走了：沸腾还会继续吗？看温度怎样变化。';   // 撤灯后立即换成观察提示（沸腾还会持续几秒）
    else if (!st.timerOn && st.boil) hint = K.S.q === 5 ? '水在沸腾。看' + (st.lid ? '纸板小孔' : '杯口') + '上方的白气。' : (BOIL_HINT[K.S.q] || '水在沸腾。读出温度，再按本问的任务操作。');
    else if (!st.timerOn && K.S.q === 0) hint = '正在加热。' + (st.close ? '' : '打开「气泡特写」') + '看气泡怎样变化' + (st.speed === 1 ? '；想快点看到沸腾，点「快进 ×10」。' : '。');
    else if (!st.timerOn) hint = '点「开始计时」，之后每隔 0.5 min 记录一次温度。';
    else if (rec) { hint = '到 ' + pend.t.toFixed(1) + ' min 了，点「记录这组数据」' + (st.paused ? '，再点「继续」。' : '。'); tone = 'good'; }
    else if (st.paused) { hint = (pend && !pend.ok ? 't = ' + pend.t.toFixed(1) + ' min 这一次不能记。' : '已暂停。') + '点「继续」。'; }
    else if (pend && !pend.ok && !runRows().some(function (r) { return r.k === st.pendK; })) { hint = 't = ' + pend.t.toFixed(1) + ' min 时' + (pend.why === 'pos' ? '温度计没放好' : '示数还没稳定') + '，这一次不能记。等下一个采样时刻。'; tone = 'warn'; }
    else if (st.boil && !heat) hint = '酒精灯移走了：沸腾还会继续吗？看温度怎样变化。';
    else if (st.boil) hint = runRows().filter(function (r) { return r.T >= BP; }).length >= 9 ? '沸腾已持续 4 min 以上，可以到「数据」看图像。' : '水在沸腾。继续加热，记到沸腾 4～5 min 后为止。';
    else if (!heat && st.everBoil) hint = stopHint();
    else if (!heat) { hint = '酒精灯不在烧杯正下方，水没有被加热。'; tone = 'warn'; }
    else hint = st.auto ? '自动记录中：每 0.5 min 自动记一次，已记 ' + runRows().length + ' 次。' : '等下一个采样时刻（每 0.5 min）' + (st.speed === 1 ? '；嫌慢可点「快进 ×10」。' : '。');
    st.revealCls = K.revealed() ? (st.revealCls || bubbleCls()) : bubbleCls();
    // 第 6 问问的是杯口“白气”，结果说明白气；其他问说明气泡现象
    var res = K.S.q === 5 ? (steamLvl() > 0.2 ? steamTxt() : '白气｜现在水没有沸腾，' + holeName() + '上方几乎没有白气。')
      : K.S.q === 0 ? '气泡现象｜打开「气泡特写」，让学生自己描述沸腾前、沸腾时气泡的变化。'   // 第 1 问不给现象描述，让学生自己观察
      : '气泡现象｜' + CLS_TXT[st.revealCls];
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: true, btn: ['显示观察结果'], result: res });
    var key = [rec, st.pendK, st.rows.length, st.timerOn, st.paused, st.speed, st.lid, st.close, st.auto, Math.round(st.lamp * 50), Math.round(st.h * 10), reading(), st.t.toFixed(1)].join('|');
    if (key === last) return; last = key;
    K.setReading('T', String(reading()));
    K.setReading('m', st.t.toFixed(1));
    K.setRecord(rec, rec ? '记入第 ' + (runRows().length + 1) + ' 次：' + pend.t.toFixed(1) + ' min，' + pend.T + ' ℃' : st.auto && st.timerOn ? '自动记录已打开' : '', rec ? 'good' : '');
    K.setCount(runRows().length + ' 次');
    syncCtrls();
  }
  var warnT = null;
  function timerBtn() {
    if (!st.timerOn && !heating()) {   // 没在加热就计时，记下的不是“加热过程”的数据：先提示，不开始
      st.noHeat = true; K.warn('酒精灯不在烧杯正下方，水没有被加热');
      clearTimeout(warnT); warnT = setTimeout(function () { K.warn(''); }, 3500); changed(); return;
    }
    st.noHeat = false; K.warn('');
    if (!st.timerOn) { st.timerOn = true; st.paused = false; st.t = 0; st.lastK = -1; st.run = (st.run || 0) + 1; snapshot(0); }
    else st.paused = !st.paused;
    changed();
  }

  /* ── 控件：位置（两条滑杆）→ 计时（动作 + 速度选择）→ 观察（纸板、气泡特写两个开关） ── */
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('位置', '<div class="row"><span class="nm">温度计</span><input class="rng" type="range" id="s-h" min="' + BOT + '" max="27" step="0.05" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-h" style="font-size:20px;min-width:92px"></span></div>' +
        '<div class="row"><span class="nm">酒精灯</span><input class="rng" type="range" id="s-l" min="0" max="1" step="0.01" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-l" style="font-size:20px;min-width:92px"></span></div>') +
      K.grp('计时', K.acts([['go', '▶', '开始计时', 'main'], ['auto', '✓', '自动记录']]) + K.seg('sp', [['1', '正常速度'], ['10', '快进 ×10']])) +
      K.grp('观察', '<div class="acts">' + K.sw('lid', '纸板', '盖上', '取下', st.lid) + K.sw('close', '气泡特写', '开', '关', st.close) + '</div>') +
      K.grp('快捷', K.acts([['ready', '✓', '一键摆好并开始计时']]));
    document.getElementById('auto').title = '到采样时刻自动记入，快进时不暂停';
    var sh = document.getElementById('s-h'), sl = document.getElementById('s-l');
    K.rng(sh); K.rng(sl);
    sh.addEventListener('input', function () { setH(parseFloat(sh.value)); });
    sl.addEventListener('input', function () { setLamp(parseFloat(sl.value)); });
    sl.addEventListener('change', function () { if (st.lamp > 0.7) setLamp(1); else if (st.lamp < 0.2) setLamp(0); });
    document.getElementById('go').onclick = timerBtn;
    // 一键摆好：温度计浸没到合适深度（不碰杯底）、酒精灯放到杯下、盖上纸板、计时器归零并开始计时
    document.getElementById('ready').onclick = function () {
      st.h = 15.5; st.th = st.w; st.lamp = 1; st.lid = true; st.noHeat = false;   // 温度计直接显示水温，第 0 min 就能记
      st.timerOn = false; st.paused = false; st.t = 0; st.lastK = -1; st.pendK = null;
      timerBtn();
    };
    document.querySelectorAll('[data-sp]').forEach(function (b) { b.onclick = function () { st.speed = +b.getAttribute('data-sp'); changed(); }; });
    document.getElementById('lid').onclick = function () { st.lid = !st.lid; changed(); };
    document.getElementById('close').onclick = function () { setClose(!st.close); };
    document.getElementById('auto').onclick = function () {
      st.auto = !st.auto;
      if (st.auto) { if (canRecord()) { addRow(); K.refreshData(); } if (st.paused && st.timerOn) st.paused = false; }   // 打开时把当前这一次也记上，并继续计时
      changed();
    };
  }
  function syncCtrls() {
    var sh = document.getElementById('s-h'), sl = document.getElementById('s-l'), p = pos();
    if (document.activeElement !== sh) sh.value = st.h; if (document.activeElement !== sl) sl.value = st.lamp;
    [sh, sl].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-h').textContent = { air: '水面上方', partial: '未浸没', bottom: '碰到杯底', ok: '已浸没' }[p];
    document.getElementById('v-l').textContent = heating() ? '杯下·加热' : st.lamp < 0.03 ? '杯旁' : '没到杯下';
    var go = document.getElementById('go'); go.innerHTML = !st.timerOn ? '<i>▶</i>开始计时' : st.paused ? '<i>▶</i>继续' : '<i>■</i>暂停'; go.classList.toggle('main', !st.timerOn || st.paused);
    document.querySelectorAll('[data-sp]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-sp') === st.speed); });
    K.setSw('lid', st.lid);
    K.setSw('close', st.close);
    document.getElementById('auto').classList.toggle('on', st.auto);
  }
  function setClose(on) {
    st.close = on;
    if (on) { V.target.set(0.5, 24, 0); V.orb.dist = 44; V.orb.el = 0.12; V.orb.az = 0.3; }
    else { V.target.set(2, 25, 0); V.orb.dist = 104; V.orb.el = 0.16; V.orb.az = 0.38; }
    V.view(); changed();
  }

  function preset(i) {
    var boilQ = i >= 3;
    st.w = boilQ ? BP : 88; st.boil = boilQ; st.everBoil = boilQ; st.offFor = 0; st.lamp = boilQ ? 1 : 0; st.lid = true;
    st.h = i === 0 ? 26 : 15.5; st.th = i === 0 ? ROOM : st.w;
    st.timerOn = false; st.paused = false; st.t = 0; st.lastK = -1; st.pendK = null; st.samples = {}; st.speed = 1; st.noHeat = false; K.warn('');
    if (K.revealed()) K.invalidate();
    setClose(i === 5);
  }

  window.__exp = { st: st, V: function () { return V; }, therm: function () { return therm; }, lamp: function () { return lamp; } };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'T', name: '温度计示数', unit: '℃' }, { id: 'm', name: '时间', unit: 'min' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖温度计、酒精灯；点纸板、计时器；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    onReveal: function (on) { st.revealCls = on ? bubbleCls() : null; last = ''; },
    record: function () { if (!canRecord()) return; addRow(); last = ''; },
    clear: function () { st.rows = []; last = ''; },
    renderData: function () {
      // 数据页只画最近一次加热过程（每次「开始计时」算一次）；更早的过程保留在记录里，清空记录可删除
      var lastRun = st.rows.reduce(function (m, r) { return Math.max(m, r.run); }, 0), R = st.rows.filter(function (r) { return r.run === lastRun; }), older = st.rows.length - R.length, tMax = Math.max(6, Math.ceil(((R.length ? R[R.length - 1].t : 0) + 0.5) * 2) / 2);
      var tb = '<table class="rec" style="width:100%"><thead><tr><th style="position:sticky;top:0;background:#F7F9FC">次数</th><th style="position:sticky;top:0;background:#F7F9FC">时间/min</th><th style="position:sticky;top:0;background:#F7F9FC">温度/℃</th></tr></thead><tbody>' +
        (R.length ? R.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td class="n">' + r.t.toFixed(1) + '</td><td class="n">' + r.T + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="dim" style="text-align:center">还没有记录</td></tr>') + '</tbody></table>';
      // 温度—时间图像：纵轴 80～105 ℃（不从 0 开始，画截断符号），只画记录点并按时间连线
      var W = 620, H = 470, x0 = 70, y0 = 410, x1 = 600, y1 = 30, X = function (t) { return x0 + t / tMax * (x1 - x0); }, lo = Math.min(80, Math.floor(R.reduce(function (m, r) { return Math.min(m, r.T); }, 80) / 5) * 5), Y = function (T) { return y0 - (T - lo) / (105 - lo) * (y0 - y1); }, g = '';   // 冷却到 80 ℃ 以下时纵轴往下延
      for (var T = lo; T <= 105; T++) { var yy = Y(T); g += '<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="' + (T % 5 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (T % 5 === 0) g += '<text x="' + (x0 - 10) + '" y="' + (yy + 6) + '" text-anchor="end" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + T + '</text>'; }
      for (var t = 0; t <= tMax + 1e-9; t += 0.5) { var xx = X(t); g += '<line x1="' + xx + '" y1="' + y1 + '" x2="' + xx + '" y2="' + y0 + '" stroke="' + (t % 1 ? '#EEF2F7' : '#D3DBE6') + '"/>'; if (t % 1 === 0) g += '<text x="' + xx + '" y="' + (y0 + 26) + '" text-anchor="middle" font-size="18" font-family="Bahnschrift" fill="#1E3A5F">' + t + '</text>'; }
      g += '<path d="M' + x0 + ' ' + y1 + 'V' + y0 + 'H' + x1 + '" fill="none" stroke="#1E3A5F" stroke-width="2.5"/>';
      g += '<path d="M' + (x0 - 8) + ' ' + (y0 - 14) + 'l16 -6M' + (x0 - 8) + ' ' + (y0 - 6) + 'l16 -6" stroke="#1E3A5F" stroke-width="2"/>';
      g += '<text x="' + (x0 - 6) + '" y="' + (y1 - 10) + '" font-size="18" fill="#1E3A5F">温度/℃</text><text x="' + x1 + '" y="' + (y0 + 52) + '" text-anchor="end" font-size="18" fill="#1E3A5F">时间/min</text>';
      if (R.length > 1) g += '<polyline points="' + R.map(function (r) { return X(r.t) + ',' + Y(r.T); }).join(' ') + '" fill="none" stroke="#2563EB" stroke-width="3"/>';
      R.forEach(function (r) { g += '<circle cx="' + X(r.t) + '" cy="' + Y(r.T) + '" r="6" fill="#fff" stroke="#2563EB" stroke-width="3"/>'; });
      return '<div class="dvh"><h2>记录表与温度—时间图像</h2><span>每隔 0.5 min 记一次，记到沸腾 4～5 min 后为止</span></div>' +
        '<div style="display:flex;gap:24px;align-items:flex-start"><div style="flex:0 0 330px;max-height:760px;overflow:auto">' + tb + '</div>' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" style="flex:1;max-height:640px;border:2px solid #C3CEDC;border-radius:12px;background:#fff">' + g + '</svg></div>' +
        '<p class="tip">按时间顺序把点连起来，比较曲线的两段：上升的一段和水平的一段各说明了什么？' + (older ? '（只画最近一次加热，较早的 ' + older + ' 组未画出）' : '') + '</p>';
    }
  });
})();
