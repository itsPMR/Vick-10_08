const { chromium, webkit } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.VICK_URL || "http://127.0.0.1:4175/Vick-10_08/";
const results = [];
async function run(browser, engine, name, options, action) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...options,
  });
  const p = await context.newPage();
  try {
    await action(p);
    results.push({ engine, name, passed: true });
    console.log("PASS", engine, name);
  } catch (e) {
    results.push({ engine, name, passed: false, error: e.message });
    console.error("FAIL", engine, name, e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}
(async () => {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch();
    await run(
      browser,
      engine,
      "cortina revela hero antes de fechar",
      { reducedMotion: "no-preference" },
      async (p) => {
        await p.goto(base);
        await p.locator("#enter").click();
        await p.waitForTimeout(180);
        const state = await p.evaluate(() => ({
          open: document.querySelector("#intro").open,
          backdrop: getComputedStyle(
            document.querySelector("#intro"),
            "::backdrop",
          ).backgroundColor,
          hero: document
            .querySelector("#hero-title")
            .getAnimations({ subtree: true })
            .filter((a) => a.playState === "running").length,
        }));
        assert.equal(state.open, true);
        assert.equal(state.backdrop, "rgba(0, 0, 0, 0)");
        assert.equal(state.hero, 4);
        await p.waitForFunction(() => !document.querySelector("#intro").open);
        assert.equal(
          await p.evaluate(() => document.activeElement.id),
          "hero-title",
        );
        await p.locator("#replay-entry").click();
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), true);
        await p.locator("#skip-intro").click();
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
      },
    );
    await run(
      browser,
      engine,
      "movimento reduzido permanece padrão e opt-in reativa CSS e JS",
      { reducedMotion: "reduce" },
      async (p) => {
        await p.goto(base);
        assert.equal(
          await p
            .locator("#intro-title")
            .evaluate((e) => getComputedStyle(e).animationName),
          "none",
        );
        await p.locator("#motion-toggle").click();
        assert.equal(
          await p.locator("#motion-toggle").getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await p
            .locator("#intro-title")
            .evaluate((e) => getComputedStyle(e).animationName),
          "soft-in",
        );
        await p.locator("#enter").click();
        await p.waitForTimeout(160);
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), true);
        assert.equal(
          await p
            .locator("#intro")
            .evaluate((e) => getComputedStyle(e).animationName),
          "curtain",
        );
        assert.equal(
          await p
            .locator("#hero-title")
            .evaluate((e) => e.getAnimations({ subtree: true }).length),
          4,
        );
        await p.waitForFunction(() => !document.querySelector("#intro").open);
        await p.reload();
        assert.equal(
          await p.locator("html").getAttribute("data-motion"),
          "full",
        );
        await p.locator("#replay-entry").click();
        await p.locator("#motion-toggle").click();
        assert.equal(
          await p
            .locator("#intro-title")
            .evaluate((e) => getComputedStyle(e).animationName),
          "none",
        );
        await p.locator("#enter").click();
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
        assert.equal(
          await p
            .locator("#hero-title")
            .evaluate((e) => e.getAnimations({ subtree: true }).length),
          0,
        );
      },
    );
    await run(
      browser,
      engine,
      "falha da animação não prende a entrada",
      { reducedMotion: "no-preference" },
      async (p) => {
        await p.goto(base);
        await p.addStyleTag({
          content: "#intro.is-leaving{animation:none!important}",
        });
        await p.locator("#enter").click();
        await p.waitForTimeout(1100);
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
        assert.equal(await p.evaluate(() => document.body.style.overflow), "");
      },
    );
    await run(
      browser,
      engine,
      "âncora direta continua livre e escolha funciona em paisagem",
      { reducedMotion: "reduce", viewport: { width: 844, height: 390 } },
      async (p) => {
        await p.goto(base + "#cartinha");
        assert.equal(await p.locator("#intro").evaluate((e) => e.open), false);
        await p.locator("#replay-entry").click();
        assert.equal(await p.locator("#motion-toggle").isVisible(), true);
        await p.locator("#motion-toggle").click();
        assert.equal(
          await p.locator("html").getAttribute("data-motion"),
          "full",
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await p.keyboard.press("Escape");
      },
    );
    await browser.close();
  }
  fs.mkdirSync(path.join(__dirname, "../test-results"), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, "../test-results/entrance.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} passaram.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
