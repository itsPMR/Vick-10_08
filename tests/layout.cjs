const { chromium, webkit } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const output = path.resolve(__dirname, "../test-results/layout");
fs.mkdirSync(output, { recursive: true });
const axePath = require.resolve("axe-core/axe.min.js");
const url = process.env.VICK_URL || "http://127.0.0.1:4175/Vick-10_08/";
const report = {
  url,
  at: new Date().toISOString(),
  conditions: "Desktop headless browser emulation, not physical iPhone",
  scenarios: [],
  defects: [],
};
async function axe(page) {
  await page.addScriptTag({ path: axePath });
  return await page.evaluate(async () => {
    const result = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
    });
    return {
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
          html: n.html,
        })),
      })),
      incomplete: result.incomplete.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      passCount: result.passes.length,
    };
  });
}
async function layout(page) {
  return page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    overflowNodes: [...document.querySelectorAll("body *")]
      .filter((el) => {
        if (el.closest(".reason-track,dialog:not([open]),[hidden],.sr-only"))
          return false;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width &&
          r.height &&
          s.visibility !== "hidden" &&
          s.display !== "none" &&
          (r.right > innerWidth + 1 || r.left < -1)
        );
      })
      .map((el) => ({
        selector: el.id ? "#" + el.id : el.className,
        node: el.tagName,
        text: el.textContent.trim().slice(0, 60),
        left: Math.round(el.getBoundingClientRect().left),
        right: Math.round(el.getBoundingClientRect().right),
      })),
    musicHidden: document.querySelector("#music-toggle").hidden,
    letterCount: document.querySelectorAll(".personal-letter").length,
  }));
}
async function runScenario(browser, name, options = {}) {
  const context = await browser.newContext({
    reducedMotion: "no-preference",
    ...options,
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    failed.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  if (options.javaScriptEnabled !== false)
    await page.addInitScript(() =>
      sessionStorage.setItem("vitoria-visited", "1"),
    );
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  const result = { name, options, layout: await layout(page), errors, failed };
  await page.screenshot({
    path: path.join(output, name + "-full.png"),
    fullPage: true,
  });
  for (const selector of ["#inicio", "#memorias", "#motivos", "#cartinha"]) {
    await page
      .locator(selector)
      .screenshot({
        path: path.join(output, name + "-" + selector.slice(1) + ".png"),
      });
  }
  if (options.javaScriptEnabled === false) {
    await page.locator("#letter-fallback > summary").click();
    result.noJS = {
      letterVisible: await page.locator(".personal-letter").isVisible(),
      introVisible: await page.locator("#intro").isVisible(),
      reasons: await page.locator(".reason-card").count(),
    };
    await page
      .locator("#letter-fallback")
      .screenshot({ path: path.join(output, name + "-letter.png") });
    // execute injected audit code despite app JS being disabled by reading the DOM via Playwright evaluate.
  } else {
    result.axe = await axe(page);
    result.reasonStates = [];
    for (let i = 0; i < 6; i++) {
      const card = page.locator(".reason-card").nth(i);
      await card.locator("summary").focus();
      await page.keyboard.press("Enter");
      result.reasonStates.push({
        index: i + 1,
        open: await card.evaluate((e) => e.open),
        extraVisible: await card.locator(".reason-extra").isVisible(),
      });
    }
    if (name.includes("390") || name.includes("768"))
      await page
        .locator("#motivos")
        .screenshot({ path: path.join(output, name + "-cards-open.png") });
    await page.locator("#letter-button").click();
    await page.waitForTimeout(options.reducedMotion === "reduce" ? 150 : 1200);
    result.modal = {
      open: await page.locator("#letter-dialog").evaluate((e) => e.open),
      focus: await page.evaluate(() => document.activeElement.id),
      layout: await layout(page),
    };
    result.modal.axe = await axe(page);
    await page.screenshot({ path: path.join(output, name + "-modal-top.png") });
    await page.locator("#heart-simple").focus();
    await page.screenshot({
      path: path.join(output, name + "-modal-bottom.png"),
    });
    result.modal.focusInside = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      result.modal.focusInside.push(
        await page.evaluate(() =>
          document
            .querySelector("#letter-dialog")
            .contains(document.activeElement),
        ),
      );
    }
    await page.keyboard.press("Escape");
    result.modal.returnFocus = await page.evaluate(
      () => document.activeElement.id,
    );
  }
  if (
    result.layout.overflow ||
    result.axe?.violations.length ||
    result.modal?.axe?.violations.length ||
    errors.length ||
    failed.length
  ) {
    report.defects.push({
      name,
      overflow: result.layout.overflow,
      violations: result.axe?.violations,
      modalViolations: result.modal?.axe?.violations,
      errors,
      failed,
    });
    process.exitCode = 1;
  }
  report.scenarios.push(result);
  console.log(
    name,
    JSON.stringify({
      overflow: result.layout.overflow,
      violations: result.axe?.violations.length,
      modalViolations: result.modal?.axe?.violations.length,
      errors,
      failed,
    }),
  );
  fs.writeFileSync(
    path.join(__dirname, "../test-results/layout.json"),
    JSON.stringify(report, null, 2),
  );
  await context.close();
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [name, w, h] of [
    ["chromium-360", 360, 800],
    ["chromium-390", 390, 844],
    ["chromium-768", 768, 1024],
    ["chromium-1440", 1440, 1000],
    ["chromium-landscape", 844, 390],
    ["chromium-200pct-reflow", 720, 500],
  ])
    await runScenario(browser, name, {
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
    });
  await runScenario(browser, "chromium-reduced-390", {
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await runScenario(browser, "chromium-nojs-390", {
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  await browser.close();
  try {
    const safari = await webkit.launch({ headless: true });
    await runScenario(safari, "webkit-390", {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await safari.close();
  } catch (e) {
    report.webkitError = e.message;
  }
  fs.writeFileSync(
    path.join(__dirname, "../test-results/layout.json"),
    JSON.stringify(report, null, 2),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
