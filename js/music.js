/*
=========================================================
OUR LITTLE WORLD ♡
File: js/music.js
YouTube background music, controlled by the existing SOUND button.
=========================================================
*/

(function () {
  "use strict";

  const VIDEO_ID = "EtcBC9SU_P8";
  const mount = document.getElementById("youtube-music-player");
  const status = document.getElementById("music-status");

  if (!mount) return;

  let player = null;
  let soundEnabled = Boolean(
    window.LittleWorld && window.LittleWorld.soundEnabled
  );

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = function () {
      createPlayer();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = function () {
        setStatus("Music couldn't load. Please check your connection or open the song on YouTube.");
      };
      document.head.appendChild(script);
    }
  }

  function createPlayer() {
    if (player || !window.YT || !window.YT.Player) return;

    player = new window.YT.Player("youtube-music-player", {
      width: "100%",
      height: "225",
      videoId: VIDEO_ID,
      playerVars: {
        autoplay: 1,
        controls: 0,
        playsinline: 1,
        rel: 0,
        mute: 1
      },
      events: {
        onReady: function (event) {
          event.target.mute();
          event.target.playVideo();
          if (soundEnabled) event.target.unMute();
        },
        onStateChange: function (event) {
          if (!window.YT || !window.YT.PlayerState) return;
          if (event.data === window.YT.PlayerState.PLAYING && soundEnabled) {
            event.target.unMute();
          }
        },
        onError: function () {
          setStatus("This song may not allow embedded playback. Try opening it directly on YouTube.");
        },
        onAutoplayBlocked: function () {
          setStatus("Your browser blocked automatic playback. Press play in the video above.");
        }
      }
    });
  }

  window.addEventListener("littleworld:soundchange", function (event) {
    soundEnabled = Boolean(event.detail && event.detail.enabled);

    if (!player) {
      setStatus(soundEnabled
        ? "Loading music… If it doesn't start, press play in the video."
        : "Music is off.");
      return;
    }

    if (soundEnabled) {
      player.playVideo();
      setStatus("Starting music…");
    } else {
      player.pauseVideo();
      setStatus("Music is off.");
    }
  });

  // Wait until the birthday room is visible so YouTube can measure the player.
  window.addEventListener("littleworld:entered", function () {
    soundEnabled = true;
    loadYouTubeApi();
  });

  if (window.LittleWorld && window.LittleWorld.hasEnteredRoom) {
    loadYouTubeApi();
  }
})();
