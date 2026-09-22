const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, webkit } = require("playwright");

const BASE = process.env.VICK_URL || "http://127.0.0.1:4175/Vick-10_08/";
fs.mkdirSync(path.join(__dirname, "../test-results"), { recursive: true });
const results = [];
const failures = [];
const sleep = (page, ms) => page.waitForTimeout(ms);
// Silêncio PCM é apenas uma mídia de teste em memória; nunca vai para o site.
const wav = Buffer.alloc(44 + 16000 * 2 * 4);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24);
wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(wav.length - 44, 40);

async function check(browser, engine, name, action, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const scriptErrors = [];
  page.on("pageerror", (error) => scriptErrors.push(error.message));
  try {
    await action(page, context);
    assert.deepEqual(scriptErrors, [], "no uncaught script errors");
    results.push(`${engine}: ${name}`);
    process.stdout.write(`PASS ${engine}: ${name}\n`);
  } catch (error) {
    failures.push({ engine, name, error: error.stack });
    process.stdout.write(
      `FAIL ${engine}: ${name}: ${error.message.split("\n")[0]}\n`,
    );
  } finally {
    await context.close();
  }
}

(async () => {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch({ headless: true });
    await check(
      browser,
      engine,
      "first visit, immediate keyboard skip, return and intentional replay",
      async (page) => {
        await page.goto(BASE);
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          true,
        );
        await page.locator("#skip-intro").click();
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          false,
        );
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "hero-title",
        );
        await page.reload();
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          false,
        );
        await page.locator("#replay").click();
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          true,
        );
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          false,
        );
        assert.equal(
          await page.evaluate(() => document.body.style.overflow),
          "",
        );
      },
    );
    await check(
      browser,
      engine,
      "direct letter anchor, modal focus trap, Escape and repeated reading",
      async (page) => {
        await page.goto(`${BASE}#cartinha`);
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          false,
        );
        for (let turn = 0; turn < 3; turn += 1) {
          await page.locator("#letter-button").click();
          assert.equal(
            await page.locator("#letter-dialog").evaluate((node) => node.open),
            true,
          );
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            "letter-salutation",
          );
          await page.keyboard.press("Shift+Tab");
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            "heart-simple",
          );
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            "close-letter",
          );
          await page.keyboard.press("Escape");
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            "letter-button",
          );
          assert.equal(
            await page.locator("#letter-fallback #letter-paper").count(),
            1,
          );
          assert.equal(
            await page.evaluate(() => document.body.style.overflow),
            "",
          );
        }
      },
    );
    await check(
      browser,
      engine,
      "short hold, pointercancel, lost focus and full hold",
      async (page) => {
        await page.goto(`${BASE}#cartinha`);
        await page.locator("#letter-button").click();
        const hold = page.locator("#hold-heart");
        await hold.scrollIntoViewIfNeeded();
        const bounds = await hold.boundingBox();
        const point = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        };
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        await sleep(page, 250);
        await page.mouse.up();
        await sleep(page, 1600);
        assert.equal(await page.locator("#heart-answer").isVisible(), false);
        assert.equal(
          await hold.evaluate((node) =>
            node.style.getPropertyValue("--hold-progress"),
          ),
          "0",
        );
        await page.mouse.down();
        await sleep(page, 200);
        await hold.dispatchEvent("pointercancel");
        await page.mouse.up();
        await sleep(page, 1600);
        assert.equal(await page.locator("#heart-answer").isVisible(), false);
        await page.mouse.down();
        await sleep(page, 150);
        await page.locator("#heart-simple").focus();
        await page.mouse.up();
        assert.equal(
          await hold.evaluate((node) => node.classList.contains("is-holding")),
          false,
        );
        await hold.scrollIntoViewIfNeeded();
        const endBounds = await hold.boundingBox();
        await page.mouse.move(
          endBounds.x + endBounds.width / 2,
          endBounds.y + endBounds.height / 2,
        );
        await page.mouse.down();
        await sleep(page, 1700);
        await page.mouse.up();
        assert.equal(await page.locator("#heart-answer").isVisible(), true);
        assert.equal(await hold.getAttribute("aria-pressed"), "true");
        assert.equal(
          await page.locator("#heart-answer").textContent(),
          "ele já era seu mesmo. ♥",
        );
        await page.keyboard.press("Escape");
        await page.locator("#letter-button").click();
        assert.equal(await page.locator("#heart-answer").isVisible(), true);
      },
    );
    await check(
      browser,
      engine,
      "keyboard alternative, all reason cards and both secrets",
      async (page) => {
        await page.goto(`${BASE}#cartinha`);
        await page.locator("#letter-button").click();
        await page.locator("#hold-heart").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#heart-answer").isVisible(), true);
        await page.keyboard.press("Escape");
        for (const card of await page.locator(".reason-card").all()) {
          await card.locator("summary").focus();
          await page.keyboard.press("Enter");
          assert.equal(await card.evaluate((node) => node.open), true);
          assert.equal(await card.locator(".reason-extra").isVisible(), true);
        }
        for (let click = 0; click < 5; click += 1)
          await page.locator("#brand").click();
        assert.equal(await page.locator("#secret-message").isVisible(), true);
        assert.equal(await page.evaluate(() => location.hash), "#inicio");
        await page.locator("#close-secret").click();
        await page.locator("#final-secret").click();
        assert.equal(await page.locator("#final-message").isVisible(), true);
        assert.equal(await page.locator("#music-toggle").isVisible(), false);
      },
    );
    await check(
      browser,
      engine,
      "JavaScript unavailable: text, details and letter remain reachable",
      async (page) => {
        await page.goto(`${BASE}#cartinha`);
        assert.equal(await page.locator("#intro").isVisible(), false);
        assert.equal(await page.locator("#letter-button").isVisible(), false);
        await page.locator("#letter-fallback > summary").click();
        assert.equal(await page.locator("#letter-paper").isVisible(), true);
        assert.match(
          await page.locator(".personal-letter").textContent(),
          /Obrigado por existir do seu jeito/,
        );
        for (const card of await page.locator(".reason-card").all()) {
          await card.locator("summary").click();
          assert.equal(await card.locator(".reason-extra").isVisible(), true);
        }
      },
      { javaScriptEnabled: false },
    );
    await check(
      browser,
      engine,
      "opening animation can be cancelled and a hash bypasses introduction",
      async (page) => {
        await page.goto(`${BASE}#cartinha`);
        await page.locator("#letter-button").click();
        await sleep(page, 200);
        await page.keyboard.press("Escape");
        await sleep(page, 1100);
        assert.equal(
          await page.locator("#letter-dialog").evaluate((node) => node.open),
          false,
        );
        assert.equal(
          await page.locator("#envelope-wrap").getAttribute("class"),
          "envelope-wrap",
        );
        await page.locator("#replay").click();
        await page.evaluate(() => {
          location.hash = "cartinha";
        });
        await sleep(page, 100);
        assert.equal(
          await page.locator("#intro").evaluate((node) => node.open),
          false,
        );
        await page.locator("#letter-button").click();
        await sleep(page, 1200);
        assert.equal(
          await page.locator("#letter-dialog").evaluate((node) => node.open),
          true,
        );
      },
      { reducedMotion: "no-preference" },
    );
    await check(
      browser,
      engine,
      "optional audio: explicit play, quiet fade, pause and replay remain paused",
      async (page, context) => {
        // WebKit para Windows não decodifica WAV neste ambiente. Aqui validamos
        // estados com um adaptador; Chromium usa o decodificador de áudio real.
        if (engine === "webkit")
          await context.addInitScript(() => {
            Object.defineProperty(HTMLMediaElement.prototype, "paused", {
              get() {
                return this._paused !== false;
              },
            });
            HTMLMediaElement.prototype.play = function () {
              this._paused = false;
              return Promise.resolve();
            };
            HTMLMediaElement.prototype.pause = function () {
              this._paused = true;
              this.dispatchEvent(new Event("pause"));
            };
          });
        await context.route(BASE, async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            body: (await response.text()).replace(
              '<audio id="music"',
              '<audio src="fixture.wav" id="music"',
            ),
          });
        });
        await context.route("**/fixture.wav", (route) =>
          route.fulfill({ contentType: "audio/wav", body: wav }),
        );
        await page.goto(`${BASE}#inicio`);
        const toggle = page.locator("#music-toggle");
        assert.equal(await toggle.isVisible(), true);
        assert.equal(
          await page.locator("#music").evaluate((node) => node.paused),
          true,
        );
        await toggle.click();
        await page.waitForFunction(
          () => document.querySelector("#music").volume >= 0.179,
          { timeout: 10000 },
        );
        assert.equal(
          await page.locator("#music").evaluate((node) => node.paused),
          false,
        );
        assert.equal(
          await page.locator("#music").evaluate((node) => node.volume),
          0.18,
        );
        assert.equal(await toggle.getAttribute("aria-pressed"), "true");
        await toggle.click();
        await page.locator("#replay").click();
        await page.locator("#enter").click();
        await sleep(page, 200);
        assert.equal(
          await page.locator("#music").evaluate((node) => node.paused),
          true,
        );
        assert.equal(await toggle.getAttribute("aria-pressed"), "false");
      },
    );
    await check(
      browser,
      engine,
      "optional audio missing file has a polite retry state",
      async (page, context) => {
        await context.route(BASE, async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            body: (await response.text()).replace(
              '<audio id="music"',
              '<audio src="missing-test.wav" id="music"',
            ),
          });
        });
        await context.route("**/missing-test.wav", (route) =>
          route.fulfill({ status: 404, body: "" }),
        );
        await page.goto(`${BASE}#inicio`);
        await page.locator("#music-toggle").click();
        await page.waitForFunction(() =>
          document
            .querySelector("#music-status")
            .textContent.includes("não pôde"),
        );
        assert.equal(
          await page.locator("#music-toggle").getAttribute("aria-pressed"),
          "false",
        );
        assert.equal(
          await page.locator("#music").evaluate((node) => node.paused),
          true,
        );
      },
    );
    await browser.close();
  }
  fs.writeFileSync(
    path.join(__dirname, "../test-results/interactions.json"),
    JSON.stringify(
      { base: BASE, time: new Date().toISOString(), passed: results, failures },
      null,
      2,
    ),
  );
  process.stdout.write(
    `\n${results.length} passed; ${failures.length} failed.\n`,
  );
  if (failures.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
