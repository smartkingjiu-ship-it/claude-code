/* kinds.js — 실험 종류별 변환과 물리량 (DOM 없음, 브라우저·Node 공용) */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var deps = isNode ? require('./stats.js') : root.LinLab;
  var m = factory(deps);
  if (isNode) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function (stats) {
  'use strict';

  var R = 8.314; // J mol^-1 K^-1

  function toKelvin(t, unit) { return unit === 'K' ? t : t + 273.15; }

  var KINDS = {
    linear: {
      label: '일반 선형',
      cols: ['x', 'y'],
      xLabel: 'x', yLabel: 'y',
      temp: false, logY: false,
      toX: function (v) { return v; },
      toY: function (v) { return v; },
      values: function () { return {}; }
    },
    vanthoff: {
      label: '반트 호프 (ln K – 1/T)',
      cols: ['온도', '평형 상수 K (ln 하기 전 값)'],
      xLabel: '1/T (K⁻¹)', yLabel: 'ln K',
      temp: true, logY: true,
      toX: function (v, o) { return 1 / toKelvin(v, o.tempUnit); },
      toY: function (v) { return Math.log(v); },
      values: function (fit) {
        return {
          dH_kJ: fit.b == null ? null : -R * fit.b / 1000,
          dH_ci_kJ: fit.ci95 == null ? null : R * fit.ci95 / 1000,
          dS: fit.a == null ? null : R * fit.a,
          dS_ci: fit.ci95a == null ? null : R * fit.ci95a
        };
      }
    }
  };

  function toNum(v) {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    var s = String(v).trim();
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  /**
   * analyze(kind, col1, col2, opts)
   * opts: { tempUnit: 'C' | 'K' }
   * → { kind, x, y, rowNums, fit, values, invalid, outlierRows }
   * 행 번호는 1부터.
   */
  function analyze(kind, col1, col2, opts) {
    opts = opts || {};
    var K = KINDS[kind];
    if (!K) {
      var err = new Error('지원하지 않는 실험 종류: ' + kind);
      err.code = 'NOT_IMPLEMENTED';
      throw err;
    }
    var o = { tempUnit: opts.tempUnit === 'K' ? 'K' : 'C' };
    var x = [], y = [], rowNums = [], invalid = [], excludedRows = [], excludedXY = [];
    var exclude = opts.exclude || [];
    var n = Math.max(col1.length, col2.length);
    for (var i = 0; i < n; i++) {
      var rowNum = opts.rows && opts.rows[i] != null ? opts.rows[i] : i + 1;  // 표 행 번호(빈 행 건너뛴 경우)
      var v1 = toNum(col1[i]), v2 = toNum(col2[i]);
      var bad = isNaN(v1) || isNaN(v2);
      if (!bad && K.logY && v2 <= 0) bad = true;
      if (!bad && K.temp && toKelvin(v1, o.tempUnit) <= 0) bad = true;
      if (bad) { invalid.push(rowNum); continue; }
      if (exclude.indexOf(rowNum) >= 0) {                                     // 사람이 뺀 점: 계산 제외, 그래프엔 회색
        excludedRows.push(rowNum);
        excludedXY.push([K.toX(v1, o), K.toY(v2, o)]);
        continue;
      }
      x.push(K.toX(v1, o));
      y.push(K.toY(v2, o));
      rowNums.push(rowNum);
    }
    var fit = stats.linearFit(x, y);
    return {
      kind: kind,
      x: x, y: y, rowNums: rowNums,
      fit: fit,
      values: K.values(fit, opts),
      invalid: invalid,
      excludedRows: excludedRows,
      excludedXY: excludedXY,
      outlierRows: fit.outliers.map(function (k) { return rowNums[k]; })
    };
  }

  var TEMP_WARN = {
    TEMP_LOOKS_INVERSE: '온도 열이 1/T처럼 보입니다. 1/T가 아니라 온도를 넣으세요.',
    TEMP_LOOKS_KELVIN: '°C로 보기엔 너무 큽니다. K 값이면 위에서 K를 고르세요.',
    TEMP_LOOKS_CELSIUS: 'K로 보기엔 너무 작습니다(1/T를 넣었나요?)'
  };

  /** checkInput(kind, col1, col2, opts) → { warnings: [코드, …] } — 온도 열 단위 실수를 잡는다(계산은 막지 않음) */
  function checkInput(kind, col1, col2, opts) {
    opts = opts || {};
    var K = KINDS[kind];
    if (!K || !K.temp) return { warnings: [] };
    var t = (col1 || []).map(toNum).filter(function (v) { return !isNaN(v); });
    if (!t.length) return { warnings: [] };
    var isK = opts.tempUnit === 'K';
    if (t.every(function (v) { return Math.abs(v) < 1; })) return { warnings: ['TEMP_LOOKS_INVERSE'] };
    if (!isK && t.every(function (v) { return v >= 200; })) return { warnings: ['TEMP_LOOKS_KELVIN'] };
    if (isK && Math.max.apply(null, t) < 200) return { warnings: ['TEMP_LOOKS_CELSIUS'] };
    return { warnings: [] };
  }

  return { analyze: analyze, KINDS: KINDS, R: R, checkInput: checkInput, TEMP_WARN: TEMP_WARN };
});
