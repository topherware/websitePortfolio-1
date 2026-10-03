import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const files = ["index.html", "project.html", "styles.css", "app.js", "cms.js", "branding.js", "config.example.js", "favicon.svg", "README.md"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) await cp(resolve(root, file), resolve(output, file), { recursive: true });
for (const directory of ["admin", "assets"]) await cp(resolve(root, directory), resolve(output, directory), { recursive: true });
if (existsSync(resolve(root, "config.js"))) await cp(resolve(root, "config.js"), resolve(output, "config.js"));

console.log(`Built static site at ${output}`);
