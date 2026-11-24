# -*- coding: utf-8 -*-
"""把一个生活情境（scene-xxx.js）接进物理实验工作台——单文件版和文件夹版一起接，接完自己核对。

用法（在技能包目录里运行；也可以用 --root 指定技能包目录）：
  python scripts/add_scene.py 情境文件.js                  接进去（同名情境已存在就更新它）
  python scripts/add_scene.py 情境文件.js --out 新文件名.html   单文件版另存一份，不改原文件
  python scripts/add_scene.py --list                       列出现在有哪些情境、挂在哪一页
  python scripts/add_scene.py --remove 情境id               把一个情境拿掉（只拿掉豆包 / 老师自己加的，网站自带的拿不掉）

老师给了自己的文件（老师上次交回的单文件版）：
  python scripts/add_scene.py 情境文件.js --single 老师的文件.html      只改老师这个文件（不动技能包里的文件夹版）
  python scripts/add_scene.py --list --single 老师的文件.html            看老师的文件里已经有哪些情境

可选：--single 单文件路径（默认 assets/物理实验工作台.html）  --folder 网站文件夹（默认 source/网站）
     --no-folder 只改单文件版  --no-single 只改文件夹版
     --out 新文件名.html：单文件版另存为新文件、原文件不动（文件夹版照常更新；只想另存单文件就再加 --no-folder）

它会做的事：
  1. 读情境文件里的 LabScene.register('id', { no: 'NN', name: '…' })，按 no 找到要挂的实验页（13、F1……）；
  2. 单文件版：在 RES 里放进脚本（自动转义），在那一页的 PAGES 里、parts.js / physics.js 后面加一行 <!--@js:…-->；
  3. 文件夹版：把脚本复制到 assets/lab/，在那一页 HTML 里加一行 <script src="…">；
  4. 第一次改单文件时，先把原文件备份成「原文件名-原始备份.html」；
  5. 改完重新读一遍核对：脚本在、那一页只引用了一次、情境 id 没有和别的情境重名；电脑上有 node 的话再查一遍语法。
"""
import argparse, json, os, re, shutil, subprocess, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BUILTIN = {'camera', 'sub', 'generator', 'fish', 'chopstick'}   # 网站自带的情境
ANCHORS = ['assets/lab/physics.js', 'assets/lab/parts.js', 'assets/lab/scenes.js']


def say(*a):
    print(*a)


def fail(msg):
    print('没有接成：' + msg)
    sys.exit(1)


def js_str(obj):
    return json.dumps(obj, ensure_ascii=False).replace('</', '<\\/')


def read_obj(text, var):
    k = text.index('var %s = ' % var) + len('var %s = ' % var)
    obj, end = json.JSONDecoder().raw_decode(text, k)
    return obj, k, end


def write_obj(text, var, obj):
    _, k, end = read_obj(text, var)
    return text[:k] + js_str(obj) + text[end:]


def scene_info(src):
    m = re.search(r"LabScene\.register\(\s*['\"]([A-Za-z0-9_-]+)['\"]\s*,\s*\{([\s\S]{0,400})", src)
    if not m:
        return None
    body = m.group(2)
    no = re.search(r"no:\s*['\"]([^'\"]+)['\"]", body)
    nm = re.search(r"name:\s*['\"]([^'\"]+)['\"]", body)
    return {'id': m.group(1), 'no': no.group(1) if no else None, 'name': nm.group(1) if nm else m.group(1)}


def find_page(pages, no):
    """按实验编号找页面：先看 <body data-no="NN">，再看文件名开头（07 手写页）。"""
    for key, html in pages.items():
        if re.search(r'data-no=\\?"%s\\?"' % re.escape(no), html) or re.search(r"data-no=\"%s\"" % re.escape(no), html):
            return key
    for key in pages:
        if key.startswith(no + '-'):
            return key
    return None


def insert_after_scripts(html, line, kind):
    """在这一页最后一个情境脚本后面插入；没有情境脚本就插在 physics.js / parts.js / scenes.js 后面。"""
    if kind == 'single':
        pat = lambda p: r'<!--@js:%s-->' % re.escape(p)
        scenes = list(re.finditer(r'<!--@js:assets/lab/scene-[A-Za-z0-9_-]+\.js-->', html))
    else:
        pat = lambda p: r'<script src="%s(\?[^"]*)?"></script>' % re.escape(p)
        scenes = list(re.finditer(r'<script src="assets/lab/scene-[A-Za-z0-9_-]+\.js(\?[^"]*)?"></script>', html))
    pos = scenes[-1].end() if scenes else None
    if pos is None:
        for a in ANCHORS:
            m = re.search(pat(a), html)
            if m:
                pos = m.end(); break
    if pos is None:
        return None
    return html[:pos] + '\n' + line + html[pos:]


def all_scene_ids(res):
    out = {}
    for key, src in res.items():
        if re.match(r'assets/lab/scene-[A-Za-z0-9_-]+\.js$', key):
            info = scene_info(src)
            if info:
                out[info['id']] = (key, info)
    return out


def node_check(path):
    node = shutil.which('node')
    if not node:
        return None
    r = subprocess.run([node, '--check', path], capture_output=True, text=True)
    return (r.returncode == 0, (r.stderr or '').strip().splitlines()[:3])


def main():
    ap = argparse.ArgumentParser(description='把生活情境接进物理实验工作台')
    ap.add_argument('scene', nargs='?', help='情境文件 scene-xxx.js')
    ap.add_argument('--root', default=None, help='技能包目录（默认：这个脚本上一级目录）')
    ap.add_argument('--single', default=None)
    ap.add_argument('--folder', default=None)
    ap.add_argument('--out', default=None, help='单文件版另存为（不改原文件）')
    ap.add_argument('--no-folder', action='store_true')
    ap.add_argument('--no-single', action='store_true')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--remove', default=None, help='要拿掉的情境 id')
    a = ap.parse_args()

    root = a.root or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    single = a.single or os.path.join(root, 'assets', '物理实验工作台.html')
    folder = a.folder or os.path.join(root, 'source', '网站')
    use_single = not a.no_single and os.path.isfile(single)
    # 指定了老师的单文件、又没指定文件夹：只改老师的文件
    use_folder = not a.no_folder and os.path.isdir(folder) and not (a.single and not a.folder)
    if not use_single and not use_folder:
        fail('找不到单文件版（%s）也找不到网站文件夹（%s），请用 --single / --folder 指定。' % (single, folder))

    text = open(single, encoding='utf-8').read() if use_single else None
    res = read_obj(text, 'RES')[0] if use_single else {}
    pages = read_obj(text, 'PAGES')[0] if use_single else {}

    # ── 列出
    if a.list:
        if not use_single:
            fail('--list 需要单文件版')
        ids = all_scene_ids(res)
        if not ids:
            say('现在没有生活情境。')
        for sid, (key, info) in sorted(ids.items(), key=lambda x: x[1][1]['no'] or ''):
            pg = [p for p in pages if '<!--@js:%s-->' % key in pages[p]]
            say('「%s」 id=%s 挂在实验 %s → %s%s' % (info['name'], sid, info['no'], pg[0] if pg else '（没有页面引用！）', '（网站自带）' if sid in BUILTIN else ''))
        return

    # ── 拿掉
    if a.remove:
        sid = a.remove
        if sid in BUILTIN:
            fail('「%s」是网站自带的情境，不在这里拿掉。' % sid)
        done = []
        if use_single:
            ids = all_scene_ids(res)
            if sid in ids:
                key = ids[sid][0]
                del res[key]
                for p in pages:
                    pages[p] = re.sub(r'\n?<!--@js:%s-->' % re.escape(key), '', pages[p])
                text = write_obj(write_obj(text, 'RES', res), 'PAGES', pages)
                out = a.out or single
                open(out, 'w', encoding='utf-8').write(text); done.append('单文件版 ' + out)
        if use_folder:
            for f in os.listdir(folder):
                if f.endswith('.html'):
                    p = os.path.join(folder, f); h = open(p, encoding='utf-8').read()
                    h2 = re.sub(r'\n?<script src="assets/lab/scene-%s\.js(\?[^"]*)?"></script>' % re.escape(sid), '', h)
                    if h2 != h:
                        open(p, 'w', encoding='utf-8').write(h2); done.append('文件夹版 ' + f)
        say('已拿掉情境 %s：%s' % (sid, '；'.join(done) if done else '没找到这个情境'))
        return

    # ── 接进去
    if not a.scene or not os.path.isfile(a.scene):
        fail('请给出情境文件，例如：python scripts/add_scene.py scene-ship.js')
    src = open(a.scene, encoding='utf-8').read()
    info = scene_info(src)
    if not info:
        fail('情境文件里没找到 LabScene.register(\'id\', { no: …, name: … })。')
    if not info['no']:
        fail('register 里没有写 no（挂在哪个实验，例如 no: \'13\'）。')
    sid, no = info['id'], info['no']
    if '</script' in src.lower():
        fail('脚本里出现了 </script，要写成 <\\/script。')
    chk = node_check(a.scene)
    if chk and not chk[0]:
        fail('脚本有语法错误：' + ' '.join(chk[1]))
    key = 'assets/lab/scene-%s.js' % sid
    report = []

    if use_single:
        ids = all_scene_ids(res)
        if sid in ids and ids[sid][0] != key:
            fail('情境 id「%s」已经被 %s 用了，换一个 id。' % (sid, ids[sid][0]))
        if sid in BUILTIN and res.get(key) != src:
            fail('「%s」是网站自带情境的 id，换一个 id（例如 %s2）。' % (sid, sid))
        page = find_page(pages, no)
        if not page:
            fail('单文件版里找不到实验 %s 的页面（no 写对了吗？例如 \'13\'、\'07\'、\'F1\'）。' % no)
        updating = key in res
        res[key] = src
        marker = '<!--@js:%s-->' % key
        if marker not in pages[page]:
            h = insert_after_scripts(pages[page], marker, 'single')
            if h is None:
                fail('页面 %s 里找不到 scenes.js，没法挂情境。' % page)
            pages[page] = h
        text = write_obj(write_obj(text, 'RES', res), 'PAGES', pages)
        out = a.out or single
        if not a.out:
            bak = os.path.splitext(single)[0] + '-原始备份.html'   # 例：物理实验工作台-原始备份.html
            if not os.path.exists(bak):
                shutil.copy(single, bak); report.append('原文件已备份为 ' + os.path.basename(bak))
        open(out, 'w', encoding='utf-8').write(text)
        # 核对
        t2 = open(out, encoding='utf-8').read(); r2 = read_obj(t2, 'RES')[0]; p2 = read_obj(t2, 'PAGES')[0]
        ok = r2.get(key) == src and p2[page].count(marker) == 1 and sum(1 for p in p2 if marker in p2[p]) == 1
        dup = [k for k, (kk, inf) in all_scene_ids(r2).items() if k == sid and kk != key]
        if not ok or dup:
            fail('写完核对没通过（脚本或页面引用不对），原文件%s没被覆盖。' % ('' if a.out else '已备份、'))
        report.append('单文件版：%s「%s」→ 页面 %s（%s）' % ('更新了' if updating else '接上了', info['name'], page, os.path.basename(out)))

    if use_folder:
        lab = os.path.join(folder, 'assets', 'lab'); os.makedirs(lab, exist_ok=True)
        open(os.path.join(lab, 'scene-%s.js' % sid), 'w', encoding='utf-8').write(src)
        target = None
        for f in sorted(os.listdir(folder)):
            if not f.endswith('.html'):
                continue
            h = open(os.path.join(folder, f), encoding='utf-8').read()
            if re.search(r'data-no="%s"' % re.escape(no), h) or f.startswith(no + '-'):
                target = f; break
        if not target:
            report.append('文件夹版：脚本已复制，但没找到实验 %s 的页面，没加引用' % no)
        else:
            p = os.path.join(folder, target); h = open(p, encoding='utf-8').read()
            tag = '<script src="assets/lab/scene-%s.js"></script>' % sid
            if not re.search(r'<script src="assets/lab/scene-%s\.js(\?[^"]*)?"></script>' % re.escape(sid), h):
                h2 = insert_after_scripts(h, tag, 'folder')
                if h2 is None:
                    report.append('文件夹版：页面 %s 里找不到 scenes.js，没加引用' % target)
                else:
                    open(p, 'w', encoding='utf-8').write(h2); report.append('文件夹版：页面 %s 加了引用' % target)
            else:
                report.append('文件夹版：页面 %s 已经引用过，脚本已更新' % target)

    say('情境「%s」（id=%s，挂在实验 %s）' % (info['name'], sid, no))
    for r in report:
        say('  - ' + r)
    if chk is None:
        say('  - 这台电脑没有 node，没查语法；打开网页切到情境、点「检查画面」看有没有「出错」。')
    say('下一步：打开单文件版 → 进实验 %s → 左上角切到「%s」→ 点右下角「检查画面」。' % (no, info['name']))


if __name__ == '__main__':
    main()
