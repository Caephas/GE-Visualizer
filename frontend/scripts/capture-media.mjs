/**
 * Captures the README media: a step-through GIF and a dashboard PNG.
 *
 * Requires a built preview server and Google Chrome:
 *   npm run build && npm run preview      # serve dist on :4173
 *   npm run capture:media                 # writes /tmp/ge-frames + /tmp/ge-dashboard.png
 *
 * Set CHROME_PATH to use a different browser binary. Assemble the GIF with the
 * ffmpeg command in the README's "See it in action" note, or:
 *   ffmpeg -framerate 2 -i /tmp/ge-frames/f%02d.png -vf \
 *     "scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     docs/assets/ge-visualizer.gif
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = process.env.APP_URL || "http://localhost:4173/";
const framesDir = "/tmp/ge-frames";

const GRAMMAR = "<start> ::= <char> | <char> <start>\n<char> ::= a | b | c";
const PARAMS = JSON.stringify({
  codon_size: 400,
  bits_per_codon: 8,
  consumption: "eager",
  max_depth: 40,
  genome_representation: "codons",
  wrap: false,
});
const GENOME = "1,0,1,1,1,2,1,0,1,1,0,2";
const url = (step) =>
  `${base}?grammar=${encodeURIComponent(GRAMMAR)}&genome=${GENOME}` +
  `&params=${encodeURIComponent(PARAMS)}&step=${step}&len=12`;

const waitFor = (page, fn, timeoutMs, label) => {
  const start = Date.now();
  return (async () => {
    for (;;) {
      if (await page.evaluate(fn)) return;
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  })();
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

// ---- GIF: step through the derivation -------------------------------------
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const gifPage = await browser.newPage();
await gifPage.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await gifPage.goto(url(-1), { waitUntil: "domcontentloaded", timeout: 60000 });
await waitFor(
  gifPage,
  () => !document.querySelector(".engine-banner") && !!document.querySelector(".tree-node-group"),
  120000,
  "engine + first tree",
);
await gifPage.screenshot({ path: path.join(framesDir, "f00.png") });

for (let step = 1; step <= 12; step += 1) {
  await gifPage.click('[aria-label="Step forward"]');
  await new Promise((r) => setTimeout(r, 350));
  await gifPage.screenshot({ path: path.join(framesDir, `f${String(step).padStart(2, "0")}.png`) });
}
console.log("captured 13 GIF frames");

// ---- PNG: dashboard with a finished run -----------------------------------
const shotPage = await browser.newPage();
await shotPage.setViewport({ width: 1600, height: 1150, deviceScaleFactor: 1 });
await shotPage.goto(url(11), { waitUntil: "domcontentloaded", timeout: 60000 });
await waitFor(
  shotPage,
  () => !document.querySelector(".engine-banner") && !!document.querySelector(".tree-node-group"),
  120000,
  "engine + tree",
);
await waitFor(
  shotPage,
  () => {
    const button = document.querySelector(".button-evo");
    return !!button && !button.disabled;
  },
  60000,
  "run button",
);
await shotPage.click(".button-evo");
await waitFor(shotPage, () => !!document.querySelector(".evo-summary"), 180000, "evolution results");

const layout = await shotPage.evaluate(() => {
  const panel = document.querySelector(".evolution-panel")?.getBoundingClientRect();
  return { viewport: window.innerHeight, evolutionBottom: panel ? Math.round(panel.bottom) : null };
});
console.log("layout:", JSON.stringify(layout));

await shotPage.screenshot({ path: "/tmp/ge-dashboard.png" });
console.log("captured dashboard");

await browser.close();
