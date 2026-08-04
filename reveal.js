// Fade-and-rise elements in as they enter the viewport.
//
// This sweeps the remaining elements on scroll rather than using an
// IntersectionObserver. There are only a handful of them, they are dropped from
// the list the moment they reveal, and the listeners detach once it is empty, so
// the cost is a few rect reads for the first screenful of scrolling. The reason
// to prefer it: these elements start at opacity 0, so anything that stops the
// reveal firing does not degrade the animation, it hides the content. A plain
// measurement on every scroll has no callback delivery to go wrong.
(function () {
  var els = [].slice.call(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  function revealAll() {
    els.forEach(function (el) { el.classList.add('is-in'); });
    els.length = 0;
    detach();
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealAll();
    return;
  }

  function detach() {
    removeEventListener('scroll', sweep);
    removeEventListener('resize', sweep);
  }

  function sweep() {
    // the same 10% shy of the fold the previous version used, so an element
    // starts moving just after it clears the bottom edge rather than on it
    var limit = window.innerHeight * 0.9;
    for (var i = els.length - 1; i >= 0; i--) {
      if (els[i].getBoundingClientRect().top < limit) {
        els[i].classList.add('is-in');
        els.splice(i, 1);
      }
    }
    if (!els.length) detach();
  }

  addEventListener('scroll', sweep, { passive: true });
  addEventListener('resize', sweep);
  // images settling can move things into view without a scroll
  addEventListener('load', sweep);
  sweep(); // anything already on screen reveals immediately
})();
