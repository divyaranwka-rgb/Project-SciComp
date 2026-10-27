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
    var ctx = canvas.getContext('2d');
    var X0 = -10, X1 = 10, Y0 = -2.4, Y1 = 2.4; // x range narrows on small screens (see draw)
    var shown = Number(slider.value), from = shown, target = shown, animStart = 0;

    var fact = [1];
    for (var i = 1; i <= 25; i++) fact[i] = fact[i - 1] * i;
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

    function formula(m) {
      var out = 'sin x ≈ x';
      for (var k = 1; k < m; k++) {
        var p = 2 * k + 1;
        out += (k % 2 ? ' − ' : ' + ') + 'x' + toSup(p) + '/' + p + '!';
      }
      return out;
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
      var span = w < 500 ? 7 : 10;  // zoom in on phones so the curves aren't cramped
      X0 = -span; X1 = span;
      var padB = 22;
      var sx = function (x) { return (x - X0) / (X1 - X0) * w; };
      var sy = function (y) { return (Y1 - y) / (Y1 - Y0) * (h - padB); };
      var grid = css('--plot-grid') || css('--border'), soft = css('--text-soft'), accent = css('--accent');

      // grid at multiples of pi and at integer y
      ctx.lineWidth = 1; ctx.strokeStyle = grid; ctx.fillStyle = soft;
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (var k = -3; k <= 3; k++) {
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
});
