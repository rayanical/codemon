import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateChallenge } from "../src/challenge-format.mjs";
import {
  getChallengeSession,
  getReviewChallenge,
} from "../src/challenge-session.mjs";
const challenge = JSON.parse(
  readFileSync(
    new URL("../src/challenges/collection-commands.json", import.meta.url),
  ),
);

test("multipart example has public and hidden cases in every stage", () => {
  validateChallenge(challenge);
  assert.equal(challenge.tests.length, 12);
  assert.equal(challenge.tests.filter((t) => !t.hidden).length, 8);
  assert.deepEqual(
    challenge.stages.map(
      (_, i) =>
        challenge.tests.filter((t) => t.stage === i + 1 && !t.hidden).length,
    ),
    [2, 2, 2, 2],
  );
  assert.equal(challenge.functionName, "process_commands");
  assert.equal(
    challenge.starterCode,
    "def process_commands(commands: list[list[str]]) -> list[str]:\n    pass\n",
  );
});
test("all four descriptions are available while tests start at Part 1", () => {
  const session = getChallengeSession(challenge);
  assert.equal(session.stage, 1);
  assert.equal(session.canContinue, false);
  assert.equal(session.stages.length, 4);
  assert.equal(session.tests.length, 3);
  assert.ok(session.tests.every((t) => t.stage === 1));
});
test("advancing retains cumulative cases and requires explicit stage change", () => {
  const progress = {
    code: "candidate implementation",
    stage: 1,
    completedStage: 1,
  };
  const passed = getChallengeSession(challenge, progress);
  assert.equal(passed.stage, 1);
  assert.equal(passed.canContinue, true);
  const continued = getChallengeSession(challenge, { ...progress, stage: 2 });
  assert.equal(continued.canContinue, false);
  assert.equal(continued.tests.length, 6);
  assert.ok(passed.tests.every((t) => continued.tests.includes(t)));
  assert.equal(progress.code, "candidate implementation");
  assert.deepEqual(
    [1, 2, 3, 4].map(
      (stage) =>
        getChallengeSession(challenge, { code: "", stage }).tests.length,
    ),
    [3, 6, 9, 12],
  );
  assert.equal(
    getChallengeSession(challenge, { code: "", stage: 4, completedStage: 4 })
      .canContinue,
    false,
  );
});
test("review bundle includes planning context but excludes future-stage tests", () => {
  const review = getReviewChallenge(challenge, { code: "", stage: 2 });
  assert.equal(review.stages.length, 4);
  assert.equal(review.tests.length, 6);
  assert.ok(review.tests.every((t) => t.stage <= 2));
});
test("invalid stage metadata is rejected and saved stage numbers are clamped", () => {
  assert.throws(
    () => validateChallenge({ ...challenge, stages: [] }),
    /stages/,
  );
  assert.throws(
    () =>
      validateChallenge({
        ...challenge,
        tests: [{ ...challenge.tests[0], stage: 5 }],
      }),
    /stage number/,
  );
  assert.throws(
    () =>
      validateChallenge({
        ...challenge,
        tests: challenge.tests.filter((t) => t.stage !== 2),
      }),
    /Stage 2/,
  );
  assert.equal(
    getChallengeSession(challenge, { code: "", stage: 99 }).stage,
    4,
  );
  assert.equal(getChallengeSession(challenge, { code: "", stage: 0 }).stage, 1);
  assert.equal(
    getChallengeSession(challenge, { code: "", stage: 1.5 }).stage,
    1,
  );
});
test("existing single-stage challenges retain public-only run semantics", () => {
  const single = JSON.parse(
    readFileSync(new URL("../src/challenges/two-sum.json", import.meta.url)),
  );
  validateChallenge(single);
  const session = getChallengeSession(single);
  assert.equal(session.progressive, false);
  assert.equal(session.totalStages, 1);
  assert.equal(session.publicTests.length, 3);
  assert.equal(session.tests.length, 6);
  assert.equal(session.canContinue, false);
});

test("review copies keep hidden inputs while removing hidden expected outputs", () => {
  const review = getReviewChallenge(challenge, { code: "", stage: 4 });
  const hidden = review.tests.filter((t) => t.hidden);
  assert.ok(hidden.length > 0);
  for (const test of hidden) {
    assert.equal(Object.hasOwn(test, "expected"), false);
    assert.deepEqual(
      test.args,
      challenge.tests.find((t) => t.id === test.id).args,
    );
  }
  assert.ok(
    review.tests
      .filter((t) => !t.hidden)
      .every((t) => Object.hasOwn(t, "expected")),
  );
});
