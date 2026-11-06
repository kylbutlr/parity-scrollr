import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const upstream = dirname(require.resolve("app-stylr/package.json"));
const check = process.argv.includes("--check");
const manifest = JSON.parse(await readFile(join(root, "app-stylr.json"), "utf8"));
const source = JSON.parse(await readFile(join(upstream, "package.json"), "utf8"));
if (manifest.version !== source.version) throw new Error("App Stylr manifest and installed package differ");

const files = new Map();
const fonts = (await readFile(join(upstream, "adapters/css/fonts.css"), "utf8"))
  .replace(/\/\*[^]*?\*\//, `/* App Stylr v${source.version} font adapter with local extension paths. */`)
  .replaceAll("../../assets/fonts/", "fonts/");
const tokens = await readFile(join(upstream, "adapters/css/app-stylr.css"), "utf8");
files.set("theme.css", Buffer.from(`${fonts}\n${tokens}\n/* Extension document defaults. Shared values above are generated. */\n:root {\n  color: var(--ui-text);\n  background: var(--ui-canvas);\n  font-family: var(--font-sans);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n}\n:focus-visible { outline: 3px solid var(--ui-focus); outline-offset: 2px; }\nbutton, input, select, textarea { font: inherit; }\n::selection { color: var(--ui-selected-text); background: var(--ui-selected); }\ninput, textarea { caret-color: var(--ui-accent); }\n* { scrollbar-color: var(--ui-border-strong) var(--ui-canvas); scrollbar-width: thin; }\na { color: var(--ui-link); text-underline-offset: 3px; }\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }\n}\n`));
for (const name of ["Geist-Variable.woff2", "GeistMono-Variable.woff2"]) {
  files.set(`fonts/${name}`, await readFile(join(upstream, "assets/fonts", name)));
}
files.set("fonts/GEIST-LICENSE.txt", await readFile(join(upstream, "assets/fonts/LICENSE-GEIST.txt")));
const iconOutput = join(root, "dist/app-stylr-icons");
execFileSync(process.execPath, [join(upstream, "scripts/generate-icons.mjs"), "--source", join(root, "icons/icon.svg"), "--output", iconOutput], { stdio: "pipe", cwd: root });
for (const size of [16, 32, 48, 128]) files.set(`icons/icon-${size}.png`, await readFile(join(iconOutput, `chrome/icon-${size}.png`)));

// The pinned generator renders this 512px PNG directly from the SVG master.
files.set("icons/icon-512.png", await readFile(join(iconOutput, "web/icon-512.png")));

for (const [name, content] of files) {
  const target = join(root, name);
  if (check) {
    if (!(await readFile(target)).equals(content)) throw new Error(`${name} differs from the pinned source; run npm run styles`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
console.log(`${check ? "Verified" : "Generated"} App Stylr ${source.version} adapter, bundled fonts, and extension icons.`);
