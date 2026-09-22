const { chromium, webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.VICK_URL || "http://127.0.0.1:4175/Vick-10_08/";
const report = [];
async function check(browser, engine, name, fn, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
    ...options,
  });
  const page = await context.newPage();
  try {
    await fn(page, context);
    report.push({ engine, name, passed: true });
    console.log("PASS", engine, name);
  } catch (error) {
    report.push({ engine, name, passed: false, error: error.message });
    process.exitCode = 1;
    console.log("FAIL", engine, name, error.message);
  } finally {
    await context.close();
  }
}
(async () => {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch();
    await check(
      browser,
      engine,
      "entrada rápida, retorno e âncoras no histórico",
      async (p) => {
        await p.goto(base);
        await p.locator("#skip-intro").click();
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
        await p.locator("#brand").click();
        await p.locator(".hero-actions a").click();
        await p.goBack();
        assert.equal(new URL(p.url()).hash, "#inicio");
        await p.goForward();
        assert.equal(new URL(p.url()).hash, "#cartinha");
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
      },
    );
    await check(
      browser,
      engine,
      "falha de JavaScript e fontes mantém leitura",
      async (p, c) => {
        await c.route("**/script.js", (r) => r.abort());
        await c.route("**/*.woff2", (r) => r.abort());
        await p.goto(base + "#cartinha");
        await p.locator("#letter-fallback > summary").click();
        assert.equal(await p.locator(".personal-letter").isVisible(), true);
        assert.equal(await p.locator("#intro").isVisible(), false);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      },
    );
    await check(
      browser,
      engine,
      "storage indisponível e sem IntersectionObserver",
      async (p, c) => {
        await c.addInitScript(() => {
          delete window.IntersectionObserver;
          Storage.prototype.getItem = () => {
            throw new Error("indisponível");
          };
          Storage.prototype.setItem = () => {
            throw new Error("indisponível");
          };
        });
        const errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(base);
        await p.locator("#skip-intro").click();
        await p.locator("#letter-button").click();
        await p.locator("#letter-dialog").waitFor({ state: "visible" });
        assert.equal(await p.locator(".personal-letter").isVisible(), true);
        assert.deepEqual(errors, []);
      },
    );
    await check(
      browser,
      engine,
      "gesto fora do coração cancela e explosões têm limite",
      async (p) => {
        await p.goto(base + "#inicio");
        await p.waitForTimeout(1400);
        await p.evaluate(() => {
          for (let n = 0; n < 30; n++)
            document.querySelector("#spread-love").click();
        });
        assert.ok((await p.locator(".particle").count()) <= 10);
        await p.waitForTimeout(1250);
        assert.equal(await p.locator(".particle").count(), 0);
        await p.locator("#letter-button").click();
        await p.locator("#letter-dialog").waitFor({ state: "visible" });
        const h = p.locator("#hold-heart");
        await h.scrollIntoViewIfNeeded();
        const r = await h.boundingBox();
        await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        await p.mouse.down();
        await p.waitForTimeout(300);
        await p.mouse.move(r.x - 20, r.y);
        await p.mouse.up();
        await p.waitForTimeout(1600);
        assert.equal(await p.locator("#heart-answer").isVisible(), false);
        assert.equal(
          await h.evaluate((e) => e.style.getPropertyValue("--hold-progress")),
          "0",
        );
      },
    );
    await check(
      browser,
      engine,
      "carta extensa rola, fecha e preserva posição",
      async (p) => {
        await p.goto(base + "#cartinha");
        await p.waitForTimeout(500);
        await p.locator("#letter-button").scrollIntoViewIfNeeded();
        const before = await p.evaluate(() => scrollY);
        await p.locator("#letter-button").click();
        await p.locator("#letter-dialog").waitFor({ state: "visible" });
        await p.evaluate(() => {
          const t = document.querySelector(".personal-letter");
          for (let n = 0; n < 6; n++) {
            const p = document.createElement("p");
            p.textContent =
              "Trecho de teste para verificar a leitura de uma carta longa. ".repeat(
                12,
              );
            t.append(p);
          }
        });
        await p.locator("#heart-simple").focus();
        assert.equal(await p.locator("#heart-simple").isVisible(), true);
        await p.keyboard.press("Escape");
        assert.ok(Math.abs((await p.evaluate(() => scrollY)) - before) < 3);
        assert.equal(
          await p.evaluate(() => document.activeElement.id),
          "letter-button",
        );
      },
    );
    if (engine === "chromium")
      await check(
        browser,
        engine,
        "conexão lenta, prefixo e sem requisições externas",
        async (p, c) => {
          const requests = [];
          p.on("request", (r) => requests.push(r.url()));
          const session = await c.newCDPSession(p);
          await session.send("Network.enable");
          await session.send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 150,
            downloadThroughput: 200000,
            uploadThroughput: 100000,
          });
          await p.goto(base + "#cartinha", { waitUntil: "networkidle" });
          await p.locator("#letter-button").click();
          await p.locator("#letter-dialog").waitFor({ state: "visible" });
          assert.equal(await p.locator(".personal-letter").isVisible(), true);
          assert.ok(requests.every((url) => url.startsWith(base)));
          assert.equal(await p.locator("#intro").isVisible(), false);
        },
      );
    await browser.close();
  }
  fs.mkdirSync(path.join(__dirname, "../test-results"), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, "../test-results/resilience.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `${report.filter((r) => r.passed).length}/${report.length} passaram.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
