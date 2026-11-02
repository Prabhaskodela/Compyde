import assert from "node:assert/strict";
import test from "node:test";
import { compileWithWandbox } from "../src/services/compiler.js";

test("routes C, C++, and Java to real Wandbox compilers", async () => {
  for (const [language, compiler] of [["c", "gcc-13.2.0-c"], ["cpp", "gcc-13.2.0"], ["java", "openjdk-jdk-22+36"]]) {
    let request;
    const result = await compileWithWandbox(language, "source", "42", {
      fetchImpl: async (url, options) => {
        request = { url, options };
        return Response.json({ status: "0", compiler_error: "", compiler_output: "", program_output: `${language} output\n` });
      },
    });
    assert.equal(request.url, "https://wandbox.org/api/compile.json");
    assert.equal(JSON.parse(request.options.body).compiler, compiler);
    assert.equal(JSON.parse(request.options.body).stdin, "42");
    assert.equal(result.text, `${language} output`);
    assert.equal(result.ok, true);
  }
});

test("shows compiler diagnostics when source has errors", async () => {
  const result = await compileWithWandbox("c", "bad code", "", {
    fetchImpl: async () => Response.json({ status: "1", compiler_error: "expected declaration", compiler_output: "", program_output: "" }),
  });
  assert.equal(result.ok, false);
  assert.match(result.text, /Compilation errors:[\s\S]*expected declaration/);
});

test("shows runtime errors, program output, and a non-zero exit status", async () => {
  const result = await compileWithWandbox("cpp", "source", "", {
    fetchImpl: async () => Response.json({
      status: "2",
      compiler_error: "",
      compiler_output: "",
      program_error: "invalid input",
      program_output: "before error",
    }),
  });
  assert.equal(result.ok, false);
  assert.match(result.text, /Runtime errors:[\s\S]*invalid input/);
  assert.match(result.text, /before error/);
  assert.match(result.text, /exited with status 2/);
});

test("explains rate limits and rejects unsupported or oversized requests", async () => {
  await assert.rejects(
    compileWithWandbox("java", "source", "", { fetchImpl: async () => new Response("", { status: 429 }) }),
    /rate-limiting/,
  );
  await assert.rejects(compileWithWandbox("go", "source"), /No hosted compiler/);
  await assert.rejects(compileWithWandbox("cpp", "x".repeat(50_001)), /50,000 character limit/);
});

