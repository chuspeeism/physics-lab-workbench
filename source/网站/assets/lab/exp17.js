/* 17 用电压表测量电压（课本图16.1-3、图16.1-5）。
   装置：两节干电池、闸刀开关、小灯泡用导线串联好；电压表（“−”“3”“15”）两根带鳄鱼夹的表线，夹子可夹到电路中的接线柱上。
   参数：电源电动势 2.9 V（两节干电池略低于 3 V，免得电压表串入时用 0～3 V 指针正好满偏）、内阻 0.1 Ω；小灯泡约 8 Ω。闭合时灯泡两端、电源两端都约 2.9 V（0～3 V 读到 0.1 V，0～15 V 读到 0.5 V）；
   测电源两端的电压也要闭合开关、接通电路（课本 p69），不比较开关断开 / 闭合。电压表内阻取 1 MΩ（3 V 挡）/ 5 MΩ（15 V 挡），串进电路时灯不亮、示数接近电源电压；接反时指针反偏。
   操作：拖红、黑夹子，松手吸到最近的接线柱；点电压表“3”“15”接线柱换量程；点开关闭合 / 断开，按住 = 试触；改接都要先断开开关。
   右侧「接法」四个预设：灯泡两端、电源两端、串入电路（拆掉开关与灯泡之间的导线，把电压表接进去）、正负接反（夹在灯泡两端但红黑对调）。 */
(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var EMF = 2.9, RIN = 0.1, RL = 8, RV = { '3': 1e6, '15': 5e6 }, DIV = { '3': 0.1, '15': 0.5 };
  var WHERE = { lamp: '灯泡两端', src: '电源两端', sw: '开关两端' };
  var FRESH = {   // 各问起始状态下的提示（只给操作指引）；没有的就按电路状态提示
    0: '先看电压表：有哪几个接线柱，观察窗里两排刻度各对应哪个量程，每一小格是多少。',
    2: '不知道电压多大，先用 0～15 V：按住开关不放试触，看指针偏转多大。',
    3: '接的是 0～3 V 量程。对照观察窗里的两排刻度，看指针在两排上各对着多少。'
  };
  var st = { range: '3', cut: false, closed: false, trial: false, flow: false, rows: [], nag: 0, nagMsg: '', U: 0, IL: 0, wI: {} };
  var K, V, C, T3, W, vm, bat, sw, lamp, win, P = {}, LD, last = '', mkey = '', ctl, grab = null, dirty = true;

  function eff() { return st.closed || st.trial; }
  function topo() {
    var L = [['w1', 'bat+', 'sw.R', 'red'], ['w3', 'L.R', 'bat-', 'black']];
    if (!st.cut) L.push(['w2', 'sw.L', 'L.L', 'blue']);
    return L;
  }
  /* 夹子夹在哪里：lamp / src / sw / ser（串入）/ other；rev = 红黑接反 */
  function where() {
    var r = LD.st.red, b = LD.st.black, pr = [r, b].sort().join(',');
    if (st.cut && pr === ['L.L', 'sw.L'].sort().join(',')) return { k: 'ser', rev: r !== 'sw.L' };
    if (st.cut) return { k: 'brk', rev: false };   // 开关和灯泡之间的导线拆掉了，电路是断的
    if (pr === 'L.L,L.R') return { k: 'lamp', rev: r !== 'L.L' };
    if (pr === 'bat+,bat-') return { k: 'src', rev: r !== 'bat+' };
    if (pr === 'sw.L,sw.R') return { k: 'sw', rev: r !== 'sw.R' };
    return { k: 'other', rev: false };
  }
  function solve() {
    var n = CC.net(), L = topo();
    n.ground('bat-'); n.cell('bat-', 'bat+', EMF, RIN, 'cell');
    L.forEach(function (w) { n.wire(w[1], w[2], w[0]); });
    if (eff()) n.wire('sw.R', 'sw.L', 'sw');
    n.R('L.L', 'L.R', RL, 'lamp');
    n.wire('V.' + st.range, LD.st.red, 'vR'); n.wire('V.-', LD.st.black, 'vB');
    n.R('V.3', 'V.-', RV['3'], 'v3'); n.R('V.15', 'V.-', RV['15'], 'v15');
    var s = n.solve();
    st.U = s.v('V.' + st.range) - s.v('V.-'); st.IL = s.i('lamp');
    st.wI = {}; L.forEach(function (w) { st.wI[w[0]] = s.i(w[0]); }); st.wI.vR = s.i('vR'); st.wI.vB = -s.i('vB');
    vm.set(st.U, +st.range);
    lamp.setWatts(st.IL * st.IL * RL);
  }
  function wireSpecs() {
    var L = topo().map(function (w) { return { id: w[0], a: P[w[1]], b: P[w[2]], color: w[3], I: st.wI[w[0]] || 0 }; });
    return L.concat(LD.specs().map(function (s) { s.I = st.wI[s.id] || 0; return s; }));
  }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 44);
    bat = C.battery(S, { cells: 2, at: [2, TOP, 15], plusLeft: true });
    sw = C.knife(S, { at: [-19, TOP, 15] });
    lamp = C.bulb(S, { at: [-12, TOP, -4] });
    vm = C.meter(S, { letter: 'V', ranges: [3, 15], at: [10, TOP, -13] });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'L.L': lamp.posts.L, 'L.R': lamp.posts.R, 'V.-': vm.posts['-'], 'V.3': vm.posts['3'], 'V.15': vm.posts['15'] };
    LD = C.leads({ meter: vm, P: P, targets: function () { return ['bat+', 'bat-', 'sw.L', 'sw.R', 'L.L', 'L.R']; }, range: function () { return st.range; } });
    LD.st.red = 'L.L'; LD.st.black = 'L.R';
    W = C.wires(S);
    sw.hit.userData.act = 'sw';
    vm.posts['3'].userData.hit.userData.act = 'range:3'; vm.posts['15'].userData.hit.userData.act = 'range:15';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: setTrial });
    var picks = LD.hits.concat([sw.hit, vm.posts['3'].userData.hit, vm.posts['15'].userData.hit]);
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
        if (!g.moved && g.a.indexOf('range:') === 0) setRange(g.a.slice(6));
      }
    };
    win = CC.win(K, '电压表表盘', [{ m: vm, terms: true, wired: function () { var o = {}; o['-'] = true; o[st.range] = true; return o; } }], 330);
    V.frame = tick;
  }

  /* ── 改接（都要先断开开关）── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function rewire(fn) { if (eff()) { nag('先断开开关，再改接。'); return false; } fn(); changed(); return true; }
  function setRange(r) { if (r !== st.range) rewire(function () { st.range = r; }); }
  function setConn(k) {
    rewire(function () {
      st.cut = k === 'ser';
      var m = { lamp: ['L.L', 'L.R'], src: ['bat+', 'bat-'], ser: ['sw.L', 'L.L'], rev: ['L.R', 'L.L'] }[k];
      LD.st.red = m[0]; LD.st.black = m[1]; LD.place();
    });
  }
  function setClosed(v) { st.closed = !!v; st.trial = false; changed(); }
  function setTrial(on) { st.trial = !!on && !st.closed; changed(); }
  function changed() { dirty = true; last = ''; st.nag = 0; st.fresh = -1; }   // fresh：器材还是本问的起始状态（第几问），一动就失效

  function tick(dt) {
    if (dirty) { dirty = false; solve(); LD.place(); W.set(wireSpecs()); }
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(eff()); sw.update(dt); vm.update(dt); W.flow(st.flow); W.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与读数 ── */
  function vtxt() { return CC.quant(st.U, DIV[st.range]).toFixed(1); }
  function r15() { var v = CC.quant(st.U, 0.5); return '约 ' + (v % 1 ? v.toFixed(1) : v) + ' V'; }   // 0～15 V 上的大致读数
  function wkey() { return where().k; }
  function wname() { return WHERE[where().k] || ''; }
  function valid() {
    var w = where(); if (st.trial || w.rev || vm.over || vm.reversed) return false;
    if (st.cut) return false;
    return (w.k === 'lamp' || w.k === 'src') && st.closed;
  }
  function dup() { var k = wkey(); return st.rows.some(function (r) { return r.k === k && r.range === st.range; }); }
  function canRec() { return valid() && K.revealed() && !dup(); }
  function ui() {
    var w = where(), on = eff(), hint, tone = '';
    var key0 = [st.range, st.cut, LD.st.red, LD.st.black, on].join('|');
    if (key0 !== mkey) { mkey = key0; K.invalidate(); }
    var par = (w.k === 'lamp' || w.k === 'src' || w.k === 'sw') && !st.cut;
    var live = on || Math.abs(st.U) > 0.05, known = par || w.k === 'ser';   // 正负、量程要等指针动了（闭合、试触，或测电源）再判断，开关断开时不提前下结论
    var checks = [{ label: '与被测部分并联', ok: w.k === 'ser' ? false : par ? true : null }, { label: '正进负出', ok: !known || !live ? null : !(w.rev || vm.reversed) }, { label: '不超量程', ok: !known || !live ? null : !vm.over }];
    var ser = w.k === 'ser' && on;   // 串入电路：指针偏到接近电源电压，读数也显示出来（不能记录）
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (st.fresh >= 0 && FRESH[st.fresh]) hint = FRESH[st.fresh];   // 本问刚开始：提示跟着本问的任务走
    else if (w.k === 'ser') { hint = on ? '电压表串进了电路：灯不亮，示数接近电源电压。电压表要并联。' : '电压表串进了电路。闭合开关，看看灯和电压表。'; tone = on ? 'warn' : ''; }
    else if (w.k === 'brk') { hint = '开关和灯泡之间的导线还没接回去，电路是断开的。点「灯泡两端」或「电源两端」重新接好。'; tone = 'warn'; }
    else if (w.k === 'other') hint = '把两个夹子夹在灯泡两端，或电源两端。';
    else if (vm.reversed || (w.rev && on)) { hint = '指针反偏：红夹子要接在靠近电源正极的一端。' + (on ? '断开开关，' : '') + '把两个夹子对调。'; tone = 'warn'; }
    else if (vm.over) { hint = '指针打到头，超过量程。断开开关，换 0～15 V。'; tone = 'warn'; }
    else if (w.k === 'sw') hint = on ? '开关闭合，开关两端几乎没有电压。' : '开关断开时，开关两端的电压接近电源电压。';
    else if (w.rev) hint = '闭合开关（或按住开关试触），看指针往哪边偏。';
    else if (w.k === 'lamp' && !on) hint = '闭合开关，测灯泡两端的电压。';
    else if (w.k === 'src' && !on) hint = '闭合开关，接通电路，测电源两端的电压。';
    else if (st.trial) hint = st.range === '15' && st.U < 3 ? '试触：指针偏转很小，' + r15() + '，用 0～15 V 读不准。松开开关，换 0～3 V 再试触，指针不超过满偏就用小量程读。' : '试触：没有超过量程，可以闭合开关读数。';
    else if (dup()) { var both = st.rows.some(function (r) { return r.k === 'lamp'; }) && st.rows.some(function (r) { return r.k === 'src'; }); hint = both ? '灯泡两端、电源两端都测过了，比较两次的电压。' : w.k === 'lamp' ? '已记过。断开开关，把夹子改夹到电源两端再测。' : '已记过。断开开关，把夹子改夹到灯泡两端再测。'; tone = both ? 'good' : ''; }
    else if (!K.revealed()) hint = st.range === '15' && st.U < 3 ? '指针偏转很小，' + r15() + '，用 0～15 V 读不准。断开开关，换 0～3 V 再试触。' : '先说出量程和分度值，再读数。';
    else { hint = st.range === '15' && st.U < 3 ? '可以记录。指针偏转很小，0～15 V 读不准：断开开关，换 0～3 V 再测。' : '读数正确，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: valid() || ser, bad: ser, result: '<span class="m">U</span> = <b>' + vtxt() + '</b> V　（0～' + st.range + ' V，分度值 ' + DIV[st.range] + ' V）' });
    var key = [canRec(), K.revealed(), vtxt(), valid(), ser, st.rows.length, key0, st.closed, st.trial, st.flow].join('|');
    if (key === last) return; last = key;
    K.setReading('U', (valid() || ser) && K.revealed() ? vtxt() : null);
    var ok = canRec();
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次：' + wname() + '，0～' + st.range + ' V' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    sync();
  }

  /* ── 面板 ── */
  function connKey() { var w = where(); if (st.cut && w.k !== 'ser') return ''; return w.k === 'ser' ? 'ser' : w.k === 'lamp' ? (w.rev ? 'rev' : 'lamp') : w.k === 'src' && !w.rev ? 'src' : ''; }
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-conn', '接法', [['lamp', '灯泡两端'], ['src', '电源两端'], ['ser', '串入电路'], ['rev', '正负接反']]) +
      CC.opts('o-rng', '量程', [['3', '0～3 V'], ['15', '0～15 V']]) +
      CC.swRow({ trial: true, flow: true });
    CC.bind('o-conn', setConn); CC.bind('o-rng', setRange);
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, trial: function (on) { if (on || st.trial) setTrial(on); }, closed: function () { return st.closed; }, flow: function () { st.flow = !st.flow; last = ''; } });
  }
  function sync() { CC.mark('o-conn', connKey()); CC.mark('o-rng', st.range); CC.swSync(st.closed, st.trial, st.flow); }

  function preset(i) {
    var P0 = [['lamp', '3', false], ['ser', '15', false], ['lamp', '15', false], ['lamp', '3', true], ['src', '3', false], ['lamp', '3', true]][i];
    st.closed = false; st.trial = false; setConn(P0[0]); st.range = P0[1]; st.closed = P0[2]; st.nag = 0;
    if (K.revealed()) K.invalidate();
    changed(); st.fresh = i;
  }

  window.__exp = { st: st, V: function () { return V; }, vm: function () { return vm; }, sw: function () { return sw; }, lamp: function () { return lamp; }, LD: function () { return LD; }, P: function () { return P; }, where: where };
  LabKit.run({
    readings: [{ id: 'U', name: '电压 <span class="m">U</span>', unit: 'V' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖红、黑夹子改接（松手吸到接线柱）；点“3”“15”接线柱换量程；点开关闭合 / 断开，按住不放是试触</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; st.rows.push({ k: wkey(), where: wname(), range: st.range, U: vtxt() }); last = ''; },
    clear: function () { st.rows = []; last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2><span>同一电路，比较灯泡两端和电源两端的电压</span></div>' +
        '<table class="rec" style="max-width:960px"><thead><tr><th style="width:110px">次数</th><th>电压表接在哪里</th><th>所用量程</th><th>电压 <span class="m">U</span>/V</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + '</td><td>' + r.where + '</td><td>0～' + r.range + ' V</td><td class="n">' + r.U + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="dim">还没有记录</td></tr>') +
        '</tbody></table>';
    }
  });
})();
