
(function () {
  function initCake() {
    const cake = document.getElementById("cake-button");
    const hint = document.getElementById("cake-help");

    if (!cake || cake.dataset.ready === "1") return;
    cake.dataset.ready = "1";

    let audioContext = null;
    let analyser = null;
    let micStream = null;
    let micData = null;
    let animationFrame = null;
    let micActive = false;
    let blowStarted = 0;
    let cooldownUntil = 0;

    function setBlown(blown) {
      const isBlown = cake.classList.contains("blown");
      if (blown === isBlown) return;

      cake.classList.toggle("blown", blown);
      cake.setAttribute("aria-pressed", String(blown));

      const candles = cake.querySelector(".cake-candles");
      const illustration = cake.querySelector(".cake-illustration");

      if (candles) candles.textContent = blown ? "" : "🕯️🕯️🕯️";
      if (illustration) illustration.textContent = blown ? "🎂" : "🎂";

      if (hint) {
        hint.textContent = blown
          ? "Candles out! Click the cake to relight ♡"
          : "Blow into your mic or tap the cake to blow!";
      }

      if (blown) {
        window.PartySfx?.blow();
        window.PartyUI?.toast("*whoosh* candles out");
      } else {
        window.PartySfx?.light();
        window.PartyUI?.toast("candles relit");
      }
    }

    // Keep the existing click-to-blow and click-to-relight interaction.
    cake.addEventListener("click", () => {
      setBlown(!cake.classList.contains("blown"));
    });

    async function startMic() {
      if (micActive) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        if (hint) {
          hint.textContent = "Microphone requires HTTPS or localhost.";
        }
        return;
      }

      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error("AudioContext is not supported");
        }

        audioContext = new AudioContextClass();
        await audioContext.resume();

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.15;

        audioContext
          .createMediaStreamSource(micStream)
          .connect(analyser);

        micData = new Uint8Array(analyser.fftSize);
        micActive = true;

        if (hint) {
          hint.textContent = "Microphone on! Blow toward your mic 💨";
        }

        detectBlow();
      } catch (error) {
        console.error("Could not start microphone:", error);

        if (hint) {
          hint.textContent =
            "Mic access denied or unavailable. Check browser permissions.";
        }

        stopMic();
      }
    }

    function detectBlow() {
      if (!micActive || !analyser) return;

      analyser.getByteTimeDomainData(micData);

      let sum = 0;

      for (let i = 0; i < micData.length; i++) {
        const sample = (micData[i] - 128) / 128;
        sum += sample * sample;
      }

      const volume = Math.sqrt(sum / micData.length);
      const now = performance.now();

      // Adjust this threshold for your microphone's sensitivity.
      if (volume > 0.12) {
        if (!blowStarted) blowStarted = now;

        if (
          now - blowStarted >= 180 &&
          now >= cooldownUntil &&
          !cake.classList.contains("blown")
        ) {
          setBlown(true);
          cooldownUntil = now + 1500;
          blowStarted = 0;
        }
      } else {
        blowStarted = 0;
      }

      animationFrame = requestAnimationFrame(detectBlow);
    }

    function stopMic() {
      micActive = false;

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
      }

      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
      }

      analyser = null;
      micData = null;
    }

    // Clicking the existing caption enables the microphone.
    if (hint) {
      hint.textContent = "Click here to enable mic, then blow! 💨";
      hint.style.cursor = "pointer";
      hint.setAttribute("role", "button");
      hint.setAttribute("tabindex", "0");

      hint.addEventListener("click", startMic);

      hint.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startMic();
        }
      });
    }

    window.addEventListener("pagehide", stopMic);
  }

  window.PartyCake = { init: initCake };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCake);
} else {
  initCake();
}
})();
