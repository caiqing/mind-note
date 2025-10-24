/**
 * Vercel AI SDK 配置
 *
 * 基于Vercel AI SDK的新配置系统
 * 支持OpenAI、Anthropic等多种AI提供商的统一管理
 */

import { z } from 'zod';

// AI提供商类型
export type AIProvider = 'openai' | 'anthropic' | 'ollama';

// AI功能配置
export interface AIFeatures {
  analysis: boolean;
  autoClassification: boolean;
  tagGeneration: boolean;
  embedding: boolean;
}

// 内容分类枚举
export enum ContentCategory {
  TECHNOLOGY = 'technology',
  LEARNING = 'learning',
  MEETING = 'meeting',
  IDEA = 'idea',
  PERSONAL = 'personal',
  WORK = 'work',
  RESEARCH = 'research',
  DOCUMENTATION = 'documentation',
  TUTORIAL = 'tutorial',
  NEWS = 'news',
  BOOK_NOTE = 'book_note',
  PROJECT = 'project',
  THOUGHT = 'thought',
  REFLECTION = 'reflection',
  PLAN = 'plan',
  REVIEW = 'review',
  QUESTION = 'question',
  ANSWER = 'answer',
  SUMMARY = 'summary',
  TRANSCRIPT = 'transcript',
  OTHER = 'other',
}

// 分类配置映射
export const CATEGORY_CONFIG = {
  [ContentCategory.TECHNOLOGY]: {
    name: '技术文档',
    color: '#3b82f6',
    icon: '💻',
    description: '编程、技术文档、架构设计等技术相关内容',
  },
  [ContentCategory.LEARNING]: {
    name: '学习笔记',
    color: '#10b981',
    icon: '📚',
    description: '学习过程中的笔记、知识点总结',
  },
  [ContentCategory.MEETING]: {
    name: '会议记录',
    color: '#f59e0b',
    icon: '🤝',
    description: '会议讨论、决策记录、行动项',
  },
  [ContentCategory.IDEA]: {
    name: '创意想法',
    color: '#8b5cf6',
    icon: '💡',
    description: '灵感、创意、新想法记录',
  },
  [ContentCategory.PERSONAL]: {
    name: '个人思考',
    color: '#ec4899',
    icon: '🧠',
    description: '个人反思、生活感悟、日记',
  },
} as const;

// AI分析结果接口
export interface AIAnalysisResult {
  id: string;
  noteId: string;
  summary: string;
  category: ContentCategory;
  tags: string[];
  keyConcepts: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  model: string;
  provider: AIProvider;
  processedAt: Date;
  tokens: number;
  cost: number;
}

// 向量嵌入结果
export interface EmbeddingResult {
  noteId: string;
  embedding: number[];
  model: string;
  provider: AIProvider;
  dimensions: number;
  processedAt: Date;
}

// AI分析请求参数
export interface AIAnalysisRequest {
  title: string;
  content: string;
  existingTags?: string[];
  maxTokens?: number;
  temperature?: number;
}

// AI服务配置
export const AI_CONFIG = {
  // 基础配置
  enabled: process.env.AI_ANALYSIS_ENABLED === 'true',
  primaryProvider: (process.env.AI_PRIMARY_PROVIDER as AIProvider) || 'openai',
  fallbackProvider: (process.env.AI_FALLBACK_PROVIDER as AIProvider) || 'anthropic',

  // 模型配置
  models: {
    openai: {
      chat: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    anthropic: {
      chat: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    },
    ollama: {
      chat: process.env.OLLAMA_MODEL || 'llama3:8b',
      embedding: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    },
  },

  // 性能配置
  timeout: parseInt(process.env.AI_RESPONSE_TIMEOUT_MS || '5000'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),

  // 成本控制
  dailyBudgetUSD: parseFloat(process.env.AI_DAILY_BUDGET_USD || '1.0'),
  costPerNoteLimit: parseFloat(process.env.AI_COST_PER_NOTE_LIMIT || '0.01'),
  rateLimitRPM: parseInt(process.env.AI_RATE_LIMIT_RPM || '60'),
  rateLimitRPH: parseInt(process.env.AI_RATE_LIMIT_RPH || '1000'),

  // 质量要求
  minConfidence: 0.7,
  maxTags: 5,
  minTagRelevance: 0.6,
  summaryMaxLength: 100,
};

// AI功能开关
export const AI_FEATURES: AIFeatures = {
  analysis: process.env.AI_ANALYSIS_ENABLED === 'true',
  autoClassification: process.env.AI_AUTO_CLASSIFICATION === 'true',
  tagGeneration: process.env.AI_TAG_GENERATION === 'true',
  embedding: process.env.AI_EMBEDDING_ENABLED === 'true',
};

// 成本配置（每1K tokens的成本，美元）
export const TOKEN_COSTS = {
  openai: {
    'gpt-4-turbo-preview': 0.01,
    'gpt-3.5-turbo': 0.001,
    'text-embedding-3-small': 0.00002,
    'text-embedding-3-large': 0.00013,
  },
  anthropic: {
    'claude-3-haiku-20240307': 0.00025,
    'claude-3-sonnet-20240229': 0.003,
    'claude-3-opus-20240229': 0.015,
  },
  ollama: {
    'llama3:8b': 0, // 本地模型免费
    'nomic-embed-text': 0, // 本地嵌入免费
  },
} as const;

// 工具函数：获取模型成本
export function getTokenCost(provider: AIProvider, model: string): number {
  return TOKEN_COSTS[provider]?.[model as keyof typeof TOKEN_COSTS[typeof provider]] || 0;
}

// 工具函数：验证配置
export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!AI_CONFIG.enabled) {
    return { isValid: true, errors: [] };
  }

  // 验证API密钥
  if (AI_CONFIG.primaryProvider === 'openai' && !process.env.OPENAI_API_KEY) {
    errors.push('OpenAI API key is missing');
  }

  if (AI_CONFIG.primaryProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    errors.push('Anthropic API key is missing');
  }

  // 验证环境变量
  if (AI_CONFIG.costPerNoteLimit <= 0) {
    errors.push('Cost per note limit must be positive');
  }

  if (AI_CONFIG.dailyBudgetUSD <= 0) {
    errors.push('Daily budget must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 工具函数：获取分类名称
export function getCategoryName(category: ContentCategory): string {
  return CATEGORY_CONFIG[category]?.name || category;
}

// 工具函数：获取分类颜色
export function getCategoryColor(category: ContentCategory): string {
  return CATEGORY_CONFIG[category]?.color || '#6b7280';
}

// 工具函数：获取分类图标
export function getCategoryIcon(category: ContentCategory): string {
  return CATEGORY_CONFIG[category]?.icon || '📄';
}