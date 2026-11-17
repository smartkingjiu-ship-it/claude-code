/* samples.js — 내장 샘플 (값은 tests/fixtures.json의 "현실 샘플" fixture와 같다) */
(function (root, factory) {
  var m = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var SAMPLES = {
    // 학생 실험 수준의 잡음(K에 약 2.5%)이 있는 반트 호프 측정값 예시. 팀 실측값이 생기면 이것과 fixture "현실 샘플"을 함께 바꾼다
    vanthoff: {
      label: '반트 호프 샘플',
      tempUnit: 'C',
      rows: [[15, 6813], [20, 4830], [25, 3582], [30, 2507], [35, 1714], [40, 1309], [45, 952.7], [50, 725]]
    },
    // 어는점 내림: tests/fixtures.json "B6 어는점 내림"과 같은 값
    freezing: {
      label: '어는점 내림 샘플',
      rows: [[0.1, 0.19], [0.2, 0.37], [0.3, 0.56], [0.4, 0.74], [0.5, 0.94], [0.6, 1.11], [0.7, 1.31], [0.8, 1.48]]
    },
    // 아레니우스: tests/fixtures.json "B4 아레니우스"와 같은 값
    arrhenius: {
      label: '아레니우스 샘플',
      tempUnit: 'C',
      rows: [[15, 0.8627], [20, 1.232], [25, 1.737], [30, 2.423], [35, 3.343], [40, 4.566], [45, 6.174], [50, 8.272]]
    },
    // 1차 반응: tests/fixtures.json "B5a 1차 반응"과 같은 값
    first: {
      label: '1차 반응 샘플',
      rows: [[0, 0.1], [60, 0.08607], [120, 0.07408], [180, 0.06376], [240, 0.05488], [300, 0.04724], [360, 0.04066], [420, 0.03499]]
    },
    // 검량선: tests/fixtures.json "B7 검량선"과 같은 값
    beer: {
      label: '검량선 샘플',
      rows: [[0, 0.003], [0.02, 0.253], [0.04, 0.498], [0.06, 0.751], [0.08, 1.004], [0.1, 1.247], [0.12, 1.502], [0.14, 1.749]]
    },
    // 2차 반응: 1/[A] = 1/[A]₀ + kt, [A]₀ = 0.1 mol/L, k = 0.05 L/(mol·s)에 측정 잡음(약 0.5%)을 얹은 예시
    second: {
      label: '2차 반응 샘플',
      rows: [[0, 0.1], [100, 0.0669], [200, 0.0498], [300, 0.0401], [400, 0.0332], [500, 0.0287], [600, 0.0249], [700, 0.0223]]
    },
    // 클라우지우스–클라페이롱: 물의 증기압(°C, kPa), 문헌값에 가까운 값(20 ~ 90 °C)
    clausius: {
      label: '물 증기압 샘플',
      tempUnit: 'C',
      rows: [[20, 2.34], [30, 4.25], [40, 7.38], [50, 12.35], [60, 19.94], [70, 31.18], [80, 47.37], [90, 70.12]]
    },
    // 라인위버–버크: 미카엘리스–멘텐 v = Vmax·[S]/(Km + [S]), Vmax = 0.5, Km = 2에 측정 잡음(약 1%)을 얹은 예시
    lineweaver: {
      label: '라인위버–버크 샘플',
      rows: [[0.5, 0.101], [1, 0.166], [2, 0.252], [3, 0.298], [4, 0.335], [6, 0.373], [8, 0.402], [10, 0.415]]
    },
    // 범용 변환: y = 3·x² 꼴에 측정 잡음을 얹은 예시. x 변환을 x²(sq)로 두면 직선이 된다
    custom: {
      label: '범용 변환 샘플',
      xT: 'sq', yT: 'id',
      rows: [[1, 3.1], [2, 11.9], [3, 27.2], [4, 47.8], [5, 75.3], [6, 107.6], [7, 147.5], [8, 191.7]]
    },
    linear: {
      label: '일반 선형 샘플',
      rows: [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.0]]
    }
  };
  // 사람 지시(11/17 21:03): 모든 예시는 50점 이상. 종류마다 모형식에 고정 씨앗 잡음을 얹어 60점을 만든다.
  // Math.random을 쓰지 않으므로 열 때마다 같은 값이다. 위의 8행짜리 값(fixture와 같은 값)은 근거로 남겨 두고 rows만 바꾼다.
  var MODELS = {
    //           x 시작, 간격, 모형식, 상대 잡음, 절대 잡음, 씨앗
    linear:     [1, 1, function (x) { return 2 * x + 0.05; }, 0, 0.4, 1],
    vanthoff:   [5, 1, function (t) { return Math.exp(6013.9 / (t + 273.15) - 12.027); }, 0.02, 0, 1],
    freezing:   [0.02, 0.02, function (m) { return 1.86 * m; }, 0, 0.012, 1],
    arrhenius:  [5, 1, function (t) { return Math.exp(20.72 - 6014 / (t + 273.15)); }, 0.015, 0, 1],
    first:      [0, 10, function (t) { return 0.1 * Math.exp(-0.0025 * t); }, 0.008, 0, 1],
    beer:       [0, 0.0025, function (c) { return 12.48 * c + 0.002; }, 0, 0.006, 1],
    second:     [0, 10, function (t) { return 1 / (10 + 0.05 * t); }, 0.006, 0, 1],
    clausius:   [20, 1, function (t) { return Math.exp(18.493 - 43000 / (8.314 * (t + 273.15))); }, 0.008, 0, 1],
    lineweaver: [0.25, 0.25, function (s) { return 0.5 * s / (2 + s); }, 0.008, 0, 1],
    custom:     [0.25, 0.25, function (x) { return 3 * x * x; }, 0, 2, 1]
  };
  function makeRows(key, seedOverride) {
    var m = MODELS[key], seed = (seedOverride || m[5]) * 7919 + key.length * 104729, rows = [];
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return (seed + 0.5) / 4294967296; }
    for (var i = 0; i < 60; i++) {
      var z = Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());   // 표준정규 난수
      var x = Number((m[0] + i * m[1]).toFixed(4)), y = m[2](x) * (1 + m[3] * z) + m[4] * z;
      rows.push([x, Number(y.toPrecision(4))]);
    }
    return rows;
  }
  Object.keys(MODELS).forEach(function (k) { if (SAMPLES[k]) SAMPLES[k].rows = makeRows(k); });

  // 30초 체험: 5행(35 °C) 하나만 튄 반트 호프 데이터. fixValue는 원래 값(고치면 ×가 사라짐)
  var DEMO = {
    kind: 'vanthoff',
    tempUnit: 'C',
    row: 5,
    fixValue: 1714,
    rows: [[15, 6813], [20, 4830], [25, 3582], [30, 2507], [35, 2571], [40, 1309], [45, 952.7], [50, 725]]
  };
  // 1000점 샘플: y = 2x + 1 에 잡음(표준편차 0.5)을 얹은 일반 선형 데이터. outliers의 행만 일부러 크게 벗어나게 했다.
  // 값은 고정 씨앗으로 만들어 열 때마다 같다(Math.random을 쓰지 않는다).
  var BIG = (function () {
    var outliers = { 137: 4.5, 402: -5, 588: 6, 761: -4.5, 915: 5.5 };   // 행 번호 → y를 벗어나게 한 크기
    var seed = 20261117, rows = [];
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return (seed + 0.5) / 4294967296; }
    for (var i = 1; i <= 1000; i++) {
      var z = Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());   // 표준정규 난수
      var x = i / 100, y = 2 * x + 1 + 0.5 * z + (outliers[i] || 0);
      rows.push([x, Number(y.toFixed(3))]);
    }
    return { kind: 'linear', label: '1000점 샘플', outlierRows: Object.keys(outliers).map(Number), rows: rows };
  })();
  return { SAMPLES: SAMPLES, DEMO: DEMO, BIG: BIG };
});
