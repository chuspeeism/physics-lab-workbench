/* ════ 生活情境：盐水浮鸡蛋（示范，挂在实验 13「探究浮力大小与哪些因素有关」）════
   课本：八下 第十章 第3节「物体的浮沉条件及应用」第 74 页 想想做做「观察鸡蛋在清水和盐水中的位置」（图10.3-2）。
   课本是清水、盐水两杯对比；这里用一杯水慢慢加盐，看鸡蛋从沉底到悬浮、再到浮起来。

   情境方案（先给老师看，老师同意后再写代码）：
   - 学生要看到的现象：清水里鸡蛋沉底；盐加多了鸡蛋浮起来；中间能调到悬浮。
   - 物体清单：桌面（LabParts.surface）、烧杯（LabParts.beaker，带刻度）、鸡蛋（LabParts.egg）、
               盛盐的小碗（LabParts.bowl + 一堆盐 LabParts.lathe）、浮力 / 重力 / 支持力箭头（LabParts.arrow）
   - 能动手的量：加盐量 0～12 勺（滑杆，也能一勺一勺加）；一键「调到悬浮」；「倒掉重来」
   - 用到的公式：F浮 = ρ液 g V排，G = m g；ρ液 > ρ蛋 上浮（最后漂浮，F浮 = G），= 悬浮，< 下沉（沉底时 F浮 + F支 = G）
     全部用 LabPhysics.floatSink / buoyancyAt 算（不自己推），它直接给出最后停在哪、各个力多大、课本的叫法
     数值：鸡蛋 55 g、52 cm³（ρ蛋 ≈ 1.06 g/cm³）；清水 1.00 g/cm³，每勺盐让密度增加约 0.01 g/cm³（示意）；g 取 10 N/kg
   - 默认视角：从斜前方略高处看烧杯，鸡蛋、水面、三个箭头都在画面中间
   - 简化了什么：鸡蛋竖着放、当成椭球算排开的水；加盐后盐水立刻搅匀；箭头长短按力的大小，但比例是示意 */
LabScene.register('egg', {
  no: '13',
  name: '盐水浮鸡蛋',
  build: function (ctx) {
    var T = ctx.T, P = LabParts, V = P.V, scene = ctx.scene;

    /* ── 1. 物理数据和计算：都交给 LabPhysics（单位用国际单位 m、kg、N），画面和读数都从 calc() 取 ── */
    var Ph = LabPhysics;
    var EGG = { m: 0.055, V: 52e-6 };                                     // 鸡蛋 55 g、52 cm³
    var RHO_EGG = EGG.m / EGG.V, G_N = EGG.m * Ph.g;                      // ρ蛋 ≈ 1058 kg/m³，G = 0.55 N
    var ER = Math.cbrt(52 / (4 / 3 * Math.PI * 1.3)), EC = 1.3 * ER;      // 画面里的鸡蛋（cm）：横半径 ER、竖半轴 EC
    var SHAPE = { type: 'spheroid', a: ER / 100, c: EC / 100 };           // 算排开的水用（m）
    var st = { salt: 0, y: 0, t: 0 };
    function rho() { return 1000 * (1 + 0.01 * st.salt); }                // 盐水密度 kg/m³（每勺 +0.01 g/cm³，示意）
    function restY(fin) { return fin.state === '沉底' ? BOT : fin.state === '漂浮' ? LEVEL - fin.depth * 100 : st.y; }   // 最后停的位置（cm）
    function calc() {
      var fin = Ph.floatSink({ m: EGG.m, V: EGG.V, rho: rho(), shape: SHAPE });   // 最后停在哪：漂浮 / 悬浮 / 沉底
      var fb = Ph.buoyancyAt(rho(), SHAPE, (LEVEL - st.y) / 100);           // 现在这个位置的浮力（还在走的时候也对）
      var atRest = Math.abs(st.y - restY(fin)) < 0.02, onBottom = st.y <= BOT + 1e-3;
      return { fin: fin, fb: fb, N: onBottom ? Math.max(0, G_N - fb) : 0, s: atRest ? fin.state : (fin.process || fin.state), atRest: atRest, r: rho() / 1000 };
    }

    /* ── 2. 搭场景：先用零件 ── */
    P.studio(ctx, { kind: 'room' });
    var desk = P.surface({ w: 90, d: 70 }); scene.add(desk);
    var beaker = P.beaker({ r: 5, h: 13, level: 10 }); scene.add(beaker);
    var BOT = beaker.userData.bottom, LEVEL = 10;
    st.y = BOT;
    var egg = P.egg({ r: ER }); scene.add(egg);
    var aF = P.arrow({ color: P.C.force, r: 0.22, on: egg, name: '浮力' }), aG = P.arrow({ color: P.C.gravity, r: 0.22, on: egg, name: '重力' }), aN = P.arrow({ color: P.C.support, r: 0.22, on: egg, name: '支持力' });
    var dish = P.bowl({ r: 4.5, h: 2.6 }); dish.position.set(-14, 0, 5); scene.add(dish);
    var heap = P.lathe([[0.001, 0], [3.2, 0], [2.4, 0.7], [1.2, 1.3], [0.001, 1.5]], P.mat.paper(0xFFFFFF), { name: '盐', seg: 32 }); heap.position.set(-14, 0.5, 5); scene.add(heap);
    var spoon = P.lathe([[0.001, 0], [1.1, 0.15], [1.3, 0.5], [0.001, 0.55]], P.mat.metal(), { name: '勺子', seg: 24 }); spoon.position.set(-8, 0.1, 10); scene.add(spoon);
    scene.add(P.rod(V(-8.5, 0.5, 10.5), V(-2, 0.9, 16), 0.22, P.mat.metal(), { name: '勺子' }));

    /* ── 3. 力的箭头（1 N 画 9 cm 长，示意） ── */
    var K = 9;   // 箭头在第 2 步建鸡蛋时一起建：on 写受力的物体，「检查画面」会查“鸡蛋停着不动时受力是否平衡”
    scene.add(aF); scene.add(aG); scene.add(aN);

    /* ── 4. 取景：烧杯放在画面中间，上面留出箭头的位置 ── */
    P.frame(ctx, [beaker, new T.Box3(V(-8, -2, -6), V(8, 19, 6))], { az: 0.35, el: 0.3, pad: 0.95 });

    /* ── 5. 右栏 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>盐水浮鸡蛋</b><p>往水里一勺一勺加盐，鸡蛋会怎样？</p></div>' +
      '<div class="ls-blk"><div class="ls-h">加盐</div>' +
        '<div class="ls-btns"><button data-a="add" class="main">加一勺盐</button><button data-a="hover">调到悬浮</button><button data-a="reset">倒掉重来</button></div>' +
        '<div class="ls-row"><input class="rng" type="range" min="0" max="12" step="0.1" value="0"><span class="vl" data-v="salt" style="min-width:80px">0 勺</span></div></div>' +
      '<div class="ls-blk"><div class="ls-h">现在：<span data-v="s" style="color:var(--blue)">沉底</span></div>' +
        '<div class="ls-row"><span class="nm">盐水的密度 ρ液</span><span class="vl" data-v="r"></span></div>' +
        '<div class="ls-row"><span class="nm">鸡蛋的密度 ρ蛋</span><span class="vl">' + (RHO_EGG / 1000).toFixed(2) + ' g/cm³</span></div>' +
        '<div class="ls-row"><span class="nm">浮力 F浮</span><span class="vl" data-v="fb"></span></div>' +
        '<div class="ls-row"><span class="nm">重力 G</span><span class="vl">' + G_N.toFixed(2) + ' N</span></div>' +
        '<p class="ls-tip" data-v="why" style="color:var(--ink);font-size:17px"></p></div>' +
      '<div class="ls-note">浸没在液体中的物体：液体密度<b>大于</b>物体密度就上浮，<b>等于</b>就悬浮，<b>小于</b>就下沉。</div>' +
      '<p class="ls-tip">怎么算：F浮 = ρ液 g V排，G = m g。鸡蛋 55 g、52 cm³；每勺盐让密度增加约 0.01 g/cm³（示意）；g 取 10 N/kg。课本八下第十章第 3 节第 74 页。</p>'
    );
    var $ = ctx.$, rng = $('input.rng'), out = {};
    ['salt', 's', 'r', 'fb', 'why'].forEach(function (k) { out[k] = $('[data-v="' + k + '"]'); });
    function setTxt(el, h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }
    $('[data-a="add"]').addEventListener('click', function () { st.salt = Math.min(12, Math.floor(st.salt + 1e-6) + 1); rng.value = st.salt; });
    $('[data-a="hover"]').addEventListener('click', function () { st.salt = (RHO_EGG / 1000 - 1) / 0.01; rng.value = st.salt; st.y = BOT + (LEVEL - BOT - 2 * EC) * 0.45; });
    $('[data-a="reset"]').addEventListener('click', function () { st.salt = 0; rng.value = 0; st.y = BOT; });
    rng.addEventListener('input', function () { st.salt = +rng.value; });
    function ui(I) {
      setTxt(out.salt, (Math.abs(st.salt - Math.round(st.salt)) < 0.05 ? Math.round(st.salt) : st.salt.toFixed(1)) + ' 勺');
      setTxt(out.s, I.s); setTxt(out.r, I.r.toFixed(2) + ' g/cm³'); setTxt(out.fb, Ph.fmt(I.fb) + ' N');
      setTxt(out.why, I.atRest ? I.fin.why : I.s === '上浮' ? 'ρ液 > ρ蛋：浸没时浮力大于重力，鸡蛋往上浮。' : 'ρ液 < ρ蛋：浮力小于重力，鸡蛋往下沉。');
    }

    /* ── 7. 每一帧：鸡蛋按受力慢慢走到该停的位置；箭头、标签、提示 ── */
    function frame(dt) {
      st.t += dt;
      st.y = Ph.approach(st.y, restY(Ph.floatSink({ m: EGG.m, V: EGG.V, rho: rho(), shape: SHAPE })), dt, 1.6);   // 慢慢走到最后停的位置
      egg.position.set(0, st.y, 0);
      var I = calc(), c = V(0, st.y + EC, 0);
      aF.set(c.clone().add(V(0.6, 0, 0)), V(0, I.fb * K, 0));
      aG.set(c.clone().add(V(-0.6, 0, 0)), V(0, -G_N * K, 0));
      aN.visible = I.N > 0.005; if (aN.visible) aN.set(V(2.6, st.y, 0), V(0, I.N * K, 0));
      // 标签：最多 4 个，放在箭头尖旁边；鸡蛋和水面登记为不能挡
      ctx.keepClear('egg', c, 36); ctx.keepClear('level', V(0, LEVEL, 5), 14);
      ctx.tag('fb', '浮力 ' + Ph.fmt(I.fb) + ' N', aF.tip(), { side: 'right', gap: 10, small: true });
      ctx.tag('g', '重力 ' + G_N.toFixed(2) + ' N', aG.tip(), { side: 'left', gap: 10, small: true });
      ctx.tag('n', '支持力', aN.visible ? aN.tip() : null, { side: 'right', gap: 10, small: true });
      ctx.note(st.salt < 0.05 ? '点「加一勺盐」，或拖右边的滑杆' : '');
      ui(I);
      return true;   // 小场景，一直重画（鸡蛋在动、按钮一点画面就跟着变）
    }
    return { frame: frame };
  }
});
