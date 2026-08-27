import { readFileSync } from 'node:fs';

const [resultPath, reportedExitCode] = process.argv.slice(2);
if (!resultPath) throw new Error('jest_result_path_required');

const result = JSON.parse(readFileSync(resultPath, 'utf8'));
const failedSuites = Number(result.numFailedTestSuites ?? 0);
const failedTests = Number(result.numFailedTests ?? 0);
const passedSuites = Number(result.numPassedTestSuites ?? 0);
const totalSuites = Number(result.numTotalTestSuites ?? 0);
const totalTests = Number(result.numTotalTests ?? 0);

if (totalSuites < 1 || totalTests < 1 || failedSuites > 0 || failedTests > 0 || passedSuites !== totalSuites) {
  console.error(JSON.stringify({ reportedExitCode, totalSuites, passedSuites, totalTests, failedSuites, failedTests }));
  process.exit(1);
}

console.log(JSON.stringify({ verified: true, reportedExitCode, totalSuites, passedSuites, totalTests }));
