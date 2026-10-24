/*
=========================================================
OUR LITTLE WORLD ♡
File: js/main.js

Main application controller.
=========================================================
*/

const APP_CONFIG = {
  defaultName: "our little birthday star",
  defaultTitle: "A Little Birthday Room",
  decorationCount: 32,
  transitionDuration: 450,
  soundStorageKey: "our-little-world-sound-enabled"
};

const elements = {
  welcomeScreen: document.getElementById("welcome-screen"),
  birthdayRoom: document.getElementById("birthday-room"),
  enterButton: document.getElementById("enter-button"),
  homeLink: document.getElementById("home-link"),
  roomTitle: document.getElementById("room-title"),
  roomGreeting: document.getElementById("room-greeting"),
  decorations: document.getElementById("welcome-decorations"),
  soundToggle: document.getElementById("sound-toggle"),
  soundLabel: document.getElementById("sound-label"),
  messageDialog: document.getElementById("message-dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  dialogMessage: document.getElementById("dialog-message"),
  dialogCloseButton: document.getElementById("dialog-close-button"),
  toast: document.getElementById("toast"),
  screenReaderStatus: document.getElementById("screen-reader-status")
};

const state = {
  hasEnteredRoom: false,
  soundEnabled: false,
  activePanel: null,
  previousFocus: null,
  toastTimer: null
};


/* LOCAL STORAGE */

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("Could not read browser storage.", error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("Could not save browser storage.", error);
    return false;
  }
}


/* URL PERSONALIZATION */

function getQueryParameter(key) {
  const parameters = new URLSearchParams(window.location.search);
  return (parameters.get(key) || "").trim();
}

function cleanDisplayText(value, maxLength = 80) {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function getOrdinalSuffix(number) {
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }

  switch (number % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function applyBirthdayTheme() {
  const name = cleanDisplayText(
    getQueryParameter("name") || APP_CONFIG.defaultName,
    40
  );

  const customTitle = cleanDisplayText(
    getQueryParameter("title"),
    80
  );

  const ageParameter = getQueryParameter("age");

  const ageNumber = /^\d{1,3}$/.test(ageParameter)
    ? Number(ageParameter)
    : null;

  const validAge =
    ageNumber !== null &&
    ageNumber >= 1 &&
    ageNumber <= 120;

  const title = customTitle || APP_CONFIG.defaultTitle;

  if (elements.roomTitle) {
    elements.roomTitle.textContent = title;
  }

  if (elements.roomGreeting) {
    let greeting =
      `Today, this little world is all yours, ${name}. ♡`;

    if (validAge) {
      greeting =
        `Happy ${ageNumber}${getOrdinalSuffix(ageNumber)} birthday, ` +
        `${name}! This little world is all yours. ♡`;
    }

    elements.roomGreeting.textContent = greeting;
  }

  document.title = `${title} ♡ | OUR LITTLE WORLD`;
}


/* FLOATING DECORATIONS */

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}


function createDecoration(className, symbol, index) {
  const container = document.getElementById("welcome-decorations");
  if (!container) return;

  const decoration = document.createElement("span");

  decoration.className = className;
  decoration.textContent = symbol;
  decoration.dataset.decorationIndex = String(index);

  // Position each particle relative to the decoration layer.
  decoration.style.position = "absolute";
  decoration.style.left = `${Math.random() * 94 + 3}%`;
  decoration.style.top = `${Math.random() * 94 + 3}%`;
  decoration.style.fontSize = `${Math.random() * 13 + 10}px`;

  // Independent floating animation for each particle.
  decoration.style.animationDelay = `${-(Math.random() * 5)}s`;
  decoration.style.animationDuration = `${2 + Math.random() * 4}s`;

  // Keep the particle independent of the homepage card layout.
  decoration.style.display = "block";
  decoration.style.width = "max-content";
  decoration.style.height = "max-content";
  decoration.style.margin = "0";
  decoration.style.padding = "0";
  decoration.style.lineHeight = "1";
  decoration.style.pointerEvents = "none";
  decoration.style.zIndex = "1";

  container.appendChild(decoration);
}



/* ENTER THE ROOM */

function enterRoom() {
  if (
    state.hasEnteredRoom ||
    !elements.welcomeScreen ||
    !elements.birthdayRoom
  ) {
    return;
  }

  state.hasEnteredRoom = true;

  if (elements.enterButton) {
    elements.enterButton.disabled = true;
  }

  elements.welcomeScreen.classList.add("fade-out");

  window.setTimeout(function () {
    elements.welcomeScreen.hidden = true;

    elements.birthdayRoom.hidden = false;
    elements.birthdayRoom.classList.add("fade-in");

    announceToScreenReader(
      "Welcome to Our Little World. Your birthday room is ready."
    );

    if (elements.roomTitle) {
      elements.roomTitle.setAttribute("tabindex", "-1");
      elements.roomTitle.focus();
    }

    window.dispatchEvent(
      new CustomEvent("littleworld:entered")
    );
  }, APP_CONFIG.transitionDuration);
}


/* RETURN HOME */

function returnToWelcomeScreen() {
  if (!elements.welcomeScreen || !elements.birthdayRoom) {
    return;
  }

  closeActivePanel();
  closeMessage();

  elements.birthdayRoom.classList.remove("fade-in");
  elements.birthdayRoom.hidden = true;

  elements.welcomeScreen.classList.remove("fade-out");
  elements.welcomeScreen.hidden = false;
  elements.welcomeScreen.classList.add("fade-in");

  if (elements.enterButton) {
    elements.enterButton.disabled = false;
    elements.enterButton.focus();
  }

  state.hasEnteredRoom = false;

  announceToScreenReader("Returned to the welcome screen.");
}


/* FEATURE PANELS */

function openPanel(panelId) {
  const panel = document.getElementById(panelId);

  if (!panel || !panel.classList.contains("feature-panel")) {
    return;
  }

  if (state.activePanel && state.activePanel !== panel) {
    closeActivePanel();
  }

  state.activePanel = panel;

  panel.hidden = false;
  panel.classList.add("fade-in");

  panel.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start"
  });

  const heading = panel.querySelector("h2");

  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  announceToScreenReader(
    `${heading ? heading.textContent : "Feature"} opened.`
  );
}

function closeActivePanel() {
  if (!state.activePanel) {
    return;
  }

  state.activePanel.classList.remove("fade-in");
  state.activePanel.hidden = true;

  state.activePanel = null;
}

function closePanel(panelId) {
  const panel = document.getElementById(panelId);

  if (!panel || !panel.classList.contains("feature-panel")) {
    return;
  }

  panel.classList.remove("fade-in");
  panel.hidden = true;

  if (state.activePanel === panel) {
    state.activePanel = null;
  }

  const trigger = document.querySelector(
    `[data-open-panel="${panelId}"]`
  );

  if (trigger) {
    trigger.focus();
  }
}


/* MESSAGE DIALOG */

function showMessage(
  message,
  title = "A message from the heart ♡"
) {
  if (!elements.messageDialog || !elements.dialogMessage) {
    showToast(message);
    return;
  }

  elements.dialogMessage.textContent = String(message);

  if (elements.dialogTitle) {
    elements.dialogTitle.textContent = String(title);
  }

  state.previousFocus = document.activeElement;

  if (typeof elements.messageDialog.showModal === "function") {
    if (!elements.messageDialog.open) {
      elements.messageDialog.showModal();
    }

    if (elements.dialogCloseButton) {
      elements.dialogCloseButton.focus();
    }
  } else {
    showToast(message);
  }
}

function closeMessage() {
  if (
    !elements.messageDialog ||
    !elements.messageDialog.open
  ) {
    return;
  }

  elements.messageDialog.close();

  if (
    state.previousFocus &&
    typeof state.previousFocus.focus === "function" &&
    document.contains(state.previousFocus)
  ) {
    state.previousFocus.focus();
  }

  state.previousFocus = null;
}


/* TOAST NOTIFICATIONS */

function showToast(message, duration = 2500) {
  if (!elements.toast) {
    announceToScreenReader(message);
    return;
  }

  if (state.toastTimer !== null) {
    window.clearTimeout(state.toastTimer);
  }

  elements.toast.textContent = String(message);
  elements.toast.hidden = false;

  announceToScreenReader(message);

  state.toastTimer = window.setTimeout(function () {
    elements.toast.hidden = true;
    state.toastTimer = null;
  }, duration);
}


/* ACCESSIBILITY */

function announceToScreenReader(message) {
  if (elements.screenReaderStatus) {
    elements.screenReaderStatus.textContent = String(message);
  }
}

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}


/* SOUND PREFERENCES */

function initializeSoundPreference() {
  const savedPreference = readStorage(
    APP_CONFIG.soundStorageKey
  );

  state.soundEnabled = savedPreference === "true";

  updateSoundButton();
}

function updateSoundButton() {
  if (!elements.soundToggle) {
    return;
  }

  elements.soundToggle.setAttribute(
    "aria-pressed",
    String(state.soundEnabled)
  );

  elements.soundToggle.setAttribute(
    "aria-label",
    state.soundEnabled ? "Turn sound off" : "Turn sound on"
  );

  if (elements.soundLabel) {
    elements.soundLabel.textContent = state.soundEnabled
      ? "SOUND ON"
      : "SOUND OFF";
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;

  writeStorage(
    APP_CONFIG.soundStorageKey,
    String(state.soundEnabled)
  );

  updateSoundButton();

  window.dispatchEvent(
    new CustomEvent("littleworld:soundchange", {
      detail: {
        enabled: state.soundEnabled
      }
    })
  );

  showToast(
    state.soundEnabled
      ? "Sound enabled ♡"
      : "Sound muted."
  );
}


/* EVENT LISTENERS */

function initializeNavigation() {
  if (elements.enterButton) {
    elements.enterButton.addEventListener("click", enterRoom);
  }

  if (elements.homeLink) {
    elements.homeLink.addEventListener("click", function (event) {
      event.preventDefault();
      returnToWelcomeScreen();
    });
  }

  if (elements.soundToggle) {
    elements.soundToggle.addEventListener("click", toggleSound);
  }

  document.addEventListener("click", function (event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const openButton = target.closest("[data-open-panel]");

    if (openButton) {
      openPanel(openButton.dataset.openPanel);
      return;
    }

    const closeButton = target.closest("[data-close-panel]");

    if (closeButton) {
      closePanel(closeButton.dataset.closePanel);
    }
  });

  if (elements.dialogCloseButton) {
    elements.dialogCloseButton.addEventListener(
      "click",
      closeMessage
    );
  }

  if (elements.messageDialog) {
    elements.messageDialog.addEventListener("click", function (event) {
      if (event.target === elements.messageDialog) {
        closeMessage();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeActivePanel();
    }
  });
}


/* SHARED API FOR OTHER FILES */

window.LittleWorld = {
  showMessage: showMessage,
  closeMessage: closeMessage,
  showToast: showToast,
  announceToScreenReader: announceToScreenReader,
  openPanel: openPanel,
  closePanel: closePanel,
  prefersReducedMotion: prefersReducedMotion,

  get soundEnabled() {
    return state.soundEnabled;
  },

  get hasEnteredRoom() {
    return state.hasEnteredRoom;
  }
};


/* START THE APPLICATION */

function initializeApp() {
  applyBirthdayTheme();
  createWelcomeDecorations();
  initializeSoundPreference();
  initializeNavigation();

  announceToScreenReader(
    "Our Little World is ready. Press Enter to visit the birthday room."
  );

  console.log("OUR LITTLE WORLD ♡ is ready!");
}

initializeApp();
