# 零件库 LabParts（搭生活情境用）

做 3D 生活情境时，**先用零件拼，零件没有的再自己造型**。零件是从网站已有情境里拆出来的，精细程度和网站一致；自己用方块、圆柱拼出来的东西会显得很粗糙。

- 文件：`assets/lab/parts.js`（每个实验页都已经加载，在 `scenes.js` 后面）。单文件版里在 `RES` 的 `"assets/lab/parts.js"`。
- 在场景里这样拿：`var P = LabParts, V = P.V;`
- 每个零件返回一个 3D 物体，自己 `ctx.scene.add(…)`，再设 `.position`、`.rotation`。人比较特殊：要 add 的是 `p.root`。
- **尺寸推荐 1 个单位 = 1 厘米**（人默认 170 高、桌子 75 高、烧杯半径 5）。大东西（船、池塘）可以把尺寸缩小，在右栏写“示意图，大小不按比例”。
- 零件都有中文名字，地面、桌面、水面、树这类背景件带 `userData.bg = true`：「检查画面」会说“标签压在「鱼」上”，压在背景上的不算问题。

## 场景整体

| 写法 | 作用 |
|---|---|
| `P.studio(ctx, { kind: 'room' })` | 环境反光，金属、玻璃、水才有高光。`kind`：`'room'` 室内（默认）、`'outdoor'` 室外、`'sea'` 海上。**每个场景开头调一次** |
| `P.frame(ctx, [物体…], { az, el, pad, turn })` | **自动取景**：镜头对准这些东西、距离刚好装下、阴影范围调好、转动范围限制在 ±`turn`（默认 0.7）以内。`az` 左右角度（0 = 正前方，正数往右转）、`el` 抬高角度（0.2～0.4 常用）、`pad` 越小镜头越近。列表里也可以放 `new THREE.Box3(最小点, 最大点)` 指定要装下的范围 |
| `P.fitShadow(ctx, 中心, 半径)` | 单独调阴影范围（`frame` 已经调过） |

## 材质 `P.mat`

`wood({ color, dark })` 木头　`metal({ color, rough })` 金属　`plastic(颜色)` 塑料　`rubber(颜色)` 橡胶　`paint(颜色)` 漆面　`ceramic({ color, pattern: 'blue' })` 陶瓷（青花）　`glass({ tint, opacity })` 玻璃　`water({ color, opacity })` 水　`fabric(颜色)` 布　`skin(颜色)` 皮肤　`paper(颜色)` 纸　`ground('grass' | 'sand' | 'soil')` 地面

## 自己造型的工具

| 写法 | 适合做什么 |
|---|---|
| `P.lathe([[半径, 高度], …], 材质, { seg, smooth: true, axis, name })` | **回转体**：瓶子、杯子、灯泡、鱼身、炮弹、陀螺、透镜。点从下往上列，半径为 0 的点在轴上；`smooth: true` 让轮廓变圆滑；`axis: 'x'` 横过来 |
| `P.roundBox(宽, 高, 深, 圆角, 材质, { name })` | 带圆角的方块：木块、手机、电池盒、箱子（中心在原点） |
| `P.extrude([[x, y], …], 厚度, 材质, { bevel, name })` | 平面图形挤出来：支架、侧面轮廓、标牌 |
| `P.tube([V(…), V(…), …], 半径, 材质, { closed, name })` | 沿曲线的管子：导线、绳子、水管、弹簧（点排成螺旋） |
| `P.rod(a, b, 半径, 材质)` / `P.setRod(物体, a, b)` | 两点之间的圆棒（杆、腿、支架）；`setRod` 每帧改两端 |
| `P.tex(宽, 高, function (g, w, h) { … }, [重复x, 重复y])` | 用 canvas 画贴图：刻度、文字、花纹 |
| `P.rng(种子)` | 可重复的随机数（每次打开都一样） |

例：一个矿泉水瓶
```js
var bottle = P.lathe([[0.001, 0], [3.2, 0], [3.3, 0.4], [3.3, 15], [2.6, 18.5], [1.3, 20], [1.3, 21.5], [0.001, 21.5]], P.mat.glass({ tint: 0xDDF2FF }), { smooth: true, name: '水瓶' });
```

## 背景

| 写法 | 说明 |
|---|---|
| `P.table({ w, d, h, color })` | 桌子，桌面高 `h`（默认 75），东西放在 `y = h` 上 |
| `P.surface({ w, d, kind: 'desk' \| 'wood' })` | 边缘淡出的台面：实验桌上的小场景（烧杯、小车）用它，不会出现生硬的桌边 |
| `P.floor({ w, d, kind: 'wood' \| 'tile' })` | 地板 |
| `P.ground({ w, d, kind: 'grass' \| 'sand' \| 'soil', grass: 棵数 })` | 一块地；草地带一根根草 |
| `P.tree({ h })`、`P.rock({ r, seed, color })`、`P.reed({ h, seed })` | 树、石头、芦苇 |
| `P.weed({ h, seed })` | 水草，每帧 `.sway(时间)` 会飘 |
| `P.backdrop({ kind, r, h })` | **远景背景**：场景后面一块弧形的画，底边和两边淡出。`kind`：`'outdoor'` 天空远山草地、`'sea'` 天空海平线、`'room'` 屋里墙和窗、`'classroom'` 黑板窗户、`'kitchen'` 瓷砖橱柜、`'lab'` 实验室。放法：`bd.position.set(场景中心 x, 地面或水面高度, 场景中心 z)`，`r` 取场景宽度的 1.5～2 倍、`h` 取 r 的一半。**画面背后空荡荡（只有坐标纸）时加一个** |

## 水和容器

**`P.water({ w, d, depth, cut: true, soil, bottom, color })`——剖开的一块水**
- 水面在 `y = 0`，水底在 `y = −depth`；x 方向宽 `w`，z 方向深 `d`。
- 朝 `+z` 的一面剖开（越深越蓝、有斜射下来的光、顶上一条亮线就是水面），**镜头放在 +z 一侧看**（`P.frame` 的 `az` 在 −0.7～0.7 之间）。
- 水下的东西透过剖面看得清清楚楚；`soil: 厚度` 在水底下再剖出一层土；`bottom: 'sand' | 'mud' | 'none'`。
- 每帧调用 `water.update(时间)` 水面就会轻轻起伏。
- 池塘、河、海、游泳池都用它。岸边用 `P.roundBox` 做一块土（材质 `P.mat.ground('soil')`），上面铺 `P.ground`。

**容器**（底都在 `y = 0`；`.setLevel(高度)` 改水位；水的物体是 `.water`；`.userData.bottom` 是杯里面的底有多高）

| 写法 | 说明 |
|---|---|
| `P.beaker({ r, h, level, marks })` | 烧杯，刻度按真实体积画（单位 mL，半径、高度按厘米）；`.mlAt(水面高)`、`.levelFor(毫升)` 互算 |
| `P.cup({ r, h, level })` | 玻璃杯 |
| `P.bowl({ r, h, level, pattern: 'blue' })` | 碗（可带青花） |
| `P.tank({ w, d, h, level })` | 玻璃水槽 / 鱼缸，里面的水是剖开的 |

## 人和动物

**`P.person({ height, shirt, pants, skin, hat: 'straw' | 'cap' | null, crouch, look, handL, handR })`**
- 脚底在 `y = 0`、面朝 `+x`；用 `p.root.position`、`p.root.rotation.y` 摆位置和朝向。
- `p.set({ crouch: 0～1, look: 看的点, handL: 左手放到的点, handR: 右手放到的点, lean: 前倾角度 })`——点都用世界坐标；手臂自动弯好。不给 `handL / handR` 手就自然下垂。
- **`p.eye()` 是眼睛的位置**：光路、“人眼看到”的线从这里画。`p.handPos('R')` 是右手的位置（让人拿东西：把东西摆到手的位置）。

**`P.hand({ skin, sleeve, size, hold })`**：一截手臂和手，画面里只需要露出手时用（提着杆秤的提纽、拿着杯子、按开关）。`.set(手肘, 手腕)` 摆位置；`hold: true`（默认）握拳拿东西、`false` 张开；`.grip()` 是手心的位置，把要拿的东西摆到这里。要画整个人用 `P.person`。

**`P.fish({ len, color: 'gold' | 'gray' | 'red', ghost })`**：鱼，头朝 `−x`。`ghost: true` 是半透明、带浅蓝光边的“看到的鱼（像）”。每帧 `.swim(时间)` 摆尾。

## 物体

| 写法 | 说明 |
|---|---|
| `P.boat({ len, beam, depth, color, cabin })` | 船，船头朝 `+x`；船身在 `y = 0`（甲板）到 `y = −depth`（船底）之间。`.floatAt(水面高度, 吃水深度)` 摆到吃水这么深；`.cargo(箱数)` 甲板上摆几箱货（最多 `.slots` 个）；吃水多深用 `LabPhysics.floatSink({ G, rho, shape: { type: 'box', A: 水线面积, h: 船身高 } }).depth` 算（船身近似成长方体，在右栏写“示意”） |
| `P.crate({ w, h, d, color, kind: 'container' \| 'wood' })` | 货箱 / 木箱（底在 `y = 0`） |
| `P.block({ w, h, d, mat })`、`P.ball({ r, color })`、`P.egg({ r })` | 物块、小球、鸡蛋（底在 `y = 0`） |

## 物理标记

| 写法 | 说明 |
|---|---|
| `P.arrow({ color, r, on, name })` | 力的箭头。每帧 `.set(起点, 力的向量)`，`.tip()` 是箭头尖（标签挂这里）。默认画在最上层，水、玻璃挡不住。**`on` 写受力的物体**（`on: egg`），「检查画面」会查它停着不动时受力是否平衡；`name` 写“浮力”“重力”，报告里用 |
| `P.ray({ color, r, dashed })` | 光线（中间带箭头），`.set(a, b)`。`dashed: true` 是虚线：反向延长线、法线 |
| `P.arc({ color, r })` | 角的圆弧，`.set(顶点, 半径, 方向1, 方向2)` |
| `P.C` | 统一的颜色：`force` 浮力 / 拉力（橙）、`gravity` 重力（红）、`support` 支持力（绿）、`ray` 光线、`back` 反向延长线、`normal` 法线 |

力的箭头长短要和力的大小成正比（同一个场景用同一个比例），漂浮、悬浮时两个箭头一样长；力的大小用 `LabPhysics` 算（`references/physics.md`）。

## 常见拼法

- **水里有东西、岸上有人看**（池塘、河边）：`P.water({ soil })` + 岸（`P.roundBox` 土块 + `P.ground`）+ `P.person` + 水里的物体 + `P.ray` 画光路（从水里的物体到水面上的折射点，再到 `p.eye()`）。
- **实验桌上的小实验**（烧杯、鸡蛋、小车、弹簧）：`P.surface` + 容器 / 物块 + `P.arrow`，`P.frame` 对准容器，留出箭头的位置。示范：`references/examples/scene-egg.js`。
- **浮在水上的东西**（船、木块、救生圈）：`P.water` + 物体，吃水深度按 F浮 = G 算出来，用 `.floatAt` 或直接设 `position.y`；超出能浮的范围就下沉，沉到水底时 `y` 不再变。
- **屋里的场景**（台灯、电路、家电）：`P.floor` + `P.table` + 自己造型的电器 + `P.tube` 导线。
