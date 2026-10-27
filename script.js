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
});
