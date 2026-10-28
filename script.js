// Mobile nav toggle + active link highlighting
 
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
 
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
 
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
      });
    });
  }
 
  // Highlight the current page in the nav
  var current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === current) {
      link.classList.add('active');
    }
  });

  // Theme picker: auto (follow device) / light / dark / high contrast.
  // The choice is saved; "auto" re-resolves whenever the device setting changes.
  var root = document.documentElement;
  var picker = document.querySelector('.theme-picker');
  if (picker) {
    var btn = picker.querySelector('.theme-toggle');
    var menu = picker.querySelector('.theme-menu');
    var items = Array.prototype.slice.call(menu.querySelectorAll('[data-theme-choice]'));
    var names = { light: 'Light', dark: 'Dark', contrast: 'High contrast' };
    var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : null; };
    var darkQ = mq('(prefers-color-scheme: dark)');
    var contrastQ = mq('(prefers-contrast: more)');

    function savedChoice() {
      var c = 'auto';
      try { c = localStorage.getItem('theme') || 'auto'; } catch (e) {}
      return names[c] ? c : 'auto';
    }

    function resolve(choice) {
      if (names[choice]) return choice;
      if (contrastQ && contrastQ.matches) return 'contrast';
      return darkQ && darkQ.matches ? 'dark' : 'light';
    }

    function apply(choice) {
      var theme = resolve(choice);
      root.setAttribute('data-theme', theme);
      items.forEach(function (it) {
        it.setAttribute('aria-checked', it.getAttribute('data-theme-choice') === choice ? 'true' : 'false');
      });
      var label = 'Theme: ' + names[theme] + (choice === 'auto' ? ' (auto)' : '') + '. Change theme';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label.replace('. ', ' · '));
    }

    function openMenu(focusFirst) {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      var target = menu.querySelector('[aria-checked="true"]') || items[0];
      if (focusFirst) target.focus();
    }

    function closeMenu(returnFocus) {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus();
    }

    btn.addEventListener('click', function () {
      if (menu.hidden) openMenu(true); else closeMenu(false);
    });

    items.forEach(function (it, i) {
      it.addEventListener('click', function () {
        var choice = it.getAttribute('data-theme-choice');
        try {
          if (choice === 'auto') localStorage.removeItem('theme');
          else localStorage.setItem('theme', choice);
        } catch (e) {}
        apply(choice);
        closeMenu(true);
      });
      it.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
        if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu(true);
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !picker.contains(e.target)) closeMenu(false);
    });
    // keep the hamburger menu and the theme menu from being open at the same time
    if (toggle) toggle.addEventListener('click', function () { closeMenu(false); });
    btn.addEventListener('click', function () { if (links) links.classList.remove('open'); });

    function onDeviceChange() { if (savedChoice() === 'auto') apply('auto'); }
    [darkQ, contrastQ].forEach(function (q) {
      if (q && q.addEventListener) q.addEventListener('change', onDeviceChange);
    });

    apply(savedChoice());
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Home: typing effect for "I'm into ..." (plain word swaps if the visitor prefers reduced motion)
  var rot = document.querySelector('.rotator-word');
  if (rot) {
    var words = rot.getAttribute('data-words').split('|');
    var wi = 0, ci = words[0].length, deleting = true;
    if (reduceMotion) {
      setInterval(function () { wi = (wi + 1) % words.length; rot.textContent = words[wi]; }, 2800);
    } else {
      var tick = function () {
        var w = words[wi];
        if (deleting) {
          ci--;
          if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; }
        } else {
          ci++;
        }
        rot.textContent = words[wi].slice(0, Math.max(ci, 0));
        var delay = deleting ? 45 : 85;
        if (!deleting && ci >= words[wi].length) { deleting = true; delay = 1700; }
        if (deleting && ci === 0) delay = 300;
        setTimeout(tick, delay);
      };
      setTimeout(tick, 2200);
    }
  }

  // Home: Taylor series playground for sin x
  var canvas = document.getElementById('taylor-canvas');
  if (canvas && canvas.getContext) {
    var slider = document.getElementById('taylor-terms');
    var countEl = document.getElementById('taylor-count');
    var degEl = document.getElementById('taylor-degree');
    var formulaEl = document.getElementById('taylor-formula');
    var rangeEl = document.getElementById('taylor-range');
    var ctx = canvas.getContext('2d');
    var X0 = -10, X1 = 10, Y0 = -2.4, Y1 = 2.4; // x range narrows on small screens (see draw)
    var shown = Number(slider.value), from = shown, target = shown, animStart = 0;

    var fact = [1];
    for (var i = 1; i <= 45; i++) fact[i] = fact[i - 1] * i;
    var sup = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    function toSup(n) { return String(n).split('').map(function (d) { return sup[d]; }).join(''); }

    // Taylor polynomial of sin with m nonzero terms; fractional m blends between neighbours
    function taylor(x, m) {
      var lo = Math.floor(m), frac = m - lo, sum = 0, k, term;
      for (k = 0; k < lo; k++) {
        sum += (k % 2 ? -1 : 1) * Math.pow(x, 2 * k + 1) / fact[2 * k + 1];
      }
      if (frac > 0) {
        term = (lo % 2 ? -1 : 1) * Math.pow(x, 2 * lo + 1) / fact[2 * lo + 1];
        sum += frac * term;
      }
      return sum;
    }

    function termText(k) {
      var p = 2 * k + 1;
      return (k % 2 ? ' − ' : ' + ') + 'x' + toSup(p) + '/' + p + '!';
    }

    // written out in full up to 6 terms; after that, first three terms … last term
    function formula(m) {
      var out = 'sin x ≈ x', k;
      if (m <= 6) {
        for (k = 1; k < m; k++) out += termText(k);
      } else {
        for (k = 1; k < 3; k++) out += termText(k);
        out += ' ± …' + termText(m - 1);
      }
      return out;
    }

    // how far out the polynomial stays within 0.01 of sin x
    function closeMatch(m) {
      for (var x = 0; x < 40; x += 0.005) {
        if (Math.abs(taylor(x, m) - Math.sin(x)) > 0.01) return x;
      }
      return 40;
    }

    function css(name) {
      return getComputedStyle(canvas).getPropertyValue(name).trim();
    }

    function draw(m) {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // -5π..5π on wider screens, -3π..3π on phones so the curves aren't cramped
      var span = (w < 500 ? 3.25 : 5.25) * Math.PI;
      X0 = -span; X1 = span;
      var padB = 22;
      var sx = function (x) { return (x - X0) / (X1 - X0) * w; };
      var sy = function (y) { return (Y1 - y) / (Y1 - Y0) * (h - padB); };
      var grid = css('--plot-grid') || css('--border'), soft = css('--text-soft'), accent = css('--accent');

      // grid at multiples of pi and at integer y
      ctx.lineWidth = 1; ctx.strokeStyle = grid; ctx.fillStyle = soft;
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (var k = -5; k <= 5; k++) {
        if (Math.abs(k * Math.PI) > span) continue;
        var gx = sx(k * Math.PI);
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h - padB); ctx.stroke();
        var lbl = k === 0 ? '0' : (k === 1 ? 'π' : k === -1 ? '−π' : (k < 0 ? '−' : '') + Math.abs(k) + 'π');
        ctx.fillText(lbl, gx, h - 6);
      }
      for (var gy = -2; gy <= 2; gy++) {
        ctx.beginPath(); ctx.moveTo(0, sy(gy)); ctx.lineTo(w, sy(gy)); ctx.stroke();
      }
      ctx.strokeStyle = soft; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(w, sy(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx(0), 0); ctx.lineTo(sx(0), h - padB); ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w, h - padB); ctx.clip();
      // sin x, dashed
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = soft;
      ctx.beginPath();
      for (var px = 0; px <= w; px++) {
        var x = X0 + px / w * (X1 - X0), y = sy(Math.sin(x));
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
      // Taylor polynomial
      ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = accent; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (px = 0; px <= w; px++) {
        x = X0 + px / w * (X1 - X0);
        y = sy(Math.max(-50, Math.min(50, taylor(x, m))));
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function updateText(m) {
      countEl.textContent = m;
      degEl.textContent = '(degree ' + (2 * m - 1) + ')';
      formulaEl.textContent = formula(m);
      rangeEl.textContent = 'Matches sin x to within 0.01 for |x| < ' + (closeMatch(m) / Math.PI).toFixed(1) + 'π';
    }

    function animate(now) {
      var t = Math.min(1, (now - animStart) / 350);
      var e = 1 - Math.pow(1 - t, 3);
      shown = from + (target - from) * e;
      draw(shown);
      if (t < 1) requestAnimationFrame(animate);
    }

    slider.addEventListener('input', function () {
      target = Number(slider.value);
      updateText(target);
      if (reduceMotion) { shown = target; draw(shown); return; }
      from = shown; animStart = performance.now();
      requestAnimationFrame(animate);
    });

    window.addEventListener('resize', function () { draw(shown); });
    new MutationObserver(function () { draw(shown); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    updateText(target);
    draw(shown);
  }

  // Contact: message builder -> opens the visitor's email app with a prefilled message
  var compose = document.getElementById('compose');
  if (compose) {
    var EMAIL = 'divyaranwka@gmail.com';
    var msg = compose.querySelector('textarea[name="message"]');
    compose.querySelectorAll('input[name="topic"]').forEach(function (r) {
      r.addEventListener('change', function () { msg.placeholder = r.getAttribute('data-placeholder'); });
    });

    compose.addEventListener('submit', function (e) {
      e.preventDefault();
      var topicEl = compose.querySelector('input[name="topic"]:checked');
      var topic = topicEl ? topicEl.value : 'Hello';
      var name = compose.querySelector('input[name="name"]').value.trim();
      var text = msg.value.trim();
      var subject = topic + (name ? ' (from ' + name + ')' : '');
      var body = text + (name ? (text ? '\n\n' : '') + '— ' + name : '');
      var link = document.createElement('a');
      link.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) +
        (body ? '&body=' + encodeURIComponent(body) : '');
      link.click();
    });

    var copyBtn = document.getElementById('copy-email');
    var status = compose.querySelector('.copy-status');
    var statusTimer;
    function showStatus(t) {
      status.textContent = t;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () { status.textContent = ''; }, 2500);
    }
    function fallbackCopy() {
      var tmp = document.createElement('textarea');
      tmp.value = EMAIL; tmp.setAttribute('readonly', ''); tmp.style.position = 'fixed'; tmp.style.opacity = '0';
      document.body.appendChild(tmp); tmp.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(tmp);
      showStatus(ok ? 'Copied! ✓' : EMAIL);
    }
    copyBtn.addEventListener('click', function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(EMAIL).then(function () { showStatus('Copied! ✓'); }, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  // Background simulations: pendulum phase-portrait flow + parametric curve tracer
  (function () {
    var flow = document.querySelector('.bd-flow');
    var curveCv = document.querySelector('.bd-curve');
    if (!flow || !curveCv || !flow.getContext) return;
    var backdrop = flow.parentElement;
    var fctx = flow.getContext('2d'), cctx = curveCv.getContext('2d');
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 0, H = 0, dpr = 1, n = 3, thetaMin = 0, thetaSpan = 1, W_MIN = -2.6, W_SPAN = 5.2;
    var parts = [], TRAIL = 30, raf = 0, last = 0, accent = '#7c3aed', link = '#ec4899', soft = '#666';
    var TWO_PI = Math.PI * 2;

    function readColours() {
      var cs = getComputedStyle(document.documentElement);
      accent = cs.getPropertyValue('--sim-stroke').trim() || cs.getPropertyValue('--accent').trim() || accent;
      link = cs.getPropertyValue('--curve-stroke').trim() || cs.getPropertyValue('--link').trim() || link;
      soft = cs.getPropertyValue('--text-soft').trim() || soft;
    }

    function visible() { return getComputedStyle(backdrop).display !== 'none'; }

    // phase plane: x -> theta (angle), y -> omega (angular velocity)
    function toTheta(x) { return thetaMin + x / W * thetaSpan; }
    function toOmega(y) { return W_MIN + (1 - y / H) * W_SPAN; }
    function toX(t) { return (t - thetaMin) / thetaSpan * W; }
    function toY(w) { return (1 - (w - W_MIN) / W_SPAN) * H; }

    function spawn(p) {
      p.x = Math.random() * W; p.y = Math.random() * H;
      p.life = 300 + Math.random() * 500; p.hist = [];
      return p;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      [flow, curveCv].forEach(function (c) {
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      n = Math.max(1, Math.min(4, Math.round(W / 480)));          // number of pendulum "eyes" across
      thetaSpan = n * TWO_PI;
      thetaMin = -n * Math.PI + (n % 2 === 0 ? Math.PI : 0);      // keep an eye centred
      var count = Math.round(Math.min(320, W * H / (W < 700 ? 9000 : 5200)));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(spawn({}));
    }

    // one midpoint (RK2) step of theta' = omega, omega' = -sin(theta), in pixel space
    function step(p, dt) {
      var t = toTheta(p.x), w = toOmega(p.y);
      var tm = t + 0.5 * dt * w, wm = w - 0.5 * dt * Math.sin(t);
      t += dt * wm; w -= dt * Math.sin(tm);
      var nx = toX(t), ny = toY(w);
      if (nx < 0 || nx > W) { nx = ((nx % W) + W) % W; p.hist = []; }   // theta is periodic
      p.x = nx; p.y = ny;
    }

    function drawFlow(dt) {
      fctx.clearRect(0, 0, W, H);
      fctx.strokeStyle = accent; fctx.lineWidth = 0.9; fctx.globalAlpha = 0.5; fctx.lineCap = 'round'; fctx.lineJoin = 'round';
      fctx.beginPath();
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        step(p, dt);
        p.hist.push(p.x, p.y);
        if (p.hist.length > TRAIL * 2) p.hist.splice(0, 2);
        if (--p.life <= 0 || p.y < -20 || p.y > H + 20) { spawn(p); continue; }
        var h = p.hist;
        if (h.length < 4) continue;
        fctx.moveTo(h[0], h[1]);
        for (var k = 2; k < h.length; k += 2) fctx.lineTo(h[k], h[k + 1]);
      }
      fctx.stroke();
      fctx.globalAlpha = 1;
    }

    function drawStillFlow() {
      fctx.clearRect(0, 0, W, H);
      fctx.strokeStyle = accent; fctx.lineWidth = 1; fctx.globalAlpha = 0.4;
      fctx.beginPath();
      var seeds = Math.round(parts.length / 3);
      for (var i = 0; i < seeds; i++) {
        var p = spawn({});
        fctx.moveTo(p.x, p.y);
        for (var k = 0; k < 90; k++) {
          var px = p.x; step(p, 0.03);
          if (Math.abs(p.x - px) > W / 2) fctx.moveTo(p.x, p.y); else fctx.lineTo(p.x, p.y);
        }
      }
      fctx.stroke(); fctx.globalAlpha = 1;
    }

    // classic parametric curves, each sampled once and normalised to the unit disc
    var CURVES = [
      { name: 'Lissajous curve (3 : 2)', T: TWO_PI, f: function (t) { return [Math.sin(3 * t + Math.PI / 2), Math.sin(2 * t)]; } },
      { name: 'Rose r = cos 4θ', T: TWO_PI, f: function (t) { var r = Math.cos(4 * t); return [r * Math.cos(t), r * Math.sin(t)]; } },
      { name: 'Hypotrochoid (R = 5, r = 3, d = 5)', T: 3 * TWO_PI, f: function (t) {
          return [2 * Math.cos(t) + 5 * Math.cos(2 * t / 3), 2 * Math.sin(t) - 5 * Math.sin(2 * t / 3)]; } },
      { name: 'Cardioid r = 1 − cos θ', T: TWO_PI, f: function (t) { var r = 1 - Math.cos(t); return [r * Math.cos(t), r * Math.sin(t)]; } },
      { name: "Fay's butterfly curve", T: 12 * TWO_PI, f: function (t) {
          var r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
          return [r * Math.sin(t), r * Math.cos(t)]; } }
    ];
    CURVES.forEach(function (c) {
      var N = c.T > 20 ? 2400 : 900, pts = [], i, q;
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (i = 0; i <= N; i++) {
        q = c.f(c.T * i / N); pts.push(q);
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
      }
      // centre on the bounding box and scale to fit the unit square
      var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, half = Math.max(x1 - x0, y1 - y0) / 2;
      c.pts = pts.map(function (q) { return [(q[0] - mx) / half, (q[1] - my) / half]; });
    });
    var ci = 0, cStart = 0, TRACE = 14000, HOLD = 4000, FADE = 1600;

    // sit the tracer in the empty right-hand margin beside the content column
    function curveBox() {
      var margin = (W - 1080) / 2;
      var R = Math.min(120, H * 0.15, (margin - 48) / 2);
      if (R < 55) return null;                        // no room: leave it out
      return { cx: W - margin / 2, cy: H - R - 80, R: R };
    }

    function drawCurve(now) {
      cctx.clearRect(0, 0, W, H);
      var box = curveBox(); if (!box) return;
      var c = CURVES[ci], el = now - cStart, frac = Math.min(1, el / TRACE), alpha = 1;
      if (el > TRACE + HOLD) alpha = Math.max(0, 1 - (el - TRACE - HOLD) / FADE);
      if (el > TRACE + HOLD + FADE) { ci = (ci + 1) % CURVES.length; cStart = now; frac = 0; alpha = 1; }
      var pts = c.pts, upto = Math.max(1, Math.floor(frac * (pts.length - 1)));
      cctx.globalAlpha = alpha;
      cctx.strokeStyle = link; cctx.lineWidth = 1.6; cctx.lineJoin = 'round';
      cctx.beginPath();
      for (var i = 0; i <= upto; i++) {
        var x = box.cx + pts[i][0] * box.R, y = box.cy - pts[i][1] * box.R;
        if (i === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y);
      }
      cctx.stroke();
      if (frac < 1) {                                  // the pen
        var pe = pts[upto];
        cctx.fillStyle = link; cctx.beginPath();
        cctx.arc(box.cx + pe[0] * box.R, box.cy - pe[1] * box.R, 3, 0, TWO_PI); cctx.fill();
      }
      cctx.globalAlpha = 1;
    }

    function drawStillCurve() {
      cctx.clearRect(0, 0, W, H);
      var box = curveBox(); if (!box) return;
      ci = 0; cStart = -TRACE; drawCurve(0);
    }

    function frame(now) {
      raf = 0;
      if (document.hidden || !visible()) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000) * 0.9;
      last = now;
      drawFlow(dt);
      drawCurve(now);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      readColours();
      if (!visible()) { fctx.clearRect(0, 0, W, H); cctx.clearRect(0, 0, W, H); return; }
      if (still) { drawStillFlow(); drawStillCurve(); return; }
      if (!raf) { last = 0; if (!cStart) cStart = performance.now(); raf = requestAnimationFrame(frame); }
    }

    resize();
    start();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { resize(); if (still) start(); }, 150);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    new MutationObserver(function () { readColours(); start(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();
});
