/**
 * UI自动化测试配置文件
 *
 * 配置UI组件测试的基础设置、测试工具和全局配置
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // UI测试配置
    testTimeout: 10000,
    hookTimeout: 5000,

    // 测试环境配置
    environment: 'jsdom',
    setupFiles: ['./tests/ui/setup/ui-test-setup.ts'],

    // 全局配置
    globals: true,

    // 报告配置
    reporter: ['verbose', 'html', 'json'],
    outputFile: {
      html: './tests/ui/reports/index.html',
      json: './tests/ui/reports/ui-test-results.json'
    },

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: [
        'src/components/**/*.{ts,tsx}',
        '!src/components/**/*.d.ts',
        '!src/components/**/*.stories.{ts,tsx}'
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/dist/**',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      reportsDirectory: './tests/ui/coverage'
    },

    // 测试文件匹配模式
    include: [
      'tests/ui/**/*.test.{ts,tsx}',
      'tests/ui/**/*.spec.{ts,tsx}',
      'src/components/**/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.d.ts'
    ]
  },

  // 路径解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../..'),
      '@ui': resolve(__dirname, '../../src/components')
    }
  }
})

// UI测试环境变量
export const UI_TEST_CONFIG = {
  // 测试环境配置
  ENVIRONMENT: 'test',
  TESTING_LIBRARY_TIMEOUT: 5000,

  // 视觉回归测试配置
  VISUAL_REGRESSION: {
    enabled: process.env.UI_VISUAL_REGRESSION === 'true',
    threshold: 0.1,
    updateSnapshots: process.env.UI_UPDATE_SNAPSHOTS === 'true',
    diffDirectory: './tests/ui/visual-diff'
  },

  // 可访问性测试配置
  ACCESSIBILITY: {
    enabled: true,
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'heading-order': { enabled: true },
      'alt-text': { enabled: true }
    }
  },

  // 性能测试配置
  PERFORMANCE: {
    enabled: true,
    thresholds: {
      renderTime: 100, // ms
      componentSize: 50, // KB
      bundleSize: 500 // KB
    }
  },

  // 响应式测试配置
  RESPONSIVE: {
    viewports: [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]
  },

  // 国际化测试配置
  I18N: {
    enabled: true,
    locales: ['zh-CN', 'en-US'],
    defaultLocale: 'zh-CN'
  },

  // 主题测试配置
  THEMING: {
    enabled: true,
    themes: ['light', 'dark', 'system']
  },

  // 组件库测试配置
  COMPONENT_LIBRARY: {
    testAllComponents: true,
    generateDocumentation: true,
    testProps: true,
    testStates: true,
    testInteractions: true
  }
}

// 测试工具配置
export const TESTING_TOOLS = {
  // Testing Library配置
  userEvent: {
    delay: 50,
    skipAutoClose: false
  },

  // Mock Service Worker配置
  msw: {
    enabled: true,
    strict: false,
    onUnhandledRequest: 'warn'
  },

  // Storybook配置
  storybook: {
    enabled: process.env.UI_STORYBOOK_TESTS === 'true',
    port: 6006,
    storiesPattern: '**/*.stories.@(js|jsx|ts|tsx|mdx)'
  }
}

// 组件测试配置
export const COMPONENT_TEST_CONFIG = {
  // 基础UI组件
  basic: {
    button: {
      testVariants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      testSizes: ['sm', 'md', 'lg'],
      testStates: ['default', 'loading', 'disabled']
    },
    input: {
      testTypes: ['text', 'email', 'password', 'number', 'textarea'],
      testStates: ['default', 'error', 'disabled', 'focused'],
      testValidations: ['required', 'minLength', 'maxLength', 'pattern']
    },
    card: {
      testVariants: ['default', 'outlined', 'elevated'],
      testWithHeader: true,
      testWithFooter: true,
      testWithActions: true
    }
  },

  // 高级UI组件
  advanced: {
    dialog: {
      testOpenClose: true,
      testModalOverlay: true,
      testCloseOnEscape: true,
      testCloseOnOutsideClick: true
    },
    dropdown: {
      testTriggerMethods: ['click', 'hover', 'focus'],
      testKeyboardNavigation: true,
      testMultiSelect: true,
      testSearchable: true
    },
    tabs: {
      testActivation: true,
      testKeyboardNavigation: true,
      testDisabledTabs: true,
      testVerticalTabs: true
    }
  },

  // 业务组件
  business: {
    noteEditor: {
      testBasicEditing: true,
      testFormatting: true,
      testAutoSave: true,
      testWordCount: true,
      testCharacterCount: true
    },
    noteList: {
      testSorting: true,
      testFiltering: true,
      testPagination: true,
      testEmptyState: true,
      testLoadingState: true
    },
    searchBar: {
      testBasicSearch: true,
      testAdvancedSearch: true,
      testSearchHistory: true,
      testSearchSuggestions: true,
      testSearchFilters: true
    }
  }
}

// 测试场景配置
export const TEST_SCENARIOS = {
  // 用户交互场景
  userInteractions: {
    enabled: true,
    scenarios: [
      'keyboard-navigation',
      'mouse-interactions',
      'touch-gestures',
      'drag-and-drop',
      'form-submissions'
    ]
  },

  // 状态管理场景
  stateManagement: {
    enabled: true,
    scenarios: [
      'component-states',
      'global-state-sync',
      'error-states',
      'loading-states',
      'empty-states'
    ]
  },

  // 数据流场景
  dataFlow: {
    enabled: true,
    scenarios: [
      'async-data-loading',
      'data-refresh',
      'error-handling',
      'data-validation',
      'real-time-updates'
    ]
  }
}

// 测试报告配置
export const REPORT_CONFIG = {
  // 测试覆盖率报告
  coverage: {
    enabled: true,
    formats: ['html', 'json', 'lcov'],
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // 组件文档报告
  documentation: {
    enabled: true,
    format: 'markdown',
    includeExamples: true,
    includeProps: true,
    includeAccessibility: true
  },

  // 可访问性报告
  accessibility: {
    enabled: true,
    format: 'json',
    includeViolations: true,
    includeWarnings: true,
    includePasses: true
  },

  // 性能报告
  performance: {
    enabled: true,
    metrics: [
      'render-time',
      'component-size',
      'bundle-size',
      'memory-usage'
    ]
  }
}

// 测试环境配置
export const TEST_ENVIRONMENTS = {
  // 开发环境测试
  development: {
    mockExternalAPIs: true,
    enableHotReload: false,
    strictMode: false
  },

  // 测试环境测试
  test: {
    mockExternalAPIs: true,
    enableHotReload: false,
    strictMode: true
  },

  // 生产环境模拟测试
  production: {
    mockExternalAPIs: false,
    enableHotReload: false,
    strictMode: true,
    minifyComponents: true
  }
}