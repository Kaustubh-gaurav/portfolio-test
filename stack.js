// Stacked sheets: each panel pins, then the next one climbs over it.
//
// The pinning itself is CSS (position: sticky), but the offset has to be measured.
// A panel shorter than the screen pins at 0. A panel taller than the screen gets a
// negative offset so it keeps scrolling until its bottom reaches the bottom of the
// screen, and only pins there. Without that, a tall panel would freeze the moment
// its top hit 0 and everything past its first screenful would be unreachable.
//
// This cannot be expressed in CSS: calc(100vh - 100%) looks right but the
// percentage resolves against the containing block's height, which is auto here,
// so it computes to zero.
//
// Panels ship as position: sticky with no offset, which never sticks. So if this
// script does not run, the page is simply a normal scrolling page.
(function () {
  var panels = document.querySelectorAll('.panel');
  if (!panels.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var raf = 0;

  function place() {
    raf = 0;
    // the last panel has nothing coming over it, so it never needs to pin
    for (var i = 0; i < panels.length - 1; i++) {
      var panel = panels[i];
      if (reduced.matches) { panel.style.top = ''; continue; }
      panel.style.top = Math.min(0, window.innerHeight - panel.offsetHeight) + 'px';
    }
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(place);
  }

  place();
  addEventListener('resize', schedule);
  // images settle after first paint and change the panel heights they sit in
  addEventListener('load', place);
  if (reduced.addEventListener) reduced.addEventListener('change', place);

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(schedule);
    for (var j = 0; j < panels.length; j++) ro.observe(panels[j]);
  }
})();
