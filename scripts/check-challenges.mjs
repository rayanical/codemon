import { readdir, readFile } from "node:fs/promises";
import { validateChallenge } from "../src/challenge-format.mjs";
const directory = new URL("../src/challenges/", import.meta.url);
const ids = new Set();
for (const file of (await readdir(directory)).filter((name) =>
  name.endsWith(".json"),
)) {
  const challenge = validateChallenge(
    JSON.parse(await readFile(new URL(file, directory), "utf8")),
  );
  if (ids.has(challenge.id))
    throw new Error(`Duplicate challenge ID: ${challenge.id}`);
  ids.add(challenge.id);
}
console.log(`Validated ${ids.size} public challenges.`);
