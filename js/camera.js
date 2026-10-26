
(function () {
  "use strict";

  let stream = null;
  let capturedBlobUrl = null;

  function els() {
    return {
      modal: document.getElementById("camera-modal"),
      openBtn: document.getElementById("open-camera"),
      video: document.getElementById("booth-video"),
      canvas: document.getElementById("booth-canvas"),
      preview: document.getElementById("booth-preview"),
      capture: document.getElementById("booth-capture"),
      retake: document.getElementById("booth-retake"),
      download: document.getElementById("booth-download"),
      error: document.getElementById("booth-error"),
      flash: document.getElementById("booth-flash"),
      stage: document.getElementById("booth-stage"),
      slot: document.getElementById("booth-slot"),
      stripOut: document.getElementById("booth-strip-out"),
      stripImg: document.getElementById("booth-strip-img")
    };
  }

  function showError(message) {
    const { error } = els();
    if (!error) return;

    error.hidden = !message;
    error.textContent = message || "";
  }

  function cleanupCapture() {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
      capturedBlobUrl = null;
    }
  }

  async function stopStream() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    const { video } = els();
    if (video) video.srcObject = null;
  }

  function showLive() {
    const {
      video, canvas, preview, capture, retake,
      download, stage, slot, stripOut, stripImg
    } = els();

    if (video) video.hidden = false;
    if (canvas) canvas.hidden = true;

    if (preview) {
      preview.hidden = true;
      preview.removeAttribute("src");
    }

    if (capture) capture.hidden = false;
    if (retake) retake.hidden = true;
    if (download) download.hidden = true;

    if (stage) stage.classList.remove("has-print");
    if (slot) slot.classList.remove("is-printing");

    if (stripOut) stripOut.hidden = true;
    if (stripImg) stripImg.removeAttribute("src");

    cleanupCapture();
    showError("");
  }

  function fireFlash() {
    const { flash } = els();

    window.PartySfx?.shutter?.();

    if (!flash) return;

    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.classList.add("is-on");

    window.setTimeout(() => {
      flash.classList.remove("is-on");
    }, 280);
  }

  async function startCamera() {
    const { video } = els();

    showError("");
    showLive();

    if (!navigator.mediaDevices?.getUserMedia) {
      showError("Camera is not supported in this browser.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 1280 }
        },
        audio: false
      });

      if (video) {
        video.srcObject = stream;
        video.style.transform = "scaleX(-1)";
        await video.play();
      }
    } catch (error) {
      console.warn("Camera error:", error);
      showError(
        "Couldn't access the camera. Please allow camera permission and try again."
      );
    }
  }

  function drawBoothStrip(ctx, width, height) {
    const side = Math.max(18, Math.round(width * 0.055));
    const top = Math.max(22, Math.round(height * 0.05));
    const bottom = Math.max(72, Math.round(height * 0.145));

    // Cream-colored photo strip.
    ctx.fillStyle = "#f7f2ea";
    ctx.fillRect(0, 0, width, top);
    ctx.fillRect(0, height - bottom, width, bottom);
    ctx.fillRect(0, 0, side, height);
    ctx.fillRect(width - side, 0, side, height);

    // Pixel-inspired outer border.
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = Math.max(2, Math.round(width * 0.006));
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Inner dashed border.
    ctx.save();
    ctx.strokeStyle = "rgba(26, 20, 16, 0.28)";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      side + 4,
      top + 4,
      width - side * 2 - 8,
      height - top - bottom - 8
    );
    ctx.restore();

    const brand = "@lovebub";
    const theme = window.BIRTHDAY_THEME || {};
    const wish = String(
      theme.boothLabel || theme.name || "Happy Birthday"
    ).slice(0, 24);

    const pad = 8;
    const gap = Math.max(16, Math.round(width * 0.03));
    const maxTextWidth = width - side * 2 - pad * 2;

    let brandSize = Math.max(14, Math.round(width * 0.038));
    let wishSize = Math.max(10, Math.round(width * 0.028));

    ctx.save();
    ctx.textBaseline = "middle";

    // Keep both labels inside the strip.
    for (let i = 0; i < 24; i++) {
      ctx.font = `700 ${brandSize}px "Space Mono", monospace`;
      const brandWidth = ctx.measureText(brand).width;

      ctx.font = `700 ${wishSize}px "Press Start 2P", monospace`;
      const wishWidth = ctx.measureText(wish).width;

      if (brandWidth + gap + wishWidth <= maxTextWidth) break;

      if (wishSize > 9) {
        wishSize--;
      } else if (brandSize > 11) {
        brandSize--;
      } else {
        break;
      }
    }

    const middleY = height - bottom / 2;

    ctx.fillStyle = "#1a1410";
    ctx.font = `700 ${brandSize}px "Space Mono", monospace`;
    ctx.textAlign = "left";
    ctx.fillText(brand, side + pad, middleY);

    ctx.fillStyle = "#c43b55";
    ctx.font = `700 ${wishSize}px "Press Start 2P", monospace`;
    ctx.textAlign = "right";
    ctx.fillText(wish, width - side - pad, middleY);

    ctx.restore();
  }

  function ejectStrip(url) {
    const { slot, stripOut, stripImg } = els();

    if (!stripOut || !stripImg) return;

    window.PartySfx?.print?.();

    stripImg.src = url;
    stripOut.hidden = false;

    // Restart the printing animation.
    stripOut.style.animation = "none";
    void stripOut.offsetWidth;
    stripOut.style.animation = "";

    slot?.classList.add("is-printing");
  }

  function capturePhoto() {
    const {
      video, canvas, preview, capture,
      retake, download, stage
    } = els();

    if (!video || !canvas || video.readyState < 2) {
      showError("Please wait for the camera to load.");
      return;
    }

    fireFlash();

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      showError("Couldn't prepare the photo canvas.");
      return;
    }

    // Mirror the captured photo like a selfie.
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    drawBoothStrip(ctx, width, height);

    canvas.toBlob(blob => {
      if (!blob) {
        showError("Couldn't create the image. Please try again.");
        return;
      }

      cleanupCapture();
      capturedBlobUrl = URL.createObjectURL(blob);

      if (preview) {
        preview.src = capturedBlobUrl;
        preview.hidden = false;
      }

      video.hidden = true;

      if (capture) capture.hidden = true;
      if (retake) retake.hidden = false;

      if (download) {
        download.href = capturedBlobUrl;
        download.download = "our-little-world-photo.png";
        download.hidden = false;
      }

      stage?.classList.add("has-print");
      ejectStrip(capturedBlobUrl);
      showError("");
    }, "image/png");
  }

  async function openBooth() {
    const { modal } = els();

    if (!modal) {
      console.warn("Camera modal #camera-modal was not found.");
      return;
    }

    if (!modal.open) modal.showModal();

    await startCamera();
  }

  async function closeBooth() {
    const { modal } = els();

    await stopStream();
    showLive();

    if (modal?.open) modal.close();
  }

  function initCamera() {
    const { openBtn, capture, retake, modal } = els();

    if (openBtn && openBtn.dataset.ready !== "1") {
      openBtn.dataset.ready = "1";
      openBtn.addEventListener("click", openBooth);
    }

    if (capture && capture.dataset.ready !== "1") {
      capture.dataset.ready = "1";
      capture.addEventListener("click", capturePhoto);
    }

    if (retake && retake.dataset.ready !== "1") {
      retake.dataset.ready = "1";
      retake.addEventListener("click", () => {
        showLive();
        if (stream && els().video) {
          els().video.srcObject = stream;
          els().video.play().catch(() => {});
        } else {
          startCamera();
        }
      });
    }

    if (modal && modal.dataset.ready !== "1") {
      modal.dataset.ready = "1";

      modal.addEventListener("close", () => {
        stopStream();
        cleanupCapture();
        showLive();
      });

      // Close when the visitor clicks the backdrop.
      modal.addEventListener("click", event => {
        if (event.target === modal) closeBooth();
      });
    }

    const { video } = els();
    if (video) video.style.transform = "scaleX(-1)";
  }

  window.PartyCamera = {
    init: initCamera,
    open: openBooth,
    close: closeBooth
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCamera);
  } else {
    initCamera();
  }
})();
