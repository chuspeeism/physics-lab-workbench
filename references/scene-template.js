/* ════ 生活情境：【情境名】（挂在实验【编号】「【实验名】」）════
   课本：【八上 / 八下 / 九年级】第【几】章 第【几】节「【节名】」第【几】页（【图号或“想想做做”】）；课本没提到就写“课本外的例子”。

   情境方案（第一步只把这一段写给老师看，老师同意后再写下面的代码）：
   - 学生要看到的现象：【一两句话，例如“盐越加越多，鸡蛋从沉底变成浮起来”】
   - 物体清单：【每样东西用哪个零件，例如 烧杯 LabParts.beaker、鸡蛋 LabParts.egg、力的箭头 LabParts.arrow；零件没有的写“自己做：用 lathe 做瓶身”】
   - 能动手的量：【什么量、范围、怎么操作（按钮 / 滑杆 / 拖动）】
   - 用到的公式和数值：【例如 F浮 = ρ液 g V排、G = m g；鸡蛋 55 g、52 cm³，g 取 10 N/kg】，用 LabPhysics 的哪个函数算【例如 LabPhysics.floatSink】
   - 默认视角：【从哪边看、一眼要看清什么】
   - 简化了什么：【例如“示意图，大小不按比例”】

   写代码时：
   - 物理数值、状态、名称一律用 LabPhysics 算（references/physics.md），右栏照它返回的叫法写；物体要算到最后停下来的状态。
   - 先用零件（references/parts.md），零件没有的再用 P.lathe / P.roundBox / P.extrude / P.tube 自己做，不要用方块、圆柱随便拼。
   - 有水就用 P.water（剖开）或容器（P.cup / P.beaker / P.tank / P.bowl），让学生看得见水下。
   - 标签最多 4 个，放在物体旁边；要看的东西用 ctx.keepClear 登记；操作提示写 ctx.note，能拖的地方用 ctx.spot。
   - 写完先用 python scripts/add_scene.py 这个文件.js 接进网站（试做可加 --out 试做.html），再打开接好的网页，切到情境，点舞台右下角「检查画面」，改到没有「出错」「要改」为止；改了情境文件就再运行一次脚本。
   - 一次只交一个情境；老师给了自己的文件，脚本加 --single 老师的文件.html。
   - 老师验收满意后，在下面 register 里加一行 done: true（「检查画面」按钮就不再显示），再运行一次脚本更新。 */
LabScene.register('【英文名，只用小写字母，例如 egg】', {
  no: '【实验编号，两位数，例如 13】',
  name: '【切换按钮上的名字，2～5 个字】',
  build: function (ctx) {
    var T = ctx.T, P = LabParts, V = P.V, Ph = LabPhysics, scene = ctx.scene;

    /* ── 1. 物理数据和计算：所有数值只在这里算（用 Ph.xxx，单位 m、kg、N……），画面、箭头、读数都从 calc() 取 ── */
    var st = { /* 能调的量，例如 salt: 0（加了几勺盐） */ t: 0 };
    function calc() {
      return { /* 算出来的量，例如 G: …, F: …, s: '漂浮' */ };
    }

    /* ── 2. 搭场景（尺寸推荐 1 个单位 = 1 厘米）── */
    P.studio(ctx, { kind: 'room' });            // 'room' 室内 | 'outdoor' 室外 | 'sea' 海上
    // var bd = P.backdrop({ kind: 'room' }); bd.position.set(0, 0, 0); scene.add(bd);   // 远景背景：outdoor / sea / room / classroom / kitchen / lab
    // var desk = P.surface({ w: 120, d: 90 }); scene.add(desk);              // 实验桌上的小场景
    // var water = P.water({ w: 600, d: 240, depth: 200, soil: 30 }); scene.add(water);   // 池塘、海：剖开的水
    // var cup = P.beaker({ r: 5, h: 13, level: 10 }); scene.add(cup);          // 烧杯、玻璃杯、碗、水槽

    /* ── 3. 力、光线等标记 ── */
    // var aF = P.arrow({ color: P.C.force, on: 受力的物体, name: '浮力' }), aG = P.arrow({ color: P.C.gravity, on: 受力的物体, name: '重力' }); scene.add(aF); scene.add(aG);
    // var ray = P.ray(); scene.add(ray);

    /* ── 4. 取景：主体放在画面中间、一眼看清；转动范围自动限制好 ── */
    // P.frame(ctx, [主体1, 主体2], { az: 0.3, el: 0.25 });

    /* ── 5. 右栏：标题、能调的按钮或滑杆、读数、一句结论、怎么算和课本依据 ── */
    ctx.panel(
      '<div class="ls-title"><small>生活情境</small><b>【情境名】</b><p>【一句话：学生要看什么】</p></div>' +
      '<div class="ls-blk"><div class="ls-h">【能调的量】</div>' +
        '<div class="ls-btns"><button data-a="add" class="main">【操作 1】</button><button data-a="reset">重新开始</button></div>' +
        '<div class="ls-row"><input class="rng" type="range" min="0" max="10" step="1" value="0"><span class="vl" data-v="x" style="min-width:80px"></span></div></div>' +
      '<div class="ls-blk"><div class="ls-h">现在：<span data-v="s" style="color:var(--blue)"></span></div>' +
        '<div class="ls-row"><span class="nm">【读数名】</span><span class="vl" data-v="r1"></span></div></div>' +
      '<div class="ls-note">【一句结论，和课本说法一致】</div>' +
      '<p class="ls-tip">怎么算：【公式和取值】。课本【册·章·节·页】。【简化了什么】</p>'
    );
    var $ = ctx.$, out = {};
    ['x', 's', 'r1'].forEach(function (k) { out[k] = $('[data-v="' + k + '"]'); });
    function setTxt(el, h) { if (el && el._h !== h) { el.innerHTML = h; el._h = h; } }
    // $('[data-a="add"]').addEventListener('click', function () { …; ctx.dirty(); });
    function ui(I) { /* setTxt(out.s, I.s); setTxt(out.r1, …); */ }

    /* ── 6. 拖动（没有就删掉这一段）── */
    // ctx.drag = {
    //   start: function (ev) { var h = ctx.pick(ev, [要拖的物体]); if (!h) return false; …; return true; },
    //   move: function (ev) { var p = ctx.onPlane(ev, 平面); if (p) { …; } },
    //   end: function () {}
    // };

    /* ── 7. 每一帧：更新位置和箭头；标签、登记不能挡的地方、操作提示（每帧都要调用，转视角时才跟得上）── */
    function frame(dt) {
      st.t += dt;
      var I = calc();
      // water.update(st.t);                                   // 水面起伏
      // aF.set(起点, V(0, I.F * 比例, 0));
      // ctx.keepClear('obj', 要观察的位置, 40);               // 半径是像素，约等于物体在画面上的半宽
      // ctx.tag('f', '浮力 ' + I.F.toFixed(1) + ' N', aF.tip(), { side: 'right', gap: 10 });
      // ctx.spot('drag', 能拖的物体的位置);  ctx.note('拖闪着的……');
      ui(I);
      return true;   // 有动画就 return true；画面不动时可以 return false
    }
    return { frame: frame };   // 可选：pause()（切回「实验」时调用）、resume()（切回这个情境时调用）
  }
});
