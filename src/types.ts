export type TestCase = {
  id: string;
  name: string;
  args: unknown[];
  expected: unknown;
  hidden: boolean;
  explanation?: string;
  stage?: number;
};
export type Challenge = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  functionName: string;
  description: string;
  constraints: string[];
  starterCode: string;
  tests: TestCase[];
  stages?: { title: string; description: string }[];
  reviewInstructions?: string;
};
export type Result = {
  id: string;
  passed: boolean;
  actual?: unknown;
  actualRepr?: string;
  expectedRepr?: string;
  actualType?: string;
  expectedType?: string;
  error?: string;
  stdout: string;
  duration: number;
};
export type Progress = {
  code: string;
  solved?: boolean;
  stage?: number;
  completedStage?: number;
};
