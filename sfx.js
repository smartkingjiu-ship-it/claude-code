/* sfx.js — 효과음. 소리 파일 없이 Web Audio API로 그 자리에서 만든다(외부 자원 · 저장 없음).
 * window.LinLab.sfx:
 *   point(i, n)          i번째(0부터) 점이 찍힐 때. 왼쪽 아래 → 오른쪽 위로 갈수록 음이 올라가고 소리도 왼쪽 → 오른쪽으로 옮겨 간다.
 *                        점이 아주 많아도(1000개) 알아서 간격을 두어 "두두두두"로 들린다. 얼마든지 자주 불러도 된다.
 *   finish(outliers)     회귀선이 자리 잡았을 때. 맑은 화음 + 이상치가 있으면 낮은 "툭"(최대 5번).
 *   click()              버튼 누름. error() 잘못된 입력. setMuted(bool) / isMuted().
 * 모든 함수는 소리를 낼 수 없는 상황(첫 사용자 동작 전, 꺼짐, 지원 안 함)에서 아무 일도 하지 않고, 예외를 던지지 않는다. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, muted = false, lastPoint = 0, lastClick = 0, lastFinish = -10;

  // 첫 사용자 동작(브라우저 정책) 뒤에만 소리 장치를 연다
  function ensure() {
    if (!AC || muted) return null;
    try {
      if (!ctx) {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();   // 여러 소리가 겹쳐도 찢어지지 않게
        comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
        master = ctx.createGain(); master.gain.value = 0.55;
        master.connect(comp); comp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx.state === 'closed' ? null : ctx;
    } catch (e) { return null; }
  }

  // 한 음: 파형 · 주파수 · 시작 시각 · 길이 · 크기 · 좌우 위치(−1 ~ 1) · 끝 주파수(미끄러짐)
  function tone(type, freq, t0, dur, peak, pan, freqEnd) {
    var o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);          // 빠르게 올라와
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);          // 자연스럽게 사라진다
    o.connect(g);
    if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
    out.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // 낮은 "툭": 걸러 낸 잡음 + 떨어지는 낮은 음
  function thud(t0, pan) {
    var len = Math.floor(ctx.sampleRate * 0.12), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), seed = 12345;
    for (var i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) % 2147483648; d[i] = (seed / 1073741824 - 1) * (1 - i / len); }
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.5;
    src.connect(f); f.connect(g); g.connect(master); src.start(t0);
    tone('sine', 150, t0, 0.22, 0.6, pan, 62);
  }

  // 5음 음계(도 레 미 솔 라)를 세 옥타브에 걸쳐: 어떤 순서로 울려도 어울린다
  var SCALE = [0, 2, 4, 7, 9];
  function pitch(frac) {
    var steps = SCALE.length * 3, k = Math.max(0, Math.min(steps, Math.round(frac * steps)));
    var semi = 12 * Math.floor(k / SCALE.length) + SCALE[k % SCALE.length];
    return 261.63 * Math.pow(2, semi / 12);   // 가운데 도에서 시작
  }

  var sfx = {
    point: function (i, n) {
      var c = ensure(); if (!c) return;
      try {
        var now = c.currentTime;
        if (now - lastPoint < 0.034) return;   // 초당 30번쯤까지만: 점이 1000개여도 음악처럼
        lastPoint = now;
        var frac = n > 1 ? i / (n - 1) : 0, f = pitch(frac), pan = -0.7 + 1.4 * frac;
        tone('triangle', f, now, 0.16, 0.22, pan);
        tone('sine', f * 2, now, 0.09, 0.07, pan);   // 맑은 배음 살짝
      } catch (e) {}
    },
    finish: function (outliers) {
      var c = ensure(); if (!c) return;
      try {
        if (c.currentTime - lastFinish < 0.8) return;   // 두 군데에서 같이 불러도 한 번만 울린다
        lastFinish = c.currentTime;
        var t = c.currentTime + 0.02;
        [523.25, 659.25, 783.99, 1046.5, 1174.66].forEach(function (f, k) {   // 도 미 솔 도 레: 열린 느낌의 마무리
          tone('sine', f, t + k * 0.055, 1.1, 0.2, -0.4 + 0.2 * k);
          tone('triangle', f * 2, t + k * 0.055, 0.35, 0.035, -0.4 + 0.2 * k);
        });
        var m = Math.min(5, Math.max(0, Math.floor(Number(outliers) || 0)));
        for (var j = 0; j < m; j++) thud(t + 0.42 + j * 0.11, -0.5 + j * 0.25);
      } catch (e) {}
    },
    click: function () {
      var c = ensure(); if (!c) return;
      try {
        var now = c.currentTime;
        if (now - lastClick < 0.05) return;
        lastClick = now;
        tone('sine', 880, now, 0.05, 0.1, 0, 1320);
      } catch (e) {}
    },
    error: function () {
      var c = ensure(); if (!c) return;
      try { var t = c.currentTime; tone('triangle', 196, t, 0.16, 0.22, 0, 160); tone('triangle', 147, t + 0.13, 0.22, 0.22, 0, 120); } catch (e) {}
    },
    setMuted: function (v) {
      muted = !!v;
      if (muted && ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
      syncToggle();
    },
    isMuted: function () { return muted; }
  };
  window.LinLab = window.LinLab || {};
  window.LinLab.sfx = sfx;

  // ---- 스스로 연결: 버튼 누름 소리 + 소리 켜기/끄기 버튼 ----
  var toggle = null;
  function syncToggle() {
    if (!toggle) return;
    toggle.textContent = muted ? '소리 켜기' : '소리 끄기';
    toggle.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }
  function install() {
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b === toggle) { sfx.setMuted(!muted); if (!muted) sfx.click(); return; }
      sfx.click();
    });
    toggle = document.getElementById('sfx-toggle');
    if (!toggle) {   // index.html에 없으면 머리말 끝에 만든다
      toggle = document.createElement('button');
      toggle.type = 'button'; toggle.id = 'sfx-toggle'; toggle.className = 'ghost sfx-toggle';
      (document.querySelector('header.top') || document.body).appendChild(toggle);
    }
    syncToggle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
