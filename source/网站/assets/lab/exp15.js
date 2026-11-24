/* 15 用电流表测量电流（课本图15.4-3、图15.4-5、图15.4-6）。
   装置：一节干电池（电池盒）、闸刀开关、小灯泡、电流表（“−”“0.6”“3”），导线串联；电流表可放在灯前（灯泡左侧）或灯后（右侧）。
   参数：电池 1.5 V；小灯泡约 8 Ω；正常串联约 0.18 A（0～0.6 A 读 0.18 A，0～3 A 读 0.2 A）。
   电池内阻取 0.3 Ω（指令写 0.5 Ω）：串联电流仍读 0.18 A，而电流表把灯泡短路时电流约 4.7 A，0～3 A 量程也会打到头，与“猛偏超过量程”一致。
   电流表内阻 0.05 Ω（0.6 A 挡）/ 0.01 Ω（3 A 挡）。电路用 Circuit.net() 节点电压法求解，错误接法的现象由同一模型算出。
   操作：点开关闭合 / 断开，按住开关不放 = 试触；点电流表的“0.6”“3”接线柱换量程；点空着的虚线框把电流表挪过去；
   改接（换位置、换量程、换接法）都要先断开开关。短路（电流表并在灯泡两端、直接接电源两极）时约 0.6 s 后自动断开。 */

/* ════ 参数区：老师 DIY / 交给 AI 助手修改，只改这一段 ════
   每一项后面是中文说明和可选值；改完保存、刷新页面即可。
   页面顶栏「定制」里点选的结果会覆盖这里的默认值（点「改回原样」回到这里的值）。
   这里只管外观和生活情境：电池、灯泡电阻、电流表读数、题目和答案都不受影响。 */
var CFG = {
  lamp: 'bulb',     // 灯泡样式：'bulb' 透明小灯泡 | 'led' 磨砂小灯泡（只换外观，电流读数不变）
  wire: 'color',    // 导线颜色：'rb' 红黑（接正极一侧红色、回负极一侧黑色）| 'color' 彩色（红、蓝、绿、黑）
  scene: 'none'     // 生活情境卡：'none' 不显示 | 'torch' 手电筒 | 'string' 节日小彩灯
};
/* ════ 参数区结束（下面是实验程序，不用改）════ */

(function () {
  var CC = window.Circuit, TOP = CC.TOP;
  var DIY = { lamp: CFG.lamp === 'led' ? 'led' : 'bulb', wire: CFG.wire === 'rb' ? 'rb' : 'color', scene: CFG.scene || 'none' };
  var RB = { red: 'red', blue: 'red', green: 'black', black: 'black' };   // 红黑：电源正极到电流表、灯这一路用红色，回负极用黑色
  var EMF = 1.5, RIN = 0.3, RL = 8, RA = { '0.6': 0.05, '3': 0.01 }, DIV = { '0.6': 0.02, '3': 0.1 };
  var SPOT = { pre: [-19, -12], post: [19, -12] };
  var POSN = { pre: '灯前', post: '灯后' }, FAULTN = { none: '正常', rev: '接反', par: '并在灯两端', dir: '接电源两极' };
  var st = { pos: 'post', range: '0.6', fault: 'none', closed: false, trial: false, rows: [], nag: 0, nagMsg: '', shortT: 0, autoOff: '', Im: 0, Icell: 0, IL: 0, short: false };
  var K, V, C, T3, W, am, bat, sw, lamp, win, P = {}, spots = {}, last = '', mkey = '', ctl, grab = null, meterTo = null, dirty = true;

  function eff() { return st.closed || st.trial; }
  function spotOf() { return st.fault === 'par' || st.fault === 'dir' ? 'pre' : st.pos; }
  /* 导线：[id, 起点, 终点, 颜色]，按电流方向（从电源正极出发） */
  function topo() {
    var r = 'A.' + st.range, inP = st.fault === 'rev' ? 'A.-' : r, outP = st.fault === 'rev' ? r : 'A.-';
    var L = [['w1', 'bat+', 'sw.R', 'red']];
    if (st.fault === 'dir') L.push(['w2', 'sw.L', r, 'blue'], ['w3', 'A.-', 'bat-', 'black']);
    else if (st.fault === 'par') L.push(['w2', 'sw.L', 'L.L', 'blue'], ['w3', 'L.R', 'bat-', 'black'], ['w4', 'L.L', r, 'green'], ['w5', 'A.-', 'L.R', 'green']);
    else if (st.pos === 'pre') L.push(['w2', 'sw.L', inP, 'blue'], ['w4', outP, 'L.L', 'green'], ['w3', 'L.R', 'bat-', 'black']);
    else L.push(['w2', 'sw.L', 'L.L', 'blue'], ['w4', 'L.R', inP, 'green'], ['w3', outP, 'bat-', 'black']);
    return L;
  }
  function solve() {
    var n = CC.net(), L = topo();
    n.ground('bat-'); n.cell('bat-', 'bat+', EMF, RIN, 'cell');
    L.forEach(function (w) { n.wire(w[1], w[2], w[0]); });
    if (eff()) n.wire('sw.R', 'sw.L', 'sw');
    n.R('L.L', 'L.R', RL, 'lamp'); n.R('A.0.6', 'A.-', RA['0.6'], 'a06'); n.R('A.3', 'A.-', RA['3'], 'a3');
    var s = n.solve();
    st.Icell = s.i('cell'); st.Im = s.i('a06') + s.i('a3'); st.IL = s.i('lamp'); st.short = Math.abs(st.Icell) > 2;
    st.wI = {}; L.forEach(function (w) { st.wI[w[0]] = s.i(w[0]); });
    am.set(st.Im, +st.range);
    lamp.setWatts(st.IL * st.IL * RL);
  }
  function wireSpecs() {
    return topo().map(function (w) { return { id: w[0], a: P[w[1]], b: P[w[2]], color: DIY.wire === 'rb' ? RB[w[3]] : w[3], I: st.wI ? st.wI[w[0]] : 0 }; });
  }

  /* ── 场景 ── */
  function build() {
    V = K.three(CC.cam());
    T3 = V.T; C = CC.setup(V); var S = V.scene;
    C.board(60, 42);
    bat = C.battery(S, { cells: 1, at: [2, TOP, 14], plusLeft: true });
    sw = C.knife(S, { at: [-18, TOP, 14] });
    lamp = C.bulb(S, { at: [0, TOP, -7] }); lamp.setStyle(DIY.lamp);
    am = C.meter(S, { letter: 'A', ranges: [0.6, 3], at: [SPOT.pre[0], TOP, SPOT.pre[1]] });
    P = { 'bat+': bat.posts['+'], 'bat-': bat.posts['-'], 'sw.L': sw.posts.L, 'sw.R': sw.posts.R, 'L.L': lamp.posts.L, 'L.R': lamp.posts.R, 'A.-': am.posts['-'], 'A.0.6': am.posts['0.6'], 'A.3': am.posts['3'] };
    ['pre', 'post'].forEach(function (k) {   // 电流表的两个位置：虚线框 + 名称（电流表不在时可见）
      var g = C.group(S, [SPOT[k][0], 0, SPOT[k][1]]);
      C.decal(12, 10, function (ctx, w, h, ppc) { ctx.strokeStyle = '#8A99AD'; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.strokeRect(4, 4, w - 8, h - 8); ctx.fillStyle = '#56677D'; ctx.font = 'bold ' + (2.6 * ppc) + 'px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(POSN[k], w / 2, h / 2); }, { at: [0, TOP + 0.02, 0], rot: [-Math.PI / 2, 0, 0], parent: g, transparent: true, tint: 0xFFFFFF });
      var h = new T3.Mesh(new T3.BoxGeometry(12, 3, 10), C.M.hit); h.position.y = 1.5; g.add(h); h.userData.act = 'spot:' + k; spots[k] = h;
    });
    W = C.wires(S);
    sw.hit.userData.act = 'sw';
    am.posts['0.6'].userData.hit.userData.act = 'range:0.6'; am.posts['3'].userData.hit.userData.act = 'range:3';
    ctl = CC.switchCtl({ get: function () { return st; }, set: setClosed, trial: setTrial });
    var picks = [sw.hit, am.posts['0.6'].userData.hit, am.posts['3'].userData.hit, spots.pre, spots.post];
    function hitAct(ev) { var h = V.pick(ev, picks); var a = CC.actOf(h); if (a && a.indexOf('spot:') === 0 && spotOf() === a.slice(5)) return null; return a; }
    V.drag = {
      hit: function (ev) { return !!hitAct(ev); },
      start: function (ev) { var a = hitAct(ev); if (!a) return false; grab = { a: a, x: ev.clientX, y: ev.clientY, moved: false }; if (a === 'sw') ctl.down(); return true; },
      move: function (ev) { if (grab && Math.hypot(ev.clientX - grab.x, ev.clientY - grab.y) > 6) { grab.moved = true; if (grab.a === 'sw') ctl.move(true); } },
      end: function () {
        var g = grab; grab = null; if (!g) return;
        if (g.a === 'sw') { ctl.up(); return; }
        if (g.moved) return;
        if (g.a.indexOf('range:') === 0) setRange(g.a.slice(6));
        else if (g.a.indexOf('spot:') === 0) setPos(g.a.slice(5));
      }
    };
    win = CC.win(K, '电流表表盘', [{ m: am, terms: true, wired: function () { var o = {}; o['-'] = true; o[st.range] = true; return o; } }], 330);
    V.frame = tick;
    var p0 = SPOT[spotOf()]; am.group.position.set(p0[0], TOP, p0[1]); am.snap();
  }

  /* ── 改接（都要先断开开关）── */
  function nag(t) { st.nag = 3; st.nagMsg = t; last = ''; }
  function rewire(fn) { if (eff()) { nag('先断开开关，再改接。'); return false; } fn(); st.autoOff = ''; changed(); return true; }
  function setRange(r) { if (r === st.range) return; rewire(function () { st.range = r; }); }
  function setPos(p) { if (p === st.pos && st.fault !== 'par' && st.fault !== 'dir') return; rewire(function () { st.pos = p; if (st.fault === 'par' || st.fault === 'dir') st.fault = 'none'; }); }
  function setFault(f) { if (f === st.fault) return; rewire(function () { st.fault = f; }); }
  function setClosed(v) { st.closed = !!v; st.trial = false; if (v) st.autoOff = ''; changed(); }
  function setTrial(on) { st.trial = !!on && !st.closed; if (on) st.autoOff = ''; changed(); }
  function changed() { dirty = true; last = ''; st.nag = 0; }

  function tick(dt) {
    if (dirty) { dirty = false; solve(); W.set(wireSpecs()); }
    // 电流表挪位置：滑过去，导线跟着走
    var to = SPOT[spotOf()], gp = am.group.position;
    if (Math.abs(gp.x - to[0]) > 0.01 || Math.abs(gp.z - to[1]) > 0.01) { var k = Math.min(1, dt * 8); gp.x += (to[0] - gp.x) * k; gp.z += (to[1] - gp.z) * k; if (Math.abs(gp.x - to[0]) < 0.05) { gp.x = to[0]; gp.z = to[1]; } am.group.updateMatrixWorld(true); W.set(wireSpecs()); }
    spots.pre.parent.visible = spotOf() !== 'pre' || Math.abs(gp.x - SPOT.pre[0]) > 3; spots.post.parent.visible = spotOf() !== 'post' || Math.abs(gp.x - SPOT.post[0]) > 3;
    // 短路保护：约 0.6 s 后自动断开
    if (eff() && st.short) { st.shortT += dt; if (st.shortT > 0.6) { st.autoOff = st.fault === 'par' ? 'par' : 'dir'; st.closed = false; st.trial = false; changed(); } } else st.shortT = 0;
    if (st.nag > 0) { st.nag -= dt; if (st.nag <= 0) last = ''; }
    sw.set(eff()); sw.update(dt); am.update(dt);
    win.update();
    ui();
  }

  /* ── 检查与读数 ── */
  function valid() { return eff() && !st.trial && st.fault === 'none' && !am.over && !am.reversed && !st.short; }
  function val() { return CC.quant(st.Im, DIV[st.range]); }
  function vtxt() { return val().toFixed(st.range === '0.6' ? 2 : 1); }
  function dup() { return st.rows.some(function (r) { return r.pos === st.pos && r.range === st.range; }); }
  function canRec() { return valid() && K.revealed() && !dup(); }
  function ui() {
    var key0 = [st.pos, st.range, st.fault, eff()].join('|');
    if (key0 !== mkey) { mkey = key0; K.invalidate(); }
    var on = eff(), hint, tone = '';
    var checks = [
      { label: '开关闭合', ok: on ? true : null },
      { label: '与灯串联', ok: st.fault === 'par' || st.fault === 'dir' ? false : true },
      { label: '正进负出', ok: st.fault === 'rev' ? false : true },
      { label: '不超量程', ok: !on ? null : !(am.over || st.short) }
    ];
    if (st.nag > 0) { hint = st.nagMsg; tone = 'warn'; }
    else if (st.autoOff) { hint = st.autoOff === 'par' ? '电流表把灯泡短路了：灯灭，电流很大，指针打到头。已自动断开。' : '电流表直接接在电源两极，短路！会烧坏电流表和电源。已自动断开。'; tone = 'warn'; }
    else if (on && st.short) { hint = '短路！电流很大，指针打到头。'; tone = 'warn'; }
    else if (!on) hint = st.fault !== 'none' ? '按住开关试触，看看会怎样。' : K.S.q === 0 ? '先看电流表的接线柱和表盘上的两排刻度。' : '闭合开关，或按住开关试触，看指针。';   // 第 1 问只认表，开关保持断开
    else if (st.fault === 'rev' || am.reversed) { hint = '指针向左反偏：电流从“−”接线柱流进了。断开开关，把两根导线对调。'; tone = 'warn'; }
    else if (am.over) { hint = '指针打到头，超过量程。立即断开，换 0～3 A。'; tone = 'warn'; }
    else if (st.trial) hint = st.range === '3' ? '试触：指针偏得很小，可以换 0～0.6 A。' : '试触：指针没有超过量程，可以闭合开关读数。';
    else if (dup()) {
      var both = st.rows.some(function (r) { return r.pos === 'pre'; }) && st.rows.some(function (r) { return r.pos === 'post'; });
      hint = both ? '灯前、灯后都测过了，到「数据」比较。' : '这个位置和量程已记过。断开开关，把电流表换到' + (st.pos === 'pre' ? '灯后' : '灯前') + '再测。'; tone = both ? 'good' : '';
    }
    else if (!K.revealed()) hint = st.range === '3' ? '指针偏得很小，换 0～0.6 A 读得更准。也可以先读一读。' : '先说出量程和分度值，再读数。';
    else { hint = st.range === '3' ? '可以记录；换用小量程，读数更准确。' : '读数正确，可以记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: true, ready: valid(), result: '<span class="m">I</span> = <b>' + vtxt() + '</b> A　（0～' + st.range + ' A，分度值 ' + DIV[st.range] + ' A）' });
    var key = [canRec(), K.revealed(), vtxt(), valid(), st.rows.length, st.pos, st.range, st.fault, st.closed, st.trial].join('|');
    if (key === last) return; last = key;
    K.setReading('I', valid() && K.revealed() ? vtxt() : null);
    var ok = canRec();
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次：' + POSN[st.pos] + '，0～' + st.range + ' A' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 次');
    sync();
  }

  /* ── 面板 ── */
  function ctrls() {
    K.ctrl.innerHTML =
      CC.opts('o-pos', '位置', [['post', '灯后（图甲）'], ['pre', '灯前（图乙）']]) +
      CC.opts('o-rng', '量程', [['0.6', '0～0.6 A'], ['3', '0～3 A']]) +
      CC.opts('o-flt', '接法', [['none', '正常'], ['rev', '接反'], ['par', '并在灯两端'], ['dir', '接电源两极']]) +
      CC.swRow({ trial: true });
    CC.bind('o-pos', setPos); CC.bind('o-rng', setRange); CC.bind('o-flt', setFault);
    CC.swBind({ toggle: function () { setClosed(!st.closed); }, trial: function (on) { if (on || st.trial) setTrial(on); }, closed: function () { return st.closed; } });
  }
  function sync() {
    var bad = st.fault === 'par' || st.fault === 'dir';
    CC.mark('o-pos', bad ? '' : st.pos); CC.mark('o-rng', st.range); CC.mark('o-flt', st.fault);
    CC.swSync(st.closed, st.trial);
  }

  function preset(i) {
    var P0 = [['post', '0.6', 'none'], ['post', '3', 'none'], ['post', '0.6', 'none'], ['pre', '0.6', 'none'], ['post', '0.6', 'rev'], ['post', '3', 'par']][i];   // 按课本顺序：先测灯后（图15.4-6 甲），第 4 问再挪到灯前（图乙）
    st.pos = P0[0]; st.range = P0[1]; st.fault = P0[2]; st.closed = false; st.trial = false; st.nag = 0; st.autoOff = ''; st.shortT = 0;
    K.warn(''); K.invalidate(); changed();
  }

  /* ── 定制：生活情境卡 ── */
  var INK = '#1E3A5F', ACC = '#2563EB', LIT = '#FFC93C';
  var SCENES = {
    torch: { title: '手电筒', text: '手电筒里，电池、按钮开关和小灯泡首尾依次相连，和桌上的电路一样是串联电路；要测电流，电流表也要串联进去。',
      svg: '<svg viewBox="0 0 300 112"><path d="M30 38 H196 L232 22 V90 L196 74 H30 Z" fill="#fff" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<rect x="40" y="44" width="52" height="24" rx="4" fill="#E3ECFF" stroke="' + INK + '" stroke-width="2"/><rect x="96" y="44" width="52" height="24" rx="4" fill="#E3ECFF" stroke="' + INK + '" stroke-width="2"/>' +
        '<text x="66" y="61" text-anchor="middle" font-size="13" fill="' + INK + '">电池</text><text x="122" y="61" text-anchor="middle" font-size="13" fill="' + INK + '">电池</text><rect x="158" y="30" width="18" height="8" rx="2" fill="' + ACC + '"/><text x="167" y="24" text-anchor="middle" font-size="12" fill="' + ACC + '">开关</text>' +
        '<circle cx="214" cy="56" r="10" fill="' + LIT + '" stroke="' + INK + '" stroke-width="2"/><path d="M238 36 L292 18 M240 56 H296 M238 76 L292 94" stroke="' + LIT + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M34 84 H150 M150 84 l-8 -5 M150 84 l-8 5" fill="none" stroke="' + ACC + '" stroke-width="2" stroke-dasharray="0"/><text x="38" y="104" font-size="12" fill="' + ACC + '">电流路径只有一条：串联</text></svg>' },
    string: { title: '节日小彩灯', text: '一串小彩灯由许多小灯泡串联而成，接在电源上一起发光。想知道通过小彩灯的电流有多大，电流表也要串联接入电路。',
      svg: (function () {
        var x = '<svg viewBox="0 0 300 112"><path d="M14 30 Q80 70 150 34 T286 34" fill="none" stroke="' + INK + '" stroke-width="2.5"/>', cs = ['#FE752D', '#2563EB', '#1B7A50', '#E0A100', '#B478FF'];
        for (var i = 0; i < 9; i++) { var t = 22 + i * 32, y = i < 5 ? 30 + 34 * Math.sin(i / 4 * Math.PI) * 0.62 : 34 - 6 * Math.sin((i - 4) / 4 * Math.PI); x += '<rect x="' + (t - 4) + '" y="' + (y - 2) + '" width="8" height="7" fill="' + INK + '"/><ellipse cx="' + t + '" cy="' + (y + 14) + '" rx="7" ry="10" fill="' + cs[i % 5] + '" stroke="' + INK + '" stroke-width="1.5"/>'; }
        return x + '<rect x="108" y="84" width="84" height="22" rx="4" fill="#fff" stroke="' + INK + '" stroke-width="2"/><text x="150" y="100" text-anchor="middle" font-size="13" fill="' + INK + '">电源 · 插头</text></svg>';
      })() }
  };
  function showCard() { var c = SCENES[DIY.scene]; K.card(c ? { id: DIY.scene, title: c.title, svg: c.svg, text: c.text } : null); }
  var DIY_ITEMS = [
    { id: 'lamp', label: '灯泡样式', type: 'seg', options: [['bulb', '透明小灯泡'], ['led', '磨砂小灯泡']], def: CFG.lamp, apply: function (v) { DIY.lamp = v === 'led' ? 'led' : 'bulb'; lamp.setStyle(DIY.lamp); }, tip: '只换外观，电流读数仍按原小灯泡（约 8 Ω）计算' },
    { id: 'wire', label: '导线颜色', type: 'seg', options: [['rb', '红黑'], ['color', '彩色']], def: CFG.wire, apply: function (v) { DIY.wire = v === 'rb' ? 'rb' : 'color'; dirty = true; } },
    { id: 'scene', label: '生活情境', type: 'seg', options: [['none', '无'], ['torch', '手电筒'], ['string', '节日小彩灯']], def: CFG.scene, apply: function (v) { DIY.scene = v; showCard(); } }
  ];

  window.__exp = { st: st, V: function () { return V; }, am: function () { return am; }, sw: function () { return sw; }, lamp: function () { return lamp; }, P: function () { return P; }, spots: function () { return spots; } };
  LabKit.run({
    readings: [{ id: 'I', name: '电流 <span class="m">I</span>', unit: 'A' }],
    diy: DIY_ITEMS,
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">点开关：闭合 / 断开，按住不放是试触；点“0.6”“3”接线柱换量程；点虚线框挪电流表；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(0); },
    onReveal: function () { last = ''; },
    record: function () { if (!canRec()) return; st.rows.push({ pos: st.pos, range: st.range, I: vtxt() }); last = ''; },
    clear: function () { st.rows = []; last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2><span>同一电路，电流表先放在灯后（图甲）、再放在灯前（图乙）各测一次</span></div>' +
        '<table class="rec" style="max-width:900px"><thead><tr><th style="width:110px">次数</th><th>电流表的位置</th><th>所用量程</th><th>电流 <span class="m">I</span>/A</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + '</td><td>' + POSN[r.pos] + '（灯泡' + (r.pos === 'pre' ? '左' : '右') + '侧）</td><td>0～' + r.range + ' A</td><td class="n">' + r.I + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="dim">还没有记录</td></tr>') +
        '</tbody></table><p class="tip">比较电流表在灯后、灯前两次的示数。</p>';
    }
  });
})();
