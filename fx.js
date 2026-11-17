/* fx.js — 시각 효과(결과 등장, 축하 색종이, 버튼 반응).
 * app.js 안쪽 함수는 쓰지 않고 화면 요소와 이벤트로만 연결한다. 움직임 줄이기 설정이면 끈다.
 * 자동 재계산은 움직이지 않는다: 버튼을 누른 뒤 1.5초 안의 결과 변화에만 효과를 준다. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var enabled = !(mq && mq.matches);
  var TRIGGERS = '#btn-calc,#btn-sample,#btn-big,#btn-demo,#story-go';
  var COPYERS = '#btn-hwp,#btn-tsv,.eq button';
  var COLORS = ['#5b5bf0', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981'];
  var WINDOW_MS = 1500;
  var lastClick = 0, storyClick = 0, revealTimer = 0, queued = false;
  var canvas = null, ctx = null, parts = [], raf = 0, doneWasHidden = true;

  function $(id) { return document.getElementById(id); }
  function closest(el, sel) {
    return el && el.closest ? el.closest(sel) : null;
  }

  /* ---------- 색종이 ---------- */
  function ensureCanvas() {
    if (canvas) return true;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx || !document.body) { canvas = null; return false; }
    document.body.appendChild(canvas);
    return true;
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; parts = [];
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null;
  }
  function tick() {
    var alive = 0, i, p, t = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var age = (t - p.born) / p.life;
      if (age >= 1) continue;
      alive++;
      p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = age < 0.7 ? 1 : (1 - age) / 0.3;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.2832); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(tick); else stop();
  }
  /* opts: { x, y (창 기준 px), count, power, life(ms), round } */
  function confetti(opts) {
    if (!enabled) return false;
    opts = opts || {};
    if (!ensureCanvas()) return false;
    var n = Math.min(opts.count || 90, 140), i, a, v;
    var x = opts.x == null ? canvas.width / 2 : opts.x;
    var y = opts.y == null ? canvas.height * 0.3 : opts.y;
    var power = opts.power || 9;
    if (parts.length > 200) parts = parts.slice(-60);
    for (i = 0; i < n; i++) {
      a = Math.random() * 6.2832; v = power * (0.35 + Math.random() * 0.65);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.45,
        g: opts.round ? 0.05 : 0.22, rot: a, vr: (Math.random() - 0.5) * 0.4,
        size: opts.round ? 3 + Math.random() * 4 : 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length], round: !!opts.round,
        born: Date.now(), life: (opts.life || 1600) * (0.7 + Math.random() * 0.3)
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
    return true;
  }

  /* ---------- 결과 등장 ---------- */
  function onResult() {
    queued = false;
    var card = $('result-card'), demo = $('btn-demo');
    if (!card || card.hidden) return;
    if (demo) demo.classList.remove('fx-pulse');           /* 첫 결과가 나오면 맥박 멈춤 */
    var t = Date.now();
    if (!enabled || t - lastClick > WINDOW_MS) return;     /* 자동 재계산이면 아무것도 안 함 */
    lastClick = 0;
    card.classList.remove('fx-reveal');
    void card.offsetWidth;
    card.classList.add('fx-reveal');
    clearTimeout(revealTimer);
    revealTimer = setTimeout(function () { card.classList.remove('fx-reveal'); }, 900);
    storyClick = 0;   // 실험 사례 계산에는 색종이를 터뜨리지 않는다(보고서 수준의 어조에 맞춤). 색종이는 30초 체험 완료 때만
  }
  function queueResult() {
    if (queued) return;
    queued = true;
    setTimeout(onResult, 0);
  }
  function onDone() {
    var done = $('done');
    if (!done) return;
    if (!done.hidden && doneWasHidden) confetti({ count: 110, power: 11, life: 1600 });
    doneWasHidden = !!done.hidden;
  }

  /* ---------- 연결 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (closest(t, TRIGGERS)) {
      lastClick = Date.now();
      storyClick = closest(t, '#story-go') ? lastClick : 0;
    }
    var c = closest(t, COPYERS);
    if (c && enabled) {
      c.classList.remove('fx-copied');
      void c.offsetWidth;
      c.classList.add('fx-copied');
      setTimeout(function () { c.classList.remove('fx-copied'); }, 700);
    }
  }, true);

  function init() {
    var card = $('result-card'), result = $('result'), done = $('done');
    var demo = $('btn-demo'), head = document.querySelector('header.top');
    if (enabled) {
      if (head && !head.querySelector('.fx-bg')) {
        var bg = document.createElement('div');
        bg.className = 'fx-bg';
        bg.setAttribute('aria-hidden', 'true');
        head.insertBefore(bg, head.firstChild);
      }
      if (demo && card && card.hidden) demo.classList.add('fx-pulse');
    }
    if (typeof MutationObserver !== 'function') return;
    if (card) new MutationObserver(queueResult).observe(card, { attributes: true, attributeFilter: ['hidden'] });
    if (result) new MutationObserver(queueResult).observe(result, { childList: true, subtree: true, characterData: true });
    if (done) {
      doneWasHidden = !!done.hidden;
      new MutationObserver(onDone).observe(done, { attributes: true, attributeFilter: ['hidden'] });
    }
  }
  if (mq) {
    var onMq = function () { enabled = !mq.matches; api.enabled = enabled; if (!enabled) stop(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
  var api = { confetti: confetti, enabled: enabled };
  window.LinLabFx = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
