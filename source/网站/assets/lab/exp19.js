/* 19 探究电流与电压、电阻的关系（课本图17.1-1、图17.1-4、图17.1-8）。
   装置：定值电阻 R 与滑动变阻器 R′ 串联，电压表（0～3 V）并联在 R 两端，再串联电流表（0～0.6 A）、闸刀开关和两节干电池；
   桌上一排可更换的定值电阻 5、10、15、20、25 Ω。两种研究：「电阻一定」「电压一定」（目标 1.5 V 或 2.0 V）。
   参数：电源 3 V、内阻 0.4 Ω（两节干电池；有内阻后 5 Ω、滑片在最小处时约 0.55 A，10 Ω 时电压最高约 2.9 V，电表都不会正好满偏）；R′ 0～20 Ω；
   I = 3/(R+R′+0.4)，U = I·R（电流仍是 U/R，数据规律不变）。25 Ω 时滑片到头电压最低约 1.65 V（读 1.7 V），调不到 1.5 V。
   读数：电压读到 0.1 V，电流读到 0.01 A（指针在两小格之间时读半格），直接显示（本实验没有读数训练）。
   规则：换电阻前断开开关；首次闭合前滑片要在阻值最大处（否则提示、本次闭合期间不能记录）；电压一定时实际电压与目标相差不超过 0.05 V 才能记录。
   操作：拖滑片（跟手，接近两端松手吸到端点），或用右侧「调电压」（滑杆 + ← → 微调：每点一下电压表示数变 0.1 V，按住连续）；点桌上的备用电阻换上（需先断开）；点开关闭合 / 断开。 */
(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var EMF = 3, RIN = 0.4, RMAX = 20, OHMS = [5, 10, 15, 20, 25], TRAY = [[8, -19], [15, -19], [22, -19], [8, -13.5], [15, -13.5], [22, -13.5]];
  var SER = ['#2563EB', '#FE752D', '#B478FF', '#1B7A50', '#56677D'];
  var st = { q: 0, mode: 'R', R: 10, T: 1.5, p: 0, closed: false, armed: false, unsafe: false, flow: false, groups: { R: {}, U: {} }, nag: 0, nagMsg: '', U: 0, I: 0, wI: {} };
  var K, V, C, T3, W, am, vm, bat, sw, res, rh, win, P = {}, spare = {}, last = '', grab = null, dirty = true, ctl;

  function topo() {
    return [['w1', 'bat+', 'A.0.6', 'red'], ['w2', 'A.-', 'R.L', 'blue'], ['w3', 'R.R', 'rh.A', 'green'], ['w4', 'rh.D', 'sw.R', 'blue'], ['w5', 'sw.L', 'bat-', 'black'], ['v1', 'V.3', 'R.L', 'red'], ['v2', 'V.-', 'R.R', 'black']];
  }
  function solve() {
    var n = CC.net(), L = topo();
    n.ground('bat-'); n.cell('bat-', 'bat+', EMF, RIN, 'cell');
    L.forEach(function (w) { n.wire(w[1], w[2], w[0]); });
    if (st.closed) n.wire('sw.R', 'sw.L', 'sw');
    n.R('R.L', 'R.R', st.R, 'res'); n.R('rh.A', 'rh.D', Math.max(1e-3, st.p * RMAX), 'rh');
    n.R('A.0.6', 'A.-', 1e-3, 'am'); n.R('V.3', 'V.-', 1e6, 'vm');
    var s = n.solve();
    st.I = s.i('am'); st.U = s.v('V.3') - s.v('V.-');
    st.wI = {}; L.forEach(function (w) { st.wI[w[0]] = s.i(w[0]); });
    am.set(st.I, 0.6); vm.set(st.U, 3);
  }
  function wireSpecs() { return topo().map(function (w) { return { id: w[0], a: P[w[1]], b: P[w[2]], color: w[3], I: st.wI[w[0]] || 0 }; }); }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 44);
    bat = C.battery(S, { cells: 2, at: [-15, TOP, 15], plusLeft: true });
    sw = C.knife(S, { at: [15, TOP, 15] });
    am = C.meter(S, { letter: 'A', ranges: [0.6, 3], at: [-21, TOP, -13] });
    vm = C.meter(S, { letter: 'V', ranges: [3, 15], at: [-6, TOP, -13] });
    res = C.resistor(S, { at: [-8, TOP, 1], ohms: st.R });
    rh = C.rheostat(S, { at: [13, TOP, 2], Rmax: RMAX, length: 22, p: 0 });
    C.print(S, 'R', [-8, TOP + 0.03, 5.4], { size: 2.4, font: 'Times New Roman, serif', italic: true });
    C.print(S, 'R′', [13, TOP + 0.03, 7.4], { size: 2.4, font: 'Times New Roman, serif', italic: true });
    C.print(S, '备用电阻', [16, TOP + 0.03, -9.2], { size: 1.7 });
    TRAY.forEach(function (t, i) {   // 备用电阻：小托架上的色环电阻（换上去的那个位置空着）
      var g = C.group(S, [t[0], TOP, t[1]]); g.scale.setScalar(0.55);
      var r = C.resistor(g, { ohms: 5, noPosts: true }); r.hit.userData.act = 'spare:' + i; spare[i] = r; r.tag = C.group(S, [t[0], 0, t[1] + 2.2]);
    });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'R.L': res.posts.L, 'R.R': res.posts.R, 'rh.A': rh.posts.A, 'rh.D': rh.posts.D, 'A.-': am.posts['-'], 'A.0.6': am.posts['0.6'], 'V.-': vm.posts['-'], 'V.3': vm.posts['3'] };
    W = C.wires(S);
    sw.hit.userData.act = 'sw'; rh.hit.userData.act = 'slider';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: function () { }, allowTrial: false });
    var picks = [sw.hit, rh.hit].concat(TRAY.map(function (t, i) { return spare[i].hit; }));
    function hitAct(ev) { var h = V.pick(ev, picks), a = CC.actOf(h); if (a && a.indexOf('spare:') === 0 && !spare[+a.slice(6)].group.parent.visible) return null; return a ? { a: a, h: h } : null; }
    V.drag = {
      hit: function (ev) { return !!hitAct(ev); },
      start: function (ev) {
        var r = hitAct(ev); if (!r) return false;
        grab = { a: r.a, x: ev.clientX, y: ev.clientY, moved: false };
        if (r.a === 'sw') ctl.down();
        if (r.a === 'slider') { var lp = rh.group.worldToLocal(r.h.point.clone()); grab.off = lp.sub(new T3.Vector3(-rh.length / 2 + rh.p * rh.length, 0, 0)); grab.sp = rh.screenAt(V, rh.p, grab.off); grab.mp = CC.stagePt(K, ev); }
        return true;
      },
      move: function (ev) {
        if (!grab) return;
        if (!grab.moved && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 4) { grab.moved = true; if (grab.a === 'sw') ctl.move(true); }
        if (grab.a === 'slider' && grab.moved) { var m = CC.stagePt(K, ev); setP(rh.fit(V, { x: grab.sp.x + m.x - grab.mp.x, y: grab.sp.y + m.y - grab.mp.y }, grab.off)); }
      },
      end: function () {
        var g = grab; grab = null; if (!g) return;
        if (g.a === 'sw') { ctl.up(); return; }
        if (g.a === 'slider') { if (g.moved) snapEnds(); return; }
        if (!g.moved && g.a.indexOf('spare:') === 0) setR(spare[+g.a.slice(6)].ohms);
      }
    };
    win = CC.win(K, '电表表盘', [{ m: vm, name: function () { return '电压表 0～3 V'; } }, { m: am, name: function () { return '电流表 0～0.6 A'; } }], 330);
    V.frame = tick;
    layoutTray();
  }
  function layoutTray() {   // 备用电阻：除接入电路的那一个
    var k = 0;
    OHMS.forEach(function (o) {
      if (o === st.R) return;
      var r = spare[k++]; r.setOhms(o); r.group.parent.visible = r.tag.visible = true;
      if (r.tag.userData.o !== o) { r.tag.userData.o = o; while (r.tag.children.length) r.tag.remove(r.tag.children[0]); C.print(r.tag, o + ' Ω', [0, TOP + 0.03, 0], { size: 1.5, font: 'Bahnschrift, Arial' }); }
    });
    for (; k < TRAY.length; k++) spare[k].group.parent.visible = spare[k].tag.visible = false;
  }

  /* ── 操作 ── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function setR(o) { o = +o; if (o === st.R) return; if (st.closed) { nag('先断开开关，再换电阻。'); return; } st.R = o; res.setOhms(o); layoutTray(); changed(); }
  function setP(p) { p = CC.clamp(p, 0, 1); if (Math.abs(p - st.p) < 1e-6) return; st.p = p; rh.set(p); changed(); }
  function snapEnds() { if (st.p > 0.975) setP(1); else if (st.p < 0.025) setP(0); }
  function setClosed(v) {
    st.closed = !!v;
    if (v) { if (st.p >= 0.98) st.armed = true; st.unsafe = !st.armed; } else st.unsafe = false;
    changed();
  }
  function setMode(m) { if (m !== st.mode) { st.mode = m; changed(); } }
  function setT(t) { t = +t; if (t !== st.T) { st.T = t; changed(); } }
  function changed() { dirty = true; last = ''; st.nag = 0; }

  function tick(dt) {
    if (dirty) { dirty = false; solve(); W.set(wireSpecs()); }
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(st.closed); sw.update(dt); am.update(dt); vm.update(dt); W.flow(st.flow); W.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与记录 ── */
  function Uq() { return CC.quant(st.U, 0.1); }
  function Iq() { return Math.round(st.I * 100) / 100; }   // 指针在两小格之间时读半格（0.01 A），拖滑片到任意电压，I 和 U 都成正比
  function onTarget() { return Math.abs(st.U - st.T) <= 0.05 + 1e-9; }
  function valid() { return st.closed && !st.unsafe && !am.over && !vm.over && (st.mode === 'R' || onTarget()); }
  function grp() { var k = st.mode === 'R' ? st.R : st.T; return st.groups[st.mode][k] || []; }
  function dup() { var g = grp(); return st.mode === 'R' ? g.some(function (r) { return r.U === Uq().toFixed(1); }) : g.some(function (r) { return r.R === st.R; }); }
  function canRec() { return valid() && !dup(); }
  function ui() {
    var hint, tone = '', n = grp().length;
    var checks = [{ label: '开关闭合', ok: st.closed ? true : null }, { label: '闭合前滑片位置', ok: st.unsafe ? false : st.armed || (!st.closed && st.p >= 0.98) ? true : null }];
    // 第三项：电阻一定查量程；电压一定查是否调到目标电压（本电路电表不会超量程，三项排一行，右栏一屏放得下）
    checks.push(st.mode === 'U' ? { label: '<span class="m">U</span> = ' + st.T.toFixed(1) + ' V', ok: st.closed && !st.unsafe ? onTarget() : null } : { label: '不超量程', ok: st.closed ? !(am.over || vm.over) : null });
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (st.unsafe) { hint = '滑片没在阻值最大处！断开开关，移到最右端。'; tone = 'warn'; }
    else if (!st.closed && st.q === 0) hint = '先在「研究」一行选好：这一轮固定哪个量？';   // 第 1 问讨论方案，提示跟随本问，不提前说滑片
    else if (!st.closed) hint = !st.armed && st.p < 0.98 ? '闭合开关前，先想一想滑片该放在哪一端。' : st.mode === 'R' ? '闭合开关，用「调电压」改变 R 两端的电压。' : '闭合开关，用「调电压」把电压调到 ' + st.T.toFixed(1) + ' V。';
    else if (am.over || vm.over) { hint = '超过量程！断开开关。'; tone = 'warn'; }
    else if (st.mode === 'U' && !onTarget()) {
      if (st.U > st.T && st.p >= 0.999) { hint = '滑片已到头，电压最低 ' + Uq().toFixed(1) + ' V，调不到 ' + st.T.toFixed(1) + ' V。'; tone = 'warn'; }
      else hint = '电压 ' + Uq().toFixed(1) + ' V，要调到 ' + st.T.toFixed(1) + ' V：滑片' + (st.U > st.T ? '右移。' : '左移。');
    }
    else if (dup()) hint = st.mode === 'R' ? '这个电压记过了，移动滑片换一个。' : '这个电阻记过了。断开开关，换一个电阻。';
    else { hint = n >= 3 ? '可以记录。记够后到「数据」看图像。' : st.mode === 'R' ? '可以记录。记下后再换一个电压。' : '可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone });
    var key = [canRec(), Uq(), Iq(), st.closed, st.unsafe, st.armed, st.mode, st.R, st.T, st.p.toFixed(4), JSON.stringify(st.groups), st.flow].join('|');
    if (key === last) return; last = key;
    K.setReading('U', st.closed ? Uq().toFixed(1) : '0.0'); K.setReading('I', st.closed ? Iq().toFixed(2) : '0.00');
    var ok = canRec();
    K.setRecord(ok, ok ? (st.mode === 'R' ? '记入「R = ' + st.R + ' Ω」表第 ' + (n + 1) + ' 组' : '记入「U = ' + st.T.toFixed(1) + ' V」表第 ' + (n + 1) + ' 组') : '', ok ? 'good' : '');
    K.setCount(Object.keys(st.groups.R).reduce(function (s, k) { return s + st.groups.R[k].length; }, 0) + Object.keys(st.groups.U).reduce(function (s, k) { return s + st.groups.U[k].length; }, 0) + ' 组');
    sync();
  }

  /* ── 面板 ── */
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-mode', '研究', [['R', '电阻一定'], ['U1.5', '电压一定 1.5 V'], ['U2', '电压一定 2.0 V']]) +   // 电压一定时连同目标电压一起选
      CC.opts('o-R', '电阻 <span class="m">R</span>', OHMS.map(function (o) { return [String(o), o + ' Ω']; })) +
      CC.slideRow({ label: '调电压', name: '滑片 P' }) +
      CC.swRow({ flow: true });
    CC.bind('o-mode', function (v) { if (v === 'R') setMode('R'); else { setT(v.slice(1)); setMode('U'); } }); CC.bind('o-R', setR);
    CC.slideBind({ K: K, get: function () { return st.p; }, set: setP, end: snapEnds, nudge: nudge });
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, closed: function () { return st.closed; }, flow: function () { st.flow = !st.flow; last = ''; } });
  }
  /* ← → 微调：每点一下，电压表示数正好变 0.1 V（左移升高、右移降低），1.0、1.2、2.0、2.4 V 和各电阻下的 1.5 V、2.0 V 都能一步步点到，电流读数也正好是 U/R */
  function nudge(d) {
    var u = Math.round(EMF * st.R / (st.R + st.p * RMAX + RIN) * 10) / 10 - d * 0.1;   // 闭合时这一位置的电压读数，再升 / 降 0.1 V
    setP(u > 0 ? (EMF * st.R / u - st.R - RIN) / RMAX : 1);
  }
  function sync() {
    CC.mark('o-mode', st.mode === 'R' ? 'R' : 'U' + st.T); CC.mark('o-R', String(st.R));
    CC.slideSync(st.p, RMAX);
    CC.swSync(st.closed, false, st.flow);
  }

  function preset(i) {
    // 第 5 问 R′ = 4.6 Ω：5 Ω 时正好 1.5 V；换 10 Ω 不动滑片，电压变成 2.0 V
    var P0 = [['R', 10, 1.5, 0, false], ['R', 10, 1.5, 0, false], ['R', 10, 1.5, 1, false], ['R', 10, 1.5, 1, false], ['U', 5, 1.5, 0.23, true], ['U', 25, 1.5, 1, false]][i];
    st.q = i; st.mode = P0[0]; st.R = P0[1]; st.T = P0[2]; st.p = P0[3]; st.armed = P0[4]; st.closed = false; st.unsafe = false; st.nag = 0;
    res.setOhms(st.R); rh.set(st.p); layoutTray(); changed();
  }

  function renderData() {
    function tbl(mode, key, rows) {
      var head = mode === 'R' ? '<span class="m">R</span> = ' + key + ' Ω' : '<span class="m">U</span> = ' + (+key).toFixed(1) + ' V';
      return '<table class="rec" style="margin-bottom:12px"><thead><tr><th colspan="3" style="background:#E3ECFF;color:#1E3A5F">' + head + '</th></tr><tr><th style="width:70px">次数</th>' + (mode === 'R' ? '<th>电压 <span class="m">U</span>/V</th>' : '<th>电阻 <span class="m">R</span>/Ω</th>') + '<th>电流 <span class="m">I</span>/A</th></tr></thead><tbody>' +
        rows.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td class="n">' + (mode === 'R' ? r.U : r.R) + '</td><td class="n">' + r.I + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    var gR = st.groups.R, gU = st.groups.U, kR = Object.keys(gR).sort(function (a, b) { return a - b; }), kU = Object.keys(gU).sort(function (a, b) { return a - b; });
    var tabs = kR.map(function (k) { return tbl('R', k, gR[k]); }).join('') + kU.map(function (k) { return tbl('U', k, gU[k]); }).join('');
    // 电压一定时，有的电流落在两小格之间（如 20 Ω、1.5 V 时约 0.075 A），按半格估读成 0.07 A，乘积 I·R 会略有偏差：说明是读数误差
    var dev = kU.some(function (k) { return gU[k].some(function (r) { return Math.abs(r.R * r.I - k) > 0.04; }); });
    if (dev) tabs += '<p class="tip">有的电流（如 20 Ω 时约 0.075 A）落在两小格之间，电流表只能估读到 0.07 A 左右，所以 <span class="m">I</span>·<span class="m">R</span> 和设定电压略有差别，这是读数误差。</p>';
    if (!tabs) tabs = '<p class="tip" style="font-size:19px">还没有记录。「电阻一定」的数据按 <span class="m">R</span> 分表，「电压一定」的数据按 <span class="m">U</span> 分表。</p>';
    var sIU = kR.map(function (k, i) { return { name: 'R = ' + k + ' Ω', color: SER[i % 5], line: 'origin', pts: gR[k].map(function (r) { return [+r.U, +r.I]; }) }; });
    var sIR = kU.map(function (k, i) { return { name: 'U = ' + (+k).toFixed(1) + ' V', color: SER[(i + 1) % 5], line: 'smooth', pts: gU[k].map(function (r) { return [+r.R, +r.I]; }) }; });
    var g1 = CC.plot({ w: 640, h: 540, xName: '<tspan font-style="italic" font-family="Times New Roman">U</tspan>/V', yName: '<tspan font-style="italic" font-family="Times New Roman">I</tspan>/A', xMax: 3, yMax: 0.6, xMajor: 0.5, xMinor: 0.1, yMajor: 0.1, yMinor: 0.02, series: sIU });
    var g2 = CC.plot({ w: 640, h: 540, xName: '<tspan font-style="italic" font-family="Times New Roman">R</tspan>/Ω', yName: '<tspan font-style="italic" font-family="Times New Roman">I</tspan>/A', xMax: 30, yMax: 0.6, xMajor: 5, xMinor: 1, yMajor: 0.1, yMinor: 0.02, series: sIR });
    var tab = st.gtab || (st.mode === 'U' ? 'IR' : 'IU'), iu = tab === 'IU';   // 一次看一张大图，按钮切换
    var sw = '<div class="opts sm" style="margin:0 0 8px;max-width:520px"><button class="' + (iu ? 'on' : '') + '" onclick="__exp.gtab(\'IU\')">电阻一定：<span class="m">I</span>—<span class="m">U</span> 图像</button><button class="' + (iu ? '' : 'on') + '" onclick="__exp.gtab(\'IR\')">电压一定：<span class="m">I</span>—<span class="m">R</span> 图像</button></div>';
    var empty = iu ? (sIU.length ? '' : '<p class="tip">记录「电阻一定」的数据后在这里描点。</p>') : (sIR.length ? '' : '<p class="tip">记录「电压一定」的数据后在这里描点。</p>');
    return '<div class="dvh"><h2>记录表与图像</h2><span>只画记录的点</span></div>' +
      '<div style="display:flex;gap:24px;align-items:flex-start"><div style="flex:0 0 36%;max-height:800px;overflow:auto">' + tabs + '</div>' +
      '<div style="flex:1;min-width:0">' + sw + (iu ? g1 : g2) + empty + '</div></div>';
  }

  window.__exp = { gtab: function (t) { st.gtab = t; K.refreshData(); }, st: st, V: function () { return V; }, am: function () { return am; }, vm: function () { return vm; }, sw: function () { return sw; }, rh: function () { return rh; }, res: function () { return res; }, spare: function () { return spare; } };
  LabKit.run({
    readings: [{ id: 'U', name: '电压 <span class="m">U</span>', unit: 'V' }, { id: 'I', name: '电流 <span class="m">I</span>', unit: 'A' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖滑片 P（或右侧「调电压」）；点备用电阻换上；点开关闭合 / 断开；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    record: function () {
      if (!canRec()) return;
      var key = st.mode === 'R' ? st.R : st.T, g = st.groups[st.mode][key] = st.groups[st.mode][key] || [];
      g.push(st.mode === 'R' ? { U: Uq().toFixed(1), I: Iq().toFixed(2) } : { R: st.R, I: Iq().toFixed(2), U: Uq().toFixed(1) });
      last = '';
    },
    clear: function () { st.groups = { R: {}, U: {} }; last = ''; },
    renderData: renderData
  });
})();
