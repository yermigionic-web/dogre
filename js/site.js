(function () {
  const root = document.documentElement;
  const enterBtn = document.getElementById("enter");
  const soundBtn = document.getElementById("sound");
  const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tones = {
    hero: [191, 193, 191],
    kawaguchi: [210, 211, 209],
    entry: [197, 198, 196],
    people: [185, 187, 185],
    timeline: [174, 176, 174]
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
  audio.addEventListener("error", function () {
    audioState = "missing";
    soundBtn.hidden = true;
  });
  audio.addEventListener("canplay", function () {
    if (audioState !== "missing") audioState = "ready";
  });

  function setSoundLabel(on) {
    soundBtn.textContent = on ? "SOUND ON" : "SOUND OFF";
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

  let entered = false;
  enterBtn.addEventListener("click", async function () {
    if (entered) return;
    entered = true;
    root.classList.remove("is-gated");
    enterBtn.disabled = true;
    enterBtn.setAttribute("aria-hidden", "true");
    const ok = await startAudio();
    if (ok && !audio.paused) {
      soundBtn.hidden = false;
      setSoundLabel(true);
    } else {
      soundBtn.hidden = true;
    }
    requestAnimationFrame(joinSpine);
  });

  soundBtn.addEventListener("click", async function () {
    if (audioState !== "ready") return;
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
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  function setActive(id) {
    navLinks.forEach(function (link) {
      const on = link.getAttribute("data-nav") === id;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  setActive("hero");

  const activeObs = new IntersectionObserver(
    function (entries) {
      const visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.25, 0.5] }
  );
  chapters.forEach(function (chapter) { activeObs.observe(chapter); });

  if (reduceMotion) {
    document.querySelectorAll(".reveal, .frame").forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    const revealObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObs.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      revealObs.observe(el);
    });
    document.querySelectorAll(".frame").forEach(function (el) {
      if (el.classList.contains("frame-hero")) return;
      el.classList.add("clip");
      revealObs.observe(el);
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
      const name = frame.querySelector(".frame-name");
      if (name) name.remove();
    }
    function fail() {
      img.remove();
      frame.classList.add("is-placeholder");
      frame.classList.remove("is-ready");
    }
    if (img.complete) {
      if (img.naturalWidth > 0) ready();
      else fail();
      return;
    }
    img.addEventListener("load", ready);
    img.addEventListener("error", fail);
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
    const blend = window.innerHeight * 0.55;
    const start = edge - blend;
    if (focus <= start) return current;
    const t = Math.min(1, (focus - start) / (blend * 1.35));
    return mix(current, next, t);
  }

  function paintGround() {
    const rgb = sampleColor();
    root.style.setProperty("--ground", "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")");
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

  const mobileQuery = window.matchMedia("(max-width: 860px)");

  function joinSpine() {
    const rule = document.querySelector(".v-rule");
    const title = document.querySelector(".person-mai h2");
    if (!rule || !title) return;
    if (mobileQuery.matches) {
      rule.style.setProperty("--spine-extra", "0px");
      return;
    }
    const from = rule.getBoundingClientRect().bottom + window.scrollY;
    const box = title.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(title).fontSize) || 16;
    const y = box.top + window.scrollY + fontSize * 0.62;
    rule.style.setProperty("--spine-extra", Math.max(0, y - from) + "px");
    const spineX = rule.getBoundingClientRect().left;
    const titleX = box.left;
    title.style.setProperty("--name-rule", Math.max(0, titleX - spineX - 20) + "px");
  }

  window.addEventListener("resize", joinSpine);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(joinSpine);
  } else {
    window.addEventListener("load", joinSpine);
  }
  joinSpine();
})();
