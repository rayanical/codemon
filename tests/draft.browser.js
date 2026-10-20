export default async function verifyDraftAndResults(page, baseURL) {
  const context = await page.context().browser().newContext();
  const qa = await context.newPage();
  const fixture = {
    id: "qa-draft",
    title: "QA draft",
    difficulty: "Easy",
    topics: [],
    functionName: "echo",
    description: "Fixture.",
    constraints: [],
    starterCode: "def echo(value):\n    pass\n",
    revealHiddenFailures: true, // Legacy settings cannot reveal expected outputs.
    tests: [
      {
        id: "public",
        name: "Public",
        args: ["public"],
        expected: "public",
        hidden: false,
      },
      {
        id: "hidden-pass",
        name: "Private pass",
        args: ["private"],
        expected: "private",
        hidden: true,
      },
      {
        id: "hidden-fail",
        name: "Private fail",
        args: ["other"],
        expected: "SECRET_EXPECTED_VALUE",
        hidden: true,
      },
    ],
  };
  const code =
    'def echo(value):\n    print("trace:", value)\n    return value\n';
  const waitForEditor = () =>
    qa.waitForFunction(
      () =>
        window.monaco &&
        window.monaco.editor
          .getModels()
          .some((m) => m.uri.path.endsWith("qa-draft.py")),
    );
  const value = () =>
    qa.evaluate(() =>
      window.monaco.editor
        .getModels()
        .find((m) => m.uri.path.endsWith("qa-draft.py"))
        .getValue(),
    );
  try {
    await qa.goto(baseURL);
    await qa
      .getByRole("button", { name: "Add challenge", exact: true })
      .click();
    await qa
      .getByRole("textbox", { name: "Challenge JSON" })
      .fill(JSON.stringify(fixture));
    await qa.getByRole("button", { name: "Add to library" }).click();
    await waitForEditor();
    await qa.evaluate(
      (code) =>
        window.monaco.editor
          .getModels()
          .find((m) => m.uri.path.endsWith("qa-draft.py"))
          .setValue(code),
      code,
    );
    await qa.reload();
    await qa.getByRole("heading", { name: "QA draft", exact: true }).waitFor();
    await waitForEditor();
    if ((await value()) !== code)
      throw Error("Draft or selected question did not persist");
    await qa.waitForFunction(
      () => !document.querySelector(".submit-button").disabled,
      null,
      { timeout: 120_000 },
    );
    await qa.getByRole("button", { name: "Submit", exact: true }).click();
    await qa.locator(".result-summary").waitFor();
    for (const label of ["Hidden case 2", "Hidden case 3"]) {
      await qa.getByRole("button", { name: new RegExp(label) }).click();
      const detail = await qa.locator(".result-row.expanded").innerText();
      if (
        !detail.includes("Input") ||
        !detail.includes("Your output") ||
        !detail.includes("Terminal") ||
        !detail.includes("trace:") ||
        detail.includes("SECRET_EXPECTED_VALUE") ||
        detail.includes("Expected (")
      )
        throw Error(detail);
    }
    await qa.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.qaReview = text;
          },
        },
      }),
    );
    await qa
      .getByRole("button", { name: "Copy to Codex", exact: true })
      .click();
    if (
      await qa.evaluate(() => window.qaReview.includes("SECRET_EXPECTED_VALUE"))
    )
      throw Error("Review leaked expected output");
    if (await qa.getByRole("button", { name: /History/ }).count())
      throw Error("History UI still exists");
    await qa.evaluate(() =>
      window.monaco.editor
        .getModels()
        .find((m) => m.uri.path.endsWith("qa-draft.py"))
        .setValue(""),
    );
    await qa.reload();
    await waitForEditor();
    if ((await value()) !== "")
      throw Error("An immediately reloaded empty draft was lost");
    qa.once("dialog", (dialog) => dialog.accept());
    await qa.getByRole("button", { name: "Reset to starter code" }).click();
    await qa.waitForFunction(
      (starter) =>
        window.monaco.editor
          .getModels()
          .find((m) => m.uri.path.endsWith("qa-draft.py"))
          .getValue() === starter,
      fixture.starterCode,
    );
    await qa.reload();
    await waitForEditor();
    if ((await value()) !== fixture.starterCode)
      throw Error("Reset did not persist");
    const snapshots = await qa.evaluate(
      () =>
        JSON.parse(localStorage.getItem("codemon.workspace.v1")).attempts
          ?.length || 0,
    );
    if (snapshots) throw Error("New runs created history snapshots");
    return {
      draft: true,
      selectedQuestion: true,
      emptyDraft: true,
      reset: true,
      hiddenExpectationsConcealed: true,
      perTestLogs: true,
      noHistory: true,
    };
  } finally {
    await context.close();
  }
}
