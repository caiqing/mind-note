/**
 * 安全的命令执行工具
 *
 * 使用execFile替代exec，防止命令注入攻击
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ExecResult {
  stdout: string
  stderr: string
  status: number
  success: boolean
}

/**
 * 安全执行命令，不会发生命令注入
 */
export async function execFileNoThrow(
  command: string,
  args: string[] = [],
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    timeout?: number
  } = {}
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env
      },
      timeout: options.timeout || 30000,
      encoding: 'utf8'
    })

    return {
      stdout: stdout || '',
      stderr: stderr || '',
      status: 0,
      success: true
    }
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      status: error.status || 1,
      success: false
    }
  }
}

/**
 * 同步执行命令（仅用于绝对安全的场景）
 */
export function execFileSyncNoThrow(
  command: string,
  args: string[] = [],
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    timeout?: number
  } = {}
): ExecResult {
  try {
    const { execFileSync } = require('child_process')
    const stdout = execFileSync(command, args, {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env
      },
      timeout: options.timeout || 30000,
      encoding: 'utf8'
    })

    return {
      stdout: stdout || '',
      stderr: '',
      status: 0,
      success: true
    }
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      status: error.status || 1,
      success: false
    }
  }
}