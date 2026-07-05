/* ============================================================
   NNEZ2427 — interactions
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover:none) and (pointer:coarse)').matches;

  /* ---------- Smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Uptime counter (server opened 2026-01-01, CST) ---------- */
  const OPEN_DATE = new Date('2026-01-01T00:00:00+08:00').getTime();
  const ucD = document.getElementById('ucDays');
  const ucH = document.getElementById('ucHours');
  const ucM = document.getElementById('ucMins');
  const ucS = document.getElementById('ucSecs');
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
  function tickUptime() {
    let diff = Math.max(0, Date.now() - OPEN_DATE);
    const days = Math.floor(diff / 86400000); diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000); diff -= mins * 60000;
    const secs = Math.floor(diff / 1000);
    if (ucD) ucD.textContent = days;
    if (ucH) ucH.textContent = pad2(hours);
    if (ucM) ucM.textContent = pad2(mins);
    if (ucS) ucS.textContent = pad2(secs);
  }
  tickUptime();
  setInterval(tickUptime, 1000);

  /* ---------- Loader ---------- */
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => loader && loader.classList.add('hidden'), 600);
  });

  /* ---------- Custom cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (dot && ring && !isTouch) {
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll('a,button,.feature,.slide,.about-card,.rule-item,.join-card,.hero-reveal').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  }

  /* ---------- Scroll progress + nav state ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('nav');
  // Footer year auto-update (local time)
  var fy = document.getElementById('footerYear');
  if (fy) fy.textContent = new Date().getFullYear();
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (progress) progress.style.width = p + '%';
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Liquid Glass — nav edge highlight follows mouse ---------- */
  if (nav && !isTouch && !reduceMotion) {
    document.addEventListener('mousemove', (e) => {
      const r = nav.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 180;
      const dx = (e.clientX - cx) / r.width * 100;
      const pos = 30 + Math.abs(dx) * 0.4;
      nav.style.setProperty('--gl-angle', angle + 'deg');
      nav.style.setProperty('--gl-pos', pos + '%');
    }, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  /* ---------- Hero B&W -> color brush reveal ---------- */
  const heroReveal = document.getElementById('heroReveal');
  const heroColor = heroReveal ? heroReveal.querySelector('.hero-color') : null;
  const heroHint = document.getElementById('heroHint');
  // Listen on the full hero-stage so the brush keeps working even when the
  // cursor passes over the side text / badge (they have pointer-events:none).
  const heroStage = document.querySelector('.hero-stage');

  if (heroReveal && heroColor && heroStage) {
    // A fully transparent mask hides the color layer entirely (no mask = visible).
    const HIDDEN_MASK = 'linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0))';

    // Generous brush radius — scales with hero size, covers a large soft area.
    function brushRadius() {
      const r = heroReveal.getBoundingClientRect();
      return Math.max(280, Math.min(620, Math.min(r.width, r.height) * 0.62));
    }

    // Smooth brush: position tracks the cursor instantly (responsive),
    // while the radius lerps toward its target for a soft grow / shrink.
    let curX = 0, curY = 0, curR = 0, tgtR = 0, rafId = null;

    function applyMask() {
      const r = Math.max(0, curR);
      if (r < 0.5) {
        heroColor.style.webkitMaskImage = heroColor.style.maskImage = HIDDEN_MASK;
        heroColor.style.webkitMaskComposite = '';
        heroColor.style.maskComposite = '';
        return;
      }
      heroColor.style.webkitMaskImage =
        heroColor.style.maskImage =
        `radial-gradient(circle ${r}px at ${curX}px ${curY}px, #000 0%, rgba(0,0,0,.92) 32%, rgba(0,0,0,.55) 58%, rgba(0,0,0,.18) 78%, rgba(0,0,0,0) 100%)`;
      heroColor.style.webkitMaskComposite = '';
      heroColor.style.maskComposite = '';
    }
    function loop() {
      // grow fast (responsive), shrink a touch slower (elegant fade)
      const f = tgtR > curR ? 0.35 : 0.18;
      curR += (tgtR - curR) * f;
      if (Math.abs(tgtR - curR) < 0.4) curR = tgtR;
      applyMask();
      if (curR !== tgtR) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = null;
      }
    }
    function ensureLoop() { if (!rafId) rafId = requestAnimationFrame(loop); }
    function fadeOut() { tgtR = 0; ensureLoop(); }
    function pointAt(clientX, clientY) {
      // The color image fills .hero-reveal with no transform, so the
      // container's box == the image's box → cursor maps 1:1, zero offset.
      const r = heroReveal.getBoundingClientRect();
      curX = clientX - r.left;
      curY = clientY - r.top;
    }

    if (!isTouch) {
      // Desktop: brush follows the cursor 1:1 across the whole hero image.
      heroStage.addEventListener('mousemove', (e) => {
        pointAt(e.clientX, e.clientY);
        tgtR = brushRadius();
        applyMask();   // instant position repaint
        ensureLoop();  // smoothly grow radius if needed
        if (heroHint) heroHint.classList.add('gone');
      });
      heroStage.addEventListener('mouseenter', () => {
        if (heroHint) heroHint.classList.add('gone');
      });
      heroStage.addEventListener('mouseleave', fadeOut);
    } else {
      // Touch: paint under the finger, then fade out on release.
      let painting = false;
      heroStage.addEventListener('touchstart', (e) => {
        painting = true;
        const t = e.touches[0];
        pointAt(t.clientX, t.clientY);
        tgtR = brushRadius(); applyMask(); ensureLoop();
        if (heroHint) heroHint.classList.add('gone');
      }, { passive: true });
      heroStage.addEventListener('touchmove', (e) => {
        if (!painting) return;
        const t = e.touches[0];
        pointAt(t.clientX, t.clientY);
        tgtR = brushRadius(); applyMask(); ensureLoop();
      }, { passive: true });
      heroStage.addEventListener('touchend', () => {
        painting = false;
        fadeOut();
      });

      // Auto demo sweep on load so touch users see the effect without interaction
      if (!reduceMotion) {
        setTimeout(() => {
          const r = heroReveal.getBoundingClientRect();
          const w = r.width, h = r.height;
          let p = 0;
          tgtR = brushRadius();
          const sweep = setInterval(() => {
            p += 0.03;
            if (p >= 1) { clearInterval(sweep); fadeOut(); return; }
            curX = w * 0.2 + (w * 0.6) * p;
            curY = h * 0.5;
            applyMask(); ensureLoop();
          }, 30);
        }, 1400);
      }
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        if (en.target.classList.contains('stat') || en.target.classList.contains('skillshow')) {
          animateCounters(en.target);
        }
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal, .stat, .skillshow, .feature').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  function animateCounters(scope) {
    const nums = scope.querySelectorAll('[data-count]');
    nums.forEach(n => {
      if (n.dataset.done) return;
      n.dataset.done = '1';
      const target = parseInt(n.dataset.count, 10) || 0;
      if (reduceMotion) { n.textContent = target; return; }
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        n.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const bar = scope.querySelector('.skill-bar i');
    if (bar) bar.style.width = '100%';
  }

  /* ---------- Gallery slider ---------- */
  const track = document.getElementById('sliderTrack');
  const slider = document.getElementById('slider');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsWrap = document.getElementById('sliderDots');

  if (track && slider) {
    const slides = Array.from(track.children);
    let index = 0;
    let perView = 3;
    let autoTimer = null;

    function calcPerView() {
      if (window.innerWidth <= 760) perView = 1;
      else if (window.innerWidth <= 1024) perView = 2;
      else perView = 3;
    }
    function maxIndex() { return Math.max(0, slides.length - perView); }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (let i = 0; i <= maxIndex(); i++) {
        const b = document.createElement('button');
        b.setAttribute('aria-label', '第 ' + (i + 1) + ' 组');
        if (i === index) b.classList.add('active');
        b.addEventListener('click', () => { index = i; update(); restartAuto(); });
        dotsWrap.appendChild(b);
      }
    }

    function update() {
      if (index > maxIndex()) index = maxIndex();
      if (index < 0) index = 0;
      const slideW = slides[0].getBoundingClientRect().width + 22; // gap
      track.style.transform = `translateX(${-index * slideW}px)`;
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
      }
    }

    function next() { index = index >= maxIndex() ? 0 : index + 1; update(); }
    function prev() { index = index <= 0 ? maxIndex() : index - 1; update(); }

    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAuto(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAuto(); });

    function startAuto() {
      if (reduceMotion || isTouch) return;
      autoTimer = setInterval(next, 5000);
    }
    function restartAuto() { clearInterval(autoTimer); startAuto(); }

    /* ---- Touch / drag swipe ---- */
    let startX = 0, startY = 0, dragging = false, dragDelta = 0;

    const onDown = (x, y) => { startX = x; startY = y; dragging = true; dragDelta = 0; track.classList.add('dragging'); clearInterval(autoTimer); };
    const onMove = (x, y) => {
      if (!dragging) return;
      dragDelta = x - startX;
      const dy = Math.abs(y - startY);
      if (dy > Math.abs(dragDelta) && isTouch) { return; } // vertical scroll on touch
      const slideW = slides[0].getBoundingClientRect().width + 22;
      track.style.transform = `translateX(${-index * slideW + dragDelta}px)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      const slideW = slides[0].getBoundingClientRect().width + 22;
      if (Math.abs(dragDelta) > slideW * 0.2) {
        if (dragDelta < 0) next(); else prev();
      } else {
        update();
      }
      startAuto();
    };

    // Mouse drag (desktop)
    slider.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);
    slider.addEventListener('mouseleave', () => { if (dragging) onUp(); });

    // Touch swipe
    slider.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    slider.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    slider.addEventListener('touchend', onUp);

    // Prevent image drag ghost
    slider.querySelectorAll('img').forEach(img => img.addEventListener('dragstart', e => e.preventDefault()));

    // Resize
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { calcPerView(); buildDots(); update(); }, 150);
    });

    calcPerView();
    buildDots();
    update();
    startAuto();
  }

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = '已复制';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
    });
  });

  /* ---------- Parallax hero word + stage ---------- */
  const heroWord = document.querySelector('.hero-bg-word');
  // heroStage already declared above (brush section)
  if (!reduceMotion && heroWord) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroWord.style.transform = `translate(-50%, calc(-46% + ${y * 0.25}px))`;
        if (heroStage) heroStage.style.transform = `translateY(${y * 0.12}px)`;
      }
    }, { passive: true });
  }

  /* ---------- Smooth anchor scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(el, { offset: -60 });
      } else {
        const top = el.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  });

})();
