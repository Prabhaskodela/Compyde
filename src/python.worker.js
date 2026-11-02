const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/";
let pyodidePromise;

self.onmessage = async ({ data }) => {
  if (data?.type !== "run") return;
  const { id, code } = data;
  let output = "";
  try {
    if (!pyodidePromise) {
      self.postMessage({ type: "status", phase: "loading", id, message: "Downloading Python runtime in the background…" });
      pyodidePromise = import(`${PYODIDE_BASE}pyodide.mjs`)
        .then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_BASE }))
        .catch(error => { pyodidePromise = null; throw error; });
    }
    const pyodide = await pyodidePromise;
    self.postMessage({ type: "status", phase: "running", id, message: "Running Python…" });
    const sendOutput = text => {
      const chunk = `${text}\n`;
      output += chunk;
      self.postMessage({ type: "output", id, text: chunk });
    };
    pyodide.setStdout({ batched: sendOutput });
    pyodide.setStderr({ batched: sendOutput });
    await pyodide.runPythonAsync(code);
    self.postMessage({ type: "done", id, output });
  } catch (error) {
    self.postMessage({ type: "error", id, message: error?.message || "Python could not run this program." });
  }
};
