---
name: codemon-challenges
description: Add, import, or format Python coding questions for the Codemon playground, including declarative test cases and progressive assessments. Use when the user supplies a problem for Codemon or asks for a new practice exercise in it.
---

# Codemon challenge authoring

Work from the Codemon repository root (the folder containing `package.json`). Read its `README.md`, `src/types.ts`, and `src/challenge-format.mjs` for the current format. Author public content as JSON in `src/challenges/`; the app discovers new files automatically. Put personal or private exercises in gitignored `local/challenges/`; these load only in the development server and are excluded from production builds. Use optional `reviewInstructions` for exercise-specific review constraints rather than changing app code. Change the app only when the requested exercise requires an unsupported capability.

## Preserve the exercise

Use a unique, stable kebab-case `id`, a Python `functionName`, and a starter function with `pass`. Preserve supplied requirements and sample inputs/outputs exactly. Keep the candidate's current autosaved draft and existing challenge IDs intact. The app saves the current code, including resets; new runs do not create solution-history snapshots. Treat requested assessment rules (such as no hints) as constraints on the statement, starter, tests, and review workflow. Raise contradictions that affect judging rather than inventing hidden requirements.

## Format at authoring time

Descriptions and stage descriptions accept a small Markdown subset: paragraphs separated by blank lines, single-backtick inline code, and triple-backtick code blocks. Test explanations also accept inline code. HTML, headings, Markdown tables, emphasis, and lists are not parsed; use the existing UI section headings, prose, or formatted text blocks instead.

- Mark variable and field names, function names, enum/state values, and short expressions with single backticks: `event_id` identifies an event; `event_type` is `payment`, `refund`, or `merchant_update`. Keep explanatory prose in the normal font.
- Put a full signature in its own fenced `python` block. Keep it a signature, not a solution.
- Put CSV formats, multiline rules, transition tables, and longer snippets in fenced `text` or `python` blocks. Align transition rows with spaces, not tabs. Keep labels outside the block and explanatory prose in separate paragraphs.
- Leave fenced contents literal. Single backticks inside a fence are displayed, not interpreted. Keep all fences balanced, start and end fences on their own lines, and put blank lines around them.
- A constraint is already rendered in monospace. Write its text without backtick markup.
- Encode the final object with a JSON serializer so newlines and quotes survive. Avoid shell interpolation of backticks or user content.

Example description value (shown as Markdown before JSON encoding):

````text
Implement:

```python
process_events(events: list[str]) -> list[str]
```

`event_id` identifies an event. `event_time` is an integer timestamp.

Allowed operations by current state:

```text
created:              authorize
authorized:           authorize or capture
partially_captured:   capture
```
````

## Tests and progression

Tests supply positional `args`, JSON-compatible `expected`, unique `id`, descriptive `name`, and `hidden`. Include supplied samples as public cases and add hidden cases for combinations and boundaries within the stated contract. Independently check expected results. The runner compares the original Python return value against the expected value using Python equality. A tuple fails a list expectation, even when their elements match. Sequence order and exact string contents matter; JSON serialization is used only for transport. Document required ordering in the statement. Use stdout only for debugging; judging checks the returned value.

For progressive assessments, use `stages: [{title, description}]` and a one-based `stage` on every test. All descriptions are visible for planning. Tests are cumulative through the active stage; advancing after a passing Submit is manual and retains the candidate's code. Preserve any source caveat about reconstructed or replacement parts. Hidden test results always show inputs, the candidate’s return value, errors, and per-test stdout/stderr. Their expected outputs remain hidden for both passing and failing cases, including Copy to Codex. This is a shared framework rule, not a per-question setting.

## Verify and hand off

Run the JSON through the repository's `validateChallenge` function, then run `npm run build` and `npm test`. Preview the new question in the browser: confirm inline identifiers, code blocks, readable long lines, and complete statement scrolling. Check that the function name and test arguments match the starter. For staged questions, confirm the initial test scope and manual advancement without solving the assessment for the user. Report the sidebar title and test counts without revealing hidden inputs or solution guidance.

Maintain this tracked skill as the authoring source. If its installed copy at `~/.codex/skills/codemon-challenges/SKILL.md` is present and instructions change, synchronize that copy.
