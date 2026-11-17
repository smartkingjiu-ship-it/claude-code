/* hwpeq.js — 한글 수식 편집기 입력문 생성 (DOM 없음, 브라우저·Node 공용) */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var deps = isNode ? require('./format.js') : root.LinLab;
  var m = factory(deps);
  if (isNode) module.exports = m;
  else root.LinLab = Object.assign(root.LinLab || {}, m);
})(typeof window !== 'undefined' ? window : globalThis, function (format) {
  'use strict';

  function pm(value, ci) {
    var p = format.fmtParts(value, ci);
    return p[1] == null ? p[0] : p[0] + ' +- ' + p[1];
  }

  /** 한 줄 식에서 "+ -0.05" 대신 "- 0.05" */
  function signed(str) {
    return str.charAt(0) === '-' ? '- ' + str.slice(1) : '+ ' + str;
  }

  /**
   * hwpEquations(result, kind) → 문자열 배열
   * result: kinds.analyze(...)의 반환값
   */
  function hwpEquations(result, kind) {
    var f = result.fit, v = result.values || {};
    if (f.b == null) return [];
    if (kind === 'vanthoff') {
      return [
        'ln K = - {DELTA H} over {R} TIMES {1} over {T} + {DELTA S} over {R}',
        'DELTA H = ' + pm(v.dH_kJ, v.dH_ci_kJ) + ' ~rm kJ/mol',
        'DELTA S = ' + pm(v.dS, v.dS_ci) + ' ~rm J/(mol cdot K)'
      ];
    }
    if (kind === 'arrhenius') {
      return ['E_a = ' + pm(v.Ea_kJ, v.Ea_ci_kJ) + ' ~rm kJ/mol'];
    }
    if (kind === 'linear') {
      var b = format.fmtParts(f.b, f.ci95)[0];
      var a = format.fmtParts(f.a, f.ci95a)[0];
      var lines = ['y = ' + b + ' x ' + signed(a)];
      // 오차가 0이거나 null이면 +- 와 (95 % CI) 꼬리를 모두 뺀다
      if (format.fmtParts(f.b, f.ci95)[1] != null) lines.push('b = ' + pm(f.b, f.ci95) + ' ~ (95 % ~rm CI)');
      else if (f.ci95 != null) lines.push('b = ' + pm(f.b, null));
      return lines;
    }
    var err = new Error('한글 수식 미지원 종류: ' + kind);
    err.code = 'NOT_IMPLEMENTED';
    throw err;
  }

  /** 한 줄을 한글 수식 한 상자용으로: 첫 " = " → " &= ", "값 +- 오차" → "( 값 +- 오차 )" */
  function blockLine(line) {
    return line.replace(' = ', ' &= ').replace(/(\S+) \+- (\S+)/, '( $1 +- $2 )');
  }

  /**
   * hwpBlock(result, kind) → 문자열 하나
   * 한글 수식 편집기는 Enter를 무시하고 #로 줄을 바꾼다. 줄 사이는 " #\n", 마지막 줄 끝에는 # 없음
   */
  function hwpBlock(result, kind) {
    return hwpEquations(result, kind).map(blockLine).join(' #\n');
  }

  return { hwpEquations: hwpEquations, hwpBlock: hwpBlock };
});
