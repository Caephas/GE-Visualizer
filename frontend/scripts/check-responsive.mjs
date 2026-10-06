/**
 * Checks the app lays out correctly at phone, tablet, and desktop widths.
 *
 * The usual failure is horizontal overflow: if anything is wider than the
 * viewport, mobile Chrome widens the layout viewport and renders the whole app
 * zoomed out, which makes the text tiny and the controls hard to hit.
 *
 * Requires a built preview server:
 *   npm run build && npm run preview      # serve dist on :4173
 *   npm run check:responsive
 */
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = process.env.APP_URL ?? "http://localhost:4173/";
const GRAMMAR = "<start> ::= <char> | <char> <start>\n<char> ::= a | b | c";
const url = `${base}?grammar=${encodeURIComponent(GRAMMAR)}&genome=1,0,1,1,1,2&step=5`;

const VIEWPORTS = [
  { name: "small phone  360×740", width: 360, height: 740, mobile: true },
  { name: "phone        390×844", width: 390, height: 844, mobile: true },
  { name: "tablet       768×1024", width: 768, height: 1024, mobile: true },
  { name: "tablet land  1024×768", width: 1024, height: 768, mobile: true },
  { name: "desktop      1280×800", width: 1280, height: 800, mobile: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let failures = 0;

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: 2,
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector(".engine-banner"), { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll(".tree-node-group").length > 0, {
    timeout: 60000,
  });

  const result = await page.evaluate((referenceWidth) => {
    const overflowing = [...document.querySelectorAll("body *")]
      .filter((el) => {
        // Nodes inside an <svg> are panned/zoomed by design and clipped by the
        // tree stage, so their boxes say nothing about page layout.
        if (el.closest("svg")) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.right > referenceWidth + 1 || rect.left < -1);
      })
      .map((el) => {
        const cls = typeof el.className === "string" && el.className ? `.${el.className.split(/\s+/)[0]}` : "";
        return `${el.tagName.toLowerCase()}${cls}`;
      });
    return {
      layoutWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflowing: [...new Set(overflowing)].slice(0, 5),
    };
  }, viewport.width);

  const zoomedOut = result.layoutWidth > viewport.width + 1;
  const scrollsSideways = result.documentWidth > viewport.width + 1;
  const ok = !zoomedOut && !scrollsSideways && result.overflowing.length === 0;
  if (!ok) failures += 1;

  console.log(`${ok ? "OK  " : "FAIL"} ${viewport.name}  layout=${result.layoutWidth}px doc=${result.documentWidth}px`);
  if (!ok) {
    if (zoomedOut) console.log(`       mobile Chrome zoomed out (layout viewport ${result.layoutWidth}px)`);
    if (result.overflowing.length) console.log(`       overflowing: ${result.overflowing.join(", ")}`);
  }
  await page.close();
}

// The tour is the first thing a new visitor sees, so it has to fit a phone too.
const tourPage = await browser.newPage();
await tourPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await tourPage.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
await tourPage.waitForSelector(".tutorial-card", { timeout: 60000 });
const tour = await tourPage.evaluate(() => {
  const card = document.querySelector(".tutorial-card").getBoundingClientRect();
  const next = document.querySelector(".tutorial-next")?.getBoundingClientRect();
  return {
    left: Math.round(card.left),
    right: Math.round(card.right),
    top: Math.round(card.top),
    bottom: Math.round(card.bottom),
    nextHeight: next ? Math.round(next.height) : 0,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
});
const tourFits =
  tour.left >= -1 &&
  tour.right <= tour.viewportWidth + 1 &&
  tour.top >= -1 &&
  tour.bottom <= tour.viewportHeight + 1 &&
  tour.nextHeight >= 40;
if (!tourFits) failures += 1;
console.log(
  `${tourFits ? "OK  " : "FAIL"} tour card on 390×844  box=(${tour.left},${tour.top})-(${tour.right},${tour.bottom}) next=${tour.nextHeight}px`,
);
await tourPage.close();

await browser.close();
console.log(failures === 0 ? "\nresponsive OK" : `\n${failures} viewport(s) failed`);
process.exit(failures === 0 ? 0 : 1);
