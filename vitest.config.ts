/**
 * 简化的 Vitest 配置文件
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],

    // 全局配置
    globals: true,

    // 测试文件匹配模式
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // 排除文件
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
      '**/*.config.*',
      '**/coverage/**',
    ],

    // 测试超时
    testTimeout: 10000,

    // 钩子超时
    hookTimeout: 10000,

    // 并发配置 (vitest 最新版本使用 pool 配置)
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // 监听模式配置
    watch: false,

    // 报告器配置
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/results.html',
    },

    // 更新快照
    updateSnapshots: 'missing',

    // 模拟配置
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // 环境变量
    env: {
      NODE_ENV: 'test',
      TZ: 'UTC',
    },
  },

  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/styles': resolve(__dirname, './src/styles'),
    },
  },

  // 定义配置
  define: {
    __DEV__: 'true',
    __TEST__: 'true',
  },
});
