(function () {
  const root = document.documentElement;
  const enterBtn = document.getElementById("enter");
  const soundBtn = document.getElementById("sound");
  const soundLabel = soundBtn ? soundBtn.querySelector(".sound-label") : null;
  const navLinks = Array.from(document.querySelectorAll(".site-nav a[data-nav]"));
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tones = {
    hero: [174, 177, 173],
    kawaguchi: [205, 207, 203],
    entry: [187, 190, 186],
    people: [194, 196, 192],
    timeline: [174, 177, 173]
  };

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);

  const audio = document.createElement("audio");
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.35;
  audio.src = "audio/bgm.mp3";

  let audioState = "pending";
  let entered = false;

  audio.addEventListener("error", function () {
    audioState = "missing";
    if (soundBtn) soundBtn.hidden = true;
  });

  audio.addEventListener("canplay", function () {
    if (audioState !== "missing") audioState = "ready";
  });

  function setSoundLabel(on) {
    if (!soundBtn) return;
    if (soundLabel) soundLabel.textContent = on ? "SOUND ON" : "SOUND OFF";
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  async function startAudio() {
    if (audioState === "missing") return false;
    try {
      await audio.play();
      audioState = "ready";
      return true;
    } catch (err) {
      return false;
    }
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", async function () {
      if (entered) return;
      entered = true;
      root.classList.remove("is-gated");
      enterBtn.disabled = true;
      enterBtn.setAttribute("aria-hidden", "true");

      const ok = await startAudio();
      if (soundBtn) {
        if (ok && !audio.paused) {
          soundBtn.hidden = false;
          setSoundLabel(true);
        } else {
          soundBtn.hidden = true;
        }
      }
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", async function () {
      if (audioState === "missing") return;
      if (audio.paused) {
        try {
          await audio.play();
          setSoundLabel(true);
        } catch (err) {
          soundBtn.hidden = true;
        }
      } else {
        audio.pause();
        setSoundLabel(false);
      }
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (root.classList.contains("is-gated")) {
        event.preventDefault();
        return;
      }
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  const brand = document.querySelector(".nav-brand");
  if (brand) {
    brand.addEventListener("click", function (event) {
      if (root.classList.contains("is-gated")) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      document.getElementById("hero").scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  }

  function setActive(id) {
    navLinks.forEach(function (link) {
      const on = link.getAttribute("data-nav") === id;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  setActive("hero");

  if ("IntersectionObserver" in window) {
    const activeObs = new IntersectionObserver(
      function (entries) {
        const visible = entries
          .filter(function (entry) { return entry.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-36% 0px -52% 0px", threshold: [0, 0.2, 0.45, 0.7] }
    );
    chapters.forEach(function (chapter) { activeObs.observe(chapter); });

    if (!reduceMotion) {
      const revealObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            revealObs.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
      );
      document.querySelectorAll(".reveal").forEach(function (el) {
        revealObs.observe(el);
      });
    }
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  document.querySelectorAll(".frame").forEach(function (frame) {
    const img = frame.querySelector("img");
    if (!img) {
      frame.classList.add("is-placeholder");
      return;
    }

    function ready() {
      frame.classList.add("is-ready");
      frame.classList.remove("is-placeholder");
    }

    function fail() {
      img.remove();
      frame.classList.add("is-placeholder");
      frame.classList.remove("is-ready");
    }

    if (img.complete) {
      if (img.naturalWidth > 0) ready();
      else fail();
    } else {
      img.addEventListener("load", ready, { once: true });
      img.addEventListener("error", fail, { once: true });
    }
  });

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function sampleColor() {
    const focus = window.scrollY + window.innerHeight * 0.42;
    let index = 0;

    chapters.forEach(function (chapter, i) {
      if (focus >= chapter.offsetTop) index = i;
    });

    const current = tones[chapters[index].dataset.tone];
    const nextChapter = chapters[index + 1];
    if (!nextChapter) return current;

    const next = tones[nextChapter.dataset.tone];
    const edge = chapters[index].offsetTop + chapters[index].offsetHeight;
    const blend = Math.min(window.innerHeight * 0.7, 720);
    const start = edge - blend;

    if (focus <= start) return current;
    const t = Math.min(1, Math.max(0, (focus - start) / blend));
    return mix(current, next, t);
  }

  function paintGround() {
    const rgb = sampleColor();
    root.style.setProperty("--ground", "rgb(" + rgb.join(", ") + ")");
  }

  let ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      paintGround();
      ticking = false;
    });
  }, { passive: true });

  paintGround();
})();