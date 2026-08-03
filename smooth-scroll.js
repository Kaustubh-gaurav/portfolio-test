// Momentum scrolling: the wheel sets a target and the page eases toward it,
// instead of jumping in wheel sized steps.
//
// This drives the real scroll position rather than transforming a wrapper, which
// matters here: the stacked sheets rely on position: sticky, and sticky stops
// working entirely inside a transformed ancestor.
//
// It stays out of the way where it is not wanted: touch devices already have
// momentum of their own, and hijacking the wheel is exactly the kind of thing
// prefers-reduced-motion is asking you not to do.
(function () {
  var fine = window.matchMedia('(pointer: fine)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduced.matches) return;

  var current = window.scrollY;
  var target = current;
  var running = false;
  var last = 0;

  // The one knob. It is the fraction of the remaining distance still left after a
  // second, so smaller is snappier and larger glides for longer:
  //   0.002  settles in about 0.75s, roughly a default inertia library
  //   0.025  settles in about 1.25s
  //   0.10   settles in about 2s, very floaty
  var REMAINING_PER_SECOND = 0.025;

  function limit() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  // The stylesheet sets scroll-behavior: smooth so anchor links glide. Left alone,
  // that would make every step of this loop start its own browser smooth scroll and
  // the two would fight, going nowhere. These steps are explicitly instant; the
  // easing is ours. Anchor links still glide, because they do not come through here.
  function jump(y) {
    window.scrollTo({ top: y, behavior: 'instant' });
  }

  function frame(now) {
    // clamp low: a frame timestamp can predate the performance.now() that started it
    var dt = Math.max(0, Math.min(64, now - last));
    last = now;

    // framerate independent easing, so a 120Hz screen does not glide twice as fast
    current += (target - current) * (1 - Math.pow(REMAINING_PER_SECOND, dt / 1000));

    if (Math.abs(target - current) < 0.1) {
      current = target;
      jump(current);
      running = false;
      return;
    }
    // deliberately not rounded: browsers keep fractional scroll offsets, and
    // snapping to whole pixels is visible as stepping at the end of a glide,
    // which is exactly where the motion is slowest and most scrutinised
    jump(current);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function step(e) {
    if (e.deltaMode === 1) return e.deltaY * 16;                 // lines
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages
    return e.deltaY;
  }

  addEventListener('wheel', function (e) {
    if (e.ctrlKey) return; // pinch to zoom
    e.preventDefault();
    // Re-read the real position before starting a glide. Scroll events arrive a
    // frame late, so after any other kind of scroll our idea of where the page is
    // would still be stale, and the first wheel would be spent catching up.
    if (!running) current = target = window.scrollY;
    target = Math.min(limit(), Math.max(0, target + step(e)));
    start();
  }, { passive: false });

  // While a glide is running every scroll event is one we caused, so listening to
  // them would just be the loop arguing with itself. Between glides they are how
  // we notice a scrollbar drag, a keypress or a jump to #contact.
  addEventListener('scroll', function () {
    if (running) return;
    current = target = window.scrollY;
  }, { passive: true });

  // A resize changes how far the page can go, so the target may no longer be
  // reachable. Re-clamp it rather than cancelling: killing the glide here would
  // also kill it on every phone that fires resize when the URL bar hides.
  addEventListener('resize', function () {
    if (running) target = Math.min(limit(), Math.max(0, target));
    else current = target = window.scrollY;
  });

  if (reduced.addEventListener) {
    reduced.addEventListener('change', function (e) {
      if (e.matches) { running = false; current = target = window.scrollY; }
    });
  }
})();
