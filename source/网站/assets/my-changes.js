/* 写进网站文件的「我的修改」。
   老师在网页里改好题目、教案、定制、错题以后，用「备份修改 → 导出到文件」得到一个 .json 文件。
   把那个文件的全部内容原样放到下面 PHYSLAB_BUILTIN = 后面（替换 null），网站文件就自带这些修改：
   换电脑、发给同事，打开就是改好的样子。
   规则：每台电脑第一次打开时应用一次（内容变了会再应用一次）；之后老师在网页里接着改、点「改回原样」都照常生效。
   这个文件在每个页面的最前面加载，不要挪到别的脚本后面。 */
window.PHYSLAB_BUILTIN = null;

(function () {
  var B = window.PHYSLAB_BUILTIN;
  if (!B || typeof B !== 'object' || !B.local || typeof B.local !== 'object') return;
  var KEEP = /^physlab\.(diy\.|qs\.|teach\.|err$|err\.cls$|fav$)/;
  var s = JSON.stringify(B), h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  var mark = 'v' + h + '-' + s.length;
  try { if (localStorage.getItem('physlab.builtin') === mark) return; } catch (e) { return; }
  function parse(v) { try { return JSON.parse(v); } catch (e) { return null; } }
  Object.keys(B.local).forEach(function (k) {
    var v = B.local[k];
    if (!KEEP.test(k) || typeof v !== 'string') return;
    if (k === 'physlab.err') {   // 错题按条合并，不重复
      var mine = parse(localStorage.getItem(k)), add = parse(v);
      if (Array.isArray(mine) && Array.isArray(add)) {
        var seen = {}; mine.forEach(function (x) { seen[JSON.stringify(x)] = 1; });
        add.forEach(function (x) { if (!seen[JSON.stringify(x)]) { mine.push(x); seen[JSON.stringify(x)] = 1; } });
        v = JSON.stringify(mine.slice(0, 500));
      }
    }
    try { localStorage.setItem(k, v); } catch (e) { }
  });
  try { localStorage.setItem('physlab.builtin', mark); } catch (e) { }
  var files = Array.isArray(B.files) ? B.files : [];
  if (!files.length) return;
  try {
    var r = indexedDB.open('physlab', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('files', { keyPath: 'id' }); };
    r.onsuccess = function () {
      try {
        var st = r.result.transaction('files', 'readwrite').objectStore('files');
        files.forEach(function (f) {
          var m = /^data:([^;,]*)(;base64)?,(.*)$/.exec(f.data || ''); if (!m || !f.id) return;
          var raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), u = new Uint8Array(raw.length);
          for (var j = 0; j < raw.length; j++) u[j] = raw.charCodeAt(j);
          st.put({ id: f.id, no: f.no, name: f.name, type: f.type, blob: new Blob([u], { type: m[1] || 'application/octet-stream' }), t: f.t || Date.now() });
        });
      } catch (e) { }
    };
  } catch (e) { }
})();
