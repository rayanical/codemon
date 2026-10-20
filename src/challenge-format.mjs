export function validateChallenge(value) {
  const fail = (message) => {
    throw new Error(message);
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("A challenge must be a JSON object.");
  for (const key of [
    "id",
    "title",
    "functionName",
    "description",
    "starterCode",
  ]) {
    if (typeof value[key] !== "string" || !value[key].trim())
      fail(`${key} must be a non-empty string.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id))
    fail("id must use lowercase letters, numbers, and hyphens.");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.functionName))
    fail("functionName must be a Python identifier.");
  if (!["Easy", "Medium", "Hard"].includes(value.difficulty))
    fail("difficulty must be Easy, Medium, or Hard.");
  for (const key of ["topics", "constraints"])
    if (
      !Array.isArray(value[key]) ||
      !value[key].every((x) => typeof x === "string")
    )
      fail(`${key} must be a list of strings.`);
  if (
    value.reviewInstructions !== undefined &&
    typeof value.reviewInstructions !== "string"
  )
    fail("reviewInstructions must be text.");
  if (!Array.isArray(value.tests) || !value.tests.length)
    fail("Add at least one test case.");
  if (value.stages !== undefined) {
    if (!Array.isArray(value.stages) || !value.stages.length)
      fail("stages must be a non-empty list.");
    for (const stage of value.stages) {
      if (
        !stage ||
        typeof stage.title !== "string" ||
        !stage.title.trim() ||
        typeof stage.description !== "string" ||
        !stage.description.trim()
      )
        fail("Each stage needs a title and description.");
    }
  }
  const ids = new Set();
  for (const test of value.tests) {
    if (!test || typeof test.id !== "string" || !test.id || ids.has(test.id))
      fail("Every test needs a unique, non-empty id.");
    ids.add(test.id);
    if (value.stages) {
      if (
        !Number.isInteger(test.stage) ||
        test.stage < 1 ||
        test.stage > value.stages.length
      )
        fail(
          `Test ${test.id} needs a stage number between 1 and ${value.stages.length}.`,
        );
    } else if (test.stage !== undefined)
      fail("Test stages require challenge stages.");
    if (
      typeof test.name !== "string" ||
      !test.name ||
      !Array.isArray(test.args) ||
      !Object.hasOwn(test, "expected") ||
      typeof test.hidden !== "boolean"
    )
      fail(`Test ${test.id} needs name, args, expected, and hidden.`);
    if (test.explanation !== undefined && typeof test.explanation !== "string")
      fail(`Test ${test.id}: explanation must be text.`);
  }
  if (!value.tests.some((t) => !t.hidden))
    fail("Add at least one public test.");
  if (value.stages)
    for (let index = 1; index <= value.stages.length; index++) {
      if (!value.tests.some((test) => test.stage === index && !test.hidden))
        fail(`Stage ${index} needs at least one public test.`);
    }
  return value;
}
