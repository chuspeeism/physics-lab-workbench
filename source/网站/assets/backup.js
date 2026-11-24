/* 「备份我的修改」：把老师在网页里改的内容导出成一个文件，换电脑、换浏览器时再导入；也可以把文件交给 AI 助手，让它写进网站文件。
   导出的内容（都在本机浏览器里）：
     localStorage  physlab.diy.*（定制）、physlab.qs.*（改题目）、physlab.teach.*（改教案）、physlab.err / physlab.err.cls（记错题）、physlab.fav（收藏）
     IndexedDB     physlab / files（改教案里加的附件，转成 data: 地址存进文件）
   不导出：physlab.recent、physlab.view、physlab.q（最近打开、视图、搜索词这类界面状态）。
   文件格式：{ app: "物理实验工作台", kind: "我的修改", ver: 1, time, local: { 键: 原样的字符串 }, files: [{ id, no, name, type, t, data }] }
   导入：文件里有的键覆盖本机同名的键（错题按条合并、不重复）；文件里没有的键不动；附件按 id 写入。导入后刷新页面。
   入口：window.PhysBackup.open()（实验页「老师工具 → 备份我的修改」、首页和教学设计页顶栏「备份修改」）。 */
(function () {
  if (window.PhysBackup) return;
  var KEEP = /^physlab\.(diy\.|qs\.|teach\.|err$|err\.cls$|fav$)/;

  function keys() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && KEEP.test(k)) out.push(k); } } catch (e) { }
    return out.sort();
  }
  function idb(fn, fail) {
    try {
      var r = indexedDB.open('physlab', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files', { keyPath: 'id' }); };
      r.onsuccess = function () { fn(r.result); };
      r.onerror = function () { if (fail) fail(); };
    } catch (e) { if (fail) fail(); }
  }
  function allFiles(cb) {
    idb(function (db) {
      var out = [];
      try {
        db.transaction('files').objectStore('files').openCursor().onsuccess = function (ev) {
          var cu = ev.target.result; if (cu) { out.push(cu.value); cu.continue(); } else cb(out);
        };
      } catch (e) { cb(out); }
    }, function () { cb([]); });
  }
  function toData(blob, cb) { try { var fr = new FileReader(); fr.onload = function () { cb(fr.result); }; fr.onerror = function () { cb(null); }; fr.readAsDataURL(blob); } catch (e) { cb(null); } }
  function fromData(url) {
    var m = /^data:([^;,]*)(;base64)?,(.*)$/.exec(url || ''); if (!m) return null;
    var s = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new Blob([u], { type: m[1] || 'application/octet-stream' });
  }
  function parse(v) { try { return JSON.parse(v); } catch (e) { return null; } }

  /* 统计：改过哪些（给老师看的一句话） */
  function summary(local, nFiles) {
    var qs = 0, te = 0, diy = 0, err = 0, fav = 0;
    Object.keys(local).forEach(function (k) {
      if (/^physlab\.qs\./.test(k)) qs++;
      else if (/^physlab\.teach\./.test(k)) te++;
      else if (/^physlab\.diy\./.test(k)) diy++;
      else if (k === 'physlab.err') { var a = parse(local[k]); err = Array.isArray(a) ? a.length : 0; }
      else if (k === 'physlab.fav') { var f = parse(local[k]); fav = Array.isArray(f) ? f.length : 0; }
    });
    var parts = [];
    if (qs) parts.push('改过题目的实验 ' + qs + ' 个');
    if (te) parts.push('改过教案的实验 ' + te + ' 个');
    if (diy) parts.push('定制 ' + diy + ' 处');
    if (err) parts.push('记的错题 ' + err + ' 条');
    if (nFiles) parts.push('教案附件 ' + nFiles + ' 个');
    if (fav) parts.push('收藏 ' + fav + ' 个');
    return parts;
  }
  function localNow() { var o = {}; keys().forEach(function (k) { try { o[k] = localStorage.getItem(k); } catch (e) { } }); return o; }

  function today() { var d = new Date(); function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

  function doExport(done) {
    var local = localNow();
    allFiles(function (files) {
      var out = [], left = files.length;
      function finish() {
        var pack = { app: '物理实验工作台', kind: '我的修改', ver: 1, time: new Date().toISOString(), local: local, files: out };
        var blob = new Blob([JSON.stringify(pack, null, 1)], { type: 'application/json' });
        var name = '物理实验工作台-我的修改-' + today() + '.json';
        try {
          if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, name); }
          else {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
          }
          done(true, name, summary(local, out.length));
        } catch (e) { done(false); }
      }
      if (!left) return finish();
      files.forEach(function (f) {
        toData(f.blob, function (url) {
          if (url) out.push({ id: f.id, no: f.no, name: f.name, type: f.type, t: f.t, data: url });
          if (--left === 0) finish();
        });
      });
    });
  }

  function readPack(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var p = parse(fr.result);
      if (!p || p.app !== '物理实验工作台' || !p.local || typeof p.local !== 'object') return cb(null);
      cb(p);
    };
    fr.onerror = function () { cb(null); };
    fr.readAsText(file, 'utf-8');
  }
  function doImport(p, done) {
    var n = 0;
    Object.keys(p.local).forEach(function (k) {
      if (!KEEP.test(k) || typeof p.local[k] !== 'string') return;
      var v = p.local[k];
      if (k === 'physlab.err') {   // 错题按条合并：本机已有的保留，文件里新的加进来，相同的不重复
        var mine = parse(localStorage.getItem(k)), add = parse(v);
        if (Array.isArray(mine) && Array.isArray(add)) {
          var seen = {}; mine.forEach(function (x) { seen[JSON.stringify(x)] = 1; });
          add.forEach(function (x) { if (!seen[JSON.stringify(x)]) { mine.push(x); seen[JSON.stringify(x)] = 1; } });
          v = JSON.stringify(mine.slice(0, 500));
        }
      }
      try { localStorage.setItem(k, v); n++; } catch (e) { }
    });
    var files = Array.isArray(p.files) ? p.files : [];
    if (!files.length) return done(n);
    idb(function (db) {
      try {
        var tx = db.transaction('files', 'readwrite'), st = tx.objectStore('files');
        files.forEach(function (f) { var b = fromData(f.data); if (b && f.id) st.put({ id: f.id, no: f.no, name: f.name, type: f.type, blob: b, t: f.t || Date.now() }); });
        tx.oncomplete = function () { done(n); }; tx.onerror = function () { done(n); };
      } catch (e) { done(n); }
    }, function () { done(n); });
  }

  /* ── 弹窗 ── */
  var CSS = '.pb-mask{position:fixed;inset:0;z-index:99999;background:rgba(20,30,45,.38);display:flex;align-items:center;justify-content:center;padding:16px;' +
    'font-family:"PingFang SC","Microsoft YaHei","Source Han Sans SC","Noto Sans SC","Noto Sans CJK SC",sans-serif;color:#1E3A5F}' +
    '.pb-box{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:12px;box-shadow:0 18px 50px rgba(20,30,45,.25);padding:24px 24px 20px;box-sizing:border-box}' +
    '.pb-box h3{margin:0 0 8px;font-size:22px;font-weight:700}' +
    '.pb-box p{margin:0 0 12px;font-size:15px;line-height:1.7;color:#4A5A6E}' +
    '.pb-now{margin:0 0 16px;padding:10px 14px;border-radius:8px;background:#F4F7FB;font-size:15px;line-height:1.7;color:#1E3A5F}' +
    '.pb-acts{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}' +
    '.pb-acts button{font:inherit;font-size:16px;height:44px;padding:0 18px;border-radius:8px;cursor:pointer;border:1.5px solid var(--blue,var(--on-fill,#2563EB));background:#fff;color:var(--blue,var(--on-fill,#2563EB))}' +
    '.pb-acts button.pri{background:var(--blue,var(--on-fill,#2563EB));color:#fff}' +
    '.pb-acts button.gh{border-color:#C3CEDC;color:#4A5A6E;margin-left:auto}' +
    '.pb-msg{margin:14px 0 0;font-size:15px;line-height:1.7}.pb-msg.ok{color:#1B7A50}.pb-msg.bad{color:#C1361A}' +
    '.pb-msg:empty{display:none}';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function open() {
    if (!document.getElementById('pb-css')) { var s = el('style'); s.id = 'pb-css'; s.textContent = CSS; document.head.appendChild(s); }
    var old = document.querySelector('.pb-mask'); if (old) old.remove();
    var mask = el('div', 'pb-mask'), box = el('div', 'pb-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<h3>备份我的修改</h3>' +
      '<p>在网页里改的题目、教案、定制和记的错题，只存在这台电脑的这个浏览器里。导出成一个文件，换电脑、换浏览器时导入就能接着用；也可以把这个文件交给 AI 助手，让它写进网站文件，发给同事也能看到。</p>' +
      '<div class="pb-now" id="pb-now">正在统计……</div>' +
      '<div class="pb-acts"><button class="pri" id="pb-exp" type="button">导出到文件</button><button id="pb-imp" type="button">从文件导入</button><button class="gh" id="pb-x" type="button">关闭</button></div>' +
      '<p class="pb-msg" id="pb-msg"></p>' +
      '<input type="file" id="pb-file" accept=".json,application/json" hidden>';
    mask.appendChild(box); document.body.appendChild(mask);
    function $(id) { return box.querySelector('#' + id); }
    function msg(t, ok) { var m = $('pb-msg'); m.textContent = t; m.className = 'pb-msg ' + (ok ? 'ok' : 'bad'); }
    function close() { mask.remove(); document.removeEventListener('keydown', esc); }
    function esc(ev) { if (ev.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });
    $('pb-x').onclick = close;
    allFiles(function (fs) {
      var parts = summary(localNow(), fs.length);
      $('pb-now').textContent = parts.length ? '这台电脑上现在有：' + parts.join('，') + '。' : '这台电脑上还没有在网页里改过的内容。';
    });
    $('pb-exp').onclick = function () {
      doExport(function (ok, name, parts) {
        if (ok) msg('已导出「' + name + '」' + (parts && parts.length ? '（' + parts.join('，') + '）' : '（目前还没有改动）') + '。在浏览器的下载文件夹里能找到。', true);
        else msg('导出没有成功。请换用新版 Chrome 或 Edge 再试。', false);
      });
    };
    $('pb-imp').onclick = function () { $('pb-file').value = ''; $('pb-file').click(); };
    $('pb-file').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      readPack(f, function (p) {
        if (!p) return msg('这个文件不是「物理实验工作台」导出的修改文件，没有导入。', false);
        var parts = summary(p.local, (p.files || []).length);
        var acts = box.querySelector('.pb-acts');
        acts.innerHTML = '<button class="pri" id="pb-ok" type="button">确定导入</button><button class="gh" id="pb-no" type="button">取消</button>';
        msg('文件里有：' + (parts.length ? parts.join('，') : '没有改动') + '。导入后，同一个实验的题目、教案、定制会换成文件里的；错题会合并在一起，不会重复。', true);
        $('pb-no').onclick = close;
        $('pb-ok').onclick = function () {
          this.disabled = true;
          doImport(p, function () { msg('导入好了，正在刷新页面……', true); setTimeout(function () { location.reload(); }, 900); });
        };
      });
    };
    $('pb-exp').focus();
  }

  window.PhysBackup = { open: open, exportNow: doExport, importPack: doImport };
})();
