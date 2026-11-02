import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const toolchain = new URL("../public/java-toolchain/", import.meta.url);
const fetchImpl = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  if (url.protocol === "file:") return new Response(await readFile(fileURLToPath(url)), {
    headers: { "Content-Type": url.pathname.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" },
  });
  return fetchImpl(input, options);
};
globalThis.self = globalThis;
self.location = { href: toolchain.href };

const runtime = await import(new URL("compiler.wasm-runtime.js", toolchain).href);
const compilerModule = await runtime.load(new URL("compiler.wasm", toolchain).href);
const compiler = compilerModule.exports.createCompiler();
const sdk = await readFile(fileURLToPath(new URL("compile-classlib-teavm.bin", toolchain)));
const javaRuntime = await readFile(fileURLToPath(new URL("runtime-classlib-teavm.bin", toolchain)));
compiler.setSdk(new Int8Array(sdk));
compiler.setTeaVMClasslib(new Int8Array(javaRuntime));

const diagnostics = [];
compiler.onDiagnostic(diagnostic => diagnostics.push(`${diagnostic.severity}: ${diagnostic.message}`));
compiler.addSourceFile("Main.java", 'public class Main { public static void main(String[] args) { System.out.println("JAVA_OK"); } }');
assert.equal(compiler.compile(), true, diagnostics.join("\n") || "Java source did not compile");
assert.equal(compiler.generateWebAssembly({ outputName: "compyde", mainClass: "Main" }), true, diagnostics.join("\n") || "TeaVM did not produce WebAssembly");

const output = [];
const originalConsole = Object.fromEntries(["log", "info", "warn", "error"].map(method => [method, console[method]]));
for (const method of Object.keys(originalConsole)) console[method] = (...values) => output.push(values.join(" "));
try {
  const javaModule = await runtime.load(compiler.getWebAssemblyOutputFile("compyde.wasm"));
  javaModule.exports.main([]);
} finally {
  for (const [method, original] of Object.entries(originalConsole)) console[method] = original;
}
assert.match(output.join("\n"), /JAVA_OK/);
console.log("PASS local Java compile and WebAssembly output");
process.exitCode = 0;

