/**
 * 安全的命令执行工具
 * 使用 execFile 而不是 exec 来防止命令注入攻击
 */

import { execFile, ExecFileException } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  status: number | null;
  signal: string | null;
  success: boolean;
  error?: Error;
}

/**
 * 安全地执行命令文件，防止命令注入
 * @param executable 要执行的可执行文件名
 * @param args 命令参数数组（自动处理转义）
 * @param options 执行选项
 * @returns 执行结果
 */
export async function execFileNoThrow(
  executable: string,
  args: string[] = [],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    maxBuffer?: number;
    encoding?: BufferEncoding;
  } = {},
): Promise<ExecResult> {
  try {
    const result = await execFileAsync(executable, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB
      timeout: 30000, // 30秒超时
      ...options,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: 0,
      signal: null,
      success: true,
    };
  } catch (error) {
    const execError = error as ExecFileException;

    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      status: execError.code ? parseInt(execError.code) : null,
      signal: execError.signal || null,
      success: false,
      error: execError,
    };
  }
}

/**
 * 检查命令是否存在
 * @param command 命令名
 * @returns 是否存在
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await execFileNoThrow('which', [command]);
    return result.success;
  } catch {
    // Windows 系统使用 where 命令
    if (process.platform === 'win32') {
      try {
        const result = await execFileNoThrow('where', [command]);
        return result.success;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * 安全地执行 npm 命令
 */
export async function execNpmCommand(
  subcommand: string,
  args: string[] = [],
  options?: Parameters<typeof execFileNoThrow>[2],
): Promise<ExecResult> {
  return execFileNoThrow('npm', [subcommand, ...args], options);
}

/**
 * 安全地执行 git 命令
 */
export async function execGitCommand(
  subcommand: string,
  args: string[] = [],
  options?: Parameters<typeof execFileNoThrow>[2],
): Promise<ExecResult> {
  return execFileNoThrow('git', [subcommand, ...args], options);
}

/**
 * 安全地执行 node 命令
 */
export async function execNodeCommand(
  scriptPath: string,
  args: string[] = [],
  options?: Parameters<typeof execFileNoThrow>[2],
): Promise<ExecResult> {
  return execFileNoThrow('node', [scriptPath, ...args], options);
}

/**
 * 安全地执行 TypeScript 文件
 */
export async function execTSNodeCommand(
  scriptPath: string,
  args: string[] = [],
  options?: Parameters<typeof execFileNoThrow>[2],
): Promise<ExecResult> {
  return execFileNoThrow('tsx', [scriptPath, ...args], options);
}
