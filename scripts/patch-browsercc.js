import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../node_modules/browsercc/dist/index.js", import.meta.url);
const source = await readFile(path, "utf8");
const broken = 'thisProgram: "clang++",';
const fixed = 'thisProgram: inputName.endsWith(".c") ? "clang" : "clang++",';

if (source.includes(fixed)) process.exit(0);
const at = source.indexOf(broken);
if (at < 0) throw new Error("browsercc compiler-driver patch could not find its expected source line");
await writeFile(path, source.slice(0, at) + fixed + source.slice(at + broken.length));

