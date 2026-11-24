/* 初中物理实验工作台 · 首页 / 实验预览页 / 教学设计页 共用脚本（离线可用，不依赖网络） */
(function () {
  var LAB = window.LAB, ICON = window.LAB_ICON || function () { return ''; };
  var EX = LAB.exps, BY = {};
  EX.forEach(function (e) { BY[e.no] = e; });
  /* 附加实验（课本里有、不在 22 个必做实验里，如「光的折射」）：LAB.extras，不计入必做实验的数量 */
  var XT = LAB.extras || []; XT.forEach(function (e) { e.extra = true; BY[e.no] = e; });
  function shownNo(e) { return e.extra ? '拓展' : e.no; }   // 拓展实验（如光的折射）没有课标编号，对老师显示「拓展」
  var DOM = {}; LAB.domains.forEach(function (d) { DOM[d.id] = d; });
  var BOOK = {}; LAB.books.forEach(function (b) { BOOK[b.id] = b; });
  var app = document.getElementById('app');
  var page = document.body.getAttribute('data-page');
  /* 单文件版（物理实验工作台.html）会提供 __ASSETS（内嵌图片）、__Q（页面参数）、__nav（页面跳转）；普通网站里这三者都不存在，照常用文件路径 */
  function AS(p) { return (window.__ASSETS && window.__ASSETS[p]) || p; }
  function goPage(h) { if (window.__nav) window.__nav(h); else location.href = h; }

  /* ── 浏览器本地存储（失败时退回内存，页面照常可用） ── */
  var mem = {};
  function load(k, d) { try { var v = localStorage.getItem('physlab.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } }
  function save(k, v) { mem[k] = v; try { localStorage.setItem('physlab.' + k, JSON.stringify(v)); } catch (e) { } }

  var fav = load('fav', []);
  function isFav(no) { return fav.indexOf(no) >= 0; }
  function pushRecent(no, k) {
    var r = load('recent', []).filter(function (x) { return !(x.no === no && x.k === k); });
    r.unshift({ no: no, k: k, t: Date.now() });
    save('recent', r.slice(0, 12));
  }
  function toggleFav(no) {
    var i = fav.indexOf(no);
    if (i >= 0) fav.splice(i, 1); else fav.push(no);
    fav.sort(); save('fav', fav);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  var SEARCH = '<svg class="s-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/></svg>';
  var MARK = '<svg viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h8M10.5 3v7L4.5 21a1.5 1.5 0 0 0 1.3 2h14.4a1.5 1.5 0 0 0 1.3-2L15.5 10V3"/><path d="M7.5 16h11" stroke="#FE752D"/></svg>';

  function srcLine(e) { return e.bookName + ' · ' + e.chapter.split(' ')[0] + ' ' + e.section; }
  function teachHref(no) { return '教学设计.html?no=' + no; }

  /* ── 顶栏（首页、教学设计页） ── */
  function topbar(active) {
    return '<header class="top"><div class="top-in">' +
      '<a class="brand" href="index.html#lib"><span class="brand-mark">' + MARK + '</span>物理实验工作台</a>' +
      '<nav class="nav">' +
      '<a href="index.html#lib" class="' + (active === 'lib' ? 'on' : '') + '">实验库</a>' +
      '<a href="index.html#teach" class="' + (active === 'teach' ? 'on' : '') + '">教学设计</a>' +
      '<a href="index.html#err" class="' + (active === 'err' ? 'on' : '') + '">错题集</a>' +
      '<a href="index.html#help" class="' + (active === 'help' ? 'on' : '') + '">使用说明</a></nav>' +
      '<label class="search" id="search">' + SEARCH + '<input id="q" type="search" placeholder="' + (active === 'lib' ? '搜索实验名称、知识点或课标编号' : '搜索实验，按回车查看结果') + '" autocomplete="off"><button class="s-clr" type="button" aria-label="清空">×</button></label>' +
      '<button class="top-bak" type="button" title="把网页里改的题目、教案、定制和错题导出成文件，或从文件导入" onclick="window.PhysBackup&&PhysBackup.open()">备份修改</button>' +
      '</div></header>';
  }

  /* 已有真实画面的实验：卡片用截图代替线稿（做完一个实验就在这里登记） */
  var SHOT = {'F1': 'F1-stage.jpg', '01': '01-stage.jpg', '02': '02-stage.jpg', '03': '03-stage.jpg', '04': '04-stage.jpg', '05': '05-stage.jpg', '06': '06-stage.jpg', '07': '07-stage.jpg', '08': '08-stage.jpg', '09': '09-stage.jpg', '10': '10-stage.jpg', '11': '11-stage.jpg', '12': '12-stage.jpg', '13': '13-stage.jpg', '14': '14-stage.jpg', '15': '15-stage.jpg', '16': '16-stage.jpg', '17': '17-stage.jpg', '18': '18-stage.jpg', '19': '19-stage.jpg', '20': '20-stage.jpg', '21': '21-stage.jpg', '22': '22-stage.jpg'};
  function shortSrc(e) { return { '8a': '八上', '8b': '八下', '9': '九年级' }[e.book] + ' ' + e.chapter.split(' ')[0] + ' ' + e.section.split(' ')[0]; }
  function thumb(e) { return SHOT[e.no] ? '<img class="shot" src="' + AS('assets/shots/' + SHOT[e.no]) + '" alt="' + esc(e.title) + ' 实验画面" loading="lazy">' : ICON(e.no); }
  /* 实验卡：一行元信息（领域圆点 · 类型编号 · 出处）→ 标题 → 两行简介 → 状态 + 教学设计 + 进入实验 */
  function card(e) {
    var d = DOM[e.domain];
    return '<article class="c2" style="--dc:' + d.color + '">' +
      '<a class="cover" href="' + encodeURI(e.file) + '" aria-label="上课演示 ' + esc(e.title) + '"></a>' +
      '<div class="c2-pic' + (SHOT[e.no] ? ' has-shot' : '') + '">' + thumb(e) + '</div>' +
      '<div class="c2-b"><div class="c2-m"><i></i>' + d.name + '<span>·</span>' + e.code + '<span>·</span>' + esc(shortSrc(e)) + '</div>' +
      '<h3>' + esc(e.title) + '</h3><p class="c2-d">' + esc(e.desc) + '</p>' +
      '<div class="c2-f"><span class="c2-st' + (e.done ? ' live' : '') + '">' + (e.done ? '3D 互动' : '实验预览') + '</span>' +
      '<a class="c2-teach" href="' + teachHref(e.no) + '">教学设计</a><span class="go">上课演示</span></div></div></article>';
  }

  function bindFav(root, after) {
    $$('[data-fav]', root).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var no = b.getAttribute('data-fav');
        toggleFav(no);
        $$('[data-fav="' + no + '"]').forEach(function (x) { x.classList.toggle('on', isFav(no)); });
        var c = $('#favCnt'); if (c) { c.textContent = fav.length; c.setAttribute('data-n', fav.length); }
        if (after) after();
      });
    });
  }

  /* ════════════ 首页 ════════════ */
  function home() {
    var st = load('view', { mode: 'domain', domain: 'all', book: '8a', tb: { book: 'all', dom: 'all' } });
    if (!BOOK[st.book]) st.book = '8a';
    var query = '';
    app.innerHTML = topbar('lib') + '<main class="wrap" id="main"></main>';
    var main = $('#main'), qi = $('#q'), sb = $('#search'), lastV = null;

    function parseHash() {
      var h = decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
      if (h[0] === 'fav' || h[0] === 'err') return 'err';   // 原来的「我的收藏」改成了「错题集」
      if (h[0] === 'help') return h[0];
      if (h[0] === 'teach') { st.tb = { book: BOOK[h[1]] ? h[1] : 'all', dom: DOM[h[2]] ? h[2] : 'all' }; return 'teach'; }
      if (h[0] === 'book') { st.mode = 'book'; if (BOOK[h[1]]) st.book = h[1]; }
      else if (h[0] === 'domain') { st.mode = 'domain'; st.domain = DOM[h[1]] ? h[1] : 'all'; }
      // '#lib'：回到上次的实验库视图（按领域 / 按课本），用上面 load('view') 读到的状态
      return 'lib';
    }
    function setNav(v) {
      $$('.nav a').forEach(function (a, i) { a.classList.toggle('on', ['lib', 'teach', 'err', 'help'][i] === v); });
    }
    function render() {
      var v = query ? 'search' : parseHash();
      setNav(query ? 'lib' : v);
      if (v !== lastV && lastV !== null) window.scrollTo(0, 0);
      lastV = v;
      save('view', st);
      if (v === 'search') return renderSearch();
      if (v === 'err') return renderErr();
      if (v === 'help') return renderHelp();
      if (v === 'teach') return renderTeach();
      main.innerHTML = libHead() + '<div id="lib"></div>';
      $$('.seg button', main).forEach(function (b) {
        b.addEventListener('click', function () { st.mode = b.getAttribute('data-m'); go(); });
      });
      if (st.mode === 'book') renderBook(); else renderDomain();
    }
    function go() {
      var h = st.mode === 'book' ? '#book/' + st.book : '#domain/' + st.domain;
      if (location.hash !== h) location.hash = h; else render();
    }
    function libHead() {
      var nT = EX.filter(function (e) { return e.type === '探究'; }).length, nDone = EX.filter(function (e) { return e.done; }).length;
      return '<section class="lib-h"><h1>初中物理互动实验库</h1>' +
        '<p>人教版初中物理课标必做实验 21 项，其中 4.2.11 串、并联电路分电流、电压两页，共 22 个实验页。备课看教学设计，上课直接投屏。</p>' +
        '<div class="lib-st"><span><i></i>' + (nDone === 22 ? '22 个实验全部 3D 互动' : nDone + ' 个 3D 互动 · ' + (22 - nDone) + ' 个预览') + '</span><span><i></i>' + (22 - nT) + ' 个测量 · ' + nT + ' 个探究</span><span><i></i>3 册教材 · 离线可用</span></div>' +
        recentRow() +
        '<div class="seg" role="tablist"><button data-m="domain" class="' + (st.mode === 'domain' ? 'on' : '') + '">按知识领域</button>' +
        '<button data-m="book" class="' + (st.mode === 'book' ? 'on' : '') + '">按课本顺序</button></div>' +
        '</section>';
    }
    function renderDomain() {
      var all = st.domain === 'all', d = all ? null : DOM[st.domain];
      var list = EX.filter(function (e) { return all || e.domain === d.id; });
      var html = '<div class="chips"><button class="chip' + (all ? ' on' : '') + '" data-d="all" style="--dc:#1E3A5F"><i></i>全部<small>' + EX.length + '</small></button>' +
        LAB.domains.map(function (x) {
          var n = EX.filter(function (e) { return e.domain === x.id; }).length;
          return '<button class="chip' + (!all && x.id === d.id ? ' on' : '') + '" data-d="' + x.id + '" style="--dc:' + x.color + '"><i></i>' + x.name + '<small>' + n + '</small></button>';
        }).join('') + '</div>' +
        '<div class="sec-h"><h2>' + (all ? '全部实验' : d.name + '实验') + '</h2><span>' + (all ? '按课本顺序排列' : d.sub) + '</span></div>' +
        '<div class="grid3">' + list.map(function (e) { return card(e) + XT.filter(function (x) { return x.after === e.no; }).map(function (x) { return card(x); }).join(''); }).join('') + '</div>';   // 拓展实验紧跟在它所跟的必做实验后面，不单独成栏
      $('#lib').innerHTML = html;
      $$('.chip').forEach(function (b) { b.addEventListener('click', function () { st.domain = b.getAttribute('data-d'); go(); }); });
      bindFav($('#lib'));
    }
    function nIn(bid) { return EX.filter(function (e) { return e.book === bid; }).length; }
    /* 目录里挂在节下面的实验条 */
    function xm(no) {
      var e = BY[no], d = DOM[e.domain];
      return '<div class="xm" style="--dc:' + d.color + '"><div class="th">' + thumb(e) + '</div>' +
        '<div class="tx"><h5>' + esc(e.title) + '</h5><p><i></i>' + d.name + ' · ' + e.code + (e.figs ? ' · 课本' + esc(e.figs.split('、')[0]) + (e.figs.indexOf('、') > 0 ? ' 等' : '') : '') + ' · ' + (e.done ? '3D 互动' : '实验预览') + '</p></div>' +
        '<div class="acts"><a class="lnk" href="' + teachHref(no) + '">教学设计</a><a class="btn-s" href="' + encodeURI(e.file) + '">上课演示</a></div></div>';
    }
    /* 按课本顺序：左边三册封面，右边照课本目录页排（章配图 + 节 + 页码，必做实验挂在节下面） */
    function renderBook() {
      var b = BOOK[st.book] || LAB.books[0];
      var html = '<div class="tocv"><aside class="shelf"><h4>选择课本</h4>' +
        LAB.books.map(function (x) {
          return '<button class="bk2' + (x.id === b.id ? ' on' : '') + '" data-b="' + x.id + '"><img src="' + AS('assets/toc/cover-' + x.id + '.jpg') + '" alt="' + x.name + '封面">' +
            '<span><b>' + x.name + '</b><small>' + x.ed + '</small><span class="prog">' + nIn(x.id) + ' 个必做实验</span></span></button>';
        }).join('') + '</aside>' +
        '<section class="toc"><div class="toc-h"><h2>目录</h2><span>人教版物理 · ' + b.name + '</span></div>' +
        (b.lead ? '<div class="lead">' + b.lead[0] + '<span class="dots"></span><span class="pg">' + b.lead[1] + '</span></div>' : '') +
        b.chapters.map(function (c) {
          var k = c.sections.reduce(function (a, x) { return a + x.exps.length; }, 0);
          return '<div class="chap' + (k ? '' : ' dim') + '"><img class="ph" src="' + AS('assets/toc/' + c.photo) + '" alt="" loading="lazy"><div>' +
            '<div class="chap-t">' + c.name + (k ? '<span class="cnt">' + k + ' 个必做实验</span>' : '<span class="none">本章无必做实验</span>') + '<span class="dots"></span><span class="pg">' + c.page + '</span></div>' +
            c.sections.map(function (x) {
              return '<div class="sec' + (x.exps.length ? ' req' : '') + '"><span class="n">' + x.no + '</span>' + esc(x.title) +
                '<span class="dots"></span><span class="pg">' + x.page + '</span></div>' + x.exps.map(xm).join('') +
                XT.filter(function (e) { return e.book === b.id && c.name.indexOf(e.chapter.split(' ')[0]) === 0 && e.section.indexOf(x.title) >= 0; }).map(function (e) { return xm(e.no); }).join('');
            }).join('') + '</div></div>';
        }).join('') + '</section></div>';
      $('#lib').innerHTML = html;
      $$('.bk2').forEach(function (x) { x.addEventListener('click', function () { st.book = x.getAttribute('data-b'); go(); }); });
    }
    /* 教学设计板块（备课）：方法说明 → 筛选 → 按册分组的教案卡 */
    function tcard(e) {
      var d = DOM[e.domain], c = e.cards, T = e.teaching;
      return '<article class="tc2" style="--dc:' + d.color + '"><a class="cover" href="' + teachHref(e.no) + '" aria-label="打开教学设计 ' + esc(e.title) + '"></a>' +
        '<div class="tc2-top"><div><div class="c2-m"><i></i>' + d.name + '<span>·</span>' + esc(shortSrc(e)) + '</div><h3>' + esc(e.title) + '</h3></div>' +
        '<div class="tc2-th' + (SHOT[e.no] ? ' has-shot' : '') + '">' + thumb(e) + '</div></div>' +
        '<div class="rows"><div class="rw" style="--k:#FE752D"><em>钩子</em><span>' + esc(c.hook[0]) + '</span></div>' +
        '<div class="rw" style="--k:#2563EB"><em>梯子</em><span>' + esc(c.ladder[0]) + '</span></div>' +
        '<div class="rw" style="--k:#B478FF"><em>坑</em><span>' + esc(c.pit[0]) + '</span></div></div>' +
        '<div class="ft"><span class="meta">' + '建议 ' + ((T && T.duration) || 40) + ' 分钟 · ' + '边做边问 6 问</span>' +
        '<a class="lnk" href="' + teachHref(e.no) + '">打开</a><a class="btn-s" href="' + encodeURI(e.file) + '">上课演示</a></div></article>';
    }
    function renderTeach() {
      var tb = st.tb || { book: 'all', dom: 'all' };
      var list = EX.concat(XT).filter(function (e) { return (tb.book === 'all' || e.book === tb.book) && (tb.dom === 'all' || e.domain === tb.dom); });   // 附加实验也有教学设计
      function bchip(id, name, n) { return '<button class="chip' + (tb.book === id ? ' on' : '') + '" data-tb="' + id + '">' + name + '<small>' + n + '</small></button>'; }
      function dchip(id, name, color) { return '<button class="chip' + (tb.dom === id ? ' on' : '') + '" data-td="' + id + '" style="--dc:' + color + '"><i></i>' + name + '</button>'; }
      var M = [
        ['hook', '钩子', '#FE752D', '开课 3 分钟抓住注意力', '用一个反常识的问题或生活现象制造悬念，让学生带着疑问进入实验。', '同一块透镜，为什么时大时小？'],
        ['ladder', '梯子', '#2563EB', '把难点拆成几级台阶', '每一级是一个小操作加一个追问，一步步走到规律。', '以 f 和 2f 为界，分三段找像'],
        ['pit', '坑', '#B478FF', '让常见误区当场暴露', '先让学生说出直觉判断，再用实验当场推翻，比老师直接纠正记得更牢。', '遮住半个透镜，像会少一半吗？']
      ];
      var groups = LAB.books.filter(function (b) { return tb.book === 'all' || b.id === tb.book; }).map(function (b) {
        var g = list.filter(function (e) { return e.book === b.id; });
        if (!g.length) return '';
        return '<section class="tgrp"><div class="tgrp-h"><img src="' + AS('assets/toc/cover-' + b.id + '.jpg') + '" alt=""><div><h2>' + b.name + '</h2><span>' + g.length + ' 份</span></div></div>' +
          '<div class="grid3">' + g.map(tcard).join('') + '</div></section>';
      }).join('');
      main.innerHTML = '<section class="lib-h"><h1>教学设计</h1>' +
        '<p>每个实验一份：钩子引入、梯子突破、坑纠错。上课点「上课演示」进入实验。</p></section>' +
        '<div class="method">' + M.map(function (m, i) {
          return '<div class="mcard" style="--k:' + m[2] + '"><div class="mh"><span class="mn">' + (i + 1) + '</span><b>' + m[1] + '</b><small>' + m[3] + '</small></div>' +
            '<p>' + m[4] + '</p><div class="mx"><em>例 · 凸透镜成像</em>' + m[5] + '</div></div>';
        }).join('') + '</div>' +
        '<div class="fbar"><span class="lab">册次</span><div class="chips">' + bchip('all', '全部', EX.length) +
        LAB.books.map(function (x) { return bchip(x.id, x.name, nIn(x.id)); }).join('') + '</div>' +
        '<span class="sep"></span><span class="lab">领域</span><div class="chips">' + dchip('all', '全部', '#1E3A5F') +
        LAB.domains.map(function (x) { return dchip(x.id, x.name, x.color); }).join('') + '</div></div>' +
        (list.length ? groups : '<div class="empty-box"><b>这个组合下没有教学设计</b>换一个册次或知识领域试试</div>');
      $$('[data-tb]', main).forEach(function (x) { x.addEventListener('click', function () { location.hash = '#teach/' + x.getAttribute('data-tb') + '/' + tb.dom; }); });
      $$('[data-td]', main).forEach(function (x) { x.addEventListener('click', function () { location.hash = '#teach/' + tb.book + '/' + x.getAttribute('data-td'); }); });
    }
    function renderSearch() {
      var words = query.toLowerCase().split(/\s+/).filter(Boolean);
      var SCN = { '07': '照相机', '13': '潜水艇 轮船', '22': '手摇发电机 发电机', 'F1': '叉鱼 筷子插水 筷子 附加实验' };   // 生活情境名（与 assets/lab/scene-*.js 对应）
      var hits = EX.concat(XT).filter(function (e) {
        var hay = [e.no, e.title, e.short, e.desc, e.kw, e.code, e.type, e.bookName, shortSrc(e), e.chapter, e.section, DOM[e.domain] ? DOM[e.domain].name : '', SCN[e.no] ? '生活情境 ' + SCN[e.no] : ''].join(' ').toLowerCase();
        return words.every(function (w) { return /^\d+(\.\d+){2}$/.test(w) ? e.code === w : hay.indexOf(w) >= 0; });   // 课标编号（如 4.2.1）按完整编号匹配，不把 4.2.10～4.2.12 也搜出来
      });
      main.innerHTML = '<div class="sec-h"><h2>搜索 “' + esc(query) + '”</h2><span>找到 ' + hits.length + ' 个实验</span>' +
        '<button class="btn sm more" id="clrQ">清空搜索</button></div>' +
        (hits.length ? '<div class="grid3">' + hits.map(function (e) { return card(e); }).join('') + '</div>'
          : '<div class="empty-box"><b>没有找到相关实验</b>试试：凸透镜、电流、密度、4.2.8</div>');
      $('#clrQ').addEventListener('click', function () { qi.value = ''; onQ(); });
      bindFav(main);
    }
    /* 我的收藏：最近打开 + 收藏的实验；没有收藏时给出做法和推荐 */
    function ago(t) {
      var m = Math.round((Date.now() - t) / 60000);
      if (m < 1) return '刚刚'; if (m < 60) return m + ' 分钟前';
      var h = Math.round(m / 60); if (h < 24) return h + ' 小时前';
      var d = Math.round(h / 24); return d < 30 ? d + ' 天前' : '更早';
    }
    function recentRow() {
      var seen = {}, rec = load('recent', []).filter(function (r) { if (!BY[r.no] || seen[r.no + r.k]) return false; seen[r.no + r.k] = 1; return true; }).slice(0, 5);
      if (!rec.length) return '';
      return '<div class="recent-row"><span>最近打开</span>' + rec.map(function (r) {
        var e = BY[r.no], teach = r.k === 'teach';
        return '<a href="' + (teach ? teachHref(e.no) : encodeURI(e.file)) + '">' + shownNo(e) + ' ' + esc(e.short) + (teach ? '<em>教学设计</em>' : '') + '</a>';
      }).join('') + '</div>';
    }
    /* 错题集（老师用）：「易错点」是自带的（assets/mistakes.js 的 items，按课本和中考常见错误整理）；
       「我记的」= 上课时在实验页点「记错题」记下的（localStorage physlab.err）+ 写进 mistakes.js 的 mine（老师可让 AI 助手照格式写进去） */
    function renderErr() {
      var M = window.LAB_MISTAKES || {}, items = (M.items || []).filter(function (x) { return BY[x.no]; }), fileMine = (M.mine || []).filter(function (x) { return BY[x.no]; });
      var rec = load('err', []); if (!Array.isArray(rec)) rec = [];
      rec = rec.filter(function (x) { return x && BY[x.no]; });
      var E2 = st.err || (st.err = { tab: 'all', dom: 'all', cls: 'all' });
      function demoHref(no, src) { return encodeURI(BY[no].file) + (src != null && src >= 0 ? '#q=' + (src + 1) : ''); }
      function item(x, mine) {
        return '<div class="ei"><div class="ei-t"><span class="et">' + esc(x.tag || (mine ? '老师加的' : '易错')) + '</span></div>' +
          '<p class="w"><b>✗ 学生常说</b>' + esc(x.wrong) + '</p>' + (x.why ? '<p class="y"><b>错在哪</b>' + esc(x.why) + '</p>' : '') +
          '<p class="r"><b>✓ 正确</b>' + esc(x.right) + '</p>' +
          '<div class="ef">' + (x.demo ? '<span>演示：' + esc(x.demo) + '</span>' : '<span></span>') + '<a class="btn sm" href="' + demoHref(x.no, x.src) + '">' + (x.src != null && x.src >= 0 ? '到实验台演示' : '打开这个实验') + ' ▸</a></div></div>';
      }
      function groups(list, fn) {
        var by = {}; list.forEach(function (x) { (by[x.no] = by[x.no] || []).push(x); });
        return EX.filter(function (e) { return by[e.no]; }).map(function (e) {
          var d = DOM[e.domain];
          return '<section class="eg" style="--dc:' + d.color + '"><div class="eg-h"><span class="eg-no">' + shownNo(e) + '</span><h3>' + esc(e.title) + '</h3><small>' + esc(shortSrc(e)) + '</small>' +
            '<a class="lnk" href="' + teachHref(e.no) + '">教学设计</a></div><div class="eg-b">' + by[e.no].map(fn).join('') + '</div></section>';
        }).join('');
      }
      var head = '<section class="lib-h err-h"><h1>错题集</h1><p>学生最容易错的地方，复习课直接投屏讲。点「到实验台演示」会打开对应实验、摆好器材，当场做给学生看。</p>' +
        '<div class="err-bar"><div class="seg" role="tablist"><button data-t="all" class="' + (E2.tab !== 'mine' ? 'on' : '') + '">易错点<small>' + items.length + '</small></button>' +
        '<button data-t="mine" class="' + (E2.tab === 'mine' ? 'on' : '') + '">我记的<small>' + (rec.length + fileMine.length) + '</small></button></div>' +
        '<button class="btn sm no-print" onclick="window.print()">打印这一页</button></div></section>';
      var body;
      if (E2.tab !== 'mine') {
        var dom = DOM[E2.dom] ? E2.dom : 'all', list = items.filter(function (x) { return dom === 'all' || BY[x.no].domain === dom; });
        body = '<div class="chips no-print"><button class="chip' + (dom === 'all' ? ' on' : '') + '" data-d="all" style="--dc:#1E3A5F"><i></i>全部<small>' + items.length + '</small></button>' +
          LAB.domains.map(function (x) {
            var n = items.filter(function (it) { return BY[it.no].domain === x.id; }).length;
            return '<button class="chip' + (dom === x.id ? ' on' : '') + '" data-d="' + x.id + '" style="--dc:' + x.color + '"><i></i>' + x.name + '<small>' + n + '</small></button>';
          }).join('') + '</div>' +
          (list.length ? groups(list, function (x) { return item(x, false); }) : '<div class="hint-row">这一类还没有易错点。</div>');
      } else {
        var cl = {}; rec.forEach(function (x) { if (x.cls) cl[x.cls] = 1; });
        var cls = Object.keys(cl), cur = cl[E2.cls] ? E2.cls : 'all', rl = rec.filter(function (x) { return cur === 'all' || x.cls === cur; });
        body = (cls.length ? '<div class="chips no-print"><button class="chip' + (cur === 'all' ? ' on' : '') + '" data-c="all" style="--dc:#1E3A5F"><i></i>全部班级<small>' + rec.length + '</small></button>' +
            cls.map(function (c) { return '<button class="chip' + (cur === c ? ' on' : '') + '" data-c="' + esc(c) + '" style="--dc:#1E3A5F"><i></i>' + esc(c) + '</button>'; }).join('') + '</div>' : '') +
          '<div class="sec-h"><h2>上课时记的</h2><span>' + (rl.length ? rl.length + ' 条' : '') + '</span></div>' +
          (rl.length ? '<div class="mrec">' + rl.map(function (x) {
            var e = BY[x.no], dt = new Date(x.t);
            return '<div class="mr"><div class="mr-h"><b>' + shownNo(e) + ' ' + esc(e.short) + '</b><span>' + (x.cls ? esc(x.cls) + ' · ' : '') + (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日</span></div>' +
              '<p class="mq">题目：' + esc(x.q) + '</p><p class="ms">' + esc(x.said) + '</p>' +
              '<div class="ef"><button class="lnk del no-print" data-del="' + esc(x.id) + '">删掉</button><a class="btn sm" href="' + demoHref(x.no, x.src) + '">到实验台演示 ▸</a></div></div>';
          }).join('') + '</div>'
            : '<div class="hint-row">还没有记过。上课时学生答错了，点实验页顶栏「老师工具 → 记错题」写一句，就会出现在这里。</div>') +
          '<div class="sec-h" style="margin-top:36px"><h2>自己整理的错题</h2><span>' + (fileMine.length ? fileMine.length + ' 条' : '') + '</span></div>' +
          (fileMine.length ? groups(fileMine, function (x) { return item(x, true); })
            : '<div class="hint-row">手里已有的错题（试卷、Word 文档），可以交给 AI 助手，让它按「错题集」的格式写进网页，写好后会出现在这里。</div>');
      }
      main.innerHTML = head + body;
      $$('.err-bar .seg button', main).forEach(function (b) { b.addEventListener('click', function () { E2.tab = b.getAttribute('data-t'); save('view', st); renderErr(); }); });
      $$('.chip[data-d]', main).forEach(function (b) { b.addEventListener('click', function () { E2.dom = b.getAttribute('data-d'); save('view', st); renderErr(); }); });
      $$('.chip[data-c]', main).forEach(function (b) { b.addEventListener('click', function () { E2.cls = b.getAttribute('data-c'); save('view', st); renderErr(); }); });
      $$('[data-del]', main).forEach(function (b) {
        b.addEventListener('click', function () {
          if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = '再点一次删掉'; setTimeout(function () { b.classList.remove('sure'); b.textContent = '删掉'; }, 3000); return; }
          save('err', load('err', []).filter(function (x) { return x.id !== b.getAttribute('data-del'); })); renderErr();
        });
      });
    }
    /* 使用说明：左侧目录 + 右侧图文指南（截图带编号标注）+ 常见问题 */
    function renderHelp() {
      function shot(src, pins, cap) {
        return '<figure class="gshot"><div class="gs-in"><img src="' + AS('assets/guide/' + src) + '" alt="' + cap + '" loading="lazy">' +
          pins.map(function (p, i) { return '<span class="pin" style="left:' + p[0] + '%;top:' + p[1] + '%">' + (i + 1) + '</span>'; }).join('') +
          '</div><figcaption>' + cap + '</figcaption></figure>';
      }
      function legend(items) { return '<ol class="legend">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>'; }
      var S = [
        ['start', '快速上手', '<div class="steps-q">' +
          [['找到这节课', '在「实验库」按知识领域或「按课本顺序」找，也能搜实验名称、知识点、课标编号（如 4.2.8）。'],
           ['课前看教学设计', '每个实验都有「钩子 · 梯子 · 坑」和课堂顺序，可以照着讲，也可以打印。'],
           ['上课点「上课演示」', '投到一体机上，边操作边提问。']].map(function (s, i) {
            return '<div class="sq"><span>' + (i + 1) + '</span><b>' + s[0] + '</b><p>' + s[1] + '</p></div>';
          }).join('') + '</div>' + shot('toc.jpg', [], '「按课本顺序」照课本目录排，必做实验挂在对应的节下面')],
        ['demo', '上课演示', shot('exp.jpg', [[30, 55], [14.6, 12.7], [70.3, 3.9], [88, 3.8], [95.3, 3.8], [91.9, 11.4], [85.2, 20], [85.2, 60], [6.5, 92.6], [72.1, 92.4], [84.3, 92.4]], '实验页（以浮力为例）') +
          legend(['<b>实验台</b>：直接拖动器材；拖空白处转视角', '<b>生活情境</b>：有情境的实验，左上角切换「实验｜潜水艇」', '<b>顶栏读数</b>：关键数据放大，后排也看得清', '<b>全屏演示</b>', '<b>老师工具</b>：见下图', '<b>数据</b>：记下的表格和图像', '<b>器材调节</b>：按钮、滑杆和实验台同步', '<b>检查与读数、记录</b>：器材摆好，读数自动显示；点「记录这组数据」才记进表格', '<b>边做边问</b>：每个实验 6 道题', '<b>放大题目</b>：题目和答案放大，全班看得清', '<b>仪器复原、答案、上一问、下一问</b>：换题时器材自动摆好']) +
          shot('tools.jpg', [[70.9, 19.2], [70.9, 27.5], [70.9, 35.6], [70.9, 43.7], [70.9, 56.5], [70.9, 64.7]], '点「老师工具」展开') +
          legend(['<b>改题目</b>：改题目、答案和提示，也能加题、调顺序', '<b>定制</b>：换样子、配色、字的大小', '<b>教学设计</b>：打开这个实验的教学设计', '<b>备份我的修改</b>：把改过的内容导出成文件（见「按自己的习惯改」）', '<b>记错题</b>：学生答错了记一句，课后在「错题集」看', '<b>重置实验</b>：回到第 1 题，已记的数据保留'])],
        ['prep', '备课', shot('board.jpg', [], '「教学设计」可以按册次、知识领域筛选') + shot('teach.jpg', [], '每个实验的教学设计：三张卡片 + 课堂顺序，右上角可「改教案」「打印」')],
        ['scene', '生活情境', '<div class="tips2">' +
          [['在哪里', '有生活情境的实验，实验台左上角有「实验｜照相机」这样的切换。点情境名，换成生活里的 3D 场景，右边换成它的操作；点「实验」回来。题目、答案、记录都不受影响。'],
           ['现在有哪些', '凸透镜成像：照相机；浮力：潜水艇；电磁感应：手摇发电机；拓展「光的折射」：叉鱼、筷子插水。'],
           ['怎么用', '先在实验台上得出结论，再切到情境，让学生用刚学的规律解释生活里的现象。'],
           ['想要更多情境', '把想要的场景告诉 AI 助手，它会照网站的写法做好加进来。新做的情境右下角有「检查画面」，点开后把那段话复制给 AI 助手，它会照着改。']].map(function (t) {
            return '<div><b>' + t[0] + '</b><p>' + t[1] + '</p></div>';
          }).join('') + '</div>'],
        ['diy', '按自己的习惯改', '<div class="tips2">' +
          [['换样子、换颜色', '「老师工具 → 定制」：坐标纸、沉浸舞台、手绘本三种样子，每种六种配色，字可以调大；可以只改这个实验，也可以所有实验一起改。'],
           ['改题目', '「老师工具 → 改题目」：改题目、答案和提示，也能加题、调顺序、删题；实验台不受影响。'],
           ['改教案', '教学设计页点「改教案」：虚线框里的字点一下就能改，还能写「我的教案」、加 Word 或 PDF。题目和实验页是同一份，改一边另一边跟着变。'],
           ['改的东西存在哪', '存在这台电脑的这个浏览器里，换浏览器或换电脑就看不到。想恢复，点「改回原样」或「全部改回原样」。'],
           ['换电脑、发给同事', '点首页右上角「备份修改」（实验页在「老师工具 → 备份我的修改」）导出成文件；换电脑时在同一处「从文件导入」。想让同事打开就看到，把这个文件交给 AI 助手，让它写进网站文件。']].map(function (t) {
            return '<div><b>' + t[0] + '</b><p>' + t[1] + '</p></div>';
          }).join('') + '</div>'],
        ['err', '错题集', '<p class="gp">「易错点」是每个实验学生最常错的地方，点「到实验台演示」会打开实验、摆好器材，当场演示。上课时学生答错了，点「老师工具 → 记错题」记一句，课后在「错题集 → 我记的」里按班级看。手里已有的错题，可以交给 AI 助手写进网页。这些记录只存在这台电脑的浏览器里。</p>'],
        ['screen', '投屏与离线', '<div class="tips2">' +
          [['推荐浏览器', '新版 Chrome 或 Edge。'],
           ['分辨率', '1920×1080、1600×900、1366×768 都可以，实验页一屏放完，不用滚动。'],
           ['全屏', '点「全屏演示」，或按 F11。'],
           ['离线使用', '拷「物理实验工作台.html」这一个文件，双击就能打开；用网站文件夹的话，双击 index.html。都不需要联网，也不需要安装。']].map(function (t) {
            return '<div><b>' + t[0] + '</b><p>' + t[1] + '</p></div>';
          }).join('') + '</div>'],
        ['faq', '常见问题', '<div class="faq">' +
          [['一体机上 3D 画面是空白的？', '换用新版 Chrome 或 Edge 再打开；右边的面板和记录不受影响。'],
           ['记录的数据会丢吗？', '关闭或刷新页面就清空。「重置实验」不清记录，「清空记录」才删除。'],
           ['换到下一问，器材会变吗？', '会，自动摆成这一问的起始状态，已记的数据保留。想重来这一问，点「仪器复原」。'],
           ['可以打印教学设计吗？', '可以：打开后点右上角「打印」，或按 Ctrl+P。'],
           ['网站内容从哪里来？', '本网站是独立制作的教学辅助工具，与人民教育出版社没有关联。网页里标注的课本章节、页码和插图编号，只用来说明对应课本的哪一部分，网站里没有课本内页图片；首页三册书的封面是照课本样子重新绘制的示意图，不是教材封面；章节配图是可以免费使用的图库照片；实验结论按课本的表述整理。']].map(function (q, i) {
            return '<details' + (i === 0 ? ' open' : '') + '><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>';
          }).join('') + '</div>']
      ];
      main.innerHTML = '<section class="lib-h"><h1>使用说明</h1><p>三分钟上手</p></section>' +
        '<div class="guide"><nav class="gtoc">' + S.map(function (s, i) { return '<a href="#help" data-g="' + s[0] + '"' + (i ? '' : ' class="on"') + '>' + s[1] + '</a>'; }).join('') + '</nav>' +
        '<div class="gbody">' + S.map(function (s) { return '<section class="gsec" id="g-' + s[0] + '"><h2>' + s[1] + '</h2>' + s[2] + '</section>'; }).join('') + '</div></div>';
      $$('.gtoc a', main).forEach(function (a) {
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var t = document.getElementById('g-' + a.getAttribute('data-g'));
          if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
        });
      });
      var secs = $$('.gsec', main), links = $$('.gtoc a', main);
      function spy() {
        if (location.hash !== '#help') return window.removeEventListener('scroll', spy);
        var cur = 0;
        secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < 140) cur = i; });
        links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
      }
      window.addEventListener('scroll', spy);
    }

    function onQ() {
      query = qi.value.trim();
      sb.classList.toggle('has', !!query);
      render();
    }
    qi.addEventListener('input', onQ);
    $('.s-clr').addEventListener('click', function (ev) { ev.preventDefault(); qi.value = ''; onQ(); qi.focus(); });
    window.addEventListener('hashchange', function () { if (query) { qi.value = ''; query = ''; sb.classList.remove('has'); } render(); });
    if (!location.hash) location.replace('#' + (st.mode === 'book' ? 'book/' + st.book : 'domain/' + st.domain));
    var pending = load('q', '');
    if (pending) { save('q', ''); qi.value = pending; onQ(); } else render();
  }

  /* ════════════ 实验预览页（互动版制作中的实验） ════════════ */
  function expPage() {
    var e = BY[document.body.getAttribute('data-no')];
    var s = { q: 0, ans: false, tab: 'bench' };
    pushRecent(e.no, 'exp');
    document.title = shownNo(e) + ' ' + e.title + ' · 物理实验工作台';
    function rows() {
      var r = e.rows.length ? e.rows : ['', '', ''];   // 没有预置行名时留空行，不硬填数字
      return r.map(function (name) {
        return '<tr>' + e.table.map(function (h, i) { return i === 0 ? '<td class="rh">' + esc(name) + '</td>' : '<td></td>'; }).join('') + '</tr>';
      }).join('');
    }
    function render() {
      var q = e.qs[s.q];
      var bench = '<div class="blk focus"><h4>现在做什么<small>第 ' + (s.q + 1) + ' / 6 问</small></h4><p>' + esc((e.guide && e.guide[s.q] && e.guide[s.q].task) || q.start) + '</p></div>' +
        '<div class="blk"><h4>读数与观察</h4><p>' + esc(e.reads) + '</p>' + (e.note ? '<p class="muted" style="margin-top:6px">' + esc(e.note) + '</p>' : '') + '</div>' +
        '<div class="blk rec"><h4>本次读数<small>课本记录表</small></h4><table class="tbl"><thead><tr>' +
        e.table.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
        e.table.map(function () { return '<td>—</td>'; }).join('') + '</tr></tbody></table>' +
        '<button class="btn primary stamp" disabled>记录这组数据</button></div>';
      function tbl(title, head) {
        return '<div class="blk"><h4>' + title + '<small>照课本</small></h4><table class="tbl"><thead><tr>' +
          head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          ['', '', ''].map(function () { return '<tr>' + head.map(function () { return '<td></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      }
      var data = (e.table2 ? tbl('测盐水的密度', e.table) + tbl('测小石块的密度', e.table2)
        : '<div class="blk"><h4>记录表<small>照课本</small></h4><table class="tbl"><thead><tr>' +
        e.table.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows() + '</tbody></table></div>') +
        '<details class="blk concl"><summary><h4>结论<small>先做实验，再点开查看</small></h4></summary><p>' + esc(e.conclusion) + '</p></details>';
      app.innerHTML = '<div class="xp">' +
        '<header class="xp-hd"><a class="btn sm" href="index.html">返回实验库</a><span class="badge">' + e.code + '</span>' +
        '<div class="t"><h1>' + esc(e.title) + '</h1><div class="s">人教版物理 ' + esc(e.bookName + ' ' + e.chapter.split(' ')[0] + ' ' + e.section) + (e.figs ? ' ｜ ' + esc(e.figs) : '') + '</div></div>' +
        '<div class="act">' +
        '<a class="btn sm" href="' + teachHref(e.no) + '">教学设计</a><button class="btn sm" id="fs">全屏演示</button></div></header>' +
        '<main class="xp-bd"><section class="stage"><span class="chip"><i></i>实验预览 · 互动版制作中</span>' +
        '<div class="big" style="color:' + DOM[e.domain].color + '">' + ICON(e.no) + '</div>' +
        '<div class="dev"><b>装置</b>' + esc(e.device) + '</div></section>' +
        '<aside class="rail"><div class="rail-tabs"><button data-t="bench" class="' + (s.tab === 'bench' ? 'on' : '') + '">实验台</button><button data-t="data" class="' + (s.tab === 'data' ? 'on' : '') + '">数据</button></div>' +
        '<div class="rail-b">' + (s.tab === 'bench' ? bench : data) + '</div></aside></main>' +
        '<footer class="xp-ft"><span class="lab">边做边问</span><span class="idx">0' + (s.q + 1) + ' / 06</span>' +
        '<div class="q">' + esc(q.q) + (s.ans ? '<span class="ans">答案：' + esc(q.a) + '</span>' : '') + '</div>' +
        '<div class="act"><button class="btn sm' + (s.ans ? ' primary' : '') + '" id="ans">' + (s.ans ? '收起答案' : '答案') + '</button>' +
        '<button class="btn sm" id="prev"' + (s.q ? '' : ' disabled') + '>上一问</button><button class="btn sm" id="next"' + (s.q < 5 ? '' : ' disabled') + '>下一问</button></div></footer></div>';
      $$('.rail-tabs button').forEach(function (b) { b.addEventListener('click', function () { s.tab = b.getAttribute('data-t'); render(); }); });
      $('#ans').addEventListener('click', function () { s.ans = !s.ans; render(); });
      $('#prev').addEventListener('click', function () { if (s.q) { s.q--; s.ans = false; render(); } });
      $('#next').addEventListener('click', function () { if (s.q < 5) { s.q++; s.ans = false; render(); } });
      $('#fs').addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      });
      bindFav(app);
    }
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' && s.q < 5) { s.q++; s.ans = false; render(); }
      if (ev.key === 'ArrowLeft' && s.q > 0) { s.q--; s.ans = false; render(); }
    });
    render();
  }

  /* ════════════ 教学设计页 ════════════ */
  function teachPage() {
    var m = /[?&]no=([0-9A-Z]\d)/.exec(window.__Q || location.search);   // F1 等附加实验
    var e = BY[m ? m[1] : '07'] || BY['07'];
    document.title = e.title + ' · 教学设计 · 物理实验工作台';
    pushRecent(e.no, 'teach');
    /* 「改教案」：只改文字。三张卡片存 physlab.teach.NN（{ cards: { hook: [标题, 正文] … }, mine: 我的教案 }），
       题目存 physlab.qs.NN，和实验页「改题目」是同一份；附件存在浏览器的 IndexedDB（physlab / files）。 */
    var TE = !!window.__TE, my = load('teach.' + e.no, null) || {}, mc = my.cards || {}, c0 = e.cards, T = e.teaching;
    function cd(k) { var d = c0[k].slice(), m = mc[k] || []; if (m[0] != null) d[0] = m[0]; if (m[1] != null) d[1] = m[1]; return d; }
    var c = { hook: cd('hook'), ladder: cd('ladder'), pit: cd('pit') };
    var OQ = e.qs.map(function (q, i) { var g = (e.guide || [])[i] || {}; return { o: i, src: i, q: q.q, a: q.a, task: g.task || '', watch: g.watch || '', keep: g.keep || '' }; });
    var QL = (function () { var o = load('qs.' + e.no, null), l = o && o.list ? o.list.filter(function (x) { return x && e.qs[x.src] && typeof x.q === 'string'; }) : []; return l.length ? l : null; })();
    var useQL = (!!QL || TE) && !T; if (!QL) QL = OQ.map(function (x) { return JSON.parse(JSON.stringify(x)); });
    function qMod(x) { if (x.o == null) return true; var y = OQ[x.o]; return x.src !== y.src || x.q !== y.q || x.a !== y.a || x.task !== y.task || x.watch !== y.watch; }
    function nChanged() {
      var n = 0, seen = {};
      ['hook', 'ladder', 'pit'].forEach(function (k) { [0, 1].forEach(function (j) { if (mc[k] && mc[k][j] != null && mc[k][j] !== c0[k][j]) n++; }); });
      QL.forEach(function (x) { if (qMod(x)) n++; if (x.o != null) seen[x.o] = 1; });
      OQ.forEach(function (y) { if (!seen[y.o]) n++; });
      var ord = QL.filter(function (x) { return x.o != null; }).map(function (x) { return x.o; });
      for (var i = 1; i < ord.length; i++) if (ord[i] < ord[i - 1]) { n++; break; }
      return n;
    }
    function ce(key, max) { return TE ? ' class="ce" contenteditable="plaintext-only" spellcheck="false" data-ce="' + key + '" data-max="' + max + '"' : ''; }
    function left(t, max) { var n = max - String(t || '').length; return n > 0 ? '还能写 ' + n + ' 个字' : '写满了'; }
    function tc(kind, n, name, sub, d) {
      var m1 = Math.max(30, c0[kind][0].length), m2 = Math.max(120, c0[kind][1].length), chg = mc[kind] && ((mc[kind][0] != null && mc[kind][0] !== c0[kind][0]) || (mc[kind][1] != null && mc[kind][1] !== c0[kind][1]));
      return '<div class="tc ' + kind + '"><div class="tc-h"><span class="tc-n">' + n + '</span><span><b>' + name + '</b><small>' + sub + '</small></span>' + (TE && chg ? '<i class="chg">已改</i>' : '') + '</div>' +
        '<div class="tc-b"><h3' + ce('card:' + kind + ':0', m1) + '>' + esc(d[0]) + '</h3><p' + ce('card:' + kind + ':1', m2) + '>' + esc(d[1]) + '</p>' +
        (TE ? '<span class="cnt" data-cnt="card:' + kind + ':1">' + left(d[1], m2) + '</span>' : '') + '</div><div class="flow">' + esc(d[2]) + '</div></div>';
    }
    var steps = [];
    function bestPit() {   // 卡片上的坑插在内容最相关的那一问后面（按原来的题目算）
      var pitTxt = c.pit[0] + c.pit[1], big = function (t) { var o = {}; for (var j = 0; j < t.length - 1; j++) o[t.substr(j, 2)] = 1; return o; }, pb = big(pitTxt), best = 0, bestN = -1;
      e.qs.forEach(function (q, i) { var n = 0, qb = big(q.q + q.a); for (var k2 in qb) if (pb[k2]) n++; if (n > bestN) { bestN = n; best = i; } });
      return best;
    }
    if (useQL) {
      var bp = bestPit();
      if (T) T.hooks.forEach(function (h) { steps.push({ k: 'hook', l: '钩子', t: h.title, p: [['情境', h.story], ['提问', h.question]] }); });
      else steps.push({ k: 'hook', l: '钩子', t: c.hook[0], p: [['', c.hook[1]]] });
      QL.forEach(function (x, i) {
        steps.push({ k: 'lad', l: '梯子', t: x.q, p: [['操作', x.task], ['预期', x.a]], qi: i });
        if (T) T.pits.forEach(function (p) { if (p.after === x.o) steps.push(pitStep(p)); });
        else if (x.o === bp) steps.push({ k: 'pit', l: '坑', t: '误区：' + c.pit[0].replace(/[？?。]$/, ''), p: [['当场演示', c.pit[1]]] });
      });
      if (T) {
        T.pits.forEach(function (p) { if (p.after == null || p.after === 'conclusion' || p.after >= T.ladder.length) steps.push(pitStep(p)); });
        if (T.conclusion) steps.push({ k: 'end', l: '结论', t: '得出结论', p: [['', T.conclusion]] });
        if (T.extension) steps.push({ k: 'end', l: '拓展', t: '联系生活', p: [['', T.extension]] });
      } else steps.push({ k: 'end', l: '结论', t: '得出结论', p: [['', e.conclusion]] });
    } else if (T) {
      T.hooks.forEach(function (h) { steps.push({ k: 'hook', l: '钩子', t: h.title, p: [['情境', h.story], ['提问', h.question]] }); });
      T.ladder.forEach(function (l, i) {
        steps.push({ k: 'lad', l: '梯子 ' + (i + 1), t: l.title, p: [['操作', l.do], ['追问', l.ask], ['预期', l.expect]] });
        T.pits.forEach(function (p) { if (p.after === i) steps.push(pitStep(p)); });
      });
      T.pits.forEach(function (p) { if (p.after == null || p.after === 'conclusion' || p.after >= T.ladder.length) steps.push(pitStep(p)); });
      if (T.conclusion) steps.push({ k: 'end', l: '结论', t: '得出结论', p: [['', T.conclusion]] });
      if (T.extension) steps.push({ k: 'end', l: '拓展', t: '联系生活', p: [['', T.extension]] });
    } else {
      // 简版：钩子 → 六问梯子 → 结论；卡片上的坑插在内容最相关的那一问后面
      var pitTxt = c.pit[0] + c.pit[1], big = function (t) { var o = {}; for (var j = 0; j < t.length - 1; j++) o[t.substr(j, 2)] = 1; return o; }, pb = big(pitTxt), best = 0, bestN = -1;
      e.qs.forEach(function (q, i) { var n = 0, qb = big(q.q + q.a); for (var k2 in qb) if (pb[k2]) n++; if (n > bestN) { bestN = n; best = i; } });
      steps.push({ k: 'hook', l: '钩子', t: c.hook[0], p: [['', c.hook[1]]] });
      e.qs.forEach(function (q, i) {
        var g = e.guide && e.guide[i];
        steps.push({ k: 'lad', l: '梯子 ' + (i + 1), t: q.q, p: [['操作', g ? g.task : ''], ['预期', q.a]] });
        if (i === best) steps.push({ k: 'pit', l: '坑', t: '误区：' + c.pit[0].replace(/[？?。]$/, ''), p: [['当场演示', c.pit[1]]] });
      });
      steps.push({ k: 'end', l: '结论', t: '得出结论', p: [['', e.conclusion]] });
    }
    function pitStep(p) { return { k: 'pit', l: '坑', t: '误区：' + p.myth.replace(/。$/, ''), p: [['为什么会错', p.why], ['当场演示', p.demo], ['正确认识', p.truth]] }; }
    var tl = '';
    if (T && T.timeline) {
      var tot = 0, cols = { '引入': '#FE752D', '探究': '#2563EB', '归纳': '#1B7A50', '拓展': '#B478FF' };
      Object.keys(T.timeline).forEach(function (k) { tot += T.timeline[k]; });
      tl = '<div class="tl">' + Object.keys(T.timeline).map(function (k) {
        return '<div style="flex:' + T.timeline[k] + ';background:' + (cols[k] || '#1E3A5F') + '">' + k + ' ' + T.timeline[k] + ' 分钟</div>';
      }).join('') + '</div>';
    }
    var lad = 0;
    app.innerHTML = topbar('teach') + '<main class="wrap">' +
      '<section class="th"><div><h1><span class="badge">' + shownNo(e) + '</span>' + esc(e.title) + '<em>· 教学设计</em></h1>' +
      '<p>' + esc(srcLine(e)) + '</p></div>' +
      '<div class="act"><select class="btn sm" id="sw" aria-label="切换实验">' + EX.concat(XT).map(function (x) { return '<option value="' + x.no + '"' + (x.no === e.no ? ' selected' : '') + '>' + shownNo(x) + ' ' + esc(x.short) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm' + (TE ? ' primary' : '') + '" data-te="toggle">' + (TE ? '改好了' : '改教案') + '</button>' +
      '<button class="btn sm" onclick="window.print()">打印</button><a class="btn primary" href="' + encodeURI(e.file) + '">上课演示</a></div></section>' +
      (TE ? '<div class="te-bar no-print"><b>✎ 正在改教案</b><span>' + (T ? '点虚线框里的字就能改。实验页上的题目在页面最下面「实验页上的题目」里改，改这边，实验页也跟着变。' : '点虚线框里的字就能改。「课堂顺序」里的题目就是实验页上的题目，改这边，那边也跟着变。') + '</span><span class="sp" id="te-n"></span>' +
        '<button class="btn sm" data-te="reset">全部改回原样</button><button class="btn sm primary" data-te="toggle">改好了</button></div>' : '') +
      '<div class="note-bar"><h2>三步上好这节课</h2><span>可照着讲，也可换成自己的话</span></div>' +
      '<div class="three">' + tc('hook', 1, '钩子', '开课 3 分钟抓住注意力', c.hook) + tc('ladder', 2, '梯子', '把难点拆成几级台阶', c.ladder) + tc('pit', 3, '坑', '让常见误区当场暴露', c.pit) + '</div>' +
      '<section class="mine" id="mine"' + (TE || my.mine ? '' : ' hidden') + '><h2>我的教案</h2>' +
      (TE ? '<p class="s">写自己的上课思路、板书或补充材料。会存在这台电脑里，打印时排在最后。</p><textarea id="mine-tx" maxlength="3000" placeholder="在这里写……">' + esc(my.mine || '') + '</textarea>'
        : '<div class="mine-tx">' + esc(my.mine || '') + '</div>') +
      '<div class="files" id="files"></div>' + (TE ? '<label class="btn sm add-f no-print">📎 加一个文件（Word、PDF、图片都行）<input type="file" id="mine-f" multiple hidden></label>' : '') + '</section>' +
      '<section class="flowc"><h2>课堂顺序</h2><p class="lead">' + esc(T ? T.summary + (e.done ? '' : '（文中提到的面板操作，互动版上线后可用。）') : '梯子 1～' + e.qs.length + ' 就是实验页底部「边做边问」的第 1～' + e.qs.length + ' 问，按顺序在实验页上演示。' + '') +
      '　建议用时 ' + ((T && T.duration) || 40) + ' 分钟。' + '</p>' + tl +
      '<ol class="steps">' + steps.map(function (s) {
        if (s.k === 'lad') lad++;
        if (TE && s.qi != null) return qli(s.qi, '梯子' + lad);   // 改教案：梯子的题目、操作、预期都能改（和实验页第几题是同一份）
        return '<li class="st ' + s.k + '"><span class="k">' + s.l.replace(/ \d+$/, '') + (s.k === 'lad' ? lad : '') + '</span><h4>' + esc(s.t || '（这道题还没写题目）') + '</h4>' +
          s.p.filter(function (x) { return x[1]; }).map(function (x) { return '<p>' + (x[0] ? '<b>' + x[0] + '</b>' : '') + esc(x[1]) + '</p>'; }).join('') +
          (s.demo ? '<span class="demo">第 ' + Math.min(lad, 6) + ' 问</span>' : '') + '</li>';
      }).join('') + '</ol></section>' +
      (TE && T ? '<section class="flowc"><h2>实验页上的题目</h2><p class="lead">实验页底部「边做边问」的 ' + QL.length + ' 道题。在这里改，实验页跟着变；上面的课堂顺序是这节课的详细教案，保持原样。</p>' +
        '<ol class="steps">' + QL.map(function (x, i) { return qli(i, '第' + (i + 1) + '题'); }).join('') + '</ol></section>' : '') + '</main>';
    function qli(i, label) {
      var x = QL[i], y = x.o != null ? OQ[x.o] : OQ[x.src];
      return '<li class="st lad"><span class="k">' + label + '</span><h4><span' + ce('q:' + i + ':q', Math.max(40, y.q.length)) + '>' + esc(x.q) + '</span><em class="sync">就是实验页第 ' + (i + 1) + ' 题</em></h4>' +
        '<p><b>操作</b><span' + ce('q:' + i + ':task', Math.max(40, y.task.length)) + '>' + esc(x.task) + '</span></p><p><b>预期</b><span' + ce('q:' + i + ':a', Math.max(120, y.a.length)) + '>' + esc(x.a) + '</span></p></li>';
    }
    $('#sw').addEventListener('change', function () { window.__TE = false; goPage('教学设计.html?no=' + this.value); });
    teachEdit(e, TE, my, mc, OQ, QL, nChanged);
    var qi = $('#q');
    qi.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { save('q', qi.value); goPage('index.html#domain'); } });
  }

  /* ── 「改教案」的事件：开关、改字、全部改回、我的教案、附件 ── */
  function idb(fn) { try { var r = indexedDB.open('physlab', 1); r.onupgradeneeded = function () { r.result.createObjectStore('files', { keyPath: 'id' }); }; r.onsuccess = function () { fn(r.result); }; } catch (err) { } }
  function listFiles(no, cb) { idb(function (db) { var out = []; db.transaction('files').objectStore('files').openCursor().onsuccess = function (ev) { var cu = ev.target.result; if (cu) { if (cu.value.no === no) out.push(cu.value); cu.continue(); } else cb(out.sort(function (a, b) { return a.t - b.t; })); }; }); }
  function teachEdit(e, TE, my, mc, OQ, QL, nChanged) {
    function saveQ() {
      var same = QL.length === OQ.length && QL.every(function (x, i) { var y = OQ[i]; return x.o === y.o && x.src === y.src && x.q === y.q && x.a === y.a && x.task === y.task && x.watch === y.watch; });
      try { if (same) localStorage.removeItem('physlab.qs.' + e.no); else save('qs.' + e.no, { list: QL }); } catch (err) { }
    }
    function saveT() { my.cards = mc; save('teach.' + e.no, my); }
    function showN() { var el = $('#te-n'); if (el) { var n = nChanged(); el.textContent = n ? '改了 ' + n + ' 处' : '还没有改动'; } }
    function again() { teachPage(); window.scrollTo(0, 0); }
    showN();
    $$('[data-te]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-te');
        if (a === 'toggle') {
          if (TE) { var l = QL.filter(function (x) { return x.o != null || x.q.trim(); }); QL.splice(0, QL.length); [].push.apply(QL, l.length ? l : OQ); saveQ(); }
          window.__TE = !TE; again();
        } else if (a === 'reset') {
          if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = '再点一次，全部改回'; setTimeout(function () { b.classList.remove('sure'); b.textContent = '全部改回原样'; }, 3000); return; }
          delete my.cards; save('teach.' + e.no, my); try { localStorage.removeItem('physlab.qs.' + e.no); } catch (err) { } again();
        }
      });
    });
    $$('[data-ce]').forEach(function (el) {
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
      el.addEventListener('input', function () {
        var max = +el.getAttribute('data-max'), t = el.textContent.replace(/\n/g, '');
        if (t.length > max) { t = t.slice(0, max); el.textContent = t; var r = document.createRange(); r.selectNodeContents(el); r.collapse(false); var sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); }
        var k = el.getAttribute('data-ce').split(':');
        if (k[0] === 'card') { var d = mc[k[1]] || (mc[k[1]] = []); d[+k[2]] = t; saveT(); var cn = $('[data-cnt="' + k.join(':') + '"]'); if (cn) { var n = max - t.length; cn.textContent = n > 0 ? '还能写 ' + n + ' 个字' : '写满了'; } }
        else { QL[+k[1]][k[2]] = t; saveQ(); }
        showN();
      });
    });
    var mt = $('#mine-tx');
    if (mt) mt.addEventListener('input', function () { my.mine = mt.value; save('teach.' + e.no, my); });
    function drawFiles() {
      listFiles(e.no, function (fs) {
        var box = $('#files'); if (!box) return;
        box.innerHTML = fs.map(function (f) { return '<span class="file"><a href="#" data-open="' + f.id + '">' + esc(f.name) + '</a>' + (TE ? '<button data-del="' + f.id + '" title="删掉这个文件">×</button>' : '') + '</span>'; }).join('');
        if (fs.length) $('#mine').hidden = false;
        $$('[data-open]', box).forEach(function (a) { a.onclick = function (ev) { ev.preventDefault(); var f = fs.filter(function (x) { return x.id === a.getAttribute('data-open'); })[0]; if (f) window.open(URL.createObjectURL(f.blob), '_blank'); }; });
        $$('[data-del]', box).forEach(function (b) { b.onclick = function () { idb(function (db) { var tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(b.getAttribute('data-del')); tx.oncomplete = drawFiles; }); }; });
      });
    }
    drawFiles();
    var fi = $('#mine-f');
    if (fi) fi.addEventListener('change', function () {
      var list = [].slice.call(fi.files || []); if (!list.length) return;
      idb(function (db) { var tx = db.transaction('files', 'readwrite'), st = tx.objectStore('files'); list.forEach(function (f, i) { st.put({ id: e.no + '-' + Date.now() + '-' + i, no: e.no, name: f.name, type: f.type, blob: f, t: Date.now() + i }); }); tx.oncomplete = drawFiles; });
      fi.value = '';
    });
  }

  if (page === 'home') home();
  else if (page === 'exp') expPage();
  else if (page === 'teach') teachPage();
})();
