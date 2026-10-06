/**
 * Copies the Pyodide runtime that ships in node_modules into public/pyodide/
 * so the app is fully self-contained (no CDN, works offline after load).
 *
 * Runs automatically on postinstall / predev / prebuild. Skips the copy when
 * the target already matches the installed Pyodide version.
 */
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, "..", "node_modules", "pyodide");
const target = path.join(here, "..", "public", "pyodide");

const KEEP = /^(pyodide\.mjs|pyodide\.asm\.mjs|pyodide\.asm\.wasm|python_stdlib\.zip|pyodide-lock\.json|package\.json)$/;

if (!existsSync(source)) {
  console.error("copy-pyodide: node_modules/pyodide not found — run `npm install` first.");
  process.exit(1);
}

const version = JSON.parse(await readFile(path.join(source, "package.json"), "utf8")).version;
const markerPath = path.join(target, ".version");

if (existsSync(markerPath) && (await readFile(markerPath, "utf8")).trim() === version) {
  console.log(`copy-pyodide: public/pyodide already at ${version}`);
  process.exit(0);
}

await mkdir(target, { recursive: true });
const files = (await readdir(source)).filter((name) => KEEP.test(name));
for (const name of files) {
  await cp(path.join(source, name), path.join(target, name));
}
await writeFile(markerPath, version);
console.log(`copy-pyodide: copied ${files.length} files to public/pyodide (${version})`);
