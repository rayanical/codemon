import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync("artifacts", { recursive: true });
// npm supplies its CLI path when this script runs through npm run package.
if (!process.env.npm_execpath) throw new Error("Run with npm run package.");
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "pack", "--pack-destination", "artifacts"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
