/* 22 个实验的器材插图（viewBox 240×120）。
   线条：墨蓝；重点元素：currentColor（= 所在卡片的领域色）。
   动画钩子（样式在 site.css「插图动画」一节）：
   flow 光线/箭头流动　cur 电流沿导线走　spin 指针转　rock 横梁摆　bob 上下浮　slide 小车下滑
   flick 火焰跳动　bub 气泡上升　rise 液柱升降　swing 小磁针/指针摆　nudge 左右移动 */
(function () {
  var A = 'stroke="currentColor"', AF = 'fill="currentColor" stroke="none"';
  function o(x, y) { return ' style="transform-origin:' + x + 'px ' + y + 'px"'; }
  function bulb(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#fff"/><path d="M' + (x - 7) + ' ' + (y - 7) + 'l14 14M' + (x + 7) + ' ' + (y - 7) + 'l-14 14"/>'; }
  function meter(x, y, t) { return '<circle cx="' + x + '" cy="' + y + '" r="13" fill="#fff"/><text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" font-size="17" font-family="Times New Roman,serif" font-style="italic" fill="#1E3A5F" stroke="none">' + t + '</text>'; }
  /* 电池画在水平导线上：长极板在 x，短极板在 x+8 */
  function cell(x, y) { return '<path d="M' + x + ' ' + (y - 11) + 'v22M' + (x + 8) + ' ' + (y - 6) + 'v12" stroke-width="3"/>'; }
  function res(x, y, w) { return '<rect x="' + x + '" y="' + (y - 7) + '" width="' + (w || 30) + '" height="14" rx="2" fill="#fff"/>'; }
  function cur(d) { return '<path class="cur" d="' + d + '" ' + A + '/>'; }
  function flame(x, y, s) { s = s || 1; return '<path class="flick" d="M' + x + ' ' + y + 'c' + (-6 * s) + ' ' + (-6 * s) + ' ' + (-2 * s) + ' ' + (-14 * s) + ' 0 ' + (-18 * s) + ' ' + (2 * s) + ' ' + (4 * s) + ' ' + (6 * s) + ' ' + (12 * s) + ' 0 ' + (18 * s) + 'z" ' + AF + '/>'; }

  var I = {
    "01": '<rect x="20" y="70" width="200" height="22" rx="3" fill="#fff"/>' +
      '<path d="M30 70v9M50 70v14M70 70v9M90 70v14M110 70v9M130 70v14M150 70v9M170 70v14M190 70v9M210 70v14"/>' +
      '<rect x="50" y="46" width="100" height="24" rx="2" ' + A + ' fill="#fff"/>' +
      '<path class="flow" d="M50 36h100" ' + A + ' stroke-width="2"/><path d="M50 40v-8M150 40v-8" ' + A + ' stroke-width="2"/>' +
      '<circle cx="196" cy="34" r="18" fill="#fff"/><path d="M196 12v4M190 12h12"/><path class="spin"' + o(196, 34) + ' d="M196 34l7-9" ' + A + '/>',
    "02": '<path d="M20 98h200M30 98L210 44"/><path d="M210 44v54" stroke-dasharray="4 5"/>' +
      '<path d="M44 86v-16" stroke-width="4"/><path d="M120 76v-18" stroke-dasharray="3 4"/>' +
      '<g class="slide"><g transform="rotate(-16.7 80 80)"><rect x="62" y="68" width="34" height="14" rx="3" fill="#fff" ' + A + '/><circle cx="70" cy="85" r="4" fill="#fff"/><circle cx="89" cy="85" r="4" fill="#fff"/></g></g>' +
      '<circle cx="190" cy="26" r="13" fill="#fff"/><path d="M190 10v3"/><path class="spin"' + o(190, 26) + ' d="M190 26l5-7" ' + A + '/>',
    "03": '<path d="M70 30v62a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V30" fill="#fff"/><path d="M72 56h76" stroke-width="2" ' + A + ' opacity=".5"/>' +
      '<path d="M114 14v70" stroke-width="10"/><path d="M114 14v70" stroke-width="5" stroke="#fff"/>' +
      '<path class="rise"' + o(114, 86) + ' d="M114 48v38" ' + A + ' stroke-width="4"/><circle cx="114" cy="88" r="7" ' + AF + '/>' +
      '<path d="M122 22h6M122 32h6M122 42h6M122 52h6"/>',
    "04": '<path d="M78 24v52a6 6 0 0 0 6 6h52a6 6 0 0 0 6-6V24" fill="#fff"/><path d="M80 40h60" stroke-width="2"/>' +
      '<circle class="bub" cx="98" cy="70" r="4" ' + A + ' stroke-width="2"/><circle class="bub b2" cx="118" cy="72" r="5" ' + A + ' stroke-width="2"/><circle class="bub b3" cx="128" cy="70" r="3" ' + A + ' stroke-width="2"/><circle class="bub b4" cx="106" cy="72" r="3" ' + A + ' stroke-width="2"/>' +
      '<path d="M70 82h80M80 82l-10 26M140 82l10 26"/>' + flame(110, 106, 1) +
      '<path d="M132 10v52" stroke-width="3"/><circle cx="132" cy="64" r="4" ' + AF + '/>' +
      '<path d="M170 96V24M170 96h52" stroke-width="2"/><path class="flow" d="M174 84l14-30 14-14h18" ' + A + ' stroke-width="2.5"/>',
    "05": '<path d="M24 96h192"/><path d="M28 104l8-8M48 104l8-8M68 104l8-8M88 104l8-8M108 104l8-8M128 104l8-8M148 104l8-8M168 104l8-8M188 104l8-8M208 104l8-8" stroke-width="2"/>' +
      '<path d="M120 96V14" stroke-dasharray="5 6" stroke-width="2"/>' +
      '<path class="flow" d="M48 30L120 96L192 30" ' + A + ' stroke-width="3.5"/><path d="M180 34l12-4-6 11" ' + A + ' stroke-width="3"/>' +
      '<path d="M104 80a22 22 0 0 1 16-6M136 80a22 22 0 0 0-16-6" stroke-width="2"/>',
    "06": '<path d="M24 100h192"/><path d="M120 18v82" stroke-width="6" stroke="#C9D6E6"/><path d="M120 18v82" stroke-width="2"/>' +
      '<rect x="62" y="62" width="14" height="38" rx="2" fill="#fff"/>' + flame(69, 57, 1) +
      '<rect x="164" y="62" width="14" height="38" rx="2" fill="#fff" stroke-dasharray="4 4"/><g opacity=".45">' + flame(171, 57, 1) + '</g>' +
      '<path class="flow" d="M76 110h88" ' + A + ' stroke-width="2"/><path d="M76 106v8M164 106v8" ' + A + ' stroke-width="2"/>',
    "07": '<path d="M14 92h212" stroke-width="5"/><path d="M14 98h212" stroke-width="2"/>' +
      '<path d="M40 92V60M120 92V76M188 92V62" stroke-width="2.5"/>' +
      '<path d="M34 42h10M34 42v18M34 50h8" ' + A + ' stroke-width="4"/>' +
      '<path class="flow" d="M40 42L120 30L188 70M40 42L120 70L188 30" ' + A + ' stroke-width="2"/>' +
      '<ellipse cx="120" cy="50" rx="8" ry="26" fill="rgba(255,255,255,.7)"/>' +
      '<rect x="180" y="22" width="16" height="40" rx="2" fill="#fff"/><path d="M188 52v-10M188 42h-6" ' + A + ' stroke-width="3"/>',
    "08": '<path d="M120 26v58M84 96h72M98 96l22-12 22 12"/>' +
      '<g class="rock"' + o(120, 34) + '><path d="M60 34h120"/><path d="M68 34v20M172 34v20M48 54h40l-6 10H54zM152 54h40l-6 10h-28z" fill="#fff"/>' +
      '<rect x="58" y="40" width="20" height="14" rx="4" ' + A + ' stroke-width="2.5" fill="#fff"/><rect x="164" y="44" width="10" height="10" rx="2"/><rect x="176" y="46" width="8" height="8" rx="2"/></g>' +
      '<path class="swing"' + o(120, 34) + ' d="M120 34v30" ' + A + ' stroke-width="3"/>',
    "09": '<path d="M60 18v80a6 6 0 0 0 6 6h28a6 6 0 0 0 6-6V18" fill="#fff"/><path d="M60 48h40" ' + A + ' stroke-width="3"/>' +
      '<path d="M100 30h-10M100 42h-6M100 54h-10M100 66h-6M100 78h-10M100 90h-6" stroke-width="2"/>' +
      '<path d="M140 54v40a6 6 0 0 0 6 6h44a6 6 0 0 0 6-6V54" fill="#fff"/><path d="M142 72h52" stroke-width="2"/>' +
      '<g class="bob"><path d="M168 30v28" stroke-width="1.5"/><path d="M156 66l12-8 12 4 6 10-8 8h-18z" fill="#fff" ' + A + ' stroke-width="2.5"/></g>',
    "10": '<rect x="100" y="8" width="40" height="84" rx="6" fill="#fff"/><path d="M120 8V0"/>' +
      '<path d="M130 24h6M130 36h6M130 48h6M130 60h6M130 72h6" stroke-width="2"/>' +
      '<g class="bob"><path d="M120 18l-8 4 16 6-16 6 16 6-16 6 8 4" stroke-width="2"/><path d="M108 56h10" ' + A + ' stroke-width="3"/>' +
      '<path d="M120 60v42"/><rect x="108" y="102" width="24" height="16" rx="3" fill="#fff"/></g>',
    "11": '<path d="M16 94h208"/><path d="M20 104l8-10M44 104l8-10M68 104l8-10M92 104l8-10M116 104l8-10M140 104l8-10M164 104l8-10M188 104l8-10M212 104l8-10" stroke-width="2"/>' +
      '<g class="nudge"><rect x="40" y="62" width="64" height="32" rx="3" fill="#fff"/><rect x="58" y="44" width="16" height="18" rx="3" fill="#fff"/>' +
      '<path d="M104 78h30"/><rect x="134" y="68" width="66" height="20" rx="5" fill="#fff"/><path d="M146 78h20" ' + A + ' stroke-width="3"/></g>' +
      '<path class="flow" d="M204 78h16" ' + A + ' stroke-width="3"/><path d="M212 72l8 6-8 6" ' + A + ' stroke-width="3"/>',
    "12": '<path d="M24 34v60a6 6 0 0 0 6 6h64a6 6 0 0 0 6-6V34" fill="#fff"/><path d="M26 46h72" stroke-width="2"/>' +
      '<path d="M72 80h6V18h76v20" stroke-width="2.5"/><g class="bob"><path d="M62 80h10" stroke-width="5"/></g>' +
      '<path d="M154 38v52a14 14 0 0 0 28 0V38" fill="#fff"/><path d="M156 66v24a12 12 0 0 0 24 0V54" ' + A + ' stroke-width="4"/>' +
      '<path class="flow" d="M190 54h14M190 66h14" ' + A + ' stroke-width="2"/>',
    "13": '<path d="M70 50v52a6 6 0 0 0 6 6h88a6 6 0 0 0 6-6V50" fill="#fff"/><path d="M72 78h96" ' + A + ' stroke-width="2.5"/>' +
      '<g class="bob"><rect x="102" y="4" width="36" height="46" rx="5" fill="#fff"/><path d="M120 10l-6 4 12 5-12 5 12 5-6 4" stroke-width="2"/><path d="M110 40h10" ' + A + ' stroke-width="3"/>' +
      '<path d="M120 50v18"/><rect x="106" y="68" width="28" height="22" rx="3" fill="#fff"/></g>' +
      '<path class="flow" d="M152 98V64" ' + A + ' stroke-width="2.5"/><path d="M147 70l5-7 5 7" ' + A + ' stroke-width="2.5"/>',
    "14": '<path d="M120 46l-14 30h28z" fill="#fff"/><path d="M96 76h48"/>' +
      '<g class="rock"' + o(120, 46) + '><path d="M24 46h192" stroke-width="5"/>' +
      '<path d="M36 46v6M60 46v6M84 46v6M156 46v6M180 46v6M204 46v6" stroke-width="2"/>' +
      '<path d="M60 50v10M180 50v10"/><rect x="53" y="60" width="14" height="13" rx="3" fill="#fff"/><rect x="53" y="75" width="14" height="13" rx="3" fill="#fff"/><rect x="53" y="90" width="14" height="13" rx="3" fill="#fff"/>' +
      '<rect x="173" y="60" width="14" height="13" rx="3" fill="#fff" ' + A + '/><rect x="173" y="75" width="14" height="13" rx="3" fill="#fff" ' + A + '/>' +
      '<path d="M60 30h120M60 25v10M120 25v10M180 25v10" ' + A + ' stroke-width="2.5"/></g>',
    "15": '<path d="M110 90H40V30h160v60H118" stroke-width="2.5"/>' + cur('M118 90H200V30H40v60h70') + cell(110, 90) +
      bulb(120, 30) + meter(200, 60, 'A'),
    "16": '<path d="M110 100H30V44h26M70 44h16M86 22v44M86 22h68M86 66h68M154 22v44M154 44h56v21M210 91v9H118" stroke-width="2.5"/>' +
      cur('M118 100H210V44H154') + cur('M154 44V22H86V44') + cur('M154 44V66H86V44') + cur('M86 44H30V100H110') + cell(110, 100) +
      bulb(120, 22) + bulb(120, 66) + meter(210, 78, 'A') + meter(56, 44, 'A') +
      '<circle cx="86" cy="44" r="3.5" fill="#1E3A5F"/><circle cx="154" cy="44" r="3.5" fill="#1E3A5F"/>',
    "17": '<path d="M110 94H40V40h160v54H118" stroke-width="2.5"/>' + cur('M118 94H200V40H40v54h70') + cell(110, 94) +
      '<path d="M98 40v-26h44v26" stroke-width="2.5"/>' + bulb(120, 40) + meter(120, 14, 'V'),
    "18": '<path d="M110 98H30V46h180v52H118" stroke-width="2.5"/>' + cur('M118 98H210V46H30v52h80') + cell(110, 98) +
      '<path d="M70 46V22h40v24" stroke-width="2.5"/><path d="M130 46V22h40v24" stroke-width="2" stroke-dasharray="4 4"/>' +
      bulb(90, 46) + bulb(150, 46) + meter(90, 22, 'V') + meter(150, 22, 'V'),
    "19": '<path d="M60 98H26V40h188v58H68" stroke-width="2.5"/>' + cur('M68 98H214V40H26v58h34') + cell(60, 98) +
      '<path d="M60 40V16h50v24" stroke-width="2"/>' + res(70, 40) + meter(85, 16, 'V') +
      res(130, 98, 54) + '<g class="nudge"><path d="M164 114l-6-14" ' + A + ' stroke-width="3"/><path d="M156 108l2-8 6 4" ' + A + ' stroke-width="2"/></g>' +
      meter(186, 40, 'A'),
    "20": '<path d="M60 98H26V44h188v54H68" stroke-width="2.5"/>' + cur('M68 98H214V44H26v54h34') + cell(60, 98) +
      '<path d="M90 44V18h60v26" stroke-width="2"/>' + res(100, 44, 40) + meter(120, 18, 'V') + meter(214, 71, 'A') +
      '<text x="128" y="82" text-anchor="middle" font-size="18" font-family="Times New Roman,serif" font-style="italic" fill="currentColor" stroke="none">R = U / I</text>',
    "21": '<path d="M70 50h100v28H70z" stroke-width="2" fill="#fff"/>' +
      '<path d="M78 46v36M92 46v36M106 46v36M120 46v36M134 46v36M148 46v36M162 46v36" stroke-width="2.5"/>' +
      '<path d="M78 82v20h38M124 102h38v-20" stroke-width="2.5"/>' + cur('M124 102h38v-20') + cur('M78 82v20h32') + cell(116, 102) +
      '<g class="swing"' + o(36, 64) + '><path d="M22 64h14" ' + A + ' stroke-width="5"/><path d="M36 64h14" stroke-width="5"/></g>' +
      '<g class="swing s2"' + o(204, 64) + '><path d="M190 64h14" ' + A + ' stroke-width="5"/><path d="M204 64h14" stroke-width="5"/></g>' +
      '<g class="swing s3"' + o(120, 24) + '><path d="M134 24h-14" ' + A + ' stroke-width="5"/><path d="M120 24h-14" stroke-width="5"/></g>',
    "22": '<path d="M120 12H30v96h90V82H56V38h64z" fill="#fff"/>' +
      '<text x="100" y="31" text-anchor="middle" font-size="15" font-weight="700" fill="#1E3A5F" stroke="none">N</text>' +
      '<text x="100" y="101" text-anchor="middle" font-size="15" font-weight="700" fill="#1E3A5F" stroke="none">S</text>' +
      '<path d="M76 44v32M96 44v32M116 44v32" stroke-width="1.5" stroke-dasharray="3 4"/>' +
      '<path d="M96 60c40-50 80-40 90-14M96 60c40 50 80 40 90 14" stroke-width="2"/>' +
      '<g class="nudge"><circle cx="96" cy="60" r="7" fill="#1E3A5F"/><path d="M108 60h26M126 54l8 6-8 6" ' + A + ' stroke-width="3"/></g>' +
      '<circle cx="190" cy="60" r="18" fill="#fff"/><path class="swing"' + o(190, 72) + ' d="M190 72V54" ' + A + ' stroke-width="2.5"/><text x="190" y="77" text-anchor="middle" font-size="9" fill="#1E3A5F" stroke="none">G</text>'
  };

  window.LAB_ICON = function (no, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 240 120" fill="none" stroke="#1E3A5F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[no] || '') + '</svg>';
  };
})();
