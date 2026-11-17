/* app.js — 화면 동작 */
(function () {
  'use strict';
  var L = window.LinLab;
  var $ = function (id) { return document.getElementById(id); };
  var state = { result: null, kind: 'vanthoff', demo: null };

  // 숫자 뒤 조사 "로/으로": 끝자리를 읽은 소리(영·삼·육은 받침 → 으로, 일·칠·팔은 ㄹ 받침 → 로)
  function ro(numText) { return /[036]$/.test(String(numText)) ? '으로' : '로'; }
  // 30초 체험 유도 문구. 숫자는 체험 데이터(samples.js DEMO)와 계산값에서 채운다(하드코딩 금지)
  var GUIDE = {
    outlier: function () {
      var d = L.DEMO;
      return d.row + '행이 튀었습니다(×). ' + d.row + "행의 '포함'을 꺼 보세요.";
    },
    excluded: function (before, after) {
      return L.DEMO.row + '행을 뺐습니다. ΔH 오차 ±' + before + ' → ±' + after + ' kJ/mol. 보고서에 뺀 이유를 적으세요.';
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
    show($('temp-unit-wrap'), !!K.temp);   // .seg가 display를 정해 hidden 속성만으로는 안 숨겨진다
    if ($('tf-wrap')) show($('tf-wrap'), $('kind').value === 'custom');
    $('btn-sample').textContent = (L.SAMPLES[$('kind').value] ? L.SAMPLES[$('kind').value].label : '샘플') + ' 불러오기';
  }

  function addRow(v1, v2) {
    var tb = $('data').tBodies[0];
    var tr = document.createElement('tr');
    var n = tb.rows.length + 1;
    tr.innerHTML = '<td class="num"><label class="inc-wrap"><input type="checkbox" class="inc" checked aria-label="' + n + '행 포함"><span class="rn">' + n + '</span></label></td>' +
      '<td><input type="text" inputmode="decimal" aria-label="1열 ' + n + '행"></td>' +
      '<td><input type="text" inputmode="decimal" aria-label="2열 ' + n + '행"></td>' +
      '<td><button type="button" class="del" aria-label="' + n + '행 삭제">✕</button></td>';
    var ins = tr.querySelectorAll('input[type="text"]');
    ins[0].value = v1 == null ? '' : v1;
    ins[1].value = v2 == null ? '' : v2;
    tb.appendChild(tr);
  }

  function renumber() {
    Array.prototype.forEach.call($('data').tBodies[0].rows, function (tr, i) {
      tr.querySelector('.rn').textContent = i + 1;
    });
  }

  function setRows(rows) {
    $('data').tBodies[0].innerHTML = '';
    rows.forEach(function (r) { addRow(r[0], r[1]); });
    while ($('data').tBodies[0].rows.length < 5) addRow('', '');
  }

  function bodyRows() { return Array.prototype.slice.call($('data').tBodies[0].rows); }

  // 표 → collectRows(빈 행 건너뜀, 표 행 번호 기억) + "포함"을 끈 행 번호
  function readRows() {
    var trs = bodyRows();
    var d = L.collectRows(trs.map(function (tr) {
      var ins = tr.querySelectorAll('input[type="text"]');
      return [ins[0].value, ins[1].value];
    }));
    d.exclude = [];
    trs.forEach(function (tr, i) {
      var on = tr.querySelector('.inc').checked;
      tr.classList.toggle('excluded', !on);
      if (!on) d.exclude.push(i + 1);
    });
    return d;
  }

  function markCells(result) {
    var K = kindDef();
    var trs = bodyRows();   // analyze가 표 행 번호를 돌려준다
    trs.forEach(function (tr) {
      tr.classList.remove('outlier');
      tr.querySelectorAll('input[type="text"]').forEach(function (i) { i.classList.remove('bad'); });
    });
    result.invalid.forEach(function (rowNum) {
      var tr = trs[rowNum - 1];
      if (!tr) return;
      var ins = tr.querySelectorAll('input[type="text"]');
      var v1 = Number(ins[0].value), v2 = Number(ins[1].value);
      if (ins[0].value.trim() === '' || !isFinite(v1)) ins[0].classList.add('bad');
      if (ins[1].value.trim() === '' || !isFinite(v2) || (K.logY && v2 <= 0)) ins[1].classList.add('bad');
      if (K.temp && isFinite(v1) && (tempUnit() === 'K' ? v1 : v1 + 273.15) <= 0) ins[0].classList.add('bad');
      // 종류별 변환 점검(kinds.js의 xOk · yOk)에 걸린 칸
      if (K.xOk && ins[0].value.trim() !== '' && isFinite(v1) && !K.xOk(v1, kindOpts())) ins[0].classList.add('bad');
      if (K.yOk && ins[1].value.trim() !== '' && isFinite(v2) && !K.yOk(v2, kindOpts())) ins[1].classList.add('bad');
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

  // 붙여 넣은 글자 → 표, 안내 줄(3열 이상이면 경고)
  function pasteText(text) {
    var rows = L.parsePasted(text);
    setRows(rows);
    $('paste').value = '';
    var warns = L.checkPaste(text).warnings.map(function (w) { return L.PASTE_WARN[w]; });
    say([rows.length + '개 행을 넣었습니다. 계산하기를 누르세요.'].concat(warns).join(' '), warns.length ? 'warn' : '');
  }

  // ---------- 계산 ----------
  // 결과 카드로 스크롤: 버튼 핸들러에서만, 휴대폰 폭(≤ 600px)이고 결과가 화면 아래쪽에 있을 때만
  // 버튼(샘플 · 계산하기 · 30초 체험)으로 계산했을 때만 부른다. 그래프가 화면에 다 보이지 않으면
  // 사용자가 직접 내리지 않아도 선형화 애니메이션이 보이도록 그래프 쪽으로 옮긴다(화면 폭과 관계없이).
  // 자동 재계산은 이 함수를 부르지 않으므로 스크롤하지 않는다.
  function scrollToResult() {
    var card = $('result-card');
    if (card.hidden) return;
    var r = $('plot').getBoundingClientRect(), vh = window.innerHeight;
    if (r.top >= 0 && r.bottom <= vh) return;   // 이미 다 보인다
    var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // 그래프가 화면보다 낮으면 가운데로, 높으면 위쪽 끝을 맞춘다
    $('plot').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: r.height < vh ? 'center' : 'start' });
  }

  function updateGuide(result) {
    var g = $('guide');
    if (!state.demo || result.kind !== 'vanthoff' || result.values.dH_ci_kJ == null) { g.hidden = true; return; }
    var ci = L.fmtParts(result.values.dH_kJ, result.values.dH_ci_kJ)[1];
    if (result.outlierRows.length) {
      if (state.demo.before == null) { state.demo.before = ci; state.demo.r2 = result.fit.r2; }
      g.textContent = GUIDE.outlier(); g.className = 'guide';
    } else if (state.demo.before != null && result.excludedRows.indexOf(L.DEMO.row) >= 0) {
      g.textContent = GUIDE.excluded(state.demo.before, ci); g.className = 'guide ok';
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

  // app.js가 만든 줄을 보이거나 숨긴다. `.row` · `.ref`는 display: flex라 hidden 속성만으로는 안 숨을 수 있어 display도 함께 맞춘다
  function show(el, on) { el.hidden = !on; el.style.display = on ? '' : 'none'; }

  // 종류별 추가 입력(결과 카드 · 입력 카드 안에 app.js가 만든 칸)을 analyze 옵션으로 모은다
  function kindOpts() {
    var o = { tempUnit: tempUnit() };
    var u = $('unk-in');
    if (u && u.value.trim() !== '') o.unknownA = u.value.trim();   // 검량선: 미지 시료 흡광도
    if ($('xt') && $('yt')) { o.xT = $('xt').value; o.yT = $('yt').value; }   // 범용 변환: 고른 x · y 변환
    return o;
  }

  // 범용 변환(custom)일 때만 보이는 "x 변환" · "y 변환" 선택 상자. 입력 카드 안, 종류 줄 바로 아래에 만든다
  function buildTransforms() {
    var row = document.createElement('div');
    row.id = 'tf-wrap'; row.className = 'row'; show(row, false);
    [['xt', 'x 변환', 'x'], ['yt', 'y 변환', 'y']].forEach(function (d) {
      var lab = document.createElement('label');
      lab.htmlFor = d[0]; lab.textContent = d[1];
      var s = document.createElement('select');
      s.id = d[0];
      L.TRANSFORMS.forEach(function (t) {
        var op = document.createElement('option');
        op.value = t; op.textContent = L.axisLabel(t, d[2]); s.appendChild(op);
      });
      s.addEventListener('change', recalcIfShown);   // 자동 재계산: 스크롤·애니메이션 없음
      row.appendChild(lab); row.appendChild(s);
    });
    var kindRow = $('kind').parentNode;
    kindRow.parentNode.insertBefore(row, kindRow.nextSibling);
  }

  // 검량선(beer)일 때만 보이는 "미지 시료 흡광도" 입력 칸. 결과 카드 안, 문헌값 줄 위에 만든다
  function buildUnknown() {
    var wrap = document.createElement('div');
    wrap.id = 'unk-wrap'; wrap.className = 'ref'; show(wrap, false);
    var lab = document.createElement('label');
    lab.htmlFor = 'unk-in'; lab.textContent = '미지 시료 흡광도';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.id = 'unk-in'; inp.inputMode = 'decimal'; inp.autocomplete = 'off';
    var out = document.createElement('p');
    out.id = 'unk-out'; out.className = 'ref-out'; out.setAttribute('role', 'status');
    wrap.appendChild(lab); wrap.appendChild(inp); wrap.appendChild(out);
    $('ref-wrap').parentNode.insertBefore(wrap, $('ref-wrap'));
    inp.addEventListener('input', recalcIfShown);   // 자동 재계산: 스크롤·애니메이션 없음
  }

  function updateUnknown(result) {
    var wrap = $('unk-wrap');
    if (!wrap) return;
    var inp = $('unk-in'), out = $('unk-out');
    show(wrap, result.kind === 'beer');
    inp.classList.remove('bad'); out.className = 'ref-out'; out.textContent = '';
    if (wrap.hidden) return;
    var s = inp.value.trim();
    if (s !== '' && !isFinite(Number(s))) {
      inp.classList.add('bad'); out.className = 'ref-out bad';
      out.textContent = '흡광도는 숫자로 넣으세요.';
    }
  }

  // animate: 버튼(샘플 · 계산하기 · 30초 체험)에서 부를 때만 true
  function calculate(animate) {
    var kind = $('kind').value;
    var d = readRows();
    var o = kindOpts();
    var result = L.analyze(kind, d.c1, d.c2, Object.assign({ rows: d.rows, exclude: d.exclude }, o));
    // 제외 전 결과(비교 한 줄용)
    result.before = d.exclude.length ? L.analyze(kind, d.c1, d.c2, Object.assign({ rows: d.rows }, o)) : null;
    state.result = result; state.kind = kind;
    markCells(result);
    $('done').hidden = true;
    renderHwpPreview();

    var notes = [];
    L.checkInput(kind, d.c1, d.c2, { tempUnit: tempUnit() }).warnings.forEach(function (w) {
      notes.push(L.TEMP_WARN[w]);
    });
    if (result.invalid.length) {
      notes.push(result.invalid.length + '개 행은 숫자가 아니거나' +
        (kindDef().logY ? ' 0 이하라서(ln을 취할 수 없음)' :
          (kindDef().xOk || kindDef().yOk) ? ' 변환할 수 없는 값이라서' : '') + ' 계산에서 뺐습니다 (빨간 칸).');
    }
    var n = result.fit.n;
    if (n >= 2 && result.fit.b == null) { // x가 모두 같음(같은 열을 두 번 고름 등)
      $('guide').hidden = true;
      say((notes.concat(['x 값이 모두 같아 직선을 그을 수 없습니다.'])).join(' '), 'bad');
      $('result-card').hidden = false;
      render(result, animate);
      return;
    }
    if (n < 3) {
      $('guide').hidden = true;
      say((notes.concat(['점이 3개 이상 필요합니다. 지금 ' + n + '개입니다.'])).join(' '), 'bad');
      $('result-card').hidden = n < 2;
      if (n >= 2) render(result, animate);
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
    render(result, animate);
    updateGuide(result);
  }

  // animate: 버튼으로 계산했을 때만 참(자동 재계산·크기 변경은 바로 그린다)
  function render(result, animate) {
    var f = result.fit, v = result.values, kind = result.kind;
    var items = [];
    items.push(['기울기 b', L.fmt(f.b, f.ci95)]);
    items.push(['절편 a', L.fmt(f.a, f.ci95a)]);
    items.push(['결정계수 R²', L.fmtR2(f.r2)]);
    items.push(['점 개수 n', String(f.n)]);
    if (kind === 'vanthoff') {
      items.push(['ΔH', L.fmt(v.dH_kJ, v.dH_ci_kJ) + ' kJ/mol']);
      items.push(['ΔS', L.fmt(v.dS, v.dS_ci) + ' J/(mol·K)']);
    } else if (kind === 'freezing') {
      items.push(['Kf', L.fmt(v.Kf, v.Kf_ci) + ' K·kg/mol']);
    } else if (kind === 'arrhenius') {
      items.push(['Ea', L.fmt(v.Ea_kJ, v.Ea_ci_kJ) + ' kJ/mol']);
      items.push(['ln A', L.fmt(v.lnA, v.lnA_ci)]);
    } else if (kind === 'first') {
      items.push(['k', L.fmt(v.k, v.k_ci) + ' s⁻¹']);
      items.push(['반감기', L.fmt(v.halfLife, null) + ' s']);   // 비선형이라 오차 없음
    } else if (kind === 'beer') {
      items.push(['검량선 기울기', L.fmt(v.slope, v.slope_ci) + ' L/mol']);
      if (v.unknownC != null) items.push(['미지 시료 농도', L.fmt(v.unknownC, null) + ' mol/L']);   // 유효숫자 4자리, 반폭 없음
    } else if (kind === 'second') {
      items.push(['k', L.fmt(v.k, v.k_ci) + ' L/(mol·s)']);
    } else if (kind === 'clausius') {
      items.push(['ΔHvap', L.fmt(v.dHvap_kJ, v.dHvap_ci_kJ) + ' kJ/mol']);
    } else if (kind === 'lineweaver') {
      items.push(['Vmax', L.fmt(v.Vmax, null)]);   // 비선형 변환이라 ± 없음(유효숫자 4자리)
      items.push(['Km', L.fmt(v.Km, null)]);
    }
    var ex = $('excl');
    if (result.excludedRows.length) {
      var line = '제외 ' + result.excludedRows.length + '개(' + result.excludedRows.join(', ') + '행) — 보고서에 제외 이유를 적으세요.';
      var b = result.before;
      if (b && kind === 'vanthoff' && b.values.dH_kJ != null && v.dH_kJ != null) {
        line += ' 제외 전 ΔH ' + L.fmt(b.values.dH_kJ, b.values.dH_ci_kJ) + ' → 제외 후 ' + L.fmt(v.dH_kJ, v.dH_ci_kJ) + ' kJ/mol';
      } else if (b && b.fit.b != null && f.b != null) {
        line += ' 제외 전 기울기 ' + L.fmt(b.fit.b, b.fit.ci95) + ' → 제외 후 ' + L.fmt(f.b, f.ci95);
      }
      ex.textContent = line; ex.hidden = false;
    } else { ex.hidden = true; }
    $('result').innerHTML = items.map(function (it) {
      return '<dt>' + it[0] + '</dt><dd>' + it[1] + '</dd>';
    }).join('') + (f.ci95 != null ? '<dt></dt><dd class="small">± 는 95% 신뢰구간 (t = ' + Number(f.t.toFixed(3)) + ', 자유도 ' + (f.n - 2) + ')</dd>' : '');
    stopAnim();   // 재생 중 다시 그리면 앞의 재생을 취소한다
    stopSfx();
    if (animate) { playPlot(result); playSfx(result); } else drawPlot(result);
    drawResid(result);
    updateUnknown(result);
    updateRef(result);
  }

  // ---------- 문헌값 비교 (첫 물리량에만) ----------
  function firstQuantity(result) {
    var v = result.values || {}, f = result.fit;
    if (result.kind === 'vanthoff') return { name: 'ΔH', unit: 'kJ/mol', value: v.dH_kJ, ci: v.dH_ci_kJ };
    if (result.kind === 'freezing') return { name: 'Kf', unit: 'K·kg/mol', value: v.Kf, ci: v.Kf_ci };
    if (result.kind === 'arrhenius') return { name: 'Ea', unit: 'kJ/mol', value: v.Ea_kJ, ci: v.Ea_ci_kJ };
    if (result.kind === 'first') return { name: 'k', unit: 's⁻¹', value: v.k, ci: v.k_ci };
    if (result.kind === 'beer') return { name: '검량선 기울기', unit: 'L/mol', value: v.slope, ci: v.slope_ci };
    if (result.kind === 'second') return { name: 'k', unit: 'L/(mol·s)', value: v.k, ci: v.k_ci };
    if (result.kind === 'clausius') return { name: 'ΔHvap', unit: 'kJ/mol', value: v.dHvap_kJ, ci: v.dHvap_ci_kJ };
    if (result.kind === 'lineweaver') return { name: 'Vmax', unit: '', value: v.Vmax, ci: null };   // 반폭 없음
    if (result.kind === 'linear') return { name: '기울기 b', unit: '', value: f.b, ci: f.ci95 };
    return null;
  }

  function shortNum(x, digits) { return String(Number(x.toPrecision(digits))); }

  function updateRef(result) {
    var wrap = $('ref-wrap'), inp = $('ref-in'), out = $('ref-out');
    var q = result ? firstQuantity(result) : null;
    if (!q || q.value == null) { show(wrap, false); return; }
    if (wrap.dataset.kind !== result.kind) { inp.value = ''; wrap.dataset.kind = result.kind; }
    show(wrap, true);
    $('ref-label').textContent = q.name + ' 문헌값';
    $('ref-unit').textContent = q.unit;
    var s = inp.value.trim();
    inp.classList.remove('bad'); out.className = 'ref-out';
    if (s === '') { out.textContent = ''; return; }
    var ref = Number(s);
    if (!isFinite(ref) || ref === 0) {
      inp.classList.add('bad'); out.className = 'ref-out bad';
      out.textContent = ref === 0 ? '문헌값이 0이면 상대 오차를 낼 수 없습니다.' : '문헌값은 숫자로 넣으세요.';
      return;
    }
    var line = '상대 오차 ' + shortNum(L.relErr(q.value, ref), 2) + ' %';
    var ag = L.agree(q.value, q.ci, ref);
    if (ag.inside === true) line += ' · 우리 95% 구간 안';
    else if (ag.inside === false) {
      line += ' · 우리 95% 구간 밖(차이 = 오차의 ' + (ag.ratio >= 10 ? String(Math.round(ag.ratio)) : shortNum(ag.ratio, 2)) +
        '배, 문헌값 불확도는 고려하지 않음)';
    } else line += ' · 오차가 없어 95% 구간과 비교할 수 없습니다';
    out.textContent = line;
  }

  // ---------- 그래프 ----------
  // 캔버스는 CSS 변수를 바로 못 읽으므로 공용 팔레트 값을 여기에 둔다
  var PALETTE = { ink: '#1b1f3b', muted: '#6b7190', grid: '#eceefa', edge: '#c9cee6', primary: '#5b5bf0', pink: '#ec4899', hot: '#f43f5e', ok: '#10b981', grey: '#bbb' };
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
    ctx.strokeStyle = PALETTE.grid; ctx.fillStyle = PALETTE.muted; ctx.lineWidth = 1;
    niceTicks(xmin, xmax, c.w < 400 ? 3 : 5).forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(X(t), pad.t); ctx.lineTo(X(t), c.h - pad.b); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(tickLabel(t), X(t), c.h - pad.b + 14);
    });
    niceTicks(ymin, ymax, 4).forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(t)); ctx.lineTo(c.w - pad.r, Y(t)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(tickLabel(t), pad.l - 6, Y(t) + 4);
    });
    ctx.strokeStyle = PALETTE.edge;
    ctx.strokeRect(pad.l, pad.t, c.w - pad.l - pad.r, c.h - pad.t - pad.b);
    ctx.fillStyle = PALETTE.ink; ctx.font = '12px system-ui, sans-serif';
    if (xLabel) { ctx.textAlign = 'center'; ctx.fillText(xLabel, (pad.l + c.w - pad.r) / 2, c.h - 6); }
    if (yLabel) {
      ctx.save(); ctx.translate(14, (pad.t + c.h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText(yLabel, 0, 0); ctx.restore();
    }
    return { X: X, Y: Y, xmin: xmin, xmax: xmax };
  }

  function drawPoint(ctx, x, y, outlier, r, color) {
    if (outlier) {   // 이상점: 또렷한 ×
      ctx.strokeStyle = PALETTE.hot; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
      ctx.lineCap = 'butt';
    } else {         // 측정점: 흰 테두리를 두른 점
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, (r || 4) + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color || PALETTE.primary;
      ctx.beginPath(); ctx.arc(x, y, r || 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 선형화 애니메이션(버튼으로 계산했을 때만). 점 개수와 관계없이 전체 ANIM_MS:
  // 앞 PTS_MS 동안 점이 입력 순서대로 하나씩 찍히고, 찍힐 때마다 "그때까지의 점"으로 맞춘 직선으로 기울기가 움직인다.
  var ANIM_MS = 3000, PTS_MS = 2600, animId = 0;
  function stopAnim() {
    if (animId) { window.cancelAnimationFrame(animId); animId = 0; }
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  // 앞에서부터 k개 점의 최소제곱 직선을 O(1)로 돌려주는 함수(누적합, 평균을 빼서 자릿수 손실을 줄임)
  function prefixFitter(xs, ys) {
    var n = xs.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    var sx = [0], sy = [0], sxx = [0], sxy = [0];
    for (i = 0; i < n; i++) {
      var dx = xs[i] - mx, dy = ys[i] - my;
      sx.push(sx[i] + dx); sy.push(sy[i] + dy); sxx.push(sxx[i] + dx * dx); sxy.push(sxy[i] + dx * dy);
    }
    return function (k) {
      var den = k * sxx[k] - sx[k] * sx[k];
      if (k < 2 || !(Math.abs(den) > 0)) return null;
      var b = (k * sxy[k] - sx[k] * sy[k]) / den;
      return { b: b, a: my + (sy[k] - b * sx[k]) / k - b * mx };
    };
  }
  function playPlot(result) {
    stopAnim();
    var n = result.x.length;
    if (!window.requestAnimationFrame || reducedMotion() || n < 2 || result.fit.b == null) { drawPlot(result); return; }
    // 찍는 순서: x가 작은 점부터(왼쪽 → 오른쪽)
    var order = result.x.map(function (_, i) { return i; }).sort(function (i, j) { return result.x[i] - result.x[j] || i - j; });
    var fitK = prefixFitter(order.map(function (i) { return result.x[i]; }), order.map(function (i) { return result.y[i]; }));
    var dt = PTS_MS / n, t0 = null;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = ts - t0;
      if (t >= ANIM_MS) { animId = 0; drawPlot(result); return; }   // 마지막 장면 = 애니메이션 없는 그림
      var kf = t / dt, k = Math.min(n, Math.floor(kf) + 1), frac = k < n || t < PTS_MS ? kf - Math.floor(kf) : 1;
      var cur = k >= n ? { a: result.fit.a, b: result.fit.b } : fitK(k), prev = fitK(k - 1) || cur, line = null;
      if (cur) {
        var e = 1 - Math.pow(1 - Math.min(1, frac * 1.6), 3);   // 새 점 쪽으로 빠르게 다가가 멈춘다
        line = { a: prev.a + (cur.a - prev.a) * e, b: prev.b + (cur.b - prev.b) * e };
      }
      drawPlot(result, { k: k, line: line, pop: t < PTS_MS ? frac : 1, order: order });
      animId = window.requestAnimationFrame(step);
    }
    drawPlot(result, { k: 1, line: null, pop: 0, order: order });
    animId = window.requestAnimationFrame(step);
  }

  // anim 생략 = 완성된 그림. anim = { k: 찍힌 점 개수, line: {a, b} 또는 null, pop: 새 점의 진행도 0~1 }
  function drawPlot(result, anim) {
    var done = !anim;
    var nShow = done ? result.x.length : anim.k;
    var c = setupCanvas($('plot'));
    var K = L.KINDS[result.kind];
    var f = result.fit;
    var pad = { l: 58, r: 12, t: 12, b: 40 };
    var exX = result.excludedXY.map(function (p) { return p[0]; }), exY = result.excludedXY.map(function (p) { return p[1]; });
    var fr = frame(c, result.x.concat(exX), result.y.concat(exY), pad, K.xLabel, K.yLabel);
    var ctx = c.ctx;
    result.excludedXY.forEach(function (p) {   // 뺀 점은 회색으로 남긴다
      ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(fr.X(p[0]), fr.Y(p[1]), 4, 0, Math.PI * 2); ctx.fill();
    });
    var ln = done ? (f.b != null ? { a: f.a, b: f.b } : null) : anim.line;
    if (ln) {
      var grad = PALETTE.ink;   // 회귀 직선: 보라 → 분홍 그라데이션, 둥근 끝
      if (ctx.createLinearGradient) {
        grad = ctx.createLinearGradient(pad.l, 0, c.w - pad.r, 0);
        grad.addColorStop(0, PALETTE.primary); grad.addColorStop(1, PALETTE.pink);
      }
      ctx.save(); ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.rect(pad.l, pad.t, c.w - pad.l - pad.r, c.h - pad.t - pad.b); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(fr.X(fr.xmin), fr.Y(ln.a + ln.b * fr.xmin));
      ctx.lineTo(fr.X(fr.xmax), fr.Y(ln.a + ln.b * fr.xmax));
      ctx.stroke(); ctx.restore();
    }
    if (done && ln && f.outliers && f.outliers.length > 0) {   // 끝난 그림에만: 이상치(×)를 뺀 직선(초록 점선)과 범례
      var kx = [], ky = [], fit2 = null, LF = window.LinLab && window.LinLab.linearFit;
      for (var q = 0; q < result.x.length; q++) {
        if (f.outliers.indexOf(q) < 0) { kx.push(result.x[q]); ky.push(result.y[q]); }
      }
      if (kx.length >= 3 && typeof LF === 'function') {
        try { fit2 = LF(kx, ky); } catch (err) { fit2 = null; }
      }
      if (fit2 && typeof fit2.a === 'number' && typeof fit2.b === 'number' && isFinite(fit2.a) && isFinite(fit2.b)) {
        var GREEN = '#10b981';
        ctx.save(); ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
        if (ctx.setLineDash) ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.rect(pad.l, pad.t, c.w - pad.l - pad.r, c.h - pad.t - pad.b); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(fr.X(fr.xmin), fr.Y(fit2.a + fit2.b * fr.xmin));
        ctx.lineTo(fr.X(fr.xmax), fr.Y(fit2.a + fit2.b * fr.xmax));
        ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.restore();
        // 범례: 직선이 오른쪽 위로 가면 왼쪽 위, 오른쪽 아래로 가면 오른쪽 위(점이 없는 구석)
        var lgT = ['전체 점으로 그은 직선', '이상치(×)를 뺀 직선'], lgW = 0;
        ctx.save(); ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
        lgT.forEach(function (s) {
          var m = ctx.measureText ? ctx.measureText(s) : null;
          lgW = Math.max(lgW, (m && m.width) || 112);
        });
        var bw = 40 + lgW + 8, lx = ln.b >= 0 ? pad.l + 6 : c.w - pad.r - 6 - bw, ly = pad.t + 6;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(lx, ly, bw, 36);
        ctx.strokeStyle = PALETTE.primary; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(lx + 8, ly + 11); ctx.lineTo(lx + 34, ly + 11); ctx.stroke();
        ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
        if (ctx.setLineDash) ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(lx + 8, ly + 26); ctx.lineTo(lx + 34, ly + 26); ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillText(lgT[0], lx + 40, ly + 15); ctx.fillText(lgT[1], lx + 40, ly + 30);
        ctx.restore();
      }
    }
    for (var j = 0; j < nShow; j++) {
      // 재생 중에는 x가 작은 점부터 모두 점으로 찍고(방금 찍힌 점은 크게 → 제 크기), ×는 끝난 그림에서 표시한다
      var i = done ? j : anim.order[j];
      var r = !done && j === nShow - 1 ? 4 + 6 * (1 - anim.pop) : 4;
      drawPoint(ctx, fr.X(result.x[i]), fr.Y(result.y[i]), done && f.outliers.indexOf(i) >= 0, r);
    }
    if (!done && ln) {   // 재생 중에만: 지금 기울기
      ctx.fillStyle = PALETTE.ink; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('점 ' + nShow + '개 · 기울기 ' + Number(ln.b.toPrecision(4)), pad.l + 8, pad.t + 16);
    }
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
    ctx.strokeStyle = PALETTE.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, fr.Y(0)); ctx.lineTo(c.w - pad.r, fr.Y(0)); ctx.stroke();
    // × 표시는 위 그래프와 같은 판정(stats.js의 outliers)만 쓴다. 점 색은 잔차의 부호(+ 보라, − 분홍)
    result.x.forEach(function (x, i) {
      drawPoint(ctx, fr.X(x), fr.Y(f.z[i]), f.outliers.indexOf(i) >= 0, 4, f.z[i] < 0 ? PALETTE.pink : PALETTE.primary);
    });
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

  function hwpLines() {
    try { return L.hwpEquations(state.result, state.kind); } catch (e) { return null; }
  }

  // 미리보기: 줄마다 "이 줄 복사" 버튼
  function renderHwpPreview() {
    var box = $('hwp-preview');
    box.textContent = '';
    var lines = state.result ? hwpLines() : null;
    if (!lines) return;
    lines.forEach(function (ln, i) {
      var div = document.createElement('div');
      div.className = 'eq-line';
      var code = document.createElement('code');
      code.textContent = ln;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ghost line-copy';
      btn.dataset.i = String(i);
      btn.textContent = '이 줄 복사';
      div.appendChild(code); div.appendChild(btn);
      box.appendChild(div);
    });
  }

  function copyHwpText(text, okMsg) {
    copyText(text).then(function () {
      say(okMsg, '');
    }, function () {
      say('자동 복사가 막혀 있습니다. 아래 상자의 글을 직접 복사하세요.', 'warn');
    });
    $('done').hidden = false;
  }

  function copyHwp() {
    if (!state.result) return;
    var text;
    try { text = L.hwpBlock(state.result, state.kind); }
    catch (e) { say('이 실험 종류는 아직 한글 수식을 지원하지 않습니다.', 'warn'); return; }
    renderHwpPreview();
    copyHwpText(text, '한글 수식을 한 상자로 복사했습니다. 한글 → 입력 → 수식(Ctrl+N, M)에 한 번 붙여 넣으세요.');
  }

  function copyHwpLine(i) {
    var lines = state.result ? hwpLines() : null;
    if (!lines || lines[i] == null) return;
    copyHwpText(lines[i], '이 줄을 복사했습니다. 한글 → 입력 → 수식(Ctrl+N, M)에 붙여 넣으세요.');
  }

  // 결과 표(기울기·절편·R²)를 탭 구분으로 복사 → 한글 표에 바로 붙음
  function copyTSV() {
    if (!state.result) return;
    copyText(L.resultTSV(state.result)).then(function () {
      say('결과 표를 복사했습니다. 한글 표나 엑셀에 붙여 넣으세요.', '');
    }, function () {
      say('자동 복사가 막혀 있습니다. 결과 칸의 값을 직접 복사하세요.', 'warn');
    });
  }

  function savePng() {
    if (!state.result) return;
    if (animId) { stopAnim(); drawPlot(state.result); }   // 재생 중이어도 완성된 그림으로 저장
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
    buildUnknown();
    buildTransforms();
    setHeaders();
    setRows([]);

    sel.addEventListener('change', function () { endDemo(); setHeaders(); recalcIfShown(); });
    document.querySelectorAll('input[name="tempUnit"]').forEach(function (r) {
      r.addEventListener('change', function () { setHeaders(); recalcIfShown(); });
    });
    // 셀을 고치면(포커스가 빠지거나 Enter) 결과가 떠 있을 때 다시 계산
    $('data').addEventListener('change', function (e) {
      if (e.target.tagName !== 'INPUT') return;
      // "포함"을 끄면 결과가 안 떠 있어도(첫 계산 전, 모두 지우기 뒤) 그 행은 바로 회색
      if (e.target.classList.contains('inc')) e.target.closest('tr').classList.toggle('excluded', !e.target.checked);
      recalcIfShown();
    });
    $('data').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); recalcIfShown(); }
    });

    $('paste').addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      e.preventDefault();
      endDemo();
      pasteText(text);
    });
    // 손으로 입력한 경우: 포커스가 빠질 때 반영
    $('paste').addEventListener('change', function () {
      var t = $('paste').value;
      if (!t.trim()) return;
      pasteText(t);
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
    $('btn-calc').addEventListener('click', function () { calculate(true); scrollToResult(); });
    $('btn-sample').addEventListener('click', function () {
      var s = L.SAMPLES[$('kind').value];
      if (!s) return;
      if (s.tempUnit) {
        var r = document.querySelector('input[name="tempUnit"][value="' + s.tempUnit + '"]');
        if (r) r.checked = true;
        setHeaders();
      }
      if ($('kind').value === 'custom') {   // 범용 변환 샘플: 직선이 되는 변환으로 맞춘다
        $('xt').value = s.xT || 'id';
        $('yt').value = s.yT || 'id';
      }
      endDemo();
      setRows(s.rows);
      calculate(true);
      scrollToResult();
    });
    // 1000점 샘플: 일부러 벗어나게 한 점 몇 개가 섞인 일반 선형 데이터
    $('btn-big').addEventListener('click', function () {
      var s = L.BIG;
      $('kind').value = s.kind;
      setHeaders();
      endDemo();
      setRows(s.rows);
      calculate(true);
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
      calculate(true);
      scrollToResult();
    });
    $('btn-hwp').addEventListener('click', copyHwp);
    $('hwp-preview').addEventListener('click', function (e) {
      if (e.target.classList.contains('line-copy')) copyHwpLine(Number(e.target.dataset.i));
    });
    $('btn-tsv').addEventListener('click', copyTSV);
    $('btn-png').addEventListener('click', savePng);
    $('ref-in').addEventListener('input', function () { if (state.result) updateRef(state.result); });

    var t, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      // 휴대폰에서는 스크롤할 때 주소창이 접히며 높이만 바뀌는 resize가 온다. 폭이 그대로면 다시 그리지 않는다
      // (다시 그리면 재생 중인 선형화 애니메이션이 끊겨 완성된 그림만 보인다).
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(function () { if (state.result && !$('result-card').hidden) render(state.result); }, 150);
    });
  }

  // ---------- 효과음(sfx.js) ----------
  // 그래프 애니메이션과 같은 시간표(점 찍기 → 마무리)로 소리를 낸다. 그리기 함수(playPlot)는 건드리지 않고 옆에서 나란히 돈다.
  // 애니메이션을 하지 않는 경우(동작 줄이기, 점 2개 미만, 회귀 불가)에는 소리도 내지 않는다.
  var sfxTimers = [];
  function stopSfx() { sfxTimers.forEach(function (t) { clearTimeout(t); }); sfxTimers = []; }
  function playSfx(result) {
    var S = window.LinLab && window.LinLab.sfx, n = result.x.length;
    var still = typeof reducedMotion === 'function' && reducedMotion();
    if (!S || !window.requestAnimationFrame || still || n < 2 || result.fit.b == null) return;
    var total = typeof ANIM_MS === 'number' ? ANIM_MS : 3000, pts = typeof PTS_MS === 'number' ? PTS_MS : 2600;
    var steps = Math.min(n, Math.floor(pts / 36));   // 점이 많으면 소리는 초당 28번쯤으로 간추린다
    for (var j = 0; j < steps; j++) {
      (function (j) {
        var i = steps === n ? j : Math.round(j * (n - 1) / Math.max(1, steps - 1));
        sfxTimers.push(setTimeout(function () { S.point(i, n); }, j * pts / steps));
      })(j);
    }
    sfxTimers.push(setTimeout(function () { S.finish(result.fit.outliers.length); }, total));
  }

  // 겉모습(theme.css)과 효과음(sfx.js)은 index.html을 바꾸지 않고 여기서 불러온다. 이미 불러와 있으면 건너뛴다.
  (function () {
    if (!document.querySelector('link[href^="theme.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'theme.css'; document.head.appendChild(l);
    }
    if (!(window.LinLab && window.LinLab.sfx) && !document.querySelector('script[src^="sfx.js"]')) {
      var s = document.createElement('script'); s.src = 'sfx.js'; document.head.appendChild(s);
    }
  })();

  document.addEventListener('DOMContentLoaded', init);
})();
