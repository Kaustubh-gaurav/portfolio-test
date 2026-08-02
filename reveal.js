// Fade-and-rise elements in as they enter the viewport.
// Anything already on screen at load reveals immediately, so the top of the
// page is never blank while you wait for a scroll.
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target); // reveal once, don't re-hide on scroll up
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  els.forEach(function (el) { io.observe(el); });
})();
