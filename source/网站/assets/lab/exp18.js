/* 18 探究串联电路和并联电路中电压的特点（课本图16.2-2、图16.2-3、图16.2-4）。
   装置：两节干电池（电池盒两节之间有抽头）、闸刀开关、小灯泡（甲 2 个、乙 1 个、丙 1 个，每次选两个作 L₁、L₂）、电压表（−、3、15）和两根带夹子的表线。
   串联：A 为 L₁ 左端、B 为两灯之间、C 为 L₂ 右端；并联：L₁、L₂ 并联后接电源和开关；测电池：分别测每节电池和电池组（课本“想想做做”）。
   参数：电源 3 V、内阻 0.2 Ω（每节 1.5 V、0.1 Ω）；灯泡按定值：甲 8 Ω、乙 13 Ω、丙 5 Ω；电压表内阻 1 MΩ / 5 MΩ。
   操作：拖红、黑夹子（松手吸到接线柱）；点“3”“15”接线柱换量程；点灯泡换规格；点开关闭合 / 断开，按住 = 试触；改接都要先断开开关。
   记录：串联 / 并联每组灯泡一行，三处电压分别记入同一行；测电池三行。串联、并联要闭合开关；测电池开关断开也能记。
   第 6 问开局夹子在 L₁ 两端（不是电池两端），要老师先接好表才出读数。 */
(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var RV = { '3': 1e6, '15': 5e6 }, DIV = { '3': 0.1, '15': 0.5 };
  var SPEC = { '甲': 8, '乙': 13, '丙': 5 }, STOCK = { '甲': 2, '乙': 1, '丙': 1 }, ORDER = ['甲', '乙', '丙'];
  var LAY = { ser: { L1: [-12, 1], L2: [12, 1] }, par: { L1: [4, -7], L2: [4, 8] } };
  var MODEN = { ser: '串联', par: '并联', bat: '测电池' };
  var MEAS = {
    ser: [['AB', 'AB 两端', 'L1.L', 'L1.R'], ['BC', 'BC 两端', 'L2.L', 'L2.R'], ['AC', 'AC 两端', 'L1.L', 'L2.R']],
    par: [['U1', 'L₁ 两端', 'L1.L', 'L1.R'], ['U2', 'L₂ 两端', 'L2.L', 'L2.R'], ['U', '电源两端', 'bat+', 'bat-']],
    bat: [['c1', '第一节', 'bat+', 'bat.m'], ['c2', '第二节', 'bat.m', 'bat-'], ['tot', '电池组', 'bat+', 'bat-']]
  };
  var COL = { AB: 'L₁ 两端电压 <span class="m">U</span><sub>AB</sub>', BC: 'L₂ 两端电压 <span class="m">U</span><sub>BC</sub>', AC: '电源两端电压 <span class="m">U</span><sub>AC</sub>', U1: 'L₁ 两端电压 <span class="m">U</span><sub>1</sub>', U2: 'L₂ 两端电压 <span class="m">U</span><sub>2</sub>', U: '电源两端电压 <span class="m">U</span>' };
  var SYM = { AB: 'U<sub>AB</sub>', BC: 'U<sub>BC</sub>', AC: 'U<sub>AC</sub>', U1: 'U<sub>1</sub>', U2: 'U<sub>2</sub>', U: 'U', c1: 'U', c2: 'U', tot: 'U' };   // 测电池不用 U₁、U₂（和并联表的 L₁、L₂ 区分开），结果框写“第一节电池两端 U”
  var st = { mode: 'ser', range: '3', l1: '甲', l2: '乙', closed: false, trial: false, rows: { ser: [], par: [], bat: {} }, nag: 0, nagMsg: '', U: 0, wI: {} };
  var K, V, C, T3, W, vm, bat, sw, L1, L2, win, P = {}, LD, cellTags, last = '', mkey = '', ctl, grab = null, dirty = true;

  function eff() { return st.closed || st.trial; }
  function topo() {
    if (st.mode === 'par') return [['w1', 'bat+', 'L1.L', 'red'], ['w2', 'L1.L', 'L2.L', 'blue'], ['w3', 'L1.R', 'L2.R', 'green'], ['w5', 'L2.R', 'sw.R', 'blue'], ['w4', 'sw.L', 'bat-', 'black']];
    return [['w1', 'bat+', 'L1.L', 'red'], ['w2', 'L1.R', 'L2.L', 'green'], ['w3', 'L2.R', 'sw.R', 'blue'], ['w4', 'sw.L', 'bat-', 'black']];
  }
  /* 夹子夹在哪两点：返回 {k: 测量名或 'other', rev: 红黑接反} */
  function where() {
    var r = LD.st.red, b = LD.st.black;
    var hit = null;
    MEAS[st.mode].forEach(function (m) {
      var ends = st.mode === 'ser' ? { AB: [['L1.L'], ['L1.R', 'L2.L']], BC: [['L1.R', 'L2.L'], ['L2.R']], AC: [['L1.L'], ['L2.R']] }[m[0]] : [[m[2]], [m[3]]];
      if (ends[0].indexOf(r) >= 0 && ends[1].indexOf(b) >= 0) hit = { k: m[0], rev: false };
      else if (ends[0].indexOf(b) >= 0 && ends[1].indexOf(r) >= 0) hit = { k: m[0], rev: true };
    });
    return hit || { k: 'other', rev: false };
  }
  function solve() {
    var n = CC.net(), L = topo();
    n.ground('bat-'); n.cell('bat.m', 'bat+', 1.5, 0.1, 'c1'); n.cell('bat-', 'bat.m', 1.5, 0.1, 'c2');
    L.forEach(function (w) { n.wire(w[1], w[2], w[0]); });
    if (eff()) n.wire('sw.R', 'sw.L', 'sw');
    n.R('L1.L', 'L1.R', SPEC[st.l1], 'l1'); n.R('L2.L', 'L2.R', SPEC[st.l2], 'l2');
    n.wire('V.' + st.range, LD.st.red, 'vR'); n.wire('V.-', LD.st.black, 'vB');
    n.R('V.3', 'V.-', RV['3'], 'v3'); n.R('V.15', 'V.-', RV['15'], 'v15');
    var s = n.solve();
    st.U = s.v('V.' + st.range) - s.v('V.-'); st.I1 = s.i('l1'); st.I2 = s.i('l2');
    vm.set(st.U, +st.range);
    L1.setWatts(st.I1 * st.I1 * SPEC[st.l1]); L2.setWatts(st.I2 * st.I2 * SPEC[st.l2]);
  }
  function wireSpecs() { return topo().map(function (w) { return { id: w[0], a: P[w[1]], b: P[w[2]], color: w[3] }; }).concat(LD.specs()); }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 44);
    bat = C.battery(S, { cells: 2, at: [-2, TOP, 16.5], plusLeft: true, mid: true });
    sw = C.knife(S, { at: [19, TOP, 16.5] });
    L1 = C.bulb(S, { at: [LAY.ser.L1[0], TOP, LAY.ser.L1[1]] }); L2 = C.bulb(S, { at: [LAY.ser.L2[0], TOP, LAY.ser.L2[1]] });
    vm = C.meter(S, { letter: 'V', ranges: [3, 15], at: [-15, TOP, -14] });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'bat.m': bat.posts.m, 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'L1.L': L1.posts.L, 'L1.R': L1.posts.R, 'L2.L': L2.posts.L, 'L2.R': L2.posts.R, 'V.-': vm.posts['-'], 'V.3': vm.posts['3'], 'V.15': vm.posts['15'] };
    LD = C.leads({ meter: vm, P: P, targets: function () { return ['bat+', 'bat-', 'bat.m', 'sw.L', 'sw.R', 'L1.L', 'L1.R', 'L2.L', 'L2.R']; }, range: function () { return st.range; } });
    LD.st.red = 'L1.L'; LD.st.black = 'L1.R';
    ['A', 'B', 'C'].forEach(function (k) { C.markTag('p' + k, k); });
    C.nameTag('n1'); C.nameTag('n2');
    cellTags = C.group(S);
    C.print(cellTags, '第一节', [-6.1, TOP + 0.03, 20.7], { size: 1.7 }); C.print(cellTags, '第二节', [2.1, TOP + 0.03, 20.7], { size: 1.7 });
    W = C.wires(S);
    sw.hit.userData.act = 'sw';
    vm.posts['3'].userData.hit.userData.act = 'range:3'; vm.posts['15'].userData.hit.userData.act = 'range:15';
    L1.hit.userData.act = 'bulb:1'; L2.hit.userData.act = 'bulb:2';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: setTrial });
    var picks = LD.hits.concat([sw.hit, vm.posts['3'].userData.hit, vm.posts['15'].userData.hit, L1.hit, L2.hit]);
    V.drag = {
      hit: function (ev) { return !!CC.actOf(V.pick(ev, picks)); },
      start: function (ev) {
        var h = V.pick(ev, picks), a = CC.actOf(h); if (!a) return false;
        grab = { a: a, x: ev.clientX, y: ev.clientY, moved: false };
        if (a === 'sw') ctl.down();
        else if (a.indexOf('clip:') === 0) { if (eff()) { nag('先断开开关，再改接。'); grab.blocked = true; } else LD.start(ev, h); }
        return true;
      },
      move: function (ev) {
        if (!grab) return;
        if (Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 6) { grab.moved = true; if (grab.a === 'sw') ctl.move(true); }
        if (grab.a.indexOf('clip:') === 0 && !grab.blocked) { LD.move(ev); W.set(wireSpecs()); }
      },
      end: function () {
        var g = grab; grab = null; if (!g) return;
        if (g.a === 'sw') { ctl.up(); return; }
        if (g.a.indexOf('clip:') === 0) { if (g.blocked) return; var r = LD.end(); changed(); if (r === 'back') nag('夹子要夹在接线柱上。'); else if (r === 'busy') nag('这个接线柱已夹了另一个夹子。'); return; }
        if (g.moved) return;
        if (g.a.indexOf('range:') === 0) setRange(g.a.slice(6));
        else if (g.a === 'bulb:1') cycle(1); else if (g.a === 'bulb:2') cycle(2);
      }
    };
    win = CC.win(K, '电压表表盘', [{ m: vm, terms: true, wired: function () { var o = {}; o['-'] = true; o[st.range] = true; return o; } }], 330);
    V.frame = tick;
    relabel(); place(true);
  }
  function relabel() { V.tag('n1').innerHTML = 'L₁ ' + st.l1; V.tag('n2').innerHTML = 'L₂ ' + st.l2; }
  function place(instant, dt) {
    var lay = LAY[st.mode === 'par' ? 'par' : 'ser'], moving = false, k = instant ? 1 : Math.min(1, (dt || 0) * 8);
    function go(obj, x, z) { var p = obj.position; if (Math.abs(p.x - x) < 0.03 && Math.abs(p.z - z) < 0.03) { if (p.x !== x || p.z !== z) { p.x = x; p.z = z; moving = true; } return; } p.x += (x - p.x) * k; p.z += (z - p.z) * k; moving = true; }
    go(L1.group, lay.L1[0], lay.L1[1]); go(L2.group, lay.L2[0], lay.L2[1]);
    cellTags.visible = st.mode === 'bat';
    if (moving) { V.scene.updateMatrixWorld(true); if (!LD.dragging()) LD.place(); W.set(wireSpecs()); }
    var bulbs = st.mode !== 'bat', ser = st.mode === 'ser', w2 = W.get('w2');
    C.showTag('n1', L1.group.position.clone().add(new T3.Vector3(0, 0.2, 2.4)), bulbs); C.showTag('n2', L2.group.position.clone().add(new T3.Vector3(0, 0.2, 2.4)), bulbs);
    C.showTag('pA', C.wpos(L1.posts.L).add(new T3.Vector3(-2.8, 0, 1.8)), ser);
    C.showTag('pB', w2 && w2.curve ? w2.curve.getPointAt(0.5) : null, ser);
    C.showTag('pC', C.wpos(L2.posts.R).add(new T3.Vector3(2.8, 0, 1.8)), ser);
  }

  /* ── 改接（都要先断开开关）── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function rewire(fn) { if (eff()) { nag('先断开开关，再改接。'); return false; } fn(); changed(); return true; }
  function setRange(r) { if (r !== st.range) rewire(function () { st.range = r; }); }
  function setMeas(k) {
    var m = MEAS[st.mode].filter(function (x) { return x[0] === k; })[0]; if (!m) return;
    rewire(function () { LD.st.red = m[2]; LD.st.black = m[3]; LD.place(); });
  }
  function setMode(m) { if (m !== st.mode) rewire(function () { st.mode = m; var f = MEAS[m][0]; LD.st.red = f[2]; LD.st.black = f[3]; ctrlsMeas(); }); }
  function allowed(which, s) { var o = which === 1 ? st.l2 : st.l1; return s !== o || STOCK[s] > 1; }
  function cycle(which) {
    if (st.mode === 'bat') return;
    var cur = which === 1 ? st.l1 : st.l2, i = ORDER.indexOf(cur), nx = cur;
    for (var k = 1; k <= 3; k++) { var c = ORDER[(i + k) % 3]; if (allowed(which, c)) { nx = c; break; } }
    rewire(function () { if (which === 1) st.l1 = nx; else st.l2 = nx; relabel(); });
  }
  function setClosed(v) { st.closed = !!v; st.trial = false; changed(); }
  function setTrial(on) { st.trial = !!on && !st.closed; changed(); }
  function changed() { dirty = true; last = ''; st.nag = 0; }

  function tick(dt) {
    if (dirty) { dirty = false; solve(); LD.place(); W.set(wireSpecs()); }
    place(false, dt);
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(eff()); sw.update(dt); vm.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与读数 ── */
  function combo() { return st.l1 + '、' + st.l2; }
  function row() { return st.mode === 'bat' ? st.rows.bat : st.rows[st.mode].filter(function (r) { return r.combo === combo(); })[0]; }
  function vtxt() { return CC.quant(st.U, DIV[st.range]).toFixed(1); }
  function valid() { var w = where(); return w.k !== 'other' && !w.rev && !st.trial && !vm.over && !vm.reversed && (st.closed || st.mode === 'bat'); }
  function dup() { var r = row(); return !!(r && r[where().k] != null); }
  function canRec() { return valid() && K.revealed() && !dup(); }
  function sp(t) { return /^[A-Z]/.test(t) ? ' ' + t : t; }   // 字母开头的名称前空一格
  function mname(k) { var m = MEAS[st.mode].filter(function (x) { return x[0] === k; })[0]; return m ? m[1] : ''; }
  function nextM() { var r = row(); return MEAS[st.mode].filter(function (m) { return !r || r[m[0]] == null; })[0]; }
  function ui() {
    var w = where(), on = eff(), hint, tone = '', nx = nextM();
    var key0 = [st.mode, st.range, st.l1, st.l2, LD.st.red, LD.st.black, on].join('|');
    if (key0 !== mkey) { mkey = key0; K.invalidate(); }
    var known = w.k !== 'other';
    var live = on || st.mode === 'bat' || Math.abs(st.U) > 0.05;   // 开关断开、指针没动时不提前判断正负和量程（试触或闭合后再判断）
    var checks = [{ label: '开关闭合', ok: on ? true : null }, { label: '正进负出', ok: !known || !live ? null : !(w.rev || vm.reversed) }, { label: '不超量程', ok: !known || !live ? null : !vm.over }];
    if (st.mode === 'bat') checks.shift();
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (!known) hint = st.mode === 'ser' ? '把两个夹子夹在 A、B，B、C 或 A、C 两点。' : st.mode === 'par' ? '把两个夹子夹在 L₁、L₂ 或电源的两端。' : '把两个夹子改夹到一节电池或电池组的两端（也可点「测量」一行）。';
    else if (w.rev && (on || st.mode === 'bat')) { hint = '指针反偏：正负接线柱接反了。红夹子要接在靠近电源正极的一端，' + (on ? '断开开关后' : '') + '两个夹子按正负重新接。'; tone = 'warn'; }
    else if (vm.over) { hint = '指针打到头，超过量程。断开开关，换 0～15 V。'; tone = 'warn'; }
    else if (!on && st.mode !== 'bat') hint = w.rev ? '按住开关试触，看指针往哪边偏。' : '闭合开关，测' + (/^[A-ZL]/.test(mname(w.k)) ? ' ' : '') + mname(w.k) + '的电压。';
    else if (st.trial) hint = '试触：没有超过量程，可以闭合开关读数。';
    else if (dup()) { hint = nx ? mname(w.k) + '已记过。' + (on ? '断开开关，' : '') + '把夹子改夹到' + sp(nx[1]) + '。' : (st.mode === 'bat' ? '三次都测完了。比较每节电池和电池组的电压。' : '这组灯泡三处都测完了。断开开关，换一组灯泡再测。'); tone = nx ? '' : 'good'; }
    else if (!K.revealed()) hint = st.range === '15' && st.U < 3 ? (CC.quant(st.U, 0.5) < 3 ? '示数不到 3 V' : '指针在 3 V 附近，没有超过 3 V') + '，换 0～3 V 读得更准。也可以先读一读。' : '读出' + (/^[A-ZL]/.test(mname(w.k)) ? ' ' : '') + mname(w.k) + '的电压。';
    else { hint = '读数正确，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: valid(), result: (st.mode === 'bat' && known ? mname(w.k) + (w.k === 'tot' ? '' : '电池') + '两端 <span class="m">U</span>' : '<span class="m">' + SYM[w.k === 'other' ? 'U' : w.k].replace('U', 'U</span>')) + ' = <b>' + vtxt() + '</b> V　（0～' + st.range + ' V，分度值 ' + DIV[st.range] + ' V）' });
    var key = [canRec(), K.revealed(), vtxt(), valid(), JSON.stringify(st.rows), key0, st.closed, st.trial].join('|');
    if (key === last) return; last = key;
    K.setReading('U', valid() && K.revealed() ? vtxt() : null);
    var ok = canRec();
    K.setRecord(ok, '', ok ? 'good' : '');
    if (ok) document.getElementById('rec-tip').innerHTML = st.mode === 'bat' ? '记入测电池表「' + mname(w.k) + '」一行' : '记入' + MODEN[st.mode] + '表「' + combo() + '」一行的 <span class="m">' + SYM[w.k].replace('U', 'U</span>');
    K.setCount(st.rows.ser.length + st.rows.par.length + (Object.keys(st.rows.bat).length ? 1 : 0) + ' 组');
    sync();
  }

  /* ── 面板 ── */
  var noteEl = null;
  function ctrlsMeas() {
    var nb = document.getElementById('note-bulb'); if (nb) nb.style.display = st.mode === 'bat' ? 'none' : '';
    var el = document.getElementById('o-meas');
    el.innerHTML = MEAS[st.mode].map(function (m) { return '<button data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('');
    document.getElementById('r-bulb').style.display = st.mode === 'bat' ? 'none' : '';
  }
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-mode', '电路', [['ser', '串联'], ['par', '并联'], ['bat', '测电池']]) +
      CC.opts('o-meas', '测量', []) +
      CC.opts('o-rng', '量程', [['3', '0～3 V'], ['15', '0～15 V']]) +
      K.grp('换灯泡', K.acts([['b-l1', '↻', 'L₁'], ['b-l2', '↻', 'L₂']])).replace('<div class="grp"', '<div class="grp" id="r-bulb"') +   // 动作：点一下换成下一种规格
      CC.swRow({ trial: true });
    CC.bind('o-mode', setMode); CC.bind('o-meas', setMeas); CC.bind('o-rng', setRange);
    document.getElementById('b-l1').onclick = function () { cycle(1); };
    document.getElementById('b-l2').onclick = function () { cycle(2); };
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, trial: function (on) { if (on || st.trial) setTrial(on); }, closed: function () { return st.closed; } });
    ctrlsMeas();
  }
  function sync() {
    var w = where();
    CC.mark('o-mode', st.mode); CC.mark('o-meas', w.rev ? '' : w.k); CC.mark('o-rng', st.range);
    document.getElementById('b-l1').innerHTML = '<i>↻</i>L₁：' + st.l1; document.getElementById('b-l2').innerHTML = '<i>↻</i>L₂：' + st.l2;
    CC.swSync(st.closed, st.trial);
  }

  function preset(i) {
    // 第 6 问（测电池）：夹子还夹在 L₁ 两端（开关断开，示数为 0），老师先把夹子改夹到电池两端，读数才出来，不一进本问就显示 1.5 V
    var P0 = [['ser', '甲', '乙', 'L1.L', 'L1.R'], ['ser', '甲', '乙', 'L1.L', 'L1.R'], ['ser', '甲', '甲', 'L1.L', 'L1.R'], ['par', '甲', '乙', 'L1.L', 'L1.R'], ['par', '甲', '丙', 'L1.L', 'L1.R'], ['bat', '甲', '乙', 'L1.L', 'L1.R']][i];
    st.closed = false; st.trial = false; st.nag = 0;
    st.mode = P0[0]; st.l1 = P0[1]; st.l2 = P0[2]; LD.st.red = P0[3]; LD.st.black = P0[4]; st.range = '3';
    if (K.revealed()) K.invalidate();
    ctrlsMeas(); relabel(); changed();
  }

  window.__exp = { st: st, V: function () { return V; }, vm: function () { return vm; }, sw: function () { return sw; }, L1: function () { return L1; }, L2: function () { return L2; }, LD: function () { return LD; }, P: function () { return P; }, where: where };
  LabKit.run({
    readings: [{ id: 'U', name: '电压 <span class="m">U</span>', unit: 'V' }],
    init: function (k) { K = k; ctrls(); build(); noteEl = K.el('<p class="lk-note">拖红、黑夹子改接（松手吸到接线柱）；<span id="note-bulb">点灯泡换规格；</span>点“3”“15”接线柱换量程；点开关闭合 / 断开，按住不放是试触</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () {
      if (!canRec()) return;
      var r = row(); if (!r) { r = { combo: combo() }; st.rows[st.mode].push(r); }
      r[where().k] = vtxt(); last = '';
    },
    clear: function () { st.rows = { ser: [], par: [], bat: {} }; last = ''; },
    renderData: function () {
      function tb(m) {
        var R = st.rows[m], ks = MEAS[m].map(function (x) { return x[0]; });
        return '<h3 style="margin:4px 0 8px;font-size:22px">' + MODEN[m] + '电路</h3><table class="rec" style="max-width:1080px;margin-bottom:18px"><thead><tr><th style="width:100px">实验次数</th><th style="width:170px">小灯泡规格</th>' + ks.map(function (k) { return '<th>' + COL[k] + '/V</th>'; }).join('') + '</tr></thead><tbody>' +
          (R.length ? R.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>L₁ ' + r.combo.split('、')[0] + '，L₂ ' + r.combo.split('、')[1] + '</td>' + ks.map(function (k) { return r[k] != null ? '<td class="n">' + r[k] + '</td>' : '<td class="dim">—</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="5" class="dim">还没有记录</td></tr>') + '</tbody></table>';
      }
      var B = st.rows.bat;
      return '<div class="dvh"><h2>记录表</h2><span>同一组灯泡的三处电压记在同一行</span></div>' + tb('ser') + tb('par') +
        '<h3 style="margin:4px 0 8px;font-size:22px">测电池</h3><table class="rec" style="max-width:640px;margin-bottom:14px"><thead><tr><th>测量对象</th><th>电压 <span class="m">U</span>/V</th></tr></thead><tbody>' +
        MEAS.bat.map(function (m) { return '<tr><td>' + m[1] + (m[0] === 'tot' ? '' : '电池') + '</td>' + (B[m[0]] != null ? '<td class="n">' + B[m[0]] + '</td>' : '<td class="dim">—</td>') + '</tr>'; }).join('') + '</tbody></table>';
    }
  });
})();
