import { compile } from "browsercc";
import { WASI, WASIProcExit, File, OpenFile, ConsoleStdout } from "@bjorn3/browser_wasi_shim";

self.onmessage = async ({ data }) => {
  const { id, language, code, stdin = "" } = data;
  const post = (type, value) => self.postMessage({ id, type, value });
  try {
    if (!['c', 'cpp'].includes(language)) throw new Error('This local toolchain supports C and C++ only.');
    if (!code.trim()) throw new Error('Write some code before running it.');
    if (code.length > 50_000) throw new Error('Source is larger than the 50,000 character limit.');
    post('status', 'Loading the local C/C++ toolchain. The first load downloads about 95 MB and is cached by your browser.');
    const extension = language === 'c' ? 'c' : 'cpp';
    const result = await compile({ source: code, fileName: `main.${extension}`, flags: language === 'c' ? ['-std=c17'] : ['-std=c++20'] });
    if (result.compileOutput) post('diagnostics', result.compileOutput);
    if (!result.module) { post('done', { output: result.compileOutput || 'Compilation failed.', failed: true }); return; }
    post('status', 'Running compiled WebAssembly…');
    let stdout = '', stderr = '';
    const decoder = new TextDecoder();
    const fds = [
      new OpenFile(new File(new TextEncoder().encode(stdin))),
      new ConsoleStdout(bytes => { stdout += decoder.decode(bytes); }),
      new ConsoleStdout(bytes => { stderr += decoder.decode(bytes); }),
    ];
    const wasi = new WASI(['main'], [], fds);
    const instance = await WebAssembly.instantiate(result.module, { wasi_snapshot_preview1: wasi.wasiImport });
    try { wasi.start(instance); }
    catch (error) { if (!(error instanceof WASIProcExit)) throw error; }
    const output = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n');
    post('done', { output: output || 'Program finished with no output.', failed: Boolean(stderr) });
  } catch (error) {
    post('error', error?.message || String(error));
  }
};

