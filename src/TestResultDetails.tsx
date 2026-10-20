import type { Result, TestCase } from "./types";

export default function TestResultDetails({
  test,
  result,
}: {
  test: Pick<TestCase, "hidden" | "args" | "expected">;
  result: Result;
}) {
  return (
    <div className="result-detail">
      <div>
        <label>Input</label>
        <pre>{JSON.stringify(test.args, null, 2)}</pre>
      </div>
      <div className={`comparison ${test.hidden ? "hidden-comparison" : ""}`}>
        {!test.hidden && (
          <div>
            <label>
              Expected{result.expectedType ? ` (${result.expectedType})` : ""}
            </label>
            <pre>{result.expectedRepr ?? JSON.stringify(test.expected)}</pre>
          </div>
        )}
        <div>
          <label>
            Your output{result.actualType ? ` (${result.actualType})` : ""}
          </label>
          <pre>
            {result.actualRepr ??
              JSON.stringify(result.actual) ??
              "No return value"}
          </pre>
        </div>
      </div>
      {test.hidden && (
        <p className="hidden-expected-note">Expected output is hidden.</p>
      )}
      {result.error && <pre className="error-output">{result.error}</pre>}
      <div className="test-terminal">
        <label>Terminal</label>
        <pre>{result.stdout || "No output."}</pre>
      </div>
    </div>
  );
}
