/* stats.js — 최소제곱 회귀 (DOM 없음, 브라우저·Node 공용) */
(function (root, factory) {
  var m = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // t(0.025, df), df = 1..30
  var T_TABLE = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
    2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
    2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];

  // 이상치 임계값 t(1 − 0.025/n, n − 3), n = 4..30 (본페로니 보정, scipy로 확인한 표)
  var OUT_TABLE = { 4: 50.923, 5: 9.925, 6: 6.232, 7: 5.068, 8: 4.526, 9: 4.221, 10: 4.029, 11: 3.900,
    12: 3.808, 13: 3.740, 14: 3.689, 15: 3.649, 16: 3.618, 17: 3.593, 18: 3.573, 19: 3.556, 20: 3.543,
    21: 3.532, 22: 3.523, 23: 3.516, 24: 3.510, 25: 3.505, 26: 3.501, 27: 3.498, 28: 3.495, 29: 3.494, 30: 3.492 };

  // 표준정규 분위수 Φ⁻¹(p) (Acklam 근사, 상대 오차 약 1e-9)
  function normInv(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var q, r;
    if (p < 0.02425) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - 0.02425) return -normInv(1 - p);
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // t 분위수 ≈ Cornish-Fisher 전개 (자유도 ν가 30보다 클 때만 씀. ν = 31에서 오차 0.06% 이하)
  function tFromZ(z, nu) {
    var z3 = z * z * z, z5 = z3 * z * z;
    return z + (z3 + z) / (4 * nu) + (5 * z5 + 16 * z3 + 3 * z) / (96 * nu * nu);
  }

  /** t(0.025, df): 자유도 1~30은 표, 30 초과는 근사식 */
  function tCrit(df) {
    if (!(df >= 1)) return null;
    return df <= 30 ? T_TABLE[df - 1] : tFromZ(1.959963984540054, df);
  }

  /** 이상치 임계값 t(1 − 0.025/n, n − 3). n < 4면 판정 불가(null) */
  function outlierCrit(n) {
    if (!(n >= 4)) return null;
    return n <= 30 ? OUT_TABLE[n] : tFromZ(normInv(1 - 0.025 / n), n - 3);
  }

  function mean(arr) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  /**
   * linearFit(x, y) → {n, a, b, r2, s, sa, sb, t, ci95, ci95a, z, tExt, critOut, residuals, outliers}
   * z: 표준화 잔차 eᵢ/s (잔차 그래프용)
   * tExt: 외부 스튜던트화 잔차 = 그 점을 빼고 그은 직선에서 얼마나 먼가
   * outliers: |tExt| > critOut 인 점의 인덱스(0부터). critOut = t(1 − 0.025/n, n − 3), n = 3이면 판정 불가
   */
  function linearFit(x, y) {
    var n = x.length;
    var out = { n: n, a: null, b: null, r2: null, s: null, sa: null, sb: null, t: null,
      ci95: null, ci95a: null, z: null, tExt: null, critOut: null, residuals: null, outliers: [] };
    if (n < 2 || y.length !== n) return out;

    var mx = mean(x), my = mean(y);
    var sxx = 0, sxy = 0, syy = 0, i;
    for (i = 0; i < n; i++) {
      var dx = x[i] - mx, dy = y[i] - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
    if (sxx === 0) return out; // x가 모두 같음 → 직선 불가

    var b = sxy / sxx;
    var a = my - b * mx;
    out.a = a; out.b = b;
    if (n === 2) return out;

    var e = [], sse = 0;
    for (i = 0; i < n; i++) {
      var r = y[i] - (a + b * x[i]);
      e.push(r); sse += r * r;
    }
    var s = Math.sqrt(sse / (n - 2));
    // 부동소수 잔여 오차는 0으로 본다 (모든 점이 직선 위). 척도는 데이터 자신의 크기(아주 작은 값도 맞게)
    var scale = Math.max(Math.abs(my), Math.sqrt(syy / n));
    if (s <= 1e-12 * scale) {
      s = 0;
      if (Math.abs(a) <= 1e-12 * scale) { a = 0; out.a = 0; } // 완전 직선의 절편 -1.11e-16 같은 잔여값 → 0
    }

    var t = tCrit(n - 2);
    out.residuals = e;
    out.s = s;
    out.r2 = syy === 0 ? 1 : 1 - sse / syy;
    if (s === 0) out.r2 = 1;
    out.sb = s / Math.sqrt(sxx);
    out.sa = s * Math.sqrt(1 / n + (mx * mx) / sxx);
    out.t = t;
    out.ci95 = t * out.sb;
    out.ci95a = t * out.sa;
    out.z = e.map(function (v) { return s === 0 ? 0 : v / s; });
    out.outliers = [];
    if (n < 4) return out; // 점 3개: 자유도가 없어 이상치 판정 불가
    out.critOut = outlierCrit(n);
    out.tExt = e.map(function (v, k) {
      if (s === 0) return 0;
      var dx = x[k] - mx, h = 1 / n + dx * dx / sxx;
      if (1 - h <= 1e-12) return 0;                 // 이 점 하나가 직선을 정함 → 판정할 수 없음
      var r = v / (s * Math.sqrt(1 - h));           // 내부 스튜던트화 잔차
      var d = n - 2 - r * r;
      if (d <= 1e-12 * (n - 2)) return r > 0 ? Infinity : -Infinity; // 나머지 점이 정확히 직선(NaN 방지)
      return r * Math.sqrt((n - 3) / d);
    });
    out.tExt.forEach(function (v, k) { if (Math.abs(v) > out.critOut) out.outliers.push(k); });
    return out;
  }

  return { linearFit: linearFit, tCrit: tCrit, outlierCrit: outlierCrit };
});
