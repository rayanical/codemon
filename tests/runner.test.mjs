import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildRunner, parseResults } from "../src/runner.mjs";
import { validateChallenge } from "../src/challenge-format.mjs";
const challenge = JSON.parse(
  readFileSync(new URL("../src/challenges/two-sum.json", import.meta.url)),
);
function run(code, tests = challenge.tests) {
  const script = buildRunner(code, "two_sum", tests, "TEST_RESULT_");
  return parseResults(
    execFileSync("python3", ["-c", script], { encoding: "utf8" }),
    "TEST_RESULT_",
  );
}
test("correct solution passes all declarative public and hidden cases", () => {
  const results = run(
    "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target-n in seen: return [seen[target-n], i]\n        seen[n] = i",
  );
  assert.equal(results.length, 6);
  assert.ok(results.every((r) => r.passed));
});
test("wrong output and exceptions are reported individually", () => {
  const results = run(
    'def two_sum(nums, target):\n    if nums[0] == 2: raise ValueError("test error")\n    return []',
  );
  assert.equal(results[0].passed, false);
  assert.match(results[0].error, /ValueError: test error/);
  assert.deepEqual(results[1].actual, []);
  assert.equal(results.length, 6);
});
test("fresh namespace and copied inputs for every case, with captured prints", () => {
  const code =
    'counter = 0\ndef two_sum(nums, target):\n    global counter\n    counter += 1\n    print("debug")\n    nums.append(99)\n    return counter';
  const cases = [1, 2].map((id) => ({
    id: String(id),
    args: [[1, 2], 3],
    expected: 1,
  }));
  const results = run(code, cases);
  assert.ok(results.every((r) => r.passed && r.stdout === "debug\n"));
});
test("syntax errors, missing functions and non-JSON return values report errors", () => {
  for (const code of [
    "def broken(",
    "x = 1",
    "def two_sum(nums, target): return {1,2}",
  ])
    assert.ok(run(code).every((r) => !r.passed && r.error));
});
test("JSON encoding handles booleans, nulls, unicode and source quotes safely", () => {
  const results = run(
    'def two_sum(a, b):\n    return [a, b, "hello \\\"world\\\""]',
    [
      {
        id: "encoding",
        args: [true, null],
        expected: [true, null, 'hello "world"'],
      },
    ],
  );
  assert.equal(results[0].passed, true);
});
test("challenge validator rejects missing fields and duplicate test IDs", () => {
  assert.equal(validateChallenge(challenge).id, "two-sum");
  assert.throws(() => validateChallenge({}), /id/);
  assert.throws(
    () =>
      validateChallenge({
        ...challenge,
        tests: [challenge.tests[0], challenge.tests[0]],
      }),
    /unique/,
  );
  assert.throws(
    () => validateChallenge({ ...challenge, functionName: "not a function!" }),
    /identifier/,
  );
  assert.throws(
    () =>
      validateChallenge({
        ...challenge,
        tests: challenge.tests.map((t) => ({ ...t, hidden: true })),
      }),
    /public/,
  );
});

test("tuple solution fails list expectations and retains Python representation", () => {
  const results = run("def two_sum(nums, target): return (0, 1)", [
    challenge.tests[0],
  ]);
  assert.deepEqual(results[0].actual, challenge.tests[0].expected);
  assert.ok(results.every((result) => !result.passed));
  assert.equal(results[0].actualRepr, "(0, 1)");
  assert.equal(results[0].expectedRepr, "[0, 1]");
  assert.equal(results[0].actualType, "tuple");
  assert.equal(results[0].expectedType, "list");
});

test("list comparison preserves ordering, values, and string formatting", () => {
  const cases = [
    {
      id: "sequence",
      args: [],
      expected: ["a,b,1", "c,d,2"],
    },
  ];
  assert.equal(
    run("def two_sum(): return ['a,b,1', 'c,d,2']", cases)[0].passed,
    true,
  );
  for (const code of [
    "def two_sum(): return ['c,d,2', 'a,b,1']",
    "def two_sum(): return ['a, b,1', 'c,d,2']",
    "def two_sum(): return ['a,b,9', 'c,d,2']",
  ])
    assert.equal(run(code, cases)[0].passed, false);
});

test("hidden results retain prints and actual values but omit expected metadata", () => {
  const cases = [
    { id: "hidden", args: [3, 4], expected: 99, hidden: true },
    { id: "public", args: [7, 8], expected: 15, hidden: false },
  ];
  const results = run(
    'def two_sum(a,b):\n    import sys\n    print("input", a, b)\n    print("debug", file=sys.stderr)\n    return a+b',
    cases,
  );
  assert.equal(results[0].actual, 7);
  assert.equal(results[0].passed, false);
  assert.equal(Object.hasOwn(results[0], "expectedRepr"), false);
  assert.equal(Object.hasOwn(results[0], "expectedType"), false);
  assert.equal(results[0].stdout, "input 3 4\ndebug\n");
  assert.equal(results[1].stdout, "input 7 8\ndebug\n");
  assert.equal(results[1].expectedRepr, "15");
});
test("print output before an exception is retained for that test", () => {
  const result = run(
    'def two_sum(a,b):\n    print("before failure")\n    raise ValueError("bad input")',
    [{ id: "broken", args: [1, 2], expected: 3, hidden: true }],
  )[0];
  assert.equal(result.stdout, "before failure\n");
  assert.match(result.error, /ValueError: bad input/);
  assert.equal(Object.hasOwn(result, "expectedRepr"), false);
});
