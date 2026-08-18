const spreadLoveButton = document.querySelector("#spread-love");
const heartBurst = document.querySelector("#heart-burst");
const letterButton = document.querySelector("#letter-button");
const envelopeWrap = document.querySelector("#envelope-wrap");
const letter = document.querySelector("#letter");

let burstTimer;

spreadLoveButton.addEventListener("click", () => {
  window.clearTimeout(burstTimer);
  heartBurst.classList.remove("is-active");
  window.requestAnimationFrame(() => heartBurst.classList.add("is-active"));
  burstTimer = window.setTimeout(() => heartBurst.classList.remove("is-active"), 2600);
});

letterButton.addEventListener("click", () => {
  const isOpen = envelopeWrap.classList.toggle("is-open");
  letterButton.setAttribute("aria-expanded", String(isOpen));
  letter.setAttribute("aria-hidden", String(!isOpen));
  letterButton.querySelector(".button-label").textContent = isOpen
    ? "Guardar a cartinha"
    : "Abrir a cartinha";
  letterButton.querySelector(".button-icon").textContent = isOpen ? "↑" : "♥";
});

