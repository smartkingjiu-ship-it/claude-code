/* format.js — 붙여 넣기 해석, 숫자 표시 규칙 (DOM 없음, 브라우저·Node 공용) */
(function (root, factory) {
  var m = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function isNumText(s) {
    return s !== '' && isFinite(Number(s));
  }

  /**
   * parsePasted(text) → [[c1, c2], ...]
   * 탭 · 쉼표 · 세미콜론 · 공백 구분, \r\n 처리, 빈 줄 무시.
   * 첫 줄에 숫자가 아닌 칸이 있으면 머리글로 보고 건너뛴다.
   * 숫자인 칸은 number, 아닌 칸은 원래 글자 그대로 둔다(화면에서 빨갛게 표시).
   */
  function parsePasted(text) {
    var lines = String(text).split(/\r?\n|\r/)
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l !== ''; });
    var rows = lines.map(function (l) {
      var cells = /[\t,;]/.test(l) ? l.split(/\s*[\t,;]\s*/) : l.split(/\s+/);
      return cells.slice(0, 2).map(function (c) { return c.trim(); });
    });
    if (rows.length && rows[0].some(function (c) { return !isNumText(c); })) rows.shift();
    return rows.map(function (r) {
      return [0, 1].map(function (k) {
        var c = r[k] == null ? '' : r[k];
        return isNumText(c) ? Number(c) : c;
      });
    });
  }

  function roundTo(v, decimals) {
    if (decimals >= 0) return Number(v.toFixed(decimals));
    var p = Math.pow(10, -decimals);
    return Math.round(v / p) * p;
  }

  function clean(str) {
    // -0, -0.00 같은 표기를 0으로
    return /^-0(\.0+)?$/.test(str) ? str.slice(1) : str;
  }

  /** 값과 오차를 표시 규칙에 맞춘 문자열 쌍 [값, 오차]로. 오차가 없으면 [유효숫자 4자리, null] */
  function fmtParts(value, ci) {
    if (value == null || !isFinite(value)) return ['—', null];
    if (ci == null || !isFinite(ci) || ci <= 0) {
      return [clean(String(Number(value.toPrecision(4)))), null];
    }
    var e = Math.floor(Math.log10(ci));
    var decimals = 1 - e;                       // 오차 유효숫자 2자리
    var ciR = roundTo(ci, decimals);
    if (Math.floor(Math.log10(ciR)) > e) {      // 0.0996 → 0.10 처럼 자릿수가 올라가면 다시 맞춤
      e += 1; decimals = 1 - e; ciR = roundTo(ci, decimals);
    }
    var d = Math.max(decimals, 0);
    return [clean(roundTo(value, decimals).toFixed(d)), ciR.toFixed(d)];
  }

  /** fmt(1.9914, 0.10857) → "1.99 ± 0.11" */
  function fmt(value, ci) {
    var p = fmtParts(value, ci);
    return p[1] == null ? p[0] : p[0] + ' ± ' + p[1];
  }

  function fmtR2(r2) {
    return r2 == null ? '—' : r2.toFixed(4);
  }

  /** summaryLines(result) → 결과 요약 줄 목록 (PNG 저장용). result: kinds.analyze(...)의 반환값 */
  function summaryLines(result) {
    var f = result.fit, v = result.values || {};
    var lines = ['기울기 b = ' + fmt(f.b, f.ci95), '절편 a = ' + fmt(f.a, f.ci95a), 'R² = ' + fmtR2(f.r2), 'n = ' + f.n];
    if (result.kind === 'vanthoff') {
      lines.push('ΔH = ' + fmt(v.dH_kJ, v.dH_ci_kJ) + ' kJ/mol', 'ΔS = ' + fmt(v.dS, v.dS_ci) + ' J/(mol·K)');
    }
    return lines;
  }

  return { parsePasted: parsePasted, fmt: fmt, fmtParts: fmtParts, fmtR2: fmtR2, summaryLines: summaryLines };
});
