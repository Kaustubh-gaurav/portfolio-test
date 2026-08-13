// GSAP ScrollTrigger version of the stacked sheets, plus the scroll work that is
// awkward to hand roll. This is a prototype living alongside stack.js and
// reveal.js; index.html still uses those two, index-gsap.html uses this instead.
//
// What replaces what:
//   stack.js   -> the pin block below. Sticky offsets are no longer measured by
//                 hand; ScrollTrigger pins and works out its own start point.
//   reveal.js  -> ScrollTrigger.batch, which additionally staggers a group that
//                 enters together instead of firing all of it on the same frame.
//
// Everything past the pin block is new capability rather than a port: scrubbed
// motion, where position in the animation is tied to scroll position rather than
// to elapsed time. That is the part that is genuinely hard without a library.
(function () {
  // If the CDN is unreachable the page must still work. Panels are position:
  // relative on this page, so with no GSAP it is an ordinary scrolling page,
  // and the reveal elements have to be shown or the content stays invisible.
  if (!window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var panels = gsap.utils.toArray('.panel');
  if (!panels.length) return;

  // Same contract as the other scripts: reduced motion gets a plain page with
  // everything visible, and no scroll driven anything.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  /* ---------- 1. pin and stack ---------- */
  // The parity piece. Each panel pins and the next climbs over it.
  //
  // start is the whole of what stack.js was computing. A panel shorter than the
  // screen pins when its top reaches the top; a taller one has to keep scrolling
  // until its bottom reaches the bottom, or its lower half is unreachable.
  // ScrollTrigger takes that as a string per panel and re-evaluates it on every
  // refresh, so the resize and ResizeObserver plumbing goes away.
  //
  // pinSpacing: false is what makes them stack rather than queue. The pin spacer
  // keeps the panel's own height in the flow, but adds no extra room for the pin
  // duration, so the next panel arrives over the top of a panel that has stopped.
  var last = panels[panels.length - 1];
  panels.slice(0, -1).forEach(function (panel) {
    ScrollTrigger.create({
      trigger: panel,
      start: function () {
        return panel.offsetHeight > window.innerHeight ? 'bottom bottom' : 'top top';
      },
      endTrigger: last,
      end: 'bottom bottom',
      pin: true,
      pinSpacing: false,
      invalidateOnRefresh: true
    });
  });

  /* ---------- 2. staggered reveals ---------- */
  // GSAP owns the transform here rather than the CSS transition, so index-gsap
  // switches that transition off. Setting the start state through GSAP writes it
  // inline, which beats the stylesheet and keeps one system in charge.
  //
  // Grouped per panel rather than done in one sweep, because of pinnedContainer.
  // Once a panel pins, everything inside it stops moving with the scroll, so the
  // document positions ScrollTrigger measured at refresh no longer describe where
  // these elements actually are, and the reveal either fires at the wrong moment
  // or never fires at all. pinnedContainer is how you tell it which pin to
  // account for, and it is per element, so the batch has to be per panel too.
  //
  // This is the tax for pinning. It is worth knowing about before committing to
  // ScrollTrigger: anything scroll driven inside a pinned sheet needs this.
  gsap.set(gsap.utils.toArray('.reveal'), { opacity: 0, y: 18 });

  panels.forEach(function (panel, i) {
    var items = gsap.utils.toArray(panel.querySelectorAll('.reveal'));
    if (!items.length) return;

    var cfg = {
      start: 'top 90%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: 'power2.out',
          // the three tickets enter together, so they arrive one after another
          // instead of as a single block
          stagger: 0.12,
          overwrite: true
        });
      }
    };
    // every panel except the last one is pinned above
    if (panel !== last) cfg.pinnedContainer = panel;

    ScrollTrigger.batch(items, cfg);
  });

  /* ---------- 3. hero parallax ---------- */
  // The postcard drifts and shrinks slightly as the hero is scrolled away, so the
  // Work sheet reads as passing over something with depth behind it rather than
  // over a flat plate.
  //
  // Driven off the Work sheet climbing the screen, not off the hero's own travel.
  // The hero pins at scroll 0 and then never moves, so a range ending at "the
  // hero's bottom reaches the top of the screen" would never advance. Work is
  // still unpinned across this range, so it is a range that actually resolves.
  //
  // The wrapper is the target, never .postcard itself. The hover rule that
  // straightens the card is a transform on .postcard, and an inline transform
  // from GSAP would outrank it and kill the hover.
  gsap.to('.postcard-wrap', {
    yPercent: 10,
    scale: 0.95,
    ease: 'none',
    scrollTrigger: {
      trigger: '.panel--work',
      start: 'top bottom',
      end: 'top top',
      scrub: true
    }
  });

  /* ---------- 4. section rules draw in ---------- */
  // The blue rule beside each section label draws from the left as the header
  // arrives, tied to scroll rather than to a duration.
  gsap.utils.toArray('.head .rule').forEach(function (rule) {
    var panel = rule.closest('.panel');
    gsap.from(rule, {
      scaleX: 0,
      transformOrigin: 'left center',
      ease: 'none',
      scrollTrigger: {
        trigger: rule.closest('.head'),
        start: 'top 92%',
        end: 'top 55%',
        scrub: true,
        pinnedContainer: panel && panel !== last ? panel : null
      }
    });
  });

  /* ---------- 5. wordmark rise ---------- */
  // The footer wordmark lifts as the footer climbs over About, so the last sheet
  // has some movement of its own on the way in.
  gsap.from('.wordmark', {
    yPercent: 18,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: {
      trigger: '.panel--footer',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true
    }
  });

  /* ---------- 6. the About notebook opens ---------- */
  // The closed pad lifts from its clipped top edge and the pages unfold below.
  //
  // The cover is built here rather than shipped in the markup, so a page with
  // no JavaScript never renders a cover it has no way to lift, and the About
  // copy is simply visible. about-pad.css only hides the pages once js-cover
  // says a cover actually exists.
  //
  // Height is left to CSS while GSAP drives the flip. They animate different
  // elements, so nothing is fighting, and height stays correct through a
  // resize because it is expressed in --u rather than in pixels frozen at
  // whatever the width happened to be when the tween was built.
  (function () {
    var pad = document.querySelector('.pad');
    if (!pad) return;
    var stage = pad.querySelector('.pad-stage');
    var pages = pad.querySelector('.pad-pages');
    if (!stage || !pages) return;

    // the notebook is desktop only for now; below the breakpoint about-pad.css
    // renders the same markup as ordinary copy and there is nothing to open
    var wide = window.matchMedia('(min-width: 681px)');
    if (!wide.matches) return;

    var cover = document.createElement('button');
    cover.type = 'button';
    cover.className = 'pad-cover';
    cover.setAttribute('aria-expanded', 'false');
    cover.setAttribute('aria-controls', 'pad-pages');
    cover.innerHTML =
      '<span class="pad-face pad-face--front"></span>' +
      '<span class="sr-only">Open the notebook to read about me</span>';
    stage.appendChild(cover);
    pad.classList.add('js-cover');

    var opened = false;
    function openPad() {
      if (opened) return;
      opened = true;
      cover.setAttribute('aria-expanded', 'true');
      pad.classList.add('is-open');   // CSS grows the stage to the open height

      // Negative, so the top edge comes toward the reader rather than falling
      // away from them: a page being turned, not a lid dropping backwards.
      // It is carried past 90 to 104 because the leaf is already invisible from
      // 90 on, and stopping exactly at the vanishing point makes the end of the
      // motion visible as a stop.
      gsap.timeline({ onComplete: function () { cover.remove(); ScrollTrigger.refresh(); } })
        // Accelerating, not eased at both ends. The leaf is invisible from 90 of
        // the 104 onward, so an ease that slows into its finish spends that slow
        // part where nobody can see it and reads as the turn dragging.
        .to(cover, { rotateX: -104, duration: 0.95, ease: 'power1.in' }, 0);
    }

    cover.addEventListener('click', openPad);

    // Opens itself when it arrives, so the bio is not sitting behind a click
    // most visitors will never make. The cover stays clickable in case it is
    // already on screen at load. pinnedContainer for the usual reason: the
    // About panel is pinned, so the pad stops moving with the scroll.
    ScrollTrigger.create({
      trigger: pad,
      start: 'top 75%',
      once: true,
      pinnedContainer: pad.closest('.panel') !== last ? pad.closest('.panel') : null,
      onEnter: openPad
    });
  })();

  // Images settle after first paint and change the heights every start point was
  // measured against.
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
