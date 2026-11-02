const base = new URL(`${import.meta.env.BASE_URL}java-toolchain/`, self.location.origin);
let libraryPromise;

async function getLibrary(post) {
  if (!libraryPromise) libraryPromise = (async () => {
    post('status', 'Loading the Java compiler and standard library…');
    const runtime = await import(/* @vite-ignore */ new URL('compiler.wasm-runtime.js', base).href);
    const compiled = await runtime.load(new URL('compiler.wasm', base).href);
    return { runtime, api: compiled.exports };
  })();
  return libraryPromise;
}

self.onmessage = async ({ data }) => {
  const { id, code } = data;
  const post = (type, value) => self.postMessage({ id, type, value });
  try {
    if (!code.trim()) throw new Error('Write some Java code before running it.');
    if (code.length > 50_000) throw new Error('Source is larger than the 50,000 character limit.');
    const { runtime, api } = await getLibrary(post);
    const className = code.match(/\b(?:public\s+)?class\s+([\w$]+)/)?.[1];
    if (!className) throw new Error('Add a class with a main method, for example: public class Main { public static void main(String[] args) { } }');
    const compiler = api.createCompiler();
    const [sdk, runtimeLibrary] = await Promise.all([
      fetch(new URL('compile-classlib-teavm.bin', base)).then(response => { if (!response.ok) throw new Error('Java standard library download failed. Reload the page and try again.'); return response.arrayBuffer(); }),
      fetch(new URL('runtime-classlib-teavm.bin', base)).then(response => { if (!response.ok) throw new Error('Java runtime download failed. Reload the page and try again.'); return response.arrayBuffer(); }),
    ]);
    compiler.setSdk(new Int8Array(sdk));
    compiler.setTeaVMClasslib(new Int8Array(runtimeLibrary));
    const diagnostics = [];
    compiler.onDiagnostic(diagnostic => diagnostics.push(`${diagnostic.fileName || 'Main.java'}:${diagnostic.lineNumber || 1}: ${diagnostic.severity}: ${diagnostic.message}`));
    compiler.addSourceFile(`${className}.java`, code);
    post('status', 'Compiling Java locally…');
    if (!compiler.compile()) { post('done', { output: diagnostics.join('\n') || 'Java compilation failed.', failed: true }); return; }
    if (!compiler.generateWebAssembly({ outputName: 'compyde', mainClass: className })) { post('done', { output: diagnostics.join('\n') || 'This Java program uses a feature the browser runtime cannot compile.', failed: true }); return; }
    const module = await runtime.load(compiler.getWebAssemblyOutputFile('compyde.wasm'));
    const captured = [];
    for (const method of ['log', 'info', 'warn', 'error']) console[method] = (...values) => captured.push(values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' '));
    post('status', 'Running Java WebAssembly…');
    module.exports.main([]);
    post('done', { output: [...diagnostics, ...captured].join('\n') || 'Program finished with no output.', failed: false });
  } catch (error) {
    post('error', error?.message || String(error));
  }
};

