/* 实验页公共框架 LabKit（01–03 起）。
   页面：<body data-no="03">，依次加载 ../data.js、three.min.js、lab.js、expNN.js；expNN.js 调用 LabKit.run(def)。
   def = {
     readings: [{ id, name, unit }],          顶栏读数（值为 null 时显示“?”）
     ctrlTitle: '器材调节',
     init(K)                                   建场景、写控件；K 见下方 api
     preset(i)                                 第 i 问的起始器材（“仪器复原”也调用）
     reset()                                   重置实验（保留记录与使用模式）
     （只有教学演示一种模式；2026-11-21 起不再做「学生自学」）
     renderData(K)                             返回数据页 HTML
     calc: { teach: '显示计算' }               有计算任务时提供
     clear()                                   清空记录
     diy: [{ id, label, type:'seg'|'sw', options:[[值,文字]], def, apply(v) }]   顶栏「定制」面板里的“本实验”选项（默认值取自 expNN.js 顶部参数区 CFG；见下方 LabDIY）
     qText(s)                                  可选：显示题目、答案、任务前改写措辞（如情境里把“金属块”换成“石块”），不改内容
   }
   K.card(spec)：生活情境卡（3D 舞台右下角，见 LabDIY.card）；K.refreshQ()：措辞变了以后重画题目 */
/* ════ 老师 DIY 定制 LabDIY（2026-11-21 第二版）════
   顶栏「定制」按钮 + 浮层面板（不占右栏）。面板只放好改的：
   改哪里（只改这个实验 / 所有实验）、样子（坐标纸 / 沉浸舞台 / 手绘本）、颜色（每种样子 6 种，都测过对比度）、字、器材名字；
   再加上本实验自己的选项（items，折叠在“这个实验”里）。
   → 给 body 加 dz-style-* / dz-theme-* / dz-fz-* / dz-tags-* 类，样式写在各页 CSS 里。
   本实验：items = [{ id, label, type: 'seg' | 'sw', options: [[值, 文字], ...], def: 默认值（取自参数区 CFG）, apply: function (v) {}, tip }]
   选择即时生效，按实验编号存进 localStorage（physlab.diy.NN；全站共用的存 physlab.diy.all）；参数区默认值改过以后，旧的保存自动作废。
   定制只改外观和情境，不改物理数值、不改题目答案。
   这段代码在 assets/lab/lab.js 和 07 手写页里各有一份，内容相同，改一处要同步另一处。 */
var LabDIY = (function () {
  // 配色跟着样子变，每种样子 6 种：[值, 名字, 主色, 页面底, 线色（坐标纸：顶栏线；沉浸舞台：舞台边缘；手绘本：横线）]，第一种是默认。
  // 18 种都测过：按钮白字、选中格子里的字、页面上的字、“正确”绿字、“警示”橙红字在底色上都看得清
  var PALS = {"grid":[["blue","亮蓝","#2563EB","#F4F7FB","#1E3A5F"],["navy","墨蓝","#1E3A5F","#F2F3F6","#1F2937"],["teal","青绿","#0F766E","#F0F7F5","#134E4A"],["orange","暖橙","#C2410C","#FBF5EF","#431407"],["purple","紫","#6D4ADE","#F6F4FC","#2E1F66"],["rose","玫红","#BE185D","#FBF3F6","#4A1030"]],"stage":[["purple","紫雾","#6D4ADE","#F4F2FB","#E2DCF6"],["blue","晴空","#2563EB","#F1F5FC","#D8E3F6"],["teal","薄荷","#0F766E","#EFF7F4","#D3EAE2"],["orange","蜜桃","#C2410C","#FBF4EE","#F3DDCC"],["navy","暮蓝","#1E3A5F","#F1F3F6","#D9DFE8"],["rose","樱粉","#BE185D","#FBF2F6","#F2D9E4"]],"hand":[["blue","蓝墨水","#2F5DA8","#FBF8F1","#E9E3D5"],["green","绿墨水","#2F6B3F","#FBF8F1","#E9E3D5"],["purple","紫墨水","#5B3FB5","#F8F6FC","#E4DFF1"],["brown","铅笔","#8A4B1F","#FBF8F1","#E9E3D5"],["cyan","青墨水","#0B6A87","#F3F8FB","#DAE7EE"],["ink","黑钢笔·方格纸","#1F2937","#FFFFFF","#E5E7EB"]]};
  var STYLES = [['grid', '坐标纸'], ['stage', '沉浸舞台'], ['hand', '手绘本']];
  var THEMES = []; STYLES.forEach(function (st) { PALS[st[0]].forEach(function (c) { if (THEMES.indexOf(c[0]) < 0) THEMES.push(c[0]); }); });
  var COMMON = [
    { id: 'style', label: '样子', options: STYLES.map(function (s) { return [s[0], s[1]]; }), def: 'grid' },
    { id: 'theme', label: '配色', options: THEMES.map(function (t) { return [t, t]; }), def: 'blue' },
    { id: 'fz', label: '字', options: [['std', '正常'], ['big', '大字']], def: 'std' },
    { id: 'tags', label: '器材名字', options: [['show', '显示'], ['hide', '不显示']], def: 'show' }
  ];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function has(it, v) { return it.options.some(function (o) { return o[0] === v; }); }
  function txt(it, v) { var o = it.options.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : String(v); }
  function load(no) { try { var o = JSON.parse(localStorage.getItem('physlab.diy.' + no) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function store(no, o) { try { localStorage.setItem('physlab.diy.' + no, JSON.stringify(o)); } catch (e) { } }
  function styleDef(s) { return PALS[s] ? PALS[s][0][0] : 'blue'; }
  function palOk(s, t) { return !!PALS[s] && PALS[s].some(function (c) { return c[0] === t; }); }
  function thumb(s, c) { return '<i class="dz-th-' + s + '" style="--pa:' + c[2] + ';--pg:' + c[3] + ';--px:' + c[4] + '"><b></b><u></u><s></s></i>'; }   // 样子、配色卡片上的小预览图

  /* o = { no, title, btn: 顶栏按钮, host: 浮层的父元素, items, onCommon(cur) } */
  function mount(o) {
    var items = o.items || [], saved = load(o.no), G = load('all'), cur = {}, ex = {}, foldOpen = false;
    // 应用范围：'all' 全部实验共用一份（存 physlab.diy.all）；'one' 只对本实验。没单独设过的实验跟随全站设置
    var scope = saved.scope === 'one' ? 'one' : 'all', src = scope === 'one' ? saved.c : G.c;
    COMMON.forEach(function (c) { var v = src && src[c.id]; cur[c.id] = has(c, v) ? v : c.id === 'theme' ? styleDef(cur.style) : c.def; });
    if (!palOk(cur.style, cur.theme)) cur.theme = styleDef(cur.style);   // 旧的或别的样子的配色 → 用这种样子的默认配色
    items.forEach(function (it) { var s = saved.e && saved.e[it.id]; ex[it.id] = s && s[1] === it.def && has(it, s[0]) ? s[0] : it.def; });   // s = [选的值, 当时参数区的默认值]

    function persist() {
      var e = {}; items.forEach(function (it) { if (ex[it.id] !== it.def) e[it.id] = [ex[it.id], it.def]; });
      if (scope === 'all') { store('all', { c: cur }); store(o.no, { scope: 'all', e: e }); }
      else store(o.no, { scope: 'one', c: cur, e: e });
    }
    function applyCommon() {
      var b = document.body;
      COMMON.forEach(function (c) { c.options.forEach(function (x) { b.classList.toggle('dz-' + c.id + '-' + x[0], cur[c.id] === x[0]); }); });
      if (o.onCommon) o.onCommon(cur);
    }
    function applyItem(it) { try { if (it.apply) it.apply(ex[it.id]); } catch (err) { if (window.console) console.warn('[定制]', it.id, err); } }

    function seg(k, opts, v) { return '<div class="dz-seg" data-k="' + k + '">' + opts.map(function (x) { return '<button data-v="' + esc(x[0]) + '"' + (x[0] === v ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>'; }
    function row(label, inner) { return '<div class="dz-row"><span class="dz-l">' + esc(label) + '</span><div class="dz-c">' + inner + '</div></div>'; }
    function item(it) {
      var v = ex[it.id];
      return row(it.label, it.type === 'sw' ? '<button class="dz-sw' + (v === it.options[0][0] ? ' on' : '') + '" data-k="e:' + it.id + '">' + esc(txt(it, v)) + '</button>' : seg('e:' + it.id, it.options, v));
    }
    var pop = document.createElement('div');
    pop.className = 'dz-pop'; pop.hidden = true;
    function render() {
      pop.innerHTML = '<div class="dz-hd"><b>定制</b><button class="dz-x" title="关闭">×</button></div>' +
        '<section>' + row('改哪里', seg('scope', [['one', '只改这个实验'], ['all', '所有实验']], scope)) + '</section>' +
        '<section><h3>样子</h3><div class="dz-sty" data-k="c:style">' + STYLES.map(function (s) {
          return '<button data-v="' + s[0] + '"' + (cur.style === s[0] ? ' class="on"' : '') + '>' + thumb(s[0], PALS[s[0]][0]) + s[1] + '</button>';
        }).join('') + '</div></section>' +
        '<section><h3>配色</h3><div class="dz-pal" data-k="c:theme">' + PALS[cur.style].map(function (c) {
          return '<button data-v="' + c[0] + '"' + (cur.theme === c[0] ? ' class="on"' : '') + '>' + thumb(cur.style, c) + '<span><em style="background:' + c[2] + '"></em>' + c[1] + '</span></button>';
        }).join('') + '</div></section>' +
        '<section>' + row('字', seg('c:fz', COMMON[2].options, cur.fz)) + row('器材名字', seg('c:tags', COMMON[3].options, cur.tags)) + '</section>' +
        (items.length ? '<section><button class="dz-fold" data-k="fold"><b>这个实验</b><span>' + (foldOpen ? '收起 ▴' : '展开 ▾') + '</span></button>' + (foldOpen ? items.map(item).join('') : '') + '</section>' : '') +
        '<div class="dz-ft"><button class="dz-reset">改回原样</button></div>';
    }
    function find(k) { var p = k.split(':'), list = p[0] === 'c' ? COMMON : items; return { it: list.filter(function (x) { return x.id === p[1]; })[0], c: p[0] === 'c', id: p[1] }; }
    function set(k, v) {
      var f = find(k); if (!f.it) return;
      if (f.c) { cur[f.id] = v; if (f.id === 'style') cur.theme = styleDef(v); applyCommon(); } else { ex[f.id] = v; applyItem(f.it); }
      persist(); render();
    }
    pop.addEventListener('click', function (ev) {
      var t = ev.target, b = t.closest ? t.closest('button') : null; if (!b || !pop.contains(b)) return;
      if (b.classList.contains('dz-x')) { show(false); return; }
      if (b.classList.contains('dz-reset')) {
        COMMON.forEach(function (c) { cur[c.id] = c.def; }); applyCommon();
        items.forEach(function (it) { ex[it.id] = it.def; applyItem(it); });
        persist(); render(); return;
      }
      if (b.getAttribute('data-k') === 'fold') { foldOpen = !foldOpen; render(); return; }
      if (b.classList.contains('dz-sw')) { var f = find(b.getAttribute('data-k')); set(b.getAttribute('data-k'), ex[f.id] === f.it.options[0][0] ? f.it.options[1][0] : f.it.options[0][0]); return; }
      var sg = b.parentNode, k = sg && sg.getAttribute('data-k');
      if (k === 'scope') { scope = b.getAttribute('data-v') === 'one' ? 'one' : 'all'; persist(); render(); return; }   // 切换范围时保留当前看到的效果
      if (k) set(k, b.getAttribute('data-v'));
    });
    function show(on) { pop.hidden = !on; if (o.btn) o.btn.classList.toggle('on', !!on); if (on) { render(); } }
    if (o.btn) o.btn.addEventListener('click', function () { show(pop.hidden); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !pop.hidden) show(false); });
    render();
    (o.host || document.body).appendChild(pop);
    applyCommon();
    items.forEach(applyItem);
    return { get: function (id) { return id in ex ? ex[id] : cur[id]; }, open: function () { show(true); }, close: function () { show(false); }, el: pop };
  }

  /* 生活情境卡：放在 3D 舞台右下角，可点 × 收起成一个小按钮。
     spec = { id, title, svg, text, status: { hit: true|false, text, aside: 右侧小字 } } 或 null（不显示） */
  function card(stage, spec) {
    var C = stage._dzCard || (stage._dzCard = { key: null, closed: {}, el: null });
    var key = spec ? JSON.stringify([spec.id, spec.title, spec.text, spec.status, C.closed[spec.id] ? 1 : 0]) : '';
    if (key === C.key) return; C.key = key;
    if (!spec) { if (C.el) { C.el.remove(); C.el = null; } return; }
    if (!C.el) {
      C.el = document.createElement('div'); stage.appendChild(C.el);
      C.el.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
        var id = C.el.getAttribute('data-id');
        C.closed[id] = b.classList.contains('dz-c-x'); C.key = null; card(stage, C.spec);
      });
      ['pointerdown', 'wheel'].forEach(function (n) { C.el.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
    }
    C.spec = spec; C.el.setAttribute('data-id', spec.id);
    if (C.closed[spec.id]) { C.el.className = 'dz-card min'; C.el.innerHTML = '<button class="dz-c-open" title="展开情境卡">生活情境：' + esc(spec.title) + ' ▸</button>'; return; }
    var st = spec.status;
    C.el.className = 'dz-card' + (st && st.hit ? ' hit' : '');
    C.el.innerHTML = '<div class="dz-c-hd"><span class="dz-c-tag">生活情境</span><b>' + esc(spec.title) + '</b><button class="dz-c-x" title="收起">×</button></div>' +
      '<div class="dz-c-fig">' + (spec.svg || '') + '</div><p class="dz-c-tx">' + esc(spec.text) + '</p>' +
      (st ? '<p class="dz-c-st"><span>' + (st.hit ? '<i>✓</i>' : '') + esc(st.text) + '</span>' + (st.aside ? '<b>' + esc(st.aside) + '</b>' : '') + '</p>' : '');
  }

  return { mount: mount, card: card, COMMON: COMMON };
})();

(function () {
  var LAB = window.LAB, no = document.body.getAttribute('data-no');
  // 同页的第二个实验（如 05 页的「光的折射」）：地址带 #refr 时，换成 file 为「本页#refr」的那个拓展实验
  (function () {
    var hm = /(?:^#|[#&])([a-z]+)(?:&|$)/.exec(location.hash || ''); if (!hm) return;
    var x = (LAB.extras || []).filter(function (e) { return e.file && e.file.indexOf(no + '-') === 0 && e.file.split('#')[1] === hm[1]; })[0];
    if (x) { no = x.no; document.body.setAttribute('data-no', no); }
  })();
  var E = LAB.exps.filter(function (x) { return x.no === no; })[0] || (LAB.extras || []).filter(function (x) { return x.no === no; })[0] || (window.LAB_EXTRA && window.LAB_EXTRA.no === no ? window.LAB_EXTRA : null);   // 附加页（如「光的折射」）自带数据
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  try { var k = 'physlab.recent', r = JSON.parse(localStorage.getItem(k) || '[]').filter(function (x) { return !(x.no === no && x.k === 'exp'); }); r.unshift({ no: no, k: 'exp', t: Date.now() }); localStorage.setItem(k, JSON.stringify(r.slice(0, 12))); } catch (err) { }

  /* 老师改过的题目（「改题目」）：localStorage physlab.qs.NN = { list: [{ o: 原来第几题（新加的为 null）, src: 用原来第几题的实验台, q, a, task, watch, keep }] }。
     教学设计页（site.js）读同一份，两边同步。 */
  function origQL() { return E.qs.map(function (q, i) { var g = (E.guide || [])[i] || {}; return { o: i, src: i, q: q.q, a: q.a, task: g.task || '', watch: g.watch || '', keep: g.keep || '' }; }); }
  function loadQL() { try { var o = JSON.parse(localStorage.getItem('physlab.qs.' + no) || 'null'); if (o && o.list && o.list.length) { var l = o.list.filter(function (x) { return x && E.qs[x.src] && typeof x.q === 'string'; }); if (l.length) return l; } } catch (e) { } return null; }
  function run(def) {
    document.title = E.title + ' · 物理实验工作台';
    var QK = 'physlab.qs.' + no, QL = loadQL() || origQL();
    var S = { mode: 'teach', pos: 0, q: QL[0].src, ans: false, taskOpen: false, tab: 'bench', revealed: false, calcShown: false };
    var rd = def.readings || [];
    document.body.innerHTML =
      '<div class="lk-vp"><div class="lk-cv" id="cv">' +
      '<header class="lk-hd"><a class="lk-cat" href="index.html">目录</a><span class="lk-badge">' + E.code + '</span>' +
      '<div class="lk-ttl"><h1>' + esc(E.title) + '</h1><p>人教版物理 ' + esc(E.bookName + ' ' + E.chapter.split(' ')[0] + ' ' + E.section) + (E.figs ? '｜' + esc(E.figs) : '') + '</p></div>' +
      '<div class="lk-rds" id="rds">' + rd.map(function (x, i) {
        return '<span class="lk-rdw" data-rw="' + x.id + '">' + (i ? '<span class="lk-sep"></span>' : '') + '<span class="lk-rd" data-r="' + x.id + '"><span class="nm">' + x.name + '</span><span class="vl q">?</span><span class="un">' + x.unit + '</span></span></span>';
      }).join('') + '</div>' +
      '<button class="lk-btn" id="fs">全屏演示</button><button class="lk-btn" id="tools" aria-haspopup="true">老师工具 <i>▾</i></button></header>' +
      '<div class="tk-m" id="tk-m" hidden><h4>课前准备</h4>' +
      '<button id="edq"><em>✎</em><span><b>改题目</b><small>改题目、答案和给学生的提示</small></span></button>' +
      '<button id="diy"><em>◐</em><span><b>定制</b><small>换样子、颜色、字的大小</small></span></button>' +
      '<a href="教学设计.html?no=' + no + '"><em>▤</em><span><b>教学设计</b><small>钩子·梯子·坑和课堂顺序</small></span></a>' +
      // 拓展实验（如 05 后面的「光的折射」）：在它所跟的必做实验页里给个入口，拓展页里给个回去的入口
      (LAB.extras || []).filter(function (x) { return x.after === no; }).map(function (x) { return '<a href="' + encodeURI(x.file) + '"><em>＋</em><span><b>拓展：' + esc(x.short) + '</b><small>课本里接着讲的探究，不在必做实验里</small></span></a>'; }).join('') +
      (E.after ? LAB.exps.filter(function (x) { return x.no === E.after; }).map(function (x) { return '<a href="' + encodeURI(x.file) + '"><em>←</em><span><b>回到：' + esc(x.short) + '</b><small>' + esc(x.title) + '</small></span></a>'; }).join('') : '') +
      '<button id="bak-btn" onclick="window.PhysBackup&&PhysBackup.open()"><em>⇅</em><span><b>备份我的修改</b><small>导出成文件，换电脑、换浏览器时导入</small></span></button>' +
      '<hr><h4>上课中</h4>' +
      '<button id="err-btn"><em>✗</em><span><b>记错题</b><small>学生答错了，记一句，复习时用</small></span></button>' +
      '<button id="reset"><em>↺</em><span><b>重置实验</b><small>回到第 1 题，已记的数据保留</small></span></button></div>' +
      '<div class="lk-main" id="main"><section class="lk-stage" id="stage"></section><section class="lk-dv" id="dv"></section>' +
      '<aside class="lk-rail"><div class="lk-tabs"><button class="on" data-t="bench">实验台</button><button data-t="data">数据</button></div>' +
      '<div class="lk-rb" id="rb-bench">' +
      '<section class="blk b-task"><div class="blk-hd"><h2>当前任务</h2><button class="mini" id="task-tg">展开</button></div><div id="task-body" hidden></div></section>' +
      '<section class="blk b-ctrl"><div class="blk-hd"><h2>' + (def.ctrlTitle || '器材调节') + '</h2><span class="tag" id="ctrl-tag"></span></div><div id="ctrl"></div></section>' +
      '<section class="blk b-state"><div class="blk-hd"><h2>' + (def.stateTitle || '检查与读数') + '</h2></div><div class="cklist" id="cklist"></div><p class="status" id="status"></p><div id="check"></div></section>' +
      '<section class="blk b-rec"><div class="blk-hd"><h2>记录</h2><span class="tag num" id="rec-cnt"></span></div><button class="stamp" id="record">记录这组数据</button><p class="tip" id="rec-tip"></p></section>' +
      '</div>' +
      '<div class="lk-rb" id="rb-data" hidden><section class="blk"><div class="blk-hd"><h2>数据</h2></div><p class="tip" id="dv-tip"></p>' +
      (def.calc ? '<button class="act" id="calc" style="margin-top:10px">显示计算</button>' : '') +
      '<button class="act ghost" id="clear" style="margin-top:10px">清空记录</button></section></div></aside></div>' +
      '<footer class="lk-ft"><div class="ft-row"><span class="ft-tag">边做边问</span><span class="ft-no" id="qno"></span><span class="ft-q" id="qtext"></span>' +
      '<button class="lk-btn zq" id="zoom-q" title="用蒙版盖住实验台，把题目放大显示">放大题目</button><button class="lk-btn" id="restore" title="把器材摆回本问的起始状态">仪器复原</button><button class="lk-btn" id="ans-btn">答案</button>' +
      '<button class="lk-btn" id="prev">‹ 上一问</button><button class="lk-btn" id="next">下一问 ›</button></div>' +
      '<div class="ft-ans" id="ans" hidden><b>答案</b><span id="ans-text"></span></div><div class="eq" id="eq"></div></footer></div></div>';

    var cv = $('#cv'), stage = $('#stage');
    function fit() {
      var s = Math.min(innerWidth / 1920, innerHeight / 1080);
      cv.style.transform = 'scale(' + s + ')';
      cv.style.left = Math.max(0, (innerWidth - 1920 * s) / 2) + 'px';
      cv.style.top = Math.max(0, (innerHeight - 1080 * s) / 2) + 'px';
      K.scale = s;
      if (K._resize) K._resize();
    }

    var K = {
      e: E, S: S, stage: stage, ctrl: $('#ctrl'), fmt: fmt, esc: esc, scale: 1, data: {},
      setReading: function (id, v) {
        var el = $('[data-r="' + id + '"] .vl');
        if (!el) return;
        el.textContent = v == null ? '?' : v;
        el.classList.toggle('q', v == null);
        var un = el.parentNode.querySelector('.un');   // 读数是“未调零”这类文字时，后面不挂单位
        if (un) un.style.visibility = typeof v === 'string' && /[^\d.\-−+\s]/.test(v) ? 'hidden' : '';
      },
      showReading: function (id, on) { var w = $('[data-rw="' + id + '"]'); if (w) w.style.display = on ? '' : 'none'; },
      ctrlTag: function (t) { $('#ctrl-tag').innerHTML = t || ''; },
      /* 检查与读数：checks=[{label, ok:true|false|null}]（null=等待中）；hint 一句话；ready 时可点读数；result 为读数后显示的结果 */
      state: function (spec) {
        var key = JSON.stringify(spec);
        if (key === K._stateKey) return; K._stateKey = key;
        $('#cklist').innerHTML = (spec.checks || []).map(function (c) {
          return '<span class="ck ' + (c.ok === true ? 'ok' : c.ok === false ? 'no' : 'wait') + '"><i>' + (c.ok === true ? '✓' : c.ok === false ? '✗' : '…') + '</i>' + c.label + '</span>';
        }).join('');
        var p = $('#status'); p.textContent = spec.hint || ''; p.className = 'status' + (spec.tone ? ' ' + spec.tone : '');
        K._check = spec.read ? spec : null;
        // 读数自动显示：操作到位（ready）就直接显示结果，老师只需点「记录这组数据」
        var want = !!(spec.read && spec.ready);
        if (want !== S.revealed) { S.revealed = want; if (def.onReveal) def.onReveal(want); }
        renderCheck();
      },
      invalidate: function () { if (S.revealed) { S.revealed = false; K._stateKey = ''; renderCheck(); if (def.onReveal) def.onReveal(false); } },
      revealed: function () { return S.revealed; },
      setRecord: function (ok, tip, tone) { $('#record').disabled = !ok; var t = $('#rec-tip'); t.textContent = tip || ''; t.className = 'tip' + (tone ? ' ' + tone : ''); syncRecNote(); },
      setCount: function (t) { $('#rec-cnt').textContent = t; },
      refreshData: function () { $('#dv').innerHTML = def.renderData ? def.renderData(K) : ''; },
      warn: function (t) {
        var w = $('.lk-warn', stage);
        if (!t) { if (w) w.remove(); return; }
        if (!w) { w = document.createElement('div'); w.className = 'lk-warn'; stage.appendChild(w); }
        w.textContent = t;
      },
      /* 器材调节面板的拼装小工具（见 lab.css「器材调节面板规范」）
         K.grp('视线', K.seg('vw', [['left','偏左看'],['mid','正对']]))  → 一行：左标签 + 几选一
         K.acts([['go','▶','释放小车','main'], ['rs','↺','复位']])            → 动作按钮（id、图标、文字、可选 class）
         K.sw('sw', '开关', '闭合', '断开', on)                               → 拨动开关 */
      grp: function (label, inner) { return '<div class="grp"><span class="gl">' + label + '</span><div class="gc">' + inner + '</div></div>'; },
      seg: function (attr, items) { return '<div class="seg">' + items.map(function (x) { return '<button data-' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; },
      acts: function (items) { return '<div class="acts">' + items.map(function (x) { return '<button id="' + x[0] + '"' + (x[3] ? ' class="' + x[3] + '"' : '') + '>' + (x[1] ? '<i>' + x[1] + '</i>' : '') + x[2] + '</button>'; }).join('') + '</div>'; },
      sw: function (id, name, onTxt, offTxt, on) { return '<button class="sw' + (on ? ' on' : '') + '" id="' + id + '" data-on="' + onTxt + '" data-off="' + offTxt + '">' + name + '：' + (on ? onTxt : offTxt) + '</button>'; },
      setSw: function (el, on) { if (typeof el === 'string') el = document.getElementById(el); if (!el) return; el.classList.toggle('on', !!on); el.textContent = el.textContent.split('：')[0] + '：' + (on ? el.getAttribute('data-on') : el.getAttribute('data-off')); },
      /* 同一页里的两个实验切换（如 05：光的反射 ｜ 光的折射）：items = [[hash, 名称], …]，cur 为当前 hash。
         切换 = 改地址里的 #… 再重新载入本页（单文件版也一样） */
      modeSwitch: function (items, cur) {
        var d = document.createElement('div'); d.className = 'md-sw';
        d.innerHTML = items.map(function (x) { return '<button data-md="' + x[0] + '"' + (x[0] === cur ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('');
        ['pointerdown', 'wheel'].forEach(function (n) { d.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
        d.addEventListener('click', function (ev) {
          var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
          var m = b.getAttribute('data-md'); if (m === cur) return;
          location.hash = m ? m : 'q=1'; location.reload();
        });
        stage.appendChild(d); document.body.classList.add('has-md');
        return d;
      },
      el: function (html) { var d = document.createElement('div'); d.innerHTML = html; var n = d.firstChild; stage.appendChild(n); return n; },
      calcShown: function () { return S.calcShown; },
      rng: function (input) { var f = function () { var p = (input.value - input.min) / (input.max - input.min) * 100; input.style.setProperty('--p', p + '%'); }; input.addEventListener('input', f); f(); return f; }
    };

    // 读数显示出来但还没记：结果框下加一句提醒，记录按钮闪一下（老师常以为“显示读数”就是记下了）
    function syncRecNote() {
      var r = $('#check .result'), rec = $('#record'), can = rec && !rec.disabled;
      if (rec) rec.classList.toggle('ready', !!(r && can));
      if (!r) return;
      var n = r.querySelector('.nrec');
      if (can && !n) r.insertAdjacentHTML('beforeend', '<small class="nrec">读数还没记下，点下面「记录这组数据」</small>');
      else if (!can && n) n.remove();
    }
    function renderCheck() {
      var c = K._check, box = $('#check');
      if (!c) { box.innerHTML = ''; return; }
      var lab = c.btn ? c.btn[0] : '显示读数';   // c.btn = ['显示观察结果'] 等
      box.innerHTML = S.revealed ? '<div class="result' + (c.tone === 'warn' || c.bad ? ' warn' : '') + '">' + (c.result || '') + '</div>' : '';   // 不规范状态下读到的数用警示色
      syncRecNote();
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tx(s) { return def.qText ? def.qText(String(s == null ? '' : s)) : s; }   // 情境措辞（只换名称，不改内容）
    function renderTask() {
      var g = QL[S.pos], body = $('#task-body');
      body.hidden = !S.taskOpen;
      $('#task-tg').textContent = S.taskOpen ? '收起' : '展开';
      body.innerHTML = g ? '<p class="ln t"><b>' + pad(S.pos + 1) + '</b>' + esc(tx(g.task)) + '</p><p class="ln"><span class="k">保持</span>' + esc(tx(String(g.keep || '').replace(/^保持\s*/, ''))) + '</p><p class="ln"><span class="k">观察</span>' + esc(tx(g.watch)) + '</p>' : '';
    }
    function renderQ() {
      var q = QL[S.pos];
      $('#qno').textContent = pad(S.pos + 1) + ' / ' + pad(QL.length);
      $('#qtext').textContent = q.q ? tx(q.q) : '（这道题还没写题目，点「改题目」补上）';
      $('#ans-text').textContent = tx(q.a);
      $('#ans').hidden = !S.ans;
      $('#ans-btn').textContent = S.ans ? '收起答案' : '答案';
      $('#prev').disabled = S.pos === 0; $('#next').disabled = S.pos === QL.length - 1;
      renderTask();
      renderZoom();
      // 题目长时底栏会折成两行：记下底栏高度（沉浸舞台按它给浮动底栏让位），3D 画布跟着重设
      var ft = $('.lk-ft'); if (ft) cv.style.setProperty('--ftH', ft.offsetHeight + 'px');
      if (K._resize) setTimeout(K._resize, 0);
    }
    /* ── 放大题目：蒙版盖住实验台，题目、答案大字显示；可翻题 ── */
    var ZQ = { on: false };
    function renderZoom() {
      var z = $('#qz'); if (!z) return;
      z.hidden = !ZQ.on; $('#zoom-q').classList.toggle('on', ZQ.on);
      if (!ZQ.on) return;
      var q = QL[S.pos], qt = q.q ? tx(q.q) : '（这道题还没写题目）';
      z.innerHTML = '<div class="qz-in"><div class="qz-tg">边做边问<b>' + pad(S.pos + 1) + ' / ' + pad(QL.length) + '</b></div>' +
        '<div class="qz-q' + (qt.length > 60 ? ' long' : '') + '">' + esc(qt) + '</div>' +
        (S.ans ? '<div class="qz-a"><b>答案</b>' + esc(tx(q.a)) + '</div>' : '') + '</div>' +
        '<div class="qz-bt"><button data-z="prev"' + (S.pos === 0 ? ' disabled' : '') + '>‹ 上一问</button><button data-z="next"' + (S.pos === QL.length - 1 ? ' disabled' : '') + '>下一问 ›</button>' +
        '<span class="sp"></span><button class="pm" data-z="ans">' + (S.ans ? '收起答案' : '显示答案') + '</button><button data-z="close">× 回到实验台</button></div>';
    }
    function zoomSetup() {
      var z = document.createElement('div'); z.className = 'qz'; z.id = 'qz'; z.hidden = true; stage.appendChild(z);
      ['pointerdown', 'wheel'].forEach(function (n) { z.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
      z.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('button') : null; if (!b || b.disabled) return;
        var a = b.getAttribute('data-z');
        if (a === 'prev' && S.pos > 0) go(S.pos - 1);
        else if (a === 'next' && S.pos < QL.length - 1) go(S.pos + 1);
        else if (a === 'ans') { S.ans = !S.ans; renderQ(); }
        else if (a === 'close') { ZQ.on = false; renderZoom(); }
      });
      $('#zoom-q').onclick = function () { ZQ.on = !ZQ.on; renderZoom(); };
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && ZQ.on) { ZQ.on = false; renderZoom(); } });
    }
    function setMode(m) {
      S.mode = m;
      renderTask(); K._stateKey = ''; renderCheck();
      var c = $('#calc'); if (c) c.textContent = S.calcShown ? '收起计算' : def.calc.teach;
      if (def.onMode) def.onMode(m);
    }
    function setTab(t) {
      S.tab = t;
      document.querySelectorAll('.lk-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
      $('#main').classList.toggle('data', t === 'data');
      $('#rb-bench').hidden = t !== 'bench'; $('#rb-data').hidden = t !== 'data';
      if (t === 'data') K.refreshData();
      else if (K._resize) K._resize();
    }

    document.querySelectorAll('.lk-tabs button').forEach(function (b) { b.onclick = function () { setTab(b.getAttribute('data-t')); }; });
    $('#task-tg').onclick = function () { S.taskOpen = !S.taskOpen; renderTask(); };
    $('#ans-btn').onclick = function () { S.ans = !S.ans; renderQ(); if (K._resize) K._resize(); };   // 答案展开后舞台变矮，3D 画布要跟着重设尺寸，否则画面被压扁
    // 换问题时自动摆好本问的起始器材（记录保留），老师不用再点「仪器复原」
    function go(i) { S.pos = Math.max(0, Math.min(QL.length - 1, i)); S.q = QL[S.pos].src; S.ans = false; renderQ(); if (def.preset) def.preset(S.q); }
    $('#prev').onclick = function () { if (S.pos > 0) go(S.pos - 1); };
    $('#next').onclick = function () { if (S.pos < QL.length - 1) go(S.pos + 1); };
    $('#restore').onclick = function () { if (def.preset) def.preset(S.q); };
    /* 重置实验：回到第 1 问的起始器材和默认视角，读数未揭晓、答案收起；记录与使用模式保留 */
    $('#reset').onclick = function () { S.pos = 0; S.q = QL[0].src; S.ans = false; renderQ(); K.invalidate(); if (K._view) K._view.home(); if (def.reset) def.reset(); };
    $('#fs').onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
    document.addEventListener('fullscreenchange', function () { $('#fs').textContent = document.fullscreenElement ? '退出全屏' : '全屏演示'; });
    $('#record').onclick = function () { if (def.record) { def.record(); K.refreshData(); } };
    $('#clear').onclick = function () { if (def.clear) { def.clear(); S.calcShown = false; setMode(S.mode); K.refreshData(); } };
    var cb = $('#calc');
    if (cb) cb.onclick = function () { S.calcShown = !S.calcShown; setMode(S.mode); K.refreshData(); };
    addEventListener('resize', fit);

    /* ── 「改题目」：底栏变成编辑区，只改文字；实验台照常能操作 ── */
    function editor() {
      var eq = $('#eq'), btn = $('#edq'), ED = { on: false, sure: 0 }, LIM = { q: 40, a: 120, task: 40, watch: 30 }, O = origQL();
      function modified(x) { if (x.o == null) return true; var y = O[x.o]; return x.src !== y.src || x.q !== y.q || x.a !== y.a || x.task !== y.task || x.watch !== y.watch; }
      function changes() {
        var n = 0, seen = {};
        QL.forEach(function (x, i) { if (modified(x)) n++; if (x.o != null) { seen[x.o] = 1; if (x.o !== i && !modified(x)) n += 0; } });
        O.forEach(function (y) { if (!seen[y.o]) n++; });
        var order = QL.filter(function (x) { return x.o != null; }).map(function (x) { return x.o; });
        for (var i = 1; i < order.length; i++) if (order[i] < order[i - 1]) { n++; break; }
        return n;
      }
      function save() { try { if (changes()) localStorage.setItem(QK, JSON.stringify({ list: QL })); else localStorage.removeItem(QK); } catch (e) { } }
      function lim(k) { var x = QL[S.pos], y = O[x.o != null ? x.o : x.src]; return Math.max(LIM[k], (y[k] || '').length); }
      function left(k) { var n = lim(k) - (QL[S.pos][k] || '').length; return n > 0 ? '还能写 ' + n + ' 个字' : '写满了'; }
      function short(t) { return t.length > 16 ? t.slice(0, 16) + '…' : t; }
      function fld(k, label, kind) {
        var v = QL[S.pos][k] || '';
        return '<div class="eq-f"><label>' + label + '<i data-c="' + k + '"' + (lim(k) - v.length <= 0 ? ' class="full"' : '') + '>' + left(k) + '</i></label>' +
          (kind === 'ta' ? '<textarea data-f="' + k + '" maxlength="' + lim(k) + '">' + esc(v) + '</textarea>' : '<input' + (kind === 'sm' ? ' class="sm"' : '') + ' data-f="' + k + '" maxlength="' + lim(k) + '" value="' + esc(v) + '">') + '</div>';
      }
      function bar() {
        var n = changes();
        return '<span class="sp">' + (n ? '这个实验改了 ' + n + ' 处' : '还没有改动') + '</span><button data-a="resetall"' + (ED.sure ? ' class="sure"' : '') + (n ? '' : ' disabled') + '>' + (ED.sure ? '再点一次，全部改回' : '全部改回原样') + '</button><button class="p" data-a="done">改好了</button>';
      }
      function render() {
        var x = QL[S.pos];
        eq.innerHTML = '<div class="eq-bar"><b>✎ 正在改题目</b><span>只改文字，实验台不受影响。改的内容会自动保存。</span>' + bar() + '</div>' +
          '<div class="eq-tabs">' + QL.map(function (y, i) { return '<button class="t' + (i === S.pos ? ' on' : '') + (modified(y) ? ' m' : '') + '" data-a="go" data-i="' + i + '">第' + (i + 1) + '题</button>'; }).join('') +
          (QL.length < 10 ? '<button class="add" data-a="add">＋ 加一道题</button>' : '') +
          '<div class="eq-ops"><button data-a="up"' + (S.pos ? '' : ' disabled') + '>← 往前挪</button><button data-a="down"' + (S.pos < QL.length - 1 ? '' : ' disabled') + '>往后挪 →</button>' +
          '<button data-a="del"' + (QL.length > 1 ? '' : ' disabled') + '>删掉这道题</button><button data-a="undo"' + (x.o != null && modified(x) ? '' : ' disabled') + '>↺ 这道题改回原样</button></div></div>' +
          '<div class="eq-g"><div>' + fld('q', '题目') + fld('a', '答案（上课点「答案」才出来）', 'ta') + '</div><div>' +
          '<div class="eq-f"><label>这道题开始时，实验台摆成</label><select data-f="src">' + E.qs.map(function (q, i) { return '<option value="' + i + '"' + (i === x.src ? ' selected' : '') + '>和原来第 ' + (i + 1) + ' 题一样：' + esc(short(q.q)) + '</option>'; }).join('') + '</select></div>' +
          fld('task', '提示学生：怎么做', 'sm') + fld('watch', '提示学生：看什么', 'sm') + '</div></div>';
      }
      function refreshBar() { var b = eq.querySelector('.eq-bar'); if (!b) return; [].slice.call(b.querySelectorAll('.sp, button')).forEach(function (n) { n.remove(); }); b.insertAdjacentHTML('beforeend', bar()); var t = eq.querySelector('.eq-tabs .t.on'); if (t) t.classList.toggle('m', modified(QL[S.pos])); var u = eq.querySelector('[data-a="undo"]'); if (u) u.disabled = !(QL[S.pos].o != null && modified(QL[S.pos])); }
      function toGo(i) { go(i); render(); }
      function toggle(on) {
        ED.on = on; ED.sure = 0; btn.classList.toggle('on', on); $('#tools').classList.toggle('busy', on);
        document.body.classList.toggle('lk-editing', on);
        if (on) render(); else { QL = QL.filter(function (x) { return x.o != null || x.q.trim(); }); if (!QL.length) QL = origQL(); save(); if (S.pos >= QL.length) S.pos = QL.length - 1; S.q = QL[S.pos].src; renderQ(); }
        if (K._resize) setTimeout(K._resize, 0);
      }
      btn.onclick = function () { toggle(!ED.on); };
      eq.addEventListener('input', function (ev) {
        var f = ev.target.getAttribute('data-f'); if (!f || f === 'src') return;
        QL[S.pos][f] = ev.target.value; save(); renderQ();
        var c = eq.querySelector('[data-c="' + f + '"]'); if (c) { c.textContent = left(f); c.classList.toggle('full', lim(f) - ev.target.value.length <= 0); }
        refreshBar();
      });
      eq.addEventListener('change', function (ev) {
        if (ev.target.getAttribute('data-f') !== 'src') return;
        var x = QL[S.pos]; x.src = +ev.target.value; if (x.o == null) x.keep = O[x.src].keep; save(); go(S.pos); render();
      });
      eq.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('button') : null; if (!b || b.disabled) return;
        var a = b.getAttribute('data-a'), x = QL[S.pos];
        if (a !== 'resetall') ED.sure = 0;
        if (a === 'go') toGo(+b.getAttribute('data-i'));
        else if (a === 'add') { QL.splice(S.pos + 1, 0, { o: null, src: x.src, q: '', a: '', task: '', watch: '', keep: O[x.src].keep }); save(); toGo(S.pos + 1); var i = eq.querySelector('[data-f="q"]'); if (i) i.focus(); }
        else if (a === 'up' || a === 'down') { var j = S.pos + (a === 'up' ? -1 : 1); QL.splice(j, 0, QL.splice(S.pos, 1)[0]); S.pos = j; save(); renderQ(); render(); }
        else if (a === 'del') { QL.splice(S.pos, 1); save(); toGo(Math.min(S.pos, QL.length - 1)); }
        else if (a === 'undo') { var y = O[x.o]; QL[S.pos] = { o: y.o, src: y.src, q: y.q, a: y.a, task: y.task, watch: y.watch, keep: y.keep }; save(); toGo(S.pos); }
        else if (a === 'resetall') {
          if (!ED.sure) { ED.sure = 1; refreshBar(); setTimeout(function () { if (ED.sure) { ED.sure = 0; refreshBar(); } }, 3000); return; }
          ED.sure = 0; QL = origQL(); save(); toGo(0);
        }
        else if (a === 'done') toggle(false);
      });
    }

    function toolsMenu() {
      var b = $('#tools'), m = $('#tk-m');
      function show(on) { m.hidden = !on; b.classList.toggle('on', on); }
      b.addEventListener('click', function (ev) { ev.stopPropagation(); show(m.hidden); });
      m.addEventListener('click', function () { show(false); });
      document.addEventListener('click', function (ev) { if (!m.hidden && !m.contains(ev.target) && ev.target !== b) show(false); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') show(false); });
    }
    /* ── 「记错题」：上课时学生答错了，记一句，存进错题集（localStorage physlab.err，首页「错题集 → 我记的」里看） ── */
    function errNote() {
      var btn = $('#err-btn'), pop = document.createElement('div');
      pop.className = 'err-pop'; pop.hidden = true; cv.appendChild(pop);
      function show(on) {
        pop.hidden = !on; btn.classList.toggle('on', on);
        if (!on) return;
        var q = QL[S.pos];
        pop.innerHTML = '<div class="ep-hd"><b>记错题</b><span>第 ' + (S.pos + 1) + ' 题：' + esc(tx(q.q)) + '</span><button class="ep-x" title="关闭">×</button></div>' +
          '<label>学生是怎么说的、错在哪</label><textarea id="ep-said" maxlength="200" placeholder="例如：有学生说“浸得越深浮力越大”"></textarea>' +
          '<label>哪个班（可以不填）</label><input id="ep-cls" maxlength="20" placeholder="例如：八（3）班">' +
          '<div class="ep-ft"><span class="ep-msg"></span><button class="ep-ok">记下来</button></div>';
        try { var last = localStorage.getItem('physlab.err.cls'); if (last) $('#ep-cls', pop).value = last; } catch (e) { }
        setTimeout(function () { var t = $('#ep-said', pop); if (t) t.focus(); }, 30);
      }
      btn.onclick = function () { show(pop.hidden); };
      pop.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
        if (b.classList.contains('ep-x')) { show(false); return; }
        if (b.classList.contains('ep-ok')) {
          var said = $('#ep-said', pop).value.trim(), cls = $('#ep-cls', pop).value.trim();
          if (!said) { $('.ep-msg', pop).textContent = '先写一句学生是怎么说的'; return; }
          var q = QL[S.pos], list = [];
          try { list = JSON.parse(localStorage.getItem('physlab.err') || '[]'); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
          list.unshift({ id: Date.now().toString(36), no: no, src: q.src, q: q.q, said: said, cls: cls, t: Date.now() });
          try { localStorage.setItem('physlab.err', JSON.stringify(list.slice(0, 500))); if (cls) localStorage.setItem('physlab.err.cls', cls); } catch (e) { }
          pop.innerHTML = '<div class="ep-done">✓ 已记进错题集<small>在首页「错题集 → 我记的」里能看到</small></div>';
          setTimeout(function () { show(false); }, 1600);
        }
      });
      ['pointerdown', 'wheel', 'keydown'].forEach(function (n) { pop.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
    }

    K.three = function (opt) { return makeThree(K, opt || {}); };
    K.card = function (spec) { LabDIY.card(stage, spec); };
    K.refreshQ = function () { renderQ(); };
    window.K = K;
    def.init(K);
    renderQ(); setMode('teach'); fit();
    // 从「错题集」点「到实验台演示」进来：地址带 #q=原来第几题，直接翻到那一题并摆好器材
    var mq = /[#&]q=(\d+)/.exec(location.hash || '');
    if (mq) { var want = +mq[1] - 1, at = -1; QL.forEach(function (x, i) { if (at < 0 && x.src === want && x.o === want) at = i; }); if (at < 0) QL.forEach(function (x, i) { if (at < 0 && x.src === want) at = i; }); if (at > 0) { S.pos = at; S.q = QL[at].src; renderQ(); } }
    if (def.preset) def.preset(S.q);
    editor();
    errNote();
    toolsMenu();
    zoomSetup();
    /* 顶栏「定制」：通用外观 + 本实验 def.diy；字号变了底栏会变高，3D 画布重设尺寸 */
    K.diy = LabDIY.mount({ no: no, title: E.title, where: '网站/assets/lab/exp' + no + '.js', btn: $('#diy'), host: cv, items: def.diy || [],
      onCommon: function () { if (K._resize) K._resize(); if (K._view && K._view.render) K._view.render(); } });
    /* 生活情境 3D 场景（scenes.js + scene-xxx.js，见 scenes.js 开头说明）：舞台左上角切换 */
    if (window.LabScene) K.scenes = LabScene.mount({ stage: stage, rail: $('.lk-rail'), no: no });
  }

  /* ── Three.js 小工具：渲染器、轨道视角、拾取、拖动平面、3D→屏幕坐标 ── */
  function makeThree(K, opt) {
    var T = window.THREE, stage = K.stage;
    var canvas = document.createElement('canvas'); canvas.className = 'lk-gl'; stage.insertBefore(canvas, stage.firstChild);
    var tags = document.createElement('div'); tags.className = 'lk-tags'; stage.appendChild(tags);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace || renderer.outputColorSpace;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(opt.fov || 32, 1, 0.1, 5000);
    var target = new T.Vector3().fromArray(opt.target || [0, 0, 0]);
    var orb = { az: opt.az || 0, el: opt.el || 0.35, dist: opt.dist || 100, minEl: opt.minEl != null ? opt.minEl : 0.05, maxEl: opt.maxEl || 1.2, minAz: opt.minAz != null ? opt.minAz : -1.2, maxAz: opt.maxAz != null ? opt.maxAz : 1.2 };
    scene.add(new T.HemisphereLight(0xffffff, 0xd8e0ea, 1.15));
    var sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(opt.sun ? opt.sun[0] : -40, opt.sun ? opt.sun[1] : 120, opt.sun ? opt.sun[2] : 80);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150; sc.near = 1; sc.far = 600; sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
    scene.add(sun);
    var ground = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.ShadowMaterial({ opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = opt.groundY || 0; ground.receiveShadow = true; scene.add(ground);
    function place() {
      camera.position.set(target.x + orb.dist * Math.cos(orb.el) * Math.sin(orb.az), target.y + orb.dist * Math.sin(orb.el), target.z + orb.dist * Math.cos(orb.el) * Math.cos(orb.az));
      camera.lookAt(target); camera.updateMatrixWorld();   // 立即更新，拾取不必等下一帧绘制
    }
    var W = 1, H = 1;
    K._resize = function () {
      W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return; renderer.setSize(W, H, false);
      // 样子二（沉浸舞台）：画布铺满，但右边 496px 是浮动面板、上面 92px 是顶栏。把“看得见的那块”当作画面来取景，大小和原来的实验台一致
      if (document.body.classList.contains('dz-style-stage') && W > 1200) { var rw = W - 496, rh = H - 92; camera.aspect = rw / rh; camera.setViewOffset(rw, rh, 0, -92, W, H); }
      else { camera.aspect = W / H; camera.clearViewOffset(); }
      camera.updateProjectionMatrix();
    };
    K._resize();
    function local(ev) { var r = stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / K.scale, y: (ev.clientY - r.top) / K.scale }; }
    var ray = new T.Raycaster();
    function setRay(ev) { var p = local(ev); ray.setFromCamera(new T.Vector2(p.x / W * 2 - 1, -(p.y / H) * 2 + 1), camera); return ray; }
    /* 绘制主画面；api.post 可在之后补画（如观察窗里的第二个视角） */
    function draw() { renderer.render(scene, camera); if (api.post) api.post(renderer); }
    var api = {
      T: T, scene: scene, camera: camera, renderer: renderer, target: target, orb: orb, tags: tags,
      pick: function (ev, objs) { setRay(ev); var h = ray.intersectObjects(objs, true); return h.length ? h[0] : null; },
      onPlane: function (ev, plane) { setRay(ev); var p = new T.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; },
      toScreen: function (v) { var p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z }; },
      tag: function (id, html) { var t = tags.querySelector('[data-tag="' + id + '"]'); if (!t) { t = document.createElement('div'); t.className = 'lk-tag'; t.setAttribute('data-tag', id); tags.appendChild(t); } if (html != null) t.innerHTML = html; return t; },
      placeTag: function (id, v) { var t = api.tag(id); var s = api.toScreen(v); t.style.left = s.x + 'px'; t.style.top = s.y + 'px'; t.style.display = s.z < 1 ? '' : 'none'; },
      frame: null, drag: null, view: place
    };
    var home = { az: orb.az, el: orb.el, dist: orb.dist, t: target.clone() };
    api.home = function () { orb.az = home.az; orb.el = home.el; orb.dist = home.dist; target.copy(home.t); place(); };
    K._view = api;
    /* 指针：先问实验拾取（api.drag.start 返回 true 则拖器材），否则转视角 */
    var mode = null, last = null;
    canvas.addEventListener('pointerdown', function (ev) {
      if (api.drag && api.drag.start && api.drag.start(ev)) { mode = 'obj'; }
      else { mode = 'orbit'; last = { x: ev.clientX, y: ev.clientY }; }
      canvas.setPointerCapture(ev.pointerId); ev.preventDefault();
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (mode === 'obj') { api.drag.move(ev); if (api.frame) api.frame(0); draw(); }
      else if (mode === 'orbit') {
        orb.az = Math.max(orb.minAz, Math.min(orb.maxAz, orb.az - (ev.clientX - last.x) * 0.005 / K.scale));
        orb.el = Math.max(orb.minEl, Math.min(orb.maxEl, orb.el + (ev.clientY - last.y) * 0.004 / K.scale));
        last = { x: ev.clientX, y: ev.clientY }; place(); draw();
      } else if (api.drag && api.drag.hit) { canvas.style.cursor = api.drag.hit(ev) ? 'grab' : ''; }
    });
    canvas.addEventListener('pointerup', function () { if (mode === 'obj' && api.drag.end) { api.drag.end(); if (api.frame) api.frame(0); } mode = null; canvas.style.cursor = ''; });
    canvas.addEventListener('pointerleave', function () { if (!mode) canvas.style.cursor = ''; });
    canvas.addEventListener('wheel', function (ev) { ev.preventDefault(); orb.dist = Math.max(opt.minDist || orb.dist * 0.6, Math.min(opt.maxDist || orb.dist * 1.5, orb.dist * (1 + ev.deltaY * 0.0008))); place(); }, { passive: false });
    place();
    /* 模拟与状态更新用定时器（标签页在后台、或浏览器暂停动画帧时也照常推进）；画面用动画帧绘制 */
    var t0 = performance.now(), dirty = true;
    setInterval(function () {
      var t = performance.now(), dt = Math.min(0.1, (t - t0) / 1000); t0 = t;
      if (api.frame) api.frame(dt);
      scene.updateMatrixWorld();   // 器材位置立即生效，点选不必等下一帧绘制
      dirty = true;
    }, 33);
    (function loop() {
      if (dirty) { draw(); dirty = false; }
      requestAnimationFrame(loop);
    })();
    api.render = draw;
    return api;
  }

  window.LabKit = { run: run, fmt: fmt };
})();
