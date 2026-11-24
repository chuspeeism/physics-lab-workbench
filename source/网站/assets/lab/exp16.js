/* 16 探究串联电路和并联电路中电流的特点（课本图15.5-1、图15.5-2、图15.5-3）。
   装置：两节干电池、闸刀开关、小灯泡（甲 2 个、乙 1 个、丙 1 个，每次选两个作 L₁、L₂）、电流表（−、0.6、3）、导线。
   串联（照课本图15.5-1）：电源正极 → 开关 → C → L₂ → B → L₁ → A → 电源负极，电流依次流过 C、B、A；
   并联（照课本图15.5-3）：电源正极 → 开关 → C（干路）→ 分支点（L₂ 右端）；L₁ 支路：分支点 → A → L₁ → 沿左边导线回电源负极；
   L₂ 支路：分支点 → L₂ → B → 电源负极。A、B 各在自己支路的导线上，测点框挨着测点。每个测点画一个小圆圈。
   参数：电源 3 V、内阻 0.2 Ω；灯泡按定值：甲 8 Ω、乙 13 Ω、丙 5 Ω；电流表内阻 0.05 Ω / 0.01 Ω。
   由 Circuit.net() 统一求解，示数按分度值读（0～0.6 A 读到 0.02 A，0～3 A 读到 0.1 A）。
   操作：点开关闭合 / 断开，按住 = 试触；点“0.6”“3”接线柱换量程；点后排虚线框把电流表接到该测点；点灯泡换规格；改接都要先断开开关。
   记录：每组灯泡一行，A、B、C 三处读数分别记入同一行（串联、并联各一张表）。 */
(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var EMF = 3, RIN = 0.2, RA = { '0.6': 0.05, '3': 0.01 }, DIV = { '0.6': 0.02, '3': 0.1 };
  var SPEC = { '甲': 8, '乙': 13, '丙': 5 }, STOCK = { '甲': 2, '乙': 1, '丙': 1 }, ORDER = ['甲', '乙', '丙'];
  var LAY = {
    ser: { L1: [-12, 1], L2: [12, 1], slot: { A: [-19, -13], B: [0, -13], C: [19, -13] } },
    par: { L1: [6, -8], L2: [6, 3], slot: { A: [19, -12], B: [-14, 8], C: [23, 6] } }
  };
  var MODEN = { ser: '串联', par: '并联' };
  var st = { mode: 'ser', pt: 'A', range: '0.6', l1: '甲', l2: '乙', closed: false, trial: false, flow: false, rows: { ser: [], par: [] }, nag: 0, nagMsg: '', Im: 0, wI: {} };
  var K, V, C, T3, W, am, bat, sw, L1, L2, win, P = {}, slots = {}, last = '', mkey = '', ctl, grab = null, dirty = true;

  function eff() { return st.closed || st.trial; }
  function segs() {
    // 每段按电流方向 [上游, 下游]：电流表的“+”接上游
    return st.mode === 'ser' ? { C: ['sw.R', 'L2.R'], B: ['L2.L', 'L1.R'], A: ['L1.L', 'bat-'] } : { C: ['sw.R', 'L2.R'], A: ['L2.R', 'L1.R'], B: ['L2.L', 'bat-'] };
  }
  function topo() {
    var g = segs(), L = [], col = st.mode === 'ser' ? { C: 'blue', B: 'green', A: 'black' } : { C: 'blue', A: 'blue', B: 'green' };
    ['A', 'B', 'C'].forEach(function (k) {
      var s = g[k];
      if (k === st.pt) L.push([k + '1', s[0], 'A.' + st.range, col[k] === 'black' ? 'blue' : col[k]], [k + '2', 'A.-', s[1], col[k]]);
      else L.push([k, s[0], s[1], col[k]]);
    });
    if (st.mode === 'par') L.push(['Y', 'L1.L', 'bat-', 'black', [[-22, TOP + 4.4, -8], [-22, TOP + 4.4, 14]]]);   // L₁ 支路的回线沿木板左边走，不压 B 点的测点框
    L.push(['N', 'bat+', 'sw.L', 'red']);
    return L;
  }
  function solve() {
    var n = CC.net(), L = topo();
    n.ground('bat-'); n.cell('bat-', 'bat+', EMF, RIN, 'cell');
    L.forEach(function (w) { n.wire(w[1], w[2], w[0]); });
    if (eff()) n.wire('sw.R', 'sw.L', 'sw');
    n.R('L1.L', 'L1.R', SPEC[st.l1], 'l1'); n.R('L2.L', 'L2.R', SPEC[st.l2], 'l2');
    n.R('A.0.6', 'A.-', RA['0.6'], 'a06'); n.R('A.3', 'A.-', RA['3'], 'a3');
    var s = n.solve();
    st.Im = s.i('a06') + s.i('a3'); st.I1 = s.i('l1'); st.I2 = s.i('l2');
    st.wI = {}; L.forEach(function (w) { st.wI[w[0]] = s.i(w[0]); });
    am.set(st.Im, +st.range);
    L1.setWatts(st.I1 * st.I1 * SPEC[st.l1]); L2.setWatts(st.I2 * st.I2 * SPEC[st.l2]);
  }
  function wireSpecs() { return topo().map(function (w) { return { id: w[0], a: P[w[1]], b: P[w[2]], color: w[3], via: w[4], I: st.wI[w[0]] || 0 }; }); }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 44);
    bat = C.battery(S, { cells: 2, at: [-2, TOP, 17] });   // 正极在右，靠近开关
    sw = C.knife(S, { at: [19, TOP, 17] });
    L1 = C.bulb(S, { at: [LAY.ser.L1[0], TOP, LAY.ser.L1[1]] }); L2 = C.bulb(S, { at: [LAY.ser.L2[0], TOP, LAY.ser.L2[1]] });
    am = C.meter(S, { letter: 'A', ranges: [0.6, 3], at: [LAY.ser.slot.A[0], TOP, LAY.ser.slot.A[1]] });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'L1.L': L1.posts.L, 'L1.R': L1.posts.R, 'L2.L': L2.posts.L, 'L2.R': L2.posts.R, 'A.-': am.posts['-'], 'A.0.6': am.posts['0.6'], 'A.3': am.posts['3'] };
    ['A', 'B', 'C'].forEach(function (k) {   // 三个电流表位置（随串联 / 并联摆法变）：虚线框 + 测点字母
      var g = C.group(S, [0, 0, 0]), lab = { t: '测 ' + k + ' 点' };
      var d = C.decal(12, 10, function (ctx, w, h, ppc) { ctx.strokeStyle = '#8A99AD'; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.strokeRect(4, 4, w - 8, h - 8); ctx.fillStyle = '#56677D'; ctx.font = 'bold ' + (2.4 * ppc) + 'px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab.t, w / 2, h / 2); }, { at: [0, TOP + 0.02, 0], rot: [-Math.PI / 2, 0, 0], parent: g, transparent: true, tint: 0xFFFFFF });
      var h = new T3.Mesh(new T3.BoxGeometry(12, 3, 10), C.M.hit); h.position.y = 1.5; g.add(h);
      slots[k] = { g: g, hit: h, d: d, lab: lab };
    });
    ['A', 'B', 'C'].forEach(function (k) { C.markTag('p' + k, k); });
    C.nameTag('n1'); C.nameTag('n2');
    W = C.wires(S);
    sw.hit.userData.act = 'sw';
    am.posts['0.6'].userData.hit.userData.act = 'range:0.6'; am.posts['3'].userData.hit.userData.act = 'range:3';
    L1.hit.userData.act = 'bulb:1'; L2.hit.userData.act = 'bulb:2';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: setTrial });
    var picks = [sw.hit, am.posts['0.6'].userData.hit, am.posts['3'].userData.hit, L1.hit, L2.hit, slots.A.hit, slots.B.hit, slots.C.hit];
    slots.A.hit.userData.act = 'slot:A'; slots.B.hit.userData.act = 'slot:B'; slots.C.hit.userData.act = 'slot:C';
    function hitAct(ev) { var a = CC.actOf(V.pick(ev, picks)); if (a && a.indexOf('slot:') === 0 && st.pt === a.slice(5)) return null; return a; }
    V.drag = {
      hit: function (ev) { return !!hitAct(ev); },
      start: function (ev) { var a = hitAct(ev); if (!a) return false; grab = { a: a, x: ev.clientX, y: ev.clientY, moved: false }; if (a === 'sw') ctl.down(); return true; },
      move: function (ev) { if (grab && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 6) { grab.moved = true; if (grab.a === 'sw') ctl.move(true); } },
      end: function () {
        var g = grab; grab = null; if (!g) return;
        if (g.a === 'sw') { ctl.up(); return; }
        if (g.moved) return;
        if (g.a.indexOf('range:') === 0) setRange(g.a.slice(6));
        else if (g.a.indexOf('slot:') === 0) setPt(g.a.slice(5));
        else if (g.a === 'bulb:1') cycle(1); else if (g.a === 'bulb:2') cycle(2);
      }
    };
    win = CC.win(K, '电流表表盘', [{ m: am, terms: true, wired: function () { var o = {}; o['-'] = true; o[st.range] = true; return o; } }], 330);
    V.frame = tick;
    relabel(); place(true);
  }
  function relabel() { V.tag('n1').innerHTML = 'L₁ ' + st.l1; V.tag('n2').innerHTML = 'L₂ ' + st.l2; }
  /* 测点圆圈：直接连着的导线取导线中点；电流表接在这一点时取两端接线柱的中点 */
  function ptPos(p) {
    var w = W.get(p !== st.pt ? p : p + '1');
    return w && w.curve ? w.curve.getPointAt(p !== st.pt ? (st.mode === 'par' ? { A: 0.62, B: 0.42, C: 0.5 }[p] : 0.5) : 0.45) : null;
  }
  /* 器材就位：灯泡（串联 / 并联两种摆法）、电流表、测点圆圈；instant = 不要动画 */
  function place(instant, dt) {
    var lay = LAY[st.mode], moving = false, k = instant ? 1 : Math.min(1, (dt || 0) * 8);
    function go(obj, x, z) { var p = obj.position; if (Math.abs(p.x - x) < 0.03 && Math.abs(p.z - z) < 0.03) { if (p.x !== x || p.z !== z) { p.x = x; p.z = z; moving = true; } return; } p.x += (x - p.x) * k; p.z += (z - p.z) * k; moving = true; }
    go(L1.group, lay.L1[0], lay.L1[1]); go(L2.group, lay.L2[0], lay.L2[1]);
    go(am.group, lay.slot[st.pt][0], lay.slot[st.pt][1]);
    ['A', 'B', 'C'].forEach(function (p) { var sl = lay.slot[p], g = slots[p].g; g.position.set(sl[0], 0, sl[1]); g.visible = Math.hypot(am.group.position.x - sl[0], am.group.position.z - sl[1]) > 3; });
    if (moving) { V.scene.updateMatrixWorld(true); W.set(wireSpecs()); }
    C.showTag('n1', L1.group.position.clone().add(new T3.Vector3(0, 0.2, 2.4)), true); C.showTag('n2', L2.group.position.clone().add(new T3.Vector3(0, 0.2, 2.4)), true);
    ['A', 'B', 'C'].forEach(function (p) { C.showTag('p' + p, ptPos(p), true); });
  }

  /* ── 改接（都要先断开开关）── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function rewire(fn) { if (eff()) { nag('先断开开关，再改接。'); return false; } fn(); changed(); return true; }
  function setRange(r) { if (r !== st.range) rewire(function () { st.range = r; }); }
  function setPt(p) { if (p !== st.pt) rewire(function () { st.pt = p; }); }
  function setMode(m) { if (m !== st.mode) rewire(function () { st.mode = m; relabel(); }); }
  function allowed(which, s) { var o = which === 1 ? st.l2 : st.l1; return s !== o || STOCK[s] > 1; }
  function cycle(which) {
    var cur = which === 1 ? st.l1 : st.l2, i = ORDER.indexOf(cur), nx = cur;
    for (var k = 1; k <= 3; k++) { var c = ORDER[(i + k) % 3]; if (allowed(which, c)) { nx = c; break; } }
    rewire(function () { if (which === 1) st.l1 = nx; else st.l2 = nx; relabel(); });
  }
  function setClosed(v) { st.closed = !!v; st.trial = false; changed(); }
  function setTrial(on) { st.trial = !!on && !st.closed; changed(); }
  function changed() { dirty = true; last = ''; st.nag = 0; }

  function tick(dt) {
    if (dirty) { dirty = false; solve(); W.set(wireSpecs()); }
    place(false, dt);
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(eff()); sw.update(dt); am.update(dt); W.flow(st.flow); W.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与读数 ── */
  function combo() { return st.l1 + '、' + st.l2; }
  function row() { return st.rows[st.mode].filter(function (r) { return r.combo === combo(); })[0]; }
  function valid() { return eff() && !st.trial && !am.over && !am.reversed; }
  function vtxt() { return CC.quant(st.Im, DIV[st.range]).toFixed(st.range === '0.6' ? 2 : 1); }
  function dup() { var r = row(); return !!(r && r[st.pt] != null); }
  function canRec() { return valid() && K.revealed() && !dup(); }
  function q6() { return K.S.q === 5 && st.mode === 'par'; }   // 第 6 问只比较两条支路（A、B）
  function nextPt() { var r = row(); return (q6() ? ['A', 'B'] : ['A', 'B', 'C']).filter(function (p) { return !r || r[p] == null; })[0]; }   // 与第 1 问任务“依次测 A、B、C”一致
  function ui() {
    var key0 = [st.mode, st.pt, st.range, st.l1, st.l2, eff()].join('|');
    if (key0 !== mkey) { mkey = key0; K.invalidate(); }
    var on = eff(), hint, tone = '', np = nextPt();
    var checks = [{ label: '开关闭合', ok: on ? true : null }, { label: '正进负出', ok: on && am.reversed ? false : true }, { label: '不超量程', ok: !on ? null : !am.over }];
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (!on) hint = '闭合开关（或按住开关试触），测 ' + st.pt + ' 点的电流。';
    else if (am.over) { hint = st.trial ? '试触：指针打到头，超过量程。松手，换 0～3 A。' : '指针打到头，超过量程！立即断开开关，换 0～3 A。'; tone = 'warn'; }
    else if (st.trial) hint = '试触：指针没有超过量程' + (st.range === '3' && st.Im < 0.6 ? '，可以换 0～0.6 A。' : '，可以闭合开关读数。');
    else if (dup()) {
      hint = np ? st.pt + ' 点已记过。断开开关，换测 ' + np + ' 点。'
        : q6() ? (st.l1 === st.l2 ? '两条支路都测过了。断开开关，点一个灯泡换成不同规格的，再测两条支路。' : '这组灯泡的两条支路都测过了。比一比灯泡规格相同和不同时，两条支路的电流。')
        : K.S.q === 1 ? '这组灯泡三处都测过了。比一比两灯的亮度和测得的电流。' : '这组灯泡三处都测完了。断开开关，换一组灯泡再测。';
      tone = np ? '' : 'good';
    }
    else if (!K.revealed()) hint = st.range === '3' && st.Im < 0.58 ? '电流不到 0.6 A，换 0～0.6 A 读得更准。也可以先读一读。' : '读出 ' + st.pt + ' 点的电流。';
    else { hint = '读数正确，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: valid(), result: '<span class="m">I</span><sub style="line-height:0">' + st.pt + '</sub> = <b>' + vtxt() + '</b> A　（0～' + st.range + ' A，分度值 ' + DIV[st.range] + ' A）' });
    var key = [canRec(), K.revealed(), vtxt(), valid(), JSON.stringify(st.rows), key0, st.closed, st.trial, st.flow].join('|');
    if (key === last) return; last = key;
    K.setReading('I', valid() && K.revealed() ? vtxt() : null);
    var ok = canRec();
    K.setRecord(ok, '', ok ? 'good' : '');
    if (ok) document.getElementById('rec-tip').innerHTML = '记入' + MODEN[st.mode] + '表「' + combo() + '」一行的 <span class="m">I</span><sub style="line-height:0">' + st.pt + '</sub>';
    K.setCount(st.rows.ser.length + st.rows.par.length + ' 组');
    sync();
  }

  /* ── 面板 ── */
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-mode', '电路', [['ser', '串联'], ['par', '并联']]) +
      CC.opts('o-pt', '测点', [['A', 'A 点'], ['B', 'B 点'], ['C', 'C 点']]) +
      CC.opts('o-rng', '量程', [['0.6', '0～0.6 A'], ['3', '0～3 A']]) +
      K.grp('换灯泡', K.acts([['b-l1', '↻', 'L₁'], ['b-l2', '↻', 'L₂']])) +   // 动作：点一下换成下一种规格
      CC.swRow({ trial: true, flow: true });
    CC.bind('o-mode', setMode); CC.bind('o-pt', setPt); CC.bind('o-rng', setRange);
    document.getElementById('b-l1').onclick = function () { cycle(1); };
    document.getElementById('b-l2').onclick = function () { cycle(2); };
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, trial: function (on) { if (on || st.trial) setTrial(on); }, closed: function () { return st.closed; }, flow: function () { st.flow = !st.flow; last = ''; } });
  }
  function sync() {
    CC.mark('o-mode', st.mode); CC.mark('o-pt', st.pt); CC.mark('o-rng', st.range);
    document.getElementById('b-l1').innerHTML = '<i>↻</i>L₁：' + st.l1; document.getElementById('b-l2').innerHTML = '<i>↻</i>L₂：' + st.l2;
    CC.swSync(st.closed, st.trial, st.flow);
  }

  function preset(i) {
    var P0 = [['ser', '甲', '乙', 'A', '0.6'], ['ser', '甲', '乙', 'A', '0.6'], ['ser', '甲', '丙', 'A', '0.6'], ['par', '甲', '乙', 'A', '0.6'], ['par', '甲', '丙', 'C', '0.6'], ['par', '甲', '甲', 'A', '0.6']][i];
    st.mode = P0[0]; st.l1 = P0[1]; st.l2 = P0[2]; if (!allowed(2, st.l2)) st.l2 = ORDER.filter(function (x) { return x !== st.l1; })[0];   // 同一种灯泡只有一个时，不能两处都用它 st.pt = P0[3]; st.range = P0[4]; st.closed = false; st.trial = false; st.nag = 0;
    if (K.revealed()) K.invalidate();
    relabel(); changed();
  }

  window.__exp = { st: st, V: function () { return V; }, am: function () { return am; }, sw: function () { return sw; }, L1: function () { return L1; }, L2: function () { return L2; }, slots: function () { return slots; }, P: function () { return P; } };
  LabKit.run({
    readings: [{ id: 'I', name: '电流 <span class="m">I</span>', unit: 'A' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">点开关：闭合 / 断开，按住不放是试触；点虚线框改测点；点灯泡换规格；点“0.6”“3”接线柱换量程</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () {
      if (!canRec()) return;
      var r = row(); if (!r) { r = { combo: combo() }; st.rows[st.mode].push(r); }
      r[st.pt] = vtxt(); last = '';
    },
    clear: function () { st.rows = { ser: [], par: [] }; last = ''; },
    renderData: function () {
      function tb(m) {
        var R = st.rows[m];
        return '<h3 style="margin:6px 0 8px;font-size:22px">' + MODEN[m] + '电路</h3><table class="rec" style="max-width:1000px"><thead><tr><th>小灯泡规格</th><th>A 点电流 <span class="m">I</span><sub>A</sub>/A</th><th>B 点电流 <span class="m">I</span><sub>B</sub>/A</th><th>C 点电流 <span class="m">I</span><sub>C</sub>/A</th></tr></thead><tbody>' +
          (R.length ? R.map(function (r) { return '<tr><td>L₁ ' + r.combo.split('、')[0] + '，L₂ ' + r.combo.split('、')[1] + '</td>' + ['A', 'B', 'C'].map(function (p) { return r[p] != null ? '<td class="n">' + r[p] + '</td>' : '<td class="dim">—</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="4" class="dim">还没有记录</td></tr>') + '</tbody></table>';
      }
      return '<div class="dvh"><h2>记录表</h2><span>每组灯泡一行；每张表至少测两组不同规格的灯泡</span></div>' + tb('ser') + tb('par') +
        '<p class="tip">串联：电流依次流过 C、B、A，比较 <span class="m">I</span><sub>A</sub>、<span class="m">I</span><sub>B</sub>、<span class="m">I</span><sub>C</sub>；并联：比较 <span class="m">I</span><sub>C</sub> 与 <span class="m">I</span><sub>A</sub> + <span class="m">I</span><sub>B</sub>（读数按分度值，和可能差一个分度值）。</p>';
    }
  });
})();
