/**
 * Vitest 配置文件
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],

    // 全局配置
    globals: true,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/coverage/**',
        'dist/',
        '.next/',
        'next.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        '**/*.d.ts',
        '**/*.stories.*',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // 更严格的组件和服务覆盖率要求
        './src/components/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/lib/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      // 包含所有源文件
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.*',
      ],
    },

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

    // 并发配置
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // 监听模式配置
    watch: false,

    // 报告器配置
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/results.html',
    },

    // 测试名称模式
    testNamePattern: undefined,

    // 仅仅运行匹配的测试
    passWithNoTests: false,

    // 静默输出
    silent: false,

    // 更新快照
    updateSnapshots: 'missing',

    // 快照序列化配置
    snapshotSerializers: [],

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

  // 服务器配置
  server: {
    deps: {
      inline: ['@testing-library/react', '@testing-library/jest-dom'],
    },
  },
});
