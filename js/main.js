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

    // ── Floating WhatsApp button ──
    // The href is a plain wa.me link so the button still works with JS off,
    // but wa.me always lands on an interstitial page first. On a phone we hand
    // straight to the installed app and fall back to wa.me only if the scheme
    // goes unanswered (the page is still visible after the delay); on a laptop
    // we open WhatsApp Web, which is where that guest ends up anyway.
    // The number is read off the href rather than from a constant so the
    // markup stays the single source of truth.
    // .fab-act-wa is the same link inside the mobile/tablet dock below, and
    // wants exactly the same hand-off.
    const WA_GREETING = 'Hello Lumia International Spa, I would like to know more about your treatments.';
    qa('.wa-fab, .fab-act-wa').forEach((fab) => {
      fab.addEventListener('click', (e) => {
        e.preventDefault();
        const webUrl = fab.getAttribute('href');
        const number = (webUrl.match(/\d{6,}/) || [''])[0];
        const text = encodeURIComponent(WA_GREETING);
        if (isTouchDevice) {
          const fallback = setTimeout(() => {
            if (!document.hidden) window.location.href = webUrl + '?text=' + text;
          }, 1200);
          window.addEventListener('pagehide', () => clearTimeout(fallback), { once: true });
          window.location.href = 'whatsapp://send?phone=' + number + '&text=' + text;
        } else {
          window.open('https://web.whatsapp.com/send?phone=' + number + '&text=' + text, '_blank', 'noopener');
        }
      });
    });

    // ── Mobile / tablet contact dock ──
    // CSS decides whether this is on screen at all (≤1024px), so there is no
    // width check here — on a desktop the dock is display:none and the trigger
    // can never be clicked. The actions are plain links and are visible with JS
    // off; all this adds is the fold-away, which is why the closed state is set
    // from script rather than baked into the markup.
    const dock = document.querySelector('.fab-dock');
    if (dock) {
      const toggle = dock.querySelector('.fab-toggle');
      const acts = Array.from(dock.querySelectorAll('.fab-act'));
      const setOpen = (open) => {
        dock.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        // The actions stay in the DOM and keep their box while closed, so they
        // have to be taken out of the tab order by hand or a keyboard user
        // would land on two invisible links.
        acts.forEach((a) => { a.tabIndex = open ? 0 : -1; });
      };

      toggle.addEventListener('click', () => setOpen(!dock.classList.contains('is-open')));

      // Picking an action leaves the dock open behind the app switch. Both
      // targets can return the guest to this page (a cancelled call, a back
      // swipe out of WhatsApp), and finding it still expanded reads as stuck.
      acts.forEach((a) => a.addEventListener('click', () => setOpen(false)));

      // Tapping anywhere else, or Escape, folds it away — the usual escape
      // hatch for anything that opens over the page.
      document.addEventListener('click', (e) => {
        if (!dock.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !dock.classList.contains('is-open')) return;
        setOpen(false);
        toggle.focus();
      });
    }

    // ── "Book Now" in the header ──
    // The links point at appointment.html with no #book fragment, so the URL a
    // guest ends up with stays clean. On the booking page itself that would
    // mean reloading the page you are already on, so the click is intercepted
    // and turned into a scroll to the wizard — again without writing a hash.
    const bookTarget = document.getElementById('book');
    if (bookTarget) {
      qa('.book-now').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          bookTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // ── Exclusive Offers & Right-Side Exit Pop-Up with Timer ──
    initOffersAndExitPopup();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Home (index.html) — guarded on the hero keyhole plate
  // ────────────────────────────────────────────────────────────────────────
  function initHomePage() {
    if (!document.getElementById('keyholeMask')) return;

    // The floating WhatsApp badge is held back on this page until the keyhole
    // has finished opening. The hidden state is a class rather than an inline
    // style so the badge keeps its own CSS hover transform afterwards, and it
    // is added from script so a visitor without JS still gets a usable button.
    // Both the desktop badge and the mobile/tablet dock are gated — only one of
    // the two is ever on screen, so this is one list, not a branch on width.
    const gatedFabs = Array.from(document.querySelectorAll('.wa-fab, .fab-dock'));
    gatedFabs.forEach((el) => el.classList.add('wa-fab-gated'));
    const REVEAL_AT = 0.78;

    // Cut the keyhole to this viewport before anything else measures the hero.
    shapeKeyhole();

    // Re-cut on resize, debounced. The overlay it measures is fixed to the
    // viewport, so it is accurate as soon as the resize lands; ScrollTrigger's
    // refresh is hooked as well so a pin re-measure never leaves the two out of
    // step on browsers that fire resize sparsely (mobile URL-bar collapse).
    let recut;
    window.addEventListener('resize', () => {
      clearTimeout(recut);
      recut = setTimeout(shapeKeyhole, 150);
    });
    ScrollTrigger.addEventListener('refresh', shapeKeyhole);

    // prefers-reduced-motion: no pin, no scrub — just the end state. The plate
    // goes, and with it the copy that only exists to introduce the reveal, so
    // the hero settles into the artwork it was always opening onto.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      gsap.set('#heroGate', { display: 'none' });
      gatedFabs.forEach((el) => el.classList.add('is-in'));
    } else {
      buildKeyhole(gatedFabs, REVEAL_AT);
    }

    // Mouse-follow parallax, bento stagger, counters and the testimonial lanes
    // all continue below either way — only the pinned reveal is skipped.
    initHeroExtras();
  }

  // Redraws the keyhole in viewport pixels. Everything is derived from the hero
  // box, so there are no breakpoints and no second asset — one rule set covers a
  // 1920 desktop and a 390 phone.
  function shapeKeyhole() {
    const canvas = document.getElementById('keyholeMask');
    const gate = document.getElementById('heroGate');
    if (!canvas || !gate || !canvas.getContext) return;

    // Measured off the overlay, which is fixed to the viewport, and not off the
    // hero: pinning gives the hero an explicit inline width and height, so after
    // a resize it keeps reporting the size it was pinned at until ScrollTrigger
    // re-measures. The overlay has no such lag.
    const W = gate.clientWidth, H = gate.clientHeight;
    if (!W || !H) return;

    // Head. The radius comes off the geometric mean of the two dimensions, not
    // off either one alone: 0.216 of it lands on 31% of width on a 1526x781
    // laptop and 64% of width on a 390x844 phone, which is what each of those
    // needs, and no single fraction of width or of height does both. The caps
    // stop a short-and-wide window from filling itself with circle.
    const r = Math.min(0.216 * Math.sqrt(W * H), H * 0.32, W * 0.34);
    const cx = W / 2;
    // The crown clears the top of the hero, not the header: the plate now sits
    // over the nav, so the whole viewport height is the keyhole's to use. That
    // is worth roughly 85px of extra stem on a laptop over clearing the nav.
    const cy = Math.min(48, Math.max(20, H * 0.035)) + r;

    // Stem. Waist at the tangent points, half a radius off the axis, so the arc
    // is cut at 30 degrees and the head visibly overhangs. From there the sides
    // slide out — but only slightly, to a foot narrower than the head. Running
    // them out past the head turns the stem into a funnel, which reads as a V
    // stood on its point rather than as the shaft of a key.
    const neck = 0.5 * r;
    const foot = Math.min(0.9 * r, W * 0.32);
    const jy = cy + r * Math.cos(Math.asin(neck / r));
    // If the circle runs low enough that little height is left, spread the
    // flare over a nominal run instead of dividing by something near zero.
    const run = Math.max(H - jy, H * 0.15);
    const endY = H * 1.5;
    const endHalf = neck + ((foot - neck) / run) * (endY - jy);

    const n = (v) => Math.round(v * 10) / 10;
    // The plate runs well past the canvas on every side so the feather, which
    // eats inward from whatever edge it is given, never softens the frame edges
    // — those have to stay fully opaque or light leaks in around the gate.
    const plate = `M${n(-0.2 * W)} ${n(-0.2 * H)}H${n(1.2 * W)}V${n(1.6 * H)}H${n(-0.2 * W)}Z`;
    const hole =
      `M${n(cx - r)} ${n(cy)}` +
      `A${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)}` +
      `A${n(r)} ${n(r)} 0 0 1 ${n(cx + neck)} ${n(jy)}` +
      `L${n(cx + endHalf)} ${n(endY)}L${n(cx - endHalf)} ${n(endY)}` +
      `L${n(cx - neck)} ${n(jy)}` +
      `A${n(r)} ${n(r)} 0 0 1 ${n(cx - r)} ${n(cy)}Z`;

    // Paint once. Capped at 2x: past that the texture costs memory and upload
    // time for detail nobody can see in what is, at the edge, a soft gradient.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // σ ≈ 0.0053 of viewport width is the reference's own feather, measured
    // part-way through its opening where the cut edge crosses evenly-lit
    // content: a 16→84% luminance ramp of 43px at 3.23x and 47px at 3.41x.
    ctx.filter = `blur(${n(Math.max(5, W * 0.0053))}px)`;
    ctx.fillStyle = '#160f08';
    ctx.fill(new Path2D(`${plate} ${hole}`), 'evenodd');
    ctx.filter = 'none';
  }

  // The keyhole reveal itself, split out so initHomePage stays readable.
  function buildKeyhole(gatedFabs, REVEAL_AT) {
    // Hero keyhole opening (pinned scroll). Built with a high refreshPriority:
    // its pinSpacing inserts ~150vh into the document, so every trigger below
    // it must measure the page only after this one has laid the spacer out.
    gsap.set('#heroTitle', { scale: 1.06 });

    // The push-in scales about a point in the artwork's top fifth, not its
    // centre. About the centre, the logo lockup — which sits above the centre —
    // rides upward as the artwork grows, and by the time the gate is open it has
    // travelled far enough to end up tucked under the fixed header. Anchoring
    // the origin at the lockup's own height instead leaves it sitting still
    // while the rest of the frame grows around it.
    gsap.set(['#heroAmbient', '#heroBg', '#heroBlur'], { transformOrigin: '50% 18%' });

    // The artwork also starts fractionally out of focus and pulls sharp as the
    // gate opens, so what is behind the keyhole resolves at the same moment the
    // headline dissolves. 3px, not more: enough to read as "not yet in focus"
    // while the emblem behind the keyhole still holds its shape.
    //
    // It is a cross-fade between a permanently blurred copy and the sharp one,
    // not an animated blur() on a single layer. Animating the filter meant a
    // full-screen gaussian re-rasterised on every frame — 46ms of it, against a
    // 16.7ms budget. Fading a layer whose blur never changes is compositor work
    // and costs nothing. The midpoint is a blend of sharp and blurred rather
    // than a true intermediate blur, which at 3px is not a difference the eye
    // has anything to catch hold of.
    gsap.set('#heroBlur', { opacity: 1 });

    // The header starts fully transparent as well as covered. Covered alone is
    // not enough: the crown now sits above the header's own bottom edge, so the
    // top of the cut-out overlaps it, and a pale slice of the nav bar shows
    // through the keyhole against the artwork. Fading it in on the gate's curve
    // means there is nothing to show through while the hole is small, and the
    // header has arrived by the time the hole is wide enough to read it.
    gsap.set('#lumiaNav', { opacity: 0 });

    // The hero text fades as a function of how far the KEYHOLE has travelled,
    // not of raw scroll: the plate runs on an ease, so a plain ease on the text
    // would drift out of step with it. gateFade re-derives plate travel from
    // tween progress, then reads the opacity off a curve keyed to it —
    // 1.00 shut, 0.54 half-open, 0.08 at 90%, 0 exactly as the gate lands.
    const OPACITY_AT_GATE = [1, 0.95, 0.88, 0.78, 0.66, 0.54, 0.42, 0.30, 0.18, 0.08, 0];
    const gateFade = (p) => {
      // power1.inOut, the plate's own ease → fraction of the gate that is open.
      // Must stay in step with GATE_EASE below; power1 is quadratic.
      const open = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
      // linear interpolation between the 10%-apart control points above
      const i = Math.min(OPACITY_AT_GATE.length - 2, Math.floor(open * 10));
      const seg = open * 10 - i;
      const opacity = OPACITY_AT_GATE[i] + (OPACITY_AT_GATE[i + 1] - OPACITY_AT_GATE[i]) * seg;
      return 1 - opacity; // GSAP wants tween progress, and the tween ends at 0
    };

    // Positions below are scroll progress, 0 → 1 across the pinned runway:
    //   0.00 – 0.75  the opening. Plate 1 → 7, artwork 1 → 1.2.
    //   0.78         the WhatsApp badge rises in.
    // There is no hold at the head of the runway: the gate answers the first
    // notch of the wheel and takes three quarters of the runway to swing, which
    // is 112vh of scrolling — slow enough to be the whole point of the section
    // rather than something that happens while you are on your way past it.
    //
    // GATE_EASE is power1.inOut, not power2. Both start from rest, but cubic is
    // so flat off the line that the first tenth of the runway moves the plate
    // 1.3% — indistinguishable from the hold this replaced. Quadratic is moving
    // visibly by then and still eases in rather than jumping.
    //
    // For these numbers to mean scroll progress the timeline has to be exactly
    // 1 long, so an empty tween pads out the tail after the last beat.
    const GATE_EASE = 'power1.inOut';
    const OPEN = { duration: 0.75, ease: GATE_EASE };
    const gateTl = gsap.timeline({
      // scrub 1.2 is the trailing lag that makes the reveal glide on after the
      // wheel stops — the single biggest contributor to how the effect reads.
      scrollTrigger: {
        trigger: '#top', start: 'top top', end: '+=150%', scrub: 1.2,
        pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: 10,
        onUpdate: (self) => {
          gatedFabs.forEach((el) => el.classList.toggle('is-in', self.progress >= REVEAL_AT));
        },
        // The overlay is fixed, so without this it would keep compositing a
        // full-screen filtered plate for the whole of the rest of the page —
        // invisible, the gate being open, but still costing a paint. Dropped
        // once the section is behind you, restored the moment it is not.
        onLeave: () => gsap.set('#heroGate', { visibility: 'hidden' }),
        onEnterBack: () => gsap.set('#heroGate', { visibility: 'visible' }),
      },
    });
    gateTl
      // The plate outruns the artwork 30:1 in scale. That speed difference is
      // what makes the frame feel like it is opening rather than simply zooming.
      // 7 is the reference's own endpoint. The floor is ~4.4: the stem's outer
      // feather edge sits 137 units off the axis and has to clear the 600-unit
      // half-width of a width-driven viewport, or a haze survives in the corners.
      .to('#keyholeMask', { scale: 7, ...OPEN }, 0)
      .to(['#heroAmbient', '#heroBg', '#heroBlur'], { scale: 1.2, ...OPEN }, 0)
      // The blurred copy fades out on gateFade rather than on an ease of its
      // own: gateFade maps tween progress onto the headline's opacity curve, so
      // carrying the blur layer through it leaves the two exactly proportional —
      // the artwork is as sharp as the headline is faded, all the way down, and
      // both land on zero on the same frame the gate does.
      .to('#heroBlur', { opacity: 0, duration: 0.75, ease: gateFade }, 0)
      // "Scroll to enter", the spa rule and the headline share one curve and one
      // span, so they dissolve together in lockstep with the opening plate.
      .to('.gate-only', { opacity: 0, y: -12, duration: 0.75, ease: gateFade }, 0)
      // gateFade runs 0 -> 1 - opacity, so a tween of 0 -> 1 carrying it is the
      // exact mirror of the copy dissolving: the header arrives at the rate the
      // headline leaves, and the two swap over without either being missing.
      .to('#lumiaNav', { opacity: 1, duration: 0.75, ease: gateFade }, 0)
      .to('#heroTitle', { scale: 1, ...OPEN }, 0)
      .to('#heroTitle', { opacity: 0, y: -18, duration: 0.75, ease: gateFade }, 0)
      .to({}, { duration: 0.25 }, 0.75);
  }

  // Everything on the home page that is not the hero reveal.
  function initHeroExtras() {
    const qa = (s) => Array.from(document.querySelectorAll(s));

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

    // ── Time slots ──
    // A slot that has already started today cannot be booked. The check only
    // applies to the current date: every other date offers the full list.
    const slotEls = qa('.opt[data-time]');
    const slotNote = q('#slotNote');
    const noteDefault = slotNote ? slotNote.textContent : '';
    const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    // "4:00 PM" -> 960 (minutes since midnight)
    const slotMinutes = (label) => {
      const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(label || '');
      if (!m) return null;
      const h = (parseFloat(m[1]) % 12) + (/pm/i.test(m[3]) ? 12 : 0);
      return h * 60 + parseFloat(m[2]);
    };
    const refreshSlots = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isToday = data.date === isoOf(now);
      let open = 0;
      slotEls.forEach((el) => {
        const mins = slotMinutes(el.dataset.time);
        const past = isToday && mins !== null && mins <= nowMinutes;
        el.classList.toggle('is-past', past);
        el.setAttribute('aria-disabled', past ? 'true' : 'false');
        // A slot can pass while the guest is still on the page, so a selection
        // that has just expired is dropped rather than silently carried into
        // the WhatsApp message.
        if (past) {
          if (el.classList.contains('sel')) { el.classList.remove('sel'); data.time = ''; }
        } else { open += 1; }
      });
      if (slotNote) {
        slotNote.textContent = (isToday && !open)
          ? 'Today’s slots have all started — please choose another date.'
          : noteDefault;
      }
    };
    // Re-checked every minute so a slot the guest is looking at goes grey the
    // moment it starts, rather than only on the next date change.
    setInterval(refreshSlots, 60000);

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
        cell.addEventListener('click', () => { data.date = cell.dataset.day; renderCal(); refreshSlots(); });
        cell.addEventListener('mouseenter', () => { if (data.date !== cell.dataset.day) cell.style.background = '#f3e6db'; });
        cell.addEventListener('mouseleave', () => { if (data.date !== cell.dataset.day) cell.style.background = 'transparent'; });
      });
    };
    renderCal();
    refreshSlots();

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
        if (opt.classList.contains('is-past')) return;
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

  // ────────────────────────────────────────────────────────────────────────
  // Exclusive Offers & Right-Side Exit Pop-Up with Timer
  // ────────────────────────────────────────────────────────────────────────
  function initOffersAndExitPopup() {
    const CODE_UNMASKED = 'LUMIA-VIP30';
    const RECEPTION_PHONE = '+919019663937';

    // 1. Inject popup & badge markup dynamically if not present in DOM
    if (!document.getElementById('exitOfferPopup')) {
      const popupHtml = `
      <button type="button" id="exitOfferBadge" class="exit-offer-badge" aria-label="View Special Offer">
        <span class="badge-ring" aria-hidden="true"></span>
        <span class="badge-ring badge-ring-2" aria-hidden="true"></span>
        <span class="badge-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.26 0-2.3.77-2.73 1.87L12 4.63l-.27-.76A3.003 3.003 0 0 0 9 2C7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2.22l.53-1.49C13.54 4.2 14.23 4 15 4zM9 4c.77 0 1.46.2 1.69.51L11.22 6H9c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 13.83 8.62 14.5 11 8h2l2.38 6.5 1.62-.67L14.92 8H20v6z"/></svg>
        </span>
        <span class="badge-text" style="letter-spacing: .06em;">30% OFF</span>
        <span class="badge-timer timer-val-badge" style="font-size: 11px; opacity: .85; letter-spacing: .08em; font-family: monospace;">03:51:51</span>
      </button>

      <div id="exitOfferPopup" class="exit-offer-popup" role="dialog" aria-labelledby="exitPopupTitle" aria-modal="true">
        <button type="button" class="exit-popup-close" id="exitPopupClose" aria-label="Close offer">&times;</button>
        <div style="text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(212,175,55,.45); background: rgba(212,175,55,.1); border-radius: 9999px; padding: 4px 14px; margin-bottom: 12px;">
            <span class="live-dot" style="width: 7px; height: 7px; border-radius: 9999px; background: #e53e3e; box-shadow: 0 0 6px #e53e3e;"></span>
            <span style="font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #f7dfc2;">Today Only</span>
          </div>
          <h3 id="exitPopupTitle" style="font-size: 24px; font-weight: 400; color: #f7dfc2; line-height: 1.15; margin: 0 0 8px;">Unlock up to 30% OFF</h3>
          <p style="font-size: 13px; font-weight: 300; line-height: 1.5; color: #d0c5b9; margin: 0 0 16px;">VIP &amp; VVIP suites, couple packages and first-visit therapies. Your private code is ready.</p>
          <div class="popup-timer-wrap" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
            <div class="timer-unit timer-unit-sm">
              <span class="timer-val timer-hrs">03</span>
              <span class="timer-lbl">HRS</span>
            </div>
            <span class="timer-colon">:</span>
            <div class="timer-unit timer-unit-sm">
              <span class="timer-val timer-min">52</span>
              <span class="timer-lbl">MIN</span>
            </div>
            <span class="timer-colon">:</span>
            <div class="timer-unit timer-unit-sm">
              <span class="timer-val timer-sec">10</span>
              <span class="timer-lbl">SEC</span>
            </div>
          </div>
          <div class="code-box" style="border: 1.5px dashed rgba(212,175,55,.6); border-radius: 8px; padding: 10px 14px; background: rgba(18,10,5,.6); margin-bottom: 12px; text-align: center;">
            <span style="display: block; font-size: 9px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: #bcaaa0; margin-bottom: 3px;">Your Offer Code</span>
            <span class="offer-code-text" style="font-size: 20px; font-weight: 700; letter-spacing: .15em; color: #f7dfc2;">LUMIA-&bull;&bull;&bull;&bull;</span>
          </div>
          <button type="button" class="gold-reveal-btn reveal-trigger" data-target="popup" style="width: 100%; background: linear-gradient(135deg,#e5c189 0%,#c99e5a 100%); color: #211a14; font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 13px 18px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .3s ease; box-shadow: 0 8px 20px -6px rgba(201,158,90,.4); margin-bottom: 12px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.26 0-2.3.77-2.73 1.87L12 4.63l-.27-.76A3.003 3.003 0 0 0 9 2C7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2.22l.53-1.49C13.54 4.2 14.23 4 15 4zM9 4c.77 0 1.46.2 1.69.51L11.22 6H9c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 13.83 8.62 14.5 11 8h2l2.38 6.5 1.62-.67L14.92 8H20v6z"/></svg>
            <span>Reveal My Code</span>
          </button>
          <a href="tel:${RECEPTION_PHONE}" class="code-revealed-call code-revealed-mobile" style="display: none; width: 100%; background: #f7dfc2; color: #211a14; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 13px 18px; border-radius: 8px; text-align: center; align-items: center; justify-content: center; gap: 8px; text-decoration: none; transition: all .3s ease; margin-bottom: 12px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.03-.24c1.12.37 2.33.57 3.56.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.44.57 3.56a1 1 0 0 1-.25 1.03l-2.2 2.2z"/></svg>
            <span>Call Reception Now</span>
          </a>
          <a href="https://web.whatsapp.com/send?phone=919019663937&amp;text=Hello%20Lumia%20International%20Spa%2C%20I%20have%20revealed%20VIP%20code%20${CODE_UNMASKED}%20and%20would%20like%20to%20know%20the%20offers." class="code-revealed-call code-revealed-desktop" target="_blank" rel="noopener" style="display: none; width: 100%; background: #f7dfc2; color: #211a14; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 13px 18px; border-radius: 8px; text-align: center; align-items: center; justify-content: center; gap: 8px; text-decoration: none; transition: all .3s ease; margin-bottom: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2.5a9.46 9.46 0 0 0-8.1 14.32L2.5 21.5l4.8-1.4A9.46 9.46 0 1 0 12.04 2.5zm0 1.7a7.76 7.76 0 0 1 6.6 11.86l-.34.54.62 2.26-2.32-.61-.52.31a7.76 7.76 0 1 1-4.04-14.36zm-3.06 4c-.15 0-.4.06-.6.29-.2.23-.78.76-.78 1.85s.8 2.15.9 2.3c.12.15 1.57 2.5 3.9 3.4 1.94.77 2.34.62 2.76.58.42-.04 1.36-.55 1.55-1.09.19-.53.19-.99.13-1.08-.06-.1-.2-.15-.43-.27-.23-.11-1.36-.67-1.57-.75-.21-.08-.36-.11-.51.12-.15.23-.58.75-.71.9-.13.15-.26.17-.49.06-.23-.12-.97-.36-1.85-1.14-.68-.61-1.14-1.36-1.28-1.59-.13-.23-.01-.35.1-.47.1-.1.23-.26.34-.4.11-.13.15-.22.23-.38.08-.15.04-.29-.02-.4-.06-.12-.5-1.26-.7-1.72-.18-.44-.37-.38-.51-.39z"/></svg>
            <span>Chat on WhatsApp</span>
          </a>
          <button type="button" class="exit-popup-dismiss" id="exitPopupDismiss" style="background: none; border: none; color: #bcaaa0; font-size: 12px; font-weight: 400; text-decoration: underline; cursor: pointer; padding: 6px; transition: color .2s ease;">No thanks, I'll pay full price</button>
        </div>
      </div>`;
      document.body.insertAdjacentHTML('beforeend', popupHtml);
    }

    const popup = document.getElementById('exitOfferPopup');
    const badge = document.getElementById('exitOfferBadge');
    const closeBtn = document.getElementById('exitPopupClose');
    const dismissBtn = document.getElementById('exitPopupDismiss');

    // 2. Synchronized Live Countdown Timer
    const STORAGE_KEY = 'lumia_offer_ends_at';
    let targetTime = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    const now = Date.now();
    // Default duration: 3 hours, 51 minutes, 51 seconds (~13911 seconds)
    if (!targetTime || targetTime <= now || (targetTime - now) > 24 * 3600 * 1000) {
      targetTime = now + (3 * 3600 + 51 * 60 + 51) * 1000;
      localStorage.setItem(STORAGE_KEY, targetTime.toString());
    }

    function updateTimer() {
      const remaining = Math.max(0, targetTime - Date.now());
      if (remaining <= 0) {
        targetTime = Date.now() + (3 * 3600 + 51 * 60 + 51) * 1000;
        localStorage.setItem(STORAGE_KEY, targetTime.toString());
      }
      const totalSec = Math.floor(remaining / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      const hStr = pad(hrs);
      const mStr = pad(mins);
      const sStr = pad(secs);

      document.querySelectorAll('.timer-hrs').forEach((el) => { el.textContent = hStr; });
      document.querySelectorAll('.timer-min').forEach((el) => { el.textContent = mStr; });
      document.querySelectorAll('.timer-sec').forEach((el) => { el.textContent = sStr; });
      document.querySelectorAll('.timer-val-badge').forEach((el) => { el.textContent = `${hStr}:${mStr}:${sStr}`; });
    }
    updateTimer();
    setInterval(updateTimer, 1000);

    // 3. Code Reveal Functionality
    function syncCtaButtons() {
      const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      const isDesktop = window.innerWidth > 1024 && !isTouch;
      document.querySelectorAll('.code-revealed-desktop').forEach((btn) => {
        btn.style.display = isDesktop ? 'flex' : 'none';
      });
      document.querySelectorAll('.code-revealed-mobile').forEach((btn) => {
        btn.style.display = isDesktop ? 'none' : 'flex';
      });
    }

    function revealOfferCode() {
      document.body.classList.add('offer-code-revealed');

      // Unmask text on all code boxes
      document.querySelectorAll('.offer-code-text').forEach((el) => {
        el.textContent = CODE_UNMASKED;
        el.style.color = '#fff';
        el.style.letterSpacing = '.1em';
      });

      // Switch buttons to action
      document.querySelectorAll('.reveal-trigger').forEach((btn) => {
        btn.style.display = 'none';
      });
      syncCtaButtons();

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CODE_UNMASKED).catch(() => {});
      }

      // Friendly notification toast
      const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      const isDesktop = window.innerWidth > 1024 && !isTouch;
      const toastAction = isDesktop ? 'Chat with us on WhatsApp.' : 'Quote ' + CODE_UNMASKED + ' when you call.';
      showToast('Offer code copied! ' + toastAction);
      localStorage.setItem('lumia_code_revealed', 'true');
    }

    document.querySelectorAll('.reveal-trigger').forEach((btn) => {
      btn.addEventListener('click', revealOfferCode);
    });

    if (localStorage.getItem('lumia_code_revealed') === 'true') {
      document.body.classList.add('offer-code-revealed');
      document.querySelectorAll('.offer-code-text').forEach((el) => {
        el.textContent = CODE_UNMASKED;
      });
      document.querySelectorAll('.reveal-trigger').forEach((btn) => {
        btn.style.display = 'none';
      });
      syncCtaButtons();
    }

    // Keep revealed CTAs in sync on viewport resize
    window.addEventListener('resize', () => {
      if (document.body.classList.contains('offer-code-revealed')) {
        syncCtaButtons();
      }
    });

    // 3b. "Call to know" / Deal Links Handler:
    // In mobile view or tab view (<=1024px or touch) -> dial reception (tel:+919019663937)
    // In desktop view (>1024px) -> open WhatsApp with custom inquiry message
    document.querySelectorAll('.deal-price-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
        const isDesktop = window.innerWidth > 1024 && !isTouch;
        if (isDesktop) {
          e.preventDefault();
          const deal = link.getAttribute('data-deal') || 'Exclusive Spa Package';
          const code = (localStorage.getItem('lumia_code_revealed') === 'true') ? CODE_UNMASKED : 'LUMIA-VIP30';
          const text = encodeURIComponent(`Hello Lumia International Spa, I would like to know the offer price for ${deal} (Code: ${code}).`);
          window.open(`https://web.whatsapp.com/send?phone=919019663937&text=${text}`, '_blank', 'noopener');
        }
      });
    });

    // Toast helper
    function showToast(msg) {
      let toast = document.getElementById('lumiaToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lumiaToast';
        toast.style.cssText = 'position:fixed;top:28px;left:50%;transform:translateX(-50%) translateY(-20px);background:rgba(33,26,20,.95);border:1px solid rgba(212,175,55,.6);color:#f7dfc2;padding:12px 24px;border-radius:9999px;font-size:13px;font-family:Comfortaa,sans-serif;z-index:999;box-shadow:0 12px 30px rgba(0,0,0,.5);opacity:0;transition:all .35s ease;pointer-events:none;text-align:center;max-width:90vw;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
      }, 4000);
    }

    // 4. Exit Pop-up & Right-Side Display Behavior
    // User requirement:
    // "Exit pop up on website with timer add it on right side and it should come when will scroll also it should display all the time"
    let isPopupOpen = false;
    let isDismissed = sessionStorage.getItem('lumia_popup_dismissed') === 'true';

    function openPopup() {
      if (isPopupOpen) return;
      isPopupOpen = true;
      if (popup) popup.classList.add('is-visible');
      if (badge) badge.classList.remove('is-visible');
    }

    function closePopup() {
      isPopupOpen = false;
      isDismissed = true;
      sessionStorage.setItem('lumia_popup_dismissed', 'true');
      if (popup) popup.classList.remove('is-visible');
      // Show badge so it displays all the time on the right side!
      if (badge) badge.classList.add('is-visible');
    }

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (dismissBtn) dismissBtn.addEventListener('click', closePopup);
    if (badge) badge.addEventListener('click', () => {
      isDismissed = false;
      openPopup();
    });

    // Scroll trigger: when visitor scrolls past 220px, slide in on the right
    let scrollTriggered = false;
    window.addEventListener('scroll', () => {
      if (!scrollTriggered && window.scrollY > 220) {
        scrollTriggered = true;
        if (!isDismissed) {
          openPopup();
        } else {
          // If previously dismissed, ensure the badge is displaying all the time!
          if (badge) badge.classList.add('is-visible');
        }
      }
    }, { passive: true });

    // Desktop exit-intent trigger: mouse moving towards the top
    let exitTriggered = false;
    document.addEventListener('mouseleave', (e) => {
      if (!exitTriggered && e.clientY <= 12) {
        exitTriggered = true;
        openPopup();
      }
    });

    // If already scrolled on page load or after a short delay, display appropriately
    setTimeout(() => {
      if (window.scrollY > 150) {
        if (!isDismissed) openPopup();
        else if (badge) badge.classList.add('is-visible');
      } else if (isDismissed && badge) {
        badge.classList.add('is-visible');
      }
    }, 1200);
  }
})();

