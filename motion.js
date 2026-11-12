(function () {
  'use strict';

  var FAVOURITE_TRACK = {
    title: 'Whiskey Roll - GBX & Outforce Remix',
    artist: 'Cammy Barnes, GBX, Outforce',
    url: 'https://open.spotify.com/track/6jcSzPfu5nhvcovTjdb3eu'
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function reveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduced) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  function unfold() {
    var stack = document.querySelector('.hero__stack');
    if (!stack || reduced) return;
    if (window.matchMedia('(max-width: 40em)').matches) return;

    var MAX = 15;
    var ticking = false;

    function apply() {
      ticking = false;
      var rect = stack.getBoundingClientRect();
      var start = window.innerHeight * 0.95;
      var end = window.innerHeight * 0.28;
      var p = (start - rect.top) / (start - end);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var eased = 1 - Math.pow(1 - p, 3);
      stack.style.setProperty('--unfold', (MAX * (1 - eased)).toFixed(2) + 'deg');
      stack.style.setProperty('--unfold-scale', (0.965 + 0.035 * eased).toFixed(4));
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  function spotlight() {
    if (!fine) return;
    document.querySelectorAll('.work-card, .skill, .glance, .stop__card, .form, .card, .contact').forEach(function (el) {
      el.classList.add('spotlight');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  function tilt() {
    if (!fine || reduced) return;
    var MAX = 2.5;
    document.querySelectorAll('.work-card:not(.work-card--off)').forEach(function (card) {
      var raf = null, nx = 0, ny = 0;

      function paint() {
        raf = null;
        card.style.setProperty('--rx', (-ny * MAX).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (nx * MAX).toFixed(2) + 'deg');
      }

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        nx = (e.clientX - r.left) / r.width - 0.5;
        ny = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(paint);
      });

      card.addEventListener('pointerleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  function telemetry() {
    var el = document.getElementById('siteHud');
    if (!el) return;
    if (window.matchMedia('(max-width: 40em)').matches) return;
    if (store('tomas.hud') === 'off') return;

    var SEGMENTS = 20;
    var IDLE_MS = 3500;

    var out = {
      scroll: el.querySelector('[data-hud="scroll"]'),
      fps: el.querySelector('[data-hud="fps"]'),
      session: el.querySelector('[data-hud="session"]'),
      viewport: el.querySelector('[data-hud="viewport"]')
    };

    var barHost = el.querySelector('[data-hud="bar"]');
    var segs = [];
    for (var i = 0; i < SEGMENTS; i++) {
      var seg = document.createElement('span');
      seg.className = 'hud__seg';
      barHost.appendChild(seg);
      segs.push(seg);
    }

    var began = Date.now();
    var running = false;
    var frames = 0;
    var mark = 0;
    var idleTimer = null;
    var scrollTicking = false;
    var lastLit = -1;

    function depth() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return 100;
      var p = (window.pageYOffset || doc.scrollTop) / max * 100;
      return p < 0 ? 0 : p > 100 ? 100 : p;
    }

    function paintScroll() {
      scrollTicking = false;
      var p = depth();
      out.scroll.textContent = Math.round(p);
      var lit = Math.round(p / 100 * SEGMENTS);
      if (lit === lastLit) return;
      lastLit = lit;
      for (var i = 0; i < SEGMENTS; i++) segs[i].classList.toggle('is-lit', i < lit);
    }

    function paintSession() {
      var s = Math.floor((Date.now() - began) / 1000);
      var m = Math.floor(s / 60);
      out.session.textContent = m + ':' + String(s % 60).padStart(2, '0');
    }

    function paintViewport() {
      out.viewport.textContent = window.innerWidth + '×' + window.innerHeight;
    }

    function loop(now) {
      if (!running) return;
      frames++;
      if (now - mark >= 500) {
        out.fps.textContent = Math.round(frames * 1000 / (now - mark));
        frames = 0;
        mark = now;
        paintSession();
      }
      requestAnimationFrame(loop);
    }

    function sleep() {
      if (playerOpen && playerOpen()) return;
      running = false;
      el.classList.add('is-idle');
    }

    function wake() {
      el.classList.remove('is-idle');
      if (!running && !document.hidden) {
        running = true;
        frames = 0;
        mark = performance.now();
        requestAnimationFrame(loop);
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(sleep, IDLE_MS);
    }

    function onScroll() {
      if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(paintScroll); }
      wake();
    }

    el.querySelector('[data-hud-close]').addEventListener('click', function () {
      sleep();
      clearTimeout(idleTimer);
      store('tomas.hud', 'off');
      setTimeout(function () { el.hidden = true; }, 500);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) sleep(); else wake();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('resize', function () { paintViewport(); paintScroll(); wake(); }, { passive: true });

    paintViewport();
    paintScroll();
    paintSession();

    var playerOpen = favourite();

    setTimeout(function () { el.hidden = false; wake(); }, 900);
  }

  function favourite() {
    var el = document.querySelector('[data-hud="now"]');
    var panel = document.querySelector('[data-hud="player"]');
    if (!el || !panel) return function () { return false; };

    var track = FAVOURITE_TRACK || {};
    if (!track.title) return function () { return false; };

    el.querySelector('[data-hud="now-title"]').textContent = track.title;
    el.querySelector('[data-hud="now-artist"]').textContent = track.artist || '';

    var full = track.title + (track.artist ? ' by ' + track.artist : '');
    el.setAttribute('aria-label', 'On repeat: ' + full + '. Play it here.');
    el.setAttribute('title', 'On repeat: ' + full);
    el.hidden = false;

    var id = null;
    var match = /\/track\/([A-Za-z0-9]+)/.exec(track.url || '');
    if (match) id = match[1];

    if (!id) {
      el.setAttribute('aria-expanded', 'false');
      el.removeAttribute('aria-controls');
      el.disabled = true;
      return function () { return false; };
    }

    var open = false;
    var built = false;

    function build() {
      if (built) return;
      built = true;
      var frame = document.createElement('iframe');
      frame.src = 'https://open.spotify.com/embed/track/' + id + '?theme=0';
      frame.width = '100%';
      frame.height = '80';
      frame.loading = 'lazy';
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('title', 'Spotify player: ' + full);
      frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
      panel.appendChild(frame);

      var out = document.createElement('a');
      out.className = 'hud__out';
      out.href = track.url;
      out.target = '_blank';
      out.rel = 'noopener noreferrer';
      out.textContent = 'Open in Spotify';
      panel.appendChild(out);
    }

    function toggle() {
      open = !open;
      el.setAttribute('aria-expanded', String(open));
      el.setAttribute('aria-label', open
        ? 'Hide the player for ' + full
        : 'On repeat: ' + full + '. Play it here.');
      el.setAttribute('title', open ? 'Hide player' : 'On repeat: ' + full);
      if (open) {
        build();
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    }

    el.addEventListener('click', toggle);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { toggle(); el.focus(); }
    });

    return function () { return open; };
  }

  function lane() {
    var track = document.querySelector('.route__track');
    if (!track) return;
    var ticking = false;

    function apply() {
      ticking = false;
      var r = track.getBoundingClientRect();
      var p = (window.innerHeight * 0.6 - r.top) / r.height;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      track.style.setProperty('--lane', p.toFixed(4));
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  function calm() {
    if (!reduced) return;
    document.querySelectorAll('svg').forEach(function (svg) {
      if (svg.pauseAnimations) svg.pauseAnimations();
    });
  }

  function stars() {
    var base = document.querySelector('.stars');
    if (!base || !base.getContext) return;
    var tints = ['241,245,255', '241,245,255', '241,245,255', '62,240,182', '56,198,255', '143,125,255'];
    var layers = [base];
    ['stars--a', 'stars--b'].forEach(function (name) {
      var extra = document.createElement('canvas');
      extra.className = 'stars ' + name;
      extra.setAttribute('aria-hidden', 'true');
      base.parentNode.insertBefore(extra, base.nextSibling);
      layers.push(extra);
    });
    var drawnW = 0, drawnH = 0, timer = null;

    function paint() {
      var w = window.innerWidth, h = window.innerHeight;
      if (Math.abs(w - drawnW) < 80 && Math.abs(h - drawnH) < 160) return;
      drawnW = w; drawnH = h;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var total = Math.round(Math.min(170, (w * h) / 9500));
      layers.forEach(function (canvas, n) {
        var ctx = canvas.getContext('2d');
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var count = Math.round(total * (n === 0 ? 0.4 : 0.3));
        for (var i = 0; i < count; i++) {
          var alpha = n === 0 ? Math.random() * 0.35 + 0.2 : Math.random() * 0.5 + 0.4;
          ctx.fillStyle = 'rgba(' + tints[(Math.random() * tints.length) | 0] + ',' + alpha.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2 + 0.3, 0, 6.2832);
          ctx.fill();
        }
      });
    }

    paint();
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(paint, 250);
    }, { passive: true });
  }

  var resting = false;
  var restHooks = [];

  function convoy() {
    var svgs = [];
    document.querySelectorAll('svg').forEach(function (svg) {
      if (svg.querySelector('animateMotion') && svg.pauseAnimations) svgs.push(svg);
    });
    if (!svgs.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      if (reduced) svgs.forEach(function (svg) { svg.pauseAnimations(); });
      return;
    }
    var visible = [];
    function sync() {
      svgs.forEach(function (svg) {
        if (visible.indexOf(svg) !== -1 && !resting && !document.hidden) svg.unpauseAnimations();
        else svg.pauseAnimations();
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = visible.indexOf(e.target);
        if (e.isIntersecting && i === -1) visible.push(e.target);
        if (!e.isIntersecting && i !== -1) visible.splice(i, 1);
      });
      sync();
    }, { rootMargin: '80px' });
    svgs.forEach(function (svg) { svg.pauseAnimations(); io.observe(svg); });
    restHooks.push(sync);
    document.addEventListener('visibilitychange', sync);
  }

  function rest() {
    if (reduced) return;
    var REST_MS = 20000;
    var root = document.documentElement;
    var timer = null;

    function set(state) {
      if (resting === state) return;
      resting = state;
      root.classList.toggle('is-resting', state);
      restHooks.forEach(function (fn) { fn(); });
    }
    function active() {
      set(false);
      clearTimeout(timer);
      timer = setTimeout(function () { set(true); }, REST_MS);
    }

    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (name) {
      window.addEventListener(name, active, { passive: true });
    });
    window.addEventListener('scroll', active, { passive: true });
    active();
  }

  function roles() {
    var host = document.querySelector('[data-roles]');
    if (!host || reduced) return;
    var list = host.getAttribute('data-roles').split('|');
    var i = list.length - 1;
    setInterval(function () {
      if (document.hidden || resting) return;
      var current = host.querySelector('span:not(.is-leaving)');
      i = (i + 1) % list.length;
      var next = document.createElement('span');
      next.className = 'is-entering';
      next.textContent = list[i];
      host.appendChild(next);
      void next.offsetWidth;
      next.className = '';
      if (current) {
        current.classList.add('is-leaving');
        setTimeout(function () { current.remove(); }, 700);
      }
    }, 2800);
  }

  function spy() {
    var links = document.querySelectorAll('.nav-links > a[href^="#"]:not(.btn)');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var hit = map[e.target.id];
        if (hit) hit.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
    var top = document.querySelector('.hero');
    if (top) io.observe(top);
  }

  function filters() {
    var buttons = document.querySelectorAll('[data-filter]');
    var cards = document.querySelectorAll('.work-card');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-filter');
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        cards.forEach(function (card) {
          card.hidden = want !== 'all' && card.getAttribute('data-cat') !== want;
          if (!card.hidden) card.classList.add('is-in');
        });
      });
    });
  }

  function copy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () {
          var label = btn.getAttribute('aria-label');
          btn.classList.add('is-done');
          btn.setAttribute('aria-label', 'Copied');
          setTimeout(function () { btn.classList.remove('is-done'); btn.setAttribute('aria-label', label); }, 1600);
        });
      });
    });
  }

  function mail() {
    var form = document.querySelector('form[data-mailto]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var subject = form.elements.subject.value.trim() || 'Hello from your portfolio';
      var body = form.elements.message.value.trim() + (name ? '\n\n' + name : '');
      window.location.href = 'mailto:' + form.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  function start() { reveal(); unfold(); spotlight(); tilt(); telemetry(); lane(); calm(); stars(); roles(); spy(); filters(); copy(); mail(); convoy(); rest(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
