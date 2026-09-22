/* Pequenas interações; a carta e os capítulos continuam disponíveis sem JavaScript. */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // O sistema é o padrão. Apenas uma escolha explícita pode liberar movimento.
  const motionKey = "vitoria-motion";
  let motionAllowed = false;
  try {
    motionAllowed = sessionStorage.getItem(motionKey) === "full";
  } catch {}
  const reduceMotion = () => motion.matches && !motionAllowed;
  const syncMotionChoice = () => {
    if (motionAllowed) document.documentElement.dataset.motion = "full";
    else delete document.documentElement.dataset.motion;
    const toggle = $("#motion-toggle");
    if (toggle) {
      toggle.hidden = !motion.matches;
      toggle.setAttribute("aria-pressed", String(motionAllowed));
      toggle.textContent = motionAllowed
        ? "usar menos movimento"
        : "ver com animações";
    }
  };
  syncMotionChoice();
  const timers = new Set();
  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  };
  const cancelTimer = (timer) => {
    window.clearTimeout(timer);
    timers.delete(timer);
  };
  const visitedKey = "vitoria-visited";
  const hasVisited = () => {
    try {
      return sessionStorage.getItem(visitedKey) === "1";
    } catch {
      return false;
    }
  };
  const rememberVisit = () => {
    try {
      sessionStorage.setItem(visitedKey, "1");
    } catch {
      /* Navegação privada também pode entrar normalmente. */
    }
  };
  const setEntered = (entered) => {
    document.documentElement.classList.toggle("has-entered", entered);
    document.body.classList.toggle("has-entered", entered);
  };

  // Uma única explosão curta, sem fila de partículas após toques repetidos.
  const particles = $("#particles");
  const particleOrigin = particles?.parentNode;
  let lastBurst = -Infinity;
  function burstAt(element, count = 9) {
    if (!particles || reduceMotion() || document.hidden) return;
    const now = performance.now();
    if (now - lastBurst < 700 || particles.childElementCount) return;
    lastBurst = now;
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    for (let index = 0; index < Math.min(count, 10); index += 1) {
      const heart = document.createElement("span");
      const angle = (Math.PI * 2 * index) / count;
      heart.className = "particle";
      heart.textContent = index % 3 ? "♡" : "♥";
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.setProperty("--x", `${Math.cos(angle) * (42 + index * 5)}px`);
      heart.style.setProperty("--y", `${Math.sin(angle) * 55 - 46}px`);
      heart.style.setProperty("--r", `${index * 23 - 80}deg`);
      particles.append(heart);
      later(() => heart.remove(), 1150);
    }
  }
  const spread = $("#spread-love");
  spread?.addEventListener("click", () => {
    burstAt(spread);
    const status = $("#love-status");
    if (status)
      status.textContent = "Um pouquinho de todo o meu amor, só para você. ♥";
  });
  if (spread) spread.hidden = false;

  // O monograma continua sendo um link normal para o início.
  let secretCount = 0;
  $("#brand")?.addEventListener("click", () => {
    secretCount += 1;
    if (secretCount === 5) {
      const secret = $("#secret-message");
      if (secret) {
        secret.hidden = false;
        secret.textContent =
          "você encontrou um segredo. eu te amo mais do que consegui colocar nesse site.";
        const dismiss = document.createElement("button");
        dismiss.id = "close-secret";
        dismiss.type = "button";
        dismiss.className = "text-button";
        dismiss.textContent = "fechar";
        dismiss.setAttribute("aria-label", "Fechar o bilhete secreto");
        dismiss.addEventListener("click", () => {
          secret.hidden = true;
          $("#brand")?.focus({ preventScroll: true });
        });
        secret.append(dismiss);
      }
    }
  });
  $("#final-secret")?.addEventListener("click", (event) => {
    const message = $("#final-message");
    if (message) message.hidden = false;
    event.currentTarget.setAttribute("aria-expanded", "true");
    burstAt(event.currentTarget, 5);
  });
  if ($("#final-secret")) $("#final-secret").hidden = false;

  // Os motivos são details nativos: teclado, toque e versão sem script completos.
  const track = $("#reason-track");
  const cards = track ? [...track.querySelectorAll(".reason-card")] : [];
  const previous = $("#reason-prev");
  const next = $("#reason-next");
  const position = $("#reason-position");
  let cardIndex = 0;
  let trackFrame = 0;
  function updateReasonPosition() {
    trackFrame = 0;
    if (!track || !cards.length) return;
    const left = track.getBoundingClientRect().left;
    let closest = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - left);
      if (distance < closest) {
        closest = distance;
        cardIndex = index;
      }
    });
    if (position)
      position.textContent = `${String(cardIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
    // aria-disabled mantém o foco no controle depois de chegar à última lembrança.
    const maxScroll = track.scrollWidth - track.clientWidth;
    previous?.setAttribute("aria-disabled", String(track.scrollLeft <= 2));
    next?.setAttribute(
      "aria-disabled",
      String(track.scrollLeft >= maxScroll - 2),
    );
  }
  function goToCard(delta) {
    if (!track || !cards.length) return;
    const index = Math.max(0, Math.min(cards.length - 1, cardIndex + delta));
    const offset =
      cards[index].getBoundingClientRect().left -
      track.getBoundingClientRect().left;
    track.scrollTo({
      left: track.scrollLeft + offset,
      behavior: reduceMotion() ? "instant" : "smooth",
    });
  }
  if (track && cards.length) {
    previous?.addEventListener("click", () => goToCard(-1));
    next?.addEventListener("click", () => goToCard(1));
    [previous, next, position].forEach((element) => {
      if (element) element.hidden = false;
    });
    const controls = $("#reason-controls");
    if (controls) controls.hidden = false;
    track.addEventListener(
      "scroll",
      () => {
        if (!trackFrame)
          trackFrame = requestAnimationFrame(updateReasonPosition);
      },
      { passive: true },
    );
    window.addEventListener("resize", updateReasonPosition, { passive: true });
    cards.forEach((card) => {
      $("summary", card)?.addEventListener("focus", () => {
        if (track.scrollWidth > track.clientWidth + 1) {
          const offset =
            card.getBoundingClientRect().left -
            track.getBoundingClientRect().left;
          track.scrollTo({
            left: track.scrollLeft + offset,
            behavior: "instant",
          });
        }
      });
    });
    updateReasonPosition();
  }

  // Segurar é opcional. Um clique de teclado/leitor de tela ou o segundo botão
  // entrega exatamente a mesma mensagem, sem exigir força ou tempo de reação.
  const hold = $("#hold-heart");
  const simpleHeart = $("#heart-simple");
  const heartAnswer = $("#heart-answer");
  let holdPointer = null;
  let holdStart = 0;
  let holdFrame = 0;
  let heartComplete = false;
  let pointerClickUntil = 0;
  function cancelHold() {
    if (holdFrame) cancelAnimationFrame(holdFrame);
    holdFrame = 0;
    const capturedPointer = holdPointer;
    holdPointer = null;
    if (
      hold &&
      capturedPointer !== null &&
      hold.hasPointerCapture?.(capturedPointer)
    ) {
      hold.releasePointerCapture(capturedPointer);
    }
    hold?.classList.remove("is-holding");
    if (!heartComplete) hold?.style.setProperty("--hold-progress", "0");
  }
  function completeHeart() {
    if (heartComplete) return;
    heartComplete = true;
    cancelHold();
    hold?.style.setProperty("--hold-progress", "1");
    hold?.classList.add("is-complete");
    hold?.setAttribute("aria-pressed", "true");
    if (heartAnswer) {
      heartAnswer.hidden = false;
      heartAnswer.textContent = "ele já era seu mesmo. ♥";
      heartAnswer.classList.add("is-revealed");
      heartAnswer.scrollIntoView({
        block: "nearest",
        behavior: reduceMotion() ? "instant" : "smooth",
      });
    }
    if (simpleHeart) simpleHeart.setAttribute("aria-pressed", "true");
    if (hold) burstAt(hold, 6);
    if (!reduceMotion() && typeof navigator.vibrate === "function")
      navigator.vibrate(25);
  }
  function resetHeart() {
    cancelHold();
    heartComplete = false;
    hold?.style.setProperty("--hold-progress", "0");
    hold?.classList.remove("is-complete");
    hold?.setAttribute("aria-pressed", "false");
    simpleHeart?.setAttribute("aria-pressed", "false");
    if (heartAnswer) {
      heartAnswer.hidden = true;
      heartAnswer.classList.remove("is-revealed");
    }
  }
  function advanceHold(time) {
    if (holdPointer === null || document.hidden) return cancelHold();
    const progress = Math.max(0, Math.min(1, (time - holdStart) / 1500));
    hold?.style.setProperty("--hold-progress", String(progress));
    if (progress >= 1) completeHeart();
    else holdFrame = requestAnimationFrame(advanceHold);
  }
  if (hold) {
    hold.addEventListener("pointerdown", (event) => {
      if (heartComplete || !event.isPrimary || event.button !== 0) return;
      cancelHold();
      pointerClickUntil = performance.now() + 2500;
      holdPointer = event.pointerId;
      holdStart = performance.now();
      hold.classList.add("is-holding");
      try {
        hold.setPointerCapture(event.pointerId);
      } catch {
        /* Eventos globais cancelam do mesmo modo. */
      }
      holdFrame = requestAnimationFrame(advanceHold);
    });
    hold.addEventListener("pointermove", (event) => {
      if (event.pointerId !== holdPointer) return;
      const bounds = hold.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        cancelHold();
    });
    ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach(
      (type) => hold.addEventListener(type, cancelHold),
    );
    window.addEventListener("pointerup", cancelHold);
    window.addEventListener("pointercancel", cancelHold);
    window.addEventListener("blur", cancelHold);
    hold.addEventListener("click", (event) => {
      // detail === 0 cobre Enter, Espaço e a ativação de tecnologia assistiva.
      if (event.detail === 0) completeHeart();
      else if (performance.now() > pointerClickUntil) cancelHold();
    });
    simpleHeart?.addEventListener("click", completeHeart);
    simpleHeart && (simpleHeart.hidden = false);
    hold.hidden = false;
    const heartInstructions = $("#heart-instructions");
    if (heartInstructions) heartInstructions.hidden = false;
  }

  // A carta nasce no HTML e só muda de lugar durante a leitura em dialog.
  const letterButton = $("#letter-button");
  const envelope = $("#envelope-wrap");
  const fallback = $("#letter-fallback");
  const paper = $("#letter-paper");
  const letterDialog = $("#letter-dialog");
  const letterMount = letterDialog && $(".letter-mount", letterDialog);
  let letterState = "closed";
  let letterTimers = [];
  let letterOrigin = null;
  let letterTrigger = null;
  let scrollState = null;
  function lockScroll() {
    if (scrollState) return;
    scrollState = {
      y: window.scrollY,
      bodyOverflow: document.body.style.overflow,
      rootOverflow: document.documentElement.style.overflow,
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  function unlockScroll() {
    if (!scrollState) return;
    const previousScroll = scrollState;
    scrollState = null;
    document.body.style.overflow = previousScroll.bodyOverflow;
    document.documentElement.style.overflow = previousScroll.rootOverflow;
    window.scrollTo({ top: previousScroll.y, behavior: "instant" });
  }
  function clearLetterSequence() {
    letterTimers.forEach(cancelTimer);
    letterTimers = [];
    envelope?.classList.remove(
      "is-opening",
      "seal-broken",
      "flap-open",
      "letter-rising",
    );
    letterButton?.removeAttribute("aria-busy");
  }
  function restorePaper() {
    if (paper && letterOrigin?.parentNode)
      letterOrigin.parentNode.insertBefore(paper, letterOrigin.nextSibling);
  }
  function finishClosingLetter(restoreFocus = true) {
    cancelHold();
    clearLetterSequence();
    particles?.replaceChildren();
    if (particles && particleOrigin) particleOrigin.append(particles);
    restorePaper();
    letterState = "closed";
    letterButton?.setAttribute("aria-expanded", "false");
    unlockScroll();
    if (restoreFocus && letterTrigger?.isConnected)
      letterTrigger.focus({ preventScroll: true });
  }
  function closeLetter(restoreFocus = true) {
    if (letterState === "closed") return;
    if (letterDialog?.open) letterDialog.close();
    finishClosingLetter(restoreFocus);
  }
  function showLetter() {
    if (letterState !== "opening") return;
    try {
      letterMount.append(paper);
      if (particles) letterDialog.append(particles);
      letterDialog.showModal();
      lockScroll();
      letterState = "open";
      letterButton.setAttribute("aria-expanded", "true");
      letterButton.removeAttribute("aria-busy");
      letterDialog.scrollTop = 0;
      $("#letter-salutation")?.focus({ preventScroll: true });
    } catch {
      finishClosingLetter(false);
      letterButton.hidden = true;
      fallback.hidden = false;
      fallback.open = true;
      $("#letter-salutation")?.focus();
    }
  }
  function openLetter() {
    if (letterState !== "closed") return;
    // Safari não foca botões ao clicar. O destino de retorno é o acionador real.
    letterTrigger = letterButton;
    letterState = "opening";
    letterButton.setAttribute("aria-busy", "true");
    envelope?.classList.add("is-opening");
    if (reduceMotion()) return showLetter();
    letterTimers = [
      later(() => envelope?.classList.add("seal-broken"), 130),
      later(() => envelope?.classList.add("flap-open"), 340),
      later(() => envelope?.classList.add("letter-rising"), 650),
      later(showLetter, 1050),
    ];
  }
  if (
    letterButton &&
    fallback &&
    paper &&
    letterMount &&
    typeof letterDialog.showModal === "function"
  ) {
    letterOrigin = document.createComment(
      "posição original da carta, disponível sem JavaScript",
    );
    paper.before(letterOrigin);
    letterButton.addEventListener("click", openLetter);
    $("#close-letter")?.addEventListener("click", () => closeLetter());
    letterDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeLetter();
    });
    letterDialog.addEventListener("close", () => {
      if (letterState !== "closed") finishClosingLetter();
    });
    letterDialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = [
        ...letterDialog.querySelectorAll(
          "button:not([disabled]), a[href], input:not([disabled]), [tabindex='0']",
        ),
      ].filter((element) => !element.hidden && element.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !focusable.includes(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    fallback.hidden = true;
    letterButton.hidden = false;
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && letterState === "opening") {
      event.preventDefault();
      closeLetter();
    }
  });

  // Opcional: só existe player quando o autor fornece uma faixa local.
  const music = $("#music");
  const musicToggle = $("#music-toggle");
  const musicStatus = $("#music-status");
  let musicWanted = false;
  let musicVersion = 0;
  let musicFrame = 0;
  let musicResumeAfterVisibility = false;
  function stopMusicFade() {
    if (musicFrame) cancelAnimationFrame(musicFrame);
    musicFrame = 0;
  }
  function updateMusicButton() {
    if (!musicToggle) return;
    musicToggle.setAttribute(
      "aria-pressed",
      String(musicWanted && !music.paused),
    );
    musicToggle.setAttribute(
      "aria-label",
      musicWanted ? "Pausar música" : "Tocar música",
    );
    const label = $(".music-label", musicToggle);
    if (label)
      label.textContent = musicWanted ? "pausar música" : "tocar música";
  }
  function failMusic() {
    musicWanted = false;
    musicVersion += 1;
    stopMusicFade();
    music?.pause();
    updateMusicButton();
    if (musicStatus)
      musicStatus.textContent =
        "A música não pôde tocar agora. Você pode tentar novamente; o carinho continua por aqui.";
  }
  function fadeMusic() {
    stopMusicFade();
    const start = performance.now();
    const tick = (time) => {
      if (!musicWanted || music.paused || document.hidden) return;
      // O timestamp do primeiro frame pode anteceder performance.now() por milissegundos.
      music.volume = Math.max(
        0,
        Math.min(0.18, ((time - start) / 2000) * 0.18),
      );
      if (time - start < 2000) musicFrame = requestAnimationFrame(tick);
      else musicFrame = 0;
    };
    musicFrame = requestAnimationFrame(tick);
  }
  const hasAudioSource =
    music &&
    (music.getAttribute("src")?.trim() ||
      [...music.querySelectorAll("source[src]")].some((source) =>
        source.getAttribute("src").trim(),
      ));
  if (music && musicToggle && hasAudioSource) {
    music.volume = 0;
    musicToggle.addEventListener("click", () => {
      if (musicWanted) {
        musicWanted = false;
        musicVersion += 1;
        musicResumeAfterVisibility = false;
        stopMusicFade();
        music.pause();
        if (musicStatus) musicStatus.textContent = "Música pausada.";
        updateMusicButton();
        return;
      }
      musicWanted = true;
      const request = ++musicVersion;
      music.volume = 0;
      if (musicStatus) musicStatus.textContent = "Preparando a música…";
      updateMusicButton();
      // play() permanece dentro do gesto; a animação visual não adia a permissão.
      try {
        const promise = music.play();
        Promise.resolve(promise)
          .then(() => {
            if (request !== musicVersion || !musicWanted) return;
            if (musicStatus)
              musicStatus.textContent = "Música tocando baixinho.";
            updateMusicButton();
            fadeMusic();
          })
          .catch(() => {
            if (request === musicVersion) failMusic();
          });
      } catch {
        failMusic();
      }
    });
    music.addEventListener("error", failMusic);
    music.addEventListener("pause", () => {
      if (musicWanted && !music.ended) {
        musicWanted = false;
        musicVersion += 1;
        musicResumeAfterVisibility = false;
      }
      stopMusicFade();
      updateMusicButton();
    });
    music.addEventListener("ended", () => {
      musicWanted = false;
      stopMusicFade();
      updateMusicButton();
    });
    musicToggle.hidden = false;
    updateMusicButton();
  }

  // Movimentos ornamentais jamais determinam se um texto pode ser lido.
  const note = $(".love-note");
  const precisePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let noteFrame = 0;
  let noteOffset = { x: 0, y: 0 };
  function resetNote() {
    if (noteFrame) cancelAnimationFrame(noteFrame);
    noteFrame = 0;
    note?.style.setProperty("--note-x", "0px");
    note?.style.setProperty("--note-y", "0px");
  }
  note?.addEventListener(
    "pointermove",
    (event) => {
      if (reduceMotion() || !precisePointer.matches || document.hidden) return;
      const bounds = note.getBoundingClientRect();
      noteOffset = {
        x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 6,
        y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 6,
      };
      if (!noteFrame)
        noteFrame = requestAnimationFrame(() => {
          noteFrame = 0;
          note.style.setProperty("--note-x", `${noteOffset.x}px`);
          note.style.setProperty("--note-y", `${noteOffset.y}px`);
        });
    },
    { passive: true },
  );
  note?.addEventListener("pointerleave", resetNote);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => observer.observe(element));
  }

  // A abertura é a última melhoria instalada. Nenhuma classe esconde a página base.
  const intro = $("#intro");
  let introTimer = 0;
  let introLeaving = false;
  function finishIntro(focusHero = false) {
    cancelTimer(introTimer);
    introTimer = 0;
    introLeaving = false;
    if (intro?.open) intro.close();
    intro?.classList.remove("is-leaving");
    document.body.classList.remove("intro-open");
    unlockScroll();
    setEntered(true);
    rememberVisit();
    if (focusHero && !location.hash) {
      const heading = $("#inicio h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }
  function leaveIntro(immediate = false) {
    if (!intro?.open || introLeaving) return;
    introLeaving = true;
    rememberVisit();
    if (immediate || reduceMotion()) return finishIntro(true);
    // A cortina revela o hero enquanto suas linhas começam a entrar.
    setEntered(true);
    intro.classList.add("is-leaving");
    // animationend é o caminho normal; o timer cobre CSS/animação indisponível.
    introTimer = later(() => finishIntro(true), 1000);
  }
  function openIntro(replay = false) {
    if (!intro || typeof intro.showModal !== "function")
      return setEntered(true);
    if (!replay && (location.hash || hasVisited())) return finishIntro();
    try {
      setEntered(false);
      intro.classList.remove("is-leaving");
      introLeaving = false;
      intro.showModal();
      lockScroll();
      document.body.classList.add("intro-open");
      rememberVisit();
      $(reduceMotion() ? "#enter" : "#skip-intro")?.focus({
        preventScroll: true,
      });
    } catch {
      finishIntro();
    }
  }
  if (intro) {
    intro.addEventListener("animationend", (event) => {
      if (
        event.target === intro &&
        event.animationName === "curtain" &&
        introLeaving
      )
        finishIntro(true);
    });
    $("#enter")?.addEventListener("click", () => leaveIntro());
    $("#skip-intro")?.addEventListener("click", () => leaveIntro(true));
    intro.addEventListener("cancel", (event) => {
      event.preventDefault();
      finishIntro(true);
    });
    intro.addEventListener("close", () => {
      if (document.body.classList.contains("intro-open")) finishIntro();
    });
  }
  function replayIntro() {
    closeLetter(false);
    cancelTimer(introTimer);
    resetHeart();
    cards.forEach((card) => {
      card.open = false;
    });
    const surprise = $("#surprise");
    if (surprise) surprise.open = false;
    particles?.replaceChildren();
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    openIntro(true);
  }
  [$("#replay"), $("#replay-entry")].forEach((button) => {
    if (!button) return;
    button.addEventListener("click", replayIntro);
    button.hidden = false;
  });
  window.addEventListener("hashchange", () => {
    closeLetter(false);
    if (intro?.open) finishIntro();
    if (location.hash) {
      let id;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      closeLetter(false);
      if (intro?.open) finishIntro();
    }
  });
  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("is-page-hidden", document.hidden);
    if (document.hidden) {
      cancelHold();
      if (letterState === "opening") closeLetter(false);
      resetNote();
      particles?.replaceChildren();
      stopMusicFade();
      // A música escolhida pode continuar; ao voltar, não se chama play() novamente.
      musicResumeAfterVisibility = !!(musicWanted && music && !music.paused);
    } else if (
      musicResumeAfterVisibility &&
      musicWanted &&
      music &&
      !music.paused
    ) {
      music.volume = 0.18;
      musicResumeAfterVisibility = false;
    }
  });
  const onMotionChange = () => {
    syncMotionChoice();
    cancelHold();
    resetNote();
    particles?.replaceChildren();
    if (reduceMotion() && introLeaving) finishIntro(true);
    if (reduceMotion() && letterState === "opening") {
      clearLetterSequence();
      showLetter();
    }
    updateReasonPosition();
  };
  if (motion.addEventListener)
    motion.addEventListener("change", onMotionChange);
  else motion.addListener(onMotionChange);
  $("#motion-toggle")?.addEventListener("click", () => {
    motionAllowed = !motionAllowed;
    try {
      if (motionAllowed) sessionStorage.setItem(motionKey, "full");
      else sessionStorage.removeItem(motionKey);
    } catch {
      /* A escolha também funciona sem armazenamento. */
    }
    onMotionChange();
  });
  openIntro();
})();
