import { NextRequest, NextResponse } from 'next/server';
import { execFileNoThrow } from '@/lib/utils/execFileNoThrow';

interface QualityCheckResult {
  status: 'pass' | 'fail' | 'warning';
  eslint: {
    errors: number;
    warnings: number;
    fixable: number;
  };
  typescript: {
    errors: number;
    warnings: number;
  };
  prettier: {
    errors: number;
    fixable: number;
  };
  summary: {
    totalIssues: number;
    fixableIssues: number;
    criticalIssues: number;
  };
  details: string[];
}

interface QualityReport {
  timestamp: string;
  result: QualityCheckResult;
  recommendations: string[];
  actions: {
    eslint: string;
    prettier: string;
    typescript: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await runQualityChecks();
    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      result,
      recommendations: generateRecommendations(result),
      actions: {
        eslint: 'npm run lint:fix',
        prettier: 'npm run format:fix',
        typescript:
          'Check TypeScript errors in your IDE or run: npm run type-check',
      },
    };

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Quality check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { autoFix = false } = body;

    if (autoFix) {
      await runAutoFix();
    }

    const result = await runQualityChecks();
    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      result,
      recommendations: generateRecommendations(result),
      actions: {
        eslint: 'npm run lint:fix',
        prettier: 'npm run format:fix',
        typescript:
          'Check TypeScript errors in your IDE or run: npm run type-check',
      },
    };

    return NextResponse.json({
      success: true,
      data: report,
      message: autoFix
        ? 'Auto-fix applied successfully'
        : 'Quality check completed',
    });
  } catch (error) {
    console.error('Quality check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

async function runQualityChecks(): Promise<QualityCheckResult> {
  const result: QualityCheckResult = {
    status: 'pass',
    eslint: { errors: 0, warnings: 0, fixable: 0 },
    typescript: { errors: 0, warnings: 0 },
    prettier: { errors: 0, fixable: 0 },
    summary: { totalIssues: 0, fixableIssues: 0, criticalIssues: 0 },
    details: [],
  };

  const details: string[] = [];

  try {
    // Run ESLint
    const eslintResult = await execFileNoThrow(
      'npx',
      ['eslint', '.', '--ext', '.js,.jsx,.ts,.tsx', '--format=json'],
      {
        cwd: process.cwd(),
      },
    );

    if (eslintResult.success && eslintResult.stdout.trim()) {
      const eslintData = JSON.parse(eslintResult.stdout);
      result.eslint.errors = eslintData.reduce(
        (acc: number, file: any) => acc + file.errorCount,
        0,
      );
      result.eslint.warnings = eslintData.reduce(
        (acc: number, file: any) => acc + file.warningCount,
        0,
      );
      result.eslint.fixable = eslintData.reduce(
        (acc: number, file: any) =>
          acc + file.messages.filter((m: any) => m.fixable).length,
        0,
      );

      if (result.eslint.errors > 0) {
        details.push(`${result.eslint.errors} ESLint errors found`);
        result.status = 'fail';
      }
      if (result.eslint.warnings > 0) {
        details.push(`${result.eslint.warnings} ESLint warnings found`);
        if (result.status === 'pass') {
          result.status = 'warning';
        }
      }
    }
  } catch (error) {
    details.push(
      `ESLint check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    result.status = 'fail';
  }

  try {
    // Run TypeScript check
    const tsResult = await execFileNoThrow('npx', ['tsc', '--noEmit'], {
      cwd: process.cwd(),
    });

    if (tsResult.stdout && tsResult.stdout.trim()) {
      const tsErrors = (tsResult.stdout.match(/error TS/gi) || []).length;
      result.typescript.errors = tsErrors;
      if (tsErrors > 0) {
        details.push(`${tsErrors} TypeScript errors found`);
        result.status = 'fail';
      }
    }
  } catch (error) {
    details.push(
      `TypeScript check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    result.status = 'fail';
  }

  try {
    // Run Prettier check
    const prettierResult = await execFileNoThrow(
      'npx',
      [
        'prettier',
        '.',
        '--check',
        '--ignore-path',
        '.gitignore',
        '--no-error-on-unmatched-pattern',
      ],
      {
        cwd: process.cwd(),
      },
    );

    if (!prettierResult.success && prettierResult.stderr) {
      const prettierErrors = prettierResult.stderr
        .split('\n')
        .filter(line => line.trim()).length;
      result.prettier.errors = prettierErrors;
      result.prettier.fixable = prettierErrors; // Assume all prettier issues are fixable

      if (prettierErrors > 0) {
        details.push(`${prettierErrors} files need Prettier formatting`);
        if (result.status === 'pass') {
          result.status = 'warning';
        }
      }
    }
  } catch (error) {
    details.push(
      `Prettier check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (result.status === 'pass') {
      result.status = 'warning';
    }
  }

  // Calculate summary
  result.summary.totalIssues =
    result.eslint.errors +
    result.eslint.warnings +
    result.typescript.errors +
    result.typescript.warnings +
    result.prettier.errors;
  result.summary.fixableIssues =
    result.eslint.fixable + result.prettier.fixable;
  result.summary.criticalIssues =
    result.eslint.errors + result.typescript.errors;

  return result;
}

async function runAutoFix(): Promise<void> {
  // Auto-fix ESLint issues
  try {
    await execFileNoThrow(
      'npx',
      ['eslint', '.', '--ext', '.js,.jsx,.ts,.tsx', '--fix'],
      {
        cwd: process.cwd(),
      },
    );
  } catch (error) {
    console.error('ESLint auto-fix failed:', error);
  }

  // Auto-fix Prettier issues
  try {
    await execFileNoThrow(
      'npx',
      [
        'prettier',
        '.',
        '--write',
        '--ignore-path',
        '.gitignore',
        '--no-error-on-unmatched-pattern',
      ],
      {
        cwd: process.cwd(),
      },
    );
  } catch (error) {
    console.error('Prettier auto-fix failed:', error);
  }
}

function generateRecommendations(result: QualityCheckResult): string[] {
  const recommendations: string[] = [];

  if (result.eslint.errors > 0) {
    recommendations.push(
      'Fix ESLint errors: Run `npm run lint:fix` to auto-fix fixable issues',
    );
  }
  if (result.eslint.warnings > 0) {
    recommendations.push(
      'Review ESLint warnings: Check the linting rules and update code if needed',
    );
  }
  if (result.typescript.errors > 0) {
    recommendations.push(
      'Fix TypeScript errors: Check type annotations and resolve compilation issues',
    );
  }
  if (result.prettier.errors > 0) {
    recommendations.push(
      'Format code: Run `npm run format:fix` to apply Prettier formatting',
    );
  }
  if (result.summary.fixableIssues > 0) {
    recommendations.push(
      'Many issues are auto-fixable. Consider running the quality check with autoFix: true',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Great job! No code quality issues found. Keep up the good work!',
    );
  }

  return recommendations;
}
