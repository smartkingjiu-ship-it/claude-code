/* scenarios.js — 실험 이야기(예시) 데이터. DOM 없음, 브라우저·Node 공용.
 * 형식: { id, kind, emoji, title, hook, scene, question, how, cols: [이름1, 이름2], rows: [[x, y], …],
 *         tempUnit: 'C' | 'K'(온도를 쓰는 종류만), ref: { value, label, unit, source } | null, source }
 * KINDS에 없는 kind의 이야기는 화면에서 숨긴다(stories.js). 종류가 추가되면 저절로 나타난다.
 * 자료 출처: 모두 실제 논문 · 편람 값이 아니다. "앱 내장 샘플"이거나, 교과서에 나오는 상수(ref)에 맞춰
 * 작은 잡음을 얹어 직접 만든 연습용 값이다(고정 씨앗으로 한 번 만들어 적어 둔 숫자). */
(function (root, factory) {
  var m = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var MADE = '교과서 수준의 예시 값(직접 만든 연습용 데이터)';
  var BUILT_IN = '모의 측정값(앱 내장 샘플)';

  var SCENARIOS = [
    {
      id: 'no2-syringe',
      kind: 'vanthoff',
      emoji: '💉',
      title: '갈색 기체 주사기',
      hook: '따뜻한 물에 담그면 왜 더 진해질까?',
      scene: '과학실에서 N₂O₄와 NO₂가 섞인 기체를 주사기에 넣고, 물중탕 온도를 25 °C에서 60 °C까지 올려 봤어요. ' +
        '온도가 오를수록 갈색이 점점 진해져서, 색의 세기로 평형 상수 K를 구해 적어 두었어요. ' +
        '그런데 이 반응이 열을 얼마나 흡수하는지는 표만 봐서는 알 수가 없어요.',
      question: 'N₂O₄ ⇌ 2NO₂ 반응의 ΔH는 몇 kJ/mol일까요?',
      how: 'x축 1/T, y축 ln K로 그리면 기울기가 −ΔH/R이에요.',
      cols: ['온도', '평형 상수 K'],
      tempUnit: 'C',
      rows: [[25, 0.148], [30, 0.206], [35, 0.318], [40, 0.458], [45, 0.621], [50, 0.868], [55, 1.22], [60, 1.61]],
      ref: { value: 57.2, label: 'ΔH', unit: 'kJ/mol', source: '일반화학 교과서의 표준 생성 엔탈피로 계산한 값(약 +57 kJ/mol)' },
      source: MADE
    },
    {
      id: 'sugar-slush',
      kind: 'freezing',
      emoji: '🍧',
      title: '설탕물 슬러시',
      hook: '설탕을 넣을수록 얼마나 더 차가워야 얼까?',
      scene: '여름 축제 부스에서 슬러시를 만들려고 설탕물을 농도별로 준비했어요. ' +
        '얼음과 소금을 섞은 통에 시험관을 담그고, 얼기 시작하는 온도가 순수한 물보다 몇 도 내려갔는지 쟀어요. ' +
        '진할수록 잘 안 어는 건 알겠는데, 농도와 정확히 어떤 관계인지 궁금해요.',
      question: '물의 몰랄 내림 상수 Kf는 얼마일까요?',
      how: 'x축 몰랄 농도 m, y축 어는점 내림 ΔTf로 그리면 기울기가 Kf예요.',
      cols: ['몰랄 농도 m (mol/kg)', '어는점 내림 ΔTf (K)'],
      rows: [[0.2, 0.34], [0.4, 0.74], [0.6, 1.1], [0.8, 1.51], [1, 1.86], [1.2, 2.2], [1.4, 2.61]],
      ref: { value: 1.86, label: 'Kf', unit: 'K·kg/mol', source: '일반화학 교과서 값(물의 몰랄 내림 상수)' },
      source: MADE
    },
    {
      id: 'clock-reaction',
      kind: 'arrhenius',
      emoji: '⏱️',
      title: '색이 확 변하는 시계 반응',
      hook: '10 °C 올리면 정말 2배 빨라질까?',
      scene: '투명하던 용액이 어느 순간 갑자기 진한 남색으로 변하는 시계 반응을 온도를 바꿔 가며 해 봤어요. ' +
        '물중탕을 15 °C에서 50 °C까지 올릴수록 색이 변하는 시간이 눈에 띄게 짧아졌고, 그 시간으로 속도 상수 k를 구했어요. ' +
        '"10 °C 오르면 속도가 2배"라는 말이 맞는지 확인하고 싶어요.',
      question: '이 반응의 활성화 에너지 Ea는 몇 kJ/mol일까요?',
      how: 'x축 1/T, y축 ln k로 그리면 기울기가 −Ea/R이에요. Ea가 약 53 kJ/mol이면 실온 근처에서 10 °C마다 2배가 돼요.',
      cols: ['온도', '속도 상수 k'],
      tempUnit: 'C',
      rows: [[15, 0.8627], [20, 1.232], [25, 1.737], [30, 2.423], [35, 3.343], [40, 4.566], [45, 6.174], [50, 8.272]],
      ref: null,
      source: BUILT_IN
    },
    {
      id: 'blue-fade',
      kind: 'first',
      emoji: '🧴',
      title: '사라지는 파란 색소',
      hook: '색이 절반으로 옅어지는 데 몇 초?',
      scene: '파란 식용 색소 용액에 표백제를 조금 넣고, 색이 옅어지는 모습을 1분마다 기록했어요. ' +
        '색의 세기로 색소 농도를 구했더니 처음에는 빨리, 나중에는 천천히 줄어들었어요. ' +
        '농도–시간 그래프가 휘어져 있어서 빠르기를 숫자 하나로 말하기가 어려워요.',
      question: '속도 상수 k와 반감기는 얼마일까요?',
      how: 'x축 시간 t, y축 ln[A]로 그리면 기울기가 −k예요.',
      cols: ['시간 t (s)', '농도 [A]'],
      rows: [[0, 0.1], [60, 0.08607], [120, 0.07408], [180, 0.06376], [240, 0.05488], [300, 0.04724], [360, 0.04066], [420, 0.03499]],
      ref: null,
      source: BUILT_IN
    },
    {
      id: 'mystery-metal',
      kind: 'linear',
      emoji: '⚖️',
      title: '정체불명의 금속 조각',
      hook: '이 은빛 조각, 진짜 알루미늄일까?',
      scene: '과학실 서랍에서 이름표가 떨어진 은빛 금속 조각들을 찾았어요. ' +
        '눈금실린더의 물에 조각을 하나씩 더 넣으면서 늘어난 부피와 저울로 잰 질량을 차례로 적었어요. ' +
        '한 번 잰 값만으로는 믿기 어려워서 여러 점으로 확인하고 싶어요.',
      question: '기울기(밀도)가 알루미늄의 2.70 g/cm³와 맞을까요?',
      how: 'x축 부피 V, y축 질량 m으로 그리면 기울기가 밀도예요.',
      cols: ['부피 V (cm³)', '질량 m (g)'],
      rows: [[2, 5.39], [4.1, 11.22], [6, 16.33], [8.2, 22.31], [10.1, 27.43], [12, 32.35], [14.2, 38.21]],
      ref: { value: 2.7, label: '밀도(기울기 b)', unit: 'g/cm³', source: '일반화학 교과서 값(알루미늄의 밀도)' },
      source: MADE
    },
    {
      id: 'mountain-ramen',
      kind: 'clausius',
      emoji: '🍜',
      title: '산꼭대기 라면',
      hook: '높은 산에서는 왜 라면이 설익을까?',
      scene: '등산 동아리에서 "산 위에서는 물이 100 °C가 되기 전에 끓는다"는 말을 듣고 실험실에서 확인해 봤어요. ' +
        '밀폐한 플라스크 속 물의 온도를 60 °C에서 95 °C까지 올리며 압력 센서로 수증기압을 쟀어요. ' +
        '온도가 오를수록 압력이 점점 더 가파르게 올라가서 그냥 그리면 곡선이 돼요.',
      question: '물의 증발 엔탈피 ΔHvap는 몇 kJ/mol일까요?',
      how: 'x축 1/T, y축 ln P로 그리면 기울기가 −ΔHvap/R이에요.',
      cols: ['온도', '수증기압 P (mmHg)'],
      tempUnit: 'C',
      rows: [[60, 156.4], [65, 198.5], [70, 243], [75, 290.7], [80, 364.4], [85, 438.4], [90, 525.1], [95, 626.5]],
      ref: { value: 40.7, label: 'ΔHvap', unit: 'kJ/mol', source: '일반화학 교과서 값(물의 증발 엔탈피, 100 °C 근처)' },
      source: MADE
    },
    {
      id: 'potato-enzyme',
      kind: 'lineweaver',
      emoji: '🥔',
      title: '감자 속 효소',
      hook: '과산화수소를 더 넣으면 거품도 계속 빨라질까?',
      scene: '감자즙에 과산화수소수를 넣으면 카탈레이스 효소 덕분에 산소 거품이 보글보글 올라와요. ' +
        '과산화수소 농도를 1 mM에서 20 mM까지 바꿔 가며 처음 1분 동안 나온 산소의 양으로 반응 속도를 쟀어요. ' +
        '그런데 농도를 높여도 어느 순간부터는 속도가 잘 늘지 않았어요.',
      question: '최대 속도 Vmax와 Km은 얼마일까요?',
      how: 'x축 1/[S], y축 1/v로 그리면 y절편이 1/Vmax, 기울기가 Km/Vmax예요.',
      cols: ['기질 농도 [S] (mM)', '반응 속도 v (mL/min)'],
      rows: [[1, 0.0715], [2, 0.126], [3, 0.167], [5, 0.23], [8, 0.281], [12, 0.329], [20, 0.382]],
      ref: null,
      source: MADE
    },
    {
      id: 'exhaust-no2',
      kind: 'second',
      emoji: '🚗',
      title: '배기가스 속 갈색 기체',
      hook: '뜨거운 관 안에서 NO₂는 얼마나 빨리 사라질까?',
      scene: '자동차 배기가스의 갈색 성분인 NO₂가 뜨거운 용기 안에서 분해되는 빠르기를 알아보는 탐구예요. ' +
        '가열한 반응 용기 속 NO₂ 농도를 1분마다 기록했어요. ' +
        'ln[A]로 그려 봤더니 직선이 아니라 휘어져서, 1차 반응은 아닌 것 같아요.',
      question: '2차 반응이라면 속도 상수 k는 얼마일까요?',
      how: 'x축 시간 t, y축 1/[A]로 그리면 기울기가 k예요.',
      cols: ['시간 t (s)', '농도 [A] (mol/L)'],
      rows: [[0, 0.00996], [60, 0.00743], [120, 0.00606], [180, 0.00514], [240, 0.0043], [300, 0.00384], [360, 0.00342]],
      ref: null,
      source: MADE
    },
    {
      id: 'blue-drink',
      kind: 'beer',
      emoji: '🥤',
      title: '파란 이온 음료',
      hook: '음료 속 색소 농도를 빛으로 잴 수 있을까?',
      scene: '파란 이온 음료에 색소가 얼마나 들어 있는지 궁금해서, 먼저 농도를 아는 파란 색소 표준 용액을 여섯 가지 만들었어요. ' +
        '분광 광도계로 각 용액의 흡광도를 쟀더니 진할수록 값이 커졌어요. ' +
        '이 관계가 직선이라면 음료의 흡광도만 재도 농도를 알아낼 수 있어요.',
      question: '흡광도는 농도에 정말 비례할까요? 검정선의 기울기는 얼마일까요?',
      how: 'x축 농도 c, y축 흡광도 A로 그리면 기울기가 εl이에요.',
      cols: ['농도 c (μmol/L)', '흡광도 A'],
      rows: [[2, 0.214], [4, 0.427], [6, 0.629], [8, 0.839], [10, 1.056], [12, 1.255]],
      ref: null,
      source: MADE
    }
  ];
  // 예시마다 점을 50개로(사람 요청): 위에 적은 점들로 구한 직선(선형화한 좌표)에 같은 크기의 작은 잡음을 얹어
  // 다시 만든다. 씨앗이 고정이라 언제 열어도 같은 값이다. 모두 직접 만든 연습용 데이터다.
  var MADE50 = '교과서 수준의 예시 값(직접 만든 연습용 데이터 50점, 그중 1점은 일부러 틀리게 넣은 값)';
  var TF = {
    vanthoff: ['invT', 'ln'], arrhenius: ['invT', 'ln'], clausius: ['invT', 'ln'],
    first: ['id', 'ln'], second: ['id', 'inv'], lineweaver: ['inv', 'inv'],
    freezing: ['id', 'id'], linear: ['id', 'id'], beer: ['id', 'id']
  };
  function fwd(t, v, s) {
    if (t === 'invT') return 1 / (v + (s.tempUnit === 'K' ? 0 : 273.15));
    return t === 'ln' ? Math.log(v) : t === 'inv' ? 1 / v : v;
  }
  function back(t, v) { return t === 'ln' ? Math.exp(v) : t === 'inv' ? 1 / v : v; }
  function sig(v, n) { return Number(v.toPrecision(n)); }
  function densify(s, N) {
    var tf = TF[s.kind];
    if (!tf || s.rows.length >= N) return;
    var xs = s.rows.map(function (r) { return fwd(tf[0], r[0], s); });
    var ys = s.rows.map(function (r) { return fwd(tf[1], r[1], s); });
    var n = xs.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += xs[i] / n; my += ys[i] / n; }
    var sxx = 0, sxy = 0;
    for (i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); sxy += (xs[i] - mx) * (ys[i] - my); }
    var b = sxy / sxx, a = my - b * mx, sse = 0;
    for (i = 0; i < n; i++) { var e = ys[i] - a - b * xs[i]; sse += e * e; }
    var sd = Math.sqrt(sse / Math.max(1, n - 2));
    var seed = 7;
    for (i = 0; i < s.id.length; i++) seed = (seed * 31 + s.id.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function gauss() { var u = 0, k; for (k = 0; k < 6; k++) u += rnd(); return (u - 3) / Math.sqrt(0.5); }
    // 사람 요청: 예시마다 측정값 하나는 일부러 틀리게(직선에서 눈에 띄게 벗어나게) 넣는다
    // → ×와 "이상치를 뺀 직선"을 예시에서 바로 볼 수 있다. 어느 행인지는 wrongRow에 적어 둔다.
    var wrong = 15 + seed % 20;                                   // 가운데쯤의 한 행(0부터)
    var span = Math.abs(b * (fwd(tf[0], s.rows[n - 1][0], s) - fwd(tf[0], s.rows[0][0], s)));
    var slip = Math.max(8 * sd, 0.08 * span) * (tf[1] === 'inv' || seed % 2 ? 1 : -1);
    var x0 = s.rows[0][0], x1 = s.rows[n - 1][0], rows = [];
    for (i = 0; i < N; i++) {
      var x = sig(x0 + (x1 - x0) * i / (N - 1), 4);
      var y = back(tf[1], a + b * fwd(tf[0], x, s) + sd * gauss() + (i === wrong ? slip : 0));
      if (!isFinite(y) || (tf[1] !== 'id' && y <= 0)) return;   // 이상하면 원래 값을 그대로 둔다
      rows.push([x, sig(y, 4)]);
    }
    s.rows = rows;
    s.wrongRow = wrong + 1;                                       // 일부러 틀리게 넣은 행(1부터)
    s.source = MADE50;
  }
  SCENARIOS.forEach(function (s) { densify(s, 50); });
  return { SCENARIOS: SCENARIOS };
});
