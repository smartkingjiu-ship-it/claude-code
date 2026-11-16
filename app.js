/* app.js — 화면 동작 */
(function () {
  'use strict';
  var L = window.LinLab;
  var $ = function (id) { return document.getElementById(id); };
  var state = { result: null, kind: 'vanthoff', demo: null };

  // 숫자 뒤 조사 "로/으로": 끝자리를 읽은 소리(영·삼·육은 받침 → 으로, 일·칠·팔은 ㄹ 받침 → 로)
  function ro(numText) { return /[036]$/.test(String(numText)) ? '으로' : '로'; }
  // 30초 체험 유도 문구. 숫자는 체험 데이터(samples.js DEMO)와 계산값에서 채운다(하드코딩 금지)
  // M1-3이 끝나면 outlier 문구만 "5행이 튀었습니다(×). 5행의 '포함'을 꺼 보세요."로 바꾸고, 값을 고치는 경로의 fixed 문구는 그대로 둔다(SPEC M1-3)
  var GUIDE = {
    outlier: function () {
      var d = L.DEMO, bad = d.rows[d.row - 1][1];
      return d.row + '행 K(' + bad + ')가 튀었습니다(×). 원래 값 ' + d.fixValue + ro(d.fixValue) + ' 고쳐 보세요.';
    },
    fixed: function (before, after, r2before) {
      var r2 = r2before == null ? null : r2before.toFixed(3);
      return '× 가 사라졌습니다. ΔH 오차 ±' + before + ' → ±' + after + ' kJ/mol' +
        (r2 ? ' (R²는 ' + r2 + ro(r2) + ' 이미 높았습니다)' : '');
    }
  };

  // ---------- 입력 표 ----------
  function kindDef() { return L.KINDS[$('kind').value]; }
  function tempUnit() {
    var r = document.querySelector('input[name="tempUnit"]:checked');
    return r ? r.value : 'C';
  }

  function setHeaders() {
    var K = kindDef();
    var c1 = K.cols[0], c2 = K.cols[1];
    if (K.temp) c1 += tempUnit() === 'K' ? ' (K)' : ' (°C)';
    $('h1').textContent = c1;
    $('h2').textContent = c2;
    $('temp-unit-wrap').hidden = !K.temp;
    $('btn-sample').textContent = (L.SAMPLES[$('kind').value] ? L.SAMPLES[$('kind').value].label : '샘플') + ' 불러오기';
  }

  function addRow(v1, v2) {
    var tb = $('data').tBodies[0];
    var tr = document.createElement('tr');
    var n = tb.rows.length + 1;
    tr.innerHTML = '<td class="num">' + n + '</td>' +
      '<td><input type="text" inputmode="decimal" aria-label="1열 ' + n + '행"></td>' +
      '<td><input type="text" inputmode="decimal" aria-label="2열 ' + n + '행"></td>' +
      '<td><button type="button" class="del" aria-label="' + n + '행 삭제">✕</button></td>';
    var ins = tr.querySelectorAll('input');
    ins[0].value = v1 == null ? '' : v1;
    ins[1].value = v2 == null ? '' : v2;
    tb.appendChild(tr);
  }

  function renumber() {
    Array.prototype.forEach.call($('data').tBodies[0].rows, function (tr, i) {
      tr.cells[0].textContent = i + 1;
    });
  }

  function setRows(rows) {
    $('data').tBodies[0].innerHTML = '';
    rows.forEach(function (r) { addRow(r[0], r[1]); });
    while ($('data').tBodies[0].rows.length < 5) addRow('', '');
  }

  function readRows() {
    var c1 = [], c2 = [];
    Array.prototype.forEach.call($('data').tBodies[0].rows, function (tr) {
      var ins = tr.querySelectorAll('input');
      var a = ins[0].value.trim(), b = ins[1].value.trim();
      if (a === '' && b === '') return; // 완전히 빈 행은 무시
      c1.push(a); c2.push(b);
    });
    return { c1: c1, c2: c2 };
  }

  // 비어 있지 않은 행들의 <tr> 목록 (analyze의 행 번호와 맞추기 위함)
  function filledRows() {
    return Array.prototype.filter.call($('data').tBodies[0].rows, function (tr) {
      var ins = tr.querySelectorAll('input');
      return ins[0].value.trim() !== '' || ins[1].value.trim() !== '';
    });
  }

  function markCells(result) {
    var K = kindDef();
    var trs = filledRows();
    Array.prototype.forEach.call($('data').tBodies[0].rows, function (tr) {
      tr.classList.remove('outlier');
      tr.querySelectorAll('input').forEach(function (i) { i.classList.remove('bad'); });
    });
    result.invalid.forEach(function (rowNum) {
      var tr = trs[rowNum - 1];
      if (!tr) return;
      var ins = tr.querySelectorAll('input');
      var v1 = Number(ins[0].value), v2 = Number(ins[1].value);
      if (ins[0].value.trim() === '' || !isFinite(v1)) ins[0].classList.add('bad');
      if (ins[1].value.trim() === '' || !isFinite(v2) || (K.logY && v2 <= 0)) ins[1].classList.add('bad');
      if (K.temp && isFinite(v1) && (tempUnit() === 'K' ? v1 : v1 + 273.15) <= 0) ins[0].classList.add('bad');
    });
    result.outlierRows.forEach(function (rowNum) {
      var tr = trs[rowNum - 1];
      if (tr) tr.classList.add('outlier');
    });
  }

  // ---------- 메시지 ----------
  function say(text, level) {
    var m = $('msg');
    m.textContent = text || '';
    m.className = 'msg' + (level ? ' ' + level : '');
  }

  // ---------- 계산 ----------
  // 결과 카드로 스크롤: 버튼 핸들러에서만, 휴대폰 폭(≤ 600px)이고 결과가 화면 아래쪽에 있을 때만
  function scrollToResult() {
    if (window.innerWidth > 600) return;
    var card = $('result-card');
    if (card.hidden) return;
    if (card.getBoundingClientRect().top > window.innerHeight * 0.6) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateGuide(result) {
    var g = $('guide');
    if (!state.demo || result.kind !== 'vanthoff' || result.values.dH_ci_kJ == null) { g.hidden = true; return; }
    var ci = L.fmtParts(result.values.dH_kJ, result.values.dH_ci_kJ)[1];
    if (result.outlierRows.length) {
      if (state.demo.before == null) { state.demo.before = ci; state.demo.r2 = result.fit.r2; }
      g.textContent = GUIDE.outlier(); g.className = 'guide';
    } else if (state.demo.before != null) {
      g.textContent = GUIDE.fixed(state.demo.before, ci, state.demo.r2); g.className = 'guide ok';
    } else { g.hidden = true; return; }
    g.hidden = false;
  }

  function endDemo() { state.demo = null; $('guide').hidden = true; }

  // 결과가 떠 있을 때만 다시 계산 (자동 재계산은 스크롤하지 않는다)
  function recalcIfShown() {
    if (state.result && !$('result-card').hidden) calculate();
  }

  function calculate() {
    var kind = $('kind').value;
    var d = readRows();
    var result = L.analyze(kind, d.c1, d.c2, { tempUnit: tempUnit() });
    state.result = result; state.kind = kind;
    markCells(result);
    $('done').hidden = true;
    $('hwp-preview').textContent = '';

    var notes = [];
    if (result.invalid.length) {
      notes.push(result.invalid.length + '개 행은 숫자가 아니거나' +
        (kindDef().logY ? ' 0 이하라서(ln을 취할 수 없음)' : '') + ' 계산에서 뺐습니다 (빨간 칸).');
    }
    var n = result.fit.n;
    if (n >= 2 && result.fit.b == null) { // x가 모두 같음(같은 열을 두 번 고름 등)
      $('guide').hidden = true;
      say((notes.concat(['x 값이 모두 같아 직선을 그을 수 없습니다.'])).join(' '), 'bad');
      $('result-card').hidden = false;
      render(result);
      return;
    }
    if (n < 3) {
      $('guide').hidden = true;
      say((notes.concat(['점이 3개 이상 필요합니다. 지금 ' + n + '개입니다.'])).join(' '), 'bad');
      $('result-card').hidden = n < 2;
      if (n >= 2) render(result);
      return;
    }
    if (n === 3) notes.push('점이 3개면 이상치를 판정할 수 없습니다.');
    else if (n < 7) notes.push('점이 적으면 크게 튄 점만 잡습니다 (점 ' + n + '개).');
    var out = result.outlierRows;
    if (out.length) {
      notes.push(out.slice(0, 5).join(', ') + '번 행' + (out.length > 5 ? ' 외 ' + (out.length - 5) + '개' : '') +
        '이 이상치(×)입니다: 그 점을 빼고 그은 직선에서 너무 멉니다(우연히 이럴 확률 5% 미만).');
    }
    say(notes.join(' '), notes.length ? 'warn' : '');
    $('result-card').hidden = false;
    render(result);
    updateGuide(result);
  }

  function render(result) {
    var f = result.fit, v = result.values, kind = result.kind;
    var items = [];
    items.push(['기울기 b', L.fmt(f.b, f.ci95)]);
    items.push(['절편 a', L.fmt(f.a, f.ci95a)]);
    items.push(['결정계수 R²', L.fmtR2(f.r2)]);
    items.push(['점 개수 n', String(f.n)]);
    if (kind === 'vanthoff') {
      items.push(['ΔH', L.fmt(v.dH_kJ, v.dH_ci_kJ) + ' kJ/mol']);
      items.push(['ΔS', L.fmt(v.dS, v.dS_ci) + ' J/(mol·K)']);
    }
    $('result').innerHTML = items.map(function (it) {
      return '<dt>' + it[0] + '</dt><dd>' + it[1] + '</dd>';
    }).join('') + (f.ci95 != null ? '<dt></dt><dd class="small">± 는 95% 신뢰구간 (t = ' + f.t + ', 자유도 ' + (f.n - 2) + ')</dd>' : '');
    drawPlot(result);
    drawResid(result);
  }

  // ---------- 그래프 ----------
  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    var span = max - min;
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = (count * step) / span;
    if (err <= 0.15) step *= 10; else if (err <= 0.35) step *= 5; else if (err <= 0.75) step *= 2;
    var t0 = Math.ceil(min / step) * step, ticks = [];
    for (var t = t0; t <= max + step * 1e-9; t += step) ticks.push(Number(t.toPrecision(12)));
    return ticks;
  }

  function tickLabel(t) {
    var a = Math.abs(t);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return t.toExponential(1).replace('e', '×10^').replace('+', '');
    return String(Number(t.toPrecision(4)));
  }

  function setupCanvas(cv) {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 600, h = cv.clientHeight || 300;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function frame(c, xs, ys, pad, xLabel, yLabel) {
    var ctx = c.ctx;
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    var xpad = (xmax - xmin || 1) * 0.06, ypad = (ymax - ymin || 1) * 0.1;
    xmin -= xpad; xmax += xpad; ymin -= ypad; ymax += ypad;
    var X = function (v) { return pad.l + (v - xmin) / (xmax - xmin) * (c.w - pad.l - pad.r); };
    var Y = function (v) { return c.h - pad.b - (v - ymin) / (ymax - ymin) * (c.h - pad.t - pad.b); };
    ctx.font = '11px system-ui, sans-serif';
    ctx.strokeStyle = '#e5e5e5'; ctx.fillStyle = '#666'; ctx.lineWidth = 1;
    niceTicks(xmin, xmax, c.w < 400 ? 3 : 5).forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(X(t), pad.t); ctx.lineTo(X(t), c.h - pad.b); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(tickLabel(t), X(t), c.h - pad.b + 14);
    });
    niceTicks(ymin, ymax, 4).forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(t)); ctx.lineTo(c.w - pad.r, Y(t)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(tickLabel(t), pad.l - 6, Y(t) + 4);
    });
    ctx.strokeStyle = '#999';
    ctx.strokeRect(pad.l, pad.t, c.w - pad.l - pad.r, c.h - pad.t - pad.b);
    ctx.fillStyle = '#333'; ctx.font = '12px system-ui, sans-serif';
    if (xLabel) { ctx.textAlign = 'center'; ctx.fillText(xLabel, (pad.l + c.w - pad.r) / 2, c.h - 6); }
    if (yLabel) {
      ctx.save(); ctx.translate(14, (pad.t + c.h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText(yLabel, 0, 0); ctx.restore();
    }
    return { X: X, Y: Y, xmin: xmin, xmax: xmax };
  }

  function drawPoint(ctx, x, y, outlier) {
    if (outlier) {
      ctx.strokeStyle = '#b42318'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
    } else {
      ctx.fillStyle = '#2b6cb0';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPlot(result) {
    var c = setupCanvas($('plot'));
    var K = L.KINDS[result.kind];
    var f = result.fit;
    var pad = { l: 58, r: 12, t: 12, b: 40 };
    var fr = frame(c, result.x, result.y, pad, K.xLabel, K.yLabel);
    var ctx = c.ctx;
    if (f.b != null) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fr.X(fr.xmin), fr.Y(f.a + f.b * fr.xmin));
      ctx.lineTo(fr.X(fr.xmax), fr.Y(f.a + f.b * fr.xmax));
      ctx.save(); ctx.rect(pad.l, pad.t, c.w - pad.l - pad.r, c.h - pad.t - pad.b); ctx.clip();
      ctx.stroke(); ctx.restore();
    }
    result.x.forEach(function (x, i) {
      drawPoint(ctx, fr.X(x), fr.Y(result.y[i]), f.outliers.indexOf(i) >= 0);
    });
  }

  function drawResid(result) {
    var cv = $('resid');
    var f = result.fit;
    cv.hidden = !f.z;
    if (!f.z) return;
    var c = setupCanvas(cv);
    var pad = { l: 58, r: 12, t: 8, b: 30 };
    var zs = f.z.concat([-2.5, 2.5]);
    var fr = frame(c, result.x, zs, pad, null, '표준화 잔차');
    var ctx = c.ctx;
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, fr.Y(0)); ctx.lineTo(c.w - pad.r, fr.Y(0)); ctx.stroke();
    // × 표시는 위 그래프와 같은 판정(stats.js의 outliers)만 쓴다
    result.x.forEach(function (x, i) { drawPoint(ctx, fr.X(x), fr.Y(f.z[i]), f.outliers.indexOf(i) >= 0); });
  }

  // ---------- 복사 · 저장 ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('복사 실패')); }
      catch (e) { reject(e); } finally { document.body.removeChild(ta); }
    });
  }

  function copyHwp() {
    if (!state.result) return;
    var lines;
    try { lines = L.hwpEquations(state.result, state.kind); }
    catch (e) { say('이 실험 종류는 아직 한글 수식을 지원하지 않습니다.', 'warn'); return; }
    var text = lines.join('\n');
    $('hwp-preview').textContent = text;
    copyText(text).then(function () {
      say('한글 수식을 복사했습니다. 한글 → 입력 → 수식(Ctrl+N, M)에서 한 줄씩 붙여 넣으세요.', '');
    }, function () {
      say('자동 복사가 막혀 있습니다. 아래 상자의 글을 직접 복사하세요.', 'warn');
    });
    $('done').hidden = false;
  }

  function savePng() {
    if (!state.result) return;
    var p = $('plot'), r = $('resid');
    var dpr = window.devicePixelRatio || 1;
    var out = document.createElement('canvas');
    out.width = p.width;
    var ctx = out.getContext('2d');
    var font = Math.round(12 * dpr) + 'px system-ui, sans-serif';
    // 결과 요약을 그림 폭에 맞춰 여러 줄로 나눈다 (휴대폰 폭에서도 ΔH가 잘리지 않게)
    ctx.font = font;
    var items = [L.KINDS[state.kind].label].concat(L.summaryLines(state.result));
    var maxW = out.width - 16 * dpr, lines = [], cur = '';
    items.forEach(function (it) {
      var next = cur ? cur + '   ' + it : it;
      if (cur && ctx.measureText(next).width > maxW) { lines.push(cur); cur = it; } else cur = next;
    });
    if (cur) lines.push(cur);
    var lineH = Math.round(18 * dpr);
    out.height = p.height + (r.hidden ? 0 : r.height) + lines.length * lineH + Math.round(10 * dpr);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(p, 0, 0);
    if (!r.hidden) ctx.drawImage(r, 0, p.height);
    ctx.fillStyle = '#1a1a1a'; ctx.font = font;
    var y0 = p.height + (r.hidden ? 0 : r.height);
    lines.forEach(function (ln, i) { ctx.fillText(ln, 8 * dpr, y0 + (i + 1) * lineH); });
    var a = document.createElement('a');
    a.download = 'linlab-' + state.kind + '.png';
    a.href = out.toDataURL('image/png');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ---------- 이벤트 ----------
  function init() {
    var sel = $('kind');
    Object.keys(L.KINDS).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = L.KINDS[k].label; sel.appendChild(o);
    });
    sel.value = 'vanthoff';
    setHeaders();
    setRows([]);

    sel.addEventListener('change', function () { endDemo(); setHeaders(); recalcIfShown(); });
    document.querySelectorAll('input[name="tempUnit"]').forEach(function (r) {
      r.addEventListener('change', function () { setHeaders(); recalcIfShown(); });
    });
    // 셀을 고치면(포커스가 빠지거나 Enter) 결과가 떠 있을 때 다시 계산
    $('data').addEventListener('change', function (e) {
      if (e.target.tagName === 'INPUT') recalcIfShown();
    });
    $('data').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); recalcIfShown(); }
    });

    $('paste').addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      e.preventDefault();
      endDemo();
      var rows = L.parsePasted(text);
      setRows(rows);
      $('paste').value = '';
      say(rows.length + '개 행을 넣었습니다. 계산하기를 누르세요.', '');
    });
    // 손으로 입력한 경우: 포커스가 빠질 때 반영
    $('paste').addEventListener('change', function () {
      var t = $('paste').value;
      if (!t.trim()) return;
      var rows = L.parsePasted(t);
      setRows(rows); $('paste').value = '';
      say(rows.length + '개 행을 넣었습니다. 계산하기를 누르세요.', '');
    });

    $('data').addEventListener('click', function (e) {
      if (e.target.classList.contains('del')) {
        e.target.closest('tr').remove(); renumber(); recalcIfShown();
      }
    });
    $('btn-add').addEventListener('click', function () { addRow('', ''); });
    $('btn-clear').addEventListener('click', function () {
      endDemo(); setRows([]); $('result-card').hidden = true; state.result = null; say('');
    });
    $('btn-calc').addEventListener('click', function () { calculate(); scrollToResult(); });
    $('btn-sample').addEventListener('click', function () {
      var s = L.SAMPLES[$('kind').value];
      if (!s) return;
      if (s.tempUnit) {
        var r = document.querySelector('input[name="tempUnit"][value="' + s.tempUnit + '"]');
        if (r) r.checked = true;
        setHeaders();
      }
      endDemo();
      setRows(s.rows);
      calculate();
      scrollToResult();
    });
    // 30초 체험: 5행 하나가 튄 반트 호프 데이터를 넣고 계산 → 결과로
    $('btn-demo').addEventListener('click', function () {
      var d = L.DEMO;
      $('kind').value = d.kind;
      var r = document.querySelector('input[name="tempUnit"][value="' + d.tempUnit + '"]');
      if (r) r.checked = true;
      setHeaders();
      setRows(d.rows);
      state.demo = { before: null };
      calculate();
      scrollToResult();
    });
    $('btn-hwp').addEventListener('click', copyHwp);
    $('btn-png').addEventListener('click', savePng);

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (state.result && !$('result-card').hidden) render(state.result); }, 150);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
