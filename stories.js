/* stories.js — 실험 이야기 갤러리와 상황 팝업.
 * app.js 안쪽 함수는 쓰지 않고 화면 요소(#kind, #paste, #btn-calc, #ref-in …)로만 연결한다.
 * 흐름: 카드 누르기 → 팝업(상황 · 궁금한 점 · 데이터 미리 보기) → "선형화 계산하기" → 표를 채우고 계산하기 버튼을 누른다. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var doc = document;
  var L = window.LinLab || {};
  var PREVIEW_ROWS = 6;
  var modal = null, parts = {}, current = null, lastCard = null, driving = false;

  function $(id) { return doc.getElementById(id); }
  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }

  // 지수 표기(1e-7 같은 꼴) 없이 숫자를 글자로
  function num(v) {
    var s = String(v);
    if (s.indexOf('e') < 0 && s.indexOf('E') < 0) return s;
    return Number(v).toFixed(12).replace(/\.?0+$/, '');
  }

  // KINDS에 있는 종류의 이야기만 보인다(종류가 추가되면 그 이야기도 저절로 나타난다)
  function visible() {
    var kinds = L.KINDS || {};
    return (L.SCENARIOS || []).filter(function (s) {
      return s && s.id && kinds[s.kind] && s.rows && s.rows.length >= 3;
    });
  }
  function kindTag(s) {
    var K = (L.KINDS || {})[s.kind];
    return K && K.label ? K.label.replace(/\s*\(.*\)\s*$/, '') : s.kind;
  }
  function usesTemp(s) {
    var K = (L.KINDS || {})[s.kind];
    return !!(K && K.temp);
  }
  function colNames(s) {
    var K = (L.KINDS || {})[s.kind] || {};
    var c = s.cols && s.cols.length === 2 ? s.cols.slice() : (K.cols || ['x', 'y']).slice();
    if (usesTemp(s) && !/°C|\(K\)/.test(c[0])) c[0] += s.tempUnit === 'K' ? ' (K)' : ' (°C)';
    return c;
  }

  // ---------- 갤러리 ----------
  function buildGallery() {
    var list = visible();
    var host = $('stories');
    if (!list.length) { if (host) host.hidden = true; return; }
    if (!host) {
      var card = $('input-card');
      if (!card) return;
      host = el('section');
      host.id = 'stories';
      card.insertBefore(host, card.firstChild);
    }
    host.hidden = false;
    host.classList.add('stories');
    host.setAttribute('aria-labelledby', 'stories-title');
    host.textContent = '';
    var h = el('h2', 'st-title', '실험 사례로 시작하기');
    h.id = 'stories-title';
    host.appendChild(h);
    host.appendChild(el('p', 'st-sub', '사례를 고르면 실험 조건과 분석 과제가 나오고, 측정값 50개(이상치 1개 포함)가 표에 채워집니다.'));
    var row = el('div', 'st-row');
    list.forEach(function (s) {
      var b = el('button', 'st-card');
      b.type = 'button';
      b.dataset.story = s.id;
      var e = el('span', 'st-emoji', s.emoji || '🧪');
      e.setAttribute('aria-hidden', 'true');
      b.appendChild(e);
      b.appendChild(el('span', 'st-name', s.title));
      b.appendChild(el('span', 'st-hook', s.hook || ''));
      b.appendChild(el('span', 'st-tag', kindTag(s)));
      b.appendChild(el('span', 'st-cta', '사례 열기'));
      b.addEventListener('click', function () { openStory(s, b); });
      row.appendChild(b);
    });
    host.appendChild(row);
  }

  // ---------- 팝업 ----------
  function buildModal() {
    modal = el('div');
    modal.id = 'story-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'story-title');
    modal.setAttribute('aria-describedby', 'story-scene');

    var box = el('div', 'st-dialog');
    var head = el('div', 'st-head');
    parts.emoji = el('span', 'st-head-emoji');
    parts.emoji.setAttribute('aria-hidden', 'true');
    var headText = el('div', 'st-head-text');
    parts.kind = el('span', 'st-kind');
    parts.title = el('h2', 'st-head-title');
    parts.title.id = 'story-title';
    headText.appendChild(parts.kind);
    headText.appendChild(parts.title);
    head.appendChild(parts.emoji);
    head.appendChild(headText);

    var body = el('div', 'st-body');
    parts.scene = el('p', 'st-scene');
    parts.scene.id = 'story-scene';
    parts.q = el('p', 'st-q');
    parts.how = el('p', 'st-how');
    parts.tableWrap = el('div', 'st-table-wrap');
    parts.src = el('p', 'st-src');
    body.appendChild(parts.scene);
    body.appendChild(parts.q);
    body.appendChild(parts.how);
    body.appendChild(parts.tableWrap);
    body.appendChild(parts.src);

    var actions = el('div', 'st-actions');
    parts.close = el('button', 'ghost', '닫기');
    parts.close.type = 'button';
    parts.close.id = 'story-close';
    parts.go = el('button', 'primary', '선형화 계산하기');
    parts.go.type = 'button';
    parts.go.id = 'story-go';
    actions.appendChild(parts.close);
    actions.appendChild(parts.go);

    box.appendChild(head);
    box.appendChild(body);
    box.appendChild(actions);
    modal.appendChild(box);
    doc.body.appendChild(modal);

    parts.close.addEventListener('click', function () { closeModal(true); });
    parts.go.addEventListener('click', function () {
      var s = current;
      closeModal(false);
      if (s) run(s);
    });
    // 바깥(어두운 배경)을 누르면 닫는다
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) closeModal(true); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeModal(true); return; }
      if (e.key !== 'Tab') return;
      // 초점이 팝업 밖으로 나가지 않게 두 버튼 사이에서 돈다
      var first = parts.close, last = parts.go, a = doc.activeElement;
      if (e.shiftKey && (a === first || !modal.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !modal.contains(a))) { e.preventDefault(); first.focus(); }
    });
  }

  function fillTable(s) {
    var wrap = parts.tableWrap;
    wrap.textContent = '';
    var cols = colNames(s);
    var t = el('table', 'st-table');
    var cap = el('caption', 'st-cap', '측정값 미리 보기');
    t.appendChild(cap);
    var thead = el('thead'), hr = el('tr');
    hr.appendChild(el('th', null, '#'));
    hr.appendChild(el('th', null, cols[0]));
    hr.appendChild(el('th', null, cols[1]));
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el('tbody');
    s.rows.slice(0, PREVIEW_ROWS).forEach(function (r, i) {
      var tr = el('tr');
      tr.appendChild(el('td', 'st-n', String(i + 1)));
      tr.appendChild(el('td', null, num(r[0])));
      tr.appendChild(el('td', null, num(r[1])));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    var rest = s.rows.length - PREVIEW_ROWS;
    if (rest > 0) wrap.appendChild(el('p', 'st-more', '… 외 ' + rest + '행'));
  }

  function openStory(s, card) {
    if (!modal) buildModal();
    current = s;
    lastCard = card || null;
    parts.emoji.textContent = s.emoji || '🧪';
    parts.kind.textContent = kindTag(s);
    parts.title.textContent = s.title;
    parts.scene.textContent = s.scene || '';
    parts.q.textContent = '';
    parts.q.appendChild(el('span', 'st-q-label', '분석 과제'));
    parts.q.appendChild(doc.createTextNode(s.question || ''));
    parts.how.textContent = '';
    parts.how.appendChild(el('b', null, '선형화'));
    parts.how.appendChild(doc.createTextNode(' ' + (s.how || '')));
    fillTable(s);
    var src = '자료: ' + (s.source || '직접 만든 연습용 데이터');
    if (s.ref) src += ' · 비교할 값: ' + s.ref.label + ' ' + num(s.ref.value) + (s.ref.unit ? ' ' + s.ref.unit : '') + ' — ' + s.ref.source;
    parts.src.textContent = src;
    modal.hidden = false;
    // 카드를 누른 직후에만 등장 효과(줄인 동작 설정이면 CSS에서 끈다)
    modal.classList.remove('st-in');
    void modal.offsetWidth;
    modal.classList.add('st-in');
    // 초점을 주되 팝업 안쪽이 버튼 쪽으로 밀려 내려가지 않게(휴대폰에서 제목이 가려지던 문제)
    try { parts.go.focus({ preventScroll: true }); } catch (err) { parts.go.focus(); }
    if (modal.firstChild) modal.firstChild.scrollTop = 0;
  }

  function closeModal(restoreFocus) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.classList.remove('st-in');
    if (lastCard && lastCard.focus) {
      // 계산하러 갈 때는 화면이 카드 쪽으로 되돌아가지 않게 한다
      if (restoreFocus) lastCard.focus();
      else { try { lastCard.focus({ preventScroll: true }); } catch (err) { /* 오래된 브라우저: 초점 이동 생략 */ } }
    }
  }

  // ---------- 앱 구동: 사용자가 하듯이 화면 요소만 건드린다 ----------
  function run(s) {
    var kindSel = $('kind'), paste = $('paste'), calc = $('btn-calc');
    if (!kindSel || !paste || !calc) return;
    driving = true;
    try {
      var clear = $('btn-clear');
      if (clear) clear.click();                    // 앞의 행 · 결과 · 체험 상태를 비운다
      kindSel.value = s.kind;
      fire(kindSel, 'change');
      if (usesTemp(s)) {
        var r = doc.querySelector('input[name="tempUnit"][value="' + (s.tempUnit === 'K' ? 'K' : 'C') + '"]');
        if (r) { r.checked = true; fire(r, 'change'); }
      }
      paste.value = s.rows.map(function (r) { return num(r[0]) + '\t' + num(r[1]); }).join('\n');
      fire(paste, 'change');                       // app.js가 붙여 넣기 칸의 change에서 표를 채운다
      var unk = $('unk-in');                       // 검량선: 미지 시료 흡광도(계산 전에 넣어 재생 효과를 끊지 않는다)
      if (unk) unk.value = s.unknownA != null ? num(s.unknownA) : '';
      calc.click();                                // 재생 효과가 있는 계산 + 결과로 이동
      var refIn = $('ref-in'), refWrap = $('ref-wrap');
      if (s.ref && refIn && refWrap && !refWrap.hidden) {
        refIn.value = num(s.ref.value);
        fire(refIn, 'input');                      // 문헌값 비교 줄이 나타난다
      }
      showNote(s);
      markCard(s.id);
    } finally {
      driving = false;
    }
  }

  function markCard(id) {
    var cards = doc.querySelectorAll('#stories .st-card');
    for (var i = 0; i < cards.length; i++) {
      var on = id != null && cards[i].dataset.story === id;
      cards[i].classList.toggle('is-on', on);
      if (on) cards[i].setAttribute('aria-current', 'true'); else cards[i].removeAttribute('aria-current');
    }
  }

  // ---------- 결과 카드 위의 이야기 한 줄 ----------
  function showNote(s) {
    var card = $('result-card');
    if (!card || card.hidden) { removeNote(); return; }
    var n = $('story-note');
    if (!n) {
      n = el('p', 'st-note');
      n.id = 'story-note';
      var h = card.querySelector('h2');
      if (h) card.insertBefore(n, h.nextSibling); else card.insertBefore(n, card.firstChild);
    }
    n.textContent = '';
    var e = el('span', 'st-note-emoji', s.emoji || '🧪');
    e.setAttribute('aria-hidden', 'true');
    n.appendChild(e);
    n.appendChild(el('b', 'st-note-title', s.title));
    n.appendChild(doc.createTextNode(' 사례의 측정값입니다. '));
    n.appendChild(el('span', 'st-note-q', s.question || ''));
  }
  function removeNote() {
    var n = $('story-note');
    if (n && n.parentNode) n.parentNode.removeChild(n);
    markCard(null);
  }
  // 사용자가 직접 지우거나, 종류를 바꾸거나, 다른 데이터를 넣으면 이야기 표시를 뗀다
  function watchManualChanges() {
    function drop() { if (!driving) removeNote(); }
    ['btn-clear', 'btn-sample', 'btn-big', 'btn-demo'].forEach(function (id) {
      var b = $(id);
      if (b) b.addEventListener('click', drop);
    });
    var k = $('kind');
    if (k) k.addEventListener('change', drop);
    var p = $('paste');
    if (p) { p.addEventListener('paste', drop); p.addEventListener('change', drop); }
  }

  function init() {
    buildGallery();
    watchManualChanges();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
