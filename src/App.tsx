import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { usePython } from "react-py";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  FolderOpen,
  LockKeyhole,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Square,
  X,
} from "lucide-react";
import Description, { InlineCode } from "./Description";
import TestResultDetails from "./TestResultDetails";
import type { Challenge, Result } from "./types";
import useWorkspace from "./useWorkspace";
import { validateChallenge } from "./challenge-format.mjs";
import { buildRunner, parseResults } from "./runner.mjs";
import {
  getChallengeSession,
  getReviewChallenge,
} from "./challenge-session.mjs";
const Editor = lazy(() => import("@monaco-editor/react"));
const publicModules = import.meta.glob("./challenges/*.json", {
  eager: true,
  import: "default",
});
// Private exercises are available locally, never in a production build.
const localModules = import.meta.env.DEV
  ? import.meta.glob("../local/challenges/*.json", {
      eager: true,
      import: "default",
    })
  : {};
const builtins = Object.values({ ...publicModules, ...localModules })
  .map((value) => validateChallenge(value) as Challenge)
  .sort((a, b) =>
    a.id === "two-sum"
      ? -1
      : b.id === "two-sum"
        ? 1
        : a.title.localeCompare(b.title),
  );
const initialChallenge =
  builtins.find((c) => c.id === "two-sum") || builtins[0];
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const compact = (value: unknown) => JSON.stringify(value);
const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 25,
  padding: { top: 22 },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  fontFamily: "'SFMono-Regular', Consolas, monospace",
  renderLineHighlight: "none" as const,
  overviewRulerLanes: 0,
};

export default function App() {
  const { workspace, setWorkspace, saving, storageError } = useWorkspace();
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("codemon.sidebarHidden.v1") === "true";
    } catch {
      return false;
    }
  });
  const [search, setSearch] = useState("");
  const [resultTab, setResultTab] = useState<"cases" | "results">("cases");
  const [results, setResults] = useState<Result[]>([]);
  const [expanded, setExpanded] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState("");
  const pending = useRef<{
    token: string;
    challengeId: string;
    code: string;
    mode: "run" | "submit";
    total: number;
    stage: number;
    totalStages: number;
  } | null>(null);
  const {
    runPython,
    stdout,
    stderr,
    isLoading,
    isReady,
    isRunning,
    interruptExecution,
  } = usePython();
  const descriptionRef = useRef<HTMLDivElement>(null);
  const interruptRef = useRef(interruptExecution);
  interruptRef.current = interruptExecution;
  const selected = workspace.selectedId ?? initialChallenge.id;
  function setSelected(id: string) {
    setWorkspace((w) => ({ ...w, selectedId: id }));
  }
  const challenges = [...builtins, ...workspace.custom];
  const challenge =
    challenges.find((c) => c.id === selected) || initialChallenge;
  const code = workspace.progress[challenge.id]?.code ?? challenge.starterCode;
  const session = getChallengeSession(
    challenge,
    workspace.progress[challenge.id],
  );
  const { publicTests } = session;
  const examples = session.progressive
    ? publicTests.filter((test) => test.stage === session.stage)
    : publicTests;
  const filtered = challenges.filter((c) =>
    `${c.title} ${c.topics.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const hiddenCount = session.tests.length - publicTests.length;
  useEffect(() => {
    try {
      localStorage.setItem("codemon.sidebarHidden.v1", String(sidebarHidden));
    } catch {
      /* The toggle still works without browser storage. */
    }
  }, [sidebarHidden]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    const run = pending.current;
    if (!run) return;
    const parsed = parseResults(stdout, run.token) as Result[] | null;
    if (!parsed) return;
    pending.current = null;
    setResults(parsed);
    setBusy(false);
    setExpanded(parsed.find((r) => !r.passed)?.id || parsed[0]?.id || "");
    const passed = parsed.filter((r) => r.passed).length;
    setWorkspace((w) => ({
      ...w,
      progress: {
        ...w.progress,
        [run.challengeId]: {
          ...w.progress[run.challengeId],
          code: w.progress[run.challengeId]?.code ?? run.code,
          solved:
            w.progress[run.challengeId]?.solved ||
            (run.mode === "submit" &&
              passed === run.total &&
              run.stage === run.totalStages),
          completedStage:
            run.mode === "submit" && passed === run.total
              ? Math.max(
                  w.progress[run.challengeId]?.completedStage ?? 0,
                  run.stage,
                )
              : w.progress[run.challengeId]?.completedStage,
        },
      },
    }));
  }, [stdout]);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      if (pending.current) {
        pending.current = null;
        interruptRef.current();
        setBusy(false);
        setRunError(
          "Execution exceeded 10 seconds. Check for an infinite loop, then try again.",
        );
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [busy]);
  useEffect(() => {
    if (busy && stderr) {
      pending.current = null;
      setBusy(false);
      setRunError(stderr);
    }
  }, [stderr, busy]);
  function changeCode(value: string) {
    setWorkspace((w) => ({
      ...w,
      progress: {
        ...w.progress,
        [challenge.id]: { ...w.progress[challenge.id], code: value },
      },
    }));
  }
  function select(id: string) {
    if (busy) return;
    setSelected(id);
    setResults([]);
    setRunError("");
    setResultTab("cases");
    setExpanded("");
  }
  async function execute(mode: "run" | "submit") {
    if (busy || !isReady || isLoading || isRunning) return;
    const tests =
      mode === "submit" || session.progressive ? session.tests : publicTests;
    const token = `CODEMON_${crypto.randomUUID()}_`;
    pending.current = {
      token,
      code,
      challengeId: challenge.id,
      mode,
      total: tests.length,
      stage: session.stage,
      totalStages: session.totalStages,
    };
    setResults([]);
    setRunError("");
    setBusy(true);
    setResultTab("results");
    try {
      await runPython(buildRunner(code, challenge.functionName, tests, token));
    } catch (error) {
      if (pending.current?.token === token) {
        pending.current = null;
        setBusy(false);
        setRunError(String(error));
      }
    }
  }
  function viewPart(part: number) {
    const content = descriptionRef.current;
    const target = content?.querySelector<HTMLElement>(`[data-part="${part}"]`);
    if (content && target)
      content.scrollTo({
        top:
          content.scrollTop +
          target.getBoundingClientRect().top -
          content.getBoundingClientRect().top -
          16,
      });
  }
  function advanceStage() {
    if (busy || !session.canContinue) return;
    setWorkspace((w) => ({
      ...w,
      progress: {
        ...w.progress,
        [challenge.id]: {
          ...w.progress[challenge.id],
          code,
          stage: session.stage + 1,
        },
      },
    }));
    setResults([]);
    setExpanded("");
    setRunError("");
    setResultTab("cases");
  }
  function stop() {
    pending.current = null;
    interruptExecution();
    setBusy(false);
    setRunError("Execution stopped. Your code is saved.");
  }
  async function copyReview() {
    const reviewChallenge = getReviewChallenge(
      challenge,
      workspace.progress[challenge.id],
    );
    const reviewInstruction =
      challenge.reviewInstructions ??
      "Review my Python solution for correctness, complexity, and readability. For multipart challenges, judge only the current stage; later descriptions are planning context.";
    const review = `${reviewInstruction}\n\n# ${challenge.title}\n${challenge.description}\n\nConstraints:\n${challenge.constraints.join("\n")}\n\nMy solution:\n\`\`\`python\n${code}\n\`\`\`\n\nChallenge and current test inputs (hidden expected outputs omitted):\n\`\`\`json\n${pretty(reviewChallenge)}\n\`\`\`\n\nLatest results:\n${results.length ? pretty(results) : "Not run in this session."}`;
    try {
      await navigator.clipboard.writeText(review);
      setToast("Code, challenge, and tests copied for Codex");
    } catch {
      setToast("Clipboard unavailable. Use Export backup to save your work.");
    }
  }
  function download(name: string, data: unknown) {
    const url = URL.createObjectURL(
      new Blob([pretty(data)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importChallenge() {
    try {
      const parsed = JSON.parse(importText);
      if (
        parsed.version === 1 &&
        Array.isArray(parsed.custom) &&
        parsed.progress &&
        (parsed.attempts === undefined || Array.isArray(parsed.attempts))
      ) {
        parsed.custom.forEach(validateChallenge);
        if (
          parsed.custom.some((c: Challenge) =>
            builtins.some((b) => b.id === c.id),
          ) ||
          new Set(parsed.custom.map((c: Challenge) => c.id)).size !==
            parsed.custom.length
        )
          throw new Error("Backup contains duplicate challenge IDs.");
        for (const p of Object.values(parsed.progress) as { code: string }[])
          if (typeof p?.code !== "string")
            throw new Error("Invalid saved code in backup.");
        setWorkspace((w) => ({
          ...w,
          custom: [
            ...w.custom.filter(
              (c) => !parsed.custom.some((p: Challenge) => p.id === c.id),
            ),
            ...parsed.custom,
          ],
          progress: { ...w.progress, ...parsed.progress },
          ...(parsed.attempts ? { attempts: parsed.attempts } : {}),
        }));
        setToast("Workspace backup restored");
      } else {
        const next = validateChallenge(parsed) as Challenge;
        if (challenges.some((c) => c.id === next.id))
          throw new Error(
            "That challenge ID already exists. Use a new id to keep saved solutions safe.",
          );
        setWorkspace((w) => ({ ...w, custom: [...w.custom, next] }));
        setSelected(next.id);
        setResults([]);
        setResultTab("cases");
        setToast("Challenge added to your library");
      }
      setImportOpen(false);
      setImportText("");
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }
  const passed = results.filter((r) => r.passed).length;
  return (
    <div className="app-shell">
      <aside className="sidebar" id="challenge-sidebar" hidden={sidebarHidden}>
        <a className="brand" href="/" aria-label="Codemon home">
          Codemon
        </a>

        <label className="search">
          <Search size={15} />
          <input
            aria-label="Search challenges"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <nav className="challenge-list" aria-label="Challenges">
          {filtered.map((c) => (
            <button
              key={c.id}
              disabled={busy}
              className={`challenge-link ${c.id === challenge.id ? "selected" : ""}`}
              onClick={() => select(c.id)}
            >
              <div>
                <strong>{c.title}</strong>
              </div>
              {workspace.progress[c.id]?.solved ? (
                <CheckCheck size={16} className="solved" />
              ) : null}
            </button>
          ))}
          {!filtered.length && (
            <p className="empty-search">No challenges found.</p>
          )}
        </nav>
        <button
          className="add-challenge"
          onClick={() => {
            setImportOpen(true);
            setImportError("");
          }}
          disabled={busy}
        >
          <Plus size={15} /> Add challenge
        </button>
        <div className="sidebar-bottom">
          <button onClick={() => download("codemon-backup.json", workspace)}>
            <ArrowDownToLine size={14} /> Export backup
          </button>
        </div>
      </aside>
      <div className="main-shell">
        {storageError && (
          <div className="storage-error" role="alert">
            {storageError}
          </div>
        )}
        <main className="playground">
          <section className="problem-panel">
            <div className="panel-tabs">
              <button
                className="icon-button sidebar-toggle"
                aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
                title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
                aria-expanded={!sidebarHidden}
                aria-controls="challenge-sidebar"
                onClick={() => setSidebarHidden((hidden) => !hidden)}
              >
                {sidebarHidden ? (
                  <PanelLeftOpen size={16} />
                ) : (
                  <PanelLeftClose size={16} />
                )}
              </button>
              <span className="panel-title">Problem</span>
            </div>
            {session.progressive && (
              <div className="stage-toolbar">
                <span>
                  Testing Part {session.stage} of {session.totalStages}
                </span>
                {session.canContinue && (
                  <button
                    className="run-button"
                    disabled={busy}
                    onClick={advanceStage}
                  >
                    Continue to Part {session.stage + 1}{" "}
                    <ArrowRight size={13} />
                  </button>
                )}
                {session.stage === session.totalStages &&
                  workspace.progress[challenge.id]?.solved && (
                    <span className="text-green">Complete</span>
                  )}
              </div>
            )}
            <div className="problem-content" ref={descriptionRef}>
              <>
                <div className="problem-title">
                  <h2>{challenge.title}</h2>
                  <div>
                    {workspace.progress[challenge.id]?.solved && (
                      <Check size={16} className="solved" aria-label="Solved" />
                    )}
                    <button
                      className="icon-button"
                      aria-label="Export this challenge"
                      title="Export challenge"
                      onClick={() =>
                        download(`${challenge.id}.json`, challenge)
                      }
                    >
                      <ArrowDownToLine size={15} />
                    </button>
                  </div>
                </div>
                <div className="tags">
                  <span
                    className={`difficulty-tag ${challenge.difficulty.toLowerCase()}`}
                  >
                    {challenge.difficulty}
                  </span>
                  {challenge.topics.map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
                {session.progressive && (
                  <nav className="part-links" aria-label="Assessment parts">
                    {session.stages.map((part, index) => (
                      <button
                        key={index}
                        onClick={() => viewPart(index + 1)}
                        title={part.title}
                      >
                        Part {index + 1}
                      </button>
                    ))}
                  </nav>
                )}
                <Description text={challenge.description} />
                {session.stages.map((stage, index) => (
                  <section
                    className="stage-description"
                    data-part={index + 1}
                    key={index}
                  >
                    <h3>
                      Part {index + 1} — {stage.title}
                    </h3>
                    <Description text={stage.description} />
                  </section>
                ))}
                <h3>Examples</h3>
                {examples.slice(0, 2).map((t, i) => (
                  <div className="example" key={t.id}>
                    <div className="example-label">Example {i + 1}</div>
                    <div>
                      <span>Input</span>
                      <code>
                        {challenge.functionName}(
                        {t.args.map(compact).join(", ")})
                      </code>
                    </div>
                    <div>
                      <span>Output</span>
                      <code>{compact(t.expected)}</code>
                    </div>
                    {t.explanation && (
                      <p>
                        <InlineCode text={t.explanation} />
                      </p>
                    )}
                  </div>
                ))}
                <h3>Constraints</h3>
                <ul className="constraints">
                  {challenge.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            </div>
          </section>
          <section className="coding-panel">
            <div className="editor-toolbar">
              <div>
                <strong>solution.py</strong>
              </div>
              <div>
                <span className="python-label">Python 3</span>
                <span className="toolbar-divider" />
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label="Reset to starter code"
                  title="Reset to starter code"
                  onClick={() => {
                    if (
                      confirm(
                        "Reset this draft to starter code? This replaces your saved draft.",
                      )
                    )
                      changeCode(challenge.starterCode);
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
            <div className="editor-wrap">
              <Suspense
                fallback={<div className="editor-loading">Loading editor…</div>}
              >
                <Editor
                  height="100%"
                  language="python"
                  path={`${challenge.id}.py`}
                  value={code}
                  onChange={(v) => changeCode(v ?? "")}
                  options={{ ...editorOptions, readOnly: busy }}
                  theme="light"
                  loading={
                    <div className="editor-loading">Loading editor…</div>
                  }
                />
              </Suspense>
            </div>
            <div className="editor-status">
              <span>
                {isLoading
                  ? "Loading Python…"
                  : busy
                    ? "Running…"
                    : isReady
                      ? "Ready"
                      : "Python unavailable"}
                {!isLoading && !isReady && (
                  <button className="retry-worker" onClick={interruptExecution}>
                    Retry
                  </button>
                )}
              </span>
              <span>
                {storageError
                  ? "Save unavailable"
                  : saving
                    ? "Saving…"
                    : "Saved"}{" "}
                <Check size={12} />
              </span>
            </div>
            <div className="test-panel">
              <div className="test-tabs">
                <div>
                  <button
                    className={resultTab === "cases" ? "active" : ""}
                    onClick={() => setResultTab("cases")}
                  >
                    Test cases{" "}
                    <span className="count">{publicTests.length}</span>
                  </button>
                  <button
                    className={resultTab === "results" ? "active" : ""}
                    onClick={() => setResultTab("results")}
                  >
                    Results{" "}
                    {results.length > 0 && (
                      <span
                        className={`result-dot ${passed === results.length ? "green" : "red"}`}
                      />
                    )}
                  </button>
                </div>
                <span
                  className="hidden-count"
                  title="Hidden tests show input, your output, and terminal logs. Expected output stays hidden."
                >
                  <LockKeyhole size={12} /> {hiddenCount} hidden
                </span>
              </div>
              <div className="test-content">
                {resultTab === "cases" ? (
                  <>
                    <div className="case-pills">
                      {publicTests.map((t, i) => (
                        <button
                          className={
                            (expanded || publicTests[0].id) === t.id
                              ? "active"
                              : ""
                          }
                          onClick={() => setExpanded(t.id)}
                          key={t.id}
                        >
                          Case {i + 1}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const test =
                        publicTests.find((t) => t.id === expanded) ||
                        publicTests[0];
                      return (
                        <div className="case-details">
                          <div>
                            <label>Input</label>
                            <pre>
                              {challenge.functionName}(
                              {test.args.map(compact).join(", ")})
                            </pre>
                          </div>
                          <div>
                            <label>Expected output</label>
                            <pre>{compact(test.expected)}</pre>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : busy ? (
                  <div className="result-empty">
                    <span className="spinner" />
                    <span>Running tests…</span>
                  </div>
                ) : runError ? (
                  <div className="run-error" role="alert">
                    <strong>Execution couldn’t finish</strong>
                    <pre>{runError}</pre>
                  </div>
                ) : !results.length ? (
                  <div className="result-empty">
                    <span>No results yet.</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`result-summary ${passed === results.length ? "success" : "failure"}`}
                    >
                      <span>
                        {passed === results.length ? (
                          <CheckCheck size={18} />
                        ) : (
                          <X size={18} />
                        )}{" "}
                        {passed === results.length
                          ? "All tests passed"
                          : "Tests failed"}
                      </span>
                      <strong>
                        {passed}/{results.length}
                      </strong>
                    </div>
                    {results.map((r, i) => {
                      const test = session.tests.find((t) => t.id === r.id) ?? {
                        hidden: true,
                        name: "Previous test",
                        args: [],
                        expected: null,
                      };
                      return (
                        <div
                          className={`result-row ${expanded === r.id ? "expanded" : ""}`}
                          key={r.id}
                        >
                          <button
                            onClick={() =>
                              setExpanded(expanded === r.id ? "" : r.id)
                            }
                          >
                            <span
                              className={r.passed ? "text-green" : "text-red"}
                            >
                              {r.passed ? <Check size={15} /> : <X size={15} />}
                            </span>
                            <strong>
                              {test.hidden ? `Hidden case ${i + 1}` : test.name}
                            </strong>
                            {test.hidden && <LockKeyhole size={11} />}
                            <span className="result-duration">
                              {r.duration} ms
                            </span>
                            <ChevronDown size={13} />
                          </button>
                          {expanded === r.id && (
                            <TestResultDetails test={test} result={r} />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
            <div className="action-bar">
              <button className="copy-button" onClick={copyReview}>
                <Copy size={15} /> Copy to Codex
              </button>
              <div>
                {busy ? (
                  <button className="run-button" onClick={stop}>
                    <Square size={13} /> Stop
                  </button>
                ) : (
                  <button
                    className="run-button"
                    disabled={!isReady || isLoading || isRunning}
                    title={
                      session.progressive
                        ? `Run public and hidden tests through Part ${session.stage} without recording a completion.`
                        : "Run public tests only."
                    }
                    onClick={() => execute("run")}
                  >
                    Run Tests
                  </button>
                )}
                <button
                  className="submit-button"
                  disabled={!isReady || isLoading || busy || isRunning}
                  title={
                    session.progressive
                      ? `Run all tests through Part ${session.stage} and record completion if they pass.`
                      : "Run public and hidden tests and mark solved if they pass."
                  }
                  onClick={() => execute("submit")}
                >
                  Submit
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {importOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setImportOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setImportOpen(false);
            if (e.key === "Tab") {
              const elements = e.currentTarget.querySelectorAll<HTMLElement>(
                "button, textarea, input:not([type=file])",
              );
              const first = elements[0];
              const last = elements[elements.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <section
            className="import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <div className="modal-heading">
              <button
                className="icon-button"
                aria-label="Close import"
                onClick={() => setImportOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="import-title">Add challenge</h2>
            <p>Paste challenge JSON or a workspace backup.</p>
            <div className="import-controls">
              <label className="file-input">
                <FolderOpen size={14} /> Choose JSON file
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportText(await file.text());
                      setImportError("");
                    }
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setImportText(
                    pretty({
                      ...initialChallenge,
                      id: "my-new-challenge",
                      title: "My new challenge",
                    }),
                  );
                  setImportError("");
                }}
              >
                Load example format
              </button>
            </div>
            <textarea
              autoFocus
              aria-label="Challenge JSON"
              spellCheck={false}
              placeholder={
                '{\n  "id": "my-challenge",\n  "title": "My challenge",\n  …\n}'
              }
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            {importError && (
              <p className="import-error" role="alert">
                {importError}
              </p>
            )}
            <div className="modal-footer">
              <button className="submit-button" onClick={importChallenge}>
                Add to library <Plus size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
