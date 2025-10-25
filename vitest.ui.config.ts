/**
 * UI组件测试配置 - 使用jsdom环境
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // UI组件使用jsdom环境
    environment: 'jsdom',
    setupFiles: ['./vitest.ui.setup.ts'],

    // 全局配置
    globals: true,

    // 只测试UI组件
    include: [
      'tests/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // 排除文件
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
      '**/*.config.*',
      '**/coverage/**',
      'tests/unit/**/*',
      'src/lib/**/__tests__/**/*',
    ],

    // 测试超时
    testTimeout: 10000,

    // 钩子超时
    hookTimeout: 10000,

    // 并发配置
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },

    // 监听模式配置
    watch: false,

    // 报告器配置
    reporter: ['verbose'],

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