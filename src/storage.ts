import type { Challenge, Progress } from "./types";
import { validateChallenge } from "./challenge-format.mjs";
export type Workspace = {
  version: 1;
  selectedId?: string;
  custom: Challenge[];
  progress: Record<string, Progress>;
  // Legacy snapshots are retained for backup compatibility; new runs do not add history.
  attempts?: unknown[];
};
export const EMPTY: Workspace = {
  version: 1,
  custom: [],
  progress: {},
};
export function loadWorkspace(): Workspace {
  try {
    const data = JSON.parse(
      localStorage.getItem("codemon.workspace.v1") || "null",
    );
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.custom) ||
      (data.attempts !== undefined && !Array.isArray(data.attempts)) ||
      !data.progress ||
      typeof data.progress !== "object"
    )
      return EMPTY;
    data.custom.forEach(validateChallenge);
    for (const progress of Object.values(data.progress) as Progress[])
      if (typeof progress?.code !== "string") return EMPTY;
    return data;
  } catch {
    return EMPTY;
  }
}
