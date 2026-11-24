/* 20 用电流表和电压表测量电阻（课本图17.3-2）。
   装置：待测电阻 Rₓ 与滑动变阻器（滑片 P）串联，电压表（0～3 V）并联在 Rₓ 两端，再串联电流表（0～0.6 A）、闸刀开关和两节干电池。
   两种元件：「定值电阻」Rₓ = 10 Ω；「小灯泡」标有“2.5 V”（把 Rₓ 换成小灯泡）。
   参数：电源 3 V，不计内阻；R′ 0～20 Ω。小灯泡 I(U) 按指令的数据点分段线性插值：
   (0,0)(0.1,0.05)(0.5,0.16)(0.9,0.19)(1.3,0.21)(1.7,0.24)(2.1,0.26)(2.5,0.28)(3.0,0.305)，闭合时解 U + I(U)·R′ = 3 V（二分法）。
   读数：电压读到 0.1 V，电流读到 0.02 A（指针正好在两格正中时读半格），直接显示；R = U/I 用记录下的仪表读数在数据页计算。
   规则：换元件前断开开关；首次闭合前滑片要在阻值最大处（否则提示、本次闭合期间不能记录）；灯泡两端 2.5 V（±0.05 V）时显示“正常发光”。
   操作：拖滑片（跟手），或用右侧「调电压」（滑杆 + ← → 微调：定值电阻每步 0.5 Ω，小灯泡每步电压变 0.1 V，按住连续）；点桌上备用的元件换上；点开关闭合 / 断开。 */
(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var EMF = 3, RMAX = 20, RX = 10, SLOT = [-8, 1], TRAY = [17, -15];
  var LIV = [[0, 0], [0.1, 0.05], [0.5, 0.16], [0.9, 0.19], [1.3, 0.21], [1.7, 0.24], [2.1, 0.26], [2.5, 0.28], [3.0, 0.305]];
  var MODEN = { R: '定值电阻', L: '小灯泡' };
  var st = { mode: 'R', p: 0, closed: false, armed: false, unsafe: false, flow: false, rows: { R: [], L: [] }, graph: false, nag: 0, nagMsg: '', U: 0, I: 0, wI: {} };
  var K, V, C, T3, W, am, vm, bat, sw, res, lamp, rh, win, P = {}, tags = {}, last = '', grab = null, dirty = true, ctl;

  function lampI(u) { for (var i = 1; i < LIV.length; i++) if (u <= LIV[i][0]) { var a = LIV[i - 1], b = LIV[i]; return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); } return LIV[LIV.length - 1][1]; }
  function lampU(Rp) { var lo = 0, hi = EMF; for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (m + lampI(m) * Rp > EMF) hi = m; else lo = m; } return (lo + hi) / 2; }
  function topo() {
    return [['w1', 'bat+', 'A.0.6', 'red'], ['w2', 'A.-', 'X.L', 'blue'], ['w3', 'X.R', 'rh.A', 'green'], ['w4', 'rh.D', 'sw.R', 'blue'], ['w5', 'sw.L', 'bat-', 'black'], ['v1', 'V.3', 'X.L', 'red'], ['v2', 'V.-', 'X.R', 'black']];
  }
  function solve() {
    var Rp = st.p * RMAX, U = 0, I = 0;
    if (st.closed) { if (st.mode === 'R') { I = EMF / (RX + Rp); U = I * RX; } else { U = lampU(Rp); I = lampI(U); } }
    st.U = U; st.I = I;
    st.wI = {}; topo().forEach(function (w) { st.wI[w[0]] = w[0].charAt(0) === 'v' ? 0 : I; });
    am.set(I, 0.6); vm.set(U, 3);
    lamp.setPower(st.mode === 'L' ? U * I / 0.7 : 0);
  }
  function post(k) { var X = st.mode === 'R' ? res : lamp; return k === 'X.L' ? X.posts.L : k === 'X.R' ? X.posts.R : P[k]; }
  function wireSpecs() { return topo().map(function (w) { return { id: w[0], a: post(w[1]), b: post(w[2]), color: w[3], I: st.wI[w[0]] || 0 }; }); }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 44);
    bat = C.battery(S, { cells: 2, at: [-15, TOP, 15], plusLeft: true });
    sw = C.knife(S, { at: [15, TOP, 15] });
    am = C.meter(S, { letter: 'A', ranges: [0.6, 3], at: [-21, TOP, -13] });
    vm = C.meter(S, { letter: 'V', ranges: [3, 15], at: [-6, TOP, -13] });
    res = C.resistor(S, { at: [SLOT[0], TOP, SLOT[1]], ohms: RX, label: 'x' });
    lamp = C.bulb(S, { at: [TRAY[0], TOP, TRAY[1]] });
    rh = C.rheostat(S, { at: [13, TOP, 2], Rmax: RMAX, length: 22, p: 0 });
    C.print(S, 'R′', [13, TOP + 0.03, 7.4], { size: 2.4, font: 'Times New Roman, serif', italic: true });
    C.print(S, '备用', [TRAY[0] - 8.5, TOP + 0.03, TRAY[1] + 1], { size: 1.6 });
    tags.R = C.group(S); C.print(tags.R, 'R_x', [0, TOP + 0.03, 4.6], { size: 2.4, font: 'Times New Roman, serif', italic: true, w: 5 });
    tags.L = C.group(S); C.print(tags.L, '2.5 V', [0, TOP + 0.03, 4.6], { size: 1.8, font: 'Bahnschrift, Arial' });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'rh.A': rh.posts.A, 'rh.D': rh.posts.D, 'A.-': am.posts['-'], 'A.0.6': am.posts['0.6'], 'V.-': vm.posts['-'], 'V.3': vm.posts['3'] };
    W = C.wires(S);
    sw.hit.userData.act = 'sw'; rh.hit.userData.act = 'slider'; res.hit.userData.act = 'part:R'; lamp.hit.userData.act = 'part:L';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: function () { }, allowTrial: false });
    var picks = [sw.hit, rh.hit, res.hit, lamp.hit];
    function hitAct(ev) { var h = V.pick(ev, picks), a = CC.actOf(h); if (a && a.indexOf('part:') === 0 && a.slice(5) === st.mode) return null; return a ? { a: a, h: h } : null; }
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
        if (!g.moved && g.a.indexOf('part:') === 0) setMode(g.a.slice(5));
      }
    };
    win = CC.win(K, '电表表盘', [{ m: vm, name: function () { return '电压表 0～3 V'; } }, { m: am, name: function () { return '电流表 0～0.6 A'; } }], 330);
    V.frame = tick;
    place(true);
  }
  /* 接入电路的元件放在 Rₓ 位置，另一个放在“备用”处 */
  function place(instant, dt) {
    var k = instant ? 1 : Math.min(1, (dt || 0) * 8), moving = false;
    function go(obj, to) { var p = obj.position; if (Math.abs(p.x - to[0]) < 0.03 && Math.abs(p.z - to[1]) < 0.03) { if (p.x !== to[0] || p.z !== to[1]) { p.x = to[0]; p.z = to[1]; moving = true; } return; } p.x += (to[0] - p.x) * k; p.z += (to[1] - p.z) * k; moving = true; }
    go(res.group, st.mode === 'R' ? SLOT : TRAY); go(lamp.group, st.mode === 'L' ? SLOT : TRAY);
    tags.R.position.set(res.group.position.x, 0, res.group.position.z); tags.L.position.set(lamp.group.position.x, 0, lamp.group.position.z);
    if (moving) { V.scene.updateMatrixWorld(true); W.set(wireSpecs()); }
  }

  /* ── 操作 ── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function setMode(m) { if (m === st.mode) return; if (st.closed) { nag('先断开开关，再换元件。'); return; } st.mode = m; changed(); }
  function setP(p) { p = CC.clamp(p, 0, 1); if (Math.abs(p - st.p) < 1e-6) return; st.p = p; rh.set(p); changed(); }
  function snapEnds() { if (st.p > 0.975) setP(1); else if (st.p < 0.025) setP(0); }
  function setClosed(v) {
    st.closed = !!v;
    if (v) { if (st.p >= 0.98) st.armed = true; st.unsafe = !st.armed; } else st.unsafe = false;
    changed();
  }
  function changed() { dirty = true; last = ''; st.nag = 0; }

  function tick(dt) {
    if (dirty) { dirty = false; solve(); W.set(wireSpecs()); }
    place(false, dt);
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(st.closed); sw.update(dt); am.update(dt); vm.update(dt); W.flow(st.flow); W.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与记录 ── */
  function Uq() { return CC.quant(st.U, 0.1).toFixed(1); }
  function Iq() { return CC.readHalf(st.I, 0.02).toFixed(2); }
  function normal() { return st.mode === 'L' && st.closed && Math.abs(st.U - 2.5) <= 0.05 + 1e-9; }
  function bright(U) { U = +U; return U <= 0.3 ? '不发光' : U < 1.2 ? '微亮' : U < 2.45 ? '较暗' : U <= 2.55 ? '正常发光' : '比正常亮'; }
  function valid() { return st.closed && !st.unsafe && !am.over && !vm.over && st.I > 0.001; }
  function dup() { return st.rows[st.mode].some(function (r) { return r.U === Uq() && r.I === Iq(); }); }
  function canRec() { return valid() && !dup(); }
  function ui() {
    var hint, tone = '', n = st.rows[st.mode].length;
    var checks = [{ label: '开关闭合', ok: st.closed ? true : null }, { label: '闭合前滑片位置', ok: st.unsafe ? false : st.armed || (!st.closed && st.p >= 0.98) ? true : null }];
    // 第三项：定值电阻查量程；小灯泡换成“正常发光”（灯泡最大 3 V、约 0.3 A，电表不会超量程）。三项排一行，展开任务、答案时右栏也放得下
    checks.push(st.mode === 'L' ? { label: '正常发光', ok: normal() ? true : null } : { label: '不超量程', ok: st.closed ? !(am.over || vm.over) : null });
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (st.unsafe) { hint = '滑片没在阻值最大处！断开开关，移到最右端。'; tone = 'warn'; }
    else if (!st.closed) hint = !st.armed && st.p < 0.98 ? '闭合开关前，先想一想滑片该放在哪一端。' : st.mode === 'R' ? '闭合开关，用「调电压」测几组电压和电流。' : '闭合开关，用「调电压」让电压由低到高。';
    else if (am.over || vm.over) { hint = '超过量程！断开开关。'; tone = 'warn'; }
    else if (dup()) { hint = st.mode === 'L' && st.U > 2.55 ? '超过额定电压，不宜太久。这组已记过。' : '这组读数已记过，移动滑片换一组。'; tone = st.mode === 'L' && st.U > 2.55 ? 'warn' : ''; }
    else if (normal()) { hint = '灯泡正常发光。可以记录。'; tone = 'good'; }
    else if (st.mode === 'L' && st.U > 2.55) { hint = '超过额定电压，灯偏亮，不宜太久。可以记录。'; tone = 'warn'; }
    else if (st.mode === 'L') { var has25 = st.rows.L.some(function (r) { return r.U === '2.5'; }); hint = '灯泡' + bright(Uq()) + '，可以记录。' + (n >= 3 ? '记够后到「数据」算电阻。' : has25 ? '' : '再左移滑片，升高电压。'); tone = 'good'; }   // 提示一行写完，右栏不溢出
    else { hint = n >= 3 ? '可以记录。测够 3 组就到「数据」算电阻。' : '可以记录。记下后再移动滑片换一组。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone });
    var key = [canRec(), Uq(), Iq(), st.closed, st.unsafe, st.armed, st.mode, st.p.toFixed(4), st.rows.R.length, st.rows.L.length, st.flow].join('|');
    if (key === last) return; last = key;
    K.setReading('U', Uq()); K.setReading('I', Iq());
    var ok = canRec();
    K.setRecord(ok, ok ? '记入' + MODEN[st.mode] + '表第 ' + (n + 1) + ' 组' : '', ok ? 'good' : '');
    K.setCount(st.rows.R.length + st.rows.L.length + ' 组');
    sync();
  }

  /* ── 面板 ── */
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-mode', '元件', [['R', '定值电阻 <span class="m">R</span><sub>x</sub>'], ['L', '小灯泡 2.5 V']]) +
      CC.slideRow({ label: '调电压', name: '滑片 P' }) +
      CC.swRow({ flow: true });
    CC.bind('o-mode', setMode);
    CC.slideBind({ K: K, get: function () { return st.p; }, set: setP, end: snapEnds, nudge: nudge });
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, closed: function () { return st.closed; }, flow: function () { st.flow = !st.flow; last = ''; } });
  }
  /* ← → 微调：定值电阻每点一下滑片走 0.5 Ω（读数自然有误差，三次算出的电阻略有差别）；
     小灯泡每点一下电压表示数正好变 0.1 V（由低到高一步步测，也能正好调到 2.5 V） */
  function nudge(d) {
    if (st.mode === 'L') {
      var u = Math.round(lampU(st.p * RMAX) * 10) / 10 - d * 0.1;
      setP(u > 0.05 ? (EMF - u) / lampI(u) / RMAX : 1);
    } else setP(Math.round((st.p + d * 0.025) / 0.025 + 1e-6) * 0.025);
  }
  function sync() {
    CC.mark('o-mode', st.mode);
    CC.slideSync(st.p, RMAX);
    CC.swSync(st.closed, false, st.flow);
  }

  function preset(i) {
    var P0 = [['R', 0], ['R', 0], ['R', 1], ['L', 1], ['L', 1], ['R', 1]][i];
    st.mode = P0[0]; st.p = P0[1]; st.armed = false; st.closed = false; st.unsafe = false; st.nag = 0;
    rh.set(st.p); changed();
  }

  function renderData(K) {
    var calc = K.calcShown(), R = st.rows.R, L = st.rows.L;
    function rr(r) { return (+r.U / +r.I).toFixed(1); }
    var avg = R.length ? (R.reduce(function (s, r) { return s + +rr(r); }, 0) / R.length).toFixed(1) : '';
    var t1 = '<h3 style="margin:4px 0 8px;font-size:22px">测定值电阻</h3><table class="rec" style="margin-bottom:18px"><thead><tr><th style="width:90px">次数</th><th>电压 <span class="m">U</span>/V</th><th>电流 <span class="m">I</span>/A</th><th>电阻 <span class="m">R</span>/Ω</th><th>电阻的平均值 <span class="m">R</span>/Ω</th></tr></thead><tbody>' +
      (R.length ? R.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td class="n">' + r.U + '</td><td class="n">' + r.I + '</td>' + (calc ? '<td class="n calc">' + rr(r) + '</td>' : '<td class="dim">?</td>') + (i ? '' : '<td rowspan="' + R.length + '" class="n' + (calc ? ' calc' : ' dim') + '">' + (calc ? avg : '?') + '</td>') + '</tr>'; }).join('') : '<tr><td colspan="5" class="dim">还没有记录</td></tr>') + '</tbody></table>';
    var t2 = '<h3 style="margin:4px 0 8px;font-size:22px">测小灯泡</h3><table class="rec" style="margin-bottom:10px"><thead><tr><th style="width:90px">次数</th><th>电压 <span class="m">U</span>/V</th><th>电流 <span class="m">I</span>/A</th><th>电阻 <span class="m">R</span>/Ω</th><th>小灯泡亮度</th></tr></thead><tbody>' +
      (L.length ? L.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td class="n">' + r.U + '</td><td class="n">' + r.I + '</td>' + (calc ? '<td class="n calc">' + rr(r) + '</td>' : '<td class="dim">?</td>') + '<td>' + r.b + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="dim">还没有记录</td></tr>') + '</tbody></table>';
    var tip = '<p class="tip">' + (calc ? '用 <span class="m">R</span> = <span class="m">U</span>/<span class="m">I</span> 算出每次的电阻；定值电阻取平均值，小灯泡不同电压下的电阻不求平均。' : '先用 <span class="m">R</span> = <span class="m">U</span>/<span class="m">I</span> 自己算一算，再点「显示计算」。') + '</p>';
    var btn = '<button class="act2' + (st.graph ? ' on' : '') + '" onclick="__exp.graph()" style="margin:0 0 10px">' + (st.graph ? '收起图像拓展' : '展开图像拓展') + '</button>';
    if (!st.graph) return '<div class="dvh"><h2>记录表</h2>' + btn + '</div>' + t1 + t2 + tip;
    var g = CC.plot({ w: 640, h: 470, xName: '<tspan font-style="italic" font-family="Times New Roman">U</tspan>/V', yName: '<tspan font-style="italic" font-family="Times New Roman">I</tspan>/A', xMax: 3, yMax: 0.4, xMajor: 0.5, xMinor: 0.1, yMajor: 0.1, yMinor: 0.02,
      series: [{ name: '定值电阻', color: '#2563EB', line: 'origin', pts: R.map(function (r) { return [+r.U, +r.I]; }) }, { name: '小灯泡', color: '#FE752D', line: 'smooth', pts: L.map(function (r) { return [+r.U, +r.I]; }) }] });
    return '<div class="dvh"><h2>记录表与 <span class="m">I</span>—<span class="m">U</span> 图像</h2>' + btn + '</div><div style="display:flex;gap:24px;align-items:flex-start"><div style="flex:0 0 46%;min-width:0">' + t1 + t2 + tip + '</div><div style="flex:1;min-width:0">' + g +
      ((R.length + L.length) ? '' : '<p class="tip">记录数据后在这里描点。</p>') + '</div></div>';
  }

  window.__exp = { st: st, V: function () { return V; }, am: function () { return am; }, vm: function () { return vm; }, sw: function () { return sw; }, rh: function () { return rh; }, res: function () { return res; }, lamp: function () { return lamp; }, graph: function () { st.graph = !st.graph; K.refreshData(); } };
  LabKit.run({
    readings: [{ id: 'U', name: '电压 <span class="m">U</span>', unit: 'V' }, { id: 'I', name: '电流 <span class="m">I</span>', unit: 'A' }],
    calc: { teach: '显示计算' },
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖滑片 P（或右侧「调电压」）改变电压；点备用的元件换上；点开关闭合 / 断开；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    record: function () { if (!canRec()) return; st.rows[st.mode].push({ U: Uq(), I: Iq(), b: bright(Uq()) }); last = ''; },
    clear: function () { st.rows = { R: [], L: [] }; last = ''; },
    renderData: renderData
  });
})();
