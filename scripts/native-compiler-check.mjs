import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile } from "browsercc";
import { ConsoleStdout, File, OpenFile, WASI, WASIProcExit } from "@bjorn3/browser_wasi_shim";

const fetchImpl = globalThis.fetch;
globalThis.self = globalThis;
self.location = { href: new URL("../src/native-compiler.worker.js", import.meta.url).href };
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  if (url.protocol === "file:") return new Response(await readFile(fileURLToPath(url)));
  return fetchImpl(input, options);
};

async function compileSource(language, source) {
  const isC = language === "c";
  return compile({
    source,
    fileName: `main.${isC ? "c" : "cpp"}`,
    flags: isC ? ["-std=c17"] : ["-std=c++20"],
  });
}

async function runModule(module, stdin) {
  let output = "";
  const stdout = new ConsoleStdout(bytes => { output += new TextDecoder().decode(bytes); });
  const wasi = new WASI(["main"], [], [
    new OpenFile(new File(new TextEncoder().encode(stdin))),
    stdout,
    stdout,
  ]);
  const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
  try { wasi.start(instance); }
  catch (error) { if (!(error instanceof WASIProcExit)) throw error; }
  return output;
}

const c = await compileSource("c", "#include <stdio.h>\nint main(void) { int n = 0; if (scanf(\"%d\", &n) != 1) return 2; printf(\"C:%d\\n\", n); return 0; }");
assert.ok(c.module, c.compileOutput || "C17 did not produce a module");
assert.equal(await runModule(c.module, "17\n"), "C:17\n");
console.log("PASS C17 compile, stdin, and output");

const cpp = await compileSource("cpp", "#include <iostream>\nint main() { int n; if (!(std::cin >> n)) return 2; std::cout << \"CPP:\" << n << std::endl; }");
assert.ok(cpp.module, cpp.compileOutput || "C++20 did not produce a module");
assert.equal(await runModule(cpp.module, "23\n"), "CPP:23\n");
console.log("PASS C++20 compile, stdin, and output");

for (const language of ["c", "cpp"]) {
  const broken = await compileSource(language, "int main( { return 0; }");
  assert.equal(broken.module, null, `${language} invalid code must not produce a module`);
  assert.match(broken.compileOutput, /error:/i);
}
console.log("PASS C and C++ compiler diagnostics");

const workerMessages = [];
self.postMessage = message => workerMessages.push(message);
await import("../src/native-compiler.worker.js?compiler-check");
await self.onmessage({ data: {
  id: "worker-c",
  language: "c",
  code: "#include <stdio.h>\nint main(void) { puts(\"WORKER_OK\"); return 0; }",
  stdin: "",
} });
const workerResult = workerMessages.find(message => message.type === "done");
assert.ok(workerResult, JSON.stringify(workerMessages));
assert.equal(workerResult.value.output, "WORKER_OK");
console.log("PASS browser C worker compile and output protocol");

process.exitCode = 0;

