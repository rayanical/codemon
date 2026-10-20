export default async function verifyLayout(page, baseURL) {
  await page.goto(baseURL);
  await page
    .getByRole("button", { name: "Collection Commands", exact: true })
    .click();
  const measurements = [];
  for (const [width, height] of [
    [1280, 450],
    [1440, 900],
    [900, 600],
    [800, 600],
    [650, 600],
    [561, 450],
    [390, 844],
    [390, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const measurement = await page.evaluate(() => {
      const content = document.querySelector(".problem-content");
      content.scrollTop = content.scrollHeight;
      const pane = content.getBoundingClientRect();
      const last = content.lastElementChild.getBoundingClientRect();
      const actions = document
        .querySelector(".action-bar")
        .getBoundingClientRect();
      const controls = [...document.querySelectorAll(".action-bar button")].map(
        (button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.bottom <= innerHeight + 1 &&
            rect.left >= 0 &&
            rect.right <= innerWidth + 1
          );
        },
      );
      return {
        width: innerWidth,
        height: innerHeight,
        descriptionBottom: pane.bottom,
        lastLine: last.bottom,
        actionsBottom: actions.bottom,
        pass:
          pane.bottom <= innerHeight + 1 &&
          last.bottom <= pane.bottom + 1 &&
          actions.bottom <= innerHeight + 1 &&
          controls.every(Boolean) &&
          document.documentElement.scrollWidth <= innerWidth,
      };
    });
    measurements.push(measurement);
  }
  if (measurements.some((item) => !item.pass))
    throw new Error(JSON.stringify(measurements));
  await page.setViewportSize({ width: 1280, height: 600 });
  const activeStage = await page.locator(".stage-toolbar").innerText();
  await page.getByRole("button", { name: "Part 4", exact: true }).click();
  const planning = await page.evaluate(() => {
    const pane = document
      .querySelector(".problem-content")
      .getBoundingClientRect();
    const heading = document
      .querySelector('[data-part="4"] h3')
      .getBoundingClientRect();
    return {
      parts: document.querySelectorAll(".stage-description").length,
      visible: heading.top >= pane.top && heading.bottom <= pane.bottom,
      activeStage: document.querySelector(".stage-toolbar").innerText,
    };
  });
  if (
    planning.parts !== 4 ||
    !planning.visible ||
    planning.activeStage !== activeStage
  )
    throw new Error(JSON.stringify(planning));
  await page.evaluate(() => {
    document.querySelector(".problem-content").scrollTop = 0;
  });
  return { measurements, planning };
}
