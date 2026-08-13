// Play the track on the page instead of sending people to Spotify.
//
// Spotify's embed is the only way to play a real track legally without asking
// every visitor to log in, but its compact player is fixed at 80 tall and comes
// with its own chrome, so it cannot be the bar drawn in Frame 26. The Embed
// IFrame API solves exactly that: it hands back a controller, so the embed can
// sit behind the bar doing the audio while the bar is the only thing anyone sees
// or clicks.
//
// What a visitor actually hears depends on them, and this is Spotify's rule, not
// ours: signed out, or signed in without Premium, they get roughly a 30 second
// preview. A signed in Premium listener gets the whole track. Nothing here can
// change that.
//
// Until the API answers, the control stays what it is in the markup: an ordinary
// link to the track. It is only turned into a play button once there is
// something for it to control, so a blocked script or a slow CDN leaves a
// working link rather than a dead button.
(function () {
  var bar = document.querySelector('.ab-track');
  if (!bar) return;

  var id = bar.getAttribute('data-track');
  var slot = bar.querySelector('.ab-track-slot');
  var btn = bar.querySelector('.ab-track-play');
  if (!id || !slot || !btn) return;

  // reduced motion is about movement, not sound, so it is deliberately not
  // consulted here; nothing plays until the button is pressed either way
  var s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  document.head.appendChild(s);

  window.onSpotifyIframeApiReady = function (IFrameAPI) {
    IFrameAPI.createController(
      slot,
      { uri: 'spotify:track:' + id, width: 300, height: 80 },
      function (controller) {
        var playing = false;

        function paint() {
          bar.classList.toggle('is-playing', playing);
          btn.setAttribute('aria-label',
            (playing ? 'Pause ' : 'Play ') + 'Beat It by Michael Jackson');
        }

        // Now that there is something to control, the link becomes a button.
        // href is dropped so it cannot navigate, and the role and tabindex are
        // set so it still reads and behaves as a button.
        btn.removeAttribute('href');
        btn.removeAttribute('target');
        btn.removeAttribute('rel');
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        paint();

        function toggle(e) {
          if (e) e.preventDefault();
          controller.togglePlay();
        }
        btn.addEventListener('click', toggle);
        btn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') toggle(e);
        });

        // The embed is the source of truth: it also pauses itself when another
        // Spotify player takes over, and the bar has to follow that rather than
        // just tracking its own clicks.
        controller.addListener('playback_update', function (e) {
          if (!e || !e.data) return;
          playing = !e.data.isPaused;
          paint();
        });
      }
    );
  };
})();
