export const REMOTE_COMPILERS = Object.freeze({
  c: { name: "C", compiler: "gcc-13.2.0-c" },
  cpp: { name: "C++", compiler: "gcc-13.2.0" },
  java: { name: "Java", compiler: "openjdk-jdk-22+36" },
});

const MAX_SOURCE_LENGTH = 50_000;
const MAX_INPUT_LENGTH = 10_000;

export async function compileWithWandbox(language, code, stdin = "", options = {}) {
  const runtime = REMOTE_COMPILERS[language];
  if (!runtime) throw new Error("No hosted compiler is configured for this language.");
  if (typeof code !== "string" || !code.trim()) throw new Error("Write some code before running it.");
  if (code.length > MAX_SOURCE_LENGTH) throw new Error("This source file is too large to submit (50,000 character limit).");
  if (typeof stdin !== "string" || stdin.length > MAX_INPUT_LENGTH) throw new Error("Program input is too large (10,000 character limit).");

  const fetchImpl = options.fetchImpl || fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30_000);
  try {
    const response = await fetchImpl("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ compiler: runtime.compiler, code, stdin, save: false }),
      signal: controller.signal,
    });
    if (response.status === 429) throw new Error("Wandbox is rate-limiting requests. Wait a little, then try again.");
    if (!response.ok) throw new Error(`Wandbox returned HTTP ${response.status}. Try again in a moment.`);

    const result = await response.json();
    const diagnostics = [result.compiler_error, result.compiler_output, result.program_error]
      .filter(value => typeof value === "string" && value.trim())
      .join("\n");
    const output = typeof result.program_output === "string" ? result.program_output : "";
    const signal = typeof result.signal === "string" && result.signal ? `Program stopped (${result.signal}).` : "";
    const text = [diagnostics, output, signal].filter(Boolean).join("\n").trim();

    if (result.status !== "0" && !text) throw new Error("The compiler could not complete this program. Check the code and try again.");
    return {
      text: text || "Compilation succeeded. The program produced no output.",
      ok: result.status === "0",
      compiler: runtime.compiler,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Compilation took too long. Shorten the program and try again.");
    if (error instanceof TypeError) throw new Error("Could not reach Wandbox. Check your internet connection and try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
