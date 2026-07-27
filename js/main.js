/* ==========================================================================
   Lumia International Spa — shared site script
   --------------------------------------------------------------------------
   One file, loaded on every page. Each page-specific block guards itself on
   an element that only exists on that page, so this file is safe to include
   everywhere without checking which page it's on from the outside.
   GSAP + ScrollTrigger are loaded via <script> tags before this file (see the
   HTML), so they're already available here — no polling needed.
   ========================================================================== */
(function () {
  'use strict';

  function run() {
    gsap.registerPlugin(ScrollTrigger);

    // initHomePage runs first: its hero-gate pin inserts ~130vh of pinSpacing
    // into the document. Creating any other ScrollTrigger (like the letter
    // reveals in initCommon) beforehand leaves it measuring the page before
    // that space exists, so it locks in stale start/end positions that never
    // fire correctly afterward.
    initHomePage();
    initCommon();
    initAboutPage();
    initServicesPage();
    initAppointmentPage();

    ScrollTrigger.refresh();
    // Fonts and images settle after first paint and can shift section heights,
    // which moves every scroll-trigger position — re-measure once things
    // have stopped moving.
    const settle = () => ScrollTrigger.refresh();
    requestAnimationFrame(() => requestAnimationFrame(settle));
    window.addEventListener('load', settle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Common: present on every page
  // ────────────────────────────────────────────────────────────────────────
  function initCommon() {
    const qa = (s) => Array.from(document.querySelectorAll(s));

    // ── Footer email links ──
    // The phone and WhatsApp links need no help: `tel:` opens the dialer with
    // the number filled in, and wa.me opens the WhatsApp app or WhatsApp Web,
    // both correct on their own. Mail is the exception — on a phone `mailto:`
    // opens the mail app, but on a desktop with no mail client registered the
    // click silently does nothing. So desktop clicks go to Gmail's web compose
    // instead (the spa's address is a Gmail one); touch devices keep `mailto:`.
    const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!isTouchDevice) {
      qa('.mail-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const to = link.getAttribute('href').replace(/^mailto:/, '');
          const compose = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to);
          window.open(compose, '_blank', 'noopener');
        });
      });
    }

    // ── Instagram icon: app on mobile, new tab on desktop ──
    // The profile link already opens a new tab correctly on desktop via
    // target="_blank" — nothing to change there. On a touch device, opening
    // that same web URL in a browser tab first often lands on Instagram's
    // web view instead of handing off to the installed app, so the click is
    // routed through Instagram's own URL scheme instead, falling back to the
    // web profile only if the app isn't installed (page still visible after
    // the fallback delay).
    if (isTouchDevice) {
      qa('.instagram-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const webUrl = link.getAttribute('href');
          const username = webUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
          const fallback = setTimeout(() => {
            if (!document.hidden) window.location.href = webUrl;
          }, 1200);
          window.addEventListener('pagehide', () => clearTimeout(fallback), { once: true });
          window.location.href = 'instagram://user?username=' + encodeURIComponent(username);
        });
      });
    }

    // ── Progressive colour reveal on scroll ──
    //
    // Per element:
    //   data-reveal          -> split per character (headings, short eyebrows)
    //   data-reveal="words"  -> split per word (body copy: a long paragraph
    //                           would otherwise need hundreds of spans and
    //                           hundreds of tween targets for a difference
    //                           nobody can see once it's scrubbed)
    //
    // Grouping: a block of copy must read as ONE continuous sweep, from the
    // first letter of its eyebrow to the last full stop of its final
    // paragraph. Giving every element its own ScrollTrigger made the eyebrow,
    // the heading and each paragraph all start colouring at the same moment,
    // independently. So elements are collected into runs, and each run gets a
    // single tween + a single ScrollTrigger keyed to the run's container:
    //   * data-reveal-group="name" -> forces those elements into one run no
    //     matter how deeply they sit (used where items are nested in wrappers)
    //   * otherwise elements are grouped by their shared parent element
    //   * <h1> always stays on its own — hero headings need their own range
    const splitEl = (el, out) => {
      if (el.dataset.split === '1') return;
      // Splitting replaces the element's contents wholesale, which would throw
      // away any nested markup (<br>, <em>, an icon <span>, a link). Only ever
      // split elements whose content is plain text.
      if (el.children.length) return;
      el.dataset.split = '1';

      const startC = el.dataset.start || '#dac3a7';
      const finalC = el.dataset.final || '#302310';
      const byWord = el.dataset.reveal === 'words';
      const txt = el.textContent;
      el.textContent = '';

      // Keep whitespace as its own un-animated node so words can wrap normally.
      const pieces = byWord ? txt.split(/(\s+)/) : Array.from(txt);
      for (const piece of pieces) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) { el.appendChild(document.createTextNode(piece)); continue; }
        const s = document.createElement('span');
        s.textContent = piece;
        s.style.color = startC;
        // Each span carries its own destination colour, so one tween can drive
        // a whole run whose eyebrow, heading and body copy all land on
        // different colours.
        s.dataset.fc = finalC;
        if (piece === ' ') s.style.whiteSpace = 'pre';
        el.appendChild(s);
        out.push(s);
      }
    };

    // Nearest element that contains every member of the run.
    const commonAncestor = (els) => {
      let a = els[0];
      for (let i = 1; i < els.length; i++) {
        while (a && !a.contains(els[i])) a = a.parentElement;
      }
      return a || document.body;
    };

    const runs = [];                 // { els: [], trigger: el, hero: bool }
    const byParent = new Map();
    const byName = new Map();
    qa('[data-reveal]').forEach((el) => {
      if (el.tagName === 'H1') { runs.push({ els: [el], trigger: el, hero: true }); return; }
      const name = el.dataset.revealGroup;
      if (name) {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(el);
        return;
      }
      const p = el.parentElement || document.body;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(el);
    });
    byName.forEach((els) => runs.push({ els, trigger: commonAncestor(els), hero: false }));
    byParent.forEach((els, parent) => runs.push({ els, trigger: parent, hero: false }));

    runs.forEach((run) => {
      const spans = [];
      run.els.forEach((el) => splitEl(el, spans));
      if (!spans.length) return;
      gsap.to(spans, {
        color: (i, t) => t.dataset.fc,
        ease: 'none',
        stagger: { each: 0.4, from: 'start' },
        scrollTrigger: {
          trigger: run.trigger,
          start: run.hero ? 'top 92%' : 'top 85%',
          // "center center" = fully coloured by the time the block's midpoint
          // reaches the middle of the screen, so a section is never still
          // filling in once you're past half of it.
          end: run.hero ? 'top 45%' : 'center center',
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      });
    });

    // Generic parallax for any element carrying data-parallax="<amount>"
    qa('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 10;
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Section scroll reveals
    qa('.reveal-up').forEach((sec) => {
      gsap.fromTo(sec, { opacity: 0, y: 48 }, {
        opacity: 1, y: 0, duration: 1.2, ease: 'power2.out',
        scrollTrigger: { trigger: sec, start: 'top 85%', toggleActions: 'play none none none' },
      });
    });

    // Nav shadow on scroll
    const nav = document.getElementById('lumiaNav');
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.style.boxShadow = window.scrollY > 80 ? '0 10px 30px -15px rgba(71,56,36,.25)' : 'none';
      });
    }

    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navPanel = document.getElementById('navMobilePanel');
    if (navToggle && navPanel) {
      const setOpen = (open) => {
        navPanel.classList.toggle('open', open);
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        const icon = navToggle.querySelector('.ms');
        if (icon) icon.textContent = open ? 'close' : 'menu';
      };
      navToggle.addEventListener('click', () => setOpen(!navPanel.classList.contains('open')));
      navPanel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Home (index.html) — guarded on the hero gate panels
  // ────────────────────────────────────────────────────────────────────────
  function initHomePage() {
    const gateL = document.getElementById('gateL');
    const gateR = document.getElementById('gateR');
    if (!gateL || !gateR) return;
    const qa = (s) => Array.from(document.querySelectorAll(s));

    // Hero gate opening (pinned scroll). Built with a high refreshPriority:
    // its pinSpacing inserts ~130vh into the document, so every trigger below
    // it must measure the page only after this one has laid the spacer out.
    gsap.set('#heroTitle', { scale: 1.06 });
    const gateTl = gsap.timeline({
      scrollTrigger: { trigger: '#top', start: 'top top', end: '+=130%', scrub: 0.6, pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: 10 },
    });
    gateTl
      .to('.gate-only', { opacity: 0, y: -12, ease: 'power2.out' }, 0.05)
      .to('#gateSeam', { opacity: 0, ease: 'power2.out' }, 0.05)
      .to('#gateL', { xPercent: -100, ease: 'power3.inOut' }, 0)
      .to('#gateR', { xPercent: 100, ease: 'power3.inOut' }, 0)
      .to('#heroTitle', { scale: 1, ease: 'power3.inOut' }, 0);

    // Mouse-follow parallax on floating hero cards (no-op on touch devices —
    // mousemove simply never fires, and the cards are hidden on narrow
    // viewports via CSS anyway).
    const hero = document.getElementById('top');
    const floats = qa('.hero-float');
    if (hero && floats.length) {
      const setters = floats.map((f) => ({
        x: gsap.quickTo(f, 'x', { duration: 0.9, ease: 'power3.out' }),
        y: gsap.quickTo(f, 'y', { duration: 0.9, ease: 'power3.out' }),
        depth: parseFloat(f.dataset.depth) || 10,
      }));
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        setters.forEach((s) => { s.x(nx * s.depth); s.y(ny * s.depth); });
      });
      hero.addEventListener('mouseleave', () => { setters.forEach((s) => { s.x(0); s.y(0); }); });
    }

    // Bento stagger
    const bento = qa('.stagger-item');
    if (bento.length) {
      gsap.from(bento, {
        opacity: 0, y: 44, stagger: 0.18, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: '#rituals', start: 'top 72%' },
      });
    }

    // Number count-up
    qa('.stat-num').forEach((el) => {
      const target = parseFloat(el.dataset.target) || 0;
      const suffix = el.dataset.suffix || '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2.2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-US') + suffix; },
      });
    });
    const statCards = qa('.stat-card');
    if (statCards.length) {
      gsap.from(statCards, {
        opacity: 0, y: 40, stagger: 0.15, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: statCards[0], start: 'top 88%' },
      });
    }

    // Testimonials stream vertically upward past the pinned heading — this
    // two-lane parallax only makes sense side-by-side on a wide viewport, so
    // it's confined to widths above the mobile nav breakpoint; below that,
    // CSS stacks both lanes as ordinary static content instead.
    const testi = document.getElementById('testi');
    if (testi) {
      ScrollTrigger.matchMedia({
        '(min-width: 881px)': function () {
          qa('.testi-lane').forEach((lane) => {
            const vh = window.innerHeight;
            const h = lane.offsetHeight;
            const startY = vh * (parseFloat(lane.dataset.start) || 1);
            const endY = -(h + vh * 0.15);
            gsap.fromTo(lane, { y: startY }, {
              y: endY, ease: 'none',
              scrollTrigger: { trigger: testi, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
            });
          });
        },
      });
    }

    // Gallery drifts on a pure CSS marquee — no JS wiring needed.
  }

  // ────────────────────────────────────────────────────────────────────────
  // About (about.html) — guarded on the cinematic hero
  // ────────────────────────────────────────────────────────────────────────
  function initAboutPage() {
    const aboutBg = document.getElementById('aboutBg');
    if (!aboutBg || !document.getElementById('aboutHero')) return;
    gsap.to(aboutBg, {
      yPercent: 14, ease: 'none',
      scrollTrigger: { trigger: '#aboutHero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Services (services.html) — guarded on the coverflow carousel track
  // ────────────────────────────────────────────────────────────────────────
  function initServicesPage() {
    const track = document.getElementById('menuCaro');
    if (!track) return;
    const originals = Array.from(track.querySelectorAll('.mslide'));
    if (!originals.length) return;
    const dotsWrap = document.getElementById('menuDots');
    const N = originals.length;

    const SLIDE_MIN = 300;
    const SLIDE_MAX = 380;
    const HOLD = 2400;          // ms each card stays centred before advancing
    const RESUME_AFTER = 6000;  // ms of stillness before autoplay resumes
    const SETTLE_MS = 140;      // quiet period that means "scrolling has stopped"

    // True infinite loop: duplicate the whole set before and after the real
    // slides. Autoplay only ever drifts through the middle (real) copy; the
    // moment the centred card is a clone, the track is snapped back by
    // exactly one set width with no animation. Because the clone is
    // pixel-identical to its real counterpart, that snap is invisible.
    const frag = document.createDocumentFragment();
    const cloneSet = () => originals.map((s) => {
      const c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a').forEach((a) => { a.tabIndex = -1; });
      return c;
    });
    cloneSet().forEach((c) => frag.appendChild(c));
    originals.forEach((s) => frag.appendChild(s));
    cloneSet().forEach((c) => frag.appendChild(c));
    track.innerHTML = '';
    track.appendChild(frag);
    const slides = Array.from(track.querySelectorAll('.mslide'));

    // `target` is the slide autoplay INTENDS to have centred. It is deliberately
    // kept separate from whichever slide currently happens to be nearest the
    // centre: during a smooth scroll the nearest slide sweeps through several
    // values, and advancing from that moving figure made autoplay skip cards or
    // stall. Only goTo() and the settle handler ever write to it.
    let idle = null, timer = null, raf = null, settleTimer = null;
    let target = N, groupShift = 0;

    const layout = () => {
      const w = Math.max(SLIDE_MIN, Math.min(SLIDE_MAX, track.clientWidth - 48));
      track.style.setProperty('--mslide-w', w + 'px');
      const pad = Math.max(0, (track.clientWidth - w) / 2);
      track.style.paddingLeft = pad + 'px';
      track.style.paddingRight = pad + 'px';
      groupShift = (slides[N] && slides[0]) ? slides[N].offsetLeft - slides[0].offsetLeft : 0;
    };

    // Index of whichever slide currently sits nearest the centre of the track.
    const centreIndex = () => {
      const centre = track.scrollLeft + track.clientWidth / 2;
      let best = target, bestDist = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centre);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    };

    // Purely visual: scale/fade each card by its distance from the centre and
    // mark the centre one. Never touches `target` or scrollLeft, so it is safe
    // to run on every frame of an in-flight smooth scroll.
    const paint = () => {
      raf = null;
      const centre = track.scrollLeft + track.clientWidth / 2;
      const w = slides[0].offsetWidth || 1;
      const best = centreIndex();
      slides.forEach((s, i) => {
        const sc = s.offsetLeft + s.offsetWidth / 2;
        const t = Math.min(1, Math.abs(sc - centre) / (w * 1.5));
        const card = s.firstElementChild;
        card.style.setProperty('--s', (1 - 0.16 * t).toFixed(3));
        card.style.setProperty('--o', (1 - 0.45 * t).toFixed(3));
        s.classList.toggle('is-centre', i === best);
      });
      if (dotsWrap) {
        const logical = ((best % N) + N) % N;
        Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('on', i === logical));
      }
    };

    const schedulePaint = () => { if (raf == null) raf = requestAnimationFrame(paint); };

    const goTo = (i, smooth) => {
      // Safety clamp back into the tripled array, mapped into the middle copy.
      // Normally onSettled keeps `target` within [N, 2N-1] so i never exceeds
      // 2N, but if scroll events are ever missed the index would otherwise
      // march past the last slide, hit undefined and silently kill autoplay.
      if (i < 0 || i >= slides.length) i = N + (((i - N) % N) + N) % N;
      const s = slides[i];
      if (!s) return;
      target = i;
      track.scrollTo({
        left: s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2,
        behavior: smooth === false ? 'auto' : 'smooth',
      });
    };

    // Runs once scrolling has actually stopped. Doing the group shift here
    // rather than mid-scroll is what keeps the wrap invisible: rewriting
    // scrollLeft while a smooth scroll is still animating fights that
    // animation and shows up as a stutter at the loop boundary.
    const onSettled = () => {
      settleTimer = null;
      const c = centreIndex();
      if (groupShift && (c < N || c >= 2 * N)) {
        const forward = c < N;
        track.scrollLeft += forward ? groupShift : -groupShift;
        target = forward ? c + N : c - N;
        paint();
      } else {
        target = c;
      }
    };

    const onScroll = () => {
      schedulePaint();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(onSettled, SETTLE_MS);
    };

    const play = () => { stop(); timer = setInterval(() => goTo(target + 1), HOLD); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const pause = () => { stop(); if (idle) clearTimeout(idle); idle = setTimeout(play, RESUME_AFTER); };

    if (dotsWrap) {
      originals.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'mdot';
        b.type = 'button';
        b.setAttribute('aria-label', 'Show ' + (s.dataset.service || 'treatment ' + (i + 1)));
        b.addEventListener('click', () => { goTo(N + i); pause(); });
        dotsWrap.appendChild(b);
      });
    }

    track.addEventListener('scroll', onScroll, { passive: true });
    ['mouseenter', 'pointerdown', 'touchstart', 'wheel', 'keydown'].forEach((ev) =>
      track.addEventListener(ev, pause, { passive: true }));
    track.addEventListener('mouseleave', pause, { passive: true });
    window.addEventListener('resize', () => { layout(); goTo(target, false); schedulePaint(); });

    if (window.IntersectionObserver) {
      new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) play(); else stop(); });
      }, { threshold: 0.35 }).observe(track);
    } else { play(); }

    layout();
    goTo(N, false);
    paint();
    window.addEventListener('load', () => { layout(); goTo(target, false); schedulePaint(); });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Appointment (appointment.html) — guarded on the booking wizard section
  // ────────────────────────────────────────────────────────────────────────
  // This is the ONLY place the spa's WhatsApp number appears — change it here
  // and the whole booking handoff follows.
  const WHATSAPP_NUMBER = '919019663937';

  function initAppointmentPage() {
    const bookSection = document.getElementById('book');
    if (!bookSection) return;

    // Hero background parallax
    const heroBg = document.getElementById('heroBg');
    if (heroBg) {
      gsap.to(heroBg, {
        yPercent: 14, ease: 'none',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true },
      });
    }

    const q = (s) => document.querySelector(s);
    const qa = (s) => Array.from(document.querySelectorAll(s));
    const data = { service: '', date: '', time: '', name: '', phone: '', email: '', notes: '' };
    let step = 1;
    // Three steps: Service -> Date & time -> Your details. The last step's
    // button is "Request appointment", which hands straight off to WhatsApp;
    // there's no separate review screen because the pre-filled WhatsApp
    // message itself is the review.
    const maxStep = 3;

    // Service pagination (4 per page)
    let svcPage = 1; const svcPages = 2;
    const renderSvc = () => {
      qa('.svc-card').forEach((c) => { c.style.display = String(c.dataset.page) === String(svcPage) ? 'flex' : 'none'; });
      const lbl = q('#svcPage'); if (lbl) lbl.textContent = svcPage + ' / ' + svcPages;
      const pv = q('#svcPrev'), nx = q('#svcNext');
      if (pv) pv.style.opacity = svcPage === 1 ? '.4' : '1';
      if (nx) nx.style.opacity = svcPage === svcPages ? '.4' : '1';
    };
    const sPrev = q('#svcPrev'), sNext = q('#svcNext');
    if (sPrev) sPrev.addEventListener('click', () => { if (svcPage > 1) { svcPage--; renderSvc(); } });
    if (sNext) sNext.addEventListener('click', () => { if (svcPage < svcPages) { svcPage++; renderSvc(); } });
    renderSvc();

    // Inline calendar (open by default)
    const cal = q('#cal');
    const view = new Date(); view.setDate(1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const renderCal = () => {
      if (!cal) return;
      const y = view.getFullYear(), m = view.getMonth();
      const firstDow = new Date(y, m, 1).getDay();
      const nDays = new Date(y, m + 1, 0).getDate();
      const canPrev = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
      let h = '';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">';
      h += '<button data-cprev style="background:#f3e6db;border:none;width:36px;height:36px;border-radius:9999px;cursor:' + (canPrev ? 'pointer' : 'default') + ';color:' + (canPrev ? '#302310' : '#cabfb0') + ';display:flex;align-items:center;justify-content:center;"><span class="ms">chevron_left</span></button>';
      h += '<div style="font-size:16px;font-weight:500;color:#302310;">' + monthNames[m] + ' ' + y + '</div>';
      h += '<button data-cnext style="background:#f3e6db;border:none;width:36px;height:36px;border-radius:9999px;cursor:pointer;color:#302310;display:flex;align-items:center;justify-content:center;"><span class="ms">chevron_right</span></button>';
      h += '</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;">';
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => { h += '<div style="text-align:center;font-size:11px;font-weight:500;letter-spacing:.06em;color:#a99e90;padding:6px 0;">' + d + '</div>'; });
      h += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
      for (let i = 0; i < firstDow; i++) h += '<div></div>';
      for (let d = 1; d <= nDays; d++) {
        const cur = new Date(y, m, d);
        const iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const past = cur < today;
        const isSel = data.date === iso;
        const isToday = cur.getTime() === today.getTime();
        let st = 'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:14px;border-radius:9999px;transition:background-color .25s ease,color .25s ease;';
        if (past) st += 'color:#cabfb0;cursor:default;';
        else if (isSel) st += 'background:#473824;color:#fff;cursor:pointer;font-weight:500;';
        else { st += 'color:#302310;cursor:pointer;'; if (isToday) st += 'border:1px solid #b7a187;'; }
        h += '<div data-day="' + (past ? '' : iso) + '" style="' + st + '">' + d + '</div>';
      }
      h += '</div>';
      cal.innerHTML = h;
      const pv = cal.querySelector('[data-cprev]'), nx = cal.querySelector('[data-cnext]');
      if (pv && canPrev) pv.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCal(); });
      if (nx) nx.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCal(); });
      cal.querySelectorAll('[data-day]').forEach((cell) => {
        if (!cell.dataset.day) return;
        cell.addEventListener('click', () => { data.date = cell.dataset.day; renderCal(); });
        cell.addEventListener('mouseenter', () => { if (data.date !== cell.dataset.day) cell.style.background = '#f3e6db'; });
        cell.addEventListener('mouseleave', () => { if (data.date !== cell.dataset.day) cell.style.background = 'transparent'; });
      });
    };
    renderCal();

    const panels = qa('[data-step]');
    const showPanel = (name) => panels.forEach((p) => { p.style.display = String(p.dataset.step) === String(name) ? 'block' : 'none'; });

    const updateProgress = () => {
      qa('.pstep').forEach((ps) => {
        const n = parseFloat(ps.dataset.dot);
        const num = ps.querySelector('.pnum');
        const lbl = ps.querySelector('.plbl');
        const done = n < step, active = n === step;
        if (active) { num.style.background = '#473824'; num.style.color = '#fff'; num.textContent = n; lbl.style.color = '#302310'; }
        else if (done) { num.style.background = '#473824'; num.style.color = '#fff'; num.innerHTML = '<span class="ms" style="font-size:20px">check</span>'; lbl.style.color = '#302310'; }
        else { num.style.background = '#e6d8ca'; num.style.color = '#9a8b78'; num.textContent = n; lbl.style.color = '#9a8b78'; }
      });
      qa('.pbar').forEach((bar) => {
        const n = parseFloat(bar.dataset.bar);
        bar.querySelector('.pbarfill').style.width = n < step ? '100%' : '0';
      });
    };

    const opts = qa('.opt');
    opts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const group = opt.dataset.service ? 'service' : 'time';
        opts.forEach((o) => { if ((o.dataset.service && group === 'service') || (o.dataset.time && group === 'time')) o.classList.remove('sel'); });
        opt.classList.add('sel');
        if (group === 'service') data.service = opt.dataset.service;
        else data.time = opt.dataset.time;
      });
    });

    const btnNext = q('#btnNext');
    const btnBack = q('#btnBack');
    const wizNav = q('#wizNav');

    const validate = () => {
      if (step === 1 && !data.service) { alert('Please choose a treatment.'); return false; }
      if (step === 2) {
        if (!data.date) { alert('Please pick a date.'); return false; }
        if (!data.time) { alert('Please choose a time slot.'); return false; }
      }
      if (step === 3) {
        data.name = (q('#fName').value || '').trim();
        data.phone = (q('#fPhone').value || '').trim();
        data.email = (q('#fEmail').value || '').trim();
        data.notes = (q('#fNotes').value || '').trim();
        if (!data.name || !data.phone) { alert('Please add your name and phone.'); return false; }
      }
      return true;
    };

    const render = () => {
      showPanel(step);
      updateProgress();
      btnBack.style.visibility = step > 1 ? 'visible' : 'hidden';
      btnNext.innerHTML = step === maxStep ? 'Request appointment <span class="ms" style="font-size:18px">check</span>' : 'Continue <span class="ms" style="font-size:18px">arrow_forward</span>';
    };

    // The message the guest finds already typed in WhatsApp — they only hit
    // send. Email and notes are optional, so their lines drop out when blank.
    const buildMessage = () => {
      const fmtDate = data.date
        ? new Date(data.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      const lines = [
        'Hello Lumia International Spa, I would like to request an appointment.',
        '',
        'Treatment: ' + data.service,
        'Date: ' + fmtDate,
        'Time: ' + data.time,
        'Name: ' + data.name,
        'Phone: ' + data.phone,
      ];
      if (data.email) lines.push('Email: ' + data.email);
      if (data.notes) lines.push('Notes: ' + data.notes);
      lines.push('', 'Please confirm this slot. Thank you.');
      return lines.join('\n');
    };

    const whatsappUrl = () => 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildMessage());

    btnNext.addEventListener('click', () => {
      if (!validate()) return;
      if (step === maxStep) {
        const url = whatsappUrl();
        // Show the confirmation first, with the same link as a fallback, so a
        // guest who lands back on this tab (or whose redirect is blocked)
        // still has a way through to the chat.
        const fallback = q('#waFallback');
        if (fallback) fallback.href = url;
        showPanel('done');
        wizNav.style.display = 'none';
        qa('.pstep .pnum').forEach((num) => { num.style.background = '#473824'; num.style.color = '#fff'; });
        window.location.href = url;
        return;
      }
      step += 1;
      render();
    });
    btnBack.addEventListener('click', () => { if (step > 1) { step -= 1; render(); } });

    render();

    // Deep link from the Services page: ?service=<name> preselects that
    // treatment and drops the guest straight on Date & time.
    const wanted = new URLSearchParams(window.location.search).get('service');
    if (wanted) {
      const card = qa('.svc-card').find((c) => c.dataset.service === wanted);
      if (card) {
        data.service = card.dataset.service;
        qa('.svc-card').forEach((c) => c.classList.remove('sel'));
        card.classList.add('sel');
        svcPage = parseFloat(card.dataset.page) || 1;
        renderSvc();
        step = 2;
        render();
        requestAnimationFrame(() => bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }
})();
