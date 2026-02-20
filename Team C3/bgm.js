(() => {
  const AUDIO_SRC = "Sound/bgm.mp3";
  const KEY_ENABLED = "bgmEnabled"; // "1" or "0"
  const KEY_TIME = "bgmTime";       // seconds (string)

  // default ON
  if (localStorage.getItem(KEY_ENABLED) === null) {
    localStorage.setItem(KEY_ENABLED, "1");
  }

  const audio = new Audio(AUDIO_SRC);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.5;

  // restore time
  const savedTime = parseFloat(localStorage.getItem(KEY_TIME) || "0");
  if (!Number.isNaN(savedTime) && savedTime > 0) {
    audio.addEventListener("loadedmetadata", () => {
      try {
        // clamp to duration
        const t = Math.min(savedTime, Math.max(0, (audio.duration || savedTime) - 0.1));
        audio.currentTime = t;
      } catch (_) {}
    }, { once: true });
  }

  function isEnabled() {
    return localStorage.getItem(KEY_ENABLED) === "1";
  }

  function setEnabled(v) {
    localStorage.setItem(KEY_ENABLED, v ? "1" : "0");
  }

  function updateButton(btn) {
    if (isEnabled()) {
      btn.classList.remove("off");
      btn.title = "BGM: ON";
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = "♪";
    } else {
      btn.classList.add("off");
      btn.title = "BGM: OFF";
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = "🔇";
    }
  }

  async function tryPlay() {
    if (!isEnabled()) return;
    try {
      await audio.play();
    } catch (_) {
      // Autoplay blocked; will retry on user gesture
    }
  }

  function stop() {
    try {
      audio.pause();
    } catch (_) {}
  }

  // Create toggle button (top-right)
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bgm-toggle";
  btn.setAttribute("aria-label", "BGM on/off");
  btn.setAttribute("aria-pressed", "true");
  updateButton(btn);

  btn.addEventListener("click", async () => {
    const next = !isEnabled();
    setEnabled(next);
    updateButton(btn);

    if (next) {
      await tryPlay();
    } else {
      stop();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(btn);
    // try immediately
    tryPlay();

    // ensure play after first user interaction if blocked
    const resume = async () => {
      await tryPlay();
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
    };
    document.addEventListener("pointerdown", resume);
    document.addEventListener("keydown", resume);
  });

  // save time on leaving page
  window.addEventListener("beforeunload", () => {
    try {
      if (!audio.paused && !Number.isNaN(audio.currentTime)) {
        localStorage.setItem(KEY_TIME, String(audio.currentTime));
      }
    } catch (_) {}
  });
})();
