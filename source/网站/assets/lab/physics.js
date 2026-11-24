/* ════ 物理计算 LabPhysics（生活情境用，2026-11-23）════
   情境里的物理数值都从这里算，不要自己推公式——自己推最容易出错（例：潜水艇上浮后没算到漂浮；筷子插水把水里的角叫成折射角）。
   按课本知识点分组；单位一律用国际单位（m、kg、N、Pa、s、V、A、Ω、W、J、℃），角度用“度”。
   每个函数返回一个对象，里面的名字就是课本的叫法（state: '漂浮'、入射角、折射角、性质: '倒立、缩小的实像'……），
   右栏、标签直接用这些字，不要自己改叫法。说明在 references/physics.md。

   常数：LabPhysics.g（默认 10 N/kg，课本练习的取法；要 9.8 就改它）、.RHO 密度、.C 比热容、.Q 热值、.N 折射率、
         .P0 标准大气压、.V_SOUND 声速、.V_LIGHT 光速、.MELT 熔点、.BOIL 沸点
   工具：.approach(当前, 目标, dt, 快慢) 让数值平滑地走向目标；.sci(数, 单位) 写成 1.50×10⁷ N；.fmt(数, 位数)

   ── 密度、浮力、浮沉 ──
   density({ m, V, rho })   已知两个求第三个
   buoyancy(ρ液, V排)       F浮 = ρ液 g V排
   floatSink({ m 或 G, V, rho, shape })   放进液体后**最后停在哪**：
        state = '漂浮' | '悬浮' | '沉底'（最后的状态）；process = '上浮' | '下沉' | ''（浸没后松手的瞬间往哪走）
        Fb 浮力、G 重力、N 容器底的支持力（沉底时 N = G − F浮）、Vsub 排开的体积、frac 浸入的比例、depth 浸入的深度（给了 shape 才有）
        shape：{ type: 'box', h } 长方体 / 竖直圆柱（底面积 × 高）；{ type: 'sphere', r }；{ type: 'spheroid', a, c }（横半径 a、竖半轴 c，鸡蛋）；
               { type: 'hcyl', r, L }（横躺的圆柱，潜水艇、木头）；{ type: 'fn', vol: function (浸入深度) { return 体积; }, h: 总高 }
        **漂浮时一定有一部分露出液面，F浮 = G；上浮只是过程，停下来就是漂浮。**
   submergedDepth(V排, shape)   排开这么多体积时，浸入多深

   ── 压强 ──
   pressure({ F, S, p })    p = F / S（已知两个求第三个）
   liquidPressure(ρ, h)     p = ρ g h（h 是到液面的竖直深度）
   atm：P0 = 1.013×10⁵ Pa（≈ 760 mm 水银柱），粗算取 1×10⁵ Pa

   ── 杠杆、滑轮、功和机械效率、运动 ──
   lever({ F1, L1, F2, L2 })   动力 × 动力臂 = 阻力 × 阻力臂，缺哪个求哪个；type = '省力杠杆' | '费力杠杆' | '等臂杠杆'
   torques([{ F, d }, …])      一根杠杆上的几个力（d 带正负：支点左边为负、右边为正，F 向下为正）：
        sum（合力矩，右边下沉为正）、tilt = '平衡' | '左端下沉' | '右端下沉'
   pulley({ G, n, Gm, h })     滑轮组：n 段绳子吊着动滑轮，F = (G + G动) / n，绳子自由端移动 s = n h，机械效率
   work(F, s) / power(W, t)    W = F s，P = W / t
   speed({ s, t, v })          v = s / t
   balance([力向量…])          几个力（{x, y} 或 THREE.Vector3）加起来是不是零：{ net, balanced }

   ── 光 ──
   reflect(入射角)              反射角 = 入射角
   mirrorImage(点, 镜面上一点, 镜面法线)   平面镜成像：像和物关于镜面对称（等大、正立、虚像）
   refract({ from, to, angle })   光从 from 射入 to（'空气' | '水' | '玻璃'），angle 是入射角（在 from 里，和法线的夹角）。
        返回 { 入射角, 折射角, 入射介质, 折射介质, 偏折: '靠近法线' | '偏离法线' | '不偏折', total: 是否全反射（课本不讲，出现就换个角度） }
   lookIntoWater({ eye, obj, n })   **人在空气里看水里的东西**（叉鱼、筷子、池底、硬币）。eye、obj 是竖直剖面里的点 {x, y}，水面 y = 0。
        光从物体经水面上的折射点射入人眼：入射角在水里、折射角在空气里（课本：光从水斜射入空气，折射角大于入射角）。
        返回 { P: 折射点, 入射角, 折射角, image: 看到的像（虚像）的位置, apparentDepth: 看起来的深度, realDepth }
   apparentDepth(真实深度, 视线和竖直方向的夹角, n)   看起来的深度（从正上方看 = 真实深度 / n）
   lens({ f, u, h })            凸透镜成像：v（像距，虚像为负）、像高、放大率 m、性质（'倒立、缩小的实像'……）、像和物同侧还是异侧、
                                 区间（'u > 2f'……）、应用（'照相机' | '投影仪' | '放大镜'）、成像不成像（u = f 不成像）

   ── 电 ──
   ohm({ U, I, R })             欧姆定律，缺哪个求哪个
   series(R 列表, U) / parallel(R 列表, U)   串联、并联：总电阻、电流、各电阻的电压 / 电流
   power({ U, I, R, P })        电功率 P = U I = I²R = U²/R
   lamp(额定电压, 额定功率, 实际电压)   小灯泡：电阻（按不变算）、实际功率、亮度 '不亮' | '很暗' | '较暗' | '正常发光' | '比正常亮'
   electricEnergy(P, t)         W = P t（J），.kWh 千瓦时
   jouleHeat(I, R, t)           Q = I²R t
   induction({ closed, cutting, speedRel, dirSign })   感应电流：有没有、相对大小、方向
   ac(峰值, 频率, t)            交流电在 t 时刻的值（正弦）
   electromagnet({ I, turns, core })   电磁铁磁性强弱（相对值 + 说法）

   ── 热 ──
   heat({ c, m, dT, Q })        Q = c m Δt，缺哪个求哪个
   fuelHeat(q, m)               Q = q m
   phase(物质, 温度, '吸热'|'放热')  '固态' | '液态' | '气态'；在熔点、沸点时按课本说（加热中在沸点是“正在沸腾”，熔点处要看在吸热还是放热）
   mixTemp([{ c, m, t }, …])     几份液体混合后的温度（不计热损失）

   ── 声 ──
   echo({ d } 或 { t }, v)      回声：t = 2d / v（v 默认 340 m/s） */
var LabPhysics = (function () {
  var Ph = {}, DEG = Math.PI / 180;
  Ph.g = 10;
  Ph.RHO = { 水: 1.0e3, 纯水: 1.0e3, 海水: 1.03e3, 盐水: 1.1e3, 酒精: 0.8e3, 煤油: 0.8e3, 汽油: 0.71e3, 植物油: 0.9e3, 水银: 13.6e3,
    冰: 0.9e3, 蜡: 0.9e3, 干松木: 0.5e3, 铁: 7.9e3, 钢: 7.9e3, 铜: 8.9e3, 铝: 2.7e3, 铅: 11.3e3, 金: 19.3e3, 银: 10.5e3, 玻璃: 2.5e3, 空气: 1.29 };
  Ph.C = { 水: 4.2e3, 冰: 2.1e3, 酒精: 2.4e3, 煤油: 2.1e3, 蓖麻油: 1.8e3, 沙石: 0.92e3, 干泥土: 0.84e3, 铝: 0.88e3, 铁: 0.46e3, 钢: 0.46e3, 铜: 0.39e3, 水银: 0.14e3 };
  Ph.Q = { 干木柴: 1.2e7, 无烟煤: 3.4e7, 焦炭: 3.0e7, 酒精: 3.0e7, 柴油: 4.3e7, 汽油: 4.6e7, 煤油: 4.6e7, 氢: 1.4e8 };
  Ph.N = { 空气: 1.0, 水: 1.33, 玻璃: 1.5 };          // 课本不讲折射率的数值，这里是常用值
  Ph.P0 = 1.013e5; Ph.V_SOUND = 340; Ph.V_LIGHT = 3e8;
  Ph.MELT = { 水: 0, 冰: 0, 海波: 48, 水银: -39, 酒精: -117, 铁: 1535, 铜: 1083, 铝: 660, 钨: 3410 };
  Ph.BOIL = { 水: 100, 酒精: 78, 水银: 357 };

  function num(x) { return typeof x === 'number' && isFinite(x); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function bisect(f, lo, hi, n) { var flo = f(lo); for (var k = 0; k < (n || 80); k++) { var m = (lo + hi) / 2, fm = f(m); if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; }
  Ph.approach = function (cur, target, dt, rate) { return cur + (target - cur) * Math.min(1, (dt || 0) * (rate || 2)); };
  Ph.fmt = function (x, d) { if (!num(x)) return '—'; d = d == null ? 2 : d; var s = x.toFixed(d); return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s; };
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  Ph.sci = function (x, unit, d) {
    if (!num(x)) return '—'; if (x === 0) return '0' + (unit ? ' ' + unit : '');
    var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    if (Math.abs(+m.toFixed(d == null ? 2 : d)) >= 10) { m /= 10; e += 1; }
    var s = (e >= -2 && e <= 3) ? Ph.fmt(x, Math.max(0, (d == null ? 2 : d) - Math.max(0, e))) : m.toFixed(d == null ? 2 : d) + '×10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
    return s + (unit ? ' ' + unit : '');
  };
  function solve3(o, a, b, c, fa, fb, fc) {   // a = b * c 型：缺哪个求哪个
    o = Object.assign({}, o);
    if (!num(o[a]) && num(o[b]) && num(o[c])) o[a] = fa(o[b], o[c]);
    else if (!num(o[b]) && num(o[a]) && num(o[c])) o[b] = fb(o[a], o[c]);
    else if (!num(o[c]) && num(o[a]) && num(o[b])) o[c] = fc(o[a], o[b]);
    return o;
  }

  /* ════ 密度、浮力、浮沉 ════ */
  Ph.density = function (o) { return solve3(o, 'm', 'rho', 'V', function (r, V) { return r * V; }, function (m, V) { return m / V; }, function (m, r) { return m / r; }); };
  Ph.buoyancy = function (rho, Vsub) { return rho * Ph.g * Vsub; };
  function vol(shape, h) {   // 浸入深度 h 时排开的体积
    var s = shape;
    if (s.type === 'box') return s.A ? s.A * clamp(h, 0, s.h) : (s.w * s.d) * clamp(h, 0, s.h);
    if (s.type === 'sphere') { var hh = clamp(h, 0, 2 * s.r); return Math.PI * hh * hh * (3 * s.r - hh) / 3; }
    if (s.type === 'spheroid') { var h2 = clamp(h, 0, 2 * s.c); return Math.PI * s.a * s.a * h2 * h2 * (3 * s.c - h2) / (3 * s.c * s.c); }
    if (s.type === 'hcyl') { var r = s.r, h3 = clamp(h, 0, 2 * r), d = r - h3; return s.L * (r * r * Math.acos(clamp(d / r, -1, 1)) - d * Math.sqrt(Math.max(0, r * r - d * d))); }
    if (s.type === 'fn') return s.vol(clamp(h, 0, s.h));
    return NaN;
  }
  function height(shape) { return shape.type === 'box' ? shape.h : shape.type === 'sphere' ? 2 * shape.r : shape.type === 'spheroid' ? 2 * shape.c : shape.type === 'hcyl' ? 2 * shape.r : shape.h; }
  Ph.shapeVolume = function (shape) { return vol(shape, height(shape)); };
  Ph.submergedDepth = function (Vsub, shape) { var H = height(shape); return bisect(function (h) { return vol(shape, h) - Vsub; }, 0, H, 60); };
  Ph.floatSink = function (o) {
    var G = num(o.G) ? o.G : o.m * Ph.g, V = num(o.V) ? o.V : (o.shape ? Ph.shapeVolume(o.shape) : NaN), rho = o.rho == null ? Ph.RHO.水 : o.rho;
    var Ffull = Ph.buoyancy(rho, V), tol = o.tol == null ? 1e-3 : o.tol, r = { G: G, V: V, rho: rho, Ffull: Ffull };
    if (Math.abs(Ffull - G) <= tol * Math.max(G, 1e-9)) { r.state = '悬浮'; r.process = ''; r.Fb = G; r.N = 0; r.Vsub = V; }
    else if (Ffull > G) { r.state = '漂浮'; r.process = '上浮'; r.Fb = G; r.N = 0; r.Vsub = G / (rho * Ph.g); }
    else { r.state = '沉底'; r.process = '下沉'; r.Fb = Ffull; r.N = G - Ffull; r.Vsub = V; }
    r.frac = r.Vsub / V; r.rhoObj = G / Ph.g / V;
    if (o.shape) r.depth = r.state === '漂浮' ? Ph.submergedDepth(r.Vsub, o.shape) : height(o.shape);
    r.why = r.state === '漂浮' ? 'ρ物 < ρ液：浸没时浮力大于重力，物体上浮；露出液面后排开的液体变少、浮力变小，到 F浮 = G 时漂浮。'
      : r.state === '悬浮' ? 'ρ物 = ρ液：浮力等于重力，物体可以停在液体中任何位置（悬浮）。'
      : 'ρ物 > ρ液：浮力小于重力，物体下沉，沉到底后容器底的支持力补上：F浮 + F支 = G。';
    return r;
  };
  // 不在最终位置时（比如正在上浮、下沉）某一深度的浮力：F浮 = ρ液 g V排(浸入深度)
  Ph.buoyancyAt = function (rho, shape, depthIn) { return Ph.buoyancy(rho, vol(shape, depthIn)); };

  /* ════ 压强 ════ */
  Ph.pressure = function (o) { return solve3(o, 'F', 'p', 'S', function (p, S) { return p * S; }, function (F, S) { return F / S; }, function (F, p) { return F / p; }); };
  Ph.liquidPressure = function (rho, h) { return rho * Ph.g * h; };

  /* ════ 杠杆、滑轮、功、运动 ════ */
  Ph.lever = function (o) {
    o = Object.assign({}, o);
    if (!num(o.F1)) o.F1 = o.F2 * o.L2 / o.L1; else if (!num(o.L1)) o.L1 = o.F2 * o.L2 / o.F1;
    else if (!num(o.F2)) o.F2 = o.F1 * o.L1 / o.L2; else if (!num(o.L2)) o.L2 = o.F1 * o.L1 / o.F2;
    o.type = Math.abs(o.L1 - o.L2) < 1e-9 * Math.max(o.L1, o.L2) ? '等臂杠杆' : o.L1 > o.L2 ? '省力杠杆' : '费力杠杆';
    o.balanced = Math.abs(o.F1 * o.L1 - o.F2 * o.L2) <= 1e-6 * Math.max(1e-9, o.F1 * o.L1);
    return o;
  };
  Ph.torques = function (list) {
    var sum = 0, mag = 0; list.forEach(function (q) { sum += q.F * q.d; mag += Math.abs(q.F * q.d); });
    var tilt = Math.abs(sum) <= 1e-6 * Math.max(mag, 1e-9) ? '平衡' : sum > 0 ? '右端下沉' : '左端下沉';
    return { sum: sum, tilt: tilt };
  };
  Ph.pulley = function (o) {
    var Gm = o.Gm || 0, n = o.n || 1, F = (o.G + Gm) / n, r = { F: F, n: n, G: o.G, Gm: Gm };
    if (num(o.h)) { r.h = o.h; r.s = n * o.h; r.Wuse = o.G * o.h; r.Wtotal = F * r.s; r.eta = r.Wuse / r.Wtotal; }
    return r;
  };
  Ph.work = function (F, s) { return F * s; };
  Ph.power = function (o, t) {
    if (typeof o === 'number') return o / t;                    // power(W, t)
    o = Object.assign({}, o);
    if (num(o.U) && num(o.I)) { o.P = o.U * o.I; o.R = o.U / o.I; }
    else if (num(o.I) && num(o.R)) { o.U = o.I * o.R; o.P = o.I * o.I * o.R; }
    else if (num(o.U) && num(o.R)) { o.I = o.U / o.R; o.P = o.U * o.U / o.R; }
    else if (num(o.P) && num(o.U)) { o.I = o.P / o.U; o.R = o.U * o.U / o.P; }
    else if (num(o.P) && num(o.I)) { o.U = o.P / o.I; o.R = o.P / (o.I * o.I); }
    else if (num(o.P) && num(o.R)) { o.U = Math.sqrt(o.P * o.R); o.I = Math.sqrt(o.P / o.R); }
    return o;
  };
  Ph.speed = function (o) { return solve3(o, 's', 'v', 't', function (v, t) { return v * t; }, function (s, t) { return s / t; }, function (s, v) { return s / v; }); };
  Ph.balance = function (forces, tol) {
    var x = 0, y = 0, z = 0, mag = 0;
    forces.forEach(function (f) { x += f.x || 0; y += f.y || 0; z += f.z || 0; mag = Math.max(mag, Math.hypot(f.x || 0, f.y || 0, f.z || 0)); });
    var net = Math.hypot(x, y, z); return { net: net, x: x, y: y, z: z, balanced: net <= (tol == null ? 0.02 : tol) * Math.max(mag, 1e-9) };
  };

  /* ════ 光 ════ */
  Ph.reflect = function (i) { return { 入射角: i, 反射角: i }; };
  Ph.mirrorImage = function (p, q, n) {   // 点 p 关于“过 q、法线 n”的镜面的对称点（{x,y,z} 都可以）
    var nl = Math.hypot(n.x || 0, n.y || 0, n.z || 0), nx = (n.x || 0) / nl, ny = (n.y || 0) / nl, nz = (n.z || 0) / nl;
    var d = ((p.x || 0) - (q.x || 0)) * nx + ((p.y || 0) - (q.y || 0)) * ny + ((p.z || 0) - (q.z || 0)) * nz;
    return { x: (p.x || 0) - 2 * d * nx, y: (p.y || 0) - 2 * d * ny, z: (p.z || 0) - 2 * d * nz, 性质: '正立、等大的虚像', 像距等于物距: true };
  };
  Ph.refract = function (o) {
    var n1 = Ph.N[o.from] || o.n1 || 1, n2 = Ph.N[o.to] || o.n2 || 1, i = o.angle, s = n1 / n2 * Math.sin(i * DEG);
    var r = { 入射介质: o.from, 折射介质: o.to, 入射角: i, total: s > 1 };
    r.折射角 = s > 1 ? NaN : Math.asin(s) / DEG;
    r.偏折 = i === 0 ? '不偏折' : n2 > n1 ? '靠近法线' : n2 < n1 ? '偏离法线' : '不偏折';
    r.说法 = i === 0 ? '光垂直射到界面上，传播方向不变。' : '光从' + o.from + '斜射入' + o.to + '，折射角' + (r.折射角 < i ? '小于' : '大于') + '入射角。';
    return r;
  };
  Ph.lookIntoWater = function (o) {
    var E = o.eye, F = o.obj, n = o.n || Ph.N.水, d = -F.y, h = E.y;
    if (!(d > 0 && h > 0)) return null;
    function f(px) { var a = Math.abs(px - F.x), b = Math.abs(E.x - px); return n * a / Math.hypot(a, d) - b / Math.hypot(b, h); }
    var px = Math.abs(E.x - F.x) < 1e-12 ? F.x : bisect(f, F.x, E.x, 90);
    var a = Math.abs(px - F.x), b = Math.abs(E.x - px), iw = Math.atan2(a, d), ra = Math.atan2(b, h);
    var dApp = b > 1e-9 ? a * h / b : d / n;   // 反向延长线和物体所在竖直线的交点
    var img = { x: F.x, y: -dApp };
    return { P: { x: px, y: 0 }, 入射角: iw / DEG, 折射角: ra / DEG, 入射介质: '水', 折射介质: '空气', image: img, apparentDepth: dApp, realDepth: d,
      说法: '光从水斜射入空气，折射角大于入射角；人眼逆着折射光看去，看到的是比实际浅的虚像。' };
  };
  Ph.apparentDepth = function (d, viewDeg, n) {
    n = n || Ph.N.水; var ra = (viewDeg || 0) * DEG, iw = Math.asin(Math.sin(ra) / n);
    return ra < 1e-6 ? d / n : d * Math.tan(iw) / Math.tan(ra);
  };
  Ph.lens = function (o) {
    var f = o.f, u = o.u, h = o.h == null ? 1 : o.h, r = { f: f, u: u };
    if (Math.abs(u - f) < 1e-9 * f) { r.image = false; r.性质 = '不成像'; r.区间 = 'u = f'; r.应用 = '（得到平行光）'; return r; }
    var v = u * f / (u - f); r.image = true; r.v = v; r.m = Math.abs(v / u); r.像高 = h * r.m;
    if (v > 0) { r.实像 = true; r.性质 = '倒立、' + (Math.abs(u - 2 * f) < 1e-9 * f ? '等大' : u > 2 * f ? '缩小' : '放大') + '的实像'; r.像在 = '透镜另一侧'; }
    else { r.实像 = false; r.性质 = '正立、放大的虚像'; r.像在 = '和物体同侧'; }
    r.区间 = u > 2 * f + 1e-9 * f ? 'u > 2f' : Math.abs(u - 2 * f) <= 1e-9 * f ? 'u = 2f' : u > f ? 'f < u < 2f' : 'u < f';
    r.应用 = r.区间 === 'u > 2f' ? '照相机' : r.区间 === 'f < u < 2f' ? '投影仪' : r.区间 === 'u < f' ? '放大镜' : '（测焦距）';
    r.像距区间 = v > 0 ? (v > 2 * f ? 'v > 2f' : Math.abs(v - 2 * f) < 1e-9 * f ? 'v = 2f' : 'f < v < 2f') : '';
    return r;
  };

  /* ════ 电 ════ */
  Ph.ohm = function (o) { return solve3(o, 'U', 'I', 'R', function (I, R) { return I * R; }, function (U, R) { return U / R; }, function (U, I) { return U / I; }); };
  Ph.series = function (Rs, U) { var R = Rs.reduce(function (a, b) { return a + b; }, 0), r = { R: R }; if (num(U)) { r.U = U; r.I = U / R; r.Us = Rs.map(function (x) { return r.I * x; }); } return r; };
  Ph.parallel = function (Rs, U) { var g = Rs.reduce(function (a, b) { return a + 1 / b; }, 0), r = { R: 1 / g }; if (num(U)) { r.U = U; r.Is = Rs.map(function (x) { return U / x; }); r.I = U * g; } return r; };
  Ph.lamp = function (Ue, Pe, U) {
    var R = Ue * Ue / Pe, P = U * U / R, k = P / Pe, r = { R: R, U: U, I: U / R, P: P, Pe: Pe, Ue: Ue, ratio: k };
    r.亮度 = U <= 1e-9 ? '不亮' : k < 0.05 ? '几乎不亮' : k < 0.3 ? '很暗' : k < 0.9 ? '较暗' : k <= 1.1 ? '正常发光' : '比正常亮（可能烧坏）';
    return r;
  };
  Ph.electricEnergy = function (P, t) { var W = P * t; return { W: W, kWh: W / 3.6e6 }; };
  Ph.jouleHeat = function (I, R, t) { return I * I * R * t; };
  Ph.induction = function (o) {
    var on = !!(o.closed && o.cutting), r = { current: on };
    r.size = on ? Math.abs(o.speedRel == null ? 1 : o.speedRel) : 0;
    r.dir = on ? (o.dirSign || 1) : 0;
    r.说法 = !o.closed ? '电路没有闭合，没有感应电流。' : !o.cutting ? '导体没有切割磁感线，没有感应电流。' : '闭合电路的一部分导体在磁场中做切割磁感线运动，产生感应电流；方向和导体运动方向、磁场方向有关。';
    return r;
  };
  Ph.ac = function (peak, freq, t) { return peak * Math.sin(2 * Math.PI * freq * t); };
  Ph.electromagnet = function (o) {
    var k = Math.abs(o.I || 0) * (o.turns || 0) * (o.core ? 1 : 0.02), r = { strength: k };
    r.说法 = k === 0 ? '没有电流，没有磁性。' : '电流越大、线圈匝数越多，磁性越强；有铁芯时磁性大大增强。';
    return r;
  };

  /* ════ 热 ════ */
  Ph.heat = function (o) {
    o = Object.assign({}, o);
    if (!num(o.Q)) o.Q = o.c * o.m * o.dT; else if (!num(o.dT)) o.dT = o.Q / (o.c * o.m); else if (!num(o.m)) o.m = o.Q / (o.c * o.dT); else if (!num(o.c)) o.c = o.Q / (o.m * o.dT);
    return o;
  };
  Ph.fuelHeat = function (q, m) { return q * m; };
  Ph.phase = function (sub, T, heat) {   // heat：'吸热'（正在加热）| '放热'（正在冷却）| 不写
    var mp = Ph.MELT[sub], bp = Ph.BOIL[sub];
    if (mp == null) return '';
    if (Math.abs(T - mp) < 0.05) return heat === '吸热' ? '固液共存（正在熔化，吸热，温度不变）' : heat === '放热' ? '固液共存（正在凝固，放热，温度不变）' : '可能是固态、液态或固液共存（在熔点）';
    if (T < mp) return '固态';
    if (bp != null && Math.abs(T - bp) < 0.05) return heat === '吸热' ? '液态（正在沸腾，继续吸热，温度不变）' : '液态（到了沸点，继续吸热才能沸腾）';
    if (bp != null && T > bp) return '气态'; return '液态';
  };
  Ph.mixTemp = function (list) { var a = 0, b = 0; list.forEach(function (q) { a += q.c * q.m * q.t; b += q.c * q.m; }); return a / b; };

  /* ════ 声 ════ */
  Ph.echo = function (o) { var v = o.v || Ph.V_SOUND; return num(o.d) ? { d: o.d, v: v, t: 2 * o.d / v } : { t: o.t, v: v, d: v * o.t / 2 }; };

  // 课本术语：错的说法 → 对的说法（「检查画面」会查右栏和标签里有没有错的）
  Ph.TERMS = [['停表', '秒表']];
  return Ph;
})();
