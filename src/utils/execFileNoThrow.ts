/**
 * Safe execFile wrapper utility
 * 安全的execFile包装工具
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

/**
 * 安全地执行命令文件，避免命令注入
 * @param command 要执行的命令
 * @param args 命令参数数组
 * @param options 执行选项
 * @returns 执行结果
 */
export async function execFileNoThrow(
  command: string,
  args: string[] = [],
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    timeout?: number
    encoding?: BufferEncoding
    maxBuffer?: number
  } = {}
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB
      timeout: 30000, // 30 seconds
      ...options
    })

    return {
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0
    }
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      exitCode: error.code || error.status || 1
    }
  }
}

/**
 * 验证命令是否安全（只允许特定的命令）
 * @param command 命令名称
 * @returns 是否安全
 */
export function isCommandSafe(command: string): boolean {
  const allowedCommands = [
    'git',
    'npm',
    'node',
    'yarn',
    'pnpm',
    'docker',
    'docker-compose',
    'npx',
    'tsc',
    'jest',
    'eslint',
    'prettier'
  ]

  return allowedCommands.includes(command.split(' ')[0])
}

/**
 * 安全执行命令（带安全性检查）
 * @param command 命令
 * @param args 参数
 * @param options 选项
 * @returns 执行结果
 */
export async function safeExecFile(
  command: string,
  args: string[] = [],
  options: Parameters<typeof execFileNoThrow>[2] = {}
): Promise<ExecResult> {
  if (!isCommandSafe(command)) {
    return {
      success: false,
      stdout: '',
      stderr: `Command "${command}" is not allowed for security reasons`,
      exitCode: 1
    }
  }

  return execFileNoThrow(command, args, options)
}