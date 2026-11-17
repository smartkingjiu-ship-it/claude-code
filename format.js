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
   * 첫 줄 칸이 모두 숫자가 아니면 머리글로 보고 건너뛴다.
   * 숫자인 칸은 number, 아닌 칸은 원래 글자 그대로 둔다(화면에서 빨갛게 표시).
   */
  var THOUSANDS = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/;

  // 줄 앞뒤의 공백(스페이스·NBSP·전각 공백 등 탭이 아닌 공백)은 지우고 탭은 남긴다(첫 칸이 빈 행의 열이 밀리지 않게), 빈 줄 무시
  function pasteLines(text) {
    return String(text).split(/\r?\n|\r/)
      .map(function (l) { return l.replace(/^[^\S\t]+|[^\S\t]+$/g, ''); })
      .filter(function (l) { return l.trim() !== ''; });
  }

  // 한 줄 → 칸 글자 목록(모든 열)
  function splitLine(l) {
    var cells;
    if (/\t/.test(l)) cells = l.split(/\t/);                    // 탭이 있으면 탭으로만
    else if (/[,;]/.test(l)) cells = l.split(/\s*[,;]\s*/);
    else cells = l.split(/\s+/);
    return cells.map(function (c) {
      c = c.trim();
      return THOUSANDS.test(c) ? c.replace(/,/g, '') : c;          // 6,926 → 6926 (0,926은 그대로)
    });
  }

  function parsePasted(text) {
    var rows = pasteLines(text).map(splitLine);
    // 머리글: 첫 줄의 모든 칸(셋째 칸 이후 포함)이 숫자가 아닐 때만 건너뛴다(첫 데이터 줄 오타는 데이터로 남김)
    if (rows.length && rows[0].every(function (c) { return !isNumText(c); })) rows.shift();
    return rows.map(function (r) {
      return [0, 1].map(function (k) {
        var c = r[k] == null ? '' : r[k];
        return isNumText(c) ? Number(c) : c;
      });
    });
  }

  /** checkPaste(text) → { warnings }. 숫자인 칸이 3개 이상인 줄이 있으면 'MANY_COLUMNS' */
  function checkPaste(text) {
    var many = pasteLines(text).some(function (l) {
      return splitLine(l).filter(isNumText).length >= 3;
    });
    return { warnings: many ? ['MANY_COLUMNS'] : [] };
  }
  var PASTE_WARN = { MANY_COLUMNS: '열이 3개 이상입니다. 앞의 두 열만 썼습니다.' };

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
      var s4 = String(Number(value.toPrecision(4)));
      if (s4.indexOf('e-') >= 0) {              // 1e-6 미만: 과학 표기(1.054e-7) 대신 소수로 쓴다
        var dec = Math.min(3 - Math.floor(Math.log10(Math.abs(value))), 100);
        s4 = value.toFixed(dec).replace(/0+$/, '').replace(/\.$/, '');
      }
      return [clean(s4), null];
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

  /** resultTSV(result) → 탭 구분 결과 표(한글 표에 바로 붙음). 머리줄 + 기울기·절편·R² 줄, 반폭이 없으면 '-' */
  function resultTSV(result) {
    var f = result.fit;
    function row(name, value, ci) {
      var p = fmtParts(value, ci);
      return [name, p[0], p[1] == null ? '-' : p[1]].join('\t');
    }
    return ['항목\t값\t95% 반폭',
      row('기울기', f.b, f.ci95),
      row('절편', f.a, f.ci95a),
      ['R²', fmtR2(f.r2), '-'].join('\t')].join('\n');
  }

  /** collectRows(cells) → { c1, c2, rows } — 표 순서의 [[칸1, 칸2], …]에서 두 칸 모두 빈 행만 건너뛰고 표 행 번호(1부터)를 기억 */
  function collectRows(cells) {
    var out = { c1: [], c2: [], rows: [] };
    (cells || []).forEach(function (r, i) {
      var a = String(r[0] == null ? '' : r[0]).trim(), b = String(r[1] == null ? '' : r[1]).trim();
      if (a === '' && b === '') return;
      out.c1.push(a); out.c2.push(b); out.rows.push(i + 1);
    });
    return out;
  }

  /** relErr(value, ref) → |value − ref| / |ref| × 100 (절댓값 %) */
  function relErr(value, ref) {
    if (value == null || ref == null || !isFinite(value) || !isFinite(ref) || ref === 0) return null;
    return Math.abs(value - ref) / Math.abs(ref) * 100;
  }

  /** agree(value, ci, ref) → { inside: |value − ref| ≤ ci, ratio: |value − ref| / ci }. ci가 null이거나 0이면 둘 다 null */
  function agree(value, ci, ref) {
    if (ci == null || !isFinite(ci) || ci <= 0 || value == null || ref == null || !isFinite(value) || !isFinite(ref)) {
      return { inside: null, ratio: null };
    }
    var d = Math.abs(value - ref);
    return { inside: d <= ci, ratio: d / ci };
  }

  return { parsePasted: parsePasted, checkPaste: checkPaste, PASTE_WARN: PASTE_WARN, collectRows: collectRows, relErr: relErr, agree: agree, resultTSV: resultTSV, fmt: fmt, fmtParts: fmtParts, fmtR2: fmtR2, summaryLines: summaryLines };
});
