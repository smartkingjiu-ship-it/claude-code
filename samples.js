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
    linear: {
      label: '샘플 B',
      rows: [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.0]]
    }
  };
  // 30초 체험: 5행(35 °C) 하나만 튄 반트 호프 데이터. fixValue는 원래 값(고치면 ×가 사라짐)
  var DEMO = {
    kind: 'vanthoff',
    tempUnit: 'C',
    row: 5,
    fixValue: 1714,
    rows: [[15, 6813], [20, 4830], [25, 3582], [30, 2507], [35, 2571], [40, 1309], [45, 952.7], [50, 725]]
  };
  return { SAMPLES: SAMPLES, DEMO: DEMO };
});
