/* scenarios.js — 실험 사례(예시) 데이터. DOM 없음, 브라우저·Node 공용.
 * 형식: { id, kind, emoji, title, hook, scene, question, how, cols: [이름1, 이름2], rows: [[x, y], …],
 *         tempUnit: 'C' | 'K'(온도를 쓰는 종류만), unknownA(검량선만), ref: { value, label, unit, source } | null, source }
 * KINDS에 없는 kind의 사례는 화면에서 숨긴다(stories.js). 종류가 추가되면 저절로 나타난다.
 * 자료 출처: 모두 실제 논문 · 편람의 측정값이 아니다. 교과서에 나오는 상수(ref)에 맞춰 작은 잡음을 얹어
 * 직접 만든 연습용 값이다. 아래 rows는 모형의 뼈대이고, 파일 끝에서 고정 씨앗으로 50점을 만든다(그중 1점은 일부러 틀린 값).
 * 설명 수준: 일반화학 · 화학 II를 배운 고등학생(과학고)이 실험 보고서를 쓸 때 보는 정도. */
(function (root, factory) {
  var m = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var MADE = '교과서 수준의 예시 값(직접 만든 연습용 데이터)';
  var WRONG = ' 측정값 50개 가운데 1개는 잘못 기록된 값이다.';

  var SCENARIOS = [
    {
      id: 'no2-syringe',
      kind: 'vanthoff',
      emoji: '🧪',
      title: 'N₂O₄ ⇌ 2NO₂ 평형의 온도 의존성',
      hook: '평형 상수의 온도 변화에서 ΔH°와 ΔS°를 결정한다',
      scene: 'N₂O₄(무색)와 NO₂(적갈색)의 평형 혼합 기체를 밀폐 용기에 넣고, 항온조 온도를 25 °C에서 60 °C까지 올리며 ' +
        'NO₂의 흡광도로 분압을 구해 평형 상수 K_p를 계산했다. 온도가 오를수록 K_p가 커지는 흡열 해리 반응이다.' + WRONG,
      question: '반트 호프 도시의 기울기와 절편에서 표준 반응 엔탈피 ΔH°와 엔트로피 ΔS°를 95% 신뢰구간과 함께 구하고, 이상치가 결과에 주는 영향을 평가하라.',
      how: 'ln K = −(ΔH°/R)(1/T) + ΔS°/R 이므로 x = 1/T, y = ln K. 기울기 = −ΔH°/R, 절편 = ΔS°/R.',
      cols: ['온도', '평형 상수 K_p'],
      tempUnit: 'C',
      rows: [[25, 0.148], [30, 0.206], [35, 0.318], [40, 0.458], [45, 0.621], [50, 0.868], [55, 1.22], [60, 1.61]],
      ref: { value: 57.2, label: 'ΔH°', unit: 'kJ/mol', source: '표준 생성 엔탈피로 계산한 값(N₂O₄ → 2NO₂, 약 +57.2 kJ/mol)' },
      source: MADE
    },
    {
      id: 'sugar-slush',
      kind: 'freezing',
      emoji: '❄️',
      title: '수크로스 수용액의 어는점 내림',
      hook: '몰랄 농도–ΔTf 직선의 기울기로 K_f를 구한다',
      scene: '수크로스(비전해질, 반트 호프 인자 i = 1) 수용액을 몰랄 농도 0.2 ~ 1.4 mol/kg 범위로 만들고, ' +
        '얼음–소금 한제에서 냉각 곡선을 그려 어는점을 정했다. 순수한 물의 어는점과의 차이 ΔTf를 농도별로 기록했다.' + WRONG,
      question: '총괄성 ΔTf = K_f·m 이 이 농도 범위에서 성립하는지 잔차로 확인하고, 물의 몰랄 내림 상수 K_f를 문헌값 1.86 K·kg/mol과 비교하라.',
      how: 'ΔTf = K_f·m 이므로 x = m, y = ΔTf. 기울기 = K_f, 절편은 0에 가까워야 한다.',
      cols: ['몰랄 농도 m (mol/kg)', '어는점 내림 ΔTf (K)'],
      rows: [[0.2, 0.34], [0.4, 0.74], [0.6, 1.1], [0.8, 1.51], [1, 1.86], [1.2, 2.2], [1.4, 2.61]],
      ref: { value: 1.86, label: 'K_f', unit: 'K·kg/mol', source: '일반화학 교과서 값(물의 몰랄 내림 상수)' },
      source: MADE
    },
    {
      id: 'clock-reaction',
      kind: 'arrhenius',
      emoji: '⏱️',
      title: '아이오딘 시계 반응의 아레니우스 도시',
      hook: '속도 상수의 온도 의존성에서 E_a를 구한다',
      scene: '과황산 이온과 아이오딘화 이온의 반응(S₂O₈²⁻ + 2I⁻ → 2SO₄²⁻ + I₂)에 싸이오황산 이온과 녹말을 넣어, ' +
        '용액이 청람색으로 변하는 시간으로 초기 속도를 측정했다. 농도 조건을 고정하고 15 °C에서 50 °C까지 온도만 바꾸어 속도 상수 k를 구했다.' + WRONG,
      question: '아레니우스 식으로 활성화 에너지 E_a와 ln A를 구하고, "온도가 10 °C 오르면 속도가 2배"라는 경험 규칙이 이 반응에 맞는지 판단하라.',
      how: 'ln k = ln A − (E_a/R)(1/T) 이므로 x = 1/T, y = ln k. 기울기 = −E_a/R, 절편 = ln A. (25 °C 부근에서 10 °C마다 2배가 되려면 E_a ≈ 53 kJ/mol)',
      cols: ['온도', '속도 상수 k'],
      tempUnit: 'C',
      rows: [[15, 0.8627], [20, 1.232], [25, 1.737], [30, 2.423], [35, 3.343], [40, 4.566], [45, 6.174], [50, 8.272]],
      ref: null,
      source: MADE
    },
    {
      id: 'blue-fade',
      kind: 'first',
      emoji: '📉',
      title: '식용 색소 탈색의 유사 1차 반응',
      hook: 'ln[A]–t 직선성으로 반응 차수를 확인한다',
      scene: '식용 청색 색소 용액에 과량의 차아염소산 나트륨을 넣고, 분광 광도계로 흡광도를 추적해 색소 농도 [A]를 420 s 동안 기록했다. ' +
        '산화제가 과량이므로 색소에 대한 유사 1차 반응으로 다룰 수 있다.' + WRONG,
      question: 'ln[A]–t 도시가 직선인지 잔차로 확인하고, 유사 1차 속도 상수 k′과 반감기 t½ = ln 2 / k′을 구하라.',
      how: 'ln[A] = ln[A]₀ − k′t 이므로 x = t, y = ln[A]. 기울기 = −k′.',
      cols: ['시간 t (s)', '농도 [A] (mol/L)'],
      rows: [[0, 0.1], [60, 0.08607], [120, 0.07408], [180, 0.06376], [240, 0.05488], [300, 0.04724], [360, 0.04066], [420, 0.03499]],
      ref: null,
      source: MADE
    },
    {
      id: 'mystery-metal',
      kind: 'linear',
      emoji: '⚖️',
      title: '미지 금속 시료의 밀도 결정',
      hook: '질량–부피 직선의 기울기로 물질을 동정한다',
      scene: '조성을 모르는 은백색 금속 조각을 눈금실린더의 물에 차례로 넣어 배제 부피 V를 읽고, 그때까지 넣은 조각의 총질량 m을 전자저울로 쟀다. ' +
        '한 번의 측정이 아니라 누적 측정값 전체의 회귀로 밀도를 정한다.' + WRONG,
      question: '기울기(밀도)와 95% 신뢰구간을 구하고, 알루미늄의 밀도 2.70 g/cm³가 그 구간 안에 드는지 판단하라. 절편이 0과 유의하게 다른지도 확인하라.',
      how: 'm = ρV 이므로 x = V, y = m. 기울기 = ρ, 절편은 0에 가까워야 한다(계통 오차 점검).',
      cols: ['부피 V (cm³)', '질량 m (g)'],
      rows: [[2, 5.39], [4.1, 11.22], [6, 16.33], [8.2, 22.31], [10.1, 27.43], [12, 32.35], [14.2, 38.21]],
      ref: { value: 2.7, label: '밀도(기울기 b)', unit: 'g/cm³', source: '일반화학 교과서 값(알루미늄의 밀도)' },
      source: MADE
    },
    {
      id: 'mountain-ramen',
      kind: 'clausius',
      emoji: '♨️',
      title: '물의 증기압 곡선과 증발 엔탈피',
      hook: 'ln P–1/T 직선에서 ΔH_vap를 구한다',
      scene: '공기를 뺀 플라스크에 물을 넣고 60 °C에서 95 °C까지 온도를 올리며 압력 센서로 포화 수증기압 P를 측정했다. ' +
        'P–T 곡선은 지수 함수 꼴로 증가하므로 그대로는 직선 회귀를 쓸 수 없다.' + WRONG,
      question: '클라우지우스–클라페이롱 식으로 물의 몰 증발 엔탈피 ΔH_vap를 구해 문헌값 40.7 kJ/mol(정상 끓는점에서의 값)과 비교하라. ΔH_vap를 온도와 무관하다고 둔 근사가 주는 영향도 논하라.',
      how: 'ln P = −(ΔH_vap/R)(1/T) + C 이므로 x = 1/T, y = ln P. 기울기 = −ΔH_vap/R.',
      cols: ['온도', '수증기압 P (mmHg)'],
      tempUnit: 'C',
      rows: [[60, 156.4], [65, 198.5], [70, 243], [75, 290.7], [80, 364.4], [85, 438.4], [90, 525.1], [95, 626.5]],
      ref: { value: 40.7, label: 'ΔH_vap', unit: 'kJ/mol', source: '일반화학 교과서 값(물의 증발 엔탈피, 100 °C)' },
      source: MADE
    },
    {
      id: 'potato-enzyme',
      kind: 'lineweaver',
      emoji: '🧬',
      title: '카탈레이스의 미카엘리스–멘텐 속도론',
      hook: '이중 역수 도시로 V_max와 K_m을 구한다',
      scene: '감자 추출액의 카탈레이스가 과산화 수소를 분해할 때(2H₂O₂ → 2H₂O + O₂), 기질 농도 [S]를 1 ~ 20 mM로 바꾸며 ' +
        '처음 1분 동안의 O₂ 발생량으로 초기 속도 v를 측정했다. [S]가 커질수록 v가 포화되는 효소 반응 곡선이 나온다.' + WRONG,
      question: '라인위버–버크 도시에서 V_max와 K_m을 구하라. 역수 변환이 낮은 [S] 영역의 측정 오차를 크게 만든다는 점이 결과에 주는 영향을 논하라.',
      how: 'v = V_max[S]/(K_m + [S]) 의 역수를 취하면 1/v = (K_m/V_max)(1/[S]) + 1/V_max. x = 1/[S], y = 1/v. 절편 = 1/V_max, 기울기 = K_m/V_max.',
      cols: ['기질 농도 [S] (mM)', '초기 속도 v (mL O₂/min)'],
      rows: [[1, 0.0715], [2, 0.126], [3, 0.167], [5, 0.23], [8, 0.281], [12, 0.329], [20, 0.382]],
      ref: null,
      source: MADE
    },
    {
      id: 'exhaust-no2',
      kind: 'second',
      emoji: '🔥',
      title: 'NO₂ 열분해의 2차 반응 속도',
      hook: '1/[A]–t 직선성으로 2차 반응을 확인한다',
      scene: '가열한 반응 용기(약 300 °C)에서 NO₂가 2NO₂ → 2NO + O₂로 분해될 때, NO₂ 농도를 360 s 동안 기록했다. ' +
        'ln[A]–t 도시는 곡선이 되어 1차 반응 가정과 맞지 않았다.' + WRONG,
      question: '1/[A]–t 도시의 직선성으로 반응이 NO₂에 대해 2차임을 확인하고, 속도 상수 k를 95% 신뢰구간과 함께 구하라.',
      how: '속도 = k[NO₂]² 이면 1/[A] = 1/[A]₀ + kt 이므로 x = t, y = 1/[A]. 기울기 = k.',
      cols: ['시간 t (s)', '농도 [NO₂] (mol/L)'],
      rows: [[0, 0.00996], [60, 0.00743], [120, 0.00606], [180, 0.00514], [240, 0.0043], [300, 0.00384], [360, 0.00342]],
      ref: null,
      source: MADE
    },
    {
      id: 'blue-drink',
      kind: 'beer',
      emoji: '🔬',
      title: '청색 1호 색소의 검량선',
      hook: '비어–람베르트 법칙으로 미지 시료 농도를 정량한다',
      scene: '이온 음료에 든 청색 1호(Brilliant Blue FCF)를 정량하려고, 농도를 아는 표준 용액을 2 ~ 12 μmol/L(2×10⁻⁶ ~ 1.2×10⁻⁵ mol/L) 범위로 만들어 ' +
        '최대 흡수 파장(약 630 nm)에서 흡광도 A를 측정했다. 검량선이 직선이면 미지 시료의 흡광도에서 농도를 역산할 수 있다.' + WRONG,
      question: '검량선의 직선성(R², 잔차)과 기울기 εl을 구하고, 흡광도 0.520인 미지 시료의 농도를 정량하라. 절편이 0에서 벗어나면 그 원인(바탕 보정)을 생각해 보라.',
      how: 'A = εlc 이므로 x = c, y = A. 기울기 = εl, 절편은 0에 가까워야 한다.',
      cols: ['농도 c (mol/L)', '흡광도 A'],
      unknownA: 0.52,
      rows: [[0.000002, 0.214], [0.000004, 0.427], [0.000006, 0.629], [0.000008, 0.839], [0.00001, 1.056], [0.000012, 1.255]],
      ref: null,
      source: MADE
    }
  ];
  // 사례마다 점을 50개로(사람 요청): 위에 적은 점들로 구한 직선(선형화한 좌표)에 같은 크기의 작은 잡음을 얹어
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
    // 사람 요청: 사례마다 측정값 하나는 일부러 틀리게(직선에서 눈에 띄게 벗어나게) 넣는다
    // → ×와 "이상치를 뺀 직선"을 사례에서 바로 볼 수 있다. 어느 행인지는 wrongRow에 적어 둔다.
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
