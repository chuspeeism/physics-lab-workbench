# 网站地图：什么内容在哪里

## 1. 两种形态

| 形态 | 文件 | 什么时候用 |
|---|---|---|
| **单文件版** | `物理实验工作台.html`（约 7 MB） | 老师日常用的就是它，双击打开。改它就行。 |
| 网站文件夹版 | `网站/`：`index.html`、`教学设计.html`、`01-…html` ～ `22-…html`、`拓展-光的折射.html`、`assets/…` | 内容和单文件版一样，只是拆成了很多文件。老师给的是文件夹（或文件夹里的某个文件），就改文件夹里的文件。 |

### 单文件版的结构

文件里有三段数据（都在开头的 `<script>` 里）：

```
var PAGES = { "index.html": "…整页 HTML…", "教学设计.html": "…", "13-探究浮力大小与哪些因素有关.html": "…", … };
var RES   = { "assets/data.js": "…", "assets/lab/lab.js": "…", "assets/lab/exp13.js": "…", "assets/site.js": "…", "assets/mistakes.js": "…", … };
var IMG   = { "assets/shots/13-stage.jpg": "data:image/jpeg;base64,…", … };
```

- 页面里用 `<!--@js:assets/lab/exp13.js-->`、`<!--@css:assets/lab/lab.css-->` 这样的占位符引用 RES 里的脚本和样式；打开时自动拼回去。
- 这三段都是 JSON 字符串：里面的引号写成 `\"`，换行写成 `\n`，反斜杠写成 `\\`，`</` 写成 `<\/`；单引号和中文不转义。**改的时候只替换要改的那几个字，转义原样保留。**新加的文字里有双引号、换行、反斜杠或 `</` 的，也要照这样写。
- 搜索时直接搜要改的文字或变量名（例如搜 `金属块浸在水里的部分越来越多`、`var F = 10,`），找到唯一的那一处再改。要搜的片段里有双引号时，按转义后的样子搜：data.js 里的 `"no": "13"` 在单文件里是 `\"no\": \"13\"`。
- 一份脚本（比如 `assets/data.js`）在 RES 里只存一份，所有页面共用：**改一处，用到它的页面都会变**。
- 要新加一个情境脚本（例如 `assets/lab/scene-ship.js`）：**用 `python scripts/add_scene.py scene-ship.js`**（会同时改好 RES 和那一页的 PAGES，并核对）。不能运行 Python 时才手动：在 RES 里加一个键值，再在对应页面的 HTML 字符串里、`<!--@js:assets/lab/physics.js-->`（有情境脚本就在最后一个情境脚本）后面加 `<!--@js:assets/lab/scene-ship.js-->`。脚本内容里不能出现 `</script`（写成 `<\/script`）。
- 07 凸透镜页的样式和大部分脚本直接写在页面里（就在 `PAGES` 的 `07-探究凸透镜成像的规律.html` 这一个字符串中），只有 `my-changes.js`、`backup.js`、`scenes.js`、`scene-camera.js` 等少数几个在 RES 里。

## 2. 内容在哪

| 想改的东西 | 在哪里 | 说明 |
|---|---|---|
| 实验名称、课本出处、简介、关键词 | `assets/data.js` → `LAB.exps[]` 里 `no` 为实验编号的那一项：`title`、`bookName`、`chapter`、`section`、`figs`、`desc`、`kw`。拓展页「光的折射」在 `LAB.extras[]` 里，`no` 是 `F1`，只有 5 道题 | 首页卡片、实验页顶栏、教学设计页都读这里 |
| **边做边问的题目、答案** | 同上，`qs[]`：每题 `{ q: 题目, start: 这题开始时器材怎么摆（给老师看的说明）, a: 答案 }` | 实验页底栏和教学设计页「课堂顺序」都读这一份，改一处两边同步。07 凸透镜例外，见第 4 节 |
| 每题给学生的提示 | 同上，`guide[]`：`{ task: 怎么做, keep: 保持不变的, watch: 看什么 }`，和 `qs[]` 一一对应 | 实验页右栏「当前任务」 |
| 教学设计三张卡片 | 同上，`cards.hook / cards.ladder / cards.pit`：每张 `[标题, 正文, 流程一句]` | 教学设计页「三步上好这节课」 |
| 教学设计详细版 | 同上，`teaching`（只有 05、06、07、14～20 有；其他实验为 null，F1 没有这一项）：`summary`、`timeline`、`hooks`、`ladder`、`pits`、`conclusion`、`extension` | 课堂顺序、坑的演示等 |
| 实验结论 | 同上，`conclusion` | 按课本表述 |
| 记录表表头 | 同上，`table` | 数据页 |
| 器材、读数说明 | 同上，`device`、`reads`、`note` | 说明文字 |
| **实验的物理数值、器材、3D 模型、判断逻辑** | `assets/lab/expNN.js`（NN 是实验编号，07 除外；拓展页是 `expF1.js`） | 数值位置见 `params.md`。exp13.js、exp15.js 和 07 页开头有 `var CFG = {`（参数区），只管外观（光源图案、金属块形状、液体颜色、灯泡样式、导线颜色、情境小卡片），改它就是改文件里的默认样子 |
| 电学实验公用的电路、电表 | `assets/lab/circuit.js` | 15～20 共用，改它会影响 6 个实验 |
| **错题集** | `assets/mistakes.js` → `LAB_MISTAKES.items`（自带的易错点）、`LAB_MISTAKES.mine`（老师自己的） | 文件开头写了格式：`{ no: '13', src: 1, tag: '结论', wrong, why, right, demo }`，`no` 是 01～22，`src` 是用第几题演示（第 1 题写 0，不演示写 null），`tag` 只能是 操作 / 读数 / 数据处理 / 结论 / 考法。老师的错题**只加到 `mine`**，不动 `items`（只有改了实验数值时，items 里对应的读数才跟着改，见 `params.md`） |
| 生活情境（3D 场景） | `assets/lab/scenes.js`（框架）+ `assets/lab/parts.js`（零件库）+ `assets/lab/physics.js`（物理计算）+ `assets/lab/scene-xxx.js`（每个场景一个文件） | 做法见 `scenes.md`，零件见 `parts.md`，物理计算见 `physics.md`，模板 `scene-template.js`，示范 `examples/scene-egg.js` |
| 实验页的框架：顶栏、右栏、底栏、老师工具、定制、改题目、记错题 | `assets/lab/lab.js`、`assets/lab/lab.css` | 除 07 以外的 21 个实验页和拓展页共用，改它影响全部这些页面，非必要不动。07 页里有自己的一份（定制面板和配色规则内容相同，改一处要同步另一处） |
| 首页、教学设计页、错题集页、使用说明 | `assets/site.js`、`assets/site.css` | 使用说明在 `site.js` 的 `renderHelp`，配图在 `assets/guide/` |
| 首页卡片截图、课本章节配图 | `assets/shots/`、`assets/toc/`（单文件版在 `IMG` 里） | |

## 3. 外观

- 颜色都写成变量，在 `assets/lab/lab.css` 开头的 `:root`：`--ink` 文字和线条、`--t2`/`--t3` 次要文字、`--line` 边框、`--bg` 页面底、`--blue` 主色（按钮、选中）、`--blue-l` 主色浅底、`--green` 正确、`--warn` 警示、`--obs` 观察/光线橙。
- 定制面板里的三种样子和配色：`lab.css` 末尾的 `body.dz-style-<样子>.dz-theme-<配色>` 规则，配色列表在 `lab.js` 的 `PALS`（每种样子 6 种，都测过看得清）：
  - 坐标纸：亮蓝（默认）、墨蓝、青绿、暖橙、紫、玫红；
  - 沉浸舞台：紫雾（默认）、晴空、薄荷、蜜桃、暮蓝、樱粉；
  - 手绘本：蓝墨水（默认）、绿墨水、紫墨水、铅笔、青墨水、黑钢笔·方格纸。
- 老师只想换颜色时，先告诉他「老师工具 → 定制」里有现成的（面板最上面还能选「改哪里：只改这个实验 / 所有实验」）；要新的配色，可以照现有规则新加一组（`PALS` 和 `lab.css` 规则两处都加），或直接改 `:root` 的变量。07 页里有同样的 `PALS`、配色规则和 `:root`，要一起改。
- 表示物理意义的颜色不随配色改：光线、力的箭头、电流、`--green`（正确）、`--warn`（警示）、`--obs`。
- 首页和教学设计页的颜色在 `assets/site.css` 开头的 `:root`（`--blue` 主色、`--ink` 文字等），「定制」管不到这两页。老师说“整体换成某种颜色”时，lab.css、07 页、site.css 三处的 `:root` 都要改。
- 数据页图像、部分 3D 贴图里的文字颜色直接写在 expNN.js 里（如 `fill="#1E3A5F"` 这类深蓝字），改 `:root` 管不到；它们是深色字配白底，一般不用动。
- 看得清：文字/按钮与背景的对比度 ≥ 4.5。

## 4. 07 凸透镜成像（特殊）

07 是单独写成的一整页：`07-探究凸透镜成像的规律.html`（单文件版里在 `PAGES` 中），样式、脚本、题目都在这一页里。

- 题目在页面里的 `var QS = [ { n, q, task, keep, watch, start: { source, screen }, ans }, … ]`；`start` 是这题开始时光源、光屏的刻度位置（cm），透镜固定在 40 cm。
- 物理数值（焦距等）见 `params.md` 的 07 一节。
- 07 也有一份 `data.js` 里的 `qs`（教学设计页用）。改 07 的题目时，两处都改。

## 5. 网页里改、存在浏览器里的内容（不在文件里）

老师在网页上用「定制」「改题目」「改教案」「记错题」改的东西（还有首页的收藏），存在浏览器的 localStorage 里，文件不变：

| 内容 | 存的位置 |
|---|---|
| 定制（样子、配色、字、器材名字） | `physlab.diy.all`（所有实验）、`physlab.diy.NN`（单个实验） |
| 改过的题目 | `physlab.qs.NN`：`{ list: [{ o: 原来第几题(从0数，新加的为null), src: 用原来第几题的器材摆放, q, a, task, watch, keep }] }` |
| 改过的教案、我的教案 | `physlab.teach.NN`；附件在 IndexedDB `physlab` 的 `files` 表 |
| 上课记的错题 | `physlab.err`：`[{ id, no, src: 原来第几题(从0数), q: 题目, said: 学生说的话, cls: 班级, t }]`；上次填的班级存在 `physlab.err.cls` |
| 收藏的实验 | `physlab.fav` |

网页里有「备份修改」（首页右上角；实验页「老师工具 → 备份我的修改」），能把上面这些内容导出成一个 `.json` 文件，换电脑时再导入。文件长这样：`{ "app": "物理实验工作台", "kind": "我的修改", "ver": 1, "time": …, "local": { "physlab.qs.13": "……", … }, "files": [ { id, no, name, type, t, data: "data:…;base64,…" } ] }`（`local` 里每个值都是原样的字符串）。

**老师想把网页里改的内容写进文件（长期保留、发给同事）时：**

1. 请老师点「备份修改 → 导出到文件」，把导出的 `.json` 文件发给你。老师只是口头说了改动、没有文件时，就照他说的直接改 `data.js` 里对应实验的 `qs` / `guide`（07 还有页面里的 `QS`）。
2. 有导出文件时，**不要逐条去改 `data.js`**。把整个文件内容原样放进 `assets/my-changes.js` 的 `window.PHYSLAB_BUILTIN = null;` 这一行，替换掉 `null`，末尾分号保留。
   - 文件夹版改 `assets/my-changes.js` 这个文件。
   - 单文件版改 `RES` 里 `assets/my-changes.js` 这段字符串。导出文件本身就带很多 `\"`（`local` 里每个值都是字符串），放进单文件要再转义一层：先把每个 `\` 写成 `\\`，再把每个 `"` 写成 `\"`，换行写成 `\n`，`</` 写成 `<\/`。能运行程序时，最稳的做法是读出这段字符串、把 `null` 换成导出内容、再整体按 JSON 字符串写回（Python 用 `json.dumps(…, ensure_ascii=False)`，再把 `</` 换成 `<\/`）。改完确认页面能打开。
3. 每个页面打开时最先加载 `my-changes.js`。每台电脑第一次打开就会自动用上这些修改：题目顺序、新加的题、教案、定制、错题、附件都会照原样恢复。之后老师再在网页里改、点「改回原样」，都照常生效。
4. 老师又导出了新的修改文件，就整个替换 `PHYSLAB_BUILTIN` 的内容。内容变了，每台电脑会再应用一次。
5. 回答里用大白话列出这份文件里有什么（哪几个实验改了题目、加了几条错题……）。可以从 `local` 的键名看出来：`physlab.qs.NN` 是改了题目，`physlab.teach.NN` 是改了教案，`physlab.diy.*` 是定制，`physlab.err` 是错题，`physlab.fav` 是收藏。
6. 写进文件以后，老师自己这台电脑的浏览器里本来就有这些修改，看不出区别；请老师换一个浏览器（或发给同事）打开，确认修改都在。

## 6. 实验页的网址参数

- `13-探究浮力大小与哪些因素有关.html#q=3`：打开浮力实验并直接翻到原来的第 3 题（错题集「到实验台演示」用的就是它）。
- 单文件版换页时是 `物理实验工作台.html?p=页面名&q=参数#hash`。
