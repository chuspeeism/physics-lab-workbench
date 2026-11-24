/* ════ 生活情境 3D 场景框架 LabScene（2026-11-21）════
   舞台左上角一排切换：「实验｜照相机」。点场景名，整个舞台换成这个场景的 3D 画面，右栏换成这个场景的操作；
   点「实验」回来。题目、答案、记录都不受影响（底栏照旧）。
   页面里：先加载 three.min.js、scenes.js、各场景文件（scene-xxx.js），再调用
     LabScene.mount({ stage: 舞台元素, rail: 右栏元素, no: '13' })   —— LabKit 页由 lab.js 自动调用；07 手写页自己调用
   场景文件：
     LabScene.register('sub', { no: '13', name: '潜水艇', build: function (ctx) { …; return { frame: function (dt) {}, pause: function () {}, resume: function () {} }; } })
     （pause / resume 可以不写：切回「实验」时调用 pause，再切回这个情境时调用 resume）
   ctx（build 时给场景用）：
     ctx.T           THREE
     ctx.scene / ctx.camera / ctx.renderer      已经放好灯光（天光 + 太阳，带阴影）和地面阴影
     ctx.orb         轨道视角 { az, el, dist, minEl, maxEl, minAz, maxAz, minDist, maxDist }；ctx.target 看向的点；ctx.view() 按 orb 摆相机
     ctx.drag = { start(ev) → true 表示由场景接管拖动, move(ev), end() }；没接管时拖空白处转视角
     ctx.pick(ev, objs) / ctx.onPlane(ev, plane) / ctx.toScreen(vec3)
     ctx.tag(id, html, vec3, { side, gap, small }) 3D 标签：side = 'above' | 'below' | 'left' | 'right'（标签放在点的哪一边），
         gap = 离开这个点的像素距离（> 4 时自动画一条细引线指回这个点），small = true 用小号标签；vec3 为 null 隐藏。
         标签之间会自动错开，也会避开 ctx.keepClear 登记的区域。
         不写第 4 个参数 = { side: 'above', gap: 16, small: true }（小号、放在点上方、自动避让）；
         第 4 个参数写 false = 老写法（标签下边缘中点对准 vec3，不避让）
     ctx.keepClear(id, vec3, 半径像素) 登记“不能被标签挡住”的地方（要观察的像、光路的关键点、指针……）；vec3 为 null 取消
     ctx.note(文字) 舞台左下角的一行操作提示（如“拖动鱼叉瞄准”）；操作提示写在这里，不要做成画面里的标签
     ctx.spot(id, vec3) 在能拖的地方画一个一闪一闪的小圆点（配合 ctx.note 用）；vec3 为 null 隐藏
     ctx.panel(html)  写右栏（可多次调用重写）；ctx.$(sel) 在右栏里找元素
     ctx.host        舞台上的场景层（可放 2D 小窗：<div class="ls-win">）
     ctx.dirty()     请求重画（有动画时 frame 返回 true 也会一直重画）
   出错不白屏：build / frame 里出的错会记下来，舞台上显示一行红字，「检查画面」里也会列出来。
   「检查画面」：场景右下角的小按钮（register 时写 done: true 就不显示；网站自带的场景都写了）。点开列出画面问题
     （标签太多、压住要看的东西或物体、主体太小、出画、有水没剖开、能拖却没提示、右栏是空的、报错……），
     底下一段文字可以复制给 AI 照着改。LabScene.check() 返回同样的问题列表。
   「检查画面」还会查物理：画了力的箭头（LabParts.arrow）的物体，停着不动却受力不平衡；箭头在画面上太短；
     右栏、标签里的术语和课本不一致（如人看水里的东西时把水里的角叫成“折射角”）。物理数值用 LabPhysics（physics.js）算。
   frame(dt)：dt 是真实经过的秒数（最多 1 秒，机器慢时会比较大），场景里的动画、水泵、转视角都按 dt 或真实时间算，不按帧数算。
   场景进行时 body 加 ls-active：顶栏里实验台的读数先藏起来（scenes.css）。
   右栏可用的样式：.ls-blk 块、.ls-h 块标题、.ls-row 一行、.ls-btns 按钮组（button.on 选中、button.main 主按钮）、
     .ls-big 大号读数（<b>数</b><i>单位</i>）、.ls-note 一句结论、.ls-tip 小字提示、input.rng 滑杆（同实验页）。
   样子二（沉浸舞台）时右边 496px 是浮动面板、上面 92px 是顶栏：取景自动避开（和 lab.js 一致）。 */
var LabScene = (function () {
  var REG = {}, ORDER = [];
  function register(id, def) { REG[id] = def; def.id = id; if (ORDER.indexOf(id) < 0) ORDER.push(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mount(o) {
    var ids = ORDER.filter(function (id) { return REG[id].no === o.no; });
    if (!ids.length || !window.THREE || !o.stage || !o.rail) return null;
    var stage = o.stage, rail = o.rail, cur = null, live = {};
    var sw = document.createElement('div'); sw.className = 'ls-sw';
    sw.innerHTML = '<button data-s="" class="on">实验</button>' + ids.map(function (id) { return '<button data-s="' + id + '">' + esc(REG[id].name) + '</button>'; }).join('');
    stage.appendChild(sw);
    ['pointerdown', 'wheel'].forEach(function (n) { sw.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
    var host = document.createElement('div'); host.className = 'ls-host'; host.hidden = true; stage.appendChild(host);
    var rp = document.createElement('div'); rp.className = 'ls-rail'; rp.hidden = true; rail.appendChild(rp);
    sw.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
      go(b.getAttribute('data-s') || null);
    });
    function go(id) {
      if (cur === id) return;
      if (cur && live[cur]) live[cur].pause();
      cur = id;
      [].forEach.call(sw.children, function (b) { b.classList.toggle('on', (b.getAttribute('data-s') || null) === id); });
      stage.classList.toggle('ls-on', !!id); host.hidden = !id; rp.hidden = !id;
      document.body.classList.toggle('ls-active', !!id);
      [].forEach.call(host.children, function (c) { c.hidden = c.getAttribute('data-s') !== id; });
      [].forEach.call(rp.children, function (c) { c.hidden = c.getAttribute('data-s') !== id; });
      if (id) { if (!live[id]) live[id] = make(REG[id]); live[id].resume(); }
      if (o.onChange) o.onChange(id);
    }
    // 定制里换了样子（沉浸舞台要让开浮动面板）、窗口大小变了：重设画布
    window.addEventListener('resize', function () { if (cur && live[cur]) live[cur].fit(); });
    new MutationObserver(function () { if (cur && live[cur]) setTimeout(live[cur].fit, 0); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    function make(def) {
      var T = window.THREE, api = {};
      var layer = document.createElement('div'); layer.className = 'ls-layer'; layer.setAttribute('data-s', def.id); host.appendChild(layer);
      var canvas = document.createElement('canvas'); canvas.className = 'ls-gl'; layer.appendChild(canvas);
      var tags = document.createElement('div'); tags.className = 'lk-tags ls-tags'; layer.appendChild(tags);
      var leads = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leads.setAttribute('class', 'ls-leads'); layer.insertBefore(leads, tags);
      var noteEl = null, clears = {}, DEFT = { side: 'above', gap: 16, small: true };
      var errs = {}, errEl = null;
      function oops(e) {   // 记下出错，舞台上显示一行红字（不白屏）
        var m = String(e && (e.message || e) || '未知错误').slice(0, 200);
        if (!errs[m]) { errs[m] = 1; if (window.console) console.error('[情境 ' + def.id + ']', e); }
        else errs[m]++;
        if (!errEl) { errEl = document.createElement('p'); errEl.className = 'ls-err'; layer.appendChild(errEl); }
        errEl.textContent = '这个情境的程序出错了：' + m + '（点右下角「检查画面」可以复制给 AI 修）';
      }
      function safe(fn, a) { try { return fn(a); } catch (e) { oops(e); return null; } }
      window.addEventListener('error', function (e) { if (running && e && e.message) oops(e.error || e.message); });
      var pane = document.createElement('div'); pane.setAttribute('data-s', def.id); rp.appendChild(pane);
      var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
      var scene = new T.Scene(), camera = new T.PerspectiveCamera(32, 1, 0.1, 5000), target = new T.Vector3();
      scene.add(new T.HemisphereLight(0xffffff, 0xd8e0ea, 1.1));
      var sun = new T.DirectionalLight(0xffffff, 1.5); sun.position.set(-40, 120, 80); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      var sc = sun.shadow.camera; sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150; sc.near = 1; sc.far = 600; sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
      scene.add(sun);
      var orb = { az: 0, el: 0.35, dist: 100, minEl: 0.02, maxEl: 1.3, minAz: -1.4, maxAz: 1.4, minDist: 20, maxDist: 400 };
      var W = 1, H = 1, ray = new T.Raycaster(), handle = null, running = false, need = true, last = 0;
      function view() {
        camera.position.set(target.x + orb.dist * Math.cos(orb.el) * Math.sin(orb.az), target.y + orb.dist * Math.sin(orb.el), target.z + orb.dist * Math.cos(orb.el) * Math.cos(orb.az));
        camera.lookAt(target); camera.updateMatrixWorld(); need = true;
      }
      function fit() {
        W = layer.clientWidth; H = layer.clientHeight; if (!W || !H) return;
        renderer.setSize(W, H, false);
        if (document.body.classList.contains('dz-style-stage') && W > 1200) { var rw = W - 496, rh = H - 92; camera.aspect = rw / rh; camera.setViewOffset(rw, rh, 0, -92, W, H); }
        else { camera.aspect = W / H; camera.clearViewOffset(); }
        camera.updateProjectionMatrix(); need = true;
      }
      function local(ev) { var r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }
      function setRay(ev) { var p = local(ev); ray.setFromCamera(new T.Vector2(p.x / W * 2 - 1, -(p.y / H) * 2 + 1), camera); return ray; }
      var ctx = {
        T: T, scene: scene, camera: camera, renderer: renderer, target: target, orb: orb, sun: sun, host: layer, def: def,
        view: view, fit: fit, local: local, drag: null,
        dirty: function () { need = true; },
        pick: function (ev, objs) { setRay(ev); var h = ray.intersectObjects(objs, true); return h.length ? h[0] : null; },
        onPlane: function (ev, plane) { setRay(ev); var p = new T.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; },
        toScreen: function (v) { var p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z }; },
        tag: function (id, html, v, opt) {
          if (opt == null) opt = DEFT; else if (opt === false) opt = null;   // 不写参数 = 小号、上方、自动避让；false = 老写法
          var t = tags.querySelector('[data-tag="' + id + '"]');
          if (!t) { t = document.createElement('div'); t.className = 'lk-tag'; t.setAttribute('data-tag', id); tags.appendChild(t); }
          if (html != null && t._h !== html) { t.innerHTML = html; t._h = html; }
          t._o = opt || null; if (opt) t.style.transform = 'none'; else if (t.style.transform === 'none') t.style.transform = '';
          t.classList.toggle('ls-tag2', !!opt); t.classList.toggle('ls-sm', !!(opt && opt.small));
          if (!v || html === '') { t.style.display = 'none'; return t; }
          var s = ctx.toScreen(v); t.style.display = s.z < 1 ? '' : 'none';
          if (opt) { t._ax = s.x; t._ay = s.y; }
          else { t.style.left = s.x + 'px'; t.style.top = s.y + 'px'; }   // 不带参数：和以前一样
          return t;
        },
        spot: function (id, v) {
          var d = tags.querySelector('[data-spot="' + id + '"]');
          if (!d) { d = document.createElement('div'); d.className = 'ls-spot'; d.setAttribute('data-spot', id); tags.appendChild(d); }
          if (!v) { d.style.display = 'none'; return d; }
          var s = ctx.toScreen(v); d.style.left = s.x + 'px'; d.style.top = s.y + 'px'; d.style.display = s.z < 1 ? '' : 'none'; return d;
        },
        keepClear: function (id, v, r) { if (v) clears[id] = { v: v.clone(), r: r || 30 }; else delete clears[id]; },
        note: function (html) {
          if (!noteEl) { noteEl = document.createElement('p'); noteEl.className = 'ls-hint'; layer.appendChild(noteEl); }
          html = html || ''; if (noteEl._h !== html) { noteEl.innerHTML = html; noteEl._h = html; } noteEl.style.display = html ? '' : 'none';
        },
        panel: function (html) { pane.innerHTML = html; },
        $: function (sel) { return pane.querySelector(sel); },
        $$: function (sel) { return [].slice.call(pane.querySelectorAll(sel)); },
        rail: pane
      };
      // 指针：场景先拿（ctx.drag.start 返回 true），否则转视角；滚轮缩放
      var mode = null, lp = null;
      canvas.addEventListener('pointerdown', function (ev) {
        if (ctx.drag && ctx.drag.start && ctx.drag.start(ev)) mode = 'obj'; else { mode = 'orbit'; lp = { x: ev.clientX, y: ev.clientY }; }
        canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); need = true;
      });
      canvas.addEventListener('pointermove', function (ev) {
        var k = canvas.getBoundingClientRect().width / W || 1;
        if (mode === 'obj') { ctx.drag.move(ev); need = true; }
        else if (mode === 'orbit') {
          orb.az = Math.max(orb.minAz, Math.min(orb.maxAz, orb.az - (ev.clientX - lp.x) * 0.005 / k));
          orb.el = Math.max(orb.minEl, Math.min(orb.maxEl, orb.el + (ev.clientY - lp.y) * 0.004 / k));
          lp = { x: ev.clientX, y: ev.clientY }; view();
        } else if (ctx.drag && ctx.drag.hit) canvas.style.cursor = ctx.drag.hit(ev) ? 'grab' : '';
      });
      canvas.addEventListener('pointerup', function () { if (mode === 'obj' && ctx.drag.end) ctx.drag.end(); mode = null; canvas.style.cursor = ''; need = true; });
      canvas.addEventListener('wheel', function (ev) { ev.preventDefault(); orb.dist = Math.max(orb.minDist, Math.min(orb.maxDist, orb.dist * (1 + ev.deltaY * 0.0008))); view(); }, { passive: false });
      // 每一帧：dt 是真实经过的秒数（最多 1 秒），场景按时间算，不按帧数算——机器慢、一秒只画几帧时，
      // 注水、转视角这些也按真实时间走完。浏览器很久不给 requestAnimationFrame 时（页面在后台、无界面浏览器），
      // 由一个 50 ms 的看门狗补帧，免得按钮“点了没反应”。
      var DIR = { above: [0, -1], below: [0, 1], left: [-1, 0], right: [1, 0] };
      var layKey = '';
      function layout() {
        var key = W + ',' + H;
        [].forEach.call(tags.children, function (t) { if (t._o) key += '|' + t.style.display + (t._ax | 0) + ',' + (t._ay | 0) + t._h; });
        Object.keys(clears).forEach(function (k) { var v = clears[k].v; key += '|' + k + v.x.toFixed(2) + v.y.toFixed(2) + v.z.toFixed(2); });
        if (key === layKey) return; layKey = key;
        var boxes = [], cs = [], html = '';
        Object.keys(clears).forEach(function (k) { var c = clears[k], p = ctx.toScreen(c.v); if (p.z < 1) cs.push({ x: p.x, y: p.y, r: c.r }); });
        [].forEach.call(tags.children, function (t) {
          if (!t._o || t.style.display === 'none') return;
          var o = t._o, side = DIR[o.side] ? o.side : 'above', d = DIR[side], gap = o.gap == null ? 18 : o.gap;
          var w = t.offsetWidth, h = t.offsetHeight, ax = t._ax, ay = t._ay, k = 0, x, y;
          function place() {
            var g = gap + k;
            x = side === 'left' ? ax - g - w : side === 'right' ? ax + g : ax - w / 2;
            y = side === 'above' ? ay - g - h : side === 'below' ? ay + g : ay - h / 2;
          }
          function hit() {
            if (boxes.some(function (b) { return x < b.x + b.w + 6 && x + w + 6 > b.x && y < b.y + b.h + 4 && y + h + 4 > b.y; })) return true;
            return cs.some(function (c) { var nx = Math.max(x, Math.min(c.x, x + w)), ny = Math.max(y, Math.min(c.y, y + h)); return (nx - c.x) * (nx - c.x) + (ny - c.y) * (ny - c.y) < c.r * c.r; });
          }
          place(); while (hit() && k < 400) { k += 8; place(); }
          var stg = document.body.classList.contains('dz-style-stage') && W > 1200, R = stg ? W - 496 : W, T0 = stg ? 92 : 0;   // 沉浸舞台：让开右边浮动面板和顶栏
          x = Math.max(4, Math.min(R - w - 4, x)); y = Math.max(T0 + 4, Math.min(H - h - 4, y));
          t.style.left = x + 'px'; t.style.top = y + 'px'; boxes.push({ x: x, y: y, w: w, h: h });
          if (gap + k > 4) {   // 引线：从这个点连到标签边上最近的一点
            var ex = Math.max(x, Math.min(ax, x + w)), ey = Math.max(y, Math.min(ay, y + h));
            html += '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '"/><circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="3"/>';
          }
        });
        if (leads._h !== html) { leads.innerHTML = html; leads._h = html; }
      }
      var ahist = [], aT = 0, aList = [], aListT = 0;
      function trackArrows(now) {   // 每 0.25 秒记一次每个力的箭头的起点（世界坐标），判断受力物体动没动
        if (now - aT < 250) return; aT = now;
        if (now - aListT > 1000) { aListT = now; aList = []; scene.traverse(function (o) { if (o.userData && o.userData.arrow) aList.push(o); }); }
        if (!aList.length) return;
        var snap = new Map(); aList.forEach(function (a) { var u = a.userData.arrow, p = u.from.clone(); if (a.parent) a.parent.localToWorld(p); snap.set(a, p); });
        ahist.push({ t: now, s: snap }); while (ahist.length && now - ahist[0].t > 2000) ahist.shift();
      }
      function tick() {
        if (!running) return;
        trackArrows(performance.now());
        var t = performance.now(), dt = last ? Math.min(1, Math.max(0, (t - last) / 1000)) : 0; last = t;
        var anim = handle && handle.frame ? safe(handle.frame, dt) : false;
        if (anim || need) { renderer.render(scene, camera); need = false; }
        layout();   // 只有标签位置、文字或显示状态变了才重新排
      }
      function loop() { if (!running) return; tick(); requestAnimationFrame(loop); }
      setInterval(function () { if (running && !document.hidden && last && performance.now() - last > 120) tick(); }, 50);
      fit(); handle = safe(def.build, ctx) || {}; view(); fit();
      // 「检查画面」按钮
      var chkBtn = null;
      if (!def.done || /[?&#]check\b/.test(location.href)) {
        chkBtn = document.createElement('button'); chkBtn.className = 'ls-chk'; chkBtn.type = 'button'; chkBtn.textContent = '检查画面';
        chkBtn.addEventListener('click', function () { showCheck(); }); layer.appendChild(chkBtn);
        ['pointerdown', 'wheel'].forEach(function (n) { chkBtn.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
      }
      /* ── 检查画面：把常见毛病列出来，给 AI 一段照着改的话 ── */
      var JARGON = ['参数', '模式', '渲染', '交互', '组件', '模块', '初始化', 'Demo', 'demo', '场景对象'];
      function nameOf(o) { while (o) { if (o.name) return o.name; o = o.parent; } return ''; }
      function isBg(o) { while (o) { if (o.userData && o.userData.bg) return true; o = o.parent; } return false; }
      function check() {
        var out = [];
        function add(lv, msg) { out.push({ lv: lv, msg: msg }); }
        layKey = ''; layout();
        Object.keys(errs).forEach(function (m) { add('出错', '程序报错（出现 ' + errs[m] + ' 次）：' + m); });
        var stg = document.body.classList.contains('dz-style-stage') && W > 1200, VR = stg ? W - 496 : W, VT = stg ? 92 : 0;
        // 所有物体的大小（算主体、背景用）
        var all = new T.Box3(), objs = [];
        scene.traverse(function (o) {
          if (!o.isMesh || !o.visible || !o.geometry) return;
          var p = o.parent, vis = true; while (p) { if (p.visible === false) { vis = false; break; } p = p.parent; }
          if (!vis) return; var mt = Array.isArray(o.material) ? o.material[0] : o.material; if (!mt || mt.visible === false) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          var b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if (b.isEmpty()) return;
          all.union(b); objs.push({ o: o, b: b, m: mt });
        });
        var allR = all.isEmpty() ? 1 : all.getSize(new T.Vector3()).length() / 2;
        objs.forEach(function (q) { q.big = isBg(q.o) || q.b.getSize(new T.Vector3()).length() / 2 > allR * 0.45; });
        // 1. 标签
        var vis = [].filter.call(tags.children, function (t) { return t.classList.contains('lk-tag') && t.style.display !== 'none' && t.offsetWidth; });
        var nm = function (t) { return '「' + t.textContent.trim().slice(0, 16) + '」'; };
        if (vis.length > 4) add('要改', '画面里同时有 ' + vis.length + ' 个标签（' + vis.map(nm).join('') + '），最多 4 个。只标学生要认的东西，其余写到右栏。');
        var rects = vis.map(function (t) { return { t: t, x: t.offsetLeft, y: t.offsetTop, w: t.offsetWidth, h: t.offsetHeight }; });
        for (var i = 0; i < rects.length; i++) for (var j = i + 1; j < rects.length; j++) {
          var a = rects[i], b = rects[j];
          if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) add('要改', '标签' + nm(a.t) + '和' + nm(b.t) + '叠在一起。');
        }
        var cs = Object.keys(clears).map(function (k) { var p = ctx.toScreen(clears[k].v); return { k: k, x: p.x, y: p.y, r: clears[k].r, z: p.z }; });
        rects.forEach(function (r) {
          cs.forEach(function (c) {
            if (c.z >= 1) return;
            var nx = Math.max(r.x, Math.min(c.x, r.x + r.w)), ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
            if ((nx - c.x) * (nx - c.x) + (ny - c.y) * (ny - c.y) < c.r * c.r * 0.8) add('要改', '标签' + nm(r.t) + '压住了登记为不能挡的「' + c.k + '」：换 side 或加大 gap。');
          });
          // 标签底下是不是压着物体（9 个点打射线，背景、地面、水面不算）
          var hitN = {}, rc = new T.Raycaster(), meshes = objs.filter(function (q) { return !q.big && !(q.m.transparent && q.m.opacity < 0.35); }).map(function (q) { return q.o; });
          for (var a2 = 0; a2 < 3; a2++) for (var b2 = 0; b2 < 3; b2++) {
            var px = r.x + r.w * (0.2 + 0.3 * a2), py = r.y + r.h * (0.2 + 0.3 * b2);
            rc.setFromCamera(new T.Vector2(px / W * 2 - 1, -(py / H) * 2 + 1), camera);
            var hs = rc.intersectObjects(meshes, false); if (hs.length) { var n = nameOf(hs[0].object) || '一个物体'; hitN[n] = (hitN[n] || 0) + 1; }
          }
          Object.keys(hitN).forEach(function (n) { if (hitN[n] >= 3) add('要改', '标签' + nm(r.t) + '压在「' + n + '」上：标签放到旁边，用 side / gap，并用 ctx.keepClear 登记这个物体。'); });
          if (r.x < 0 || r.y < VT || r.x + r.w > VR || r.y + r.h > H) add('要改', '标签' + nm(r.t) + '跑出了画面（或被右边面板盖住）。');
        });
        vis.forEach(function (t) { if (/^\s*(拖|按住|点击|点一下|转动)/.test(t.textContent)) add('要改', '标签' + nm(t) + '是操作提示：操作提示不要做成画面里的标签，写到 ctx.note（左下角一行字），能拖的地方用 ctx.spot 画小圆点。'); });
        if (vis.length && !cs.length) add('建议', '没有用 ctx.keepClear 登记“不能被挡住”的地方（像、光路的关键点、指针、液面……），标签不知道该躲开哪里。');
        // 2. 构图：主体（不算背景）在画面里有多大、有没有出画
        var sb = null;
        objs.forEach(function (q) {
          if (q.big) return;
          var b = q.b, xs = [b.min.x, b.max.x], ys = [b.min.y, b.max.y], zs = [b.min.z, b.max.z];
          xs.forEach(function (x) { ys.forEach(function (y) { zs.forEach(function (z) {
            var p = ctx.toScreen(new T.Vector3(x, y, z)); if (p.z >= 1) return;
            if (!sb) sb = { x0: p.x, x1: p.x, y0: p.y, y1: p.y }; else { sb.x0 = Math.min(sb.x0, p.x); sb.x1 = Math.max(sb.x1, p.x); sb.y0 = Math.min(sb.y0, p.y); sb.y1 = Math.max(sb.y1, p.y); }
          }); }); });
        });
        if (!sb) add('要改', '画面里看不到任何物体（相机没对准，或者东西都太大被当成了背景）。');
        else {
          var cw = (Math.min(sb.x1, VR) - Math.max(sb.x0, 0)) / VR, ch = (Math.min(sb.y1, H) - Math.max(sb.y0, VT)) / (H - VT);
          if (cw < 0.35 && ch < 0.35) add('要改', '主体在画面里太小（只占宽度的 ' + Math.round(cw * 100) + '%）：把镜头拉近（ctx.orb.dist 调小），或用 LabParts.frame(ctx, 主体) 自动取景。');
          var outX = Math.max(0, -sb.x0) + Math.max(0, sb.x1 - VR), outY = Math.max(0, VT - sb.y0) + Math.max(0, sb.y1 - H);
          if (outX > VR * 0.12 || outY > (H - VT) * 0.12) add('建议', '有物体跑出了画面边缘，默认视角看不全：镜头拉远一点，或者用 LabParts.frame(ctx, 主体)。');
        }
        // 2b. 力：静止的物体受力要平衡；箭头不能太短
        var arrows = [];
        scene.traverse(function (o) {
          if (!o.userData || !o.userData.arrow || !o.visible) return;
          var p = o.parent; while (p) { if (p.visible === false) return; p = p.parent; }
          var u = o.userData.arrow; if (u.vec.lengthSq() < 1e-12) return;
          var f = u.from.clone(); if (o.parent) o.parent.localToWorld(f);
          var v = u.vec.clone(); if (o.parent) v.transformDirection(o.parent.matrixWorld).multiplyScalar(u.vec.length());
          arrows.push({ o: o, on: u.on, from: f, vec: v });
        });
        if (arrows.length) {
          var tops = scene.children.filter(function (c) { return !(c.userData && c.userData.arrow) && !c.isLight && c.visible && !(c.userData && c.userData.bg); }).map(function (c) { c.updateMatrixWorld(true); return { o: c, b: new T.Box3().setFromObject(c) }; }).filter(function (q) { return !q.b.isEmpty(); });
          var bodies = new Map();
          arrows.forEach(function (a) {
            var body = a.on, inferred = false;
            if (!body) {
              var best = null, bv = Infinity;
              tops.forEach(function (q) { var s = q.b.getSize(new T.Vector3()), bx = q.b.clone().expandByScalar(Math.max(s.x, s.y, s.z) * 0.02); if (bx.containsPoint(a.from)) { var vv = Math.max(1e-9, s.x * s.y * s.z); if (vv < bv) { bv = vv; best = q.o; } } });
              body = best; inferred = true;
            }
            if (!body) return;
            if (!bodies.has(body)) bodies.set(body, { list: [], inferred: inferred });
            bodies.get(body).list.push(a);
          });
          var now = performance.now(), hs = ahist.filter(function (h) { return now - h.t <= 1550; }), span = hs.length > 1 ? hs[hs.length - 1].t - hs[0].t : 0;
          bodies.forEach(function (info, body) {
            var list = info.list; if (info.inferred && list.length < 2) return;
            var still = span >= 600 && list.every(function (a) { var m = 0; hs.forEach(function (h) { var p = h.s.get(a.o); if (p) m = Math.max(m, p.distanceTo(a.from)); }); return m < allR * 0.004; });
            var net = new T.Vector3(), mx = 0; list.forEach(function (a) { net.add(a.vec); mx = Math.max(mx, a.vec.length()); });
            var nm2 = nameOf(body) || '一个物体';
            if (still && net.length() > mx * 0.05) add('要改', '「' + nm2 + '」停着不动，但画在它身上的 ' + list.length + ' 个力加起来不为零（差了最大那个力的 ' + Math.round(net.length() / mx * 100) + '%）。停着不动的物体受力一定平衡：要么它其实还该继续运动（比如上浮到露出水面、最后漂浮，F浮 = G），要么力算错了或少画了一个力（比如沉底时容器底的支持力）。用 LabPhysics.floatSink 等函数算最后停在哪、各个力多大。');
          });
          var amax = 0; arrows.forEach(function (a) { amax = Math.max(amax, a.vec.length()); });
          arrows.forEach(function (a) {
            if (a.vec.length() < amax * 0.3) return;   // 本来就很小的力（如很小的支持力）箭头短是对的
            var p0 = ctx.toScreen(a.from), p1 = ctx.toScreen(a.from.clone().add(a.vec));
            if (p0.z < 1 && p1.z < 1 && Math.hypot(p1.x - p0.x, p1.y - p0.y) < 28) add('建议', '力的箭头「' + (nameOf(a.o) || '箭头') + '」在画面上只有 ' + Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y)) + ' 像素长，看不清：把力的比例调大（同一个场景里所有力用同一个比例，漂浮、悬浮时两个箭头一样长）。');
          });
        }
        // 2c. 课本术语
        var words = pane.textContent + ' ' + vis.map(function (t) { return t.textContent; }).join(' ') + ' ' + (noteEl ? noteEl.textContent : '');
        if (window.LabPhysics && LabPhysics.TERMS) LabPhysics.TERMS.forEach(function (w) { if (words.indexOf(w[0]) >= 0) add('要改', '“' + w[0] + '”不是课本的说法，改成“' + w[1] + '”。'); });
        var intoWater = /看起来|看到的|虚像|变浅|水下|池底|水底|从水斜?射入空气/.test(words) && /折射/.test(words), fromAir = /从空气斜?射入水|射向水面|激光/.test(words) && !/从水斜?射入空气/.test(words);
        if (intoWater && !fromAir && /(水中|水里|水下)的?折射角|(空气中|空气里)的?入射角/.test(words)) add('要改', '人看水里的东西时，光是从水斜射入空气的：水里那个角叫入射角，空气里那个角叫折射角（课本：光从水斜射入空气，折射角大于入射角）。现在右栏或标签里写反了。用 LabPhysics.lookIntoWater 算，名字照它返回的写。');
        if (fromAir && /(水中|水里)的?入射角|(空气中|空气里)的?折射角/.test(words)) add('要改', '光从空气斜射入水时：空气里那个角叫入射角，水里那个角叫折射角。现在右栏或标签里写反了。用 LabPhysics.refract 算，名字照它返回的写。');
        // 3. 水：一大块透明的蓝色平板 = 没剖开，看不到水下
        var flatWater = objs.some(function (q) {
          var m = q.m, s = q.b.getSize(new T.Vector3()), c = m.color;
          return m.transparent && m.opacity < 0.95 && c && c.b > c.r * 1.1 && s.y < 0.06 * Math.max(s.x, s.z) && Math.max(s.x, s.z) > allR * 0.4;
        });
        var cutWater = false; scene.traverse(function (o) { if (o.userData && o.userData.part === 'water') cutWater = true; });
        if (flatWater && !cutWater) add('建议', '水看起来是一整块平板，看不到水面以下：用 LabParts.water({ cut: true }) 把水剖开，让学生看见水下的物体。');
        // 4. 操作提示
        if (ctx.drag && !(noteEl && noteEl._h) && !tags.querySelector('.ls-spot')) add('建议', '画面里有能拖的东西，但没有提示：用 ctx.spot 在能拖的地方画小圆点，用 ctx.note 写一句“拖……”。');
        if (noteEl && noteEl._h && noteEl.textContent.length > 40) add('建议', '左下角的操作提示太长（' + noteEl.textContent.length + ' 个字），一句话说清怎么操作就行。');
        // 5. 右栏
        var txt = pane.textContent.replace(/\s+/g, '');
        if (txt.length < 10) add('要改', '右栏几乎是空的：要有标题、能调的按钮或滑杆、读数和一句结论。');
        if (!pane.querySelector('button, input')) add('要改', '右栏没有能操作的按钮或滑杆，学生只能看。');
        JARGON.forEach(function (w) { if (txt.indexOf(w) >= 0 || (noteEl && noteEl.textContent.indexOf(w) >= 0)) add('建议', '文字里有“' + w + '”这样的术语，换成老师、学生的大白话。'); });
        // 6. 视角、性能
        if (orb.minEl < 0) add('建议', '视角能转到地面以下（ctx.orb.minEl 小于 0），学生会看到穿帮的画面。');
        var tri = renderer.info && renderer.info.render ? renderer.info.render.triangles : 0;
        if (tri > 2500000) add('建议', '画面太重（' + Math.round(tri / 10000) + ' 万个三角面），旧电脑会卡：减少细分段数、实例化重复的小东西。');
        return out;
      }
      function report(out) {
        var head = '【检查画面】情境「' + (def.name || def.id) + '」（文件 scene-' + def.id + '.js，挂在实验 ' + def.no + '）\n';
        if (!out.length) return head + '没有发现问题。再截一张图自己看看：要观察的东西有没有被挡住、像不像实物、默认视角是不是一眼看清重点。';
        return head + out.map(function (q, i) { return (i + 1) + '. [' + q.lv + '] ' + q.msg; }).join('\n') + '\n请逐条改好，只改这个情境文件，改完把完整文件交回来。';
      }
      function showCheck() {
        var out = check(), box = layer.querySelector('.ls-chkbox');
        if (!box) {
          box = document.createElement('div'); box.className = 'ls-chkbox'; layer.appendChild(box);
          ['pointerdown', 'wheel'].forEach(function (n) { box.addEventListener(n, function (ev) { ev.stopPropagation(); }); });
          box.addEventListener('click', function (ev) {
            var b = ev.target.closest ? ev.target.closest('button') : null; if (!b) return;
            if (b.getAttribute('data-a') === 'x') box.hidden = true;
            else if (b.getAttribute('data-a') === 'copy') {
              var ta = box.querySelector('textarea'); ta.select();
              var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
              if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { b.textContent = '已复制'; }, function () {});
              b.textContent = ok ? '已复制' : '已选中，按 Ctrl+C 复制';
            } else if (b.getAttribute('data-a') === 'again') showCheck();
          });
        }
        box.hidden = false;
        var lvC = { '出错': 'e', '要改': 'w', '建议': 'i' };
        box.innerHTML = '<h3>检查画面 <small>' + (out.length ? '发现 ' + out.length + ' 处' : '没发现问题') + '</small></h3>' +
          (out.length ? '<ol>' + out.map(function (q) { return '<li class="' + lvC[q.lv] + '"><b>' + q.lv + '</b>' + esc(q.msg) + '</li>'; }).join('') + '</ol>' : '<p class="ok">标签、构图、右栏都没发现问题。</p>') +
          '<p class="tip">把下面这段复制给 AI，它会照着改：</p><textarea readonly>' + esc(report(out)) + '</textarea>' +
          '<div class="bt"><button type="button" data-a="copy" class="main">复制给 AI</button><button type="button" data-a="again">再查一次</button><button type="button" data-a="x">关闭</button></div>';
        return out;
      }
      api.check = function () { return check(); }; api.report = function () { return report(check()); };
      api.fit = fit;
      api.pause = function () { running = false; if (handle.pause) safe(handle.pause); };
      api.resume = function () { fit(); if (!running) { running = true; last = 0; need = true; tick(); requestAnimationFrame(loop); } if (handle.resume) safe(handle.resume); };
      api.ctx = ctx;
      return api;
    }
    var M = { go: go, current: function () { return cur; }, live: live };
    mounts.push(M);
    return M;
  }
  var mounts = [];
  // 测试用：LabScene.check() → 当前打开的情境的问题列表；LabScene.report() → 给 AI 的那段话
  function curLive() { for (var i = 0; i < mounts.length; i++) { var c = mounts[i].current(); if (c && mounts[i].live[c]) return mounts[i].live[c]; } return null; }
  return { register: register, mount: mount, REG: REG,
    check: function () { var l = curLive(); return l ? l.check() : null; },
    report: function () { var l = curLive(); return l ? l.report() : null; }, live: curLive };
})();
