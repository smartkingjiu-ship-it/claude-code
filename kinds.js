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
    },
    freezing: {
      label: '어는점 내림 (ΔTf – m)',
      cols: ['몰랄 농도 m (mol/kg)', '어는점 내림 ΔTf (K)'],
      xLabel: 'm (mol/kg)', yLabel: 'ΔTf (K)',
      temp: false, logY: false,
      toX: function (v) { return v; },
      toY: function (v) { return v; },
      values: function (fit) {
        return { Kf: fit.b, Kf_ci: fit.ci95 };
      }
    },
    arrhenius: {
      label: '아레니우스 (ln k – 1/T)',
      cols: ['온도', '속도 상수 k'],
      xLabel: '1/T (K⁻¹)', yLabel: 'ln k',
      temp: true, logY: true,
      toX: function (v, o) { return 1 / toKelvin(v, o.tempUnit); },
      toY: function (v) { return Math.log(v); },
      values: function (fit) {
        return {
          Ea_kJ: fit.b == null ? null : -R * fit.b / 1000,
          Ea_ci_kJ: fit.ci95 == null ? null : R * fit.ci95 / 1000,
          lnA: fit.a,
          lnA_ci: fit.ci95a
        };
      }
    },
    first: {
      label: '1차 반응 (ln[A] – t)',
      cols: ['시간 t (s)', '농도 [A]'],
      xLabel: 't (s)', yLabel: 'ln[A]',
      temp: false, logY: true,
      toX: function (v) { return v; },
      toY: function (v) { return Math.log(v); },
      values: function (fit) {
        var k = fit.b == null ? null : -fit.b;
        return {
          k: k,
          k_ci: fit.ci95,
          halfLife: k == null || k === 0 ? null : Math.LN2 / k   // 비선형이라 반폭 없음
        };
      }
    },
    beer: {
      label: '검량선 · 비어–람베르트 (A – C)',
      cols: ['농도 C (mol/L)', '흡광도 A'],
      xLabel: 'C (mol/L)', yLabel: 'A',
      temp: false, logY: false,
      toX: function (v) { return v; },
      toY: function (v) { return v; },
      values: function (fit, opts) {
        var uA = toNum(opts && opts.unknownA);   // 미지 시료 흡광도(숫자가 아니면 농도는 null)
        return {
          slope: fit.b,
          slope_ci: fit.ci95,
          unknownC: isNaN(uA) || fit.b == null || fit.b === 0 ? null : (uA - fit.a) / fit.b   // 비선형(a, b 둘 다 씀)이라 반폭 없음
        };
      }
    },
    second: {
      label: '2차 반응 (1/[A] – t)',
      cols: ['시간 t (s)', '농도 [A]'],
      xLabel: 't (s)', yLabel: '1/[A]',
      temp: false, logY: false,
      yOk: positive,
      toX: function (v) { return v; },
      toY: function (v) { return 1 / v; },
      values: function (fit) {
        return { k: fit.b, k_ci: fit.ci95 };
      }
    },
    clausius: {
      label: '클라우지우스–클라페이롱 (ln P – 1/T)',
      cols: ['온도', '증기압 P'],
      xLabel: '1/T (K⁻¹)', yLabel: 'ln P',
      temp: true, logY: true,
      toX: function (v, o) { return 1 / toKelvin(v, o.tempUnit); },
      toY: function (v) { return Math.log(v); },
      values: function (fit) {
        return {
          dHvap_kJ: fit.b == null ? null : -R * fit.b / 1000,
          dHvap_ci_kJ: fit.ci95 == null ? null : R * fit.ci95 / 1000
        };
      }
    },
    lineweaver: {
      label: '라인위버–버크 (1/v – 1/[S])',
      cols: ['기질 농도 [S]', '반응 속도 v'],
      xLabel: '1/[S]', yLabel: '1/v',
      temp: false, logY: false,
      xOk: positive, yOk: positive,
      toX: function (v) { return 1 / v; },
      toY: function (v) { return 1 / v; },
      values: function (fit) {
        var ok = fit.a != null && fit.b != null && fit.a !== 0;
        return {
          Vmax: ok ? 1 / fit.a : null,     // 비선형 변환이라 반폭 없음(3-1 오차 전파)
          Km: ok ? fit.b / fit.a : null
        };
      }
    },
    custom: {
      label: '범용 변환 (x · y 변환 고르기)',
      cols: ['x', 'y'],
      xLabel: 'x', yLabel: 'y',            // analyze가 고른 변환에 맞춰 바꾼다(labels)
      temp: false, logY: false,
      xOk: function (v, o) { return tf(o && o.xT).ok(v); },
      yOk: function (v, o) { return tf(o && o.yT).ok(v); },
      toX: function (v, o) { return tf(o.xT).f(v); },
      toY: function (v, o) { return tf(o.yT).f(v); },
      labels: function (o) { return [axisLabel(o.xT, 'x'), axisLabel(o.yT, 'y')]; },
      values: function () { return {}; }
    }
  };

  // 범용 변환(custom)에서 고르는 변환: f = 변환, ok = 변환할 수 있는 값인가, name = 축 이름
  var TF = {
    id: { f: function (v) { return v; }, ok: function () { return true; }, name: function (s) { return s; } },
    inv: { f: function (v) { return 1 / v; }, ok: function (v) { return v !== 0; }, name: function (s) { return '1/' + s; } },
    ln: { f: function (v) { return Math.log(v); }, ok: positive, name: function (s) { return 'ln ' + s; } },
    log10: {
      f: function (v) { return Math.log10 ? Math.log10(v) : Math.log(v) / Math.LN10; },
      ok: positive, name: function (s) { return 'log₁₀ ' + s; }
    },
    sq: { f: function (v) { return v * v; }, ok: function () { return true; }, name: function (s) { return s + '²'; } },
    sqrt: { f: function (v) { return Math.sqrt(v); }, ok: function (v) { return v >= 0; }, name: function (s) { return '√' + s; } }
  };
  var TRANSFORMS = Object.keys(TF);
  function tf(t) { return Object.prototype.hasOwnProperty.call(TF, t) ? TF[t] : TF.id; }   // 없거나 모르는 이름은 그대로(id)
  /** axisLabel('sq', 'x') → 'x²' */
  function axisLabel(t, s) { return tf(t).name(s); }

  function positive(v) { return v > 0; }

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
   * opts: { tempUnit: 'C' | 'K', rows, exclude, unknownA(beer), xT · yT(custom: id | inv | ln | log10 | sq | sqrt) }
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
    var o = { tempUnit: opts.tempUnit === 'K' ? 'K' : 'C', xT: opts.xT, yT: opts.yT };
    // 축 이름이 옵션에 따라 달라지는 종류(custom): 그래프 코드가 KINDS[kind].xLabel · yLabel을 읽으므로 여기서 맞춰 둔다
    if (K.labels) { var lb = K.labels(o); K.xLabel = lb[0]; K.yLabel = lb[1]; }
    var x = [], y = [], rowNums = [], invalid = [], excludedRows = [], excludedXY = [];
    var exclude = opts.exclude || [];
    var n = Math.max(col1.length, col2.length);
    for (var i = 0; i < n; i++) {
      var rowNum = opts.rows && opts.rows[i] != null ? opts.rows[i] : i + 1;  // 표 행 번호(빈 행 건너뛴 경우)
      var v1 = toNum(col1[i]), v2 = toNum(col2[i]);
      var bad = isNaN(v1) || isNaN(v2);
      if (!bad && K.logY && v2 <= 0) bad = true;
      if (!bad && K.temp && toKelvin(v1, o.tempUnit) <= 0) bad = true;
      // 종류별 변환 점검(xOk · yOk): 변환할 수 없는 값(0의 역수, 0 이하의 ln 등)은 ln ≤ 0과 같은 방식으로 뺀다
      if (!bad && K.xOk && !K.xOk(v1, o)) bad = true;
      if (!bad && K.yOk && !K.yOk(v2, o)) bad = true;
      var tx = bad ? NaN : K.toX(v1, o), ty = bad ? NaN : K.toY(v2, o);
      if (!bad && !(isFinite(tx) && isFinite(ty))) bad = true;                // 변환값이 유한하지 않으면 계산에 넣지 않는다
      if (bad) { invalid.push(rowNum); continue; }
      if (exclude.indexOf(rowNum) >= 0) {                                     // 사람이 뺀 점: 계산 제외, 그래프엔 회색
        excludedRows.push(rowNum);
        excludedXY.push([tx, ty]);
        continue;
      }
      x.push(tx);
      y.push(ty);
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
    // 최댓값은 반복문으로 구한다(Math.max.apply는 칸이 10만 개를 넘으면 RangeError)
    var tMax = -Infinity;
    for (var i = 0; i < t.length; i++) if (t[i] > tMax) tMax = t[i];
    if (isK && tMax < 200) return { warnings: ['TEMP_LOOKS_CELSIUS'] };
    return { warnings: [] };
  }

  return {
    analyze: analyze, KINDS: KINDS, R: R, checkInput: checkInput, TEMP_WARN: TEMP_WARN,
    TRANSFORMS: TRANSFORMS, axisLabel: axisLabel
  };
});
