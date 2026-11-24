/* 06 探究平面镜成像的特点（课本图 4.3-2）。
   装置：桌上白纸，纸上竖立薄玻璃板（纸上画线标出镜面位置）；玻璃板前点燃的蜡烛 A，后面外形相同、未点燃的蜡烛 B；刻度尺、白色光屏、较矮的蜡烛。
   模型：A 的虚像 = A 关于玻璃板平面的镜像（矩阵反射，玻璃板倾斜时随之改变，像离开桌面）；只在从 A 一侧看时可见，光屏上永远没有像。
   人眼观察窗：用第二个相机从 A 一侧（或光屏一侧）透过玻璃板看，和主场景共用同一个镜像位置。
   记录有效：玻璃板竖直、B 等高且与像重合（水平偏差 < 0.3 cm）；记录时在纸上留下 A、B 位置点和连线。 */
(function () {
  var GW = 28, GH = 18, CH = 8, CH_SHORT = 5.2, CR = 0.9;
  var st = { xA: 0, dA: 10, xB: 6, dB: 4, sel: 'B', tilt: 0, screen: false, short: false, pair: false, eye: 'A', rows: [] };   // pair：A、B 都换成较矮的一对（课本第 3 步）；short：只把 B 换矮（错误示范）
  var K, V, T3, glassG, candA, candB, bBody, image, ghost, flames = [], screen, marks = [], demo = [], winEl, vp, eyeCam, last = '', t = 0;
  var DEMO = [[-9, 6], [-3, 13], [8, 9]];   // 第 6 问的示范标记（A 的左右位置、离镜距离）

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function vertical() { return Math.abs(st.tilt) < 0.5; }
  function coincide() { return vertical() && !st.short && !st.screen && Math.abs(st.xB - st.xA) < 0.3 && Math.abs(st.dB - st.dA) < 0.3; }
  function r1(v) { return (Math.round(v * 10) / 10).toFixed(1); }

  /* ── 场景 ── */
  function makeCandle(h, lit, color) {
    var g = new T3.Group(), mats = [];
    var wax = new T3.MeshStandardMaterial({ color: color, roughness: .55 }); mats.push(wax);
    var body = new T3.Mesh(new T3.CylinderGeometry(CR, CR, h, 28), wax); body.position.y = h / 2; body.castShadow = true; g.add(body);
    var top = new T3.Mesh(new T3.CylinderGeometry(CR * 0.98, CR, 0.15, 28), new T3.MeshStandardMaterial({ color: 0xF4EBDD, roughness: .6 })); top.position.y = h + 0.07; g.add(top); mats.push(top.material);
    var wick = new T3.Mesh(new T3.CylinderGeometry(0.06, 0.06, 0.6, 6), new T3.MeshStandardMaterial({ color: 0x2B2B2B })); wick.position.y = h + 0.35; g.add(wick); mats.push(wick.material);
    var holder = new T3.Mesh(new T3.CylinderGeometry(CR + 0.5, CR + 0.7, 0.4, 28), new T3.MeshStandardMaterial({ color: 0x9AA5B3, metalness: .5, roughness: .35 })); holder.position.y = 0.2; holder.castShadow = true; g.add(holder); mats.push(holder.material);
    var fl = null;
    if (lit) {
      fl = new T3.Group();
      var fo = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: 0xFFB13B, transparent: true, opacity: .85, depthWrite: false })); fo.scale.set(0.32, 0.9, 0.32); fl.add(fo); mats.push(fo.material);
      var fi = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: 0xFFF3C4, transparent: true, opacity: .95, depthWrite: false })); fi.scale.set(0.16, 0.48, 0.16); fi.position.y = -0.2; fl.add(fi); mats.push(fi.material);
      var glow = new T3.Mesh(new T3.SphereGeometry(1, 16, 12), new T3.MeshBasicMaterial({ color: 0xFFD27A, transparent: true, opacity: .22, depthWrite: false })); glow.scale.setScalar(1.6); fl.add(glow); mats.push(glow.material);
      fl.position.y = h + 1.15; g.add(fl);
    }
    var hit = new T3.Mesh(new T3.CylinderGeometry(2.4, 2.4, h + 3, 10), new T3.MeshBasicMaterial({ visible: false })); hit.position.y = (h + 3) / 2; g.add(hit);
    g.userData = { hit: hit, body: body, flame: fl, mats: mats, top: top, wick: wick, h: h };
    return g;
  }
  function paperTex() {
    var px = 24, c = document.createElement('canvas'); c.width = 48 * px; c.height = 40 * px; var g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#1E3A5F'; g.lineWidth = 3; g.beginPath(); g.moveTo(4 * px, 20 * px); g.lineTo(44 * px, 20 * px); g.stroke();   // 镜面位置线（纸中间）
    g.font = '28px Bahnschrift, Arial'; g.fillStyle = '#56677D'; g.fillText('镜面位置', 4.4 * px, 19.3 * px);
    var tex = new T3.CanvasTexture(c); tex.anisotropy = 8; return tex;
  }
  function rulerTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 4096; var g = c.getContext('2d');
    g.fillStyle = '#FBFCFD'; g.fillRect(0, 0, 256, 4096);
    var px = 4096 / 36; g.strokeStyle = '#1E3A5F'; g.fillStyle = '#1E3A5F'; g.font = 'bold 54px Bahnschrift, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var mm = -180; mm <= 180; mm++) {
      var y = 2048 + mm / 10 * px, l = mm % 10 === 0 ? 110 : mm % 5 === 0 ? 76 : 44;
      g.lineWidth = mm % 10 === 0 ? 5 : 2.6; g.beginPath(); g.moveTo(256, y); g.lineTo(256 - l, y); g.stroke();
      if (mm % 20 === 0) g.fillText(String(Math.abs(mm / 10)), 70, y);
    }
    var tx = new T3.CanvasTexture(c); tx.anisotropy = 8; return tx;
  }
  function build() {
    V = K.three({ target: [0, 3, -3], az: 0, el: 0.62, dist: 72, minDist: 36, maxDist: 120, minAz: -1.1, maxAz: 1.1, minEl: 0.1, maxEl: 1.1, fov: 32, sun: [-30, 80, 60] });
    T3 = V.T; var S = V.scene;
    var paper = new T3.Mesh(new T3.BoxGeometry(48, 0.1, 40), [0, 1, 2, 3, 4, 5].map(function (k) { return k === 2 ? new T3.MeshStandardMaterial({ map: paperTex(), roughness: 1 }) : new T3.MeshStandardMaterial({ color: 0xEDEFF2 }); }));
    paper.position.y = -0.05; paper.receiveShadow = true; S.add(paper);
    var ruler = new T3.Mesh(new T3.BoxGeometry(2.4, 0.12, 36), [0, 1, 2, 3, 4, 5].map(function (k) { return k === 2 ? new T3.MeshStandardMaterial({ map: rulerTex(), roughness: .5 }) : new T3.MeshStandardMaterial({ color: 0xDDE4EC }); }));
    ruler.position.set(-17.5, 0.06, 0); ruler.castShadow = true; S.add(ruler);
    // 玻璃板：绕底边转动（tilt>0 向后倾）
    glassG = new T3.Group(); S.add(glassG);
    var glass = new T3.Mesh(new T3.BoxGeometry(GW, GH, 0.3), new T3.MeshPhongMaterial({ color: 0xD6E8F2, transparent: true, opacity: .18, shininess: 120, specular: 0xffffff, depthWrite: false, side: T3.DoubleSide }));
    glass.position.y = GH / 2; glassG.add(glass);
    var frameM = new T3.MeshStandardMaterial({ color: 0x8EA4BC, roughness: .5 });
    [[0, GH, GW, 0.3], [-GW / 2, GH / 2, 0.3, GH], [GW / 2, GH / 2, 0.3, GH]].forEach(function (f) { var m = new T3.Mesh(new T3.BoxGeometry(f[2], f[3], 0.4), frameM); m.position.set(f[0], f[1], 0); glassG.add(m); });
    [-GW / 2 + 3, GW / 2 - 3].forEach(function (x) { var foot = new T3.Mesh(new T3.BoxGeometry(2.4, 1.2, 3), new T3.MeshStandardMaterial({ color: 0x5C6B7E, roughness: .5 })); foot.position.set(x, 0.6, 0); foot.castShadow = true; S.add(foot); });
    candA = makeCandle(CH, true, 0xF2E6D2); S.add(candA);
    candB = makeCandle(CH, false, 0xF2E6D2); S.add(candB);
    bBody = { tall: candB, short: makeCandle(CH_SHORT, false, 0xE8D8BE) }; S.add(bBody.short);
    // A 的像：同样的蜡烛（半透明，玻璃反射较弱），由反射矩阵放到镜像位置
    image = makeCandle(CH, true, 0xF2E6D2); image.matrixAutoUpdate = false;
    // 像的落脚圈：只在拖动 B 靠近像时出现，帮助判断前后位置；B 对准后变绿
    footMat = new T3.MeshBasicMaterial({ color: 0xFE752D, transparent: true, opacity: 0.85, depthWrite: false });
    foot = new T3.Mesh(new T3.RingGeometry(1.3, 1.75, 40), footMat); foot.rotation.x = -Math.PI / 2; foot.visible = false; V.scene.add(foot);
    image.userData.mats.forEach(function (m) { m.transparent = true; m.opacity = (m.opacity || 1) * 0.6; m.depthWrite = false; m.side = T3.DoubleSide; });
    image.userData.hit.visible = false; S.add(image);
    // 像在纸面以下的部分（玻璃板倾斜时）：透过纸面淡淡画出，让学生看到像“沉”进了桌面
    V.renderer.localClippingEnabled = true;
    ghost = makeCandle(CH, true, 0x9DB4CF); ghost.matrixAutoUpdate = false; ghost.renderOrder = 5;
    var below = [new T3.Plane(new T3.Vector3(0, -1, 0), 0)];
    ghost.userData.mats.forEach(function (m) { m.transparent = true; m.opacity = (m.opacity || 1) * 0.38; m.depthWrite = false; m.depthTest = false; m.clippingPlanes = below; m.side = T3.DoubleSide; });
    ghost.userData.hit.visible = false; ghost.visible = false; S.add(ghost);
    flames = [candA.userData.flame, image.userData.flame];
    // 光屏
    screen = new T3.Group();
    var sc = new T3.Mesh(new T3.BoxGeometry(9, 11, 0.3), new T3.MeshStandardMaterial({ color: 0xFFFFFF, roughness: .95, emissive: 0xffffff, emissiveIntensity: .15 })); sc.position.y = 6.5; sc.castShadow = true; screen.add(sc);
    var scF = new T3.MeshStandardMaterial({ color: 0x5C6B7E, roughness: .5 });   // 边框：一眼看出是一块屏
    [[0, 12, 9.4, 0.4], [0, 1, 9.4, 0.4], [-4.7, 6.5, 0.4, 11.4], [4.7, 6.5, 0.4, 11.4]].forEach(function (f) { var m = new T3.Mesh(new T3.BoxGeometry(f[2], f[3], 0.5), scF); m.position.set(f[0], f[1], 0); screen.add(m); });
    var sf = new T3.Mesh(new T3.BoxGeometry(5, 1, 2.4), new T3.MeshStandardMaterial({ color: 0x5C6B7E })); sf.position.y = 0.5; screen.add(sf);
    S.add(screen);
    V.tag('A', '蜡烛 A'); V.tag('B', '蜡烛 B'); V.tag('img', 'A 的像').style.borderStyle = 'dashed'; V.tag('scr', '光屏');
    var sk = V.tag('sink', ''); sk.style.transform = 'translate(-50%, 10px)'; sk.style.borderColor = '#B4531A'; sk.style.color = '#B4531A'; sk.style.fontSize = '19px';
    eyeCam = new T3.PerspectiveCamera(30, 1.6, 0.1, 500);
    // 拖动：两支蜡烛在纸面上移动（按下的那支同时成为右侧滑杆的控制对象）
    var grab = null, plane = new T3.Plane(new T3.Vector3(0, 1, 0), 0);
    V.drag = {
      hit: function (ev) { return !!V.pick(ev, [candA.userData.hit, candB.userData.hit, bBody.short.userData.hit]); },
      start: function (ev) {
        var hA = V.pick(ev, [candA.userData.hit]), hB = V.pick(ev, [candB.userData.hit, bBody.short.userData.hit]), k = null, h = null;
        if (hB && (st.sel !== 'A' || !hA)) { k = 'B'; h = hB; } else if (hA) { k = 'A'; h = hA; }   // 两支都点中时优先选中的那支（默认 B），靠得近时不会误抓 A
        if (!k) return false;
        plane.constant = -Math.min(h.point.y, CH);   // 拖动平面取按下点的高度，按在烛芯或烛身都跟手
        var p = V.onPlane(ev, plane);
        if (!k || !p) return false;
        dragB = k === 'B'; st.sel = k; ctl = k; grab = { k: k, dx: p.x - (k === 'A' ? st.xA : st.xB), dz: p.z - (k === 'A' ? st.dA : -st.dB) }; changed();
        return true;
      },
      move: function (ev) {
        if (!grab) return; var p = V.onPlane(ev, plane); if (!p) return;
        var x = p.x - grab.dx, z = p.z - grab.dz;
        if (grab.k === 'A') setPos('A', x, z); else { setPos('B', x, -z, SNAP); if (vertical() && !st.short && !st.screen && !coincide() && looksOn()) { st.xB = st.xA; st.dB = st.dA; changed(); } }   // 画面上叠上了就吸住
      },
      end: function () {
        if (grab && grab.k === 'B' && vertical() && !st.short && !st.screen && (Math.abs(st.xB - st.xA) < 2.5 && Math.abs(st.dB - st.dA) < 2.5 || looksOn())) { st.xB = st.xA; st.dB = st.dA; changed(); }
        grab = null; dragB = false;
      }
    };
    V.post = drawEye;
    V.frame = tick;
  }
  /* 设定位置：x 沿镜面，d 离镜距离；B 靠近像时吸到像的位置（拖动 2 cm 内、滑杆 0.8 cm 内） */
  /* 画面上看起来叠在一起就算对上：比较 B 和像的烛身中部、底部在屏幕上的距离（斜着看时前后差几厘米，肉眼也分不出） */
  function looksOn() {
    var h = pairH() * 0.5, sb = V.toScreen(new T3.Vector3(st.xB, h, -st.dB)), si = V.toScreen(new T3.Vector3(st.xA, h, -st.dA)),
      bb = V.toScreen(new T3.Vector3(st.xB, 0, -st.dB)), bi = V.toScreen(new T3.Vector3(st.xA, 0, -st.dA));
    return Math.hypot(sb.x - si.x, sb.y - si.y) < 45 && Math.hypot(bb.x - bi.x, bb.y - bi.y) < 60;
  }
  function onA() {   // B 在画面上叠在了蜡烛 A 身上（常见误操作：对准的是 A，不是 A 的像）
    if (!V) return false;
    var h = pairH() * 0.5, sb = V.toScreen(new T3.Vector3(st.xB, h, -st.dB)), sa = V.toScreen(new T3.Vector3(st.xA, h, st.dA));
    return Math.hypot(sb.x - sa.x, sb.y - sa.y) < 70;
  }
  var SNAP = 2.0;   // B 离像 2 cm 以内就吸到像的位置（斜着看 3D 画面时前后很难对得很准）
  function setPos(k, x, d, snap) {   // snap：拖动时用 SNAP，滑杆微调时用 0.8，免得滑杆在像附近“卡住”
    x = clamp(x, -12, 12); d = clamp(d, minD(k), 18);
    if (k === 'A') { st.xA = Math.round(x * 10) / 10; st.dA = Math.round(d * 10) / 10; }
    else {
      if (st.screen) return;
      if (!vertical()) st.tryB = true;   // 玻璃板倾斜后学生拖过 B
      if (vertical() && !st.short && Math.abs(x - st.xA) < (snap || 0.8) && Math.abs(d - st.dA) < (snap || 0.8)) { x = st.xA; d = st.dA; }
      st.xB = Math.round(x * 10) / 10; st.dB = Math.round(d * 10) / 10;
    }
    changed();
  }
  function minD(k) {   // 玻璃板倾斜时，倒向这一侧的那支蜡烛要离远一点，免得插进玻璃板
    var lean = k === 'A' ? -st.tilt : st.tilt;
    return 2 + (lean > 0 ? (CH + 1.5) * Math.sin(lean * Math.PI / 180) : 0);
  }
  function mirrorMatrix() {   // 关于玻璃板平面（过底边、法线 n）的反射矩阵 I − 2nnᵀ
    var a = st.tilt * Math.PI / 180, n = new T3.Vector3(0, Math.sin(a), Math.cos(a)), m = new T3.Matrix4();
    m.set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 0, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 0, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 0, 0, 0, 0, 1);
    return m;
  }

  /* 改蜡烛长度：烛身拉伸，烛芯、火焰跟着移到顶端 */
  function pairH() { return st.pair ? 5.6 : CH; }
  function setH(c, h) {
    var u = c.userData; u.body.scale.y = h / u.body.geometry.parameters.height; u.body.position.y = h / 2;
    u.top.position.y = h + 0.07; u.wick.position.y = h + 0.35; if (u.flame) u.flame.position.y = h + 1.15;
    u.hit.scale.y = (h + 3) / (u.h + 3); u.hit.position.y = (h + 3) / 2; u.curH = h;
  }
  var foot, footMat, dragB = false;
  function tick(dt) {
    t += dt;
    if (foot) {
      var near = dragB && vertical() && !st.short && !st.screen && Math.abs(st.xB - st.xA) < 6 && Math.abs(st.dB - st.dA) < 6, hit = near && coincide();
      foot.visible = near; foot.position.set(st.xA, 0.06, -st.dA); footMat.color.setHex(hit ? 0x1B7A50 : 0xFE752D);
    }
    glassG.rotation.x = -st.tilt * Math.PI / 180;
    candA.position.set(st.xA, 0, st.dA);
    var hp = pairH(); setH(candA, hp); setH(image, hp); setH(ghost, hp); setH(bBody.tall, hp); setH(bBody.short, hp * 0.65);
    var bOn = st.short ? bBody.short : bBody.tall, bOff = st.short ? bBody.tall : bBody.short;
    candB = bOn; bOff.visible = false; bOn.visible = true;
    // 放了光屏时，B 挪到桌角，光屏放在像的位置
    if (st.screen) { bOn.position.set(st.xA < -6 ? 15 : -15, 0, -15); screen.visible = true; screen.position.set(st.xA, 0, -st.dA); }   // B 拿开，放在玻璃板旁边的桌上（不被观察窗挡住）
    else { bOn.position.set(st.xB, 0, -st.dB); screen.visible = true; screen.position.set(19, 0, -13); }   // 光屏先放在桌旁（后方角落）
    candA.updateMatrixWorld(true);
    image.matrix.copy(mirrorMatrix()).multiply(candA.matrixWorld); image.matrixWorldNeedsUpdate = true;
    ghost.matrix.copy(image.matrix); ghost.matrixWorldNeedsUpdate = true; ghost.visible = st.tilt > 0.5;
    flames.forEach(function (f, i) { var s = 1 + Math.sin(t * 11 + i) * 0.05 + Math.sin(t * 17) * 0.03; f.scale.set(1, s, 1); });
    V.placeTag('A', new T3.Vector3(st.xA + 2.2, hp * 0.55, st.dA)); V.tag('A').style.transform = 'translate(0, -50%)';
    V.placeTag('B', new T3.Vector3(bOn.position.x, bOn.userData.curH + 3, bOn.position.z));
    // 主画面里给虚像加个标签（B 已经挪到像附近时不显示，免得两个标签叠在一起）
    var ih = new T3.Vector3(st.xA, hp + 2.6, st.dA).applyMatrix4(mirrorMatrix());
    if (st.screen && st.eye === 'S') st.virtSeen = true;   // 第 4 问：放了光屏、并从光屏一侧看过之后，才标“虚像”
    V.tag('img', K.S.q >= 4 || (K.S.q === 3 && st.virtSeen) ? 'A 的像（虚像）' : 'A 的像');
    V.placeTag('img', ih);
    if (Math.hypot(st.xB - st.xA, st.dB - st.dA) < 3 && !st.screen) V.tag('img').style.display = 'none';
    else avoid('img', 'B');
    V.placeTag('scr', new T3.Vector3(st.xA, 13.6, -st.dA)); if (!st.screen) V.tag('scr').style.display = 'none';
    // 玻璃板倾斜：像的底端离开纸面多少
    var base = new T3.Vector3(st.xA, 0, st.dA).applyMatrix4(mirrorMatrix()), sk = V.tag('sink');
    if (vertical() || !st.tryB) sk.style.display = 'none';   // 倾斜后先让学生拖 B 试，再标出像沉 / 浮了多少
    else { V.tag('sink', base.y < 0 ? '像的底部沉到纸面下 ' + r1(-base.y) + ' cm' : '像的底部浮在纸面上方 ' + r1(base.y) + ' cm'); V.placeTag('sink', base); }
    V.tag('A').style.borderColor = st.sel === 'A' ? '#2563EB' : ''; V.tag('B').style.borderColor = st.sel === 'B' ? '#2563EB' : '';
    if (!winEl) {
      winEl = K.el('<div class="lk-win" style="width:350px"><h3><span>人眼观察</span><small id="eye-t"></small></h3><canvas class="vp" style="display:block;width:326px;height:206px;border:1px solid #C3CEDC;border-radius:8px"></canvas><span class="eye-lb" style="position:absolute;transform:translate(-50%,-100%);padding:1px 8px;border:2px solid #1E3A5F;border-radius:8px;background:rgba(255,255,255,.95);font-size:16px;font-weight:600;display:none">光屏</span><p class="cap" id="eye-c" style="margin:6px 0 0;font-size:15px;color:#56677D"></p></div>');
      vp = winEl.querySelector('.vp');
    }
    ui();
  }
  /* 两个标签在屏幕上叠住时，把 id 那个往上挪开 */
  function avoid(id, other) {
    var a = V.tag(id), b = V.tag(other); if (a.style.display === 'none' || b.style.display === 'none') return;
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    if (ra.right < rb.left || rb.right < ra.left || ra.bottom < rb.top || rb.bottom < ra.top) return;
    a.style.top = (parseFloat(a.style.top) - (ra.bottom - rb.top + 6) / K.scale) + 'px';
  }
  /* 人眼观察窗：窗里单独一块小画布，用第二个相机（同一个场景、同一个镜像位置）再画一遍 */
  var eyeR = null;
  function drawEye() {
    if (!vp) return;
    if (!eyeR) { eyeR = new T3.WebGLRenderer({ canvas: vp, antialias: true }); eyeR.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); eyeR.setSize(326, 206, false); eyeR.setClearColor(0xF7F9FC, 1); eyeR.localClippingEnabled = true; }
    var tgt = new T3.Vector3(st.xA, st.eye === 'A' ? 4.5 : 6, -st.dA);
    if (st.eye === 'A') eyeCam.position.set(st.xA + 7, 11, st.dA + 26);
    else eyeCam.position.set(st.xA + (st.xA > 6 ? -10 : 10), 12, -st.dA * 0.1);   // 光屏一侧：站在玻璃板和光屏之间，从斜上方直接看光屏（不透过玻璃）
    eyeCam.fov = st.eye === 'A' ? 30 : 64; eyeCam.aspect = 326 / 206; eyeCam.updateProjectionMatrix(); eyeCam.lookAt(tgt); eyeCam.updateMatrixWorld();
    var imgVis = image.visible, gVis = ghost.visible; image.visible = st.eye === 'A'; ghost.visible = gVis && st.eye === 'A';   // 虚像只有透过玻璃板（从 A 一侧）才看得到
    eyeR.render(V.scene, eyeCam);
    image.visible = imgVis; ghost.visible = gVis;
    // 观察窗里给光屏标个名字
    var lb = winEl.querySelector('.eye-lb');
    if (st.eye !== 'A' && st.screen) { var p = new T3.Vector3(st.xA, 7.5, -st.dA).project(eyeCam); lb.style.display = ''; lb.style.left = (12 + (p.x + 1) / 2 * 326) + 'px'; lb.style.top = (40 + (1 - p.y) / 2 * 206) + 'px'; }
    else lb.style.display = 'none';
  }

  /* ── 检查与记录 ── */
  function changed() { last = ''; }
  function dup() { return st.rows.some(function (r) { return !!r.pair === st.pair && Math.abs(r.dA - st.dA) < 0.05 && Math.abs(r.xA - st.xA) < 0.05; }); }   // 换了一对较矮的蜡烛，在原位置也算新的一组
  function ui() {
    var co = coincide(), ok = co && !dup(), hint, tone = '', q = K.S.q;
    var checks = [{ label: '玻璃板竖直', ok: vertical() }, { label: '两烛等高', ok: !st.short }, { label: 'B 与像重合', ok: st.screen ? null : co }];
    if (!vertical() && !st.tryB) hint = '玻璃板' + (st.tilt > 0 ? '向后' : '向前') + '倾斜了。再拖 B 试试，能不能和像完全重合。';   // 先给操作指引，拖过 B 再给结论
    else if (!vertical()) { hint = '玻璃板' + (st.tilt > 0 ? '向后倾，A 的像沉到了桌面下方' : '向前倾，A 的像浮到了桌面上方') + '，B 怎么移都对不上。玻璃板要竖直放。'; tone = 'warn'; }
    else if (st.screen) hint = st.eye === 'A' ? '光屏放在了像的位置。换到「从光屏一侧看」，光屏上有像吗？' : '光屏上没有像：平面镜成的是虚像。';
    else if (st.short) { hint = 'B 比 A 矮，和像不能完全重合。换回等高的蜡烛。'; tone = 'warn'; }
    else if (!co && q === 0) hint = '看右上「人眼观察」窗：从 A 一侧透过玻璃板，玻璃板后面出现了什么？';
    else if (!co && q === 5) hint = (demo.length ? '纸上浅色的是 3 组示范标记。' : '') + '比较每组 A、B 的连线和镜面位置线是什么关系。';
    else if (!co && q === 3) hint = '打开「光屏」开关（放在像处），再选「从光屏一侧看」。';
    else if (!co && q === 4) hint = '在「调哪个」选「玻璃板」，向后倾约 10°，再拖 B 找重合。';
    else if (!co && onA()) { hint = 'B 对着的是蜡烛 A 本身。要把 B 移到玻璃板后面、A 的像所在的位置（虚线标签「A 的像」那里）。'; tone = 'warn'; }
    else if (!co) hint = '把蜡烛 B 拖到玻璃板后面，移到「A 的像」那里，直到 B 和像完全重合。';
    else if (dup()) hint = '这一组已经记过了。把 A 换个位置，再用 B 找像。';
    else { hint = '已重合。读出两侧距离，再记录。'; tone = 'good'; }
    K.state({ checks: checks, hint: hint, tone: tone, read: false });
    var key = [ok, st.xA, st.dA, st.xB, st.dB, st.sel, st.tilt, st.screen, st.short, st.pair, st.eye, st.rows.length].join('|');
    if (key === last) return; last = key;
    K.setReading('a', r1(st.dA)); K.setReading('b', st.screen ? null : r1(st.dB));
    K.setRecord(ok, ok ? '记入第 ' + (st.rows.length + 1) + ' 次，并在纸上标出 A、B 的位置' : '', ok ? 'good' : '');
    K.setCount(st.rows.length + ' 组');
    document.getElementById('eye-t').textContent = st.eye === 'A' ? '从 A 一侧透过玻璃板' : '从光屏一侧直接看';
    document.getElementById('eye-c').textContent = st.eye === 'A' ? (co ? '像和 B 重合：B 好像也被点燃了' : '玻璃板后面的“蜡烛”就是 A 的像') : (st.screen ? '光屏上没有像' : '不透过玻璃板，就看不到像');
    syncCtrls();
  }
  function addMarks(r, list, op) {   // 纸上留下 A（橙点）、B（蓝点）的位置和连线；op<1 为示范标记（浅色）
    list = list || marks; op = op || 1;
    var mA = new T3.MeshBasicMaterial({ color: 0xE07A2E, transparent: op < 1, opacity: op }), mB = new T3.MeshBasicMaterial({ color: 0x2563EB, transparent: op < 1, opacity: op }), lineM = new T3.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: op < 1 ? .5 : .7 });
    [[r.xA, r.dA, mA], [r.xB, -r.dB, mB]].forEach(function (p) { var d = new T3.Mesh(new T3.CircleGeometry(0.35, 16), p[2]); d.rotation.x = -Math.PI / 2; d.position.set(p[0], 0.012, p[1]); V.scene.add(d); list.push(d); });
    var len = r.dA + r.dB, l = new T3.Mesh(new T3.PlaneGeometry(0.18, len), lineM); l.rotation.x = -Math.PI / 2; l.position.set(r.xA, 0.011, (r.dA - r.dB) / 2); V.scene.add(l); list.push(l);
  }
  function setDemo(on) {
    demo.forEach(function (m) { V.scene.remove(m); }); demo = [];
    if (on) DEMO.forEach(function (p) { addMarks({ xA: p[0], dA: p[1], xB: p[0], dB: p[1] }, demo, 0.6); });
  }

  /* ── 控件：调哪个（选择 A / B / 玻璃板，下面只出它的滑杆）→ 换蜡烛（选择）→ 观察（选择）→ 光屏（开关） ── */
  var ctl = null;   // 面板当前调的对象：'A'、'B' 跟随 st.sel；'G' = 玻璃板（只是面板状态，不改 st.sel）
  function ctrls() {
    K.ctrl.innerHTML =
      K.grp('调哪个', K.seg('ctl', [['A', '蜡烛 A'], ['B', '蜡烛 B'], ['G', '玻璃板']]) +
        '<div class="row" id="r-d"><span class="nm">离镜</span><input class="rng" type="range" id="s-d" min="2" max="18" step="0.1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-d"></span><span class="un">cm</span></div>' +
        '<div class="row" id="r-off" hidden><span class="nm">蜡烛 B</span><span class="vl" style="font-size:20px">已拿开（光屏放在像处）</span></div>' +
        '<div class="row" id="r-x"><span class="nm">左右</span><input class="rng" type="range" id="s-x" min="-12" max="12" step="0.1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-x"></span><span class="un">cm</span></div>' +
        '<div class="row" id="r-t"><span class="nm">倾斜</span><input class="rng" type="range" id="s-t" min="-15" max="15" step="1" style="flex:1;min-width:0;width:auto"><span class="vl" id="v-t" style="font-size:20px;min-width:110px"></span></div>') +
      K.grp('换蜡烛', K.seg('cdl', [['o', '原来的一对'], ['s', '只把 B 换矮'], ['p', 'A、B 都换矮']])) +
      K.grp('观察', K.seg('eye', [['A', '从 A 一侧看'], ['S', '从光屏一侧看']])) +
      K.grp('光屏', '<div class="acts">' + K.sw('scr', '光屏', '放在像处', '不放', st.screen) + '</div>');
    document.querySelectorAll('[data-ctl]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-ctl'); ctl = v; if (v !== 'G') { st.sel = v; changed(); } syncCtrls(); }; });
    document.querySelectorAll('[data-cdl]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-cdl'); st.short = v === 's'; st.pair = v === 'p'; changed(); }; });
    var sd = document.getElementById('s-d'), sx = document.getElementById('s-x'), stt = document.getElementById('s-t');
    K.rng(sd); K.rng(sx); K.rng(stt);
    sd.addEventListener('input', function () { if (st.sel === 'A') setPos('A', st.xA, +sd.value); else setPos('B', st.xB, +sd.value); });
    sx.addEventListener('input', function () { if (st.sel === 'A') setPos('A', +sx.value, st.dA); else setPos('B', +sx.value, st.dB); });
    stt.addEventListener('input', function () { if (vertical() && Math.abs(+stt.value) >= 0.5) st.tryB = false; st.tilt = +stt.value; st.dA = Math.max(st.dA, Math.round(minD('A') * 10) / 10); if (!st.screen) st.dB = Math.max(st.dB, Math.round(minD('B') * 10) / 10); changed(); });
    document.getElementById('scr').onclick = function () { st.screen = !st.screen; if (!st.screen) st.eye = 'A'; changed(); };
    document.querySelectorAll('[data-eye]').forEach(function (b) { b.onclick = function () { st.eye = b.getAttribute('data-eye'); changed(); }; });
  }
  function syncCtrls() {
    var a = st.sel === 'A', sd = document.getElementById('s-d'), sx = document.getElementById('s-x'), stt = document.getElementById('s-t');
    if (ctl !== 'G') ctl = st.sel;
    document.querySelectorAll('[data-ctl]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-ctl') === ctl); });
    var bOff = !a && st.screen;   // 放了光屏时 B 已挪到桌角：不显示它的滑杆，只说明已拿开
    document.getElementById('r-d').hidden = document.getElementById('r-x').hidden = ctl === 'G' || bOff; document.getElementById('r-t').hidden = ctl !== 'G';
    document.getElementById('r-off').hidden = ctl === 'G' || !bOff;
    var cd = st.pair ? 'p' : st.short ? 's' : 'o';
    document.querySelectorAll('[data-cdl]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cdl') === cd); });
    if (document.activeElement !== sd) sd.value = a ? st.dA : st.dB; if (document.activeElement !== sx) sx.value = a ? st.xA : st.xB; if (document.activeElement !== stt) stt.value = st.tilt;
    sd.disabled = sx.disabled = !a && st.screen;
    [sd, sx, stt].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
    document.getElementById('v-d').textContent = r1(a ? st.dA : st.dB);
    document.getElementById('v-x').textContent = r1(a ? st.xA : st.xB);
    document.getElementById('v-t').textContent = vertical() ? '竖直' : (st.tilt > 0 ? '向后倾 ' : '向前倾 ') + Math.abs(st.tilt) + '°';
    K.setSw('scr', st.screen);
    document.querySelectorAll('[data-eye]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-eye') === st.eye); });
  }

  function preset(i) {
    // [A 左右, A 离镜, B 左右, B 离镜]：不预先重合，留给学生找；各问 A 的左右位置不同，记下的几组连线不会叠成一条
    var P = [[0, 10, -7, 4], [0, 10, -7, 4], [-5, 15, 2, 10], [0, 10, 5, 10], [0, 10, 5, 10], [4, 10, -4, 10]][i];
    st.xA = P[0]; st.dA = P[1]; st.xB = P[2]; st.dB = P[3]; st.sel = 'B'; ctl = i === 4 ? 'G' : null; st.tilt = 0; st.screen = false; st.short = false; st.pair = false; st.eye = 'A'; st.virtSeen = false; st.tryB = false;
    // 第 6 问：已记录的位置不足 3 处时，纸上补 3 组示范标记
    var xs = {}; st.rows.forEach(function (r) { xs[r.xA + ',' + r.dA] = 1; });
    setDemo(i === 5 && Object.keys(xs).length < 3); changed();
  }

  window.__exp = { st: st, V: function () { return V; }, candA: function () { return candA; }, candB: function () { return candB; } };   // 供自动测试读取状态
  LabKit.run({
    readings: [{ id: 'a', name: 'A 到镜面', unit: 'cm' }, { id: 'b', name: 'B 到镜面', unit: 'cm' }],
    init: function (k) { K = k; ctrls(); build(); K.el('<p class="lk-note">拖蜡烛 A、B；拖空白处转视角</p>'); },
    preset: preset,
    reset: function () { preset(K.S.q); },
    onMode: function () { last = ''; },
    record: function () { if (!coincide() || dup()) return; var r = { xA: st.xA, dA: st.dA, xB: st.xB, dB: st.dB, pair: st.pair }; st.rows.push(r); addMarks(r); last = ''; },
    clear: function () { st.rows = []; marks.forEach(function (m) { V.scene.remove(m); }); marks = []; if (K.S.q === 5) setDemo(true); last = ''; },
    renderData: function () {
      return '<div class="dvh"><h2>记录表</h2></div>' +
        '<table class="rec" style="max-width:1000px"><colgroup><col style="width:12%"><col style="width:22%"><col><col></colgroup><thead><tr><th>次数</th><th>蜡烛</th><th>蜡烛到平面镜的距离/cm</th><th>蜡烛的像到平面镜的距离/cm</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, k) { return '<tr><td>' + (k + 1) + '</td><td>' + (r.pair ? '较矮的一对' : '原来的一对') + '</td><td class="n">' + r1(r.dA) + '</td><td class="n">' + r1(r.dB) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="dim" style="text-align:center">还没有记录</td></tr>') +
        '</tbody></table><p class="tip">像的位置用与像重合的蜡烛 B 标出。比较每组两侧距离；再看纸上每组 A、B 的连线和镜面位置线的关系。</p>';
    }
  });
})();
