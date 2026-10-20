/** @param {import('./types').Challenge} challenge @param {import('./types').Progress | undefined} progress */
export function getChallengeSession(challenge, progress) {
  const totalStages = challenge.stages?.length || 1;
  const stage = Number.isInteger(progress?.stage)
    ? Math.max(1, Math.min(progress.stage, totalStages))
    : 1;
  const tests = challenge.tests.filter((test) => (test.stage ?? 1) <= stage);
  return {
    stage,
    totalStages,
    progressive: !!challenge.stages?.length,
    stages: challenge.stages ?? [],
    tests,
    publicTests: tests.filter((test) => !test.hidden),
    canContinue:
      stage < totalStages && (progress?.completedStage ?? 0) >= stage,
  };
}

/** @param {import('./types').Challenge} challenge @param {import('./types').Progress | undefined} progress */
export function getReviewChallenge(challenge, progress) {
  const session = getChallengeSession(challenge, progress);
  return {
    ...challenge,
    tests: session.tests.map((test) => {
      if (!test.hidden) return test;
      const { expected, ...visible } = test;
      return visible;
    }),
    ...(session.progressive
      ? { stages: session.stages, currentStage: session.stage }
      : {}),
  };
}
